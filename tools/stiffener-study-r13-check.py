import argparse,json,hashlib,subprocess,socket,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--commit');args=ap.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'reports/stiffener-study-r13'/('public' if args.commit else 'local');out.mkdir(parents=True,exist_ok=True)
url='http://127.0.0.1:18768/b24-skin-stiffener-study-r13.html';launch=['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']
if args.commit:
 edge=next(a['data'] for a in json.load(urllib.request.urlopen('https://dns.google/resolve?name=rawcdn.githack.com&type=A'))['Answer'] if a['type']==1)
 launch+=['--host-resolver-rules=MAP rawcdn.githack.com '+edge];url='https://rawcdn.githack.com/haihao0307/AIRCRAFT/'+args.commit+'/b24-skin-stiffener-study-r13.html'
report={'url':url,'errors':[],'views':{}}
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=launch);page=b.new_page(viewport={'width':1440,'height':960});page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.goto(url,wait_until='domcontentloaded',timeout=120000)
 if 'External Content Notice' in page.title():page.get_by_role('button',name='Open the page').click();report['externalNotice']=True
 page.wait_for_function('window.__STIFFENER_R13__',timeout=120000);page.wait_for_timeout(900)
 for v in ['overview','front','back','section','explode']:
  page.locator('[data-view='+v+']').click();page.wait_for_timeout(350);report['views'][v]=page.evaluate('window.__STIFFENER_R13__.getState()');page.screenshot(path=str(out/(v+'.png')))
  assert report['views'][v]['mode']==v
  assert report['views'][v]['rivetIds']==['rivet-01','rivet-02','rivet-03']
 assert report['views']['section']['sectionVisible'] and not report['views']['section']['couponVisible']
 assert report['views']['front']['plateZ']==[1,0] and report['views']['explode']['plateZ']==[9,-8]
 page.locator('#separation').fill('3.5');page.locator('#separation').dispatch_event('input');assert page.evaluate('window.__STIFFENER_R13__.getState().separation')==3.5
 page.locator('#material').click();assert page.locator('#material').get_attribute('aria-pressed')=='true'
 page.locator('#labelsToggle').click();page.wait_for_function("getComputedStyle(document.querySelector('#labels')).display==='none'");assert page.locator('.label:visible').count()==0
 page.locator('#labelsToggle').click();page.locator('[data-view=section]').click();page.wait_for_timeout(200);page.screenshot(path=str(out/'section-colored.png'))
 report['audit']=page.evaluate('window.__STIFFENER_R13__.audit()')
 assert all(a['boundaryEdges']==a['nonManifoldEdges']==a['zeroAreaTriangles']==0 and a['signedVolume']>0 for a in report['audit']['topology'].values()),report['audit']['topology']
 import math
 expected=(14+10+math.pi*3/4)*60-3*math.pi*1.5875**2
 assert abs(report['audit']['topology']['stiffener']['signedVolume']/expected-1)<.001,report['audit']['topology']
 assert report['audit']['skinIsOnePiece'] and report['audit']['stiffenerIsOnePiece']
 assert set(report['audit']['skinHitZ'])=={1,2} and set(report['audit']['flangeHitZ'])=={0,1}
 # Actual mesh profile gives a continuous, nonzero radius across both sheet intervals.
 assert report['audit']['holeRayHits']==[[0,0,0],[0,0,0]];assert all(n>0 for n in report['audit']['solidRayHits'])
 profile=report['audit']['profile'];assert [1.5875,0] in profile and [1.5875,2] in profile
 assert max(x for x,z in profile if z<0)==2.3812499999999996 or abs(max(x for x,z in profile if z<0)-2.38125)<1e-9
 if args.commit:
  report['publicFiles']=[]
  for path in ['b24-skin-stiffener-study-r13.html','runtime/stiffener-study-r13.js','runtime/vendor/three.module.js','runtime/vendor/three.core.js','runtime/vendor/OrbitControls.js']:
   remote=bytes(page.evaluate('async p=>Array.from(new Uint8Array(await(await fetch(new URL(p,location.href))).arrayBuffer()))',path));local=subprocess.check_output(['git','-C',str(root),'show',args.commit+':'+path]);assert remote==local,path;report['publicFiles'].append({'path':path,'sha256':hashlib.sha256(remote).hexdigest(),'bytes':len(remote)})
 page.set_viewport_size({'width':390,'height':844});page.locator('[data-view=overview]').click();page.wait_for_timeout(350);page.screenshot(path=str(out/'mobile.png'),full_page=True);report['mobileNoOverflow']=page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert report['mobileNoOverflow']
 report['requests']=[r['name'] for r in page.evaluate("performance.getEntriesByType('resource').map(r=>({name:r.name}))")]
 assert not any('.glb' in r or '.jpg' in r or '.png' in r for r in report['requests'])
 b.close()
report['passed']=not report['errors'];(out/'qa.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8');print(json.dumps({'passed':report['passed'],'errors':report['errors'],'views':report['views']},ensure_ascii=False));assert report['passed']
