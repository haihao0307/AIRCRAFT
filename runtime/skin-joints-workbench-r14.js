import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {couponDefinition,plateGeometry,rivetGeometry,rivetProfile,disposeGroup} from './skin-joints-r14.js';
const $=s=>document.querySelector(s),mount=$('#viewport'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,600);
let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){$('#error').hidden=false;$('#error').textContent='无法建立 WebGL 画面。下方文字与资料仍可阅读。';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;mount.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=10;controls.maxDistance=250;
scene.add(new THREE.HemisphereLight(0xe4efff,0x334137,3));
for(const [p,c,power] of [[[30,25,40],0xffead2,3],[[-30,0,16],0xc4e8ff,2],[[0,-25,-30],0xe5f1ee,3]]){const l=new THREE.DirectionalLight(c,power);l.position.set(...p);scene.add(l);}
const studio=new THREE.Scene();studio.background=new THREE.Color('#566361');for(const [p,s,c] of [[[0,20,0],[70,1,20],'#ffffff'],[[-25,0,0],[1,40,12],'#b9d9e5'],[[18,0,-20],[14,40,1],'#ded7be']]){const m=new THREE.Mesh(new THREE.BoxGeometry(...s),new THREE.MeshBasicMaterial({color:c}));m.position.set(...p);studio.add(m);}
const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromScene(studio,.03);scene.environment=env.texture;pmrem.dispose();disposeGroup(studio);
let type='lap',head='raised',mode='overview',colored=false,separation=0,assembly,cutaway,definition,plateMeshes=[],frames=[],dirty=true;
controls.addEventListener('change',()=>{dirty=true;});
const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const names={lap:['搭接','一块板盖住另一块板。铆钉贯穿重叠区，板边呈现厚度台阶。'], 'backed-butt':['衬板对接','两片外板边缘相对，背面衬板跨过接缝；两排铆钉各自连接外板与衬板。'],stiffener:['加强件连接','一片连续蒙皮连接内侧凸缘。钉排位于加强件上方，外表面没有搭接缝。']};
function material(kind,cut=false){return new THREE.MeshStandardMaterial({color:colored?{outer:0x91bbca,inner:0x7f9a77,rivet:0xd5b36e}[kind]:{outer:0xb8c6ca,inner:0x9daea6,rivet:0xc7c7b8}[kind],metalness:colored?.4:.78,roughness:kind==='rivet'?.28:.38,side:THREE.DoubleSide,clippingPlanes:cut?[plane]:[]});}
function cap(points,kind){const s=new THREE.Shape(points.map(v=>new THREE.Vector2(...v))),g=new THREE.ShapeGeometry(s);g.rotateX(Math.PI/2);const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:{outer:0x91bbca,inner:0x7f9a77,rivet:0xd5b36e}[kind],metalness:.25,roughness:.6,side:THREE.DoubleSide}));m.position.y=-.003;cutaway.add(m);}
function build(){
  dirty=true;
  if(assembly){disposeGroup(assembly);disposeGroup(cutaway);}assembly=new THREE.Group();cutaway=new THREE.Group();scene.add(assembly,cutaway);plateMeshes=[];
  definition=couponDefinition(type,head);const {parameters:p}=definition;
  for(const cut of [false,true]){
    const group=cut?cutaway:assembly;
    for(const a of definition.plates){const holes=cut?a.holes.filter(h=>h.y===0):a.holes;
      const mesh=new THREE.Mesh(plateGeometry({...a,holes,D:p.D,t:p.t,sink:a.outer?p.sink:0,y0:cut?-9:-25,y1:cut?9:25}),material(a.outer?'outer':'inner',cut));mesh.position.z=a.z;mesh.userData={...a,baseZ:a.z};mesh.name=a.id;group.add(mesh);if(!cut)plateMeshes.push(mesh);
      if(cut){const r=p.D/2,rt=r+(a.outer?p.sink:0)*Math.tan(50*Math.PI/180),ranges=holes.sort((a,b)=>a.x-b.x);let left=a.x0;
        for(let i=0;i<=ranges.length;i++){
          const lh=ranges[i-1],rh=ranges[i],lb=lh?lh.x+r:a.x0,rb=rh?rh.x-r:a.x1,lt=lh?lh.x+rt:a.x0,rtop=rh?rh.x-rt:a.x1,z=a.z,top=z+p.t,sink=a.outer?p.sink:0;
          const points=[[lb,z],[rb,z]];if(rh&&sink)points.push([rb,top-sink]);points.push([rtop,top],[lt,top]);if(lh&&sink)points.push([lb,top-sink]);cap(points,a.outer?'outer':'inner');
        }
      }
    }
    if(type==='stiffener'){const web=new THREE.Mesh(new THREE.BoxGeometry(2,cut?18:50,12),material('inner',cut));web.position.set(-7,0,-6);web.userData={baseZ:-6,layer:-1};group.add(web);if(!cut)plateMeshes.push(web);if(cut)cap([[-8,-12],[-6,-12],[-6,0],[-8,0]],'inner');}
    const rs=definition.rivets.filter(r=>!cut||r.point.y===0);const rg=rivetGeometry(p,32),rm=material('rivet',cut),im=new THREE.InstancedMesh(rg,rm,rs.length),matrix=new THREE.Matrix4();rs.forEach((r,i)=>{matrix.makeTranslation(r.point.x,r.point.y,0);im.setMatrixAt(i,matrix);});im.instanceMatrix.needsUpdate=true;group.add(im);
    if(cut)for(const r of rs){const prof=rivetProfile(p);cap([...prof.map(([x,z])=>[x+r.point.x,z]),...prof.slice().reverse().map(([x,z])=>[-x+r.point.x,z])],'rivet');}
  }
  applyMode(false);$('#jointTitle').textContent=names[type][0];$('#jointText').textContent=names[type][1];$('#count').textContent=definition.rivets.length+' 枚';$('#headNote').textContent=head==='flush'?'埋头：顶面齐平，1 mm 锥窝位于 2 mm 厚外板内；当前未模拟薄板压窝。':'凸头：预制头位于外侧；内侧镦头与贯穿杆属于同一枚铆钉。';
}
function applyMode(move=true){assembly.visible=mode!=='section';cutaway.visible=mode==='section';separation=mode==='explode'?8:0;
  dirty=true;
  for(const mesh of plateMeshes)mesh.position.z=mesh.userData.baseZ+mesh.userData.layer*separation;
  if(move){const views={overview:[78,-82,110],front:[0,-.01,155],back:[-70,-65,-125],section:[4,-62,16],explode:[85,-80,105]};camera.position.set(...views[mode]);if(mount.clientWidth<600)camera.position.multiplyScalar(1.45);camera.up.set(0,mode==='section'?0:1,mode==='section'?1:0);controls.target.set(0,0,0);controls.update();}
  $('#stateNote').textContent=mode==='explode'?'板层分离只供观察，已成形的实心铆钉不能这样无损拆出。':mode==='section'?'剖面穿过中间钉轴。蓝绿为板材切面，金色为同一枚连续铆钉。':mode==='back'?'内侧可见镦头与背面连接对象。':'拖动旋转，检查板边、钉头与连接关系。';
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));
}
document.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{type=b.dataset.type;document.querySelectorAll('[data-type]').forEach(a=>a.setAttribute('aria-pressed',String(a===b)));build();});
document.querySelectorAll('[data-head]').forEach(b=>b.onclick=()=>{head=b.dataset.head;document.querySelectorAll('[data-head]').forEach(a=>a.setAttribute('aria-pressed',String(a===b)));build();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{mode=b.dataset.view;applyMode();});
$('#color').onclick=()=>{colored=!colored;$('#color').setAttribute('aria-pressed',String(colored));build();};
let lastMobile=mount.clientWidth<600;
function resize(){dirty=true;camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);const mobile=mount.clientWidth<600;if(assembly&&mobile!==lastMobile)applyMode();lastMobile=mobile;}new ResizeObserver(resize).observe(mount);resize();build();applyMode();
renderer.setAnimationLoop(()=>{if(document.hidden)return;controls.update();if(!dirty)return;dirty=false;const start=performance.now();renderer.render(scene,camera);frames.push(performance.now()-start);if(frames.length>120)frames.shift();$('#status').textContent='R14 · '+renderer.info.render.triangles.toLocaleString()+' triangles · '+renderer.info.render.calls+' draws';});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#error').hidden=false;$('#error').textContent='图形上下文已中断，请刷新页面恢复。';});
window.__SKIN_R14__={version:'R14',state:()=>({type,head,mode,separation,count:definition.rivets.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,frames}),audit:()=>{scene.updateMatrixWorld(true);const ray=(m,x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,30),new THREE.Vector3(0,0,-1)).intersectObject(m).length;return {definition,holeHits:plateMeshes.filter(m=>m.userData.holes).map(m=>({id:m.name,hits:m.userData.holes.map(h=>ray(m,h.x,h.y)),solid:ray(m,m.userData.x0+1,0)})),plates:plateMeshes.filter(m=>m.userData.holes).map(m=>({id:m.name,positions:Array.from(m.geometry.attributes.position.array)})),profile:rivetProfile(definition.parameters)};}};
addEventListener('pagehide',e=>{if(e.persisted)return;renderer.setAnimationLoop(null);controls.dispose();disposeGroup(assembly);disposeGroup(cutaway);env.dispose();renderer.dispose();});
