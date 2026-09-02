#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const htmlPath = path.resolve(process.argv[2] || 'dist/b24-weather-standalone/B24_WEATHER_MOTHER_STANDALONE.html');
const outputDir = path.resolve(process.argv[3] || path.dirname(htmlPath));
const executablePath = process.env.CHROME || process.env.CHROMIUM || '/usr/bin/google-chrome';
if (!fs.existsSync(htmlPath)) throw new Error(`Standalone HTML missing: ${htmlPath}`);
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu-sandbox',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--allow-file-access-from-files',
    '--autoplay-policy=no-user-gesture-required'
  ]
});

const context = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1
});
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const externalRequests = [];

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message || String(error)));
page.on('requestfailed', (request) => failedRequests.push({
  url: request.url(),
  failure: request.failure()?.errorText || 'unknown'
}));
page.on('request', (request) => {
  if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
});

const checks = [];
function check(name, pass, details = null) {
  checks.push({ name, pass: Boolean(pass), details });
}

try {
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const bridge = window.__B24_WEATHER_BRIDGE__;
    const source = document.querySelector('#source-lock');
    return Boolean(
      runtime?.aircraft &&
      runtime?.gltf &&
      runtime?.snapshot &&
      source?.dataset.state === 'pass' &&
      bridge?.runtimeAttached &&
      bridge?.weatherApi?.qa?.ready
    );
  }, null, { timeout: 240000, polling: 250 });
  await page.waitForTimeout(2500);

  const baseline = await page.evaluate(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const bridge = window.__B24_WEATHER_BRIDGE__;
    const frame = document.querySelector('#weather-frame');
    const contextAttributes = runtime.renderer.getContext().getContextAttributes();
    return {
      sourceState: document.querySelector('#source-lock')?.dataset.state,
      aircraft: Boolean(runtime.aircraft),
      aircraftChildren: runtime.aircraft?.children?.length || 0,
      engineCount: runtime.engines?.length || 0,
      engineTargets: runtime.engines?.map((engine) => engine.targets.length) || [],
      weatherReady: Boolean(bridge.weatherApi?.qa?.ready),
      weatherErrors: bridge.weatherApi?.qa?.errors || [],
      bridgeConfiguration: bridge.getConfiguration(),
      environment: bridge.getEnvironment(),
      panelDisplay: frame?.contentDocument?.querySelector('.panel')?.style.display || '',
      frameIntegrated: frame?.classList.contains('integrated-frame') || false,
      rendererAlpha: contextAttributes?.alpha === true,
      embeddedBuild: window.__B24_STANDALONE_BUILD__ || null,
      diagnostic: document.querySelector('[data-check="weather"] strong')?.textContent || ''
    };
  });

  check('direct file URL loaded', page.url().startsWith('file:'), page.url());
  check('locked B24 source gate passed', baseline.sourceState === 'pass', baseline.sourceState);
  check('locked B24 scene is present', baseline.aircraft && baseline.aircraftChildren > 0, baseline.aircraftChildren);
  check('four B24 engines are registered', baseline.engineCount === 4, baseline.engineTargets);
  check('Weather Mother native API is ready', baseline.weatherReady, baseline.weatherErrors);
  check('Weather Mother reports no runtime errors', baseline.weatherErrors.length === 0, baseline.weatherErrors);
  check('Weather Mother is composited in the same viewport', baseline.frameIntegrated, baseline.frameIntegrated);
  check('embedded Weather Mother panel is hidden', baseline.panelDisplay === 'none', baseline.panelDisplay);
  check('B24 WebGL canvas uses alpha composition', baseline.rendererAlpha, baseline.rendererAlpha);
  check('weather diagnostic passed', baseline.diagnostic === 'PASS', baseline.diagnostic);
  check('single HTML build metadata present', baseline.embeddedBuild?.singleHtml === true, baseline.embeddedBuild);
  check('initial weather is fair', baseline.environment?.preset === 'fair', baseline.environment);

  await page.screenshot({
    path: path.join(outputDir, 'B24_WEATHER_STANDALONE_FAIR_DESKTOP.png'),
    fullPage: false
  });

  const presets = ['fair', 'coast', 'mountain', 'rain', 'storm', 'rainbow', 'snow', 'high'];
  const presetResults = [];
  for (const preset of presets) {
    await page.selectOption('#weather-preset', preset);
    await page.waitForFunction((expected) => window.__B24_WEATHER_BRIDGE__?.getEnvironment?.().preset === expected, preset, {
      timeout: 30000,
      polling: 100
    });
    const state = await page.evaluate(() => ({
      preset: window.__B24_WEATHER_BRIDGE__.getEnvironment().preset,
      nativeWeather: window.__B24_WEATHER_BRIDGE__.weatherApi.getConfiguration().weather,
      nativeReady: window.__B24_WEATHER_BRIDGE__.weatherApi.qa.ready,
      nativeErrors: [...window.__B24_WEATHER_BRIDGE__.weatherApi.qa.errors]
    }));
    presetResults.push(state);
  }
  check(
    'all eight weather presets switch through one control panel',
    presetResults.every((item, index) => item.preset === presets[index] && item.nativeWeather === presets[index]),
    presetResults
  );
  check(
    'all weather switches remain error free',
    presetResults.every((item) => item.nativeErrors.length === 0),
    presetResults
  );

  await page.selectOption('#weather-preset', 'storm');
  await page.click('[data-phase="cruise"]');
  await page.locator('#weather-hour').evaluate((element) => {
    element.value = '17.5';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#weather-wind').evaluate((element) => {
    element.value = '28';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#weather-direction').evaluate((element) => {
    element.value = '315';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#weather-turbulence').evaluate((element) => {
    element.value = '0.55';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.evaluate(() => window.__B24_WEATHER_BRIDGE__.weatherApi.triggerLightning());
  await page.waitForTimeout(1400);

  const storm = await page.evaluate(() => {
    const bridge = window.__B24_WEATHER_BRIDGE__;
    const runtime = window.__B24_V009_RUNTIME__;
    return {
      environment: bridge.getEnvironment(),
      native: bridge.weatherApi.getConfiguration(),
      phase: runtime.phase,
      weatherReadout: document.querySelector('#weather-readout')?.textContent,
      windReadout: document.querySelector('#wind-readout')?.textContent,
      visibilityReadout: document.querySelector('#visibility-readout')?.textContent,
      aircraftQuaternion: runtime.aircraft.quaternion.toArray(),
      baseQuaternion: bridge.baseAircraft?.quaternion?.toArray() || null
    };
  });
  check('storm control reached the Weather Mother runtime', storm.native.weather === 'storm', storm.native.weather);
  check('weather hour control reached 17.5', Math.abs(storm.environment.solar.hour - 17.5) < 0.001, storm.environment.solar.hour);
  check('wind speed control reached 28 m/s', storm.environment.wind.speed === 28, storm.environment.wind);
  check('wind direction control reached 315 degrees', storm.environment.wind.directionFromDegrees === 315, storm.environment.wind);
  check('cruise phase is active', storm.phase === 'cruise', storm.phase);
  check(
    'aircraft turbulence responds during cruise',
    Boolean(storm.baseQuaternion) && storm.aircraftQuaternion.some((value, index) => Math.abs(value - storm.baseQuaternion[index]) > 1e-7),
    { aircraft: storm.aircraftQuaternion, base: storm.baseQuaternion }
  );
  check('weather status readouts are populated', Boolean(storm.weatherReadout && storm.windReadout && storm.visibilityReadout), storm);

  await page.screenshot({
    path: path.join(outputDir, 'B24_WEATHER_STANDALONE_STORM_DESKTOP.png'),
    fullPage: false
  });

  await page.click('#reset-runtime');
  await page.waitForTimeout(1200);
  const reset = await page.evaluate(() => ({
    phase: window.__B24_V009_RUNTIME__.phase,
    weather: window.__B24_WEATHER_BRIDGE__.getEnvironment().preset,
    wind: window.__B24_WEATHER_BRIDGE__.getEnvironment().wind.speed,
    sourceState: document.querySelector('#source-lock')?.dataset.state,
    weatherErrors: [...window.__B24_WEATHER_BRIDGE__.weatherApi.qa.errors]
  }));
  check('unified reset restores off phase', reset.phase === 'off', reset.phase);
  check('unified reset restores fair weather', reset.weather === 'fair', reset.weather);
  check('unified reset restores 12 m/s wind', reset.wind === 12, reset.wind);
  check('unified reset preserves source gate', reset.sourceState === 'pass', reset.sourceState);
  check('unified reset remains error free', reset.weatherErrors.length === 0, reset.weatherErrors);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(outputDir, 'B24_WEATHER_STANDALONE_MOBILE.png'),
    fullPage: true
  });
  const mobile = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    controlPanelVisible: Boolean(document.querySelector('#control-panel')?.getBoundingClientRect().height),
    weatherControlsVisible: Boolean(document.querySelector('#weather-controls')?.getBoundingClientRect().height)
  }));
  check('mobile layout has no horizontal overflow', mobile.width <= mobile.viewport + 1, mobile);
  check('mobile control panel remains visible', mobile.controlPanelVisible, mobile);
  check('mobile weather controls remain visible', mobile.weatherControlsVisible, mobile);

  check('no JavaScript page errors', pageErrors.length === 0, pageErrors);
  check('no failed requests', failedRequests.length === 0, failedRequests);
  check('no external network requests', externalRequests.length === 0, externalRequests);
  check('no console errors', consoleErrors.length === 0, consoleErrors);
} finally {
  await context.close();
  await browser.close();
}

const failed = checks.filter((item) => !item.pass);
const report = {
  schema: 'haihao.aircraft/b24-weather-standalone-browser-qa@1.0.0',
  status: failed.length ? 'FAIL' : 'PASS',
  directOpen: true,
  input: htmlPath,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  consoleErrors,
  pageErrors,
  failedRequests,
  externalRequests,
  visualAcceptance: false,
  productionReady: false,
  results: checks
};
fs.writeFileSync(path.join(outputDir, 'B24_WEATHER_STANDALONE_BROWSER_QA.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
