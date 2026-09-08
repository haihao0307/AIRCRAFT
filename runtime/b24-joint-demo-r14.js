import * as THREE from 'three';
import {surfaceJointLayer} from './skin-joints-r14.js';

export function createB24JointDemo(aircraft,scene,qa){
  // Fresh illustrative local coordinates, NOT measurements from a drawing or old seam set.
  // Restrict projection to one original exterior shell, well aft of the closed waist door.
  const shells=aircraft.meshes.filter(m=>[1714,1747].includes(m.userData.sourceNode));
  const caster=new THREE.Raycaster(),normalMatrix=new THREE.Matrix3();
  const surface=uv=>{
    caster.set(new THREE.Vector3(4,uv.y,uv.x),new THREE.Vector3(-1,0,0));
    const hit=caster.intersectObjects(shells,false).find(h=>h.point.x>.25&&h.point.x<1.5);
    if(!hit)return null;normalMatrix.getNormalMatrix(hit.object.matrixWorld);const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();if(normal.x<0)normal.negate();if(normal.x<.35)return null;
    return {point:hit.point,normal};
  };
  const start=-8.8,end=-7.6,lower=-.48,upper=.12;
  const joints=[{id:'b24-aft-demo-transverse',type:'backed-butt',members:['illustrative-skin-a','illustrative-skin-b','unmodelled-backing'],evidence:'illustrative-unmeasured',rows:[-.028,.028].map(offset=>({path:[[-8.2+offset,lower,0],[-8.2+offset,upper,0]],pitch:.025,margin:.025})),seams:[[[-8.2,lower,0],[-8.2,upper,0]]]},{id:'b24-aft-demo-longitudinal',type:'stiffener',members:['illustrative-skin','unmodelled-stiffener'],evidence:'illustrative-unmeasured',rows:[{path:[[start,-.18,0],[-8.25,-.18,0]],pitch:.025,margin:.025},{path:[[-8.15,-.18,0],[end,-.18,0]],pitch:.025,margin:.025}],seams:[]}];
  joints.forEach(j=>j.units='m');
  const layer=surfaceJointLayer({joints,surface});scene.add(layer.group);
  const stats=document.querySelector('#jointStats');stats.textContent='局部生成 '+layer.placed.length+' 枚钉头 · '+layer.missed+' 个未命中点已跳过';
  document.querySelector('#jointFocus').onclick=()=>{const c=layer.center;qa.focus([c.x+1.15,c.y+.15,c.z+.3],c.toArray());document.querySelector('#status').textContent='R14 · 接缝和钉头近看 · 示意布局，未制造校准';};
  document.querySelector('#jointContext').onclick=()=>{const c=layer.center;qa.focus([c.x+3.8,c.y+1.15,c.z+2.5],c.toArray());document.querySelector('#status').textContent='R14 · 试验区位于左侧后机身 · 拖动或缩放观察';};
  let visible=true;document.querySelector('#jointToggle').onclick=e=>{visible=!visible;layer.setVisible(visible);e.target.textContent=visible?'隐藏试验区':'显示试验区';e.target.setAttribute('aria-pressed',String(visible));};
  window.__B24_JOINT_R14__={version:'R14',evidence:'illustrative-unmeasured',joints,stats:layer.stats,center:layer.center.toArray(),placements:()=>layer.placed.map(p=>({id:p.id,point:p.point.toArray(),normal:p.normal.toArray()}))};
  return layer;
}
