"""Build one self-contained review HTML without reading or embedding the reference."""
import hashlib,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
read=lambda p:p.read_text(encoding='utf-8')
vendor=ROOT/'vendor'
for name,digest in json.loads(read(vendor/'VENDOR_LOCK.json')).items():
    assert hashlib.sha256((vendor/name).read_bytes()).hexdigest()==digest,name
files=[vendor/'three-controls.runtime.js',vendor/'reference-input.js',ROOT/'rules/w13/geometry-program.js',ROOT/'rules/w13/cartridge-program.js',ROOT/'rules/w13/supply-program.js',ROOT/'rules/w13/accessory-program.js',ROOT/'rules/w13/object-dna.js',ROOT/'rules/w13/marking-program.js',ROOT/'rules/w13/surface-program.js',ROOT/'rules/w13/animation-program.js',ROOT/'rules/reference-twin.js',ROOT/'rules/w13/cal50-reference.js',ROOT/'rules/w13/reference-study.js',HERE/'app.js']
params=json.loads(read(ROOT/'rules/w13/EXTERIOR_RECIPE_R01.json'))
datums=json.loads(read(ROOT/'DATUM_REGISTRATION_R02.json'))
reportPath=ROOT/'validation/W13_PREFLIGHT.json'
report=json.loads(read(reportPath)) if reportPath.exists() else dict(status='development')
runtime='/* '+read(vendor/'THIRD_PARTY_NOTICES.txt').replace('*/','* /')+' */\n'
runtime+='const EXTERIOR_RECIPE='+json.dumps(params,ensure_ascii=False)+';\nconst DATUM_RECORD='+json.dumps(datums,ensure_ascii=False)+';\nconst APP_REPORT='+json.dumps(report,ensure_ascii=False)+';\n'
runtime+='\n'.join(read(f) for f in files)
for token in ['localStorage','indexedDB','data:model/','data:application/octet-stream']:
    assert token not in runtime,token
html=read(HERE/'template.html').replace('__RUNTIME__',runtime.replace('</script','<\\/script'))
out=ROOT/'releases/w13/AIRCRAFT_ANM2_OBJECT_DNA_W13.html';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html,encoding='utf-8')
receipt=dict(schema='object-dna.review-build/0.2',path=out.relative_to(ROOT).as_posix(),bytes=out.stat().st_size,sha256=hashlib.sha256(out.read_bytes()).hexdigest(),
 referenceEmbedded=False,previousGeometryInherited=True,geometryBaseline="W11 core with W13 hollow tube, separate cartridge parts and box details",visualAcceptance=False,productionReady=False,
 sources={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in files+[HERE/'template.html',ROOT/'rules/w13/EXTERIOR_RECIPE_R01.json',ROOT/'DATUM_REGISTRATION_R02.json']})
out.with_suffix('.receipt.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8');print(json.dumps(receipt,indent=2))
