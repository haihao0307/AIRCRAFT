from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
names=['CURRENT.json','README.md','START_HERE.md','AGENTS.md','PUBLIC_PREVIEW_DELIVERY_RULE.md','validation/W12_PREFLIGHT.json','validation/W12_REVIEW.md','validation/NEW_REFERENCE_DISTILLATION_REVIEW_2026-09-08.md','validation/NEW_REFERENCE_FILE_AUDIT_2026-09-08.json','validation/w12/QA.json','tools/check_w12.cjs','tools/finalize_w12.py','tools/package_w12.py']
for folder in ['rules/w12','workbench/w12','releases/w12']:
 names.extend(p.relative_to(R).as_posix() for p in (R/folder).iterdir() if p.is_file() and p.name not in ['wire.py','fix.py','qa-fix.py'])
entries=[]
for name in names:
 p=R/name;raw=p.read_bytes()
 if name=='CURRENT.json':
  d=json.loads(raw);d['referenceInput'].pop('localPath',None);raw=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode()
 entries.append({'path':'production/aircraft-anm2-v0.2/'+name,'encoding':'utf-8','content':raw.decode('utf-8'),'sha256':hashlib.sha256(raw).hexdigest()})
(R.parents[1]/'publication-w12.local.json').write_text(json.dumps(entries,ensure_ascii=True),encoding='utf-8');print(len(entries))
