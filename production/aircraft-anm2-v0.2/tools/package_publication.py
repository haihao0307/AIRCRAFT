"""Prepare an explicit source-and-review allowlist; never include the source GLB."""
from pathlib import Path
import json,base64,hashlib
R=Path(__file__).resolve().parents[1]
names=['README.md','START_HERE.md','AGENTS.md','PUBLIC_PREVIEW_DELIVERY_RULE.md','CURRENT.json','LINEAGE.json','SEMANTIC_PARTS_R02.json','DATUM_REGISTRATION_R02.json','ASSET_CONTRACT.json']
for folder in ['rules','vendor','workbench/w09','tools']:
 names += [p.relative_to(R).as_posix() for p in (R/folder).glob('*') if p.is_file() and p.suffix in ('.py','.cjs','.js','.json','.html','.txt')]
names += [p.relative_to(R).as_posix() for p in (R/'validation').glob('*') if p.is_file()]
names += ['validation/w09/RUNTIME.json','releases/w09/AIRCRAFT_ANM2_OBJECT_DNA_W09.html','releases/w09/AIRCRAFT_ANM2_OBJECT_DNA_W09.receipt.json']
names += ['validation/w09/'+n+'.png' for n in ['receiver-oblique','receiver-side','receiver-reverse','receiver-top','receiver-bottom','receiver-front','receiver-back','positivePlate-front','collar-side','full-oblique','desktop-loaded','mobile-loaded']]
names += ['validation/w09/difference-'+region+'-'+view+'.png' for region,view in [('receiver','side'),('receiver','front'),('positivePlate','side'),('collar','side')]]
entries=[]
for name in sorted(set(names)):
 p=R/name;raw=p.read_bytes()
 if name=='SEMANTIC_PARTS_R02.json':
  obj=json.loads(raw)
  for part in obj['parts']:part['evidence']=list(dict.fromkeys(part['evidence']))
  raw=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode();p.write_bytes(raw)
 if name=='CURRENT.json':
  obj=json.loads(raw);obj['referenceInput'].pop('localPath',None);raw=(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode()
 entries.append({'path':'production/aircraft-anm2-v0.2/'+name,'encoding':'base64' if p.suffix=='.png' else 'utf-8','content':base64.b64encode(raw).decode() if p.suffix=='.png' else raw.decode('utf-8'),'sha256':hashlib.sha256(raw).hexdigest()})
out=R.parents[1]/'publication-w09.local.json';out.write_text(json.dumps(entries,ensure_ascii=True),encoding='utf-8');print(json.dumps({'entries':len(entries),'characters':out.stat().st_size,'path':str(out)}))
