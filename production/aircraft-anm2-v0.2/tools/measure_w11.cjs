const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{spawn}=require('child_process');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}});await page.goto(pathToFileURL(path.join(root,'releases/w11/AIRCRAFT_ANM2_OBJECT_DNA_W11.html')).href);await page.waitForFunction(()=>window.reviewReady);
 await page.locator('#reference-file').setInputFiles(JSON.parse(fs.readFileSync(path.join(root,'CURRENT.json'))).referenceInput.localPath);await page.waitForFunction(()=>window.referenceReady);
 const masks=[];await page.evaluate(()=>window.review.masksForQA(true));
 for(const region of ['rear','supply'])for(const view of ['side','reverse','top','bottom','front','back']){
  await page.evaluate(([r,v])=>{window.review.setRegion(r);window.review.setView(v);},[region,view]);
  const data=await page.evaluate(()=>Array.from(document.querySelectorAll('canvas')).map(c=>c.toDataURL('image/png').split(',')[1]));masks.push({region,view,data});
 }
 const payload={native:await page.evaluate(()=>window.review.exportGeneratedBuffers()),masks,stats:await page.evaluate(()=>window.review.stats())};
 await new Promise((resolve,reject)=>{const p=spawn('G:/AIRCRAFT/object-dna-runtime/Scripts/python.exe',[path.join(__dirname,'measure_w11.py')],{cwd:root,stdio:['pipe','inherit','inherit']});p.on('exit',c=>c?reject(Error('measure '+c)):resolve());p.stdin.end(JSON.stringify(payload));});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

