// S01: isolated visual study. Build injects pinned THREE, OrbitControls and WMState.
// The source mesh, UVs, normals, node identities and transforms are never edited.
const $ = id => document.getElementById(id);
const names = ['wear','oil','oxidation','roughness','detail'];
const presetValues = Object.freeze({balanced:{wear:.32,oil:.28,oxidation:.12,roughness:.50,detail:.68},dry:{wear:.16,oil:.02,oxidation:.20,roughness:.76,detail:.58},oiled:{wear:.22,oil:.82,oxidation:.03,roughness:.30,detail:.48}});
const channelIDs = {surface:0,color:1,roughness:2,normal:3,uv:4,wire:5};
let model,renderer,camera,controls,scene,asset,sourceArrays,materialRecords=[],surfaceValues={...presetValues.balanced};
let channel='surface', light='studio', compared=false, split=.5, ready=false, paused=false, currentView='hero';
let renders=0,frameTimes=[],integrityBefore,toastTimer,poseAnimation;
let lastFrameTime=0;
const clone = x => JSON.parse(JSON.stringify(x));
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function errorOut(error){console.error(error);$('loading').classList.add('hidden');$('runtime-error').hidden=false;$('runtime-error').textContent='三维观察未能完成初始化。\n'+String(error.message||error)+'\n本页没有加载替代模型。';$('status').textContent='运行受阻';}
window.addEventListener('error',e=>errorOut(e.error||e.message));window.addEventListener('unhandledrejection',e=>errorOut(e.reason));
function bytes64(text){const s=atob(text),b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b;}
async function sha(bytes){if(!crypto.subtle)throw new Error('当前浏览器缺少源数据校验接口');const b=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function valuesChecked(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==names.length)throw new Error('参数字段不匹配');const out={};for(const n of names){const spec=WMState.PARAMS[n];if(typeof v[n]!=='number'||!Number.isFinite(v[n])||v[n]<spec.min||v[n]>spec.max)throw new Error('参数范围错误：'+n);out[n]=v[n];}return out;}
function applyValues(v){surfaceValues=valuesChecked(v);for(const n of names){$(n).value=surfaceValues[n];$(n+'-value').value=surfaceValues[n].toFixed(2);$(n).style.setProperty('--fill',`${surfaceValues[n]*100}%`);}for(const r of materialRecords){for(const n of names)r.uniforms['wm_'+n].value=surfaceValues[n];r.candidate.clearcoat=.36*surfaceValues.oil;r.candidate.clearcoatRoughness=.25;}
$('status').textContent='候选表面参数已更新';document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('selected',JSON.stringify(presetValues[b.dataset.preset])===JSON.stringify(surfaceValues)));}
function snapshot(){return {schema:'wm.surface-studio-s01/1',sourceLock:clone(asset.receipt.sourceLock),values:clone(surfaceValues),scope:'historical visual sample only'};}
function restore(s){if(!s||s.schema!=='wm.surface-studio-s01/1')throw new Error('此记录不属于 S01');const k=['revision','geometrySha256','uvSha256','nodeGraphSha256'];if(!s.sourceLock||!k.every(x=>s.sourceLock[x]===asset.receipt.sourceLock[x]))throw new Error('来源不一致，未载入参数');const next=valuesChecked(s.values);applyValues(next);}
// View-independent fields use source-local positions. No texture or geometry baking.
const fieldGLSL = `
uniform float wm_wear,wm_oil,wm_oxidation,wm_roughness,wm_detail;
varying vec3 wmP; varying vec3 wmN; varying vec2 wmUV;
uniform vec3 wmBase;uniform float wmHasUV;
float wmHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float wmNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(wmHash(i),wmHash(i+vec3(1,0,0)),f.x),mix(wmHash(i+vec3(0,1,0)),wmHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(wmHash(i+vec3(0,0,1)),wmHash(i+vec3(1,0,1)),f.x),mix(wmHash(i+vec3(0,1,1)),wmHash(i+vec3(1)),f.x),f.y),f.z);}
float wmFbm(vec3 p){return .56*wmNoise(p)+.28*wmNoise(p*2.03+17.)+.16*wmNoise(p*4.11+43.);}
vec4 wmFields(vec3 p){
 float macro=wmFbm(p*16.0+vec3(4.2,19.5,31.1));
 float exposed=wm_wear*smoothstep(.53,.77,wmFbm(p*66.+vec3(27.,8.,2.)));
 float oilmask=wm_oil*smoothstep(.35,.70,macro);
 float oxide=wm_oxidation*smoothstep(.61,.81,wmFbm(p*55.+vec3(91.,4.,18.)))*(1.-exposed);
 float footprint=max(length(dFdx(p)),length(dFdy(p)));
 float aa=1.-smoothstep(.001,.0045,footprint);
 float fine=wmNoise(p*720.);
 float brushed=wmNoise(vec3(p.x*24.,p.y*950.,p.z*950.));
 float grain=((fine-.5)*.075+(brushed-.5)*.052)*wm_detail*aa;
 float rough=clamp(.20+.56*wm_roughness+grain+.085*(macro-.5)-exposed*.14-oilmask*.19+oxide*.26,.14,.94);
 return vec4(exposed,oilmask,oxide,rough);
}
vec3 wmColor(vec3 base,vec4 f){vec3 c=base; c*=.88+.20*wmFbm(wmP*120.+8.);c=mix(c,vec3(.19,.205,.197),f.x*.72);c=mix(c,vec3(.060,.022,.009),f.z*.78);c*=1.-f.y*.12;return c;}
`;
const diagnosticVertex = `varying vec3 wmP;varying vec3 wmN;varying vec2 wmUV;void main(){wmP=position;wmN=normal;wmUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const diagnosticFragment = fieldGLSL+`
uniform float wmMode;
void main(){vec4 f=wmFields(wmP);vec3 c=wmColor(wmBase,f);
 if(wmMode>1.5&&wmMode<2.5)c=vec3(f.w);
 if(wmMode>2.5&&wmMode<3.5)c=normalize(wmN)*.5+.5;
 if(wmMode>3.5){vec2 q=wmUV*24.;vec2 fw=fwidth(q);float ch=mod(floor(q.x)+floor(q.y),2.);vec2 edge=min(fract(q),1.-fract(q));float grid=1.-smoothstep(0.,max(fw.x,fw.y)*1.2,min(edge.x,edge.y));c=mix(vec3(.045,.11,.09),vec3(.45,.57,.35),ch);c=mix(c,vec3(.70,.63,.32),grid*.28);if(wmHasUV<.5)c=vec3(.23,.23,.23);}
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
}`;
function makeMaterials(meta,hasUV){const p=meta.pbrMetallicRoughness,base=new THREE.Color().fromArray(p.baseColorFactor);const source=new THREE.MeshStandardMaterial({color:base.clone(),metalness:p.metallicFactor,roughness:p.roughnessFactor});source.name=meta.name+'.source';
const uniforms={wmBase:{value:base.clone()},wmHasUV:{value:hasUV?1:0},wmMode:{value:0}};for(const n of names)uniforms['wm_'+n]={value:surfaceValues[n]};
const candidate=new THREE.MeshPhysicalMaterial({color:base.clone(),metalness:p.metallicFactor,roughness:.50,clearcoat:.12,clearcoatRoughness:.25});candidate.name=meta.name+'.S01';
candidate.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader='varying vec3 wmP;varying vec3 wmN;varying vec2 wmUV;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwmP=position;wmN=normal;wmUV=uv;');s.fragmentShader=fieldGLSL+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec4 wmF=wmFields(wmP);diffuseColor.rgb=wmColor(diffuseColor.rgb,wmF);');s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=wmF.w;');};
candidate.customProgramCacheKey=()=> 'WM-S01-LOCAL-FIELDS-1';
const diagnostic=new THREE.ShaderMaterial({uniforms,vertexShader:diagnosticVertex,fragmentShader:diagnosticFragment});
const wire=new THREE.MeshBasicMaterial({color:0xabc39a,wireframe:true,transparent:true,opacity:.8});
return {source,candidate,diagnostic,wire,uniforms};}
function typedAccessor(a){const constructors={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};const b=sourceArrays[a.sourceAccessor];const c=constructors[a.componentType];const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};return new THREE.BufferAttribute(new c(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),widths[a.type],!!a.normalized);}
async function createModel(){const nodes=asset.nodes.map((node,ni)=>{const o=new THREE.Group();o.name=node.name||'source-node-'+ni;o.userData.sourceNode=ni;
if(node.matrix){o.matrix.fromArray(node.matrix);o.matrixAutoUpdate=false;}else{if(node.translation)o.position.fromArray(node.translation);if(node.rotation)o.quaternion.fromArray(node.rotation);if(node.scale)o.scale.fromArray(node.scale);}
if(node.mesh!==undefined){const meshData=asset.meshes[node.mesh];for(const p of meshData.primitives){const g=new THREE.BufferGeometry();const map={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',TEXCOORD_1:'uv1',TANGENT:'tangent',COLOR_0:'color'};for(const [sem,idx] of Object.entries(p.attributes)){if(!map[sem])throw new Error('Unsupported semantic: '+sem);g.setAttribute(map[sem],typedAccessor(asset.accessors[idx]));}g.setIndex(typedAccessor(asset.accessors[p.indices]));g.computeBoundingBox();g.computeBoundingSphere();const record=makeMaterials(asset.materials[p.material],!!g.attributes.uv);const mesh=new THREE.Mesh(g,record.candidate);mesh.name=node.name+'.visual';mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.sourceNode=ni;mesh.userData.sourcePrimitive=clone(p);mesh.userData.surfaceId=asset.materials[p.material].extras?.surface_id;record.mesh=mesh;materialRecords.push(record);o.add(mesh);}}return o;});asset.nodes.forEach((node,i)=>{for(const child of node.children||[])nodes[i].add(nodes[child]);});model=nodes[asset.root];scene.add(model);model.updateMatrixWorld(true);integrityBefore=await runtimeGeometryHash();}
async function runtimeGeometryHash(){const hashes=[];for(const r of materialRecords){const p=r.mesh.userData.sourcePrimitive;for(const [sem,i] of Object.entries(p.attributes)){const map={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',TEXCOORD_1:'uv1',TANGENT:'tangent',COLOR_0:'color'};const a=r.mesh.geometry.attributes[map[sem]].array;hashes.push([i,await sha(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))]);}const a=r.mesh.geometry.index.array;hashes.push([p.indices,await sha(new Uint8Array(a.buffer,a.byteOffset,a.byteLength))]);}hashes.sort((a,b)=>a[0]-b[0]);return hashes;}
function buildEnvironment(){// Procedural studio light rig, independent of product geometry.
 const envScene=new THREE.Scene();envScene.background=new THREE.Color(.12,.145,.13);
 const room=new THREE.Mesh(new THREE.BoxGeometry(9,9,9),new THREE.MeshBasicMaterial({color:new THREE.Color(.19,.21,.19),side:THREE.BackSide}));envScene.add(room);
 const panel=(w,h,pos,intensity,tint)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(tint).multiplyScalar(intensity),side:THREE.DoubleSide}));m.position.set(...pos);m.lookAt(0,0,0);envScene.add(m);};
 panel(5.5,2.8,[0,1.4,3.8],3.4,0xf3f1de);panel(5.5,1.6,[0,-3.8,1.4],2.9,0xe8f3ed);panel(3.3,1.8,[0,3.5,.7],2.0,0xc1d7ce);panel(1.0,3.0,[-4,0,1],2.6,0xf3e3c3);
 const pmrem=new THREE.PMREMGenerator(renderer);const target=pmrem.fromScene(envScene,.08,.1,30);scene.environment=target.texture;pmrem.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
}
let keyLight,fillLight,rimLight,ambientLight,floor;
function setLight(mode){light=mode;const l={studio:[2.0,.60,1.2,.32],neutral:[1.7,.95,.35,.55],grazing:[2.2,.20,.8,.20]}[mode];if(!l)throw new Error('Unknown light');[keyLight.intensity,fillLight.intensity,rimLight.intensity,ambientLight.intensity]=l;keyLight.position.set(...(mode==='grazing'?[-1.7,-2.7,.4]:[-.5,-1.7,3.0]));scene.environmentIntensity=mode==='neutral'?.70:mode==='grazing'?.45:.82;document.querySelectorAll('[data-light]').forEach(b=>b.classList.toggle('selected',b.dataset.light===mode));}
function setMaterials(useSource=false){for(const r of materialRecords){r.uniforms.wmMode.value=channelIDs[channel];r.mesh.material=channel==='wire'?r.wire:channel==='surface'?(useSource?r.source:r.candidate):r.diagnostic;}}
function setChannel(mode){if(!(mode in channelIDs))throw new Error('Unknown channel');channel=mode;if(mode!=='surface'){compared=false;syncCompare();}document.querySelectorAll('[data-channel]').forEach(b=>b.classList.toggle('selected',b.dataset.channel===mode));const labels={surface:'SOURCE-BOUND MATERIAL STUDY',color:'BASE COLOR / 无光照干扰',roughness:'ROUGHNESS / 显示范围 0 至 1',normal:'SOURCE NORMALS / 原始法线未改写',uv:'SOURCE UV / 无 UV 的源件显示为灰色',wire:'TRIANGLES / 源拓扑未改写'};$('channel-caption').textContent=labels[mode];setMaterials();}
function syncCompare(){$('compare').setAttribute('aria-pressed',String(compared));$('compare-overlay').hidden=!compared;$('divider').style.left=`${split*100}%`;}
function setView(view,animate=true){currentView=view;controls.autoRotate=false;$('rotate').setAttribute('aria-pressed','false');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3());let target=center.clone(),direction=new THREE.Vector3(-.85,-2.8,1.2),extent=box.getSize(new THREE.Vector3());
 if(view==='side')direction.set(0,-3,.12);
 if(view==='top')direction.set(0,-.08,3);
 if(view==='detail'){target.set(-.24,-.01,.01);direction.set(-.25,-1,.48);extent.set(.63,.30,.23);}
 const aspect=renderer.domElement.clientWidth/renderer.domElement.clientHeight;const vertFov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vertFov/2)*aspect);
 let distance=Math.max(extent.x/(2*Math.tan(hfov/2)),extent.z/(2*Math.tan(vertFov/2)))*1.18;
 if(view==='hero'){distance*=.96;target.z-=.035;}
 if(aspect<.72&&view==='hero'){direction.set(-1.45,-2.8,1.45);distance*=.85;target.z+=.03;}
 if(view==='detail')distance*=.97;
 const dest=target.clone().addScaledVector(direction.normalize(),distance);camera.near=.002;camera.far=60;camera.updateProjectionMatrix();controls.minDistance=.13;controls.maxDistance=12;
 if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){poseAnimation={start:performance.now(),from:camera.position.clone(),to:dest,tf:controls.target.clone(),tt:target};}else{camera.position.copy(dest);controls.target.copy(target);controls.update();}
 $('focus-caption').textContent=view==='detail'?'SURFACE DETAIL':'AN/M2 CORE';$('focus-detail').textContent=view==='detail'?'源接收器外观 / 材质细节':'8 个源网格 / 仅外观观察';}
function resize(){const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(t){requestAnimationFrame(animate);if(!ready||paused)return;const dt=lastFrameTime?Math.min((t-lastFrameTime)/1000,.05):.016;lastFrameTime=t;if(poseAnimation){const a=poseAnimation;const q=Math.min((t-a.start)/500,1),e=1-Math.pow(1-q,3);camera.position.lerpVectors(a.from,a.to,e);controls.target.lerpVectors(a.tf,a.tt,e);if(q===1)poseAnimation=null;}
 controls.update(dt);renderer.setScissorTest(false);const w=$('stage').clientWidth,h=$('stage').clientHeight;renderer.setViewport(0,0,w,h);
 if(compared&&channel==='surface'){renderer.setScissorTest(true);renderer.setScissor(0,0,w*split,h);setMaterials(true);renderer.render(scene,camera);renderer.setScissor(w*split,0,w*(1-split),h);setMaterials(false);renderer.render(scene,camera);renderer.setScissorTest(false);}else{setMaterials(false);renderer.render(scene,camera);}renders++;frameTimes.push(t);while(frameTimes.length&&frameTimes[0]<t-1000)frameTimes.shift();if(renders%20===0)$('fps').textContent=String(frameTimes.length);}
function bindUI(){for(const n of names)$(n).addEventListener('input',()=>{try{applyValues({...surfaceValues,[n]:Number($(n).value)});}catch(e){toast(e.message);}});
 document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>applyValues(presetValues[b.dataset.preset]));document.querySelectorAll('[data-channel]').forEach(b=>b.onclick=()=>setChannel(b.dataset.channel));document.querySelectorAll('[data-light]').forEach(b=>b.onclick=()=>setLight(b.dataset.light));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
 $('exposure').oninput=()=>{renderer.toneMappingExposure=Number($('exposure').value);$('exposure-value').value=renderer.toneMappingExposure.toFixed(2);$('exposure').style.setProperty('--fill',`${(renderer.toneMappingExposure-.5)/1.3*100}%`);};
 $('compare').onclick=()=>{if(channel!=='surface')setChannel('surface');compared=!compared;syncCompare();};$('split').oninput=()=>{split=Number($('split').value)/100;syncCompare();};
 $('rotate').onclick=()=>{poseAnimation=null;controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));};$('reset-view').onclick=()=>setView('hero');$('reset-material').onclick=()=>{applyValues(presetValues.balanced);toast('已恢复 S01 初始材质，镜头与光照保持不变');};
 $('open-panel').onclick=()=>{$('panel').classList.add('open');$('close-panel').focus();};$('close-panel').onclick=()=>{$('panel').classList.remove('open');$('open-panel').focus();};
 $('source-info').onclick=()=>{$('source-dialog').showModal();};$('close-source').onclick=()=>$('source-dialog').close();$('source-dialog').onclick=e=>{if(e.target===$('source-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
 $('full-screen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('浏览器未开放全屏，仍可正常观察');}};
 $('save-state').onclick=()=>{const b=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='WM_SURFACE_S01_PARAMETERS.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('参数记录已导出，绑定当前样本来源');};$('load-state').onclick=()=>$('state-file').click();$('state-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>100000)throw new Error('参数文件过大');restore(JSON.parse(await f.text()));toast('来源一致，参数已载入');}catch(err){toast(err.message);}finally{e.target.value='';}};
 window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!$('source-dialog').open)setView('hero');});document.addEventListener('visibilitychange',()=>{paused=document.hidden;lastFrameTime=0;});new ResizeObserver(()=>resize()).observe($('stage'));
 $('viewport').addEventListener('dblclick',e=>{const rect=$('viewport').getBoundingClientRect(),v=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(v,camera);const hit=ray.intersectObject(model,true)[0];if(hit){controls.target.copy(hit.point);controls.update();poseAnimation=null;toast('镜头已聚焦到所选表面');}});
}
async function start(){if(!window.DecompressionStream)throw new Error('需要支持 DecompressionStream 的现代浏览器');const raw=bytes64($('packed-asset').textContent.trim());const stream=new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));asset=JSON.parse(await new Response(stream).text());
 sourceArrays={};await Promise.all(Object.values(asset.accessors).map(async a=>{const bytes=bytes64(a.base64);if(bytes.byteLength!==a.byteLength||await sha(bytes)!==a.sha256)throw new Error('几何访问器校验失败');sourceArrays[a.sourceAccessor]=bytes;}));
 $('load-state-text').textContent='源访问器已核验，建立光照与材质';
 renderer=new THREE.WebGLRenderer({canvas:$('viewport'),antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.002,60);camera.up.set(0,0,1);camera.position.set(0,-3,1.3);controls=new OrbitControls(camera,$('viewport'));controls.enableDamping=true;controls.dampingFactor=.09;controls.autoRotateSpeed=.35;controls.maxPolarAngle=Math.PI*.96;
 const floorMat=new THREE.ShadowMaterial({color:0x000a04,opacity:.25});floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),floorMat);floor.position.z=-.145;floor.receiveShadow=true;scene.add(floor);
 keyLight=new THREE.DirectionalLight(0xfaf4df,2);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-1.4,right:1.4,top:1.2,bottom:-1.2,near:.1,far:10});keyLight.shadow.bias=-.00015;keyLight.shadow.normalBias=.001;keyLight.shadow.radius=4;
 fillLight=new THREE.DirectionalLight(0xdbe9e4,.6);fillLight.position.set(1.2,-.8,.5);rimLight=new THREE.DirectionalLight(0xb9d4c8,1.2);rimLight.position.set(.5,2.5,1.7);ambientLight=new THREE.HemisphereLight(0xd3e0d0,0x263726,.32);scene.add(keyLight,fillLight,rimLight,ambientLight);
 buildEnvironment();await createModel();resize();setLight('studio');applyValues(presetValues.balanced);setView('hero',false);bindUI();
 $('source-receipt').textContent=JSON.stringify(asset.receipt,null,2);$('integrity-summary').textContent=`${asset.receipt.accessorCount} 项校验通过`;$('triangle-count').textContent=(asset.receipt.triangles/1000).toFixed(1)+'k';$('status').textContent='源几何保留 · 表面候选就绪';$('loading').classList.add('hidden');ready=true;document.body.dataset.ready='true';
 window.__WM_STUDIO__={get ready(){return ready;},get renders(){return renders;},snapshot,restore,applyValues,setChannel,setView,setLight,
  async audit(){const after=await runtimeGeometryHash();return {sourceMatch:JSON.stringify(after)===JSON.stringify(integrityBefore),accessors:after.length,sourceIdentity:clone(asset.receipt.sourceLock),productionReady:false,productSceneRendered:renderer.info.render.triangles>0,nodeTransformsUnchanged:asset.nodes.every((n,i)=>{const o=model.getObjectByName(n.name);if(!o)return false;if(n.matrix)return JSON.stringify(o.matrix.toArray())===JSON.stringify(n.matrix);return true;}),renderer:{memory:{...renderer.info.memory},render:{...renderer.info.render},programs:renderer.info.programs?.length},exactAccessorMatch:after.every(([i,h])=>h===asset.accessors[i].sha256),viewport:[$('stage').clientWidth,$('stage').clientHeight],runtimeGLBLoads:0,productRasterMaps:0};},
  state(){return {channel,light,compared,split,currentView,exposure:renderer.toneMappingExposure,values:clone(surfaceValues),camera:camera.position.toArray(),target:controls.target.toArray(),autoRotate:controls.autoRotate,sourceRevision:asset.receipt.sourceRevision};},
  setComparison(value){compared=!!value;if(compared)setChannel('surface');compared=!!value;syncCompare();},
  sourceReceipt:clone(asset.receipt)
 };
 requestAnimationFrame(animate);
}
start().catch(errorOut);
