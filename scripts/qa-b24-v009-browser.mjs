import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.B24_V009_BASE_URL ?? 'http://127.0.0.1:8765/preview/b24-data-native-v009/';
const outputDir = path.resolve(root, process.env.B24_V009_EVIDENCE_DIR ?? 'reports/b24-native/generated/v009-browser-evidence');
fs.mkdirSync(outputDir, { recursive: true });

const report = {
  schema: 'haihao.aircraft/b24-v009-browser-qa@1.0.0',
  generatedAt: new Date().toISOString(),
  baseUrl,
  sourceLock: {
    file: 'b-24_liberator.glb',
    bytes: 23085972,
    sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
  },
  checks: [],
  consoleErrors: [],
  pageErrors: [],
  screenshots: [],
  approvalBoundary: {
    functionalBrowserQaOnly: true,
    visualQualityApproved: false,
    historicalAudioApproved: false,
    engineeringRpmApproved: false,
    surfaceSystemApproved: false,
    aircraftDataMasterApproved: false
  }
};

function addCheck(id, pass, detail) {
  report.checks.push({ id, pass: Boolean(pass), detail });
}

async function saveShot(page, name) {
  const file = path.join(outputDir, name);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(path.relative(root, file).replaceAll(path.sep, '/'));
}

async function cameraPreset(page, preset) {
  await page.evaluate((requestedPreset) => {
    const runtime = window.__B24_V009_RUNTIME__;
    if (!runtime?.aircraft) throw new Error('B24 V009 runtime is unavailable');
    runtime.focusAircraft();
    const camera = runtime.camera;
    const target = runtime.controls.target;
    const delta = camera.position.clone().sub(target);
    const distance = delta.length();
    const y = Math.max(distance * 0.18, Math.abs(delta.y));
    if (requestedPreset === 'left-front') delta.set(Math.abs(delta.x), y, Math.abs(delta.z));
    if (requestedPreset === 'right-front') delta.set(-Math.abs(delta.x), y, Math.abs(delta.z));
    if (requestedPreset === 'left-rear') delta.set(Math.abs(delta.x), y, -Math.abs(delta.z));
    if (requestedPreset === 'right-rear') delta.set(-Math.abs(delta.x), y, -Math.abs(delta.z));
    if (requestedPreset === 'front') delta.set(0, distance * 0.16, distance);
    if (requestedPreset === 'belly') delta.set(distance * 0.16, -distance * 0.72, distance * 0.68);
    camera.position.copy(target).add(delta.normalize().multiplyScalar(distance));
    camera.lookAt(target);
    runtime.controls.update();
  }, preset);
  await page.waitForTimeout(260);
}

