import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const MODEL_BYTES = 23085972;
const MODEL_SHA256 = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const modelPath = 'assets/model/b-24_liberator.glb';

const exists = async (path) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const indexHtml = await readFile('index.html', 'utf8');
for (const marker of [
  'blocked-on-authoritative-binary',
  'b-24_liberator.glb',
  String(MODEL_BYTES),
  MODEL_SHA256,
  '当前页面不会生成替代飞机',
  'b24-authoritative-turrets-v0.9.9.html',
]) {
  if (!indexHtml.includes(marker)) throw new Error(`Authoritative correction marker missing: ${marker}`);
}

for (const forbidden of [
  'turret-motion-v1.html',
  'makeProceduralAircraft',
  'CylinderGeometry',
  'BoxGeometry',
  'SphereGeometry',
]) {
  if (indexHtml.includes(forbidden)) throw new Error(`Procedural production marker forbidden in root entry: ${forbidden}`);
}

const retiredHtml = await readFile('b24-four-turret-v0.9.8.html', 'utf8');
for (const marker of ['程序化四炮塔示意页已经停用', '23,085,972 B', MODEL_SHA256]) {
  if (!retiredHtml.includes(marker)) throw new Error(`Retirement marker missing: ${marker}`);
}
for (const forbidden of ['new THREE.', 'makeAircraft', 'makeTurret']) {
  if (retiredHtml.includes(forbidden)) throw new Error(`Retired page still contains procedural rendering code: ${forbidden}`);
}

const buildScript = await readFile('scripts/build-static.mjs', 'utf8');
if (buildScript.includes("'turret-motion-v1.html'")) throw new Error('Procedural turret-motion page must not enter dist/.');
if (!buildScript.includes("'b24-four-turret-v0.9.8.html'")) throw new Error('Retirement notice must remain publishable.');

const strongConstraints = JSON.parse(await readFile('docs/../data/aircraft/308bg/ubangi-bag-iii.json', 'utf8'));
if (strongConstraints.sourceModel.bytes !== MODEL_BYTES) throw new Error('Aircraft source byte lock changed.');
if (strongConstraints.sourceModel.sha256 !== MODEL_SHA256) throw new Error('Aircraft source hash lock changed.');

const modelExists = await exists(modelPath);
if (modelExists) {
  throw new Error(
    'Authoritative GLB is present, so the blocked entry must now be replaced by the audited real-model integration before publication.',
  );
}

console.log(JSON.stringify({
  ok: true,
  status: 'blocked-on-authoritative-binary',
  proceduralProductionEntry: false,
  modelPath,
  requiredBytes: MODEL_BYTES,
  requiredSha256: MODEL_SHA256,
}, null, 2));
