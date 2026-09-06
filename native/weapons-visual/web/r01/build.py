#!/usr/bin/env python3
"""Bundle authored rules with a pinned renderer. Never reads a product model or image."""
import argparse,hashlib,json,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
EXPECTED={'three.module.js':'ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb','OrbitControls.js':'80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e','THREE_LICENSE.txt':'4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9e9f97ab7325cb9a'}
# The license is carried in full; only renderer/controls hashes are build identity gates.
def digest(b):return hashlib.sha256(b).hexdigest()
def strip_export(s):
 m=re.search(r'export\s*\{([^}]+)\}\s*;?\s*$',s,re.S)
 if not m:raise ValueError('Unexpected renderer module format')
 pairs=[]
 for field in m.group(1).split(','):
  p=field.strip().split(' as ');pairs.append(p[-1]+':'+p[0])
 return s[:m.start()],','.join(pairs)
def build(vendor,output):
 for name in ['three.module.js','OrbitControls.js']:
  if digest((vendor/name).read_bytes())!=EXPECTED[name]:raise ValueError('Pinned dependency changed: '+name)
 three,exports=strip_export((vendor/'three.module.js').read_text())
 js='const THREE=(()=>{\n'+three+'\nreturn {'+exports+'};})();\n'
 controls=(vendor/'OrbitControls.js').read_text();controls=re.sub(r"import\s*\{([^}]+)\}\s*from\s*'three';",r'const {\1}=THREE;',controls)
 controls,exports=strip_export(controls);js+='const {OrbitControls}=(()=>{\n'+controls+'\nreturn {'+exports+'};})();\n'
 files=['model.js','surface.js','app.js'];rules='\n'.join((HERE/f).read_text() for f in files)
 if any(x in rules for x in ['GLTFLoader','TextureLoader','data:image/','atob(','distilled-reference']):raise ValueError('Disallowed product asset path')
 js+=rules;js=js.replace('</script','<\\/script');license=(vendor/'THREE_LICENSE.txt').read_text()
 runtime='<script>/* Three.js license:\n'+license.replace('*/','* /')+'\n*/\n'+js+'</script>'
 html=(HERE/'index.template.html').read_text().replace('__RUNTIME__',runtime)
 output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html,encoding='utf-8')
 report={'version':'wm.aircraft.native-r01.20260906','htmlBytes':output.stat().st_size,'htmlSha256':digest(output.read_bytes()),'productMeshFiles':0,'rasterTextureFiles':0,'referenceVertexTables':0,'geometrySource':'authored procedural exterior rules','realWeaponEngineering':False,'visualAcceptance':False,'productionReady':False,'inputHashes':{f:digest((HERE/f).read_bytes()) for f in files+['index.template.html','build.py']},'renderer':'Three.js r170','rendererHashes':{f:digest((vendor/f).read_bytes()) for f in ['three.module.js','OrbitControls.js','THREE_LICENSE.txt']}}
 output.with_suffix('.receipt.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--vendor',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();build(a.vendor,a.output)
