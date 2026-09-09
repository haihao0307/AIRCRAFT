/* Deterministic, dimensionless visual choreography. No real firing solution or internal mechanism. */
const AnimationProgram=(()=>{
 const contract=Object.freeze({version:'W13/visual-cycle/1',units:'digital display units',fixedStep:1/120,tracerEvery:5,caseRebounds:2,groundY:-1.37,realBallistics:false,sourceAnimation:false,internals:'not reconstructed',collisionModel:'floor support + simplified resting separation',timing:'authored for readability'});
 function create(T,native,dna,surface,markings,{onNight=()=>{},onUpdate=()=>{},onSound=()=>{}}={}){
  const root=new T.Group();root.name='W13-animation-display';root.visible=false;
  const floorMat=new T.MeshStandardMaterial({color:0x3a3d3c,roughness:.94,metalness:0});
  const floor=new T.Mesh(new T.PlaneGeometry(60,60),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=contract.groundY;floor.receiveShadow=true;root.add(floor);const boxSupport=new T.Mesh(new T.BoxGeometry(.335,.095,1.11),floorMat);boxSupport.name='neutral-display-support';boxSupport.position.set(-.1652,-1.321,2.40955);boxSupport.receiveShadow=true;root.add(boxSupport);
  function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(255,255,255,.65)');g.addColorStop(.6,'rgba(255,255,255,.16)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
  const radial=radialTexture(),flashMat=new T.SpriteMaterial({map:radial,color:0xffb754,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),flash=new T.Sprite(flashMat);flash.position.set(1.77,0,0);flash.scale.set(.30,.30,1);flash.visible=false;root.add(flash);
  const flashLight=new T.PointLight(0xffbc6d,0,2.5,2);flashLight.position.set(1.79,.02,0);root.add(flashLight);
  const smoke=Array.from({length:32},()=>{const m=new T.SpriteMaterial({map:radial,color:0xaaa69b,transparent:true,depthWrite:false,opacity:0});const s=new T.Sprite(m);s.visible=false;root.add(s);return {mesh:s,age:99,seed:0};});let smokeIndex=0;
  const first=native.supply.instances[0],shellGeo=first.parts.case.geometry,bulletGeo=first.parts.projectile.geometry,linkGeo=first.parts.link.geometry;
  shellGeo.computeBoundingBox();bulletGeo.computeBoundingBox();linkGeo.computeBoundingBox();
  const shellCenter=shellGeo.boundingBox.getCenter(new T.Vector3()),bulletCenter=bulletGeo.boundingBox.getCenter(new T.Vector3()),linkCenter=linkGeo.boundingBox.getCenter(new T.Vector3());
  const brass=surface.matForMesh(first.parts.case),copper=surface.matForMesh(first.parts.projectile),linkMat=surface.matForMesh(first.parts.link);
  function actor(kind){const group=new T.Group(),geo=kind==='case'?shellGeo:linkGeo,center=kind==='case'?shellCenter:linkCenter,m=new T.Mesh(geo,kind==='case'?brass:linkMat);m.position.copy(center).negate();group.add(m);if(kind==='case'){const h=markings.head();h.position.copy(center).negate();group.add(h);}group.visible=false;root.add(group);
   const sm=new T.MeshBasicMaterial({map:radial,color:0x000000,transparent:true,depthWrite:false,opacity:.2}),shadow=new T.Mesh(new T.PlaneGeometry(kind==='case'?.24:.11,.10),sm);shadow.rotation.x=-Math.PI/2;shadow.position.y=contract.groundY+.002;shadow.visible=false;root.add(shadow);
   return {kind,group,shadow,velocity:new T.Vector3(),spin:new T.Vector3(),target:new T.Quaternion(),state:'unused',rebounds:0,contacts:0,number:0,settle:0,half:(geo.boundingBox.max.x-geo.boundingBox.min.x)/2,radius:Math.max(geo.boundingBox.max.y-geo.boundingBox.min.y,geo.boundingBox.max.z-geo.boundingBox.min.z)/2,restSupport:(geo.boundingBox.max.y-geo.boundingBox.min.y)/2};
  }
  const cases=Array.from({length:58},()=>actor('case')),links=Array.from({length:58},()=>actor('link'));
  const flights=Array.from({length:16},()=>{const group=new T.Group(),m=new T.Mesh(bulletGeo,copper);m.position.copy(bulletCenter).negate();group.add(m);const glow=new T.Sprite(new T.SpriteMaterial({map:radial,color:0xffa938,blending:T.AdditiveBlending,transparent:true,depthWrite:false}));glow.scale.set(.16,.16,1);group.add(glow);const trail=new T.Mesh(new T.CylinderGeometry(.003,.009,1,8,1,true),new T.MeshBasicMaterial({color:0xffc265,transparent:true,opacity:.85,blending:T.AdditiveBlending,depthWrite:false}));trail.rotation.z=-Math.PI/2;group.add(trail);group.visible=false;root.add(group);return {group,glow,trail,age:99,tracer:false,number:0};});let flightIndex=0;
  const curve=new T.CatmullRomCurve3(native.supply.curveControls.map(p=>new T.Vector3(...p)),false,'centripetal');
  const gunGroups=Object.entries(native.groups).filter(([k])=>!k.startsWith('supply')&&k!=='displayMount').map(([,g])=>g);
  let enabled=false,running=false,elapsed=0,accumulator=0,plan=[],cursor=0,total=0,lastShot=-99,night=false,speed=1,lowFlash=matchMedia('(prefers-reduced-motion: reduce)').matches,mode='single',duration=4.3,seeking=false;
  const events=[],floorY=contract.groundY,tmp=new T.Vector3(),axis=new T.Vector3(1,0,0),rot=new T.Quaternion(),restQuat=new T.Quaternion();
  function random(n,k){const v=Math.sin(n*127.1+k*311.7)*43758.5453;return v-Math.floor(v);}
  function setNight(value){if(night===value)return;night=value;onNight(value);}
  function restoreFeed(){for(const item of native.supply.instances){const serial=String(item.index).padStart(2,'0');for(const key of ['round/'+serial,'link/'+serial]){const f=dna.frames.get(dna.id(key));f.frame.position.copy(f.rest);f.frame.visible=true;}}gunGroups.forEach(g=>g.position.x=0);}
  function reset(){running=false;elapsed=0;accumulator=0;cursor=0;total=0;lastShot=-99;events.length=0;restoreFeed();for(const a of [...cases,...links]){a.group.visible=a.shadow.visible=false;a.state='unused';a.contacts=a.rebounds=0;}for(const f of flights){f.group.visible=false;f.age=99;}for(const s of smoke){s.mesh.visible=false;s.age=99;}flash.visible=false;flashLight.intensity=0;setNight(false);onUpdate(state());}
  function prepare(name){mode=name;if(name==='single')plan=[{t:.35,night:false}];else if(name==='burst')plan=Array.from({length:10},(_,i)=>({t:.35+i*.19,night:false}));else if(name==='tracer')plan=Array.from({length:15},(_,i)=>({t:.35+i*.20,night:true}));else if(name==='reel')plan=[{t:.35,night:false},...Array.from({length:5},(_,i)=>({t:3+i*.21,night:false})),...Array.from({length:15},(_,i)=>({t:6.3+i*.21,night:true}))];else throw Error('Unknown animation clip');duration=plan.at(-1).t+3.8;}
  function play(name=mode){reset();prepare(name);enabled=true;root.visible=true;running=true;onUpdate(state());}
  function pause(){running=false;onUpdate(state());}function resume(){if(elapsed>=duration)return play(mode);running=true;onUpdate(state());}
  function emitActor(a,n){a.group.visible=a.shadow.visible=true;a.state='airborne';a.number=n;a.group.userData.entityId=dna.id((a.kind==='case'?'round/':'link/')+String(n).padStart(2,'0')+(a.kind==='case'?'/case':''));a.contacts=a.rebounds=0;a.settle=0;const l=a.kind==='link';a.group.position.set(-.60+(random(n,1)-.5)*.06,-.16,l?.12:.06);a.group.quaternion.setFromEuler(new T.Euler(random(n,3)*2,random(n,4)*2,random(n,5)*2));a.velocity.set(-.32-random(n,6)*.47,.12+random(n,7)*.2,.82+random(n,8)*.65);if(l)a.velocity.multiplyScalar(.78);a.spin.set(5+random(n,9)*4,3+random(n,10)*7,6+random(n,11)*3);a.target.setFromEuler(new T.Euler(0,random(n,12)*Math.PI*2,0));}
  function shoot(){if(total>=58)return;total++;lastShot=elapsed;const tracer=total%contract.tracerEvery===0;events.push({type:'shot',number:total,time:elapsed,tracer,caseId:dna.id('round/'+String(total).padStart(2,'0')+'/case'),projectileId:dna.id('round/'+String(total).padStart(2,'0')+'/projectile'),linkId:dna.id('link/'+String(total).padStart(2,'0')),sourceRoundId:dna.id('round/'+String(total).padStart(2,'0'))});emitActor(cases[total-1],total);emitActor(links[total-1],total);
   const f=flights[flightIndex++%flights.length];f.age=0;f.tracer=tracer;f.number=total;f.group.visible=true;f.glow.visible=f.trail.visible=tracer;f.group.position.set(1.78,0,0);f.group.quaternion.identity();
   for(let i=0;i<3;i++){const s=smoke[smokeIndex++%smoke.length];s.age=i*.035;s.seed=random(total,i+30);s.mesh.visible=true;s.mesh.position.set(1.78,0,0);}
   if(!seeking)onSound('shot',1);
  }
  function updateActor(a,dt){if(a.state==='unused')return;const g=a.group;
   if(a.state==='airborne'){
    a.velocity.y-=4.8*dt;g.position.addScaledVector(a.velocity,dt);const spinLength=a.spin.length();if(spinLength>1e-7){rot.setFromAxisAngle(tmp.copy(a.spin).normalize(),spinLength*dt);g.quaternion.multiply(rot).normalize();}
    const support=a.radius+a.half*Math.abs(tmp.copy(axis).applyQuaternion(g.quaternion).y);
    if(g.position.y<=floorY+support&&a.velocity.y<0){g.position.y=floorY+support;a.contacts++;events.push({type:'contact',kind:a.kind,number:a.number,contact:a.contacts,time:elapsed});if(!seeking)onSound('case',a.kind==='case'?.7/(a.contacts):.22);
     a.velocity.x*=.64;a.velocity.z*=.64;a.spin.multiplyScalar(.58);
     if(a.rebounds<2){a.rebounds++;a.velocity.y=Math.max(.08,-a.velocity.y*(a.rebounds===1?.36:.25));}
     else{a.state='settling';a.velocity.y=0;a.settle=0;}
    }
    g.position.y=Math.max(g.position.y,floorY+support);
   }else if(a.state==='settling'){
    a.settle+=dt;g.position.addScaledVector(a.velocity,dt);a.velocity.multiplyScalar(Math.exp(-12*dt));g.quaternion.slerp(a.target,1-Math.exp(-20*dt));g.position.y=floorY+a.radius+a.half*Math.abs(tmp.copy(axis).applyQuaternion(g.quaternion).y);
    if(a.settle>.45){a.state='sleeping';g.quaternion.copy(a.target);g.position.y=floorY+a.restSupport;for(const other of cases){if(other===a||other.state!=='sleeping')continue;const dx=g.position.x-other.group.position.x,dz=g.position.z-other.group.position.z,dist=Math.hypot(dx,dz);if(dist<.065){const angle=random(a.number,44)*Math.PI*2;g.position.x=other.group.position.x+Math.cos(angle)*.069;g.position.z=other.group.position.z+Math.sin(angle)*.069;}}a.velocity.set(0,0,0);events.push({type:'sleep',kind:a.kind,number:a.number,time:elapsed,rebounds:a.rebounds});}
   }
   // Include the headstamp and the rotated mesh bounds in the final floor constraint.
   g.updateMatrixWorld(true);const bottom=new T.Box3().setFromObject(g).min.y;if(bottom<floorY){g.position.y+=floorY-bottom;g.updateMatrixWorld(true);}
   a.shadow.position.set(g.position.x,floorY+.002,g.position.z);a.shadow.rotation.z=-new T.Euler().setFromQuaternion(g.quaternion).y;a.shadow.material.opacity=Math.max(.02,.25*(1-(g.position.y-floorY)*.5));
  }
  function fixed(dt){elapsed+=dt;while(cursor<plan.length&&plan[cursor].t<=elapsed+1e-7){setNight(plan[cursor].night);shoot();cursor++;}
   const since=elapsed-lastShot,recoil=since<.15?-.009*Math.sin(Math.PI*Math.min(1,since/.15)):0;gunGroups.forEach(g=>g.position.x=recoil);
   const progress=total?Math.max(0,total-1+Math.min(1,since/.10)):0;
   for(const item of native.supply.instances){const serial=String(item.index).padStart(2,'0'),t=Math.max(0,(item.index-1-progress)/57),p=curve.getPointAt(t);for(const key of ['round/'+serial,'link/'+serial]){const f=dna.frames.get(dna.id(key));f.frame.visible=item.index>total;f.frame.position.copy(f.rest).add(p).sub(item.position);}}
   for(const a of cases)updateActor(a,dt);for(const a of links)updateActor(a,dt);
   for(const f of flights){if(f.age>1)continue;f.age+=dt;f.group.position.set(1.78+f.age*13.5,-.035*f.age*f.age,0);f.group.visible=f.age<.64;const len=Math.min(.75,f.age*7);f.trail.scale.y=Math.max(.001,len);f.trail.position.x=-len/2;f.trail.material.opacity=.8*(1-f.age/.7);}
   for(const s of smoke){s.age+=dt;if(s.age>1.1){s.mesh.visible=false;continue;}const a=s.age;s.mesh.position.set(1.79+a*(.28+s.seed*.2),a*.18+(s.seed-.5)*.03,a*(s.seed-.5)*.16);s.mesh.scale.setScalar(.05+a*.30);s.mesh.material.opacity=(1-a/1.1)*.12;s.mesh.material.rotation=s.seed*6+a*.1;}
   flash.visible=since>=0&&since<(lowFlash?.025:.055);flash.material.opacity=lowFlash?.12:.72;flash.scale.setScalar((lowFlash?.14:.30)*(1+Math.max(0,.04-since)*8));flashLight.intensity=lowFlash?0:Math.max(0,1-since/.07)*1.4;
   if(elapsed>=duration){running=false;elapsed=duration;flash.visible=false;flashLight.intensity=0;}onUpdate(state());
  }
  function advance(seconds){if(!running||!enabled)return;accumulator+=Math.min(.10,Math.max(0,seconds))*speed;let steps=0;while(accumulator>=contract.fixedStep&&running&&steps++<64){fixed(contract.fixedStep);accumulator-=contract.fixedStep;}}
  function seek(time){const name=mode;reset();prepare(name);enabled=true;root.visible=true;const target=Math.max(0,Math.min(duration,time));seeking=true;for(let t=0;t<target-1e-9;t+=contract.fixedStep)fixed(Math.min(contract.fixedStep,target-t));seeking=false;running=false;onUpdate(state());}
  function setEnabled(value){if(!value){reset();root.visible=false;}enabled=value;root.visible=value;}
  function state(){return {mode,enabled,running,time:elapsed,duration,shots:total,tracers:events.filter(e=>e.type==='shot'&&e.tracer).map(e=>e.number),airborne:cases.filter(a=>a.state==='airborne').length,settled:cases.filter(a=>a.state==='sleeping').length,night,speed,lowFlash,nextTracerIn:5-total%5};}
  function audit(){return {contract,...state(),events:[...events],cases:cases.filter(a=>a.state!=='unused').map(a=>({number:a.number,state:a.state,rebounds:a.rebounds,contacts:a.contacts,entityId:a.group.userData.entityId,position:a.group.position.toArray(),velocity:a.velocity.toArray(),minimumY:new T.Box3().setFromObject(a.group).min.y})),sourceGeometryMutated:false,physicalTimingCalibrated:false};}
  prepare('single');return {root,contract,advance,play,pause,resume,reset,seek,setEnabled,state,audit,setSpeed:v=>{if(![.25,.5,1].includes(v))throw Error('Unknown playback speed');speed=v;},setLowFlash:v=>lowFlash=!!v};
 }return {create,contract};
})();
