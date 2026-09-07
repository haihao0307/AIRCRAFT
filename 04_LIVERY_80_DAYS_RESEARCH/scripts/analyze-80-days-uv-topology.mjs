import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'public/assets/model/b-24_liberator.glb';
const SOURCE_SHA = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const CANDIDATES = [719, 744, 1654, 1666, 1678, 1714, 1747, 1760];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const round = (value) => Number(value.toFixed(7));

function parseGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('expected GLB v2');
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, '').trim());
  const binHeader = 20 + jsonLength;
  const binLength = bytes.readUInt32LE(binHeader);
  return { json, bin: bytes.subarray(binHeader + 8, binHeader + 8 + binLength) };
}

const source = await readFile(SOURCE);
if (source.length !== 23085972 || sha256(source) !== SOURCE_SHA) throw new Error('source GLB lock mismatch');
const { json, bin } = parseGlb(source);
const component = {
  5120: ['getInt8', 1], 5121: ['getUint8', 1], 5122: ['getInt16', 2],
  5123: ['getUint16', 2], 5125: ['getUint32', 4], 5126: ['getFloat32', 4]
};
const arity = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function values(accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  const [getter, width] = component[accessor.componentType];
  const size = arity[accessor.type];
  const stride = view.byteStride || width * size;
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const out = new Array(accessor.count);
  for (let i = 0; i < accessor.count; i++) {
    out[i] = new Array(size);
    for (let j = 0; j < size; j++) out[i][j] = data[getter](start + i * stride + j * width, true);
  }
  return out;
}

const parents = Array(json.nodes.length).fill(null);
json.nodes.forEach((node, index) => (node.children || []).forEach((child) => { parents[child] = index; }));
function stablePath(index) {
  const parts = [];
  for (let cursor = index; cursor !== null; cursor = parents[cursor]) parts.unshift(`${json.nodes[cursor].name || 'node'}[${cursor}]`);
  return `/${parts.join('/')}`;
}

function connectedComponents(vertexCount, indices) {
  const parent = Array.from({ length: vertexCount }, (_, index) => index);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  for (let i = 0; i < indices.length; i += 3) {
    union(indices[i], indices[i + 1]); union(indices[i + 1], indices[i + 2]);
  }
  return new Set(indices.map(find)).size;
}

