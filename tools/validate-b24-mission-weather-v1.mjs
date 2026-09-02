#!/usr/bin/env node
import fs from 'node:fs';

const htmlPath = 'b24-weather-mission-v1/index.html';
const cssPath = 'b24-weather-mission-v1/styles.css';
const appPath = 'b24-weather-mission-v1/app.js';
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');
const source = `${html}\n${css}\n${app}`;
const checks = [];
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });

check('single-workbench-title', html.includes('B-24 Weather Mother 全任务循环工作台 V1'), 'full mission title');
check('runway-present', app.includes("r.name='RUNWAY_24_06'") && app.includes('function airport()'), 'procedural runway is created');
check('full-loop-present', app.includes('const DURATION=96') && app.includes('completedLoops'), 'continuous mission timeline');
check('takeoff-present', app.includes("['takeoff'") && app.includes('起飞滑跑与离地'), 'takeoff phase');
check('bombing-present', app.includes('function drop(') && app.includes('st.slots'), 'bomb release system');
check('explosion-present', app.includes('function explode(') && app.includes('RingGeometry'), 'explosion fire, smoke and shock ring');
check('return-present', app.includes("['return'") && app.includes('返航航段'), 'return phase');
check('landing-present', app.includes("['landing'") && app.includes('landingEvents'), 'landing phase');
check('multi-layer-clouds', ["'low'", "'mid'", "'high'", "'storm'"].every((name) => app.includes(name)), 'low mid high and storm cloud volumes');
check('cloud-interaction', app.includes('function cloudInteraction(') && app.includes('function wake(') && app.includes('cloudContactEvents'), 'cloud displacement, opening, wake and contact state');
check('weather-presets', ['fair:', 'layered:', 'storm:', 'rain:', 'fog:', 'snow:', 'sunset:'].every((name) => app.includes(name)), 'seven weather cases');
check('source-lock', app.includes('23085972') && app.includes('541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'), 'exact B24 source identity');
check('source-animation-propellers', app.includes("propellerSource:'authoritative animation tracks'") && app.includes('propellerDirections:[1,1,1,1]'), 'four propellers use source animation direction');
check('no-alternating-prop-direction', !source.includes('index % 2') && !source.includes('index%2'), 'alternating direction guess is forbidden');
check('main-ui-clean', !html.includes('engine-controls') && !html.includes('四台发动机') && !html.includes('资产诊断') && !html.includes('旋转诊断标记'), 'engine mini-grid and visible diagnostics are absent');
check('diagnostics-hidden', css.includes('#debug { display: none; }') && css.includes('body.debug #debug'), 'developer information is hidden by default');
check('same-page-weather', html.includes('id="weather-preset"') && html.includes('id="three-host"') && html.includes('id="cloud-interaction"'), 'weather and aircraft controls share one page and viewport');
check('no-new-window', !/window\.open\s*\(/.test(source) && !/target=["']_blank["']/.test(source), 'no popup or second workbench');
check('runtime-contract', app.includes('window.__B24_MISSION_WEATHER__') && app.includes('singleWorkbench:true') && app.includes('fullLoop:true'), 'runtime QA and integration contract');
check('approval-frozen', app.includes('visualAcceptance:false') && app.includes('productionReady:false'), 'manual approvals remain false');

const failed = checks.filter((item) => !item.pass);
const report = {
  schema: 'haihao.aircraft/b24-mission-weather-static-validation@1.0.0',
  status: failed.length ? 'FAIL' : 'PASS',
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  results: checks
};
fs.mkdirSync('reports/b24-mission-weather-v1', { recursive: true });
fs.writeFileSync('reports/b24-mission-weather-v1/static-validation.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
