import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const required = [
  'README.md',
  'AGENTS.md',
  'package.json',
  'apps/production-line/index.html',
  'apps/production-line/styles.css',
  'apps/production-line/app.js',
  'data/models.json',
  'data/runtimes.json',
  'data/liveries.json',
  'data/production-lines.json',
  'registry/models/b24-liberator/source-model.lock.json',
  'runtime/b24/v0.9.6-gold/runtime.lock.json'
];

for (const file of required) await access(path.join(root, file));

const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const model = await readJson('registry/models/b24-liberator/source-model.lock.json');
const runtime = await readJson('runtime/b24/v0.9.6-gold/runtime.lock.json');
const models = await readJson('data/models.json');
const runtimes = await readJson('data/runtimes.json');
const liveries = await readJson('data/liveries.json');
const dashboard = await readJson('data/production-lines.json');

const exactModel = {
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
};

if (model.bytes !== exactModel.bytes || model.sha256 !== exactModel.sha256) {
  throw new Error('Authoritative B-24 model lock changed.');
}
if (runtime.sourceModel.bytes !== exactModel.bytes || runtime.sourceModel.sha256 !== exactModel.sha256) {
  throw new Error('Runtime source-model lock does not match the authoritative model.');
}
if (runtime.distribution.bytes !== 9455362 || runtime.distribution.sha256 !== '3a7e5a311aa12cefbd0db4bd97f5b4162ae43198de19d215debda2e388667bff') {
  throw new Error('B-24 v0.9.6 distribution lock changed.');
}
if (runtime.behaviorContract.flightPhases !== 23 || runtime.behaviorContract.route !== 'hidden-large-arc') {
  throw new Error('B-24 v0.9.6 behavior contract changed.');
}
if (models.models.length !== 1 || models.models[0].id !== model.modelId) {
  throw new Error('Model registry does not resolve to the locked B-24 model.');
}
if (runtimes.runtimes.length !== 1 || runtimes.runtimes[0].id !== runtime.runtimeId) {
  throw new Error('Runtime registry does not resolve to the locked B-24 runtime.');
}
if (!Array.isArray(liveries.liveries) || liveries.liveries.length !== 0) {
  throw new Error('Clean baseline must start with an empty livery registry.');
}
if (dashboard.lines.map((line) => line.id).join(',') !== 'model,flight,livery,integration') {
  throw new Error('Production line order changed.');
}

async function walk(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const relative = path.posix.join(prefix, entry.name);
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full, relative));
    else found.push(relative);
  }
  return found;
}

const files = await walk(root);
const prohibited = [
  /^TASK_/i,
  /(^|\/)HANDOFF\.md$/i,
  /ubangi/i,
  /80[-_ ]days/i,
  /turret-v0\.9\.8/i,
  /(^|\/)reports\//i
];
for (const file of files) {
  if (prohibited.some((rule) => rule.test(file))) {
    throw new Error(`Prohibited legacy path found: ${file}`);
  }
}
if (files.some((file) => file.toLowerCase().endsWith('.glb'))) {
  throw new Error('Source GLB binaries belong in the locked release store, not duplicated in Git.');
}

console.log(`PASS ${required.length} required files`);
console.log('PASS authoritative B-24 source-model lock');
console.log('PASS B-24 v0.9.6 Gold package and component locks');
console.log('PASS separate model, runtime, livery, and integration registries');
console.log('PASS clean baseline with no active livery');
console.log('PASS prohibited legacy paths absent');
