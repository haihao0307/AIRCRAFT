import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { heightToNormals } from 'material-math';

const $ = id => document.getElementById(id);
const D = JSON.parse($('workbench-data').textContent);
const defaults = Object.freeze({side:'port',mode:'sample',channel:'beauty',light:'neutral',paint:'#666548',rough:0.67,fade:0.35,wear:0.30,relief:0.65,exposure:0.85,art:true,grime:true,structure:true,overlay:true,opacity:0.5});
const state = {...defaults};
const qa = window.__B24QA = {ready:false,errors:[],frames:0,modelVerified:false,modelBinding:0,visualAcceptance:false,sourceSHA256:D.model.sha256};
window.addEventListener('error',e=>qa.errors.push(e.message));
window.addEventListener('unhandledrejection',e=>qa.errors.push(String(e.reason)));
let renderer,scene,camera,controls,sample,aircraft,front,back,rivets,maps={},flatMaterial,proofMaterial;
let photoPixels={},photoImages={},artCanvases={},currentGeometry,lightKey,lightFill,lightRim;
let modelPromise=null,timer=0,frameTime=performance.now(),frames=0,initTime=performance.now();
const toast=message=>{ $('toast').textContent=message;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,4200); };
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const hash=(x,y)=>{let n=(Math.imul(x,374761393)+Math.imul(y,668265263))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
const mix=(a,b,t)=>a+(b-a)*t;
// The same normalized coverage field feeds base color, roughness and metalness.
function chipAt(u,v){const edge=Math.min(u,1-u,v,1-v);return edge<.014*state.wear*(.3+.7*hash(Math.floor(u*40),Math.floor(v*26)))&&hash(Math.floor(u*512),Math.floor(v*360))>.48;}

function image(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('参考照片无法读取'));im.src=url;});}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function polygon(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}

