/* Local-only reader for the inspected artist reference. No persistence or uploads. */
const Cal50Reference=(()=>{
  const EXPECTED='f109fb80201d3c2339394c41155a4ca5e8f912f732c7d5d83832087356d81026';
  async function create(T,file,material){
    if(file.size!==777908)throw Error('单弹参考文件大小不符');
    const buffer=await file.arrayBuffer(),hash=await ReferenceInput.sha(new Uint8Array(buffer));if(hash!==EXPECTED)throw Error('单弹参考文件身份不符');
    const dv=new DataView(buffer);if(dv.getUint32(0,true)!==0x46546c67||dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==buffer.byteLength)throw Error('GLB 头无效');
    let doc,bin;for(let o=12;o<buffer.byteLength;){const n=dv.getUint32(o,true),type=dv.getUint32(o+4,true);o+=8;if(o+n>buffer.byteLength)throw Error('GLB 块越界');if(type===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,o,n)));if(type===0x004e4942)bin=o;o+=n;}
    if(doc.nodes.length!==5||doc.meshes.length!==3||doc.images?.length||doc.animations?.length||doc.skins?.length)throw Error('单弹参考库存不符');
    const rawNodes=JSON.stringify(doc.nodes),types={5126:Float32Array,5125:Uint32Array,5123:Uint16Array},widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
    function accessor(i){const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],C=types[a.componentType],w=widths[a.type],size=C.BYTES_PER_ELEMENT*w,stride=v.byteStride||size,packed=new Uint8Array(a.count*size);for(let j=0;j<a.count;j++)packed.set(new Uint8Array(buffer,bin+(v.byteOffset||0)+(a.byteOffset||0)+j*stride,size),j*size);return new T.BufferAttribute(new C(packed.buffer),w,!!a.normalized);}
    const nodes=doc.nodes.map(n=>{const g=new T.Group();g.name=n.name;if(n.matrix){g.matrix.fromArray(n.matrix);g.matrixAutoUpdate=false;}return g;}),meshes=[];
    doc.nodes.forEach((n,i)=>{if(n.mesh!==undefined)for(const p of doc.meshes[n.mesh].primitives){const g=new T.BufferGeometry();g.setAttribute('position',accessor(p.attributes.POSITION));g.setAttribute('normal',accessor(p.attributes.NORMAL));g.setIndex(accessor(p.indices));const m=new T.Mesh(g,material);m.userData.sourceNode=i;nodes[i].add(m);meshes.push(m);}for(const c of n.children||[])nodes[i].add(nodes[c]);});
    const root=new T.Group(),registration=new T.Group();root.add(registration);
    const r=CartridgeProgram.description.sourceRegistration,s=r.uniformScale,[x,y,z]=r.origin,p=[-.1709,.066,.0601];
    // Proper cyclic rotation followed by one uniform scale and named reference offset.
    registration.matrix.set(0,s,0,p[0]-s*y,0,0,s,p[1]-s*z,s,0,0,p[2]-s*x,0,0,0,1);registration.matrixAutoUpdate=false;
    for(const i of doc.scenes[doc.scene||0].nodes)registration.add(nodes[i]);root.updateMatrixWorld(true);
    function audit(){return {identity:hash,kind:'cal50',counts:{nodes:5,meshObjects:3,animations:0},sourceHierarchyUnchanged:JSON.stringify(doc.nodes)===rawNodes,sourceMatricesUnchanged:nodes.every((n,i)=>!doc.nodes[i].matrix||n.matrix.toArray().every((v,j)=>v===doc.nodes[i].matrix[j])),registration:{...r,scope:'artist reference at first display-instance position, not physical dimensions'},referenceBytesPersisted:false};}
    return {root,meshes,kind:'cal50',audit,dispose(){root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});root.clear();}};
  }
  return {create,EXPECTED};
})();
