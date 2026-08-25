import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const catalogPath = path.join(root, 'data/livery-line/catalog.json');
const requiredSections = ['identity', 'organization', 'crew', 'events', 'evidence', 'livery', 'export'];
const forbiddenKeys = new Set([
  'sourcemodel',
  'sourcemodelpolicy',
  'model',
  'modelfile',
  'modelhash',
  'glb',
  'mesh',
  'meshes',
  'node',
  'nodes',
  'geometry',
  'animation',
  'materialslot',
  'materialslots',
  'uv',
  'liveryuv',
  'targetuv',
  'targetmaterial'
]);

async function readJson(filePath) {
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Missing required JSON file: ${path.relative(root, filePath)} (${error.message})`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Malformed JSON: ${path.relative(root, filePath)} (${error.message})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findForbiddenKeys(value, location = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${location}[${index}]`, findings));
    return findings;
  }

  if (!value || typeof value !== 'object') return findings;

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key.toLowerCase())) findings.push(`${location}.${key}`);
    findForbiddenKeys(child, `${location}.${key}`, findings);
  }

  return findings;
}

function validateRecord(record, expectedId, filePath) {
  const rel = path.relative(root, filePath);
  assert(record.schema === 'haihao.livery/historical-record@1.0', `${rel}: unexpected schema`);
  assert(record.liveryId === expectedId, `${rel}: catalog ID and record ID differ`);

  for (const section of requiredSections) {
    assert(record[section] && typeof record[section] === 'object', `${rel}: missing ${section}`);
  }

  for (const key of ['aircraftFamily', 'variant', 'serial', 'nickname', 'identityStatus']) {
    assert(record.identity[key] !== undefined && record.identity[key] !== '', `${rel}: identity.${key} is required`);
  }

  for (const key of ['airForce', 'group', 'squadron', 'theater', 'period', 'organizationStatus']) {
    assert(record.organization[key] !== undefined && record.organization[key] !== '', `${rel}: organization.${key} is required`);
  }

  assert(Array.isArray(record.crew.persons), `${rel}: crew.persons must be an array`);
  assert(Array.isArray(record.crew.nameMarkings), `${rel}: crew.nameMarkings must be an array`);
  assert(Array.isArray(record.events.items), `${rel}: events.items must be an array`);
  assert(Array.isArray(record.livery.semanticSurfaceZones), `${rel}: livery.semanticSurfaceZones must be an array`);
  assert(Array.isArray(record.livery.markings), `${rel}: livery.markings must be an array`);

  assert(record.export.packageSchema === 'haihao.livery/package@1.0', `${rel}: export.packageSchema must use v1`);
  assert(record.export.bindingOwnership === 'consumer-aircraft-line', `${rel}: binding ownership must stay with the consumer aircraft line`);
  assert(record.export.targetDependencyPolicy === 'none-inside-package', `${rel}: target dependencies are forbidden inside the package`);

  const forbidden = findForbiddenKeys(record);
  assert(forbidden.length === 0, `${rel}: target-specific dependency keys found at ${forbidden.join(', ')}`);
}

const catalog = await readJson(catalogPath);
assert(catalog.schema === 'haihao.livery/catalog@1.0', 'catalog: unexpected schema');
assert(catalog.architecture === 'model-agnostic-straight-line', 'catalog: architecture must be model-agnostic-straight-line');
assert(Array.isArray(catalog.stages) && catalog.stages.length === 10, 'catalog: exactly ten straight-line stages are required');
assert(Array.isArray(catalog.records) && catalog.records.length > 0, 'catalog: at least one livery record is required');
assert(catalog.consumerBoundary?.bindingOwnership === 'consumer-aircraft-line', 'catalog: consumer boundary is missing');

const stageOrders = catalog.stages.map((stage) => stage.order);
assert(new Set(stageOrders).size === stageOrders.length, 'catalog: duplicate stage order');
assert(stageOrders.every((value, index) => value === index + 1), 'catalog: stages must be ordered 1 through 10');

const seenIds = new Set();
for (const entry of catalog.records) {
  assert(typeof entry.liveryId === 'string' && entry.liveryId.length > 0, 'catalog: record liveryId is required');
  assert(!seenIds.has(entry.liveryId), `catalog: duplicate liveryId ${entry.liveryId}`);
  seenIds.add(entry.liveryId);

  assert(typeof entry.record === 'string' && entry.record.startsWith('./records/'), `catalog: unsafe record path for ${entry.liveryId}`);
  assert(!entry.record.includes('..'), `catalog: path traversal is forbidden for ${entry.liveryId}`);

  const filePath = path.join(root, 'data/livery-line', entry.record);
  const record = await readJson(filePath);
  validateRecord(record, entry.liveryId, filePath);
}

const template = await readJson(path.join(root, 'data/livery-line/package-template.json'));
assert(template.schema === 'haihao.livery/package@1.0', 'package template: unexpected schema');
assert(template.consumerContract?.bindingOwnership === 'consumer-aircraft-line', 'package template: consumer binding ownership is missing');
assert(template.consumerContract?.targetDependencyPolicy === 'none-inside-package', 'package template: target dependencies must remain outside the package');

const forbiddenInCatalog = findForbiddenKeys(catalog);
const forbiddenInTemplate = findForbiddenKeys(template);
assert(forbiddenInCatalog.length === 0, `catalog: target-specific dependency keys found at ${forbiddenInCatalog.join(', ')}`);
assert(forbiddenInTemplate.length === 0, `package template: target-specific dependency keys found at ${forbiddenInTemplate.join(', ')}`);

console.log(`Historical livery line validated: ${catalog.stages.length} stages, ${catalog.records.length} records.`);
console.log('Target-specific aircraft dependencies found: 0.');
