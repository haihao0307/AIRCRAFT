import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const root = process.cwd();
const baseUrl = process.env.B24_VERTICAL_TAIL_URL ?? 'http://127.0.0.1:8765/preview/b24-vertical-tail-v001/';
const out = path.resolve(process.env.B24_VERTICAL_TAIL_EVIDENCE_DIR ?? 'reports/b24-native/generated/vertical-tail-v001/browser');
fs.mkdirSync(out, { recursive: true });
const report = {
  schema: 'haihao.aircraft/b24-vertical-tail-browser-qa@1.0.0', generatedAt: new Date().toISOString(), baseUrl,
  checks: [], consoleErrors: [], pageErrors: [], requestFailures: [], httpErrors: [], screenshots: [],
  approvals: { browserFunctionalQaApproved: false, humanVisualApproved: false, verticalTailApproved: false, aircraftDataMasterApproved: false }
};
const check = (id, pass, detail) => report.checks.push({ id, pass: Boolean(pass), detail });
const presets = { front: [0,2.2,12], rear: [0,2.2,-12], left: [-13,2.2,0], right: [13,2.2,0], top: [0,14,.01], quarter: [10,6,10] };

async function pointCamera(page, position) {
  await page.evaluate(({ cameraPosition }) => {
    const api = window.__B24_VERTICAL_TAIL__;
    api.camera.position.fromArray(cameraPosition); api.camera.lookAt(0,1.6,0);
    api.controls.target.set(0,1.6,0); api.controls.update();
  }, { cameraPosition: position });
}
async function capture(page, name) {
  const file = path.join(out, name); await page.screenshot({ path: file });
  report.screenshots.push({ name, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
}

let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  for (const viewport of [{ id: 'desktop', width: 1440, height: 900 }, { id: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.route('https://cdn.jsdelivr.net/npm/three@0.180.0/**', async (route) => {
      const url = new URL(route.request().url()), marker = '/npm/three@0.180.0/', index = url.pathname.indexOf(marker);
      if (index < 0) return route.abort();
      const file = path.join(root, 'node_modules/three', url.pathname.slice(index + marker.length));
      return fs.existsSync(file) ? route.fulfill({ status: 200, path: file, contentType: 'text/javascript' }) : route.abort();
    });
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ viewport: viewport.id, text: message.text() }); });
    page.on('pageerror', error => report.pageErrors.push({ viewport: viewport.id, text: error.message }));
    page.on('requestfailed', request => report.requestFailures.push({ viewport: viewport.id, url: request.url(), error: request.failure()?.errorText }));
    page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ viewport: viewport.id, url: response.url(), status: response.status() }); });

    const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    check(`${viewport.id}-http`, response?.ok(), `status=${response?.status()}`);
    await page.waitForFunction(() => document.body.dataset.qa === 'pass', null, { timeout: 60000 });
    const state = await page.evaluate(() => window.__B24_VERTICAL_TAIL__.report());
    check(`${viewport.id}-four-buffer-geometries`, state.componentCount === 4 && state.bufferGeometryCount === 4, JSON.stringify(state));
    check(`${viewport.id}-eight-surface-domains`, state.surfaces.length === 8 && new Set(state.surfaces.map(entry => entry.surfaceId)).size === 8 && state.surfaces.every(entry => entry.triangleCount > 0), JSON.stringify(state.surfaces));
    check(`${viewport.id}-no-glb-runtime`, state.runtimeLoadsGlb === false, String(state.runtimeLoadsGlb));

    for (const isolate of ['left','right','all']) {
      await page.evaluate(value => window.__B24_VERTICAL_TAIL__.setIsolate(value), isolate);
      const visibility = await page.evaluate(() => window.__B24_VERTICAL_TAIL__.isolationReport());
      check(`${viewport.id}-isolate-${isolate}`, Object.entries(visibility).every(([id, visible]) => visible === (isolate === 'all' || id.includes(`.${isolate}.`))), JSON.stringify(visibility));
    }
    for (const yaw of [{ id: 'neutral', value: 0 }, { id: 'left', value: -1 }, { id: 'right', value: 1 }]) {
      await page.evaluate(value => window.__B24_VERTICAL_TAIL__.runtime.setPilotYaw(value), yaw.value);
      const action = await page.evaluate(() => window.__B24_VERTICAL_TAIL__.report());
      check(`${viewport.id}-${yaw.id}-fixed-static`, action.fixedMatricesUnchanged, JSON.stringify(action));
      check(`${viewport.id}-${yaw.id}-yaw`, Math.abs(action.yawDegrees - yaw.value * 30) < 1e-6, String(action.yawDegrees));
      for (const [view, position] of Object.entries(presets)) { await pointCamera(page, position); await page.waitForTimeout(80); await capture(page, `${viewport.id}-${yaw.id}-${view}.png`); }
    }
    for (const mode of ['reference','native','overlay','object','wireframe','normals','surface']) {
      await page.evaluate(value => window.__B24_VERTICAL_TAIL__.setMode(value), mode);
      for (const [view, position] of Object.entries(presets)) { await pointCamera(page, position); await page.waitForTimeout(60); await capture(page, `${viewport.id}-mode-${mode}-${view}.png`); }
    }
    await context.close();
  }
} catch (error) { report.fatal = error.stack ?? String(error); }
finally { if (browser) await browser.close(); }

check('zero-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
check('zero-page-errors', report.pageErrors.length === 0, JSON.stringify(report.pageErrors));
check('zero-request-failures', report.requestFailures.length === 0, JSON.stringify(report.requestFailures));
check('zero-http-errors', report.httpErrors.length === 0, JSON.stringify(report.httpErrors));
const failed = report.checks.filter(entry => !entry.pass);
report.status = !report.fatal && !failed.length ? 'pass' : 'fail';
report.totals = { checks: report.checks.length, passed: report.checks.length - failed.length, failed: failed.length, screenshots: report.screenshots.length };
fs.writeFileSync(path.join(out, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'screenshot-sha256.json'), `${JSON.stringify(report.screenshots, null, 2)}\n`);
console.log(JSON.stringify(report.totals));
if (report.status !== 'pass') process.exitCode = 1;
