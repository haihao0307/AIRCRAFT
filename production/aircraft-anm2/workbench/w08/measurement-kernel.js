const MeasurementKernel=(()=>{
  const EPS=1e-10;
  function snapshot(T,root){
    root.updateMatrixWorld(true);
    const meshes=[];const box=new T.Box3().setFromObject(root);
    root.traverse(o=>{
      if(!o.isMesh||o.visible===false||!o.geometry?.attributes?.position)return;
      const pos=o.geometry.attributes.position, idx=o.geometry.index;
      const verts=new Float64Array(pos.count*3),v=new T.Vector3();
      for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);verts[i*3]=v.x;verts[i*3+1]=v.y;verts[i*3+2]=v.z;}
      const indices=idx?Array.from(idx.array):Array.from({length:pos.count},(_,i)=>i);
      meshes.push({name:o.name||'',verts,indices});
    });
    return{meshes,box};
  }
  function addPoint(s,y,z){if(y<s.minY)s.minY=y;if(y>s.maxY)s.maxY=y;if(z<s.minZ)s.minZ=z;if(z>s.maxZ)s.maxZ=z;s.points++;}
  function edge(s,x,ax,ay,az,bx,by,bz){
    const da=ax-x,db=bx-x;
    if(Math.abs(da)<EPS&&Math.abs(db)<EPS){addPoint(s,ay,az);addPoint(s,by,bz);return;}
    if((da>0&&db>0)||(da<0&&db<0))return;
    const den=bx-ax;if(Math.abs(den)<EPS)return;
    const u=(x-ax)/den;if(u<-EPS||u>1+EPS)return;
    addPoint(s,ay+(by-ay)*u,az+(bz-az)*u);
  }
  function measure(T,root,count=64){
    const started=performance.now(),snap=snapshot(T,root),box=snap.box,size=box.getSize(new T.Vector3()),length=size.x;
    if(!(length>EPS))throw Error('MeasurementKernel: longitudinal extent is zero');
    const sections=Array.from({length:count},(_,i)=>({t:0.005+(0.99*i/(count-1)),minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity,points:0,triangles:0}));
    for(const mesh of snap.meshes){const v=mesh.verts,a=mesh.indices;
      for(let q=0;q+2<a.length;q+=3){const ia=a[q]*3,ib=a[q+1]*3,ic=a[q+2]*3;
        const ax=v[ia],ay=v[ia+1],az=v[ia+2],bx=v[ib],by=v[ib+1],bz=v[ib+2],cx=v[ic],cy=v[ic+1],cz=v[ic+2];
        const t0=(Math.min(ax,bx,cx)-box.min.x)/length,t1=(Math.max(ax,bx,cx)-box.min.x)/length;
        let lo=Math.max(0,Math.ceil((t0-0.005)*(count-1)/0.99)),hi=Math.min(count-1,Math.floor((t1-0.005)*(count-1)/0.99));
        if(hi<lo)continue;
        for(let si=lo;si<=hi;si++){const s=sections[si],x=box.min.x+s.t*length,before=s.points;
          edge(s,x,ax,ay,az,bx,by,bz);edge(s,x,bx,by,bz,cx,cy,cz);edge(s,x,cx,cy,cz,ax,ay,az);if(s.points>before)s.triangles++;
        }
      }
    }
    for(const s of sections){s.heightOverLength=s.points?(s.maxY-s.minY)/length:0;s.depthOverLength=s.points?(s.maxZ-s.minZ)/length:0;delete s.minY;delete s.maxY;delete s.minZ;delete s.maxZ;}
    return{count,box:{min:[box.min.x,box.min.y,box.min.z],max:[box.max.x,box.max.y,box.max.z]},length,heightOverLength:size.y/length,depthOverLength:size.z/length,sections,meshes:snap.meshes.length,ms:performance.now()-started};
  }
  function compare(reference,native){
    if(reference.count!==native.count)throw Error('MeasurementKernel: section counts differ');
    const rows=[];let sum=0,max=0;
    for(let i=0;i<reference.count;i++){const r=reference.sections[i],n=native.sections[i],eh=Math.abs(r.heightOverLength-n.heightOverLength),ed=Math.abs(r.depthOverLength-n.depthOverLength),e=(eh+ed)/2;sum+=e;if(e>max)max=e;rows.push({t:r.t,heightError:eh,depthError:ed,meanEnvelopeError:e});}
    return{meanEnvelopeError:sum/reference.count,maxEnvelopeError:max,rows};
  }
  function plot(canvas,reference,native,compareResult,selectedT=.4,anchors=[]){
    const dpr=Math.min(devicePixelRatio||1,2),w=Math.max(280,canvas.clientWidth||500),h=Math.max(140,canvas.clientHeight||180);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
    c.fillStyle='#10202a';c.fillRect(0,0,w,h);c.strokeStyle='#ffffff18';c.lineWidth=1;for(let i=0;i<=4;i++){const y=18+(h-42)*i/4;c.beginPath();c.moveTo(34,y);c.lineTo(w-10,y);c.stroke();}
    const sets=[];if(reference)sets.push(['REF H',reference.sections.map(s=>s.heightOverLength),'#d6bd88'],['REF D',reference.sections.map(s=>s.depthOverLength),'#c98b72']);if(native)sets.push(['NAT H',native.sections.map(s=>s.heightOverLength),'#82c4d6'],['NAT D',native.sections.map(s=>s.depthOverLength),'#8fb89d']);
    let ymax=.001;for(const [,a]of sets)for(const x of a)ymax=Math.max(ymax,x);ymax*=1.12;const X=t=>34+t*(w-48),Y=v=>h-22-v/ymax*(h-42);
    for(const [label,a,color]of sets){c.strokeStyle=color;c.lineWidth=1.5;c.beginPath();a.forEach((v,i)=>{const x=X((i+.32)/(a.length-.36)),y=Y(v);i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke();}
    c.setLineDash([3,4]);for(const a of anchors){c.strokeStyle=a.status==='measured'?'#9bc8a8':'#aa9878';c.beginPath();c.moveTo(X(a.t),16);c.lineTo(X(a.t),h-20);c.stroke();}c.setLineDash([]);
    c.strokeStyle='#eef4f5';c.lineWidth=1;c.beginPath();c.moveTo(X(selectedT),13);c.lineTo(X(selectedT),h-18);c.stroke();
    c.fillStyle='#91a6b1';c.font='9px Consolas,monospace';c.fillText('0',29,h-7);c.fillText('1',w-15,h-7);c.fillText('normalized longitudinal section envelope',39,11);
    if(compareResult){c.fillStyle='#d8c49e';c.fillText('mean Δ '+compareResult.meanEnvelopeError.toFixed(4)+'  max Δ '+compareResult.maxEnvelopeError.toFixed(4),Math.max(39,w-205),11);}
  }
  function plane(T,box,material){const size=box.getSize(new T.Vector3()),g=new T.PlaneGeometry(Math.max(size.z*1.5,.1),Math.max(size.y*1.5,.1));const m=new T.Mesh(g,material);m.rotation.y=Math.PI/2;m.renderOrder=5;return m;}
  return Object.freeze({measure,compare,plot,plane});
})();
