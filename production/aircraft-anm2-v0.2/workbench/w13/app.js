(() => {
  const T=THREE,$=id=>document.getElementById(id),stage=$('stage');
  let reference=null,activeRegion='assembly',activeView='oblique',mode='neutral',showDatums=false,ready=false;
  const material=new T.MeshStandardMaterial({color:0x87979f,metalness:0,roughness:.72,side:T.DoubleSide});
  const maskMaterial=new T.MeshBasicMaterial({color:0x273e49,side:T.DoubleSide});
  const frameColor=0xe2e7e9;
  const native=NativeGeometry.create(T,EXTERIOR_RECIPE,material);
  SupplyGeometry.create(T,native,material);
  const accessories=AccessoryProgram.create(T,native,material);
  const dna=ObjectDNA.create(T,native);
  const markings=MarkingProgram.create(T,native,dna);
  native.root.traverse(m=>{if(m.isMesh&&m.userData.keepSurfaceMaterial)m.userData.originalSurfaceMaterial=m.material;});
  let sourceOnly=false,selectedId="";
  const scenes=[new T.Scene(),new T.Scene()];
  const gridGroups=[];
  for(const scene of scenes){
    scene.background=new T.Color(frameColor);
    scene.add(new T.HemisphereLight(0xffffff,0x75818a,2.2));
    const key=new T.DirectionalLight(0xfffcf5,2.7);key.position.set(2,5,4);scene.add(key);
    const fill=new T.DirectionalLight(0xd8edff,1.2);fill.position.set(-3,1,-4);scene.add(fill);
    const g=new T.Group();g.visible=false;scene.add(g);gridGroups.push(g);
    const line=(a,b,color)=>{const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(...a),new T.Vector3(...b)]);const m=new T.Line(geo,new T.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.65}));m.renderOrder=8;g.add(m);};
    line([-1.15,0,0],[1.76,0,0],0x4d8b9e);line([0,-.20,0],[0,.23,0],0xb18657);line([0,0,-.18],[0,0,.18],0x8d7b9c);
    for(const x of [-1,0]){line([x,-.17,-.1],[x,.18,-.1],0x789ba9);line([x,.18,-.1],[x,.18,.11],0x789ba9);}
  }
  scenes[1].add(native.root);
  const surface=SurfaceProgram.create(T,native);let comparing=false;

  const hosts=[$('reference-canvas'),$('native-canvas')];
  let renderers;
  try{renderers=hosts.map(host=>{const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio||1,1.75));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.1;r.localClippingEnabled=true;host.appendChild(r.domElement);return r;});}
  catch(error){$('notice').textContent='此浏览器未能创建 WebGL 视图。请在支持 WebGL 的浏览器打开。';$('notice').classList.add('visible');window.reviewError=String(error);return;}
  // Small generated studio environment gives metal a readable reflected surroundings.
  // Used only for authored surface preview; neutral comparison materials stay unchanged.
  const studio=new T.Scene();studio.background=new T.Color(0x7d8991);
  const panel=(position,scale,color)=>{const m=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color}));m.position.set(...position);m.scale.set(...scale);studio.add(m);};
  panel([0,4,0],[7,.1,5],0xffffff);panel([1,0,5],[5,3,.1],0xdfe8ec);panel([-4,0,-2],[.1,4,3],0x424c57);
  const pmrem=new T.PMREMGenerator(renderers[1]),environment=pmrem.fromScene(studio,.06,.1,30);[...surface.materials,...markings.materials].forEach(m=>{m.envMap=environment.texture;m.envMapIntensity=.60;});pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  const perspective=new T.PerspectiveCamera(38,1,.001,100),orthographic=new T.OrthographicCamera(-1,1,1,-1,.001,100);
  let camera=perspective;
  const controls=new OrbitControls(camera,stage);controls.enableDamping=false;controls.enablePan=true;controls.minZoom=.25;controls.maxZoom=12;
  const regions={
    showcase:{nodes:[],groups:Object.keys(native.groups),bounds:[[-1.6,-1.48,-1.6],[3.3,.52,3.05]],title:'单发 / 连发 / 五发一曳光 · 外部动作演示'},
    eject:{nodes:[],groups:Object.keys(native.groups).filter(k=>!k.startsWith('supply')),bounds:[[-1.7,-1.45,-1.9],[.45,.38,.35]],title:'弹壳落地 · 两次弹跳后停稳'},
    caseDetail:{nodes:[],groups:['supplyBelt'],bounds:[[-.32,.032,.025],[-.1,.10,.095]],title:'弹壳底标 · CAL .50 / M2 图形化样例'},
    sights:{nodes:[],groups:['sight'],clip:0,bounds:[[-.79,.12,-.08],[-.60,.33,.08]],title:'机械瞄具 · 外观候选'},
    assembly:{nodes:[6,7,9,11,15,17,19,21,23,25,27],groups:Object.keys(native.groups).filter(k=>!['displayMount','sight'].includes(k)),bounds:[[-1.18,-1.30,-.18],[1.74,.22,3.0]],title:'枪体与供弹外观 · 原件布局候选'},
    round:{nodes:[],groups:['supplyBelt'],bounds:[[-.32,.025,.015],[.18,.12,.21]],title:'单颗弹药 · 弹壳 / 弹头 / 链节'},
    box:{nodes:[11],groups:['supplyBox'],bounds:[[-.5,-1.29,1.84],[.04,-.39,2.98]],title:'弹箱与箱盖 · 内部装载未知'},
    muzzle:{nodes:[9],groups:['barrel'],clipMin:1.54,bounds:[[1.54,-.065,-.065],[1.75,.065,.065]],title:'枪口 · 管壁与开放中心'},
    supply:{nodes:[6,7,11],groups:['supplyBox','supplyBelt'],bounds:[[-.35,-1.30,.02],[.05,.12,3.0]],title:'弹箱与 58 个弹药展示实例'},
    receiver:{nodes:[23,25,15,9],groups:['receiver','cover','positivePlate','collar','barrel'],clip:.24,bounds:[[-1.04,-.19,-.12],[.24,.18,.14]],title:'机匣与根部过渡'},
    full:{nodes:[9,15,17,19,21,23,25,27],groups:Object.keys(native.groups).filter(n=>!n.startsWith('supply')&&n!=='displayMount'),bounds:[[-1.16,-.18,-.17],[1.73,.18,.30]],title:'整枪外观上下文 · 尚未整体验收'},
    body:{nodes:[23,25],groups:['receiver','cover','positivePlate'],bounds:[[-1.04,-.18,-.12],[.02,.18,.12]],title:'机匣与板层'},
    positivePlate:{nodes:[25],groups:['positivePlate'],bounds:[[-.996,-.08,.04],[-.465,.07,.11]],title:'正侧板 · 独立区域'},
    collar:{nodes:[15,9],groups:['collar','barrel'],clip:.30,bounds:[[-.02,-.14,-.09],[.31,.09,.09]],title:'前环与管根'},
    rear:{nodes:[17,19,21,27],groups:['rear','sideHandle'],bounds:[[-1.17,-.12,-.17],[-.55,.14,.30]],title:'后部外观上下文'},
    jacket:{nodes:[9],groups:['barrel'],bounds:[[0,-.09,-.09],[1.73,.09,.09]],title:'护套与前端上下文'}
  };
  const views={oblique:[1,.65,1.7],action:[1,.68,2.4],rearOblique:[-1,.65,1.7],side:[0,0,1],reverse:[0,0,-1],top:[0,1,0],bottom:[0,-1,0],front:[1,0,0],back:[-1,0,0]};
  let frameSize=1;
  const labelLayer=document.createElement('div');labelLayer.className='object-labels';hosts[1].appendChild(labelLayer);
  const selectionBox=new T.BoxHelper(undefined,0xb57936);selectionBox.visible=false;scenes[1].add(selectionBox);
  function updateLabels(){
    labelLayer.replaceChildren();if(!dna.amount()&&!selectedId)return;
    native.root.updateMatrixWorld(true);
    const placed=[],svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.cssText='position:absolute;inset:0;width:100%;height:100%';labelLayer.appendChild(svg);
    for(const e of dna.entries){if(e.id!==selectedId&&e.poseParent!==dna.id('assetFrame'))continue;
      if(hosts[1].clientWidth<500&&e.id!==selectedId&&!['receiver','barrel','rear','supplyBox','supplyBelt'].includes(e.key))continue;
      const f=dna.frames.get(e.id).frame;let visible=true;for(let o=f;o;o=o.parent)visible&&=o.visible;if(!visible)continue;
      const p=f.getWorldPosition(new T.Vector3()).project(camera);if(Math.abs(p.z)>1)continue;
      const el=document.createElement('span');el.textContent=e.label;let x=(p.x+1)*hosts[1].clientWidth/2,y=(1-p.y)*hosts[1].clientHeight/2;
      const px=x,py=y,width=e.label.length*10+12;x=Math.max(width/2,Math.min(hosts[1].clientWidth-width/2,x));
      for(let i=0;i<20&&placed.some(a=>Math.abs(a.x-x)<(a.width+width)/2+4&&Math.abs(a.y-y)<25);i++)y=py+(i%2?-1:1)*Math.ceil((i+1)/2)*26;
      y=Math.max(52,Math.min(hosts[1].clientHeight-35,y));
      const line=document.createElementNS(svg.namespaceURI,'line');for(const [k,v]of Object.entries({x1:px,y1:py,x2:x,y2:y-10,stroke:'#78939f','stroke-width':1}))line.setAttribute(k,v);svg.appendChild(line);
      placed.push({x,y,width});el.style.left=x+'px';el.style.top=y+'px';labelLayer.appendChild(el);
    }
  }
  function render(){if(!renderers)return;camera.updateMatrixWorld();if(selectedId)selectionBox.setFromObject(dna.frames.get(selectedId).frame);for(let i=0;i<2;i++)if(hosts[i].clientWidth)renderers[i].render(scenes[i],camera);updateLabels();}
  function aspect(){const h=hosts[sourceOnly?0:1];return Math.max(1,h.clientWidth)/Math.max(1,h.clientHeight);}
  function resize(){for(let i=0;i<2;i++)renderers[i].setSize(Math.max(1,hosts[i].clientWidth),Math.max(1,hosts[i].clientHeight),false);const a=aspect();camera.aspect=a;camera.left=-frameSize*a/2;camera.right=frameSize*a/2;camera.top=frameSize/2;camera.bottom=-frameSize/2;camera.updateProjectionMatrix();render();}
  function fit(view){
    activeView=view;const spatial=['oblique','rearOblique','action'].includes(view);camera=spatial?perspective:orthographic;controls.object=camera;controls.enableRotate=spatial;
    let b=regions[activeRegion].bounds;
    if(sourceOnly&&reference){const box=new T.Box3().setFromObject(reference.root);b=[box.min.toArray(),box.max.toArray()];}
    if(dna.amount()&&!sourceOnly){native.root.updateMatrixWorld(true);const box=new T.Box3();for(const g of Object.values(native.groups))if(g.visible)box.union(new T.Box3().setFromObject(g));b=[box.min.toArray(),box.max.toArray()];}
    const lo=new T.Vector3(...b[0]),hi=new T.Vector3(...b[1]),center=lo.clone().add(hi).multiplyScalar(.5),extent=hi.clone().sub(lo),span=Math.max(extent.x,extent.y,extent.z);
    const direction=new T.Vector3(...views[view]).normalize();camera.position.copy(center).addScaledVector(direction,span*3+1);
    camera.up.set(0,1,0);if(view==='top'||view==='bottom')camera.up.set(0,0,view==='top'?-1:1);
    controls.target.copy(center);camera.zoom=1;camera.lookAt(center);camera.updateMatrixWorld();
    const box=new T.Box3();for(const x of [lo.x,hi.x])for(const y of [lo.y,hi.y])for(const z of [lo.z,hi.z])box.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    const size=box.getSize(new T.Vector3());frameSize=Math.max(size.y,size.x/aspect())*1.25;
    if(spatial){
      // Fit one shared set of visible bounds; never fit each pane independently.
      const points=[],collect=root=>{root.updateMatrixWorld(true);root.traverse(m=>{if(!m.isMesh)return;for(let o=m;o;o=o.parent)if(!o.visible)return;m.geometry.computeBoundingBox();const q=m.geometry.boundingBox;for(const x of [q.min.x,q.max.x])for(const y of [q.min.y,q.max.y])for(const z of [q.min.z,q.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(m.matrixWorld));});};
      if(!sourceOnly&&!['round','box','muzzle','showcase','eject','caseDetail','sights'].includes(activeRegion))collect(native.root);if(reference&&(sourceOnly||comparing))collect(reference.root);
      const inv=new T.Matrix4().makeRotationFromQuaternion(camera.quaternion).invert(),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let distance=.5;
      for(const p of points){p.sub(center).applyMatrix4(inv);distance=Math.max(distance,p.z+Math.max(Math.abs(p.y)/tan,Math.abs(p.x)/(tan*aspect()))*1.17);}
      if(points.length)camera.position.copy(center).addScaledVector(direction,distance);else camera.position.copy(center).addScaledVector(direction,frameSize/(2*tan)+span*.5);
    }
    if(view==='action'&&['showcase','eject'].includes(activeRegion)&&!comparing){const c=activeRegion==='showcase'?new T.Vector3(.1,-.73,.9):new T.Vector3(-.85,-.95,.85),dist=activeRegion==='showcase'?Math.max(4.9,6.8/aspect()):Math.max(3.5,4.2/aspect());controls.target.copy(c);camera.position.copy(c).addScaledVector(direction,dist);camera.lookAt(c);}
    controls.update();resize();
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    $('projection-note').textContent=spatial?'正常透视 · 近大远小 · 拖动旋转':'正交测量 · 固定方向 · 滚轮缩放';
  }
  function setRegion(id){
    animation.root.getObjectByName('neutral-display-support').visible=id==='showcase';const action=['showcase','eject'].includes(id);if(!action&&animation.state().enabled)animation.setEnabled(false);if(action)animation.setEnabled(true);$('animation-bar').hidden=!action;stage.classList.toggle('action-mode',action);
    if(sourceOnly)setSourceOnly(false);activeRegion=id;applySceneLight(action&&animation.state().night);$('region').value=id;const q=regions[id];
    for(const [name,g] of Object.entries(native.groups))g.visible=q.groups.includes(name);
    native.groups.supplyBelt.traverse(m=>{if(m.isMesh)m.visible=!['round','caseDetail'].includes(id)||m.userData.instanceIndex===1&&(id!=='caseDetail'||['case','case-marking'].includes(m.userData.entityRole));});
    if(reference)reference.meshes.forEach(m=>m.visible=reference.kind==='cal50'?id==='round'&&[2,4].includes(m.userData.sourceNode):q.nodes.includes(m.userData.sourceNode));
    const clips=q.clipMin!==undefined?[new T.Plane(new T.Vector3(1,0,0),-q.clipMin)]:q.clip===undefined?[]:[new T.Plane(new T.Vector3(-1,0,0),q.clip)];
    [...surface.materials,...markings.materials].forEach(m=>{m.clippingPlanes=clips;m.needsUpdate=true;});material.clippingPlanes=clips;maskMaterial.clippingPlanes=clips;material.needsUpdate=true;maskMaterial.needsUpdate=true;
    $('native-caption').textContent=q.title;fit(activeView);
  }
  function setMode(name){mode=name;if(name==='surface'&&!(sourceOnly&&reference?.kind==='study'))setCompare(false);const mat=mode==='silhouette'?maskMaterial:mode==='surface'?surface.material:material;

    native.root.traverse(m=>{if(m.isMesh)m.material=mode==='surface'?surface.matForMesh(m):mat;});if(reference)reference.meshes.forEach(m=>m.material=reference.kind==='study'&&mode==='surface'?m.userData.originalMaterial:mode==='silhouette'?maskMaterial:material);
    $('surface').setAttribute('aria-pressed',String(mode==='surface'));$('surface-state').disabled=mode!=='surface';$('surface-note').textContent=mode==='surface'?'固定表面坐标 · 状态由你切换 · 无自动老化':'中性 / 轮廓用于核对形态；材质预览独立查看';$('neutral').setAttribute('aria-pressed',String(mode==='neutral'));$('silhouette').setAttribute('aria-pressed',String(mode==='silhouette'));render();
  }
  function setCompare(enabled){if(sourceOnly)setSourceOnly(false);if(enabled){if(animation.state().enabled){animation.setEnabled(false);activeRegion='assembly';setRegion('assembly');}setExplode(0);setSeparation(0);setLid(0);}comparing=enabled;stage.classList.toggle('solo',!enabled);$('compare').setAttribute('aria-pressed',String(enabled));if(enabled&&mode==='surface')setMode('neutral');fit(activeView);}
  function setSourceOnly(enabled){
    sourceOnly=enabled;if(enabled){comparing=false;dna.setExplode(0);$('explode').value=0;$('explode-value').textContent='合拢';}
    stage.classList.toggle('source-only',enabled);stage.classList.toggle('solo',!enabled&&!comparing);$('source-all').setAttribute('aria-pressed',String(enabled));$('compare').setAttribute('aria-pressed',String(comparing));
    if(reference)reference.meshes.forEach(m=>m.visible=enabled||(reference.kind==='cal50'?activeRegion==='round'&&[2,4].includes(m.userData.sourceNode):regions[activeRegion].nodes.includes(m.userData.sourceNode)));
    fit(activeView);
  }
  function setExplode(value){
    if(value>0&&animation.state().enabled){animation.setEnabled(false);setRegion('assembly');}
    if(value>0){if(sourceOnly)setSourceOnly(false);comparing=false;stage.classList.add('solo');$('compare').setAttribute('aria-pressed','false');}
    dna.setExplode(value);$('explode').value=value;$('explode-value').textContent=value?'展示展开 '+Math.round(value*100)+'%':'合拢';fit(activeView);
  }
  function soloDisplay(){if(sourceOnly)setSourceOnly(false);comparing=false;stage.classList.add('solo');$('compare').setAttribute('aria-pressed','false');}
  function setSeparation(value){if(value>0&&animation.state().enabled){animation.setEnabled(false);setRegion('round');}if(value>0)soloDisplay();dna.setSeparation(value,1);$('separation').value=value;$('separation-value').textContent=value?'分体 '+Math.round(value*100)+'%':'合拢';render();}
  function setLid(value){if(value>0&&animation.state().enabled){animation.setEnabled(false);setRegion('box');}if(value>0)soloDisplay();dna.setLid(value);$('lid').value=value;$('lid-value').textContent=value?'开启 '+Math.round(value*100)+'%':'闭合';render();}
  $('separation').oninput=e=>setSeparation(Number(e.target.value));$('lid').oninput=e=>setLid(Number(e.target.value));
  document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{dna.setExplode(0);$('explode').value=0;$('explode-value').textContent='合拢';setRegion(b.dataset.region);setMode('surface');if(b.dataset.region==='caseDetail')fit('back');else if(['showcase','eject'].includes(b.dataset.region))fit('action');else if(b.dataset.region==='box')fit('front');else fit('oblique');});
  function selectObject(id){
    const e=id?dna.get(id):null;selectedId=e?.id||'';selectionBox.visible=!!e;$('object-select').value=selectedId;
    $('object-card').textContent=e?e.label+' · '+e.id+' | 组成归属：'+e.partOf+' | 坐标父级：'+e.poseParent+' | 相对位置：'+e.frame.translation.map(n=>n.toFixed(4)).join(', ')+'（数字参考无量纲） | 证据：原件外观；实现：部分；历史与用户验收：待定':'选择对象查看身份、组成归属与相对坐标。展开仅用于查看，不代表拆卸路径。';render();
  }
  for(const e of dna.entries){const o=document.createElement('option');o.value=e.id;o.textContent=e.label;$('object-select').appendChild(o);}
  $('object-select').onchange=e=>selectObject(e.target.value);$('explode').oninput=e=>setExplode(Number(e.target.value));$('source-all').onclick=()=>setSourceOnly(!sourceOnly);
  $('export-dna').onclick=()=>{const blob=new Blob([JSON.stringify(exchangePacket(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AIRCRAFT_ANM2_W13_ObjectDNA.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const raycaster=new T.Raycaster();let pointerStart;
  hosts[1].addEventListener('pointerdown',e=>pointerStart=[e.clientX,e.clientY]);
  hosts[1].addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])>4)return;const r=hosts[1].getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=raycaster.intersectObject(native.root,true).find(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;});if(hit)selectObject(hit.object.userData.entityId||'');});
  function setSurfaceState(id){surface.setState(id);$('surface-state').value=id;render();}
  function setLight(id){const strengths={studio:[2.2,2.7,1.2],grazing:[.8,4,.35],dim:[.65,.9,.3]};const values=strengths[id];if(!values)throw Error('Unknown observation preset');surface.materials.forEach(m=>m.envMapIntensity=id==='dim'?.28:id==='grazing'?.55:.85);scenes.forEach(scene=>{let i=0;scene.children.filter(o=>o.isLight).forEach(l=>l.intensity=values[i++]);const key=scene.children.find(o=>o.isDirectionalLight);key.position.set(...(id==='grazing'?[1,.2,-4]:[2,5,4]));});$('light-state').value=id;render();}
  $('surface').onclick=()=>setMode('surface');$('compare').onclick=()=>setCompare(!comparing);$('surface-state').onchange=e=>setSurfaceState(e.target.value);$('light-state').onchange=e=>setLight(e.target.value);
  function report(){
    const proof=APP_REPORT;
    $('preflight-state').textContent=proof.status==='review-candidate'?'动画与参考载入预检通过':'开发检查中 · 尚未交付';
    $('preflight-detail').textContent=proof.summary||'同条件对照仍在进行，当前不宣称通过几何门槛。';
    const e=proof.regionResults||[];
    $('report-content').innerHTML='<p>W13 新增单发、连发、每五发一发曳光、抛壳与两次弹跳停稳的外部动作演示。时间轴可暂停、拖动、慢放，使用无量纲的展示轨迹和简化地面碰撞。内部机构与真实弹道未重建。枪座与机械瞄具为可切换的参考外观候选，未认定 B24 枪位。弹壳底标为图形样例，厂号与年份未知。</p><p>将弹药分为独立弹壳、弹头与链节，细分枪管和护套，并加入箱盖展示开合。每个对象具有稳定身份、组成与坐标关系。所有尺寸为数字参考比例。</p>'+ 
      '<table><tr><th>核验项</th><th>本轮结果</th></tr>'+e.map(row=>'<tr><td>'+row.label+'</td><td>'+row.value+'</td></tr>').join('')+'</table>'+ 
      '<p>分体和开合均为新编写的展示控制；已检查的来源没有动画。没有实现内部工作机构或真实拆装路径。弹箱内部装载未知，当前显示空腔。</p>'+ 
      '<p>材质按钢、涂漆箱体、五金、黄铜、铜色、链节和木质外观区分。轻度斑驳由你切换，不推断历史磨损事件；未接入世界内核或重新网格化映射。</p>'+ 
      '<p>本地参考：航空原件 Misja van Laatum（13 网格）；12.7x99 M2 Ball 练习模型 HKM4（3 网格，单弹对照）。另吸收 Pedro Belthori 的 7.62x54mmR 分体语义和 emran.bayati 的 Browning M2 弹箱、链节、材质母题，未将 7.62 尺寸或地面三脚架套用到航空枪。上述许可为 CC BY 4.0 元数据，源文件不写入网页。</p>'+ 
      '<p>新增枪座与机械瞄具外观参考：ChemicalFX 的 M2 Browning Machine Gun、buh 的 M2 Browning（均为 CC BY 4.0 元数据；完整来源与身份见可读规则 reference-study.js）。只作独立外观候选，未认定航空安装。</p><p>B24 枪位、安装、日期、瞄具和历史材质仍待证据。几何与用户验收待定，生产就绪保持 false。</p>';
  }
  async function load(file){
    $('loading').classList.add('visible');$('load-reference').disabled=true;$('notice').classList.remove('visible');
    try{let next;if(file.size===777908)next=await Cal50Reference.create(T,file,material);else if(file.size===6548040){const parsed=await ReferenceInput.read(file);next=ReferenceTwin.create(T,parsed,material,DATUM_RECORD);next.kind='original';}else next=await ReferenceStudy.create(T,file,environment.texture);
      if(reference){scenes[0].remove(reference.root);reference.dispose();}reference=next;scenes[0].add(reference.root);
      const audit=reference.audit();if(!audit.sourceMatricesUnchanged||!audit.sourceHierarchyUnchanged)throw Error('原件层级或变换被改变');
      $('empty').classList.add('hidden');$('ref-state').textContent='IDENTITY VERIFIED';$('compare').disabled=reference.kind==='study';$('ref-caption').textContent=reference.kind==='study'?reference.title+' · 原始材质 / 独立查看':reference.kind==='cal50'?'单弹参考已核验 · 5 节点 / 3 网格':'原件已核验 · 28 节点 / 13 网格';$('source-all').textContent=reference.kind==='study'?'完整参考 · '+reference.meshes.length+' 网格':reference.kind==='cal50'?'完整参考 · 3 网格':'完整原件 · 13 网格';$('load-reference').textContent='重新选择原件';const wasSourceOnly=sourceOnly;setRegion(reference.kind==='study'?'full':reference.kind==='cal50'?'round':activeRegion==='round'?'assembly':activeRegion);window.referenceReady=true;if(reference.kind==='study'){setSourceOnly(true);setMode('surface');}else if(wasSourceOnly)setSourceOnly(true);else setCompare(true);
    }catch(error){$('notice').textContent=String(error.message||error);$('notice').classList.add('visible');window.referenceLoadFailure=String(error);}
    finally{$('loading').classList.remove('visible');$('load-reference').disabled=false;render();}
  }
  $('load-reference').onclick=()=>{$('reference-file').value='';$('reference-file').click();};$('empty-load').onclick=$('load-reference').onclick;
  $('reference-file').onchange=e=>{if(e.target.files[0])load(e.target.files[0]);};
  $('region').onchange=e=>setRegion(e.target.value);$('neutral').onclick=()=>setMode('neutral');$('silhouette').onclick=()=>setMode('silhouette');
  $('datums').onclick=()=>{showDatums=!showDatums;gridGroups.forEach(g=>g.visible=showDatums);$('datums').setAttribute('aria-pressed',String(showDatums));render();};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>fit(b.dataset.view));$('reset-camera').onclick=()=>fit(activeView);
  $('open-report').onclick=()=>{$('report').showModal();};$('close-report').onclick=()=>$('report').close();
  $('empty-load').addEventListener('pointerdown',e=>e.stopPropagation());
  controls.addEventListener('change',render);new ResizeObserver(()=>{if(ready)fit(activeView);}).observe(stage);
  function stats(){let triangles=0,meshes=0,vertices=0,finite=true,degenerate=0,badNormals=0;const perGroup={};
    native.root.traverse(m=>{if(!m.isMesh)return;meshes++;const p=m.geometry.attributes.position,n=m.geometry.attributes.normal,ind=m.geometry.index.array;vertices+=p.count;triangles+=ind.length/3;
      perGroup[m.userData.semantic]=(perGroup[m.userData.semantic]||0)+ind.length/3;
      for(let i=0;i<p.count;i++){finite&&=Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i));const len=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(Math.abs(len-1)>.01)badNormals++;}
      const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<ind.length;i+=3){a.fromBufferAttribute(p,ind[i]);b.fromBufferAttribute(p,ind[i+1]);c.fromBufferAttribute(p,ind[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-20)degenerate++;}
    });return {meshes,triangles,vertices,finite,degenerate,badNormals,perGroup};
  }
  let soundEnabled=false,audioContext=null;
  function sound(kind,volume){if(!soundEnabled||!audioContext)return;const t=audioContext.currentTime,g=audioContext.createGain();g.connect(audioContext.destination);g.gain.setValueAtTime(Math.min(.035,volume*.035),t);g.gain.exponentialRampToValueAtTime(.0001,t+(kind==='shot'?.10:.20));
    if(kind==='shot'){const buffer=audioContext.createBuffer(1,audioContext.sampleRate*.12,audioContext.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*6);const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1700;source.connect(filter).connect(g);source.start();source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};}
    else{const o=audioContext.createOscillator();o.type='triangle';o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(700,t+.14);o.connect(g);o.start();o.stop(t+.22);o.onended=()=>{o.disconnect();g.disconnect();};}
  }
  function applySceneLight(night){const action=['showcase','eject'].includes(activeRegion);scenes[1].background.setHex(action?(night?0x0a111b:0x30393f):frameColor);scenes[1].fog=action?new T.Fog(scenes[1].background,9,26):null;const lights=scenes[1].children.filter(o=>o.isLight);const strengths=action?(night?[.65,.9,.9]:[1.8,3.2,1.3]):[2.2,2.7,1.2];lights.forEach((l,i)=>l.intensity=strengths[i]);$('scene-state').textContent=action?(night?'夜间曳光':'日间展示'):'对象研究';}
  let lastUpdate='';
  const animation=AnimationProgram.create(T,native,dna,surface,markings,{onNight:applySceneLight,onSound:sound,onUpdate:s=>{const label=s.shots+' / '+s.tracers.length+' / '+s.settled;if(label!==lastUpdate){$('shot-count').textContent=s.shots;$('tracer-count').textContent=s.tracers.length;$('case-count').textContent=s.settled;lastUpdate=label;}$('timeline').max=s.duration;$('timeline').value=s.time;$('time-label').textContent=s.time.toFixed(1)+' / '+s.duration.toFixed(1)+' s';$('pause-animation').textContent=s.running?'暂停':'继续';$('motion-status').textContent=s.running?(s.airborne?'弹壳飞行 / 落地中':'演示播放中'):s.shots?'已暂停 / 可拖动时间轴':'准备就绪';}});scenes[1].add(animation.root);
  renderers[1].shadowMap.enabled=true;renderers[1].shadowMap.type=T.PCFSoftShadowMap;const shadowKey=scenes[1].children.find(o=>o.isDirectionalLight);shadowKey.castShadow=true;shadowKey.shadow.mapSize.set(1024,1024);Object.assign(shadowKey.shadow.camera,{left:-3,right:4,top:3,bottom:-4,near:.1,far:16});shadowKey.shadow.bias=-.0006;
  native.root.traverse(m=>{if(m.isMesh){m.castShadow=['receiver','supplyBox','displayMount','rear'].includes(m.userData.semantic);m.receiveShadow=m.userData.semantic==='displayMount';}});
  let raf=0,lastFrame=0;
  function animate(ms){raf=0;const dt=lastFrame?(ms-lastFrame)/1000:0;lastFrame=ms;animation.advance(dt);render();if(animation.state().running)raf=requestAnimationFrame(animate);}
  function runLoop(){if(!raf){lastFrame=0;raf=requestAnimationFrame(animate);}}
  function startClip(name){dna.setExplode(0);dna.setLid(0);dna.setSeparation(0);$('explode').value=$('lid').value=$('separation').value=0;if(!['showcase','eject'].includes(activeRegion))setRegion('showcase');setMode('surface');fit('action');animation.play(name);applySceneLight(animation.state().night);runLoop();}
  document.querySelectorAll('[data-clip]').forEach(b=>b.onclick=()=>startClip(b.dataset.clip));
  $('pause-animation').onclick=()=>{if(animation.state().running)animation.pause();else{animation.resume();runLoop();}render();};
  $('reset-animation').onclick=()=>{animation.reset();render();};$('timeline').oninput=e=>{animation.seek(Number(e.target.value));render();};
  $('animation-speed').onchange=e=>animation.setSpeed(Number(e.target.value));$('low-flash').checked=animation.state().lowFlash;$('low-flash').onchange=e=>animation.setLowFlash(e.target.checked);
  $('sound').onclick=async()=>{soundEnabled=!soundEnabled;if(soundEnabled){audioContext||=new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();}$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').textContent=soundEnabled?'声音 开':'声音 关';};
  $('mount-type').onchange=e=>{accessories.setMount(e.target.value);render();};$('sight-type').onchange=e=>{accessories.setSight(e.target.value);render();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){animation.pause();if(raf)cancelAnimationFrame(raf);raf=0;}});
  function exchangePacket(){const p=dna.packet();p.presentation.animation=animation.audit();return p;}
  window.review={animation:{play:startClip,pause:()=>{animation.pause();render();},seek:t=>{animation.seek(t);render();},state:animation.state,audit:animation.audit},markingAudit:markings.audit,setMount:value=>{accessories.setMount(value);render();},setSight:value=>{accessories.setSight(value);render();},muzzleAudit:()=>{native.root.updateMatrixWorld(true);const mesh=native.root.getObjectByName('barrel-hollow-tube'),ray=new T.Raycaster(new T.Vector3(1.8,0,0),new T.Vector3(-1,0,0));ray.far=1.8;return {centerHits:ray.intersectObject(mesh).length};},setLid,setSeparation,setExplode,selectObject,setSourceOnly,dnaPacket:exchangePacket,dnaPosition:dna.position,
    coordinateAudit:()=>{native.root.updateMatrixWorld(true);return dna.entries.map(e=>({id:e.id,expected:dna.position(e.id).position,actual:dna.frames.get(e.id).frame.getWorldPosition(new T.Vector3()).toArray(),determinant:dna.frames.get(e.id).frame.matrixWorld.determinant()}));},
    cameraAudit:()=>{camera.updateMatrixWorld();const length=z=>{const a=new T.Vector3(0,0,z).applyMatrix4(camera.matrixWorld).project(camera),b=new T.Vector3(.1,0,z).applyMatrix4(camera.matrixWorld).project(camera);return a.distanceTo(b);};return {projection:camera.type,nearSegment:length(-2),farSegment:length(-4),determinant:camera.matrixWorld.determinant(),viewports:hosts.map(h=>({width:h.clientWidth,height:h.clientHeight})),rotationEnabled:controls.enableRotate};},
    setRegion,setView:fit,setMode,setCompare,setSurfaceState,setLight,surfaceAudit:surface.audit,surfaceQuery:surface.query,render,stats,
    referenceAudit:()=>reference?.audit(),
    current:()=>({region:activeRegion,view:activeView,mode,comparing,sourceOnly,projection:camera.type,animation:animation.state(),mount:accessories.mount(),sight:accessories.sight(),expansion:dna.amount(),lid:dna.lid(),separation:dna.separation(),referenceKind:reference?.kind,selectedId,surfaceState:surface.state(),referenceLoaded:!!reference,frame:{position:camera.position.toArray(),target:controls.target.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,zoom:camera.zoom}}),
    exportGeneratedBuffers:()=>{const result=[];native.root.updateMatrixWorld(true);native.root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,v=new T.Vector3(),vertices=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);vertices.push(v.x,v.y,v.z);}result.push({name:m.name,semantic:m.userData.semantic,sourceNode:m.userData.sourceNode,vertices,indices:Array.from(m.geometry.index.array)});});return result;},
    masksForQA:enabled=>{maskMaterial.color.setHex(enabled?0xffffff:0x273e49);scenes.forEach(s=>s.background.setHex(enabled?0x000000:frameColor));setMode(enabled?'silhouette':'neutral');},
    rendererInfo:()=>renderers.map(r=>({calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures}))
  };
  report();ready=true;setRegion('showcase');setMode('surface');setSurfaceState('handled');fit('action');window.reviewReady=true;
})();


