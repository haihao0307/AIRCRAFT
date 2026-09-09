import {baseView as b} from './80-days-base-view-r1.js';
import {INSTANCE,GLYPHS,PORT_ART as A,STARBOARD_ART as R,TAIL_ART as F} from './80-days-instance-r1.js';
const {THREE:T,aircraft,scene}=b;
if(!aircraft)throw new Error('母体加载未完成');
const $=s=>document.querySelector(s),allCoats=[],candidates=[],anchorGroup=new T.Group();scene.add(anchorGroup);anchorGroup.visible=false;
const propellerOriginal=new Map(aircraft.meshes.filter(m=>m.userData.family==='propeller').map(m=>[m,m.visible]));
const report={version:'80-days-placement-r1',source:INSTANCE.parent,frame:INSTANCE.frame,shapes:0,generatedTriangles:0,rejectedTriangles:0,maxAttachmentResidual:0,patches:{},omittedMarks:[],historicalComplete:false,engineeringCalibrated:false};
const colors=INSTANCE.colors,materials=new Map(),ray=new T.Raycaster(),inverseCache=new Map();
const getMaterial=(color)=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.88,metalness:0,side:T.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));return materials.get(color);};
const matrixInverse=n=>{if(!inverseCache.has(n))inverseCache.set(n,n.matrixWorld.clone().invert());return inverseCache.get(n);};

function parsePath(d,target=new T.Shape()){
 const tokens=d.match(/[MLCQZmlcqz]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/g);let i=0;
 while(i<tokens.length){const c=tokens[i++],n=()=>Number(tokens[i++]);if(c==='M')target.moveTo(n(),n());else if(c==='L')target.lineTo(n(),n());else if(c==='Q')target.quadraticCurveTo(n(),n(),n(),n());else if(c==='C')target.bezierCurveTo(n(),n(),n(),n(),n(),n());else if(c==='Z')target.closePath();else throw new Error('Invalid bounded curve '+c);}
 return target;
}
const polygon=points=>{const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return s;};
function ellipse(x,y,rx,ry){const s=new T.Shape();s.absellipse(x,y,rx,ry,0,Math.PI*2,false,0);return s;}
function glyph(c){const g=GLYPHS[c];if(!g)throw new Error('Unknown glyph '+c);const s=parsePath(g.outer);s.holes=g.holes.map(h=>parsePath(h,new T.Path()));return s;}

