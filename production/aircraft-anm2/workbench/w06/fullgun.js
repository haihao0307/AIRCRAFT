/* Aircraft AN/M2 W06 independent EXTERIOR appearance recipe.
 * All coordinates are normalized display/reference units from visual fitting.
 * No source vertices, triangle/index tables, UV arrays, fabrication dimensions,
 * functional internals, threads, or ammunition physics are retained here.
 */
const FullGunRecipe=(()=>{
  const VERSION='aircraft.anm2.exterior.w06.1';
  const CORE_BOUNDS=Object.freeze({min:[-.527,-.086,-.077],max:[.980,.078,.139]});
  const bodyRivets=Object.freeze({
    rowX:[-.43254,-.40084,-.36916,-.33746,-.30577,-.27408,-.24239,-.21070],
    frontX:[-.10112,-.08464,-.06815,-.05168,-.03520],
    topBottomY:{top:.05018,bottom:-.05092},
    z:{right:.03148,left:-.04556,leftTop:-.04466},
    frontY:-.03303,
    frontZ:{right:.02560,left:-.03992}
  });
  const SIDEPLATE=Object.freeze({
    x0:-.4426,x1:-.1718,y0:-.0384,y1:.0303,z0:.0190,z1:.0500,
    height:.2536482,mainFront:.0847598,noseFront:.0473129,shoulderX:.7750291,taperX:.8165937,corner:.013294,
    noseTop:.058365,noseBottom:-.073478,noseRound:.0155,slot:{left:.0603218,right:.9204203,radius:.0339651,y:-.0001602},
    longRelief:{start:.0756612,flatStart:.1164688,flatEnd:.4380257,end:.4788333,depth:.0593366,top:.0566957,bottom:-.0565176},
    shortRelief:{start:.5759504,end:.6834474,depth:.0593735,top:.0583648,bottom:-.0559120},
    heads:[
      {kind:'cap',p:[.0273464,.0967869,.0812174],r:.0156089,rise:.0080464},
      {kind:'cap',p:[.0273464,-.0603210,.0815128],r:.0156089,rise:.0080464},
      {kind:'cylinder',p:[.7234094,-.0815982,.0918616],r:.0253686},
      {kind:'hex',p:[.52873395,.06651207,.09146093],r:.0241596,h:.02218,phase:.211963},
      {kind:'hex',p:[.8097526,.06651198,.05232416],r:.0241596,h:.02218,phase:.712089}
    ]
  });
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
  function roundedRect(T,w,h,r){
    const s=new T.Shape();const x=w/2,y=h/2,rr=Math.min(r,x*.95,y*.95);
    s.moveTo(-x+rr,-y);s.lineTo(x-rr,-y);s.quadraticCurveTo(x,-y,x,-y+rr);s.lineTo(x,y-rr);s.quadraticCurveTo(x,y,x-rr,y);s.lineTo(-x+rr,y);s.quadraticCurveTo(-x,y,-x,y-rr);s.lineTo(-x,-y+rr);s.quadraticCurveTo(-x,-y,-x+rr,-y);return s;
  }
  function roundedBox(T,w,h,d,r){
    const s=roundedRect(T,Math.max(.0002,w-2*r),Math.max(.0002,h-2*r),r);const g=new T.ExtrudeGeometry(s,{depth:Math.max(.0002,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:4,steps:1});g.translate(0,0,-(d-2*r)/2);return g;
  }
  function cap(T,r,rise,segments=24){
    const R=(r*r+rise*rise)/(2*rise),pts=[];for(let i=0;i<=8;i++){const q=r*i/8;pts.push(new T.Vector2(q,rise-R+Math.sqrt(Math.max(0,R*R-q*q))));}pts.push(new T.Vector2(r,0),new T.Vector2(0,0));const g=new T.LatheGeometry(pts.reverse(),segments);g.rotateX(Math.PI/2);return g;
  }
  function cylinderX(T,r,len,segments=24){const g=new T.CylinderGeometry(r,r,len,segments,1,false);g.rotateZ(Math.PI/2);return g;}
  function cylinderY(T,r,len,segments=24){return new T.CylinderGeometry(r,r,len,segments,1,false);}
  function cylinderZ(T,r,len,segments=24){const g=new T.CylinderGeometry(r,r,len,segments,1,false);g.rotateX(Math.PI/2);return g;}
  function torusX(T,r,tube,radial=10,tubular=32){const g=new T.TorusGeometry(r,tube,radial,tubular);g.rotateY(Math.PI/2);return g;}
  function mesh(root,T,g,mat,name,p=[0,0,0],r=[0,0,0],s=[1,1,1],part='misc'){
    const m=new T.Mesh(g,mat);m.name=name;m.position.set(...p);m.rotation.set(...r);m.scale.set(...s);m.userData.part=part;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
  }
  function sideplateOuter(x){const P=SIDEPLATE,h=P.height/2,r=P.corner;if(x<r){const q=Math.sqrt(Math.max(0,r*r-(x-r)**2));return[-h+r-q,h-r+q];}if(x<P.taperX)return[-h,h];const e=1-P.noseRound,t=clamp((x-P.taperX)/(e-P.taperX),0,1),lo=mix(-h,P.noseBottom-P.noseRound,.2*t+.8*t*t),hi=mix(h,P.noseTop+P.noseRound,.2*t+.8*t*t);if(x<=e)return[lo,hi];const q=Math.sqrt(Math.max(0,P.noseRound**2-(x-e)**2));return[P.noseBottom-q,P.noseTop+q];}
  function sideplateSlot(x){const s=SIDEPLATE.slot;if(x<s.left-s.radius||x>s.right+s.radius)return[s.y,s.y];const dx=x<s.left?x-s.left:x>s.right?x-s.right:0,q=Math.sqrt(Math.max(0,s.radius*s.radius-dx*dx));return[s.y-q,s.y+q];}
  function sideplateRelief(x){const P=SIDEPLATE,a=P.longRelief,b=P.shortRelief;if(x>a.start&&x<a.end){let f=1;if(x<a.flatStart){const t=(x-a.start)/(a.flatStart-a.start);f=Math.sqrt(Math.max(0,1-(1-t)**2));}if(x>a.flatEnd){const t=(a.end-x)/(a.end-a.flatEnd);f=Math.sqrt(Math.max(0,1-(1-t)**2));}return{z:mix(P.mainFront,a.depth,f),top:a.top,bottom:a.bottom};}if(x>b.start&&x<b.end){const t=(x-b.start)/(b.end-b.start);return{z:mix(P.mainFront,b.depth,Math.sqrt(Math.max(0,1-(2*t-1)**2))),top:b.top,bottom:b.bottom};}return{z:P.mainFront,top:a.top,bottom:a.bottom};}
  function sideplateGeometry(T){
    const P=SIDEPLATE,verts=[];const tri=(a,b,c)=>verts.push(...a,...b,...c),quad=(a,b,c,d)=>{tri(a,b,c);tri(a,c,d);};
    const key=[0,P.corner,P.taperX,1-P.noseRound,1,P.longRelief.start,P.longRelief.flatStart,P.longRelief.flatEnd,P.longRelief.end,P.shortRelief.start,(P.shortRelief.start+P.shortRelief.end)/2,P.shortRelief.end,P.slot.left-P.slot.radius,P.slot.left,P.slot.right,P.slot.right+P.slot.radius].filter(x=>x>=0&&x<=1).sort((a,b)=>a-b);
    const xs=[];for(let i=0;i<key.length-1;i++){const a=key[i],b=key[i+1];for(let j=0;j<Math.max(1,Math.ceil((b-a)*34));j++)xs.push(mix(a,b,j/Math.max(1,Math.ceil((b-a)*34))));}xs.push(1);
    const band=x=>{const o=sideplateOuter(x),hole=sideplateSlot(x),q=sideplateRelief(x),ym=clamp(q.bottom,o[0],hole[0]),yp=clamp(q.top,hole[1],o[1]);return{o,hole,low:[o[0],ym,hole[0]],high:[hole[1],yp,o[1]],z:q.z};};
    for(let i=0;i<xs.length-1;i++){const x0=xs[i],x1=xs[i+1],a=band(x0),b=band(x1);for(const name of ['low','high'])for(let k=0;k<2;k++){const za=k===0?a.z:0,zb=k===0?b.z:0;quad([x0,a[name][k],za],[x1,b[name][k],zb],[x1,b[name][k+1],zb],[x0,a[name][k+1],za]);}quad([x0,a.o[0],0],[x1,b.o[0],0],[x1,b.o[0],b.z],[x0,a.o[0],a.z]);quad([x0,a.o[1],a.z],[x1,b.o[1],b.z],[x1,b.o[1],0],[x0,a.o[1],0]);if(x0>=P.slot.left-P.slot.radius-1e-8&&x1<=P.slot.right+P.slot.radius+1e-8){quad([x0,a.hole[0],a.z],[x1,b.hole[0],b.z],[x1,b.hole[0],0],[x0,a.hole[0],0]);quad([x0,a.hole[1],0],[x1,b.hole[1],0],[x1,b.hole[1],b.z],[x0,a.hole[1],a.z]);}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.computeVertexNormals();return g;
  }
  function build(T,materials){
    const root=new T.Group();root.name='ANM2_NATIVE_W06';const parts=new Map(),pick=[];const role=(name)=>materials[name]||materials.steel;
    function part(id,label){const g=new T.Group();g.name=id;g.userData={id,label};root.add(g);parts.set(id,g);return g;}
    function add(p,g,mat,name,pos,rot,scale){const m=mesh(p,T,g,mat,name,pos,rot,scale,p.name);pick.push(m);return m;}
    const receiver=part('receiver','机匣主体');
    add(receiver,roundedBox(T,.5362,.1383,.1026,.0065),role('steel'),'receiver-shell',[-.19284,.00219,-.0086]);
    add(receiver,roundedBox(T,.1370,.0140,.0302,.003),role('edge'),'top-plate',[-.3657,.0709,-.0065]);
    add(receiver,roundedBox(T,.034,.018,.078,.003),role('edge'),'front-step',[.058,.056,-.006]);
    const sideplate=part('sideplate','侧板与可见头部');
    const sg=sideplateGeometry(T),sx=SIDEPLATE.x1-SIDEPLATE.x0,sy=(SIDEPLATE.y1-SIDEPLATE.y0)/SIDEPLATE.height,sz=(SIDEPLATE.z1-SIDEPLATE.z0)/.10;
    add(sideplate,sg,role('panel'),'sideplate-shell',[SIDEPLATE.x0,(SIDEPLATE.y0+SIDEPLATE.y1)/2,SIDEPLATE.z0],[0,0,0],[sx,sy,sz]);
    for(let i=0;i<SIDEPLATE.heads.length;i++){const h=SIDEPLATE.heads[i];let g;if(h.kind==='cap')g=cap(T,h.r,h.rise,28);else if(h.kind==='cylinder')g=cylinderZ(T,h.r,h.r*2,24);else{g=new T.CylinderGeometry(h.r,h.r*.92,h.h,6,1,false);g.rotateX(Math.PI/2);g.rotateZ(h.phase);}const px=SIDEPLATE.x0+h.p[0]*sx,py=(SIDEPLATE.y0+SIDEPLATE.y1)/2+h.p[1]*sy,pz=SIDEPLATE.z0+h.p[2]*sz;add(sideplate,g,role('fastener'),`sideplate-head-${i}`,[px,py,pz]);}
    const rivet=cap(T,.00425,.00225,16);const addR=(x,y,z,n)=>add(receiver,rivet,role('fastener'),n,[x,y,z]);
    for(const x of bodyRivets.rowX){addR(x,bodyRivets.topBottomY.top,bodyRivets.z.right,`rivet-r-top-${x}`);addR(x,bodyRivets.topBottomY.bottom,bodyRivets.z.right,`rivet-r-bottom-${x}`);addR(x,bodyRivets.topBottomY.top,bodyRivets.z.leftTop,`rivet-l-top-${x}`);addR(x,bodyRivets.topBottomY.bottom,bodyRivets.z.left,`rivet-l-bottom-${x}`);}
    for(const x of bodyRivets.frontX){addR(x,bodyRivets.frontY,bodyRivets.frontZ.right,`rivet-r-front-${x}`);addR(x,bodyRivets.frontY,bodyRivets.frontZ.left,`rivet-l-front-${x}`);}
    for(const [x,y,z] of [[.06631,.05592,.02562],[.05301,.06002,.02562],[.06631,.03868,.02562],[.06631,.05592,-.03968],[.05301,.06002,-.03968],[.06631,.03868,-.03968],[-.45352,.06607,.01509],[-.45352,.06607,-.02924]])addR(x,y,z,`rivet-extra-${x}-${y}-${z}`);
    add(receiver,cap(T,.00877,.0046,20),role('fastener'),'top-round-head',[-.14674,.0748,.00445]);
    const reverse=part('reverse','反侧板外观');
    const zL=-.0602,dark=role('dark');
    add(reverse,roundedBox(T,.286,.027,.004,.012),dark,'reverse-long-slot',[-.258,.012,zL]);
    for(const [x,w] of [[-.20,.066],[-.050,.071]]){add(reverse,roundedBox(T,w,.032,.004,.002),role('edge'),`reverse-port-frame-${x}`,[x,-.018,zL]);add(reverse,roundedBox(T,w*.62,.012,.006,.001),dark,`reverse-port-${x}`,[x,-.018,zL-.002]);}
    for(const x of [-.355,-.118]){add(reverse,roundedBox(T,.018,.033,.006,.002),role('edge'),`reverse-latch-${x}`,[x,-.002,zL]);add(reverse,roundedBox(T,.018,.010,.008,.002),role('fastener'),`reverse-latch-cap-${x}`,[x,.020,zL]);}
    const grips=part('grips','后部握持组');
    for(const z of [-.0604,.0529]){add(grips,cylinderY(T,.01475,.0987,24),role('grip'),'grip-column',[-.496,.0075,z]);add(grips,cylinderY(T,.01625,.0044,24),role('edge'),'grip-top',[-.496,.063,z]);add(grips,cylinderY(T,.01625,.0044,24),role('edge'),'grip-bottom',[-.496,-.0473,z]);}
    for(const y of [.0581,-.0425])add(grips,roundedBox(T,.0655,.0062,.1466,.003),role('edge'),`grip-bridge-${y}`,[-.4806,y,-.004]);
    add(grips,cylinderX(T,.024,.056,24),role('dark'),'rear-center-tube',[-.489,.006,-.004]);
    const handle=part('sidehandle','侧部握持组');
    add(handle,cylinderZ(T,.0147,.0891,24),role('grip'),'side-handle',[-.2478,.0473,.0949]);
    add(handle,roundedBox(T,.0461,.0835,.0115,.004),role('edge'),'side-handle-bracket',[-.2589,.0181,.0464]);
    add(handle,cap(T,.008,.004,16),role('fastener'),'side-handle-cap',[-.259,-.0043,.0567]);
    const controls=part('controls','后部可见小组件');
    add(controls,roundedBox(T,.0806,.0379,.0379,.004),role('edge'),'rear-trigger-shape',[-.4864,.0034,-.0063]);
    add(controls,cap(T,.0187,.006,20),role('fastener'),'rear-button',[-.471,.058,.0],[Math.PI/2,0,0]);
    const front=part('front','前部环件与枪管');
    add(front,torusX(T,.034,.0065,12,36),role('edge'),'front-ring',[.0987,-.0132,-.004]);
    add(front,cylinderX(T,.023,.055,28),role('steel'),'barrel-root',[.099,-.0132,-.004]);
    add(front,cylinderX(T,.01175,.900,28),role('barrel'),'inner-barrel',[.527,-.0004,-.0034]);
    add(front,cylinderX(T,.02635,.535,36),role('barrel'),'jacket-shell',[.650,-.0004,-.0034]);
    const rows=[Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4];
    for(let ri=0;ri<rows.length;ri++){const theta=rows[ri],shift=(ri%2)*.022;for(let j=0;j<11;j++){const x=.407+j*.048+shift;if(x>.897)continue;const y=-.0004+Math.cos(theta)*.02645,z=-.0034+Math.sin(theta)*.02645;const ring=add(front,new T.TorusGeometry(.00615,.00105,7,20),role('edge'),`jacket-hole-ring-${ri}-${j}`,[x,y,z]);ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(0,Math.cos(theta),Math.sin(theta)));const disk=add(front,new T.CircleGeometry(.00555,18),dark,`jacket-hole-dark-${ri}-${j}`,[x,y,z]);disk.quaternion.copy(ring.quaternion);disk.translateZ(-.0004);}}
    add(front,cylinderX(T,.0319,.0267,32),role('edge'),'front-collar',[.9256,-.00034,-.0034]);
    add(front,cylinderX(T,.0139,.030,28),role('edge'),'muzzle-tip',[.965,-.00034,-.0034]);
    add(front,cylinderX(T,.0074,.032,24),dark,'muzzle-recess',[.979,-.00034,-.0034]);
    for(const z of [-.0224,.0077]){const lug=add(receiver,roundedBox(T,.0332,.0248,.0149,.003),role('edge'),`bottom-lug-${z}`,[-.272,-.0731,z]);lug.rotation.z=.04;}
    root.updateMatrixWorld(true);
    const partList=[...parts.values()];for(const p of partList)p.userData.rest={position:p.position.toArray(),rotation:p.rotation.toArray().slice(0,3)};
    return {root,parts:partList,pick,version:VERSION,bounds:CORE_BOUNDS,setPartVisibility(id,visible){const p=parts.get(id);if(!p)throw Error('Unknown part');p.visible=visible;},showOnly(id){for(const [k,p] of parts)p.visible=id===null||k===id;},showAll(){for(const p of parts.values())p.visible=true;},stats(){let tris=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;tris+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return{parts:parts.size,meshes,triangles:Math.round(tris)};}};
  }
  return Object.freeze({build,VERSION,CORE_BOUNDS,sideplate:SIDEPLATE,rivets:bodyRivets});
})();
