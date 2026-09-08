const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'validation/w10');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(pathToFileURL(path.join(root,'releases/w10/AIRCRAFT_ANM2_OBJECT_DNA_W10.html')).href);await page.waitForFunction(()=>window.reviewReady);await page.screenshot({path:path.join(out,'default.png'),fullPage:true});
const audit=await page.evaluate(()=>review.surfaceAudit());assert(audit.domains.length>0);assert.equal(new Set(audit.domains.map(d=>d.domainId)).size,audit.domains.length);
const address={domainId:audit.domains[0].domainId,position:[-.5,.02,.01]};const before=await page.evaluate(a=>review.surfaceQuery(a),address);
const geometryHash=()=>page.evaluate(()=>JSON.stringify(review.exportGeneratedBuffers())).then(s=>crypto.createHash('sha256').update(s).digest('hex'));
const hashBefore=await geometryHash();await page.evaluate(()=>{review.setView('top');review.setLight('grazing');});assert.deepStrictEqual(await page.evaluate(a=>review.surfaceQuery(a),address),before);
assert.equal((await page.evaluate(a=>review.surfaceQuery(a,{frame:'unknown'}),address)).status,'unknown-context');
await page.evaluate(()=>{review.setSurfaceState('metal');review.setRegion('body');review.setView('oblique');});await page.screenshot({path:path.join(out,'metal-grazing.png'),fullPage:true});
await page.evaluate(()=>{review.setLight('dim');review.setSurfaceState('coated');});await page.screenshot({path:path.join(out,'coated-dim.png'),fullPage:true});assert.equal(await geometryHash(),hashBefore);
await page.locator('#reference-file').setInputFiles({name:'bad.glb',mimeType:'model/gltf-binary',buffer:Buffer.from('bad')});await page.waitForFunction(()=>window.referenceLoadFailure);assert.equal(await page.evaluate(()=>!!window.referenceReady),false);
await page.locator('#reference-file').setInputFiles(JSON.parse(fs.readFileSync(path.join(root,'CURRENT.json'))).referenceInput.localPath);await page.waitForFunction(()=>window.referenceReady);assert.equal((await page.evaluate(()=>review.current())).mode,'neutral');await page.evaluate(()=>review.setLight('studio'));
for(const region of ['receiver','positivePlate','collar','full']){await page.evaluate(r=>review.setRegion(r),region);await page.screenshot({path:path.join(out,region+'-neutral.png'),fullPage:true});}
await page.locator('#silhouette').click();await page.locator('[data-view="top"]').click();await page.screenshot({path:path.join(out,'full-top-silhouette.png'),fullPage:true});
await page.locator('#open-report').click();assert(await page.locator('#report').evaluate(d=>d.open));await page.locator('#close-report').click();
await page.locator('#surface').click();await page.evaluate(()=>{review.setView('oblique');review.setLight('studio');});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
const stats=await page.evaluate(()=>review.stats());assert(stats.finite&&stats.triangles<=100000);assert.deepStrictEqual(errors,[]);
fs.writeFileSync(path.join(out,'QA.json'),JSON.stringify({stats,errors,audit,geometryHash:hashBefore,geometryUnchangedByAppearance:true,queryStableAcrossViewAndLight:true,invalidContextUnknown:true,realReferenceLoaded:true,neutralComparisonEnforced:true,mobileNoOverflow:true},null,2));console.log(JSON.stringify({passed:true,stats,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
