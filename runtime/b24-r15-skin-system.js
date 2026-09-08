import * as THREE from 'three';
import {REFERENCE} from './b24-r7-reference.js';
import {isDetailSurface} from './b24-r10-detail-materials.js';

// V018 coordinates are retained: +Z nose, +X port, +Y up.
const FUSELAGE_IDS=[1654,1666,1678,1702,1714,1747,1760];
const lerp=THREE.MathUtils.lerp,clamp=THREE.MathUtils.clamp;
function interpolate(points,t,key='heightFraction'){
  const sorted=[...points].sort((a,b)=>a.lengthFraction-b.lengthFraction);
  if(t<=sorted[0].lengthFraction)return sorted[0][key];
  for(let i=1;i<sorted.length;i++)if(t<=sorted[i].lengthFraction){
    const a=sorted[i-1],b=sorted[i];return lerp(a[key],b[key],(t-a.lengthFraction)/(b.lengthFraction-a.lengthFraction));
  }
  return sorted.at(-1)[key];
}

function worldTriangles(meshes){
  const triangles=[];
  for(const mesh of meshes){
    const g=mesh.geometry,p=g.attributes.position,index=g.index;
    const vertices=Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
    for(let i=0;i<index.count;i+=3)triangles.push([vertices[index.getX(i)],vertices[index.getX(i+1)],vertices[index.getX(i+2)]]);
  }
  return triangles;
}

function section(triangles,axis,value){
  const points=[];
  for(const tri of triangles)for(let i=0;i<3;i++){
    const a=tri[i],b=tri[(i+1)%3],d=b[axis]-a[axis];
    if(Math.abs(d)<1e-10)continue;
    const t=(value-a[axis])/d;
    if(t>=0&&t<=1)points.push(a.clone().lerp(b,t));
  }
  if(!points.length)return null;
  return new THREE.Box3().setFromPoints(points);
}