function patchSampler(patch,sign,patchId){
 const targets=patch.targets.map(id=>aircraft.meshes.find(m=>m.userData.sourceNode===id));if(targets.some(x=>!x))throw new Error('Missing surface in '+patchId);
 const cache=new Map(),isTail=patchId.startsWith('tail'),maxX=isTail?4.45:1.45,minX=isTail?3.3:.10;
 // A disposable 2D spatial index of this fixed parent surface. No tessellation
 // or triangle identifier is serialized as instance knowledge.
 const bins=new Map(),cell=.12,range=isTail?[-11.9,-9.0,-1.0,2.8]:[2.6,7.95,-2.35,1.2];
 let sourceTriangles=0;
 const surfaces=isTail?targets:[...targets,...aircraft.meshes.filter(m=>m.userData.family==='glass')];
 for(const mesh of surfaces){const g=mesh.geometry,a=g.attributes.position,ix=g.index,vertices=Array.from({length:a.count},(_,i)=>new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));
  for(let k=0;k<ix.count;k+=3){const v0=vertices[ix.getX(k)],v1=vertices[ix.getX(k+1)],v2=vertices[ix.getX(k+2)];
   const ymin=Math.min(v0.y,v1.y,v2.y),ymax=Math.max(v0.y,v1.y,v2.y),zmin=Math.min(v0.z,v1.z,v2.z),zmax=Math.max(v0.z,v1.z,v2.z);
   if(zmax<range[0]||zmin>range[1]||ymax<range[2]||ymin>range[3]||Math.max(sign*v0.x,sign*v1.x,sign*v2.x)<minX||Math.min(sign*v0.x,sign*v1.x,sign*v2.x)>maxX)continue;
   const den=(v1.z-v2.z)*(v0.y-v2.y)+(v2.y-v1.y)*(v0.z-v2.z);if(Math.abs(den)<1e-10)continue;
   const normal=v1.clone().sub(v0).cross(v2.clone().sub(v0)).normalize();if(Math.abs(normal.x)<.16)continue;if(normal.x*sign<0)normal.negate();
   const tri={v0,v1,v2,den,normal,mesh};sourceTriangles++;
   for(let iy=Math.floor(Math.max(ymin,range[2])/cell);iy<=Math.floor(Math.min(ymax,range[3])/cell);iy++)for(let iz=Math.floor(Math.max(zmin,range[0])/cell);iz<=Math.floor(Math.min(zmax,range[1])/cell);iz++){const key=iy+','+iz;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(tri);}
  }
 }
 const stats=report.patches[patchId]={source:patch.source,targetIds:patch.targets,hits:0,misses:0,maxNormalOffset:.002,side:sign===1?'port':'starboard',workingPlacementEnvelope:patch.placementEnvelopeWorkingM,temporarySurfaceTriangles:sourceTriangles};
 function project(x,y){const key=x.toFixed(3)+','+y.toFixed(3);if(cache.has(key))return cache.get(key);const z=patch.projection.z[0]+patch.projection.z[1]*x+patch.projection.z[2]*y,yy=patch.projection.y[0]+patch.projection.y[1]*x+patch.projection.y[2]*y;
  let hit=null;
  for(const tri of bins.get(Math.floor(yy/cell)+','+Math.floor(z/cell))||[]){const {v0,v1,v2,den}=tri,u=((v1.z-v2.z)*(yy-v2.y)+(v2.y-v1.y)*(z-v2.z))/den,v=((v2.z-v0.z)*(yy-v2.y)+(v0.y-v2.y)*(z-v2.z))/den;if(u<-.000001||v<-.000001||u+v>1.000001)continue;const x=u*v0.x+v*v1.x+(1-u-v)*v2.x;if(sign*x<minX||sign*x>maxX)continue;if(!hit||sign*x>sign*hit.point.x)hit={point:new T.Vector3(x,yy,z),normal:tri.normal,object:tri.mesh};}
  if(!hit||hit.object.userData.family==='glass'){stats.misses++;cache.set(key,null);return null;}
  const normal=hit.normal;
  const point=hit.point.clone().addScaledVector(normal,.002),v={point,sourcePoint:hit.point,node:hit.object.parent,nodeId:hit.object.userData.sourceNode};stats.hits++;cache.set(key,v);return v;
 }
 return {project,patch,sign,patchId,stats};
}

