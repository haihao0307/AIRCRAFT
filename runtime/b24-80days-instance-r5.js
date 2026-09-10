import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {NativeAircraft} from './native-aircraft.js';
import {BAY_POSES_R8 as BAY_POSES_R16} from './b24-r8-bay-poses.js';
import {applyDetailMaterials} from './b24-r10-detail-materials.js';
import {createSkinSystem} from './b24-r16-skin-system.js';

const $=s=>document.querySelector(s);
const canvas=$('#scene'),stage=$('#stage'),loading=$('#loading'),bar=$('#bar'),loadText=$('#loadText'),diag=$('#diag'),status=$('#status'),qaReadout=$('#qaReadout');
const boot=performance.now();
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){loadText.textContent='此设备无法建立 WebGL 画面。';diag.textContent=String(e);throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;

const scene=new THREE.Scene();scene.background=new THREE.Color(0x111512);
const perspective=new THREE.PerspectiveCamera(38,1,.05,300);
const ortho=new THREE.OrthographicCamera(-3,3,2,-2,.05,300);
let activeCamera=perspective;
const orbitControls=new OrbitControls(perspective,canvas);orbitControls.enableDamping=true;
const fixedControls=new OrbitControls(ortho,canvas);fixedControls.enableDamping=true;fixedControls.enableRotate=false;fixedControls.enabled=false;
scene.add(new THREE.HemisphereLight(0xffffff,0x70766f,1.42));
const key=new THREE.DirectionalLight(0xffffff,1.82);key.position.set(11,16,13);scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.18);fill.position.set(-12,7,-14);scene.add(fill);
const under=new THREE.DirectionalLight(0xffffff,1.25);under.position.set(0,-12,3);scene.add(under);
const grid=new THREE.GridHelper(60,30,0x465145,0x252c26);grid.position.y=-2.64;scene.add(grid);
window.__B24_STARTUP__={signal:undefined,report:s=>{if(s?.totalBytes)bar.style.width=(8+58*s.receivedBytes/s.totalBytes)+'%';diag.textContent=s?.stage||'loading';}};

const closedDoorAssetMatrices={
764:[-0.49668446950821343,0.0011307731244016028,0.014069963770630328,0,0.014070101328041505,0.000041894857995065575,0.4966857215883622,0,0.0011291336454995191,0.4968835947608482,-0.00007389760421291332,0,0.8929893849258252,-0.11867280071121095,-6.215742571136681,1],
767:[-0.18265125350339223,0.0004158316623114882,0.0051741028303089465,0,0.005174153415811659,0.000015406457817620175,0.18265171394462346,0,0.000415228758667542,0.18272448002693129,-0.000027175180359972,0,0.9107880429065982,-0.10993806451448251,-6.214626848293713,1],
773:[-0.495455446625045,-0.002166361297207074,-0.03464539317236424,0,-0.03464573921203004,-1.1677231358323145e-8,0.49546015973151086,0,-0.002161086061311173,0.4966652830940178,-0.0001511051640522352,0,-0.885395115535104,-0.11871993171932121,-6.215226474635511,1],
776:[-0.1823878915073812,-0.0007974845607859755,-0.012753720348004982,0,-0.012753847732708197,-4.298642028453122e-9,0.18238962650405266,0,-0.0007955426320841896,0.18283325854118368,-0.00005562508688742101,0,-0.9092408840103107,-0.1100533783720577,-6.214442954298027,1]
};

