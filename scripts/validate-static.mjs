import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const syntaxCheck = async (source, prefix) => {
  const temp = await mkdtemp(join(tmpdir(), prefix));
  const tempJs = join(temp, 'app.mjs');
  await writeFile(tempJs, source);
  const syntax = spawnSync(process.execPath, ['--check', tempJs], { encoding: 'utf8' });
  await rm(temp, { recursive: true, force: true });
  if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout || `${prefix} syntax check failed`);
};

const indexHtml = await readFile('index.html', 'utf8');
for (const marker of ['B-24 腹部球形炮塔拆分与动画测试 v0.9.7', 'turret-motion-v1.html', '立即打开网页版']) {
  if (!indexHtml.includes(marker)) throw new Error(`Root entry marker missing: ${marker}`);
}

const buildScript = await readFile('scripts/build-static.mjs', 'utf8');
if (!buildScript.includes("'turret-motion-v1.html'")) throw new Error('Build script does not publish turret-motion-v1.html');
await syntaxCheck(buildScript, 'b24-build-');

const manifest = JSON.parse(await readFile('assets/livery/ubangi-bag-iii/manifest.json', 'utf8'));
if (manifest.historicalAccuracy !== 'unverified') throw new Error('V1 livery must remain historically unverified');
if (Object.values(manifest.productionMaps).some((value) => value !== null)) throw new Error('Production PBR maps must stay null before real-model UV bake');

const turretBootstrap = await readFile('turret-motion-v1.html', 'utf8');
for (const marker of ["DecompressionStream('gzip')", '测试站载荷校验失败', 'iframe']) {
  if (!turretBootstrap.includes(marker)) throw new Error(`Turret bootstrap marker missing: ${marker}`);
}
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
  '23085972',
  '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d',
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
  turretPrototypeBytes: turretHtml.length,
  turretPrototypeSha256: turretSha,
  sourceModelGateBytes: 23085972,
  sourceModelGateSha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d',
}, null, 2));
