#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';

const root = process.cwd();

function parseArgs(argv) {
  const result = {
    request: 'data/b24-native/components/empennage/vertical-tail-reference-extraction-request.json',
    out: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--request') result.request = argv[++index];
    else if (token === '--out') result.out = argv[++index];
    else throw new Error(`Unknown argument: ${token}`);
  }
  return result;
}

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const readJson = relativePath => JSON.parse(fs.readFileSync(path.resolve(root, relativePath), 'utf8'));

function readLockedSource(request) {
  const manifestPath = path.resolve(root, request.source.manifest);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.file !== request.source.expected_file) throw new Error(`Manifest file mismatch: ${manifest.file}`);
  if (manifest.bytes !== request.source.expected_bytes) throw new Error(`Manifest byte-count mismatch: ${manifest.bytes}`);
  if (manifest.sha256 !== request.source.expected_sha256) throw new Error(`Manifest SHA256 mismatch: ${manifest.sha256}`);
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) throw new Error('Chunk manifest is empty');

  const chunkDirectory = path.dirname(manifestPath);
  const payloads = [];
  let byteCount = 0;
  for (const entry of [...manifest.chunks].sort((a, b) => a.index - b.index)) {
    const chunkPath = path.join(chunkDirectory, entry.file);
    const payload = fs.readFileSync(chunkPath);
    if (payload.length !== entry.bytes) throw new Error(`Chunk byte-count mismatch: ${entry.file}`);
    const digest = sha256(payload);
    if (digest !== entry.sha256) throw new Error(`Chunk SHA256 mismatch: ${entry.file}`);
    payloads.push(payload);
    byteCount += payload.length;
  }

  const source = Buffer.concat(payloads);
  if (byteCount !== request.source.expected_bytes || source.length !== request.source.expected_bytes) {
    throw new Error(`Reassembled byte-count mismatch: ${source.length}`);
  }
  const sourceDigest = sha256(source);
  if (sourceDigest !== request.source.expected_sha256) throw new Error(`Reassembled SHA256 mismatch: ${sourceDigest}`);
  return { source, manifest, sourceDigest };
}

function parseGlb(source) {
  if (source.length < 20) throw new Error('GLB is too small');
  const magic = source.readUInt32LE(0);
  const version = source.readUInt32LE(4);
  const declaredLength = source.readUInt32LE(8);
  if (magic !== 0x46546c67) throw new Error(`Invalid GLB magic: 0x${magic.toString(16)}`);
  if (version !== 2) throw new Error(`Unsupported GLB version: ${version}`);
  if (declaredLength !== source.length) throw new Error(`GLB declared length mismatch: ${declaredLength}`);

  let offset = 12;
  let json = null;
  let binary = null;
  while (offset + 8 <= source.length) {
    const length = source.readUInt32LE(offset);
    const type = source.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end > source.length) throw new Error('GLB chunk extends past file boundary');
    if (type === 0x4e4f534a) {
      const text = source.subarray(start, end).toString('utf8').replace(/[\u0000\u0020]+$/g, '');
      json = JSON.parse(text);
    } else if (type === 0x004e4942) {
      binary = source.subarray(start, end);
    }
    offset = end;
  }
  if (!json) throw new Error('GLB JSON chunk is missing');
  if (!binary) throw new Error('GLB BIN chunk is missing');
  return { json, binary };
}

function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function composeMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return node.matrix.map(Number);
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const x2 = qx + qx;
  const y2 = qy + qy;
  const z2 = qz + qz;
  const xx = qx * x2;
  const xy = qx * y2;
  const xz = qx * z2;
  const yy = qy * y2;
  const yz = qy * z2;
  const zz = qz * z2;
  const wx = qw * x2;
  const wy = qw * y2;
  const wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1
  ];
}

function multiplyMatrices(a, b) {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let value = 0;
      for (let inner = 0; inner < 4; inner += 1) {
        value += a[inner * 4 + row] * b[column * 4 + inner];
      }
      result[column * 4 + row] = value;
    }
  }
  return result;
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  const divisor = w && w !== 1 ? w : 1;
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / divisor,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / divisor,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / divisor
  ];
}

function buildParentMap(json) {
  const parents = new Array((json.nodes || []).length).fill(null);
  for (let parentIndex = 0; parentIndex < (json.nodes || []).length; parentIndex += 1) {
    for (const childIndex of json.nodes[parentIndex].children || []) {
      if (parents[childIndex] !== null && parents[childIndex] !== parentIndex) {
        throw new Error(`Node ${childIndex} has multiple parents in source scene graph`);
      }
      parents[childIndex] = parentIndex;
    }
  }
  return parents;
}

