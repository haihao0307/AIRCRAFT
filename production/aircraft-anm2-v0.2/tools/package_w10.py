from pathlib import Path
import json,hashlib,base64
R=Path(__file__).resolve().parents[1]
names=['CURRENT.json','README.md','START_HERE.md','AGENTS.md','PUBLIC_PREVIEW_DELIVERY_RULE.md','validation/W10_PREFLIGHT.json','validation/W10_REVIEW.md','tools/check_w10.cjs','tools/finalize_w10.py','tools/package_w10.py']
for folder in ['rules/w10','workbench/w10','releases/w10','validation/w10']:
 names.extend(p.relative_to(R).as_posix() for p in (R/folder).iterdir() if p.is_file())
entries=[]
for name in names:
 p=R/name;raw=p.read_bytes()
 if name=='CURRENT.json':
  d=json.loads(raw);d['referenceInput'].pop('localPath',None);raw=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode()
 entries.append({'path':'production/aircraft-anm2-v0.2/'+name,'encoding':'base64' if p.suffix=='.png' else 'utf-8','content':base64.b64encode(raw).decode() if p.suffix=='.png' else raw.decode('utf-8'),'sha256':hashlib.sha256(raw).hexdigest()})
(R.parents[1]/'publication-w10.local.json').write_text(json.dumps(entries,ensure_ascii=True),encoding='utf-8');print(len(entries))
