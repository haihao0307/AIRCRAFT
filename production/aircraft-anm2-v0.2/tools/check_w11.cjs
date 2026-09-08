const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'validation/w11');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(pathToFileURL(path.join(root,'releases/w11/AIRCRAFT_ANM2_OBJECT_DNA_W11.html')).href);await page.waitForFunction(()=>window.reviewReady);
const shot=async name=>page.screenshot({path:path.join(out,name+'.png'),fullPage:true});await shot('default');
const stats=await page.evaluate(()=>review.stats());console.log(JSON.stringify(stats));assert(stats.finite&&stats.triangles<=140000&&stats.degenerate===0&&stats.badNormals===0);
const dna=await page.evaluate(()=>review.dnaPacket());assert.equal(dna.objects.filter(e=>e.typeOf==='cartridge-visual-template/1').length,58);assert.equal(new Set(dna.objects.map(e=>e.id)).size,dna.objects.length);
const coords=await page.evaluate(()=>review.coordinateAudit());for(const e of coords){assert(e.determinant>0);assert(e.actual.every((n,i)=>Math.abs(n-e.expected[i])<1e-10),e.id);}
assert.equal((await page.evaluate(()=>review.dnaPosition('W11/round/01',{}))).status,'unknown-context');
const cameras=[];for(const view of ['oblique','rearOblique','front','back','top']){await page.evaluate(v=>review.setView(v),view);const a=await page.evaluate(()=>review.cameraAudit());a.view=view;cameras.push(a);assert(a.determinant>0);if(view.includes('Oblique')||view==='oblique'){assert(a.nearSegment>a.farSegment*1.9);assert(a.rotationEnabled);}else{assert(Math.abs(a.nearSegment-a.farSegment)<1e-10);assert(!a.rotationEnabled);}}
const hash=()=>page.evaluate(()=>JSON.stringify(review.exportGeneratedBuffers())).then(s=>crypto.createHash('sha256').update(s).digest('hex'));const before=await hash();
await page.evaluate(()=>{review.setRegion('assembly');review.setView('oblique');review.setExplode(1);review.selectObject('W11/rear/control');});await shot('expanded');assert.equal((await page.evaluate(()=>review.dnaPacket())).presentation.expansion,1);
await page.evaluate(()=>review.setExplode(0));assert.equal(await hash(),before);
const baseline=await browser.newPage();await baseline.goto(pathToFileURL(path.join(root,'releases/w10/AIRCRAFT_ANM2_OBJECT_DNA_W10.html')).href);await baseline.waitForFunction(()=>window.reviewReady);
const stable=a=>a.filter(m=>!['rear','supplyBox','supplyBelt'].includes(m.semantic)).map(m=>({name:m.name,indices:m.indices,vertices:m.vertices.map(v=>Math.round(v*1e7))}));
assert.deepStrictEqual(stable(await page.evaluate(()=>review.exportGeneratedBuffers())),stable(await baseline.evaluate(()=>review.exportGeneratedBuffers())));await baseline.close();
const dlPromise=page.waitForEvent('download');await page.locator('#export-dna').click();const dl=await dlPromise;const exported=JSON.parse(fs.readFileSync(await dl.path()));assert.equal(exported.objects.length,dna.objects.length);
await page.evaluate(()=>review.selectObject(''));
await page.locator('#reference-file').setInputFiles({name:'bad.glb',mimeType:'model/gltf-binary',buffer:Buffer.from('bad')});await page.waitForFunction(()=>window.referenceLoadFailure);
await page.locator('#reference-file').setInputFiles(JSON.parse(fs.readFileSync(path.join(root,'CURRENT.json'))).referenceInput.localPath);await page.waitForFunction(()=>window.referenceReady);
const ref=await page.evaluate(()=>review.referenceAudit());assert(ref.sourceMatricesUnchanged&&ref.sourceHierarchyUnchanged);assert.equal((await page.evaluate(()=>review.current())).mode,'neutral');
for(const [region,view]of [['assembly','oblique'],['supply','front'],['supply','top'],['rear','front'],['rear','back'],['rear','side'],['rear','oblique']]){await page.evaluate(([r,v])=>{review.setRegion(r);review.setView(v);},[region,view]);await shot(region+'-'+view);}
await page.locator('#source-all').click();assert((await page.evaluate(()=>review.current())).sourceOnly);await page.evaluate(()=>review.setView('oblique'));await shot('complete-source');
await page.locator('#source-all').click();await page.evaluate(()=>{review.setRegion('assembly');review.setExplode(1);review.setCompare(true);});assert.equal((await page.evaluate(()=>review.current())).expansion,0);
await page.locator('#open-report').click();assert(await page.locator('#report').evaluate(d=>d.open));await page.locator('#close-report').click();
await page.setViewportSize({width:390,height:844});await shot('mobile-compare');const sizes=await page.evaluate(()=>review.cameraAudit().viewports);assert.equal(sizes[0].width,sizes[1].width);assert.equal(sizes[0].height,sizes[1].height);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.locator('#surface').click();await page.evaluate(()=>review.setExplode(.65));await shot('mobile-expanded');
assert.deepStrictEqual(errors,[]);fs.writeFileSync(path.join(out,'QA.json'),JSON.stringify({passed:true,stats,errors,cameras,objectCount:dna.objects.length,roundCount:58,coordinateChainVerified:coords.length,assemblyGeometryRestoredAfterExpansion:true,realReferenceLoaded:true,referenceAudit:ref,invalidContextUnknown:true,exportVerified:true,mobileNoOverflow:true},null,2));console.log('W11 QA passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
