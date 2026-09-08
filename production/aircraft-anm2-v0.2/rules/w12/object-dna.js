/* Stable digital identities with separately versioned knowledge and display state. */
const ObjectDNA=(()=>{
  const assetId='ODNA:MECH:ANM2:PILOT-0001',prefix=assetId+'/';
  const labels={receiver:'机匣外观组件',cover:'顶盖外观区域',positivePlate:'侧板外观区域',collar:'前环外观组件',barrel:'枪管与护套外观组',rear:'后端外观组件',sideHandle:'侧面操作件外观',supplyBox:'弹箱外观',supplyBelt:'弹带展示组'};
  const offsets={receiver:[0,0,0],cover:[0,.35,0],positivePlate:[0,.02,.36],collar:[.25,-.2,0],barrel:[.58,.15,0],rear:[-.36,0,0],sideHandle:[0,.15,.46],supplyBox:[.25,-.15,.3],supplyBelt:[0,.22,.3]};
  function create(T,native){
    const entries=[],frames=new Map(),byId=new Map();let amount=0,lidAmount=0,separation=0,focusedRound=1;
    const context=Object.freeze({assetId,snapshot:'W12/source-layout/1',frame:'R02-digital-reference',units:'receiver-datum separation; dimensionless',historicalTime:{status:'unknown'},worldPose:{status:'unknown'}});
    const id=key=>key.startsWith(prefix)?key:prefix+key.replace(/^W1[12]\//,'');
    function wrap(host,objects,key,label,type,partOf,poseParent,offset=[0,0,0],kind='entity-candidate',anchorOverride=null){
      if(!objects.length)return null;host.updateWorldMatrix(true,true);const inverse=host.matrixWorld.clone().invert(),bounds=new T.Box3();
      for(const object of objects)object.traverse(m=>{if(!m.isMesh)return;m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));});
      const anchor=anchorOverride||bounds.getCenter(new T.Vector3()),frame=new T.Group();frame.name=id(key);frame.position.copy(anchor);host.add(frame);frame.updateWorldMatrix(true,false);objects.forEach(m=>frame.attach(m));
      const meshes=[];frame.traverse(m=>{if(m.isMesh){meshes.push(m);m.userData.entityId=id(key);}});
      const record={id:id(key),key,label,kind,typeOf:type,knowledgeVersion:'W12',partOf:id(partOf),poseParent:id(poseParent),frame:{translation:anchor.toArray(),rotationQuaternion:[0,0,0,1],units:context.units,anchorMeaning:anchorOverride?'authored display hinge; physical interface unverified':'local exterior bounds anchor; not a certified physical interface'},sourceNodes:[...new Set(meshes.flatMap(m=>m.userData.sourceNodeCandidates||[m.userData.sourceNode]).filter(n=>n!==null))],geometry:{status:'exterior-candidate',ruleFiles:key.startsWith('round/')||key.startsWith('link/')?['cartridge-program.js','supply-program.js']:key.startsWith('supply')?['supply-program.js']:['geometry-program.js'],meshNames:meshes.map(m=>m.name)},material:{status:'multi-reference authored preview; historical finish unknown'},knowledge:{status:'observed exterior motifs with authored interpretation'},implementation:{status:'partial'},verification:{status:'W12 coordinate and runtime checks passed; geometry, historical and user acceptance pending'},lifecycle:{historicalIdentity:'unknown',eventHistory:'unknown'},displayOffset:offset,context};
      if(Object.keys(labels).includes(key)||/^rear\//.test(key)||/^round\/\d+$/.test(key))record.previousIds=['W11/'+key];
      entries.push(record);byId.set(record.id,record);frames.set(record.id,{frame,rest:anchor.clone(),offset:new T.Vector3(...offset)});return frame;
    }
    for(const [name,host]of Object.entries(native.groups)){
      const top=wrap(host,[...host.children].filter(m=>m.isMesh),name,labels[name],name.startsWith('supply')?'supply-exterior-display':'gun-exterior-display',name.startsWith('supply')?'exhibit':'gun','assetFrame',offsets[name],['cover','positivePlate'].includes(name)?'semantic-region-candidate':'entity-aggregate-candidate');
      if(name==='rear')for(const [key,label,filter,offset]of [['gripA','握把 A 外观',m=>m.name.startsWith('rear-grip-0'),[0,0,.14]],['gripB','握把 B 外观',m=>m.name.startsWith('rear-grip-1'),[0,0,-.14]],['control','翼状控制件外观',m=>m.name==='rear-upper-control',[-.16,.20,0]],['roundEnd','后端圆筒外观',m=>m.name==='rear-external-cylinder',[-.20,-.12,0]]])wrap(top,[...top.children].filter(m=>m.isMesh&&filter(m)),'rear/'+key,label,'rear-exterior-component','rear','rear',offset);
      if(name==='barrel'){
        wrap(top,[...top.children].filter(m=>m.isMesh&&m.name==='barrel-hollow-tube'),'barrel/tube','枪管管口与管壁外观','hollow-tube-visual','barrel','barrel');
        wrap(top,[...top.children].filter(m=>m.isMesh),'barrel/jacket','带孔护套外观','perforated-jacket-visual','barrel','barrel',[0,0,.24]);
      }
      if(name==='supplyBox'){
        const hinge=native.supply.lidHinge.clone().sub(frames.get(id(name)).rest);
        wrap(top,native.supply.lidMeshes,'supplyBox/lid','箱盖与提手外观','box-lid-visual','supplyBox','supplyBox',[0,0,0],'entity-aggregate-candidate',hinge);
      }
      if(name==='supplyBelt')for(const item of native.supply.instances){
        const serial=String(item.index).padStart(2,'0'),key='round/'+serial;
        const frame=wrap(top,[item.parts.case,item.parts.projectile],key,'弹药展示实例 '+serial,'cartridge-visual-template/2','exhibit','supplyBelt');
        byId.get(id(key)).relations=[{type:'carriedBy',target:id('supplyBelt'),status:'source-layout candidate'}];
        wrap(frame,[item.parts.case],key+'/case','弹壳 '+serial,'cartridge-case-exterior',key,key);
        wrap(frame,[item.parts.projectile],key+'/projectile','弹头 '+serial,'projectile-exterior',key,key);
        wrap(top,[item.parts.link],'link/'+serial,'链节 '+serial,'belt-link-exterior','supplyBelt','supplyBelt');
      }
    }
    const roots=[{id:id('exhibit'),key:'exhibit',label:'航空 M2 外观总装候选',kind:'digital-assembly',historicalInstance:{status:'unknown'}},{id:id('gun'),key:'gun',label:'航空 M2 枪体候选',kind:'entity-aggregate-candidate',partOf:id('exhibit'),typeOf:'.50-aircraft-M2-family'},{id:id('assetFrame'),key:'assetFrame',label:'R02 数字参考架',kind:'reference-frame',worldPose:{status:'unknown'}}];
    function apply(){
      for(const {frame,rest,offset}of frames.values()){frame.position.copy(rest).addScaledVector(offset,amount);frame.quaternion.identity();}
      frames.get(id('supplyBox/lid')).frame.rotation.z=lidAmount*Math.PI*.58;
      const bullet=frames.get(id('round/'+String(focusedRound).padStart(2,'0')+'/projectile'));bullet.frame.position.x+=separation*.18;
      const link=frames.get(id('link/'+String(focusedRound).padStart(2,'0')));link.frame.position.z+=separation*.11;
      native.root.updateMatrixWorld(true);
    }
    function range(value){if(!Number.isFinite(value)||value<0||value>1)throw Error('Invalid display state');}
    function setExplode(value){range(value);amount=value;apply();}
    function setLid(value){range(value);lidAmount=value;apply();}
    function setSeparation(value,index=focusedRound){range(value);if(!Number.isInteger(index)||index<1||index>58)throw Error('Unknown display instance');separation=value;focusedRound=index;apply();}
    function position(key,ctx=context){if(!ctx||ctx.snapshot!==context.snapshot||ctx.frame!==context.frame||ctx.assetId!==context.assetId)return {status:'unknown-context'};let e=byId.get(id(key));if(!e)return {status:'unknown-object'};const p=new T.Vector3(),seen=new Set();while(e){if(seen.has(e.id))throw Error('Cyclic pose chain');seen.add(e.id);p.add(new T.Vector3(...e.frame.translation));e=byId.get(e.poseParent);}return {status:'known-digital-relative-position',position:p.toArray(),frame:context.frame,units:context.units,worldPose:context.worldPose};}
    function packet(){return {format:'object-dna-display-exchange-draft',formatVersion:'0.2',knowledgeVersion:'W12',status:'project draft, not a universal standard',context,vocabulary:{typeOf:'classification',partOf:'candidate digital composition',poseParent:'coordinate parent, not type inheritance',carriedBy:'display payload relationship',displayOffset:'viewer separation, not disassembly'},unknownPolicy:'unknown never substitutes zero, false or identity transform',scope:'visible exterior digital model; no operating internals, physical installation or ammunition contents',roots,objects:entries,types:[CartridgeProgram.description],identityMigration:entries.filter(e=>e.previousIds).map(e=>({previousIds:e.previousIds,id:e.id})),unresolved:[{id:'gun-internals',status:'not-implemented'},{id:'b24-station-and-mount',status:'unknown'},{id:'sight',status:'unresolved-applicability'},{id:'historical-material',status:'unknown'},{id:'source-animation',status:'absent-in-all-inspected-files'},{id:'firing-animation',status:'not-implemented'}],dependencies:{geometry:'readable W12 rules',reconstructionCompleteFromThisPacketAlone:false},presentation:{expanded:amount>0,expansion:amount,lid:lidAmount,separation,focusedRound,mode:'authored display controls',sourceAnimationImported:false,doesNotModifyAssemblyState:true},referenceInventory:{allOriginalMeshNodes:[4,6,7,9,11,13,15,17,19,21,23,25,27],assemblyOriginalMeshNodes:[6,7,9,11,15,17,19,21,23,25,27],separatelyLaidOut:[4,13],additionalReferences:['cal50-practice exterior','7.62x54mmR separation semantics only','browning-m2 box/link/material motifs']}};}
    return {entries,frames,context,id,setExplode,setLid,setSeparation,position,packet,amount:()=>amount,lid:()=>lidAmount,separation:()=>separation,focusedRound:()=>focusedRound,get:key=>byId.get(id(key))};
  }
  return {create};
})();
