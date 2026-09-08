/* Authored semantic finishes sampled in a fixed digital reference frame. */
const SurfaceProgram=(()=>{
 const context=Object.freeze({assetId:'ODNA:MECH:ANM2:PILOT-0001',frame:'digital-reference/R02',snapshot:'W12-demo/1',worldTransform:null,historicalTime:null});
 const families={steel:{color:0x343d43,metalness:.7,roughness:.49},boxPaint:{color:0x596047,metalness:.18,roughness:.64},hardware:{color:0x596167,metalness:.78,roughness:.42},brass:{color:0xb49a59,metalness:.78,roughness:.38},copper:{color:0xb7754b,metalness:.78,roughness:.36},linkSteel:{color:0x343b40,metalness:.78,roughness:.44},wood:{color:0x65422b,metalness:0,roughness:.65}};
 function create(T,native){
  let state='coated';const domains=[],materials={};native.root.updateMatrixWorld(true);
  function family(m){if(families[m.userData.appearance])return m.userData.appearance;return /rear-grip-[01](?!.*cap)|side-grip/.test(m.name)?'wood':'steel';}
  for(const [key,preset]of Object.entries(families)){
   const m=materials[key]=new T.MeshStandardMaterial({...preset,side:T.DoubleSide});
   m.onBeforeCompile=shader=>{
    shader.uniforms.handled={value:state==='handled'?1:0};m.userData.shader=shader;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 materialCoordinate; varying vec3 vMaterialCoordinate;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMaterialCoordinate=materialCoordinate;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
     varying vec3 vMaterialCoordinate; uniform float handled;
     float filteredCos(float p){return cos(p)*(1.0-smoothstep(1.0,3.14159,fwidth(p)));}
    `).replace('#include <color_fragment>',`#include <color_fragment>
     vec3 q=vMaterialCoordinate;
     float grain=0.65*filteredCos(dot(q,vec3(31.0,1700.0,2100.0)))+0.35*filteredCos(dot(q,vec3(83.0,3300.0,1400.0)));
     float mottle=sin(q.x*71.0+sin(q.y*39.0))*sin(q.z*63.0+q.y*17.0);
     diffuseColor.rgb*=1.0+${key==='wood'?'0.13':'0.04'}*grain+0.07*handled*mottle;
    `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.025*grain+0.08*handled*mottle,0.2,0.9);');
   };m.customProgramCacheKey=()=> 'W12-semantic-surface-'+key;
  }
  native.root.traverse(m=>{if(!m.isMesh)return;const appearance=family(m),domainId='surface/'+m.userData.semantic+'/'+m.name;m.userData.surfaceFamily=appearance;m.userData.materialDomainId=domainId;
   if(!domains.some(d=>d.domainId===domainId))domains.push({domainId,partId:m.userData.entityId,appearance,regionId:'region/'+m.name,materialInstanceId:domainId+'/candidate-1',interpretation:'authored finish; historical identity unknown'});
   const p=m.geometry.attributes.position,a=new Float32Array(p.count*3),v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);a.set(v.toArray(),i*3);}m.geometry.setAttribute('materialCoordinate',new T.BufferAttribute(a,3));
  });
  function setState(id){if(!['coated','handled'].includes(id))throw Error('Unknown surface candidate');state=id;for(const m of Object.values(materials))if(m.userData.shader)m.userData.shader.uniforms.handled.value=id==='handled'?1:0;}
  function query(address,ctx=context){if(!ctx||ctx.assetId!==context.assetId||ctx.frame!==context.frame||ctx.snapshot!==context.snapshot)return {status:'unknown-context'};const d=domains.find(d=>d.domainId===address?.domainId);if(!d||!Array.isArray(address.position)||address.position.length!==3||!address.position.every(Number.isFinite))return {status:'unknown-address'};
   const [x,y,z]=address.position,grain=.65*Math.cos(31*x+1700*y+2100*z)+.35*Math.cos(83*x+3300*y+1400*z),mottle=Math.sin(x*71+Math.sin(y*39))*Math.sin(z*63+y*17),h=state==='handled'?1:0;
   return {status:'authored-field; surface-membership-not-validated',family:d.appearance,state,roughness:Math.max(.2,Math.min(.9,families[d.appearance].roughness+.025*grain+.08*h*mottle)),colorMultiplier:1+(d.appearance==='wood'?.13:.04)*grain+.07*h*mottle,context};
  }
  function audit(){return {context,state,domains,families,coordinateFrame:'fixed digital reference; dimensionless',materialCoordinatesIndependentOfCamera:true,automaticAging:false,geometryDisplacement:false,worldKernelConnected:false,remeshMappingImplemented:false,historicalMaterialVerified:false,shaderFiltering:'screen derivative low-pass; query evaluates unfiltered field'};}
  return {material:materials.steel,materials:Object.values(materials),matForMesh:m=>materials[m.userData.surfaceFamily],setState,query,audit,state:()=>state};
 }return {create};
})();

