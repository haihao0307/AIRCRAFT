"""Recover only the audited third-party runtime and local reference parser."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
old=ROOT.parent/'aircraft-anm2'
text=(old/'releases/w07/AIRCRAFT_B24_ANM2_W07_PROGRESS.html').read_text(encoding='utf-8')
start=text.index('const THREE=(()=>{')
end=text.index('const FullGunRecipe=(()=>{')
# Drop the old recipe's leading comment as well; retain the complete OrbitControls IIFE.
body=text[start:end]
last=body.rfind('})();')+5
body=body[:last]+'\n'
assert 'FullGunRecipe' not in body and 'ReferenceView' not in body and 'normalizeTo' not in body
out=ROOT/'vendor';out.mkdir(exist_ok=True)
license='/* Third-party Three.js / OrbitControls. MIT License. Copyright (c) 2010-2024 three.js authors. See THIRD_PARTY_NOTICES.txt. */\n'
(out/'three-controls.runtime.js').write_text(license+body,encoding='utf-8')
reader=(old/'workbench/w07/reference-reader.js').read_text(encoding='utf-8')
(out/'reference-input.js').write_text(reader,encoding='utf-8')
notice='''Three.js and OrbitControls — MIT License

Copyright (c) 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Reference artwork: AN/M2 Browning .50 cal aircraft machine gun, Misja van Laatum (miezpiez66). The user's GLB metadata declares CC-BY-4.0. https://sketchfab.com/3d-models/anm2-browning-50-cal-aircraft-machine-gun-83d967f5d3ea4fe18603514741c781d5
The reference geometry is not included in this package. The new procedural reconstruction is a separate visual interpretation.
'''
(out/'THIRD_PARTY_NOTICES.txt').write_text(notice,encoding='utf-8')
receipt={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.iterdir() if p.is_file()}
(out/'VENDOR_LOCK.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(receipt)
