import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCK = {
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d',
  nodes: 1784,
  meshes: 348,
  triangles: 325358,
  materials: 30,
  images: 18,
  animations: 1,
  animationChannels: 2518,
  dualUvPrimitives: 299
};

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith('--')) continue;
  const [name, inline] = token.split('=', 2);
  if (inline !== undefined) args.set(name, inline);
  else if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) args.set(name, process.argv[++i]);
  else args.set(name, true);
}

const sourcePath = args.get('--glb') || process.env.B24_REFERENCE_GLB;
const outDir = String(args.get('--out-dir') || 'reports/b24-native');
if (!sourcePath) throw new Error('Use --glb <path> or B24_REFERENCE_GLB to provide the locked source asset.');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const source = await readFile(sourcePath);
if (source.length !== LOCK.bytes) throw new Error(`GLB byte lock mismatch: ${source.length} != ${LOCK.bytes}`);
const sourceSha = sha256(source);
if (sourceSha !== LOCK.sha256) throw new Error(`GLB SHA-256 lock mismatch: ${sourceSha}`);

function parseGlb(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Input is not a GLB file.');
  if (bytes.readUInt32LE(4) !== 2) throw new Error('Only GLB version 2 is supported.');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB header length does not match file length.');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').replace(/\0+$/g, '').trim());
    if (chunkType === 0x004e4942) bin = chunk;
    offset += 8 + chunkLength;
  }
  if (!json || !bin) throw new Error('GLB JSON or BIN chunk is missing.');
  return { json, bin };
}

const { json, bin } = parseGlb(source);
const component = {
  5120: { width: 1, read: (view, offset) => view.getInt8(offset) },
  5121: { width: 1, read: (view, offset) => view.getUint8(offset) },
  5122: { width: 2, read: (view, offset) => view.getInt16(offset, true) },
  5123: { width: 2, read: (view, offset) => view.getUint16(offset, true) },
  5125: { width: 4, read: (view, offset) => view.getUint32(offset, true) },
  5126: { width: 4, read: (view, offset) => view.getFloat32(offset, true) }
};
const arity = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const accessorCache = new Map();

function accessorValues(index) {
  if (accessorCache.has(index)) return accessorCache.get(index);
  const accessor = json.accessors[index];
  if (!accessor) throw new Error(`Missing accessor ${index}`);
  const info = component[accessor.componentType];
  const size = arity[accessor.type];
  if (!info || !size) throw new Error(`Unsupported accessor ${index}`);
  if (accessor.sparse) throw new Error(`Sparse accessor ${index} requires an explicit distillation implementation.`);
  const values = new Float64Array(accessor.count * size);
  if (accessor.bufferView !== undefined) {
    const bufferView = json.bufferViews[accessor.bufferView];
    if (!bufferView || (bufferView.buffer ?? 0) !== 0) throw new Error(`Unsupported buffer view for accessor ${index}`);
    const stride = bufferView.byteStride || info.width * size;
    const start = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    for (let row = 0; row < accessor.count; row += 1) {
      for (let column = 0; column < size; column += 1) {
        values[row * size + column] = info.read(view, start + row * stride + column * info.width);
      }
    }
  }
  const result = { accessor, values, arity: size };
  accessorCache.set(index, result);
  return result;
}

function arraysEqual(aIndex, bIndex) {
  const a = accessorValues(aIndex);
  const b = accessorValues(bIndex);
  if (a.arity !== b.arity || a.values.length !== b.values.length) return false;
  for (let i = 0; i < a.values.length; i += 1) if (!Object.is(a.values[i], b.values[i])) return false;
  return true;
}

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const out = Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return out;
}
function localMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ];
}
function transformPoint(matrix, x, y, z) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
  ];
}

const parents = Array(json.nodes.length).fill(null);
json.nodes.forEach((node, index) => {
  for (const child of node.children || []) {
    if (parents[child] !== null) throw new Error(`Node ${child} has multiple parents.`);
    parents[child] = index;
  }
});
const worldCache = Array(json.nodes.length);
function worldMatrix(index) {
  if (worldCache[index]) return worldCache[index];
  const parent = parents[index];
  worldCache[index] = multiply(parent === null ? identity : worldMatrix(parent), localMatrix(json.nodes[index]));
  return worldCache[index];
}
function nodePath(index) {
  const segments = [];
  for (let current = index; current !== null; current = parents[current]) {
    segments.unshift(`${json.nodes[current].name || 'node'}[${current}]`);
  }
  return `/${segments.join('/')}`;
}

