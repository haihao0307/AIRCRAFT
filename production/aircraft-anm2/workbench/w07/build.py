#!/usr/bin/env python3
"""Build the W07 dual-object workbench. No reference GLB is read or embedded."""
import argparse,hashlib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
EXPECTED={'three.module.js':'ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb','OrbitControls.js':'80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e','THREE_LICENSE.txt':'4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9d32d4c5bcf4ba4454'}
def sha(b):return hashlib.sha256(b).hexdigest()
def strip_export(s):
 m=re.search(r'export\s*\{([^}]+)\}\s*;?\s*$',s,re.S)
 if not m:raise ValueError('Unexpected module format')
 pairs=[]
 for f in m.group(1).split(','):
  p=f.strip().split(' as ');pairs.append(p[-1]+':'+p[0])
 return s[:m.start()],','.join(pairs)
def build(vendor,out):
 for n,h in EXPECTED.items():
  if sha((vendor/n).read_bytes())!=h:raise ValueError('Pinned dependency changed: '+n)
 three,exports=strip_export((vendor/'three.module.js').read_text());runtime='const THREE=(()=>{\n'+three+'\nreturn {'+exports+'};})();\n'
 controls=(vendor/'OrbitControls.js').read_text();controls=re.sub(r"import\s*\{([^}]+)\}\s*from\s*'three';",r'const {\1}=THREE;',controls);controls,exports=strip_export(controls);runtime+='const {OrbitControls}=(()=>{\n'+controls+'\nreturn {'+exports+'};})();\n'
 files=['fullgun.js','surface.js','reference-reader.js','reference-view.js','app.js'];rules='\n'.join((HERE/f).read_text() for f in files)
 for forbidden in ['data:model/','data:application/octet-stream','distilled-reference','localStorage','indexedDB']:
  if forbidden in rules:raise ValueError('Disallowed embedded/persistent reference path: '+forbidden)
 runtime+=(rules.replace('</script','<\\/script'))
 license=(vendor/'THREE_LICENSE.txt').read_text().replace('*/','* /')
 html=(HERE/'template.html').read_text().replace('__RUNTIME__','/* Three.js license:\n'+license+'\n*/\n'+runtime)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html,encoding='utf-8')
 rec={'schema':'aircraft.w07.progress-build/1','bytes':out.stat().st_size,'sha256':sha(out.read_bytes()),'productMeshFiles':0,'productRasterTextures':0,'referenceEmbedded':False,'referenceLocalFileOnly':True,'sourceFiles':{f:sha((HERE/f).read_bytes()) for f in files+['template.html','build.py']},'visualAcceptance':False,'productionReady':False}
 out.with_suffix('.receipt.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(rec,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--vendor',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.vendor,a.output)
