/* Readable exterior motifs. Exhibit fittings are not a certified aircraft installation. */
const AccessoryProgram=(()=>{
 const evidence={ringSight:'ChemicalFX / M2 Browning Machine Gun / node 18 exterior',pedestal:'ChemicalFX nodes 5 and 7; buh pedestal motif',boxText:'emran.bayati: visible AMM. BOX CAL .50 M2',headstamp:'authored CAL .50 / M2 graphic; original headstamp not legible'};
 function create(T,native,mat){
  const make=name=>{const g=new T.Group();g.name=name;g.userData={semantic:name,sourceNode:null};native.groups[name]=g;native.root.add(g);return g;};
  const mount=make('displayMount'),sight=make('sight');
  function add(g,geo,name,appearance='hardware'){const m=new T.Mesh(geo,mat);m.name=name;m.userData={semantic:g.name,appearance,sourceNode:null,sourceEvidence:evidence};g.add(m);return m;}
  function box(g,p,s,name,appearance){const geo=new T.BoxGeometry(...s);geo.translate(...p);return add(g,geo,name,appearance);}
  function cylinder(g,p,r,h,name,appearance='hardware'){const geo=new T.CylinderGeometry(r,r,h,32);geo.translate(...p);return add(g,geo,name,appearance);}
  function tube(g,a,b,r,name){const geo=new T.TubeGeometry(new T.LineCurve3(new T.Vector3(...a),new T.Vector3(...b)),1,r,12,false);return add(g,geo,name);}
  // One editable cradle supports both alternative presentation pedestals.
  const pivot=[-.46,-.235,0];
  for(const z of [-.115,.115]){
   box(mount,[-.48,-.205,z],[.79,.035,.025],'cradle-rail-'+z,'boxPaint');
   for(const x of [-.82,-.12])box(mount,[x,-.153,z],[.047,.095,.030],'cradle-upright-'+x+'-'+z,'boxPaint');
   const pin=new T.CylinderGeometry(.033,.033,.022,24);pin.rotateX(Math.PI/2);pin.translate(pivot[0],-.205,z*1.12);add(mount,pin,'cradle-pivot-'+z);
  }
  box(mount,[pivot[0],-.237,0],[.11,.035,.27],'cradle-crossbar','boxPaint');
  cylinder(mount,[-.46,-.325,0],.084,.135,'swivel-neck','boxPaint');
  cylinder(mount,[-.46,-.403,0],.112,.033,'swivel-collar');
  cylinder(mount,[-.46,-.865,0],.050,.91,'tall-post','boxPaint');
  cylinder(mount,[-.46,-1.335,0],.20,.030,'stand-foot','boxPaint');
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.6;cylinder(mount,[-.46+Math.cos(a)*.145,-1.314,Math.sin(a)*.145],.013,.011,'foot-bolt-'+i);}
  // The compact alternative retains the same gun coordinate frame and uses a neutral plinth below.
  cylinder(mount,[-.46,-.51,0],.11,.20,'compact-post','boxPaint');
  box(mount,[-.46,-.63,0],[.39,.04,.38],'compact-foot','boxPaint');
  box(mount,[-.46,-.987,0],[.43,.675,.43],'exhibit-plinth','steel');
  const compact=['compact-post','compact-foot','exhibit-plinth'];mount.traverse(m=>{if(m.isMesh)m.userData.mountVariant=compact.includes(m.name)?'compact':m.name==='tall-post'||m.name==='stand-foot'||m.name.startsWith('foot-bolt')?'tall':'shared';});
  // Ring and frame sights are alternate artist-reference motifs, never a magnifying scope.
  box(sight,[-.68,.143,0],[.09,.025,.067],'sight-base');
  box(sight,[-.68,.188,0],[.014,.05,.028],'ring-stem');
  const ring=new T.TorusGeometry(.048,.003,8,48);ring.rotateY(Math.PI/2);ring.translate(-.68,.253,0);add(sight,ring,'ring-outer');
  const inner=new T.TorusGeometry(.014,.002,8,32);inner.rotateY(Math.PI/2);inner.translate(-.68,.253,0);add(sight,inner,'ring-inner');
  for(const end of [[-.68,.301,0],[-.68,.205,0],[-.68,.253,.048],[-.68,.253,-.048]])tube(sight,[-.68,.253,0],end,.0015,'ring-spoke');
  for(const z of [-.027,.027])box(sight,[-.68,.24,z],[.013,.15,.010],'frame-upright-'+z);
  box(sight,[-.68,.315,0],[.013,.009,.063],'frame-top');box(sight,[-.68,.205,0],[.017,.011,.061],'frame-slider');
  box(sight,[.17,.069,0],[.036,.075,.028],'front-sight-base');tube(sight,[.17,.10,0],[.17,.20,0],.0023,'front-post');
  sight.traverse(m=>{if(m.isMesh)m.userData.sightVariant=m.name.startsWith('ring-')?'ring':m.name.startsWith('frame-')?'frame':'shared';});
  let mountChoice='tall',sightChoice='ring';
  function setMount(value){if(!['tall','compact','none'].includes(value))throw Error('Unknown stand');mountChoice=value;mount.traverse(m=>{if(m.isMesh)m.visible=value!=='none'&&(m.userData.mountVariant==='shared'||m.userData.mountVariant===value);});}
  function setSight(value){if(!['ring','frame','none'].includes(value))throw Error('Unknown sight');sightChoice=value;sight.traverse(m=>{if(m.isMesh)m.visible=value!=='none'&&(m.userData.sightVariant==='shared'||m.userData.sightVariant===value);});}
  setMount('tall');setSight('ring');return {setMount,setSight,mount:()=>mountChoice,sight:()=>sightChoice,evidence,pivot};
 }return {create,evidence};
})();
