import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  contract: path.join(root, 'data/b24-native/runtime/b24-v009-runtime-contract.json'),
  html: path.join(root, 'preview/b24-data-native-v009/index.html'),
  css: path.join(root, 'preview/b24-data-native-v009/styles.css'),
  app: path.join(root, 'preview/b24-data-native-v009/app.js'),
  report: path.join(root, 'reports/b24-native/generated/b24-v009-static-validation.json')
};

const expectedLock = {
  file: 'b-24_liberator.glb',
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
};

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}

function addCheck(checks, id, pass, detail) {
  checks.push({ id, pass: Boolean(pass), detail });
}

const contractText = read(paths.contract);
const html = read(paths.html);
const css = read(paths.css);
const app = read(paths.app);
const contract = JSON.parse(contractText);
const checks = [];

addCheck(
  checks,
  'source-lock-file',
  contract.sourceLock?.file === expectedLock.file && app.includes(expectedLock.file),
  `Expected ${expectedLock.file}`
);
addCheck(
  checks,
  'source-lock-bytes',
  contract.sourceLock?.bytes === expectedLock.bytes && app.includes(String(expectedLock.bytes)),
  `Expected ${expectedLock.bytes} bytes`
);
addCheck(
  checks,
  'source-lock-sha256',
  contract.sourceLock?.sha256 === expectedLock.sha256 && app.includes(expectedLock.sha256),
  `Expected SHA256 ${expectedLock.sha256}`
);
addCheck(
  checks,
  'browser-hash-verification',
  /crypto\.subtle\.digest\(['"]SHA-256['"]/.test(app) && /buffer\.byteLength\s*!==\s*SOURCE_LOCK\.bytes/.test(app),
  'Browser must reject a byte or SHA mismatch before GLTF parsing.'
);
addCheck(
  checks,
  'four-engine-contract',
  contract.runtime?.engineCount === 4 && /while\s*\(this\.engines\.length\s*<\s*4\)/.test(app),
  'The runtime contract and UI must expose four independent engines.'
);
addCheck(
  checks,
  'delta-time-propeller-integration',
  /\(engine\.currentRpm\s*\/\s*60\)\s*\*\s*Math\.PI\s*\*\s*2\s*\*\s*dt/.test(app) && /requestAnimationFrame\(frame\)/.test(app),
  'Propeller angle must integrate current RPM against frame delta time.'
);
addCheck(
  checks,
  'representation-switch-does-not-own-motion',
  /setEngineVisualMode\(engine, mode\)/.test(app) && /rotateOnAxis\(targetEntry\.axis/.test(app),
  'Static, slow and blur visibility selection must remain separate from angular integration.'
);
addCheck(
  checks,
  'flight-phase-state-machine',
  ['off', 'crank', 'idle', 'taxi', 'takeoff', 'cruise', 'approach', 'landing', 'shutdown'].every((phase) =>
    contract.runtime?.engineStateMachine?.states?.includes(phase) && app.includes(`${phase}:`)
  ),
  'All V009 engine phases must exist in data and runtime code.'
);
addCheck(
  checks,
  'audio-user-gesture-and-disposal',
  /AudioContext/.test(app) && /UI\.audioToggle\.addEventListener\(['"]change['"]/.test(app) && /await this\.audio\.dispose\(\)/.test(app),
  'Four-channel Web Audio preview must be gesture-gated and disposed on reset.'
);
addCheck(
  checks,
  'semantic-surface-classification',
  /function classifyMaterial/.test(app) && /mechanical-hardware/.test(app) && /exterior-metal/.test(app) && /painted-surface/.test(app),
  'Surface calibration must use semantic groups.'
);
addCheck(
  checks,
  'no-blanket-white-override',
  contract.runtime?.surfaceCalibration?.blanketWhiteOverrideForbidden === true &&
    !/scene\.traverse[\s\S]{0,500}color\.(?:set|setHex)\(\s*0xffffff\s*\)/i.test(app) &&
    !/material\.color\s*=\s*new THREE\.Color\(\s*0xffffff\s*\)/i.test(app),
  'A whole-scene white material override is forbidden.'
);
addCheck(
  checks,
  'glazing-physical-material',
  /new THREE\.MeshPhysicalMaterial\(\)/.test(app) && /material\.transmission\s*=/.test(app) && /material\.depthWrite\s*=\s*false/.test(app),
  'Glazing must use physical transmission and disabled depth write.'
);
addCheck(
  checks,
  'texture-map-preservation',
  /material\.map\s*=\s*reference\.map/.test(app) && contract.runtime?.surfaceCalibration?.preserveTextureMaps === true,
  'Reference texture maps must survive material calibration.'
);
addCheck(
  checks,
  'deterministic-reset-snapshot',
  /class StateSnapshot/.test(app) && /this\.snapshot\.restore\(\)/.test(app) && /snapshotFingerprint/.test(app),
  'Reset must restore transforms, visibility, material references and state fingerprint.'
);
addCheck(
  checks,
  'belly-reset-coverage',
  contract.runtime?.reset?.bellyAndBombBayVisibilityCovered === true && /NAME_RULES\.belly/.test(app),
  'Belly and bomb-bay visibility must participate in reset self-checks.'
);
addCheck(
  checks,
  'approval-ledger-remains-closed',
  Object.values(contract.approvals ?? {}).every((value) => value === false),
  'Implementation may not self-approve browser, visual, historical, engineering or data-master gates.'
);
addCheck(
  checks,
  'historical-livery-remains-frozen',
  contract.frozenUntilApproval?.historicalLivery80Days === true,
  '80 DAYS livery stays frozen until the V009 foundation is independently approved.'
);
addCheck(
  checks,
  'browser-console-complete',
  html.includes('id="phase-grid"') && html.includes('id="engine-controls"') && html.includes('id="diagnostic-list"') && css.length > 4000,
  'The browser console must expose phase, engine and QA controls.'
);
const failed = checks.filter((check) => !check.pass);
const report = {
  schema: 'haihao.aircraft/b24-v009-static-validation@1.0.0',
  generatedAt: new Date().toISOString(),
  status: failed.length === 0 ? 'pass' : 'fail',
  sourceLock: expectedLock,
  totals: {
    checks: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length
  },
  checks,
  approvalBoundary: {
    staticValidationOnly: true,
    browserVisualApprovalGranted: false,
    historicalAudioApprovalGranted: false,
    engineeringRpmApprovalGranted: false,
    surfaceSystemApprovalGranted: false
  }
};

fs.mkdirSync(path.dirname(paths.report), { recursive: true });
fs.writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.id}: ${check.detail}`);
}
console.log(`\nB24 V009 static validation: ${report.status.toUpperCase()} (${report.totals.passed}/${report.totals.checks})`);
console.log(`Report: ${path.relative(root, paths.report)}`);

if (failed.length) process.exitCode = 1;
