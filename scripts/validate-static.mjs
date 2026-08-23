import { readFile, readdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const readParts = async (prefix, required = true) => {
  const names = (await readdir('src')).filter((name) => name.startsWith(`${prefix}-part-`) && name.endsWith('.txt')).sort();
  if (!names.length) {
    if (required) throw new Error(`Missing ${prefix} payload parts`);
    return null;
  }
  return (await Promise.all(names.map((name) => readFile(join('src', name), 'utf8')))).join('').replace(/\s+/g, '');
};
const sha = (value) => createHash('sha256').update(value).digest('hex');
const syntaxCheck = async (source, prefix) => {
  const temp = await mkdtemp(join(tmpdir(), prefix));
  const tempJs = join(temp, 'app.mjs');
  await writeFile(tempJs, source);
  const syntax = spawnSync(process.execPath, ['--check', tempJs], { encoding: 'utf8' });
  await rm(temp, { recursive: true, force: true });
  if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout || `${prefix} syntax check failed`);
};

const boardParts = await readParts('board', false);
let boardInfo = { status: 'explicit-test-fallback' };
if (boardParts) {
  const board = Buffer.from(boardParts, 'base64');
  if (board.length !== 67496 || sha(board) !== '339ea8344007698b08ee85d74446b6a0334c7c962ab900c42d0873cc43fd9fb6') throw new Error('V1 board payload failed byte/hash lock');
  boardInfo = { status: 'locked-board', bytes: board.length, sha256: sha(board) };
}

const app = Buffer.from(await readParts('app'), 'base64');
if (sha(app) !== 'fbd6c85e10a78e5c2ecd6b85cb1bbffb826bef24e6a791eac8bfa5d9901e390a') throw new Error('Three.js application payload failed hash lock');
const source = app.toString('utf8');
for (const marker of ['23085972', '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d', 'LiveryUV', 'paintable-static']) {
  if (!source.includes(marker)) throw new Error(`Application marker missing: ${marker}`);
}
await syntaxCheck(source, 'ubangi-static-');

const html = await readFile('index.html', 'utf8');
for (const marker of ['测试涂装 V1', '第二版图片确认后', 'c64e58edfacb4c519b5602278a7e51aa', 'turret-motion-v1.html']) {
  if (!html.includes(marker)) throw new Error(`HTML marker missing: ${marker}`);
}
const loader = await readFile('src/loader.js', 'utf8');
for (const marker of ["readParts('app', 1)", 'fallbackBoard', '测试涂装 V1']) {
  if (!loader.includes(marker)) throw new Error(`Loader fallback marker missing: ${marker}`);
}
await syntaxCheck(loader, 'ubangi-loader-');

const manifest = JSON.parse(await readFile('assets/livery/ubangi-bag-iii/manifest.json', 'utf8'));
if (manifest.historicalAccuracy !== 'unverified') throw new Error('V1 must remain historically unverified');
if (Object.values(manifest.productionMaps).some((value) => value !== null)) throw new Error('Production PBR maps must stay null before real-model UV bake');

const turretBootstrap = await readFile('turret-motion-v1.html', 'utf8');
const payloadMatch = turretBootstrap.match(/const payload=`([^`]*)`/);
if (!payloadMatch) throw new Error('Turret prototype gzip payload missing');
const turretHtml = gunzipSync(Buffer.from(payloadMatch[1].replace(/\s+/g, ''), 'base64'));
const turretSha = sha(turretHtml);
if (turretHtml.length !== 36065 || turretSha !== 'a4acd63e83060bd971fc87b22ebb7fdd32b300fb66b9058132baebd8cd2725dd') {
  throw new Error(`Turret prototype payload failed byte/hash lock: ${turretHtml.length} ${turretSha}`);
}
const turretSource = turretHtml.toString('utf8');
for (const marker of [
  'B-24 腹部球形炮塔拆分与动画测试 v0.9.7',
  'makeProceduralAircraft',
  'extractGlbFromHtml',
  'DETACHED_PREVIEW',
  'AUTO_SCAN',
  'TRACKING',
  'FIRING',
  'buildPreviewRig',
  '临时脱离',
  '完整复位',
]) {
  if (!turretSource.includes(marker)) throw new Error(`Turret prototype marker missing: ${marker}`);
}
const moduleMatch = turretSource.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!moduleMatch) throw new Error('Turret prototype module script missing');
await syntaxCheck(moduleMatch[1], 'b24-turret-');

console.log(JSON.stringify({
  ok: true,
  board: boardInfo,
  appSha256: sha(app),
  turretPrototypeBytes: turretHtml.length,
  turretPrototypeSha256: turretSha,
}, null, 2));
