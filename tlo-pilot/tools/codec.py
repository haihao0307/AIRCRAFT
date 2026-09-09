"""Experimental WSD0 + TLO-M01 profile. No resource code is executed on read."""
import json, math, struct, zlib

def cbor_encode(value):
    def head(major, n):
        if n < 24: return bytes([(major << 5) | n])
        for limit, ai, fmt in [(256,24,'B'),(65536,25,'H'),(2**32,26,'I'),(2**64,27,'Q')]:
            if n < limit: return bytes([(major << 5)|ai]) + struct.pack('>'+fmt,n)
        raise ValueError('integer outside profile range')
    if value is None: return b'\xf6'
    if value is False: return b'\xf4'
    if value is True: return b'\xf5'
    if isinstance(value,int): return head(0,value) if value>=0 else head(1,-1-value)
    if isinstance(value,float):
        if not math.isfinite(value): raise ValueError('non-finite float')
        return b'\xfb'+struct.pack('>d',value)
    if isinstance(value,bytes): return head(2,len(value))+value
    if isinstance(value,str):
        b=value.encode('utf8');return head(3,len(b))+b
    if isinstance(value,list): return head(4,len(value))+b''.join(cbor_encode(v) for v in value)
    if isinstance(value,dict):
        if not all(isinstance(k,str) for k in value):raise ValueError('only text map keys')
        pairs=sorted(((cbor_encode(k),cbor_encode(v)) for k,v in value.items()),key=lambda p:(len(p[0]),p[0]))
        return head(5,len(pairs))+b''.join(k+v for k,v in pairs)
    raise TypeError(type(value))

def cbor_decode(data):
    pos=0
    def take(n):
        nonlocal pos
        if n<0 or pos+n>len(data):raise ValueError('truncated CBOR')
        b=data[pos:pos+n];pos+=n;return b
    def read(depth=0):
        if depth>64:raise ValueError('CBOR nesting limit')
        initial=take(1)[0];major,ai=initial>>5,initial&31
        if major==7:
            if ai==20:return False
            if ai==21:return True
            if ai==22:return None
            if ai==27:
                v=struct.unpack('>d',take(8))[0]
                if not math.isfinite(v):raise ValueError('non-finite CBOR')
                return v
            raise ValueError('unsupported simple/float type')
        if ai<24:n=ai
        elif ai in [24,25,26,27]:n=struct.unpack('>'+{24:'B',25:'H',26:'I',27:'Q'}[ai],take({24:1,25:2,26:4,27:8}[ai]))[0]
        else:raise ValueError('indefinite CBOR not supported')
        if major==0:return n
        if major==1:return -1-n
        if major==2:return take(n)
        if major==3:return take(n).decode('utf8',errors='strict')
        if major==4:
            if n>100000:raise ValueError('CBOR array size limit')
            return [read(depth+1) for _ in range(n)]
        if major==5:
            if n>100000:raise ValueError('CBOR map size limit')
            result={}
            for _ in range(n):
                k=read(depth+1)
                if not isinstance(k,str) or k in result:raise ValueError('invalid/duplicate CBOR map key')
                result[k]=read(depth+1)
            return result
        raise ValueError('unsupported CBOR major type')
    result=read()
    if pos!=len(data):raise ValueError('CBOR trailing bytes')
    return result

def encode_wsd(chunks):
    out=bytearray(struct.pack('<4sHHII',b'WSD0',0,1,len(chunks),0))
    for typ,data in chunks:
        assert len(typ)==4 and typ.isascii()
        out+=struct.pack('<4sII',typ.encode('ascii'),len(data),zlib.crc32(data)&0xffffffff)+data
    return bytes(out)

def parse_wsd(data):
    if len(data)<16:raise ValueError('truncated WSD header')
    magic,major,minor,count,flags=struct.unpack_from('<4sHHII',data)
    if (magic,major,minor,flags)!=(b'WSD0',0,1,0):raise ValueError('unsupported WSD header/version/flags')
    if count>(len(data)-16)//12:raise ValueError('invalid chunk count')
    chunks=[];pos=16
    for i in range(count):
        if pos+12>len(data):raise ValueError('truncated chunk header')
        typ,n,crc=struct.unpack_from('<4sII',data,pos);start=pos+12;end=start+n
        if end>len(data):raise ValueError('truncated chunk payload')
        payload=data[start:end]
        if zlib.crc32(payload)&0xffffffff!=crc:raise ValueError('CRC mismatch')
        name=typ.decode('ascii',errors='strict')
        if not all(32<=ord(c)<127 for c in name):raise ValueError('invalid FourCC')
        chunks.append({'type':name,'payload':payload,'offset':start,'bytes':n,'ordinal':i});pos=end
    if pos!=len(data):raise ValueError('trailing bytes')
    return chunks

CORE=['VOCB','FRAM','TIME','DNA_','OBJS','RELS','EVNT','PROV','RMAP']
PROFILE='tlo-mother01-pilot/0.1'
TERMS=['objectId','genericTemplate','worldTime','localFrame','valueStatus','typeOf','poseReferencedTo','managedBy','derivedFrom','normalizedService']
def decode_profile(data):
    chunks=parse_wsd(data)
    if not chunks or chunks[0]['type']!='PROF':raise ValueError('missing bootstrap PROF')
    profile=json.loads(chunks[0]['payload'].decode('utf8'))
    if profile.get('profile')!=PROFILE or profile.get('semanticEncoding')!='cbor-m01-subset/1':raise ValueError('unsupported required profile')
    required=profile.get('requiredChunks')
    if not isinstance(required,list) or len(required)!=len(CORE) or set(required)!=set(CORE):raise ValueError('unsupported required chunks')
    decoded={}
    for typ in CORE:
        matches=[c for c in chunks if c['type']==typ]
        if len(matches)!=1:raise ValueError('missing/duplicate '+typ)
        decoded[typ]=cbor_decode(matches[0]['payload'])
    if sum(c['type']=='PROF' for c in chunks)!=1:raise ValueError('duplicate PROF')
    if decoded['VOCB'].get('id')!='tlo-m01-vocabulary/0.1':raise ValueError('unsupported required vocabulary')
    terms=decoded['VOCB'].get('requiredTerms')
    if not isinstance(terms,list) or len(terms)!=len(TERMS) or set(terms)!=set(TERMS):raise ValueError('unsupported required terms')
    return profile,decoded,chunks
