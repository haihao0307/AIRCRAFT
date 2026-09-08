import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=s=>document.querySelector(s), mount=$('#viewport');
const D=3.175,R=D/2,T=1,H=D*.5,SR=D*.75;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(36,1,.1,500);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){$('#error').style.display='block';$('#error').textContent='此设备未能建立 WebGL 画面。'+e.message;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;mount.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=9;controls.maxDistance=180;
scene.add(new THREE.HemisphereLight(0xe8f2ff,0x344239,3));
for(const [color,power,position] of [[0xffedd5,3,[30,25,40]],[0xc4e8ff,2,[-30,0,16]],[0xe5f1ee,2,[0,-25,-30]]]){const l=new THREE.DirectionalLight(color,power);l.position.set(...position);scene.add(l);}
// Analytic studio reflection, generated in memory. No downloaded or source raster assets.
const studio=new THREE.Scene();studio.background=new THREE.Color('#566361');
for(const [p,s,c] of [[[0,20,0],[70,1,20],'#ffffff'],[[-25,0,0],[1,40,12],'#b9d9e5'],[[18,0,-20],[14,40,1],'#ded7be']]){const m=new THREE.Mesh(new THREE.BoxGeometry(...s),new THREE.MeshBasicMaterial({color:c}));m.position.set(...p);studio.add(m);}
const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(studio,.03);scene.environment=env.texture;pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
const sectionPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const materials={}, baseColors={A:0xb8c6ca,B:0x9daea6,rivet:0xc7c7b8};
for(const section of [false,true])for(const kind of ['A','B','rivet'])materials[kind+(section?'S':'')]=new THREE.MeshStandardMaterial({color:baseColors[kind],metalness:.78,roughness:kind==='rivet'?.27:.36,clippingPlanes:section?[sectionPlane]:[],side:THREE.DoubleSide});
const capMats={A:new THREE.MeshStandardMaterial({color:0x8baeb8,metalness:.2,roughness:.6,side:THREE.DoubleSide}),B:new THREE.MeshStandardMaterial({color:0x718e75,metalness:.2,roughness:.6,side:THREE.DoubleSide}),rivet:new THREE.MeshStandardMaterial({color:0xc9a65d,metalness:.35,roughness:.5,side:THREE.DoubleSide})};
function plate(x0,x1,halfY,z,kind,section=false){const s=new THREE.Shape();s.moveTo(x0,-halfY);s.lineTo(x1,-halfY);s.lineTo(x1,halfY);s.lineTo(x0,halfY);s.closePath();for(const y of section?[0]:[-15,0,15]){const h=new THREE.Path();h.absarc(0,y,R,0,Math.PI*2,true);s.holes.push(h);}const g=new THREE.ExtrudeGeometry(s,{depth:T,bevelEnabled:false,curveSegments:48});const m=new THREE.Mesh(g,materials[kind+(section?'S':'')]);m.position.z=z;m.name='plate-'+kind;return m;}
// One shared radial profile from the bottom shop head through the grip to the factory head.
// A nominal educational profile, deliberately not claimed as a tolerance-controlled AN470 shape.
const profile=[[0,-H],[SR*.87,-H],[SR,-H*.87],[SR,-.17],[SR*.9,0],[R,0],[R,2],[2.55,2],[2.8,2.12],[2.77,2.4],[2.45,2.86],[1.8,3.27],[.9,3.52],[0,3.6]];
function rivet(y,section=false){const g=new THREE.LatheGeometry(profile.map(([r,z])=>new THREE.Vector2(r,z)),64);g.rotateX(Math.PI/2);const m=new THREE.Mesh(g,materials['rivet'+(section?'S':'')]);m.position.y=y;m.name='rivet-'+(y===-15?'01':y===0?'02':'03');return m;}
const coupon=new THREE.Group(),cutaway=new THREE.Group();scene.add(coupon,cutaway);
const A=plate(-38,10,23,1,'A'),B=plate(-10,38,23,0,'B');coupon.add(A,B);const rivets=[-15,0,15].map(y=>rivet(y));coupon.add(...rivets);
cutaway.add(plate(-13,10,9,1,'A',true),plate(-10,13,9,0,'B',true),rivet(0,true));
function cap(points,kind){const s=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,z)));const g=new THREE.ShapeGeometry(s);g.rotateX(Math.PI/2);const mesh=new THREE.Mesh(g,capMats[kind]);mesh.position.y=-.002;mesh.name=kind+'-section-cap';cutaway.add(mesh);return mesh;}
for(const [x0,x1,z,kind] of [[-13,10,1,'A'],[-10,13,0,'B']])for(const [a,b] of [[x0,-R],[R,x1]])cap([[a,z],[b,z],[b,z+T],[a,z+T]],kind);
cap([...profile.map(([r,z])=>[r,z]),...profile.slice().reverse().map(([r,z])=>[-r,z])],'rivet');
// Fine hatch marks belong only to the section plane; they do not suggest surface scratches.
const hatch=[];for(const [x0,x1,z] of [[-13,10,1],[-10,13,0]])for(let x=x0+.1;x<x1-.8;x+=.7)if(x+.7<-R||x>R){hatch.push(x,-.012,z+.1,x+.7,-.012,z+.9);}
const hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.Float32BufferAttribute(hatch,3));cutaway.add(new THREE.LineSegments(hg,new THREE.LineBasicMaterial({color:0x344d47,transparent:true,opacity:.6})));
const annotations=[];function annotation(text,pos,modes){const el=document.createElement('div');el.className='label';el.textContent=text;$('#labels').appendChild(el);annotations.push({el,pos:new THREE.Vector3(...pos),modes});}
annotation('预制头 · 正面',[0,15,3.6],['overview','front']);annotation('板 A',[-27,-10,2],['overview','front','explode']);annotation('板 B',[24,-10,1],['overview','front','back','explode']);annotation('镦头 · 背面',[0,15,-H],['back']);
annotation('预制头',[2.8,0,2.7],['section']);annotation('贯穿钉杆 Ø3.175',[R,0,1],['section']);annotation('镦头 Ø4.763',[SR,0,-H*.6],['section']);annotation('板 A · 1 mm',[-9,0,1.5],['section']);annotation('板 B · 1 mm',[7,0,.5],['section']);
const texts={overview:['从表面，看到连接。','两片搭接薄板，三枚实心铆钉。拖动旋转，观察同一处连接的正面与背面。'],front:['正面：预先成形的头。','同一排铆钉的预制头贴在板 A 上。这里用凸头示例，外形为教学近似。'],back:['背面：尾部镦成的头。','翻过来仍是同一排铆钉。背面的镦头来自钉杆尾部，不是拧上的螺母。'],section:['切开，才看见贯穿。','沿中间铆钉轴线剖开。斜线是板材截面；中间一根连续铆钉穿过两个真实孔。'],explode:['拆开层次，追踪同一个孔。','板层分离只用于观察结构。已镦好的铆钉不能这样无损拆装；这不是装配过程模拟。']};
let mode='overview',labels=true,seg=0;
function setView(v){mode=v;cutaway.visible=v==='section';coupon.visible=!cutaway.visible;seg=v==='explode'?8:0;$('#separation').value=seg;separate(seg);const mobile=mount.clientWidth<600;const views={overview:[78,-82,91],front:[0,-.01,mobile?190:110],back:[0,-.01,mobile?-190:-110],section:[6,-42,16],explode:[81,-81,75]};camera.up.set(0,1,0);camera.position.set(...views[v]);if(mobile && !['front','back'].includes(v))camera.position.multiplyScalar(1.65);camera.up.set(0,v==='section'?0:1,v==='section'?1:0);controls.target.set(0,0,v==='section'?1:0);controls.update();$('#viewTitle').textContent=texts[v][0];$('#viewText').textContent=texts[v][1];document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===v)));}
function separate(value){seg=Number(value);A.position.z=1+seg;B.position.z=-seg;$('#separationValue').textContent=seg.toFixed(1)+' mm';$('#stateNote').textContent=seg?'观察用拆层：两片板各移开 '+seg.toFixed(1)+' mm，孔仍与原铆钉轴线对齐。':'合拢状态：板 A 与板 B 在搭接区接触，钉杆连续贯穿。';}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('#separation').oninput=e=>{if(mode!=='explode'){const value=e.target.value;setView('explode');e.target.value=value;}separate(e.target.value);};
$('#material').onclick=()=>{const active=$('#material').getAttribute('aria-pressed')!=='true';$('#material').setAttribute('aria-pressed',String(active));for(const key in materials){const kind=key.replace('S','');materials[key].color.setHex(active?({A:0x8bb7cd,B:0x77926c,rivet:0xd5ad5c}[kind]):baseColors[kind]);materials[key].metalness=active?.4:.78;} };
$('#labelsToggle').onclick=()=>{labels=!labels;$('#labels').style.display=labels?'block':'none';$('#labelsToggle').setAttribute('aria-pressed',String(labels));$('#labelsToggle').textContent=labels?'标注开启':'标注关闭';};
function resize(){camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);}new ResizeObserver(resize).observe(mount);resize();setView('overview');
const project=new THREE.Vector3();let frame=0;
function render(){controls.update();renderer.render(scene,camera);for(const a of annotations){a.el.style.display=labels&&a.modes.includes(mode)?'block':'none';if(a.el.style.display==='none')continue;project.copy(a.pos);if(mode==='explode'){if(a.el.textContent==='板 A')project.z+=seg;if(a.el.textContent==='板 B')project.z-=seg;}project.project(camera);if(project.z>1){a.el.style.display='none';continue;}a.el.style.left=Math.max(14,Math.min(mount.clientWidth-a.el.offsetWidth-12,(project.x*.5+.5)*mount.clientWidth))+'px';a.el.style.top=(.5-project.y*.5)*mount.clientHeight+'px';}if(frame++%1===0)$('#status').textContent='R12 · '+renderer.info.render.triangles.toLocaleString()+' triangles · '+renderer.info.render.calls+' draws';}
renderer.setAnimationLoop(()=>{if(!document.hidden)render();});
window.__RIVET_R12__={version:'R12',parameters:{D,T,shopDiameter:SR*2,shopHeight:H},getState:()=>({mode,separation:seg,couponVisible:coupon.visible,sectionVisible:cutaway.visible,plateZ:[A.position.z,B.position.z],rivetIds:rivets.map(r=>r.name),triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls}),audit:()=>({holesPerPlate:3,holeRayHits:[A,B].map(m=>[-15,0,15].map(y=>new THREE.Raycaster(new THREE.Vector3(0,y,20),new THREE.Vector3(0,0,-1)).intersectObject(m).length)),solidRayHits:[A,B].map(m=>new THREE.Raycaster(new THREE.Vector3(5,0,20),new THREE.Vector3(0,0,-1)).intersectObject(m).length),continuousRivetProfile:true,shankRadius:R,sectionCaps:5,assembledInterfaceZ:1,profile,sourceRasterAssets:0,generatedEnvironmentTexture:true})};
