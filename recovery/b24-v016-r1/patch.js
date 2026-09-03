(function(){
'use strict';
const BUILD='B24_V016_RECOVERY_REVIEW_R1_2026-09-03';
const SOURCE_PAYLOAD_SHA='7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2';
const GEAR_UP_TIME=0.0416666679084301;
const GEAR_DOWN_TIME=4.16666666790843;
const GROUND_OFFSET=3.062;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function compose(position,pitch=0,yaw=0,bank=0){
  const cx=Math.cos(pitch),sx=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),cz=Math.cos(bank),sz=Math.sin(bank);
  const rx=new Float32Array([1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1]);
  const ry=new Float32Array([cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1]);
  const rz=new Float32Array([cz,sz,0,0,-sz,cz,0,0,0,1,0,0,0,0,0,1]);
  const t=identity();t[12]=position[0];t[13]=position[1];t[14]=position[2];
  return multiply(t,multiply(ry,multiply(rx,rz)));
}
function transformPoint(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
function boxGeometry(x,y,z){
  const hx=x/2,hy=y/2,hz=z/2,p=[],n=[],idx=[];
  const faces=[[[1,0,0],[hx,-hy,-hz],[hx,hy,-hz],[hx,hy,hz],[hx,-hy,hz]],[[-1,0,0],[-hx,-hy,hz],[-hx,hy,hz],[-hx,hy,-hz],[-hx,-hy,-hz]],[[0,1,0],[-hx,hy,-hz],[-hx,hy,hz],[hx,hy,hz],[hx,hy,-hz]],[[0,-1,0],[-hx,-hy,hz],[-hx,-hy,-hz],[hx,-hy,-hz],[hx,-hy,hz]],[[0,0,1],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]],[[0,0,-1],[hx,-hy,-hz],[-hx,-hy,-hz],[-hx,hy,-hz],[hx,hy,-hz]]];
  for(const f of faces){const base=p.length/3;for(let i=1;i<5;i++){p.push(...f[i]);n.push(...f[0]);}idx.push(base,base+1,base+2,base,base+2,base+3);}
  return{p:new Float32Array(p),n:new Float32Array(n),i:new Uint32Array(idx)};
}
function quatSlerp(a,b,t,out){let cos=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],bb=[b[0],b[1],b[2],b[3]];if(cos<0){cos=-cos;bb=bb.map(v=>-v);}if(cos>.9995){for(let i=0;i<4;i++)out[i]=a[i]+t*(bb[i]-a[i]);const l=Math.hypot(out[0],out[1],out[2],out[3])||1;for(let i=0;i<4;i++)out[i]/=l;return;}const th=Math.acos(clamp(cos,-1,1)),s=Math.sin(th),s0=Math.sin((1-t)*th)/s,s1=Math.sin(t*th)/s;for(let i=0;i<4;i++)out[i]=a[i]*s0+bb[i]*s1;}
function sampleTrack(v,tr,time,node){
  const times=v.block(tr.timeBlock),values=v.block(tr.valueBlock);let a=0,b=0,u=0;
  if(time<=times[0]){a=b=0;}else if(time>=times[times.length-1]){a=b=times.length-1;}else{let lo=0,hi=times.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=time)lo=mid;else hi=mid;}a=lo;b=hi;u=(time-times[a])/(times[b]-times[a]||1);}
  if(tr.path==='rotation')quatSlerp(values.subarray(a*4,a*4+4),values.subarray(b*4,b*4+4),u,node.rotation);
  else{const target=tr.path==='translation'?node.translation:node.scale;for(let i=0;i<3;i++)target[i]=values[a*3+i]+(values[b*3+i]-values[a*3+i])*u;}
}
function pathOfNode(node){return String(node?.semanticPathLower||node?.def?.semanticPath||node?.def?.name||'').toLowerCase();}
function isGearPath(path){return path.includes('_gear_')||path.includes('/gear')||path.includes('_wheel_')||path.includes('/wheel')||path.includes('landing_gear')||path.includes('tire');}
function addStyle(){
  const style=document.createElement('style');style.id='b24-v016-recovery-style';style.textContent=`
  html,body{overflow:hidden!important;background:#9badb3!important}.viewport{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;background:#9badb3!important}.viewport canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important}body>header,main>.panel,.quickDock,.versionCurrent,.buildCurrent,.reviewStamp,#v009FlightHud,#b24-v012-propeller-inspection{display:none!important}main{display:block!important;width:100%!important;height:100%!important}.hud{display:none!important}
  #v016Top{position:fixed;z-index:60;left:18px;top:16px;display:flex;gap:12px;align-items:flex-start;pointer-events:none;color:#f7fbfb;text-shadow:0 2px 12px #0d171b88}#v016Top .mark{width:4px;height:48px;border-radius:4px;background:#d4a04b;box-shadow:0 0 18px #d4a04b55}#v016Top h1{margin:0;font-size:25px;line-height:1.1;letter-spacing:.01em}#v016Top p{margin:7px 0 0;color:#d9e3e5;font-size:11px;letter-spacing:.08em}#v016Top .tag{display:inline-flex;margin-top:8px;padding:4px 8px;border:1px solid #a5bbc355;border-radius:999px;background:#122128aa;font-size:10px;color:#dce8eb}
  #v016Panel{position:fixed;z-index:70;right:14px;top:14px;bottom:70px;width:342px;border:1px solid #9db2ba33;border-radius:15px;background:linear-gradient(180deg,#0d171ddd,#101b21e8);box-shadow:0 18px 55px #0007;backdrop-filter:blur(15px);color:#eaf1f3;overflow:auto;padding:15px 14px 20px;font:12px/1.45 system-ui,-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;scrollbar-width:thin}#v016Panel h2{font-size:12px;letter-spacing:.08em;margin:0 0 9px;color:#e7edf0}#v016Panel .sectionR{border-bottom:1px solid #9cb3bc20;padding:0 0 14px;margin:0 0 14px}#v016Panel .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#v016Panel .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}#v016Panel button{border:1px solid #6c879144;border-radius:8px;background:#17262d;color:#e8f0f2;padding:8px 7px;cursor:pointer;font:inherit}#v016Panel button:hover{background:#213740;border-color:#91acb8}#v016Panel button.active{background:#284c3e;border-color:#64a282;color:#effff8}#v016Panel button.primary{background:#7b5522;border-color:#bd8740;color:#fff7e6;font-weight:700}#v016Panel label{display:flex;justify-content:space-between;gap:8px;margin:9px 0 5px;color:#b8c7cc;font-size:11px}#v016Panel input[type=range]{width:100%;accent-color:#d5a14e}#v016Panel .readout{display:grid;grid-template-columns:1fr auto;gap:8px;padding:7px 8px;border:1px solid #8fa8b126;border-radius:8px;background:#0b1419;margin-top:8px;color:#9fb2b9}.readout b{color:#eaf2f4}.note{margin-top:8px;color:#8fa4ab;font-size:10px;line-height:1.55}
  #v016Bottom{position:fixed;z-index:65;left:16px;right:370px;bottom:15px;display:grid;grid-template-columns:auto auto minmax(160px,1fr) auto auto;align-items:center;gap:8px;padding:9px 10px;border:1px solid #91a7af30;border-radius:12px;background:#0d171dde;backdrop-filter:blur(14px);color:#eaf1f3;font:11px/1.3 system-ui,-apple-system,'Segoe UI','Microsoft YaHei',sans-serif}#v016Bottom button{border:1px solid #6f879044;border-radius:7px;background:#18262d;color:#edf3f4;padding:7px 10px;cursor:pointer}#v016Bottom button.primary{background:#7b5522;border-color:#bd8740}#v016Bottom input{width:100%;accent-color:#d5a14e}#v016Bottom .phase{min-width:110px;font-weight:700;color:#f3dfba}#v016Bottom .time{font-variant-numeric:tabular-nums;color:#b6c7cc;min-width:72px;text-align:right}
  #v016PanelToggle{display:none;position:fixed;z-index:90;right:12px;top:12px;border:1px solid #8ba2ab55;border-radius:8px;background:#111e24dd;color:#eff5f6;padding:8px 10px}
  @media(max-width:900px){#v016Top h1{font-size:17px}#v016Top p{display:none}#v016Panel{width:min(350px,calc(100vw - 24px));top:54px;right:12px;bottom:68px;transform:translateX(calc(100% + 24px));transition:transform .2s ease}#v016Panel.open{transform:none}#v016PanelToggle{display:block}#v016Bottom{right:12px;left:12px;grid-template-columns:auto auto 1fr auto}.optionalLabel{display:none}}
  `;document.head.appendChild(style);
}
function addUi(v){
  const top=document.createElement('div');top.id='v016Top';top.innerHTML=`<div class="mark"></div><div><h1>B-24 V016 恢复检查版 R1</h1><p>AIRCRAFT NATIVE FORGE · FULL AIRCRAFT REVIEW</p><span class="tag">同一数字母体 · 土质跑道 · 无天气接入</span></div>`;document.body.appendChild(top);
  const toggle=document.createElement('button');toggle.id='v016PanelToggle';toggle.textContent='控制';document.body.appendChild(toggle);
  const panel=document.createElement('aside');panel.id='v016Panel';panel.innerHTML=`
    <div class="sectionR"><h2>完整任务</h2><div class="grid3"><button data-state="parked" class="active">停机</button><button data-state="startup">启动</button><button data-state="taxi">滑行</button><button data-state="takeoff">起飞</button><button data-state="cruise">巡航</button><button data-state="landing">着陆</button></div><div class="readout"><span>当前状态</span><b id="v016State">停机</b></div></div>
    <div class="sectionR"><h2>镜头</h2><div class="grid3"><button data-view="perspective">总览</button><button data-view="left">左舷</button><button data-view="right">右舷</button><button data-view="front">机首</button><button data-view="rear">机尾</button><button data-view="top">顶部</button></div></div>
    <div class="sectionR"><h2>起落架与舱门</h2><div class="grid2"><button id="v016GearDown" class="active">起落架放下</button><button id="v016GearUp">起落架收起</button><button id="v016DoorsClose">侧门关闭</button><button id="v016DoorsOpen">侧门打开</button></div><div class="readout"><span>起落架</span><b id="v016GearText">放下</b></div></div>
    <div class="sectionR"><h2>整机金属材质</h2><button id="v016MetalReset" class="primary" style="width:100%">恢复 V016 标准金属</button><label><span>金属度</span><b id="v016MetalValue">88%</b></label><input id="v016Metal" type="range" min="0.4" max="1" step="0.005" value="0.88"><label><span>粗糙度</span><b id="v016RoughValue">36.5%</b></label><input id="v016Rough" type="range" min="0.12" max="0.8" step="0.005" value="0.365"><div class="note">机身、机翼、尾翼和发动机短舱保持统一金属参数。起落架、轮胎、玻璃和螺旋桨继续使用各自机械材质。</div></div>
    <div class="sectionR"><h2>发动机声音</h2><div class="grid2"><button id="v016SoundOn">开启四发声音</button><button id="v016SoundOff">关闭声音</button></div><div class="readout"><span>声音</span><b id="v016SoundText">关闭</b></div></div>
    <div class="note">当前页面用于恢复基线审查。天气系统未接入，场景中没有山体、云层或现代跑道标线。</div>`;document.body.appendChild(panel);
  toggle.onclick=()=>panel.classList.toggle('open');
  const bottom=document.createElement('div');bottom.id='v016Bottom';bottom.innerHTML=`<button id="v016Play" class="primary">开始任务</button><button id="v016Reset">复位</button><input id="v016Timeline" type="range" min="0" max="260" step="0.1" value="0"><span class="phase" id="v016Phase">准备</span><span class="time" id="v016Time">0.0 / 260 s</span>`;document.body.appendChild(bottom);
}
function addGround(v){
  const add=(geo,model,color,metal,rough,role)=>{const item={gpu:v.uploadGeometry(geo),model,color,metal,rough,surfaceRole:role||0,recoveryGround:true};v.procItems.unshift(item);return item;};
  add(boxGeometry(520,.12,620),compose([0,-.115,-110]),[.255,.295,.205],.02,.96,0);
  add(boxGeometry(43,.08,355),compose([0,-.025,-112]),[.405,.305,.195],.01,.98,0);
  const bands=[[-18,.372,.278,.177],[-14,.425,.323,.210],[-10,.390,.284,.180],[-6,.445,.335,.214],[-2,.398,.295,.184],[2,.430,.318,.202],[6,.382,.279,.172],[10,.438,.328,.207],[14,.397,.292,.181],[18,.420,.310,.198]];
  for(const [x,r,g,b] of bands)add(boxGeometry(3.5,.014,350),compose([x,.022,-112]),[r,g,b],.01,.99,0);
  for(const x of [-8.2,-7.45,7.45,8.2])add(boxGeometry(.26,.022,340),compose([x,.035,-110]),[.255,.185,.115],.01,1,0);
  for(let z=-270;z<40;z+=24){const x=((z*17)%13)*.09;add(boxGeometry(2.8,.018,5.6),compose([x,.032,z]),[.345,.242,.148],.01,.99,0);}
  v.__v016GroundCount=v.procItems.filter(i=>i.recoveryGround).length;
}
function installCleanMaterials(v){
  const previous=v.materialFor.bind(v);
  v.skinColor=[.61,.64,.66];v.skinMetal=.88;v.skinRough=.365;v.surfaceAge=.18;v.surfaceDamage=0;v.surfaceNoiseScale=.42;v.ridgedEnabled=false;v.ridgedStrength=0;v.serviceGate=0;
  v.materialFor=function(item){
    const path=String(item?.node?.semanticPathLower||item?.node?.def?.semanticPath||'').toLowerCase(),fam=item.family;
    if(fam==='legacy-surface-overlay')return{color:[0,0,0],alpha:0,metal:0,rough:1,surfaceRole:0,damageZone:0,protectedFromRidged:true};
    if((fam==='airframe-skin'||fam==='airframe-detail')&&!isGearPath(path))return{color:[...this.skinColor],alpha:1,metal:this.skinMetal,rough:this.skinRough,surfaceRole:0,damageZone:0,protectedFromRidged:true};
    const mat=previous(item);return{...mat,surfaceRole:0,damageZone:0,protectedFromRidged:true};
  };
}
function installMissionTransform(v){
  v.__v016Matrix=compose([0,GROUND_OFFSET,0],.012,0,.0001);
  const previousUpdate=v.updateWorld.bind(v);
  v.updateWorld=function(){previousUpdate();const matrix=this.__v016Matrix||identity();for(const node of this.nodes)node.world=multiply(matrix,node.world);};
  const gearTracks=v.m.animations[0].tracks.filter(tr=>isGearPath(pathOfNode(v.nodes[tr.targetNode])));
  const previousApply=v.applyAnimation.bind(v);
  v.__v016GearFraction=1;v.__v016BaseAnimationTime=GEAR_UP_TIME;v.__v016LastAppliedGear=-1;
  v.applyAnimation=function(time){
    previousApply(this.__v016BaseAnimationTime);
    const sample=GEAR_UP_TIME+(GEAR_DOWN_TIME-GEAR_UP_TIME)*clamp(this.__v016GearFraction,0,1);
    for(const tr of gearTracks)sampleTrack(this,tr,sample,this.nodes[tr.targetNode]);
    this.updateWorld();this.__v016LastAppliedGear=this.__v016GearFraction;
  };
  for(const id of [219,408,1487,1635,1726,1773])v.hidden.delete(id);
  v.applyAnimation(GEAR_UP_TIME);
  v.__v016GearTrackCount=gearTracks.length;
}
function phaseAt(t){
  if(t<16)return{key:'parked',label:'准备',engine:'parked',z:0,y:0,pitch:.012,gear:1};
  if(t<42)return{key:'startup',label:'发动机启动',engine:'startup',z:0,y:0,pitch:.012,gear:1};
  if(t<72){const u=smooth((t-42)/30);return{key:'taxi',label:'滑行',engine:'taxi',z:mix(0,-78,u),y:0,pitch:.012,gear:1};}
  if(t<98){const u=smooth((t-72)/26);return{key:'takeoff',label:'起飞',engine:'takeoff',z:mix(-78,-178,u),y:mix(0,43,u),pitch:mix(.012,.10,Math.sin(Math.PI*u)),gear:1-smooth(clamp((u-.28)/.62,0,1))};}
  if(t<154){const u=(t-98)/56;return{key:'cruise',label:'爬升巡航',engine:'cruise',z:mix(-178,-248,u),y:mix(43,68,smooth(u)),pitch:mix(.025,0,smooth(u)),gear:0};}
  if(t<184){const u=(t-154)/30;return{key:'cruise',label:'任务航段',engine:'cruise',z:mix(-248,-282,u),y:68,pitch:0,gear:0};}
  if(t<222){const u=(t-184)/38;return{key:'cruise',label:'返航',engine:'cruise',z:mix(-282,-195,u),y:mix(68,52,smooth(u)),pitch:-.01,gear:0};}
  if(t<250){const u=smooth((t-222)/28);return{key:'landing',label:'着陆进近',engine:'landing',z:mix(48,-52,u),y:mix(50,0,u),pitch:mix(-.035,.012,u),gear:smooth(clamp((u-.06)/.52,0,1))};}
  {const u=smooth((t-250)/10);return{key:'taxi',label:'着陆滑跑',engine:'taxi',z:mix(-52,-80,u),y:0,pitch:.012,gear:1};}
}
function cameraPreset(v,name){
  const map={perspective:[-.72,.17,1.72],left:[-Math.PI/2,.02,1.62],right:[Math.PI/2,.02,1.62],front:[Math.PI,.03,1.58],rear:[0,.05,1.58],top:[0,1.46,1.75]};
  const p=map[name]||map.perspective;v.camera.yaw=p[0];v.camera.pitch=p[1];v.camera.distance=v.radius*p[2];v.__v016View=name;v.__v016CameraManual=false;
}
function installMission(v){
  v.__v016MissionTime=0;v.__v016MissionPlaying=false;v.__v016MissionLast=performance.now();v.__v016PhaseKey='';v.__v016CameraManual=false;v.__v016View='perspective';
  cameraPreset(v,'perspective');
  v.canvas.addEventListener('pointerdown',()=>{v.__v016CameraManual=true;},{capture:true});
  function applyState(t,force=false){
    t=clamp(t,0,260);v.__v016MissionTime=t;const s=phaseAt(t);
    v.__v016Matrix=compose([0,GROUND_OFFSET+s.y,s.z],s.pitch,0,.0001);
    if(force||Math.abs(v.__v016GearFraction-s.gear)>.012){v.__v016GearFraction=s.gear;v.applyAnimation(GEAR_UP_TIME);}
    else v.updateWorld();
    if(s.engine!==v.flightState)v.setFlightState?.(s.engine,false);
    if(!v.__v016CameraManual){const target=transformPoint(v.__v016Matrix,v.center);v.camera.target=[target[0],target[1]+.4,target[2]];}
    const state=document.getElementById('v016State');if(state)state.textContent=s.label;
    const phase=document.getElementById('v016Phase');if(phase)phase.textContent=s.label;
    const time=document.getElementById('v016Time');if(time)time.textContent=`${t.toFixed(1)} / 260 s`;
    const slider=document.getElementById('v016Timeline');if(slider&&document.activeElement!==slider)slider.value=String(t);
    const gear=document.getElementById('v016GearText');if(gear)gear.textContent=s.gear>.92?'放下':(s.gear<.08?'收起':`${Math.round(s.gear*100)}%`);
    document.querySelectorAll('[data-state]').forEach(b=>b.classList.toggle('active',b.dataset.state===s.key));
    const q=window.__B24_V016_RECOVERY__;if(q)q.state={time:Number(t.toFixed(3)),phase:s.label,flightState:s.engine,gear:Number(s.gear.toFixed(3)),position:[0,Number(s.y.toFixed(3)),Number(s.z.toFixed(3))],pitch:Number(s.pitch.toFixed(5)),engineRpm:Number((v.engineRpm||0).toFixed(5)),propellerAngle:Number((v.__v009PropAngle||0).toFixed(6))};
  }
  v.__v016ApplyState=applyState;
  const previousFrame=v.frame.bind(v);
  v.frame=function(now){const raw=Math.max(0,(now-this.__v016MissionLast)/1000);this.__v016MissionLast=now;if(this.__v016MissionPlaying){this.__v016MissionTime+=Math.min(raw,.12);if(this.__v016MissionTime>=260){this.__v016MissionTime=260;this.__v016MissionPlaying=false;}applyState(this.__v016MissionTime,false);}return previousFrame(now);};
  document.querySelectorAll('[data-state]').forEach(button=>button.onclick=()=>{const map={parked:0,startup:20,taxi:50,takeoff:78,cruise:120,landing:228};v.__v016MissionPlaying=false;applyState(map[button.dataset.state]??0,true);document.getElementById('v016Play').textContent='继续任务';});
  document.querySelectorAll('#v016Panel [data-view]').forEach(button=>button.onclick=()=>{cameraPreset(v,button.dataset.view);applyState(v.__v016MissionTime,false);document.querySelectorAll('#v016Panel [data-view]').forEach(b=>b.classList.toggle('active',b===button));});
  const play=document.getElementById('v016Play');play.onclick=()=>{if(v.__v016MissionTime>=260)v.__v016MissionTime=0;v.__v016MissionPlaying=!v.__v016MissionPlaying;play.textContent=v.__v016MissionPlaying?'暂停任务':'继续任务';};
  document.getElementById('v016Reset').onclick=()=>{v.__v016MissionPlaying=false;v.__v016CameraManual=false;cameraPreset(v,'perspective');applyState(0,true);play.textContent='开始任务';};
  document.getElementById('v016Timeline').oninput=e=>{v.__v016MissionPlaying=false;applyState(+e.target.value,true);play.textContent='继续任务';};
  document.getElementById('v016GearDown').onclick=()=>{v.__v016MissionPlaying=false;v.__v016GearFraction=1;v.applyAnimation(GEAR_UP_TIME);document.getElementById('v016GearText').textContent='放下';};
  document.getElementById('v016GearUp').onclick=()=>{v.__v016MissionPlaying=false;v.__v016GearFraction=0;v.applyAnimation(GEAR_UP_TIME);document.getElementById('v016GearText').textContent='收起';};
  document.getElementById('v016DoorsClose').onclick=()=>{for(const state of Object.values(v.doors)){state.value=state.target=state.from=0;state.start=performance.now();}v.applyAnimation(GEAR_UP_TIME);};
  document.getElementById('v016DoorsOpen').onclick=()=>{for(const state of Object.values(v.doors)){state.value=state.target=state.from=1;state.start=performance.now();}v.applyAnimation(GEAR_UP_TIME);};
  const metal=document.getElementById('v016Metal'),rough=document.getElementById('v016Rough');
  metal.oninput=()=>{v.skinMetal=+metal.value;document.getElementById('v016MetalValue').textContent=`${Math.round(v.skinMetal*100)}%`;};
  rough.oninput=()=>{v.skinRough=+rough.value;document.getElementById('v016RoughValue').textContent=`${(v.skinRough*100).toFixed(1)}%`;};
  document.getElementById('v016MetalReset').onclick=()=>{v.skinColor=[.61,.64,.66];v.skinMetal=.88;v.skinRough=.365;metal.value='.88';rough.value='.365';document.getElementById('v016MetalValue').textContent='88%';document.getElementById('v016RoughValue').textContent='36.5%';};
  document.getElementById('v016SoundOn').onclick=async()=>{const ok=await v.nativeSound?.start?.();document.getElementById('v016SoundText').textContent=ok?'开启':'浏览器未授权';};
  document.getElementById('v016SoundOff').onclick=()=>{v.nativeSound?.stop?.();document.getElementById('v016SoundText').textContent='关闭';};
  applyState(0,true);
}
function buildQa(v){
  window.__B24_V016_RECOVERY__={
    schema:'haihao.aircraft/b24-v016-recovery-review@1.0.0',build:BUILD,ready:true,
    classification:'recovery-review-version',exactOriginalBytes:false,
    source:{payloadBytes:v.m.payload.bytes,payloadSha256:v.m.payload.sha256,components:v.m.statistics.components,meshes:v.m.statistics.meshes,triangles:v.m.statistics.triangles},
    surfaces:{color:[.61,.64,.66],metal:.88,rough:.365,wear:0,ridged:false},
    runway:{type:'dirt',modernMarkings:false,mountains:false,clouds:false,weatherSystem:false,groundItemCount:v.__v016GroundCount},
    mechanisms:{initialGear:'down',gearPoseTime:GEAR_DOWN_TIME,gearTrackCount:v.__v016GearTrackCount,propellerAxis:'local-y',propellerRootCount:v.__v009PropRoots?.length||0,directionSigns:[1,1,1,1],restoredSourceNodes:[219,408,1487,1635,1726,1773]},
    ui:{mission:true,cameraViews:6,material:true,mechanisms:true,audio:true},
    approvals:{visualApproved:false,productionReady:false}
  };
  document.documentElement.dataset.qa='pass';document.documentElement.dataset.build='b24-v016-recovery-review-r1';document.documentElement.dataset.version='v016-recovery-r1';document.documentElement.dataset.runway='dirt';document.documentElement.dataset.weather='disabled';
}
function patch(v){
  if(!v||v.__v016RecoveryPatched)return false;v.__v016RecoveryPatched=true;
  addStyle();addUi(v);installCleanMaterials(v);installMissionTransform(v);addGround(v);installMission(v);buildQa(v);
  document.title='B-24 V016 恢复检查版 R1';v.autoRotate=false;v.playing=false;v.nativeGuns=true;
  const loading=document.getElementById('loading');if(loading)loading.style.display='none';const fallback=document.getElementById('fallbackPreview');if(fallback)fallback.style.display='none';
  return true;
}
const timer=setInterval(()=>{const v=window.__B24_NATIVE_V010__;if(v?.__v010RidgedPatched&&window.__B24_V012_QA_STATE__?.ready&&patch(v))clearInterval(timer);},80);
})();
