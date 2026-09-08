/* Display-only interpretation of the verified source scene, in its shared datum frame.
 * No source vertex/index/UV tables, physical dimensions, internals or operating paths.
 * The curve is a compact authored fit of the visible laid-out belt, not a feed simulation.
 */
const SupplyGeometry=(()=>{
  function create(T,native,mat){
    const groups=native.groups;
    const makeGroup=(id,node)=>{const g=new T.Group();g.name=id;g.userData={semantic:id,sourceNode:node};native.root.add(g);groups[id]=g;return g;};
    const boxGroup=makeGroup('supplyBox',11),belt=makeGroup('supplyBelt',6);
    const add=(g,geo,name,extra={})=>{const m=new T.Mesh(geo,mat);m.name=name;m.userData={semantic:g.name,sourceNode:g.userData.sourceNode,...extra};g.add(m);return m;};
    function box(g,lo,hi,name){const geo=new T.BoxGeometry(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2]);geo.translate(...lo.map((v,i)=>(v+hi[i])/2));return add(g,geo,name);}
    box(boxGroup,[-.3176,-1.2735,1.8671],[-.0128,-.799,2.952],'box-shell-exterior');
    box(boxGroup,[-.3176,-.805,1.8671],[-.0067,-.7693,2.952],'box-lid');
    box(boxGroup,[-.0127,-1.214,1.925],[-.010,-.84,2.902],'box-face-inset');
    for(const [i,z]of [2.208,2.728].entries()){
      box(boxGroup,[-.05,-1.027,z-.018],[.007,-.778,z+.018],'box-strap-'+i);
      box(boxGroup,[-.086,-.778,z-.018],[.006,-.764,z+.018],'box-strap-top-'+i);
      const button=new T.CylinderGeometry(.010,.010,.007,16);button.rotateZ(Math.PI/2);button.translate(.01,-1.005,z);add(boxGroup,button,'box-strap-button-'+i);
    }
    // Named visible bends; small X drift is retained from the source layout.
    const controls=[[-.1709,.066,.0601],[-.1692,.0108,.3131],[-.1669,-.2824,.5025],[-.1648,-.5755,.6089],[-.1626,-.8579,.7375],[-.1602,-1.0094,1.0064],[-.1577,-1.0387,1.3152],[-.1553,-.9128,1.5933],[-.1526,-.7889,1.9584]];
    const curve=new T.CatmullRomCurve3(controls.map(p=>new T.Vector3(...p)),false,'centripetal');
    const count=58,points=curve.getSpacedPoints(count-1),linkGeos=[];
    for(let i=0;i<count;i++){
      const p=points[i],tangent=curve.getTangentAt(i/(count-1));
      const geo=new T.LatheGeometry([[0,-.131],[.018,-.131],[.019,-.124],[.0175,-.118],[.0175,.012],[.012,.035],[.012,.091],[.009,.116],[0,.132]].map(v=>new T.Vector2(...v)),16);
      geo.rotateZ(-Math.PI/2);geo.translate(p.x,p.y,p.z);
      add(belt,geo,'round-visual-'+String(i+1).padStart(2,'0'),{appearance:'brass',entityRole:'cartridge-display',instanceIndex:i+1,sourceNode:null,sourceNodeCandidates:[6,7]});
      const rotation=Math.atan2(-tangent.y,tangent.z);
      for(const [x,width]of [[-.095,.106],[.105,.065]]){
        const g=new T.BoxGeometry(width,.014,.039);g.translate(x,.0,0);g.rotateX(rotation);g.translate(p.x,p.y,p.z);linkGeos.push(g);
      }
    }
    const pos=[],normal=[],indices=[];
    for(const g of linkGeos){const p=g.attributes.position,n=g.attributes.normal,base=pos.length/3;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));}for(const i of g.index.array)indices.push(base+i);g.dispose();}
    const links=new T.BufferGeometry();links.setAttribute('position',new T.Float32BufferAttribute(pos,3));links.setAttribute('normal',new T.Float32BufferAttribute(normal,3));links.setIndex(indices);add(belt,links,'belt-visible-links',{sourceNode:6});
    // Remove procedural lathe pole degeneracies; preserve authored positions.
    for(const group of [boxGroup,belt])group.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,ind=g.index.array,valid=[];for(let i=0;i<ind.length;i+=3){const a=new T.Vector3().fromBufferAttribute(p,ind[i]),b=new T.Vector3().fromBufferAttribute(p,ind[i+1]),c=new T.Vector3().fromBufferAttribute(p,ind[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)valid.push(ind[i],ind[i+1],ind[i+2]);}g.setIndex(valid);});
    native.supply={curveControls:controls,displayRoundCount:count,sourceNodes:[6,7,11],historicalApplicability:'unknown',coordinateEvidence:'shared R02 datum; fitted source layout',fitStatus:'candidate'};
  }
  return {create};
})();
