import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {NativeAircraft} from './native-aircraft.js';

const $=s=>document.querySelector(s),canvas=$('#scene'),label=$('#label'),status=$('#status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x101410);scene.add(new THREE.HemisphereLight(0xffffff,0x70766f,1.45));const key=new THREE.DirectionalLight(0xffffff,1.8);key.position.set(7,9,14);scene.add(key);
const camera=new THREE.PerspectiveCamera(30,1,.03,100),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.target.set(0,-.55,6.65);camera.position.set(5.0,-.2,6.65);controls.update();
window.__B24_STARTUP__={signal:undefined,report:()=>{}};
const CANDIDATES=[7,80,8,81,12,85,13,86,10,83,69,71,63,65,59,60];
let aircraft,glassMesh,components=[],highlight;
function buildComponents(mesh){
 const g=mesh.geometry,p=g.attributes.position,ix=g.index,parent=new Int32Array(p.count);for(let i=0;i<p.count;i++)parent[i]=i;
 const find=a=>{let r=a;while(parent[r]!==r)r=parent[r];while(parent[a]!==a){const n=parent[a];parent[a]=r;a=n;}return r;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);join(a,b);join(b,c);}
 const groups=new Map();for(let i=0;i<ix.count;i+=3){const root=find(ix.getX(i));let rec=groups.get(root);if(!rec){rec={indices:[],vertices:new Set()};groups.set(root,rec);}for(let k=0;k<3;k++){const id=ix.getX(i+k);rec.indices.push(id);rec.vertices.add(id);}}
 const v=new THREE.Vector3(),box=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3();return [...groups.values()].map((rec,n)=>{box.makeEmpty();for(const id of rec.vertices){v.fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld);box.expandByPoint(v);}box.getCenter(center);box.getSize(size);return {component:n,indices:rec.indices,min:box.min.toArray(),max:box.max.toArray(),center:center.toArray(),size:size.toArray(),triangles:rec.indices.length/3};});
}
function showCandidate(id){
 if(highlight){scene.remove(highlight);highlight.geometry.dispose();highlight.material.dispose();highlight=null;}
 const rec=components.find(c=>c.component===id);if(!rec){label.textContent='missing '+id;return;}
 const g=glassMesh.geometry.clone();g.setIndex(rec.indices);g.computeVertexNormals();
 highlight=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xff4b22,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.92}));highlight.matrixAutoUpdate=false;highlight.matrix.copy(glassMesh.matrixWorld);highlight.renderOrder=100;scene.add(highlight);
 label.textContent=`component ${id} · center ${rec.center.map(v=>v.toFixed(3)).join(', ')} · size ${rec.size.map(v=>v.toFixed(3)).join(' × ')} · ${rec.triangles} tris`;
 window.__B24_WINDOW_CANDIDATE__={id,...rec};
 document.querySelectorAll('[data-c]').forEach(b=>b.classList.toggle('active',+b.dataset.c===id));
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
try{
 aircraft=await NativeAircraft.load(()=>{});scene.add(aircraft.group);aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);
 // De-emphasize all non-airframe parts so the selected true glass patch reads clearly.
 for(const m of aircraft.meshes){if(m.userData.family==='glass')m.material.transparent=true;if(m.material?.color&&m.userData.family!=='airframe-skin')m.material.color.multiplyScalar(.55);}
 glassMesh=aircraft.meshes.find(m=>m.userData.sourceNode===1723);components=buildComponents(glassMesh);
 const bar=$('#buttons');for(const id of CANDIDATES){const b=document.createElement('button');b.dataset.c=id;b.textContent=id;b.onclick=()=>showCandidate(id);bar.appendChild(b);}
 window.__B24_WINDOW_CANDIDATES_READY__={componentCount:components.length,candidates:CANDIDATES};showCandidate(CANDIDATES[0]);status.textContent='Mother 01 glass node 1723 · connected-component candidate audit';
}catch(e){window.__B24_WINDOW_CANDIDATES_ERROR__=String(e?.stack||e);status.textContent=window.__B24_WINDOW_CANDIDATES_ERROR__;}
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});