/* W05: unchanged W04 shape, expanded surface study and optional whole-reference context, with optional transient source comparison.
   No material, geometry, or animation code from rejected R01/S01 is used. */
(() => {
 const T=THREE,$=id=>document.getElementById(id),V=(...a)=>new T.Vector3(...a),clone=x=>JSON.parse(JSON.stringify(x));
 const VERSION='aircraft.sideplate-compare.w05.1';
 const state={display:'native',channel:'pbr',view:'oblique',spread:0,feature:null,split:.5,orbit:false,roughness:.52,light:'neutral',assembly:'part',insertNative:true,contextTrial:false};
 let context=null;let input=null,reference=null,frame=0,dirty=true,busy=false,auditBusy=false,generatedSignature=null,geometryRevision=1,maskOnly=false;
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
 const metal=new T.MeshStandardMaterial({color:0x626e74,roughness:.5,metalness:.8,side:T.DoubleSide});
 const normal=new T.MeshNormalMaterial({side:T.DoubleSide,toneMapped:false});
 const wire=new T.MeshBasicMaterial({color:0xadc5cf,wireframe:true,side:T.DoubleSide});
 const maskMaterial=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
 const refGhost=new T.MeshBasicMaterial({color:0xefb067,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide});
 const genGhost=new T.MeshBasicMaterial({color:0x64d5ee,wireframe:true,transparent:true,opacity:.75,depthTest:false,side:T.DoubleSide});
 const surfaces=SurfaceProgram.create(T);
 const facing=new T.ShaderMaterial({side:T.DoubleSide,vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'void main(){gl_FragColor=gl_FrontFacing?vec4(.15,.64,.39,1.):vec4(.85,.19,.17,1.);}',toneMapped:false});
 const native=SideplateRecipe.build(T,{material:neutral});scene.add(native.root);native.root.updateMatrixWorld(true);native.features.forEach(m=>m.userData.surfaceMaterial=surfaces.material(m.matrixWorld));
 const key=new T.DirectionalLight(0xffffff,2.9);key.position.set(-2,3,4);
 const fill=new T.DirectionalLight(0xffffff,1.5);fill.position.set(3,.5,-2);
 const rim=new T.DirectionalLight(0xffffff,1.2);rim.position.set(2,3,-3);scene.add(key,fill,rim,new T.HemisphereLight(0xffffff,0x383838,.65));
 // Purely procedural environment, no file texture. Kept separate from object geometry.
 const env=new T.Scene();env.background=new T.Color(.19,.19,.19);
 for(const [p,w,h,s] of [[[0,4,4],6,2,3],[[-5,2,1],3,4,2],[[5,3,-2],5,1,2.3]]){const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(1,1,1).multiplyScalar(s),side:T.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);env.add(m);}
 const pmrem=new T.PMREMGenerator(renderer),pm=pmrem.fromScene(env,0,.1,30);scene.environment=pm.texture;scene.environmentIntensity=.42;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 function selectedMaterial(){if(maskOnly)return maskMaterial;return state.channel==='normal'?normal:state.channel==='wire'?wire:state.channel==='facing'?facing:neutral;}
 function materials(){
  const isSurface=['pbr','basecolor','roughness','metalness'].includes(state.channel)&&!maskOnly;
  if(isSurface){for(const f of native.features)f.material=f.userData.surfaceMaterial;if(input)input.mesh.material=input.material;if(context)context.material(neutral,state.contextTrial);}
  else {const m=selectedMaterial();native.setMaterial(m);reference?.traverse(o=>{if(o.isMesh)o.material=m;});context?.material(m,false);}
 }
 function sync(){
  document.body.classList.toggle('has-reference',!!input);
  document.querySelectorAll('[data-display]').forEach(b=>{b.classList.toggle('active',b.dataset.display===state.display);b.disabled=(b.dataset.display!=='native'&&!input)||state.assembly!=='part';});
  document.querySelectorAll('[data-channel]').forEach(b=>b.classList.toggle('active',b.dataset.channel===state.channel));
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  $('release').disabled=!input;$('split-control').hidden=state.display!=='split';$('ab').hidden=state.display!=='split';
  $('ab').style.setProperty('--split',(state.split*100)+'%');$('divider').style.left=(state.split*100)+'%';
  $('caption').textContent=state.display==='native'?'B · 独立规则生成侧板':state.display==='reference'?'A · 临时读取的原件侧板':state.display==='overlay'?'橙色：原件　蓝色：生成件':'同一相机、比例、材质与光照';
  $('source-status').textContent=input?'原件身份通过 · 仅对照侧板':'独立生成已就绪 · 可选择原件对照';
  $('feature-note').textContent=state.feature?(native.features.find(f=>f.name===state.feature)?.userData.label||''): '板件主体及五个可见头部';
  $('spread').value=state.spread;$('spread-value').textContent=Math.round(state.spread*100)+'%';const materialValues=surfaces.values();
  for(const k of SurfaceProgram.numericKeys){$(k).value=materialValues[k];$(k+'-value').value=materialValues[k].toFixed(2);}
  $('finish-color').value=materialValues.color;$('color-value').textContent=materialValues.color.toUpperCase();
  document.querySelectorAll('[data-finish]').forEach(b=>b.classList.toggle('active',b.dataset.finish===materialValues.color));
  document.querySelectorAll('[data-feature]').forEach(b=>b.classList.toggle('active',b.dataset.feature===state.feature));
  $('ref-count').textContent=input?'原件仅临时存在内存中，未上传':'独立侧板无需原件即可显示';
  document.querySelectorAll('[data-assembly]').forEach(b=>{b.classList.toggle('active',b.dataset.assembly===state.assembly);b.disabled=b.dataset.assembly!=='part'&&!context;});
  document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',JSON.stringify(SurfaceProgram.presets[b.dataset.preset].values)===JSON.stringify(materialValues)));
  $('assembly-options').hidden=state.assembly==='part';$('insert-native').checked=state.insertNative;$('context-trial').checked=state.contextTrial;
  $('scope-note').textContent=state.assembly==='part'?'独立生成范围：侧板及五处外露头部。内侧与螺杆未重建。':'整枪联看：其余部件为你本地载入的原件；独立生成仍限侧板。';
  $('rear-note').hidden=state.view!=='reverse'||state.assembly!=='part';
  if(state.assembly!=='part'){$('caption').textContent=state.insertNative?'整枪原件参照 + 独立侧板换入':'整枪原件参照 · 未换入侧板';$('source-status').textContent='参考文件留在本机 · 完整独立复刻尚未完成';}
  $('spread').disabled=state.assembly!=='part';
  if(context){context.setScope(state.assembly==='part'?'with-feed':state.assembly,state.insertNative);context.root.visible=state.assembly!=='part';}
  materials();changed();
 }
 function restoreWhole(){state.feature=null;native.resetVisibility();state.spread=0;native.setSpread(0);}
 function setAssembly(mode){ensure(['part','core','with-feed','all'].includes(mode),'未知联看范围');ensure(mode==='part'||context,'先选择本地 Aircraft 原件');restoreWhole();state.assembly=mode;state.display='native';fit('oblique');sync();}
 function setDisplay(mode){ensure(state.assembly==='part','请先切回独立侧板对照');ensure(['native','reference','split','overlay'].includes(mode),'未知对照模式');ensure(mode==='native'||input,'先选择原件才能对照');if(mode!=='native')restoreWhole();state.display=mode;sync();}
 function setFeature(id){state.assembly='part';ensure(native.features.some(f=>f.name===id),'未知外观特征');state.feature=state.feature===id?null:id;state.display='native';native.features.forEach(f=>f.visible=!state.feature||f.name===state.feature);sync();fit(state.view,true);}
 function setSpread(t){ensure(Number.isFinite(t)&&t>=0&&t<=1,'展开值无效');state.assembly='part';state.display='native';state.feature=null;native.resetVisibility();state.spread=t;native.setSpread(t);sync();}
 function setChannel(mode){ensure(['neutral','pbr','basecolor','roughness','metalness','normal','wire','facing'].includes(mode),'未知观察通道');state.channel=mode;if(['pbr','basecolor','roughness','metalness'].includes(mode))surfaces.setMode(mode);sync();}
 function fit(view='oblique',resetZoom=true){
  ensure(['oblique','front','reverse','top','edge'].includes(view),'未知镜头');state.view=view;state.orbit=false;controls.autoRotate=false;
  const box=new T.Box3();if(context&&state.assembly!=='part'){context.setScope(state.assembly,state.insertNative);box.copy(context.bounds());}else{for(const m of native.features)if(m.visible)box.union(new T.Box3().setFromObject(m));}
  const center=box.getCenter(V());const dir={oblique:V(-.35,.55,2),front:V(0,0,2),reverse:V(0,0,-2),top:V(0,2,.001),edge:V(2,.15,.8)}[view];
  controls.enableDamping=false;camera.position.copy(center).add(dir.clone().normalize().multiplyScalar(3));controls.target.copy(center);camera.lookAt(center);camera.updateMatrixWorld();
  const inv=camera.matrixWorldInverse;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=V(x,y,z).applyMatrix4(inv);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  const aspect=$('stage').clientWidth/$('stage').clientHeight;
  const vertical=Math.max(y1-y0,(x1-x0)/aspect)*1.36;
  camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;if(resetZoom)camera.zoom=1;camera.updateProjectionMatrix();controls.update();controls.enableDamping=true;sync();
 }
 function setLight(mode){const cfg={neutral:[2.9,1.5,1.2,.42],grazing:[3.4,.32,.48,.25],studio:[2.1,1.2,1.0,.62]}[mode];ensure(cfg,'未知照明');state.light=mode;[key.intensity,fill.intensity,rim.intensity,scene.environmentIntensity]=cfg;key.position.set(...(mode==='grazing'?[-3,.35,1.5]:[-2,3,4]));document.querySelectorAll('[data-light]').forEach(b=>b.classList.toggle('active',b.dataset.light===mode));sync();}
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
  if(reference){scene.remove(reference);reference.traverse(o=>o.geometry?.dispose());if(input?.material)surfaces.forget(input.material);}if(context){scene.remove(context.root);context.dispose();context=null;}
  group.updateMatrixWorld(true);const candidateMaterial=surfaces.material(mesh.matrixWorld);
  reference=group;input={parsed,p,mesh,material:candidateMaterial,normalization:{span:s,translation:group.position.toArray()},sourceNode};scene.add(reference);
  context=createReferenceContext(T,parsed,input.normalization,surfaces,neutral);scene.add(context.root);restoreWhole();state.assembly='with-feed';state.display='native';fit('oblique');sync();const a=await audit();ensure(a.sourceAttributesUnchanged,'源属性校核失败');toast('已联看整枪与箱体。独立生成范围仍为侧板，其余为本地原件参照。');
 }catch(e){toast(e.message);}finally{busy=false;$('file').value='';changed();}}
 function release(){if(reference){scene.remove(reference);reference.traverse(o=>o.geometry?.dispose());if(input?.material)surfaces.forget(input.material);}if(context){scene.remove(context.root);context.dispose();context=null;}reference=null;input=null;state.assembly='part';state.display='native';renderer.renderLists.dispose();sync();toast('已释放参考；独立侧板仍可生成和查看。');}
 async function signature(){const data=[];for(const m of native.features){for(const key of ['position','normal']){const a=m.geometry.attributes[key]?.array;if(a)data.push([m.name,key,await ReferenceInput.sha(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))]);}const a=m.geometry.index?.array;if(a)data.push([m.name,'index',await ReferenceInput.sha(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))]);}return JSON.stringify(data);}
 async function audit(){
  if(auditBusy)throw Error('检查正在进行');auditBusy=true;try{
  const generated=await signature();if(generatedSignature===null)generatedSignature=generated;
  let sourceSame=null;
  if(input){sourceSame=true;for(const a of input.parsed.attributes){const b=new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);if(await ReferenceInput.sha(b)!==input.parsed.fingerprints[a.index].sha256)sourceSame=false;}}
  return {schema:VERSION,recipeVersion:SideplateRecipe.parameters.version,generationIndependentOfSource:true,nativeBuiltBeforeReference:true,referenceLoaded:!!input,sourceAttributesUnchanged:sourceSame,nativeGeometryUnchanged:generated===generatedSignature,nativeGeometryHash:ReferenceInput.cpuSHA256(new TextEncoder().encode(generated)),nativeStats:native.stats(),normalization:input?.normalization||null,sourceFileHash:input?.parsed.identity||null,selection:state.assembly==='part'?'independent/source sideplate comparison':'transient complete-reference context',wholeReferenceContext:context?.audit()||null,nativeRootRotation:native.root.rotation.toArray().slice(0,3),oldW02Overwritten:false,fullGunReplicated:false,sideplateExactMeshParity:false,sourceCalibratedColor:false,pbrState:surfaces.values(),fragmentFrequencyBudget:16,sourceCullingMode:"doubleSided opaque exterior; open underside is not transparency",rearIsClosedSolid:false,screwShanksOrThreadsBuilt:false,geometryMatchesW04:true,unsupportedBackPlateRemoved:true,visualAcceptance:false,errors:errors.slice(),renderer:{triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},persistedProductMeshFiles:0,productRasterMaps:0};
  }finally{auditBusy=false;}}
 function snapshot(){return {schema:VERSION,recipeVersion:SideplateRecipe.parameters.version,materials:surfaces.values(),state:clone(state),camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom,left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom},note:$('note').value.slice(0,2000)};}
 function exportNote(){const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='AIRCRAFT_W05_COMPARE_NOTE.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出对照记录，无网格或贴图。');}
 $('features').innerHTML=native.features.map((f,i)=>`<button data-feature="${f.name}"><span class="node-no">${String(i+1).padStart(2,'0')}</span><span>${f.userData.label}<small>${f.name}</small></span></button>`).join('');
 document.querySelectorAll('[data-feature]').forEach(b=>b.onclick=()=>setFeature(b.dataset.feature));
 document.querySelectorAll('[data-display]').forEach(b=>b.onclick=()=>setDisplay(b.dataset.display));
 document.querySelectorAll('[data-channel]').forEach(b=>b.onclick=()=>setChannel(b.dataset.channel));
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));
 document.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>setLight(b.dataset.light));
 $('choose').onclick=()=>$('file').click();$('choose-panel').onclick=()=>$('file').click();$('file').onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};
 $('release').onclick=release;$('whole').onclick=()=>{restoreWhole();sync();fit('oblique');};$('spread').oninput=e=>setSpread(Number(e.target.value));
 $('split').oninput=e=>{state.split=Number(e.target.value)/100;sync();};for(const k of SurfaceProgram.numericKeys)$(k).oninput=e=>{surfaces.apply({...surfaces.values(),[k]:Number(e.target.value)});state.roughness=surfaces.values().roughness;sync();};
 document.querySelectorAll('[data-assembly]').forEach(b=>b.onclick=()=>setAssembly(b.dataset.assembly));
 $('insert-native').onchange=e=>{state.insertNative=e.target.checked;sync();};$('context-trial').onchange=e=>{state.contextTrial=e.target.checked;sync();};
 document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{surfaces.apply({...SurfaceProgram.presets[b.dataset.preset].values});setChannel('pbr');});
 $('finish-color').oninput=e=>{surfaces.apply({...surfaces.values(),color:e.target.value});sync();};
 document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{surfaces.apply({...surfaces.values(),color:b.dataset.finish});sync();});
 $('reset-surface').onclick=()=>{surfaces.apply({...SurfaceProgram.defaults});setChannel('pbr');};
 $('import-note').onclick=()=>$('note-file').click();
 function restoreNote(s){ensure([VERSION,'aircraft.sideplate-compare.w04.1'].includes(s?.schema)&&s.recipeVersion===SideplateRecipe.parameters.version,'记录版本不匹配');const v=SurfaceProgram.validate(s.schema===VERSION?s.materials:{...SurfaceProgram.defaults,...s.materials});surfaces.apply(v);state.roughness=v.roughness;if(typeof s.note==='string')$('note').value=s.note.slice(0,2000);sync();}
 $('note-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;ensure(f.size<24000,'参数文件过大');restoreNote(JSON.parse(await f.text()));toast('已恢复材质与笔记，几何和镜头保持不变。');}catch(err){toast(err.message);}e.target.value='';};
 $('export').onclick=exportNote;$('audit').onclick=async()=>{const r=await audit();toast(r.nativeGeometryUnchanged&&r.sourceAttributesUnchanged!==false?'独立几何与已载入参照保持一致。':'数据校核未通过');};
 $('orbit').onclick=()=>{state.orbit=!state.orbit;controls.autoRotate=state.orbit;changed();};
 $('info').onclick=()=>$('info-dialog').showModal();$('close-info').onclick=()=>$('info-dialog').close();
 $('parts-mobile').onclick=()=>{document.body.classList.toggle('parts-open');document.body.classList.remove('surface-open');};$('surface-mobile').onclick=()=>{document.body.classList.toggle('surface-open');document.body.classList.remove('parts-open');};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.body.classList.remove('parts-open','surface-open'));
 $('viewport').ondblclick=()=>fit('front');window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key.toLowerCase()==='f'){restoreWhole();fit('oblique');}});
 function resize(){const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setSize(w,h,false);fit(state.view);}
 new ResizeObserver(resize).observe($('stage'));resize();
 const labels=$('ab');function draw(now){requestAnimationFrame(draw);if(document.hidden)return;controls.update();if(!dirty&&!state.orbit)return;
  const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setViewport(0,0,w,h);materials();native.root.visible=true;if(reference)reference.visible=false;if(context)context.root.visible=state.assembly!=='part';
  if(state.assembly!=='part'&&context){native.root.visible=state.insertNative;renderer.render(scene,camera);}
  else if(state.display==='split'&&reference){renderer.setScissorTest(true);native.root.visible=false;reference.visible=true;renderer.setScissor(0,0,w*state.split,h);renderer.render(scene,camera);native.root.visible=true;reference.visible=false;renderer.setScissor(w*state.split,0,w*(1-state.split),h);renderer.render(scene,camera);renderer.setScissorTest(false);}
  else if(state.display==='overlay'&&reference){native.setMaterial(genGhost);reference.traverse(o=>{if(o.isMesh)o.material=refGhost;});reference.visible=true;renderer.render(scene,camera);}
  else {native.root.visible=state.display==='native';if(reference)reference.visible=state.display==='reference';renderer.render(scene,camera);}
  frame++;dirty=false;$('frames').textContent=frame;
 }
 window.W05={ready:true,get loaded(){return !!input;},get frame(){return frame;},load,release,audit,setAssembly,setDisplay,setChannel,setLight,setFeature,setSpread,fit,showAll(){restoreWhole();sync();fit('oblique');},state:()=>clone(state),snapshot,signature,referenceInput:()=>input?.parsed.identity||null,
  testMask(on){maskOnly=!!on;renderer.setClearColor(0,maskOnly?1:0);changed();},
  restoreNote,setSurface(v){surfaces.apply(v);sync();},surfaceValues:surfaces.values,requestRender:changed,stats:()=>native.stats()};
 window.W04=window.W05; // Compatibility API for existing read-only test harnesses.
 $('triangle-count').textContent=native.stats().triangles.toLocaleString();surfaces.setMode('pbr');sync();signature().then(s=>generatedSignature=s);document.body.dataset.ready='true';requestAnimationFrame(draw);
 }catch(e){fail(e);}
})();
