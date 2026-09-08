// Isolated headless reference study. No GLB upload, mesh export or product candidate.
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {chromium} = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const history = path.resolve(root, '../aircraft-anm2');
const out = path.join(root, 'research/reference-intake-20260907');
const source = process.argv[2];
if (!source) throw Error('Provide the verified local reference path');
fs.mkdirSync(out, {recursive:true});
const historicalHtml = fs.readFileSync(path.join(history,'releases/w07/AIRCRAFT_B24_ANM2_W07_PROGRESS.html'),'utf8');
const start = historicalHtml.indexOf('const THREE=(()=>{');
const end = historicalHtml.indexOf('const {OrbitControls}=', start);
if(start<0 || end<start) throw Error('Pinned library boundary absent');
const three = historicalHtml.slice(start,end);
if(/FullGun|ReferenceView|normalizeTo/.test(three)) throw Error('Unexpected legacy code in library slice');
const reader = fs.readFileSync(path.join(history,'workbench/w07/reference-reader.js'),'utf8');
const app = `
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xe4e7eb);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1440,960); renderer.setPixelRatio(1); document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff,0x747982,2));
const key=new THREE.DirectionalLight(0xffffff,2.1); key.position.set(4,7,5);scene.add(key);
const camera=new THREE.OrthographicCamera(-1,1,1,-1,.001,10000);
const mat=new THREE.MeshStandardMaterial({color:0x9ba2aa,roughness:.8,metalness:0,side:THREE.DoubleSide});
let nodes,meshes,parsed;
document.querySelector('input').onchange=async e=>{try {
 parsed=await ReferenceInput.read(e.target.files[0]);
 nodes=parsed.doc.nodes.map((n,i)=>{const o=new THREE.Group();o.name=n.name;o.matrix.fromArray(parsed.nodeMatrices[i]);o.matrixAutoUpdate=false;return o;});
 meshes=[];
 for(let i=0;i<nodes.length;i++){
  const n=parsed.doc.nodes[i];
  if(n.mesh!==undefined) for(const p of parsed.doc.meshes[n.mesh].primitives){
   const g=new THREE.BufferGeometry();
   for(const [sem,name] of [['POSITION','position'],['NORMAL','normal']]){const a=parsed.attributes[p.attributes[sem]];if(a)g.setAttribute(name,new THREE.BufferAttribute(a.array,a.width,a.normalized));}
   g.setIndex(new THREE.BufferAttribute(parsed.attributes[p.indices].array,1));
   const m=new THREE.Mesh(g,mat);m.userData.index=i;nodes[i].add(m);meshes.push(m);
  }
  for(const child of n.children||[])nodes[i].add(nodes[child]);
 }
 for(const i of parsed.doc.scenes[parsed.doc.scene||0].nodes)scene.add(nodes[i]);
 scene.updateMatrixWorld(true);
 window.inventory={counts:parsed.counts,nodes:meshes.map(m=>({index:m.userData.index,name:nodes[m.userData.index].name,parent:parsed.doc.nodes[parsed.parent[m.userData.index]]?.name,negativeWorldDeterminant:m.matrixWorld.determinant()<0})),sourceMatricesPreserved:nodes.every((n,i)=>n.matrix.toArray().every((x,j)=>x===parsed.nodeMatrices[i][j]))};
 window.capture=(label,view,selection)=>{
  const selected=selection?new Set(selection):null;const bounds=new THREE.Box3();
  for(const m of meshes){m.visible=!selected||selected.has(m.userData.index);if(m.visible)bounds.union(new THREE.Box3().setFromObject(m));}
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(...size.toArray());
  camera.position.copy(center).add(new THREE.Vector3(...view).normalize().multiplyScalar(span*3));
  camera.up.set(0,1,0);if(Math.abs(view[1])>.99&&view[0]===0&&view[2]===0)camera.up.set(0,0,-1);
  camera.lookAt(center);camera.updateMatrixWorld();
  const localBounds=new THREE.Box3();
  for(let x of [bounds.min.x,bounds.max.x])for(let y of [bounds.min.y,bounds.max.y])for(let z of [bounds.min.z,bounds.max.z])localBounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
  const extent=localBounds.getSize(new THREE.Vector3()),width=Math.max(extent.x,extent.y*1.5)*1.15;
  camera.left=-width/2;camera.right=width/2;camera.top=width/3;camera.bottom=-width/3;camera.far=span*20;camera.updateProjectionMatrix();
  document.querySelector('#title').textContent=label+' | Reference only | source axes | no datum registration';
  renderer.render(scene,camera);
  return {label,view,selection:selection||'all 13 source meshes',cameraOnlyFraming:true};
 };
 window.ready=true;
}catch(err){window.failure=String(err);}};
`;
const html='<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#e4e7eb;font:16px sans-serif}#title{position:absolute;top:18px;left:22px}input{position:absolute;bottom:8px;left:22px}</style><div id="title">Private source study</div><input type="file"><script>'+three+reader+app+'</script>';
fs.writeFileSync(path.join(out,'reference-study.local.html'),html);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));
 await page.goto(pathToFileURL(path.join(out,'reference-study.local.html')).href);
 await page.locator('input').setInputFiles(source);
 await page.waitForFunction(()=>window.ready||window.failure,{},{timeout:60000});
 const failure=await page.evaluate(()=>window.failure);if(failure)throw Error(failure);
 const all=await page.evaluate(()=>window.inventory);
 const views=[['all-oblique',[1,1,1],null],['all-positive-x',[1,0,0],null],['all-positive-y',[0,1,0],null],['all-positive-z',[0,0,1],null],['body-positive-x',[1,0,0],[23,25]],['body-negative-x',[-1,0,0],[23,25]],['body-positive-y',[0,1,0],[23,25]],['body-positive-z',[0,0,1],[23,25]],['body-negative-z',[0,0,-1],[23,25]],['body-negative-y',[0,-1,0],[23,25]],['body-oblique',[1,.9,1],[23,25]],['shell-only',[.2,.5,1],[23]],['shell-reverse',[.2,.5,-1],[23]],['sideplate-only',[0,0,1],[25]],['collar-oblique',[1,1,1],[15]],['collar-front',[1,0,0],[15]],['rear-oblique',[-1,1,1],[17,19,21,27]]];
 const records=[];for(const [name,view,selection] of views){records.push(await page.evaluate(a=>window.capture(...a),[name,view,selection]));await page.screenshot({path:path.join(out,name+'.png')});}
 const report={...all,records,errors,externalRequests:requests.filter(u=>/^https?:/.test(u)),renderer:'Three.js in isolated headless Chrome / SwiftShader; neutral double-sided source-study material',sourceGeometryExported:false,sourceUploaded:false,mechanicalDatumsSolved:false,nativeGeometryCreated:false,visualAcceptance:false};
 fs.writeFileSync(path.join(out,'REFERENCE_RUNTIME.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(errors.length||report.externalRequests.length)throw Error('Reference runtime failed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
