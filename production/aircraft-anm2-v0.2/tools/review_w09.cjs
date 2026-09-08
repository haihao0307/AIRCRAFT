const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'validation/w09');fs.mkdirSync(out,{recursive:true});
const source=JSON.parse(fs.readFileSync(path.join(root,'CURRENT.json'),'utf8')).referenceInput.localPath;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 await page.goto(pathToFileURL(path.join(root,'releases/w09/AIRCRAFT_ANM2_OBJECT_DNA_W09.html')).href);
 await page.waitForFunction(()=>window.reviewReady||window.reviewError,{},{timeout:60000});
 const failure=await page.evaluate(()=>window.reviewError);if(failure)throw Error(failure);
 await page.screenshot({path:path.join(out,'native-before-reference.png'),fullPage:true});
 await page.locator('#reference-file').setInputFiles(source);
 await page.waitForFunction(()=>window.referenceReady||window.referenceLoadFailure,{},{timeout:60000});
 const loadError=await page.evaluate(()=>window.referenceLoadFailure);if(loadError)throw Error(loadError);
 const stats=await page.evaluate(()=>window.review.stats()),audit=await page.evaluate(()=>window.review.referenceAudit());
 console.log(JSON.stringify({stats,audit,errors}));
 fs.writeFileSync(path.join(out,'RUNTIME.json'),JSON.stringify({stats,audit,errors,requests},null,2));
 const regions=process.argv.includes('--quick')?['receiver','body','positivePlate','full']:['receiver','body','positivePlate','collar','full','rear','jacket'];
 for(const region of regions){
  await page.evaluate(r=>window.review.setRegion(r),region);
  for(const view of ['oblique','side','reverse','top','bottom','front','back']){
   await page.evaluate(v=>window.review.setView(v),view);
   await page.locator('#stage').screenshot({path:path.join(out,region+'-'+view+'.png')});
  }
 }
 await page.evaluate(()=>{window.review.setRegion('receiver');window.review.setView('oblique');});
 await page.screenshot({path:path.join(out,'desktop-loaded.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{window.review.setRegion('receiver');window.review.setView('side');});
 await page.screenshot({path:path.join(out,'mobile-loaded.png'),fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
