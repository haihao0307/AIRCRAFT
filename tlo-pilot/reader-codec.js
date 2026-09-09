// Independent browser/Node decoder for the public experimental profile in FORMAT.md.
const utf8=new TextDecoder('utf-8',{fatal:true});
export const CORE=['VOCB','FRAM','TIME','DNA_','OBJS','RELS','EVNT','PROV','RMAP'];
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function decodeCbor(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let p=0;
  const need=n=>{if(n<0||p+n>bytes.length)throw Error('CBOR 截断');};
  function length(ai){
    if(ai<24)return ai;const size={24:1,25:2,26:4,27:8}[ai];if(!size)throw Error('不支持不定长 CBOR');need(size);
    let n=size===1?v.getUint8(p):size===2?v.getUint16(p):size===4?v.getUint32(p):v.getBigUint64(p);p+=size;
    if(typeof n==='bigint'&&n<=BigInt(Number.MAX_SAFE_INTEGER))n=Number(n);return n;
  }
  function read(depth=0){
    if(depth>64)throw Error('CBOR 层数超限');need(1);const first=bytes[p++],major=first>>>5,ai=first&31;
    if(major===7){if(ai===20)return false;if(ai===21)return true;if(ai===22)return null;if(ai===27){need(8);const f=v.getFloat64(p);p+=8;if(!Number.isFinite(f))throw Error('非有限数');return f;}throw Error('不支持的 CBOR 简单值');}
    const n=length(ai);
    if(major===0)return n;
    if(major===1){const neg=-1n-BigInt(n);return neg>=BigInt(Number.MIN_SAFE_INTEGER)?Number(neg):neg;}
    if(typeof n==='bigint')throw Error('长度超出读取能力');
    if(major===2||major===3){need(n);const b=bytes.subarray(p,p+n);p+=n;return major===2?b:utf8.decode(b);}
    if(major===4){if(n>100000)throw Error('数组超限');return Array.from({length:n},()=>read(depth+1));}
    if(major===5){if(n>100000)throw Error('映射超限');const out=Object.create(null);for(let i=0;i<n;i++){const key=read(depth+1);if(typeof key!=='string'||Object.hasOwn(out,key))throw Error('映射键无效或重复');out[key]=read(depth+1);}return out;}
    throw Error('不支持的 CBOR 类型');
  }
  const result=read();if(p!==bytes.length)throw Error('CBOR 尾随字节');return result;
}
export function parseTlo(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<16)throw Error('文件头截断');
  if(utf8.decode(bytes.subarray(0,4))!=='WSD0'||v.getUint16(4,true)!==0||v.getUint16(6,true)!==1||v.getUint32(12,true)!==0)throw Error('不支持的 WSD 版本或标志');
  const count=v.getUint32(8,true);if(count>Math.floor((bytes.length-16)/12))throw Error('块数无效');const chunks=[];let p=16;
  for(let i=0;i<count;i++){
    if(p+12>bytes.length)throw Error('块头截断');const type=utf8.decode(bytes.subarray(p,p+4)),length=v.getUint32(p+4,true),crc=v.getUint32(p+8,true);if(!/^[\x20-\x7e]{4}$/.test(type))throw Error('块类型无效');p+=12;
    if(length>bytes.length-p)throw Error('块载荷截断');const payload=bytes.subarray(p,p+length);if(crc32(payload)!==crc)throw Error('CRC不一致：'+type);chunks.push({type,payload,offset:p,bytes:length,ordinal:i});p+=length;
  }
  if(p!==bytes.length)throw Error('文件尾随字节');if(chunks[0]?.type!=='PROF'||chunks.filter(c=>c.type==='PROF').length!==1)throw Error('缺少或重复 PROF');
  const profile=JSON.parse(utf8.decode(chunks[0].payload));
  if(profile.profile!=='tlo-mother01-pilot/0.1'||profile.semanticEncoding!=='cbor-m01-subset/1')throw Error('不支持的必需配置');
  if(!Array.isArray(profile.requiredChunks)||profile.requiredChunks.length!==CORE.length||new Set(profile.requiredChunks).size!==CORE.length||CORE.some(t=>!profile.requiredChunks.includes(t)))throw Error('未知或缺少必需块');
  const core=Object.create(null);
  for(const t of CORE){const found=chunks.filter(c=>c.type===t);if(found.length!==1)throw Error('缺少或重复 '+t);core[t]=decodeCbor(found[0].payload);}
  if(core.VOCB.id!=='tlo-m01-vocabulary/0.1')throw Error('不支持的必需词汇');
  const terms=['objectId','genericTemplate','worldTime','localFrame','valueStatus','typeOf','poseReferencedTo','managedBy','derivedFrom','normalizedService'];
  if(!Array.isArray(core.VOCB.requiredTerms)||core.VOCB.requiredTerms.length!==terms.length||new Set(core.VOCB.requiredTerms).size!==terms.length||terms.some(t=>!core.VOCB.requiredTerms.includes(t)))throw Error('未知或缺少必需词义');
  return {profile,core,chunks,bytes};
}
export const jsonText=(value,space=2)=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?{$integer:v.toString()}:v instanceof Uint8Array?{$bytesHex:Array.from(v,b=>b.toString(16).padStart(2,'0')).join('')}:v,space);
export async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function verifyTlo(parsed){
  const {core,chunks,bytes}=parsed,paths=new Set(),ids=new Set(),ordinals=new Set();
  for(const f of core.RMAP.files){
    if(typeof f.path!=='string'||f.path.includes('\\')||f.path.includes(':')||f.path.split('/').some(x=>!x||x==='..'||x==='.'))throw Error('不安全的文件路径');
    if(paths.has(f.path)||ids.has(f.resourceId)||ordinals.has(f.chunkOrdinal))throw Error('资源目录重复');paths.add(f.path);ids.add(f.resourceId);ordinals.add(f.chunkOrdinal);
    if(!Number.isSafeInteger(f.chunkOrdinal)||f.chunkOrdinal<0)throw Error('资源序号无效');const c=chunks[f.chunkOrdinal];
    if(!c||c.type!=='BLOB'||f.encoding!=='identity'||c.payload.length!==f.bytes||await sha256(c.payload)!==f.sha256)throw Error('文件校验失败：'+f.path);
  }
  if(chunks.filter(c=>c.type==='BLOB').length!==ordinals.size)throw Error('未登记的 BLOB');
  const objects=core.OBJS.objects,objIds=new Set(objects.map(o=>o.objectId)),frames=new Set(core.FRAM.frames.map(f=>f.id)),rels=new Set();
  if(objIds.size!==objects.length||objects.some(o=>!frames.has(o.frameId)))throw Error('对象身份或参考架缺失');
  for(const r of core.RELS.relations){if(rels.has(r.id)||!objIds.has(r.subject))throw Error('关系源或ID无效');rels.add(r.id);if(r.kind==='representationPartOf'&&!objIds.has(r.object)||r.kind==='poseReferencedTo'&&!frames.has(r.object))throw Error('关系依赖缺失');}
  return {passed:true,profile:parsed.profile.profile,sha256:await sha256(bytes),bytes:bytes.length,chunks:chunks.length,resourceFiles:core.RMAP.files.length,objects:objects.length,objectId:objects[0].objectId,name:objects[0].name,lengthUnit:core.FRAM.frames[0].units.length,worldTime:core.TIME.worldTime,worldLocation:core.FRAM.frames[0].worldLocation,sourceCommit:core.PROV.sourceCommit,unknownOptionalChunks:chunks.filter(c=>!['PROF','BLOB',...CORE].includes(c.type)).map(c=>c.type)};
}
