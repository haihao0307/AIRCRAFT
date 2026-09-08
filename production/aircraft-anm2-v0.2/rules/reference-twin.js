const ReferenceTwin=(()=>{
  function create(T,parsed,material,datum){
    const wrapper=new T.Group();wrapper.name='READ_ONLY_REFERENCE_TWIN';
    const sourceRoot=new T.Group();sourceRoot.name='UNCHANGED_SOURCE_SCENE';wrapper.add(sourceRoot);
    const nodes=parsed.doc.nodes.map((n,i)=>{const g=new T.Group();g.name=n.name;g.matrix.fromArray(parsed.nodeMatrices[i]);g.matrixAutoUpdate=false;g.userData.sourceIndex=i;return g;});
    const meshes=[];
    parsed.doc.nodes.forEach((n,i)=>{
      if(n.mesh!==undefined)for(const p of parsed.doc.meshes[n.mesh].primitives){
        const geo=new T.BufferGeometry();
        for(const [semantic,name] of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const a=parsed.attributes[p.attributes[semantic]];if(a)geo.setAttribute(name,new T.BufferAttribute(a.array,a.width,a.normalized));}
        geo.setIndex(new T.BufferAttribute(parsed.attributes[p.indices].array,1));
        const mesh=new T.Mesh(geo,material);mesh.userData.sourceNode=i;mesh.name='reference-'+n.name;nodes[i].add(mesh);meshes.push(mesh);
      }
      for(const child of n.children||[])nodes[i].add(nodes[child]);
    });
    for(const i of parsed.doc.scenes[parsed.doc.scene||0].nodes)sourceRoot.add(nodes[i]);
    const {origin,uniformScale}=datum.sourceToReview;
    wrapper.scale.setScalar(uniformScale);wrapper.position.set(...origin.map(x=>-x*uniformScale));wrapper.updateMatrixWorld(true);
    const audit=()=>({identity:parsed.identity,counts:parsed.counts,sourceMatricesUnchanged:nodes.every((n,i)=>n.matrix.toArray().every((v,j)=>v===parsed.nodeMatrices[i][j])),sourceHierarchyUnchanged:nodes.every((n,i)=>n.parent===(parsed.parent[i]===null?sourceRoot:nodes[parsed.parent[i]])),registrationMethod:'named receiver datum planes and fitted barrel centerline',referenceBytesPersisted:false});
    return {root:wrapper,nodes,meshes,audit,dispose(){meshes.forEach(m=>m.geometry.dispose());wrapper.clear();}};
  }
  return Object.freeze({create});
})();