async function glazingPreset(page) {
  const found = await page.evaluate(() => {
    const runtime = window.__B24_V009_RUNTIME__;
    const entry = runtime?.surfaceCalibrator?.entries.find((candidate) => candidate.categories.includes('glazing'));
    if (!entry) return false;
    const mesh = entry.mesh;
    mesh.geometry?.computeBoundingSphere();
    const target = mesh.getWorldPosition(runtime.controls.target.clone());
    const currentOffset = runtime.camera.position.clone().sub(runtime.controls.target);
    const distance = Math.max(mesh.geometry?.boundingSphere?.radius ?? 0.6, 0.6) * 7;
    currentOffset.normalize().multiplyScalar(distance);
    runtime.controls.target.copy(target);
    runtime.camera.position.copy(target).add(currentOffset);
    runtime.camera.near = Math.max(0.01, distance / 1000);
    runtime.camera.updateProjectionMatrix();
    runtime.controls.update();
    return true;
  });
  await page.waitForTimeout(260);
  return found;
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-gl=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: 'dark'
  });
  const page = await context.newPage();

  await page.route('https://cdn.jsdelivr.net/npm/three@0.180.0/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const marker = '/npm/three@0.180.0/';
    const markerIndex = requestUrl.pathname.indexOf(marker);
    if (markerIndex < 0) return route.abort();
    const relative = requestUrl.pathname.slice(markerIndex + marker.length);
    const localFile = path.join(root, 'node_modules/three', relative);
    if (!fs.existsSync(localFile)) return route.abort();
    return route.fulfill({
      status: 200,
      path: localFile,
      contentType: 'text/javascript; charset=utf-8'
    });
  });

  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));

  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  addCheck('http-response', response?.ok(), `status=${response?.status() ?? 'none'}`);
  await page.waitForFunction(
    () => document.querySelector('#loading-panel')?.classList.contains('hidden'),
    null,
    { timeout: 150000 }
  );

  const sourceState = await page.locator('#source-lock').getAttribute('data-state');
  addCheck('locked-source-verification', sourceState === 'pass', String(sourceState));
  await cameraPreset(page, 'left-front');
  await saveShot(page, '01-left-front-parked.png');
  await cameraPreset(page, 'right-front');
  await saveShot(page, '02-right-front-parked.png');

  const engineButtons = await page.locator('.engine-button').count();
  addCheck('four-engine-ui', engineButtons === 4, `count=${engineButtons}`);
  const discovery = await page.evaluate(() => window.__B24_V009_RUNTIME__.engines.map((engine) => ({
    engine: engine.id,
    targets: engine.targets.length,
    static: engine.visuals.static.size,
    slow: engine.visuals.slow.size,
    blur: engine.visuals.blur.size
  })));
  addCheck('four-engine-discovery', discovery.length === 4 && discovery.every((entry) => entry.targets > 0), JSON.stringify(discovery));

  const before = await page.evaluate(() => window.__B24_V009_RUNTIME__.engines.map((engine) =>
    engine.targets[0]?.object.quaternion.toArray() ?? null
  ));
  await page.click('[data-phase="taxi"]');
  await page.waitForTimeout(1300);
  await cameraPreset(page, 'left-front');
  await saveShot(page, '03-taxi-left-front.png');
  await page.click('[data-phase="takeoff"]');
  await page.waitForTimeout(1600);
  const after = await page.evaluate(() => window.__B24_V009_RUNTIME__.engines.map((engine) =>
    engine.targets[0]?.object.quaternion.toArray() ?? null
  ));
  const moved = before.map((value, index) => {
    if (!value || !after[index]) return false;
    return value.some((component, componentIndex) => Math.abs(component - after[index][componentIndex]) > 1e-5);
  });
  addCheck('continuous-four-propeller-motion', moved.every(Boolean), JSON.stringify(moved));
  await cameraPreset(page, 'front');
  await saveShot(page, '04-takeoff-front-four-propellers.png');

  const materialCounts = await page.evaluate(() => Object.fromEntries(window.__B24_V009_RUNTIME__.surfaceCalibrator.counts));
  addCheck(
    'semantic-material-groups',
    (materialCounts['mechanical-hardware'] ?? 0) > 0 &&
      (materialCounts.glazing ?? 0) > 0 &&
      (materialCounts['exterior-metal'] ?? 0) > 0,
    JSON.stringify(materialCounts)
  );

  const glassState = await page.evaluate(() => {
    const entries = window.__B24_V009_RUNTIME__.surfaceCalibrator.entries.filter((entry) => entry.categories.includes('glazing'));
    const physical = entries.every((entry) => entry.calibrated.every((material, index) =>
      entry.categories[index] !== 'glazing' ||
      (material.isMeshPhysicalMaterial && material.transmission > 0 && material.depthWrite === false)
    ));
    return { count: entries.length, physical };
  });
  addCheck('physical-glazing', glassState.count > 0 && glassState.physical, JSON.stringify(glassState));
  if (await glazingPreset(page)) await saveShot(page, '05-glazing-close.png');

  await cameraPreset(page, 'belly');
  await saveShot(page, '06-belly-before-reset.png');
  await page.click('#reset-runtime');
  await page.waitForFunction(() => document.querySelector('[data-check="reset"]')?.classList.contains('pass'), null, { timeout: 10000 });
  const resetState = await page.locator('[data-check="reset"]').evaluate((element) => ({
    className: element.className,
    value: element.querySelector('strong')?.textContent
  }));
  addCheck('deterministic-reset', resetState.className.includes('pass') && resetState.value === 'PASS', JSON.stringify(resetState));
  const resetPhase = await page.locator('#phase-readout').textContent();
  addCheck('reset-phase-off', resetPhase === 'OFF', String(resetPhase));
  await cameraPreset(page, 'belly');
  await saveShot(page, '07-belly-after-reset.png');
  await cameraPreset(page, 'right-rear');
  await saveShot(page, '08-right-rear-after-reset.png');

  addCheck('zero-page-errors', report.pageErrors.length === 0, JSON.stringify(report.pageErrors));
  addCheck('zero-console-errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
  await context.close();
} catch (error) {
  report.fatal = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
} finally {
  if (browser) await browser.close();
}

const failed = report.checks.filter((check) => !check.pass);
report.status = !report.fatal && report.checks.length > 0 && failed.length === 0 ? 'pass' : 'fail';
report.totals = {
  checks: report.checks.length,
  passed: report.checks.length - failed.length,
  failed: failed.length,
  screenshots: report.screenshots.length
};
fs.writeFileSync(path.join(outputDir, 'b24-v009-browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const check of report.checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.id}: ${check.detail}`);
if (report.fatal) console.error(report.fatal);
console.log(`B24 V009 browser QA: ${report.status.toUpperCase()} (${report.totals.passed}/${report.totals.checks})`);
console.log(`Evidence directory: ${path.relative(root, outputDir)}`);
if (report.status !== 'pass') process.exitCode = 1;
