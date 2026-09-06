/* R01 authored exterior study. All coordinates are arbitrary presentation units.
   No reference mesh, sampled vertex table, texture, operating dimensions or internal mechanism.
   Museum references guide the rectangular receiver and perforated jacket silhouette.
   Mount is a visual interpretation of the B-26G museum photograph, not a B24 fit certification. */
function buildAircraft(T, materials) {
  const root=new T.Group(), parts=[], pickables=[];root.name='aircraft.native';
  const V=(x,y,z)=>new T.Vector3(x,y,z);
  function group(id,label,en,spread){const g=new T.Group();g.name=id;g.userData={id,label,en,spread:V(...spread),rest:V(0,0,0)};root.add(g);parts.push(g);return g;}
  function place(g,geo,mat,pos,rot){const m=new T.Mesh(geo,mat);m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.part=g.name;g.add(m);pickables.push(m);return m;}
  function roundedShape(w,h,r){const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
  function box(g,w,h,d,r,pos,mat=materials.steel){const sh=roundedShape(w-2*r,h-2*r,Math.min(r,.03));const geo=new T.ExtrudeGeometry(sh,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:4,steps:1});geo.translate(0,0,-(d-2*r)/2);return place(g,geo,mat,pos);}
  function cylinder(g,r1,r2,len,pos,mat=materials.steel,axis='x'){return place(g,new T.CylinderGeometry(r1,r2,len,32,1),mat,pos,axis==='x'?[0,0,-Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:null);}
  function tube(g,r,thick,len,pos,mat=materials.steel,axis='x'){const shape=new T.Shape();shape.absarc(0,0,r,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,r-thick,0,Math.PI*2,true);shape.holes.push(hole);const geo=new T.ExtrudeGeometry(shape,{depth:len,bevelEnabled:false,curveSegments:24});geo.translate(0,0,-len/2);return place(g,geo,mat,pos,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:null);}
  function rod(g,a,b,r,mat){const d=V(...b).sub(V(...a));const m=place(g,new T.CylinderGeometry(r,r,d.length(),16),mat,V(...a).add(V(...b)).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m;}
  const body=group('receiver','机匣外观','RECEIVER',[0,0,0]);
  box(body,2.72,.61,.57,.038,[-1.78,1.03,0]);
  box(body,2.58,.50,.035,.008,[-1.78,1.03,.30],materials.panel);
  box(body,2.58,.50,.035,.008,[-1.78,1.03,-.30],materials.panel);
  box(body,.36,.66,.61,.025,[-.31,1.035,0],materials.steel);
  box(body,.21,.58,.58,.012,[-3.20,1.03,0],materials.panel);
  box(body,1.83,.055,.55,.008,[-1.71,.704,0],materials.edge);
  // Shallow decorative receiver openings: no hidden functional structure is generated.
  for(const z of [-.323,.323]){
    const sh=roundedShape(1.01,.065,.03);const geo=new T.ShapeGeometry(sh,10);
    const slot=place(body,geo,materials.dark,[-1.75,1.09,z],z<0?[0,Math.PI,0]:null);
    cylinder(body,.051,.051,.043,[-1.91,1.09,z*1.05],materials.edge,'z');
    rod(body,[-1.91,1.09,z*1.15],[-1.91,.95,z*1.8],.032,materials.edge);
    box(body,.12,.13,.045,.009,[-.95,.95,z],materials.edge);
  }
  // Rivet rhythm is authored visual detail, not a measured fastener pattern.
  const rivetGeo=new T.SphereGeometry(.027,10,7);
  for(const z of [-.324,.324])for(let i=0;i<11;i++)for(const y of [.823,1.24]){
    const m=place(body,rivetGeo,materials.edge,[-2.95+i*.236,y,z]);m.scale.z=.48;
  }
  const cover=group('cover','顶部外壳','TOP COVER',[0,.94,0]);
  box(cover,2.65,.11,.585,.02,[-1.78,1.393,0],materials.panel);
  box(cover,.23,.055,.40,.012,[-2.77,1.46,0],materials.edge);
  for(const x of [-2.95,-.63])cylinder(cover,.032,.032,.035,[x,1.462,0],materials.edge,'y');
  cylinder(cover,.045,.045,.65,[-.42,1.40,0],materials.edge,'z');
  const jacket=group('jacket','穿孔护套','VENTILATED JACKET',[.55,.38,0]);
  // Unroll a perforated sheet, triangulate holes, then curve it. Vertices exist only in memory.
  const length=4.37,radius=.236,circ=2*Math.PI*radius,wall=.018;
  const sheet=new T.Shape();sheet.moveTo(0,0);sheet.lineTo(length,0);sheet.lineTo(length,circ);sheet.lineTo(0,circ);sheet.closePath();
  for(let row=0;row<6;row++)for(let col=0;col<18;col++){
    const x=.22+col*.227+(row%2)*.05,arc=(row+.5)*circ/6;
    const hole=new T.Path();hole.absellipse(x,arc,.076,.069,0,Math.PI*2,true,0);sheet.holes.push(hole);
  }
  const perforated=new T.ExtrudeGeometry(sheet,{depth:wall,bevelEnabled:false,curveSegments:10,steps:1});
  const p=perforated.attributes.position,n=perforated.attributes.normal;
  for(let i=0;i<p.count;i++){const x=p.getX(i),a=p.getY(i)/radius,rr=radius+p.getZ(i);const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i);p.setXYZ(i,x,rr*Math.cos(a),rr*Math.sin(a));n.setXYZ(i,nx,-ny*Math.sin(a)+nz*Math.cos(a),ny*Math.cos(a)+nz*Math.sin(a));}
  perforated.computeBoundingSphere();place(jacket,perforated,materials.steel,[-.13,1.044,0]);
  tube(jacket,.286,.027,.24,[-.12,1.044,0],materials.edge);
  tube(jacket,.259,.027,.075,[4.255,1.044,0],materials.edge);
  cylinder(jacket,.218,.218,.35,[.08,1.044,0],materials.dark);
  const barrel=group('barrel','前端外观','FRONT EXTERIOR',[1.10,-.13,0]);
  cylinder(barrel,.091,.125,4.5,[2.16,1.044,0],materials.dark);
  tube(barrel,.118,.039,.22,[4.49,1.044,0],materials.steel);
  // End is a visual recess only; no rifling or engineered internal profile.
  cylinder(barrel,.078,.078,.005,[4.47,1.044,0],materials.dark);
  const grips=group('grips','后部握持组件','REAR GRIPS',[-.90,.05,0]);
  box(grips,.18,.59,.57,.017,[-3.37,1.03,0],materials.steel);
  for(const z of [-.41,.41]){
    rod(grips,[-3.43,1.26,z*.53],[-3.72,1.26,z],.044,materials.edge);
    rod(grips,[-3.43,.80,z*.53],[-3.72,.80,z],.044,materials.edge);
    cylinder(grips,.083,.08,.63,[-3.77,1.035,z],materials.grip,'y');
    for(const y of [.73,1.34])cylinder(grips,.095,.095,.045,[-3.77,y,z],materials.edge,'y');
    for(let j=0;j<12;j++)tube(grips,.084,.004,.007,[-3.77,.78+j*.046,z],materials.dark,'y');
  }
  const sight=group('sight','瞄具外观候选','SIGHT STUDY',[0,.68,-.54]);
  box(sight,.25,.065,.25,.015,[-1.12,1.49,-.09],materials.edge);
  rod(sight,[-1.12,1.52,-.09],[-1.12,1.87,-.09],.023,materials.edge);
  const ring=place(sight,new T.TorusGeometry(.175,.012,8,48),materials.edge,[-1.12,1.94,-.09],[0,Math.PI/2,0]);
  rod(sight,[-1.12,1.77,-.09],[-1.12,2.11,-.09],.007,materials.edge);
  rod(sight,[-1.12,1.94,-.255],[-1.12,1.94,.075],.007,materials.edge);
  const mount=group('mount','机载支架外观候选','AIRCRAFT MOUNT',[0,-.90,0]);
  cylinder(mount,.43,.47,.13,[-.69,-.02,0],materials.olive,'y');
  cylinder(mount,.31,.30,.21,[-.69,.13,0],materials.olive,'y');
  // Two open triangular exterior webs inspired by a museum display; no certified mounting interface.
  for(const z of [-.36,.36]){
    const sh=new T.Shape();sh.moveTo(-1.12,.21);sh.lineTo(-.07,.21);sh.lineTo(-.29,.79);sh.lineTo(-.87,.79);sh.closePath();
    const h=new T.Path();h.moveTo(-.86,.34);h.lineTo(-.31,.34);h.lineTo(-.43,.64);h.lineTo(-.75,.64);h.closePath();sh.holes.push(h);
    const geo=new T.ExtrudeGeometry(sh,{depth:.075,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:2});
    place(mount,geo,materials.olive,[0,0,z-.038]);
    for(const x of [-.84,-.32])cylinder(mount,.056,.056,.10,[x,.74,z],materials.edge,'z');
  }
  box(mount,1.17,.10,.83,.02,[-.63,.238,0],materials.olive);
  rod(mount,[-.94,.72,-.41],[-.94,.72,.41],.057,materials.edge);
  const feed=group('feed','供弹外观与箱体','FEED VISUAL',[-.35,.12,1.15]);
  box(feed,1.07,.72,.72,.026,[-1.90,.20,1.24],materials.olive);
  box(feed,1.12,.055,.78,.014,[-1.90,.587,1.24],materials.olive);
  for(const x of [-2.25,-1.55])box(feed,.052,.58,.028,.006,[x,.20,1.615],materials.edge);
  rod(feed,[-2.11,.64,1.25],[-2.11,.74,1.25],.018,materials.edge);
  rod(feed,[-2.11,.74,1.25],[-1.70,.74,1.25],.018,materials.edge);
  rod(feed,[-1.70,.74,1.25],[-1.70,.64,1.25],.018,materials.edge);
  function roundGeometry(empty=false){const pts=[];for(let i=0;i<=32;i++){const t=i/32;let r;if(empty)r=.060;else r=t<.66?.061:t<.77?.061-(t-.66)*.16:.043*Math.pow((1-t)/.23,.70);pts.push(new T.Vector2(Math.max(.002,r),t*.48-.24));}return new T.LatheGeometry(pts,14);}
  const cartridgeGeo=roundGeometry(),caseGeo=roundGeometry(true);const linkGeo=new T.TorusGeometry(.069,.013,5,12,Math.PI*1.6);
  const rounds=new T.InstancedMesh(cartridgeGeo,materials.brass,25),links=new T.InstancedMesh(linkGeo,materials.steel,50);
  const tips=new T.InstancedMesh(new T.SphereGeometry(.044,10,8),materials.copper,25);
  for(const m of [rounds,links,tips]){m.castShadow=true;m.userData.part=feed.name;feed.add(m);pickables.push(m);}
  const matrix=new T.Matrix4(),q=new T.Quaternion().setFromAxisAngle(V(0,0,1),-Math.PI/2),scale=V(1,1,1),color=new T.Color();
  function beltPoint(s){return V(-1.09-.55*s,1.36+.26*Math.sin(Math.PI*s)-.65*s*s,.38+1.04*s);}
  function updateFeed(phase){for(let i=0;i<25;i++){const s=((i+phase)%25)/24.5,p=beltPoint(s);matrix.compose(p,q,scale);rounds.setMatrixAt(i,matrix);color.set(i%5===4?0xb1a178:0xbbb18e);rounds.setColorAt(i,color);const tip=p.clone().add(V(.207,0,0));matrix.compose(tip,q,V(.9,1.45,.9));tips.setMatrixAt(i,matrix);tips.setColorAt(i,color.set(i%5===4?0xd85036:0x9d6650));for(let j=0;j<2;j++){matrix.compose(p.clone().add(V(j?-.09:.045,0,0)),new T.Quaternion().setFromAxisAngle(V(0,1,0),Math.PI/2),scale);links.setMatrixAt(i*2+j,matrix);}}rounds.instanceMatrix.needsUpdate=true;links.instanceMatrix.needsUpdate=true;tips.instanceMatrix.needsUpdate=true;if(rounds.instanceColor)rounds.instanceColor.needsUpdate=true;if(tips.instanceColor)tips.instanceColor.needsUpdate=true;}
  updateFeed(0);
  for(const g of parts)g.userData.rest.copy(g.position);
  return {root,parts,pickables,updateFeed,caseGeo,linkGeo,muzzle:V(4.62,1.044,0),setSpread(t){const s=t*t*(3-2*t);for(const g of parts)g.position.copy(g.userData.rest).addScaledVector(g.userData.spread,s);},geometryStats(){let vertices=0,triangles=0;root.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});return {vertices,triangles,parts:parts.length};}};
}
