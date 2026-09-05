#!/usr/bin/env python3
"""Build an isolated offline surface study from a verified historical visual asset.
No GLB loader runs in the browser. Dense accessor bytes, node IDs and UVs are retained.
This is not an R019 recovery or production-baseline replacement.
"""
import argparse, base64, gzip, hashlib, json, pathlib, re, struct
HERE=pathlib.Path(__file__).resolve().parent
SOURCE_SHA='81ec8016743c6e9cb86b6221c1d665be1d061b42ae73e241c7ddc572ea3af6c4'
def sha(x):return hashlib.sha256(x).hexdigest()
def export_subset(path):
 source=path.read_bytes()
 if sha(source)!=SOURCE_SHA:raise ValueError('Historical source identity mismatch')
 magic,version,total=struct.unpack_from('<4sII',source)
 if magic!=b'glTF' or version!=2 or total!=len(source):raise ValueError('GLB header')
 off=12;chunks={}
 while off<len(source):
  length,kind=struct.unpack_from('<II',source,off);off+=8
  if off+length>len(source) or kind in chunks:raise ValueError('GLB chunk')
  chunks[kind]=source[off:off+length];off+=length
 d=json.loads(chunks[0x4e4f534a]);blob=chunks[0x004e4942]
 if d.get('extensionsRequired') or d.get('animations') or d.get('skins'):raise ValueError('Unsupported fixture')
 if d['nodes'][8].get('name')!='GUN_EXACT_SOURCE_MIRROR' or d['nodes'][8]['children']!=list(range(8)):raise ValueError('Source grouping changed')
 used=set()
 for n in d['nodes'][:8]:
  for p in d['meshes'][n['mesh']]['primitives']:
   if p.get('mode',4)!=4:raise ValueError('Triangle primitive required')
   used.update(p['attributes'].values());used.add(p['indices'])
 widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4};sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};attrs={};geometry=[];uvs=[]
 for i in sorted(used):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']]
  if 'sparse' in a or v.get('buffer',0)!=0 or v.get('extensions'):raise ValueError('Unsupported accessor')
  size=widths[a['type']]*sizes[a['componentType']];stride=v.get('byteStride',size);start=v.get('byteOffset',0)+a.get('byteOffset',0);end=start+(a['count']-1)*stride+size
  if end>v.get('byteOffset',0)+v['byteLength']:raise ValueError('Accessor bounds')
  raw=b''.join(blob[start+j*stride:start+j*stride+size] for j in range(a['count']))
  attrs[str(i)]={k:a[k] for k in ['componentType','type','count','normalized','min','max'] if k in a}
  attrs[str(i)].update(base64=base64.b64encode(raw).decode(),sha256=sha(raw),byteLength=len(raw),sourceAccessor=i);geometry.append([i,sha(raw)])
 meshes=[d['meshes'][i] for i in range(8)]
 for m in meshes:
  for p in m['primitives']:
   for name,idx in p['attributes'].items():
    if name.startswith('TEXCOORD_'):uvs.append([idx,attrs[str(idx)]['sha256']])
 def sig(x):return sha(json.dumps(x,sort_keys=True,separators=(',',':')).encode())
 nodes=d['nodes'][:9];lock={'revision':'V016 historical visual sample / S01 only','geometrySha256':sig(geometry),'uvSha256':sig(uvs),'nodeGraphSha256':sig(nodes)}
 receipt={'sourceSha256':SOURCE_SHA,'sourceBytes':len(source),'sourceRevision':'V016 historical recovery snapshot','sourceCommit':'4116bfc6213daff09e95788d72fad8ef90271621','sourceRoot':8,'selectedNodeIndices':list(range(9)),'accessorCount':len(attrs),'uvAccessorCount':len(uvs),'meshCount':8,'geometryUnchanged':True,'uvUnchanged':True,'R019Recovered':False,'productionReady':False,'visualAcceptance':False,'sourceLock':lock,'vertices':sum(attrs[str(p['attributes']['POSITION'])]['count'] for m in meshes for p in m['primitives']),'triangles':sum(attrs[str(p['indices'])]['count']//3 for m in meshes for p in m['primitives'])}
 data={'receipt':receipt,'accessors':attrs,'nodes':nodes,'root':8,'meshes':meshes,'materials':d['materials']}
 if path.read_bytes()!=source:raise ValueError('Source unexpectedly changed')
 return data
def strip_exports(js):
 m=re.search(r'export\s*\{([^}]+)\}\s*;?\s*$',js,re.S)
 if not m:raise ValueError('Expected final export list')
 pairs=[]
 for item in m.group(1).split(','):
  p=item.strip().split(' as ');pairs.append(p[-1]+':'+p[0])
 return js[:m.start()],','.join(pairs)
def build(source,vendor,output,session_path):
 for line in (vendor/'SHA256SUMS').read_text().splitlines():
  digest,name=line.split()
  if sha((vendor/name).read_bytes())!=digest:raise ValueError('Vendor hash mismatch: '+name)
 d=export_subset(source);js,exp=strip_exports((vendor/'three.module.js').read_text());three='const THREE=(()=>{\n'+js+'\nreturn {'+exp+'};})();'
 orbit=(vendor/'OrbitControls.js').read_text();orbit=re.sub(r"import\s*\{([^}]+)\}\s*from\s*'three';",r'const {\1}=THREE;',orbit);orbit,exp=strip_exports(orbit);orbit='const {OrbitControls}=(()=>{\n'+orbit+'\nreturn {'+exp+'};})();'
 session=session_path.read_text();session=re.sub(r'\bexport\s+(?=(?:const|function))','',session);session='const WMState=(()=>{\n'+session+'\nreturn {createSession,PARAMS,SCHEMA};})();'
 app=(HERE/'studio.mjs').read_text();app=re.sub(r'^import .*?;\s*$','',app,flags=re.M);code=(three+'\n'+orbit+'\n'+session+'\n'+app).replace('</script','<\\/script')
 packed=gzip.compress(json.dumps(d,separators=(',',':'),ensure_ascii=False).encode(),compresslevel=9,mtime=0)
 html=(HERE/'index.template.html').read_text().replace('__STYLE__',(HERE/'studio.css').read_text()).replace('__ASSET__',base64.b64encode(packed).decode()).replace('__RUNTIME__',code)
 output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html,encoding='utf-8')
 receipt={**d['receipt'],'htmlBytes':output.stat().st_size,'htmlSha256':sha(output.read_bytes()),'renderer':'Three.js r170','vendorHashes':{n:sha((vendor/n).read_bytes()) for n in ['three.module.js','OrbitControls.js','THREE_LICENSE.txt']},'buildInputHashes':{n:sha((HERE/n).read_bytes()) for n in ['build.py','studio.mjs','studio.css','index.template.html']}}
 output.with_suffix('.receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps(receipt,ensure_ascii=False,indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=pathlib.Path,required=True);p.add_argument('--vendor',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--session',type=pathlib.Path,required=True);a=p.parse_args();build(a.source,a.vendor,a.output,a.session)