// Numeric renderer cache, rasterized from unchanged world-space triangles.
// It is not an imported image, UV map, or a new geometric representation.
function envelope(triangles,bounds,width=192,height=64){
  const lo=new Float32Array(width*height).fill(Infinity),hi=new Float32Array(width*height).fill(-Infinity);
  const [xmin,xmax,zmin,zmax]=bounds,dx=(xmax-xmin)/(width-1),dz=(zmax-zmin)/(height-1);
  for(const [a,b,c] of triangles){
    const den=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
    if(Math.abs(den)<1e-12)continue;
    const ix0=clamp(Math.ceil((Math.min(a.x,b.x,c.x)-xmin)/dx),0,width-1);
    const ix1=clamp(Math.floor((Math.max(a.x,b.x,c.x)-xmin)/dx),0,width-1);
    const iz0=clamp(Math.ceil((Math.min(a.z,b.z,c.z)-zmin)/dz),0,height-1);
    const iz1=clamp(Math.floor((Math.max(a.z,b.z,c.z)-zmin)/dz),0,height-1);
    for(let iz=iz0;iz<=iz1;iz++)for(let ix=ix0;ix<=ix1;ix++){
      const x=xmin+ix*dx,z=zmin+iz*dz;
      const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den;
      const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;
      if(u<-.00001||v<-.00001||u+v>1.00001)continue;
      const y=u*a.y+v*b.y+(1-u-v)*c.y,k=iz*width+ix;
      lo[k]=Math.min(lo[k],y);hi[k]=Math.max(hi[k],y);
    }
  }
  const data=new Float32Array(width*height*4);
  for(let i=0;i<lo.length;i++)if(Number.isFinite(lo[i]))data.set([lo[i],hi[i],1,0],i*4);
  // One-cell edge extension prevents a sampling hole along silhouette edges.
  const raw=data.slice();
  for(let z=0;z<height;z++)for(let x=0;x<width;x++){
    const k=(z*width+x)*4;if(raw[k+2])continue;
    for(const [xx,zz] of [[x-1,z],[x+1,z],[x,z-1],[x,z+1]]){
      if(xx<0||xx>=width||zz<0||zz>=height)continue;
      const q=(zz*width+xx)*4;if(raw[q+2]){data.set(raw.subarray(q,q+4),k);break;}
    }
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;
  return {texture,data,width,height,bounds,bytes:data.byteLength};
}

function continuousMidplane(field){
  const {width,height,data}=field,columns=[];
  // Fit the smooth camber datum only to cells containing both sides of the wing.
  // Gear wells and open trailing edges can contain one skin only; using that
  // single surface as a midpoint would paint the upper skin gray.
  for(let x=0;x<width;x++){
    const a=Array.from({length:3},()=>[0,0,0,0]);let count=0;
    for(let z=0;z<height;z++){
      const k=(z*width+x)*4;if(!data[k+2]||data[k+1]-data[k]<.025)continue;
      const t=2*z/(height-1)-1,v=[1,t,t*t],mid=(data[k]+data[k+1])*.5;
      for(let i=0;i<3;i++){for(let j=0;j<3;j++)a[i][j]+=v[i]*v[j];a[i][3]+=v[i]*mid;}count++;
    }
    if(count<4){columns.push(null);continue;}
    let valid=true;
    for(let i=0;i<3;i++){
      let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;
      [a[i],a[pivot]]=[a[pivot],a[i]];
      const d=a[i][i];if(Math.abs(d)<1e-9){valid=false;break;}
      for(let k=i;k<4;k++)a[i][k]/=d;
      for(let j=0;j<3;j++)if(j!==i){const f=a[j][i];for(let k=i;k<4;k++)a[j][k]-=f*a[i][k];}
    }
    columns.push(valid?a.map(row=>row[3]):null);
  }
  for(let x=0;x<width;x++){
    let coeff=columns[x];
    if(!coeff)for(let d=1;d<width&&!coeff;d++)coeff=columns[x-d]||columns[x+d];
    if(!coeff)throw new Error('No two-sided wing samples for the paint datum');
    for(let z=0;z<height;z++){
      const t=2*z/(height-1)-1,mid=coeff[0]+coeff[1]*t+coeff[2]*t*t,k=(z*width+x)*4;
      data.set([mid,mid,1,0],k);
    }
  }
  field.texture.minFilter=field.texture.magFilter=THREE.LinearFilter;field.texture.needsUpdate=true;
  return field;
}

export function createSkinSystem(aircraft,renderer){
  const meshNode=id=>{const mesh=aircraft.meshes.find(m=>m.userData.sourceNode===id);if(!mesh)throw new Error('Missing skin node '+id);return mesh;};
  const refs=Object.fromEntries(REFERENCE.views.map(r=>[r.view,r]));
  const wingMeshes=[meshNode(1708),meshNode(1696)],wingTriangles=worldTriangles(wingMeshes);
  const shellTriangles=worldTriangles(FUSELAGE_IDS.map(meshNode)).filter(tri=>tri.every(v=>Math.abs(v.x)<1.4));
  const wingBounds=new THREE.Box3();wingMeshes.forEach(m=>wingBounds.union(new THREE.Box3().setFromObject(m)));
  const sourceBounds=new THREE.Box3().setFromObject(meshNode(1702));
  const nose=sourceBounds.max.z,tail=sourceBounds.min.z,length=nose-tail;
  const wingField=continuousMidplane(envelope(wingTriangles,[wingBounds.min.x,wingBounds.max.x,wingBounds.min.z,wingBounds.max.z]));
  const tailField=envelope(worldTriangles([meshNode(1717),meshNode(726),meshNode(729)]),[-3.45,3.45,-11.65,-9.03],96,192);
  tailField.texture.minFilter=tailField.texture.magFilter=THREE.LinearFilter;
  const controlFields=new Map();
  for(const id of [570,575,829,836]){
    const mesh=meshNode(id),b=new THREE.Box3().setFromObject(mesh);
    controlFields.set(id,continuousMidplane(envelope(worldTriangles([mesh]),[b.min.x,b.max.x,b.min.z,b.max.z],128,96)));
  }
  const profileCount=129,profile=new Float32Array(profileCount*4),bodySections=[];
  for(let i=0;i<profileCount;i++){
    const z=lerp(tail+.04,nose-.04,i/(profileCount-1));
    const s=section(shellTriangles,'z',z);
    if(!s)throw new Error('Missing fuselage section at '+z);
    // The dorsal fairing is not the longitudinal roof datum for paint alignment.
    const roof=Math.min(s.max.y,1.0),belly=s.min.y,t=(nose-z)/length;
    const left=lerp(roof,belly,interpolate(refs.port.demarcation,t));
    const right=lerp(roof,belly,interpolate(refs.starboard.demarcation,t));
    profile.set([left,right,roof,belly],i*4);bodySections.push({z,roof,belly,left,right});
  }
  // Isolated protrusions in the broad source shell are not paint demarcation landmarks.
  // Despike only the paint datum; preserve the accepted marking registration sections.
  const paintDatumCorrections=[];
  for(let side=0;side<2;side++){
    const source=Array.from({length:profileCount},(_,i)=>profile[i*4+side]);
    for(let i=3;i<profileCount-3;i++){
      const window=source.slice(i-3,i+4).sort((a,b)=>a-b),median=window[3];
      if(source[i]<median-.035){profile[i*4+side]=median;paintDatumCorrections.push({index:i,side,z:bodySections[i].z,before:source[i],after:median});}
    }
  }
  const profileTexture=new THREE.DataTexture(profile,profileCount,1,THREE.RGBAFormat,THREE.FloatType);
  profileTexture.needsUpdate=true;
  const bodySectionAt=z=>{
    const t=clamp((z-(tail+.04))/(length-.08)*(profileCount-1),0,profileCount-1),i=Math.floor(t),j=Math.min(i+1,profileCount-1);
    return Object.fromEntries(['roof','belly','left','right'].map(k=>[k,lerp(bodySections[i][k],bodySections[j][k],t-i)]));
  };
  const nacelleNodes=aircraft.meshes.filter(m=>[1693,1711,1702].includes(m.userData.sourceNode)||/cowl_flaps/.test(aircraft.paths[m.userData.sourceNode])).map(m=>m.userData.sourceNode);
  const paintMeshes=aircraft.meshes.filter(m=>m.userData.family==='airframe-skin'&&!isDetailSurface(m,aircraft));
  const uniforms={skinUpper:{value:new THREE.Color('#5e5839')},skinLower:{value:new THREE.Color('#8b8c97')},
    wingEnvelope:{value:wingField.texture},tailEnvelope:{value:tailField.texture},bodyProfile:{value:profileTexture},
    profileBounds:{value:new THREE.Vector2(tail+.04,nose-.04)},paintOffset:{value:0}};
  const wingDomain=wingField.bounds;
  const shaderCode=`
    vec3 p=vSkinWorld;
    float t=clamp((p.z-profileBounds.x)/(profileBounds.y-profileBounds.x),0.0,1.0);
    float fi=t*128.0, ia=floor(fi), ib=min(ia+1.0,128.0);
    vec4 profile=mix(texture2D(bodyProfile,vec2((ia+.5)/129.0,.5)),texture2D(bodyProfile,vec2((ib+.5)/129.0,.5)),fract(fi));
    float boundary=mix(profile.y,profile.x,smoothstep(-.20,.20,p.x))+paintOffset;
    float upperWeight=smoothstep(boundary-.025,boundary+.025,p.y);
    vec2 wu=vec2((p.x-(${wingDomain[0]}))/(${wingDomain[1]-wingDomain[0]}),(p.z-(${wingDomain[2]}))/(${wingDomain[3]-wingDomain[2]}));
    vec4 wing=texture2D(wingEnvelope,clamp(wu,0.0,1.0));
    if(abs(p.x)>1.34 && p.z>-3.30 && p.z<1.48){
      float mid=wing.z>.5?(wing.x+wing.y)*.5:(.15+.035*max(abs(p.x)-1.0,0.0));
      upperWeight=smoothstep(mid-.004,mid+.004,p.y);
    }
    float engineX=abs(p.x)<5.5?3.378:7.802;
    float engineY=abs(p.x)<5.5?-.05645:.09068;
    // Outer cowl fronts sit 0.2874 m aft of the inner fronts in the source.
    float engineZ=p.z+(abs(p.x)>5.5?.2874:0.0);
    float engineRadius=length(vec2(abs(p.x)-engineX,p.y-engineY));
    if(nacellePaint>.5 && engineRadius<.94 && abs(p.x)>2.4 && abs(p.x)<8.8 && engineZ>-1.45 && engineZ<3.12){
      // Measured ring midpoints at z=2.7; complete cowl and aft fairing share their engine axis.
      float axisY=abs(p.x)<5.5?-.05645:.09068;
      // User's B-17 photographs guide the paint treatment only: an olive
      // intake lip wraps continuously around the opening, with grey below
      // the rear shell. Coordinates and aircraft geometry remain B-24.
      float lowerBand=smoothstep(axisY-.205,axisY-.155,p.y);
      float oliveLip=smoothstep(2.70,2.94,engineZ);
      upperWeight=max(lowerBand,oliveLip);
    }
    if(tailPaint>.5 || (p.z<-9.0 && abs(p.x)>1.15)){
      if(abs(p.x)>3.55)upperWeight=1.0;
      else {
        vec4 tailSample=texture2D(tailEnvelope,clamp(vec2((p.x+3.45)/6.90,(p.z+11.65)/2.62),0.0,1.0));
        float tailMid=(tailSample.x+tailSample.y)*.5;
        upperWeight=smoothstep(tailMid-.002,tailMid+.002,p.y);
      }
    }
    if(controlPaint>.5){
      vec2 cu=clamp(vec2((p.x-controlBounds.x)/controlBounds.z,(p.z-controlBounds.y)/controlBounds.w),0.0,1.0);
      vec4 cv=texture2D(controlEnvelope,cu);float cm=(cv.x+cv.y)*.5;
      upperWeight=smoothstep(cm-.001,cm+.001,p.y);
    }
    vec3 surfacePaint=mix(skinLower,skinUpper,upperWeight);
    // A single-thickness source cowl must not show its exterior camouflage
    // through the intake. View-versus-radial direction distinguishes inside
    // surfaces without trusting the inherited normal sign or using old UVs.
    if(nacellePaint>.5 && engineRadius>.48 && engineRadius<.94 && engineZ>-.2 && engineZ<2.96 && abs(p.x)>2.4){
      vec3 radial=vec3(p.x-sign(p.x)*engineX,p.y-engineY,0.0);
      if(dot(cameraPosition-p,radial)<0.0)surfacePaint=mix(skinLower*.55,skinUpper,smoothstep(2.68,2.90,engineZ));
    }
    // Small source hub caps share a broad shell mesh with unrelated parts.
    if(hubCapPaint>.5 && engineRadius<.18 && engineZ>3.1 && engineZ<3.7 && abs(p.x)>2.4)surfacePaint=vec3(.25,.28,.29);
    diffuseColor.rgb*=surfacePaint;
  `;
  for(const mesh of paintMeshes){
    const mat=mesh.material;if(mesh.userData.sourceNode===1747){mat.polygonOffset=true;mat.polygonOffsetFactor=1;mat.polygonOffsetUnits=2;}mat.color.set(0xffffff);mat.metalness=.02;mat.roughness=.76;
    const control=controlFields.get(mesh.userData.sourceNode),cb=control?.bounds||[0,1,0,1];
    mat.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      Object.assign(shader.uniforms,{tailPaint:{value:[1717,726,729].includes(mesh.userData.sourceNode)?1:0},nacellePaint:{value:nacelleNodes.includes(mesh.userData.sourceNode)?1:0},hubCapPaint:{value:mesh.userData.sourceNode===1672?1:0},controlPaint:{value:control?1:0},controlEnvelope:{value:control?.texture||wingField.texture},controlBounds:{value:new THREE.Vector4(cb[0],cb[2],cb[1]-cb[0],cb[3]-cb[2])}});
      shader.vertexShader='varying vec3 vSkinWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSkinWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
      shader.fragmentShader='varying vec3 vSkinWorld;uniform vec3 skinUpper;uniform vec3 skinLower;uniform sampler2D wingEnvelope;uniform sampler2D tailEnvelope;uniform sampler2D bodyProfile;uniform vec2 profileBounds;uniform float paintOffset;uniform float tailPaint;uniform float nacellePaint;uniform float hubCapPaint;uniform float controlPaint;uniform sampler2D controlEnvelope;uniform vec4 controlBounds;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+shaderCode);
    };
    mat.customProgramCacheKey=()=> 'b24-r15-stable-paint-v1';mat.needsUpdate=true;
  }
  const placements=[];
  for(const view of ['top','bottom']){
    const r=refs[view],sign=view==='top'?1:-1,tip=sign>0?wingBounds.max.x:-wingBounds.min.x;
    const x=sign*r.spanFraction*tip,s=section(wingTriangles,'x',x),z=lerp(s.max.z,s.min.z,r.chordFraction);
    const scale=tip/Math.abs(r.wing.tipX-r.wing.centerlineX);
    placements.push({name:view==='top'?'upper-port-wing':'lower-starboard-wing',view,
      targetIds:[view==='top'?1708:1696],center:[x,(s.min.y+s.max.y)/2,z],normal:[0,sign,0],
      axisU:[-1,0,0],axisV:[0,0,view==='top'?1:-1],
      width:(r.bounds[2]-r.bounds[0])*scale,height:(r.bounds[3]-r.bounds[1])*scale,
      rotationImageDegrees:r.rotationImageDegrees,scaleMetresPerPixel:scale,
      calibration:{span:tip,sectionLeading:s.max.z,sectionTrailing:s.min.z},reference:r});
  }
  for(const view of ['port','starboard']){
    const r=refs[view],sign=view==='port'?1:-1,referenceZ=nose-r.lengthFraction*length;
    const scale=length/Math.abs(r.body.tailX-r.body.noseX),width=(r.bounds[2]-r.bounds[0])*scale;
    const z=referenceZ,s=bodySectionAt(z);
    const y=lerp(s.roof,s.belly,r.heightFraction);
    const height=(r.bounds[3]-r.bounds[1])*scale;
    const targetIds=paintMeshes.filter(mesh=>{
      const b=new THREE.Box3().setFromObject(mesh);
      return b.max.z>=z-width*.55&&b.min.z<=z+width*.55&&b.max.y>=y-height*.55&&b.min.y<=y+height*.55
        &&(sign>0?b.max.x>.70:b.min.x<-.70);
    }).map(mesh=>mesh.userData.sourceNode);
    placements.push({name:view+'-fuselage',view,targetIds,
      center:[sign*1.1,y,z],normal:[sign,0,0],axisU:[0,0,-sign],axisV:[0,1,0],
      width,height,
      rotationImageDegrees:r.rotationImageDegrees,scaleMetresPerPixel:scale,
      calibration:{nose,tail,roof:s.roof,belly:s.belly},reference:r,
      registration:{method:'reference proportions retained; window/door/gun occlusion accepted by user',referenceZ,actualZ:z,
        adjustmentMetres:0,adjustmentReferencePixels:0,occlusionAccepted:true,visualAcceptance:false}});
  }
  const directTexture=makeInsigniaTexture(renderer);
  const directVisible={value:1};
  for(const mesh of paintMeshes){
    const previous=mesh.material.onBeforeCompile;
    mesh.material.onBeforeCompile=shader=>{
      previous(shader);
      shader.uniforms.directMark={value:directTexture};shader.uniforms.directMarkVisible=directVisible;
      shader.fragmentShader='uniform sampler2D directMark;uniform float directMarkVisible;\n'+shader.fragmentShader;
      let code='vec4 directColor=vec4(0.0);\n';
      for(const p of placements.filter(p=>Math.abs(p.normal[0])>.5)){
        const sign=p.normal[0],a=-THREE.MathUtils.degToRad(p.rotationImageDegrees);
        code+=`if(vSkinWorld.x*${sign.toFixed(1)}>.70 && vSkinWorld.x*${sign.toFixed(1)}<1.45){
          vec2 q=vec2((vSkinWorld.z-(${p.center[2]}))*${(-sign).toFixed(1)},vSkinWorld.y-(${p.center[1]}));
          q=mat2(${Math.cos(a)},${-Math.sin(a)},${Math.sin(a)},${Math.cos(a)})*q;
          vec2 uv=q/vec2(${p.width*1056/1024},${p.height*544/512})+.5;
          if(all(greaterThanEqual(uv,vec2(0.0)))&&all(lessThanEqual(uv,vec2(1.0))))directColor=texture2D(directMark,uv);
        }\n`;
      }
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',code+'outgoingLight=mix(outgoingLight,directColor.rgb,directColor.a*directMarkVisible);\n#include <opaque_fragment>');
    };
    mesh.material.needsUpdate=true;
  }
  return {paintMeshes,placements,meshNode,bodySectionAt,bodySections,wingTriangles,paintDatumCorrections,
    setInsigniaVisible:visible=>{directVisible.value=visible?1:0;},
    setOffset:v=>{uniforms.paintOffset.value=v;},
    audit:{version:'R11',visualAcceptance:false,productionReady:false,referenceJPEGIdentityVerified:false,
      paintClassifier:'explicit nacelle node membership before spatial paint; wing envelope and control surfaces isolated from cowl overrides',
      tailPaintNodes:[1717,726,729],nacellePaintNodes:nacelleNodes,hubCapPaintNodes:[1672],
      sourcePayloadSHA256:aircraft.digest,paintMeshCount:paintMeshes.length,paintNodes:paintMeshes.map(m=>m.userData.sourceNode),
      normalSignUsedForPaint:false,generatedNumericTextureBytes:wingField.bytes+tailField.bytes+profile.byteLength+[...controlFields.values()].reduce((sum,f)=>sum+f.bytes,0),
      controlSurfacePaintNodes:[...controlFields.keys()],fuselageOcclusionAccepted:true,
      approvedManufacturerPanelSeams:0,approvedManufacturerRivetRows:0,
      nacelleAxes:[{x:3.378,y:-.05645,zPaintOffset:0},{x:-3.378,y:-.05645,zPaintOffset:0},{x:7.802,y:.09068,zPaintOffset:.2874},{x:-7.802,y:.09068,zPaintOffset:.2874}],
      bodySections,placements:placements.map(p=>({...p,reference:undefined}))}};
}

