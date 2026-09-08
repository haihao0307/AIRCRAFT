/* Original R02 layout with independently attributed exterior motifs. */
const SupplyGeometry=(()=>{
  function create(T,native,mat){
    const groups=native.groups;
    const makeGroup=(id,node)=>{const g=new T.Group();g.name=id;g.userData={semantic:id,sourceNode:node};native.root.add(g);groups[id]=g;return g;};
    const boxGroup=makeGroup('supplyBox',11),belt=makeGroup('supplyBelt',6);
    const add=(g,geo,name,extra={})=>{const m=new T.Mesh(CartridgeProgram.clean(T,geo),mat);m.name=name;m.userData={semantic:g.name,sourceNode:g.userData.sourceNode,appearance:g===boxGroup?'boxPaint':'linkSteel',...extra};g.add(m);return m;};
    function box(lo,hi,name,extra={}){const geo=new T.BoxGeometry(...lo.map((v,i)=>hi[i]-v));geo.translate(...lo.map((v,i)=>(v+hi[i])/2));return add(boxGroup,geo,name,extra);}
    const x0=-.3176,x1=-.0128,y0=-1.2735,y1=-.799,z0=1.8671,z1=2.952,t=.010;
    box([x0,y0,z0],[x1,y0+t,z1],'box-bottom');
    box([x0,y0+t,z0],[x0+t,y1,z1],'box-back-wall');
    box([x1-t,y0+t,z0],[x1,y1,z1],'box-front-wall');
    box([x0+t,y0+t,z0],[x1-t,y1,z0+t],'box-end-wall-a');
    box([x0+t,y0+t,z1-t],[x1-t,y1,z1],'box-end-wall-b');
    for(const x of [x0-.002,x1-.005])box([x,y1-.010,z0-.004],[x+.007,y1+.008,z1+.004],'box-mouth-rim');
    for(const z of [z0-.004,z1-.003])box([x0,y1-.010,z],[x1,y1+.008,z+.007],'box-mouth-end-rim');
    box([x0-.003,y1+.008,z0-.007],[x1+.008,y1+.025,z1+.007],'box-lid',{entityRole:'box-lid'});
    for(const z of [z0+.012,z1-.016])box([x0-.001,y1+.025,z],[x1+.005,y1+.029,z+.006],'box-lid-fold',{entityRole:'box-lid'});
    box([x1-.001,y0+.055,z0+.060],[x1+.004,y1-.06,z1-.060],'box-front-panel');
    for(const y of [y0+.055,y1-.065])box([x1+.004,y,z0+.060],[x1+.007,y+.008,z1-.060],'box-panel-edge');
    for(const z of [z0+.060,z1-.065])box([x1+.004,y0+.055,z],[x1+.007,y1-.057,z+.008],'box-panel-edge');
    for(const [i,z]of [2.208,2.728].entries()){
      box([x1+.006,y1-.175,z-.016],[x1+.013,y1+.012,z+.016],'box-latch-'+i,{appearance:'hardware'});
      const button=new T.CylinderGeometry(.010,.010,.006,16);button.rotateZ(-Math.PI/2);button.translate(x1+.016,y1-.152,z);add(boxGroup,button,'box-latch-head-'+i,{appearance:'hardware'});
    }
    const handlePoints=[[-.255,y1+.034,2.26],[-.255,y1+.10,2.26],[-.075,y1+.10,2.26],[-.075,y1+.034,2.26]];
    const handle=new T.TubeGeometry(new T.CatmullRomCurve3(handlePoints.map(p=>new T.Vector3(...p)),false,'centripetal'),28,.006,8,false);add(boxGroup,handle,'box-lid-handle',{entityRole:'box-lid',appearance:'hardware'});
    const controls=[[-.1709,.066,.0601],[-.1692,.0108,.3131],[-.1669,-.2824,.5025],[-.1648,-.5755,.6089],[-.1626,-.8579,.7375],[-.1602,-1.0094,1.0064],[-.1577,-1.0387,1.3152],[-.1553,-.9128,1.5933],[-.1526,-.7889,1.9584]];
    const curve=new T.CatmullRomCurve3(controls.map(p=>new T.Vector3(...p)),false,'centripetal'),count=58,points=curve.getSpacedPoints(count-1),template=CartridgeProgram.create(T),instances=[];
    for(let i=0;i<count;i++){
      const p=points[i],tangent=curve.getTangentAt(i/(count-1)),rotation=Math.atan2(-tangent.y,tangent.z),parts={};
      for(const [role,geo,appearance]of [['case',template.shell,'brass'],['projectile',template.projectile,'copper'],['link',template.link,'linkSteel']]){
        const m=add(belt,geo.clone(),'round-'+String(i+1).padStart(2,'0')+'-'+role,{appearance,entityRole:role,instanceIndex:i+1,sourceNode:null,sourceNodeCandidates:[6,7],shapeReference:role==='link'?'browning-m2-detail':'cal50-practice'});m.position.copy(p);if(role==='link')m.rotation.x=rotation;parts[role]=m;
      }
      instances.push({index:i+1,position:p.clone(),parts});
    }
    for(const g of [template.shell,template.projectile,template.link])g.dispose();
    native.supply={curveControls:controls,displayRoundCount:count,instances,lidMeshes:boxGroup.children.filter(m=>m.userData.entityRole==='box-lid'),lidHinge:new T.Vector3(x0,y1+.018,z0),sourceNodes:[6,7,11],historicalApplicability:'unknown',coordinateEvidence:'shared R02 datum; original layout retained',fitStatus:'multi-reference exterior candidate'};
  }
  return {create};
})();
