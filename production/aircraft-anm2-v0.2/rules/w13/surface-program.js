/* Layered finish study derived from inspected material motifs, not copied texture atlases. */
const SurfaceProgram=(()=>{
 const context=Object.freeze({assetId:'ODNA:MECH:ANM2:PILOT-0001',frame:'digital-reference/R02',snapshot:'W13-demo/1',worldTransform:null,historicalTime:null});
 const families={steel:{color:0x363a39,metalness:.9,roughness:.43},boxPaint:{color:0x66684a,metalness:.05,roughness:.57},hardware:{color:0x636765,metalness:.92,roughness:.36},brass:{color:0xb9a05d,metalness:.93,roughness:.33},copper:{color:0xb67b51,metalness:.94,roughness:.32},linkSteel:{color:0x4c514f,metalness:.94,roughness:.39},wood:{color:0x664027,metalness:0,roughness:.47}};
 function create(T,native){
  let state='handled';const domains=[],materials={};native.root.updateMatrixWorld(true);
  const shaderNoise=`float hash3(vec3 p){p=fract(p*0.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float filteredCos(float p){return cos(p)*(1.0-smoothstep(1.0,3.14159,fwidth(p)));}`;
  for(const [key,preset]of Object.entries(families)){
   const m=materials[key]=new T.MeshStandardMaterial({...preset,side:T.DoubleSide});
   m.onBeforeCompile=shader=>{
    shader.uniforms.wearAmount={value:state==='handled'?1:0};m.userData.shader=shader;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 materialCoordinate; attribute vec3 finishCoordinate; varying vec3 vMaterialCoordinate; varying vec3 vFinishCoordinate;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMaterialCoordinate=materialCoordinate;vFinishCoordinate=finishCoordinate;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vMaterialCoordinate; varying vec3 vFinishCoordinate; uniform float wearAmount;\n'+shaderNoise).replace('#include <color_fragment>',`#include <color_fragment>
     vec3 q=vMaterialCoordinate;
     float grain=0.65*filteredCos(dot(q,vec3(31.0,1700.0,2100.0)))+0.35*filteredCos(dot(q,vec3(83.0,3300.0,1400.0)));
     float broad=noise3(q*13.0),medium=noise3(q*89.0),fine=noise3(q*480.0);
     vec3 d=min(clamp(vFinishCoordinate,0.0,1.0),1.0-clamp(vFinishCoordinate,0.0,1.0));
     float edgeDistance=min(min(max(d.x,d.y),max(d.y,d.z)),max(d.z,d.x));
     float edge=(1.0-smoothstep(0.005,0.042,edgeDistance))*smoothstep(0.23,0.69,medium);
     float scratch=smoothstep(0.79,0.95,noise3(q*vec3(13.0,460.0,420.0)))*(0.3+0.7*medium);
     float wear=wearAmount*clamp(edge*0.63+scratch*0.28,0.0,0.8);
     diffuseColor.rgb*=1.0+0.035*grain+0.15*(broad-0.5)+0.07*(medium-0.5);
     ${key==='wood'?`float woodgrain=filteredCos(q.y*980.0+noise3(q*23.0)*9.0);diffuseColor.rgb*=1.0+0.15*woodgrain;`:`diffuseColor.rgb=mix(diffuseColor.rgb,${key==='boxPaint'?'vec3(0.19,0.20,0.17)':'vec3(0.38,0.38,0.33)'},wear*${key==='brass'||key==='copper'?'0.16':'0.55'});`}
     ${key==='boxPaint'?'float chips=smoothstep(0.78,0.91,medium)*edge*wearAmount;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.11,0.095,0.07),chips*.65);':''}
    `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.10*(broad-0.5)+0.07*(medium-0.5)+0.02*grain-wear*0.12,0.23,0.85);');
   };m.customProgramCacheKey=()=> 'W13-layered-surface-'+key;
  }
  function family(m){if(families[m.userData.appearance])return m.userData.appearance;return /rear-grip-[01](?!.*cap)|side-grip/.test(m.name)?'wood':'steel';}
  native.root.traverse(m=>{if(!m.isMesh)return;const appearance=family(m),domainId='surface/'+m.userData.semantic+'/'+m.name;m.userData.surfaceFamily=appearance;m.userData.materialDomainId=domainId;
   if(!domains.some(d=>d.domainId===domainId))domains.push({domainId,partId:m.userData.entityId,appearance,materialInstanceId:domainId+'/layered-candidate-1',interpretation:'authored multi-scale finish; historical identity unknown'});
   const p=m.geometry.attributes.position,a=new Float32Array(p.count*3),f=new Float32Array(p.count*3),v=new T.Vector3();m.geometry.computeBoundingBox();const b=m.geometry.boundingBox,sz=b.getSize(new T.Vector3());
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);f.set([(v.x-b.min.x)/Math.max(sz.x,1e-8),(v.y-b.min.y)/Math.max(sz.y,1e-8),(v.z-b.min.z)/Math.max(sz.z,1e-8)],i*3);v.applyMatrix4(m.matrixWorld);a.set(v.toArray(),i*3);}m.geometry.setAttribute('materialCoordinate',new T.BufferAttribute(a,3));m.geometry.setAttribute('finishCoordinate',new T.BufferAttribute(f,3));
  });
  function setState(id){if(!['coated','handled'].includes(id))throw Error('Unknown surface candidate');state=id;for(const m of Object.values(materials))if(m.userData.shader)m.userData.shader.uniforms.wearAmount.value=id==='handled'?1:0;}
  function query(address,ctx=context){if(!ctx||ctx.assetId!==context.assetId||ctx.frame!==context.frame||ctx.snapshot!==context.snapshot)return {status:'unknown-context'};const d=domains.find(d=>d.domainId===address?.domainId);if(!d||!Array.isArray(address.position)||address.position.length!==3||!address.position.every(Number.isFinite))return {status:'unknown-address'};return {status:'authored material definition; membership not validated',family:d.appearance,state,baseRoughness:families[d.appearance].roughness,baseMetalness:families[d.appearance].metalness,layers:['fixed-reference grain','broad noise','meso noise','bounded edge wear','directional scratches'],edgeCoordinate:'named mesh reference bounds; remesh correspondence unresolved',context};}
  return {material:materials.steel,materials:Object.values(materials),matForMesh:m=>m.userData.keepSurfaceMaterial?m.userData.originalSurfaceMaterial:materials[m.userData.surfaceFamily],setState,query,state:()=>state,audit:()=>({context,state,domains,families,sourceTexturesEmbedded:false,materialCoordinatesIndependentOfCamera:true,automaticAging:false,remeshMappingImplemented:false,historicalMaterialVerified:false,shaderFiltering:'derivative low-pass for micrograin'})};
 }return {create};
})();
