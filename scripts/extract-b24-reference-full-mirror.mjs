import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const LOCK = Object.freeze({
  file: 'b-24_liberator.glb',
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d',
  scenes: 1,
  nodes: 1784,
  meshes: 348,
  triangles: 325358,
  materials: 30,
  images: 18,
  animations: 1,
  animationChannels: 2518,
  animationSamplers: 2518,
  accessors: 6702,
  bufferViews: 24
});

const COMPONENT = Object.freeze({
  5120: { name: 'BYTE', width: 1 },
  5121: { name: 'UNSIGNED_BYTE', width: 1 },
  5122: { name: 'SHORT', width: 2 },
  5123: { name: 'UNSIGNED_SHORT', width: 2 },
  5125: { name: 'UNSIGNED_INT', width: 4 },
  5126: { name: 'FLOAT', width: 4 }
});
const ARITY = Object.freeze({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 });
const IDENTITY = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const SEMANTIC_CANDIDATES = Object.freeze([
  { group_id: 'propulsion.propeller', pattern: /prop|spinner|helice/i },
  { group_id: 'landing-gear.structure', pattern: /gear|strut|landing/i },
  { group_id: 'landing-gear.wheel', pattern: /wheel/i },
  { group_id: 'payload.bomb-bay-door', pattern: /bomb.*door|door.*bomb|bay.*door|door.*bay/i },
  { group_id: 'flight-control.flap', pattern: /(^|_)flap|volet/i },
  { group_id: 'flight-control.aileron', pattern: /aileron/i },
  { group_id: 'flight-control.elevator', pattern: /elevator|profondeur/i },
  { group_id: 'flight-control.rudder', pattern: /rudder|direction/i },
  { group_id: 'propulsion.cowling-flap', pattern: /cowl.*flap|flap.*cowl|capot/i },
  { group_id: 'armament.turret', pattern: /turret|tourelle/i },
  { group_id: 'armament.gun', pattern: /(^|_)gun|canon|barrel/i },
  { group_id: 'crew.entity', pattern: /crew|pilot|gunner|navigator|bombardier|seat/i }
]);

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const equals = token.indexOf('=');
    if (equals >= 0) {
      args.set(token.slice(0, equals), token.slice(equals + 1));
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args.set(token, argv[++i]);
    } else {
      args.set(token, true);
    }
  }
  return args;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseGlb(bytes) {
  if (bytes.length < 20) throw new Error('GLB is too small.');
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Input is not a GLB file.');
  if (bytes.readUInt32LE(4) !== 2) throw new Error('Only GLB version 2 is supported.');
  if (bytes.readUInt32LE(8) !== bytes.length) throw new Error('GLB header length does not match actual bytes.');
  let offset = 12;
  let json = null;
  let bin = null;
  const chunks = [];
  while (offset + 8 <= bytes.length) {
    const byteLength = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + byteLength;
    if (end > bytes.length) throw new Error(`GLB chunk at ${offset} exceeds file length.`);
    const payload = bytes.subarray(start, end);
    chunks.push({ type, byteLength, sha256: sha256(payload) });
    if (type === 0x4e4f534a) json = JSON.parse(payload.toString('utf8').replace(/\0+$/g, '').trim());
    if (type === 0x004e4942) bin = payload;
    offset = end;
  }
  if (!json || !bin) throw new Error('GLB JSON or BIN chunk is missing.');
  return { json, bin, chunks };
}

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
  if (node.matrix) return [...node.matrix];
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

function roundMatrix(matrix) {
  return matrix.map((value) => Number(value.toFixed(9)));
}

