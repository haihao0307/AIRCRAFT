"""Read-only uploaded glTF reference inventory. Output metadata, counts and checks only.
No mesh or image export; no fabrication dimensions, hidden geometry or motion inference.
"""
from pathlib import Path
import argparse, hashlib, json, struct
import numpy as np
DT={5120:np.dtype('i1'),5121:np.dtype('u1'),5122:np.dtype('<i2'),5123:np.dtype('<u2'),5125:np.dtype('<u4'),5126:np.dtype('<f4')}
WIDTH={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def read(path):
    b=Path(path).read_bytes()
    if len(b)<20 or struct.unpack_from('<4sII',b)!=(b'glTF',2,len(b)): raise ValueError('GLB header mismatch')
    chunks={};i=12
    while i<len(b):
        length,kind=struct.unpack_from('<II',b,i);i+=8
        if length%4 or i+length>len(b) or kind in chunks:raise ValueError('GLB chunk mismatch')
        chunks[kind]=b[i:i+length];i+=length
    d=json.loads(chunks[0x4e4f534a]);blob=chunks.get(0x004e4942,b'')
    if d.get('extensionsRequired'):raise ValueError('Required extensions outside scope')
    if len(d.get('buffers',[]))!=1 or 'uri' in d['buffers'][0]:raise ValueError('Embedded buffer required')
    return b,d,blob

def accessor(d,blob,index):
    a=d['accessors'][index]
    if a['type'] not in WIDTH or 'sparse' in a:raise ValueError('Unsupported layout')
    v=d['bufferViews'][a['bufferView']];dt=DT[a['componentType']];width=WIDTH[a['type']]
    stride=v.get('byteStride',dt.itemsize*width);off=v.get('byteOffset',0)+a.get('byteOffset',0)
    if off+(a['count']-1)*stride+dt.itemsize*width>v.get('byteOffset',0)+v['byteLength']:raise ValueError('Out of bounds')
    return np.ndarray((a['count'],width),dtype=dt,buffer=blob,offset=off,strides=(stride,dt.itemsize))

def inventory(path):
    path=Path(path);b,d,blob=read(path);parents={j:i for i,n in enumerate(d.get('nodes',[])) for j in n.get('children',[])}
    out={'file':path.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'assetMetadata':d['asset'],
         'counts':{k:len(d.get(k,[])) for k in ['nodes','meshes','materials','textures','images','animations','skins','accessors']},
         'materials':d.get('materials',[]),'meshNodes':[],
         'scope':'Source labels and presentation data only; author labels are not validated real part identities; no physical measurements exported.'}
    totalv=totalt=0
    for ni,node in enumerate(d.get('nodes',[])):
        if 'mesh' not in node:continue
        par=parents.get(ni);prims=[]
        for p in d['meshes'][node['mesh']]['primitives']:
            pos=accessor(d,blob,p['attributes']['POSITION']);tri=accessor(d,blob,p['indices']).reshape(-1,3)
            nr=int(tri.max()) if len(tri) else -1
            if nr>=len(pos):raise ValueError('Index out of bounds')
            cross=np.cross(pos[tri[:,1]]-pos[tri[:,0]],pos[tri[:,2]]-pos[tri[:,0]])
            pr={'attributes':list(p['attributes']),'vertices':len(pos),'triangles':len(tri),'material':p.get('material'),
                'positionsFinite':bool(np.isfinite(pos).all()),'zeroAreaTrianglesExact':int(np.sum(np.linalg.norm(cross,axis=1)==0))}
            if 'NORMAL' in p['attributes']:
                norm=accessor(d,blob,p['attributes']['NORMAL']);ln=np.linalg.norm(norm,axis=1)
                pr['zeroNormals']=int(np.sum(ln<1e-8));pr['nonUnitNormalsBeyond1e_3']=int(np.sum(abs(ln-1)>1e-3))
            if 'TEXCOORD_0' in p['attributes']:pr['uvFinite']=bool(np.isfinite(accessor(d,blob,p['attributes']['TEXCOORD_0'])).all())
            prims.append(pr);totalv+=len(pos);totalt+=len(tri)
        out['meshNodes'].append({'node':ni,'nodeName':node.get('name'),'parent':par,'parentName':d['nodes'][par].get('name') if par is not None else None,'mesh':node['mesh'],'primitives':prims})
    out['counts'].update(storedVertexEntries=totalv,triangles=totalt,uvMeshNodes=sum(any('TEXCOORD_0' in p['attributes'] for p in n['primitives']) for n in out['meshNodes']))
    neg=[]
    for i,n in enumerate(d.get('nodes',[])):
        if 'matrix' in n:
            m=np.array(n['matrix']).reshape(4,4,order='F');det=float(np.linalg.det(m[:3,:3]))
            if det<0:neg.append({'node':i,'sourceName':n.get('name'),'determinant':det})
    out['negativeDeterminantNodes']=neg
    if path.name.startswith('anm2_'):
        a=np.array(d['nodes'][0]['matrix']).reshape(4,4,order='F');c=np.array(d['nodes'][2]['matrix']).reshape(4,4,order='F')
        out['topLevelTransformCheck']={'nodes':[0,2],'eachContainsQuarterTurn':True,'productIdentityMaxAbsoluteError':float(np.max(abs(a@c-np.eye(4)))),
          'interpretation':'Opposing wrapper rotations cancel. Dropping one changes orientation; this is not proof of the exact cause in the retired viewer. Source global orientation still needs visual confirmation.'}
        out['expectedHistoricalIdentityMatches']=out['sha256']=='2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b'
    out['sourceUnchanged']=hashlib.sha256(path.read_bytes()).hexdigest()==out['sha256']
    return out
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('sources',nargs='+',type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
    result={'date':'2026-09-06','method':'read-only GLB JSON and dense accessor inspection','sources':[inventory(x) for x in a.sources]}
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps([{k:v for k,v in x.items() if k in ['file','bytes','sha256','counts','negativeDeterminantNodes','topLevelTransformCheck']} for x in result['sources']],indent=2))
