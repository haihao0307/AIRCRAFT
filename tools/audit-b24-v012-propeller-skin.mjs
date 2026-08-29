#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const CHUNK_ROOT = path.join(REPO_ROOT, 'preview/b24-reference-exact/assets/chunks');
const CHUNK_MANIFEST = path.join(CHUNK_ROOT, 'manifest.json');
const V010_HTML = path.join(
  REPO_ROOT,
  'handoff/2026-08-29-b24-v010-ridged-noise-v002/current_v010/B24_V010_RIDGED_LOCAL_DAMAGE_REVIEW.html',
);
const EXPECTED_GLB_BYTES = 23_085_972;
const EXPECTED_GLB_SHA256 = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const EXPECTED_V010_HTML_BYTES = 12_550_988;
const EXPECTED_V010_HTML_SHA256 = '1b5b860ca78a7d55ea25d0d972a1d323125a57982d09452e7f7e0cb55d64a949';

function parseArgs(argv) {
  const result = {
    output: path.join(REPO_ROOT, 'reports/B24_V012_PROPELLER_INTERFACE_SKIN_AUDIT.json'),
    reconstructedGlb: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--output') result.output = path.resolve(argv[++index]);
    else if (argv[index] === '--write-glb') result.reconstructedGlb = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return result;
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function reconstructLockedGlb() {
  const manifest = readJson(CHUNK_MANIFEST);
  if (manifest.bytes !== EXPECTED_GLB_BYTES || manifest.sha256 !== EXPECTED_GLB_SHA256) {
    throw new Error('Chunk manifest does not identify the locked B24 source GLB');
  }
  const chunks = [...manifest.chunks].sort((left, right) => left.index - right.index);
  if (chunks.length !== manifest.chunk_count) throw new Error('Chunk count mismatch');
  const buffers = [];
  let expectedOffset = 0;
  for (const chunk of chunks) {
    const chunkPath = path.join(CHUNK_ROOT, chunk.file);
    const bytes = fs.readFileSync(chunkPath);
    const digest = sha256Buffer(bytes);
    if (bytes.length !== chunk.bytes) throw new Error(`Chunk size mismatch: ${chunk.file}`);
    if (digest !== chunk.sha256) throw new Error(`Chunk hash mismatch: ${chunk.file}`);
    if (chunk.offset !== expectedOffset) throw new Error(`Chunk offset mismatch: ${chunk.file}`);
    expectedOffset += bytes.length;
    buffers.push(bytes);
  }
  const glb = Buffer.concat(buffers);
  if (glb.length !== EXPECTED_GLB_BYTES) throw new Error(`GLB byte mismatch: ${glb.length}`);
  const digest = sha256Buffer(glb);
  if (digest !== EXPECTED_GLB_SHA256) throw new Error(`GLB hash mismatch: ${digest}`);
  return { glb, manifest };
}

function parseGlbJson(glb) {
  if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic');
  const version = glb.readUInt32LE(4);
  const declaredLength = glb.readUInt32LE(8);
  if (version !== 2) throw new Error(`Unsupported GLB version: ${version}`);
  if (declaredLength !== glb.length) throw new Error('GLB declared length mismatch');
  const jsonLength = glb.readUInt32LE(12);
  const jsonType = glb.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error('GLB first chunk is not JSON');
  const jsonText = glb.subarray(20, 20 + jsonLength).toString('utf8').replace(/[\u0000\u0020]+$/u, '');
  return { version, declaredLength, json: JSON.parse(jsonText) };
}

function primitiveTriangleCount(json, primitive) {
  const mode = primitive.mode ?? 4;
  const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
  const count = json.accessors?.[accessorIndex]?.count ?? 0;
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

function meshTriangleCount(json, meshIndex) {
  const mesh = json.meshes?.[meshIndex];
  return mesh?.primitives?.reduce((total, primitive) => total + primitiveTriangleCount(json, primitive), 0) ?? 0;
}

function descendants(json, rootIndex) {
  const found = [];
  const stack = [rootIndex];
  const visited = new Set();
  while (stack.length) {
    const index = stack.pop();
    if (visited.has(index)) continue;
    visited.add(index);
    found.push(index);
    for (const child of json.nodes?.[index]?.children ?? []) stack.push(child);
  }
  return found;
}

function propellerAssemblyAudit(json) {
  const roots = [];
  for (const [index, node] of (json.nodes ?? []).entries()) {
    const name = String(node.name ?? '');
    const match = /^anim_prop([0-3])_still$/i.exec(name);
    if (!match) continue;
    const memberIndices = descendants(json, index);
    const meshMembers = memberIndices
      .filter((memberIndex) => Number.isInteger(json.nodes?.[memberIndex]?.mesh))
      .map((memberIndex) => {
        const member = json.nodes[memberIndex];
        const triangles = meshTriangleCount(json, member.mesh);
        return {
          nodeIndex: memberIndex,
          nodeName: String(member.name ?? ''),
          meshIndex: member.mesh,
          meshName: String(json.meshes?.[member.mesh]?.name ?? ''),
          triangleCount: triangles,
          materialIndices: [...new Set((json.meshes?.[member.mesh]?.primitives ?? []).map((primitive) => primitive.material).filter(Number.isInteger))],
        };
      })
      .sort((left, right) => left.nodeIndex - right.nodeIndex);
    const histogram = {};
    for (const member of meshMembers) histogram[member.triangleCount] = (histogram[member.triangleCount] ?? 0) + 1;
    roots.push({
      propellerIndex: Number(match[1]),
      rootNodeIndex: index,
      rootName: name,
      translation: node.translation ?? [0, 0, 0],
      subtreeNodeCount: memberIndices.length,
      meshNodeCount: meshMembers.length,
      triangleTotal: meshMembers.reduce((total, member) => total + member.triangleCount, 0),
      triangleHistogram: histogram,
      connectorMembers: meshMembers.filter((member) => member.triangleCount === 1128),
      staticHubMembers: meshMembers.filter((member) => member.triangleCount === 792),
      bladeMembers: meshMembers.filter((member) => member.triangleCount === 1119),
      meshMembers,
    });
  }
  roots.sort((left, right) => left.propellerIndex - right.propellerIndex);
  return roots;
}

function textureSlotAudit(json) {
  const materials = json.materials ?? [];
  const slots = {
    baseColorTexture: [],
    metallicRoughnessTexture: [],
    normalTexture: [],
    occlusionTexture: [],
    emissiveTexture: [],
  };
  materials.forEach((material, index) => {
    if (material.pbrMetallicRoughness?.baseColorTexture) slots.baseColorTexture.push(index);
    if (material.pbrMetallicRoughness?.metallicRoughnessTexture) slots.metallicRoughnessTexture.push(index);
    if (material.normalTexture) slots.normalTexture.push(index);
    if (material.occlusionTexture) slots.occlusionTexture.push(index);
    if (material.emissiveTexture) slots.emissiveTexture.push(index);
  });
  return {
    materialCount: materials.length,
    textureCount: json.textures?.length ?? 0,
    imageCount: json.images?.length ?? 0,
    slotCounts: Object.fromEntries(Object.entries(slots).map(([name, indices]) => [name, indices.length])),
    slotMaterialIndices: slots,
    materialNames: materials.map((material, index) => ({ index, name: String(material.name ?? '') })),
    dedicatedNormalMapsPresent: slots.normalTexture.length > 0,
  };
}

function semanticNameAudit(json) {
  const keywords = ['rivet', 'fastener', 'panel', 'seam', 'skin', 'exhaust', 'oil', 'soot', 'stain', 'weather'];
  const sources = [
    ['node', json.nodes ?? []],
    ['mesh', json.meshes ?? []],
    ['material', json.materials ?? []],
  ];
  const matches = [];
  for (const [kind, entries] of sources) {
    entries.forEach((entry, index) => {
      const name = String(entry.name ?? '');
      const lower = name.toLowerCase();
      const matchedKeywords = keywords.filter((keyword) => lower.includes(keyword));
      if (matchedKeywords.length) matches.push({ kind, index, name, matchedKeywords });
    });
  }
  return {
    keywords,
    matchCount: matches.length,
    matches,
    dedicatedRivetOrFastenerNamesPresent: matches.some((entry) => entry.matchedKeywords.includes('rivet') || entry.matchedKeywords.includes('fastener')),
    dedicatedPanelOrSeamNamesPresent: matches.some((entry) => entry.matchedKeywords.includes('panel') || entry.matchedKeywords.includes('seam')),
  };
}

function runtimeClassificationAudit() {
  const html = fs.readFileSync(V010_HTML, 'utf8');
  const bytes = fs.statSync(V010_HTML).size;
  const digest = sha256File(V010_HTML);
  const classificationPresent = html.includes("if(tri===1128)return 'still-disc'");
  const hiddenMaterialPresent = html.includes("k==='blur-volume'||k==='slow-duplicate'||k==='still-disc'")
    && html.includes('alpha:0,metal:0,rough:1');
  return {
    path: path.relative(REPO_ROOT, V010_HTML).replaceAll(path.sep, '/'),
    bytes,
    sha256: digest,
    byteLockPass: bytes === EXPECTED_V010_HTML_BYTES,
    hashLockPass: digest === EXPECTED_V010_HTML_SHA256,
    triangle1128ClassifiedAsStillDisc: classificationPresent,
    stillDiscMaterialHidden: hiddenMaterialPresent,
    rootCauseConfirmed: classificationPresent && hiddenMaterialPresent,
  };
}

function assertAudit(assemblies, runtime) {
  if (assemblies.length !== 4) throw new Error(`Expected four still propeller roots, found ${assemblies.length}`);
  const signatures = new Set();
  for (const assembly of assemblies) {
    if (assembly.subtreeNodeCount !== 22) throw new Error(`${assembly.rootName}: expected 22 subtree nodes`);
    if (assembly.meshNodeCount !== 5) throw new Error(`${assembly.rootName}: expected five mesh members`);
    if (assembly.connectorMembers.length !== 1) throw new Error(`${assembly.rootName}: expected one 1128-triangle connector`);
    if (assembly.staticHubMembers.length !== 1) throw new Error(`${assembly.rootName}: expected one 792-triangle static hub`);
    if (assembly.bladeMembers.length !== 3) throw new Error(`${assembly.rootName}: expected three 1119-triangle blades`);
    signatures.add(JSON.stringify({
      nodes: assembly.subtreeNodeCount,
      meshes: assembly.meshNodeCount,
      triangles: assembly.triangleTotal,
      histogram: assembly.triangleHistogram,
    }));
  }
  if (signatures.size !== 1) throw new Error('The four source propeller assemblies are not structurally identical');
  if (!runtime.byteLockPass || !runtime.hashLockPass) throw new Error('Frozen V010 HTML lock failed');
  if (!runtime.rootCauseConfirmed) throw new Error('V010 1128-triangle hidden classification was not found');
}

const args = parseArgs(process.argv);
const { glb, manifest } = reconstructLockedGlb();
if (args.reconstructedGlb) {
  fs.mkdirSync(path.dirname(args.reconstructedGlb), { recursive: true });
  fs.writeFileSync(args.reconstructedGlb, glb);
}
const parsed = parseGlbJson(glb);
const assemblies = propellerAssemblyAudit(parsed.json);
const textureSlots = textureSlotAudit(parsed.json);
const semanticNames = semanticNameAudit(parsed.json);
const runtimeClassification = runtimeClassificationAudit();
assertAudit(assemblies, runtimeClassification);

const report = {
  schema: 'haihao.aircraft/b24-v012-propeller-interface-skin-audit@1.0.0',
  generatedAt: new Date().toISOString(),
  status: 'PASS_AUDIT_ONLY',
  repository: 'haihao0307/AIRCRAFT',
  source: {
    file: manifest.file,
    bytes: glb.length,
    sha256: sha256Buffer(glb),
    glbVersion: parsed.version,
    sourceIdentityPass: true,
    chunkCount: manifest.chunk_count,
  },
  propellerInterface: {
    sourceAssemblyCount: assemblies.length,
    sourceAssembliesStructurallyIdentical: true,
    sourceConnectorPresentOnAllFour: true,
    runtimeClassification,
    finding: 'The solid 1128-triangle connector exists once in every still propeller assembly. V009/V010 labels it still-disc and assigns alpha 0, creating the apparent engine-to-propeller gap.',
    assemblies,
  },
  sourceSkinAndTextureInventory: {
    textureSlots,
    semanticNames,
    conclusions: {
      dedicatedNormalMapEvidence: textureSlots.dedicatedNormalMapsPresent ? 'present' : 'absent-in-source-gltf-material-slots',
      dedicatedRivetFastenerNameEvidence: semanticNames.dedicatedRivetOrFastenerNamesPresent ? 'present' : 'absent-in-source-names',
      dedicatedPanelSeamNameEvidence: semanticNames.dedicatedPanelOrSeamNamesPresent ? 'present' : 'absent-in-source-names',
      limitation: 'Absence of a dedicated slot or semantic name does not prove that rivet-like pixels are absent from base-color or packed metallic-roughness images. Image-content review remains a separate visual task.',
    },
  },
  protectedSystems: {
    sourcePayloadChanged: false,
    geometryChanged: false,
    animationChanged: false,
    runwayFlightSequenceChanged: false,
    liveryIdentityChanged: false,
  },
  approvalBoundary: {
    visualApproved: false,
    engineeringApproved: false,
    surfaceSystemApproved: false,
    wholeAircraftApproved: false,
    productionFrozen: false,
  },
};

fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: report.status,
  output: path.relative(REPO_ROOT, args.output),
  sourceSha256: report.source.sha256,
  propellerAssemblies: assemblies.length,
  connectorPresentOnAllFour: true,
  normalTextureCount: textureSlots.slotCounts.normalTexture,
  semanticNameMatches: semanticNames.matchCount,
}, null, 2));