const records = [];
let globalMinimalCounterexample = null;
for (let slot = 0; slot < CANDIDATES.length; slot++) {
  const nodeIndex = CANDIDATES[slot];
  const node = json.nodes[nodeIndex];
  const mesh = json.meshes[node.mesh];
  for (let primitiveIndex = 0; primitiveIndex < mesh.primitives.length; primitiveIndex++) {
    const primitive = mesh.primitives[primitiveIndex];
    const positions = values(primitive.attributes.POSITION);
    const normals = primitive.attributes.NORMAL === undefined ? null : values(primitive.attributes.NORMAL);
    const uv0 = primitive.attributes.TEXCOORD_0 === undefined ? null : values(primitive.attributes.TEXCOORD_0);
    const indices = primitive.indices === undefined ? positions.map((_, index) => index) : values(primitive.indices).map((item) => item[0]);
    const x = positions.map((item) => item[0]);
    const y = positions.map((item) => item[1]);
    const z = positions.map((item) => item[2]);
    const x0 = Math.min(...x), x1 = Math.max(...x);
    const y0 = Math.min(...y), y1 = Math.max(...y);
    const z0 = Math.min(...z), z1 = Math.max(...z);
    const epsilon = Math.max(1e-8, (x1 - x0) * 1e-7);
    const pad = 0.006;
    const generatedUv1 = positions.map((p) => [
      slot / 8 + pad + ((p[2] - z0) / Math.max(1e-8, z1 - z0)) * (1 / 8 - 2 * pad),
      (p[0] < 0 ? 0 : 0.5) + pad + ((p[1] - y0) / Math.max(1e-8, y1 - y0)) * (0.5 - 2 * pad)
    ]);
    const incidents = Array.from({ length: positions.length }, () => ({ negative: [], positive: [], center: [] }));
    const crossSplit = [];
    for (let offset = 0; offset < indices.length; offset += 3) {
      const triangle = offset / 3;
      const ids = indices.slice(offset, offset + 3);
      const xs = ids.map((id) => positions[id][0]);
      const centroidX = xs.reduce((a, b) => a + b, 0) / 3;
      const side = centroidX < -epsilon ? 'negative' : centroidX > epsilon ? 'positive' : 'center';
      ids.forEach((id) => incidents[id][side].push(triangle));
      const hasNegative = xs.some((value) => value < -epsilon);
      const hasPositive = xs.some((value) => value > epsilon);
      if (hasNegative && hasPositive) {
        const uv1 = ids.map((id) => generatedUv1[id]);
        const vSpan = Math.max(...uv1.map((item) => item[1])) - Math.min(...uv1.map((item) => item[1]));
        crossSplit.push({
          triangle,
          indices: ids,
          positions: ids.map((id) => positions[id].map(round)),
          normals: normals ? ids.map((id) => normals[id].map(round)) : null,
          originalUv0: uv0 ? ids.map((id) => uv0[id].map(round)) : null,
          generatedUv1: uv1.map((item) => item.map(round)),
          generatedVSpan: round(vSpan)
        });
      }
    }
    const sharedAssignmentVertices = [];
    for (let vertex = 0; vertex < incidents.length; vertex++) {
      if (incidents[vertex].negative.length && incidents[vertex].positive.length) {
        sharedAssignmentVertices.push({
          vertex,
          position: positions[vertex].map(round),
          normal: normals ? normals[vertex].map(round) : null,
          originalUv0: uv0 ? uv0[vertex].map(round) : null,
          negativeTriangles: incidents[vertex].negative.slice(0, 4),
          positiveTriangles: incidents[vertex].positive.slice(0, 4)
        });
      }
    }
    const positionGroups = new Map();
    positions.forEach((p, vertex) => {
      const key = p.map((value) => value.toPrecision(9)).join(',');
      if (!positionGroups.has(key)) positionGroups.set(key, []);
      positionGroups.get(key).push(vertex);
    });
    const originalUvSeams = [];
    for (const group of positionGroups.values()) {
      if (group.length < 2 || !uv0) continue;
      const distinct = new Set(group.map((vertex) => uv0[vertex].map((value) => value.toPrecision(9)).join(',')));
      if (distinct.size > 1) originalUvSeams.push({ vertices: group, uv0: group.map((vertex) => uv0[vertex].map(round)) });
    }
    const triangleDetail = (triangle) => {
      const ids = indices.slice(triangle * 3, triangle * 3 + 3);
      return {
        triangle,
        indices: ids,
        positions: ids.map((id) => positions[id].map(round)),
        originalUv0: uv0 ? ids.map((id) => uv0[id].map(round)) : null,
        generatedUv1: ids.map((id) => generatedUv1[id].map(round))
      };
    };
    const firstShared = sharedAssignmentVertices[0] || null;
    const recordCounterexample = firstShared ? {
      sharedVertex: firstShared,
      negativeTriangle: triangleDetail(firstShared.negativeTriangles[0]),
      positiveTriangle: triangleDetail(firstShared.positiveTriangles[0])
    } : null;
    const record = {
      node: nodeIndex,
      stableNodePath: stablePath(nodeIndex),
      mesh: node.mesh,
      meshName: mesh.name || null,
      primitive: primitiveIndex,
      vertices: positions.length,
      triangles: Math.floor(indices.length / 3),
      localBounds: { min: [x0, y0, z0].map(round), max: [x1, y1, z1].map(round) },
      indexConnectedComponents: connectedComponents(positions.length, indices),
      originalUv0Present: Boolean(uv0),
      originalUvSeamPositionGroups: originalUvSeams.length,
      originalUvSeamExamples: originalUvSeams.slice(0, 3),
      trianglesCrossingCurrentXSplit: crossSplit.length,
      trianglesWithGeneratedVSpanAtLeast045: crossSplit.filter((item) => item.generatedVSpan >= 0.45).length,
      maximumGeneratedVSpan: round(Math.max(0, ...crossSplit.map((item) => item.generatedVSpan))),
      crossSplitExamples: crossSplit.sort((a, b) => b.generatedVSpan - a.generatedVSpan).slice(0, 5),
      verticesSharedByOppositeTriangleAssignments: sharedAssignmentVertices.length,
      sharedAssignmentExamples: sharedAssignmentVertices.slice(0, 5),
      minimalSeamDuplicationCounterexample: recordCounterexample
    };
    records.push(record);
    if ((!globalMinimalCounterexample || nodeIndex === 1654) && sharedAssignmentVertices.length) {
      const shared = sharedAssignmentVertices[0];
      globalMinimalCounterexample = {
        node: nodeIndex,
        stableNodePath: stablePath(nodeIndex),
        mesh: node.mesh,
        primitive: primitiveIndex,
        sharedVertex: shared,
        negativeTriangle: recordCounterexample.negativeTriangle,
        positiveTriangle: recordCounterexample.positiveTriangle,
        consequence: 'One indexed vertex has one TEXCOORD_1 value but belongs to triangles assigned to opposite atlas islands. Separating those islands requires an additional vertex/index reference at the seam.'
      };
    }
  }
}

const report = {
  schema: 'haihao.aircraft/liveryuv-topology-analysis@1.0',
  generatedAt: new Date().toISOString(),
  source: { path: SOURCE, bytes: source.length, sha256: SOURCE_SHA },
  candidateNodes: CANDIDATES,
  currentGenerator: {
    splitExpression: 'position.x < 0 ? port-half : starboard-half',
    interpolationRisk: 'A triangle containing vertices on both sides of x=0 linearly interpolates TEXCOORD_1.v across the 0.5 atlas boundary.'
  },
  totals: {
    nodes: records.length,
    trianglesCrossingCurrentXSplit: records.reduce((sum, item) => sum + item.trianglesCrossingCurrentXSplit, 0),
    trianglesWithGeneratedVSpanAtLeast045: records.reduce((sum, item) => sum + item.trianglesWithGeneratedVSpanAtLeast045, 0),
    verticesSharedByOppositeTriangleAssignments: records.reduce((sum, item) => sum + item.verticesSharedByOppositeTriangleAssignments, 0)
  },
  strictHashDecision: {
    canCreateIndependentIslandsWithoutChangingPositionNormalIndexArrays: false,
    reason: 'A vertex shared by triangles assigned to different islands can store only one TEXCOORD_1 value. Value-preserving seam duplication appends identical POSITION and NORMAL values and redirects affected indices, which necessarily changes accessor counts and byte hashes for POSITION, NORMAL and INDEX while leaving rendered geometry unchanged.',
    requiredReviewerDecision: 'Approve value-preserving seam vertex duplication and replace byte-identical POSITION/NORMAL/INDEX array hashes with geometric equivalence checks plus unchanged world bounds, triangle surfaces, hierarchy and animation.'
  },
  minimalCounterexample: globalMinimalCounterexample,
  records
};
await mkdir('reports', { recursive: true });
await writeFile('reports/80-days-liveryuv-topology-analysis.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ totals: report.totals, minimalCounterexample: report.minimalCounterexample }, null, 2));
