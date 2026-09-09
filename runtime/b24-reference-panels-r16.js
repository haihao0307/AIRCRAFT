import * as THREE from 'three';

// Fresh reading of Airfix A09011, PDF pp8/17/18 (2026-09-08).
// Span stations are registered approximately to the source wing. Chord fractions
// run leading -> trailing edge. These are panel candidates, not manufacturing data.
export const PANEL_REFERENCE={
  source:'Airfix A09011 B-24D instructions, PDF pages 8,17,18',
  calibration:'approximate span/chord registration; original aircraft arrays retained',
  upper:[
    ['root-long',[1.32,.40],[3.54,.40]],
    ['inner-joint-a',[3.54,.015],[3.54,.70]],['inner-joint-b',[3.95,.015],[3.95,.70]],
    ['middle-front',[3.95,.28],[8.26,.28]],['middle-aft',[3.95,.47],[8.26,.47]],
    ['outer-joint-a',[8.26,.015],[8.26,.70]],['outer-joint-b',[8.42,.015],[8.42,.70]],
    ['aileron-station',[9.55,.015],[9.55,.70]],
    ['outer-long',[9.55,.39],[13.31,.39]],['outer-cross',[13.31,.015],[13.31,.70]],
    ['tip-joint-a',[15.90,.02],[15.90,.98]],['tip-joint-b',[16.16,.05],[16.16,.95]],
    ['aft-fixed-edge',[1.32,.70],[15.90,.70],'boundary']
  ],
  lower:[
    ['lower-front',[1.32,.28],[8.26,.28]],['lower-middle',[1.32,.49],[15.9,.49]],
    ['lower-aft',[1.32,.69],[15.9,.69],'boundary'],
    ['lower-inner',[2.12,.05],[2.12,.69]],['lower-bay-a',[4.42,.28],[4.42,.69]],
    ['lower-bay-b',[5.23,.03],[5.23,.69]],['lower-middle-cross',[6.27,.28],[6.27,.69]],
    ['lower-outer-joint',[8.26,.025],[8.26,.69]],['lower-outer-a',[9.7,.025],[9.7,.69]],
    ['lower-outer-b',[11.57,.025],[11.57,.69]],['lower-outer-c',[13.67,.025],[13.67,.69]],
    ['lower-tip-a',[15.90,.02],[15.90,.98]],['lower-tip-b',[16.16,.05],[16.16,.95]]
  ]
};

function sectionAt(triangles,x){
  let leading=-Infinity,trailing=Infinity;
  for(const tri of triangles)for(let k=0;k<3;k++){
    const a=tri[k],b=tri[(k+1)%3];if(Math.abs(b.x-a.x)<1e-8)continue;
    const t=(x-a.x)/(b.x-a.x);if(t>=0&&t<=1){const z=a.z+(b.z-a.z)*t;leading=Math.max(leading,z);trailing=Math.min(trailing,z);}
  }
  if(!Number.isFinite(leading))throw new Error('Missing wing section at '+x);
  return {leading,trailing};
}
const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=THREE.MathUtils.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};