// Photo-space regions are deliberately explicit. They are observation masks,
// not registered model UVs. Occluded starboard jaw and dice remain absent.
const regions={
 port:{crop:[360,140,1640,900],white:[
  [[925,375],[962,347],[1055,346],[1210,300],[1320,288],[1525,301],[1665,333],[1815,357],[1927,367],[1997,383],[1999,489],[1960,506],[1919,478],[1835,548],[1720,552],[1605,514],[1405,490],[1270,523],[1150,560],[1034,553],[961,434]],
  [[522,255],[710,265],[704,326],[515,329]],
  [[1188,652],[1270,568],[1435,574],[1432,735],[1346,803],[1186,798]],
  [[1458,657],[1545,584],[1707,591],[1700,815],[1458,809]]
 ],dice:[[[1188,652],[1270,568],[1435,574],[1432,735],[1346,803],[1186,798]],[[1458,657],[1545,584],[1707,591],[1700,815],[1458,809]]],mouth:[[0,552],[106,541],[270,559],[480,592],[726,643],[987,721],[1220,815],[1455,900],[1735,1007],[1635,989],[1460,975],[1240,969],[1030,970],[819,970],[602,994],[460,1023],[401,956],[290,857],[179,755],[0,656]],seams:[[[490,386],[708,405],[940,413]],[[710,413],[704,640],[1130,665]],[[1130,665],[1124,738]],[[820,147],[785,202]],[[1380,215],[1800,213]],[[1790,215],[1788,368]],[[1600,835],[1840,925],[1990,992]]]},
 starboard:{crop:[175,35,425,380],white:[[[174,226],[192,216],[207,194],[254,181],[294,185],[315,197],[315,225],[304,253],[275,258],[262,250],[242,262],[214,267],[193,282],[183,269],[174,252]],[[423,110],[473,101],[474,129],[423,140]]],dice:[],mouth:null,seams:[[[330,176],[423,160],[424,209],[321,226]],[[494,140],[560,132],[558,240]],[[423,210],[420,360]],[[324,228],[319,350]]]},
};
function makeArtwork(side){
 const im=photoImages[side],W=im.naturalWidth,H=im.naturalHeight;
 const ref=canvas(W,H),ctx=ref.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
 const pixels=ctx.getImageData(0,0,W,H).data;photoPixels[side]={width:W,height:H,pixels};
 const out=canvas(W,H),oc=out.getContext('2d'),mask=canvas(W,H),mc=mask.getContext('2d',{willReadFrequently:true});
 const data=oc.createImageData(W,H),p=data.data;const r=regions[side];
 function admit(polys,kind){
  mc.clearRect(0,0,W,H);mc.fillStyle='white';for(const pts of polys){polygon(mc,pts);mc.fill();}
  const shape=mc.getImageData(0,0,W,H).data;
  for(let i=0;i<p.length;i+=4){if(!shape[i+3])continue;const l=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255;
   let a=0,col;
   if(kind==='mouth'){a=1;col=l>.57?[227,221,199]:[102,20,22];a=l>.57?smooth(.57,.83,l):1;}
   else if(kind==='dice'){a=1;const v=smooth(.38,.86,l);col=[mix(27,227,v),mix(28,221,v),mix(22,199,v)];}
   else{a=smooth(side==='port'?.73:.68,side==='port'?.90:.91,l);col=[230,226,208];}
   if(a>0){p[i]=col[0];p[i+1]=col[1];p[i+2]=col[2];p[i+3]=a*255;}
  }
 }
 if(r.mouth)admit([r.mouth],'mouth');if(r.dice.length)admit(r.dice,'dice');admit(r.white.filter(poly=>!r.dice.includes(poly)),'white');
 // The dice occupy explicit polygons; reapply their local luminance segmentation
 // so dark pips do not disappear into the olive substrate.
 if(r.dice.length)admit(r.dice,'dice');
 oc.putImageData(data,0,0);artCanvases[side]=out;return out;
}
function texture(c,color=false){const t=new THREE.CanvasTexture(c);t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
function sampleZ(x,y){return .16*(1-(x/3)**2)+.045*Math.cos(y*1.5);}
function makeGeometry(){
 const crop=regions[state.side].crop,h=6*crop[3]/crop[2],g=new THREE.PlaneGeometry(6,h,128,80),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,sampleZ(x,y));}g.computeVertexNormals();return g;
}
function updateSampleGeometry(){
 if(sample){scene.remove(sample);sample.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o!==front&&o.material!==proofMaterial&&o.material!==flatMaterial)o.material.dispose();});}
 sample=new THREE.Group();currentGeometry=makeGeometry();front=new THREE.Mesh(currentGeometry,proofMaterial);front.name='Independent_Material_Coupon';sample.add(front);
 const bg=currentGeometry.clone();const bp=bg.attributes.position;for(let i=0;i<bp.count;i++)bp.setZ(i,bp.getZ(i)-.035);bg.computeVertexNormals();
 back=new THREE.Mesh(bg,new THREE.MeshStandardMaterial({color:'#999b91',metalness:1,roughness:.42,side:THREE.BackSide}));sample.add(back);
 const r=regions[state.side],h=6*r.crop[3]/r.crop[2],pts=[];
 for(const path of r.seams){for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j];const dist=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let k=0;k<dist;k+=24){const t=k/dist,u=(mix(a[0],b[0],t)-r.crop[0])/r.crop[2],v=(mix(a[1],b[1],t)-r.crop[1])/r.crop[3];if(u>.015&&u<.985&&v>.015&&v<.985){const x=(u-.5)*6,y=(.5-v)*h;pts.push([x,y,sampleZ(x,y)+.006]);}}}}
 rivets=new THREE.InstancedMesh(new THREE.SphereGeometry(.009,8,6),new THREE.MeshStandardMaterial({color:state.paint,metalness:0,roughness:state.rough}),pts.length);
 const dummy=new THREE.Object3D();pts.forEach((p,i)=>{dummy.position.set(...p);dummy.scale.set(1,1,.38);dummy.updateMatrix();rivets.setMatrixAt(i,dummy.matrix);});rivets.instanceMatrix.needsUpdate=true;rivets.name='Unregistered_Coupon_Fasteners';sample.add(rivets);scene.add(sample);sample.visible=state.mode==='sample';qa.couponRivets=pts.length;
}
function rebuildMaps(){
 const W=1536,H=864,crop=regions[state.side].crop,ratio=crop[3]/crop[2];
 const actualH=Math.round(W*ratio),base=canvas(W,actualH),bc=base.getContext('2d');
 const col=new THREE.Color(state.paint);col.convertLinearToSRGB();const rgb=[col.r*255,col.g*255,col.b*255];
 const pixels=bc.createImageData(W,actualH),p=pixels.data;
 for(let y=0;y<actualH;y++){for(let x=0;x<W;x++){
  const u=x/W,v=y/actualH,n=hash(Math.floor(x/90),Math.floor(y/80)),fine=hash(x,y)-.5;
  const chalk=(.25+.18*Math.sin(u*9.4+v*5)+.1*Math.sin(v*12.3-u*6))*state.fade;
  const stain=state.grime?.22*Math.exp(-(((u-.83)/.17)**2)-(((v-.41)/.3)**2)):0;
  const edge=Math.min(u,1-u,v,1-v),wear=chipAt(u,v);
  const i=(y*W+x)*4;
  for(let k=0;k<3;k++)p[i+k]=wear?[161,166,158][k]:clamp((rgb[k]*(1-stain)+chalk*27+fine*3+(n-.5)*state.fade*5)/255)*255;
  p[i+3]=255;
 }}bc.putImageData(pixels,0,0);
 if(state.art)bc.drawImage(artCanvases[state.side],...crop,0,0,W,actualH);
 const mask=canvas(W,actualH),mx=mask.getContext('2d');if(state.art)mx.drawImage(artCanvases[state.side],...crop,0,0,W,actualH);mx.globalCompositeOperation='source-in';mx.fillStyle='white';mx.fillRect(0,0,W,actualH);mx.globalCompositeOperation='destination-over';mx.fillStyle='black';mx.fillRect(0,0,W,actualH);
 const w=512,h=Math.round(w*ratio),rough=canvas(w,h),rc=rough.getContext('2d'),metal=canvas(w,h),mc=metal.getContext('2d'),height=canvas(w,h),hc=height.getContext('2d');
 const rr=rc.createImageData(w,h),mm=mc.createImageData(w,h),hh=hc.createImageData(w,h);const values=new Float32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/(w-1),v=y/(h-1),i=y*w+x,j=i*4;const edge=Math.min(u,1-u,v,1-v);const chip=chipAt(u,v);
  const stain=state.grime?Math.exp(-(((u-.83)/.17)**2)-(((v-.41)/.3)**2)):0;
  const r=clamp(state.rough+state.fade*.055*Math.sin(u*8.3+v*2)-stain*.20+(hash(x,y)-.5)*.025,.12,.96)*255;
  const hv=.5+Math.sin(u*43+Math.sin(v*19))*Math.sin(v*28)*.011+(hash(x,y)-.5)*.008;
  values[i]=hv;for(let k=0;k<3;k++){rr.data[j+k]=chip?95:r;mm.data[j+k]=chip?255:0;hh.data[j+k]=hv*255;}rr.data[j+3]=mm.data[j+3]=hh.data[j+3]=255;
 }
 rc.putImageData(rr,0,0);mc.putImageData(mm,0,0);hc.putImageData(hh,0,0);
 if(state.structure){bc.save();bc.strokeStyle='rgba(24,29,23,.23)';bc.lineWidth=1.2;hc.strokeStyle='#737373';hc.lineWidth=1;
  for(const path of regions[state.side].seams){bc.beginPath();hc.beginPath();path.forEach((p,i)=>{const u=(p[0]-crop[0])/crop[2],v=(p[1]-crop[1])/crop[3];i?bc.lineTo(u*W,v*actualH):bc.moveTo(u*W,v*actualH);i?hc.lineTo(u*w,v*h):hc.moveTo(u*w,v*h);});bc.stroke();hc.stroke();}bc.restore();}
 const hp=hc.getImageData(0,0,w,h).data;
 // R1 expects +V rows. Canvas rows increase downward, so reverse the row
 // orientation before deriving the normal, then reverse the output back.
 const up=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)up[(h-1-y)*w+x]=hp[(y*w+x)*4]/255;
 const nn=heightToNormals(up,w,h,{spacingU:6/(w-1),spacingV:6*ratio/(h-1),heightScale:.025});
 const normal=canvas(w,h),nc=normal.getContext('2d'),np=nc.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((h-1-y)*w+x)*3,j=(y*w+x)*4;np.data[j]=nn[i]*255;np.data[j+1]=nn[i+1]*255;np.data[j+2]=nn[i+2]*255;np.data[j+3]=255;}nc.putImageData(np,0,0);
 for(const t of Object.values(maps))t.dispose();maps={base:texture(base,true),rawBase:texture(base),roughness:texture(rough),normal:texture(normal),metalness:texture(metal),height:texture(height),decal:texture(mask)};
 Object.assign(proofMaterial,{map:maps.base,roughnessMap:maps.roughness,roughness:1,metalnessMap:maps.metalness,metalness:1,normalMap:maps.normal});proofMaterial.normalScale.setScalar(state.relief);proofMaterial.needsUpdate=true;
 if(rivets){rivets.material.color.set(state.paint);rivets.material.roughness=state.rough;rivets.visible=state.structure&&state.channel==='beauty';}
 setChannel(state.channel);qa.mapRevision=(qa.mapRevision||0)+1;qa.normalConvention='OpenGL +Y; input rows explicitly reversed';qa.rawInspector=true;qa.sharedChipField=true;
}
function setChannel(value){state.channel=value;document.querySelectorAll('[data-channel]').forEach(b=>b.classList.toggle('active',b.dataset.channel===value));if(!front)return;
 if(value==='beauty'){front.material=proofMaterial;}else{flatMaterial.uniforms.rawMap.value=value==='base'?maps.rawBase:maps[value];front.material=flatMaterial;}
 rivets.visible=state.structure&&value==='beauty';$('viewBadge').textContent=value==='beauty'?'PBR · 实时':`通道 · ${value}`;
}
function setLight(name){state.light=name;document.querySelectorAll('[data-light]').forEach(b=>b.classList.toggle('active',b.dataset.light===name));
 const setups={neutral:[[1,4,6],2.2,.65,.4,.55],raking:[[5,.3,1.2],5,.22,.18,.25],studio:[[-3,4,5],3.1,.55,2.0,.60]};const [p,k,f,r,e]=setups[name];lightKey.position.set(...p);lightKey.intensity=k;lightFill.intensity=f;lightRim.intensity=r;scene.environmentIntensity=e;
}
function cameraPreset(preset){const model=state.mode==='aircraft';controls.autoRotate=false;$('spin').setAttribute('aria-pressed','false');controls.target.set(0,0,0);
 const positions=model?{front:[0,1,11],angle:[7,3.7,7],close:[3,1.5,4]}:{front:[0,0,9.2],angle:[2.9,1.35,8.4],close:[1.2,.2,5.2]};camera.position.set(...positions[preset]);controls.update();}
