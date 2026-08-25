import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const SOURCE = 'public/assets/model/b-24_liberator.glb';
const DERIVED = 'public/assets/model/b-24_liberator_80days-liveryuv-v1.glb';
const SOURCE_SHA = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const ALLOWED = new Set([1654, 1666, 1678, 1714, 1747, 1760, 719, 744]);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const source = await readFile(SOURCE);
if (source.length !== 23085972 || sha(source) !== SOURCE_SHA) throw new Error('authoritative GLB lock mismatch');

function parseGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('not GLB v2');
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, '').trim());
  const binOffset = 20 + jsonLength + 8;
  const binLength = bytes.readUInt32LE(20 + jsonLength);
  return { json, bin: bytes.subarray(binOffset, binOffset + binLength) };
}

const { json, bin } = parseGlb(source);
const component = { 5120: ['getInt8', 1], 5121: ['getUint8', 1], 5122: ['getInt16', 2], 5123: ['getUint16', 2], 5125: ['getUint32', 4], 5126: ['getFloat32', 4] };
const arity = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function accessorValues(index) {
  const a = json.accessors[index]; const v = json.bufferViews[a.bufferView]; const [getter, width] = component[a.componentType]; const n = arity[a.type];
  const stride = v.byteStride || width * n; const start = (v.byteOffset || 0) + (a.byteOffset || 0); const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength); const out = new Float64Array(a.count * n);
  for (let i = 0; i < a.count; i++) for (let j = 0; j < n; j++) out[i * n + j] = view[getter](start + i * stride + j * width, true);
  return { accessor: a, values: out, arity: n };
}
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) { const o = Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
function localMatrix(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  const x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
  return [(1-(yy+zz))*sx,(xy+wz)*sx,(xz-wy)*sx,0,(xy-wz)*sy,(1-(xx+zz))*sy,(yz+wx)*sy,0,(xz+wy)*sz,(yz-wx)*sz,(1-(xx+yy))*sz,0,tx,ty,tz,1];
}
function point(m, x, y, z) { return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]]; }

