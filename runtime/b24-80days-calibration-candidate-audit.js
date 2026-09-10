import {NativeAircraft} from './native-aircraft.js';
import {createSkinSystem} from './b24-r16-skin-system.js';

window.__B24_STARTUP__={signal:undefined,report:()=>{}};
const out=document.querySelector('#out');
const WINDOW_BBOX=[767,163,947,359];
const PHOTO_WINDOW={center:[857,261],size:[180,196]};
const MOUTH_POINTS=[[0,546],[99,549],[246,564],[410,586],[583,616],[746,652],[923,699],[1108,776],[1267,840],[1393,881],[1497,924],[1596,967],[1663,988],[1725,1036],[1671,1016],[1596,1003],[1480,993],[1350,981],[1190,975],[1030,971],[864,971],[730,969],[633,973],[582,985],[530,1004],[493,1020],[447,1009],[416,989],[393,953],[360,910],[330,865],[302,820],[275,780],[232,742],[173,710],[111,690],[45,682],[0,681]];
const MOUTH_CROP=[0,530,1770,520];
const CANDIDATES=[
 {id:8,center:[0.5270294099187254,-1.2265712432489408,6.9354929922310475],size:[0.17482851129568644,0.4132310266988952,0.36555071016300644]},
 {id:81,center:[0.523972967413556,-1.2241260519358548,6.937938071617282],size:[0.1736059342936187,0.41078587269475975,0.36310563077677216]},
 {id:7,center:[0.5588164119724865,-0.7937789658624865,6.953220414724456],size:[0.11614481519643505,0.3643279839251363,0.39856047576358833]},
 {id:80,center:[0.5551486809662833,-0.7937789472080112,6.955665792582295],size:[0.11614481519643505,0.36188279261205025,0.3961147994341445]},
 {id:69,center:[0.6755725529789061,-0.6464584184588489,6.366383453731942],size:[0.02689669404549022,0.1699382032874155,0.17605108829775418]},
 {id:71,center:[0.6791749147087336,-0.6464584184588489,6.366383453731942],size:[0.02689669404549022,0.1699382032874155,0.17605108829775418]},
 {id:63,center:[0.648,-0.3573,6.4666],size:[0.05,0.3179,0.3766]},
 {id:65,center:[0.652,-0.3573,6.4666],size:[0.05,0.3179,0.3766]},
 {id:59,center:[0.64,-0.4056,5.9703],size:[0.05,0.4022,0.2078]},
 {id:60,center:[0.64,-0.4056,5.9703],size:[0.05,0.4022,0.2078]}
];
function mapPoint(c,p){const scaleZ=c.size[2]/PHOTO_WINDOW.size[0],scaleY=c.size[1]/PHOTO_WINDOW.size[1];return {z:c.center[2]-(p[0]-PHOTO_WINDOW.center[0])*scaleZ,y:c.center[1]-(p[1]-PHOTO_WINDOW.center[1])*scaleY};}
function evaluate(c,skin){const mapped=MOUTH_POINTS.map(p=>mapPoint(c,p));let inside=0,maxBelow=0,maxAbove=0,sumOutside=0;const samples=[];for(const q of mapped){const s=skin.bodySectionAt(q.z);const below=Math.max(0,s.belly-q.y),above=Math.max(0,q.y-s.roof),outside=below+above;if(outside<=.05)inside++;maxBelow=Math.max(maxBelow,below);maxAbove=Math.max(maxAbove,above);sumOutside+=outside;samples.push({z:q.z,y:q.y,roof:s.roof,belly:s.belly,outside});}const scaleZ=c.size[2]/180,scaleY=c.size[1]/196;const width=1770*scaleZ,height=520*scaleY;const zValues=mapped.map(q=>q.z),yValues=mapped.map(q=>q.y);return {component:c.id,center:c.center,size:c.size,scaleZ,scaleY,mouthPhysical:[width,height],mappedExtent:{z:[Math.min(...zValues),Math.max(...zValues)],y:[Math.min(...yValues),Math.max(...yValues)]},insideRatio:inside/mapped.length,maxBelow,maxAbove,meanOutside:sumOutside/mapped.length,samples};}
try{const aircraft=await NativeAircraft.load(()=>{});aircraft.group.position.set(0,0,0);aircraft.group.rotation.set(0,0,0);aircraft.group.scale.set(1,1,1);aircraft.group.updateMatrixWorld(true);const skin=createSkinSystem(aircraft,{capabilities:{getMaxAnisotropy:()=>1}});const results=CANDIDATES.map(c=>evaluate(c,skin)).sort((a,b)=>b.insideRatio-a.insideRatio||a.meanOutside-b.meanOutside);const audit={schema:'haihao.aircraft/80-days-calibration-candidate-audit@1.0',sourcePayloadSHA256:aircraft.digest,photo:'E04',photoWindowBBox:WINDOW_BBOX,mouthCrop:MOUTH_CROP,method:'single-window scale sanity test against Mother-01 fuselage roof/belly; diagnostic only, not final projective registration',toleranceMetres:.05,candidates:results,bestByContainment:results[0]?.component??null};window.__B24_80DAYS_CALIBRATION_AUDIT__=audit;out.textContent=JSON.stringify(audit,null,2);}catch(e){window.__B24_80DAYS_CALIBRATION_ERROR__=String(e?.stack||e);out.textContent=window.__B24_80DAYS_CALIBRATION_ERROR__;}
