import * as THREE from 'three';
import {NativeAircraft} from './native-aircraft.js';

const out=document.querySelector('#out');
window.__B24_STARTUP__={signal:undefined,report:()=>{}};
function boxRecord(mesh,path){
  const b=new THREE.Box3().setFromObject(mesh),c=new THREE.Vector3(),s=new THREE.Vector3();b.getCenter(c);b.getSize(s);
  return {id:mesh.userData.sourceNode,path,family:mesh.userData.family,min:b.min.toArray(),max:b.max.toArray(),center:c.toArray(),size:s.toArray(),triangles:mesh.geometry.index.count/3};
}
try{
  const aircraft=await NativeAircraft.load(()=>{});document.body.appendChild(document.createElement('div'));aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);
  const all=aircraft.meshes.map(m=>boxRecord(m,aircraft.paths[m.userData.sourceNode]||''));
  const candidates=all.filter(r=>r.family==='glass'||/(?:window|glass|cockpit|nose|bombard|canopy|windshield|navigator|observer)/i.test(r.path));
  const noseSkin=all.filter(r=>r.family==='airframe-skin'&&r.max[2]>3.3&&r.max[0]>.45&&r.min[0]<1.6);
  const portGlass=candidates.filter(r=>r.family==='glass'&&r.max[0]>.15).sort((a,b)=>b.center[2]-a.center[2]);
  const likelyPortNose=portGlass.filter(r=>r.center[2]>2.5);
  const audit={schema:'haihao.aircraft/80-days-nose-anchor-audit@1.0',sourcePayloadSHA256:aircraft.digest,coordinateConvention:'+Z nose, +X port, +Y up',candidateCount:candidates.length,glassCount:all.filter(r=>r.family==='glass').length,candidates,portGlass,likelyPortNose,noseSkin};
  window.__B24_NOSE_ANCHOR_AUDIT__=audit;
  out.textContent=JSON.stringify(audit,null,2);
}catch(e){window.__B24_NOSE_ANCHOR_ERROR__=String(e?.stack||e);out.textContent=window.__B24_NOSE_ANCHOR_ERROR__;}
