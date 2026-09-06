/* W06 procedural PBR study for the independent Aircraft AN/M2 exterior.
 * No raster textures. Noise is a bounded visual field in each part's rest coordinates.
 * Presets are review candidates, not certified wartime finish chemistry.
 */
const SurfaceProgram=(()=>{
  const VERSION='aircraft.surface.w06.1';
  const defaults=Object.freeze({color:'#404548',roughness:.50,metalness:.78,grain:.34,relief:.18,oil:.08,wear:.10,oxidation:0,dust:.03,scratches:.16});
  const presets=Object.freeze({
    clean:{label:'维护良好',values:{...defaults,color:'#41474a',roughness:.45,metalness:.80,grain:.24,relief:.12,oil:.12,wear:.04,dust:.01,scratches:.05}},
    service:{label:'服役状态',values:{...defaults,color:'#40464a',roughness:.53,metalness:.79,grain:.38,relief:.20,oil:.13,wear:.18,dust:.05,scratches:.22}},
    dry:{label:'干燥旧化',values:{...defaults,color:'#40423f',roughness:.72,metalness:.70,grain:.62,relief:.28,oil:.01,wear:.19,dust:.28,scratches:.33}},
    oily:{label:'旧金属油膜',values:{...defaults,color:'#303638',roughness:.36,metalness:.88,grain:.36,relief:.16,oil:.62,wear:.16,dust:.02,scratches:.17}},
    oxidized:{label:'氧化候选',values:{...defaults,color:'#45413c',roughness:.70,metalness:.68,grain:.65,relief:.31,oil:.02,wear:.11,oxidation:.44,dust:.10,scratches:.31}},
    heavy:{label:'重度使用候选',values:{...defaults,color:'#40413f',roughness:.66,metalness:.72,grain:.68,relief:.34,oil:.07,wear:.52,oxidation:.20,dust:.22,scratches:.58}}
  });
  const role=Object.freeze({
    steel:{colorMul:[1,1,1],rough:.00,metal:.00},panel:{colorMul:[.96,.98,1.0],rough:.025,metal:-.02},fastener:{colorMul:[1.16,1.16,1.12],rough:-.08,metal:.08},edge:{colorMul:[1.06,1.07,1.06],rough:-.04,metal:.05},barrel:{colorMul:[.80,.84,.86],rough:-.05,metal:.06},grip:{fixedColor:'#15191b',rough:.16,metal:-.55},dark:{fixedColor:'#0d1113',rough:.13,metal:-.65}
  });
  function validate(v){if(!v||Object.keys(v).sort().join()!==Object.keys(defaults).sort().join())throw Error('材质字段不匹配');if(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))throw Error('颜色格式无效');for(const k of Object.keys(defaults))if(k!=='color'&&(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0||v[k]>1))throw Error('材质参数越界：'+k);return{...v,color:v.color.toLowerCase()};}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;}
  function wave(label,freq,count){const a=[];for(let i=0;i<count;i++){const k=label+'/'+i,v=['x','y','z'].map(c=>hash(k+c)/4294967295*2-1),l=Math.hypot(...v)||1,scale=freq*(.86+.28*hash(k+'f')/4294967295);a.push({k:v.map(x=>x/l*scale),p:hash(k+'p')/4294967295*Math.PI*2,w:1/count});}return a;}
  const fields={tint:wave('tint',5.6,4),grain:wave('grain',48,4),micro:wave('micro',220,4),weather:wave('weather',12,4)};
  const num=x=>x.toFixed(8),vec=v=>'vec3('+v.map(num).join(',')+')';
  function glsl(name,list){return `float ${name}(vec3 p,vec3 dx,vec3 dy){float s=0.0;`+list.map(m=>`{vec3 k=${vec(m.k)};float a=6.2831853*dot(k,p)+${num(m.p)};float bx=dot(k,dx),by=dot(k,dy);float f=exp(-1.644934*(bx*bx+by*by));s+=sin(a)*${num(m.w)}*f;}`).join('')+`return s;}`;}
  function create(T){
    let values={...defaults},mode='pbr';const records=[];const normal=new T.MeshNormalMaterial({side:T.DoubleSide}),wire=new T.MeshBasicMaterial({color:0xa8cad5,wireframe:true});
    const common=`varying vec3 wP;uniform vec3 uBase;uniform float uRough,uMetal,uGrain,uRelief,uOil,uWear,uOx,uDust,uScratch,uMode;${glsl('fTint',fields.tint)}${glsl('fGrain',fields.grain)}${glsl('fMicro',fields.micro)}${glsl('fWeather',fields.weather)}\n`;
    function make(kind='steel'){
      const rr=role[kind]||role.steel,base=rr.fixedColor||values.color;
      const uniforms={uBase:{value:new T.Color(base)},uRough:{value:values.roughness+rr.rough},uMetal:{value:values.metalness+rr.metal},uGrain:{value:values.grain},uRelief:{value:values.relief},uOil:{value:values.oil},uWear:{value:values.wear},uOx:{value:values.oxidation},uDust:{value:values.dust},uScratch:{value:values.scratches},uMode:{value:0}};
      const m=new T.MeshPhysicalMaterial({color:0xffffff,metalness:1,roughness:.5,clearcoat:1,clearcoatRoughness:.2,side:T.DoubleSide});m.customProgramCacheKey=()=>VERSION+'/'+kind;
      m.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader='varying vec3 wP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwP=position;');s.fragmentShader=common+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec3 dx=dFdx(wP),dy=dFdy(wP);float t=fTint(wP,dx,dy),g=fGrain(wP,dx,dy),w=fWeather(wP,dx,dy);
        float wear=uWear*smoothstep(.04,.55,w*.72+t*.28);float ox=uOx*smoothstep(-.18,.42,w*.75-t*.25)*(1.0-wear);float dust=uDust*smoothstep(-.25,.48,t*.6-w*.4);
        float a=1200.0*wP.x+37.0*wP.y+17.0*g;float fp=max(abs(dFdx(a)),abs(dFdy(a)));float scratch=uScratch*(1.0-smoothstep(.7,2.4,fp))*pow(max(0.0,sin(a)),28.0)*smoothstep(-.2,.52,w);
        vec3 c=uBase*(1.0+t*.045);c=mix(c,vec3(.31,.32,.31),wear*.55+scratch*.24);c=mix(c,vec3(.12,.055,.026),ox*.70);c=mix(c,vec3(.22,.20,.16),dust*.48);diffuseColor.rgb=clamp(c*(1.0-uOil*.06),0.0,1.0);`);
        s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(uRough+g*.10*uGrain-uOil*.14-wear*.12+ox*.22+dust*.17-scratch*.07,.07,.98);`);
        s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>\nmetalnessFactor=clamp(uMetal*(1.0-ox*.82)*(1.0-dust*.72)+wear*.08,0.0,1.0);`);
        s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\nfloat h=fMicro(wP,dFdx(wP),dFdy(wP));float hx=dFdx(h),hy=dFdy(h);normal=normalize(normal+uRelief*.035*(hx*dFdx(vViewPosition)+hy*dFdy(vViewPosition)));`);
        s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat*=uOil*.35;\n#endif\n');
        s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`if(uMode>0.5&&uMode<1.5)outgoingLight=diffuseColor.rgb;if(uMode>1.5&&uMode<2.5)outgoingLight=vec3(roughnessFactor);if(uMode>2.5)outgoingLight=vec3(metalnessFactor);\n#include <opaque_fragment>`);
      };
      const rec={m,uniforms,kind};records.push(rec);update(rec);return m;
    }
    function update(r){const rr=role[r.kind]||role.steel,base=rr.fixedColor||values.color,c=new T.Color(base);if(!rr.fixedColor){c.r*=rr.colorMul[0];c.g*=rr.colorMul[1];c.b*=rr.colorMul[2];}r.uniforms.uBase.value.copy(c);r.uniforms.uRough.value=Math.max(0,Math.min(1,values.roughness+rr.rough));r.uniforms.uMetal.value=Math.max(0,Math.min(1,values.metalness+rr.metal));for(const [k,n]of[['grain','Grain'],['relief','Relief'],['oil','Oil'],['wear','Wear'],['oxidation','Ox'],['dust','Dust'],['scratches','Scratch']])r.uniforms['u'+n].value=values[k];r.uniforms.uMode.value=mode==='basecolor'?1:mode==='roughness'?2:mode==='metalness'?3:0;r.m.toneMapped=mode==='pbr';}
    return {make,normal,wire,apply(v){values=validate(v);records.forEach(update);return{...values};},values:()=>({...values}),setMode(m){if(!['pbr','basecolor','roughness','metalness'].includes(m))throw Error('未知材质通道');mode=m;records.forEach(r=>{update(r);r.m.needsUpdate=true;});},mode:()=>mode,presets,defaults,dispose(){for(const r of records)r.m.dispose();normal.dispose();wire.dispose();}};
  }
  return Object.freeze({create,defaults,presets,validate,VERSION});
})();
