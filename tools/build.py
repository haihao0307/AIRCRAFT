#!/usr/bin/env python3
"""Build only the locked B24 runtime. Unknown files never enter the package."""
from pathlib import Path
import hashlib, json, shutil, urllib.request, gzip, re
ROOT=Path(__file__).resolve().parents[1]
LOCK=json.loads((ROOT/'UPSTREAM_LOCK.json').read_text())
def blob(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def read_verified(path,sha):
    url=LOCK['base_url']+path
    data=urllib.request.urlopen(url,timeout=90).read()
    if blob(data)!=sha: raise ValueError('Upstream blob mismatch: '+path)
    return data
runtime=ROOT/'runtime'; runtime.mkdir(exist_ok=True)
for name,sha in LOCK['files'].items():
    out=runtime/name
    if out.exists():
        data=out.read_bytes()
        if blob(data)!=sha: raise ValueError('Frozen source changed: '+name)
    else:
        data=read_verified('b24-metal-grass-mission-r1/'+name,sha)
        out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
raw=gzip.decompress((runtime/'assets/native.bin.gz').read_bytes())
if len(raw)!=16647376 or hashlib.sha256(raw).hexdigest()!=LOCK['payload_sha256']: raise ValueError('Aircraft payload changed')
manifest=json.loads(gzip.decompress((runtime/'assets/native.json.gz').read_bytes()))
assert len(manifest['components'])==1784 and len(manifest['meshes'])==348
for d in manifest['components']:
    name=d.get('semanticPath',d['name'])
    if d['id'] in [1454,1385,1431,1408] or re.search(r'bomb(?!_door)',name,re.I):
        print('SOURCE_NODE',json.dumps({k:d.get(k) for k in ['id','name','parent','mesh','semanticFamily','semanticPath']},ensure_ascii=False))
html=read_verified('b24-v017-clean-restart/index.html',LOCK['accepted_index_blob']).decode()
html=html.replace('<base href="../b24-metal-grass-mission-r1/">','')
html=html.split('<script>const preservation=')[0]+'<script type="module" src="production-effects.js"></script></body></html>'
html=html.replace('· V017</title>','· V017.1</title>').replace('<b>V017</b>','<b>V017.1</b>')
html=html.replace('第 17 个工作版本。','V017.1 效果候选。').replace('V017 · 继承锁已启用','V017.1 · 已确认基线继续保留')
html=re.sub(r'<footer>.*?</footer>','<footer>V017 已确认保留 · V017.1 效果待确认 · 天气与雾未接入</footer>',html,flags=re.S)
(runtime/'index.html').write_text(html)
allowed=set(LOCK['files'])|{'index.html','effect-state.js','production-effects.js'}
actual={str(p.relative_to(runtime)) for p in runtime.rglob('*') if p.is_file()}
if actual!=allowed: raise ValueError('Unlisted runtime files: '+repr(actual^allowed))
# No iframe, no module/CDN fallback, no sibling runtime dependency.
assert '<iframe' not in html and '<base' not in html
for p in runtime.glob('*.js'):
    text=p.read_text()
    if re.search(r'(?:weather-mother|fog-mother|\.\./|https?://)',text,re.I): raise ValueError('Disallowed runtime dependency in '+p.name)
for p in runtime.glob('*.js'):
    for target in re.findall(r"from\s*['\"]([^'\"]+)['\"]",p.read_text()):
        if target=='three': continue
        if not target.startswith('./') or not (runtime/target).is_file(): raise ValueError('Missing local import: '+target)
report={'payload_sha256':hashlib.sha256(raw).hexdigest(),'components':1784,'meshes':348,'runtime_file_count':len(allowed),'files':{name:blob((runtime/name).read_bytes()) for name in sorted(allowed)},'weather':False,'fog':False,'extra_runtime_files':[]}
(ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/BUILD.json').write_text(json.dumps(report,indent=2))
print('BUILD_REPORT',json.dumps(report))
