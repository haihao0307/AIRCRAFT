/* Temporary read-only reference renderer. It keeps original local node matrices and
   applies one outer display normalization. No source geometry is stored in the product code. */
const ReferenceView=(()=>{
  const CORE=new Set([9,15,17,19,21,23,25,27]);
  function create(T,parsed,material){
    const wrapper=new T.Group();wrapper.name='REFERENCE_WRAPPER';
    const sourceRoot=new T.Group();sourceRoot.name='REFERENCE_SOURCE_ROOT';wrapper.add(sourceRoot);
    const nodes=parsed.doc.nodes.map((n,i)=>{const g=new T.Group();g.name=n.name||`source-${i}`;g.matrix.fromArray(parsed.nodeMatrices[i]);g.matrixAutoUpdate=false;g.userData.sourceIndex=i;return g;});
    const meshes=[];
    for(let i=0;i<nodes.length;i++){
      const n=parsed.doc.nodes[i];
      if(n.mesh!==undefined)for(const primitive of parsed.doc.meshes[n.mesh].primitives){
        const geo=new T.BufferGeometry();
        for(const [semantic,index] of Object.entries(primitive.attributes)){
          const map={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'};if(!map[semantic])throw Error('原件包含未支持属性 '+semantic);
          const a=parsed.attributes[index];geo.setAttribute(map[semantic],new T.BufferAttribute(a.array,a.width,a.normalized));
        }
        const ia=parsed.attributes[primitive.indices];geo.setIndex(new T.BufferAttribute(ia.array,1,ia.normalized));geo.computeBoundingBox();geo.computeBoundingSphere();
        const m=new T.Mesh(geo,material);m.userData.sourceIndex=i;m.castShadow=true;m.receiveShadow=true;nodes[i].add(m);meshes.push(m);
      }
      for(const child of n.children||[])nodes[i].add(nodes[child]);
    }
    for(const i of parsed.doc.scenes[parsed.doc.scene||0].nodes)sourceRoot.add(nodes[i]);
    for(const m of meshes)m.visible=CORE.has(m.userData.sourceIndex);
    sourceRoot.updateMatrixWorld(true);
    function box(){const b=new T.Box3();for(const m of meshes)if(CORE.has(m.userData.sourceIndex))b.union(new T.Box3().setFromObject(m));return b;}
    function normalizeTo(targetBox){
      const rb=box(),rs=rb.getSize(new T.Vector3()),rc=rb.getCenter(new T.Vector3()),ts=targetBox.getSize(new T.Vector3()),tc=targetBox.getCenter(new T.Vector3());
      const scale=ts.x/rs.x;wrapper.scale.setScalar(scale);wrapper.position.copy(tc).sub(rc.multiplyScalar(scale));wrapper.updateMatrixWorld(true);
      return {source:[rs.x,rs.y,rs.z],native:[ts.x,ts.y,ts.z],scale,sourceAspect:[1,rs.y/rs.x,rs.z/rs.x],nativeAspect:[1,ts.y/ts.x,ts.z/ts.x]};
    }
    function audit(){return {sourceNodes:nodes.length,sourceMeshes:meshes.length,visibleCore:meshes.filter(m=>m.visible).length,matricesUnchanged:nodes.every((n,i)=>n.matrix.toArray().every((x,j)=>x===parsed.nodeMatrices[i][j])),parentRelationsUnchanged:nodes.every((n,i)=>parsed.parent[i]===null?n.parent===sourceRoot:n.parent===nodes[parsed.parent[i]])};}
    function dispose(){for(const m of meshes)m.geometry.dispose();sourceRoot.clear();wrapper.clear();}
    return {wrapper,sourceRoot,nodes,meshes,normalizeTo,box,audit,dispose};
  }
  return Object.freeze({create,core:[...CORE]});
})();
