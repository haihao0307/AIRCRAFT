import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SOURCE_LOCK = Object.freeze({
  file: 'b-24_liberator.glb',
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
});

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    result[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  return result;
}

function fail(message) {
  throw new Error(message);
}

function readGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length !== SOURCE_LOCK.bytes) fail(`Locked GLB byte mismatch: ${bytes.length}`);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== SOURCE_LOCK.sha256) fail(`Locked GLB SHA256 mismatch: ${sha256}`);
  if (bytes.readUInt32LE(0) !== 0x46546c67) fail('Input is not a binary glTF file.');
  if (bytes.readUInt32LE(4) !== 2) fail(`Unsupported GLB version: ${bytes.readUInt32LE(4)}`);
  if (bytes.readUInt32LE(8) !== bytes.length) fail('GLB header length does not match the file length.');

  let offset = 12;
  let json = null;
  let binary = null;
  while (offset + 8 <= bytes.length) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').replace(/\u0000+$/g, '').trim());
    if (chunkType === 0x004e4942) binary = chunk;
    offset += 8 + chunkLength;
  }
  if (!json) fail('GLB JSON chunk is missing.');
  if (!binary) fail('GLB binary chunk is missing.');
  return { json, binary, sha256, bytes: bytes.length };
}

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let k = 0; k < 4; k += 1) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return out;
}

function matrixFromTrs(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) return [...node.matrix];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
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
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1
  ];
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]
  ];
}

function emptyBounds() {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

function extendBounds(bounds, point) {
  for (let axis = 0; axis < 3; axis += 1) {
    bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
    bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
  }
  return bounds;
}

function unionBounds(target, source) {
  if (!source) return target;
  extendBounds(target, source.min);
  extendBounds(target, source.max);
  return target;
}

function validBounds(bounds) {
  return bounds && bounds.min.every(Number.isFinite) && bounds.max.every(Number.isFinite);
}

function transformBounds(bounds, matrix) {
  const out = emptyBounds();
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) extendBounds(out, transformPoint(matrix, [x, y, z]));
    }
  }
  return out;
}

function sizeOf(bounds) {
  return bounds.max.map((value, axis) => value - bounds.min[axis]);
}

function centerOf(bounds) {
  return bounds.max.map((value, axis) => (value + bounds.min[axis]) / 2);
}

const COMPONENTS = Object.freeze({
  5120: { bytes: 1, read: 'getInt8' },
  5121: { bytes: 1, read: 'getUint8' },
  5122: { bytes: 2, read: 'getInt16' },
  5123: { bytes: 2, read: 'getUint16' },
  5125: { bytes: 4, read: 'getUint32' },
  5126: { bytes: 4, read: 'getFloat32' }
});

const TYPE_COMPONENTS = Object.freeze({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 });

function accessorBounds(gltf, binary, accessorIndex) {
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor || accessor.type !== 'VEC3') return null;
  if (Array.isArray(accessor.min) && Array.isArray(accessor.max)) return { min: [...accessor.min], max: [...accessor.max] };
  const view = gltf.bufferViews?.[accessor.bufferView];
  const component = COMPONENTS[accessor.componentType];
  const componentCount = TYPE_COMPONENTS[accessor.type];
  if (!view || !component || componentCount !== 3) return null;
  const stride = view.byteStride ?? component.bytes * componentCount;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const dataView = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const bounds = emptyBounds();
  for (let element = 0; element < accessor.count; element += 1) {
    const point = [];
    for (let axis = 0; axis < 3; axis += 1) {
      const byteOffset = start + element * stride + axis * component.bytes;
      point.push(dataView[component.read](byteOffset, true));
    }
    extendBounds(bounds, point);
  }
  return validBounds(bounds) ? bounds : null;
}

function buildMeshBounds(gltf, binary) {
  return (gltf.meshes ?? []).map((mesh) => {
    const bounds = emptyBounds();
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessor = primitive.attributes?.POSITION;
      if (positionAccessor === undefined) continue;
      unionBounds(bounds, accessorBounds(gltf, binary, positionAccessor));
    }
    return validBounds(bounds) ? bounds : null;
  });
}

function buildParents(gltf) {
  const parents = new Array(gltf.nodes?.length ?? 0).fill(null);
  (gltf.nodes ?? []).forEach((node, parentIndex) => {
    for (const childIndex of node.children ?? []) parents[childIndex] = parentIndex;
  });
  return parents;
}

