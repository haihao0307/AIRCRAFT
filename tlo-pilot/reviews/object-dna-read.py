"""Independent read-only WSD0/M01 reader, Python stdlib, Object DNA review."""
import struct, zlib, hashlib, json, math
from pathlib import Path

def cbor(data):
    pos=0
    def take(n):
        nonlocal pos
        if pos+n>len(data): raise ValueError('truncated')
        v=data[pos:pos+n];pos+=n;return v
    def item(depth=0):
        if depth>64: raise ValueError('depth')
        h=take(1)[0];m,a=h>>5,h&31
        if m==7:
            if a in (20,21,22):return {20:False,21:True,22:None}[a]
            if a==27:
                v=struct.unpack('>d',take(8))[0]
                if not math.isfinite(v):raise ValueError('nonfinite')
                return v
            raise ValueError('simple type')
        if a<24:n=a
        elif a in (24,25,26,27):
            n=int.from_bytes(take(1<<(a-24)),'big')
            if n<[24,256,65536,4294967296][a-24]:raise ValueError('nonminimal')
        else:raise ValueError('indefinite')
        if m==0:return n
        if m==1:return -1-n
        if m==2:return take(n)
        if m==3:return take(n).decode('utf8')
        if m in (4,5) and n>100000:raise ValueError('count')
        if m==4:return [item(depth+1) for _ in range(n)]
        if m==5:
            out={};previous=None
            for _ in range(n):
                start=pos;k=item(depth+1);encoded=data[start:pos];order=(len(encoded),encoded)
                if not isinstance(k,str) or k in out or (previous is not None and order<=previous):raise ValueError('map')
                previous=order;out[k]=item(depth+1)
            return out
        raise ValueError('major type')
    result=item()
    if pos!=len(data):raise ValueError('trailing CBOR')
    return result

def read(path):
    data=Path(path).read_bytes();magic,major,minor,count,flags=struct.unpack_from('<4sHHII',data)
    assert (magic,major,minor,flags)==(b'WSD0',0,1,0)
    chunks=[];pos=16
    for _ in range(count):
        tag,n,crc=struct.unpack_from('<4sII',data,pos);pos+=12
        assert all(32<=x<=126 for x in tag)
        payload=data[pos:pos+n];pos+=n
        assert len(payload)==n and zlib.crc32(payload)==crc
        chunks.append((tag.decode('ascii'),payload))
    assert pos==len(data) and chunks[0][0]=='PROF'
    assert sum(t=='PROF' for t,p in chunks)==1
    prof=json.loads(chunks[0][1]);assert prof['profile']=='tlo-mother01-pilot/0.1' and prof['semanticEncoding']=='cbor-m01-subset/1'
    core={}
    for tag in ['VOCB','FRAM','TIME','DNA_','OBJS','RELS','EVNT','PROV','RMAP']:
        matches=[p for t,p in chunks if t==tag];assert len(matches)==1;core[tag]=cbor(matches[0])
    paths=set();ids=set();ordinals=set()
    for f in core['RMAP']['files']:
        p=f['path'];i=f['chunkOrdinal']
        assert p and ':' not in p and '\\' not in p and all(s not in ('','.','..') for s in p.split('/'))
        assert p not in paths and f['resourceId'] not in ids and i not in ordinals
        assert type(i)==int and 0<=i<len(chunks) and chunks[i][0]=='BLOB' and f['encoding']=='identity'
        payload=chunks[i][1];assert len(payload)==f['bytes'] and hashlib.sha256(payload).hexdigest()==f['sha256']
        paths.add(p);ids.add(f['resourceId']);ordinals.add(i)
    assert ordinals=={i for i,(t,p) in enumerate(chunks) if t=='BLOB'}
    rebuilt=struct.pack('<4sHHII',magic,major,minor,count,flags)+b''.join(struct.pack('<4sII',t.encode(),len(p),zlib.crc32(p))+p for t,p in chunks)
    assert rebuilt==data
    return {'reader':'object-dna-read/0.1','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'chunks':count,'filesVerified':len(paths),'byteExactRoundtrip':True,'unknownOptional':[t for t,p in chunks if t not in {'PROF','BLOB',*core}], 'profile':prof,'core':{k:v for k,v in core.items() if k!='RMAP'}}

if __name__=='__main__':
    result=read(Path(__file__).resolve().parents[1]/'data/B24_Generic_Mother_01.tlo')
    print(json.dumps(result,ensure_ascii=False,indent=2))
