"""Build the reference-review interface. There is intentionally no reference-asset argument."""
from pathlib import Path
import argparse,hashlib,json,re
ROOT=Path(__file__).resolve().parent
LOCK={
 'three.module.js':'ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb',
 'OrbitControls.js':'80efaadea4f8a636a65fb0bd08bfef62f3d93a0bb94e2e7500f23176c5c07f4e',
 'THREE_LICENSE.txt':'4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9d32d4c5bcf4ba4454'}
def digest(b):return hashlib.sha256(b).hexdigest()
def wrap(text,names):
 match=re.search(r'export\s*\{([^}]+)\}\s*;?\s*$',text,re.S)
 if match is None:raise ValueError('Unrecognized fixed module')
 fields=[]
 for f in match.group(1).split(','):
  x=f.strip().split(' as ');fields.append(x[-1]+':'+x[0])
 return 'const '+names+'=(()=>{\n'+text[:match.start()]+'\nreturn {'+','.join(fields)+'};})();\n'
def main(vendor,output):
 for name,h in LOCK.items():
  if digest((vendor/name).read_bytes())!=h:raise ValueError('Fixed dependency differs: '+name)
 bundle=wrap((vendor/'three.module.js').read_text(),'THREE')
 orbit=re.sub(r"import\s*\{([^}]+)\}\s*from\s*'three';",r'const {\1}=THREE;',(vendor/'OrbitControls.js').read_text())
 bundle+=wrap(orbit,'{OrbitControls}')
 own=['reference-reader.js','sideplate.js','surface.js','workbench.js']
 code='\n'.join((ROOT/n).read_text() for n in own)
 for forbidden in ['localStorage','indexedDB','data:model','base64,','fetch(']:
  if forbidden in code:raise ValueError('Disallowed persistent/upload/reference payload operation: '+forbidden)
 bundle+=code
 license=(vendor/'THREE_LICENSE.txt').read_text().replace('*/','* /')
 runtime='<script>/* Renderer license\n'+license+'*/\n'+bundle.replace('</script','<\\/script')+'</script>'
 text=(ROOT/'index.template.html').read_text().replace('__RUNTIME__',runtime)
 output.parent.mkdir(parents=True,exist_ok=True);output.write_text(text,encoding='utf-8')
 info={'schema':'aircraft.detail-w04.build/1','scope':'B24-first sideplate topology and provisional PBR follow-up, optional source comparison','bytes':output.stat().st_size,'sha256':digest(output.read_bytes()),'inputCode':{n:digest((ROOT/n).read_bytes()) for n in own+['index.template.html','build.py']},'vendor':LOCK,'embeddedReferenceMeshes':0,'embeddedReferenceTextures':0,'sourceUpload':False,'requiresLocalReferenceSelection':False,'optionalReferenceComparison':True,'independentSideplateCandidateBuilt':True,'completeReplicaFinished':False,'oldWorkDeleted':False}
 output.with_suffix('.receipt.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n');print(json.dumps(info,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--vendor',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();main(a.vendor,a.output)
