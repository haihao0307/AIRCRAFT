import {parseTlo,verifyTlo,jsonText} from './reader-codec.js';
const $=s=>document.querySelector(s);let current=null,generation=0;
const label={typeOf:'类别所属',representationPartOf:'数字区域组成',poseReferencedTo:'位姿参考',managedBy:'Mother管理',derivedFrom:'版本派生'};
function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
function field(list,name,value){list.append(el('dt',name),el('dd',value));}
function save(data,name,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([data],{type})),a=el('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function resourceRows(){
  if(!current)return;const {core,chunks}=current,q=$('#search').value.toLowerCase(),files=core.RMAP.files.filter(f=>f.path.toLowerCase().includes(q));$('#resources').replaceChildren();$('#resourceCount').textContent=`显示 ${files.length} / ${core.RMAP.files.length} 个文件，全部已核对长度和 SHA256。`;
  for(const f of files){const tr=el('tr');tr.append(el('td',f.path),el('td',(f.bytes/1024).toFixed(1)+' KB'));const td=el('td'),btn=el('button','下载');btn.type='button';btn.addEventListener('click',()=>save(chunks[f.chunkOrdinal].payload,f.path.split('/').pop()));td.append(btn);tr.append(td);$('#resources').append(tr);}
}
function render(parsed,verified){
  current=parsed;window.__TLO_PILOT__={parsed,verified};const c=parsed.core,o=c.OBJS.objects[0],f=c.FRAM.frames[0];$('#result').hidden=false;
  $('#name').textContent=o.name;$('#fileCount').textContent=verified.resourceFiles+' / '+verified.resourceFiles;$('#fileSize').textContent=(verified.bytes/1024/1024).toFixed(2)+' MiB';$('#identity').textContent=o.objectId;$('#hash').textContent='实际读取文件 SHA256 · '+verified.sha256;
  $('#object-note').textContent='数字公版模板 · 已接受并冻结。'+(c.DNA_.nextPhase.implemented?'下一阶段状态请核对原字段。':'80 DAYS 与机组体系仍是下一阶段计划，未在此样本中实例化。');
  $('#identityFields').replaceChildren();field($('#identityFields'),'OBJS.objects[0].version',o.version);field($('#identityFields'),'DNA_.sourceMeshCount / sourceNodeCount',`${c.DNA_.sourceMeshCount} 网格 / ${c.DNA_.sourceNodeCount} 节点；不是物理部件数量`);field($('#identityFields'),'PROV.sourceCommit',c.PROV.sourceCommit);
  const url=new URL(c.PROV.acceptedPreview);if(url.protocol!=='https:'||url.hostname!=='rawcdn.githack.com')throw Error('预览链接不在已声明的HTTPS来源');$('#preview').href=url.href;
  $('#timeFields').replaceChildren();field($('#timeFields'),'TIME.recordedDate',c.TIME.recordedDate.value+' · 项目记录，精度为日');field($('#timeFields'),'TIME.worldTime','未知 · '+c.TIME.worldTime.reason);field($('#timeFields'),'FRAM.frames[0].units.length',f.units.length+' · 局部模型长度');field($('#timeFields'),'FRAM.frames[0].worldLocation','未知 · '+f.worldLocation.reason);
  $('#relations').replaceChildren();c.RELS.relations.forEach((r,i)=>{const tr=el('tr');tr.append(el('td',label[r.kind]||r.kind),el('td',r.subject+' → '+r.object),el('td',`RELS.relations[${i}]`));$('#relations').append(tr);});
  $('#states').replaceChildren();for(const [key,s] of Object.entries(c.DNA_.servicePresets)){const box=el('div');box.className='state';box.append(el('strong',s.label),el('div','服役积累 '+s.use),el('div','清洁保养 '+s.care),el('div','室外暴露 '+s.exposure),el('small','DNA_.servicePresets.'+key));$('#states').append(box);}
  $('#coverage').textContent=jsonText(c.PROV.semanticCoverage);$('#raw').textContent=jsonText({profile:parsed.profile,chunks:c});resourceRows();
}
async function load(bytesPromise,name){
  const token=++generation;current=null;delete window.__TLO_PILOT__;$('#result').hidden=true;$('#status').className='status';$('#status').textContent='正在读取 '+name+'，核对二进制与原文件…';
  try{const bytes=await bytesPromise;if(token!==generation)return;const parsed=parseTlo(bytes),verified=await verifyTlo(parsed);if(token!==generation)return;render(parsed,verified);$('#status').textContent=`已直接读取二进制 · ${verified.chunks} 个块、${verified.resourceFiles} 份原文件校验通过。${verified.unknownOptionalChunks.length?'存在未解释的可选块：'+verified.unknownOptionalChunks.join(', '):'当前必需配置与词汇均可解释。'}`;}
  catch(e){if(token!==generation)return;current=null;delete window.__TLO_PILOT__;$('#result').hidden=true;$('#status').className='status error';$('#status').textContent='未通过读取：'+e.message;}
}
function sample(){return load(fetch('./data/B24_Generic_Mother_01.tlo').then(r=>{if(!r.ok)throw Error('样本HTTP '+r.status);return r.arrayBuffer();}),'公版母体01');}
$('#reload').addEventListener('click',sample);$('#file').addEventListener('change',e=>{const f=e.target.files[0];if(f)load(f.arrayBuffer(),f.name);});$('#search').addEventListener('input',resourceRows);$('#export').addEventListener('click',()=>{if(current)save(jsonText({profile:current.profile,chunks:current.core}),'mother01-semantic-view.json','application/json');});
sample();