export function createReferencePanels(skinSystem){
  const bounds=[.8,16.55,-3.05,1.5],width=128,height=48,sections=new Map();
  function mapped(p){const x=p[0];if(!sections.has(x))sections.set(x,sectionAt(skinSystem.wingTriangles,x));const s=sections.get(x);return [x,THREE.MathUtils.lerp(s.leading,s.trailing,p[1])];}
  const tables={},textures=[],audit={source:PANEL_REFERENCE.source,regions:{},numericTextureBytes:0,retiredInputUsed:false};
  for(const [name,definitions] of [['upper',PANEL_REFERENCE.upper],['lower',PANEL_REFERENCE.lower]]){
    const lines=[];
    for(const [id,a,b,kind='panel'] of definitions){
      const n=Math.max(1,Math.ceil(Math.abs(b[0]-a[0])/1.4));let arc=0;
      for(let j=0;j<n;j++){
        const p=mapped([THREE.MathUtils.lerp(a[0],b[0],j/n),THREE.MathUtils.lerp(a[1],b[1],j/n)]),q=mapped([THREE.MathUtils.lerp(a[0],b[0],(j+1)/n),THREE.MathUtils.lerp(a[1],b[1],(j+1)/n)]);
        lines.push({id,a:p,b:q,kind,arc,first:j===0,last:j===n-1});arc+=Math.hypot(q[0]-p[0],q[1]-p[1]);
      }
    }
    const lookup=new Float32Array(lines.length*8);
    lines.forEach((l,i)=>{lookup.set([...l.a,...l.b],i*4);lookup.set([l.kind==='panel'?1:0,l.arc,l.first?1:0,l.last?1:0],(lines.length+i)*4);});
    const table=new THREE.DataTexture(lookup,lines.length,2,THREE.RGBAFormat,THREE.FloatType);table.needsUpdate=true;
    const cells=new Uint8Array(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const p=[bounds[0]+(x+.5)/width*(bounds[1]-bounds[0]),bounds[2]+(y+.5)/height*(bounds[3]-bounds[2])];
      const ids=lines.map((l,i)=>({i,d:segmentDistance(p,l.a,l.b)})).sort((a,b)=>a.d-b.d).slice(0,4).map(l=>l.i+1);cells.set(ids,(y*width+x)*4);
    }
    // Verify candidate lookup in the only region where it affects visible detail.
    let misses=0,maxError=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(const [u,v] of [[.05,.05],[.95,.05],[.05,.95],[.95,.95]]){
      const p=[bounds[0]+(x+u)/width*(bounds[1]-bounds[0]),bounds[2]+(y+v)/height*(bounds[3]-bounds[2])];
      const distances=lines.map(l=>segmentDistance(p,l.a,l.b)),actual=Math.min(...distances),candidate=Math.min(...Array.from(cells.subarray((y*width+x)*4,(y*width+x+1)*4),i=>distances[i-1]));
      if(actual<.05&&candidate-actual>.001){misses++;maxError=Math.max(maxError,candidate-actual);}
    }
    if(misses)throw new Error('Panel candidate cache misses '+name+': '+misses);
    const grid=new THREE.DataTexture(cells,width,height,THREE.RGBAFormat,THREE.UnsignedByteType);grid.needsUpdate=true;
    tables[name]={table,grid,count:lines.length};textures.push(table,grid);audit.numericTextureBytes+=lookup.byteLength+cells.byteLength;
    audit.regions[name]={definitions,lines,lookupMisses:misses,maxError};
  }
  const uniforms={wpUpper:{value:tables.upper.table},wpLower:{value:tables.lower.table},wpUpperGrid:{value:tables.upper.grid},wpLowerGrid:{value:tables.lower.grid},wpCounts:{value:new THREE.Vector2(tables.upper.count,tables.lower.count)},wpBounds:{value:new THREE.Vector4(...bounds)}};
  return {uniforms,audit,dispose:()=>textures.forEach(t=>t.dispose())};
}

export const PANEL_GLSL=`
uniform float wpSurface;
uniform sampler2D wpUpper,wpLower,wpUpperGrid,wpLowerGrid;
uniform vec2 wpCounts;uniform vec4 wpBounds;
vec3 wpDetail(vec2 p,float upper){
  vec2 uv=vec2((p.x-wpBounds.x)/(wpBounds.y-wpBounds.x),(p.y-wpBounds.z)/(wpBounds.w-wpBounds.z));
  vec4 ids=upper>.5?texture2D(wpUpperGrid,uv):texture2D(wpLowerGrid,uv);
  float n=upper>.5?wpCounts.x:wpCounts.y,fw=max(length(fwidth(p)),.00001);
  float seam=0.0,rivet=0.0;
  for(int i=0;i<4;i++){
    float id=floor(ids[i]*255.0+.5)-1.0;
    if(id<0.0)continue;
    vec2 tc=vec2((id+.5)/n,.25);
    vec4 s=upper>.5?texture2D(wpUpper,tc):texture2D(wpLower,tc);tc.y=.75;
    vec4 meta=upper>.5?texture2D(wpUpper,tc):texture2D(wpLower,tc);
    vec2 delta=s.zw-s.xy;float len=length(delta),along=dot(p-s.xy,delta)/len;
    float across=abs((p.x-s.x)*delta.y-(p.y-s.y)*delta.x)/len;
    float edge=length(vec2(across,max(max(-along,along-len),0.0)));
    seam=max(seam,(1.0-smoothstep(.0007,.002+fw,edge))*.003/(fw+.003));
    float stop=(meta.z>.5?.024:0.0),end=(meta.w>.5?len-.024:len);
    float phase=abs(fract((along+meta.y)/.033+.5)-.5)*.033;
    float rd=length(vec2(across-.019,phase));
    float dots=(1.0-smoothstep(.0014,.0027+fw*.5,rd))*(1.0-smoothstep(.0025,.009,fw));
    rivet=max(rivet,dots*meta.x*step(stop,along)*step(along,end));
  }
  return vec3(seam,rivet,.00065*rivet-.00035*seam);
}
`;