function buildWorldMatrices(gltf, parents) {
  const cache = new Map();
  function world(index) {
    if (cache.has(index)) return cache.get(index);
    const local = matrixFromTrs(gltf.nodes[index] ?? {});
    const parent = parents[index];
    const result = parent === null || parent === undefined ? local : multiply(world(parent), local);
    cache.set(index, result);
    return result;
  }
  return (gltf.nodes ?? []).map((_, index) => world(index));
}

function ancestry(gltf, parents, index) {
  const chain = [];
  let cursor = index;
  while (cursor !== null && cursor !== undefined) {
    chain.push({ index: cursor, name: gltf.nodes[cursor]?.name ?? null });
    cursor = parents[cursor];
  }
  return chain;
}

function animationTargets(gltf) {
  const map = new Map();
  (gltf.animations ?? []).forEach((animation, animationIndex) => {
    (animation.channels ?? []).forEach((channel, channelIndex) => {
      const node = channel.target?.node;
      if (node === undefined) return;
      if (!map.has(node)) map.set(node, []);
      map.get(node).push({
        animationIndex,
        animationName: animation.name ?? null,
        channelIndex,
        path: channel.target?.path ?? null,
        sampler: channel.sampler
      });
    });
  });
  return map;
}

function nameEvidence(name) {
  const value = (name ?? '').toLowerCase();
  let score = 0;
  let role = 'unknown';
  const evidence = [];
  if (/rudder/.test(value)) {
    score += 62;
    role = 'rudder';
    evidence.push('name:rudder');
  }
  if (/vertical.?stabili[sz]er|vertical.?tail/.test(value)) {
    score += 58;
    role = role === 'rudder' ? role : 'vertical-stabilizer';
    evidence.push('name:vertical-stabilizer');
  }
  if (/(^|[^a-z])fin([^a-z]|$)/.test(value)) {
    score += 45;
    role = role === 'unknown' ? 'vertical-stabilizer' : role;
    evidence.push('name:fin');
  }
  if (/empennage/.test(value)) {
    score += 38;
    evidence.push('name:empennage');
  }
  if (/tail/.test(value)) {
    score += 25;
    evidence.push('name:tail');
  }
  return { score, role, evidence };
}

function roundedVector(values) {
  return values.map((value) => Math.round(value * 1e6) / 1e6);
}

