#!/usr/bin/env python3
"""Repack the exact accepted gzip bytes into hash-named transport fragments."""
from pathlib import Path
import gzip,hashlib,json
ROOT=Path(__file__).resolve().parents[1];RT=ROOT/'runtime';CHUNK=512*1024
layout={'revision':'20260905-loader-r1','chunkBytes':CHUNK,'payloadSha256':'7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2','datasets':[]}
for key in ('json','bin'):
    data=(RT/f'assets/native.{key}.gz').read_bytes();raw=gzip.decompress(data)
    if key=='bin':
        assert len(raw)==16647376 and hashlib.sha256(raw).hexdigest()==layout['payloadSha256']
    else:
        m=json.loads(raw);assert len(m['components'])==1784 and len(m['meshes'])==348
    d={'id':key,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'decodedBytes':len(raw),'decodedSha256':hashlib.sha256(raw).hexdigest(),'parts':[]}
    for i,offset in enumerate(range(0,len(data),CHUNK)):
        part=data[offset:offset+CHUNK];h=hashlib.sha256(part).hexdigest();name=f'assets/parts/{key}-{i:03d}-{h[:16]}.part'
        path=RT/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(part)
        d['parts'].append({'url':'./'+name,'bytes':len(part),'sha256':h})
    layout['datasets'].append(d)
text='// Generated from locked source bytes by tools/pack_startup.py. Do not hand-edit.\nexport const LAYOUT = '+json.dumps(layout,indent=2)+';\n'
(RT/'asset-layout.js').write_text(text)
print(json.dumps({'parts':sum(len(d['parts']) for d in layout['datasets']),'compressedBytes':sum(d['bytes'] for d in layout['datasets']),'payload':layout['payloadSha256']}))
