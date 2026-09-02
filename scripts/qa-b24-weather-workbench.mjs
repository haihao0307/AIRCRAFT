import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const pageUrl = process.env.B24_WEATHER_QA_URL;
const chromePath = process.env.CHROME || process.env.CHROMIUM || 'chromium';
const outputDir = path.resolve(process.env.B24_WEATHER_QA_OUTPUT || 'artifacts/b24-weather-workbench');
const timeoutMs = Number(process.env.B24_WEATHER_QA_TIMEOUT_MS || 240000);
const debugPort = Number(process.env.B24_WEATHER_CDP_PORT || 9337);

if (!pageUrl) throw new Error('B24_WEATHER_QA_URL is required');
fs.mkdirSync(outputDir, { recursive: true });

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchJson(url, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await sleep(100);
    }
  }
  throw new Error(`Unable to reach ${url}: ${lastError?.message || lastError}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.socket = null;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
        else pending.resolve(message.result);
        return;
      }
      if (!message.method) return;
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(listener);
  }

  send(method, params = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`CDP socket is not open for ${method}`));
    }
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket?.close();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function consoleArgument(argument) {
  if (Object.prototype.hasOwnProperty.call(argument, 'value')) return String(argument.value);
  return argument.description || argument.type || 'unknown console value';
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'b24-weather-chrome-'));
const chromeStderr = [];
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu-sandbox',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  '--hide-scrollbars',
  '--window-size=1600,1000',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

chrome.stderr.on('data', (chunk) => {
  if (chromeStderr.join('').length < 40000) chromeStderr.push(chunk.toString());
});

let cdp;
const report = {
  schema: 'haihao.aircraft/b24-weather-workbench-browser-qa@1.0.0',
  status: 'RUNNING',
  url: pageUrl,
  startedAt: new Date().toISOString(),
  browser: null,
  assertions: {},
  initial: null,
  storm: null,
  reset: null,
  mobile: null,
  consoleErrors: [],
  pageExceptions: [],
  networkFailures: [],
  httpErrors: [],
  screenshots: []
};

try {
  const versionEndpoint = `http://127.0.0.1:${debugPort}/json/version`;
  const browserVersion = await fetchJson(versionEndpoint, 30000);
  report.browser = {
    product: browserVersion.Browser,
    protocolVersion: browserVersion['Protocol-Version'],
    userAgent: browserVersion['User-Agent']
  };

  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`, 10000);
  const pageTarget = targets.find((target) => target.type === 'page');
  assert(pageTarget?.webSocketDebuggerUrl, 'No Chrome page target was available');

  cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  cdp.on('Runtime.consoleAPICalled', ({ type, args = [], stackTrace }) => {
    if (type !== 'error' && type !== 'assert') return;
    report.consoleErrors.push({
      type,
      text: args.map(consoleArgument).join(' '),
      stack: stackTrace || null
    });
  });
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    report.pageExceptions.push({
      text: exceptionDetails?.text || 'Runtime exception',
      url: exceptionDetails?.url || '',
      lineNumber: exceptionDetails?.lineNumber ?? null,
      columnNumber: exceptionDetails?.columnNumber ?? null,
      exception: exceptionDetails?.exception?.description || null
    });
  });
  cdp.on('Network.loadingFailed', ({ requestId, errorText, canceled, type }) => {
    if (canceled || errorText === 'net::ERR_ABORTED') return;
    report.networkFailures.push({ requestId, errorText, type });
  });
  cdp.on('Network.responseReceived', ({ response, type }) => {
    if (!response || response.status < 400) return;
    if (/favicon\.ico(?:\?|$)/.test(response.url)) return;
    report.httpErrors.push({ status: response.status, url: response.url, type });
  });

  await Promise.all([
    cdp.send('Page.enable'),
    cdp.send('Runtime.enable'),
    cdp.send('Log.enable'),
    cdp.send('Network.enable'),
    cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1600,
      screenHeight: 1000
    })
  ]);

  async function evaluate(expression) {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime.evaluate failed');
    }
    return result.result?.value;
  }

  async function waitFor(expression, label, waitTimeout = timeoutMs) {
    const deadline = Date.now() + waitTimeout;
    let lastValue;
    let lastError;
    while (Date.now() < deadline) {
      try {
        lastValue = await evaluate(expression);
        if (lastValue) return lastValue;
      } catch (error) {
        lastError = error;
      }
      await sleep(250);
    }
    throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}. ${lastError?.message || ''}`);
  }

  async function capture(filename, fullPage = false) {
    let clip;
    if (fullPage) {
      const metrics = await cdp.send('Page.getLayoutMetrics');
      const size = metrics.cssContentSize || metrics.contentSize;
      clip = {
        x: 0,
        y: 0,
        width: Math.min(Math.ceil(size.width), 1600),
        height: Math.min(Math.ceil(size.height), 3200),
        scale: 1
      };
    }
    const screenshot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: Boolean(fullPage),
      ...(clip ? { clip } : {})
    });
    const destination = path.join(outputDir, filename);
    fs.writeFileSync(destination, Buffer.from(screenshot.data, 'base64'));
    assert(fs.statSync(destination).size > 10000, `${filename} is unexpectedly small`);
    report.screenshots.push({ file: filename, bytes: fs.statSync(destination).size });
  }

  await cdp.send('Page.navigate', { url: pageUrl });
  await waitFor('document.readyState === "complete"', 'document completion', 60000);
  await waitFor(`Boolean(
    window.__B24_V009_RUNTIME__?.aircraft &&
    window.__B24_V009_RUNTIME__?.snapshot &&
    window.__B24_WEATHER_BRIDGE__?.runtimeAttached &&
    window.__B24_WEATHER_BRIDGE__?.nativeReady &&
    window.__B24_WEATHER_BRIDGE__?.weatherApi?.qa?.ready &&
    document.querySelector('#source-lock')?.dataset.state === 'pass' &&
    document.querySelector('[data-check="weather"]')?.classList.contains('pass')
  )`, 'locked B24 and native Weather Mother readiness');

  report.initial = await evaluate(`(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const bridge = window.__B24_WEATHER_BRIDGE__;
    const configuration = bridge.weatherApi.getConfiguration();
    return {
      sourceLock: document.querySelector('#source-lock')?.dataset.state,
      runtimeState: document.querySelector('#runtime-state')?.textContent,
      weatherState: document.querySelector('#weather-state')?.textContent,
      sameWorkbench: Boolean(document.querySelector('#canvas-host > #weather-layer') && document.querySelector('#control-panel #weather-controls')),
      weatherPresetCount: document.querySelectorAll('#weather-preset option').length,
      frameIntegrated: document.querySelector('#weather-frame')?.classList.contains('integrated-frame'),
      nativeReady: bridge.nativeReady,
      sameOriginAccess: bridge.sameOriginAccess,
      weatherApiReady: bridge.weatherApi?.qa?.ready,
      weatherCase: configuration.weather,
      cloudCount: configuration.controls.count,
      demoAircraftEnabled: configuration.switches.aircraft,
      aircraftChildren: runtime.aircraft.children.length,
      rendererAlpha: runtime.renderer.getContext().getContextAttributes().alpha,
      environment: bridge.getEnvironment()
    };
  })()`);

  assert(report.initial.sourceLock === 'pass', 'Locked B24 source did not pass');
  assert(report.initial.sameWorkbench === true, 'Weather and B24 are not inside one workbench');
  assert(report.initial.weatherPresetCount === 8, 'Eight Weather Mother presets were not available');
  assert(report.initial.frameIntegrated === true, 'Weather Mother frame did not enter integrated mode');
  assert(report.initial.nativeReady === true && report.initial.sameOriginAccess === true, 'Native same-origin Weather Mother API did not connect');
  assert(report.initial.weatherApiReady === true, 'Weather Mother QA readiness was false');
  assert(report.initial.demoAircraftEnabled === false, 'Weather Mother demo aircraft remained enabled');
  assert(report.initial.rendererAlpha === true, 'B24 renderer did not use transparent composition');
  report.assertions.initialWorkbench = 'PASS';
  await capture('b24-weather-fair-desktop.png');

  await evaluate(`(() => {
    const bridge = window.__B24_WEATHER_BRIDGE__;
    bridge.applyConfiguration({
      weather: 'storm',
      hour: 17.5,
      wind: 28,
      direction: 270,
      turbulence: 0.65,
      enabled: true,
      atmosphereResponse: true,
      aircraftResponse: true
    });
    window.__B24_V009_RUNTIME__.setPhase('takeoff');
    return true;
  })()`);

  await waitFor(`(() => {
    const bridge = window.__B24_WEATHER_BRIDGE__;
    const configuration = bridge.weatherApi?.getConfiguration?.();
    return bridge.weatherApi?.qa?.ready === true &&
      configuration?.weather === 'storm' &&
      configuration.controls?.count === 4 &&
      configuration.controls?.wind === 28 &&
      configuration.controls?.direction === 270 &&
      configuration.switches?.aircraft === false &&
      configuration.switches?.lightningEnabled === true;
  })()`, 'storm configuration propagation');
  await sleep(1800);

  report.storm = await evaluate(`(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const bridge = window.__B24_WEATHER_BRIDGE__;
    const configuration = bridge.weatherApi.getConfiguration();
    return {
      phase: runtime.phase,
      weatherCase: configuration.weather,
      cloudCount: configuration.controls.count,
      wind: configuration.controls.wind,
      direction: configuration.controls.direction,
      demoAircraftEnabled: configuration.switches.aircraft,
      lightningEnabled: configuration.switches.lightningEnabled,
      aircraftResponseApplied: bridge.aircraftResponseApplied,
      aircraftQuaternionAngle: runtime.aircraft.quaternion.angleTo(bridge.baseAircraft.quaternion),
      aircraftPositionDelta: runtime.aircraft.position.distanceTo(bridge.baseAircraft.position),
      weatherReadout: document.querySelector('#weather-readout')?.textContent,
      environment: bridge.getEnvironment()
    };
  })()`);

  assert(report.storm.phase === 'takeoff', 'Takeoff phase did not activate');
  assert(report.storm.weatherCase === 'storm' && report.storm.cloudCount === 4, 'Storm cloud state was not synchronized');
  assert(report.storm.demoAircraftEnabled === false, 'Weather Mother demo aircraft reappeared');
  assert(report.storm.lightningEnabled === true, 'Storm lightning switch was not enabled');
  assert(report.storm.aircraftResponseApplied === true, 'Aircraft wind response did not activate');
  assert(report.storm.aircraftQuaternionAngle > 0.00005 || report.storm.aircraftPositionDelta > 0.00005, 'Aircraft did not respond to takeoff turbulence');
  report.assertions.stormPropagation = 'PASS';
  report.assertions.phaseLimitedAircraftResponse = 'PASS';
  await capture('b24-weather-storm-desktop.png');

  await evaluate(`(() => {
    window.__B24_V009_RUNTIME__.setPhase('off');
    return true;
  })()`);
  await waitFor(`(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const bridge = window.__B24_WEATHER_BRIDGE__;
    return bridge.aircraftResponseApplied === false &&
      runtime.aircraft.quaternion.angleTo(bridge.baseAircraft.quaternion) < 1e-7 &&
      runtime.aircraft.position.distanceTo(bridge.baseAircraft.position) < 1e-7;
  })()`, 'aircraft restoration after OFF', 30000);

  report.reset = await evaluate(`(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const bridge = window.__B24_WEATHER_BRIDGE__;
    return {
      phase: runtime.phase,
      aircraftResponseApplied: bridge.aircraftResponseApplied,
      quaternionAngle: runtime.aircraft.quaternion.angleTo(bridge.baseAircraft.quaternion),
      positionDelta: runtime.aircraft.position.distanceTo(bridge.baseAircraft.position)
    };
  })()`);
  report.assertions.offRestoration = 'PASS';

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844
  });
  await sleep(1200);
  report.mobile = await evaluate(`(() => ({
    innerWidth,
    innerHeight,
    bodyScrollHeight: document.body.scrollHeight,
    viewportPresent: Boolean(document.querySelector('#viewport')),
    controlPanelPresent: Boolean(document.querySelector('#control-panel')),
    weatherControlsPresent: Boolean(document.querySelector('#control-panel #weather-controls')),
    weatherFramePresent: Boolean(document.querySelector('#canvas-host > #weather-layer #weather-frame')),
    sourceState: document.querySelector('#source-lock')?.dataset.state,
    weatherState: document.querySelector('#weather-state')?.textContent
  }))()`);
  assert(report.mobile.innerWidth === 390, 'Mobile viewport width was not applied');
  assert(report.mobile.viewportPresent && report.mobile.controlPanelPresent && report.mobile.weatherControlsPresent && report.mobile.weatherFramePresent, 'Mobile workbench lost required sections');
  report.assertions.mobileWorkbench = 'PASS';
  await capture('b24-weather-mobile.png', true);

  await sleep(500);
  assert(report.consoleErrors.length === 0, `Console errors detected: ${JSON.stringify(report.consoleErrors)}`);
  assert(report.pageExceptions.length === 0, `Page exceptions detected: ${JSON.stringify(report.pageExceptions)}`);
  assert(report.networkFailures.length === 0, `Network failures detected: ${JSON.stringify(report.networkFailures)}`);
  assert(report.httpErrors.length === 0, `HTTP errors detected: ${JSON.stringify(report.httpErrors)}`);
  report.assertions.cleanRuntime = 'PASS';

  const finalTargets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`, 10000);
  const pageTargets = finalTargets.filter((target) => target.type === 'page');
  assert(pageTargets.length === 1, `Expected one browser page target, found ${pageTargets.length}`);
  report.assertions.singleTopLevelPage = 'PASS';
  report.topLevelPageTargets = pageTargets.length;
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = error instanceof Error ? error.stack || error.message : String(error);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  report.chromeStderr = chromeStderr.join('').slice(-40000);
  fs.writeFileSync(path.join(outputDir, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  cdp?.close();
  chrome.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => chrome.once('exit', resolve)),
    sleep(3000)
  ]);
  if (!chrome.killed) chrome.kill('SIGKILL');
  fs.rmSync(profileDir, { recursive: true, force: true });
  console.log(JSON.stringify({
    status: report.status,
    assertions: report.assertions,
    consoleErrors: report.consoleErrors.length,
    pageExceptions: report.pageExceptions.length,
    networkFailures: report.networkFailures.length,
    httpErrors: report.httpErrors.length,
    screenshots: report.screenshots
  }, null, 2));
}