const PHOTO={
  id:'E04',sha256:'07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa',
  windowBBox:[767,163,947,359],
  mouthCrop:[0,530,1770,520]
};
const ANCHOR={
  sourceNode:1723,component:69,
  center:[0.6755725529789061,-0.6464584184588489,6.366383453731942],
  size:[0.02689669404549022,0.1699382032874155,0.17605108829775418],
  role:'port nose window connected component'
};
const PORT_MOUTH_R3='M0 546 L99 549 L246 564 L410 586 L583 616 L746 652 L923 699 L1108 776 L1267 840 L1393 881 L1497 924 L1596 967 L1663 988 L1725 1036 L1671 1016 L1596 1003 L1480 993 L1350 981 L1190 975 L1030 971 L864 971 L730 969 L633 973 L582 985 L530 1004 L493 1020 L447 1009 L416 989 L393 953 L360 910 L330 865 L302 820 L275 780 L232 742 L173 710 L111 690 L45 682 L0 681 Z';
const PORT_TEETH_R3=[
'M309 683 L310 680 L316 680 L317 681 L315 684 L310 684 Z',
'M491 957 L496 964 L500 965 L500 962 L498 960 L493 957 Z',
'M1361 952 L1362 954 L1370 955 Z',
'M1225 948 L1227 951 L1233 951 L1237 953 L1265 953 L1266 952 L1274 951 L1275 950 L1291 950 L1292 949 L1300 949 L1301 950 L1335 950 L1336 951 L1344 951 L1348 953 L1351 953 L1351 951 L1347 947 L1341 945 L1338 945 L1334 943 L1331 943 L1327 941 L1324 941 L1306 935 L1303 935 L1294 948 L1291 948 L1288 945 L1278 927 L1269 924 L1266 924 L1265 923 L1254 922 L1253 921 L1250 921 L1242 929 L1234 935 Z',
'M669 881 L663 887 L661 891 L651 903 L647 912 L647 915 L645 920 L645 926 L644 927 L644 941 L647 945 L648 950 L650 952 L650 956 L651 957 L661 957 L662 956 L665 956 L666 955 L665 952 L659 954 L655 953 L653 951 L653 947 L659 943 L662 943 L663 944 L666 943 L668 941 L670 936 L673 935 L673 934 L676 932 L688 933 L690 936 L687 939 L675 939 L674 940 L674 943 L678 946 L678 947 L675 949 L673 953 L675 955 L685 955 L686 956 L706 955 L707 956 L716 953 L719 955 L736 956 L731 950 L728 944 L721 937 L721 936 L694 910 L685 898 L680 888 L680 886 L678 884 L678 882 L675 880 L671 880 Z',
'M709 946 L710 947 L709 951 L705 954 L704 953 L705 951 L704 949 L706 947 Z',
'M719 945 L720 944 L724 949 L723 950 L719 948 Z',
'M749 944 L750 947 L748 948 L747 947 Z',
'M799 888 L788 888 L787 889 L781 890 L766 898 L756 907 L751 915 L744 922 L743 935 L740 944 L740 947 L742 950 L742 954 L741 955 L742 956 L751 956 L752 955 L778 955 L779 954 L805 954 L806 955 L830 955 L831 954 L825 936 L817 925 L816 922 L812 919 L802 902 L801 899 L801 891 L802 890 Z',
'M836 932 L836 947 L837 948 L836 955 L841 957 L842 956 L845 956 L846 957 L861 957 L862 958 L909 958 L910 957 L918 957 L914 951 L905 942 L898 932 L888 921 L883 911 L883 908 L882 907 L883 897 L876 897 L864 901 L848 911 L844 916 Z'
];

const [wx0,wy0,wx1,wy1]=PHOTO.windowBBox;
const photoWindowCenter=[(wx0+wx1)/2,(wy0+wy1)/2];
const photoWindowSize=[wx1-wx0,wy1-wy0];
const scaleZ=ANCHOR.size[2]/photoWindowSize[0];
const scaleY=ANCHOR.size[1]/photoWindowSize[1];
const [cropX,cropY,cropW,cropH]=PHOTO.mouthCrop;
const cropCenter=[cropX+cropW/2,cropY+cropH/2];
const centerZ=ANCHOR.center[2]-(cropCenter[0]-photoWindowCenter[0])*scaleZ;
const centerY=ANCHOR.center[1]-(cropCenter[1]-photoWindowCenter[1])*scaleY;
const physicalW=cropW*scaleZ,physicalH=cropH*scaleY;
const BOUNDS={zMin:centerZ-physicalW/2,zMax:centerZ+physicalW/2,yMin:centerY-physicalH/2,yMax:centerY+physicalH/2};