function buildCandidates(gltf, binary) {
  const meshBounds = buildMeshBounds(gltf, binary);
  const parents = buildParents(gltf);
  const worldMatrices = buildWorldMatrices(gltf, parents);
  const animationMap = animationTargets(gltf);
  const nodeEntries = [];
  const global = emptyBounds();

  (gltf.nodes ?? []).forEach((node, nodeIndex) => {
    if (node.mesh === undefined || !meshBounds[node.mesh]) return;
    const worldBounds = transformBounds(meshBounds[node.mesh], worldMatrices[nodeIndex]);
    if (!validBounds(worldBounds)) return;
    unionBounds(global, worldBounds);
    nodeEntries.push({ nodeIndex, node, meshIndex: node.mesh, worldBounds });
  });
  if (!validBounds(global)) fail('No valid mesh bounds were found in the locked GLB.');

  const globalSize = sizeOf(global);
  const orderedAxes = [0, 1, 2].sort((a, b) => globalSize[b] - globalSize[a]);
  const spanAxis = orderedAxes[0];
  const longitudinalAxis = orderedAxes[1];
  const verticalAxis = orderedAxes[2];
  const globalCenter = centerOf(global);
  const globalVolume = Math.max(globalSize[0] * globalSize[1] * globalSize[2], 1e-9);

  const candidates = nodeEntries.map((entry) => {
    const size = sizeOf(entry.worldBounds);
    const center = centerOf(entry.worldBounds);
    const named = nameEvidence(entry.node.name);
    const longitudinalHalf = Math.max(globalSize[longitudinalAxis] / 2, 1e-9);
    const extreme = Math.min(1, Math.abs(center[longitudinalAxis] - globalCenter[longitudinalAxis]) / longitudinalHalf);
    const verticalExtent = Math.min(1, size[verticalAxis] / Math.max(globalSize[verticalAxis], 1e-9));
    const verticalPosition = Math.min(1, Math.max(0, (center[verticalAxis] - global.min[verticalAxis]) / Math.max(globalSize[verticalAxis], 1e-9)));
    const spanCentre = 1 - Math.min(1, Math.abs(center[spanAxis] - globalCenter[spanAxis]) / Math.max(globalSize[spanAxis] / 2, 1e-9));
    const thinSpan = 1 - Math.min(1, size[spanAxis] / Math.max(globalSize[spanAxis], 1e-9));
    const volumeRatio = Math.max(0, (size[0] * size[1] * size[2]) / globalVolume);
    const animationChannels = animationMap.get(entry.nodeIndex) ?? [];
    const rotates = animationChannels.some((channel) => channel.path === 'rotation');
    let role = named.role;
    if (role === 'unknown' && rotates) role = 'rudder-candidate';
    if (role === 'unknown' && verticalExtent > 0.14 && extreme > 0.68) role = 'vertical-surface-candidate';
    const geometryScore = extreme * 32 + verticalExtent * 35 + verticalPosition * 8 + spanCentre * 7 + thinSpan * 5;
    const animationScore = rotates ? 32 : 0;
    const sizePenalty = volumeRatio < 1e-8 ? 18 : 0;
    const score = named.score + geometryScore + animationScore - sizePenalty;
    const sideCoordinate = center[spanAxis] - globalCenter[spanAxis];
    const side = Math.abs(sideCoordinate) < globalSize[spanAxis] * 0.01 ? 'centre-span' : sideCoordinate < 0 ? 'negative-span' : 'positive-span';
    return {
      nodeIndex: entry.nodeIndex,
      nodeName: entry.node.name ?? null,
      meshIndex: entry.meshIndex,
      meshName: gltf.meshes?.[entry.meshIndex]?.name ?? null,
      role,
      side,
      score: Math.round(score * 1000) / 1000,
      evidence: [
        ...named.evidence,
        `geometry:longitudinal-extreme=${extreme.toFixed(4)}`,
        `geometry:vertical-extent=${verticalExtent.toFixed(4)}`,
        `geometry:vertical-position=${verticalPosition.toFixed(4)}`,
        `geometry:span-centre=${spanCentre.toFixed(4)}`,
        `geometry:thin-span=${thinSpan.toFixed(4)}`,
        rotates ? 'animation:rotation-channel' : 'animation:no-rotation-channel'
      ],
      worldBounds: {
        min: roundedVector(entry.worldBounds.min),
        max: roundedVector(entry.worldBounds.max),
        size: roundedVector(size),
        center: roundedVector(center)
      },
      localTransform: {
        matrix: roundedVector(matrixFromTrs(entry.node)),
        translation: entry.node.translation ?? [0, 0, 0],
        rotation: entry.node.rotation ?? [0, 0, 0, 1],
        scale: entry.node.scale ?? [1, 1, 1]
      },
      parentChain: ancestry(gltf, parents, entry.nodeIndex),
      childNodes: entry.node.children ?? [],
      animationChannels
    };
  }).sort((a, b) => b.score - a.score || a.nodeIndex - b.nodeIndex);

  const filtered = candidates.filter((candidate) => candidate.score >= 32).slice(0, 120);
  const pool = filtered.length >= 4 ? filtered : candidates.slice(0, Math.min(120, candidates.length));
  const selected = [];
  const used = new Set();
  const choose = (slot, predicate) => {
    const candidate = pool.find((item) => !used.has(item.nodeIndex) && predicate(item));
    if (!candidate) return;
    used.add(candidate.nodeIndex);
    selected.push({
      slot,
      nodeIndex: candidate.nodeIndex,
      nodeName: candidate.nodeName,
      meshIndex: candidate.meshIndex,
      meshName: candidate.meshName,
      score: candidate.score,
      role: candidate.role,
      side: candidate.side,
      status: 'reference-candidate-pending-manual-map'
    });
  };

  choose('vertical-stabilizer-negative-span', (item) => item.side === 'negative-span' && /stabilizer|vertical-surface/.test(item.role) && !/rudder/.test(item.role));
  choose('vertical-stabilizer-positive-span', (item) => item.side === 'positive-span' && /stabilizer|vertical-surface/.test(item.role) && !/rudder/.test(item.role));
  choose('rudder-negative-span', (item) => item.side === 'negative-span' && /rudder/.test(item.role));
  choose('rudder-positive-span', (item) => item.side === 'positive-span' && /rudder/.test(item.role));
  const fallbackSlots = [
    'vertical-stabilizer-negative-span',
    'vertical-stabilizer-positive-span',
    'rudder-negative-span',
    'rudder-positive-span'
  ].filter((slot) => !selected.some((entry) => entry.slot === slot));
  for (const slot of fallbackSlots) choose(slot, () => true);
  if (selected.length < 4) fail(`Only ${selected.length} distinct tail candidates could be recommended.`);

  return {
    globalBounds: {
      min: roundedVector(global.min),
      max: roundedVector(global.max),
      size: roundedVector(globalSize),
      center: roundedVector(globalCenter)
    },
    inferredAxes: {
      spanAxis,
      longitudinalAxis,
      verticalAxis,
      authority: 'locked-reference-geometry-heuristic-pending-manual-confirmation'
    },
    recommendations: selected,
    candidates: pool,
    totals: {
      gltfNodes: gltf.nodes?.length ?? 0,
      gltfMeshes: gltf.meshes?.length ?? 0,
      meshNodesWithBounds: nodeEntries.length,
      scoredCandidates: pool.length,
      recommendations: selected.length
    }
  };
}

