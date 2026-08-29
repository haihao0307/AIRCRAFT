/* B24 Native Review V010 Ridged Local Damage Experiment
 * Derived from V009-R1 without geometry, source payload, animation, or approval changes.
 * Ridged noise is confined by semantic part masks, a geometry transition proxy,
 * a broad service-damage field, and a generic service-state gate.
 */
(function(){
'use strict';
const BUILD='B24_NATIVE_REVIEW_V010_RIDGED_LOCAL_DAMAGE_EXPERIMENT_2026-08-29';
const REMOTE_BASELINE={branch:'research/b24-engineering-drawings-cad-v1',head:'1010e49817a62985b94ab8a9e1605ba89b07a759',pr:14};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pathOf=item=>String(item?.node?.semanticPathLower||item?.node?.def?.semanticPath||'').toLowerCase();
const isGearPath=p=>p.includes('_gear_')||p.includes('/gear')||p.includes('_wheel_')||p.includes('/wheel')||p.includes('landing_gear')||p.includes('tire');
const isProtected=(item,p)=>{
  const fam=item?.family;
  return fam==='glass'||fam==='propeller'||fam==='tire'||fam==='landing-mechanism'||fam==='propulsion-mechanism'||fam==='interior-detail'||fam==='legacy-weapon'||fam==='legacy-surface-overlay'||isGearPath(p);
};
function damageZoneFor(item,p){
  if(isProtected(item,p))return 0;
  const fam=item?.family;
  if(p.includes('cowl_flaps'))return .96;
  if(p.includes('bomb_door'))return .82;
  if(p.includes('waist_01')||p.includes('side_door'))return .76;
  if(p.includes('rudder')||p.includes('elevator')||p.includes('aileron'))return .72;
  if(p.includes('door'))return .66;
  if(fam==='airframe-detail')return .54;
  if(fam==='airframe-skin')return .18;
  return 0;
}
function zoneClass(z){return z<=0?'protected':z>=.7?'high':z>=.4?'medium':'low';}
function addStyles(){
  if(document.getElementById('v010-ridged-style'))return;
  const style=document.createElement('style');
  style.id='v010-ridged-style';
  style.textContent=`
  .v010Badge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:#fce8c7;border:1px solid #d3a356;color:#6c4712;font-size:9px;font-weight:900;letter-spacing:.03em}
  .v010Grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.v010Grid button{padding:7px 5px!important;font-size:10px!important}
  .v010Label{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px}.v010Label b{font-size:10px;color:#784b12}
  .v010Note{margin-top:8px;padding:8px;border-radius:8px;background:#fff7e8;border:1px solid #dfbe82;color:#6b4c20;font-size:10px;line-height:1.55}
  .v010Limit{margin-top:7px;padding:7px 8px;border-radius:8px;background:#eef4f7;border:1px solid #b9cbd4;color:#36525f;font-size:10px;line-height:1.5}
  .v010Quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.v010Quick button{padding:7px 5px!important;font-size:10px!important}
  .v010State{margin-top:7px;display:grid;grid-template-columns:1fr auto;gap:5px 10px;font-size:10px;line-height:1.45}.v010State b{color:#744612}
  `;
  document.head.appendChild(style);
}
function updateCopy(v){
  document.title='B24 数据原生整机 V010 Ridged 局部损伤实验';
  document.documentElement.dataset.version='v010-ridged-experiment';
  document.documentElement.dataset.build='v010-ridged-local-damage-2026-08-29';
  document.documentElement.dataset.ridgedNoise='localized-experiment';
  document.documentElement.dataset.approval='all-false';
  document.documentElement.dataset.sourcePayload='unchanged-from-v009-r1';
  const current=document.querySelector('.versionCurrent');if(current)current.textContent='当前实验文件 · V010 Ridged';
  const build=document.querySelector('.buildCurrent');if(build)build.textContent='BUILD 2026-08-29 · V010 EXPERIMENT';
  const stamp=document.querySelector('.reviewStamp');if(stamp)stamp.textContent='Aircraft Native Forge · V010 RIDGED EXPERIMENT';
  const heading=document.querySelector('header h1');if(heading)heading.textContent='B24 数据原生整机生产 · V010 Ridged 局部损伤';
  const quick=document.querySelector('.quickDock p');if(quick)quick.textContent='Ridged 只进入局部破损与露底层，并由零件语义、几何过渡代理、宽域损伤场和通用服役状态共同限制。现阶段不提供整机批准。';
  const mode=document.getElementById('modeLabel');if(mode)mode.textContent='V010 Ridged 服役中预设';
  v.autoRotate=false;
  const auto=document.getElementById('autoRotate');if(auto)auto.checked=false;
  v.setView?.('perspective');v.camera.distance=v.radius*2.36;
}
function installMaterialZones(v){
  const before=v.materialFor.bind(v);
  v.materialFor=function(item){
    const mat=before(item),p=pathOf(item),z=damageZoneFor(item,p);
    return{...mat,damageZone:z,damageZoneClass:zoneClass(z),protectedFromRidged:z===0};
  };
  const counts={protected:0,low:0,medium:0,high:0};
  const triangles={protected:0,low:0,medium:0,high:0};
  for(const item of v.items){const z=damageZoneFor(item,pathOf(item)),k=zoneClass(z);counts[k]++;triangles[k]+=item.mesh?.triangleCount||0;}
  v.__v010ZoneCoverage={counts,triangles,totalItems:v.items.length,totalTriangles:Object.values(triangles).reduce((a,b)=>a+b,0)};
}
function compileRidgedShader(v){
  const g=v.gl;
  const vs2=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPosition;layout(location=1)in vec3 aNormal;
uniform mat4 uModel;uniform mat4 uVP;
out vec3 vN;out vec3 vW;out vec3 vLocal;
void main(){vec4 w=uModel*vec4(aPosition,1.0);vW=w.xyz;vLocal=aPosition;vN=normalize(mat3(uModel)*aNormal);gl_Position=uVP*w;}`;
  const vs1=`precision highp float;
attribute vec3 aPosition;attribute vec3 aNormal;
uniform mat4 uModel;uniform mat4 uVP;
varying vec3 vN;varying vec3 vW;varying vec3 vLocal;
void main(){vec4 w=uModel*vec4(aPosition,1.0);vW=w.xyz;vLocal=aPosition;vN=normalize(mat3(uModel)*aNormal);gl_Position=uVP*w;}`;
  const helpers=`
float box1(float x,float a,float b,float feather){return smoothstep(a-feather,a+feather,x)*(1.0-smoothstep(b-feather,b+feather,x));}
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  float n000=hash31(i+vec3(0,0,0)),n100=hash31(i+vec3(1,0,0));
  float n010=hash31(i+vec3(0,1,0)),n110=hash31(i+vec3(1,1,0));
  float n001=hash31(i+vec3(0,0,1)),n101=hash31(i+vec3(1,0,1));
  float n011=hash31(i+vec3(0,1,1)),n111=hash31(i+vec3(1,1,1));
  float nx00=mix(n000,n100,f.x),nx10=mix(n010,n110,f.x),nx01=mix(n001,n101,f.x),nx11=mix(n011,n111,f.x);
  return mix(mix(nx00,nx10,f.y),mix(nx01,nx11,f.y),f.z);
}
float fbm4(vec3 p){float n=0.0;n+=.52*noise3(p);p=p*2.03+vec3(11.7,3.1,7.9);n+=.26*noise3(p);p=p*2.07+vec3(2.3,13.1,5.7);n+=.13*noise3(p);p=p*2.11+vec3(7.1,1.9,17.3);n+=.065*noise3(p);return n/.975;}
float ridged6(vec3 p){
  float sum=0.0,amp=.52,weight=1.0,norm=0.0;
  for(int i=0;i<6;i++){
    float signal=1.0-abs(noise3(p)*2.0-1.0);
    signal*=signal;signal*=weight;weight=clamp(signal*1.72,0.0,1.0);
    sum+=signal*amp;norm+=amp;p=p*2.03+vec3(3.7,11.1,5.9);amp*=.50;
  }
  return sum/max(norm,.0001);
}
`;
  const body=`
  vec3 viewDir=normalize(uEye-vW);
  vec3 geometric=normalize(cross(dFdx(vW),dFdy(vW)));geometric=faceforward(geometric,-viewDir,geometric);
  vec3 vertexNormal=normalize(vN);vertexNormal=faceforward(vertexNormal,-viewDir,vertexNormal);
  float nv=length(vN)>0.01?1.0:0.0;vec3 n=normalize(mix(geometric,vertexNormal,.985*nv));
  float role=clamp(uSurfaceRole,0.0,1.0),zone=clamp(uDamageZone,0.0,1.0);
  vec3 seed=vec3(uNoiseSeed*.017,uNoiseSeed*.031,uNoiseSeed*.047);
  vec3 p=vW*(.34+1.66*uNoiseScale)+seed;
  float macroN=fbm4(p),microN=noise3(vW*(7.0+17.0*uNoiseScale)+seed*3.7);
  float streakN=fbm4(vec3(vW.x*.46,vW.y*2.15,vW.z*.38)+seed*1.8);
  float curvatureProxy=clamp(length(fwidth(vertexNormal))*3.8,0.0,1.0);
  float transitionProxy=smoothstep(.055,.34,curvatureProxy);
  float ageMask=role*uAge*(.20+.80*macroN);
  float broadDamageField=fbm4(p*1.35+vec3(5.2,17.4,2.8));
  float broadDamageMask=role*uDamage*smoothstep(.74,.92,broadDamageField+transitionProxy*.12);
  float grime=role*uAge*smoothstep(.62,.86,streakN)*.14;

  vec3 ridgeP=vW*(1.05+5.75*uRidgedScale)+seed*6.1+vec3(17.2,4.9,29.3);
  float ridgeField=ridged6(ridgeP);
  float ridgeGate=smoothstep(uRidgedThreshold,min(.995,uRidgedThreshold+.12),ridgeField);
  float damageGate=smoothstep(.50,.84,broadDamageField+transitionProxy*.18);
  float structuralGate=zone*(.52+.48*transitionProxy);
  float serviceState=clamp(.30+.70*(uAge*.45+uDamage*.55),0.0,1.0);
  float serviceGate=mix(.20,1.0,clamp(uServiceGate,0.0,1.0))*serviceState;
  float ridgedMask=role*uRidgedEnabled*uRidgedStrength*ridgeGate*damageGate*structuralGate*serviceGate*3.6;
  ridgedMask=clamp(ridgedMask,0.0,.92);

  float rough=clamp(uRough+ageMask*(.10+.16*microN)+(microN-.5)*role*.065+broadDamageMask*.055-ridgedMask*.16,.025,.98);
  float metal=clamp(uMetal*(1.0-ageMask*.075)+ridgedMask*(.94-uMetal),0.0,1.0);
  vec3 base=uColor.rgb;
  base=mix(base,base*vec3(.82,.84,.78),ageMask*.17);
  base*=1.0-grime*.18;
  base=mix(base,vec3(.255,.272,.265),broadDamageMask*.34);
  base=mix(base,vec3(.43,.455,.45),ridgedMask*.72);
  if(uPart==1){
    vec3 span=max(uLocalMax-uLocalMin,vec3(.0001));
    float along=clamp((vLocal.z-uLocalMin.z)/span.z,0.0,1.0),across=clamp((vLocal.x-uLocalMin.x)/span.x,0.0,1.0);
    float yellowTip=smoothstep(.81,.88,along);base=mix(base,vec3(.92,.68,.075),yellowTip);
    float textZone=box1(along,.60,.655,.004);
    float bars=box1(across,.27,.30,.008)+box1(across,.35,.38,.008)+box1(across,.43,.46,.008)+box1(across,.51,.54,.008)+box1(across,.59,.62,.008)+box1(across,.67,.70,.008);
    base=mix(base,vec3(.80,.82,.78),clamp(textZone*bars,0.0,1.0)*.82);
  }
  vec3 sun=normalize(vec3(.30,.82,.48)),fill=normalize(vec3(-.68,.28,-.44));
  float key=max(dot(n,sun),0.0),secondary=max(dot(n,fill),0.0),hemi=mix(.20,.50,clamp(n.y*.5+.5,0.0,1.0));
  float diffuse=hemi+.58*key+.14*secondary;
  vec3 halfDir=normalize(sun+viewDir);float gloss=mix(150.0,7.0,rough);
  float specular=pow(max(dot(n,halfDir),0.0),gloss)*mix(.05,.46,metal)*(1.0-rough*.44);
  float fresnel=pow(1.0-max(dot(n,viewDir),0.0),4.0)*mix(.035,.18,metal);
  vec3 c=base*diffuse+vec3(specular+fresnel);c*=1.10;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);c=pow(max(c,vec3(0.0)),vec3(1.0/2.2));
  `;
  const uniforms=`uniform vec4 uColor;uniform vec3 uEye;uniform float uMetal;uniform float uRough;uniform int uPart;uniform vec3 uLocalMin;uniform vec3 uLocalMax;uniform float uAge;uniform float uDamage;uniform float uNoiseScale;uniform float uSurfaceRole;uniform float uNoiseSeed;uniform float uDamageZone;uniform float uRidgedEnabled;uniform float uRidgedStrength;uniform float uRidgedScale;uniform float uRidgedThreshold;uniform float uServiceGate;`;
  const fs2=`#version 300 es
#extension GL_OES_standard_derivatives : enable
precision highp float;in vec3 vN;in vec3 vW;in vec3 vLocal;${uniforms}out vec4 o;${helpers}void main(){${body}o=vec4(c,uColor.a);}`;
  const fs1=`#extension GL_OES_standard_derivatives : enable
precision highp float;varying vec3 vN;varying vec3 vW;varying vec3 vLocal;${uniforms}${helpers}void main(){${body}gl_FragColor=vec4(c,uColor.a);}`;
  const oldProgram=v.p,next=v.program(v.webgl2?vs2:vs1,v.webgl2?fs2:fs1);v.p=next;
  v.u={
    model:g.getUniformLocation(next,'uModel'),vp:g.getUniformLocation(next,'uVP'),color:g.getUniformLocation(next,'uColor'),eye:g.getUniformLocation(next,'uEye'),
    metal:g.getUniformLocation(next,'uMetal'),rough:g.getUniformLocation(next,'uRough'),part:g.getUniformLocation(next,'uPart'),localMin:g.getUniformLocation(next,'uLocalMin'),localMax:g.getUniformLocation(next,'uLocalMax'),
    age:g.getUniformLocation(next,'uAge'),damage:g.getUniformLocation(next,'uDamage'),noiseScale:g.getUniformLocation(next,'uNoiseScale'),surfaceRole:g.getUniformLocation(next,'uSurfaceRole'),noiseSeed:g.getUniformLocation(next,'uNoiseSeed'),
    damageZone:g.getUniformLocation(next,'uDamageZone'),ridgedEnabled:g.getUniformLocation(next,'uRidgedEnabled'),ridgedStrength:g.getUniformLocation(next,'uRidgedStrength'),ridgedScale:g.getUniformLocation(next,'uRidgedScale'),ridgedThreshold:g.getUniformLocation(next,'uRidgedThreshold'),serviceGate:g.getUniformLocation(next,'uServiceGate')
  };
  if(oldProgram)g.deleteProgram(oldProgram);
  v.renderItem=function(item,mat){
    const gl=this.gl,model=item.node?item.node.world:item.model;
    gl.uniformMatrix4fv(this.u.model,false,model);gl.uniform4f(this.u.color,...mat.color,mat.alpha);gl.uniform1f(this.u.metal,mat.metal);gl.uniform1f(this.u.rough,mat.rough);
    gl.uniform1f(this.u.age,this.surfaceAge);gl.uniform1f(this.u.damage,this.surfaceDamage);gl.uniform1f(this.u.noiseScale,this.surfaceNoiseScale);gl.uniform1f(this.u.surfaceRole,mat.surfaceRole||0);gl.uniform1f(this.u.noiseSeed,this.surfaceNoiseSeed);
    gl.uniform1f(this.u.damageZone,mat.damageZone||0);gl.uniform1f(this.u.ridgedEnabled,this.ridgedEnabled?1:0);gl.uniform1f(this.u.ridgedStrength,this.ridgedStrength);gl.uniform1f(this.u.ridgedScale,this.ridgedScale);gl.uniform1f(this.u.ridgedThreshold,this.ridgedThreshold);gl.uniform1f(this.u.serviceGate,this.serviceGate);
    const p=pathOf(item),isStaticBlade=item.family==='propeller'&&item.mesh?.triangleCount===1119&&p.includes('_still_');gl.uniform1i(this.u.part,isStaticBlade?1:0);
    const b=item.mesh?.bounds;if(b){gl.uniform3f(this.u.localMin,...b.min);gl.uniform3f(this.u.localMax,...b.max);}else{gl.uniform3f(this.u.localMin,-1,-1,-1);gl.uniform3f(this.u.localMax,1,1,1);}
    gl.bindVertexArray(item.gpu.vao);gl.drawElements(gl.TRIANGLES,item.gpu.count,gl.UNSIGNED_INT,0);
  };
}
function setValue(id,value,labelId,formatter=v=>`${Math.round(v*100)}%`){
  const el=document.getElementById(id);if(el)el.value=String(value);const label=document.getElementById(labelId);if(label)label.textContent=formatter(value);
}
function syncUi(v){
  const box=document.getElementById('v010RidgedEnabled');if(box)box.checked=!!v.ridgedEnabled;
  setValue('v010RidgedStrength',v.ridgedStrength,'v010RidgedStrengthValue');
  setValue('v010RidgedScale',v.ridgedScale,'v010RidgedScaleValue');
  setValue('v010RidgedThreshold',v.ridgedThreshold,'v010RidgedThresholdValue');
  setValue('v010ServiceGate',v.serviceGate,'v010ServiceGateValue');
  const state=document.getElementById('v010StateText');if(state)state.textContent=v.ridgedEnabled?'开启':'关闭';
}
function applyPreset(v,name){
  if(name==='off'){v.ridgedEnabled=false;}
  if(name==='service'){v.ridgedEnabled=true;v.ridgedStrength=.34;v.ridgedScale=.62;v.ridgedThreshold=.64;v.serviceGate=.48;v.surfaceAge=.46;v.surfaceDamage=.22;}
  if(name==='restrained'){v.ridgedEnabled=true;v.ridgedStrength=.22;v.ridgedScale=.58;v.ridgedThreshold=.70;v.serviceGate=.38;v.surfaceAge=.40;v.surfaceDamage=.16;}
  if(name==='diagnostic'){v.ridgedEnabled=true;v.ridgedStrength=.88;v.ridgedScale=.78;v.ridgedThreshold=.48;v.serviceGate=.86;v.surfaceAge=.68;v.surfaceDamage=.72;}
  syncUi(v);
  setValue('v009r1Age',v.surfaceAge,'v009r1AgeValue');setValue('v009r1Damage',v.surfaceDamage,'v009r1DamageValue');
  updateQa(v,name);
}
function installControls(v){
  v.ridgedEnabled=true;v.ridgedStrength=.34;v.ridgedScale=.62;v.ridgedThreshold=.64;v.serviceGate=.48;
  v.surfaceDamage=Math.max(v.surfaceDamage||0,.22);
  const anchor=document.getElementById('v009r1SurfacePanel'),panel=document.querySelector('.panel');if(!panel||document.getElementById('v010RidgedPanel'))return;
  const section=document.createElement('section');section.className='section';section.id='v010RidgedPanel';section.innerHTML=`
    <h2>Ridged 局部损伤 <span class="v010Badge">V010 EXPERIMENT</span></h2>
    <div class="v010Grid"><button data-v010-preset="restrained">克制</button><button data-v010-preset="service">服役中</button><button data-v010-preset="diagnostic">诊断增强</button><button data-v010-preset="off">关闭 Ridged</button></div>
    <label class="v010Label"><span>启用局部层</span><input id="v010RidgedEnabled" type="checkbox" checked></label>
    <label class="v010Label"><span>局部强度</span><b id="v010RidgedStrengthValue">34%</b></label><input id="v010RidgedStrength" type="range" min="0" max="1" step="0.01" value="0.34">
    <label class="v010Label"><span>脊线尺度</span><b id="v010RidgedScaleValue">62%</b></label><input id="v010RidgedScale" type="range" min="0.12" max="1.5" step="0.01" value="0.62">
    <label class="v010Label"><span>露底阈值</span><b id="v010RidgedThresholdValue">64%</b></label><input id="v010RidgedThreshold" type="range" min="0.30" max="0.88" step="0.01" value="0.64">
    <label class="v010Label"><span>通用服役门控</span><b id="v010ServiceGateValue">48%</b></label><input id="v010ServiceGate" type="range" min="0" max="1" step="0.01" value="0.48">
    <div class="v010State"><span>Ridged 状态</span><b id="v010StateText">开启</b><span>历史证据门</span><b>未开放</b><span>高度与法线</span><b>本轮关闭</b></div>
    <div class="v010Note">局部层仅改变蒙皮和细节件的底色、粗糙度与局部金属暴露。玻璃、螺旋桨、轮胎、起落架、轮舱机械和内部细节默认保护。</div>
    <div class="v010Limit">当前结构门使用零件语义和几何过渡代理。它不能替代真实板缝、铆钉、检修口拓扑，也不构成某一架历史飞机的损伤证据。</div>`;
  if(anchor?.nextSibling)anchor.parentNode.insertBefore(section,anchor.nextSibling);else panel.appendChild(section);
  document.getElementById('v010RidgedEnabled').onchange=e=>{v.ridgedEnabled=!!e.target.checked;syncUi(v);updateQa(v,'custom');};
  const bind=(id,key,label)=>{const el=document.getElementById(id);el.oninput=()=>{v[key]=+el.value;syncUi(v);updateQa(v,'custom');};};
  bind('v010RidgedStrength','ridgedStrength','v010RidgedStrengthValue');bind('v010RidgedScale','ridgedScale','v010RidgedScaleValue');bind('v010RidgedThreshold','ridgedThreshold','v010RidgedThresholdValue');bind('v010ServiceGate','serviceGate','v010ServiceGateValue');
  section.querySelectorAll('[data-v010-preset]').forEach(btn=>btn.onclick=()=>applyPreset(v,btn.dataset.v010Preset));
  syncUi(v);
}
function installQuickViews(v){
  const dock=document.querySelector('.quickDock');if(!dock||document.getElementById('v010Quick'))return;
  const box=document.createElement('div');box.id='v010Quick';box.innerHTML=`<div class="v010Quick"><button id="v010Full">V010 完整飞机</button><button id="v010Nacelle">短舱局部层</button><button id="v010BombDoor">弹舱门局部层</button><button id="v010Gear">保护组检查</button></div>`;dock.appendChild(box);
  const mode=t=>{const el=document.getElementById('modeLabel');if(el)el.textContent=t;};
  const parked=()=>v.setFlightState?.('parked',false);
  document.getElementById('v010Full').onclick=()=>{parked();v.setView?.('perspective');v.camera.distance=v.radius*2.36;mode('V010 Ridged 完整飞机');};
  document.getElementById('v010Nacelle').onclick=()=>{parked();v.camera.target=[3.375,-.02,2.72];v.camera.yaw=-.70;v.camera.pitch=.05;v.camera.distance=v.radius*.34;mode('V010 短舱与整流片局部损伤');};
  document.getElementById('v010BombDoor').onclick=()=>{parked();v.camera.target=[.0,-.80,-1.25];v.camera.yaw=-1.57;v.camera.pitch=-.20;v.camera.distance=v.radius*.42;mode('V010 弹舱门局部损伤');};
  document.getElementById('v010Gear').onclick=()=>{parked();v.camera.target=[5.0,-.45,-.15];v.camera.yaw=-.82;v.camera.pitch=-.10;v.camera.distance=v.radius*.34;mode('V010 起落架保护组');};
}
function updateQa(v,preset='custom'){
  const q=window.__B24_V010_QA_STATE__;if(!q)return;
  q.surface={
    preset,ridgedEnabled:!!v.ridgedEnabled,ridgedStrength:Number(v.ridgedStrength.toFixed(3)),ridgedScale:Number(v.ridgedScale.toFixed(3)),ridgedThreshold:Number(v.ridgedThreshold.toFixed(3)),serviceGate:Number(v.serviceGate.toFixed(3)),
    baseAge:Number(v.surfaceAge.toFixed(3)),baseDamage:Number(v.surfaceDamage.toFixed(3)),baseNoiseScale:Number(v.surfaceNoiseScale.toFixed(3)),skinMetalness:Number(v.skinMetal.toFixed(3)),skinRoughness:Number(v.skinRough.toFixed(3)),
    shader:'world-space-value-noise-fbm4-plus-ridged6-localized',globalNoiseRaisesMetalness:false,localizedRidgedRaisesMetalness:true,heightChannel:false,normalChannel:false,historicalEvidenceGateOpen:false
  };
}
function buildQa(v){
  const r1=window.__B24_V009_R1_QA_STATE__||{};
  window.__B24_V010_QA_STATE__={
    schema:'haihao.aircraft/b24-v010-ridged-local-damage@1.0.0',build:BUILD,ready:true,generatedAt:new Date().toISOString(),remoteBaseline:REMOTE_BASELINE,
    sourceLock:{...r1.sourceLock},geometry:{...r1.geometry},sourcePayloadChanged:false,geometryChanged:false,animationChanged:false,
    noiseKnowledge:{article:'10 Noise Functions for Three.js TSL Shaders',entryApplied:'#7 Ridged Noise',sourceCodeAuthority:'V001 ridged transcription only',otherNineEntries:'concept-level catalog, independent production mapping'},
    implementation:{baseLayer:['value-noise','fbm4'],localizedLayer:'ridged6',maskStack:['semantic-part-zone','geometry-transition-proxy','broad-service-damage-field','generic-service-state'],channels:['baseColor','roughness','localized-metalness'],protectedGroups:['glass','propeller','tire','landing-mechanism','propulsion-mechanism','interior-detail','legacy-weapon','gear-paths'],panelTopologyAuthority:false,historicalAircraftDamageAuthority:false},
    coverage:v.__v010ZoneCoverage,
    regressions:{propellerAxis:r1.regressions?.propellerAxis||'fixed-local-y',nacelleSkin:r1.regressions?.nacelleSkin||'unified',landingGearMaterial:r1.regressions?.landingGearMaterial||'preserved'},
    approvals:{visualApproved:false,engineeringApproved:false,productionFrozen:false,wholeAircraftApproved:false,ridgedLayerApproved:false},
    limitations:['geometry transition proxy is not a panel-line map','generic service gate has no aircraft-specific historical authority','height and normal channels are intentionally disabled','remote browser workflows were not changed by this local experiment']
  };
  updateQa(v,'service');
}
function installCaptureApi(v){
  const views={
    full(){v.setFlightState?.('parked',false);v.setView?.('perspective');v.camera.distance=v.radius*2.36;},
    nacelle(){v.setFlightState?.('parked',false);v.camera.target=[3.375,-.02,2.72];v.camera.yaw=-.70;v.camera.pitch=.05;v.camera.distance=v.radius*.34;},
    bombDoor(){v.setFlightState?.('parked',false);v.camera.target=[0,-.80,-1.25];v.camera.yaw=-1.57;v.camera.pitch=-.20;v.camera.distance=v.radius*.42;},
    gear(){v.setFlightState?.('parked',false);v.camera.target=[5.0,-.45,-.15];v.camera.yaw=-.82;v.camera.pitch=-.10;v.camera.distance=v.radius*.34;},
    propeller(){v.camera.target=[3.375,-.055,3.477];v.camera.yaw=0;v.camera.pitch=.03;v.camera.distance=v.radius*.23;v.setFlightState?.('startup',false);}
  };
  window.__B24_V010_CAPTURE__={
    setView(name){(views[name]||views.full)();return name in views;},
    setPreset(name){applyPreset(v,name);return name;},
    state(){return JSON.parse(JSON.stringify(window.__B24_V010_QA_STATE__));},
    stopMotion(){v.autoRotate=false;v.playing=false;v.setFlightState?.('parked',false);return true;},
    coverage(){return JSON.parse(JSON.stringify(v.__v010ZoneCoverage));}
  };
}
function patch(v){
  if(!v||v.__v010RidgedPatched)return false;
  v.__v010RidgedPatched=true;window.__B24_NATIVE_V010__=v;
  addStyles();updateCopy(v);installMaterialZones(v);compileRidgedShader(v);installControls(v);installQuickViews(v);buildQa(v);installCaptureApi(v);
  v.applyAnimation(v.animTime||0);v.__v009ApplyPropSpin?.();
  document.documentElement.dataset.qa='v010-local-browser-pending';
  document.documentElement.dataset.production='v010-ridged-experiment-awaiting-visual-review';
  return true;
}
const timer=setInterval(()=>{const v=window.__B24_NATIVE_V009_R1__;if(v?.__v009r1Patched&&patch(v))clearInterval(timer);},80);
})();