function updatePhoto(){const r=D.photos[state.side];$('reference').src=r.data;$('largePhoto').src=r.data;$('dialogPhoto').src=r.data;$('sourceLink').href=r.url;$('photoDimensions').textContent=`${r.width} × ${r.height} · 原图像素`;
 $('sourceNote').textContent=state.side==='port'?'清晰左舷原照，用于字形、骰子和可见牙齿的第一张材质样片。':'右舷照片用于 STAM 与上部矩形窗定位。人物遮挡区不补画。';$('maskStatus').textContent=state.side==='port'?'左舷字形 / 骰子 / 可见嘴形':'右舷字形 / STAM；遮挡处留空';drawOverlay();}
function drawOverlay(){const r=D.photos[state.side],c=$('maskOverlay');c.width=r.width;c.height=r.height;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(!state.overlay)return;ctx.globalAlpha=state.opacity;ctx.drawImage(artCanvases[state.side],0,0);ctx.globalAlpha=1;ctx.strokeStyle='#d0d89a';ctx.fillStyle='#d0d89a';ctx.lineWidth=state.side==='port'?3:1.5;
 if(state.side==='starboard'){ctx.strokeRect(418,46,68,92);ctx.font='12px sans-serif';ctx.fillText('矩形窗 / STAM',418,33);}else{ctx.font='22px sans-serif';ctx.fillText('照片坐标蒙版 · 未做曲面展平',30,45);} }
