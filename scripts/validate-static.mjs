import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const readParts = async (prefix) => {
  const names = (await readdir('src')).filter((name) => name.startsWith(`${prefix}-part-`) && name.endsWith('.txt')).sort();
  if (!names.length) throw new Error(`Missing ${prefix} payload parts`);
  return (await Promise.all(names.map((name) => readFile(join('src', name), 'utf8')))).join('').replace(/\s+/g, '');
};
const sha = (value) => createHash('sha256').update(value).digest('hex');

const board = Buffer.from(await readParts('board'), 'base64');
if (board.length !== 67496 || sha(board) !== '339ea8344007698b08ee85d74446b6a0334c7c962ab900c42d0873cc43fd9fb6') throw new Error('V1 board payload failed byte/hash lock');

const app = Buffer.from(await readParts('app'), 'base64');
if (sha(app) !== 'fbd6c85e10a78e5c2ecd6b85cb1bbffb826bef24e6a791eac8bfa5d9901e390a') throw new Error('Three.js application payload failed hash lock');
const source = app.toString('utf8');
for (const marker of ['23085972', '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d', 'LiveryUV', 'paintable-static']) {
  if (!source.includes(marker)) throw new Error(`Application marker missing: ${marker}`);
}
const temp = await mkdtemp(join(tmpdir(), 'ubangi-static-'));
const tempJs = join(temp, 'app.mjs');
await import('node:fs/promises').then((fs) => fs.writeFile(tempJs, source));
const syntax = spawnSync(process.execPath, ['--check', tempJs], { encoding: 'utf8' });
await rm(temp, { recursive: true, force: true });
if (syntax.status !== 0) throw new Error(syntax.stderr || syntax.stdout || 'Application syntax check failed');

const html = await readFile('index.html', 'utf8');
for (const marker of ['测试涂装 V1', '第二版图片确认后', 'c64e58edfacb4c519b5602278a7e51aa']) {
  if (!html.includes(marker)) throw new Error(`HTML marker missing: ${marker}`);
}
const manifest = JSON.parse(await readFile('assets/livery/ubangi-bag-iii/manifest.json', 'utf8'));
if (manifest.historicalAccuracy !== 'unverified') throw new Error('V1 must remain historically unverified');
if (Object.values(manifest.productionMaps).some((value) => value !== null)) throw new Error('Production PBR maps must stay null before real-model UV bake');
console.log(JSON.stringify({ ok: true, boardBytes: board.length, boardSha256: sha(board), appSha256: sha(app) }, null, 2));
