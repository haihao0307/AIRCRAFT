/* GEN-0002: independent, dimensionless exterior geometry rules.
 * Only readable features and parameters enter this generator. No reference buffers.
 * Nonfunctional display asset: no fabrication calibration or mechanism simulation.
 */
const NativeGeometry = (() => {
  function create(T,P,material){
    const root=new T.Group();root.name='ODNA:MECH:ANM2:PILOT-0001';
    const groups={}, metadata=[];
    const group=(id,node)=>{const g=new T.Group();g.name=id;g.userData={semantic:id,sourceNode:node};root.add(g);groups[id]=g;return g;};
    const add=(g,geo,name)=>{const m=new T.Mesh(geo,material);m.name=name;m.userData={semantic:g.name,sourceNode:g.userData.sourceNode};g.add(m);metadata.push({name,semantic:g.name,sourceNode:g.userData.sourceNode});return m;};
    const polygon=points=>{const p=new T.Shape();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;};
    function rounded(x0,y0,x1,y1,r=0){
      if(r<=1e-10)return polygon([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
      r=Math.min(r,(x1-x0)/2,(y1-y0)/2);const p=new T.Shape();
      p.moveTo(x0+r,y0);p.lineTo(x1-r,y0);p.quadraticCurveTo(x1,y0,x1,y0+r);
      p.lineTo(x1,y1-r);p.quadraticCurveTo(x1,y1,x1-r,y1);p.lineTo(x0+r,y1);
      p.quadraticCurveTo(x0,y1,x0,y1-r);p.lineTo(x0,y0+r);p.quadraticCurveTo(x0,y0,x0+r,y0);p.closePath();return p;
    }
    const hole=(shape,path)=>shape.holes.push(path);
    const circle=(x,y,r,segments=48)=>{const p=new T.Path();for(let i=0;i<segments;i++){const a=i/segments*Math.PI*2;i?p.lineTo(x+r*Math.cos(a),y+r*Math.sin(a)):p.moveTo(x+r,y);}p.closePath();return p;};
    function extrude(g,shape,a,b,name,axis='z',bevel=0){
      const geo=new T.ExtrudeGeometry(shape,{depth:b-a,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:16,steps:1});
      if(axis==='x'){geo.applyMatrix4(new T.Matrix4().set(0,0,1,0,1,0,0,0,0,1,0,0,0,0,0,1));geo.translate(a,0,0);}
      else if(axis==='y'){geo.rotateX(-Math.PI/2);geo.translate(0,a,0);}
      else geo.translate(0,0,a);
      return add(g,geo,name);
    }
    const box=(g,b,name,r=0)=>extrude(g,rounded(b.lo[0],b.lo[1],b.hi[0],b.hi[1],r),b.lo[2],b.hi[2],name);
    function lathe(g,profile,axis,center,name,segments=64){
      const geo=new T.LatheGeometry(profile.map(([r,t])=>new T.Vector2(r,t)),segments);
      if(axis==='x')geo.rotateZ(-Math.PI/2);if(axis==='z')geo.rotateX(Math.PI/2);
      geo.translate(...center);return add(g,geo,name);
    }
    function head(g,p,name,axis='z',sign=1){
      const {radius:r,rise:h}=p;let m;
      if(p.kind==='cylinder')m=lathe(g,[[0,0],[r,0],[r,h],[0,h]],'y',[0,0,0],name,32);
      else if(p.kind==='hex') m=lathe(g,[[0,0],[r*.88,0],[r,h*.13],[r,h*.87],[r*.86,h],[0,h]],'y',[0,0,0],name,6);
      else if(h>1.3*r){const geo=new T.SphereGeometry(r,24,16);geo.scale(1,h/(2*r),1);geo.translate(0,h/2,0);m=add(g,geo,name);}
      else {const profile=[[0,0],[r,0]];for(let i=1;i<=10;i++){const a=i/10*Math.PI/2;profile.push([r*Math.cos(a),h*Math.sin(a)]);}m=lathe(g,profile,'y',[0,0,0],name,24);}
      const direction=axis==='z'?new T.Vector3(0,0,sign):axis==='x'?new T.Vector3(sign,0,0):new T.Vector3(0,sign,0);
      m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);m.position.set(...p.center);return m;
    }
    const receiver=group('receiver',23),cover=group('cover',23),positive=group('positivePlate',25),collar=group('collar',15),barrel=group('barrel',9),rear=group('rear',17),sideHandle=group('sideHandle',19);
    const r=P.receiver,w=r.feedWindow;
    const bodyOutline=()=>rounded(r.faceX0,r.faceY0,r.faceX1,r.faceY1,0);
    const feedPath=()=>polygon([[w.x0,w.y0],[w.x1,w.y0],[w.x1,w.y1],[w.notchX1,w.y1],[w.notchX1,w.notchY],[w.notchX0,w.notchY],[w.notchX0,w.y1],[w.x0,w.y1]]);
    // A layered exterior shell permits blind recesses on the negative side.
    // The front/rear chamfers are generated from the named datum planes.
    const central=bodyOutline();hole(central,feedPath());
    extrude(receiver,central,r.innerNegative,r.zFlatHi,'receiver-central-shell','z',r.bevel);
    const negative=bodyOutline();hole(negative,feedPath());
    const ns=r.negativeSlot;hole(negative,rounded(ns.x0,ns.y0,ns.x1,ns.y1,(ns.y1-ns.y0)/2));
    for(const q of r.negativeLowerPlate.windows)hole(negative,rounded(q[0],q[2],q[1],q[3]));
    extrude(receiver,negative,r.sideLo,r.innerNegative-r.bevel,'negative-side-recess-skin');
    // Tangential chamfer edge ribbons connect this skin to the core without filling its recesses.
    const inset=bodyOutline();hole(inset,rounded(r.faceX0+.002,r.faceY0+.002,r.faceX1-.002,r.faceY1-.002));
    extrude(receiver,inset,r.sideLo,r.zFlatLo,'negative-edge-return');
    const lowerPlate=rounded(r.negativeLowerPlate.lo[0],r.negativeLowerPlate.lo[1],r.negativeLowerPlate.hi[0],r.negativeLowerPlate.hi[1],.0015);
    for(const q of r.negativeLowerPlate.windows){hole(lowerPlate,rounded(q[0],q[2],q[1],q[3]));box(receiver,{lo:[q[0],q[2],q[4]],hi:[q[1],q[3],r.innerNegative]},'negative-pocket-floor');}
    extrude(receiver,lowerPlate,r.negativeLowerPlate.lo[2],r.negativeLowerPlate.hi[2],'negative-lower-plate');
    r.negativeTabs.forEach((b,i)=>box(receiver,b,'negative-tab-'+i,.0015));
    box(receiver,r.rearUpperLip,'rear-upper-lip');box(receiver,r.rearLowerLip,'rear-lower-lip');
    const rail=r.bottomRail, railShape=new T.Shape();
    railShape.moveTo(rail.x0,rail.y0);railShape.lineTo(rail.x1,rail.y0);railShape.lineTo(rail.x1,rail.shoulderY);
    railShape.quadraticCurveTo(rail.x1,rail.y1,rail.shoulderEnd,rail.y1);railShape.lineTo(rail.shoulderEnd,rail.y1+.002);railShape.lineTo(rail.x0,rail.y1+.002);railShape.closePath();
    extrude(receiver,railShape,rail.z0,rail.z1,'receiver-lower-rail');
    const ears=r.lowerEars;
    ears.zIntervals.forEach(([a,b],i)=>{const sh=new T.Shape(),cx=(ears.x0+ears.x1)/2,w=(ears.x1-ears.x0)/2;sh.moveTo(ears.x0,ears.y1);sh.lineTo(cx-w*.68,ears.y0+.012);sh.quadraticCurveTo(cx,ears.y0-.004,cx+w*.68,ears.y0+.012);sh.lineTo(ears.x1,ears.y1);sh.closePath();hole(sh,circle(...ears.holeCenter,ears.holeRadius,24));extrude(receiver,sh,a,b,'lower-exterior-ear-'+i);});
    // Top-cover sidewalls, corner folds and forward widened band.
    const c=P.cover;
    const cov=polygon([[c.x0,c.y0],[c.notchX0,c.y0],[c.notchX0,c.notchY],[c.notchX1,c.notchY],[c.notchX1,c.y0],[c.x1,c.y0],[c.x1,c.sideY],[c.x0,c.sideY]]);
    extrude(cover,cov,c.z0,c.z1,'top-cover-sidewalls');
    function coverCap(x0,x1,z0,z1,name){const cross=polygon([[c.sideY,z0],[c.sideY,z1],[c.topY,c.topZ1],[c.topY,c.topZ0]]);extrude(cover,cross,x0,x1,name,'x');}
    coverCap(c.x0,c.bandX0,c.z0,c.z1,'top-cover-folded-cap');
    coverCap(c.bandX0,c.x1,c.bandZ0,c.bandZ1,'top-cover-forward-cap');
    const band=polygon([[c.bandX0,c.y0],[c.notchX0,c.y0],[c.notchX0,c.notchY],[c.notchX1,c.notchY],[c.notchX1,c.y0],[c.x1,c.y0],[c.x1,c.sideY],[c.bandX0,c.sideY]]);
    extrude(cover,band,c.bandZ0,c.z0,'cover-band-negative');extrude(cover,band,c.z1,c.bandZ1,'cover-band-positive');
    const pad=c.pad;extrude(cover,rounded(pad.lo[0],-pad.hi[2],pad.hi[0],-pad.lo[2],pad.corner),pad.lo[1],pad.hi[1],'top-cover-raised-pad','y');
    head(cover,{...c.topButton,kind:'dome'},'top-cover-button','y');
    // Positive side: stepped nose, an actual capsule slot and four edge reliefs.
    const q=P.positivePlate;
    function plateOutline(){const sh=new T.Shape();sh.moveTo(q.x0+q.corner,q.y0);sh.lineTo(q.taperStart,q.y0);
      sh.bezierCurveTo(q.taperStart+.022,q.y0,q.x1-.012,q.tipBottom-.005,q.x1,q.tipBottom);
      sh.lineTo(q.x1,q.tipTop);sh.bezierCurveTo(q.x1-.010,q.tipTop+.007,q.taperStart+.015,q.y1,q.taperStart,q.y1);
      sh.lineTo(q.x0+q.corner,q.y1);sh.quadraticCurveTo(q.x0,q.y1,q.x0,q.y1-q.corner);sh.lineTo(q.x0,q.y0+q.corner);sh.quadraticCurveTo(q.x0,q.y0,q.x0+q.corner,q.y0);sh.closePath();return sh;}
    const slot=()=>rounded(q.slot.x0,q.slot.y0,q.slot.x1,q.slot.y1,(q.slot.y1-q.slot.y0)/2);
    const basePlate=plateOutline();hole(basePlate,slot());const baseMesh=extrude(positive,basePlate,q.zBack,q.zNose,'sideplate-contour-and-nose');
    // The inspected plate is an open-backed visual shell, not a solid slab.
    {const g=baseMesh.geometry,p=g.attributes.position,n=g.attributes.normal,ids=[];for(let i=0;i<p.count;i+=3){if([0,1,2].every(j=>Math.abs(p.getZ(i+j)-q.zBack)<1e-6&&n.getZ(i+j)<-.99))continue;ids.push(i,i+1,i+2);}g.setIndex(ids);}
    const upper=new T.Shape();upper.moveTo(q.x0+q.corner,q.y0);
    for(const re of q.recesses){upper.lineTo(re.x0,q.y0);upper.lineTo(re.x0,re.bottom);upper.lineTo(re.x1,re.bottom);upper.lineTo(re.x1,q.y0);}
    upper.lineTo(q.shoulder,q.y0);upper.lineTo(q.shoulder,q.slot.y0);
    const sr=(q.slot.y1-q.slot.y0)/2, scx=q.slot.x0+sr, scy=(q.slot.y0+q.slot.y1)/2;
    upper.lineTo(scx,q.slot.y0);upper.absarc(scx,scy,sr,-Math.PI/2,-Math.PI*1.5,true);
    upper.lineTo(q.shoulder,q.slot.y1);upper.lineTo(q.shoulder,q.y1);
    for(const re of [...q.recesses].reverse()){upper.lineTo(re.x1,q.y1);upper.lineTo(re.x1,re.top);upper.lineTo(re.x0,re.top);upper.lineTo(re.x0,q.y1);}
    upper.lineTo(q.x0+q.corner,q.y1);upper.quadraticCurveTo(q.x0,q.y1,q.x0,q.y1-q.corner);upper.lineTo(q.x0,q.y0+q.corner);upper.quadraticCurveTo(q.x0,q.y0,q.x0+q.corner,q.y0);upper.closePath();
    // The slot exits the stepped layer at its shoulder; it is an open notch here.
    extrude(positive,upper,q.zNose,q.zFace,'sideplate-stepped-face');
    // Fill reliefs with smooth analytic x/z ramps, rather than an image or empty rectangles.
    q.recesses.forEach((re,i)=>{for(const [low,high,tag] of [[q.y0,re.bottom,'lower'],[re.top,q.y1,'upper']]){
      const points=[[re.x0,-q.zNose],[re.x1,-q.zNose],[re.x1,-q.zFace]];
      for(let k=1;k<=8;k++){const t=k/8;points.push([re.x1-re.transition*t,-(q.zFace+(q.zRecess-q.zFace)*Math.sin(t*Math.PI/2))]);}
      points.push([re.x0+re.transition,-q.zRecess]);
      for(let k=1;k<=8;k++){const t=k/8;points.push([re.x0+re.transition*(1-t),-(q.zRecess+(q.zFace-q.zRecess)*(1-Math.cos(t*Math.PI/2)))]);}
      const relief=extrude(positive,polygon(points),low,high,'sideplate-relief-'+i+'-'+tag,'y');
      const rp=relief.geometry.attributes.position,rn=relief.geometry.attributes.normal;
      // Smooth the folded pocket's shading transition as in the inspected source;
      // the recess depth and silhouette remain actual geometry.
      for(let v=0;v<rp.count;v++)if(rn.getZ(v)>.75){const edge=tag==='upper'?low:high,blend=Math.max(0,1-Math.abs(rp.getY(v)-edge)/(high-low));const nv=new T.Vector3(rn.getX(v),(tag==='upper'?1:-1)*.85*blend,rn.getZ(v)).normalize();rn.setXYZ(v,nv.x,nv.y,nv.z);}
    }});
    q.heads.forEach(h=>head(positive,h,h.id));
    // Readable repeat families; counts and pitch come from isolated visible head groups.
    const h=P.receiverHeads;
    for(const row of h.rows)for(let side=0;side<2;side++)for(let i=0;i<row.count;i++)head(receiver,{center:[row.x0+i*row.pitch,row.y,row.zPair[side]],radius:h.radius,rise:h.rise,kind:'dome'},'receiver-'+row.id+'-'+side+'-'+i,'z',side?1:-1);
    for(let side=0;side<2;side++)h.frontPositions.forEach((v,i)=>head(receiver,{center:[...v,h.frontZPair[side]],radius:h.radius,rise:h.rise,kind:'dome'},'forward-cap-'+side+'-'+i,'z',side?1:-1));
    h.rearTop.zs.forEach((z,i)=>head(receiver,{center:[h.rearTop.x,h.rearTop.y,z],radius:h.radius,rise:h.rise,kind:'dome'},'rear-top-cap-'+i,'y'));
    h.frontHex.zs.forEach((z,i)=>head(receiver,{center:[h.frontHex.x,h.frontHex.y,z],radius:h.frontHex.radius,rise:h.frontHex.rise,kind:'hex'},'forward-hex-'+i,'z',i?1:-1));
    // Visible external lips around the transverse opening; no feed mechanism.
    const f=P.feedLedges;
    for(const [a,b,tip,side] of [[f.positiveZ0,f.positiveZ1,f.centerPositive,'positive'],[f.negativeZ0,f.negativeZ1,f.centerNegative,'negative']]){
      box(receiver,{lo:[f.x0,f.y0,a],hi:[f.x1,f.y1,b]},'opening-lower-lip-'+side,.001);
      box(receiver,{lo:[f.centerX0,f.y0,Math.min(tip,a)],hi:[f.centerX1,f.y1,Math.max(tip,b)]},'opening-central-lip-'+side,.0015);
    }
    // Receiver-to-root continuity is tied to the same datum frame as the reference.
    const k=P.collar;
    lathe(collar,[[0,k.x0],[k.endRadius,k.x0],[k.radius,k.x0+k.bevel],[k.radius,k.x1-k.bevel],[k.endRadius,k.x1],[0,k.x1]],'x',[0,...k.centerYZ],'front-collar',k.radialSegments);
    const lug=k.lug,lg=new T.Shape(),lcx=lug.holeCenter[0];lg.moveTo(lug.x0,lug.y1);lg.lineTo(lcx-.019,lug.y0+.011);lg.quadraticCurveTo(lcx-.010,lug.y0-.001,lcx+.003,lug.y0);lg.quadraticCurveTo(lug.x1-.008,lug.y0,lug.x1,lug.y0+.011);lg.lineTo(lug.x1,lug.y1);lg.closePath();hole(lg,circle(...lug.holeCenter,lug.holeRadius,12));extrude(collar,lg,lug.z0+.003,lug.z1-.003,'front-collar-exterior-lug','z',.001);
    const b=P.barrel;
    // Constant-radius patches are triangulated around actual holes in an unwrapped
    // coordinate domain. The source vertex/UV layout is never an input.
    const position=[],normal=[],index=[];
    function append(geo,flip=false){const at=position.length/3;position.push(...geo.attributes.position.array);normal.push(...geo.attributes.normal.array);const ids=geo.index?geo.index.array:Array.from({length:geo.attributes.position.count},(_,i)=>i);for(let i=0;i<ids.length;i+=3)index.push(at+ids[i],at+ids[i+(flip?2:1)],at+ids[i+(flip?1:2)]);geo.dispose();}
    function skinPatch(x0,x1,theta,rad,inside,cx,holeR){
      const sh=new T.Shape();sh.moveTo(x0,-Math.PI/4);sh.lineTo(x1,-Math.PI/4);
      for(let i=1;i<=24;i++)sh.lineTo(x1,-Math.PI/4+i*Math.PI/48);
      sh.lineTo(x0,Math.PI/4);for(let i=23;i>0;i--)sh.lineTo(x0,-Math.PI/4+i*Math.PI/48);sh.closePath();
      if(holeR){const hp=new T.Path();for(let i=0;i<40;i++){const a=i/40*Math.PI*2;const u=cx+holeR*Math.cos(a),v=Math.asin(holeR*Math.sin(a)/rad);i?hp.lineTo(u,v):hp.moveTo(u,v);}hp.closePath();hole(sh,hp);}
      const flat=new T.ShapeGeometry(sh),fp=flat.attributes.position,fi=flat.index.array,verts=[],norms=[];
      function refine(a,b0,c0,depth=0){
        const spread=Math.max(a[1],b0[1],c0[1])-Math.min(a[1],b0[1],c0[1]);
        if(spread>Math.PI/12&&depth<6){const pairs=[[a,b0,c0],[b0,c0,a],[c0,a,b0]].sort((u,v)=>Math.abs(v[0][1]-v[1][1])-Math.abs(u[0][1]-u[1][1]));const [u,v,w]=pairs[0],mid=[(u[0]+v[0])/2,(u[1]+v[1])/2];refine(u,mid,w,depth+1);refine(mid,v,w,depth+1);return;}
        for(const [x,ang] of [a,b0,c0]){const t=ang+theta;verts.push(x,rad*Math.sin(t),rad*Math.cos(t));norms.push(0,(inside?-1:1)*Math.sin(t),(inside?-1:1)*Math.cos(t));}
      }
      for(let i=0;i<fi.length;i+=3)refine(...[fi[i],fi[i+1],fi[i+2]].map(j=>[fp.getX(j),fp.getY(j)]));
      flat.dispose();const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('normal',new T.Float32BufferAttribute(norms,3));append(geo,inside);
    }
    function holeWall(cx,theta,holeR){const start=position.length/3;
      for(let i=0;i<40;i++){const a=i/40*Math.PI*2,x=cx+holeR*Math.cos(a),dy=holeR*Math.sin(a);
        for(const rad of [b.radius,b.innerRadius]){const t=theta+Math.asin(dy/rad);position.push(x,rad*Math.sin(t),rad*Math.cos(t));normal.push(-Math.cos(a),-Math.sin(a)*Math.cos(theta),Math.sin(a)*Math.sin(theta));}}
      for(let i=0;i<40;i++){const a=start+i*2,c=start+((i+1)%40)*2;index.push(a,c,c+1,a,c+1,a+1);}
    }
    const hp=b.holePattern,first=hp.firstX-hp.pitch/2,last=hp.firstX+(hp.stations-.5)*hp.pitch;
    for(const [x0,x1] of [[b.rootX,first],[last,b.jacketEnd]])for(let j=0;j<4;j++)skinPatch(x0,x1,j*Math.PI/2,b.radius,false,0,0);
    for(let i=0;i<hp.stations;i++)for(let j=0;j<4;j++){
      const cx=hp.firstX+i*hp.pitch,theta=(i%2?hp.oddAngleDegrees:hp.evenAngleDegrees)*Math.PI/180+j*Math.PI/2;
      for(const inside of [false,true])skinPatch(cx-hp.pitch/2,cx+hp.pitch/2,theta,inside?b.innerRadius:b.radius,inside,cx,hp.radius);
      holeWall(cx,theta,hp.radius);
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(position,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normal,3));geo.setIndex(index);add(barrel,geo,'ventilated-shell-56-openings');
    const e=b.endBand;lathe(barrel,[[b.radius,e.x0],[e.radius-e.bevel,e.x0],[e.radius,e.x0+e.bevel],[e.radius,e.x1-e.bevel],[e.radius-e.bevel,e.x1],[b.radius,e.x1]],'x',[0,0,0],'forward-band',64);
    const end=b.termination;
    // Open-center visible tube shell. Stops at the receiver datum; internals unmodeled.
    lathe(barrel,[[.024,b.rootX],[.024,end.x0],[end.radius,end.x0],[end.radius,end.x1-.002],[end.radius-.001,end.x1],[end.openingRadius,end.x1],[end.openingRadius,b.rootX]],'x',[0,0,0],'barrel-hollow-tube',64);
    // Rear exterior contextual groups are rebuilt separately from the first gate.
    const rr=P.rear;
    for(let i=0;i<2;i++){
      const [x,z]=rr.gripCenters[i],y0=rr.gripY0,y1=rr.gripY1,span=y1-y0;
      lathe(rear,[[0,y0],[rr.gripRadius*.78,y0],[rr.gripRadius*.86,y0+span*.08],[rr.gripRadius,y0+span*.42],[rr.gripRadius*.85,y0+span*.88],[rr.gripRadius*.82,y1],[0,y1]],'y',[x,0,z],'rear-grip-'+i,48);
      for(const [capIndex,[a,b]] of [rr.upperCapY,rr.lowerCapY].entries()){
        const h=b-a,cr=rr.capRadius;
        const profile=capIndex===0?[[0,a],[cr,a],[cr,a+h*.48],[cr*.90,a+h*.7],[cr*.62,a+h*.92],[0,b]]:[[0,a],[cr*.62,a+h*.08],[cr*.9,a+h*.3],[cr,a+h*.52],[cr,b],[0,b]];
        lathe(rear,profile,'y',[x,0,z],'rear-grip-'+i+'-cap-'+capIndex,48);
      }
    }
    const fr=rr.frame;
    for(const [a,b] of [fr.upper,fr.lower]){const shape=rounded(fr.x0,-fr.z1,fr.x1,-fr.z0,fr.corner);hole(shape,rounded(fr.x0+fr.width,-fr.z1+fr.width,fr.x1-fr.width,-fr.z0-fr.width,fr.corner*.6));extrude(rear,shape,a,b,'rear-handle-frame','y');}
    const cy=rr.cylinder,d=cy.x1-cy.x0,R=cy.radius;
    lathe(rear,[[0,cy.x0],[R*.83,cy.x0],[R*.83,cy.x0+d*.035],[R*.91,cy.x0+d*.035],[R*.91,cy.x0+d*.07],[R*.97,cy.x0+d*.07],[R*.97,cy.x0+d*.13],[R*.91,cy.x0+d*.13],[R*.91,cy.x0+d*.17],[R,cy.x0+d*.17],[R,cy.x1],[0,cy.x1]],'x',[0,...cy.centerYZ],'rear-external-cylinder',64).userData.sourceNode=21;
    const uc=rr.upperControl;
    // Authored visible wing silhouette on a tilted exterior plate, not a mechanism.
    const control=new T.Shape(),cz=(uc.z0+uc.z1)/2,controlWidth=uc.z1-uc.z0,controlHeight=uc.y1-uc.y0;
    const pt=(u,v)=>[cz+controlWidth*u,uc.y0+controlHeight*v];
    control.moveTo(...pt(-.24,1));control.lineTo(...pt(.24,1));control.lineTo(...pt(.24,.82));control.lineTo(...pt(.5,.10));
    control.bezierCurveTo(...pt(.52,-.03),...pt(.39,-.06),...pt(.32,.06));
    control.lineTo(...pt(.08,.43));control.quadraticCurveTo(...pt(0,.55),...pt(-.08,.43));control.lineTo(...pt(-.32,.06));
    control.bezierCurveTo(...pt(-.39,-.06),...pt(-.52,-.03),...pt(-.5,.10));control.lineTo(...pt(-.24,.82));control.closePath();
    const cg=new T.ExtrudeGeometry(control,{depth:.008,bevelEnabled:false,curveSegments:12,steps:1});
    // Shape coordinates are (z,y); source-visible plate has x increasing with y.
    cg.applyMatrix4(new T.Matrix4().set(0,1.21617,1,-1.1359,0,1,0,0,-1,0,0,2*cz,0,0,0,1));
    add(rear,cg,'rear-upper-control').userData.sourceNode=27;
    const sh=P.sideHandle;
    box(sideHandle,sh.attachment,'side-handle-attachment');extrude(sideHandle,polygon(sh.armXY),sh.armZ0,sh.armZ1,'side-handle-curved-arm');
    const dz=sh.z1-sh.z0;lathe(sideHandle,[[0,sh.z0],[sh.radius*.93,sh.z0],[sh.radius,sh.z0+dz*.06],[sh.radius*.84,sh.z0+dz*.11],[sh.radius*.91,sh.z0+dz*.4],[sh.radius*.78,sh.z0+dz*.86],[sh.radius,sh.z1-.003],[sh.radius,sh.z1],[0,sh.z1]],'z',[...sh.centerXY,0],'side-grip',48);
    head(sideHandle,{...sh.head,kind:'hex'},'side-handle-exterior-head');
    // Trim hidden layer interfaces exactly at the named sideplate shoulder.
    // Triangles crossing that plane are clipped, not discarded by centroid.
    positive.traverse(m=>{if(!m.isMesh)return;const old=m.geometry,g=old.index?old.toNonIndexed():old,p=g.attributes.position,n=g.attributes.normal,pp=[],nn=[];
      for(let i=0;i<p.count;i+=3){let tri=[0,1,2].map(j=>({p:new T.Vector3().fromBufferAttribute(p,i+j),n:new T.Vector3().fromBufferAttribute(n,i+j)}));
        if(tri.every(v=>Math.abs(v.p.z-q.zNose)<1e-6)){const out=[];for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],ia=a.p.x>=q.shoulder,ib=b.p.x>=q.shoulder;if(ia)out.push(a);if(ia!==ib){const t=(q.shoulder-a.p.x)/(b.p.x-a.p.x);out.push({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize()});}}tri=out;}
        for(let j=1;j+1<tri.length;j++)for(const v of [tri[0],tri[j],tri[j+1]]){pp.push(v.p.x,v.p.y,v.p.z);nn.push(v.n.x,v.n.y,v.n.z);}
      }const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pp,3));out.setAttribute('normal',new T.Float32BufferAttribute(nn,3));m.geometry=out;if(g!==old)g.dispose();old.dispose();});
    // Remove tessellator pole/corner degeneracies and compact unused vertices.
    // This changes only generated buffers, never the reference.
    root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,n=g.attributes.normal;
      const ids=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i),valid=[];
      for(let i=0;i<ids.length;i+=3){const a=new T.Vector3().fromBufferAttribute(p,ids[i]),b0=new T.Vector3().fromBufferAttribute(p,ids[i+1]),c0=new T.Vector3().fromBufferAttribute(p,ids[i+2]);
        if(b0.sub(a).cross(c0.sub(a)).lengthSq()>1e-20)valid.push(ids[i],ids[i+1],ids[i+2]);}
      const remap=new Map(),positions=[],normals=[],indices=[];
      for(const id of valid){if(!remap.has(id)){remap.set(id,positions.length/3);positions.push(p.getX(id),p.getY(id),p.getZ(id));const v=new T.Vector3(n.getX(id),n.getY(id),n.getZ(id)).normalize();normals.push(v.x,v.y,v.z);}indices.push(remap.get(id));}
      const clean=new T.BufferGeometry();clean.setAttribute('position',new T.Float32BufferAttribute(positions,3));clean.setAttribute('normal',new T.Float32BufferAttribute(normals,3));clean.setIndex(indices);m.geometry=clean;g.dispose();
    });
    root.updateMatrixWorld(true);
    return {root,groups,metadata,parameters:P,dispose(){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});root.clear();}};
  }
  return Object.freeze({create});
})();
