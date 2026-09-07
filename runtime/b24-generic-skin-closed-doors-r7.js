import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {NativeAircraft} from './native-aircraft.js';
import {BAY_POSES} from './b24-r7-bay-poses.js';
import {createSkinSystem,makeInsigniaTexture,makeDecal,makeReferenceSeams} from './b24-r7-skin-system.js';
const $=s=>document.querySelector(s),canvas=$('#scene'),stage=$('#stage'),loading=$('#loading'),bar=$('#bar'),loadText=$('#loadText'),diag=$('#diag'),status=$('#status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;renderer.shadowMap.enabled=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111512);
const perspective=new THREE.PerspectiveCamera(38,1,.05,300),ortho=new THREE.OrthographicCamera(-18,18,15,-15,.05,300);let activeCamera=perspective;
const orbitControls=new OrbitControls(perspective,canvas);orbitControls.enableDamping=true;orbitControls.target.set(0,0,-2.56);
const fixedControls=new OrbitControls(ortho,canvas);fixedControls.enableDamping=true;fixedControls.enableRotate=false;fixedControls.enabled=false;fixedControls.target.set(0,0,-2.56);
scene.add(new THREE.HemisphereLight(0xffffff,0x808080,1.45));const key=new THREE.DirectionalLight(0xffffff,1.85);key.position.set(11,16,13);key.castShadow=false;scene.add(key);const fill=new THREE.DirectionalLight(0xffffff,1.25);fill.position.set(-12,7,-14);scene.add(fill);const underside=new THREE.DirectionalLight(0xffffff,1.55);underside.position.set(0,-12,3);scene.add(underside);const grid=new THREE.GridHelper(60,30,0x465145,0x252c26);grid.position.y=-2.64;scene.add(grid);
window.__B24_STARTUP__={signal:undefined,report:s=>{if(s?.totalBytes)bar.style.width=(8+58*s.receivedBytes/s.totalBytes)+'%';diag.textContent=s?.stage||'loading';}};
const closedDoorAssetMatrices={764:[-0.49668446950821343,0.0011307731244016028,0.014069963770630328,0,0.014070101328041505,0.000041894857995065575,0.4966857215883622,0,0.0011291336454995191,0.4968835947608482,-0.00007389760421291332,0,0.8929893849258252,-0.11867280071121095,-6.215742571136681,1],767:[-0.18265125350339223,0.0004158316623114882,0.0051741028303089465,0,0.005174153415811659,0.000015406457817620175,0.18265171394462346,0,0.000415228758667542,0.18272448002693129,-0.000027175180359972,0,0.9107880429065982,-0.10993806451448251,-6.214626848293713,1],773:[-0.495455446625045,-0.002166361297207074,-0.03464539317236424,0,-0.03464573921203004,-1.1677231358323145e-8,0.49546015973151086,0,-0.002161086061311173,0.4966652830940178,-0.0001511051640522352,0,-0.885395115535104,-0.11871993171932121,-6.215226474635511,1],776:[-0.1823878915073812,-0.0007974845607859755,-0.012753720348004982,0,-0.012753847732708197,-4.298642028453122e-9,0.18238962650405266,0,-0.0007955426320841896,0.18283325854118368,-0.00005562508688742101,0,-0.9092408840103107,-0.1100533783720577,-6.214442954298027,1]};
let aircraft,insigniaGroup,guideGroup,split=0,paintMeshes=[],skinSystem,seamGroup;const upper=new THREE.Color(0x5e5839),lower=new THREE.Color(0x8b8c97);
function applyAssetMatrix(nodeId,assetArray){const node=aircraft.nodes[nodeId];if(!node)throw new Error('缺少侧门源节点 '+nodeId);aircraft.group.updateMatrixWorld(true);node.parent.updateMatrixWorld(true);const target=new THREE.Matrix4().multiplyMatrices(aircraft.group.matrixWorld,new THREE.Matrix4().fromArray(assetArray));const local=new THREE.Matrix4().multiplyMatrices(node.parent.matrixWorld.clone().invert(),target);local.decompose(node.position,node.quaternion,node.scale);node.matrixAutoUpdate=true;node.updateMatrix();node.updateMatrixWorld(true)}
function closeWaistDoors(){for(const [id,v] of Object.entries(closedDoorAssetMatrices))applyAssetMatrix(+id,v);aircraft.group.updateMatrixWorld(true);$('#doorState').textContent='左右两组侧门关闭端点已应用；腰部机枪保持原始状态。'}
function closeRepairedBombBay(){
  for(const part of BAY_POSES.parts)applyAssetMatrix(part.sourceNode,part.closed);
  aircraft.group.updateMatrixWorld(true);
  const inverse=aircraft.group.matrixWorld.clone().invert();let maxMatrixError=0;
  for(const part of BAY_POSES.parts){
    const actual=inverse.clone().multiply(aircraft.nodes[part.sourceNode].matrixWorld).elements;
    actual.forEach((v,i)=>{maxMatrixError=Math.max(maxMatrixError,Math.abs(v-part.closed[i]));});
  }
  if(maxMatrixError>1e-6)throw new Error('Bomb bay pose mismatch '+maxMatrixError);
  window.__B24_BAY_R7__={parts:BAY_POSES.parts.length,maxMatrixError,sourcePackage:BAY_POSES.sourcePackage,sourceSHA256:BAY_POSES.sourceSHA256};
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
  const seams=makeReferenceSeams(skinSystem);seamGroup=seams.group;scene.add(seamGroup);skinSystem.audit.referenceSeams=seams.audit;
  $('#decalState').textContent='四处军徽分别按参考锚点回贴；左右独立测量，仍待视觉验收。';
  window.__B24_GENERIC_R7__={...skinSystem.audit,results,closedDoorNodes:[764,767,773,776],split:0,colors:{upper:'#5e5839',lower:'#8b8c97'}};
  window.__B24_R7_QA__={
    project:point=>{const v=new THREE.Vector3().fromArray(point).project(activeCamera);return [(v.x+1)*stage.clientWidth/2,(1-v.y)*stage.clientHeight/2];},
    camera:()=>({position:activeCamera.position.toArray(),up:activeCamera.up.toArray(),stage:[stage.clientWidth,stage.clientHeight]}),
    bodySectionAt:skinSystem.bodySectionAt,
    sourceBufferAudit:async()=>({meshCount:aircraft.meshes.length,components:aircraft.nodes.length,
      payloadSHA256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',aircraft.payload))].map(x=>x.toString(16).padStart(2,'0')).join(''),
      sourceBounds:aircraft.geometries.map(g=>[g.attributes.position.count,g.attributes.normal.count,g.index.count])}),
    ray:(origin,direction)=>new THREE.Raycaster(new THREE.Vector3().fromArray(origin),new THREE.Vector3().fromArray(direction).normalize()).intersectObjects(paintMeshes,false).slice(0,8).map(h=>({node:h.object.userData.sourceNode,point:h.point.toArray()}))
  };
}
function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h;renderer.setSize(w,h,false);perspective.aspect=aspect;perspective.updateProjectionMatrix();const hh=Math.max(ortho.userData.halfHeight||15.5,(ortho.userData.minHalfWidth||18.4)/aspect);ortho.left=-hh*aspect;ortho.right=hh*aspect;ortho.top=hh;ortho.bottom=-hh;ortho.updateProjectionMatrix()}
function setOrtho(position,up,halfHeight){activeCamera=ortho;orbitControls.enabled=false;fixedControls.enabled=true;ortho.userData.halfHeight=halfHeight;ortho.userData.minHalfWidth=Math.abs(position.x)>0?11.8:18.4;ortho.position.copy(position);ortho.up.copy(up);fixedControls.target.set(0,0,-2.56);ortho.lookAt(fixedControls.target);ortho.zoom=1;fixedControls.update();resize()}
function setView(view){grid.visible=view==='orbit';if(view==='orbit'){activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.set(27,10,26);perspective.up.set(0,1,0);orbitControls.target.set(0,0,-2.56);orbitControls.update()}else if(view==='port')setOrtho(new THREE.Vector3(40,0,-2.56),new THREE.Vector3(0,1,0),9.4);else if(view==='starboard')setOrtho(new THREE.Vector3(-40,0,-2.56),new THREE.Vector3(0,1,0),9.4);else if(view==='top')setOrtho(new THREE.Vector3(0,40,-2.56),new THREE.Vector3(0,0,1),15.2);else if(view==='bottom')setOrtho(new THREE.Vector3(0,-40,-2.56),new THREE.Vector3(0,0,-1),15.2);else if(view==='front')setOrtho(new THREE.Vector3(0,0,40),new THREE.Vector3(0,1,0),15.2);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));status.dataset.view=view;window.__B24_VIEW__=view}
addEventListener('resize',resize);resize();
try{aircraft=await NativeAircraft.load((p,t)=>{bar.style.width=(p*100)+'%';loadText.textContent=t});scene.add(aircraft.group);aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);closeWaistDoors();closeRepairedBombBay();skinSystem=createSkinSystem(aircraft,renderer);paintMeshes=skinSystem.paintMeshes;applySkinShader();buildInsignia();loading.hidden=true;status.textContent=`V018 已载入 · 侧门关闭 · ${aircraft.stats.components} 节点 / ${aircraft.stats.meshes} 网格 · 四视图对位与结构色区 R7 · 待视觉验收`;setView('orbit')}catch(e){loading.hidden=false;loading.style.display='flex';console.error(e);loadText.textContent='载入失败';diag.textContent=String(e?.stack||e);status.textContent='载入失败，原数据未替换'}
$('#views').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view)});$('#skinToggle').addEventListener('change',e=>paintMeshes.forEach(m=>m.visible=e.target.checked));$('#split').addEventListener('input',e=>{split=+e.target.value;$('#splitOut').textContent=(split<0?'−':'')+Math.abs(split).toFixed(2)+' m';applySkinShader();if(window.__B24_GENERIC_R7__)window.__B24_GENERIC_R7__.split=split});$('#insigniaToggle').addEventListener('change',e=>{if(insigniaGroup)insigniaGroup.visible=e.target.checked;skinSystem?.setInsigniaVisible(e.target.checked)});$('#guideToggle').addEventListener('change',e=>guideGroup&&(guideGroup.visible=e.target.checked));$('#doorFocus').addEventListener('click',()=>{activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.set(5.4,.15,-6.1);perspective.up.set(0,1,0);orbitControls.target.set(.88,-.12,-6.2);orbitControls.update();status.textContent='左舷腰部侧门关闭近看。腰部机枪保持原状态。'});$('#mobileToggle').addEventListener('click',()=>$('#panel').classList.toggle('open'));
$('#seamToggle').addEventListener('change',e=>{if(seamGroup)seamGroup.visible=e.target.checked});
function render(){orbitControls.update();fixedControls.update();renderer.render(scene,activeCamera);requestAnimationFrame(render)}render();
