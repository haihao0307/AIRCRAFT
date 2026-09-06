/* Read-only, browser-local intake for the user's confirmed visual reference.
   No storage, upload, reference coordinates, or mesh payload in this source file. */
const ReferenceInput = (() => {
  const EXPECTED_SHA = '2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b';
  const EXPECTED_BYTES = 6548040;
  const TYPES = {5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
  const WIDTH = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
  const ensure = (ok, msg) => {if (!ok) throw new Error(msg);};
  // Pure arithmetic fallback for local/offline document contexts without SubtleCrypto.
  // These are public SHA-256 round constants, not asset coordinates.
  function cpuSHA256(source) {
    const input=source instanceof ArrayBuffer?new Uint8Array(source):new Uint8Array(source.buffer,source.byteOffset,source.byteLength);
    const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const size=Math.ceil((input.length+9)/64)*64,padded=new Uint8Array(size),d=new DataView(padded.buffer),w=new Uint32Array(64);
    padded.set(input);padded[input.length]=128;d.setUint32(size-8,Math.floor(input.length/0x20000000));d.setUint32(size-4,(input.length*8)>>>0);
    const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const R=(x,n)=>(x>>>n)|(x<<(32-n));
    for(let off=0;off<size;off+=64){
      for(let i=0;i<16;i++)w[i]=d.getUint32(off+4*i);
      for(let i=16;i<64;i++){const s0=R(w[i-15],7)^R(w[i-15],18)^(w[i-15]>>>3),s1=R(w[i-2],17)^R(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
      let [a,b,c,e0,e,f,g,h]=H;
      for(let i=0;i<64;i++){const s1=R(e,6)^R(e,11)^R(e,25),ch=(e&f)^(~e&g),t1=(h+s1+ch+K[i]+w[i])>>>0,s0=R(a,2)^R(a,13)^R(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)>>>0;h=g;g=f;f=e;e=(e0+t1)>>>0;e0=c;c=b;b=a;a=(t1+t2)>>>0;}
      const r=[a,b,c,e0,e,f,g,h];for(let i=0;i<8;i++)H[i]=(H[i]+r[i])>>>0;
    }
    return H.map(x=>x.toString(16).padStart(8,'0')).join('');
  }
  const sha = async bytes => {
    if(!globalThis.crypto?.subtle)return cpuSHA256(bytes);
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x=>x.toString(16).padStart(2,'0')).join('');
  };
  async function read(file) {
    ensure(file && file.size === EXPECTED_BYTES, '文件大小与已确认的 Aircraft 原件不一致。请选原始 GLB。');
    const buffer = await file.arrayBuffer();
    const identity = await sha(buffer);
    ensure(identity === EXPECTED_SHA, '文件身份不一致，未载入。其他弹药只用于材质参考，不在这里替换枪体。');
    const v = new DataView(buffer);
    ensure(v.getUint32(0,true)===0x46546c67 && v.getUint32(4,true)===2 && v.getUint32(8,true)===buffer.byteLength,'GLB 头不一致');
    let off=12, doc=null, bin=null, chunkCount=0;
    while(off < buffer.byteLength) {
      ensure(off+8<=buffer.byteLength,'GLB 分块头不完整');
      const n=v.getUint32(off,true), kind=v.getUint32(off+4,true);off+=8;
      ensure(n%4===0 && off+n<=buffer.byteLength,'GLB 分块越界');
      if(kind===0x4e4f534a){ensure(doc===null,'重复 JSON');doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,off,n)));}
      else if(kind===0x004e4942){ensure(bin===null,'重复 BIN');bin={offset:off,length:n};}
      else throw Error('未支持的分块');
      off+=n;chunkCount++;
    }
    ensure(doc && bin && chunkCount===2,'原件分块不完整');
    ensure(!doc.extensionsRequired?.length && !doc.animations?.length && !doc.skins?.length,'此校核器不执行未知扩展、骨骼或动画');
    ensure(doc.nodes.length===28 && doc.meshes.length===13 && doc.accessors.length===51,'原件库存与记录不一致');
    ensure(doc.buffers.length===1 && !doc.buffers[0].uri && doc.buffers[0].byteLength<=bin.length,'要求单一内嵌缓冲');
    ensure(!doc.images?.length && !doc.textures?.length,'本原件不应包含图片');
    const attributes = [], fingerprints=[];
    for(let index=0; index<doc.accessors.length; index++) {
      const a=doc.accessors[index], b=doc.bufferViews[a.bufferView];
      ensure(a && b && !a.sparse && TYPES[a.componentType] && WIDTH[a.type],'未支持的访问器');
      ensure((b.buffer||0)===0 && !b.extensions,'未支持的缓冲视图');
      const C=TYPES[a.componentType], width=WIDTH[a.type], size=C.BYTES_PER_ELEMENT*width;
      const stride=b.byteStride||size, relative=a.byteOffset||0, start=bin.offset+(b.byteOffset||0)+relative;
      ensure(a.count>0 && relative>=0 && stride>=size && stride%C.BYTES_PER_ELEMENT===0 && start%C.BYTES_PER_ELEMENT===0,'访问器对齐不合法');
      const end=relative+(a.count-1)*stride+size;
      ensure(end<=b.byteLength && (b.byteOffset||0)+end<=doc.buffers[0].byteLength,'访问器越界');
      const packed=new Uint8Array(a.count*size);
      for(let i=0;i<a.count;i++)packed.set(new Uint8Array(buffer,start+i*stride,size),i*size);
      const typed=new C(packed.buffer);
      ensure(Array.from(typed).every(Number.isFinite),'原件存在非法数值');
      attributes.push({index,array:typed,width,normalized:!!a.normalized,componentType:a.componentType,count:a.count});
      fingerprints.push({index,sha256:await sha(packed),bytes:packed.byteLength});
    }
    const parent=Array(doc.nodes.length).fill(null), nodeMatrices=[];
    for(let i=0;i<doc.nodes.length;i++) {
      const n=doc.nodes[i];
      ensure(!n.translation && !n.rotation && !n.scale,'此已确认原件采用矩阵；不静默更改表示');
      if(n.matrix)ensure(n.matrix.length===16&&n.matrix.every(Number.isFinite),'非法节点矩阵');
      nodeMatrices.push(n.matrix?.slice()||[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
      for(const c of n.children||[]) {ensure(c>=0&&c<doc.nodes.length&&parent[c]===null,'重复父节点');parent[c]=i;}
    }
    let vertices=0, triangles=0, uvMeshes=0;
    for(const mesh of doc.meshes) for(const p of mesh.primitives) {
      ensure((p.mode??4)===4 && !p.targets,'本校核器只处理原件三角表面');
      const pos=attributes[p.attributes.POSITION], ind=attributes[p.indices];
      ensure(pos && ind && ind.array.length%3===0,'三角索引不合法');
      for(const i of ind.array)ensure(i>=0&&i<pos.count,'三角索引越界');
      vertices+=pos.count;triangles+=ind.array.length/3;if(p.attributes.TEXCOORD_0!==undefined)uvMeshes++;
    }
    ensure(vertices===151832&&triangles===139891&&uvMeshes===12,'原件统计不一致');
    return {doc,attributes,fingerprints,parent,nodeMatrices,identity,counts:{nodes:28,meshObjects:13,vertices,triangles,uvMeshes,images:0,animations:0},fileName:file.name};
  }
  return Object.freeze({read,sha,cpuSHA256,EXPECTED_SHA,EXPECTED_BYTES});
})();
