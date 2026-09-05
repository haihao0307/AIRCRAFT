#!/usr/bin/env python3
"""Offline-reproducible startup patch; retained payload identity is mandatory."""
from pathlib import Path
import hashlib,json,gzip,re,subprocess,sys
ROOT=Path(__file__).resolve().parents[1];RT=ROOT/'runtime'
LOCK=json.loads((ROOT/'UPSTREAM_LOCK.json').read_text());PATCH=json.loads((ROOT/'STARTUP_PATCH.json').read_text())
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
subprocess.run([sys.executable,str(ROOT/'tools/apply_startup_patch.py')],check=True)
for name,expected in LOCK['files'].items():
    want=PATCH['authorized_runtime_blobs'].get(name,expected)
    if not (RT/name).is_file() or blob((RT/name).read_bytes())!=want:raise ValueError('Source mismatch: '+name)
subprocess.run([sys.executable,str(ROOT/'tools/pack_startup.py')],check=True)
for name,want in PATCH['authorized_runtime_blobs'].items():
    if blob((RT/name).read_bytes())!=want:raise ValueError('Startup patch mismatch: '+name)
layout=json.loads((RT/'asset-layout.js').read_text().split('export const LAYOUT = ',1)[1].rstrip(';\n'))
allowed=set(LOCK['files'])|set(PATCH['authorized_runtime_blobs'])|{p['url'][2:] for d in layout['datasets'] for p in d['parts']}
actual={p.relative_to(RT).as_posix() for p in RT.rglob('*') if p.is_file()}
if actual!=allowed:raise ValueError('Unlisted runtime files: '+repr(actual^allowed))
for d in layout['datasets']:
    parts=[(RT/p['url'][2:]).read_bytes() for p in d['parts']]
    assert b''.join(parts)==(RT/f"assets/native.{d['id']}.gz").read_bytes()
raw=gzip.decompress((RT/'assets/native.bin.gz').read_bytes());assert hashlib.sha256(raw).hexdigest()==LOCK['payload_sha256']
html=(RT/'index.html').read_text();assert '<iframe' not in html and '<base' not in html
for f in RT.glob('*.js'):
    for target in re.findall(r"(?:from\s*|import\s*\()['\"]([^'\"]+)['\"]",f.read_text()):
        if target=='three':continue
        path=target.split('?')[0]
        if not path.startswith('./') or not (RT/path).is_file():raise ValueError('Missing local import: '+target)
    if re.search(r'weather-mother|fog-mother|\.\./',f.read_text(),re.I):raise ValueError('Disallowed runtime dependency: '+f.name)
report={'loader_revision':PATCH['revision'],'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip() if (ROOT/'.git').exists() else 'local-precommit',
        'payload_sha256':hashlib.sha256(raw).hexdigest(),'payload_bytes':len(raw),'runtime_file_count':len(allowed),'transport_parts':18,
        'files':{n:blob((RT/n).read_bytes()) for n in sorted(allowed)},'weather':False,'fog':False,'extra_runtime_files':[]}
(ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/BUILD.json').write_text(json.dumps(report,indent=2))
print('BUILD_OK',report['runtime_file_count'],report['payload_sha256'])