const portTailPatch={...INSTANCE.patches.tail,projection:{...INSTANCE.patches.tail.projection,z:F.portZ}};
const samplers={port:patchSampler(INSTANCE.patches.port,1,'port'),starboard:patchSampler(INSTANCE.patches.starboard,-1,'starboard'),tailPort:patchSampler(portTailPatch,1,'tail-port'),tailStarboard:patchSampler(INSTANCE.patches.tail,-1,'tail-starboard')};
const buffers=new Map();
function paint(shape,sampler,color,transform=p=>p,candidate=false,label='mark'){
 const g=new T.ShapeGeometry(shape,9),a=g.attributes.position,ix=g.index;report.shapes++;
 const layer=/flag/.test(label)&&color===colors.sun?4:/pip/.test(label)&&color===colors.mouth?4:/mouth/.test(label)?0:/tongue/.test(label)?1:/dice sides/.test(label)?2:3;
 const point=i=>transform(new T.Vector2(a.getX(i),a.getY(i)));
 const maxPx=sampler.patchId.startsWith('tail')?4.0:sampler.patchId==='port'?18:4;
 function triangle(pa,pb,pc,depth=0){
  const distances=[pa.distanceTo(pb),pb.distanceTo(pc),pc.distanceTo(pa)],longest=Math.max(...distances);
  function split(){const n=distances.indexOf(longest);if(n===0){const m=pa.clone().lerp(pb,.5);triangle(pa,m,pc,depth+1);triangle(m,pb,pc,depth+1);}else if(n===1){const m=pb.clone().lerp(pc,.5);triangle(pa,pb,m,depth+1);triangle(pa,m,pc,depth+1);}else{const m=pc.clone().lerp(pa,.5);triangle(pa,pb,m,depth+1);triangle(m,pb,pc,depth+1);}}
  if(longest>maxPx&&depth<12){split();return;}
  const va=sampler.project(pa.x,pa.y),vb=sampler.project(pb.x,pb.y),vc=sampler.project(pc.x,pc.y),center=sampler.project((pa.x+pb.x+pc.x)/3,(pa.y+pb.y+pc.y)/3);
  if(!va||!vb||!vc||!center||va.nodeId!==vb.nodeId||va.nodeId!==vc.nodeId||center.nodeId!==va.nodeId){if((va||vb||vc||center)&&longest>maxPx*.12&&depth<16){split();return;}report.rejectedTriangles++;return;}
  const edge=Math.max(va.point.distanceTo(vb.point),vb.point.distanceTo(vc.point),vc.point.distanceTo(va.point));
  const chord=va.sourcePoint.clone().add(vb.sourcePoint).add(vc.sourcePoint).multiplyScalar(1/3).distanceTo(center.sourcePoint);
  if((edge>.035||chord>.0007)&&depth<16){split();return;}
  const tooLong=edge>.07||chord>.0015;
  if(tooLong){report.rejectedTriangles++;return;}
  const key=[sampler.patchId,va.nodeId,color,candidate,layer].join('|');let buf=buffers.get(key);if(!buf){buf={positions:[],node:va.node,color,candidate,layer,patch:sampler.patchId,nodeId:va.nodeId,labels:new Set()};buffers.set(key,buf);}buf.labels.add(label);
  for(const v of [va,vb,vc]){const local=v.point.clone().applyMatrix4(matrixInverse(v.node));buf.positions.push(...local.toArray());report.maxAttachmentResidual=Math.max(report.maxAttachmentResidual,v.point.distanceTo(v.sourcePoint));}
  report.generatedTriangles++;
 }
 for(let i=0;i<ix.count;i+=3)triangle(point(ix.getX(i)),point(ix.getX(i+1)),point(ix.getX(i+2)));
 g.dispose();
}
const drawPoly=(points,sampler,color,candidate=false,label)=>paint(polygon(points),sampler,color,undefined,candidate,label);
const drawPath=(d,sampler,color,candidate=false,label)=>paint(parsePath(d),sampler,color,undefined,candidate,label);
function drawLetter(desc,sampler,candidate=false){const {c,x,y,w,h,angle=0}=desc,r=angle*Math.PI/180;paint(glyph(c),sampler,colors.ivory,p=>{const xx=p.x/65*w,yy=p.y/100*h;return new T.Vector2(x+xx*Math.cos(r)-yy*Math.sin(r),y+xx*Math.sin(r)+yy*Math.cos(r));},candidate,'letter:'+c);}
function drawText(text,rect,sampler,candidate=false){const [x,y,w,h]=rect,step=w/text.length;let hits=0,total=0;for(let i=0;i<8;i++)for(let j=0;j<3;j++){total++;if(sampler.project(x+w*i/7,y+h*j/2))hits++;}if(hits<total*.96){report.omittedMarks.push({text,source:sampler.patch.source,reason:'parent surface/window correspondence not complete',sampleHits:hits,sampleCount:total});return;}text.split('').forEach((c,i)=>drawLetter({c,x:x+i*step,y:y+(i%2)*h*.035,w:step*.85,h,angle:-5},sampler,candidate));}
function flag(x,y,w,h,sampler,label='visible flag'){drawPoly([[x+1,y],[x+w,y+1],[x+w-1,y+h],[x,y+h-1]],sampler,colors.flag,false,label);paint(ellipse(x+w*.52,y+h*.51,w*.26,h*.34),sampler,colors.sun,undefined,false,label);}
function dice(d,sampler,candidate=false){drawPoly(d.corners,sampler,'#c9c9ac',candidate,'dice sides');drawPoly(d.front,sampler,colors.ivory,candidate,'dice face');for(const p of d.pips)paint(ellipse(...p,11,12),sampler,colors.mouth,undefined,candidate,'dice pips');for(const p of d.sidePips)paint(ellipse(...p,4,11),sampler,colors.mouth,undefined,candidate,'dice side pips');for(const p of d.bottomPips)paint(ellipse(...p,9,3),sampler,colors.mouth,undefined,candidate,'dice bottom pips');}
function tooth(x,y,w,h,sampler){const d=`M${x} ${y} Q${x+w*.55} ${y+h*.06} ${x+w} ${y+h*.15} Q${x+w*.70} ${y+h*.55} ${x+w*.6} ${y+h} Q${x+w*.11} ${y+h*.71} ${x} ${y} Z`;drawPath(d,sampler,colors.ivory,false,'tooth');}