function buildWorldMatrices(json, parents) {
  const local = (json.nodes || []).map(composeMatrix);
  const world = new Array(local.length);
  const visiting = new Set();
  const resolve = nodeIndex => {
    if (world[nodeIndex]) return world[nodeIndex];
    if (visiting.has(nodeIndex)) throw new Error(`Cycle detected at node ${nodeIndex}`);
    visiting.add(nodeIndex);
    const parent = parents[nodeIndex];
    world[nodeIndex] = parent === null ? local[nodeIndex] : multiplyMatrices(resolve(parent), local[nodeIndex]);
    visiting.delete(nodeIndex);
    return world[nodeIndex];
  };
  for (let index = 0; index < local.length; index += 1) resolve(index);
  return { local, world };
}

function stableNodeName(node, index) {
  const raw = typeof node.name === 'string' && node.name.trim() ? node.name.trim() : 'unnamed';
  return `${raw}[${index}]`;
}

function parentChain(json, parents, nodeIndex) {
  const result = [];
  let current = nodeIndex;
  while (current !== null) {
    const node = json.nodes[current];
    result.push({ node_id: current, name: node.name || null });
    current = parents[current];
  }
  return result.reverse();
}

function stablePath(json, parents, nodeIndex) {
  return parentChain(json, parents, nodeIndex)
    .map(entry => stableNodeName(json.nodes[entry.node_id], entry.node_id))
    .join('/');
}

function collectDescendants(json, rootNode) {
  const result = [];
  const stack = [rootNode];
  const seen = new Set();
  while (stack.length) {
    const nodeIndex = stack.pop();
    if (seen.has(nodeIndex)) continue;
    seen.add(nodeIndex);
    result.push(nodeIndex);
    const children = json.nodes[nodeIndex]?.children || [];
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
  }
  return result;
}

const componentCountByType = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
};

const componentInfo = {
  5120: { bytes: 1, method: 'getInt8' },
  5121: { bytes: 1, method: 'getUint8' },
  5122: { bytes: 2, method: 'getInt16' },
  5123: { bytes: 2, method: 'getUint16' },
  5125: { bytes: 4, method: 'getUint32' },
  5126: { bytes: 4, method: 'getFloat32' }
};

function decodeAccessor(json, binary, accessorIndex, cache) {
  if (cache.has(accessorIndex)) return cache.get(accessorIndex);
  const accessor = json.accessors?.[accessorIndex];
  if (!accessor) throw new Error(`Accessor ${accessorIndex} is missing`);
  const components = componentCountByType[accessor.type];
  const info = componentInfo[accessor.componentType];
  if (!components || !info) throw new Error(`Unsupported accessor ${accessorIndex} format`);
  if (accessor.sparse) throw new Error(`Sparse accessor ${accessorIndex} is not supported by this evidence extractor`);
  if (accessor.bufferView === undefined) throw new Error(`Accessor ${accessorIndex} has no bufferView`);
  const view = json.bufferViews?.[accessor.bufferView];
  if (!view) throw new Error(`BufferView ${accessor.bufferView} is missing`);
  if ((view.buffer ?? 0) !== 0) throw new Error(`Accessor ${accessorIndex} references unsupported buffer ${(view.buffer ?? 0)}`);

  const stride = view.byteStride || components * info.bytes;
  const baseOffset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const dataView = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const values = new Array(accessor.count);
  for (let item = 0; item < accessor.count; item += 1) {
    const row = new Array(components);
    const rowOffset = baseOffset + item * stride;
    for (let component = 0; component < components; component += 1) {
      const offset = rowOffset + component * info.bytes;
      row[component] = dataView[info.method](offset, true);
    }
    values[item] = row;
  }
  cache.set(accessorIndex, values);
  return values;
}

function createBounds() {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
    point_count: 0
  };
}

function expandBounds(bounds, point) {
  for (let axis = 0; axis < 3; axis += 1) {
    bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
    bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
  }
  bounds.point_count += 1;
}

function finalizeBounds(bounds) {
  if (bounds.point_count === 0) return null;
  const size = bounds.max.map((value, axis) => value - bounds.min[axis]);
  const center = bounds.max.map((value, axis) => (value + bounds.min[axis]) / 2);
  return {
    min: bounds.min,
    max: bounds.max,
    size,
    center,
    decoded_point_count: bounds.point_count
  };
}

