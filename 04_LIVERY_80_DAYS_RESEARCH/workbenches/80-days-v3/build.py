"""Build a standalone review page without changing the source aircraft."""
from pathlib import Path
import base64, hashlib, json, os, re, subprocess, urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
RES = Path(os.environ.get('B24_RESOURCES', '/tmp/b24resources'))
VENDOR = RES / 'vendor' / 'three'
PHOTOS = RES / 'photos'
PHOTOS.mkdir(parents=True, exist_ok=True)
if not VENDOR.exists():
    VENDOR.parent.mkdir(exist_ok=True)
    subprocess.run(['npm', 'pack', 'three@0.169.0', '--silent'], cwd=VENDOR.parent, check=True)
    subprocess.run(['tar', '-xzf', 'three-0.169.0.tgz'], cwd=VENDOR.parent, check=True)
    (VENDOR.parent / 'package').rename(VENDOR)

photo_sources = {
    'port': ('https://asisbiz.com/il2/B-24/308BG/images/42-73257-B-24J-Liberator-14AF-308BG374BS-no-487-named-80-Days-nose-art-left-side-China-01.jpg', '07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa'),
    'starboard': ('https://dainthecbi.com/images/pitterle/80-days.jpg', '4ffd9160fba0d00ffd47e4925bcddc55c4efde800e17e3b73afc26007b248c06'),
}
photos = {}
for key, (url, expected) in photo_sources.items():
    path = PHOTOS / (key + '.jpg')
    if not path.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=40) as response:
            path.write_bytes(response.read())
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != expected:
        raise ValueError('Reference bytes changed: ' + key)
    with Image.open(path) as im:
        width, height = im.size
    photos[key] = {'url': url, 'sha256': digest, 'width': width, 'height': height,
                   'bytes': len(raw), 'data': 'data:image/jpeg;base64,' + base64.b64encode(raw).decode()}

modules = {}
def register(path, key):
    if key in modules:
        return
    text = path.read_text()
    modules[key] = ''
    def resolve(match):
        target = (path.parent / match.group(1)).resolve()
        relative = target.relative_to((VENDOR / 'examples/jsm').resolve()).as_posix()
        child = 'three/addons/' + relative
        register(target, child)
        return "from '" + child + "'"
    text = re.sub(r"from\s+['\"](\.[^'\"]+)['\"]", resolve, text)
    text = re.sub(r'//# sourceMappingURL=.*', '', text)
    modules[key] = 'data:text/javascript;base64,' + base64.b64encode(text.encode()).decode()

engine = VENDOR / 'build/three.module.min.js'
modules['three'] = 'data:text/javascript;base64,' + base64.b64encode(engine.read_bytes()).decode()
for addon in ['controls/OrbitControls.js', 'loaders/GLTFLoader.js', 'environments/RoomEnvironment.js']:
    register(VENDOR / 'examples/jsm' / addon, 'three/addons/' + addon)
math_source = ROOT / 'experiments/80-days-material-r1/material-channels.mjs'
modules['material-math'] = 'data:text/javascript;base64,' + base64.b64encode(math_source.read_bytes()).decode()
app = (HERE / 'app.mjs').read_text()
# Normalize the two early prototype exponent expressions before parsing.
app = app.replace('Math.exp(-((u-.83)/.17)**2-((v-.41)/.3)**2)', 'Math.exp(-(((u-.83)/.17)**2)-(((v-.41)/.3)**2))')
check = HERE / 'app.syntax-check.mjs'
check.write_text(app)
try:
    subprocess.run(['node', '--check', str(check)], check=True)
finally:
    check.unlink(missing_ok=True)

model = (ROOT / 'public/assets/model/b-24_liberator.glb').read_bytes()
model_sha = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
if len(model) != 23085972 or hashlib.sha256(model).hexdigest() != model_sha:
    raise ValueError('Authoritative aircraft identity mismatch')
D = {'version': '3.0.0', 'photos': photos,
     'model': {'bytes': 23085972, 'sha256': model_sha,
               'url': 'https://raw.githubusercontent.com/haihao0307/AIRCRAFT/227b82cec38a9aadd35ffffe6f2d8e429c0f6f0e/public/assets/model/b-24_liberator.glb'},
     'sources': {
         'xiaoma': 'https://github.com/haihao0307/guilin-dem-pipeline/blob/handoff/xiaoma-mentor-v1.1-20260905/docs/mother_coordination/learning-r1-20260905/skills/geometry-context/SKILL.md',
         'blender': 'https://docs.blender.org/manual/en/latest/render/shader_nodes/displacement/normal_map.html',
         'materialReference': 'https://github.com/img2threejs/img2threejs/blob/main/docs/materials/README.md',
         'three': 'https://threejs.org/manual/en/color-management.html',
         'review': 'https://github.com/haihao0307/AIRCRAFT/pull/13#issuecomment-5410918044'}}
html = (HERE / 'index.template.html').read_text()
html = html.replace('__DATA__', json.dumps(D, ensure_ascii=False).replace('</', '<\\/'))
html = html.replace('__IMPORTMAP__', json.dumps({'imports': modules})).replace('__APP__', app)
out = ROOT / '80-days-workbench-v3.html'
out.write_text(html)
receipt = {'schema': 'b24-livery-workbench-build@1', 'version': '3.0.0',
           'bytes': out.stat().st_size, 'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
           'sourceCommit': os.environ.get('GITHUB_SHA', 'local'), 'threeVersion': '0.169.0',
           'threeModuleSHA256': hashlib.sha256(engine.read_bytes()).hexdigest(),
           'photos': {k: {a: b for a, b in v.items() if a != 'data'} for k, v in photos.items()},
           'modelSHA256': model_sha, 'modelBytes': len(model), 'modelBinding': 0,
           'visualAcceptance': False, 'productionReady': False}
(HERE / 'BUILD_RECEIPT.json').write_text(json.dumps(receipt, indent=2, ensure_ascii=False))
print(json.dumps(receipt, indent=2))
