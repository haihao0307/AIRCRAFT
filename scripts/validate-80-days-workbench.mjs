import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';

const EXPECTED_SHA = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const EXPECTED_BYTES = 23085972;
const WORKBENCH = 'public/80-days-livery-workbench.html';
const SAME_ORIGIN_MODEL_URL = './assets/model/b-24_liberator.glb';
const SAME_ORIGIN_MODEL_FILE = 'public/assets/model/b-24_liberator.glb';
const RELEASE_MODEL_URL = 'https://github.com/haihao0307/AIRCRAFT/releases/download/80-days-source-v1/b-24_liberator.glb';

const html = await readFile(WORKBENCH, 'utf8');
const report = JSON.parse(await readFile('reports/80-days-model-compatibility.json', 'utf8'));
const review = JSON.parse(await readFile('assets/livery/80-days/review-layer-v1.json', 'utf8'));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (source, marker, label) => assert(source.includes(marker), `${label} missing: ${marker}`);

for (const marker of [
  'B-24J-25-CO “80 DAYS”',
  SAME_ORIGIN_MODEL_URL,
  String(EXPECTED_BYTES),
  EXPECTED_SHA,
  '80days-E03-placement-v1',
  'STAM',
  '8，E01 支持',
  '炸弹数量',
  'UV 检查',
  '法线',
  '粗糙度',
  '高度细节',
  '分类遮罩',
  'port-shark-mouth',
  'starboard-shark-mouth',
  'starboard-stam',
  '273257',
  '487',
]) includes(html, marker, 'workbench');

for (const forbidden of [
  'makeProceduralAircraft',
  'procedural B-24',
  'bombMarkCount: 40',
  'STAM on port',
  RELEASE_MODEL_URL,
]) assert(!html.includes(forbidden), `workbench contains forbidden marker: ${forbidden}`);

const modelStat = await stat(SAME_ORIGIN_MODEL_FILE);
assert(modelStat.size === EXPECTED_BYTES, `same-origin model byte count changed: ${modelStat.size}`);
const modelBytes = await readFile(SAME_ORIGIN_MODEL_FILE);
const modelSha = createHash('sha256').update(modelBytes).digest('hex');
assert(modelSha === EXPECTED_SHA, `same-origin model SHA-256 changed: ${modelSha}`);

assert(report.source.bytes === EXPECTED_BYTES, 'model compatibility byte lock changed');
assert(report.source.sha256 === EXPECTED_SHA, 'model compatibility hash lock changed');
assert(report.source.nodes === 1784, 'node inventory changed');
assert(report.source.meshes === 348, 'mesh inventory changed');
assert(report.source.triangles === 325358, 'triangle inventory changed');
assert(report.source.materials === 30, 'material inventory changed');
assert(report.source.embeddedImages === 18, 'image inventory changed');
assert(report.source.animations === 1, 'animation inventory changed');
assert(report.source.animationChannels === 2518, 'animation-channel inventory changed');
assert(report.classificationSummary.totalMeshes === 348, 'mesh classification total changed');
assert(report.provisionalPaintAllowList.fuselageNodeIds.length === 6, 'fuselage candidate count changed');
assert(report.provisionalPaintAllowList.fixedFinNodeIds.length === 2, 'fixed-fin candidate count changed');
assert(report.finalLiveryUVApproved === false, 'final LiveryUV must remain reviewer-gated');

assert(review.sourceModel.bytes === EXPECTED_BYTES, 'review layer model byte lock changed');
assert(review.sourceModel.sha256 === EXPECTED_SHA, 'review layer model hash changed');
assert(review.missionStateId === '80days-E03-placement-v1', 'review mission state changed');
const stam = review.markings.find((entry) => entry.id === 'starboard-stam');
assert(stam?.side === 'starboard', 'STAM must remain starboard-only');
assert(stam?.placement === 'directly below upper rectangular side window', 'STAM placement changed');
const victory = review.markings.find((entry) => entry.id === 'victory-flags');
assert(victory?.count === 8 && victory?.evidence?.includes('E01'), 'E01-supported flag count changed');
const bombs = review.markings.find((entry) => entry.id === 'bomb-marks');
assert(bombs?.count === null, 'bomb count must remain unresolved');
assert(review.maps.finalBakeApproved === false, 'final bake must remain blocked');

console.log(JSON.stringify({
  ok: true,
  workbench: WORKBENCH,
  sameOriginModel: SAME_ORIGIN_MODEL_FILE,
  sourceSha256: modelSha,
  modelBytes: modelStat.size,
  meshes: report.source.meshes,
  paintCandidates: report.provisionalPaintAllowList.fuselageNodeIds.length + report.provisionalPaintAllowList.fixedFinNodeIds.length,
  markingLayers: review.markings.length,
  missionStateId: review.missionStateId,
  bombCount: bombs.count,
  finalBakeApproved: review.maps.finalBakeApproved,
}, null, 2));