function triangleCount(json, primitive) {
  const mode = primitive.mode ?? 4;
  const count = primitive.indices === undefined
    ? json.accessors[primitive.attributes.POSITION].count
    : json.accessors[primitive.indices].count;
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

function extensionForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

const args = parseArgs(process.argv);
const glbPath = args.get('--glb') || process.env.B24_REFERENCE_GLB;
const outDir = String(args.get('--out-dir') || 'reports/b24-reference-full-mirror');
if (!glbPath) throw new Error('Provide the locked source with --glb <path> or B24_REFERENCE_GLB.');

const source = await readFile(glbPath);
const sourceHash = sha256(source);
if (source.length !== LOCK.bytes) throw new Error(`Source byte lock mismatch: ${source.length} != ${LOCK.bytes}`);
if (sourceHash !== LOCK.sha256) throw new Error(`Source SHA-256 lock mismatch: ${sourceHash}`);

const { json, bin, chunks } = parseGlb(source);
const actualInventory = {
  scenes: (json.scenes || []).length,
  nodes: (json.nodes || []).length,
  meshes: (json.meshes || []).length,
  triangles: (json.meshes || []).reduce(
    (sum, mesh) => sum + mesh.primitives.reduce((inner, primitive) => inner + triangleCount(json, primitive), 0),
    0
  ),
  materials: (json.materials || []).length,
  images: (json.images || []).length,
  animations: (json.animations || []).length,
  animationChannels: (json.animations || []).reduce((sum, animation) => sum + animation.channels.length, 0),
  animationSamplers: (json.animations || []).reduce((sum, animation) => sum + animation.samplers.length, 0),
  accessors: (json.accessors || []).length,
  bufferViews: (json.bufferViews || []).length
};
for (const key of Object.keys(actualInventory)) {
  if (actualInventory[key] !== LOCK[key]) throw new Error(`Inventory lock mismatch for ${key}: ${actualInventory[key]} != ${LOCK[key]}`);
}

const parents = Array(json.nodes.length).fill(null);
json.nodes.forEach((node, parentIndex) => {
  for (const childIndex of node.children || []) {
    if (parents[childIndex] !== null) throw new Error(`Node ${childIndex} has multiple parents.`);
    parents[childIndex] = parentIndex;
  }
});
const worldMatrices = Array(json.nodes.length);
function getWorldMatrix(index) {
  if (worldMatrices[index]) return worldMatrices[index];
  const parent = parents[index];
  worldMatrices[index] = multiply(parent === null ? IDENTITY : getWorldMatrix(parent), localMatrix(json.nodes[index]));
  return worldMatrices[index];
}
function nodePath(index) {
  const segments = [];
  for (let current = index; current !== null; current = parents[current]) {
    segments.unshift(`${json.nodes[current].name || 'unnamed'}[${current}]`);
  }
  return `/${segments.join('/')}`;
}

const blockByHash = new Map();
const blocks = [];
const blockPayloads = [];
let mirrorPayloadLength = 0;
function align4() {
  const padding = (4 - (mirrorPayloadLength % 4)) % 4;
  if (padding) {
    blockPayloads.push(Buffer.alloc(padding));
    mirrorPayloadLength += padding;
  }
}
function tightlyPackAccessor(accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  if (accessor.sparse) throw new Error(`Sparse accessor ${accessorIndex} is unsupported by the exact mirror extractor.`);
  const component = COMPONENT[accessor.componentType];
  const arity = ARITY[accessor.type];
  if (!component || !arity) throw new Error(`Unsupported accessor layout at ${accessorIndex}.`);
  const elementBytes = component.width * arity;
  const output = Buffer.alloc(accessor.count * elementBytes);
  if (accessor.bufferView === undefined) return output;
  const view = json.bufferViews[accessor.bufferView];
  if ((view.buffer ?? 0) !== 0) throw new Error(`Accessor ${accessorIndex} uses unsupported buffer ${view.buffer}.`);
  const stride = view.byteStride || elementBytes;
  const sourceOffset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  for (let row = 0; row < accessor.count; row += 1) {
    const start = sourceOffset + row * stride;
    bin.copy(output, row * elementBytes, start, start + elementBytes);
  }
  return output;
}

const accessorRecords = [];
for (let accessorIndex = 0; accessorIndex < json.accessors.length; accessorIndex += 1) {
  const accessor = json.accessors[accessorIndex];
  const packed = tightlyPackAccessor(accessorIndex);
  const hash = sha256(packed);
  let block = blockByHash.get(hash);
  if (block && !block.payload.equals(packed)) throw new Error(`SHA-256 collision while packing accessor ${accessorIndex}.`);
  if (!block) {
    align4();
    block = {
      block_id: `block-${String(blocks.length).padStart(4, '0')}`,
      byte_offset: mirrorPayloadLength,
      byte_length: packed.length,
      sha256: hash,
      payload: packed
    };
    blocks.push(block);
    blockByHash.set(hash, block);
    blockPayloads.push(packed);
    mirrorPayloadLength += packed.length;
  }
  const view = accessor.bufferView === undefined ? null : json.bufferViews[accessor.bufferView];
  accessorRecords.push({
    accessor_index: accessorIndex,
    component_type: accessor.componentType,
    component_name: COMPONENT[accessor.componentType]?.name || null,
    type: accessor.type,
    count: accessor.count,
    normalized: accessor.normalized === true,
    min: accessor.min || null,
    max: accessor.max || null,
    source_buffer_view: accessor.bufferView ?? null,
    source_byte_offset: accessor.byteOffset || 0,
    source_byte_stride: view?.byteStride || null,
    packed_block_id: block.block_id,
    packed_byte_offset: block.byte_offset,
    packed_byte_length: block.byte_length,
    packed_sha256: block.sha256
  });
}
const mirrorPayload = Buffer.concat(blockPayloads);
if (mirrorPayload.length !== mirrorPayloadLength) throw new Error('Internal mirror payload length mismatch.');

const sceneGraph = {
  schema: 'haihao.aircraft/reference-scene-graph@1.0.0',
  source_sha256: sourceHash,
  default_scene: json.scene ?? 0,
  scenes: structuredClone(json.scenes || []),
  nodes: json.nodes.map((node, index) => ({
    node_index: index,
    stable_path: nodePath(index),
    parent_index: parents[index],
    source: structuredClone(node),
    local_matrix_resolved: roundMatrix(localMatrix(node)),
    world_matrix_resolved: roundMatrix(getWorldMatrix(index))
  }))
};

const meshRecords = json.meshes.map((mesh, meshIndex) => ({
  mesh_index: meshIndex,
  name: mesh.name || null,
  weights: mesh.weights || null,
  extras: mesh.extras || null,
  primitives: mesh.primitives.map((primitive, primitiveIndex) => ({
    primitive_index: primitiveIndex,
    mode: primitive.mode ?? 4,
    triangles: triangleCount(json, primitive),
    indices: primitive.indices ?? null,
    material: primitive.material ?? null,
    attributes: structuredClone(primitive.attributes || {}),
    targets: structuredClone(primitive.targets || null),
    extras: structuredClone(primitive.extras || null),
    extensions: structuredClone(primitive.extensions || null)
  }))
}));

const nodeAnimationCounts = Array(json.nodes.length).fill(0);
const animationRecords = (json.animations || []).map((animation, animationIndex) => {
  const samplers = animation.samplers.map((sampler, samplerIndex) => {
    const inputAccessor = json.accessors[sampler.input];
    return {
      sampler_index: samplerIndex,
      input_accessor: sampler.input,
      output_accessor: sampler.output,
      interpolation: sampler.interpolation || 'LINEAR',
      keyframes: inputAccessor.count,
      input_min: inputAccessor.min || null,
      input_max: inputAccessor.max || null
    };
  });
  const channels = animation.channels.map((channel, channelIndex) => {
    const nodeIndex = channel.target.node ?? null;
    if (nodeIndex !== null) nodeAnimationCounts[nodeIndex] += 1;
    return {
      channel_index: channelIndex,
      sampler_index: channel.sampler,
      target_node: nodeIndex,
      target_name: nodeIndex === null ? null : json.nodes[nodeIndex]?.name || null,
      target_stable_path: nodeIndex === null ? null : nodePath(nodeIndex),
      target_path: channel.target.path,
      extensions: structuredClone(channel.extensions || null),
      extras: structuredClone(channel.extras || null)
    };
  });
  const timelineMin = Math.min(...samplers.flatMap((sampler) => sampler.input_min || []));
  const timelineMax = Math.max(...samplers.flatMap((sampler) => sampler.input_max || []));
  return {
    animation_index: animationIndex,
    name: animation.name || null,
    timeline_min_seconds: Number.isFinite(timelineMin) ? timelineMin : null,
    timeline_max_seconds: Number.isFinite(timelineMax) ? timelineMax : null,
    duration_seconds: Number.isFinite(timelineMin) && Number.isFinite(timelineMax) ? timelineMax - timelineMin : null,
    samplers,
    channels,
    extras: structuredClone(animation.extras || null),
    extensions: structuredClone(animation.extensions || null)
  };
});

function descendantsOf(seedIndexes) {
  const found = new Set();
  const stack = [...seedIndexes];
  while (stack.length) {
    const index = stack.pop();
    if (found.has(index)) continue;
    found.add(index);
    for (const child of json.nodes[index].children || []) stack.push(child);
  }
  return [...found].sort((a, b) => a - b);
}
function semanticNodeRecord(index) {
  return {
    node_index: index,
    name: json.nodes[index].name || null,
    stable_path: nodePath(index),
    mesh: json.nodes[index].mesh ?? null,
    animation_channel_count: nodeAnimationCounts[index]
  };
}
const semanticGroups = SEMANTIC_CANDIDATES.map(({ group_id, pattern }) => {
  const directIndexes = [];
  for (let index = 0; index < json.nodes.length; index += 1) {
    if (pattern.test(json.nodes[index].name || '')) directIndexes.push(index);
  }
  const subtreeIndexes = descendantsOf(directIndexes);
  return {
    group_id,
    status: 'candidate-only-upstream-review-required',
    automatic_approval: false,
    direct_name_match_count: directIndexes.length,
    subtree_member_count: subtreeIndexes.length,
    direct_name_matches: directIndexes.map(semanticNodeRecord),
    subtree_members: subtreeIndexes.map(semanticNodeRecord)
  };
});

const imagesDir = path.join(outDir, 'images');
await mkdir(imagesDir, { recursive: true });
const imageRecords = [];
for (let imageIndex = 0; imageIndex < (json.images || []).length; imageIndex += 1) {
  const image = json.images[imageIndex];
  if (image.bufferView === undefined) throw new Error(`Image ${imageIndex} is not embedded in a buffer view.`);
  const view = json.bufferViews[image.bufferView];
  const start = view.byteOffset || 0;
  const bytes = bin.subarray(start, start + view.byteLength);
  const extension = extensionForMime(image.mimeType);
  const filename = `${String(imageIndex).padStart(3, '0')}.${extension}`;
  await writeFile(path.join(imagesDir, filename), bytes);
  imageRecords.push({
    image_index: imageIndex,
    name: image.name || null,
    mime_type: image.mimeType || null,
    source_buffer_view: image.bufferView,
    file: `images/${filename}`,
    bytes: bytes.length,
    sha256: sha256(bytes)
  });
}

const sourceJson = {
  asset: structuredClone(json.asset),
  extensions_used: structuredClone(json.extensionsUsed || []),
  extensions_required: structuredClone(json.extensionsRequired || []),
  buffers: structuredClone(json.buffers || []),
  buffer_views: structuredClone(json.bufferViews || []),
  accessors: accessorRecords,
  cameras: structuredClone(json.cameras || []),
  skins: structuredClone(json.skins || []),
  materials: structuredClone(json.materials || []),
  textures: structuredClone(json.textures || []),
  samplers: structuredClone(json.samplers || []),
  images: imageRecords
};

const blockManifest = blocks.map(({ payload, ...record }) => record);
const unresolvedGroups = semanticGroups
  .filter((group) => group.direct_name_match_count === 0)
  .map((group) => group.group_id);

const manifest = {
  schema: 'haihao.aircraft/reference-full-mirror@1.0.0',
  generated_at: new Date().toISOString(),
  purpose: 'Exact, source-traceable extraction of the locked B24 reference asset before semantic rebuilding.',
  source: {
    file: LOCK.file,
    input_path: String(glbPath),
    bytes: source.length,
    sha256: sourceHash,
    authority: 'reference-model-only'
  },
  source_chunks: chunks,
  inventory: actualInventory,
  mirror_payload: {
    file: 'reference-accessor-payload.bin',
    bytes: mirrorPayload.length,
    sha256: sha256(mirrorPayload),
    source_accessor_count: accessorRecords.length,
    unique_packed_block_count: blockManifest.length,
    deduplicated: true,
    format: '4-byte-aligned, tightly packed accessor blocks indexed by accessors.json'
  },
  extracted_images: {
    count: imageRecords.length,
    all_source_images_accounted: imageRecords.length === LOCK.images
  },
  structural_fidelity: {
    scenes_preserved: true,
    node_hierarchy_preserved: true,
    local_transforms_preserved: true,
    world_transforms_resolved: true,
    mesh_primitive_contracts_preserved: true,
    accessor_payloads_preserved: true,
    material_texture_contracts_preserved: true,
    animation_channels_preserved: true,
    animation_sampler_payloads_preserved: true
  },
  semantic_policy: {
    upstream_controller: 'ChatGPT',
    automatic_semantic_approval: false,
    img2threejs_analysis_authority: false,
    unreviewed_candidates_are_truth: false,
    unresolved_groups: unresolvedGroups
  },
  approvals: {
    structural_mirror_extracted: true,
    exact_replay_runtime_approved: false,
    visual_parity_approved: false,
    animation_semantics_approved: false,
    aircraft_system_mapping_approved: false,
    native_geometry_replacement_approved: false
  },
  next_gates: [
    'Build a custom exact-replay loader from this mirror package without reading a GLB container.',
    'Compare reference GLB and exact-replay renders from fixed cameras and fixed animation times.',
    'Manually map node groups to aircraft systems using hierarchy, motion, bounds and rendered evidence.',
    'Freeze semantic component identities before any geometry recipe replaces source geometry.'
  ]
};

const qa = {
  schema: 'haihao.aircraft/reference-full-mirror-qa@1.0.0',
  source_lock_passed: source.length === LOCK.bytes && sourceHash === LOCK.sha256,
  inventory_lock_passed: Object.entries(actualInventory).every(([key, value]) => value === LOCK[key]),
  accessor_coverage_passed: accessorRecords.length === LOCK.accessors,
  image_coverage_passed: imageRecords.length === LOCK.images,
  animation_coverage_passed: animationRecords.reduce((sum, animation) => sum + animation.channels.length, 0) === LOCK.animationChannels,
  scene_graph_coverage_passed: sceneGraph.nodes.length === LOCK.nodes,
  mesh_contract_coverage_passed: meshRecords.length === LOCK.meshes,
  semantic_auto_approval_count: 0,
  visual_parity_status: 'pending-exact-replay-browser-qa',
  result: 'structural-mirror-extraction-pass'
};
if (!Object.entries(qa).filter(([key]) => key.endsWith('_passed')).every(([, value]) => value === true)) {
  throw new Error(`Reference mirror QA failed: ${JSON.stringify(qa)}`);
}

await mkdir(outDir, { recursive: true });
await Promise.all([
  writeFile(path.join(outDir, 'manifest.json'), stableJson(manifest)),
  writeFile(path.join(outDir, 'qa.json'), stableJson(qa)),
  writeFile(path.join(outDir, 'scene-graph.json'), stableJson(sceneGraph)),
  writeFile(path.join(outDir, 'meshes.json'), stableJson({ source_sha256: sourceHash, meshes: meshRecords })),
  writeFile(path.join(outDir, 'accessors.json'), stableJson({ source_sha256: sourceHash, blocks: blockManifest, accessors: accessorRecords })),
  writeFile(path.join(outDir, 'source-assets.json'), stableJson(sourceJson)),
  writeFile(path.join(outDir, 'animations.json'), stableJson({ source_sha256: sourceHash, animations: animationRecords })),
  writeFile(path.join(outDir, 'semantic-candidates.json'), stableJson({
    source_sha256: sourceHash,
    policy: 'candidate-only-upstream-review-required',
    groups: semanticGroups
  })),
  writeFile(path.join(outDir, 'reference-accessor-payload.bin'), mirrorPayload)
]);

console.log(JSON.stringify({
  source: manifest.source,
  inventory: manifest.inventory,
  mirror_payload: manifest.mirror_payload,
  semantic_candidate_counts: Object.fromEntries(semanticGroups.map((group) => [group.group_id, { direct: group.direct_name_match_count, subtree: group.subtree_member_count }])),
  approvals: manifest.approvals,
  qa
}, null, 2));
