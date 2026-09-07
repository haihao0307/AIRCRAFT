"""One-time V3 source refinement; unrelated files and source GLB are excluded."""
from pathlib import Path
import hashlib
p = Path(__file__).with_name('app.mjs')
s = p.read_text()
if 'qa.rawInspector=true' in s:
    print('V3 channel refinement already present')
    raise SystemExit(0)
blob = hashlib.sha1(b'blob ' + str(len(p.read_bytes())).encode() + b'\0' + p.read_bytes()).hexdigest()
if blob != '46767ae1e0a1b91df0f3265ebe9f6b8f4181590c':
    raise RuntimeError('Source changed; review refinement against the new source before applying')
s = s.replace('Math.exp(-((u-.83)/.17)**2-((v-.41)/.3)**2)', 'Math.exp(-(((u-.83)/.17)**2)-(((v-.41)/.3)**2))')
s = s.replace('rough:0.67,fade:0.35,wear:0.30,relief:0.65,exposure:1.1', 'rough:0.67,fade:0.35,wear:0.30,relief:0.65,exposure:0.85')
s = s.replace('neutral:[[1,4,6],3.2,1.1,.4,.65]', 'neutral:[[1,4,6],2.2,.65,.4,.55]')
s = s.replace('studio:[[-3,4,5],4.2,.65,2.6,.70]', 'studio:[[-3,4,5],3.1,.55,2.0,.60]')
s = s.replace('const mix=(a,b,t)=>a+(b-a)*t;', '''const mix=(a,b,t)=>a+(b-a)*t;
// The same normalized coverage field feeds base color, roughness and metalness.
function chipAt(u,v){const edge=Math.min(u,1-u,v,1-v);return edge<.014*state.wear*(.3+.7*hash(Math.floor(u*40),Math.floor(v*26)))&&hash(Math.floor(u*512),Math.floor(v*360))>.48;}
''')
s = s.replace('edge<.018*state.wear&&hash(x>>1,y>>1)>.52', 'chipAt(u,v)')
s = s.replace('edge<.018*state.wear&&hash(x*3,y*3)>.52', 'chipAt(u,v)')
s = s.replace('maps={base:texture(base,true),roughness', 'maps={base:texture(base,true),rawBase:texture(base),roughness')
s = s.replace('flatMaterial.map=maps[value];flatMaterial.color.set(0xffffff);flatMaterial.toneMapped=false;flatMaterial.needsUpdate=true;front.material=flatMaterial;', "flatMaterial.uniforms.rawMap.value=value==='base'?maps.rawBase:maps[value];front.material=flatMaterial;")
s = s.replace('flatMaterial=new THREE.MeshBasicMaterial({toneMapped:false});', "flatMaterial=new THREE.ShaderMaterial({uniforms:{rawMap:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D rawMap;varying vec2 vUv;void main(){gl_FragColor=texture2D(rawMap,vUv);}',toneMapped:false});")
s = s.replace('function bind(){', """function bind(){
 for(const id of ['rough','fade','wear','relief','exposure','opacity']){$(id).value=state[id];$(id+'Value').textContent=state[id].toFixed(2);}
""")
s = s.replace('qa.mapRevision=(qa.mapRevision||0)+1;', "qa.mapRevision=(qa.mapRevision||0)+1;qa.normalConvention='OpenGL +Y; input rows explicitly reversed';qa.rawInspector=true;qa.sharedChipField=true;")
a=s.index(' const art=canvas(W,actualH)')
b=s.index(' const mask=canvas(W,actualH)', a)
s=s[:a]+s[b:]
p.write_text(s)
print('Refined only app.mjs:', hashlib.sha256(p.read_bytes()).hexdigest())
