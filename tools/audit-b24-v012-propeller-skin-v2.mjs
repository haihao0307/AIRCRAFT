#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CHUNK_ROOT = path.join(ROOT, 'preview/b24-reference-exact/assets/chunks');
const V010_HTML = path.join(ROOT, 'handoff/2026-08-29-b24-v010-ridged-noise-v002/current_v010/B24_V010_RIDGED_LOCAL_DAMAGE_REVIEW.html');
const GLB_BYTES = 23_085_972;
const GLB_SHA = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const HTML_BYTES = 12_550_988;
const HTML_SHA = '1b5b860ca78a7d55ea25d0d972a1d323125a57982d09452e7f7e0cb55d64a949';

function argsOf(argv) {
  const args = { output: path.join(ROOT, 'reports/B24_V012_PROPELLER_INTERFACE_SKIN_AUDIT.json') };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--output') args.output = path.resolve(argv[++i]);
    else throw new Error(`Unknown argument ${argv[i]}`);
  }
  return args;
}

const sha = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function lockedGlb() {
  const manifest = readJson(path.join(CHUNK_ROOT, 'manifest.json'));
  if (manifest.bytes !== GLB_BYTES || manifest.sha256 !== GLB_SHA) throw new Error('Locked GLB manifest mismatch');
  const buffers = [];
  let offset = 0;
  for (const chunk of [...manifest.chunks].sort((a, b) => a.index - b.index)) {
    const bytes = fs.readFileSync(path.join(CHUNK_ROOT, chunk.file));
    if (chunk.offset !== offset || bytes.length !== chunk.bytes || sha(bytes) !== chunk.sha256) {
      throw new Error(`Chunk verification failed: ${chunk.file}`);
    }
    offset += bytes.length;
    buffers.push(bytes);
  }
  const glb = Buffer.concat(buffers);
  if (glb.length !== GLB_BYTES || sha(glb) !== GLB_SHA) throw new Error('Reconstructed GLB verification failed');
  return { glb, manifest };
}