function applyAssetMatrix(nodeId,a){const node=aircraft.nodes[nodeId];if(!node)return;aircraft.group.updateMatrixWorld(true);node.parent.updateMatrixWorld(true);const target=new THREE.Matrix4().multiplyMatrices(aircraft.group.matrixWorld,new THREE.Matrix4().fromArray(a));const local=new THREE.Matrix4().multiplyMatrices(node.parent.matrixWorld.clone().invert(),target);local.decompose(node.position,node.quaternion,node.scale);node.matrixAutoUpdate=true;node.updateMatrix();node.updateMatrixWorld(true);}
function lockMotherPosture(){for(const [id,v] of Object.entries(closedDoorAssetMatrices))applyAssetMatrix(+id,v);for(const part of BAY_POSES_R16.parts)applyAssetMatrix(part.sourceNode,part.closed);aircraft.group.updateMatrixWorld(true);}
function makeMouthTexture(){const c=document.createElement('canvas');c.width=cropW;c.height=cropH;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.save();x.translate(-cropX,-cropY);x.lineJoin='round';x.lineCap='round';const mouth=new Path2D(PORT_MOUTH_R3);x.fillStyle='#551b1a';x.fill(mouth);x.lineWidth=5;x.strokeStyle='#201e18';x.stroke(mouth);x.fillStyle='#e0dbc4';for(const d of PORT_TEETH_R3)x.fill(new Path2D(d));x.restore();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
function installWorldProjection(texture){const visible={value:1},bounds={value:new THREE.Vector4(BOUNDS.zMin,BOUNDS.zMax,BOUNDS.yMin,BOUNDS.yMax)};for(const mesh of paintMeshes){const mat=mesh.material,previous=mat.onBeforeCompile,previousKey=mat.customProgramCacheKey?.bind(mat);mat.onBeforeCompile=shader=>{previous?.(shader);shader.uniforms.eightyDaysMap={value:texture};shader.uniforms.eightyDaysBounds=bounds;shader.uniforms.eightyDaysVisible=visible;shader.fragmentShader='uniform sampler2D eightyDaysMap;uniform vec4 eightyDaysBounds;uniform float eightyDaysVisible;\n'+shader.fragmentShader;const code=`
vec4 eightyDaysColor=vec4(0.0);
if(eightyDaysVisible>.5 && vSkinWorld.x>.045 && vSkinWorld.z>=eightyDaysBounds.x && vSkinWorld.z<=eightyDaysBounds.y && vSkinWorld.y>=eightyDaysBounds.z && vSkinWorld.y<=eightyDaysBounds.w){
  float au=(eightyDaysBounds.y-vSkinWorld.z)/(eightyDaysBounds.y-eightyDaysBounds.x);
  float av=(vSkinWorld.y-eightyDaysBounds.z)/(eightyDaysBounds.w-eightyDaysBounds.z);
  eightyDaysColor=texture2D(eightyDaysMap,vec2(au,av));
  outgoingLight=mix(outgoingLight,eightyDaysColor.rgb,eightyDaysColor.a);
}
`;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',code+'\n#include <opaque_fragment>');};mat.customProgramCacheKey=()=>`${previousKey?previousKey():''}|80days-r5-world-project-v1`;mat.needsUpdate=true;}return {visible,setVisible:v=>visible.value=v?1:0};}
function buildAnchorBox(){const g=new THREE.BoxGeometry(ANCHOR.size[0]+.018,ANCHOR.size[1]+.025,ANCHOR.size[2]+.025),e=new THREE.EdgesGeometry(g),m=new THREE.LineBasicMaterial({color:0x40d7ff,depthTest:false,transparent:true,opacity:.9}),line=new THREE.LineSegments(e,m);line.position.fromArray(ANCHOR.center);line.renderOrder=90;line.name='e04-real-window-anchor';scene.add(line);return line;}

let aircraft,skinSystem,paintMeshes=[],projection,anchorBox;
function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h;renderer.setSize(w,h,false);perspective.aspect=aspect;perspective.updateProjectionMatrix();const hh=ortho.userData.halfHeight||2.2;ortho.left=-hh*aspect;ortho.right=hh*aspect;ortho.top=hh;ortho.bottom=-hh;ortho.updateProjectionMatrix();}
function setOrtho(position,target,halfHeight){activeCamera=ortho;orbitControls.enabled=false;fixedControls.enabled=true;ortho.userData.halfHeight=halfHeight;ortho.position.fromArray(position);ortho.up.set(0,1,0);fixedControls.target.fromArray(target);ortho.lookAt(fixedControls.target);ortho.zoom=1;fixedControls.update();resize();}
function setPerspective(position,target){activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.fromArray(position);perspective.up.set(0,1,0);orbitControls.target.fromArray(target);orbitControls.update();}
function setView(view){grid.visible=view==='orbit';if(view==='orbit')setPerspective([26,8,24],[0,0,-2.56]);else if(view==='port')setOrtho([40,-1.05,6.34],[0,-1.05,6.34],1.65);else if(view==='front')setPerspective([0,-.9,12],[0,-1.0,6.35]);else if(view==='nose-port')setPerspective([3.2,-.6,10.2],[.35,-1.02,6.30]);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));status.textContent='R5 · '+({orbit:'整机透视',port:'左舷真窗标定近看',front:'机头正视包裹','nose-port':'左前 3/4 包裹'}[view]);}
addEventListener('resize',resize);resize();

try{
  aircraft=await NativeAircraft.load((p,t)=>{bar.style.width=(p*100)+'%';loadText.textContent=t;});
  scene.add(aircraft.group);aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);
  lockMotherPosture();applyDetailMaterials(aircraft,renderer);skinSystem=createSkinSystem(aircraft,renderer);paintMeshes=skinSystem.paintMeshes;
  projection=installWorldProjection(makeMouthTexture());anchorBox=buildAnchorBox();
  const startupMs=performance.now()-boot;
  window.__B24_80DAYS_R5__={schema:'haihao.aircraft/80-days-instance-runtime@5.0',mother:{id:'b24-generic-mother-01',freezeCommit:'636f26ec102680b4154a6f9dca0cf49fc951f51e',modified:false},aircraft:'B-24J-25-CO 42-73257 “80 DAYS”',evidence:{photo:PHOTO.id,photoSha256:PHOTO.sha256,windowBBox:PHOTO.windowBBox,mouthCrop:PHOTO.mouthCrop,teethRecovered:PORT_TEETH_R3.length},anchor:ANCHOR,calibration:{scaleZMetresPerPixel:scaleZ,scaleYMetresPerPixel:scaleY,physicalMouthRect:[physicalW,physicalH],center:[centerY,centerZ],bounds:BOUNDS,legacyR3Width:6.7,shrinkRatio:physicalW/6.7},mapping:{mode:'world-space skin shader projection',raycastDecalGeometry:false,side:'port only',glassAffected:false,photoX:'low x = nose = +Z',photoY:'down = -Y'},deferred:{eye:true,title:true,dice:true,missionMarks:true,starboardMouth:true,wingInsigniaDecalGeometry:true},removedErrors:{oversizedSampleScale:true,flatBillboard:true,uniformGeneratedTeeth:true,redEye:true,genericTitle:true,defaultDicePips:true,mirroredStarboard:true,fabricatedBombCount:true},startupMs,visualAcceptance:false,productionReady:false};
  qaReadout.textContent=`R5 真窗标定：${physicalW.toFixed(3)} × ${physicalH.toFixed(3)} m；旧 6.70 m 宽度的 ${(physicalW/6.7*100).toFixed(1)}%；世界坐标 shader 包裹；启动 ${startupMs.toFixed(0)} ms`;
  loading.hidden=true;loading.style.display='none';setView('nose-port');status.textContent='R5 已载入 · 真实窗尺度 + 世界坐标曲面投射';
}catch(e){loading.hidden=false;loading.style.display='grid';console.error(e);loadText.textContent='载入失败';diag.textContent=String(e?.stack||e);status.textContent='R5 载入失败，Mother 01 未修改';window.__B24_80DAYS_R5_ERROR__=String(e?.stack||e);}

$('#views').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view);});
$('#artToggle').addEventListener('change',e=>projection?.setVisible(e.target.checked));
$('#anchorToggle').addEventListener('change',e=>{if(anchorBox)anchorBox.visible=e.target.checked;});
$('#mobileToggle').addEventListener('click',()=>$('#panel').classList.toggle('open'));
renderer.setAnimationLoop(()=>{orbitControls.update();fixedControls.update();renderer.render(scene,activeCamera);});
addEventListener('pagehide',e=>{if(e.persisted)return;renderer.setAnimationLoop(null);orbitControls.dispose();fixedControls.dispose();renderer.dispose();});
