import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {NativeAircraft} from './native-aircraft.js';
import {BAY_POSES} from './b24-r7-bay-poses.js';
import {BAY_POSES_R8 as BAY_POSES_R16} from './b24-r8-bay-poses.js';
import {applyDetailMaterials} from './b24-r10-detail-materials.js';
import {createSkinSystem,makeInsigniaTexture,makeDecal} from './b24-r16-skin-system.js';

const $=s=>document.querySelector(s);
const canvas=$('#scene'),stage=$('#stage'),loading=$('#loading'),bar=$('#bar'),loadText=$('#loadText'),diag=$('#diag'),status=$('#status'),qaReadout=$('#qaReadout');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){loadText.textContent='此设备无法建立 WebGL 画面。';diag.textContent=String(e);throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=false;

const scene=new THREE.Scene();scene.background=new THREE.Color(0x111512);
const perspective=new THREE.PerspectiveCamera(38,1,.05,300);
const ortho=new THREE.OrthographicCamera(-18,18,15,-15,.05,300);
let activeCamera=perspective;
const orbitControls=new OrbitControls(perspective,canvas);orbitControls.enableDamping=true;orbitControls.target.set(0,0,-2.56);
const fixedControls=new OrbitControls(ortho,canvas);fixedControls.enableDamping=true;fixedControls.enableRotate=false;fixedControls.enabled=false;fixedControls.target.set(0,0,-2.56);
scene.add(new THREE.HemisphereLight(0xffffff,0x70766f,1.42));
const key=new THREE.DirectionalLight(0xffffff,1.82);key.position.set(11,16,13);scene.add(key);
const fill=new THREE.DirectionalLight(0xffffff,1.18);fill.position.set(-12,7,-14);scene.add(fill);
const underside=new THREE.DirectionalLight(0xffffff,1.35);underside.position.set(0,-12,3);scene.add(underside);
const grid=new THREE.GridHelper(60,30,0x465145,0x252c26);grid.position.y=-2.64;scene.add(grid);

window.__B24_STARTUP__={signal:undefined,report:s=>{if(s?.totalBytes)bar.style.width=(8+58*s.receivedBytes/s.totalBytes)+'%';diag.textContent=s?.stage||'loading';}};

const closedDoorAssetMatrices={
764:[-0.49668446950821343,0.0011307731244016028,0.014069963770630328,0,0.014070101328041505,0.000041894857995065575,0.4966857215883622,0,0.0011291336454995191,0.4968835947608482,-0.00007389760421291332,0,0.8929893849258252,-0.11867280071121095,-6.215742571136681,1],
767:[-0.18265125350339223,0.0004158316623114882,0.0051741028303089465,0,0.005174153415811659,0.000015406457817620175,0.18265171394462346,0,0.000415228758667542,0.18272448002693129,-0.000027175180359972,0,0.9107880429065982,-0.10993806451448251,-6.214626848293713,1],
773:[-0.495455446625045,-0.002166361297207074,-0.03464539317236424,0,-0.03464573921203004,-1.1677231358323145e-8,0.49546015973151086,0,-0.002161086061311173,0.4966652830940178,-0.0001511051640522352,0,-0.885395115535104,-0.11871993171932121,-6.215226474635511,1],
776:[-0.1823878915073812,-0.0007974845607859755,-0.012753720348004982,0,-0.012753847732708197,-4.298642028453122e-9,0.18238962650405266,0,-0.0007955426320841896,0.18283325854118368,-0.00005562508688742101,0,-0.9092408840103107,-0.1100533783720577,-6.214442954298027,1]
};
let aircraft,skinSystem,paintMeshes=[],motherInsigniaGroup,artGroup,missionGroup;

function applyAssetMatrix(nodeId,assetArray){
  const node=aircraft.nodes[nodeId];if(!node)return;
  aircraft.group.updateMatrixWorld(true);node.parent.updateMatrixWorld(true);
  const target=new THREE.Matrix4().multiplyMatrices(aircraft.group.matrixWorld,new THREE.Matrix4().fromArray(assetArray));
  const local=new THREE.Matrix4().multiplyMatrices(node.parent.matrixWorld.clone().invert(),target);
  local.decompose(node.position,node.quaternion,node.scale);node.matrixAutoUpdate=true;node.updateMatrix();node.updateMatrixWorld(true);
}
function lockMotherPosture(){
  for(const [id,v] of Object.entries(closedDoorAssetMatrices))applyAssetMatrix(+id,v);
  for(const part of BAY_POSES_R16.parts)applyAssetMatrix(part.sourceNode,part.closed);
  aircraft.group.updateMatrixWorld(true);
}
function buildMotherInsignia(){
  motherInsigniaGroup=new THREE.Group();scene.add(motherInsigniaGroup);
  const texture=makeInsigniaTexture(renderer);
  for(const placement of skinSystem.placements){const {mesh}=makeDecal(placement,skinSystem,texture);mesh.visible=Math.abs(placement.normal[0])<.5;motherInsigniaGroup.add(mesh);}
}

function pathPolygon(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();}
function interpolate(points,x){
  if(x<=points[0][0])return points[0][1];if(x>=points.at(-1)[0])return points.at(-1)[1];
  for(let i=1;i<points.length;i++)if(x<=points[i][0]){const a=points[i-1],b=points[i],t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}
  return points.at(-1)[1];
}
function drawPortMouth(ctx){
  // E04/R3 hand-traced perimeter reduced into the instance texture.
  const raw=[[0,546],[99,549],[246,564],[410,586],[583,616],[746,652],[923,699],[1108,776],[1267,840],[1393,881],[1497,924],[1596,967],[1663,988],[1725,1036],[1671,1016],[1596,1003],[1480,993],[1350,981],[1190,975],[1030,971],[864,971],[730,969],[633,973],[582,985],[530,1004],[493,1020],[447,1009],[416,989],[393,953],[360,910],[330,865],[302,820],[275,780],[232,742],[173,710],[111,690],[45,682],[0,681]];
  const sx=.89,sy=.69,ox=54,oy=174,map=([x,y])=>[ox+x*sx,oy+(y-500)*sy];
  const pts=raw.map(map);pathPolygon(ctx,pts);ctx.fillStyle='#551b1a';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#201e18';ctx.stroke();
  const upper=raw.slice(0,14).map(map);const lower=[raw[0],...raw.slice(14).reverse()].map(map);
  const topXs=[.065,.13,.205,.285,.365,.455,.545,.635,.72,.80,.87];
  const botXs=[.08,.16,.245,.335,.43,.525,.615,.70,.78,.85];
  ctx.fillStyle='#e0dbc4';ctx.strokeStyle='#625f4f';ctx.lineWidth=1.4;
  topXs.forEach((f,i)=>{const x=upper[0][0]+f*(upper.at(-1)[0]-upper[0][0]),y=interpolate(upper,x),w=[34,42,37,46,40,44,35,42,31,28,25][i],d=[73,86,64,90,79,83,69,73,61,54,47][i];pathPolygon(ctx,[[x-w/2,y+2],[x+w/2,y+6],[x+4,y+d]]);ctx.fill();ctx.stroke();});
  botXs.forEach((f,i)=>{const x=lower[0][0]+f*(lower.at(-1)[0]-lower[0][0]),y=interpolate(lower,x),w=[38,44,39,47,42,43,36,34,31,26][i],d=[69,82,75,88,79,73,66,58,52,45][i];pathPolygon(ctx,[[x-w/2,y-2],[x+w/2,y-5],[x-3,y-d]]);ctx.fill();ctx.stroke();});
}
function drawStarboardMouth(ctx){
  // Independent E01/E02-style reconstruction; deliberately not mirrored from port.
  ctx.beginPath();ctx.moveTo(62,598);ctx.bezierCurveTo(275,592,545,620,785,682);ctx.bezierCurveTo(1030,744,1275,824,1545,920);ctx.bezierCurveTo(1620,947,1686,963,1734,978);ctx.bezierCurveTo(1652,976,1560,974,1468,968);ctx.bezierCurveTo(1180,951,930,934,702,928);ctx.bezierCurveTo(484,923,329,909,235,856);ctx.bezierCurveTo(153,809,101,744,62,678);ctx.closePath();ctx.fillStyle='#551b1a';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#201e18';ctx.stroke();
  const upper=[[62,598],[260,596],[490,616],[720,663],[950,730],[1180,802],[1410,881],[1734,978]];
  const lower=[[62,678],[190,820],[360,900],[650,927],[930,934],[1230,954],[1480,969],[1734,978]];
  const tx=[.05,.11,.18,.26,.35,.445,.54,.63,.71,.78,.84];const bx=[.07,.14,.22,.31,.40,.49,.58,.66,.74,.81];
  ctx.fillStyle='#e0dbc4';ctx.strokeStyle='#625f4f';ctx.lineWidth=1.4;
  tx.forEach((f,i)=>{const x=62+f*(1734-62),y=interpolate(upper,x),w=[39,35,44,38,47,42,40,36,33,29,25][i],d=[82,70,91,76,88,83,75,69,61,54,45][i];pathPolygon(ctx,[[x-w/2,y+2],[x+w/2,y+6],[x+2,y+d]]);ctx.fill();ctx.stroke();});
  bx.forEach((f,i)=>{const x=62+f*(1734-62),y=interpolate(lower,x),w=[36,43,40,48,41,44,37,35,31,27][i],d=[74,86,79,91,77,74,65,59,52,45][i];pathPolygon(ctx,[[x-w/2,y-2],[x+w/2,y-5],[x-3,y-d]]);ctx.fill();ctx.stroke();});
}
function drawEye(ctx,x,y,flip=1){
  ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.rotate(-.08);
  ctx.beginPath();ctx.moveTo(-68,4);ctx.quadraticCurveTo(-5,-47,70,-4);ctx.quadraticCurveTo(7,44,-68,4);ctx.closePath();ctx.fillStyle='#e2dcc4';ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#201e18';ctx.stroke();
  ctx.beginPath();ctx.ellipse(14,-1,22,30,.08,0,Math.PI*2);ctx.fillStyle='#8b2c28';ctx.fill();ctx.beginPath();ctx.ellipse(18,-2,9,21,.08,0,Math.PI*2);ctx.fillStyle='#201e18';ctx.fill();ctx.restore();
}
function drawHandTitle(ctx,side){
  ctx.save();ctx.translate(side==='port'?625:610,side==='port'?210:230);ctx.rotate(side==='port'?.035:-.025);ctx.fillStyle='#dfdac2';ctx.strokeStyle='#5e5b4d';ctx.lineWidth=2.2;ctx.textBaseline='alphabetic';ctx.font='900 174px Arial Black,Impact,sans-serif';
  ctx.fillText('“80',0,170);ctx.strokeText('“80',0,170);
  let x=355;ctx.save();ctx.translate(x,0);ctx.transform(1,0,-.14,1.16,0,-22);ctx.fillText('D',0,170);ctx.strokeText('D',0,170);ctx.restore();
  ctx.font='900 166px Arial Black,Impact,sans-serif';ctx.fillText('AYS”',x+138,170);ctx.strokeText('AYS”',x+138,170);ctx.restore();
}
function drawDie(ctx,x,y,size,pips,skew){
  ctx.save();ctx.translate(x,y);ctx.transform(1,skew,-.16,1,0,0);ctx.fillStyle='#d9d4bf';ctx.strokeStyle='#626050';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-size/2,-size/2,size,size,9);ctx.fill();ctx.stroke();ctx.fillStyle='#34352b';const r=size*.065;
  const pos={1:[[0,0]],3:[[-.25,-.25],[0,0],[.25,.25]],5:[[-.25,-.25],[.25,-.25],[0,0],[-.25,.25],[.25,.25]]}[pips];for(const [px,py] of pos){ctx.beginPath();ctx.arc(px*size,py*size,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function drawPortMain(ctx){
  drawPortMouth(ctx);drawEye(ctx,405,430,1);drawHandTitle(ctx,'port');drawDie(ctx,1395,486,150,5,.08);drawDie(ctx,1580,505,150,3,-.06);
  ctx.fillStyle='#ded9c2';ctx.font='700 54px Georgia,serif';ctx.fillText('• ROBBY •',365,330);ctx.font='700 47px Georgia,serif';ctx.fillText('HUFF',1650,248);
  // Small ROBBY flag is evidence-bound; this is not one of the tally flags.
  ctx.fillStyle='#ddd7bd';ctx.fillRect(505,350,34,23);ctx.fillStyle='#822c28';ctx.beginPath();ctx.arc(522,361,7,0,Math.PI*2);ctx.fill();
}
function drawStarboardMain(ctx){
  drawStarboardMouth(ctx);drawEye(ctx,395,445,-1);drawHandTitle(ctx,'starboard');drawDie(ctx,1370,500,150,5,-.04);drawDie(ctx,1565,520,150,3,.05);
  ctx.fillStyle='#ded9c2';ctx.font='700 48px Georgia,serif';ctx.fillText('STAM',1570,268);
}
function drawBomb(ctx,x,y,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#c8a94a';ctx.strokeStyle='#5e5430';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,38);ctx.quadraticCurveTo(-11,28,-11,2);ctx.quadraticCurveTo(-10,-22,0,-30);ctx.quadraticCurveTo(10,-22,11,2);ctx.quadraticCurveTo(11,28,0,38);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-10,-17);ctx.lineTo(-22,-30);ctx.lineTo(-8,-27);ctx.lineTo(0,-38);ctx.lineTo(8,-27);ctx.lineTo(22,-30);ctx.lineTo(10,-17);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
}
function drawFlag(ctx,x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#ddd7bd';ctx.strokeStyle='#5e5b4d';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-22,-15);ctx.lineTo(22,-18);ctx.lineTo(21,16);ctx.lineTo(-22,14);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#822c28';ctx.beginPath();ctx.ellipse(0,0,8,8,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawPortMission(ctx){
  // Visible-subset layer only. It deliberately does not state a total mission count.
  [1410,1488,1568,1644,1718].forEach((x,i)=>drawBomb(ctx,x,235+(i%2)*4,.72));
}
function drawStarboardMission(ctx){
  [1195,1263,1331,1399,1467].forEach((x,i)=>drawBomb(ctx,x,206-(i%2)*3,.68));
  for(let i=0;i<8;i++)drawFlag(ctx,1218+i*63,292-i*3,.72);
}
function makeTexture(side,layer){
  const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.lineJoin='round';ctx.lineCap='round';
  if(layer==='main')(side==='port'?drawPortMain:drawStarboardMain)(ctx);else(side==='port'?drawPortMission:drawStarboardMission)(ctx);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}
function targetIdsForPatch(sign,z,width,y,height){
  const ids=[];for(const mesh of paintMeshes){const b=new THREE.Box3().setFromObject(mesh);if(b.max.z<z-width*.57||b.min.z>z+width*.57||b.max.y<y-height*.58||b.min.y>y+height*.58)continue;if(sign>0?b.max.x>.55:b.min.x<-.55)ids.push(mesh.userData.sourceNode);}return [...new Set(ids)];
}
function makeSidePlacement(side,texture,layer){
  const sign=side==='port'?1:-1;const zs=skinSystem.bodySections.map(s=>s.z),nose=Math.max(...zs),tail=Math.min(...zs),length=nose-tail;
  const width=5.45,height=3.05,z=nose-2.58,y=-.03;const targetIds=targetIdsForPatch(sign,z,width,y,height);
  const placement={name:`80-days-${side}-${layer}`,view:side,targetIds,center:[sign*1.11,y,z],normal:[sign,0,0],axisU:[0,0,-1],axisV:[0,1,0],width,height,rotationImageDegrees:0,scaleMetresPerPixel:width/2048,reference:{source:side==='port'?'E04/R3 + port direct photo':'E01/E02/E03 + starboard direct photo',layer,instance:'80-days-r1'}};
  const result=makeDecal(placement,skinSystem,texture);result.mesh.renderOrder=15+(layer==='mission'?1:0);result.mesh.material.depthWrite=false;return {placement,...result,length,nose,tail};
}
function build80Days(){
  artGroup=new THREE.Group();artGroup.name='80-days-main-art';missionGroup=new THREE.Group();missionGroup.name='80-days-mission-visible-subset';scene.add(artGroup,missionGroup);
  const audits=[];for(const side of ['port','starboard']){const main=makeSidePlacement(side,makeTexture(side,'main'),'main');artGroup.add(main.mesh);audits.push({side,layer:'main',audit:main.audit,targets:main.placement.targetIds});const mission=makeSidePlacement(side,makeTexture(side,'mission'),'mission');missionGroup.add(mission.mesh);audits.push({side,layer:'mission-visible-subset',audit:mission.audit,targets:mission.placement.targetIds});}
  const minCoverage=Math.min(...audits.map(x=>x.audit.gridCoverage));
  window.__B24_80DAYS_R1__={schema:'haihao.aircraft/80-days-instance-runtime@1.0',mother:{id:'b24-generic-mother-01',freezeCommit:'636f26ec102680b4154a6f9dca0cf49fc951f51e',modified:false},aircraft:'B-24J-25-CO 42-73257 “80 DAYS”',methods:{sidesIndependent:true,portMouth:'E04/R3 hand-traced perimeter transfer',starboardMouth:'E01/E02 independent reconstruction',surface:'raycast curved-skin decals',mirroring:false},missionState:{victoryFlagsRenderedStarboard:8,bombExactCount:null,bombSubsetOnly:true},audits,minCoverage,visualAcceptance:false,productionReady:false};
  qaReadout.textContent=`曲面投射 ${audits.length} 层 · 最低网格命中率 ${(minCoverage*100).toFixed(1)}% · Mother 01 未改动 · 等待视觉复核`;
}

function resize(){const w=stage.clientWidth,h=stage.clientHeight,aspect=w/h;renderer.setSize(w,h,false);perspective.aspect=aspect;perspective.updateProjectionMatrix();const hh=Math.max(ortho.userData.halfHeight||9.4,(ortho.userData.minHalfWidth||11.8)/aspect);ortho.left=-hh*aspect;ortho.right=hh*aspect;ortho.top=hh;ortho.bottom=-hh;ortho.updateProjectionMatrix();}
function setOrtho(position,up,halfHeight){activeCamera=ortho;orbitControls.enabled=false;fixedControls.enabled=true;ortho.userData.halfHeight=halfHeight;ortho.userData.minHalfWidth=11.8;ortho.position.copy(position);ortho.up.copy(up);fixedControls.target.set(0,0,-2.56);ortho.lookAt(fixedControls.target);ortho.zoom=1;fixedControls.update();resize();}
function setView(view){grid.visible=view==='orbit';if(view==='orbit'){activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.set(27,9,25);perspective.up.set(0,1,0);orbitControls.target.set(0,0,-2.56);orbitControls.update();}else if(view==='port')setOrtho(new THREE.Vector3(40,0,-2.56),new THREE.Vector3(0,1,0),9.4);else if(view==='starboard')setOrtho(new THREE.Vector3(-40,0,-2.56),new THREE.Vector3(0,1,0),9.4);else if(view==='front'){activeCamera=perspective;fixedControls.enabled=false;orbitControls.enabled=true;perspective.position.set(0,.6,22);perspective.up.set(0,1,0);orbitControls.target.set(0,0,5.0);orbitControls.update();grid.visible=false;}document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));status.textContent='“80 DAYS” R1 · '+({orbit:'立体透视',port:'左舷独立检查',starboard:'右舷独立检查',front:'机鼻曲面包裹检查'}[view]);}

addEventListener('resize',resize);resize();
try{
  aircraft=await NativeAircraft.load((p,t)=>{bar.style.width=(p*100)+'%';loadText.textContent=t;});scene.add(aircraft.group);aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);
  lockMotherPosture();applyDetailMaterials(aircraft,renderer);skinSystem=createSkinSystem(aircraft,renderer);paintMeshes=skinSystem.paintMeshes;buildMotherInsignia();build80Days();loading.hidden=true;setView('orbit');status.textContent='“80 DAYS” R1 已载入 · 正在按证据独立检查左右舷';
}catch(e){loading.hidden=false;loading.style.display='grid';console.error(e);loadText.textContent='载入失败';diag.textContent=String(e?.stack||e);status.textContent='载入失败，Mother 01 未被修改';}

$('#views').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b)setView(b.dataset.view);});
$('#artToggle').addEventListener('change',e=>artGroup&&(artGroup.visible=e.target.checked));
$('#missionToggle').addEventListener('change',e=>missionGroup&&(missionGroup.visible=e.target.checked));
$('#mobileToggle').addEventListener('click',()=>$('#panel').classList.toggle('open'));
function render(){if(document.hidden)return;orbitControls.update();fixedControls.update();renderer.render(scene,activeCamera);}renderer.setAnimationLoop(render);
addEventListener('pagehide',e=>{if(e.persisted)return;renderer.setAnimationLoop(null);orbitControls.dispose();fixedControls.dispose();renderer.dispose();});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();loading.hidden=false;loadText.textContent='图形上下文已中断，请刷新页面恢复。';});
