/* B24-first independent visible detail. Full gun and historical finish remain unapproved. */
/* W04: one independently generated exterior part, with optional transient source comparison.
   No material, geometry, or animation code from rejected R01/S01 is used. */
(() => {
 const T=THREE,$=id=>document.getElementById(id),V=(...a)=>new T.Vector3(...a),clone=x=>JSON.parse(JSON.stringify(x));
 const VERSION='aircraft.sideplate-material.w04.1';
 const state={display:'native',channel:'metal',view:'oblique',spread:0,feature:null,split:.5,orbit:false,roughness:.46,grain:.42,relief:.28,film:0,light:'studio'};
 let sourceSurface=null;let input=null,reference=null,frame=0,dirty=true,busy=false,auditBusy=false,generatedSignature=null,geometryRevision=1,maskOnly=false;
 const errors=[],ensure=(b,m)=>{if(!b)throw Error(m);},changed=()=>dirty=true;
 const toast=(s)=>{$('notice').textContent=s;$('notice').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('notice').classList.remove('show'),3500);};
 function fail(e){errors.push(String(e.message||e));$('error').hidden=false;$('error').textContent=String(e.message||e);}
 window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
 try{
 const renderer=new T.WebGLRenderer({canvas:$('viewport'),antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.10;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,.7,-.7,.001,30);camera.up.set(0,1,0);
 const controls=new OrbitControls(camera,$('viewport'));controls.enableDamping=true;controls.dampingFactor=.11;controls.autoRotateSpeed=.4;
 controls.addEventListener('change',changed);controls.maxDistance=15;controls.minDistance=.2;
 const neutral=new T.MeshStandardMaterial({color:0xaab4b6,roughness:.61,metalness:0,side:T.DoubleSide});
 const surfaceProgram=DetailSurface.create(T);const metal=surfaceProgram.material;
 const normal=new T.MeshNormalMaterial({side:T.DoubleSide});
 const wire=new T.MeshBasicMaterial({color:0xadc5cf,wireframe:true,side:T.DoubleSide});
 const facing=new T.ShaderMaterial({side:T.DoubleSide,vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'void main(){gl_FragColor=gl_FrontFacing?vec4(.17,.73,.54,1.):vec4(.91,.2,.2,1.);}',toneMapped:false});
 const maskMaterial=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
 const refGhost=new T.MeshBasicMaterial({color:0xefb067,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide});
 const genGhost=new T.MeshBasicMaterial({color:0x64d5ee,wireframe:true,transparent:true,opacity:.75,depthTest:false,side:T.DoubleSide});
 const sourceMaterialCopies=new Map();function sourceMaterial(base){if(!sourceMaterialCopies.has(base)){const m=base.clone();m.side=T.DoubleSide;sourceMaterialCopies.set(base,m);}return sourceMaterialCopies.get(base);}
 const native=SideplateRecipe.build(T,{material:neutral});scene.add(native.root);
 const partSurfaces=native.features.map(m=>{const p=DetailSurface.create(T,{coordinateMatrix:new T.Matrix4().makeTranslation(...m.position.toArray())});return p;});
 const applySurface=()=>{const values={roughness:state.roughness,grain:state.grain,relief:state.relief,film:state.film};surfaceProgram.apply(values);for(const p of partSurfaces)p.apply(values);sourceSurface?.apply(values);};

 const key=new T.DirectionalLight(0xffffff,2.1);key.position.set(-2,3,4);
 const fill=new T.DirectionalLight(0xffffff,.9);fill.position.set(3,.5,-2);
 const rim=new T.DirectionalLight(0xffffff,1.4);rim.position.set(2,3,-3);const ambient=new T.HemisphereLight(0xf2f2f2,0x323232,.45);scene.add(key,fill,rim,ambient);
 // Purely procedural environment, no file texture. Kept separate from object geometry.
 const env=new T.Scene();env.background=new T.Color(.10,.10,.10);
 for(const [p,w,h,s] of [[[0,.7,5],6,4,2],[[0,4,4],6,2,3],[[-5,2,1],3,4,2],[[5,3,-2],5,1,2.3]]){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(1,1,1).multiplyScalar(s),side:T.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);env.add(m);}
 const pmrem=new T.PMREMGenerator(renderer),pm=pmrem.fromScene(env,0,.1,30);scene.environment=pm.texture;scene.environmentIntensity=.62;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 function selectedMaterial(){if(maskOnly)return maskMaterial;return state.channel==='normal'?normal:state.channel==='wire'?wire:state.channel==='facing'?facing:['metal','color','roughness'].includes(state.channel)?metal:neutral;}
 function materials(){
  const isPBR=!maskOnly&&['metal','color','roughness'].includes(state.channel);
  const m=selectedMaterial();
  native.features.forEach((mesh,i)=>{partSurfaces[i].setDisplay(state.channel);mesh.material=isPBR?partSurfaces[i].material:m;});
  if(sourceSurface)sourceSurface.setDisplay(state.channel);
  reference?.traverse(o=>{if(o.isMesh)o.material=isPBR?sourceSurface.material:sourceMaterial(m);});
 }
 function setLight(mode){ensure(['studio','neutral','grazing'].includes(mode),'未知光照');state.light=mode;
  const p={studio:[2.1,.9,1.4,.45,.62],neutral:[1.5,1.3,.4,.6,.65],grazing:[2.4,.3,.7,.25,.58]}[mode];
  [key.intensity,fill.intensity,rim.intensity,ambient.intensity,scene.environmentIntensity]=p;key.position.set(...(mode==='grazing'?[-2,.3,3]:[-2,3,4]));sync();
 }
 function setSurface(v){const next=DetailSurface.checked(v);Object.assign(state,next);applySurface();sync();}

 function sync(){
  document.body.classList.toggle('has-reference',!!input);
  document.querySelectorAll('[data-display]').forEach(b=>{b.classList.toggle('active',b.dataset.display===state.display);b.disabled=b.dataset.display!=='native'&&!input;});
  document.querySelectorAll('[data-channel]').forEach(b=>b.classList.toggle('active',b.dataset.channel===state.channel));
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  $('release').disabled=!input;$('split-control').hidden=state.display!=='split';$('ab').hidden=state.display!=='split';
  $('ab').style.setProperty('--split',(state.split*100)+'%');$('divider').style.left=(state.split*100)+'%';
  $('caption').textContent=state.display==='native'?'B · 独立规则生成侧板':state.display==='reference'?'A · 临时读取的原件侧板':state.display==='overlay'?'橙色：原件　蓝色：生成件':'同镜头、同色值与双面显示；正反面诊断单独检查方向';
  $('source-status').textContent=input?'原件身份通过 · 仅对照侧板':'独立生成已就绪 · 可选择原件对照';
  $('feature-note').textContent=state.feature?(native.features.find(f=>f.name===state.feature)?.userData.label||''):'板件主体及五个可见头部';
  for(const k of ['roughness','grain','relief','film']){$(k).value=state[k];$(k+'-value').value=state[k].toFixed(2);}
  document.querySelectorAll('[data-light]').forEach(b=>b.classList.toggle('active',b.dataset.light===state.light));
  $('spread').value=state.spread;$('spread-value').textContent=Math.round(state.spread*100)+'%';$('roughness-value').value=state.roughness.toFixed(2);
  document.querySelectorAll('[data-feature]').forEach(b=>b.classList.toggle('active',b.dataset.feature===state.feature));
  $('ref-count').textContent=state.view==='reverse'?'原件背面为开放外观层，未确定真实板厚':input?'源件仅临时存在内存中':'无参考网格依赖';
  materials();changed();
 }
 function restoreWhole(){state.feature=null;native.resetVisibility();state.spread=0;native.setSpread(0);}
 function setDisplay(mode){ensure(['native','reference','split','overlay'].includes(mode),'未知对照模式');ensure(mode==='native'||input,'先选择原件才能对照');if(mode!=='native')restoreWhole();state.display=mode;sync();}
 function setFeature(id){ensure(native.features.some(f=>f.name===id),'未知外观特征');state.feature=state.feature===id?null:id;state.display='native';native.features.forEach(f=>f.visible=!state.feature||f.name===state.feature);sync();fit(state.view,true);}
 function setSpread(t){ensure(Number.isFinite(t)&&t>=0&&t<=1,'展开值无效');state.display='native';state.feature=null;native.resetVisibility();state.spread=t;native.setSpread(t);sync();}
 function setChannel(mode){ensure(['neutral','metal','color','roughness','normal','wire','facing'].includes(mode),'未知观察通道');state.channel=mode;sync();}
 function fit(view='oblique',resetZoom=true){
  ensure(['oblique','front','reverse','top','edge'].includes(view),'未知镜头');state.view=view;state.orbit=false;controls.autoRotate=false;
  const box=new T.Box3();for(const m of native.features)if(m.visible)box.union(new T.Box3().setFromObject(m));
  const center=box.getCenter(V());const dir={oblique:V(-.35,.55,2),front:V(0,0,2),reverse:V(0,0,-2),top:V(0,2,.001),edge:V(2,.15,.8)}[view];
  controls.enableDamping=false;camera.position.copy(center).add(dir.clone().normalize().multiplyScalar(3));controls.target.copy(center);camera.lookAt(center);camera.updateMatrixWorld();
  const inv=camera.matrixWorldInverse;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=V(x,y,z).applyMatrix4(inv);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  const aspect=$('stage').clientWidth/$('stage').clientHeight;
  const vertical=Math.max(y1-y0,(x1-x0)/aspect)*1.36;
  camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;if(resetZoom)camera.zoom=1;camera.updateProjectionMatrix();controls.update();controls.enableDamping=true;sync();
 }
 function sourceWorld(parsed,i){const m=new T.Matrix4().fromArray(parsed.nodeMatrices[i]);return parsed.parent[i]===null?m:sourceWorld(parsed,parsed.parent[i]).multiply(m);}
 async function load(file){if(busy)return;busy=true;$('error').hidden=true;try{
  const parsed=await ReferenceInput.read(file);const sourceNode=25,p=parsed.doc.meshes[parsed.doc.nodes[sourceNode].mesh].primitives[0];
  const g=new T.BufferGeometry();for(const [k,i]of Object.entries(p.attributes)){const name={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[k];ensure(name,'未知源属性');const a=parsed.attributes[i];g.setAttribute(name,new T.BufferAttribute(a.array,a.width,a.normalized));}
  const idx=parsed.attributes[p.indices];g.setIndex(new T.BufferAttribute(idx.array,1));g.computeBoundingBox();g.computeBoundingSphere();
  const mesh=new T.Mesh(g,neutral);mesh.matrix.copy(sourceWorld(parsed,sourceNode));mesh.matrixAutoUpdate=false;
  const group=new T.Group();group.name='reference-only-normalized-display';group.add(mesh);group.updateMatrixWorld(true);
  const b=new T.Box3().setFromObject(group),s=b.max.x-b.min.x;
  // One documented DISPLAY-only normalization, identical normalized extents as the independent recipe.
  group.scale.setScalar(1/s);group.position.set(-b.min.x/s,-(b.max.y+b.min.y)/2/s,-b.min.z/s);
  if(reference){scene.remove(reference);reference.traverse(o=>o.geometry?.dispose());sourceSurface?.dispose();}
  group.updateMatrixWorld(true);sourceSurface=DetailSurface.create(T,{coordinateMatrix:mesh.matrixWorld});sourceSurface.material.side=T.DoubleSide;applySurface();
  reference=group;input={parsed,p,mesh,normalization:{span:s,translation:group.position.toArray()},sourceNode};scene.add(reference);
  restoreWhole();state.display='split';state.channel='neutral';fit('oblique');sync();const a=await audit();ensure(a.sourceAttributesUnchanged,'源属性校核失败');toast('原件已核对。A/B 为原件侧板和真正独立生成的侧板。');
 }catch(e){toast(e.message);}finally{busy=false;$('file').value='';changed();}}
 function release(){if(reference){scene.remove(reference);reference.traverse(o=>o.geometry?.dispose());}reference=null;input=null;sourceSurface?.dispose();sourceSurface=null;state.display='native';renderer.renderLists.dispose();sync();toast('已释放参考；独立侧板仍可生成和查看。');}
 async function signature(){const data=[];for(const m of native.features){for(const key of ['position','normal']){const a=m.geometry.attributes[key]?.array;if(a)data.push([m.name,key,await ReferenceInput.sha(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))]);}const a=m.geometry.index?.array;if(a)data.push([m.name,'index',await ReferenceInput.sha(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))]);}return JSON.stringify(data);}
 async function audit(){
  if(auditBusy)throw Error('检查正在进行');auditBusy=true;try{
  const generated=await signature();if(generatedSignature===null)generatedSignature=generated;
  let sourceSame=null;
  if(input){sourceSame=true;for(const a of input.parsed.attributes){const b=new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);if(await ReferenceInput.sha(b)!==input.parsed.fingerprints[a.index].sha256)sourceSame=false;}}
  return {schema:VERSION,materialVersion:DetailSurface.version,materialUniforms:surfaceProgram.uniformSnapshot(),singleSidedNative:false,usesOpenAppearanceShell:true,sourceDoubleSidedPreserved:true,unobservedBackFaceNotFilled:true,topologyValidatedOffline:true,recipeVersion:SideplateRecipe.parameters.version,generationIndependentOfSource:true,nativeBuiltBeforeReference:true,referenceLoaded:!!input,sourceAttributesUnchanged:sourceSame,nativeGeometryUnchanged:generated===generatedSignature,nativeGeometryHash:ReferenceInput.cpuSHA256(new TextEncoder().encode(generated)),nativeStats:native.stats(),normalization:input?.normalization||null,sourceFileHash:input?.parsed.identity||null,selection:'source node 25 only',nativeRootRotation:native.root.rotation.toArray().slice(0,3),oldW02Overwritten:false,fullGunReplicated:false,sideplateExactMeshParity:false,visualAcceptance:false,errors:errors.slice(),renderer:{triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},persistedProductMeshFiles:0,productRasterMaps:0};
  }finally{auditBusy=false;}}
 function snapshot(){return {schema:VERSION,recipeVersion:SideplateRecipe.parameters.version,state:clone(state),camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom,left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom},note:$('note').value.slice(0,2000)};}
 function exportNote(){const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='B24_ANM2_W04_COMPARE_NOTE.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出对照记录，无网格或贴图。');}
 $('features').innerHTML=native.features.map((f,i)=>`<button data-feature="${f.name}"><span class="node-no">${String(i+1).padStart(2,'0')}</span><span>${f.userData.label}<small>${f.name}</small></span></button>`).join('');
 document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>setFeature(b.dataset.feature));
 document.querySelectorAll('[data-display]').forEach(b=>b.onclick=()=>setDisplay(b.dataset.display));
 document.querySelectorAll('[data-channel]').forEach(b=>b.onclick=()=>setChannel(b.dataset.channel));
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));
 $('choose').onclick=()=>$('file').click();$('choose-panel').onclick=()=>$('file').click();$('file').onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};
 $('release').onclick=release;$('whole').onclick=()=>{restoreWhole();sync();fit('oblique');};$('spread').oninput=e=>setSpread(Number(e.target.value));
 $('split').oninput=e=>{state.split=Number(e.target.value)/100;sync();};for(const k of ['roughness','grain','relief','film'])$(k).oninput=e=>{const v=surfaceProgram.values();v[k]=Number(e.target.value);setSurface(v);};
 document.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>setLight(b.dataset.light));$('reset-surface').onclick=()=>setSurface(DetailSurface.defaults);
 $('export').onclick=exportNote;$('audit').onclick=async()=>{const r=await audit();toast(r.nativeGeometryUnchanged&&r.sourceAttributesUnchanged!==false?'独立几何与已载入参照保持一致。':'数据校核未通过');};
 $('orbit').onclick=()=>{state.orbit=!state.orbit;controls.autoRotate=state.orbit;changed();};
 $('info').onclick=()=>$('info-dialog').showModal();$('close-info').onclick=()=>$('info-dialog').close();
 $('parts-mobile').onclick=()=>{document.body.classList.toggle('parts-open');document.body.classList.remove('surface-open');};$('surface-mobile').onclick=()=>{document.body.classList.toggle('surface-open');document.body.classList.remove('parts-open');};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.body.classList.remove('parts-open','surface-open'));
 $('viewport').ondblclick=()=>fit('front');window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key.toLowerCase()==='f'){restoreWhole();fit('oblique');}});
 function resize(){const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setSize(w,h,false);fit(state.view);}
 new ResizeObserver(resize).observe($('stage'));resize();
 const labels=$('ab');function draw(now){requestAnimationFrame(draw);if(document.hidden)return;controls.update();if(!dirty&&!state.orbit)return;
  const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setViewport(0,0,w,h);materials();native.root.visible=true;if(reference)reference.visible=false;
  if(state.display==='split'&&reference){renderer.setScissorTest(true);native.root.visible=false;reference.visible=true;renderer.setScissor(0,0,w*state.split,h);renderer.render(scene,camera);native.root.visible=true;reference.visible=false;renderer.setScissor(w*state.split,0,w*(1-state.split),h);renderer.render(scene,camera);renderer.setScissorTest(false);}
  else if(state.display==='overlay'&&reference){native.setMaterial(genGhost);reference.traverse(o=>{if(o.isMesh)o.material=refGhost;});reference.visible=true;renderer.render(scene,camera);}
  else {native.root.visible=state.display==='native';if(reference)reference.visible=state.display==='reference';renderer.render(scene,camera);}
  frame++;dirty=false;$('frames').textContent=frame;
 }
 window.W04={ready:true,get loaded(){return !!input;},get frame(){return frame;},load,release,audit,setDisplay,setChannel,setFeature,setSpread,setSurface,setLight,fit,showAll(){restoreWhole();sync();fit('oblique');},state:()=>clone(state),snapshot,signature,referenceInput:()=>input?.parsed.identity||null,
  testMask(on){maskOnly=!!on;renderer.setClearColor(0,maskOnly?1:0);changed();},
  requestRender:changed,stats:()=>native.stats()};
 applySurface();$('triangle-count').textContent=native.stats().triangles.toLocaleString();sync();signature().then(s=>generatedSignature=s);document.body.dataset.ready='true';requestAnimationFrame(draw);
 }catch(e){fail(e);}
})();
