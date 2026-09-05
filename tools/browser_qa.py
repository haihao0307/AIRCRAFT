#!/usr/bin/env python3
"""Actual browser checks for the compact runtime, including visible canvas and input controls."""
import argparse,http.server,functools,threading,json,time,os
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);p.add_argument('--url');a=p.parse_args();root=a.root.resolve();reportDir=root/'reports';reportDir.mkdir(exist_ok=True)
if not a.url:
 server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root/'runtime')));threading.Thread(target=server.serve_forever,daemon=True).start()
url=a.url or 'http://127.0.0.1:8765/';r={'url':url,'checks':[],'viewports':[],'visualAcceptance':False,'productionReady':False}
expected=json.loads((reportDir/'DISTILLATION.json').read_text())
def check(name,v):r['checks'].append({'name':name,'passed':bool(v)})
def act(page,body='',arg=None):
 epoch=page.evaluate('(v)=>{const a=__B24_WORKBENCH__;'+body+';return a.frameCount;}',arg)
 page.wait_for_function('(n)=>__B24_WORKBENCH__.frameCount>n',arg=epoch,polling=100,timeout=45000)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
  for width,height in [(1440,900),(390,844)]:
   page=browser.new_page(viewport={'width':width,'height':height});errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('request',lambda req:requests.append(req.url))
   page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__B24_WORKBENCH__?.productionEffects?.ready',timeout=180000);act(page)
   check(f'{width} loading overlay hidden',page.locator('#loading').evaluate('(e)=>e.classList.contains("hidden")'))
   check(f'{width} correct candidate',page.evaluate('__B24_WORKBENCH__.build==="B24_V018_COMPACT_DATA"'))
   check(f'{width} no original image or UV data',page.evaluate('__B24_WORKBENCH__.compactData.sourceImages===0&&__B24_WORKBENCH__.compactData.sourceUV===0'))
   check(f'{width} own motion controller',page.evaluate('__B24_WORKBENCH__.plane.motion.definition.schema==="b24-motion-controller/1"&&!__B24_WORKBENCH__.plane.m.animations'))
   check(f'{width} all source nodes',page.evaluate('__B24_WORKBENCH__.plane.nodes.length===1784&&__B24_WORKBENCH__.plane.meshes.length===348'))
   check(f'{width} no legacy payload request',not any('.glb' in x or 'native.bin.gz' in x or 'native.json.gz' in x or any(x.split('?')[0].endswith(e) for e in ['.png','.jpg','.jpeg','.webp']) for x in requests))
   check(f'{width} nine data parts',len([x for x in requests if '.part' in x])==expected['parts'])
   check(f'{width} data-byte count',page.evaluate('__B24_WORKBENCH__.compactData.dataBytes')==expected['totalDataBytes'])
   page.locator('#play').click();act(page);check(f'{width} actual play',page.evaluate('__B24_WORKBENCH__.mission.running&&__B24_WORKBENCH__.mission.time>0'))
   page.locator('#play').click();act(page);check(f'{width} actual pause',page.evaluate('!__B24_WORKBENCH__.mission.running'))
   phases=[]
   for t in [0,5,20,30,45,58,80,100,115,121,129,150,175,190,205,218,270,326]:
    act(page,'a.pause();a.seek(v)',t);phases.append(page.evaluate('__B24_WORKBENCH__.getState().phase'))
    check(f'{width} finite transforms at {t}',page.evaluate('__B24_WORKBENCH__.plane.nodes.every(n=>n.matrixWorld.elements.every(Number.isFinite))'))
   check(f'{width} all 18 phases',len(set(phases))==18)
   act(page,'a.seek(121)');q=page.evaluate('__B24_WORKBENCH__.effects.bombs[0].o.quaternion.toArray()');act(page);check(f'{width} roll pause stable',q==page.evaluate('__B24_WORKBENCH__.effects.bombs[0].o.quaternion.toArray()'))
   act(page,'a.seek(150)');check(f'{width} four releases and impacts',page.evaluate('__B24_WORKBENCH__.getState().released===4&&__B24_WORKBENCH__.getState().impacts===4'))
   impact=page.evaluate('__B24_WORKBENCH__.effects.lastImpact');act(page,'a.seek(v+.25);a.setCamera("cinema")',impact);check(f'{width} impact frame',page.evaluate('__B24_WORKBENCH__.productionEffects.impactFramed'))
   act(page,'a.setCamera("front")');check(f'{width} manual camera',page.evaluate('!__B24_WORKBENCH__.productionEffects.impactFramed'))
   act(page,'a.reset();a.setCamera("orbit")');check(f'{width} reset',page.evaluate('__B24_WORKBENCH__.mission.time===0&&__B24_WORKBENCH__.plane.motion.angles.every(x=>x===0)&&__B24_WORKBENCH__.effects.bombs.length===0'))
   check(f'{width} original parent graph',page.evaluate('(()=>{const p=__B24_WORKBENCH__.plane;return p.m.components.every(d=>p.nodes[d.id].parent===(d.parent===null?p.group:p.nodes[d.parent]));})()'))
   check(f'{width} no weather or fog',page.evaluate('__B24_WORKBENCH__.scene.fog===null&&!__B24_WORKBENCH__.productionEffects.weather'))
   check(f'{width} no layout overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   page.screenshot(path=str(reportDir/f'compact-ready-{width}.png'))
   check(f'{width} no runtime errors',not errors and page.evaluate('__B24_WORKBENCH__.errors.length===0'))
   r['viewports'].append({'width':width,'height':height,'errors':errors,'requestCount':len(requests),'audit':page.evaluate('__B24_WORKBENCH__.productionEffects.audit()')});page.close()
  browser.close()
except Exception as e:check('browser completed',False);r['exception']=repr(e)
finally:
 if not a.url:server.shutdown()
 r['passed']=all(c['passed'] for c in r['checks']) and len(r['viewports'])==2;r['passedCount']=sum(c['passed'] for c in r['checks']);r['total']=len(r['checks']);(reportDir/'COMPACT_BROWSER_QA.json').write_text(json.dumps(r,indent=2));print(json.dumps(r),flush=True)
raise SystemExit(0 if r['passed'] else 1)
