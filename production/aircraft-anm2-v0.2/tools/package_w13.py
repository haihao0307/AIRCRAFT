from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
names=['CURRENT.json','README.md','START_HERE.md','AGENTS.md','PUBLIC_PREVIEW_DELIVERY_RULE.md','validation/W13_PREFLIGHT.json','validation/W13_REVIEW.md','validation/w13/QA.json','tools/check_w13.cjs','tools/finalize_w13.py','tools/package_w13.py']
for folder in ['rules/w13','workbench/w13','releases/w13']:
 names.extend(p.relative_to(R).as_posix() for p in (R/folder).iterdir() if p.is_file())
entries=[]
for name in names:
 raw=(R/name).read_bytes()
 if name=='CURRENT.json':
  d=json.loads(raw);d['referenceInput'].pop('localPath',None);raw=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode()
 entries.append({'path':'production/aircraft-anm2-v0.2/'+name,'encoding':'utf-8','content':raw.decode('utf-8-sig'),'sha256':hashlib.sha256(raw.decode('utf-8-sig').encode()).hexdigest()})
(R.parents[1]/'publication-w13.local.json').write_text(json.dumps(entries,ensure_ascii=True),encoding='utf8');print(len(entries))