export function makeInsigniaTexture(renderer){
  const c=document.createElement('canvas');c.width=1056;c.height=544;
  const x=c.getContext('2d');x.translate(16,16);
  x.fillStyle='#1b2142';x.fillRect(0,174,1024,164);
  x.fillStyle='#f7f7f5';x.fillRect(3,178,1018,156);
  x.fillStyle='#1b2142';x.beginPath();x.arc(512,256,256,0,Math.PI*2);x.fill();
  x.fillStyle='#f7f7f5';x.beginPath();
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+i*Math.PI/5,r=i%2?225*.38196601125:225;
    const px=512+Math.cos(a)*r,py=256+Math.sin(a)*r;i?x.lineTo(px,py):x.moveTo(px,py);
  }
  x.closePath();x.fill();
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
}

export function makeDecal(placement,system,texture){
  const p=placement,normal=new THREE.Vector3().fromArray(p.normal),baseU=new THREE.Vector3().fromArray(p.axisU),baseV=new THREE.Vector3().fromArray(p.axisV);
  const theta=THREE.MathUtils.degToRad(-p.rotationImageDegrees);
  const u=baseU.clone().multiplyScalar(Math.cos(theta)).addScaledVector(baseV,Math.sin(theta));
  const v=baseV.clone().multiplyScalar(Math.cos(theta)).addScaledVector(baseU,-Math.sin(theta));
  const center=new THREE.Vector3().fromArray(p.center),width=p.width*1056/1024,height=p.height*544/512;
  const targets=p.targetIds.map(system.meshNode),ray=new THREE.Raycaster(),nx=64,ny=32,points=[],positions=[],uvs=[],indices=[],hitNodes=new Set();
  const cast=(fu,fv)=>{
    const target=center.clone().addScaledVector(u,(fu-.5)*width).addScaledVector(v,(fv-.5)*height);
    ray.set(target.clone().addScaledVector(normal,4),normal.clone().negate());ray.far=8;
    const hit=ray.intersectObjects(targets,false).find(h=>{
      const n=h.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(h.object.matrixWorld));
      const facing=Math.abs(normal.x)>.5?Math.abs(n.dot(normal)):n.dot(normal);
      return facing>.10 && (Math.abs(normal.x)<.5||h.point.x*normal.x>.70);
    });
    if(!hit)return null;
    hitNodes.add(hit.object.userData.sourceNode);
    // Offset along the projection ray keeps the measured orthographic coordinates unchanged.
    return {p:hit.point.clone().addScaledVector(normal,.006),uv:[fu,fv],node:hit.object.userData.sourceNode};
  };
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)points.push(cast(i/nx,j/ny));
  const forward=new THREE.Vector3().crossVectors(u,v).dot(normal)>0;
  const addTri=(a,b,c)=>{
    if(!a||!b||!c)return;
    const n=positions.length/3;
    for(const q of [a,b,c]){positions.push(...q.p.toArray());uvs.push(...q.uv);}
    indices.push(n,forward?n+1:n+2,forward?n+2:n+1);
  };
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const k=j*(nx+1)+i;addTri(points[k],points[k+1],points[k+nx+1]);addTri(points[k+1],points[k+nx+2],points[k+nx+1]);
  }
  if(indices.length===0)throw new Error(p.name+': no decal surface hits');
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,alphaTest:.06,side:THREE.FrontSide,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-2}));
  mesh.name=p.name;mesh.renderOrder=12;
  const samplePoints={};
  for(const [name,fu,fv] of [['center',.5,.5],['left',16/1056,.5],['right',1040/1056,.5],['tip',.5,(272+225)/544]]){
    const point=cast(fu,fv);samplePoints[name]=point?.p.toArray()||null;
  }
  return {mesh,audit:{name:p.name,view:p.view,triangles:indices.length/3,gridCoverage:points.filter(Boolean).length/points.length,
    hitNodes:[...hitNodes],samplePoints,visibleWidth:p.width,visibleHeight:p.height,
    rotationImageDegrees:p.rotationImageDegrees,min:geometry.boundingBox.min.toArray(),max:geometry.boundingBox.max.toArray()}};
}
