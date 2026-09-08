from pathlib import Path
import json,hashlib,base64
R=Path(__file__).resolve().parents[1]
names=['CURRENT.json','README.md','START_HERE.md','AGENTS.md','PUBLIC_PREVIEW_DELIVERY_RULE.md','OBJECT_DNA_ASSEMBLY_POLICY.md','validation/W11_PREFLIGHT.json','validation/W11_REVIEW.md','validation/W11_MEASUREMENTS.json','validation/SOURCE_SUPPLY_RECHECK_2026-09-08.md','validation/W10_OBJECT_DNA_REFLECTION_2026-09-08.md','tools/check_w11.cjs','tools/measure_w11.cjs','tools/measure_w11.py','tools/finalize_w11.py','tools/package_w11.py']
for folder in ['rules/w11','workbench/w11','releases/w11','validation/w11']:
 names.extend(p.relative_to(R).as_posix() for p in (R/folder).iterdir() if p.is_file())
entries=[]
for name in names:
 p=R/name;raw=p.read_bytes()
 if name=='CURRENT.json':
  d=json.loads(raw);d['referenceInput'].pop('localPath',None);raw=(json.dumps(d,ensure_ascii=False,indent=2)+'\n').encode()
 entries.append({'path':'production/aircraft-anm2-v0.2/'+name,'encoding':'base64' if p.suffix=='.png' else 'utf-8','content':base64.b64encode(raw).decode() if p.suffix=='.png' else raw.decode('utf-8'),'sha256':hashlib.sha256(raw).hexdigest()})
(R.parents[1]/'publication-w11.local.json').write_text(json.dumps(entries,ensure_ascii=True),encoding='utf-8');print(len(entries))
