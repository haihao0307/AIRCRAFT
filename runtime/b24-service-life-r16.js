import * as THREE from 'three';
import {disposeGroup} from './skin-joints-r14.js';
import {createReferencePanels,PANEL_GLSL} from './b24-reference-panels-r16.js';

export const SERVICE_PRESETS={
  new:{use:.03,care:.98,exposure:.08,damage:0,repair:0,label:'新机 / 初期使用'},
  maintained:{use:.62,care:.9,exposure:.5,damage:0,repair:0,label:'长期服役 / 保养良好'},
  field:{use:.82,care:.25,exposure:.82,damage:0,repair:0,label:'野外服役 / 保养不足'},
  damage:{use:.62,care:.45,exposure:.55,damage:1,repair:0,label:'局部战损示意'},
  repaired:{use:.62,care:.85,exposure:.55,damage:1,repair:1,label:'换板与补漆后的服役机'}
};
const helpers=PANEL_GLSL+`
uniform float slUse,slCare,slExposure,slDamage,slRepair,slSeams;
float slHash(vec2 v){return fract(sin(dot(v,vec2(127.1,311.7)))*43758.5453);}
float slPeriod(float x,float p){return abs(fract(x/p+.5)-.5)*p;}
float slBand(float x,float a,float b){return smoothstep(a-.06,a,x)*(1.0-smoothstep(b,b+.06,x));}
float slBox(vec2 p,vec2 b){vec2 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,q.y),0.0);}
float slNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(slHash(i),slHash(i+vec2(1,0)),f.x),mix(slHash(i+vec2(0,1)),slHash(i+vec2(1,1)),f.x),f.y);}
float slWave(vec3 p){vec2 q=p.xz+vec2(p.y*.73,p.y*.39);return .65*slNoise(q)+.35*slNoise(q*2.71+13.0);}
`;
const surfaceCode=`
vec3 sq=vSkinWorld;
// A smooth longitudinal datum keeps isolated belly fittings out of the panel domain.
float sax=abs(sq.x),smid=mix(-.55,-.18,1.0-smoothstep(-11.9,-8.0,sq.z));
vec2 suv=vec2(sq.z,atan(sq.y-smid,sq.x)*.95),spitch=vec2(.82,.71);
float svalid=1.0,sup=smoothstep(smid-.2,smid+.7,sq.y),scontact=0.0,sleading=0.0;
float sx=sax<5.5?3.378:7.802,sy=sax<5.5?-.05645:.09068;
float sz=sq.z+(sax>5.5?.2874:0.0),sr=length(vec2(sax-sx,sq.y-sy));
bool scowl=nacellePaint>.5&&sax>2.4&&sr<.96&&sz>-1.45&&sz<3.14;
if(sax<1.38){
  float access=min(abs(slBox(vec2(sq.z+6.2,sq.y+.12),vec2(.36,.25))),abs(slBox(vec2(sq.z-5.55,sq.y+.4),vec2(.3,.35))));
  scontact=(1.0-smoothstep(.015,.07,access))*smoothstep(.5,.9,sax);
}else if(scowl){
  suv=vec2(sz,atan(sq.y-sy,sax-sx)*.72);spitch=vec2(.62,.75);sup=smoothstep(sy-.15,sy+.55,sq.y);
  sleading=1.0-smoothstep(.025,.09,abs(sz-2.93));
  scontact=(1.0-smoothstep(.015,.06,slPeriod(sz-.1,.62)))*.45;
}else if(tailPaint>.5||(sq.z< -9.0&&sax>1.15)){
  suv=sax>3.3?vec2(sq.z,sq.y):vec2(sq.x,sq.z);spitch=vec2(.63,.48);sup=upperWeight;
}else if(sax>1.38&&sq.z> -4.8&&sq.z<3.2){
  suv=vec2(sq.x,sq.z+.19*sax);spitch=vec2(.9,.62);sup=upperWeight;
  scontact=slBand(sax,1.4,2.45)*slBand(sq.z,-1.1,.8)*sup;
  sleading=(1.0-smoothstep(.04,.12,abs(suv.y-2.55)))*sup;
}else{svalid=0.0;}
// Derivative-filtered, surface-local panel and fastener display. Illustrative spacing.
vec2 sd=vec2(slPeriod(suv.x,spitch.x),slPeriod(suv.y,spitch.y));
float sfw=max(length(fwidth(suv)),.00001),sline=min(sd.x,sd.y);
float seam=(1.0-smoothstep(.0007,.002+sfw,sline))*.003/(sfw+.003)*svalid*slSeams;
float rd=min(length(vec2(abs(sd.x-.019),slPeriod(suv.y,.033))),length(vec2(slPeriod(suv.x,.033),abs(sd.y-.019))));
float rivet=(1.0-smoothstep(.0014,.0027+sfw*.5,rd))*(1.0-smoothstep(.0025,.009,sfw))*svalid*slSeams;
float sh=.00065*rivet-.00035*seam;
if(wpSurface>.5&&wpSurface<1.5){
  vec3 panel=wpDetail(vec2(sax,sq.z),upperWeight);seam=panel.x*slSeams;rivet=panel.y*slSeams;sh=panel.z*slSeams;
}else if(wpSurface>1.5&&wpSurface<3.5){
  // Moving controls are separate parts; the drawing's ribs are not joined
  // skin panels and must not inherit paired rivet rows from the fixed wing.
  seam=0.0;rivet=0.0;sh=0.0;
  if(wpSurface<2.5){float rib=1.0-smoothstep(.009,.028+sfw,slPeriod(sax-1.18,.61));sh=-.00018*rib*slSeams;}
}else if(wpSurface>3.5){
  seam=0.0;rivet=0.0;sh=0.0;
  if(sax>.85&&sax<3.5&&sq.z> -10.48){
    float td=min(min(abs(sax-1.05),abs(sax-1.78)),min(abs(sax-2.52),abs(sax-3.23)));
    seam=(1.0-smoothstep(.0007,.002+sfw,td))*.003/(sfw+.003)*slSeams;
    float tr=length(vec2(abs(td-.019),slPeriod(sq.z,.033)));
    rivet=(1.0-smoothstep(.0014,.0027+sfw*.5,tr))*(1.0-smoothstep(.0025,.009,sfw))*slSeams;
    sh=.00065*rivet-.00035*seam;
  }
}
float sregion=slWave(sq*1.2);
vec2 chipCell=floor(suv*150.0),chipLocal=fract(suv*150.0)-.5;
float sgrain=slHash(chipCell),chipRadius=.13+.21*slHash(chipCell+17.0);
float chipEdge=length(chipLocal*vec2(.8,1.15))+.035*sin(chipLocal.x*29.0+chipLocal.y*23.0+sgrain*30.0);
float chipShape=1.0-smoothstep(chipRadius-sfw*50.0,chipRadius+sfw*50.0+.025,chipEdge);
float fade=slUse*slExposure*(.45+.25*(1.0-slCare))*sup;
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.86+vec3(.095,.086,.06),fade*(.6+.4*sregion));
float chipZone=max(scontact,sleading);
float chip=chipZone*smoothstep(1.0-slUse*.29,1.0,sgrain)*chipShape*(1.0-smoothstep(.004,.014,sfw));
float soot=0.0,oil=0.0;
if(scowl){
  float aft=slBand(sz,-1.35,1.1),lower=1.0-smoothstep(sy-.35,sy+.1,sq.y);
  soot=aft*lower*(.5+.5*slWave(vec3(sq.x*18.0,sq.y*14.0,sz*.7)));
  oil=slBand(sz,-.9,.5)*(1.0-smoothstep(sy-.5,sy-.2,sq.y))*(.5+.5*sin(sq.x*65.0+sz*2.0));
}
float belly=(1.0-smoothstep(profile.w+.15,profile.w+.7,sq.y))*float(sax<1.35);
float splash=belly*slBand(sq.z,1.2,4.05)*(.3+.7*slWave(vec3(sq.x*18.,sq.y*2.,sq.z*8.)));
float exhaustZ=sax<5.5?-.12882:-.41097;
float travel=exhaustZ-sq.z,plumeWidth=.10+.14*max(travel,0.0);
float plume=exp(-pow((sax-sx)/plumeWidth,2.0))*slBand(travel,-.06,2.45);
plume*=1.0-smoothstep(sy-.2,sy+.08,sq.y);
float deposit=plume*(1.0-exp(-3.4*slUse))*(1.0-.80*slCare)*(.72+.28*slWave(vec3(sq.x*16.0,sq.y*2.0,sq.z*3.0)));
float dirt=slUse*(1.0-slCare)*(.17*sregion+.20*splash+.1*seam);
diffuseColor.rgb*=1.0-dirt;
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.008,.007,.006),deposit*.84);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.024,.027,.023),oil*slUse*(1.0-slCare)*.28);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.43,.47,.46),chip*.9);
diffuseColor.rgb*=1.0-.25*seam;
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.12+.012,rivet*.4);
float slMetal=chip*.72+rivet*.12;
float slRough=clamp(.7+fade*.2+dirt*.1-chip*.34-oil*slUse*(1.0-slCare)*.15,.35,.95);
// Damage is a localized event; it does not arise simply by advancing service age.
vec2 hitUV=vec2(sq.z+7.2,sq.y+.18);
vec2 woundDelta=hitUV-vec2(-.15,.1);
if(length(hitUV-vec2(.11,-.08))<length(woundDelta))woundDelta=hitUV-vec2(.11,-.08);
if(length(hitUV-vec2(.22,.14))<length(woundDelta))woundDelta=hitUV-vec2(.22,.14);
if(length(hitUV-vec2(-.04,.02))<length(woundDelta))woundDelta=hitUV-vec2(-.04,.02);
float wound=length(woundDelta),wa=atan(woundDelta.y,woundDelta.x);
float woundSeed=dot(hitUV-woundDelta,vec2(37.0,53.0));
float jagged=.027+.005*sin(wa*3.0+woundSeed)+.002*sin(wa*8.0+woundSeed*.77);
float damageZone=slDamage*(1.0-slRepair)*step(.45,sq.x);
if(damageZone>.5&&wound<jagged)discard;
float torn=damageZone*(1.0-smoothstep(jagged,jagged+.009,wound));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.39,.42,.40),torn);slMetal=max(slMetal,torn*.75);sh+=torn*.002;
float repairedArea=(1.0-smoothstep(0.0,.008,slBox(hitUV,vec2(.36,.27))))*slRepair*slDamage*step(.45,sq.x);
diffuseColor.rgb=mix(diffuseColor.rgb,skinUpper*vec3(.92,1.13,1.03),repairedArea);slRough=mix(slRough,.67,repairedArea);
`;

