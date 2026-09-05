#!/usr/bin/env node
// Deterministic offline compiler. The source is read-only; production has no source fallback.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const [source,out]=process.argv.slice(2).map(p=>path.resolve(p));
if(!source||!out||source===out)throw Error('Usage: node tools/distill.mjs SOURCE_RUNTIME OUTPUT_RUNTIME');
const T=await import(pathToFileURL(path.join(source,'vendor/three.module.js')));
const hash=b=>createHash('sha256').update(b).digest('hex');
const sourceBin=gunzipSync(fs.readFileSync(path.join(source,'assets/native.bin.gz')));
const sourceJson=gunzipSync(fs.readFileSync(path.join(source,'assets/native.json.gz')));
if(hash(sourceBin)!=='7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2'||hash(sourceJson)!=='8934b65ef1b29fc8b64da5e339815a39f8d03254c0b31638781bc16016a6d307')throw Error('Reference identity mismatch');
const m=JSON.parse(sourceJson),types={f32:Float32Array,u32:Uint32Array,u16:Uint16Array,u8:Uint8Array,i16:Int16Array};
const bytes=i=>sourceBin.subarray(m.blocks[i].offset,m.blocks[i].offset+m.blocks[i].byteLength);
const cache=new Map();
function arr(i){if(!cache.has(i)){const d=m.blocks[i],buf=bytes(i),a=new types[d.dtype](buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength));cache.set(i,a);}return cache.get(i);}
for(const d of m.blocks)if(hash(bytes(d.id))!==d.sha256)throw Error('Reference block hash mismatch '+d.id);
const paths=[];function nodePath(id){if(paths[id])return paths[id];const d=m.components[id];return paths[id]=(d.parent===null?'':nodePath(d.parent)+'/')+d.name;}
m.components.forEach(d=>nodePath(d.id));
const nodes=m.components.map(d=>{const n=new T.Object3D();if(d.matrix)new T.Matrix4().fromArray(d.matrix).decompose(n.position,n.quaternion,n.scale);else{n.position.fromArray(d.translation||[0,0,0]);n.quaternion.fromArray(d.rotation||[0,0,0,1]);n.scale.fromArray(d.scale||[1,1,1]);}return n;});
function sample(t,time){const ts=arr(t.timeBlock),vs=arr(t.valueBlock),n=nodes[t.targetNode];let lo=0,hi=ts.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(ts[mid]<=time)lo=mid;else hi=mid;}const u=T.MathUtils.clamp((time-ts[lo])/(ts[hi]-ts[lo]||1),0,1);if(t.path==='rotation')n.quaternion.fromArray(vs,lo*4).slerp(new T.Quaternion().fromArray(vs,hi*4),u);else{const a=t.path==='translation'?n.position:n.scale;a.set(T.MathUtils.lerp(vs[lo*3],vs[hi*3],u),T.MathUtils.lerp(vs[lo*3+1],vs[hi*3+1],u),T.MathUtils.lerp(vs[lo*3+2],vs[hi*3+2],u));}}
const tracks=m.animations[0].tracks;tracks.forEach(t=>sample(t,0));
const components=m.components.map((d,id)=>({id:d.id,name:d.name,parent:d.parent,mesh:d.mesh,semanticFamily:d.semanticFamily,translation:nodes[id].position.toArray(),rotation:nodes[id].quaternion.toArray(),scale:nodes[id].scale.toArray()}));
// Only actual runtime inputs are retained. The former non-runtime tracks are sampled once into poses.
const motion={schema:'b24-motion-controller/1',representation:'source-derived control curves plus analytical spindle axes',calibratedMechanisms:false,curves:[],actuators:{gear:{sourceSeconds:5,bindings:[]},bay:{sourceSeconds:2.15,bindings:[]}},rotors:[]};
const curveMap=new Map();let active=0,bakedActive=0,keyIn=0,keyOut=0;
for(const t of tracks){
 let kind;if(/(?:[lrc]_gear_|[lrc]_wheel_)/i.test(paths[t.targetNode]))kind='gear';else if(/bomb_door/i.test(paths[t.targetNode]))kind='bay';else continue;
 if(t.interpolation!=='LINEAR')throw Error('Unsupported source interpolation');
 active++;const ts=arr(t.timeBlock),vs=arr(t.valueBlock),dim=t.path==='rotation'?4:3;keyIn+=ts.length;
 const maxTime=motion.actuators[kind].sourceSeconds;let end=Array.from(ts).findIndex(x=>x>=maxTime);if(end<0)end=ts.length-1;end=Math.max(1,end);
 const times=Array.from(ts.slice(0,end+1)),values=Array.from(vs.slice(0,(end+1)*dim));
 const constant=values.every((v,i)=>Object.is(v,values[i%dim]));
 // A numerically non-unit constant quaternion can change under the source slerp. Keep it.
 if(constant && t.path!=='rotation'){bakedActive++;continue;}
 const curve={dimension:dim,times,values};const key=JSON.stringify(curve);let id=curveMap.get(key);
 if(id===undefined){id=motion.curves.length;motion.curves.push(curve);curveMap.set(key,id);keyOut+=times.length;}
 motion.actuators[kind].bindings.push({node:t.targetNode,path:t.path,curve:id});
}
for(const [engine,id] of [1454,1385,1431,1408].entries()){
 const t=tracks.find(t=>t.targetNode===id&&t.path==='rotation');const vs=arr(t.valueBlock),a=new T.Quaternion().fromArray(vs,0),b=new T.Quaternion().fromArray(vs,4);if(a.dot(b)<0)b.set(-b.x,-b.y,-b.z,-b.w);
 const d=a.clone().invert().multiply(b),axis=new T.Vector3(d.x,d.y,d.z).normalize();if(axis.lengthSq()<.9)throw Error('Invalid source spindle');motion.rotors.push({engine,node:id,axis:axis.toArray(),base:a.toArray()});
}
const buffers=[],blocks=[],map=new Map();let offset=0;let indexInputBytes=0;
function block(id,role){
 const d=m.blocks[id];let raw=bytes(id),dtype=d.dtype;
 if(role==='index'){const a=arr(id);let mx=0;for(const x of a)mx=Math.max(mx,x);if(mx>65535)throw Error('Index overflow');indexInputBytes+=raw.length;raw=Buffer.from(Uint16Array.from(a).buffer);dtype='u16';}
 const key=dtype+':'+hash(raw);if(map.has(key))return map.get(key);
 const pad=(4-offset%4)%4;if(pad){buffers.push(Buffer.alloc(pad));offset+=pad;}
 const idx=blocks.length;blocks.push({id:idx,dtype,offset,byteLength:raw.length,sha256:hash(raw),role});buffers.push(raw);offset+=raw.length;map.set(key,idx);return idx;
}
const meshes=m.meshes.map(d=>({id:d.id,sourceMeshIndex:d.sourceMeshIndex,name:d.name,positionBlock:block(d.positionBlock,'position'),normalBlock:block(d.normalBlock,'normal'),indexBlock:block(d.indexBlock,'index'),vertexCount:d.vertexCount,indexCount:d.indexCount,triangleCount:d.triangleCount,bounds:d.bounds}));
// Curves are explicit scalar-actuator data, stored as compact numeric streams.
function controlBlock(values,role){const raw=Buffer.from(Float32Array.from(values).buffer),key='f32:'+hash(raw);if(map.has(key))return map.get(key);const pad=(4-offset%4)%4;if(pad){buffers.push(Buffer.alloc(pad));offset+=pad;}const id=blocks.length;blocks.push({id,dtype:'f32',offset,byteLength:raw.length,sha256:hash(raw),role});buffers.push(raw);offset+=raw.length;map.set(key,id);return id;}
for(const c of motion.curves){c.timeBlock=controlBlock(c.times,'controller-time');c.valueBlock=controlBlock(c.values,'controller-value');c.keyCount=c.times.length;delete c.times;delete c.values;}
const payload=Buffer.concat(buffers);const manifest={schema:'b24-compact-numeric/1',representation:'exact numeric mesh transition; full parametric geometry pending',sourcePayloadSha256:hash(sourceBin),payloadSha256:hash(payload),coordinateSystem:m.coordinateSystem,statistics:m.statistics,globalBounds:m.globalBounds,components,meshes,blocks,motion};
manifest.statistics={components:components.length,meshes:meshes.length,vertices:meshes.reduce((a,d)=>a+d.vertexCount,0),triangles:meshes.reduce((a,d)=>a+d.triangleCount,0)};
let geometryChecks=0;
for(let i=0;i<meshes.length;i++)for(const role of ['position','normal','index']){const a=arr(m.meshes[i][role+'Block']),d=blocks[meshes[i][role+'Block']],raw=payload.subarray(d.offset,d.offset+d.byteLength),b=new types[d.dtype](raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length));if(a.length!==b.length||a.some((v,k)=>!Object.is(v,b[k])))throw Error('Geometry differed '+i+':'+role);geometryChecks++;}
const json=Buffer.from(JSON.stringify(manifest)),gzipBin=gzipSync(payload,{level:9}),gzipJson=gzipSync(json,{level:9});
fs.mkdirSync(path.join(out,'assets/parts'),{recursive:true});
const layout={revision:'20260905-native-r1',chunkBytes:524288,payloadSha256:hash(payload),datasets:[]};
for(const [id,raw,zipped] of [['json',json,gzipJson],['bin',payload,gzipBin]]){const d={id,bytes:zipped.length,sha256:hash(zipped),decodedBytes:raw.length,decodedSha256:hash(raw),parts:[]};for(let at=0,k=0;at<zipped.length;at+=layout.chunkBytes,k++){const part=zipped.subarray(at,at+layout.chunkBytes),h=hash(part),url=`./assets/parts/${id}-${String(k).padStart(3,'0')}-${h.slice(0,16)}.part`;fs.writeFileSync(path.join(out,url),part);d.parts.push({url,bytes:part.length,sha256:h});}layout.datasets.push(d);}
fs.writeFileSync(path.join(out,'asset-layout.js'),'// Generated, content-locked data-only transport.\nexport const LAYOUT = '+JSON.stringify(layout,null,2)+';\n');
const report={sourcePayloadSha256:hash(sourceBin),payloadSha256:hash(payload),sourceJsonSha256:hash(sourceJson),jsonSha256:hash(json),rawPayloadBytes:payload.length,compressedGeometryBytes:gzipBin.length,compressedManifestAndMotionBytes:gzipJson.length,totalDataBytes:gzipBin.length+gzipJson.length,previousDataBytes:8917196,savedDataBytes:8917196-gzipBin.length-gzipJson.length,savePercent:100*(1-(gzipBin.length+gzipJson.length)/8917196),geometryNumericEqualityChecks:geometryChecks,geometryNumericEqualityPassed:true,geometryQuantized:false,geometryParametricComplete:false,sourceImages:18,outputImages:0,outputUVBlocks:0,outputSourceAnimationBlocks:0,sourceAnimationTracks:tracks.length,initialPosesBaked:components.length,sourceRuntimeBindings:active,constantRuntimeBindingsBaked:bakedActive,compiledBindings:Object.values(motion.actuators).reduce((a,c)=>a+c.bindings.length,0),sharedControlCurves:motion.curves.length,sourceRuntimeKeyCount:keyIn,uniqueRetainedKeyCount:keyOut,rotorControllers:motion.rotors.length,parts:layout.datasets.reduce((a,d)=>a+d.parts.length,0),fullEngineeringMechanismReconstruction:false,visualAcceptance:false,productionReady:false};
fs.mkdirSync(path.join(out,'../reports'),{recursive:true});fs.writeFileSync(path.join(out,'../reports/DISTILLATION.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(out,'../reports/MOTION_SOURCE_MAPPING.json'),JSON.stringify({source:m.sourceLock,sourceRuntimeTrackCount:active,boundaries:{gear:[0,5],bay:[0,2.15]},unusedTracksPolicy:'initial pose preserved; unused time evolution not executed by previous runtime'},null,2));
console.log(JSON.stringify(report,null,2));
