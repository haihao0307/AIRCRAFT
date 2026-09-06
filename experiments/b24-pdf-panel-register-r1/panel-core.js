/* Renderer-independent, source-locked surface records.
   Coordinates are anchors on existing triangles, not new panel geometry. */
const PanelCore = (()=>{
 function need(ok,msg){if(!ok)throw new Error(msg)}
 function partFor(manifest,id){const p=manifest.parts.find(p=>p.id===id);need(p,'未知源部件');return p}
 function block(raw,manifest,id){const b=manifest.blocks[id];need(b,'未知数据块');const C={f32:Float32Array,u16:Uint16Array,u32:Uint32Array}[b.dtype];need(C,'未知数组类型');return new C(raw.buffer,raw.byteOffset+b.byteOffset,b.scalarCount)}
 function pointFromAnchor(a,p,m,raw){
  need(Number.isInteger(a.triangleOrdinal)&&a.triangleOrdinal>=0&&a.triangleOrdinal<p.triangles,'原三角形编号越界');
  const w=a.barycentric;need(Array.isArray(w)&&w.length===3&&w.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=-1e-7&&x<=1+1e-7)&&Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-7,'重心坐标无效');
  const pos=block(raw,m,p.attributes.position),ix=block(raw,m,p.attributes.index),local=[0,0,0];
  for(let j=0;j<3;j++)for(let k=0;k<3;k++)local[k]+=pos[ix[a.triangleOrdinal*3+j]*3+k]*w[j];
  const M=p.localToAssetColumnMajor;return [0,1,2].map(k=>M[k]*local[0]+M[4+k]*local[1]+M[8+k]*local[2]+M[12+k]);
 }
 function validate(record,canonical,manifest,raw){
  need(record&&record.schema===canonical.schema,'登记格式不匹配');
  need(record.baseGeometrySHA256===manifest.sha256&&record.baseSkinSHA256===manifest.sourcePrefixSHA256,'模型数据身份不一致，已拒绝跨模型套用');
  need(JSON.stringify(record.coordinates)===JSON.stringify(canonical.coordinates),'坐标约定不一致');
  need(Array.isArray(record.modules)&&record.modules.length>0&&record.modules.length<=canonical.modules.length,'表面数量无效');
  const ids=new Set();
  for(const item of record.modules){
   need(!ids.has(item.id),'重复表面 ID');ids.add(item.id);const ref=canonical.modules.find(p=>p.id===item.id);need(ref,'未登记的表面 ID');
   const p=partFor(manifest,item.binding?.partId);need(item.binding.sourceNode===p.sourceNode&&item.binding.sourceMesh===p.sourceMesh,'源节点或网格不一致');
   for(const key of ['title','sourceDescription','drawingNumber','drawingCallout','evidenceId','sourcePage','level','side','status','panelSeams','thicknessMetres','gapWidthMetres','rivets'])need(JSON.stringify(item[key])===JSON.stringify(ref[key]),'不可通过读回文件更改来源、边界或批准状态：'+key);
   for(const key of ['partId','sourceNode','sourceMesh','sourcePath','localToAssetColumnMajor','attributeSHA256','triangleCount','triangleOrdinalRange','bounds'])need(JSON.stringify(item.binding[key])===JSON.stringify(ref.binding[key]),'源绑定被改动：'+key);
   for(const [name,id] of Object.entries(p.attributes))need(item.binding.attributeSHA256[name]===manifest.blocks[id].sha256,'原属性哈希不一致');
   const anchors=item.binding.pointAnchors;need(Array.isArray(anchors)&&anchors.length<=64,'锚点数量无效');
   for(const a of anchors){const v=pointFromAnchor(a,p,manifest,raw);need(Array.isArray(a.assetPointMetres)&&a.assetPointMetres.length===3&&a.assetPointMetres.every((x,k)=>Number.isFinite(x)&&Math.abs(x-v[k])<1e-6),'锚点坐标与原三角形不一致');need(a.sourcePixelCorrespondence===null,'本版尚未验证图纸像素配准');}
   need(item.reviewNote===undefined||(typeof item.reviewNote==='string'&&item.reviewNote.length<=4000),'意见长度或类型无效');
  }
  return true;
 }
 function intersect(origin,dir,a,b,c){
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const e1=sub(b,a),e2=sub(c,a),h=cross(dir,e2),det=dot(e1,h);if(Math.abs(det)<1e-12)return null;
  const f=1/det,s=sub(origin,a),u=f*dot(s,h);if(u<0||u>1)return null;
  const q=cross(s,e1),v=f*dot(dir,q);if(v<0||u+v>1)return null;const t=f*dot(e2,q);return t>0?{distance:t,barycentric:[1-u-v,u,v]}:null;
 }
 return {validate,partFor,block,pointFromAnchor,intersect};
})();
if(typeof module!=='undefined')module.exports=PanelCore;
