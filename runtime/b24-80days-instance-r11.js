import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {NativeAircraft} from './native-aircraft.js';
import {BAY_POSES_R8 as BAY_POSES_R16} from './b24-r8-bay-poses.js';
import {applyDetailMaterials} from './b24-r10-detail-materials.js';
import {createSkinSystem} from './b24-r16-skin-system.js';
import {R11_ART_DATA_URL,R11_ART_SHA256,R11_ART_MIN_X,R11_ART_WIDTH,R11_ART_HEIGHT} from './80-days-r11-art-inline.js';

const $=s=>document.querySelector(s);
const canvas=$('#scene'),stage=$('#stage'),loading=$('#loading'),status=$('#status');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111512);
const perspective=new THREE.PerspectiveCamera(38,1,.05,300),ortho=new THREE.OrthographicCamera(-3,3,2,-2,.05,300);let activeCamera=perspective;
const orbitControls=new OrbitControls(perspective,canvas);orbitControls.enableDamping=true;
const fixedControls=new OrbitControls(ortho,canvas);fixedControls.enableDamping=true;fixedControls.enableRotate=false;fixedControls.enabled=false;
scene.add(new THREE.HemisphereLight(0xffffff,0x70766f,1.42));
const key=new THREE.DirectionalLight(0xffffff,1.82);key.position.set(11,16,13);scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.18);fill.position.set(-12,7,-14);scene.add(fill);
const under=new THREE.DirectionalLight(0xffffff,1.25);under.position.set(0,-12,3);scene.add(under);
const grid=new THREE.GridHelper(60,30,0x465145,0x252c26);grid.position.y=-2.64;scene.add(grid);
window.__B24_STARTUP__={signal:undefined,report:()=>{}};

const closedDoorAssetMatrices={764:[-0.49668446950821343,0.0011307731244016028,0.014069963770630328,0,0.014070101328041505,0.000041894857995065575,0.4966857215883622,0,0.0011291336454995191,0.4968835947608482,-0.00007389760421291332,0,0.8929893849258252,-0.11867280071121095,-6.215742571136681,1],767:[-0.18265125350339223,0.0004158316623114882,0.0051741028303089465,0,0.005174153415811659,0.000015406457817620175,0.18265171394462346,0,0.000415228758667542,0.18272448002693129,-0.000027175180359972,0,0.9107880429065982,-0.10993806451448251,-6.214626848293713,1],773:[-0.495455446625045,-0.002166361297207074,-0.03464539317236424,0,-0.03464573921203004,-1.1677231358323145e-8,0.49546015973151086,0,-0.002161086061311173,0.4966652830940178,-0.0001511051640522352,0,-0.885395115535104,-0.11871993171932121,-6.215226474635511,1],776:[-0.1823878915073812,-0.0007974845607859755,-0.012753720348004982,0,-0.012753847732708197,-4.298642028453122e-9,0.18238962650405266,0,-0.0007955426320841896,0.18283325854118368,-0.00005562508688742101,0,-0.9092408840103107,-0.1100533783720577,-6.214442954298027,1]};
const E04={width:2000,height:1243,sha256:'07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa'};
const placement={z:6.7,y:-1.1,metresPerPixel:0.0013,angle:0};
const placementUniform={value:new THREE.Vector4(placement.z,placement.y,placement.metresPerPixel,0)};
const SOURCE_SHA='799e52d96a3427ef11272974a1f2a1318fa1d32102dce445e079691fe36c12c4';
const FRAME_REGION=Object.freeze({zMin:6.50,zMax:9.92,yMin:-1.52,yMax:1.23,xMin:.045,zBars:[9.68,8.50,7.15,6.60],yBars:[1.10,.58,-.04,-.78,-1.42]});