async function loadAircraft(){if(aircraft)return aircraft;if(modelPromise)return modelPromise;
 modelPromise=(async()=>{const bytes=[];let size=0;$('loadText').textContent='按需读取原始机体，约 23 MB';
 const response=await fetch(D.model.url);if(!response.ok)throw new Error(`源模型读取失败：${response.status}`);
 if(response.body){const reader=response.body.getReader();while(true){const result=await reader.read();if(result.done)break;bytes.push(result.value);size+=result.value.length;$('loadText').textContent=`原始机体读取 ${Math.min(100,Math.round(size/D.model.bytes*100))}%`;if(size>D.model.bytes)throw new Error('源模型字节数超出锁定值');}}
 else{const data=new Uint8Array(await response.arrayBuffer());bytes.push(data);size=data.length;}
 if(size!==D.model.bytes)throw new Error('源模型大小不符，已拒绝加载');const data=new Uint8Array(size);let offset=0;for(const a of bytes){data.set(a,offset);offset+=a.length;}
 if(!crypto.subtle)throw new Error('当前页面无法执行 SHA-256 校验，请使用 HTTPS 入口');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==D.model.sha256)throw new Error('源模型校验失败，已拒绝加载');
 const gltf=await new GLTFLoader().parseAsync(data.buffer,'');const box=new THREE.Box3().setFromObject(gltf.scene),center=box.getCenter(new THREE.Vector3()),extent=box.getSize(new THREE.Vector3());
 // Only an outer display wrapper is transformed. Source nodes, materials,
 // geometry, original UVs and animation data are never modified.
 const positioning=new THREE.Group();positioning.add(gltf.scene);positioning.position.copy(center).multiplyScalar(-1);aircraft=new THREE.Group();aircraft.add(positioning);aircraft.scale.setScalar(6.6/Math.max(extent.x,extent.y,extent.z));aircraft.name='ReadOnly_Authoritative_Asset';scene.add(aircraft);aircraft.visible=state.mode==='aircraft';qa.modelVerified=true;qa.modelBytes=size;qa.sourceExtent=extent.toArray();qa.animationClips=gltf.animations.length;$('assetStatus').textContent='源 GLB 大小与 SHA-256 均已核验 · 未修改';return aircraft;})();
 try{return await modelPromise;}catch(e){modelPromise=null;throw e;}
}
async function setMode(mode){state.mode=mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 sample.visible=mode==='sample';if(aircraft)aircraft.visible=mode==='aircraft';renderer.domElement.style.display=['sample','aircraft'].includes(mode)?'block':'none';$('photoView').style.display=mode==='photo'?'block':'none';$('knowledgeView').style.display=mode==='knowledge'?'block':'none';$('cameraTools').style.display=['sample','aircraft'].includes(mode)?'flex':'none';$('photoTools').style.display=mode==='photo'?'flex':'none';$('channels').classList.toggle('controls-disabled',mode!=='sample');$('materialControls').classList.toggle('controls-disabled',mode==='aircraft');
 const title={sample:'机鼻绘 · 三维材质样片',photo:'原照与提取蒙版 · 同像素对照',aircraft:'权威源模型 · 只读检查',knowledge:'小妈与材质方法 · 本轮实际接收'};
 $('viewTitle').textContent=title[mode];$('viewSubtitle').textContent=mode==='aircraft'?'保留源模型原涂装；“80 DAYS”绑定仍为 0%。':mode==='photo'?'拖动滚动查看。高亮仅覆盖本轮可见区域。':mode==='knowledge'?'资料阅读、网页实现与人工验收分别记录。':'独立曲面试片；图形保留照片透视，尚未做装机展平。';
 $('viewHint').textContent=mode==='aircraft'?'原节点、动画与材质保持不变':mode==='photo'?'黄色定位线 · 蒙版透明度可调':mode==='knowledge'?'方法已接入，跨软件实操待验证':'拖动旋转 · 滚轮缩放 · 右键平移';
 if(mode==='sample')cameraPreset('angle');if(mode==='aircraft'){cameraPreset('angle');$('viewBadge').textContent='源 GLB · 只读';$('loading').hidden=false;try{await loadAircraft();}catch(e){toast(e.message);qa.modelLoadError=e.message;}finally{$('loading').hidden=true;}}
}
function initKnowledge(){
 const cards=[
 ['01 · 小妈：固定比较条件','读取几何上下文技能卡和材料复核方法。相机、光照与材质分别控制；试片操作与源飞机隔离。','已实现：固定光照、三视角、独立试片、原资产 SHA-256 门禁。',D.sources.xiaoma],
 ['02 · Blender：高度、法线与 UV','官方 Normal Map 说明要求非颜色数据，切线法线与对应 UV 一致。高度求导与法线方向分别处理。','已实现：R1 高度求导函数接入，Canvas 行方向转换。Blender 软件实操未执行。',D.sources.blender],
 ['03 · 材料分区与有界起点','补充参考的材质规范将数值视为待验证起点，要求按部件分区、保留不确定性，并进行受控视角比较。','采用其区域蒙版与比较方法。未安装整套生成流程，未替换原飞机。',D.sources.materialReference],
 ['04 · Three.js：颜色管理','Base Color 采用 sRGB。粗糙度、法线、高度、金属与蒙版采用 NoColorSpace。','已实现：彩色与数据通道独立；曝光不写入 Base Color。',D.sources.three],
 ['05 · 历史证据与材料重建','黑白照片用于可见形状。深红口腔与橄榄色采用既有项目重建方向，具体色值和粗糙度仍待审。','遮挡区留空；不合并不同时间的旗标/炸弹；接缝与铆钉仅为材料试片示范。',D.sources.review]
 ];$('knowledgeView').innerHTML=cards.map(([t,a,b,url])=>`<article class="knowledge-card"><h3>${t}</h3><p>${a}</p><p>${b}</p><a href="${url}" target="_blank" rel="noopener">打开本项来源</a></article>`).join('');
}
function saveBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
function bind(){
 for(const id of ['rough','fade','wear','relief','exposure','opacity']){$(id).value=state[id];$(id+'Value').textContent=state[id].toFixed(2);}

 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));document.querySelectorAll('[data-channel]').forEach(b=>b.onclick=()=>setChannel(b.dataset.channel));document.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>setLight(b.dataset.light));document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>cameraPreset(b.dataset.camera));document.querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>{state.paint=b.dataset.paint;rebuildMaps();});
 let debounce;for(const id of ['rough','fade','wear','relief','exposure','opacity'])$(id).addEventListener('input',()=>{state[id]=Number($(id).value);$(id+'Value').textContent=state[id].toFixed(2);if(id==='exposure'){renderer.toneMappingExposure=state.exposure;return;}if(id==='relief'){proofMaterial.normalScale.setScalar(state.relief);return;}if(id==='opacity'){drawOverlay();return;}clearTimeout(debounce);debounce=setTimeout(rebuildMaps,110);});
 for(const id of ['art','grime','structure','overlay'])$(id).onchange=()=>{state[id]=$(id).checked;id==='overlay'?drawOverlay():rebuildMaps();};
 $('side').onchange=()=>{state.side=$('side').value;updatePhoto();updateSampleGeometry();rebuildMaps();if(state.mode==='sample')cameraPreset('angle');};
 $('spin').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('spin').setAttribute('aria-pressed',String(controls.autoRotate));};
 $('reset').onclick=()=>{Object.assign(state,defaults);$('side').value=state.side;for(const id of ['rough','fade','wear','relief','exposure','opacity']){$(id).value=state[id];$(id+'Value').textContent=state[id].toFixed(2);}for(const id of ['art','grime','structure','overlay'])$(id).checked=state[id];renderer.toneMappingExposure=state.exposure;updatePhoto();updateSampleGeometry();rebuildMaps();setLight(state.light);setMode('sample');toast('已恢复 V3.0 的起始参数');};
 const open=()=>{$('dialogPhoto').src=D.photos[state.side].data;$('photoDialog').showModal();};$('reference').onclick=open;$('openPhoto').onclick=open;$('closeDialog').onclick=()=>$('photoDialog').close();
 document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{$('photoStage').style.width=b.dataset.zoom==='fit'?'100%':`${D.photos[state.side].width*Number(b.dataset.zoom)}px`;});
 $('exportJson').onclick=()=>saveBlob(new Blob([JSON.stringify({schema:'b24-80-days-workbench@3.0',state,camera:{position:camera.position.toArray(),target:controls.target.toArray()},sourceModel:D.model.sha256,photo:D.photos[state.side].sha256,visualAcceptance:false,modelBinding:0,notes:'Independent review coupon. Photo-space mask is not registered aircraft UV.'},null,2)],{type:'application/json'}),'80-DAYS-V3-review-settings.json');
 $('exportPng').onclick=()=>{if(!['sample','aircraft'].includes(state.mode)){toast('请先切换到三维材质样片或原始机体');return;}renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(blob)saveBlob(blob,'80-DAYS-V3-review.png');});};
 window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.key.toLowerCase()==='f')cameraPreset('close');if(e.key.toLowerCase()==='r')cameraPreset('angle');});
}
function resize(){const el=$('viewport'),w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';camera.aspect=w/h;camera.updateProjectionMatrix();}
function tick(now){requestAnimationFrame(tick);if(document.hidden)return;controls.update();if(['sample','aircraft'].includes(state.mode)){renderer.render(scene,camera);qa.frames++;frames++;}if(now-frameTime>1000){const fps=Math.round(frames*1000/(now-frameTime));$('runtime').textContent=`${fps} FPS · ${renderer.info.render.calls} 次绘制`;qa.fps=fps;frameTime=now;frames=0;}}
async function start(){
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=state.exposure;$('viewport').prepend(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#151b1e');camera=new THREE.PerspectiveCamera(39,1,.05,5000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.10;controls.minDistance=2;controls.maxDistance=24;controls.autoRotateSpeed=.65;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
  lightKey=new THREE.DirectionalLight('#ffffff',3);lightFill=new THREE.DirectionalLight('#dce5e8',1);lightFill.position.set(-5,1,4);lightRim=new THREE.DirectionalLight('#eeead9',1);lightRim.position.set(4,3,-3);scene.add(lightKey,lightFill,lightRim);
  proofMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:1,metalness:1,clearcoat:0,side:THREE.FrontSide});flatMaterial=new THREE.ShaderMaterial({uniforms:{rawMap:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D rawMap;varying vec2 vUv;void main(){gl_FragColor=texture2D(rawMap,vUv);}',toneMapped:false});
  const loaded=await Promise.all(Object.entries(D.photos).map(async([k,v])=>[k,await image(v.data)]));for(const [k,v]of loaded)photoImages[k]=v;for(const k of ['port','starboard'])makeArtwork(k);
  updatePhoto();updateSampleGeometry();rebuildMaps();initKnowledge();setLight(state.light);cameraPreset('angle');bind();new ResizeObserver(resize).observe($('viewport'));resize();$('loading').hidden=true;qa.ready=true;qa.initMs=Math.round(performance.now()-initTime);qa.state=state;requestAnimationFrame(tick);
 }catch(e){qa.errors.push(e.message);$('loading').innerHTML='<b>工作台初始化未完成</b><span></span>';$('loading').querySelector('span').textContent=e.message;}
}
start();
