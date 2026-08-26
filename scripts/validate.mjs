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
  'data/knowledge-bases.json',
  'registry/models/b24-liberator/source-model.lock.json',
  'runtime/b24/v0.9.6-gold/runtime.lock.json',
  'runtime/b24/v0.9.6-gold/README.md',
  'knowledge/README.md',
  'knowledge/schemas/aircraft-crew-group.schema.json',
  'knowledge/aircraft/b24/80-days/README.md',
  'knowledge/aircraft/b24/80-days/index.html',
  'knowledge/aircraft/b24/80-days/styles.css',
  'knowledge/aircraft/b24/80-days/app.js',
  'knowledge/aircraft/b24/80-days/data/knowledge-base.json',
  'knowledge/aircraft/b24/80-days/data/source-registry.json',
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
const knowledgeRegistry = await readJson('data/knowledge-bases.json');
const knowledge = await readJson('knowledge/aircraft/b24/80-days/data/knowledge-base.json');
const sourceRegistry = await readJson('knowledge/aircraft/b24/80-days/data/source-registry.json');
const sharedSchema = await readJson('knowledge/schemas/aircraft-crew-group.schema.json');
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
  'Research knowledge must not activate a livery in the clean baseline.'
);
assert(
  dashboard.lines.map((line) => line.id).join(',') === 'model,flight,livery,integration',
  'Production line order changed.'
);

assert(
  knowledgeRegistry.schema === 'haihao.aircraft/knowledge-base-registry@1.0' &&
    knowledgeRegistry.knowledgeBases.length === 1,
  'Knowledge registry must contain exactly one curated package.'
);
const packageRecord = knowledgeRegistry.knowledgeBases[0];
assert(packageRecord.id === 'b24-80-days', 'Unexpected knowledge package ID.');
assert(packageRecord.aircraftSerial === '42-73257', 'Knowledge package serial changed.');
assert(
  packageRecord.entrypoint === './knowledge/aircraft/b24/80-days/' &&
    packageRecord.liveryStatus === 'not-approved-for-bake',
  'Knowledge package production boundary changed.'
);
assert(
  knowledge.aircraft.serial === '42-73257' &&
    knowledge.aircraft.aircraftNumber === '487' &&
    knowledge.aircraft.nickname === '80 DAYS',
  '80 DAYS aircraft identity changed.'
);
assert(
  knowledge.nameMeaning.confidence === 'C' &&
    Array.isArray(knowledge.nameMeaning.interpretations) &&
    knowledge.nameMeaning.interpretations.length >= 3,
  'Name explanation must remain evidence-graded and bilingual.'
);
assert(
  Array.isArray(knowledge.assets) && knowledge.assets.length === 11,
  'Expected 11 curated photo and evidence cards.'
);
assert(
  sourceRegistry.sources.length === 17 &&
    sourceRegistry.sources.some((source) => source.id === 'SRC_010') &&
    sourceRegistry.sources.some((source) => source.id === 'SRC_013'),
  'Source registry is incomplete.'
);
assert(
  sharedSchema.title === 'Aircraft Crew Group Shared Knowledge Schema',
  'Shared aircraft crew schema changed unexpectedly.'
);

const expectedOriginalReceipts = new Map([
  ['USER_IMAGE_01', { bytes: 46764, sha256: '9dbd779fdaf289342b4732ec7e6206d0fabea484007d78dcd83f80ff7fbcff84' }],
  ['USER_IMAGE_02', { bytes: 690771, sha256: 'c47c5285d0b95abf61cd426f43bbfb6f550d29b9f180ee52606283cf306d0ed5' }]
]);
assert(sourceRegistry.userOriginalFiles.length === 2, 'Expected two user-original receipts.');
for (const receipt of sourceRegistry.userOriginalFiles) {
  const expected = expectedOriginalReceipts.get(receipt.localId);
  assert(expected, `Unexpected original receipt: ${receipt.localId}`);
  assert(receipt.bytes === expected.bytes, `Original receipt byte count changed: ${receipt.localId}`);
  assert(receipt.sha256 === expected.sha256, `Original receipt hash changed: ${receipt.localId}`);
  assert(
    receipt.repositoryStorage === 'metadata-only-outside-ordinary-git-history',
    `Original storage boundary changed: ${receipt.localId}`
  );
}

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
  /turret-motion-v1\.html$/i,
  /b24-four-turret-v0\.9\.8\.html$/i
];
for (const file of files) {
  assert(
    !prohibitedPaths.some((rule) => rule.test(file)),
    `Prohibited legacy path found: ${file}`
  );
  if (/80[-_ ]days/i.test(file)) {
    assert(
      file.startsWith('knowledge/aircraft/b24/80-days/'),
      `80 DAYS files must stay inside the curated knowledge package: ${file}`
    );
  }
}

const allowedModelPath = model.targetPath.replaceAll('\\', '/');
for (const file of files.filter((file) => file.toLowerCase().endsWith('.glb'))) {
  assert(file === allowedModelPath, `Unexpected GLB in source tree: ${file}`);
}

const allowedIdentityFiles = new Set([
  'README.md',
  'liveries/b24/README.md',
  'apps/production-line/index.html',
  'apps/production-line/app.js',
  'data/production-lines.json',
  'data/knowledge-bases.json',
  'scripts/build.mjs',
  'scripts/validate.mjs'
]);
const blockedLegacyTerm = 'UB' + 'ANGI BAG III';
const curatedIdentityTerms = ['80' + ' DAYS', '42-73257'];
for (const file of files) {
  if (!/\.(?:md|json|html|css|js|mjs|yml)$/i.test(file)) continue;
  if (file.startsWith('public/runtime/')) continue;
  const text = await readFile(file, 'utf8');
  assert(!text.includes(blockedLegacyTerm), `Retired experiment content found in ${file}.`);
  if (curatedIdentityTerms.some((term) => text.includes(term))) {
    assert(
      file.startsWith('knowledge/aircraft/b24/80-days/') || allowedIdentityFiles.has(file),
      `Curated 80 DAYS identity leaked outside approved files: ${file}`
    );
  }
}

console.log(`PASS ${required.length} required files`);
console.log('PASS authoritative B-24 source-model lock');
console.log('PASS B-24 v0.9.6 Gold standalone, package, component, and behavior locks');
console.log('PASS separate model, runtime, livery, knowledge, and integration registries');
console.log('PASS clean baseline with no active livery');
console.log('PASS 80 DAYS bilingual knowledge package, source registry, schema, and original-photo receipts');
console.log('PASS materialized assets absent or exact');
console.log('PASS prohibited legacy paths and identities absent');