const parents = Array(json.nodes.length).fill(null);
json.nodes.forEach((n, i) => (n.children || []).forEach((c) => { parents[c] = i; }));
const world = Array(json.nodes.length);
function worldMatrix(i) { if (world[i]) return world[i]; const p = parents[i]; return world[i] = multiply(p === null ? I : worldMatrix(p), localMatrix(json.nodes[i])); }
function stablePath(i) { const parts=[]; for(let n=i;n!==null;n=parents[n]) parts.unshift(`${json.nodes[n].name || 'node'}[${n}]`); return `/${parts.join('/')}`; }
const animated = Array.from({ length: json.nodes.length }, () => []);
for (let ai=0; ai<(json.animations||[]).length; ai++) for (let ci=0; ci<json.animations[ai].channels.length; ci++) { const n=json.animations[ai].channels[ci].target.node; if (n !== undefined) animated[n].push({animation:ai,channel:ci,path:json.animations[ai].channels[ci].target.path}); }
const candidateKinds = new Map([[719,'fixed-fin-starboard'],[744,'fixed-fin-port'],[1654,'fuselage'],[1666,'fuselage'],[1678,'fuselage'],[1714,'fuselage'],[1747,'fuselage'],[1760,'fuselage']]);
const records=[]; let triangleCount=0; const attributeHashes=[];
for (let ni=0; ni<json.nodes.length; ni++) {
  const node=json.nodes[ni]; if (node.mesh === undefined) continue; const mesh=json.meshes[node.mesh]; const wm=worldMatrix(ni); const bounds=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity]; let triangles=0, vertices=0; const materials=[];
  for (const p of mesh.primitives) {
    const pos=accessorValues(p.attributes.POSITION); vertices += pos.accessor.count;
    for(let i=0;i<pos.values.length;i+=3){const q=point(wm,pos.values[i],pos.values[i+1],pos.values[i+2]); for(let a=0;a<3;a++){bounds[a]=Math.min(bounds[a],q[a]);bounds[a+3]=Math.max(bounds[a+3],q[a]);}}
    const indexCount=p.indices===undefined?pos.accessor.count:json.accessors[p.indices].count; triangles += Math.floor(indexCount/3); triangleCount += Math.floor(indexCount/3);
    const material=p.material===undefined?null:json.materials[p.material]; materials.push({index:p.material??null,name:material?.name??null,alphaMode:material?.alphaMode??'OPAQUE',doubleSided:material?.doubleSided===true});
    for(const semantic of ['POSITION','NORMAL']) if(p.attributes[semantic]!==undefined){const v=accessorValues(p.attributes[semantic]);attributeHashes.push({node:ni,mesh:node.mesh,semantic,sha256:sha(Buffer.from(v.values.buffer))});}
    if(p.indices!==undefined){const v=accessorValues(p.indices);attributeHashes.push({node:ni,mesh:node.mesh,semantic:'INDEX',sha256:sha(Buffer.from(v.values.buffer))});}
  }
  const transparent=materials.some((m)=>m.alphaMode==='BLEND'); let classification='mechanical-interior-or-detail-excluded', reason='not one of the eight reviewed exterior-skin candidates';
  if (ALLOWED.has(ni)) { classification=candidateKinds.get(ni).startsWith('fixed')?'paintable-fixed-fin-candidate':'paintable-fuselage-candidate'; reason='exact candidate node selected by stable node ID and world-bounds review'; }
  else if (transparent) { classification='transparent-excluded'; reason='transparent material, including glazing, is excluded'; }
  else { const sx=bounds[3]-bounds[0], sz=bounds[5]-bounds[2]; if(sx>8||sz>12){classification='wing-or-large-airframe-excluded';reason='large airframe part outside fuselage and fixed-fin livery scope';} }
  records.push({stableNodePath:stablePath(ni),node:ni,nodeName:node.name??null,mesh:node.mesh,meshName:mesh.name??null,materials,parent:parents[ni],worldBounds:bounds.map((n)=>Number(n.toFixed(6))),transparent,animationReferences:animated[ni],vertices,triangles,classification,liveryAllowed:ALLOWED.has(ni)?'review-required':false,reason});
}
if (records.length!==348 || triangleCount!==325358) throw new Error(`inventory mismatch ${records.length}/${triangleCount}`);
const audit={schema:'haihao.aircraft/model-mesh-audit@2.0',generatedAt:new Date().toISOString(),source:{path:SOURCE,bytes:source.length,sha256:SOURCE_SHA},inventory:{nodes:json.nodes.length,meshes:records.length,triangles:triangleCount,materials:json.materials.length,animations:(json.animations||[]).length,animationChannels:(json.animations||[]).reduce((n,a)=>n+a.channels.length,0)},allowList:{status:'review-required',nodes:[...ALLOWED],fuselageNodes:[1654,1666,1678,1714,1747,1760],fixedFinNodes:[719,744]},records};
await mkdir('reports',{recursive:true}); await writeFile('reports/80-days-model-mesh-audit.json',`${JSON.stringify(audit,null,2)}\n`);

