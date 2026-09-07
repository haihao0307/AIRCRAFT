(()=>{
  const T=THREE,$=id=>document.getElementById(id);let nativeM=null,refM=null,diff=null,lastRef=false,sliceT=.399654,nativePlane=null,refPlane=null;
  const prior=window.W08_MEASUREMENT_PRIOR||{anchors:[]};
  function targets(){return W07._targets();}
  function updateSummary(){
    $('w08-native').textContent=nativeM?`${nativeM.count}截面 · ${nativeM.ms.toFixed(1)}ms`:'待测';
    $('w08-ref').textContent=refM?`${refM.count}截面 · ${refM.ms.toFixed(1)}ms`:'载入原件后测量';
    $('w08-diff').textContent=diff?`平均 ${diff.meanEnvelopeError.toFixed(4)} · 最大 ${diff.maxEnvelopeError.toFixed(4)}`:'等待 A/B';
    MeasurementKernel.plot($('w08-chart'),refM,nativeM,diff,sliceT,prior.anchors||[]);
  }
  function setPlane(){const q=targets(),box=q.nativeBox,x=box.min.x+sliceT*(box.max.x-box.min.x);if(nativePlane)nativePlane.position.x=x;if(refPlane)refPlane.position.x=x;$('w08-t').value=sliceT;$('w08-tout').textContent=sliceT.toFixed(3);MeasurementKernel.plot($('w08-chart'),refM,nativeM,diff,sliceT,prior.anchors||[]);}
  function installPlanes(){const q=targets(),matN=new T.MeshBasicMaterial({color:0x86c8d8,transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false}),matR=new T.MeshBasicMaterial({color:0xd6bd88,transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false});nativePlane=MeasurementKernel.plane(T,q.nativeBox,matN);q.nativeScene.add(nativePlane);refPlane=MeasurementKernel.plane(T,q.nativeBox,matR);q.refScene.add(refPlane);setPlane();}
  function measureNative(){const q=targets();nativeM=MeasurementKernel.measure(T,q.nativeRoot,64);updateSummary();}
  function measureReference(){const q=targets();if(!q.referenceWrapper)return;const started=performance.now();refM=MeasurementKernel.measure(T,q.referenceWrapper,64);diff=MeasurementKernel.compare(refM,nativeM);$('w08-run').textContent=`A/B测量完成 ${(performance.now()-started).toFixed(1)}ms`;updateSummary();}
  function nearestAnchor(t){let best=null,dist=1e9;for(const a of prior.anchors||[]){const d=Math.abs(a.t-t);if(d<dist){dist=d;best=a}}return best&&dist<.035?best:null;}
  async function init(){while(!window.W07?.ready)await new Promise(r=>setTimeout(r,30));measureNative();installPlanes();$('w08-run').textContent='Native 64截面已建立';$('w08-t').oninput=e=>{sliceT=Number(e.target.value);setPlane();const a=nearestAnchor(sliceT);$('w08-anchor').textContent=a?`${a.anchorId} · ${a.status}`:'自由截面';};$('w08-remeasure').onclick=()=>{measureNative();if(W07.state().referenceLoaded)measureReference()};
    setInterval(()=>{const now=W07.state().referenceLoaded;if(now&&!lastRef){measureReference();$('w08-anchor').textContent='A4_RECEIVER_FRONT_TRANSITION · inferred';}if(!now&&lastRef){refM=null;diff=null;updateSummary();}lastRef=now;},180);
    window.W08={ready:true,get nativeMeasurement(){return nativeM},get referenceMeasurement(){return refM},get comparison(){return diff},setSlice(t){sliceT=Math.max(0,Math.min(1,Number(t)));setPlane()},audit(){return{schema:'object-dna.w08.measurement-kernel/0.1',nativeSections:nativeM?.count||0,referenceSections:refM?.count||0,referenceLoaded:W07.state().referenceLoaded,meanEnvelopeError:diff?.meanEnvelopeError??null,maxEnvelopeError:diff?.maxEnvelopeError??null,sliceT,priorAnchors:(prior.anchors||[]).length,errors:W07.audit().errors,visualAcceptance:false,productionReady:false}}};
  }
  init().catch(e=>{console.error(e);$('w08-run').textContent='MeasurementKernel error: '+e.message});
})();