// Port: one E04-based photo state only; STAM from another photograph is not merged in.
drawPath(A.mouth,samplers.port,colors.mouth,false,'E04 mouth');drawPath(A.tongue,samplers.port,colors.tongue,true,'unverified tongue color');
for(const t of A.topTeeth)tooth(...t,samplers.port);for(const t of A.bottomTeeth)tooth(...t,samplers.port);
for(const desc of A.name)drawLetter(desc,samplers.port);for(const q of A.quotes)drawPoly(q,samplers.port,colors.ivory,false,'quotation');
for(const d of A.dice)dice(d,samplers.port);drawText(A.robby.text,A.robby.rect,samplers.port);drawText(A.huff.text,A.huff.rect,samplers.port);
if(!report.omittedMarks.some(m=>m.text==='ROBBY'))flag(583,338,41,29,samplers.port,'E04 ROBBY flag');
for(let i=0;i<A.flags.count;i++){const [x,y,w,h]=A.flags.rect;flag(x+i*(w+A.flags.gap),y+i*.7,w,h,samplers.port,'E04 visible row fragment');}
for(let i=0;i<A.bombs.centres.length;i++){const x=A.bombs.centres[i],y=A.bombs.y+i*.35,w=A.bombs.size[0],h=A.bombs.size[1];drawPath(`M${x-w*.43} ${y} L${x} ${y+h*.10} L${x+w*.44} ${y} L${x+w*.34} ${y+h*.25} L${x+w*.30} ${y+h*.65} Q${x+w*.30} ${y+h*.9} ${x} ${y+h} Q${x-w*.30} ${y+h*.9} ${x-w*.30} ${y+h*.65} L${x-w*.34} ${y+h*.25} Z`,samplers.port,colors.bomb,false,'E04 18 visible bombs; total unknown');}

// Starboard: independently placed from E07, not a negative-scale duplicate.
drawPath(R.mouth,samplers.starboard,colors.mouth,false,'E07 mouth');
for(let i=0;i<15;i++){const x=1575+i*21.1,t=i/14,y=600-49*t;tooth(x,y,20,18+10*t,samplers.starboard);}
for(let i=0;i<11;i++){const x=1568+i*18.7,y=631+i*.45;tooth(x,y,17,-(10+i*.45),samplers.starboard);}

R.name.forEach(d=>drawLetter(d,samplers.starboard));drawPoly([[1433,515],[1438,511],[1447,520],[1442,524]],samplers.starboard,colors.ivory);drawPoly([[1636,513],[1645,505],[1649,510],[1640,518]],samplers.starboard,colors.ivory);
for(const [x,candidate] of R.diceX.map(x=>[x,true])){drawPoly([[x+11,556],[x+40,554],[x+45,589],[x+29,603],[x,603],[x-1,573]],samplers.starboard,colors.ivory,candidate,'E07 dice; pips unresolved');for(const [dx,dy]of[[10,18],[27,15],[20,29],[9,39],[32,36]])paint(ellipse(x+dx,556+dy,1.8,2.2),samplers.starboard,colors.mouth,undefined,true,'E07 pip arrangement candidate');}
drawText('HUFF',R.huff,samplers.starboard,true);

for(const sampler of [samplers.tailPort,samplers.tailStarboard]){
 drawPoly(F.triangle,sampler,colors.ivory,sampler.sign===1,'E07 upward triangle');
 drawText(F.code.text,F.code.rect,sampler,sampler.sign===1);
 drawText(F.serial.text,F.serial.rect,sampler,true);
}

for(const buf of buffers.values()){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(buf.positions,3));g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.Mesh(g,getMaterial(buf.color));mesh.name='80-days:'+buf.patch+':'+buf.nodeId;mesh.userData={instance:INSTANCE.id,host:buf.nodeId,patch:buf.patch,candidate:buf.candidate,labels:[...buf.labels]};mesh.renderOrder=10+buf.layer;buf.node.add(mesh);allCoats.push(mesh);if(buf.candidate)candidates.push(mesh);}

