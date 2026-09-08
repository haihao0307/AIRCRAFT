import * as THREE from 'three';
import {ENGINE_ROLES,GEAR_LINE_ROLES} from './b24-r10-detail-regions.js';

// The inherited family label includes tires, wheels, engine internals and gear.
// These are material selections on existing source meshes, not replacement geometry.
export const TIRE_IDS=new Set([598,613,1189,1200,681,689,698]);
const EXPOSED_MAIN_STRUT_RODS=new Set([630,1217]);
export function isDetailSurface(mesh,aircraft){
  const id=mesh.userData.sourceNode,path=aircraft.paths[id];
  return TIRE_IDS.has(id)||[1669,1681,1741].includes(id)||/[lrc]_gear_|[lrc]_wheel_/i.test(path);
}

function propellerBadge(renderer){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;
  const c=canvas.getContext('2d');c.clearRect(0,0,256,384);
  c.fillStyle='#cbb071';c.beginPath();c.ellipse(128,192,117,180,0,0,Math.PI*2);c.fill();
  c.fillStyle='#a73530';c.beginPath();c.ellipse(128,192,82,144,0,0,Math.PI*2);c.fill();
  c.fillStyle='#e4dfc8';c.beginPath();c.moveTo(128,58);c.bezierCurveTo(89,129,146,166,128,192);c.bezierCurveTo(110,218,167,255,128,326);c.bezierCurveTo(166,255,109,218,128,192);c.bezierCurveTo(147,166,90,129,128,58);c.fill();
  c.beginPath();c.arc(128,192,10,0,Math.PI*2);c.fill();
  c.fillStyle='#53422a';c.font='bold 18px Georgia';c.textAlign='center';c.textBaseline='middle';
  for(const [word,sign] of [['HAMILTON',-1],['STANDARD',1]]){
    c.save();c.translate(128+sign*99,192);c.rotate(sign*Math.PI/2);c.fillText(word,0,0,210);c.restore();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function detailReflection(renderer){
  // New renderer cache: neutral studio reflections, limited to the new metal
  // materials. The accepted aircraft paint and markings use their old lighting.
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#c1c6c8');g.addColorStop(.45,'#777e83');g.addColorStop(.6,'#42474b');g.addColorStop(1,'#25282b');c.fillStyle=g;c.fillRect(0,0,512,256);
  for(const [x,y,w,h] of [[58,42,90,136],[310,30,38,156],[420,60,48,80]]){
    const light=c.createLinearGradient(x,0,x+w,0);light.addColorStop(0,'rgba(255,255,255,0)');light.addColorStop(.22,'#f4f5f5');light.addColorStop(.78,'#f4f5f5');light.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=light;c.fillRect(x,y,w,h);
  }
  const source=new THREE.CanvasTexture(canvas);source.colorSpace=THREE.SRGBColorSpace;source.mapping=THREE.EquirectangularReflectionMapping;
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromEquirectangular(source);source.dispose();pmrem.dispose();
  return target.texture;
}

export function applyDetailMaterials(aircraft,renderer){
  const assignments=[],hiddenStaticAlternatives=[];
  const badge=propellerBadge(renderer),reflection=detailReflection(renderer);let bladeCount=0;
  for(const mesh of aircraft.meshes){
    const id=mesh.userData.sourceNode,path=aircraft.paths[id],family=mesh.userData.family;
    if(/tire_blurred/i.test(path)){mesh.visible=false;hiddenStaticAlternatives.push(id);}
    if(family==='propeller'&&mesh.geometry.index.count/3===1119&&path.includes('_still_')){
      const material=new THREE.MeshStandardMaterial({color:'#171a1b',metalness:.12,roughness:.67,side:THREE.DoubleSide});
      material.onBeforeCompile=shader=>{
        shader.uniforms.propBadge={value:badge};
        shader.vertexShader='varying vec3 vBladeLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBladeLocal=position;');
        shader.fragmentShader='varying vec3 vBladeLocal;uniform sampler2D propBadge;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float tip=smoothstep(.74,.78,vBladeLocal.z);
          diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.64,.39,.035),tip);
          vec2 badgeUV=vec2(.5-vBladeLocal.x/.13,.5+(vBladeLocal.z-.32)/.19);
          if(vBladeLocal.y>0.0&&all(greaterThanEqual(badgeUV,vec2(0.0)))&&all(lessThanEqual(badgeUV,vec2(1.0)))){
            vec4 mark=texture2D(propBadge,badgeUV);diffuseColor.rgb=mix(diffuseColor.rgb,mark.rgb,mark.a);
          }
        `);
      };material.customProgramCacheKey=()=> 'b24-r10-propeller-badge';mesh.material=material;bladeCount++;continue;
    }
    let color,metalness,roughness,role;
    if(TIRE_IDS.has(id)){color='#383a36';metalness=0;roughness=.96;role='lightly dusty tire rubber';}
    else if(id===1669){color='#555a5c';metalness=.58;roughness=.52;role='engine metal';}
    else if(id===1681){color='#65564a';metalness=.42;roughness=.78;role='exhaust and turbocharger metal';}
    else if(id===1741){color='#707577';metalness=.58;roughness=.38;role='engine hub hardware';}
    else if(/[lrc]_gear_|[lrc]_wheel_/i.test(path)||family==='landing-mechanism'){
      const rod=EXPOSED_MAIN_STRUT_RODS.has(id);
      const hub=[601,616,684,692,1192,1197,1203].includes(id);
      color=rod?'#bcc1c2':hub?'#9b9e98':'#7d827e';metalness=rod?.9:hub?.7:.28;roughness=rod?.19:hub?.40:.55;role=rod?'exposed polished actuator rod':hub?'wheel hub metal':'painted gear housing';
    }else continue;
    const accents={
      650:['#a6aaa4',.72,.38,'paired hard-line metal'],1259:['#a6aaa4',.72,.38,'paired hard-line metal'],
      653:['#727d70',.25,.60,'painted upper gear bracket'],1256:['#727d70',.25,.60,'painted upper gear bracket'],
      647:['#626e60',.25,.60,'painted retraction brace'],1225:['#626e60',.25,.60,'painted retraction brace'],
      621:['#91998f',.5,.45,'torque linkage metal'],1208:['#91998f',.5,.45,'torque linkage metal'],
      639:['#91998f',.5,.45,'torque linkage metal'],1230:['#91998f',.5,.45,'torque linkage metal']
    };
    if(accents[id])[color,metalness,roughness,role]=accents[id];
    mesh.material=new THREE.MeshStandardMaterial({color,metalness,roughness,side:THREE.DoubleSide,envMap:metalness>.4?reflection:null,envMapIntensity:.7});
    if(TIRE_IDS.has(id)){
      mesh.material.onBeforeCompile=shader=>{
        shader.vertexShader='varying vec3 vRubberLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRubberLocal=position;');
        shader.fragmentShader='varying vec3 vRubberLocal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float dustVariation=sin(vRubberLocal.x*8.0+vRubberLocal.z*11.0)*sin(vRubberLocal.y*9.0-vRubberLocal.z*7.0);
          diffuseColor.rgb*=.97+.075*dustVariation;
        `);
      };mesh.material.customProgramCacheKey=()=> 'b24-r10-dusty-rubber';
    }
    if(GEAR_LINE_ROLES[id]){
      const region=GEAR_LINE_ROLES[id],values=new Float32Array(region.vertexCount);
      if(mesh.geometry.attributes.position.count!==region.vertexCount)throw new Error('Gear material regions require pinned source geometry');
      for(const [start,count,role] of region.ranges)values.fill(role,start,start+count);
      mesh.geometry.setAttribute('detailRole',new THREE.BufferAttribute(values,1));
      mesh.material.envMap=reflection;
      mesh.material.onBeforeCompile=shader=>{
        shader.vertexShader='attribute float detailRole;varying float vLineRole;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLineRole=detailRole;');
        shader.fragmentShader='varying float vLineRole;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          if(vLineRole>.5&&vLineRole<1.5)diffuseColor.rgb=vec3(.31,.34,.32);
          else if(vLineRole>1.5)diffuseColor.rgb=vec3(.020,.026,.022);
        `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(vLineRole>.5)roughnessFactor=vLineRole<1.5?.38:.76;')
          .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nif(vLineRole>.5)metalnessFactor=vLineRole<1.5?.72:.04;');
      };mesh.material.customProgramCacheKey=()=> 'b24-r10-gear-lines';role='gear fittings with separate hard lines and flexible loops';
    }
    if(id===1669){
      if(mesh.geometry.attributes.position.count!==ENGINE_ROLES.vertexCount)throw new Error('Engine material regions require the pinned source geometry');
      const roles=new Float32Array(ENGINE_ROLES.vertexCount);
      for(const [start,count,role] of ENGINE_ROLES.ranges)roles.fill(role,start,start+count);
      mesh.geometry.setAttribute('detailRole',new THREE.BufferAttribute(roles,1));
      mesh.material.onBeforeCompile=shader=>{
        shader.vertexShader='attribute float detailRole;varying float vEngineRole;varying vec3 vEngineWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvEngineWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vEngineRole=detailRole;');
        shader.fragmentShader='varying float vEngineRole;varying vec3 vEngineWorld;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec3 ep=vEngineWorld;ep.z+=abs(ep.x)>5.5?.2874:0.0;float ex=abs(ep.x)<5.5?3.378:7.802;float ey=abs(ep.x)<5.5?-.05645:.09068;
          float radius=length(vec2(abs(ep.x)-ex,ep.y-ey));
          float casing=(1.0-smoothstep(.31,.39,radius))*smoothstep(2.35,2.52,ep.z);
          diffuseColor.rgb=mix(vec3(.035,.037,.040),vec3(.080,.100,.120),casing);
          if(vEngineRole>.5&&vEngineRole<1.5)diffuseColor.rgb=mix(vec3(.052,.057,.059),vec3(.115,.126,.128),smoothstep(.35,.53,radius));
          else if(vEngineRole>1.5&&vEngineRole<2.5)diffuseColor.rgb=vec3(.014,.018,.017);
          else if(vEngineRole>2.5&&vEngineRole<3.5)diffuseColor.rgb=vec3(.075,.067,.052);
          else if(vEngineRole>3.5)diffuseColor.rgb=vec3(.19,.21,.21);
        `);
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(vEngineRole>1.5&&vEngineRole<2.5)roughnessFactor=.38;else if(vEngineRole>3.5)roughnessFactor=.32;');
      };mesh.material.customProgramCacheKey=()=> 'b24-r10-engine-metals';
    }
    assignments.push({node:id,role,color,metalness,roughness});
  }
  return {gearLineRegions:{nodes:[627,1214],selection:"Visually inspected source components; bright hard lines and dark flexible loops"},engineMaterialRegions:{sourceNode:1669,rangeCount:ENGINE_ROLES.ranges.length,roles:['cylinder/rocker metal','dark pushrod covers','line/accessory metal','exposed fasteners'],status:'reference-informed cosmetic selection; not part-number identification'},assignments,hiddenStaticAlternatives,bladeCount,generatedCaches:[{kind:'propeller manufacturer badge canvas',width:256,height:384,source:'Tim Valdez B-24 walkaround photo 122-10; simplified maker emblem, no specimen serial copied'},{kind:'neutral metal reflections',inputWidth:512,inputHeight:256,pmremWidth:reflection.image.width,pmremHeight:reflection.image.height,source:'procedural renderer lighting cache, no reference image bytes'}],originalGeometryChanged:false,colorStatus:'reference-informed display palette, not spectrophotometric historical paint values'};
}
