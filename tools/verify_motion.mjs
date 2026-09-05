#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {gunzipSync} from 'node:zlib';
const [src,out]=process.argv.slice(2).map(p=>path.resolve(p));
const T=await import(pathToFileURL(path.join(out,'vendor/three.module.js')));
const {MotionSystem}=await import(pathToFileURL(path.join(out,'motion-system.js')));
const orig=JSON.parse(gunzipSync(fs.readFileSync(path.join(src,'assets/native.json.gz'))));const oldBin=gunzipSync(fs.readFileSync(path.join(src,'assets/native.bin.gz')));
const L=(await import(pathToFileURL(path.join(out,'asset-layout.js')))).LAYOUT;const data=Object.fromEntries(L.datasets.map(d=>[d.id,gunzipSync(Buffer.concat(d.parts.map(p=>fs.readFileSync(path.join(out,p.url)))))]));const n=JSON.parse(data.json);
const types={f32:Float32Array,u16:Uint16Array,u32:Uint32Array,u8:Uint8Array};
function get(m,bin,i){const d=m.blocks[i],b=bin.subarray(d.offset,d.offset+d.byteLength);return new types[d.dtype](b.buffer.slice(b.byteOffset,b.byteOffset+b.length));}
const oldCache=new Map();const readOld=i=>{if(!oldCache.has(i))oldCache.set(i,get(orig,oldBin,i));return oldCache.get(i);};
const nodes=m=>m.components.map(d=>{const o=new T.Object3D();if(d.matrix)new T.Matrix4().fromArray(d.matrix).decompose(o.position,o.quaternion,o.scale);else{o.position.fromArray(d.translation||[0,0,0]);o.quaternion.fromArray(d.rotation||[0,0,0,1]);o.scale.fromArray(d.scale||[1,1,1]);}return o;});
const a=nodes(orig),b=nodes(n),rootA=new T.Group(),rootB=new T.Group();
orig.components.forEach(d=>{(d.parent===null?rootA:a[d.parent]).add(a[d.id]);(d.parent===null?rootB:b[d.parent]).add(b[d.id]);});
const paths=[];function nodePath(id){const d=orig.components[id];return paths[id]??=(d.parent===null?'':nodePath(d.parent)+'/')+d.name;}orig.components.forEach(d=>nodePath(d.id));
const tr=orig.animations[0].tracks.map(t=>({...t,times:readOld(t.timeBlock),values:readOld(t.valueBlock)}));const gears=tr.filter(t=>/[lrc]_gear_|[lrc]_wheel_/i.test(paths[t.targetNode]));const bays=tr.filter(t=>/bomb_door/i.test(paths[t.targetNode]));
function sample(t,time){const ts=t.times,vs=t.values,o=a[t.targetNode];let lo=0,hi=ts.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(ts[mid]<=time)lo=mid;else hi=mid;}const u=T.MathUtils.clamp((time-ts[lo])/(ts[hi]-ts[lo]||1),0,1);if(t.path==='rotation')o.quaternion.fromArray(vs,lo*4).slerp(new T.Quaternion().fromArray(vs,hi*4),u);else{const v=t.path==='translation'?o.position:o.scale;v.set(T.MathUtils.lerp(vs[lo*3],vs[hi*3],u),T.MathUtils.lerp(vs[lo*3+1],vs[hi*3+1],u),T.MathUtils.lerp(vs[lo*3+2],vs[hi*3+2],u));}}
tr.forEach(t=>sample(t,0));const motion=new MotionSystem(b,n.motion,i=>get(n,data.bin,i));
let maxLocal=0,maxWorld=0,cases=0,comparisons=0;let failDetail=null;
function compare(tag){rootA.updateMatrixWorld(true);rootB.updateMatrixWorld(true);for(let i=0;i<a.length;i++){const av=[...a[i].position.toArray(),...a[i].quaternion.toArray(),...a[i].scale.toArray()],bv=[...b[i].position.toArray(),...b[i].quaternion.toArray(),...b[i].scale.toArray()];for(let k=0;k<av.length;k++){const e=Math.abs(av[k]-bv[k]);if(e>maxLocal){maxLocal=e;if(e>1e-12)failDetail={tag,node:i,field:k,a:av[k],b:bv[k]};}}for(let k=0;k<16;k++)maxWorld=Math.max(maxWorld,Math.abs(a[i].matrixWorld.elements[k]-b[i].matrixWorld.elements[k]));comparisons++;}cases++;}
compare('baked initial poses');let seed=91;function rand(){seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;}
for(let i=0;i<513;i++){const gear=i<257?i/256:rand(),bay=i<257?1-i/256:rand();gears.forEach(t=>sample(t,gear*5));bays.forEach(t=>sample(t,bay*2.15));motion.set('gear',gear);motion.set('bay',bay);compare('actuators '+i);}
// Continuous source phase integration, independent directions, reset and pause.
let phase=[0,0,0,0],rotorError=0;for(let j=0;j<1000;j++){const dt=rand()*.05,rpm=[800,1100,1550,2200].map(x=>x*(.5+rand()));motion.spin(dt,rpm);for(const s of motion.spindles){phase[s.engine]+=dt*rpm[s.engine]*Math.PI/30;const expected=s.base.clone().multiply(new T.Quaternion().setFromAxisAngle(s.axis,phase[s.engine]%(2*Math.PI)));rotorError=Math.max(rotorError,...expected.toArray().map((v,i)=>Math.abs(v-s.node.quaternion.toArray()[i])));}}
const before=motion.angles.slice();motion.spin(0,motion.speeds);const paused=before.every((x,i)=>x===motion.angles[i]);motion.reset();const reset=motion.angles.every(x=>x===0)&&motion.speeds.every(x=>x===0);
let invalidRejected=false;try{motion.set('gear',NaN);}catch{invalidRejected=true;}
const report={cases,nodeComparisons:comparisons,maxLocalComponentError:maxLocal,maxWorldMatrixElementError:maxWorld,rotorError,paused,reset,invalidRejected,failDetail,passed:maxLocal<=1e-12&&maxWorld<=1e-10&&rotorError===0&&paused&&reset&&invalidRejected,scope:'same inherited playback over approved actuator domains; not engineering correctness'};
fs.writeFileSync(path.join(out,'../reports/MOTION_EQUIVALENCE.json'),JSON.stringify(report,null,2));console.log(report);if(!report.passed)process.exit(1);
