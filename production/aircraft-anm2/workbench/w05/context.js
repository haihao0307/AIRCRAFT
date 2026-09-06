/* W05: temporary local source context. No product geometry is stored in this code.
 * Same complete source hierarchy, with one outer display normalization shared by the sideplate.
 * Source node labels identify digital parts, not certified B24 installation components.
 */
function createReferenceContext(T,parsed,normalization,surfaces,neutral){
 const core=[9,15,17,19,21,23,25,27],feed=[6,7,11];
 const labels={4:'独立带状参照',6:'供弹外观 A',7:'供弹外观 B',9:'主枪长管组',11:'大型箱体',13:'独立长管参照',15:'前部环件',17:'后部握持组',19:'侧部握持组',21:'后部小组件',23:'机匣外观',25:'侧板原件',27:'后部按件'};
 const root=new T.Group();root.name='temporary-whole-reference';
 const nodes=parsed.doc.nodes.map((n,i)=>{const o=new T.Group();o.name=n.name||`source-${i}`;o.matrix.fromArray(parsed.nodeMatrices[i]);o.matrixAutoUpdate=false;o.userData.sourceIndex=i;return o;});
 const records=[];
 for(let i=0;i<nodes.length;i++){
  const n=parsed.doc.nodes[i];
  if(n.mesh!==undefined)for(const primitive of parsed.doc.meshes[n.mesh].primitives){
   const g=new T.BufferGeometry();
   for(const [semantic,idx]of Object.entries(primitive.attributes)){
    const name={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'}[semantic];
    if(!name)throw Error('未支持的源属性');const a=parsed.attributes[idx];g.setAttribute(name,new T.BufferAttribute(a.array,a.width,a.normalized));
   }
   const a=parsed.attributes[primitive.indices];g.setIndex(new T.BufferAttribute(a.array,1,a.normalized));g.computeBoundingBox();g.computeBoundingSphere();
   const mesh=new T.Mesh(g,neutral);mesh.userData.sourceIndex=i;nodes[i].add(mesh);records.push({index:i,mesh,label:labels[i]||n.name});
  }
  for(const child of n.children||[])nodes[i].add(nodes[child]);
 }
 for(const i of parsed.doc.scenes[parsed.doc.scene||0].nodes)root.add(nodes[i]);
 root.scale.setScalar(1/normalization.span);root.position.fromArray(normalization.translation);root.updateMatrixWorld(true);
 for(const r of records)r.candidate=surfaces.material(r.mesh.matrixWorld);
 let scope='with-feed',insert=true;
 function includes(id){return scope==='all'||core.includes(id)||(scope==='with-feed'&&feed.includes(id));}
 return {root,records,setScope(value,replace){if(!['core','with-feed','all'].includes(value))throw Error('未知整枪观察范围');scope=value;insert=!!replace;for(const r of records)r.mesh.visible=includes(r.index)&&!(r.index===25&&insert);},
  material(value,trial){for(const r of records)r.mesh.material=trial?r.candidate:value;},
  bounds(id=null){const b=new T.Box3();for(const r of records)if(id!==null?r.index===id:includes(r.index))b.union(new T.Box3().setFromObject(r.mesh));return b;},
  audit(){return {sourceNodes:nodes.length,sourceMeshObjects:records.length,visibleSourceMeshObjects:records.filter(r=>r.mesh.visible).length,sourceLocalMatricesUnchanged:nodes.every((n,i)=>n.matrix.toArray().every((x,j)=>x===parsed.nodeMatrices[i][j])),parentRelationsUnchanged:nodes.every((n,i)=>parsed.parent[i]===null?n.parent===root:n.parent===nodes[parsed.parent[i]]),nativeReplacementVisible:insert,scope};},
  dispose(){for(const r of records){r.mesh.geometry.dispose();surfaces.forget(r.candidate);}root.clear();}
 };
}