function triangleCountForPrimitive(primitive) {
  const count = primitive.indices === undefined
    ? json.accessors[primitive.attributes.POSITION].count
    : json.accessors[primitive.indices].count;
  const mode = primitive.mode ?? 4;
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

const animatedByNode = Array.from({ length: json.nodes.length }, () => []);
const animationChannels = [];
for (let animationIndex = 0; animationIndex < (json.animations || []).length; animationIndex += 1) {
  const animation = json.animations[animationIndex];
  for (let channelIndex = 0; channelIndex < animation.channels.length; channelIndex += 1) {
    const channel = animation.channels[channelIndex];
    const targetNode = channel.target.node;
    const sampler = animation.samplers[channel.sampler];
    const input = accessorValues(sampler.input);
    const output = accessorValues(sampler.output);
    const record = {
      animation_index: animationIndex,
      animation_name: animation.name || null,
      channel_index: channelIndex,
      sampler_index: channel.sampler,
      target_node: targetNode ?? null,
      target_name: targetNode === undefined ? null : json.nodes[targetNode]?.name || null,
      target_path: channel.target.path,
      interpolation: sampler.interpolation || 'LINEAR',
      keyframes: input.accessor.count,
      input_min: input.accessor.min || null,
      input_max: input.accessor.max || null,
      output_accessor: sampler.output,
      output_count: output.accessor.count,
      output_type: output.accessor.type
    };
    animationChannels.push(record);
    if (targetNode !== undefined) animatedByNode[targetNode].push(record);
  }
}

const controllerPatterns = [
  ['propulsion.propeller-spin', /prop|spinner|blade|helice/i],
  ['landing-gear.deploy', /gear|wheel|strut|landing/i],
  ['landing-gear.door-sequence', /(gear.*door|door.*gear|trap)/i],
  ['bomb-bay.doors', /(bomb|bay|soute).*door|door.*(bomb|bay|soute)/i],
  ['payload.release', /bomb|rack|payload/i],
  ['flight-control.flaps', /flap|volet/i],
  ['flight-control.ailerons', /aileron/i],
  ['flight-control.elevators', /elevator|profondeur/i],
  ['flight-control.rudders', /rudder|direction/i],
  ['turret.azimuth', /turret|tourelle|gun|mount/i],
  ['turret.elevation', /barrel|gun|canon|elevation/i],
  ['engine.cowling-flaps', /cowl|cowling|capot/i],
  ['crew.detach-or-exit', /crew|pilot|gunner|seat/i]
];
const controllerCandidates = Object.fromEntries(controllerPatterns.map(([id]) => [id, []]));
for (let index = 0; index < json.nodes.length; index += 1) {
  const search = `${json.nodes[index].name || ''} ${nodePath(index)}`;
  for (const [controllerId, pattern] of controllerPatterns) {
    if (pattern.test(search)) controllerCandidates[controllerId].push(index);
  }
}

let triangles = 0;
let primitiveCount = 0;
let dualUvPrimitives = 0;
let identicalDualUvPrimitives = 0;
let differentDualUvPrimitives = 0;
const surfaceIndex = [];
for (let meshIndex = 0; meshIndex < json.meshes.length; meshIndex += 1) {
  const mesh = json.meshes[meshIndex];
  for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex += 1) {
    const primitive = mesh.primitives[primitiveIndex];
    primitiveCount += 1;
    const primitiveTriangles = triangleCountForPrimitive(primitive);
    triangles += primitiveTriangles;
    const uv0 = primitive.attributes.TEXCOORD_0;
    const uv1 = primitive.attributes.TEXCOORD_1;
    let uvRelationship = 'missing-one-or-both';
    if (uv0 !== undefined && uv1 !== undefined) {
      dualUvPrimitives += 1;
      if (arraysEqual(uv0, uv1)) {
        identicalDualUvPrimitives += 1;
        uvRelationship = 'identical';
      } else {
        differentDualUvPrimitives += 1;
        uvRelationship = 'different';
      }
    }
    const position = accessorValues(primitive.attributes.POSITION);
    surfaceIndex.push({
      mesh_index: meshIndex,
      mesh_name: mesh.name || null,
      primitive_index: primitiveIndex,
      mode: primitive.mode ?? 4,
      triangles: primitiveTriangles,
      vertices: position.accessor.count,
      material_index: primitive.material ?? null,
      material_name: primitive.material === undefined ? null : json.materials[primitive.material]?.name || null,
      attributes: Object.keys(primitive.attributes).sort(),
      uv0_accessor: uv0 ?? null,
      uv1_accessor: uv1 ?? null,
      uv_relationship: uvRelationship,
      position_min: position.accessor.min || null,
      position_max: position.accessor.max || null
    });
  }
}

