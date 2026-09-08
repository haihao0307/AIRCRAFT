import argparse,json,math,hashlib,subprocess,urllib.request
from pathlib import Path
from collections import Counter
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--commit');args=ap.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'reports/skin-joints-r14'/('public' if args.commit else 'local');out.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:18768/';launch=['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']
if args.commit:
 edge=next(a['data'] for a in json.load(urllib.request.urlopen('https://dns.google/resolve?name=rawcdn.githack.com&type=A'))['Answer'] if a['type']==1)
 launch+=['--host-resolver-rules=MAP rawcdn.githack.com '+edge];base='https://rawcdn.githack.com/haihao0307/AIRCRAFT/'+args.commit+'/'
report={'url':base,'errors':[],'failedResources':[],'combinations':[],'topology':[]}
def topology(positions):
 vertices=[positions[i:i+3] for i in range(0,len(positions),3)];edges=Counter();volume=0;zero=0
 for i in range(0,len(vertices),3):
  a,b,c=vertices[i:i+3];u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)];cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
  zero+=sum(x*x for x in cross)<1e-18
  volume+=sum(a[k]*cross[k] for k in range(3))/6
  keys=[tuple(round(x,4) for x in q) for q in [a,b,c]]
  for j in range(3):edges[tuple(sorted([keys[j],keys[(j+1)%3]]))]+=1
 return {'volume':volume,'boundary':sum(v==1 for v in edges.values()),'nonManifold':sum(v>2 for v in edges.values()),'zero':zero}
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=launch);page=b.new_page(viewport={'width':1440,'height':960});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('response',lambda r:report['failedResources'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 def go(path,ready):
  page.goto(base+path,wait_until='domcontentloaded',timeout=120000)
  if 'External Content Notice' in page.title():page.get_by_role('button',name='Open the page').click()
  page.wait_for_function(ready,timeout=120000)
 go('aircraft-skin-joints-r14.html','window.__SKIN_R14__')
 for kind in ['lap','backed-butt','stiffener']:
  page.locator('[data-type='+kind+']').click()
  for head in ['raised','flush']:
   page.locator('[data-head='+head+']').click();page.locator('[data-view=overview]').click()
   audit=page.evaluate('window.__SKIN_R14__.audit()')
   assert all(not any(row['hits']) and row['solid']>0 for row in audit['holeHits']),audit['holeHits']
   for a,geo in zip(audit['definition']['plates'],audit['plates']):
    t=topology(geo['positions']);assert t['boundary']==t['nonManifold']==t['zero']==0,t
    radius=3.175/2;sink=1 if head=='flush' and a['outer'] else 0;outer=radius+sink*math.tan(math.radians(50))
    hole=math.pi*radius**2*(2-sink)+math.pi*sink/3*(outer**2+outer*radius+radius**2)
    volume=(a['x1']-a['x0'])*50*2-len(a['holes'])*hole
    assert abs(t['volume']/volume-1)<.001,(t,volume);report['topology'].append({'type':kind,'head':head,'plate':a['id'],**t})
   for view in ['overview','front','back','section','explode']:
    page.locator('[data-view='+view+']').click();page.wait_for_timeout(80);s=page.evaluate('window.__SKIN_R14__.state()');s.pop('frames');report['combinations'].append(s)
    assert s['mode']==view and s['type']==kind and s['head']==head
    assert s['count']==(10 if kind=='backed-butt' else 5) and s['drawCalls']<=35 and s['triangles']<100000
    if view in ['back','section']:page.screenshot(path=str(out/(kind+'-'+head+'-'+view+'.png')))
 # Rebuilding must not grow GPU geometry allocations unboundedly.
 page.locator('[data-view=overview]').click()
 for _ in range(10):
  page.locator('[data-head=raised]').click();page.locator('[data-head=flush]').click()
 page.wait_for_timeout(100);report['postRebuild']=page.evaluate('window.__SKIN_R14__.state()');assert report['postRebuild']['geometries']<30
 report['rules']=page.evaluate("async()=>{const m=await import('./runtime/skin-joints-r14.js');return {corner:m.samplePath([[0,0,0],[3,0,0],[3,4,0]],2).map(x=>({s:x.s,p:x.point.toArray()})),moving:m.jointRows({type:'moving-boundary'}),members:m.couponDefinition('backed-butt').rivets.map(r=>r.members),reject:(()=>{try{m.plateGeometry({x0:-2,x1:2,holes:[{x:1,y:0}]});return false;}catch{return true;}})()}}")
 assert [r['s'] for r in report['rules']['corner']]==[0,2,4,6];assert report['rules']['moving']==[] and report['rules']['reject'];assert all(len(x)==2 for x in report['rules']['members'])
 page.set_viewport_size({'width':390,'height':844});page.wait_for_function("document.querySelector('canvas').clientWidth===390");page.wait_for_timeout(150);page.screenshot(path=str(out/'mobile.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.set_viewport_size({'width':1440,'height':960})
 go('b24-skin-integration-r14.html','window.__B24_JOINT_R14__');page.locator('#jointFocus').click();page.wait_for_function('window.__B24_JOINT_R14__.stats().headsVisible');report['aircraft']=page.evaluate('window.__B24_JOINT_R14__.stats()');assert report['aircraft']['rivets']>=80 and report['aircraft']['missed']==0,report['aircraft'];assert report['aircraft']['headsVisible']
 report['source']=page.evaluate('window.__B24_R14_QA__.sourceBufferAudit()');assert report['source']['meshCount']==348 and report['source']['payloadSHA256']=='f5ff859a7ff0e38112fa099d8c7d3a4cd8e859434701fb4dd9d81629374c5e3e'
 page.screenshot(path=str(out/'aircraft-detail.png'))
 page.locator('#jointToggle').click();assert not page.evaluate('window.__B24_JOINT_R14__.stats().visible');page.locator('#jointToggle').click()
 page.locator('button[data-view=orbit]').click();page.wait_for_function('!window.__B24_JOINT_R14__.stats().headsVisible');assert not page.evaluate('window.__B24_JOINT_R14__.stats().headsVisible');page.screenshot(path=str(out/'aircraft-overview.png'))
 if args.commit:
  report['publicFiles']=[]
  for path in ['aircraft-skin-joints-r14.html','b24-skin-integration-r14.html','runtime/skin-joints-r14.js','runtime/skin-joints-workbench-r14.js','runtime/b24-joint-demo-r14.js','runtime/b24-skin-integration-r14.js','runtime/vendor/three.module.js']:
   data=bytes(page.evaluate('async p=>Array.from(new Uint8Array(await(await fetch(new URL(p,location.href))).arrayBuffer()))',path));local=subprocess.check_output(['git','-C',str(root),'show',args.commit+':'+path]);assert data==local,path;report['publicFiles'].append({'path':path,'sha256':hashlib.sha256(data).hexdigest()})
 report['resources']=page.evaluate('performance.getEntriesByType("resource").map(r=>r.name)')
 assert not any('.glb' in u or '.png' in u or '.jpg' in u for u in report['resources'])
 assert not report['failedResources'],report['failedResources']
 b.close()
assert not report['errors'],report['errors'];report['passed']=True;(out/'qa.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8');print(json.dumps({'passed':True,'combinations':len(report['combinations']),'aircraft':report['aircraft']},ensure_ascii=False))
