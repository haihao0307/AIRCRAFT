/* All glyphs are authored at runtime. No source texture atlas is redistributed. */
const MarkingProgram=(()=>{
 function create(T,native,dna){
  const textures=[],materials=[],marks=[];
  function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  function texture(c,color=true){const t=new T.CanvasTexture(c);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;textures.push(t);return t;}
  function headTexture(){const c=canvas(512,512),x=c.getContext('2d');x.fillStyle='#b09a60';x.fillRect(0,0,512,512);const grad=x.createRadialGradient(230,220,28,256,256,255);grad.addColorStop(0,'#c6ae70');grad.addColorStop(.76,'#b7a069');grad.addColorStop(1,'#93804e');x.fillStyle=grad;x.fillRect(0,0,512,512);
   x.strokeStyle='#6c5c36';x.lineWidth=5;for(const r of [239,220,67]){x.beginPath();x.arc(256,256,r,0,Math.PI*2);x.stroke();}x.fillStyle='#988454';x.beginPath();x.arc(256,256,59,0,Math.PI*2);x.fill();
   function arc(text,r,start,step){x.font='bold 44px Arial';x.textAlign='center';x.textBaseline='middle';for(let i=0;i<text.length;i++){const a=start+i*step;x.save();x.translate(256+Math.sin(a)*r,256-Math.cos(a)*r);x.rotate(a);x.fillStyle='#dec78a';x.fillText(text[i],1,2);x.fillStyle='#665630';x.fillText(text[i],0,0);x.restore();}}
   arc('CAL .50',164,-.88,.29);arc('M2',164,Math.PI-.15,.3);return texture(c);
  }
  const headMap=headTexture(),headMat=new T.MeshStandardMaterial({map:headMap,color:0xffffff,metalness:.86,roughness:.43,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});materials.push(headMat);
  const headGeo=new T.CircleGeometry(.0175,40);headGeo.rotateY(-Math.PI/2);headGeo.translate(-.13225,0,0);
  function head(){const m=new T.Mesh(headGeo,headMat);m.name='case-headstamp';m.userData={appearance:'brass',keepSurfaceMaterial:true,marking:'CAL .50 / M2',interpretation:'authored graphic; factory and date unknown'};return m;}
  for(const item of native.supply.instances){const h=head();h.position.copy(item.position);h.userData.semantic='supplyBelt';h.userData.instanceIndex=item.index;h.userData.entityRole='case-marking';h.userData.entityId='ODNA:MECH:ANM2:PILOT-0001/round/'+String(item.index).padStart(2,'0')+'/case';native.root.add(h);native.root.updateMatrixWorld(true);dna.frames.get(dna.id('round/'+String(item.index).padStart(2,'0')+'/case')).frame.attach(h);marks.push(h);}
  function stencil(text,w,h,ink){const c=canvas(1024,128),x=c.getContext('2d');x.clearRect(0,0,1024,128);x.fillStyle=ink;x.textAlign='center';x.textBaseline='middle';x.font='bold 64px Arial';x.fillText(text,512,64,995);x.globalCompositeOperation='destination-out';for(let i=0;i<140;i++){const a=(i*173+17)%1024,b=(i*41+23)%128;x.fillRect(a,b,1+i%3,1+i%2);}const map=texture(c),mat=new T.MeshStandardMaterial({map,transparent:true,alphaTest:.15,depthWrite:false,color:0xffffff,roughness:.75,metalness:.18,polygonOffset:true,polygonOffsetFactor:-2,side:T.DoubleSide});materials.push(mat);const mesh=new T.Mesh(new T.PlaneGeometry(w,h),mat);mesh.userData.keepSurfaceMaterial=true;return mesh;}
  const title=stencil('AMM. BOX CAL .50 M2',.79,.074,'#969781');title.rotation.y=Math.PI/2;title.position.set(-.004,-1.205,2.41);title.name='box-pressed-lettering';title.userData.semantic='supplyBox';title.userData.appearance='boxPaint';native.root.add(title);native.root.updateMatrixWorld(true);dna.frames.get(dna.id('supplyBox')).frame.attach(title);title.userData.entityId=dna.id('supplyBox');marks.push(title);
  const lot=stencil('CAL .50',.26,.055,'#c0bea4');lot.rotation.y=Math.PI/2;lot.position.set(-.003,-.94,2.41);lot.name='box-small-stencil';lot.userData.semantic='supplyBox';lot.userData.appearance='boxPaint';native.root.add(lot);native.root.updateMatrixWorld(true);dna.frames.get(dna.id('supplyBox')).frame.attach(lot);lot.userData.entityId=dna.id('supplyBox');marks.push(lot);
  return {marks,materials,textures,head,headMap,audit:()=>({sourceImagesEmbedded:false,boxText:'AMM. BOX CAL .50 M2',headstamp:'authored CAL .50 / M2',factoryDate:'unknown',textureCount:textures.length,decodedBytes:textures.reduce((n,t)=>n+t.image.width*t.image.height*4,0)})};
 }return {create};
})();
