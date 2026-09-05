// Presentation-only responsive panel. Does not access product geometry or material data.
(()=>{
 const media=matchMedia('(max-width:760px)'),panel=document.getElementById('panel');
 const style=document.createElement('style');
 style.textContent=`@media(max-width:760px){
  body.panel-editing #stage{height:calc(35svh - 65px)}
  body.panel-editing .stage-heading,body.panel-editing .stage-tools,body.panel-editing .object-caption,body.panel-editing .view-dock,body.panel-editing .stage-bottom,body.panel-editing #open-panel{display:none}
  body.panel-editing #stage:after{content:'S01 · V016 历史样本';position:absolute;bottom:8px;left:18px;pointer-events:none;font-size:8px;letter-spacing:.6px;color:#9aaa96}
  body.panel-editing .compare-a,body.panel-editing .compare-b{top:10px}
  body.panel-editing #divider{top:32px;bottom:24px}
 }`;
 document.head.appendChild(style);
 function update(){
  document.body.classList.toggle('panel-editing',media.matches&&panel.classList.contains('open'));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const api=window.__WM_STUDIO__;
   if(api?.ready)api.setView(api.state().currentView,false);
  }));
 }
 new MutationObserver(update).observe(panel,{attributes:true,attributeFilter:['class']});
 media.addEventListener('change',update);
 update();
})();
