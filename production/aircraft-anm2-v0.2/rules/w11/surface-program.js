/* W11: authored exterior appearance only; no historical material identification.
 * Material addresses are (domainId, referencePosition), never vertex indices.
 * Reference positions use the fixed dimensionless digital-asset frame.
 * Mesh attributes are transient samples; remeshing correspondence is not implemented.
 */
const SurfaceProgram=(()=>{
  const context=Object.freeze({assetId:'ODNA:MECH:ANM2:PILOT-0001',frame:'digital-reference/R02',snapshot:'W11-demo/1',worldTransform:null,historicalTime:null});
  const presets={coated:{color:0x343e43,metalness:.65,roughness:.52},metal:{color:0x858d91,metalness:.88,roughness:.35}};
  function create(T,native){
    let state='coated';const domains=[];native.root.updateMatrixWorld(true);
    native.root.traverse(m=>{if(!m.isMesh)return;
      const domainId='surface/'+m.userData.semantic+'/'+m.name;
      // A named region can be represented by several mesh patches in the generator.
      if(!domains.some(d=>d.domainId===domainId))domains.push({domainId,partId:m.userData.entityId,appearance:m.userData.appearance||'gun-surface',regionId:'region/'+m.name,materialInstanceId:domainId+'/candidate-layer-1',interpretation:'authored-exterior-region; physical partition unverified'});
      m.userData.materialDomainId=domainId;
      const p=m.geometry.attributes.position,a=new Float32Array(p.count*3),v=new T.Vector3();
      for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);a.set([v.x,v.y,v.z],i*3);}
      m.geometry.setAttribute('materialCoordinate',new T.BufferAttribute(a,3));
    });
    const material=new T.MeshStandardMaterial({...presets.coated,side:T.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 materialCoordinate; varying vec3 vMaterialCoordinate;').replace('#include <begin_vertex>','#include <begin_vertex>\nvMaterialCoordinate=materialCoordinate;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        varying vec3 vMaterialCoordinate;
        float filteredCos(float phase){float footprint=fwidth(phase);return cos(phase)*(1.0-smoothstep(1.0,3.14159,footprint));}
      `).replace('#include <color_fragment>',`#include <color_fragment>
        vec3 q=vMaterialCoordinate;
        float grain=0.65*filteredCos(dot(q,vec3(31.0,1700.0,2100.0)))+0.35*filteredCos(dot(q,vec3(83.0,3300.0,1400.0)));
        diffuseColor.rgb*=1.0+0.055*grain;
      `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+0.035*grain,0.2,0.85);');
    };
    material.customProgramCacheKey=()=> 'W11-stable-surface-1';
    function setState(id){if(!presets[id])throw Error('Unknown surface candidate');state=id;material.color.setHex(presets[id].color);material.metalness=presets[id].metalness;material.roughness=presets[id].roughness;}
    function query(address,ctx=context){
      if(!ctx||ctx.assetId!==context.assetId||ctx.frame!==context.frame||ctx.snapshot!==context.snapshot)return {status:'unknown-context'};
      if(!address||!domains.some(d=>d.domainId===address.domainId)||!Array.isArray(address.position)||address.position.length!==3||!address.position.every(Number.isFinite))return {status:'unknown-address'};
      const [x,y,z]=address.position,grain=.65*Math.cos(31*x+1700*y+2100*z)+.35*Math.cos(83*x+3300*y+1400*z);
      const isBrass=domains.find(d=>d.domainId===address.domainId).appearance==='brass';
      return {status:'authored-field; surface-membership-not-validated',state:isBrass?'brass-visual-candidate':state,roughness:(isBrass?.43:presets[state].roughness)+.035*grain,colorMultiplier:1+.055*grain,context};
    }
    function audit(){return {context,state,domains,coordinateFrame:'fixed digital reference; dimensionless',materialCoordinatesIndependentOfCamera:true,automaticAging:false,geometryDisplacement:false,worldKernelConnected:false,remeshMappingImplemented:false,historicalMaterialVerified:false,shaderFiltering:'screen derivative low-pass; underlying field remains fixed',queryScope:'domain field evaluator, not a surface location validator'};}
    return {material,setState,query,audit,state:()=>state};
  }
  return {create};
})();