const anchorDefs=[['port',850,200,'圆窗参考'],['port',1265,743,'骰子下沿'],['port',353,440,'机首参考'],['tailStarboard',151,399,'三角顶点'],['tailStarboard',126,366,'487 起点']];
for(const [s,x,y,label]of anchorDefs){const v=samplers[s].project(x,y);if(!v)continue;const ball=new T.Mesh(new T.SphereGeometry(.022,8,6),new T.MeshBasicMaterial({color:'#9be6bb',depthTest:false}));ball.position.copy(v.point).add(new T.Vector3(samplers[s].sign*.015,0,0));ball.renderOrder=10;ball.userData.label=label;v.node.add(ball);anchorGroup.userData.markers??=[];anchorGroup.userData.markers.push(ball);ball.position.applyMatrix4(matrixInverse(v.node));ball.visible=false;}

function view(id){
 const sign=id.includes('starboard')?-1:1;
 if(id.startsWith('nose-'))window.__B24_R16_QA__.focus([sign*8.3,.25,7.0],[0,-.83,5.15]);
 else if(id.startsWith('tail-'))window.__B24_R16_QA__.focus([sign*10.2,2.2,-7.8],[sign*3.8,.92,-10.5]);
 else if(id.startsWith('ortho-')){b.setView(sign===1?'port':'starboard');b.setOrtho(new T.Vector3(sign*20,-.85,5.15),new T.Vector3(0,1,0),2.05);b.fixedControls.target.set(0,-.85,5.15);b.ortho.userData.minHalfWidth=2.75;b.ortho.userData.halfHeight=2.05;b.fixedControls.update();b.resize();}
 else if(id==='whole')b.setView('orbit');else b.setView(id);
 $('#status').textContent='80 DAYS · R1 · '+({whole:'整机正常透视','nose-port':'左侧机头 · E04 定位候选','nose-starboard':'右侧机头 · E07 独立定位','tail-port':'左尾外侧 · 对侧配置候选','tail-starboard':'右尾外侧 · 487 与三角','ortho-port':'左侧固定正交','ortho-starboard':'右侧固定正交',front:'机头正交',rear:'机尾正交',top:'俯视正交'}[id]||id);
 document.querySelectorAll('[data-eighty-view]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.eightyView===id)));
 report.view=id;
}
document.querySelectorAll('[data-eighty-view]').forEach(el=>el.addEventListener('click',()=>view(el.dataset.eightyView)));
function visibility(){for(const m of allCoats)m.visible=$('#showMarkings').checked&&(!m.userData.candidate||$('#showCandidates').checked);anchorGroup.visible=$('#showAnchors').checked;for(const m of anchorGroup.userData.markers||[])m.visible=anchorGroup.visible;for(const [m,wasVisible]of propellerOriginal)m.visible=wasVisible&&!$('#hideProps80').checked;}
for(const id of ['showMarkings','showAnchors','showCandidates','hideProps80'])$('#'+id).addEventListener('change',visibility);
$('#markInfo').innerHTML='<div class="infoLine"><span>母体</span><span class="value">公版 01 / R16</span></div><div class="infoLine"><span>左侧图案</span><span class="value">E04 独立状态</span></div><div class="infoLine"><span>右侧图案</span><span class="value">E07 独立状态</span></div><div class="infoLine"><span>炸弹标记</span><span class="value">可辨 18 枚片段</span></div><div class="infoLine"><span>全机任务总数</span><span class="uncertain">未知</span></div><div class="infoLine"><span>尾号补全</span><span class="uncertain">273257 候选</span></div>';
$('#metric').textContent='玻璃窗口：不覆盖\n尾舵图案：随所属部件移动\nROBBY：窗口对应不完整，暂不放置';
visibility();view('nose-port');
window.__EIGHTY__={ready:true,report,instance:INSTANCE,base:b,view,coats:allCoats,anchors:anchorGroup,visibility,project:(x,y,patch='port')=>samplers[patch].project(x,y),setRootPose:(position,rotation)=>{aircraft.group.position.fromArray(position);aircraft.group.rotation.set(...rotation);aircraft.group.updateMatrixWorld(true);}};