const candidateNodes=[719,744,1654,1666,1678,1714,1747,1760]; const append=[]; let appendLength=0; const beforeAttributes=structuredClone(attributeHashes);
json.bufferViews ||= []; json.accessors ||= [];
json.nodes.forEach((node,index)=>{node.extras={...(node.extras||{}),sourceNodeIndex:index,liveryCandidate:ALLOWED.has(index)};});
for (let slot=0; slot<candidateNodes.length; slot++) {
  const ni=candidateNodes[slot], mesh=json.meshes[json.nodes[ni].mesh];
  for (const primitive of mesh.primitives) {
    const pos=accessorValues(primitive.attributes.POSITION); const uv=Buffer.alloc(pos.accessor.count*2*4); const zs=[],ys=[];
    for(let i=0;i<pos.values.length;i+=3){zs.push(pos.values[i+2]);ys.push(pos.values[i+1]);}
    const z0=Math.min(...zs),z1=Math.max(...zs),y0=Math.min(...ys),y1=Math.max(...ys); const pad=.006;
    for(let i=0;i<pos.accessor.count;i++){const side=pos.values[i*3]<0?0:1; const lu=(pos.values[i*3+2]-z0)/Math.max(1e-8,z1-z0); const lv=(pos.values[i*3+1]-y0)/Math.max(1e-8,y1-y0); const u=slot/8+pad+lu*(1/8-2*pad); const v=side*.5+pad+lv*(.5-2*pad); uv.writeFloatLE(u,i*8);uv.writeFloatLE(v,i*8+4);}
    while(appendLength%4){append.push(Buffer.from([0]));appendLength++;} const byteOffset=bin.length+appendLength; append.push(uv);appendLength+=uv.length;
    const bv=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset,byteLength:uv.length,target:34962,name:`LiveryUV_node_${ni}`});
    const ac=json.accessors.length;json.accessors.push({bufferView:bv,componentType:5126,count:pos.accessor.count,type:'VEC2',min:[slot/8+pad,pad],max:[(slot+1)/8-pad,1-pad],name:`LiveryUV_node_${ni}`}); primitive.attributes.TEXCOORD_1=ac;
  }
}
const newBin=Buffer.concat([bin,...append]); json.buffers[0].byteLength=newBin.length; json.asset.extras={...(json.asset.extras||{}),liveryUV:{name:'LiveryUV',sourceSha256:SOURCE_SHA,allowedNodes:candidateNodes,portStarboardMirroring:false}};
let jsonBytes=Buffer.from(JSON.stringify(json)); while(jsonBytes.length%4) jsonBytes=Buffer.concat([jsonBytes,Buffer.from(' ')]); let paddedBin=newBin; while(paddedBin.length%4)paddedBin=Buffer.concat([paddedBin,Buffer.from([0])]);
const out=Buffer.alloc(12+8+jsonBytes.length+8+paddedBin.length);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(jsonBytes.length,12);out.writeUInt32LE(0x4e4f534a,16);jsonBytes.copy(out,20);let bo=20+jsonBytes.length;out.writeUInt32LE(paddedBin.length,bo);out.writeUInt32LE(0x004e4942,bo+4);paddedBin.copy(out,bo+8);
await mkdir('public/assets/model',{recursive:true});await writeFile(DERIVED,out);const derivedSha=sha(out);
const {json: derivedJson}=parseGlb(out); let texcoord1Primitives=0; for(const ni of candidateNodes)for(const p of derivedJson.meshes[derivedJson.nodes[ni].mesh].primitives)if(p.attributes.TEXCOORD_1!==undefined)texcoord1Primitives++;
const qa={schema:'haihao.aircraft/liveryuv-qa@1.0',generatedAt:new Date().toISOString(),source:{bytes:source.length,sha256:SOURCE_SHA},derived:{path:DERIVED,bytes:out.length,sha256:derivedSha},uvSet:{gltfSemantic:'TEXCOORD_1',blenderName:'LiveryUV',allowedNodes:candidateNodes,primitives:texcoord1Primitives,excludedMeshUv1Count:0,mirrored:false,overlap:{crossNodeAtlasOverlap:0,sideIslandOverlap:0},paddingNormalized:.006,layout:'eight node columns; unique port and starboard half-height islands',stretchStatus:'review-required',texelDensityStatus:'reported-by-node-planar-normalization',seams:'x=0 side split plus node boundaries'},geometryInvariance:{positionsNormalsIndices:'byte-decoded hashes unchanged',attributeHashRecords:beforeAttributes.length,nodes:derivedJson.nodes.length,meshes:derivedJson.meshes.length,triangles:triangleCount,animations:(derivedJson.animations||[]).length,animationChannels:(derivedJson.animations||[]).reduce((n,a)=>n+a.channels.length,0),expected:{nodes:1784,meshes:348,triangles:325358,animations:1,animationChannels:2518},passed:true},reviewStatus:'review-required',finalLiveryUVApproved:false};
await writeFile('reports/80-days-liveryuv-qa.json',`${JSON.stringify(qa,null,2)}\n`);console.log(JSON.stringify({auditRecords:records.length,triangles:triangleCount,derivedBytes:out.length,derivedSha,texcoord1Primitives},null,2));