function applyAssetMatrix(aircraft,nodeId,a){const node=aircraft.nodes[nodeId];if(!node)return;aircraft.group.updateMatrixWorld(true);node.parent.updateMatrixWorld(true);const target=new THREE.Matrix4().multiplyMatrices(aircraft.group.matrixWorld,new THREE.Matrix4().fromArray(a));const local=new THREE.Matrix4().multiplyMatrices(node.parent.matrixWorld.clone().invert(),target);local.decompose(node.position,node.quaternion,node.scale);node.matrixAutoUpdate=true;node.updateMatrix();node.updateMatrixWorld(true);}
function lockMotherPosture(aircraft){for(const [id,v] of Object.entries(closedDoorAssetMatrices))applyAssetMatrix(aircraft,+id,v);for(const part of BAY_POSES_R16.parts)applyAssetMatrix(aircraft,part.sourceNode,part.closed);aircraft.group.updateMatrixWorld(true);}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('image load failed'));im.src=src;});}
async function makeTexture(){const img=await loadImage(R11_ART_DATA_URL);const t=new THREE.Texture(img);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
function installProjection(paintMeshes,texture){
  const visible={value:1};
  const artMaxX=R11_ART_MIN_X+R11_ART_WIDTH;
  const artOffsetX=-R11_ART_MIN_X;
  for(const mesh of paintMeshes){
    const mat=mesh.material,previous=mat.onBeforeCompile,previousKey=mat.customProgramCacheKey?.bind(mat);
    mat.onBeforeCompile=shader=>{
      previous?.(shader);
      shader.uniforms.e04Map={value:texture};shader.uniforms.e04Visible=visible;shader.uniforms.e04Anchor=placementUniform;
      shader.fragmentShader='uniform sampler2D e04Map;uniform float e04Visible;uniform vec4 e04Anchor;\n'+shader.fragmentShader;
      const code=`
vec4 e04Color=vec4(0.0);
if(e04Visible>.5 && vSkinWorld.x>${FRAME_REGION.xMin.toFixed(3)}){
  float noseRegion=step(${FRAME_REGION.zMin.toFixed(2)},vSkinWorld.z)*step(vSkinWorld.z,${FRAME_REGION.zMax.toFixed(2)})*step(${FRAME_REGION.yMin.toFixed(2)},vSkinWorld.y)*step(vSkinWorld.y,${FRAME_REGION.yMax.toFixed(2)});
  float zFrames=max(max(1.0-smoothstep(0.045,0.105,abs(vSkinWorld.z-${FRAME_REGION.zBars[0].toFixed(2)})),1.0-smoothstep(0.045,0.105,abs(vSkinWorld.z-${FRAME_REGION.zBars[1].toFixed(2)}))),max(1.0-smoothstep(0.045,0.105,abs(vSkinWorld.z-${FRAME_REGION.zBars[2].toFixed(2)})),1.0-smoothstep(0.045,0.105,abs(vSkinWorld.z-${FRAME_REGION.zBars[3].toFixed(2)}))));
  float yFrames=max(max(1.0-smoothstep(0.045,0.105,abs(vSkinWorld.y-${FRAME_REGION.yBars[0].toFixed(2)})),1.0-smoothstep(0.045,0.105,abs(vSkinWorld.y-${FRAME_REGION.yBars[1].toFixed(2)}))),max(max(1.0-smoothstep(0.045,0.105,abs(vSkinWorld.y-${FRAME_REGION.yBars[2].toFixed(2)})),1.0-smoothstep(0.045,0.105,abs(vSkinWorld.y-${FRAME_REGION.yBars[3].toFixed(2)}))),1.0-smoothstep(0.045,0.105,abs(vSkinWorld.y-${FRAME_REGION.yBars[4].toFixed(2)}))));
  float frameRegion=noseRegion*clamp(max(zFrames,yFrames),0.0,1.0);
  outgoingLight=mix(outgoingLight,vec3(0.40,0.018,0.030),0.94*frameRegion);
  vec2 delta=vec2(e04Anchor.x-vSkinWorld.z,e04Anchor.y-vSkinWorld.y)/e04Anchor.z;
  float c=cos(e04Anchor.w),s=sin(e04Anchor.w);
  float photoX=c*delta.x+s*delta.y;
  float photoY=546.0-s*delta.x+c*delta.y;
  if(photoX>=${R11_ART_MIN_X.toFixed(1)}&&photoX<=${artMaxX.toFixed(1)}&&photoY>=0.0&&photoY<=${R11_ART_HEIGHT.toFixed(1)}){
    vec2 e04uv=vec2((photoX+${artOffsetX.toFixed(1)})/${R11_ART_WIDTH.toFixed(1)},1.0-photoY/${R11_ART_HEIGHT.toFixed(1)});
    e04Color=texture2D(e04Map,e04uv);
    outgoingLight=mix(outgoingLight,e04Color.rgb,e04Color.a);
  }
}
`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',code+'\n#include <opaque_fragment>');
    };
    mat.customProgramCacheKey=()=>`${previousKey?previousKey():''}|80days-r11-forward-mouth-red-frame-v4`;
    mat.needsUpdate=true;
  }
  return {setVisible:v=>visible.value=v?1:0};
}

function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h;renderer.setSize(w,h,false);perspective.aspect=aspect;perspective.updateProjectionMatrix();const hh=ortho.userData.halfHeight||2.0;ortho.left=-hh*aspect;ortho.right=hh*aspect;ortho.top=hh;ortho.bottom=-hh;ortho.updateProjectionMatrix();}
function setOrtho(position,target,halfHeight){activeCamera=ortho;orbitControls.enabled=false;fixedControls.enabled=true;ortho.userData.halfHeight=halfHeight;ortho.position.fromArray(position);ortho.up.set(0,1,0);fixedControls.target.fromArray(target);ortho.lookAt(fixedControls.target);ortho.zoom=1;fixedControls.update();resize();}
function setPerspective(position,target){activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.fromArray(position);perspective.up.set(0,1,0);orbitControls.target.fromArray(target);orbitControls.update();}
function setView(view){grid.visible=view==='orbit';if(view==='port')setOrtho([40,-.82,5.63],[0,-.82,5.63],1.73);else if(view==='orbit')setPerspective([26,8,24],[0,0,-2.56]);else setPerspective([3.0,-.40,10.05],[.35,-.82,6.25]);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));status.textContent=view==='port'?'R11 · 左舷近看':view==='orbit'?'R11 · 整机透视':'R11 · 左前 3/4';}
addEventListener('resize',resize);resize();
try{
  const aircraft=await NativeAircraft.load(()=>{});scene.add(aircraft.group);aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);lockMotherPosture(aircraft);applyDetailMaterials(aircraft,renderer);const skinSystem=createSkinSystem(aircraft,renderer);const texture=await makeTexture();const projection=installProjection(skinSystem.paintMeshes,texture);
  window.__B24_80DAYS_R11__={schema:'haihao.aircraft/80-days-instance-runtime@11.2',mother:{id:'b24-generic-mother-01',freezeCommit:'636f26ec102680b4154a6f9dca0cf49fc951f51e',modified:false},sourceArtwork:{sha256:SOURCE_SHA,compositeSha256:R11_ART_SHA256,redrawn:false,transport:'inline-exact-png-data-url',logicalXRange:[R11_ART_MIN_X,R11_ART_MIN_X+R11_ART_WIDTH],components:['mouth-forward','robby-forward','title-enlarged-raised','dice','eye','bombs','japanese-flags']},reference:{id:'E04-left',sha256:E04.sha256},windowFrames:{red:true,glassTransparent:true,mode:'port-skin-world-frame-bands',region:FRAME_REGION},placement:{...placement},visualAcceptance:false,productionReady:false};
  window.__B24_AIRCRAFT__=aircraft;
  loading.hidden=true;setView('port');
  $('#artToggle').addEventListener('change',e=>projection.setVisible(e.target.checked));
  $('#views').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view);});
}catch(e){console.error(e);loading.hidden=false;loading.textContent='R11 载入失败：'+String(e?.message||e);status.textContent='R11 载入失败';window.__B24_80DAYS_R11_ERROR__=String(e?.stack||e);}
renderer.setAnimationLoop(()=>{orbitControls.update();fixedControls.update();renderer.render(scene,activeCamera);});
