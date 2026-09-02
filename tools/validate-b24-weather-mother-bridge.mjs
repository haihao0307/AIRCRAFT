import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const files = {
  index: path.join(root, 'preview/b24-data-native-v009/index.html'),
  production: path.join(root, 'preview/b24-data-native-v009/index-production.html'),
  bridge: path.join(root, 'preview/b24-data-native-v009/weather-bridge.js'),
  bootstrap: path.join(root, 'preview/b24-data-native-v009/weather-alpha-bootstrap.js'),
  styles: path.join(root, 'preview/b24-data-native-v009/weather-integration.css'),
  contract: path.join(root, 'data/b24-native/environment/B24_WEATHER_MOTHER_BRIDGE_V001.json'),
  docs: path.join(root, 'docs/aircraft-pipeline/B24_WEATHER_MOTHER_INTEGRATION_V001.md'),
  package: path.join(root, 'package.json')
};

const text = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')])
);
const contract = JSON.parse(text.contract);
const pkg = JSON.parse(text.package);
const checks = [];

function check(id, condition, detail) {
  checks.push({ id, pass: Boolean(condition), detail });
}

check('single-workbench-contract', contract.integrationTarget.singleWorkbench === true, 'singleWorkbench must stay true');
check('no-new-window-contract', contract.integrationTarget.newWindow === false, 'newWindow must stay false');
check('no-new-page-contract', contract.integrationTarget.newTopLevelPage === false, 'newTopLevelPage must stay false');
check('shared-viewport-contract', contract.integrationTarget.sharedViewport === '#canvas-host', 'weather and aircraft must share #canvas-host');
check('shared-controls-contract', contract.integrationTarget.sharedControlPanel === '#control-panel', 'all controls must remain in #control-panel');
check('source-version-lock', contract.weatherMotherSource.version === '1.0.0-clean', 'Weather Mother clean version lock');
check('source-commit-lock', contract.weatherMotherSource.sourceCommit === 'bf2aaa5d853af4f114c68d5bbafb99ea47134ef5', 'Weather Mother source commit lock');
check('geometry-protected', contract.aircraftCoupling.geometryImpact === 'none', 'aircraft geometry must remain unchanged');
check('animation-protected', contract.aircraftCoupling.animationChannelImpact === 'none', 'source animation channels must remain unchanged');
check('surface-field-protected', contract.aircraftCoupling.v014FieldParameterWrite === 'none', 'V014 material field parameters must remain unchanged');
check('approval-frozen', Object.values(contract.approvalLedger).every((value) => value === false), 'all manual approvals remain false');

check('weather-inside-canvas-host', /<div id="canvas-host">[\s\S]*?<div id="weather-layer"[\s\S]*?id="weather-frame"[\s\S]*?<\/div>\s*<\/div>/.test(text.index), 'weather layer must live inside current canvas host');
check('weather-controls-inside-panel', /<aside id="control-panel">[\s\S]*?id="weather-controls"/.test(text.index), 'weather controls must live in current control panel');
check('weather-runtime-script-present', text.index.includes('src="./weather-bridge.js"'), 'weather bridge script must load in the existing page');
check('alpha-bootstrap-precedes-app', text.index.indexOf('weather-alpha-bootstrap.js') < text.index.indexOf('src="./app.js"'), 'alpha bootstrap must run before the B24 renderer');
check('production-reuses-index', text.production.includes("fetch('./index.html'"), 'production entry must reuse the same workbench shell');
check('production-keeps-weather', text.production.includes('Weather Mother Bridge V001'), 'production entry must preserve weather integration title');
check('no-window-open', !/window\.open\s*\(/.test(text.index + text.bridge + text.production), 'integration must not open another window');
check('no-blank-target', !/target\s*=\s*["']_blank["']/.test(text.index + text.bridge + text.production), 'integration must not open another tab');

check('bridge-global', text.bridge.includes('window.__B24_WEATHER_BRIDGE__'), 'bridge global must be exposed');
check('bridge-get-configuration', text.bridge.includes('getConfiguration()'), 'getConfiguration interface');
check('bridge-apply-configuration', text.bridge.includes('applyConfiguration(configuration'), 'applyConfiguration interface');
check('bridge-get-environment', text.bridge.includes('getEnvironment()'), 'getEnvironment interface');
check('bridge-environment-event', text.bridge.includes('b24-weather-environment'), 'environment update event');
check('documented-wind-axis', text.docs.includes('270 度西风吹向正 X') && text.docs.includes('0 度北风吹向正 Z'), 'wind axis convention must be documented');
check('transparent-webgl-bootstrap', text.bootstrap.includes('alpha: true') && text.bootstrap.includes('premultipliedAlpha: true'), 'B24 WebGL layer must support transparent composition');
check('layer-order-style', text.styles.includes('#weather-layer') && text.styles.includes('#canvas-host > canvas'), 'weather and aircraft layer ordering must be explicit');
check('package-script', pkg.scripts?.['validate:b24:weather'] === 'node tools/validate-b24-weather-mother-bridge.mjs', 'package validation command');

const failed = checks.filter((item) => !item.pass);
const report = {
  schema: 'haihao.aircraft/b24-weather-mother-static-validation@1.0.0',
  status: failed.length ? 'FAIL' : 'PASS',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  results: checks
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