const nodeIndex = [];
for (let index = 0; index < json.nodes.length; index += 1) {
  const node = json.nodes[index];
  const matrix = worldMatrix(index);
  let worldBounds = null;
  if (node.mesh !== undefined) {
    const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const primitive of json.meshes[node.mesh].primitives) {
      const position = accessorValues(primitive.attributes.POSITION);
      for (let i = 0; i < position.values.length; i += 3) {
        const point = transformPoint(matrix, position.values[i], position.values[i + 1], position.values[i + 2]);
        for (let axis = 0; axis < 3; axis += 1) {
          bounds[axis] = Math.min(bounds[axis], point[axis]);
          bounds[axis + 3] = Math.max(bounds[axis + 3], point[axis]);
        }
      }
    }
    worldBounds = bounds.map((value) => Number(value.toFixed(6)));
  }
  nodeIndex.push({
    node_index: index,
    name: node.name || null,
    stable_path: nodePath(index),
    parent: parents[index],
    children: node.children || [],
    mesh: node.mesh ?? null,
    camera: node.camera ?? null,
    skin: node.skin ?? null,
    local_translation: node.translation || null,
    local_rotation: node.rotation || null,
    local_scale: node.scale || null,
    local_matrix: node.matrix || null,
    world_translation: [matrix[12], matrix[13], matrix[14]].map((value) => Number(value.toFixed(6))),
    world_bounds: worldBounds,
    animation_channel_count: animatedByNode[index].length,
    animation_target_paths: [...new Set(animatedByNode[index].map((entry) => entry.target_path))].sort()
  });
}

const inventory = {
  nodes: json.nodes.length,
  meshes: json.meshes.length,
  primitives: primitiveCount,
  triangles,
  materials: (json.materials || []).length,
  embedded_images: (json.images || []).length,
  animations: (json.animations || []).length,
  animation_channels: animationChannels.length
};
const expected = {
  nodes: LOCK.nodes,
  meshes: LOCK.meshes,
  triangles: LOCK.triangles,
  materials: LOCK.materials,
  embedded_images: LOCK.images,
  animations: LOCK.animations,
  animation_channels: LOCK.animationChannels
};
for (const [key, value] of Object.entries(expected)) {
  if (inventory[key] !== value) throw new Error(`Inventory lock mismatch for ${key}: ${inventory[key]} != ${value}`);
}
if (dualUvPrimitives !== LOCK.dualUvPrimitives) {
  throw new Error(`Dual-UV primitive lock mismatch: ${dualUvPrimitives} != ${LOCK.dualUvPrimitives}`);
}
if (identicalDualUvPrimitives !== dualUvPrimitives || differentDualUvPrimitives !== 0) {
  throw new Error('The source UV relationship changed. TEXCOORD_0 and TEXCOORD_1 are no longer identical on every dual-set primitive.');
}

const [assembly, behavior, surface] = await Promise.all([
  readFile('data/b24-native/assembly-graph.json', 'utf8').then(JSON.parse),
  readFile('data/b24-native/behavior-graph.json', 'utf8').then(JSON.parse),
  readFile('data/b24-native/surface-graph.json', 'utf8').then(JSON.parse)
]);
if (assembly.nodes.length !== 31 || behavior.controllers.length !== 13 || surface.slots.length !== 62) {
  throw new Error('Native contract count mismatch. Expected 31 assembly nodes, 13 behavior controllers and 62 surface slots.');
}

const summary = {
  schema: 'haihao.aircraft/reference-glb-distillation@1.0.0',
  generated_at: new Date().toISOString(),
  source: {
    path: String(sourcePath),
    bytes: source.length,
    sha256: sourceSha,
    authority: 'visual-reference'
  },
  inventory,
  uv_audit: {
    primitives_with_texcoord_0_and_1: dualUvPrimitives,
    identical_decoded_arrays: identicalDualUvPrimitives,
    different_decoded_arrays: differentDualUvPrimitives,
    independent_livery_uv_present: false,
    legacy_uv_authority: 'reference-only'
  },
  native_contract: {
    assembly_nodes: assembly.nodes.length,
    behavior_controllers: behavior.controllers.length,
    surface_slots: surface.slots.length,
    aircraft_data_master_approved: false,
    surface_system_approved: false
  },
  controller_candidate_counts: Object.fromEntries(
    Object.entries(controllerCandidates).map(([id, nodes]) => [id, nodes.length])
  ),
  replacement_priority: [
    'turrets, guns and crew entities',
    'payload racks and release constraints',
    'semantic flight-control and mechanism behaviors',
    'external geometry recipes',
    'legacy materials and UVs',
    'interior and minor fittings'
  ]
};

await mkdir(outDir, { recursive: true });
await Promise.all([
  writeFile(path.join(outDir, 'reference-glb-distillation.json'), `${JSON.stringify(summary, null, 2)}\n`),
  writeFile(path.join(outDir, 'reference-glb-node-index.json'), `${JSON.stringify({ source_sha256: sourceSha, nodes: nodeIndex }, null, 2)}\n`),
  writeFile(path.join(outDir, 'reference-glb-animation-index.json'), `${JSON.stringify({ source_sha256: sourceSha, channels: animationChannels, controller_candidates: controllerCandidates }, null, 2)}\n`),
  writeFile(path.join(outDir, 'reference-glb-surface-index.json'), `${JSON.stringify({ source_sha256: sourceSha, primitives: surfaceIndex }, null, 2)}\n`)
]);

console.log(JSON.stringify(summary, null, 2));
