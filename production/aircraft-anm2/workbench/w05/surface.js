/* W05 ageing surface study. Newly authored spectral fields, no images, no old S01/R01 code.
 * Input coordinates are the normalized rest-space of the displayed exterior, not world space.
 * The palette is an editable hypothesis. No historically calibrated B24 finish is claimed.
 * Gaussian screen-footprint filtering is a local approximation, not proof of alias-free PBR.
 */
const SurfaceProgram = (() => {
  const VERSION='aircraft.surface-study.w05.1';
  const SEED_NAMESPACE='aircraft.surface-study.w04.1';
  const defaults=Object.freeze({color:'#45494b',roughness:.52,metalness:.60,grain:.35,relief:.20,film:0,wear:0,oxidation:0,dust:0,scratches:0});
  const numericKeys=Object.keys(defaults).filter(k=>k!=='color');
  // Artistic study presets only. No period/chemistry claim is attached to these values.
  const presets=Object.freeze({
    baseline:{label:'原版深灰',values:{...defaults}},
    service:{label:'轻度使用',values:{...defaults,color:'#464a4d',roughness:.55,metalness:.72,grain:.46,relief:.25,wear:.23,scratches:.22}},
    dry:{label:'干燥旧化',values:{...defaults,color:'#454640',roughness:.78,metalness:.62,grain:.65,relief:.32,wear:.18,dust:.38,scratches:.30}},
    oily:{label:'旧金属油膜',values:{...defaults,color:'#3b4144',roughness:.48,metalness:.82,grain:.47,relief:.24,film:.58,wear:.24,scratches:.23}},
    oxidized:{label:'氧化候选',values:{...defaults,color:'#494641',roughness:.72,metalness:.76,grain:.66,relief:.35,oxidation:.62,dust:.12,wear:.12}},
    weathered:{label:'较重旧化',values:{...defaults,color:'#4a4944',roughness:.68,metalness:.78,grain:.72,relief:.38,oxidation:.38,dust:.25,wear:.50,scratches:.55}}
  });
  function validate(v){
    if(!v||Object.keys(v).sort().join()!==Object.keys(defaults).sort().join())throw Error('材质字段不匹配');
    if(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))throw Error('颜色必须为六位 sRGB');
    for(const k of numericKeys)if(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]<0||v[k]>1)throw Error('材质参数越界：'+k);
    return {...v,color:v.color.toLowerCase()};
  }
  // Stable label hashing: adding a material/layer does not advance a shared random stream.
  function hash(label){let h=2166136261;for(let i=0;i<label.length;i++){h^=label.charCodeAt(i);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return h>>>0;}
  function waves(process,freq,count=4){
    const a=[];for(let i=0;i<count;i++){
      const key=SEED_NAMESPACE+'/'+process+'/'+i;const v=['x','y','z'].map(c=>hash(key+c)/4294967295*2-1),l=Math.hypot(...v)||1;
      const scale=freq*(.85+.3*hash(key+'f')/4294967295);
      a.push({k:v.map(x=>x/l*scale),phase:hash(key+'p')/4294967295*Math.PI*2,weight:1/count});
    }return a;
  }
  const bands=Object.freeze({tint:waves('finish-tint',6),grain:waves('roughness-grain',56),micro:waves('micro-relief',260),weather:waves('weather-mask',16)});
  function evaluate(process,p,dx=[0,0,0],dy=[0,0,0]){
    if(!bands[process])throw Error('未知过程');
    for(const v of [p,dx,dy])if(!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite))throw Error('坐标无效');
    let value=0;const gradient=[0,0,0];
    for(const m of bands[process]){const dot=v=>m.k.reduce((s,k,i)=>s+k*v[i],0),phase=2*Math.PI*dot(p)+m.phase,atten=Math.exp(-2*Math.PI*Math.PI/12*(dot(dx)**2+dot(dy)**2));value+=m.weight*atten*Math.sin(phase);for(let i=0;i<3;i++)gradient[i]+=m.weight*atten*Math.cos(phase)*2*Math.PI*m.k[i];}
    return {value,gradient};
  }
  const number=x=>x.toFixed(9),gv=v=>'vec3('+v.map(number).join(',')+')';
  function glslField(name,entries){
    return `vec4 ${name}(vec3 p, vec3 dx, vec3 dy){ vec4 f=vec4(0.0);\n`+entries.map(m=>`{vec3 k=${gv(m.k)};float a=6.28318530718*dot(k,p)+${number(m.phase)};float bx=dot(k,dx),by=dot(k,dy);float w=${number(m.weight)}*exp(-1.644934066848*(bx*bx+by*by));f+=vec4(sin(a),6.28318530718*cos(a)*k)*w;}`).join('\n')+'\nreturn f;}';
  }
  function create(T){
    const records=new Set();let values={...defaults},mode='pbr';
    const common=`varying vec3 w04P;uniform vec3 uW04Color;uniform float uW04Rough,uW04Grain,uW04Relief,uW04Film,uW04Mode,uW04Metalness,uW04Wear,uW04Oxidation,uW04Dust,uW04Scratches;\n`+
      glslField('w04Tint',bands.tint)+'\n'+glslField('w04Grain',bands.grain)+'\n'+glslField('w04Micro',bands.micro)+'\n'+glslField('w05Weather',bands.weather);
    function material(surfaceFromLocal){
      const uniforms={uW04Metalness:{value:values.metalness},uW04Wear:{value:values.wear},uW04Oxidation:{value:values.oxidation},uW04Dust:{value:values.dust},uW04Scratches:{value:values.scratches},uW04Frame:{value:surfaceFromLocal.clone()},uW04Color:{value:new T.Color(values.color)},uW04Rough:{value:values.roughness},uW04Grain:{value:values.grain},uW04Relief:{value:values.relief},uW04Film:{value:values.film},uW04Mode:{value:0}};
      // Effective finished-metal appearance, not inferred chemistry. Oil is explicitly off initially.
      const m=new T.MeshPhysicalMaterial({color:0xffffff,metalness:1.0,roughness:.52,clearcoat:1,clearcoatRoughness:.22,side:T.DoubleSide});
      m.name=VERSION;m.customProgramCacheKey=()=>VERSION;
      m.onBeforeCompile=s=>{
        Object.assign(s.uniforms,uniforms);
        s.vertexShader='uniform mat4 uW04Frame; varying vec3 w04P;\n'+s.vertexShader;
        s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nw04P=(uW04Frame*vec4(position,1.0)).xyz;');
        s.fragmentShader=common+'\n'+s.fragmentShader;
        s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec3 w04dx=dFdx(w04P), w04dy=dFdy(w04P);
          float w04t=w04Tint(w04P,w04dx,w04dy).x;
          float w04g=w04Grain(w04P,w04dx,w04dy).x;
          vec4 w04micro=w04Micro(w04P,w04dx,w04dy);
          float w05w=w05Weather(w04P,w04dx,w04dy).x;
          float w05wear=uW04Wear*smoothstep(.08,.52,w05w*.7+w04t*.3);
          float w05oxide=uW04Oxidation*smoothstep(-.20,.38,w05w*.8-w04t*.2)*(1.0-w05wear);
          float w05dust=uW04Dust*smoothstep(-.2,.45,w04t*.65-w05w*.35);
          float w05a=1500.0*w04P.y+17.0*w04g;
          float w05foot=max(abs(dFdx(w05a)),abs(dFdy(w05a)));
          float w05scratch=uW04Scratches*(1.0-smoothstep(.7,2.8,w05foot))*pow(max(0.0,sin(w05a)),24.0)*smoothstep(-.15,.55,w05w);
          vec3 w05color=clamp(uW04Color*(1.0+w04t*.045),0.0,1.0);
          w05color=mix(w05color,vec3(.22,.235,.24),w05wear*.65+w05scratch*.25);
          w05color=mix(w05color,vec3(.11,.040,.014),w05oxide*.7);
          w05color=mix(w05color,vec3(.19,.17,.13),w05dust*.55);
          diffuseColor.rgb=w05color*(1.0-uW04Film*.08);`);
        s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(uW04Rough+w04g*.105*uW04Grain-uW04Film*.09-w05wear*.16-w05scratch*.08+w05oxide*.23+w05dust*.18,.08,.98);`);
        s.fragmentShader=s.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=clamp(uW04Metalness*(1.0-w05oxide*.95)*(1.0-w05dust*.92)+w05wear*.12,0.0,1.0);');
        s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          vec3 w04px=dFdx(-vViewPosition),w04py=dFdy(-vViewPosition);
          vec3 w04r1=cross(w04py,normal),w04r2=cross(normal,w04px);
          float w04det=dot(w04px,w04r1);
          vec3 w04grad=w04micro.yzw*.000045*uW04Relief;
          vec3 w04surfaceGrad=(dot(w04grad,w04dx)*w04r1+dot(w04grad,w04dy)*w04r2)*sign(w04det)/max(abs(w04det),1e-12);
          normal=normalize(normal-w04surfaceGrad);`);
        // Uniform coat coverage avoids toggling program defines while adjusting the slider.
        s.fragmentShader=s.fragmentShader.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= uW04Film * .32;\n#endif\n');
        s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`if(uW04Mode>0.5&&uW04Mode<1.5)outgoingLight=diffuseColor.rgb;
          if(uW04Mode>1.5&&uW04Mode<2.5)outgoingLight=vec3(roughnessFactor);
          if(uW04Mode>2.5)outgoingLight=vec3(metalnessFactor);
          #include <opaque_fragment>`);
      };
      const r={m,uniforms};records.add(r);update(r);return m;
    }
    function update(r){const u=r.uniforms;u.uW04Color.value.set(values.color);for(const [k,name] of [['roughness','Rough'],['metalness','Metalness'],['grain','Grain'],['relief','Relief'],['film','Film'],['wear','Wear'],['oxidation','Oxidation'],['dust','Dust'],['scratches','Scratches']])u['uW04'+name].value=values[k];u.uW04Mode.value=mode==='basecolor'?1:mode==='roughness'?2:mode==='metalness'?3:0;r.m.toneMapped=mode==='pbr';}
    return {material,apply(v){values=validate(v);for(const r of records)update(r);return {...values};},values:()=>({...values}),setMode(m){if(!['pbr','basecolor','roughness','metalness'].includes(m))throw Error('未知表面通道');const changed=mode!==m;mode=m;for(const r of records){update(r);if(changed)r.m.needsUpdate=true;}},forget(m){for(const r of records)if(r.m===m){m.dispose();records.delete(r);}},dispose(){for(const r of records)r.m.dispose();records.clear();},count:()=>records.size,version:VERSION};
  }
  return Object.freeze({create,defaults,presets,numericKeys,validate,evaluate,version:VERSION,seedAlgorithm:'labelled-fnv1a32-avalanche-v1',frequencyBudget:16});
})();
