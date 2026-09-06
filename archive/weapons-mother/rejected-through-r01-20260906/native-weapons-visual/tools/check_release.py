"""Heuristic asset guard for this native package, not a universal provenance proof."""
from pathlib import Path
import ast, json, re, sys

BLOCKED = {'.glb','.gltf','.fbx','.obj','.ply','.stl','.blend','.bin','.png','.jpg','.jpeg','.webp','.ktx','.ktx2','.dds','.exr','.hdr','.zip','.gz'}

def scan(root):
    findings=[]
    for p in sorted(Path(root).rglob('*')):
        if p.is_dir(): continue
        rel=str(p.relative_to(root))
        if p.is_symlink(): findings.append([rel,'symlink']); continue
        if '__pycache__' in p.parts or p.suffix=='.pyc':
            findings.append([rel,'bytecode cache']); continue
        if p.suffix.lower() in BLOCKED: findings.append([rel,'asset or opaque container'])
        try: text=p.read_text(encoding='utf-8')
        except UnicodeError: findings.append([rel,'non-text bytes']); continue
        if re.search(r'data:[^\s"\']+;base64,',text): findings.append([rel,'data URI'])
        if re.search(r'[A-Za-z0-9+/]{512,}={0,2}',text): findings.append([rel,'opaque long payload'])
        if p.suffix=='.py':
            for n in ast.walk(ast.parse(text)):
                if isinstance(n,(ast.List,ast.Tuple)):
                    nums=[v for v in ast.walk(n) if isinstance(v,ast.Constant) and type(v.value) in (int,float)]
                    if len(nums)>128:
                        findings.append([rel,'large literal numeric table']);break
    return {'schema':'wm.native.asset-guard/1','passed':not findings,'findings':findings,
            'scope':'file types, encoded payloads, Python numeric literals; manual provenance review still required'}

if __name__=='__main__':
    result=scan(Path(sys.argv[1]));print(json.dumps(result,indent=2))
    sys.exit(0 if result['passed'] else 1)
