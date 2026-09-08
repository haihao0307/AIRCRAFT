/* Explicit draft vocabulary for a historical display asset; not a universal standard. */
const ObjectDNA=(()=>{
  const labels={receiver:'机匣外观组件',cover:'顶盖外观区域',positivePlate:'侧板外观区域',collar:'前环外观组件',barrel:'枪管与护套外观组',rear:'后端外观组件',sideHandle:'侧面操作件外观',supplyBox:'弹箱外观',supplyBelt:'弹带与弹药展示组'};
  const offsets={receiver:[0,0,0],cover:[0,.35,0],positivePlate:[0,.02,.36],collar:[.25,-.2,0],barrel:[.58,.15,0],rear:[-.36,0,0],sideHandle:[0,.15,.46],supplyBox:[.25,-.15,.3],supplyBelt:[0,.22,.3]};
  function create(T,native){
    const entries=[],frames=new Map(),byId=new Map();let amount=0;
    const context=Object.freeze({assetId:'ODNA:MECH:ANM2:PILOT-0001',snapshot:'W11/source-layout/1',frame:'R02-digital-reference',units:'receiver-datum separation; dimensionless',historicalTime:{status:'unknown'},worldPose:{status:'unknown'}});
    function wrap(host,meshes,id,label,type,partOf,poseParent,offset,kind='entity-candidate'){
      if(!meshes.length)return;
      const bounds=new T.Box3();for(const m of meshes){m.updateMatrix();m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrix));}
      const anchor=bounds.getCenter(new T.Vector3()),frame=new T.Group();frame.name=id;frame.position.copy(anchor);host.add(frame);
      meshes.forEach(m=>{frame.add(m);m.position.sub(anchor);m.userData.entityId=id;});
      const record={id,label,kind,typeOf:type,partOf,poseParent,frame:{translation:anchor.toArray(),rotationQuaternion:[0,0,0,1],units:context.units,anchorMeaning:'representation anchor from local exterior bounds; not a certified mechanical interface'},sourceNodes:[...new Set(meshes.flatMap(m=>m.userData.sourceNodeCandidates||[m.userData.sourceNode]))],sourceCorrespondence:'regional candidate; instance-to-source-mesh correspondence unverified',geometry:{status:'implemented-exterior-candidate',ruleFiles:['geometry-program.js','supply-program.js'],meshNames:meshes.map(m=>m.name)},material:{status:'authored-preview; historical-material-unknown'},knowledge:{status:'source-observed; semantic-interpretation-candidate'},implementation:{status:'partial'},verification:{status:'runtime-checked; geometry-and-historical-acceptance-pending'},lifecycle:{historicalIdentity:'unknown',eventHistory:'unknown'},displayOffset:offset||[0,0,0],context};
      entries.push(record);byId.set(id,record);frames.set(id,{frame,rest:anchor.clone(),offset:new T.Vector3(...record.displayOffset)});return frame;
    }
    for(const [name,host]of Object.entries(native.groups)){
      const id='W11/'+name;
      const type=name.startsWith('supply')?'supply-exterior-display':'gun-exterior-display';
      const frame=wrap(host,[...host.children].filter(m=>m.isMesh),id,labels[name]||name,type,name.startsWith('supply')?'W11/exhibit':'W11/gun','W11/assetFrame',offsets[name],['cover','positivePlate'].includes(name)?'semantic-region-candidate':'entity-aggregate-candidate');
      if(name==='rear'){
        for(const [key,label,filter,offset]of [
          ['gripA','握把 A 外观',m=>m.name.startsWith('rear-grip-0'),[0,0,.14]],
          ['gripB','握把 B 外观',m=>m.name.startsWith('rear-grip-1'),[0,0,-.14]],
          ['control','翼状控制件外观',m=>m.name==='rear-upper-control',[-.16,.20,0]],
          ['roundEnd','后端圆筒外观',m=>m.name==='rear-external-cylinder',[-.20,-.12,0]]
        ])wrap(frame,[...frame.children].filter(m=>m.isMesh&&filter(m)),id+'/'+key,label,'rear-exterior-component',id,id,offset);
      }
      if(name==='supplyBelt')for(const mesh of [...frame.children].filter(m=>m.isMesh&&m.userData.entityRole==='cartridge-display')){
        const rid='W11/round/'+String(mesh.userData.instanceIndex).padStart(2,'0');
        wrap(frame,[mesh],rid,'弹药展示实例 '+mesh.userData.instanceIndex,'cartridge-visual-template/1','W11/exhibit',id,[0,0,0]);
        byId.get(rid).relations=[{type:'carriedBy',target:id,status:'source-layout interpretation'}];
      }
    }
    const roots=[{id:'W11/exhibit',label:'原件总装外观解释',kind:'digital-assembly',historicalInstance:{status:'unknown'}},{id:'W11/gun',label:'航空 M2 枪体候选',kind:'entity-aggregate-candidate',partOf:'W11/exhibit',typeOf:'.50-aircraft-M2-family',configuration:{status:'candidate',value:'spade-grip exterior'}},{id:'W11/assetFrame',label:'R02 数字参考架',kind:'reference-frame',worldPose:{status:'unknown'}}];
    function setExplode(value){if(!Number.isFinite(value)||value<0||value>1)throw Error('Invalid display expansion');amount=value;for(const {frame,rest,offset}of frames.values())frame.position.copy(rest).addScaledVector(offset,amount);native.root.updateMatrixWorld(true);}
    function position(id,ctx=context){if(!ctx||ctx.snapshot!==context.snapshot||ctx.frame!==context.frame||ctx.assetId!==context.assetId)return {status:'unknown-context'};let e=byId.get(id);if(!e)return {status:'unknown-object'};const p=new T.Vector3();const seen=new Set();while(e){if(seen.has(e.id))throw Error('Cyclic pose chain');seen.add(e.id);p.add(new T.Vector3(...e.frame.translation));e=byId.get(e.poseParent);}return {status:'known-digital-relative-position',position:p.toArray(),frame:context.frame,units:context.units,worldPose:context.worldPose};}
    function packet(){return {format:'object-dna-display-exchange-draft',formatVersion:'0.1',knowledgeVersion:'W11',status:'project draft, not a universal standard',context,vocabulary:{typeOf:'type classification',partOf:'candidate digital composition; physical applicability separately recorded',poseParent:'coordinate reference parent, not type inheritance',carriedBy:'payload relationship in this source display',displayOffset:'viewer-only separation; not disassembly path'},unknownPolicy:'unknown, not-applicable, unprovided and conflict are distinct; unknown is never zero/false',scope:'visible exterior interpretation; no working internals, physical installation or ammunition construction',roots,objects:entries,unresolved:[{id:'gun-barrel-internal-separation',status:'not-implemented',note:'barrel and jacket currently share an exterior aggregate'},{id:'internal-mechanisms',status:'not-implemented'},{id:'b24-station',status:'unknown'},{id:'mount-and-sight',status:'unresolved-applicability'},{id:'disposal-path',status:'unknown'},{id:'historical-material',status:'unknown'}],referenceInventory:{allMeshNodes:[4,6,7,9,11,13,15,17,19,21,23,25,27],assemblyMeshNodes:[6,7,9,11,15,17,19,21,23,25,27],separatelyLaidOut:[4,13],note:'separately laid-out source samples are not additional assembled parts'},dependencies:{geometry:'readable rules in fixed W11 release source',reconstructionCompleteFromThisPacketAlone:false},presentation:{expanded:amount>0,expansion:amount,doesNotModifyAssemblyState:true}};}
    return {entries,frames,context,setExplode,position,packet,amount:()=>amount,get:id=>byId.get(id)};
  }
  return {create};
})();
