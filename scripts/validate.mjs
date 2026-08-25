import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { assert, readJson, sha256 } from './lib.mjs';

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
  'runtime/b24/v0.9.6-gold/runtime.lock.json',
  'runtime/b24/v0.9.6-gold/README.md',
  'scripts/lib.mjs',
  'scripts/materialize-model.mjs',
  'scripts/materialize-runtime.mjs',
  'scripts/build.mjs'
];

for (const file of required) {
  const info = await stat(path.join(root, file));
  assert(info.isFile(), `Required path is not a file: ${file}`);
}

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

assert(
  model.bytes === exactModel.bytes && model.sha256 === exactModel.sha256,
  'Authoritative B-24 model lock changed.'
);
assert(
  runtime.sourceModel.bytes === exactModel.bytes && runtime.sourceModel.sha256 === exactModel.sha256,
  'Runtime source-model lock changed.'
);
assert(
  runtime.sourceArtifact.sha256 === '465c55d24c2e783b09881b294e5b44a9ba1050d27216793ba23f9a52b1d1a3af',
  'Gold standalone runtime lock changed.'
);
assert(
  runtime.distribution.bytes === 9455362 &&
    runtime.distribution.sha256 === '3a7e5a311aa12cefbd0db4bd97f5b4162ae43198de19d215debda2e388667bff',
  'Gold distribution lock changed.'
);
assert(
  runtime.behaviorContract.flightPhases === 23 && runtime.behaviorContract.propellerChannels === 4,
  'Gold runtime behavior contract changed.'
);
assert(
  runtime.behaviorContract.route === 'hidden-large-arc' &&
    runtime.behaviorContract.takeoffLandingPreserved === true,
  'Gold flight path contract changed.'
);
assert(
  models.models.length === 1 && models.models[0].id === model.modelId,
  'Model registry does not resolve to the authoritative model.'
);
assert(
  runtimes.runtimes.length === 1 && runtimes.runtimes[0].id === runtime.runtimeId,
  'Runtime registry does not resolve to the Gold runtime.'
);
assert(
  Array.isArray(liveries.liveries) && liveries.liveries.length === 0,
  'Clean baseline must have an empty livery registry.'
);
assert(
  dashboard.lines.map((line) => line.id).join(',') === 'model,flight,livery,integration',
  'Production line order changed.'
);

async function verifyOptional(file, expectedBytes, expectedHash, label) {
  try {
    const info = await stat(file);
    assert(info.isFile(), `${label} target is not a file.`);
    if (Number.isInteger(expectedBytes)) {
      assert(info.size === expectedBytes, `${label} byte count mismatch.`);
    }
    const digest = sha256(await readFile(file));
    assert(digest === expectedHash, `${label} SHA-256 mismatch.`);
    console.log(`PASS ${label} materialized and verified`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`PASS ${label} lock verified, source bytes not materialized`);
      return;
    }
    throw error;
  }
}

await verifyOptional(model.targetPath, model.bytes, model.sha256, 'authoritative model');
await verifyOptional(
  runtime.sourceArtifact.targetPath,
  null,
  runtime.sourceArtifact.sha256,
  'Gold runtime'
);

async function walk(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
    const relative = path.posix.join(prefix, entry.name);
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full, relative));
    else found.push(relative);
  }
  return found;
}

const files = await walk(root);
const prohibitedPaths = [
  /^TASK_/i,
  /(^|\/)HANDOFF\.md$/i,
  /(^|\/)reports\//i,
  /ubangi/i,
  /80[-_ ]days/i,
  /turret-motion-v1\.html$/i,
  /b24-four-turret-v0\.9\.8\.html$/i
];

for (const file of files) {
  assert(
    !prohibitedPaths.some((rule) => rule.test(file)),
    `Prohibited legacy path found: ${file}`
  );
}

const allowedModelPath = model.targetPath.replaceAll('\\', '/');
for (const file of files.filter((file) => file.toLowerCase().endsWith('.glb'))) {
  assert(file === allowedModelPath, `Unexpected GLB in source tree: ${file}`);
}

const blockedTerms = ['UB' + 'ANGI BAG III', '80' + ' DAYS'];
for (const file of files) {
  if (!/\.(?:md|json|html|css|js|mjs|yml)$/i.test(file)) continue;
  if (file.startsWith('public/runtime/')) continue;
  const text = await readFile(file, 'utf8');
  for (const term of blockedTerms) {
    assert(!text.includes(term), `Retired experiment content found in ${file}.`);
  }
}

console.log(`PASS ${required.length} required files`);
console.log('PASS authoritative B-24 source-model lock');
console.log('PASS B-24 v0.9.6 Gold standalone, package, component, and behavior locks');
console.log('PASS separate model, runtime, livery, and integration registries');
console.log('PASS clean baseline with no active livery');
console.log('PASS materialized assets absent or exact');
console.log('PASS prohibited legacy paths and identities absent');