function gltfFrom(glb) {
  if (glb.readUInt32LE(0) !== 0x46546c67) throw new Error('Invalid GLB magic');
  if (glb.readUInt32LE(4) !== 2) throw new Error('Invalid GLB version');
  if (glb.readUInt32LE(8) !== glb.length) throw new Error('Invalid GLB length');
  const jsonLength = glb.readUInt32LE(12);
  if (glb.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Missing GLB JSON chunk');
  return JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').replace(/[\u0000\u0020]+$/u, ''));
}

function descendants(gltf, rootIndex) {
  const output = [];
  const stack = [rootIndex];
  const seen = new Set();
  while (stack.length) {
    const index = stack.pop();
    if (seen.has(index)) continue;
    seen.add(index);
    output.push(index);
    for (const child of gltf.nodes?.[index]?.children ?? []) stack.push(child);
  }
  return output;
}

function primitiveTriangles(gltf, primitive) {
  const mode = primitive.mode ?? 4;
  const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
  const count = gltf.accessors?.[accessorIndex]?.count ?? 0;
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

function meshTriangles(gltf, meshIndex) {
  return (gltf.meshes?.[meshIndex]?.primitives ?? []).reduce((sum, primitive) => sum + primitiveTriangles(gltf, primitive), 0);
}

function sourcePropellerRoots(gltf) {
  const wrappers = new Map();
  (gltf.nodes ?? []).forEach((node, index) => {
    const match = /anim_prop([0-3])_still/i.exec(String(node.name ?? ''));
    if (match && !wrappers.has(Number(match[1]))) wrappers.set(Number(match[1]), index);
  });
  const roots = [];
  for (const propellerIndex of [0, 1, 2, 3]) {
    const wrapperIndex = wrappers.get(propellerIndex);
    if (!Number.isInteger(wrapperIndex)) continue;
    const wrapper = gltf.nodes[wrapperIndex];
    const childIndex = (wrapper.children ?? []).find((index) => {
      const name = String(gltf.nodes?.[index]?.name ?? '');
      return new RegExp(`prop${propellerIndex}_still`, 'i').test(name) && !/anim_prop/i.test(name);
    });
    roots.push({
      propellerIndex,
      wrapperNodeIndex: wrapperIndex,
      wrapperName: String(wrapper.name ?? ''),
      rootNodeIndex: Number.isInteger(childIndex) ? childIndex : wrapperIndex,
    });
  }
  return roots;
}

function auditPropellers(gltf) {
  return sourcePropellerRoots(gltf).map((root) => {
    const node = gltf.nodes[root.rootNodeIndex];
    const members = descendants(gltf, root.rootNodeIndex);
    const meshes = members
      .filter((index) => Number.isInteger(gltf.nodes?.[index]?.mesh))
      .map((index) => {
        const member = gltf.nodes[index];
        const triangles = meshTriangles(gltf, member.mesh);
        return {
          nodeIndex: index,
          nodeName: String(member.name ?? ''),
          meshIndex: member.mesh,
          meshName: String(gltf.meshes?.[member.mesh]?.name ?? ''),
          triangleCount: triangles,
          materialIndices: [...new Set((gltf.meshes?.[member.mesh]?.primitives ?? []).map((primitive) => primitive.material).filter(Number.isInteger))],
        };
      })
      .sort((a, b) => a.nodeIndex - b.nodeIndex);
    const histogram = {};
    for (const member of meshes) histogram[member.triangleCount] = (histogram[member.triangleCount] ?? 0) + 1;
    return {
      ...root,
      rootName: String(node.name ?? ''),
      translation: node.translation ?? [0, 0, 0],
      subtreeNodeCount: members.length,
      meshNodeCount: meshes.length,
      triangleTotal: meshes.reduce((sum, member) => sum + member.triangleCount, 0),
      triangleHistogram: histogram,
      connectorMembers: meshes.filter((member) => member.triangleCount === 1128),
      staticHubMembers: meshes.filter((member) => member.triangleCount === 792),
      bladeMembers: meshes.filter((member) => member.triangleCount === 1119),
      meshMembers: meshes,
    };
  });
}

function textureAudit(gltf) {
  const materials = gltf.materials ?? [];
  const slotMap = {
    baseColorTexture: [],
    metallicRoughnessTexture: [],
    normalTexture: [],
    occlusionTexture: [],
    emissiveTexture: [],
  };
  materials.forEach((material, index) => {
    if (material.pbrMetallicRoughness?.baseColorTexture !== undefined) slotMap.baseColorTexture.push(index);
    if (material.pbrMetallicRoughness?.metallicRoughnessTexture !== undefined) slotMap.metallicRoughnessTexture.push(index);
    if (material.normalTexture !== undefined) slotMap.normalTexture.push(index);
    if (material.occlusionTexture !== undefined) slotMap.occlusionTexture.push(index);
    if (material.emissiveTexture !== undefined) slotMap.emissiveTexture.push(index);
  });
  return {
    materialCount: materials.length,
    textureCount: gltf.textures?.length ?? 0,
    imageCount: gltf.images?.length ?? 0,
    slotCounts: Object.fromEntries(Object.entries(slotMap).map(([key, value]) => [key, value.length])),
    slotMaterialIndices: slotMap,
    materialNames: materials.map((material, index) => ({ index, name: String(material.name ?? '') })),
    dedicatedNormalMapsPresent: slotMap.normalTexture.length > 0,
  };
}

function semanticAudit(gltf) {
  const keywords = ['rivet', 'fastener', 'panel', 'seam', 'skin', 'exhaust', 'oil', 'soot', 'stain', 'weather'];
  const matches = [];
  for (const [kind, entries] of [['node', gltf.nodes ?? []], ['mesh', gltf.meshes ?? []], ['material', gltf.materials ?? []]]) {
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

function runtimeAudit() {
  const bytes = fs.readFileSync(V010_HTML);
  const html = bytes.toString('utf8');
  const classified = html.includes("if(tri===1128)return 'still-disc'");
  const hidden = html.includes("k==='blur-volume'||k==='slow-duplicate'||k==='still-disc'") && html.includes('alpha:0,metal:0,rough:1');
  return {
    path: path.relative(ROOT, V010_HTML).replaceAll(path.sep, '/'),
    bytes: bytes.length,
    sha256: sha(bytes),
    byteLockPass: bytes.length === HTML_BYTES,
    hashLockPass: sha(bytes) === HTML_SHA,
    triangle1128ClassifiedAsStillDisc: classified,
    stillDiscMaterialHidden: hidden,
    rootCauseConfirmed: classified && hidden,
  };
}

function validate(assemblies, runtime) {
  if (assemblies.length !== 4) throw new Error(`Expected four propeller assemblies, found ${assemblies.length}`);
  const signatures = new Set();
  for (const assembly of assemblies) {
    if (assembly.subtreeNodeCount !== 22) throw new Error(`${assembly.rootName}: subtreeNodeCount=${assembly.subtreeNodeCount}`);
    if (assembly.meshNodeCount !== 5) throw new Error(`${assembly.rootName}: meshNodeCount=${assembly.meshNodeCount}`);
    if (assembly.connectorMembers.length !== 1) throw new Error(`${assembly.rootName}: connector count=${assembly.connectorMembers.length}`);
    if (assembly.staticHubMembers.length !== 1) throw new Error(`${assembly.rootName}: static hub count=${assembly.staticHubMembers.length}`);
    if (assembly.bladeMembers.length !== 3) throw new Error(`${assembly.rootName}: blade count=${assembly.bladeMembers.length}`);
    signatures.add(JSON.stringify({ nodes: assembly.subtreeNodeCount, meshes: assembly.meshNodeCount, total: assembly.triangleTotal, histogram: assembly.triangleHistogram }));
  }
  if (signatures.size !== 1) throw new Error('Propeller source assemblies differ');
  if (!runtime.byteLockPass || !runtime.hashLockPass || !runtime.rootCauseConfirmed) throw new Error('Frozen V010 runtime audit failed');
}

const args = argsOf(process.argv);
const { glb, manifest } = lockedGlb();
const gltf = gltfFrom(glb);
const assemblies = auditPropellers(gltf);
const textures = textureAudit(gltf);
const semantics = semanticAudit(gltf);
const runtime = runtimeAudit();
validate(assemblies, runtime);

const report = {
  schema: 'haihao.aircraft/b24-v012-propeller-interface-skin-audit@1.0.0',
  generatedAt: new Date().toISOString(),
  status: 'PASS_AUDIT_ONLY',
  repository: 'haihao0307/AIRCRAFT',
  source: {
    file: manifest.file,
    bytes: glb.length,
    sha256: sha(glb),
    glbVersion: 2,
    sourceIdentityPass: true,
    chunkCount: manifest.chunk_count,
  },
  propellerInterface: {
    sourceAssemblyCount: assemblies.length,
    sourceAssembliesStructurallyIdentical: true,
    sourceConnectorPresentOnAllFour: true,
    runtimeClassification: runtime,
    finding: 'Each source still-propeller assembly contains one solid 1128-triangle connector. V009/V010 labels this member still-disc and assigns alpha 0, producing the apparent engine-to-propeller gap.',
    assemblies,
  },
  sourceSkinAndTextureInventory: {
    textureSlots: textures,
    semanticNames: semantics,
    conclusions: {
      dedicatedNormalMapEvidence: textures.dedicatedNormalMapsPresent ? 'present' : 'absent-in-source-gltf-material-slots',
      dedicatedRivetFastenerNameEvidence: semantics.dedicatedRivetOrFastenerNamesPresent ? 'present' : 'absent-in-source-names',
      dedicatedPanelSeamNameEvidence: semantics.dedicatedPanelOrSeamNamesPresent ? 'present' : 'absent-in-source-names',
      limitation: 'A missing dedicated slot or semantic name does not prove that rivet-like pixels are absent from base-color or packed metallic-roughness images. Image-content inspection remains separate.',
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
fs.writeFileSync(args.output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: path.relative(ROOT, args.output),
  sourceSha256: report.source.sha256,
  propellerAssemblies: assemblies.length,
  normalTextureCount: textures.slotCounts.normalTexture,
  semanticNameMatches: semantics.matchCount,
}, null, 2));
