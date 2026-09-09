/* Dimensionless exterior template; no fabrication, internal contents or ballistics. */
const CartridgeProgram=(()=>{
  const description=Object.freeze({id:'ANM2/cartridge-exterior/2',family:'12.7x99-M2-labelled-visual-reference',referenceSha256:'f109fb80201d3c2339394c41155a4ca5e8f912f732c7d5d83832087356d81026',sourceStatus:'artist practice model, not certified dimensions',units:'dimensionless display proportions',length:.264,sourceRegistration:{sourceAxis:'+Y after original scene transform',origin:[-.0000062,62.5650594,31.7390938],uniformScale:.264/139.2701192,rotation:'source Y,Z,X -> display X,Y,Z'},caseMouthT:.719});
  function clean(T,geo){
    const p=geo.attributes.position,n=geo.attributes.normal,src=geo.index?Array.from(geo.index.array):Array.from({length:p.count},(_,i)=>i),ids=[],map=new Map(),pp=[],nn=[];
    if(!Array.from(p.array).every(Number.isFinite)||!Array.from(n.array).every(Number.isFinite))throw Error('Nonfinite generated cartridge geometry');
    for(let i=0;i<src.length;i+=3){const a=new T.Vector3().fromBufferAttribute(p,src[i]),b=new T.Vector3().fromBufferAttribute(p,src[i+1]),c=new T.Vector3().fromBufferAttribute(p,src[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20)for(const j of src.slice(i,i+3)){if(!map.has(j)){map.set(j,pp.length/3);pp.push(p.getX(j),p.getY(j),p.getZ(j));const norm=new T.Vector3(n.getX(j),n.getY(j),n.getZ(j)).normalize();nn.push(...norm.toArray());}ids.push(map.get(j));}}
    const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pp,3));out.setAttribute('normal',new T.Float32BufferAttribute(nn,3));out.setIndex(ids);geo.dispose();return out;
  }
  function merge(T,geos){const pp=[],nn=[],ii=[];for(const g of geos){const p=g.attributes.position,n=g.attributes.normal,base=pp.length/3;for(let i=0;i<p.count;i++){pp.push(p.getX(i),p.getY(i),p.getZ(i));nn.push(n.getX(i),n.getY(i),n.getZ(i));}const ids=g.index?g.index.array:Array.from({length:p.count},(_,i)=>i);for(const i of ids)ii.push(base+i);g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('normal',new T.Float32BufferAttribute(nn,3));g.setIndex(ii);return clean(T,g);}
  function create(T){
    const L=description.length;
    const lathe=profile=>{const g=new T.LatheGeometry(profile.map(([t,r])=>new T.Vector2(r*L,(t-.5)*L)),24);g.rotateZ(-Math.PI/2);return clean(T,g);};
    // Open mouth and shallow inside shell are an authored visual interpretation.
    const shell=lathe([[0,0],[0,.065],[.008,.073],[.025,.073],[.036,.070],[.043,.061],[.060,.061],[.072,.069],[.090,.072],[.565,.069],[.597,.066],[.635,.053],[.719,.0525],[.719,.0455],[.708,.0455],[.637,.046],[.594,.059],[.12,.061],[.10,0]]);
    const bulletProfile=[[.514,0],[.514,.040],[.53,.044],[.58,.0524],[.73,.0524]];
    for(let i=1;i<=14;i++){const u=i/14;bulletProfile.push([.73+.27*u,.0524*Math.pow(1-u*u,.72)]);}
    const projectile=lathe(bulletProfile),pieces=[];
    // Authored C-shaped link motif; no operational fit or spring mechanics.
    function band(x,r,width){const sh=new T.Shape(),angle=Math.PI*1.55,start=.22;for(let i=0;i<=12;i++){const a=start+angle*i/12;const y=Math.cos(a)*(r+.0023),z=Math.sin(a)*(r+.0023);i?sh.lineTo(y,z):sh.moveTo(y,z);}for(let i=12;i>=0;i--){const a=start+angle*i/12;sh.lineTo(Math.cos(a)*r,Math.sin(a)*r);}sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth:width,bevelEnabled:false,steps:1,curveSegments:1});g.applyMatrix4(new T.Matrix4().set(0,0,1,x-width/2,1,0,0,0,0,1,0,0,0,0,0,1));pieces.push(g);}
    band(-.072,.019,.018);band(.016,.018,.018);
    const bridge=new T.BoxGeometry(.090,.0045,.012);bridge.translate(-.028,-.0205,.009);pieces.push(bridge);
    const hook=new T.TorusGeometry(.009,.0023,6,12,Math.PI*1.5);hook.rotateY(Math.PI/2);hook.translate(-.02,-.017,.030);pieces.push(hook);
    return {shell,projectile,link:merge(T,pieces),description};
  }
  return {create,clean,merge,description};
})();

