#!/usr/bin/env python3
"""Two real-time 330 s cycles at rate 1; no seeking and no fabricated result waits."""
import argparse,http.server,threading,functools,time,json
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--width',type=int,default=1440);p.add_argument('--height',type=int,default=900);a=p.parse_args();root=Path(__file__).resolve().parents[1]
s=http.server.ThreadingHTTPServer(('127.0.0.1',8767),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root/'runtime')));threading.Thread(target=s.serve_forever,daemon=True).start();(root/'reports').mkdir(exist_ok=True)
r={'viewport':[a.width,a.height],'rate':1,'seeks':0,'requestedLoops':2,'samples':[],'errors':[],'passed':False,'visualAcceptance':False,'physicalDevicePerformanceTest':False}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':a.width,'height':a.height})
  page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors'].append(m.text) if m.type=='error' else None)
  page.goto('http://127.0.0.1:8767/',wait_until='domcontentloaded');page.wait_for_function('window.__B24_WORKBENCH__?.compactData',timeout=180000)
  page.evaluate('''()=>{const a=__B24_WORKBENCH__;a.reset();a.mission.rate=1;a.mission.loop=true;window.__soakEvents=[];for(const method of ['release','explode']){const original=a.effects[method];a.effects[method]=function(...args){window.__soakEvents.push({method,loop:a.mission.loops,time:a.mission.time});return original.apply(this,args);};}}''')
  page.locator('#play').click();start=time.monotonic();phases=set();latest={}
  while time.monotonic()-start<800:
   page.wait_for_timeout(2000);latest=page.evaluate('(()=>{const a=__B24_WORKBENCH__,s=a.getState();return {t:s.time,loops:s.loops,phase:s.phase,running:s.running,frames:s.frameCount,finite:a.plane.nodes.every(n=>n.matrixWorld.elements.every(Number.isFinite)),sourceMeshes:a.plane.meshes.length,effectChildren:a.effects.root.children.length};})()');phases.add(latest['phase']);r['samples'].append(latest)
   if not latest['finite'] or r['errors']:break
   if latest['loops']>=2:break
  r['elapsedWallSeconds']=time.monotonic()-start;r['phasesObserved']=sorted(phases);r['events']=page.evaluate('__soakEvents');r['lastState']=latest
  r['passed']=latest.get('loops',0)>=2 and len(phases)==18 and all(x['finite'] for x in r['samples']) and not r['errors'] and sum(e['method']=='release' for e in r['events'])==8 and sum(e['method']=='explode' for e in r['events'])==8
  page.screenshot(path=str(root/f'reports/soak-{a.width}.png'));b.close()
except Exception as e:r['errors'].append(repr(e))
finally:
 s.shutdown();(root/f'reports/SOAK_{a.width}.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='samples'}),flush=True)
raise SystemExit(0 if r['passed'] else 1)
