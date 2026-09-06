/* Independent EXTERIOR-ONLY appearance recipe derived from the uploaded digital reference.
 * Coordinates are ratios of the selected visible object's span, never fabrication dimensions.
 * No source vertices, triangles, UV arrays, shanks, threads or internal mechanism are retained.
 * Curves are fitted interpretations; comparison remains required. The recipe is not an exact mesh copy.
 */
const SideplateRecipe = (() => {
  const P=Object.freeze({
    version:'aircraft.sideplate-appearance.w04.1',
    height:.2536482, back:0, mainFront:.0847598, noseFront:.0473129,
    shoulderX:.7750291, taperX:.8165937, corner:.013294,
    noseTop:.058365, noseBottom:-.073478, noseRound:.0155,
    slot:{left:.0603218,right:.9204203,radius:.0339651,y:-.0001602},
    longRelief:{start:.0756612,flatStart:.1164688,flatEnd:.4380257,end:.4788333,depth:.0593366,top:.0566957,bottom:-.0565176},
    shortRelief:{start:.5759504,end:.6834474,depth:.0593735,top:.0583648,bottom:-.0559120},
    heads:[
      {id:'cap-upper',label:'后端上圆头',kind:'cap',position:[.0273464,.0967869,.0812174],radius:.0156089,rise:.0080464},
      {id:'cap-lower',label:'后端下圆头',kind:'cap',position:[.0273464,-.0603210,.0815128],radius:.0156089,rise:.0080464},
      {id:'round-head',label:'下缘圆柱头',kind:'cylinder',position:[.7234094,-.0815982,.0918616],radius:.0253686},
      {id:'polygon-rear',label:'后部多边形头',kind:'polygon',position:[.52873395,.06651207,.09146093],radius:.0241596,height:.02218,aspect:1,phase:.211963},
      {id:'polygon-front',label:'前部多边形头',kind:'polygon',position:[.8097526,.06651198,.05232416],radius:.0241596,height:.02218,aspect:1,phase:.712089}
    ]
  });
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  function outer(x){
    const h=P.height/2,r=P.corner;
    if(x<r){const q=Math.sqrt(Math.max(0,r*r-(x-r)**2));return [-h+r-q,h-r+q];}
    if(x<P.taperX)return [-h,h];
    // Independently fitted shoulder taper. Its two sides are deliberately not mirrored.
    const e=1-P.noseRound,t=clamp((x-P.taperX)/(e-P.taperX),0,1);
    const low=mix(-h,P.noseBottom-P.noseRound,.20*t+.80*t*t);
    const high=mix(h,P.noseTop+P.noseRound,.20*t+.80*t*t);
    if(x<=e)return [low,high];
    const q=Math.sqrt(Math.max(0,P.noseRound**2-(x-e)**2));return [P.noseBottom-q,P.noseTop+q];
  }
  function slot(x){
    const s=P.slot;
    if(x<s.left-s.radius||x>s.right+s.radius)return [s.y,s.y];
    const dx=x<s.left?x-s.left:x>s.right?x-s.right:0;
    const q=Math.sqrt(Math.max(0,s.radius*s.radius-dx*dx));return [s.y-q,s.y+q];
  }
  function relief(x){
    const a=P.longRelief,b=P.shortRelief;
    if(x>a.start&&x<a.end){
      let f=1;
      if(x<a.flatStart){const t=(x-a.start)/(a.flatStart-a.start);f=Math.sqrt(Math.max(0,1-(1-t)**2));}
      if(x>a.flatEnd){const t=(a.end-x)/(a.end-a.flatEnd);f=Math.sqrt(Math.max(0,1-(1-t)**2));}
      return {z:mix(P.mainFront,a.depth,f),top:a.top,bottom:a.bottom};
    }
    if(x>b.start&&x<b.end){const t=(x-b.start)/(b.end-b.start);return {z:mix(P.mainFront,b.depth,Math.sqrt(Math.max(0,1-(2*t-1)**2))),top:b.top,bottom:b.bottom};}
    return {z:P.mainFront,top:a.top,bottom:a.bottom};
  }
  function build(T,{quality=1,material}={}){
    if(!Number.isFinite(quality)||quality<.5||quality>3)throw Error('Invalid fixed tessellation quality');
    const root=new T.Group();root.name='independent-sideplate';const features=[];
    const neutral=material||new T.MeshStandardMaterial({color:0xa3adb1,roughness:.61,metalness:0,side:T.FrontSide});
    let vertices=[];
    function tri(a,b,c){const ab=b.map((x,i)=>x-a[i]),ac=c.map((x,i)=>x-a[i]);const cr=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];if(cr.reduce((s,x)=>s+x*x,0)<1e-22)return;vertices.push(...a,...b,...c);}
    function quad(a,b,c,d){tri(a,b,c);tri(a,c,d);}
    function shapePiece(start,end,base){
      let xs=[start,end];
      const a=P.longRelief,b=P.shortRelief,s=P.slot;
      for(const x of [P.corner,P.taperX,1-P.noseRound,a.start,a.flatStart,a.flatEnd,a.end,b.start,(b.start+b.end)/2,b.end,s.left-s.radius,s.left,s.right,s.right+s.radius])if(x>start&&x<end)xs.push(x);
      xs.sort((a,b)=>a-b);
      function bands(x){const o=outer(x),hole=slot(x),q=base===P.mainFront?relief(x):{z:base,top:P.longRelief.top,bottom:P.longRelief.bottom};const ym=clamp(q.bottom,o[0],hole[0]),yp=clamp(q.top,hole[1],o[1]);return {o,hole,low:[o[0],ym,hole[0]],high:[hole[1],yp,o[1]],z:q.z};}
      // Fixed-error analytic tessellation. Flat spans need no uniform dense subdivision.
      // The runtime samples the recipe functions; no reference vertices are stored here.
      const samples=[xs[0]], tolerance=.00007/quality;
      function subdivision(a,b,depth){
        const u=bands(a),v=bands(b),x=(a+b)/2,w=bands(x);
        const error=Math.max(...['o','hole'].flatMap(key=>w[key].map((y,j)=>Math.abs(y-(u[key][j]+v[key][j])/2))),Math.abs(w.z-(u.z+v.z)/2));
        if(error>tolerance&&depth<13){subdivision(a,x,depth+1);subdivision(x,b,depth+1);}else samples.push(b);
      }
      for(let i=0;i<xs.length-1;i++)subdivision(xs[i],xs[i+1],0);
      xs=[...new Set(samples)];
      for(let i=0;i<xs.length-1;i++){
        const x0=xs[i],x1=xs[i+1],u=bands(x0),v=bands(x1);
        for(const name of ['low','high']){
          for(let k=0;k<2;k++){
            const zu=(name==='low'?k===0:k===1)?u.z:base,zv=(name==='low'?k===0:k===1)?v.z:base;
            quad([x0,u[name][k],zu],[x1,v[name][k],zv],[x1,v[name][k+1],zv],[x0,u[name][k+1],zu]);
            // Do not fill an unobserved reverse face. The source is an open appearance shell here.
          }
          // Relief-border walls only; no hidden working mechanism is constructed.
          const sign=name==='high'?1:-1;
          if(sign===1)quad([x0,u[name][1],base],[x1,v[name][1],base],[x1,v[name][1],v.z],[x0,u[name][1],u.z]);
          else quad([x0,u[name][1],u.z],[x1,v[name][1],v.z],[x1,v[name][1],base],[x0,u[name][1],base]);
        }
        quad([x0,u.o[0],0],[x1,v.o[0],0],[x1,v.o[0],v.z],[x0,u.o[0],u.z]);
        quad([x0,u.o[1],u.z],[x1,v.o[1],v.z],[x1,v.o[1],0],[x0,u.o[1],0]);
        if(x0>=s.left-s.radius-1e-8&&x1<=s.right+s.radius+1e-8){
          quad([x0,u.hole[0],base],[x1,v.hole[0],base],[x1,v.hole[0],0],[x0,u.hole[0],0]);
          quad([x0,u.hole[1],0],[x1,v.hole[1],0],[x1,v.hole[1],base],[x0,u.hole[1],base]);
        }
      }
      // Close the exterior end faces with matching subdivisions instead of one T-junction face.
      for(const [x,isStart] of [[start,true],[end,false]]){
        if((isStart&&x!==0)||(!isStart&&x!==1))continue;
        const b=bands(x);
        for(const name of ['low','high'])for(let k=0;k<2;k++){
          const lo=b[name][k],hi=b[name][k+1];
          if(isStart)quad([x,lo,0],[x,lo,base],[x,hi,base],[x,hi,0]);
          else quad([x,lo,0],[x,hi,0],[x,hi,base],[x,lo,base]);
        }
      }
    }
    shapePiece(0,P.shoulderX,P.mainFront);shapePiece(P.shoulderX,1,P.noseFront);
    const edge=outer(P.shoulderX),hole=slot(P.shoulderX);
    for(const [a,b]of [[edge[0],hole[0]],[hole[1],edge[1]]])quad([P.shoulderX,a,P.noseFront],[P.shoulderX,b,P.noseFront],[P.shoulderX,b,P.mainFront],[P.shoulderX,a,P.mainFront]);
    // Match subdivisions where two analytic slabs meet. This fixes T-junctions without
    // adding a plate, changing thickness, or reversing the object's display transform.
    const keys=new Map(),points=[],counts=new Map(),ends=new Map();
    for(let i=0;i<vertices.length;i+=3){const p=vertices.slice(i,i+3),key=p.map(x=>Math.round(x*1e8)).join(',');if(!keys.has(key)){keys.set(key,points.length);points.push(p);}}
    const vertexID=p=>keys.get(p.map(x=>Math.round(x*1e8)).join(','));
    for(let i=0;i<vertices.length;i+=9){const v=[vertices.slice(i,i+3),vertices.slice(i+3,i+6),vertices.slice(i+6,i+9)];
      for(let j=0;j<3;j++){const a=vertexID(v[j]),b=vertexID(v[(j+1)%3]),key=[Math.min(a,b),Math.max(a,b)].join(':');counts.set(key,(counts.get(key)||0)+1);ends.set(key,[a,b]);}
    }
    const boundaryIds=new Set();for(const [key,count] of counts)if(count===1)for(const id of ends.get(key))boundaryIds.add(id);
    const boundaryPoints=[...boundaryIds].map(id=>points[id]).filter(p=>Math.abs(p[0]-P.shoulderX)<1e-7),stitched=[];
    for(let i=0;i<vertices.length;i+=9){
      const v=[vertices.slice(i,i+3),vertices.slice(i+3,i+6),vertices.slice(i+6,i+9)],poly=[];
      for(let j=0;j<3;j++){
        const a=v[j],b=v[(j+1)%3],d=b.map((x,k)=>x-a[k]),l=d.reduce((a,b)=>a+b*b,0);poly.push(a);
        const cuts=[];
        for(const p of boundaryPoints){const t=p.reduce((sum,x,k)=>sum+(x-a[k])*d[k],0)/l;
          if(t<=1e-7||t>=1-1e-7)continue;
          if(p.reduce((sum,x,k)=>sum+(x-a[k]-t*d[k])**2,0)<1e-18)cuts.push({t,p});
        }
        cuts.sort((a,b)=>a.t-b.t);for(const c of cuts)poly.push(c.p);
      }
      if(poly.length===3)stitched.push(...v.flat());
      else{const center=[0,1,2].map(j=>poly.reduce((a,p)=>a+p[j],0)/poly.length);for(let j=0;j<poly.length;j++)stitched.push(...center,...poly[j],...poly[(j+1)%poly.length]);}
    }
    vertices=stitched;
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();geo.computeBoundingSphere();
    // Smooth only neighbouring shallow-angle analytic facets; keep sharp component boundaries.
    const pos=geo.attributes.position,norm=geo.attributes.normal,buckets=new Map();
    for(let i=0;i<pos.count;i++){const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(x=>Math.round(x*1e7)).join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}
    const raw=norm.array.slice();
    for(const entries of buckets.values())for(const i of entries){const sum=new T.Vector3();const ni=new T.Vector3(raw[i*3],raw[i*3+1],raw[i*3+2]);
      for(const j of entries){const nj=new T.Vector3(raw[j*3],raw[j*3+1],raw[j*3+2]);if(ni.dot(nj)>.90)sum.add(nj);}
      sum.normalize();norm.setXYZ(i,sum.x,sum.y,sum.z);
    }
    function add(geometry,id,label){const mesh=new T.Mesh(geometry,neutral);mesh.name=id;mesh.userData={featureId:id,label};root.add(mesh);features.push(mesh);return mesh;}
    add(geo,'plate-envelope','侧板轮廓与分层凹面');
    for(const h of P.heads){
      let g;
      if(h.kind==='cylinder'){
        g=new T.CylinderGeometry(h.radius,h.radius,h.radius*2,24,1,false);g.rotateX(Math.PI/2);
        // The reference's circular-ended component has softened vertex normals.
        // This analytic cap-boundary blend is a shading interpretation, not hidden geometry.
        const p=g.attributes.position,n=g.attributes.normal;
        for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,y);if(r>h.radius*.99){const t=new T.Vector3(x/r*.75,y/r*.75,Math.sign(z)*.66).normalize();n.setXYZ(i,t.x,t.y,t.z);}}
      }
      if(h.kind==='cap'){
        // W03's top-to-bottom Lathe profile faced inward. Rebuild only the visible cap
        // with explicit outward faces. No base disk is invented where the source has an open attachment interface.
        const R=(h.radius*h.radius+h.rise*h.rise)/(2*h.rise),segments=Math.round(32*quality),rings=8;
        const vv=[],nn=[];
        const capPoint=(rad,a)=>new T.Vector3(rad*Math.cos(a),rad*Math.sin(a),h.rise-R+Math.sqrt(R*R-rad*rad));
        function addTriangle(a,b,c,back=false){
          const cross=b.clone().sub(a).cross(c.clone().sub(a));if(cross.lengthSq()<1e-22)return;
          for(const p of [a,b,c]){vv.push(...p.toArray());const n=back?new T.Vector3(0,0,-1):new T.Vector3(p.x,p.y,p.z-h.rise+R).normalize();nn.push(...n.toArray());}
        }
        for(let j=0;j<segments;j++){
          const a=j*2*Math.PI/segments,b=(j+1)*2*Math.PI/segments;
          for(let k=0;k<rings;k++){
            const lo=h.radius*k/rings,hi=h.radius*(k+1)/rings;
            const p=capPoint(lo,a),q=capPoint(hi,a),r=capPoint(hi,b),t=capPoint(lo,b);
            addTriangle(p,q,r);addTriangle(p,r,t);
          }
          // Open attachment base is intentional and never used as a fabrication solid.
        }
        g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vv,3));g.setAttribute('normal',new T.Float32BufferAttribute(nn,3));
      }
      if(h.kind==='polygon'){
        const coords=[],indices=[],r=h.radius,H=h.height,z=[-H/2,-H/2+H*.001,H/2-H*.2337,H/2],sc=[1,1,1,.883218];
        for(let k=0;k<4;k++)for(let j=0;j<6;j++){const t=j*Math.PI/3+h.phase;coords.push(Math.cos(t)*r*sc[k],Math.sin(t)*r*sc[k]*h.aspect,z[k]);}
        for(let k=0;k<3;k++)for(let j=0;j<6;j++){const a=k*6+j,b=k*6+(j+1)%6,c=b+6,d=a+6;indices.push(a,b,d,b,c,d);}
        for(let j=1;j<5;j++){indices.push(0,j+1,j,18,18+j,18+j+1);}
        g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(coords,3));g.setIndex(indices);g=g.toNonIndexed();g.computeVertexNormals();
      }
      const m=add(g,h.id,h.label);m.position.set(...h.position);
    }
    root.updateMatrixWorld(true);
    const initial=features.map(m=>m.position.clone());
    return {root,features,recipeVersion:P.version,units:'normalized-appearance-ratios',setSpread(t){if(!Number.isFinite(t)||t<0||t>1)throw Error('Invalid spread');const s=t*t*(3-2*t);features.forEach((m,i)=>{m.position.copy(initial[i]);if(i)m.position.z+=s*(.12+(i%2)*.07);});},setMaterial(m){features.forEach(x=>x.material=m);},resetVisibility(){features.forEach(x=>x.visible=true);},dispose(){features.forEach(x=>x.geometry.dispose());if(!material)neutral.dispose();},stats(){let n=0;features.forEach(m=>n+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3);return {featureGroups:features.length,triangles:n,quality};}};
  }
  return Object.freeze({build,parameters:P,outer,slot,relief});
})();
