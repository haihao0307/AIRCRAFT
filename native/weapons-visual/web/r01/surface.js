/* Native R01 surface programs. The numerical palette is an art-directed candidate.
   No historical finish certification; no image samplers; fields stay in each mesh's rest space. */
function createSurfaces(T){
 const profiles={steel:[0x485357,.88,.47],panel:[0x434c4e,.83,.53],edge:[0x737c7b,.94,.40],dark:[0x151b20,.60,.60],grip:[0x27241f,.02,.72],olive:[0x525a3c,.24,.66],brass:[0xb9a571,.95,.38],copper:[0x996652,.95,.43]};
 const values={roughness:.50,wear:.24,oil:.20,detail:.55};const records=[];
 const code=`varying vec3 nativeP;uniform float uRough,uWear,uOil,uDetail,uMode,uLayer,uRole;
 float nHash(vec3 p){return fract(sin(dot(p,vec3(37.19,91.13,17.71)))*43758.5453);}
 float nNoise(vec3 p){vec3 a=floor(p),b=fract(p);b=b*b*(3.-2.*b);return mix(mix(mix(nHash(a),nHash(a+vec3(1,0,0)),b.x),mix(nHash(a+vec3(0,1,0)),nHash(a+vec3(1,1,0)),b.x),b.y),mix(mix(nHash(a+vec3(0,0,1)),nHash(a+vec3(1,0,1)),b.x),mix(nHash(a+vec3(0,1,1)),nHash(a+vec3(1,1,1)),b.x),b.y),b.z);}
 vec3 nativeLayers(){float large=.6*nNoise(nativeP*5.7+uRole)+.4*nNoise(nativeP*17.3+9.);float mask=smoothstep(.59,.78,large)*uWear;float oil=smoothstep(.35,.70,nNoise(nativeP*8.1+35.))*uOil;float aa=1.-smoothstep(.004,.015,max(length(dFdx(nativeP)),length(dFdy(nativeP))));float grain=(nNoise(nativeP*160.)-.5)*.09*uDetail*aa;return vec3(mask,oil,grain);}
 `;
 const mats={};let mode='surface',layer=true;
 for(const [key,[hex,metal,rough]]of Object.entries(profiles)){
   const m=new T.MeshPhysicalMaterial({color:hex,metalness:metal,roughness:rough,clearcoat:0,clearcoatRoughness:.26});m.name='native.'+key;
   const uniforms={uRough:{value:.5},uWear:{value:.24},uOil:{value:.2},uDetail:{value:.55},uMode:{value:0},uLayer:{value:1},uRole:{value:Object.keys(profiles).indexOf(key)+1}};
   m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader='varying vec3 nativeP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nnativeP=position;');s.fragmentShader=code+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec3 layers=nativeLayers()*uLayer;float patina=nNoise(nativeP*37.+uRole);diffuseColor.rgb*=1.+(patina-.5)*.13*uDetail*uLayer;diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.45+vec3(.009),layers.x*.6);diffuseColor.rgb*=1.-layers.y*.15;');s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(uRough-.5)*.75+layers.z-layers.x*.09-layers.y*.15,.13,.96);');s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','if(uMode>0.5&&uMode<1.5)outgoingLight=diffuseColor.rgb; if(uMode>1.5&&uMode<2.5)outgoingLight=vec3(roughnessFactor);\n#include <opaque_fragment>');};
   m.customProgramCacheKey=()=> 'wm.native.r01.surface.'+key;records.push({m,uniforms,key,rough});mats[key]=m;
 }
 const normal=new T.MeshNormalMaterial(),wire=new T.MeshBasicMaterial({color:0xa8c7d0,wireframe:true});
 function apply(v){if(!v||Object.keys(v).length!==4)throw Error('材质字段不匹配');for(const k in values)if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0||v[k]>1)throw Error('材质参数范围错误');Object.assign(values,v);for(const r of records){for(const k in values)r.uniforms['u'+k[0].toUpperCase()+k.slice(1)].value=values[k];r.m.clearcoat=['grip','olive'].includes(r.key)?values.oil*.10:values.oil*.42;}}
 return {materials:mats,values,apply,setMode(root,next){mode=next;for(const r of records)r.uniforms.uMode.value=next==='color'?1:next==='roughness'?2:0;root.traverse(o=>{if(!o.isMesh)return;if(!o.userData.pbrMaterial)o.userData.pbrMaterial=o.material;o.material=next==='normal'?normal:next==='wire'?wire:o.userData.pbrMaterial;});},setLayer(on){layer=on;for(const r of records){r.uniforms.uLayer.value=on?1:0;r.m.clearcoat=on?values.oil*(r.key==='grip'||r.key==='olive'?.1:.42):0;}},mode(){return mode;},count(){return records.length;}};
}
