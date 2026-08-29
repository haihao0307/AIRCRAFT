import { readFile } from 'node:fs/promises';

const paths = {
  master: 'data/b24-native/aircraft-master.json',
  assembly: 'data/b24-native/assembly-graph.json',
  behavior: 'data/b24-native/behavior-graph.json',
  surface: 'data/b24-native/surface-graph.json',
  evidence: 'data/b24-native/evidence-graph.json',
  adapter: 'data/b24-native/reference-adapters/authoritative-glb.json'
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const [master, assembly, behavior, surface, evidence, adapter] = await Promise.all(
  Object.values(paths).map(readJson)
);

const fail = (message) => {
  throw new Error(`B24 native contract validation failed: ${message}`);
};
const unique = (values) => new Set(values).size === values.length;

if (master.master_id !== 'B24J_CO_DATA_NATIVE_MASTER') fail('unexpected master_id');
if (master.aircraftDataMasterApproved !== false) fail('foundation must remain unapproved');

if (assembly.node_count !== 31 || assembly.nodes.length !== 31) fail('assembly node count must be 31');
const componentIds = assembly.nodes.map((node) => node.component_id);
if (!unique(componentIds)) fail('component IDs are not unique');
const componentSet = new Set(componentIds);
if (!componentSet.has(assembly.root_component_id)) fail('root component is missing');
for (const node of assembly.nodes) {
  if (node.parent !== null && !componentSet.has(node.parent)) {
    fail(`unresolved parent ${node.parent} for ${node.component_id}`);
  }
}

if (behavior.controller_count !== 13 || behavior.controllers.length !== 13) {
  fail('behavior controller count must be 13');
}
const controllerIds = behavior.controllers.map((controller) => controller.controller_id);
if (!unique(controllerIds)) fail('behavior controller IDs are not unique');
for (const controller of behavior.controllers) {
  for (const target of controller.targets) {
    if (!componentSet.has(target)) fail(`unresolved behavior target ${target}`);
  }
}

if (surface.slot_count !== 62 || surface.slots.length !== 62) fail('surface slot count must be 62');
const surfaceIds = surface.slots.map((slot) => slot.surface_id);
if (!unique(surfaceIds)) fail('surface IDs are not unique');
for (const slot of surface.slots) {
  if (!componentSet.has(slot.component_id)) fail(`unresolved surface component ${slot.component_id}`);
}
if (surface.legacy_uv?.TEXCOORD_0 !== 'reference-only') fail('legacy UV0 authority drift');
if (surface.qa?.independentLiveryUvApproved !== false) fail('legacy livery UV must remain unapproved');

const inventoryClaim = evidence.claims.find((claim) => claim.claim_id === 'B24-CLAIM-INV-001');
const uvClaim = evidence.claims.find((claim) => claim.claim_id === 'B24-CLAIM-UV-001');
if (!inventoryClaim || !uvClaim) fail('required evidence claims are missing');

const expected = {
  nodes: 1784,
  meshes: 348,
  triangles: 325358,
  materials: 30,
  embedded_images: 18,
  animations: 1,
  animation_channels: 2518
};
for (const [key, value] of Object.entries(expected)) {
  if (inventoryClaim.value[key] !== value) fail(`inventory claim mismatch for ${key}`);
  const adapterKey = key === 'embedded_images' ? 'embedded_images' : key;
  if (adapter.locked_inventory[adapterKey] !== value) fail(`adapter lock mismatch for ${key}`);
}
if (uvClaim.value.primitives_with_uv0_and_uv1 !== 299) fail('UV dual-set primitive count drift');
if (uvClaim.value.independent_livery_uv_present !== false) fail('UV authority drift');
if (adapter.runtime_dependency !== false) fail('native runtime must not require the GLB');

console.log(JSON.stringify({
  ok: true,
  master: master.master_id,
  assemblyNodes: assembly.nodes.length,
  behaviorControllers: behavior.controllers.length,
  surfaceSlots: surface.slots.length,
  referenceGlb: {
    bytes: adapter.source.bytes,
    sha256: adapter.source.sha256
  },
  approval: {
    aircraftDataMasterApproved: master.aircraftDataMasterApproved,
    surfaceSystemApproved: surface.surfaceSystemApproved
  }
}, null, 2));
