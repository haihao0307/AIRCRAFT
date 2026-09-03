const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
const dir=process.env.EVIDENCE_DIR||'evidence',url=process.env.TEST_URL||'http://127.0.0.1:8765/';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader-webgl','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});page.setDefaultTimeout(30000);
const report={build:'B24_METAL_GRASS_MISSION_R1',url,checks:[],consoleErrors:[],pageErrors:[],failedRequests:[],captures:[],visualAcceptance:false,productionReady:false};const check=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});console.log(name,pass?'PASS':'FAIL');};
page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('requestfailed',r=>report.failedRequests.push(r.url()+': '+r.failure()?.errorText));
async function state(){return page.evaluate(()=>window.__B24_WORKBENCH__.getState());}
async function snap(name,time,cam='cinema'){await page.evaluate(({time,cam})=>{const a=window.__B24_WORKBENCH__;a.pause();a.seek(time);a.setCamera(cam);},{time,cam});await page.waitForTimeout(1400);await page.screenshot({path:path.join(dir,name+'.png'),timeout:60000});report.captures.push({name,time,state:await state()});}
try{
 const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});check('HTML loaded',response.status()===200,response.status());
 await page.waitForFunction(()=>window.__B24_WORKBENCH__?.ready,null,{timeout:120000});await page.waitForTimeout(1500);
 const initial=await state();report.initial=initial;check('Exact inherited aircraft payload verified',initial.sourcePayloadSha256==='7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2',initial.sourcePayloadSha256);
 const structure=await page.evaluate(()=>{const a=window.__B24_WORKBENCH__;return {...a.captureState(),sceneNames:a.scene.children.map(n=>n.name),iframeCount:document.querySelectorAll('iframe').length,renderCount:document.querySelectorAll('#scene').length,metalRange:[Math.min(...a.plane.skinMaterials.map(m=>m.metalness)),Math.max(...a.plane.skinMaterials.map(m=>m.metalness))],groundY:a.plane.minY(a.plane.gearMeshIds)};});report.structure=structure;
 check('Source hierarchy retained',structure.components===1784&&structure.meshes===348,structure);check('Four original spindle channels',structure.spindles.map(p=>p.id).join(',')==='1454,1385,1431,1408',structure.spindles);
 check('One renderer without iframe',structure.iframeCount===0&&structure.renderCount===1,structure.renderCount);check('Grass runway and no mountain objects',structure.sceneNames.includes('GRASS_AIRFIELD_SHARED_WORLD')&&!structure.sceneNames.some(n=>/mountain|weather|cloudvolume/i.test(n)),structure.sceneNames);
 check('Ground wheel contact',structure.groundY>=-.04&&structure.groundY<.10,structure.groundY);check('Bare metal shader response',structure.metalRange[0]>=.75,structure.metalRange);
 await snap('01_parked',0,'orbit');
 await page.click('#play');await page.evaluate(()=>window.__B24_WORKBENCH__.mission.rate=12);
 await page.waitForFunction(()=>window.__B24_WORKBENCH__.mission.time>21,null,{timeout:90000});
 let s=await state();check('Four engines start through play button',s.rpm.every(v=>v>800),s.rpm);check('Audio running from user gesture',s.audioState==='running',s.audioState);
 await page.waitForTimeout(1200);s=await state();check('Generated audio signal nonzero',s.audioRms>0.00001,s.audioRms);const before=s.spinAngles;await page.waitForTimeout(700);const after=(await state()).spinAngles;check('All four propellers continuously advance',after.every((v,i)=>v>before[i]+.1),{before,after});
 await page.click('#play');const paused=await state();await page.waitForTimeout(450);check('Pause freezes mission clock',Math.abs((await state()).time-paused.time)<.01,paused.time);
 await snap('02_takeoff',59,'follow');await snap('03_cruise',100,'port');check('Gear retracts in cruise',(await state()).gear===0,(await state()).gear);
 await snap('04_bay_open',120,'cinema');check('Bay opens before release',(await state()).bay>.99,(await state()).bay);
 await snap('05_explosion',136,'cinema');check('Four bombs reach ground',(await state()).impacts===4,(await state()).impacts);
 await snap('06_approach',193,'front');check('Gear down before approach',(await state()).gear===1,(await state()).gear);
 await snap('07_landing',215,'follow');await snap('08_shutdown',330,'front');
 const shut=await state();check('Shutdown restores engines gear and bay',shut.rpm.every(v=>v===0)&&shut.gear===1&&shut.bay===0,shut);
 await page.evaluate(()=>{const a=window.__B24_WORKBENCH__;a.reset();a.mission.rate=28;a.mission.loop=false;a.setCamera('cinema');a.start();});
 await page.waitForFunction(()=>window.__B24_WORKBENCH__.mission.time>=330,null,{timeout:300000,polling:250});
 const full=await state();report.fullLoop=full;
 check('Uninterrupted mission finished',full.time===330&&!full.running,full.time);check('Four sequential releases',full.events.filter(e=>e.event==='release').length===4,full.events);check('Four ground impacts in continuous run',full.impacts===4,full.impacts);check('Touchdown and return to starting position',full.events.some(e=>e.event==='touchdown')&&Math.abs(full.position[0])<.01&&Math.abs(full.position[2]+620)<.1,full.position);
 check('Explosion and touchdown audio events',full.audioEvents.filter(e=>e.kind==='explosion').length===4&&full.audioEvents.some(e=>e.kind==='touchdown'),full.audioEvents.map(e=>e.kind));
 await page.evaluate(()=>{const a=window.__B24_WORKBENCH__;a.mission.loop=true;a.mission.time=329.8;a.mission.rate=1;a.start();});await page.waitForFunction(()=>window.__B24_WORKBENCH__.mission.loops>0,null,{timeout:15000,polling:100});const looped=await state();check('Automatic loop restarts',looped.loops>0&&looped.running&&looped.time<30,looped);
 await page.click('#reset');await page.waitForTimeout(400);check('Reset leaves usable controls',(await state()).time===0&&await page.locator('#play').isEnabled(),await state());
 const frameStart=(await state()).frameCount;const samples=[];for(let i=0;i<5;i++){await page.waitForTimeout(1000);samples.push((await state()).fps);}const frameEnd=(await state()).frameCount;report.softwareRendererFps=samples;report.softwareRendererFrameAdvance=frameEnd-frameStart;check('Frame loop continues on software renderer',frameEnd>frameStart,{frameStart,frameEnd,samples});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.body.classList.add('panelClosed'));await page.waitForTimeout(700);await page.screenshot({path:path.join(dir,'09_mobile.png'),timeout:60000});
 const mobile=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:innerWidth,play:document.querySelector('#play').getBoundingClientRect().width}));check('Mobile layout no horizontal overflow',mobile.w<=mobile.v+1&&mobile.play>50,mobile);
}catch(e){report.fatal=String(e.stack||e);check('Browser execution completed',false,report.fatal);try{await page.screenshot({path:path.join(dir,'error.png'),timeout:20000});}catch(_){} }
check('No JavaScript errors',report.pageErrors.length===0,report.pageErrors);check('No WebGL or console errors',report.consoleErrors.length===0,report.consoleErrors);check('No failed resources',report.failedRequests.length===0,report.failedRequests);
report.status=report.checks.every(c=>c.pass)?'PASS':'FAIL';report.passed=report.checks.filter(c=>c.pass).length;report.total=report.checks.length;fs.writeFileSync(path.join(dir,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({status:report.status,passed:report.passed,total:report.total,fatal:report.fatal}));if(report.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
