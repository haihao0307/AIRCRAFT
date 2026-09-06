/* W04: independent, bounded PBR appearance program. No raster input, no baked source values.
   Palette and finish are provisional visual choices, not calibrated period material samples.
   Static rest-space fields remain attached during presentation movement.
   Per-wave pixel-footprint filtering is a Gaussian approximation; full PBR aliasing is not proved. */
const DetailSurface = (() => {
 const VERSION='aircraft.exterior-surface.w04.1';
 const defaults=Object.freeze({roughness:.46,grain:.42,relief:.28,film:0});
 const namedUniforms=Object.freeze({roughness:'wmRoughness',grain:'wmGrain',relief:'wmRelief',film:'wmFilm'});
 function seed(label){let h=2166136261;for(const c of label){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
 function coefficients(label,count,frequency){let h=seed(VERSION+label);const next=()=>{h=(Math.imul(h,1664525)+1013904223)>>>0;return h/4294967296;};return Array.from({length:count},()=>{let x=next()*2-1,y=next()*2-1,z=next()*2-1;const l=Math.hypot(x,y,z)||1;const f=frequency*(.8+.4*next());return [x/l*f,y/l*f,z/l*f,next()*Math.PI*2];});}
 const waves=Object.freeze([...coefficients('tint',4,8),...coefficients('grain',5,170),...coefficients('relief',5,470)]);
 function checked(v){if(!v||Array.isArray(v)||Object.keys(v).length!==4)throw Error('材质记录字段不完整');const out={};for(const key in defaults){if(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]<0||v[key]>1)throw Error('材质数值越界：'+key);out[key]=v[key];}return out;}
 function gaussian(k,dx,dy){const ax=k.slice(0,3).reduce((a,v,i)=>a+v*dx[i],0),ay=k.slice(0,3).reduce((a,v,i)=>a+v*dy[i],0);return Math.exp(-(Math.PI*Math.PI/6)*(ax*ax+ay*ay));}
 function sample(p,dx=[0,0,0],dy=[0,0,0]){if(![p,dx,dy].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw Error('坐标输入不合法');return waves.map(k=>Math.sin(Math.PI*2*(k[0]*p[0]+k[1]*p[1]+k[2]*p[2])+k[3])*gaussian(k,dx,dy));}
 const GLSL=`
 varying vec3 wmRest; varying vec3 wmView;
 uniform vec4 wmWaves[14];
 uniform float wmRoughness,wmGrain,wmRelief,wmFilm,wmDisplay;
 vec4 wmWave(vec4 wave,vec3 p,vec3 dx,vec3 dy){
   float attenuation=exp(-1.64493406685*(pow(dot(wave.xyz,dx),2.0)+pow(dot(wave.xyz,dy),2.0)));
   float phase=6.28318530718*dot(wave.xyz,p)+wave.w;
   return vec4(sin(phase),6.28318530718*cos(phase)*wave.xyz)*attenuation;
 }
 vec3 wmPerturb(vec3 N,vec3 dPdx,vec3 dPdy,float dhdx,float dhdy){
   vec3 Rx=cross(dPdy,N), Ry=cross(N,dPdx);float det=dot(dPdx,Rx);
   if(abs(det)<1e-14)return N;
   return normalize(abs(det)*N-sign(det)*(dhdx*Rx+dhdy*Ry));
 }
 `;
 function create(T,{coordinateMatrix=new T.Matrix4()}={}){
  let values={...defaults};
  const uniforms={wmWaves:{value:waves.map(x=>new T.Vector4(...x))},wmCoord:{value:coordinateMatrix.clone()},wmRoughness:{value:values.roughness},wmGrain:{value:values.grain},wmRelief:{value:values.relief},wmFilm:{value:values.film},wmDisplay:{value:0}};
  // Values are explicitly linear reflectance candidates. No second sRGB decode is applied.
  const material=new T.MeshPhysicalMaterial({color:new T.Color().setRGB(.14,.15,.162,T.LinearSRGBColorSpace),metalness:.82,roughness:.46,clearcoat:1,clearcoatRoughness:.27,side:T.DoubleSide});
  material.name=VERSION;
  material.onBeforeCompile=s=>{
   Object.assign(s.uniforms,uniforms);
   s.vertexShader='uniform mat4 wmCoord;varying vec3 wmRest;varying vec3 wmView;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwmRest=(wmCoord*vec4(position,1.0)).xyz;');
   s.vertexShader=s.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nwmView=mvPosition.xyz;');
   s.fragmentShader=GLSL+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 wmDX=dFdx(wmRest),wmDY=dFdy(wmRest);
     float wmTint=0.0,wmGrainValue=0.0;vec4 wmHeight=vec4(0.0);
     for(int j=0;j<4;j++)wmTint+=wmWave(wmWaves[j],wmRest,wmDX,wmDY).x*.25;
     for(int j=4;j<9;j++)wmGrainValue+=wmWave(wmWaves[j],wmRest,wmDX,wmDY).x*.20;
     for(int j=9;j<14;j++)wmHeight+=wmWave(wmWaves[j],wmRest,wmDX,wmDY)*.20;
     // No invented rust, universal bright edges or random damage.
     diffuseColor.rgb*=1.0+wmTint*.020;
     float wmFilmMask=wmFilm*(.65+.25*wmTint);
   `);
   s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(wmRoughness+wmGrain*wmGrainValue*.030-wmFilmMask*.06,.13,.94);');
   s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     vec3 wmGradient=wmHeight.yzw*(.000003*wmRelief);
     normal=wmPerturb(normal,dFdx(wmView),dFdy(wmView),dot(wmGradient,wmDX),dot(wmGradient,wmDY));
   `);
   s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\nmaterial.clearcoat=clamp(wmFilmMask*.45,0.0,1.0);');
   s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','if(wmDisplay>0.5&&wmDisplay<1.5)outgoingLight=diffuseColor.rgb;\nif(wmDisplay>1.5&&wmDisplay<2.5)outgoingLight=vec3(roughnessFactor);\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=>VERSION;
  function apply(v){const next=checked(v);for(const key in next)uniforms[namedUniforms[key]].value=next[key];values=next;}
  return {material,apply,values:()=>({...values}),setCoordinate(m){uniforms.wmCoord.value.copy(m);},setDisplay(mode){uniforms.wmDisplay.value=mode==='color'?1:mode==='roughness'?2:0;const mapped=!['color','roughness'].includes(mode);if(material.toneMapped!==mapped){material.toneMapped=mapped;material.needsUpdate=true;}},dispose(){material.dispose();},uniformSnapshot(){return Object.fromEntries(Object.entries(namedUniforms).map(([k,v])=>[k,uniforms[v].value]));}};
 }
 return Object.freeze({version:VERSION,defaults,create,checked,sample,gaussian,coefficients});
})();
