"""Browser acceptance of R15; --commit tests the immutable public URL."""
import argparse,json,hashlib,subprocess,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ap=argparse.ArgumentParser();ap.add_argument('--commit');args=ap.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'reports/service-life-r15'/('public' if args.commit else 'local');out.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:18768/';launch=['--use-angle=swiftshader','--enable-unsafe-swiftshader']
if args.commit:
 edge=next(a['data'] for a in json.load(urllib.request.urlopen('https://dns.google/resolve?name=rawcdn.githack.com&type=A'))['Answer'] if a['type']==1)
 launch+=['--host-resolver-rules=MAP rawcdn.githack.com '+edge];base='https://rawcdn.githack.com/haihao0307/AIRCRAFT/'+args.commit+'/'
report={'url':base+'b24-service-life-r15.html','errors':[],'failedResources':[],'states':{},'renderer':'Chrome SwiftShader; not physical mobile performance'}
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=launch);page=b.new_page(viewport={'width':1440,'height':960})
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
 page.on('response',lambda r:report['failedResources'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
 page.goto(report['url'],wait_until='domcontentloaded',timeout=120000)
 if 'External Content Notice' in page.title():page.get_by_role('button',name='Open the page').click()
 page.wait_for_function('window.__B24_SERVICE_R15__',timeout=120000)
 page.screenshot(path=str(out/'overview.png'))
 report['audit']=page.evaluate('__B24_SERVICE_R15__.audit()');report['source']=page.evaluate('__B24_R15_QA__.sourceBufferAudit()')
 assert report['source']['meshCount']==348 and report['source']['payloadSHA256']=='f5ff859a7ff0e38112fa099d8c7d3a4cd8e859434701fb4dd9d81629374c5e3e'
 c=[r for r in report['audit']['paintDatumCorrections'] if abs(r['z']-.19918)<.001]
 assert len(c)==2 and {r['side'] for r in c}=={0,1} and all(r['after']-r['before']>.09 for r in c)
 assert len(report['audit']['tires'])==3 and sum(r['count'] for r in report['audit']['bolts'])==48
 for view in ['port','starboard','belly','tire','nose','skin','wing','exhaust']:
  page.locator('[data-service-view='+view+']').click();page.wait_for_timeout(150);page.screenshot(path=str(out/(view+'.png')))
 report['stats']=page.evaluate('__B24_SERVICE_R15__.stats()');print('STATS',report['stats'],flush=True)
 for state in ['new','maintained','field','damage','repaired']:
  page.locator('[data-life='+state+']').click();report['states'][state]=page.evaluate('__B24_SERVICE_R15__.state()');assert report['states'][state]['preset']==state
  for view in ['skin','tire','exhaust']:
   page.locator('[data-service-view='+view+']').click();page.wait_for_timeout(80);page.screenshot(path=str(out/(state+'-'+view+'.png')))
 # Maintenance is independently controllable and does not reset accumulated use.
 page.locator('[data-life=field]').click()
 page.locator('#lifeCare').evaluate("e=>{e.value=1;e.dispatchEvent(new Event('input',{bubbles:true}))}")
 s=page.evaluate('__B24_SERVICE_R15__.state()');assert s['use']==.82 and s['care']==1 and s['preset']=='custom'
 page.locator('#fullSeams').uncheck();assert page.evaluate('__B24_SERVICE_R15__.state().seams')==0
 page.locator('#fullSeams').check();page.locator('[data-life=maintained]').click()
 # Orbit sweep catches angle-dependent overlap artifacts in captures. Static repeat
 # equality checks temporal stability, not a claim that all GPUs were tested.
 report['bellyFrameHashes']=[]
 for i,x in enumerate([-1.6,-.8,0,.8,1.6]):
  page.evaluate('v=>__B24_R15_QA__.focus(v,[0,-2,3.3])',[x,-5,5.4]);page.wait_for_timeout(120)
  page.screenshot(path=str(out/('belly-angle-'+str(i)+'.png')))
  data=page.locator('#scene').screenshot();report['bellyFrameHashes'].append(hashlib.sha256(data).hexdigest())
 page.locator('[data-service-view=belly]').click();page.wait_for_timeout(400)
 a=page.locator('#scene').screenshot();page.wait_for_timeout(200);c=page.locator('#scene').screenshot();report['staticBellyStable']=a==c;assert a==c
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'mobile.png'),full_page=True)
 page.locator('#mobileToggle').click();page.locator('[data-life=new]').click();assert page.evaluate('__B24_SERVICE_R15__.state().preset')=='new'
 page.screenshot(path=str(out/'mobile-controls.png'),full_page=True)
 report['resources']=page.evaluate('performance.getEntriesByType("resource").map(r=>({name:r.name,bytes:r.decodedBodySize}))')
 assert not any(any(ext in r['name'] for ext in ['.glb','.png','.jpg']) for r in report['resources'])
 if args.commit:
  report['publicFiles']=[]
  for path in ['b24-service-life-r15.html','runtime/b24-service-life-r15.js','runtime/b24-service-life-view-r15.js','runtime/b24-r15-skin-system.js','runtime/vendor/three.module.js']:
   data=bytes(page.evaluate('async p=>Array.from(new Uint8Array(await(await fetch(new URL(p,location.href))).arrayBuffer()))',path))
   assert data==subprocess.check_output(['git','-C',str(root),'show',args.commit+':'+path]),path
   report['publicFiles'].append({'path':path,'sha256':hashlib.sha256(data).hexdigest()})
 b.close()
assert not report['errors'],report['errors'];assert not report['failedResources'],report['failedResources']
report['passed']=True;(out/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print('PASS R15',report['url'],flush=True)