const args = parseArgs(process.argv.slice(2));
const input = path.resolve(args.input ?? 'public/b-24_liberator.glb');
const output = path.resolve(args.output ?? 'reports/b24-native/generated/vertical-tail-reference-candidates-v2.json');
const summary = path.resolve(args.summary ?? output.replace(/\.json$/i, '.md'));
const source = readGlb(input);
const result = buildCandidates(source.json, source.binary);
const report = {
  schema: 'haihao.aircraft/b24-tail-reference-candidates@2.0.0',
  generatedAt: new Date().toISOString(),
  sourceLock: SOURCE_LOCK,
  extractionPolicy: {
    sourceAuthority: 'locked-external-reference-only',
    engineeringAuthorityGranted: false,
    geometryApprovalGranted: false,
    leftRightHistoricalOrientationGranted: false,
    noMissingDimensionMayBeFilled: true,
    candidateSelection: 'name-animation-bounds-and-spatial-score'
  },
  ...result
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const outputSha = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
fs.writeFileSync(`${output}.sha256`, `${outputSha}  ${path.basename(output)}\n`, 'utf8');

const lines = [
  '# B24 Twin Vertical Tail Reference Candidates V2',
  '',
  `Generated from locked reference: \`${SOURCE_LOCK.file}\``,
  '',
  `Bytes: \`${SOURCE_LOCK.bytes}\``,
  '',
  `SHA256: \`${SOURCE_LOCK.sha256}\``,
  '',
  '## Approval boundary',
  '',
  'These are reference candidates. They do not approve engineering dimensions, component identity, historical left-right orientation, geometry recipes, behavior, surface modules or browser QA.',
  '',
  '## Inferred axes',
  '',
  `- span axis: ${report.inferredAxes.spanAxis}`,
  `- longitudinal axis: ${report.inferredAxes.longitudinalAxis}`,
  `- vertical axis: ${report.inferredAxes.verticalAxis}`,
  `- authority: ${report.inferredAxes.authority}`,
  '',
  '## Recommended manual-map candidates',
  '',
  '| Slot | Node | Mesh | Score | Role | Side |',
  '| --- | ---: | ---: | ---: | --- | --- |',
  ...report.recommendations.map((entry) => `| ${entry.slot} | ${entry.nodeIndex} ${entry.nodeName ?? ''} | ${entry.meshIndex} ${entry.meshName ?? ''} | ${entry.score} | ${entry.role} | ${entry.side} |`),
  '',
  `Candidate JSON SHA256: \`${outputSha}\``,
  ''
];
fs.mkdirSync(path.dirname(summary), { recursive: true });
fs.writeFileSync(summary, `${lines.join('\n')}\n`, 'utf8');

console.log(`PASS locked source bytes: ${source.bytes}`);
console.log(`PASS locked source SHA256: ${source.sha256}`);
console.log(`PASS mesh nodes with bounds: ${report.totals.meshNodesWithBounds}`);
console.log(`PASS scored candidates: ${report.totals.scoredCandidates}`);
console.log(`PASS manual-map recommendations: ${report.totals.recommendations}`);
console.log(`Candidate report: ${output}`);
console.log(`Candidate report SHA256: ${outputSha}`);
