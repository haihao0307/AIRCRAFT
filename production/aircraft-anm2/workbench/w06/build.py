#!/usr/bin/env python3
import argparse,hashlib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
EXPECTED={'three.module.js':'ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb','OrbitControls.js':'80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e','THREE_LICENSE.txt':'4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9d32d4c5bcf4ba4454'}
def sha(b):return hashlib.sha256(b).hexdigest()
def strip(s):
 m=re.search(r'export\s*\{([^}]+)\}\s*;?\s*$',s,re.S);assert m;items=[]
 for x in m.group(1).split(','):
  p=x.strip().split(' as ');items.append(p[-1]+':'+p[0])
 return s[:m.start()],','.join(items)
def build(vendor,out):
 for n,h in EXPECTED.items():assert sha((vendor/n).read_bytes())==h,n
 t,e=strip((vendor/'three.module.js').read_text());runtime='const THREE=(()=>{'+t+';return {'+e+'};})();\n';c=(vendor/'OrbitControls.js').read_text();c=re.sub(r"import\s*\{([^}]+)\}\s*from\s*'three';",r'const {\1}=THREE;',c);c,e=strip(c);runtime+='const {OrbitControls}=(()=>{'+c+';return {'+e+'};})();\n'
 files=['surface.js','fullgun.js','public-workbench.js'];product='\n'.join((HERE/f).read_text() for f in files);assert not any(x in product for x in ['GLTFLoader','TextureLoader','data:image/','distilled-reference','ReferenceInput']);runtime+=product
 license=(vendor/'THREE_LICENSE.txt').read_text().replace('*/','* /');html=(HERE/'public-template.html').read_text().replace('__RUNTIME__','<script>/* Three.js license:\n'+license+'\n*/\n'+runtime.replace('</script','<\\/script')+'</script>');out.write_text(html)
 receipt={'schema':'aircraft.w06.public-build/1','bytes':out.stat().st_size,'sha256':sha(out.read_bytes()),'productMeshFiles':0,'productRasterTextures':0,'referenceEmbedded':False,'sourceFiles':{f:sha((HERE/f).read_bytes()) for f in ['public-template.html','build.py']+files},'visualAcceptance':False,'productionReady':False};out.with_suffix('.receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--vendor',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.vendor,a.output)
