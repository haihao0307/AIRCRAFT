#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.B24_MISSION_URL || 'http://127.0.0.1:8765/b24-weather-mission-v1/?model=./b24.glb&qa=1&autostart=1';
const evidenceDir = process.env.B24_MISSION_EVIDENCE || 'reports/b24-mission-weather-v1/browser-evidence';
fs.mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader'
  ]
});
const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const captures = [];
const checks = [];
const check = (id, pass, detail = null) => checks.push({ id, pass: Boolean(pass), detail });

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message || String(error)));
page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' }));

async function capture(name) {
  const file = path.join(evidenceDir, name);
  try {
    await page.screenshot({ path: file, timeout: 60000 });
    captures.push({ file, status: 'captured' });
    return true;
  } catch (error) {
    captures.push({ file, status: 'capture-failed', error: error.message || String(error) });
    return false;
  }
}

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__B24_MISSION_WEATHER__?.ready === true, null, { timeout: 180000, polling: 200 });
  await page.uncheck('#mission-loop');
  await page.waitForTimeout(700);

  const initial = await page.evaluate(() => ({
    state: window.__B24_MISSION_WEATHER__.getState(),
    contract: window.__B24_MISSION_WEATHER__.contract,
    modelPill: document.querySelector('#model-status')?.dataset.state,
    canvasCount: document.querySelectorAll('#three-host canvas').length,
    panelText: document.querySelector('#panel')?.innerText || '',
    runwayVisible: Boolean(document.querySelector('[data-camera="runway"]')),
    loadingHidden: document.querySelector('#loading-card')?.classList.contains('hidden') || false
  }));

  check('online-page-loaded', page.url().startsWith('http://'), page.url());
  check('exact-model-loaded', initial.state.modelLoaded === true && initial.modelPill === 'pass', initial);
  check('runway-ready', initial.state.runwayReady === true && initial.runwayVisible, initial);
  check('single-three-canvas', initial.canvasCount === 1, initial.canvasCount);
  check('loading-completed', initial.loadingHidden, initial.loadingHidden);
  check('single-workbench-contract', initial.contract.singleWorkbench === true && initial.contract.onlineEntry === true, initial.contract);
  check('full-loop-contract', initial.contract.fullLoop && initial.contract.bombing && initial.contract.explosion && initial.contract.returnAndLanding, initial.contract);
  check('cloud-contract', initial.contract.multiLayerClouds && initial.contract.cloudInteraction, initial.contract);
  check('correct-propeller-directions', initial.state.propellerDirections.length === 4 && initial.state.propellerDirections.every((value) => value === 1), initial.state.propellerDirections);
  check('main-panel-has-no-engine-grid', !initial.panelText.includes('四台发动机') && !initial.panelText.includes('资产诊断'), initial.panelText.slice(0, 900));

  await capture('01-runway-and-aircraft.png');

  await page.waitForFunction(() => {
    const state = window.__B24_MISSION_WEATHER__?.getState?.();
    return state?.bombsReleased >= 4 && state?.explosions >= 1 && state?.cloudContactEvents >= 1;
  }, null, { timeout: 150000, polling: 200 });
  const combat = await page.evaluate(() => window.__B24_MISSION_WEATHER__.getState());
  check('four-bombs-released', combat.bombsReleased >= 4, combat);
  check('explosion-observed', combat.explosions >= 1 && combat.hits >= 1, combat);
  check('cloud-contact-observed', combat.cloudContactEvents >= 1, combat);
  await capture('02-bombing-cloud-contact.png');

  await page.waitForFunction(() => {
    const state = window.__B24_MISSION_WEATHER__?.getState?.();
    return state?.landingEvents >= 1 && state?.completedLoops >= 1;
  }, null, { timeout: 150000, polling: 200 });
  const completed = await page.evaluate(() => window.__B24_MISSION_WEATHER__.getState());
  check('landing-observed', completed.landingEvents >= 1, completed);
  check('full-loop-completed', completed.completedLoops >= 1, completed);
  check('approvals-frozen', completed.visualAcceptance === false && completed.productionReady === false, completed);
  await capture('03-returned-and-landed.png');

  for (const weather of ['layered', 'storm', 'snow']) {
    await page.selectOption('#weather-preset', weather);
    await page.waitForFunction((expected) => window.__B24_MISSION_WEATHER__.getState().weather === expected, weather, { timeout: 15000 });
  }
  const switched = await page.evaluate(() => window.__B24_MISSION_WEATHER__.getState().weather);
  check('manual-weather-switching', switched === 'snow', switched);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobile = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    panelHeight: document.querySelector('#panel')?.getBoundingClientRect().height || 0,
    controlsHeight: document.querySelector('.weather-section')?.getBoundingClientRect().height || 0
  }));
  check('mobile-no-horizontal-overflow', mobile.scrollWidth <= mobile.viewportWidth + 1, mobile);
  check('mobile-controls-visible', mobile.panelHeight > 0 && mobile.controlsHeight > 0, mobile);
  await capture('04-mobile-workbench.png');

  check('no-page-errors', pageErrors.length === 0, pageErrors);
  check('no-console-errors', consoleErrors.length === 0, consoleErrors);
  check('no-failed-requests', failedRequests.length === 0, failedRequests);
} finally {
  await context.close();
  await browser.close();
}

const failed = checks.filter((item) => !item.pass);
const report = {
  schema: 'haihao.aircraft/b24-mission-weather-browser-qa@1.0.0',
  status: failed.length ? 'FAIL' : 'PASS',
  url: baseUrl,
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  captures,
  consoleErrors,
  pageErrors,
  failedRequests,
  visualAcceptance: false,
  productionReady: false,
  results: checks
};
fs.writeFileSync(path.join(evidenceDir, 'browser-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
