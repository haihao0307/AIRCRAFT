import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.resolve(root, process.env.WM_V012_EVIDENCE_DIR ?? 'reports/weapons-mother/v012-browser');
const baseUrl = process.env.WM_V012_BASE_URL ?? 'http://127.0.0.1:8765/preview/weapons-mother/b24-m2-aircraft-v012/index.html';
const stressShots = Number(process.env.WM_V012_STRESS_SHOTS ?? 2000);

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.WM_V012_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.stack ?? error.message));

const checks = [];
const check = (name, pass, evidence) => checks.push({ name, pass: Boolean(pass), evidence });
const sampleFps = async (frames = 180) => page.evaluate(async (sampleFrames) => {
  const samples = [];
  await new Promise((resolve) => {
    let previous = performance.now();
    const step = (now) => {
      samples.push(now - previous);
      previous = now;
      if (samples.length >= sampleFrames) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  samples.sort((left, right) => left - right);
  const meanMs = samples.reduce((total, value) => total + value, 0) / samples.length;
  const percentile = (ratio) => samples[Math.min(samples.length - 1, Math.floor(samples.length * ratio))];
  return {
    frames: samples.length,
    meanFps: 1000 / meanMs,
    medianFrameMs: percentile(0.5),
    p95FrameMs: percentile(0.95),
    maxFrameMs: samples[samples.length - 1],
  };
}, frames);

try {
  await page.addInitScript(() => localStorage.setItem('wm-audio-muted', '1'));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => document.body.dataset.qa === 'ready' && window.__WM_RUNTIME__?.ready, null, { timeout: 90_000 });
  await page.waitForTimeout(900);

  const alignment = await page.evaluate(() => window.__WM_QA__);
  check('runtime alignment gate passes', alignment?.pass, alignment);
  check('axis-locked surface RMS passes', alignment?.surfaceRegistration?.rmsMeters <= 0.03, alignment?.surfaceRegistration);
  check('axis-locked surface P95 passes', alignment?.surfaceRegistration?.p95Meters <= 0.045, alignment?.surfaceRegistration);
  check('source bore stays on node 802 +Y', alignment?.axisDot >= 0.999999, alignment?.axisDot);
  check('node 811 datum meets real floor', alignment?.braceFloorErrorMeters < 1e-5, alignment?.braceFloorErrorMeters);
  check('front/rear datum correction is centered', Math.abs(alignment?.frontBackDatumErrorMeters ?? Infinity) < 0.012, alignment?.frontBackDatumErrorMeters);
  check('node 799 route endpoint meets explicit AN/M2 feed socket', alignment?.feedEndpointErrorMeters < 0.02, alignment?.feedEndpointErrorMeters);
  check('feed terminal cartridge axis reaches gun axis', alignment?.feedTerminalAxisDot >= 0.999, alignment?.feedTerminalAxisDot);
  check('complete rear sight source neighborhood is present', alignment?.sightComponentCount >= 8, alignment?.sightComponentCount);
  check('belt uses source-exact links without procedural rails', alignment?.sourceBeltPass === true, alignment?.sourceBeltPass);
  check('display lift is the documented 25 mm', Math.abs((alignment?.displayLiftMeters ?? 0) - 0.025) < 1e-6, alignment?.displayLiftMeters);

  await page.evaluate(() => window.__WM_RUNTIME__.setReference(true));
  for (const view of ['hero', 'side', 'top', 'muzzle']) {
    await page.evaluate((name) => window.__WM_RUNTIME__.fitView(name), view);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, `locked-${view}.png`) });
  }

  await page.evaluate(async () => {
    for (let index = 0; index < 25; index += 1) {
      window.__WM_RUNTIME__.fireOnce();
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  });
  await page.waitForTimeout(5_000);
  const shortRun = await page.evaluate(() => window.__WM_RUNTIME__.snapshot());
  check('25-shot visual run keeps all cases', shortRun.totalCases === 25, shortRun);
  check('25-shot visual run keeps all links', shortRun.totalLinks === 25, shortRun);
  check('no settled debris below floor', shortRun.belowFloorCount === 0, shortRun.belowFloorCount);
  check('no unsupported sleeping rigid bodies', shortRun.unsupportedSleeping === 0, shortRun.unsupportedSleeping);
  check('25-shot settle transitions are drained', shortRun.settlingDebrisCount === 0, shortRun.settlingDebrisCount);
  check('impact ceiling remains four', shortRun.maxRecordedImpactLimit <= 4, shortRun.maxRecordedImpactLimit);
  check('25-shot pile remains low', shortRun.lowPilePass === true, shortRun.pile);
  await page.screenshot({ path: path.join(outputDir, 'post-25-shot-settle.png') });

  const stress = await page.evaluate((shots) => window.__WM_RUNTIME__.stress(shots), stressShots);
  check('stress run retains every case', stress.totalCases === stressShots, { expected: stressShots, actual: stress.totalCases });
  check('stress run retains every link', stress.totalLinks === stressShots, { expected: stressShots, actual: stress.totalLinks });
  check('stress run drains dynamic solver', stress.dynamicDebrisCount <= 2, stress.dynamicDebrisCount);
  check('stress settle transitions are drained', stress.settlingDebrisCount === 0, stress.settlingDebrisCount);
  check('settled collision queue is empty', stress.recentSettledColliders === 0, stress.recentSettledColliders);
  check('stress run has no below-floor instances', stress.belowFloorCount === 0, stress.belowFloorCount);
  check('stress run has no unsupported sleepers', stress.unsupportedSleeping === 0, stress.unsupportedSleeping);
  check('stress pile height stays low and spreads', stress.lowPilePass === true, stress.pile);
  check('draw calls stay bounded after full feed', stress.render.calls <= 170, stress.render);
  const postStressFps = await sampleFps();
  check('post-stress animation remains interactive', postStressFps.meanFps >= 45 && postStressFps.p95FrameMs <= 35, postStressFps);

  await page.screenshot({ path: path.join(outputDir, 'post-stress.png') });
  const report = {
    schema: 'haihao.aircraft/weapons-mother-v012-browser-qa@1.0.0',
    status: checks.every((item) => item.pass) && consoleErrors.length === 0 ? 'PASS' : 'FAIL',
    url: baseUrl,
    stressShots,
    checks,
    consoleErrors,
    alignment,
    shortRun,
    stress,
    postStressFps,
  };
  await fs.writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Weapons Mother V012 browser QA: ${report.status} (${checks.filter((item) => item.pass).length}/${checks.length})`);
  if (report.status !== 'PASS') process.exitCode = 1;
} finally {
  await browser.close();
}
