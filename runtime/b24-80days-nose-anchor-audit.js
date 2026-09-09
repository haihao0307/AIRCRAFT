import * as THREE from 'three';
import {NativeAircraft} from './native-aircraft.js';

const out=document.querySelector('#out');
window.__B24_STARTUP__={signal:undefined,report:()=>{}};
function boxRecord(mesh,path){
  const b=new THREE.Box3().setFromObject(mesh),c=new THREE.Vector3(),s=new THREE.Vector3();b.getCenter(c);b.getSize(s);
  return {id:mesh.userData.sourceNode,path,family:mesh.userData.family,min:b.min.toArray(),max:b.max.toArray(),center:c.toArray(),size:s.toArray(),triangles:mesh.geometry.index.count/3};
}
function connectedGeometryComponents(mesh){
  const g=mesh.geometry,p=g.attributes.position,ix=g.index;if(!p||!ix)return [];
  const parent=new Int32Array(p.count);for(let i=0;i<p.count;i++)parent[i]=i;
  const find=a=>{let r=a;while(parent[r]!==r)r=parent[r];while(parent[a]!==a){const n=parent[a];parent[a]=r;a=n;}return r;};
  const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
  for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);join(a,b);join(b,c);}
  const groups=new Map();
  for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),root=find(a);let rec=groups.get(root);if(!rec){rec={triangles:0,vertices:new Set()};groups.set(root,rec);}rec.triangles++;rec.vertices.add(a);rec.vertices.add(ix.getX(i+1));rec.vertices.add(ix.getX(i+2));}
  const v=new THREE.Vector3(),box=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3();
  return [...groups.values()].map((rec,n)=>{
    box.makeEmpty();for(const id of rec.vertices){v.fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld);box.expandByPoint(v);}
    box.getCenter(center);box.getSize(size);
    return {component:n,triangles:rec.triangles,vertexCount:rec.vertices.size,min:box.min.toArray(),max:box.max.toArray(),center:center.toArray(),size:size.toArray()};
  }).sort((a,b)=>b.center[2]-a.center[2]);
}
try{
  const aircraft=await NativeAircraft.load(()=>{});aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);
  const all=aircraft.meshes.map(m=>boxRecord(m,aircraft.paths[m.userData.sourceNode]||''));
  const candidates=all.filter(r=>r.family==='glass'||/(?:window|glass|cockpit|nose|bombard|canopy|windshield|navigator|observer)/i.test(r.path));
  const noseSkin=all.filter(r=>r.family==='airframe-skin'&&r.max[2]>3.3&&r.max[0]>.45&&r.min[0]<1.6);
  const glassMesh=aircraft.meshes.find(m=>m.userData.sourceNode===1723);
  const glassComponents=glassMesh?connectedGeometryComponents(glassMesh):[];
  const noseGlassComponents=glassComponents.filter(c=>c.max[2]>3.0&&c.max[0]>.15&&c.size[0]<1.8&&c.size[1]<1.8&&c.size[2]<3.0);
  const portNoseComponents=noseGlassComponents.filter(c=>c.center[0]>.05).sort((a,b)=>b.center[2]-a.center[2]);
  const audit={schema:'haihao.aircraft/80-days-nose-anchor-audit@1.1',sourcePayloadSHA256:aircraft.digest,coordinateConvention:'+Z nose, +X port, +Y up',candidateCount:candidates.length,glassCount:all.filter(r=>r.family==='glass').length,candidates,noseSkin,glassComponentCount:glassComponents.length,noseGlassComponents,portNoseComponents};
  window.__B24_NOSE_ANCHOR_AUDIT__=audit;
  out.textContent=JSON.stringify(audit,null,2);
}catch(e){window.__B24_NOSE_ANCHOR_ERROR__=String(e?.stack||e);out.textContent=window.__B24_NOSE_ANCHOR_ERROR__;}