export function createServiceLife(aircraft,scene,skinSystem,renderer,qa){
  const referencePanels=createReferencePanels(skinSystem);
  const uniforms=Object.fromEntries(['Use','Care','Exposure','Damage','Repair','Seams'].map(k=>['sl'+k,{value:k==='Seams'?1:0}]));
  let state={...SERVICE_PRESETS.maintained,preset:'maintained'},extra=new THREE.Group();scene.add(extra);
  for(const mesh of skinSystem.paintMeshes){
    const material=mesh.material,previous=material.onBeforeCompile;
    material.onBeforeCompile=shader=>{
      previous(shader);Object.assign(shader.uniforms,uniforms,referencePanels.uniforms);
      const id=mesh.userData.sourceNode;shader.uniforms.wpSurface={value:[1696,1708].includes(id)?1:[570,836].includes(id)?2:[575,829].includes(id)?3:([1717,726,729].includes(id)||(/rudder/i.test(aircraft.paths[id])))?4:0};
      shader.fragmentShader=helpers+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',surfaceCode+'\n#include <roughnessmap_fragment>\nroughnessFactor=slRough;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=max(metalnessFactor,slMetal);');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 sdx=dFdx(-vViewPosition),sdy=dFdy(-vViewPosition);
        vec3 sr1=cross(sdy,normal),sr2=cross(normal,sdx);float sdet=dot(sdx,sr1);
        normal=normalize(abs(sdet)*normal-sign(sdet)*(dFdx(sh)*sr1+dFdy(sh)*sr2));
      `);
    };material.customProgramCacheKey=()=> 'b24-r16-service-skin-v1';material.needsUpdate=true;
  }
  const exhaust=aircraft.meshes.find(m=>m.userData.sourceNode===1681);
  if(exhaust){const m=exhaust.material,previous=m.onBeforeCompile;m.onBeforeCompile=shader=>{
    previous(shader);Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec3 exWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nexWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='varying vec3 exWorld;uniform float slUse,slCare;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float exZ=abs(exWorld.x)<5.5?-.12882:-.41097;
      float mouth=1.0-smoothstep(exZ+.02,exZ+.18,exWorld.z);
      float carbon=mouth*(1.0-exp(-4.0*slUse))*(1.0-.6*slCare);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.006,.005,.004),carbon*.95);
    `);};m.customProgramCacheKey=()=> 'r16-exhaust-carbon';m.needsUpdate=true;}
  const tires=[],rims=[],bolts=[];
  for(const id of [598,681,1200]){
    const mesh=aircraft.meshes.find(m=>m.userData.sourceNode===id);if(!mesh)continue;
    const m=mesh.material;m.color.set('#363934');m.metalness=0;
    m.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vTire;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTire=position;');
      shader.fragmentShader=helpers+'varying vec3 vTire;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float tr=length(vTire.yz),tx=abs(vTire.x)/.355,ta=atan(vTire.y,vTire.z);
        float tread=(1.0-smoothstep(.66,.92,tx))*smoothstep(.89,.95,tr);
        float center=(1.0-smoothstep(.15,.63,tx))*tread;
        float gd=min(abs(abs(vTire.x)-.078),abs(abs(vTire.x)-.173));
        float fw=max(fwidth(vTire.x),.0001);
        float grooves=(1.0-smoothstep(.004,.008+fw,gd))*tread*(1.0-slUse*(.3+.55*center));
        float mold=(1.0-smoothstep(.004,.009+fwidth(tr),min(abs(tr-.72),abs(tr-.82))))*smoothstep(.6,.8,tx);
        float scrub=(.5+.5*sin(ta*163.0+vTire.x*74.0))*center*slUse;
        diffuseColor.rgb*=1.0-grooves*.56;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.071,.052),slUse*(1.0-slCare)*(1.0-center)*.55);
        diffuseColor.rgb*=1.0+.12*mold+.11*scrub+.28*center*slUse;
        float th=-.0035*grooves+.001*mold;
      `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=.95-.19*center*slUse;')
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 tdx=dFdx(-vViewPosition),tdy=dFdy(-vViewPosition),t1=cross(tdy,normal),t2=cross(normal,tdx);float td=dot(tdx,t1);
        normal=normalize(abs(td)*normal-sign(td)*(dFdx(th)*t1+dFdy(th)*t2));
      `);
    };m.customProgramCacheKey=()=> 'b24-r16-tire-v1';m.needsUpdate=true;tires.push(id);
  }
  for(const id of [601,684,1203]){
    const mesh=aircraft.meshes.find(m=>m.userData.sourceNode===id);if(!mesh)continue;rims.push(id);
    const original=mesh.material,previous=original.onBeforeCompile;
    original.onBeforeCompile=shader=>{previous(shader);Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 vRim;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRim=position;');shader.fragmentShader=helpers+'varying vec3 vRim;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float hr=length(vRim.yz),ring=1.0-smoothstep(.008,.02,min(abs(hr-.84),abs(hr-.45)));
      diffuseColor.rgb*=1.0-.20*ring-.15*slUse*(1.0-slCare)*(.4+.6*sin(hr*18.0)*sin(hr*18.0));
    `);};original.customProgramCacheKey=()=> 'b24-r16-rim-v1';original.needsUpdate=true;
    const caster=new THREE.Raycaster(),poses=[],inverse=mesh.matrixWorld.clone().invert();
    // Some hubs include a separate outer cover; seat hardware on the visible
    // assembly surface instead of burying it under that cover.
    const center=new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld);
    const assembly=aircraft.meshes.filter(m=>{let visible=true;for(let p=m;p;p=p.parent)visible&&=p.visible;return visible&&new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).distanceTo(center)<.65;});
    for(const side of [-1,1])for(let i=0;i<8;i++){
      const a=i*Math.PI/4,y=Math.sin(a)*.67,z=Math.cos(a)*.67;caster.set(new THREE.Vector3(side*2,y,z).applyMatrix4(mesh.matrixWorld),new THREE.Vector3(-side,0,0).transformDirection(mesh.matrixWorld));
      const hit=caster.intersectObjects(assembly,false)[0];if(!hit)continue;
      const o=new THREE.Object3D();o.position.copy(hit.point).applyMatrix4(inverse);o.position.x+=side*.018;o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(side,0,0));o.updateMatrix();poses.push(o.matrix.clone());
    }
    // A wheel-cover bolt circle shares a face plane; do not raise individual
    // heads onto a suspension strut that happens to occlude that circle.
    for(let k=0;k<poses.length;k+=8){const xs=poses.slice(k,k+8).map(m=>m.elements[12]).sort((a,b)=>a-b),plane=(xs[3]+xs[4])*.5;poses.slice(k,k+8).forEach(m=>m.elements[12]=plane);}
    const geometry=new THREE.CylinderGeometry(.033,.038,.022,6),material=new THREE.MeshStandardMaterial({color:'#8a908a',metalness:.7,roughness:.43,envMap:original.envMap});
    const hardware=new THREE.InstancedMesh(geometry,material,poses.length);poses.forEach((m,i)=>hardware.setMatrixAt(i,m));hardware.instanceMatrix.needsUpdate=true;hardware.matrixAutoUpdate=false;hardware.matrix.copy(mesh.matrixWorld);hardware.computeBoundingSphere();extra.add(hardware);bolts.push({node:id,count:poses.length});
  }
  const $=s=>document.querySelector(s);
  function apply(){
    for(const k of ['use','care','exposure','damage','repair'])uniforms['sl'+k[0].toUpperCase()+k.slice(1)].value=state[k];
    $('#lifeUse').value=state.use;$('#lifeCare').value=state.care;$('#lifeExposure').value=state.exposure;
    $('#lifeReadout').textContent=state.label;$('#lifeExplanation').textContent=state.damage?(state.repair?'局部更换蒙皮与补漆：新补漆区和周围旧漆保留差异。此处是事件关系示意。':'左后机身局部破口示意，与服役年限独立。可用“战损位置”近看。'):'上表面暴露褪色；接触区掉漆；排气与腹部积污；保养减少可清洁污渍，已有磨耗仍保留。';
    document.querySelectorAll('[data-life]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.life===state.preset)));
  }
  document.querySelectorAll('[data-life]').forEach(b=>b.onclick=()=>{state={...SERVICE_PRESETS[b.dataset.life],preset:b.dataset.life};apply();});
  for(const [selector,key] of [['#lifeUse','use'],['#lifeCare','care'],['#lifeExposure','exposure']])$(selector).oninput=e=>{state[key]=+e.target.value;state.preset='custom';state.label='自定义服役状态';apply();};
  $('#fullSeams').onchange=e=>uniforms.slSeams.value=e.target.checked?1:0;
  const views={belly:[[.8,-5,5.4],[0,-2,3.3]],port:[[4,-2,3],[.95,-1.4,.15]],starboard:[[-4,-2,3],[-.95,-1.4,.15]],tire:[[5.6,-1.6,2.5],[3.98,-2.15,-.35]],nose:[[1.9,-2.5,5.8],[0,-2.4,4.6]],skin:[[3.2,-.05,-6.9],[.9,-.2,-7.2]],wing:[[8,8,1],[8,.3,-.3]],'wing-bottom':[[8,-7,1],[8,.1,-.4]],'tail-root':[[3.5,4,-14],[0,.6,-10.7]],'gear-port':[[5.7,-2,2],[3.38,-.5,.1]],'gear-starboard':[[-5.7,-2,2],[-3.38,-.5,.1]],'exhaust-starboard':[[-4.2,-2.1,.6],[-3.38,-.5,-.6]],exhaust:[[4.2,-2.1,.6],[3.38,-.5,-.6]]};
  document.querySelectorAll('[data-service-view]').forEach(b=>b.onclick=()=>{const v=views[b.dataset.serviceView];qa.focus(v[0],v[1]);$('#status').textContent='R16 · '+b.textContent+' · '+state.label;});
  apply();
  window.__B24_SERVICE_R16__={version:'R16',panels:referencePanels.audit,state:()=>({...state,seams:uniforms.slSeams.value}),stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,hardwareVisible:extra.visible,hardwareBounds:extra.children.map(m=>{const b=new THREE.Box3().setFromObject(m);return {min:b.min.toArray(),max:b.max.toArray()};})}),audit:()=>({tires,rims,bolts,paintDatumCorrections:skinSystem.paintDatumCorrections,sourceUVUsed:false,depthBias:{node:1747,factor:1,units:2},surfaceLayout:'Airfix page17 upper/lower wing panels; approximate registration; no retired seam inputs',paintNodes:skinSystem.paintMeshes.map(m=>m.userData.sourceNode)}),presets:SERVICE_PRESETS};
  return {update:camera=>{extra.visible=camera.position.length()<35;},dispose:()=>{referencePanels.dispose();disposeGroup(extra);}};
}
