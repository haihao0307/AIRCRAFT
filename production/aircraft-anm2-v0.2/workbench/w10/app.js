(() => {
  const T=THREE,$=id=>document.getElementById(id),stage=$('stage');
  let reference=null,activeRegion='full',activeView='oblique',mode='neutral',showDatums=false,ready=false;
  const material=new T.MeshStandardMaterial({color:0x87979f,metalness:0,roughness:.72,side:T.DoubleSide});
  const maskMaterial=new T.MeshBasicMaterial({color:0x273e49,side:T.DoubleSide});
  const frameColor=0xe2e7e9;
  const native=NativeGeometry.create(T,EXTERIOR_RECIPE,material);
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
  const pmrem=new T.PMREMGenerator(renderers[1]),environment=pmrem.fromScene(studio,.06,.1,30);surface.material.envMap=environment.texture;surface.material.envMapIntensity=.85;pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  const camera=new T.OrthographicCamera(-1,1,1,-1,.001,100);
  const controls=new OrbitControls(camera,stage);controls.enableDamping=false;controls.enablePan=true;controls.minZoom=.25;controls.maxZoom=12;
  const regions={
    receiver:{nodes:[23,25,15,9],groups:['receiver','cover','positivePlate','collar','barrel'],clip:.24,bounds:[[-1.04,-.19,-.12],[.24,.18,.14]],title:'机匣与根部过渡'},
    full:{nodes:[9,15,17,19,21,23,25,27],groups:Object.keys(native.groups),bounds:[[-1.16,-.18,-.17],[1.73,.18,.30]],title:'整枪外观上下文 · 尚未整体验收'},
    body:{nodes:[23,25],groups:['receiver','cover','positivePlate'],bounds:[[-1.04,-.18,-.12],[.02,.18,.12]],title:'机匣与板层'},
    positivePlate:{nodes:[25],groups:['positivePlate'],bounds:[[-.996,-.08,.04],[-.465,.07,.11]],title:'正侧板 · 独立区域'},
    collar:{nodes:[15,9],groups:['collar','barrel'],clip:.30,bounds:[[-.02,-.14,-.09],[.31,.09,.09]],title:'前环与管根'},
    rear:{nodes:[17,19,21,27],groups:['rear','sideHandle'],bounds:[[-1.17,-.12,-.17],[-.55,.14,.30]],title:'后部外观上下文'},
    jacket:{nodes:[9],groups:['barrel'],bounds:[[0,-.09,-.09],[1.73,.09,.09]],title:'护套与前端上下文'}
  };
  const views={oblique:[1,.65,1.7],side:[0,0,1],reverse:[0,0,-1],top:[0,1,0],bottom:[0,-1,0],front:[1,0,0],back:[-1,0,0]};
  let frameSize=1;
  function render(){if(!renderers)return;camera.updateMatrixWorld();for(let i=0;i<2;i++)renderers[i].render(scenes[i],camera);}
  function resize(){const w=hosts[1].clientWidth,h=hosts[1].clientHeight;for(let i=0;i<2;i++)renderers[i].setSize(Math.max(1,hosts[i].clientWidth),Math.max(1,hosts[i].clientHeight),false);const aspect=w/h;camera.left=-frameSize*aspect/2;camera.right=frameSize*aspect/2;camera.top=frameSize/2;camera.bottom=-frameSize/2;camera.updateProjectionMatrix();render();}
  function fit(view){
    activeView=view;const b=regions[activeRegion].bounds,lo=new T.Vector3(...b[0]),hi=new T.Vector3(...b[1]),center=lo.clone().add(hi).multiplyScalar(.5),extent=hi.clone().sub(lo),span=Math.max(extent.x,extent.y,extent.z);
    camera.position.copy(center).add(new T.Vector3(...views[view]).normalize().multiplyScalar(span*3+1));
    camera.up.set(0,1,0);if(view==='top'||view==='bottom')camera.up.set(0,0,view==='top'?-1:1);
    controls.target.copy(center);camera.zoom=1;camera.lookAt(center);camera.updateMatrixWorld();
    const box=new T.Box3();for(const x of [lo.x,hi.x])for(const y of [lo.y,hi.y])for(const z of [lo.z,hi.z])box.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    const size=box.getSize(new T.Vector3()),aspect=hosts[1].clientWidth/hosts[1].clientHeight;
    frameSize=Math.max(size.y,size.x/aspect)*1.25;controls.update();resize();
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
  }
  function setRegion(id){
    activeRegion=id;$('region').value=id;const q=regions[id];
    for(const [name,g] of Object.entries(native.groups))g.visible=q.groups.includes(name);
    if(reference)for(const mesh of reference.meshes)mesh.visible=q.nodes.includes(mesh.userData.sourceNode);
    const clips=q.clip===undefined?[]:[new T.Plane(new T.Vector3(-1,0,0),q.clip)];
    surface.material.clippingPlanes=clips;surface.material.needsUpdate=true;material.clippingPlanes=clips;maskMaterial.clippingPlanes=clips;material.needsUpdate=true;maskMaterial.needsUpdate=true;
    $('native-caption').textContent=q.title;fit(activeView);
  }
  function setMode(name){mode=name;if(name==='surface')setCompare(false);const mat=mode==='silhouette'?maskMaterial:mode==='surface'?surface.material:material;
    native.root.traverse(m=>{if(m.isMesh)m.material=mat;});if(reference)reference.meshes.forEach(m=>m.material=mode==='silhouette'?maskMaterial:material);
    $('surface').setAttribute('aria-pressed',String(mode==='surface'));$('surface-state').disabled=mode!=='surface';$('surface-note').textContent=mode==='surface'?'固定表面坐标 · 状态由你切换 · 无自动老化':'中性 / 轮廓用于核对形态；材质预览独立查看';$('neutral').setAttribute('aria-pressed',String(mode==='neutral'));$('silhouette').setAttribute('aria-pressed',String(mode==='silhouette'));render();
  }
  function setCompare(enabled){comparing=enabled;stage.classList.toggle('solo',!enabled);$('compare').setAttribute('aria-pressed',String(enabled));if(enabled&&mode==='surface')setMode('neutral');fit(activeView);}
  function setSurfaceState(id){surface.setState(id);$('surface-state').value=id;render();}
  function setLight(id){const strengths={studio:[2.2,2.7,1.2],grazing:[.8,4,.35],dim:[.65,.9,.3]};const values=strengths[id];if(!values)throw Error('Unknown observation preset');surface.material.envMapIntensity=id==='dim'?.28:id==='grazing'?.55:.85;scenes.forEach(scene=>{let i=0;scene.children.filter(o=>o.isLight).forEach(l=>l.intensity=values[i++]);const key=scene.children.find(o=>o.isDirectionalLight);key.position.set(...(id==='grazing'?[1,.2,-4]:[2,5,4]));});$('light-state').value=id;render();}
  $('surface').onclick=()=>setMode('surface');$('compare').onclick=()=>setCompare(!comparing);$('surface-state').onchange=e=>setSurfaceState(e.target.value);$('light-state').onchange=e=>setLight(e.target.value);
  function report(){
    const proof=APP_REPORT;
    $('preflight-state').textContent=proof.status==='review-candidate'?'真实原件已载入预检':'开发检查中 · 尚未交付';
    $('preflight-detail').textContent=proof.summary||'同条件对照仍在进行，当前不宣称通过几何门槛。';
    const e=proof.regionResults||[];
    $('report-content').innerHTML='<p>W10 延续 W09 几何，本轮新增固定材质坐标、显式表面状态与独立观察光线。未新增几何精度或历史验收结论。整枪上下文不等于整枪完成。所有比例来自数字参考外观，没有制造尺寸标定。</p>'+
      '<table><tr><th>核验项</th><th>本轮结果</th></tr>'+e.map(row=>'<tr><td>'+row.label+'</td><td>'+row.value+'</td></tr>').join('')+'</table>'+
      '<p>待完成：B24 具体型号、枪位、日期、瞄具、箱体及外接关系；历史材质与状态动作。当前两种材质只是候选外观，不表示真实涂层替换事件；未接入世界内核，未验证重新网格化映射。用户视觉验收、生产就绪均保持 false。</p>'+
      '<p>原件只在本地内存读取。参考作者：Misja van Laatum；原件许可元数据：CC BY 4.0。当前规则生成体属于新的外观解释。</p>';
  }
  async function load(file){
    $('loading').classList.add('visible');$('load-reference').disabled=true;$('notice').classList.remove('visible');
    try{const parsed=await ReferenceInput.read(file);const next=ReferenceTwin.create(T,parsed,mode==='silhouette'?maskMaterial:material,DATUM_RECORD);
      if(reference){scenes[0].remove(reference.root);reference.dispose();}reference=next;scenes[0].add(reference.root);
      const audit=reference.audit();if(!audit.sourceMatricesUnchanged||!audit.sourceHierarchyUnchanged)throw Error('原件层级或变换被改变');
      $('empty').classList.add('hidden');$('ref-state').textContent='IDENTITY VERIFIED';$('ref-caption').textContent='原件已核验 · 28 节点 / 13 网格';$('load-reference').textContent='重新选择原件';setRegion(activeRegion);window.referenceReady=true;setCompare(true);
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
  controls.addEventListener('change',render);new ResizeObserver(()=>{if(ready)fit(activeView);}).observe(hosts[1]);
  function stats(){let triangles=0,meshes=0,vertices=0,finite=true,degenerate=0,badNormals=0;const perGroup={};
    native.root.traverse(m=>{if(!m.isMesh)return;meshes++;const p=m.geometry.attributes.position,n=m.geometry.attributes.normal,ind=m.geometry.index.array;vertices+=p.count;triangles+=ind.length/3;
      perGroup[m.userData.semantic]=(perGroup[m.userData.semantic]||0)+ind.length/3;
      for(let i=0;i<p.count;i++){finite&&=Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)+n.getX(i)+n.getY(i)+n.getZ(i));const len=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(Math.abs(len-1)>.01)badNormals++;}
      const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();for(let i=0;i<ind.length;i+=3){a.fromBufferAttribute(p,ind[i]);b.fromBufferAttribute(p,ind[i+1]);c.fromBufferAttribute(p,ind[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-20)degenerate++;}
    });return {meshes,triangles,vertices,finite,degenerate,badNormals,perGroup};
  }
  window.review={setRegion,setView:fit,setMode,setCompare,setSurfaceState,setLight,surfaceAudit:surface.audit,surfaceQuery:surface.query,render,stats,
    referenceAudit:()=>reference?.audit(),
    current:()=>({region:activeRegion,view:activeView,mode,comparing,surfaceState:surface.state(),referenceLoaded:!!reference,frame:{position:camera.position.toArray(),target:controls.target.toArray(),left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,zoom:camera.zoom}}),
    exportGeneratedBuffers:()=>{const result=[];native.root.updateMatrixWorld(true);native.root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position,v=new T.Vector3(),vertices=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);vertices.push(v.x,v.y,v.z);}result.push({name:m.name,semantic:m.userData.semantic,sourceNode:m.userData.sourceNode,vertices,indices:Array.from(m.geometry.index.array)});});return result;},
    masksForQA:enabled=>{maskMaterial.color.setHex(enabled?0xffffff:0x273e49);scenes.forEach(s=>s.background.setHex(enabled?0x000000:frameColor));setMode(enabled?'silhouette':'neutral');},
    rendererInfo:()=>renderers.map(r=>({calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures}))
  };
  report();ready=true;setRegion('full');setMode('surface');window.reviewReady=true;
})();
