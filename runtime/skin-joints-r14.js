import * as THREE from 'three';

// Reusable geometry in the caller's units. No aircraft coordinates or source textures.
export function samplePath(points,pitch,margin=0){
  if(!Number.isFinite(pitch)||!(pitch>0)||!Number.isFinite(margin)||margin<0||points.length<2||points.some(p=>p.length!==3||p.some(v=>!Number.isFinite(v))))throw Error('Invalid row spacing/path');
  const p=points.map(v=>new THREE.Vector3(...v)),lengths=[0];
  for(let i=1;i<p.length;i++)lengths.push(lengths[i-1]+p[i].distanceTo(p[i-1]));
  const length=lengths.at(-1),out=[];let segment=1;
  if(length/pitch>100000)throw Error('Row exceeds sampling budget');
  const closed=p[0].distanceTo(p.at(-1))<1e-9;
  for(let s=margin;s<=length-margin+1e-8;s+=pitch){
    while(segment<lengths.length-1&&lengths[segment]<s)segment++;
    const span=lengths[segment]-lengths[segment-1];if(span<1e-9)continue;
    if(closed&&s>=length-1e-8)break;
    out.push({s,point:p[segment-1].clone().lerp(p[segment],(s-lengths[segment-1])/span)});
  }return out;
}
export function jointRows(joint){
  if(joint.type==='moving-boundary')return [];
  if(!['lap','backed-butt','stiffener'].includes(joint.type))throw Error('Unknown joint type');
  if(!joint.members||joint.members.length<2)throw Error('Joint needs connected members');
  if(!joint.evidence)throw Error('Joint needs evidence classification');
  return joint.rows.flatMap((row,i)=>samplePath(row.path,row.pitch,row.margin||0).map((p,n)=>({...p,id:joint.id+'/row-'+i+'/rivet-'+n,members:row.members||joint.members})));
}
export function rivetProfile({D=3.175,grip=4,head='raised',sink=1}){
  if(!(D>0)||!(grip>0)||!['raised','flush'].includes(head)||sink<0||head==='flush'&&sink>=grip)throw Error('Invalid rivet profile');
  const r=D/2,s=D*.75,h=D*.5;
  const k=D/3.175,lower=[[0,-h],[s*.87,-h],[s,-h*.86],[s,-.12*k],[s*.92,0],[r,0]];
  return head==='flush'?[...lower,[r,grip-sink],[r+sink*Math.tan(50*Math.PI/180),grip],[0,grip]]:
    [...lower,[r,grip],[r*1.6,grip],[r*1.76,grip+.12*k],[r*1.7,grip+.45*k],[r*1.4,grip+.95*k],[r*.8,grip+1.45*k],[0,grip+1.6*k]];
}
export function rivetGeometry(parameters,segments=32){
  const g=new THREE.LatheGeometry(rivetProfile(parameters).map(v=>new THREE.Vector2(...v)),segments);g.rotateX(Math.PI/2);return g;
}
// True through holes, with a conical mouth only on the outer face of a thick sheet.
export function plateGeometry({x0,x1,y0=-25,y1=25,t=2,holes=[],D=3.175,sink=0,segments=48}){
  const r=D/2,rt=r+sink*Math.tan(50*Math.PI/180);
  if(sink<0||sink>=t)throw Error('Countersink must leave cylindrical wall');
  for(const h of holes){if(Math.min(h.x-x0,x1-h.x,h.y-y0,y1-h.y)<=rt)throw Error('Hole crosses sheet edge');}
  for(let i=0;i<holes.length;i++)for(let j=0;j<i;j++)if(Math.hypot(holes[i].x-holes[j].x,holes[i].y-holes[j].y)<=2*rt)throw Error('Overlapping holes');
  const outer=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],positions=[];
  const tri=(a,b,c)=>positions.push(...a,...b,...c);
  const circle=(h,radius)=>Array.from({length:segments},(_,i)=>{const a=-2*Math.PI*i/segments;return [h.x+Math.cos(a)*radius,h.y+Math.sin(a)*radius];});
  for(const [z,radius,flip] of [[0,r,true],[t,rt,false]]){
    const rings=holes.map(h=>circle(h,radius)),all=[...outer,...rings.flat()];
    const faces=THREE.ShapeUtils.triangulateShape(outer.map(v=>new THREE.Vector2(...v)),rings.map(ring=>ring.map(v=>new THREE.Vector2(...v))));
    for(const f of faces){const v=f.map(i=>[...all[i],z]);if(flip)v.reverse();tri(...v);}
  }
  for(let i=0;i<4;i++){const a=outer[i],b=outer[(i+1)%4];tri([...a,0],[...b,0],[...b,t]);tri([...a,0],[...b,t],[...a,t]);}
  for(const h of holes){const levels=sink?[[0,r],[t-sink,r],[t,rt]]:[[0,r],[t,r]];
    for(let j=1;j<levels.length;j++){const a=circle(h,levels[j-1][1]),b=circle(h,levels[j][1]);for(let i=0;i<segments;i++){const k=(i+1)%segments;tri([...a[i],levels[j-1][0]],[...a[k],levels[j-1][0]],[...b[k],levels[j][0]]);tri([...a[i],levels[j-1][0]],[...b[k],levels[j][0]],[...b[i],levels[j][0]]);}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
export function couponDefinition(type='lap',head='raised'){
  const parameters={D:3.175,t:2,grip:4,head,sink:head==='flush'?1:0};
  const xs=type==='backed-butt'?[-7,7]:[0];
  const joint={id:'sample-'+type,type,members:type==='lap'?['upper-sheet','lower-sheet']:type==='backed-butt'?['left-sheet','right-sheet','backing']:['skin','stiffener'],evidence:'illustrative-geometry',rows:xs.map(x=>({path:[[x,-20,0],[x,20,0]],pitch:10,margin:0}))};
  if(type==='backed-butt')joint.rows.forEach((row,i)=>row.members=[i===0?'left-sheet':'right-sheet','backing']);
  const rivets=jointRows(joint),holes=rivets.map(r=>({x:r.point.x,y:r.point.y,id:r.id}));
  let plates=[];
  if(type==='lap')plates=[{id:'upper-sheet',x0:-38,x1:8,z:2,holes,outer:true,layer:1},{id:'lower-sheet',x0:-8,x1:38,z:0,holes,outer:false,layer:-1}];
  if(type==='backed-butt')plates=[{id:'left-sheet',x0:-38,x1:-.15,z:2,holes:holes.filter(h=>h.x<0),outer:true,layer:1},{id:'right-sheet',x0:.15,x1:38,z:2,holes:holes.filter(h=>h.x>0),outer:true,layer:1},{id:'backing',x0:-14,x1:14,z:0,holes,outer:false,layer:-1}];
  if(type==='stiffener')plates=[{id:'skin',x0:-38,x1:38,z:2,holes,outer:true,layer:1},{id:'stiffener',x0:-8,x1:8,z:0,holes,outer:false,layer:-1}];
  joint.units='mm';return {parameters,joint,rivets,plates};
}
export function disposeGroup(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of [].concat(o.material))materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();}

// Surface-only renderer: the original aircraft remains intact. A surface adapter returns
// a point and outward normal or null. Missing regions break seams and suppress fasteners.
export function surfaceJointLayer({joints,surface,D=.003175,color=0x767c67}){
  const group=new THREE.Group(),normalAxis=new THREE.Vector3(0,0,1),dummy=new THREE.Object3D(),placed=[],seamPositions=[];let missed=0;
  for(const joint of joints){
    for(const p of jointRows(joint)){const hit=surface(p.point);if(!hit){missed++;continue;}placed.push({...p,...hit});}
    for(const path of joint.seams||[]){const samples=samplePath(path,.012);let previous=null;for(const s of samples){const hit=surface(s.point);if(!hit){previous=null;continue;}const point=hit.point.clone().addScaledVector(hit.normal,.00025);if(previous&&point.distanceTo(previous)<.035)seamPositions.push(...previous.toArray(),...point.toArray());previous=point;}}
  }
  // Exterior head only: no hidden shank/shop-head is claimed inside the source shell.
  const rg=new THREE.LatheGeometry([[0,0],[D*.7,0],[D*.85,D*.1],[D*.72,D*.3],[D*.4,D*.45],[0,D*.5]].map(v=>new THREE.Vector2(...v)),12);rg.rotateX(Math.PI/2);
  const material=new THREE.MeshStandardMaterial({color,metalness:.62,roughness:.46});
  const heads=new THREE.InstancedMesh(rg,material,placed.length);
  placed.forEach((p,i)=>{dummy.position.copy(p.point).addScaledVector(p.normal,.0002);dummy.quaternion.setFromUnitVectors(normalAxis,p.normal);dummy.scale.setScalar(1);dummy.updateMatrix();heads.setMatrixAt(i,dummy.matrix);});heads.instanceMatrix.needsUpdate=true;heads.computeBoundingSphere();group.add(heads);
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(seamPositions,3));const seams=new THREE.LineSegments(sg,new THREE.LineBasicMaterial({color:0x292f26,transparent:true,opacity:.65}));group.add(seams);
  const center=new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());let enabled=true;
  return {group,placed,missed,center,setVisible:v=>{enabled=v;group.visible=v;},update:camera=>{heads.visible=camera.position.distanceTo(center)<9;group.visible=enabled;},stats:()=>({rivets:placed.length,missed,seamSegments:seamPositions.length/6,headsVisible:heads.visible,visible:group.visible,maxAddedDrawCalls:2}),dispose:()=>disposeGroup(group)};
}