function triangleCount(json, primitive) {
  const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
  const count = json.accessors?.[accessorIndex]?.count || 0;
  const mode = primitive.mode ?? 4;
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

function meshEvidence(json, binary, nodeIndices, worldMatrices) {
  const accessorCache = new Map();
  const bounds = createBounds();
  const primitiveRecords = [];
  const meshIds = new Set();
  const materialIds = new Set();
  let triangleTotal = 0;

  for (const nodeIndex of nodeIndices) {
    const node = json.nodes[nodeIndex];
    if (node.mesh === undefined) continue;
    const mesh = json.meshes?.[node.mesh];
    if (!mesh) throw new Error(`Mesh ${node.mesh} referenced by node ${nodeIndex} is missing`);
    meshIds.add(node.mesh);
    for (let primitiveIndex = 0; primitiveIndex < (mesh.primitives || []).length; primitiveIndex += 1) {
      const primitive = mesh.primitives[primitiveIndex];
      const positionAccessor = primitive.attributes?.POSITION;
      if (positionAccessor === undefined) continue;
      const points = decodeAccessor(json, binary, positionAccessor, accessorCache);
      for (const point of points) expandBounds(bounds, transformPoint(worldMatrices[nodeIndex], point));
      if (primitive.material !== undefined) materialIds.add(primitive.material);
      const triangles = triangleCount(json, primitive);
      triangleTotal += triangles;
      primitiveRecords.push({
        node_id: nodeIndex,
        mesh_id: node.mesh,
        primitive_index: primitiveIndex,
        position_accessor: positionAccessor,
        index_accessor: primitive.indices ?? null,
        material_id: primitive.material ?? null,
        mode: primitive.mode ?? 4,
        vertex_count: json.accessors?.[positionAccessor]?.count || 0,
        triangle_count: triangles
      });
    }
  }

  return {
    mesh_ids: [...meshIds].sort((a, b) => a - b),
    material_ids: [...materialIds].sort((a, b) => a - b),
    primitive_count: primitiveRecords.length,
    triangle_count: triangleTotal,
    primitives: primitiveRecords,
    world_bounds: finalizeBounds(bounds)
  };
}

function animationEvidence(json, nodeSet) {
  const records = [];
  for (let animationIndex = 0; animationIndex < (json.animations || []).length; animationIndex += 1) {
    const animation = json.animations[animationIndex];
    for (let channelIndex = 0; channelIndex < (animation.channels || []).length; channelIndex += 1) {
      const channel = animation.channels[channelIndex];
      const targetNode = channel.target?.node;
      if (targetNode === undefined || !nodeSet.has(targetNode)) continue;
      const sampler = animation.samplers?.[channel.sampler];
      records.push({
        animation_index: animationIndex,
        animation_name: animation.name || null,
        channel_index: channelIndex,
        sampler_index: channel.sampler,
        target_node_id: targetNode,
        target_path: channel.target?.path || null,
        interpolation: sampler?.interpolation || 'LINEAR',
        input_accessor: sampler?.input ?? null,
        output_accessor: sampler?.output ?? null,
        keyframe_count: sampler?.input === undefined ? null : json.accessors?.[sampler.input]?.count ?? null
      });
    }
  }
  return records;
}

function materialEvidence(json, materialIds) {
  return materialIds.map(materialId => {
    const material = json.materials?.[materialId] || {};
    return {
      material_id: materialId,
      name: material.name || null,
      alpha_mode: material.alphaMode || 'OPAQUE',
      double_sided: material.doubleSided === true,
      base_color_factor: material.pbrMetallicRoughness?.baseColorFactor || null,
      base_color_texture: material.pbrMetallicRoughness?.baseColorTexture?.index ?? null,
      metallic_factor: material.pbrMetallicRoughness?.metallicFactor ?? 1,
      roughness_factor: material.pbrMetallicRoughness?.roughnessFactor ?? 1,
      normal_texture: material.normalTexture?.index ?? null,
      emissive_texture: material.emissiveTexture?.index ?? null
    };
  });
}

function inventory(json) {
  return {
    scenes: (json.scenes || []).length,
    nodes: (json.nodes || []).length,
    meshes: (json.meshes || []).length,
    materials: (json.materials || []).length,
    images: (json.images || []).length,
    animations: (json.animations || []).length,
    animation_channels: (json.animations || []).reduce((sum, animation) => sum + (animation.channels || []).length, 0)
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const request = readJson(args.request);
  if (request.schema !== 'haihao.aircraft/component-reference-extraction-request@1.0.0') {
    throw new Error(`Unsupported request schema: ${request.schema}`);
  }
  if (request.semantic_policy?.automatic_side_assignment !== false ||
      request.semantic_policy?.automatic_component_boundary_approval !== false ||
      request.semantic_policy?.automatic_animation_semantic_approval !== false) {
    throw new Error('Reference extraction request must remain fail-closed for semantics');
  }

  const { source, manifest, sourceDigest } = readLockedSource(request);
  const { json, binary } = parseGlb(source);
  const parents = buildParentMap(json);
  const { local, world } = buildWorldMatrices(json, parents);
  const candidates = [];

  for (const rootNodeId of request.candidate_root_node_ids || []) {
    if (!Number.isInteger(rootNodeId) || !json.nodes?.[rootNodeId]) throw new Error(`Candidate root node is invalid: ${rootNodeId}`);
    const descendants = request.include_descendants ? collectDescendants(json, rootNodeId) : [rootNodeId];
    const descendantSet = new Set(descendants);
    const meshes = request.include_meshes ? meshEvidence(json, binary, descendants, world) : null;
    const channels = request.include_animation_channels ? animationEvidence(json, descendantSet) : [];
    const node = json.nodes[rootNodeId];
    candidates.push({
      reference_node_id: rootNodeId,
      name: node.name || null,
      stable_node_path: stablePath(json, parents, rootNodeId),
      parent_chain: request.include_parent_chain ? parentChain(json, parents, rootNodeId) : [],
      direct_children: (node.children || []).map(childNodeId => ({
        node_id: childNodeId,
        name: json.nodes[childNodeId]?.name || null
      })),
      subtree_node_ids: descendants,
      subtree_node_count: descendants.length,
      local_matrix: local[rootNodeId],
      world_matrix: world[rootNodeId],
      world_translation_observation: [world[rootNodeId][12], world[rootNodeId][13], world[rootNodeId][14]],
      mesh_evidence: meshes,
      material_evidence: request.include_materials && meshes ? materialEvidence(json, meshes.material_ids) : [],
      animation_channels: channels,
      animation_channel_count: channels.length,
      semantic_status: request.semantic_policy.candidate_status,
      side_assignment: null,
      component_boundary_approved: false,
      animation_semantics_approved: false
    });
  }

  const report = {
    schema: request.output.schema,
    request_id: request.request_id,
    generated_at: null,
    deterministic_build: true,
    source: {
      manifest: request.source.manifest,
      file: request.source.expected_file,
      bytes: source.length,
      sha256: sourceDigest,
      chunk_count: manifest.chunks.length
    },
    inventory: inventory(json),
    extraction_policy: request.semantic_policy,
    candidate_count: candidates.length,
    candidates,
    cross_candidate_observations: {
      world_translation_delta: candidates.length === 2
        ? candidates[1].world_translation_observation.map((value, axis) => value - candidates[0].world_translation_observation[axis])
        : null,
      shared_mesh_ids: candidates.length === 2
        ? candidates[0].mesh_evidence.mesh_ids.filter(meshId => candidates[1].mesh_evidence.mesh_ids.includes(meshId))
        : [],
      shared_material_ids: candidates.length === 2
        ? candidates[0].mesh_evidence.material_ids.filter(materialId => candidates[1].mesh_evidence.material_ids.includes(materialId))
        : [],
      interpretation_status: 'observation-only'
    },
    approval: {
      sourceLockPassed: true,
      extractionCompleted: true,
      candidateNodeIdsApproved: false,
      sideAssignmentsApproved: false,
      componentBoundariesApproved: false,
      animationSemanticsApproved: false,
      referenceNodeMapApproved: false
    }
  };

  const outputPath = path.resolve(root, args.out || request.output.path);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(outputPath, serialized, 'utf8');
  fs.writeFileSync(`${outputPath}.sha256`, `${sha256(Buffer.from(serialized, 'utf8'))}  ${path.basename(outputPath)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    request: request.request_id,
    output: path.relative(root, outputPath).replaceAll('\\', '/'),
    output_sha256: sha256(Buffer.from(serialized, 'utf8')),
    candidate_count: candidates.length,
    candidates: candidates.map(candidate => ({
      reference_node_id: candidate.reference_node_id,
      name: candidate.name,
      subtree_node_count: candidate.subtree_node_count,
      mesh_count: candidate.mesh_evidence?.mesh_ids.length || 0,
      triangle_count: candidate.mesh_evidence?.triangle_count || 0,
      animation_channel_count: candidate.animation_channel_count,
      semantic_status: candidate.semantic_status
    })),
    approvals: report.approval
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
}
