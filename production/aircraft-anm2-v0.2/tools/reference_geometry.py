"""Temporary source geometry for exterior study. Never serialize vertices/UV/indices."""
from pathlib import Path
import hashlib
import json
import struct
import numpy as np

SOURCE = Path('G:/飞虎队十四航空队/各种机型/B-24_CBI/anm2_browning_.50_cal_aircraft_machine_gun.glb')
EXPECTED = '2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b'
CORE = (9, 15, 17, 19, 21, 23, 25, 27)


def read_source():
    data = SOURCE.read_bytes()
    assert len(data) == 6548040 and hashlib.sha256(data).hexdigest() == EXPECTED
    n, = struct.unpack_from('<I', data, 12)
    doc = json.loads(data[20:20+n])
    bin_start = 28+n
    dtype = {5121:'u1', 5123:'<u2', 5125:'<u4', 5126:'<f4'}
    width = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}
    def accessor(i):
        a = doc['accessors'][i]
        b = doc['bufferViews'][a['bufferView']]
        dt = np.dtype(dtype[a['componentType']])
        w = width[a['type']]
        return np.ndarray((a['count'],w), dtype=dt, buffer=data,
                          offset=bin_start+b.get('byteOffset',0)+a.get('byteOffset',0),
                          strides=(b.get('byteStride',w*dt.itemsize),dt.itemsize)).copy()
    result = {}
    def walk(i,parent):
        node = doc['nodes'][i]
        assert not any(k in node for k in ('translation','rotation','scale'))
        local = np.array(node.get('matrix',np.eye(4).flatten(order='F'))).reshape(4,4,order='F')
        world = parent @ local
        if 'mesh' in node:
            ps = doc['meshes'][node['mesh']]['primitives']
            assert len(ps)==1
            p = ps[0]
            v = accessor(p['attributes']['POSITION']).astype(float)
            v = v @ world[:3,:3].T + world[:3,3]
            faces = accessor(p['indices']).reshape(-1,3)
            result[i] = (v,faces)
        for child in node.get('children',[]):
            walk(child,world)
    for i in doc['scenes'][doc.get('scene',0)]['nodes']:
        walk(i,np.eye(4))
    return doc,result


def split_components(v, faces):
    _, inverse = np.unique(np.round(v,7),axis=0,return_inverse=True)
    parent = list(range(int(inverse.max())+1))
    def find(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]]
            i=parent[i]
        return i
    for tri in inverse[faces]:
        a,b,c=map(find,tri)
        parent[b]=a
        parent[c]=a
    labels=np.array([find(i) for i in inverse[faces[:,0]]])
    result=[]
    for label in np.unique(labels):
        f=faces[labels==label]
        ids=np.unique(f)
        pts=v[ids]
        area=float(np.linalg.norm(np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]),axis=1).sum()/2)
        result.append(dict(faces=f,vertices=pts,area=area,bounds=np.array([pts.min(axis=0),pts.max(axis=0)])))
    return sorted(result,key=lambda m:m['area'],reverse=True)


if __name__=='__main__':
    doc,source=read_source()
    for node in CORE:
        v,f=source[node]
        pieces=split_components(v,f)
        print('NODE',node,doc['nodes'][node]['name'],'pieces',len(pieces))
        for i,m in enumerate(pieces[:120]):
            print(i,'faces',len(m['faces']),'area',round(m['area'],6),'lo',np.round(m['bounds'][0],6).tolist(),'hi',np.round(m['bounds'][1],6).tolist())
