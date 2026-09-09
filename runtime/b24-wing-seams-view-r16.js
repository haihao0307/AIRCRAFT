import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createServiceLife} from './b24-service-life-r16.js';
import {NativeAircraft} from './native-aircraft.js';
import {BAY_POSES} from './b24-r7-bay-poses.js';
import {BAY_POSES_R8 as BAY_POSES_R16} from './b24-r8-bay-poses.js';
import {applyDetailMaterials} from './b24-r10-detail-materials.js';
import {createSkinSystem,makeInsigniaTexture,makeDecal} from './b24-r16-skin-system.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),stage=$('#stage'),loading=$('#loading'),bar=$('#bar'),loadText=$('#loadText'),diag=$('#diag'),status=$('#status');
let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){loadText.textContent='此设备无法建立 WebGL 画面。';diag.textContent='请使用支持 WebGL 的浏览器查看 3D；结构说明可在 R14 工作台阅读。';throw e;}renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111512);
const perspective=new THREE.PerspectiveCamera(38,1,.05,300),ortho=new THREE.OrthographicCamera(-18,18,15,-15,.05,300);let activeCamera=perspective;
const orbitControls=new OrbitControls(perspective,canvas);orbitControls.enableDamping=true;orbitControls.target.set(0,0,-2.56);
const fixedControls=new OrbitControls(ortho,canvas);fixedControls.enableDamping=true;fixedControls.enableRotate=false;fixedControls.enabled=false;fixedControls.target.set(0,0,-2.56);
scene.add(new THREE.HemisphereLight(0xffffff,0x808080,1.45));const key=new THREE.DirectionalLight(0xffffff,1.85);key.position.set(11,16,13);key.castShadow=false;scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,1.25);fill.position.set(-12,7,-14);scene.add(fill);const underside=new THREE.DirectionalLight(0xffffff,1.55);underside.position.set(0,-12,3);scene.add(underside);const grid=new THREE.GridHelper(60,30,0x465145,0x252c26);grid.position.y=-2.64;scene.add(grid);
window.__B24_STARTUP__={signal:undefined,report:s=>{if(s?.totalBytes)bar.style.width=(8+58*s.receivedBytes/s.totalBytes)+'%';diag.textContent=s?.stage||'loading';}};
const closedDoorAssetMatrices={764:[-0.49668446950821343,0.0011307731244016028,0.014069963770630328,0,0.014070101328041505,0.000041894857995065575,0.4966857215883622,0,0.0011291336454995191,0.4968835947608482,-0.00007389760421291332,0,0.8929893849258252,-0.11867280071121095,-6.215742571136681,1],767:[-0.18265125350339223,0.0004158316623114882,0.0051741028303089465,0,0.005174153415811659,0.000015406457817620175,0.18265171394462346,0,0.000415228758667542,0.18272448002693129,-0.000027175180359972,0,0.9107880429065982,-0.10993806451448251,-6.214626848293713,1],773:[-0.495455446625045,-0.002166361297207074,-0.03464539317236424,0,-0.03464573921203004,-1.1677231358323145e-8,0.49546015973151086,0,-0.002161086061311173,0.4966652830940178,-0.0001511051640522352,0,-0.885395115535104,-0.11871993171932121,-6.215226474635511,1],776:[-0.1823878915073812,-0.0007974845607859755,-0.012753720348004982,0,-0.012753847732708197,-4.298642028453122e-9,0.18238962650405266,0,-0.0007955426320841896,0.18283325854118368,-0.00005562508688742101,0,-0.9092408840103107,-0.1100533783720577,-6.214442954298027,1]};
let serviceLife;let jointDemo;let aircraft,insigniaGroup,guideGroup,split=0,paintMeshes=[],skinSystem;const upper=new THREE.Color(0x5e5839),lower=new THREE.Color(0x8b8c97);
function applyAssetMatrix(nodeId,assetArray){const node=aircraft.nodes[nodeId];if(!node)throw new Error('缺少侧门源节点 '+nodeId);aircraft.group.updateMatrixWorld(true);node.parent.updateMatrixWorld(true);const target=new THREE.Matrix4().multiplyMatrices(aircraft.group.matrixWorld,new THREE.Matrix4().fromArray(assetArray));const local=new THREE.Matrix4().multiplyMatrices(node.parent.matrixWorld.clone().invert(),target);local.decompose(node.position,node.quaternion,node.scale);node.matrixAutoUpdate=true;node.updateMatrix();node.updateMatrixWorld(true)}
function closeWaistDoors(){for(const [id,v] of Object.entries(closedDoorAssetMatrices))applyAssetMatrix(+id,v);aircraft.group.updateMatrixWorld(true);$('#doorState').textContent='左右两组侧门关闭端点已应用；腰部机枪保持原始状态。'}
function closeRepairedBombBay(){
  for(const part of BAY_POSES_R16.parts)applyAssetMatrix(part.sourceNode,part.closed);
  aircraft.group.updateMatrixWorld(true);
  const inverse=aircraft.group.matrixWorld.clone().invert();let maxMatrixError=0;
  for(const part of BAY_POSES_R16.parts){
    const actual=inverse.clone().multiply(aircraft.nodes[part.sourceNode].matrixWorld).elements;
    actual.forEach((v,i)=>{maxMatrixError=Math.max(maxMatrixError,Math.abs(v-part.closed[i]));});
  }
  if(maxMatrixError>1e-6)throw new Error('Bomb bay pose mismatch '+maxMatrixError);
  window.__B24_BAY_R16__={parts:BAY_POSES_R16.parts.length,maxMatrixError,sourcePackage:BAY_POSES.sourcePackage,sourceSHA256:BAY_POSES.sourceSHA256,sideSillFit:BAY_POSES_R16.groups,staticPoseOnly:true};
}
function applySkinShader(){skinSystem?.setOffset(split)}
function buildInsignia(){
  insigniaGroup=new THREE.Group();guideGroup=new THREE.Group();scene.add(insigniaGroup,guideGroup);
  const texture=makeInsigniaTexture(renderer),results=[];
  for(const placement of skinSystem.placements){
    const {mesh,audit}=makeDecal(placement,skinSystem,texture);mesh.visible=Math.abs(placement.normal[0])<.5;insigniaGroup.add(mesh);results.push(audit);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,28),new THREE.LineBasicMaterial({color:0xe7c45c,depthTest:false,transparent:true,opacity:.5}));
    edge.renderOrder=13;guideGroup.add(edge);
  }
  guideGroup.visible=false;
  skinSystem.audit.referenceSeams={status:'rejected-by-user-2026-09-08',referenceFragments:0,projectedSegments:0,rivetRows:0,legacySourceLoaded:false};
  $('#decalState').textContent='四处军徽位置保持本轮前确认结果；R16 未调整锚点、尺寸或方向。';
  window.__B24_GENERIC_R16__={...skinSystem.audit,results,closedDoorNodes:[764,767,773,776],split:0,colors:{upper:'#5e5839',lower:'#8b8c97'}};
  let wingIsolationRestore,propVisibilityRestore;
  window.__B24_R16_QA__={
    surfaceHits:(origin,direction)=>new THREE.Raycaster(new THREE.Vector3().fromArray(origin),new THREE.Vector3().fromArray(direction).normalize()).intersectObjects(aircraft.meshes.filter(m=>{for(let p=m;p;p=p.parent)if(!p.visible)return false;return true;}),false).slice(0,12).map(h=>({node:h.object.userData.sourceNode,point:h.point.toArray(),distance:h.distance,face:h.faceIndex,faceNormal:h.face.normal.toArray(),normal:h.normal?.toArray(),normalWorld:h.normal?.clone().transformDirection(h.object.matrixWorld).toArray()})),
    meshVisibility:(id,v)=>aircraft.meshes.find(m=>m.userData.sourceNode===id).visible=v,
    isolateWings:(enabled,ids=[1696,1708])=>{
      if(enabled){wingIsolationRestore=aircraft.meshes.map(m=>m.visible);aircraft.meshes.forEach(m=>m.visible=ids.includes(m.userData.sourceNode));insigniaGroup.visible=false;skinSystem.setInsigniaVisible(false);}
      else {aircraft.meshes.forEach((m,i)=>m.visible=wingIsolationRestore[i]);insigniaGroup.visible=true;skinSystem.setInsigniaVisible(true);}
    },
    wingSurfaceSamples:()=>{
      const targets=aircraft.meshes.filter(m=>[1696,1708].includes(m.userData.sourceNode)),samples=[];
      for(const sign of [-1,1])for(const x of [2,2.5,3,3.8,4.2,4.5,5,6,6.8,7,7.4,8.2,8.6,9,11,13,15])for(const z of [-2,-1.4,-1,-.6,-.2,.2,.6]){
        const hits=new THREE.Raycaster(new THREE.Vector3(sign*x,-5,z),new THREE.Vector3(0,1,0)).intersectObjects(targets,false);
        if(hits.length<2)continue;const low=hits[0].point,high=hits.at(-1).point;
        if(high.y-low.y>.06)samples.push({x:sign*x,z,lower:low.toArray(),upper:high.toArray()});
      }return samples;
    },
    tailSurfaceSamples:()=>{
      const targets=aircraft.meshes.filter(m=>[1717,726,729].includes(m.userData.sourceNode)),samples=[];
      for(const x of [-3,-2,-1.5,-1,-.7,.7,1,1.5,2,3])for(const z of [-11.25,-10.75,-10.25,-9.75]){
        const hits=new THREE.Raycaster(new THREE.Vector3(x,-5,z),new THREE.Vector3(0,1,0)).intersectObjects(targets,false);
        if(hits.length<2)continue;const low=hits[0].point,high=hits.at(-1).point;if(high.y-low.y>.025)samples.push({x,z,lower:low.toArray(),upper:high.toArray()});
      }return samples;
    },
    hidePropellersForAudit:hide=>{
      if(hide){propVisibilityRestore=aircraft.meshes.map(m=>m.visible);aircraft.meshes.filter(m=>m.userData.family==='propeller').forEach(m=>m.visible=false);}
      else aircraft.meshes.forEach((m,i)=>m.visible=propVisibilityRestore[i]);
    },
    cowlLipSamples:()=>{
      const targets=aircraft.meshes.filter(m=>[1693,1711,1702].includes(m.userData.sourceNode)),samples=[];
      for(const x of [-7.802,-3.378,3.378,7.802]){
        const y=Math.abs(x)>5.5?.09068:-.05645,points=[];
        for(const angle of [225,270,315]){const a=angle*Math.PI/180,hits=new THREE.Raycaster(new THREE.Vector3(x+.58*Math.cos(a),y+.58*Math.sin(a),5),new THREE.Vector3(0,0,-1)).intersectObjects(targets,false);if(hits.length)points.push(hits[0].point.toArray());}
        samples.push({x,y,points});
      }return samples;
    },
    engineRoleAudit:()=>{
      let mixedTriangles=0,vertexCount=0,originalUVPresent=false;
      for(const mesh of aircraft.meshes.filter(m=>[1669,627,1214].includes(m.userData.sourceNode))){
        const r=mesh.geometry.attributes.detailRole,ix=mesh.geometry.index;vertexCount+=r.count;originalUVPresent ||= !!mesh.geometry.attributes.uv;
        for(let i=0;i<ix.count;i+=3)if(r.getX(ix.getX(i))!==r.getX(ix.getX(i+1))||r.getX(ix.getX(i))!==r.getX(ix.getX(i+2)))mixedTriangles++;
      }return {mixedTriangles,vertexCount,originalUVPresent,nodes:[1669,627,1214]};
    },
    highlightPart:(id,vertices)=>{
      const old=scene.getObjectByName('qa-part-highlight');if(old){scene.remove(old);old.geometry.dispose();old.material.dispose();}
      if(id===null)return;
      const m=aircraft.meshes.find(m=>m.userData.sourceNode===id),chosen=new Set(vertices),idx=m.geometry.index,filtered=[];
      for(let i=0;i<idx.count;i+=3)if(chosen.has(idx.getX(i))&&chosen.has(idx.getX(i+1))&&chosen.has(idx.getX(i+2)))filtered.push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));
      const g=m.geometry.clone();g.setIndex(filtered);const h=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0xff5522,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.8}));h.name='qa-part-highlight';h.matrixAutoUpdate=false;h.matrix.copy(m.matrixWorld);h.renderOrder=100;scene.add(h);
    },
    geometryData:ids=>aircraft.meshes.filter(m=>ids.includes(m.userData.sourceNode)).map(m=>({id:m.userData.sourceNode,positions:Array.from(m.geometry.attributes.position.array),indices:Array.from(m.geometry.index.array),matrix:m.matrixWorld.toArray()})),
    meshInfo:ids=>aircraft.meshes.filter(m=>ids.includes(m.userData.sourceNode)).map(m=>({id:m.userData.sourceNode,path:aircraft.paths[m.userData.sourceNode],localBounds:{min:m.geometry.boundingBox.min.toArray(),max:m.geometry.boundingBox.max.toArray()},matrix:m.matrixWorld.toArray()})),
    focus:(position,target)=>{grid.visible=false;activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.fromArray(position);perspective.up.set(0,1,0);orbitControls.target.fromArray(target);orbitControls.update();},
    inventory:()=>aircraft.meshes.map(m=>{const b=new THREE.Box3().setFromObject(m);return {id:m.userData.sourceNode,path:aircraft.paths[m.userData.sourceNode],family:m.userData.family,visible:m.visible,ancestorsVisible:(()=>{let n=m;while(n){if(!n.visible)return false;n=n.parent;}return true;})(),min:b.min.toArray(),max:b.max.toArray(),color:m.material.color.getHexString(),triangles:m.geometry.index.count/3};}),
    project:point=>{const v=new THREE.Vector3().fromArray(point).project(activeCamera);return [(v.x+1)*stage.clientWidth/2,(1-v.y)*stage.clientHeight/2];},
    camera:()=>({type:activeCamera.isPerspectiveCamera?'perspective':'orthographic',position:activeCamera.position.toArray(),up:activeCamera.up.toArray(),stage:[stage.clientWidth,stage.clientHeight],zoom:activeCamera.zoom,projection:activeCamera.projectionMatrix.elements,rootScale:aircraft.group.scale.toArray()}),
    bodySectionAt:skinSystem.bodySectionAt,
    sourceBufferAudit:async()=>({meshCount:aircraft.meshes.length,components:aircraft.nodes.length,
      payloadSHA256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',aircraft.payload))].map(x=>x.toString(16).padStart(2,'0')).join(''),
      sourceBounds:aircraft.geometries.map(g=>[g.attributes.position.count,g.attributes.normal.count,g.index.count])}),
    ray:(origin,direction)=>new THREE.Raycaster(new THREE.Vector3().fromArray(origin),new THREE.Vector3().fromArray(direction).normalize()).intersectObjects(paintMeshes,false).slice(0,8).map(h=>({node:h.object.userData.sourceNode,point:h.point.toArray()}))
  };
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h;renderer.setSize(w,h,false);perspective.aspect=aspect;perspective.updateProjectionMatrix();const hh=Math.max(ortho.userData.halfHeight||15.5,(ortho.userData.minHalfWidth||18.4)/aspect);ortho.left=-hh*aspect;ortho.right=hh*aspect;ortho.top=hh;ortho.bottom=-hh;ortho.updateProjectionMatrix()}
function setOrtho(position,up,halfHeight){activeCamera=ortho;orbitControls.enabled=false;fixedControls.enabled=true;ortho.userData.halfHeight=halfHeight;ortho.userData.minHalfWidth=Math.abs(position.x)>0?11.8:18.4;ortho.position.copy(position);ortho.up.copy(up);fixedControls.target.set(0,0,-2.56);ortho.lookAt(fixedControls.target);ortho.zoom=1;fixedControls.update();resize()}
function setView(view){document.querySelectorAll('[data-detail]').forEach(el=>el.classList.remove('active'));grid.visible=view==='orbit';if(view==='orbit'){activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.set(27,10,26);perspective.up.set(0,1,0);orbitControls.target.set(0,0,-2.56);orbitControls.update()}else if(view==='port')setOrtho(new THREE.Vector3(40,0,-2.56),new THREE.Vector3(0,1,0),9.4);else if(view==='starboard')setOrtho(new THREE.Vector3(-40,0,-2.56),new THREE.Vector3(0,1,0),9.4);else if(view==='top')setOrtho(new THREE.Vector3(0,40,-2.56),new THREE.Vector3(0,0,1),15.2);else if(view==='bottom')setOrtho(new THREE.Vector3(0,-40,-2.56),new THREE.Vector3(0,0,-1),15.2);else if(view==='front')setOrtho(new THREE.Vector3(0,0,40),new THREE.Vector3(0,1,0),15.2);else if(view==='rear')setOrtho(new THREE.Vector3(0,0,-40),new THREE.Vector3(0,1,0),15.2);else if(view==='perspective-front')window.__B24_R16_QA__.focus([0,.9,27],[0,0,-2.56]);else if(view==='perspective-rear')window.__B24_R16_QA__.focus([0,.9,-31],[0,0,-2.56]);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));status.dataset.view=view;window.__B24_VIEW__=view;status.textContent='R16 · '+({orbit:'立体检查',port:'左舷',starboard:'右舷',top:'上视',bottom:'下视',front:'正交机头',rear:'正交机尾','perspective-front':'机头透视','perspective-rear':'机尾透视'}[view])+' · 弹舱关闭 · 四处军徽位置保持';}
addEventListener('resize',resize);resize();
try{aircraft=await NativeAircraft.load((p,t)=>{bar.style.width=(p*100)+'%';loadText.textContent=t});scene.add(aircraft.group);aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);closeWaistDoors();closeRepairedBombBay();window.__B24_DETAILS_R16__=applyDetailMaterials(aircraft,renderer);skinSystem=createSkinSystem(aircraft,renderer);paintMeshes=skinSystem.paintMeshes;applySkinShader();buildInsignia();serviceLife=createServiceLife(aircraft,scene,skinSystem,renderer,window.__B24_R16_QA__);loading.hidden=true;status.textContent=`R16 已载入 · 弹舱与侧门关闭 · 发动机、轮胎与桨叶细节 · 待审查`;setView('orbit')}catch(e){loading.hidden=false;loading.style.display='flex';console.error(e);loadText.textContent='载入失败';diag.textContent=String(e?.stack||e);status.textContent='载入失败，原数据未替换'}
$('#views').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view)});$('#skinToggle').addEventListener('change',e=>paintMeshes.forEach(m=>m.visible=e.target.checked));$('#split').addEventListener('input',e=>{split=+e.target.value;$('#splitOut').textContent=(split<0?'−':'')+Math.abs(split).toFixed(2)+' m';applySkinShader();if(window.__B24_GENERIC_R16__)window.__B24_GENERIC_R16__.split=split});$('#insigniaToggle').addEventListener('change',e=>{if(insigniaGroup)insigniaGroup.visible=e.target.checked;skinSystem?.setInsigniaVisible(e.target.checked)});$('#guideToggle').addEventListener('change',e=>guideGroup&&(guideGroup.visible=e.target.checked));$('#doorFocus').addEventListener('click',()=>{activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.set(5.4,.15,-6.1);perspective.up.set(0,1,0);orbitControls.target.set(.88,-.12,-6.2);orbitControls.update();status.textContent='左舷腰部侧门关闭近看。腰部机枪保持原状态。'});$('#mobileToggle').addEventListener('click',()=>$('#panel').classList.toggle('open'));
const detailViews={
  'under-tail':{position:[4,-4,-7],target:[.9,.4,-10.4],label:'平尾仰视：根部下表面与外段连续分色。'},
  'under-port':{position:[6,-5,5],target:[4,.1,0],label:'左内翼仰视：检查发动机舱与主翼底面分色。'},
  'under-starboard':{position:[-6,-5,5],target:[-4,.1,0],label:'右内翼仰视：检查主翼底面与发动机罩的独立分色。'},
  'under-outer-port':{position:[10,-4,5],target:[7.8,.1,.4],label:'左外翼仰视：核对外侧发动机与机翼交界。'},
  'under-outer-starboard':{position:[-10,-4,5],target:[-7.8,.1,.4],label:'右外翼仰视：核对外侧发动机与机翼交界。'},
  'gear-starboard':{position:[-5,-1,2],target:[-4,-1.6,-.1],label:'右起落架：灰绿支架、深色软管、金属管路与活塞杆。'},
  'bay-port':{position:[4,-4,4],target:[0,-1.8,-.7],label:'弹舱左侧：检查卷帘与机身侧壁接合。'},
  'bay-starboard':{position:[-4,-4,4],target:[0,-1.8,-.7],label:'弹舱右侧：检查卷帘与机身侧壁接合。'},
  'bay-bottom':{position:[.5,-8,1],target:[0,-2,-.7],label:'弹舱底部：两组卷帘内缘与原有中央梁搭接。'},
  engine:{position:[5,0,6],target:[3.378,0,2.5],label:'发动机罩：前缘橄榄色环绕下唇；后方下侧灰色。机匣主色保留，细分缸头、套管、管路与紧固件。'},
  'engine-starboard':{position:[-5,0,6],target:[-3.378,0,2.5],label:'右侧发动机罩：核对前缘环绕方向与下侧分色。'},
  'cowl-side':{position:[6,-.1,3.1],target:[3.378,0,2.2],label:'整流罩侧面：前缘环绕色与后方下侧灰色过渡。'},
  gear:{position:[6,-.5,2.5],target:[4,-1.5,-.3],label:'起落架：轻微灰尘感轮胎、灰色支柱、金属轮毂与活塞杆。'},
  propeller:{position:[3.8,1.1,5.2],target:[3.38,1.1,3.21],label:'桨叶：Hamilton Standard 厂徽候选；未复制修复机编号。'}
};
$('#details').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(!b||!aircraft)return;const v=detailViews[b.dataset.detail];window.__B24_R16_QA__.focus(v.position,v.target);grid.visible=false;status.textContent=v.label;window.__B24_DETAIL_VIEW__=b.dataset.detail;document.querySelectorAll('[data-view]').forEach(el=>el.classList.remove('active'));document.querySelectorAll('[data-detail]').forEach(el=>el.classList.toggle('active',el===b));});
function render(){if(document.hidden)return;orbitControls.update();fixedControls.update();serviceLife?.update(activeCamera);jointDemo?.update(activeCamera);if(jointDemo&&!$('#skinToggle').checked)jointDemo.group.visible=false;renderer.render(scene,activeCamera);}renderer.setAnimationLoop(render);
addEventListener('pagehide',e=>{if(e.persisted)return;renderer.setAnimationLoop(null);serviceLife?.dispose();jointDemo?.dispose();orbitControls.dispose();fixedControls.dispose();renderer.dispose();});

canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.hidden=false;loadText.textContent='图形上下文已中断，请刷新页面恢复。';});
