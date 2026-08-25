#!/usr/bin/env python3
import argparse, hashlib, json, threading, time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
def args():
    p=argparse.ArgumentParser();p.add_argument('--site',default='dist');p.add_argument('--report',default='reports/80-days-browser-qa.json');p.add_argument('--screenshots',default='qa/80-days');return p.parse_args()
def main():
    a=args();site=Path(a.site).resolve();report=Path(a.report).resolve();shots=Path(a.screenshots).resolve();report.parent.mkdir(parents=True,exist_ok=True);shots.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(site)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_address[1]}/';console=[];page_errors=[];failed=[];checks=[];screens=[]
    def check(name,ok,detail): checks.append({'name':name,'ok':bool(ok),'detail':detail})
    def shot(page,name):
        path=shots/f'{name}.png';page.screenshot(path=str(path));b=path.read_bytes();item={'name':path.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()};screens.append(item);return item
    try:
      with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']);page=pw.chromium.launch if False else browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        page.on('console',lambda m: console.append(m.text) if m.type=='error' else None);page.on('pageerror',lambda e: page_errors.append(str(e)));page.on('requestfailed',lambda r: failed.append({'url':r.url,'failure':r.failure or 'unknown'}))
        page.goto(url+'80-days-livery-workbench.html',wait_until='domcontentloaded',timeout=120000);page.wait_for_function("window.__80DaysQA?.meshCount === 348",timeout=240000);state=page.evaluate('window.__80DaysQA')
        check('authoritative-derived-model-verified',state['modelSha256']=='9f1b4efd5da75efee1dddbec1d06b1ad00dfb78dfb8c957a1faecaff23edad1a',state['modelSha256']);check('model-bytes',state['modelBytes']==23789148,state['modelBytes']);check('mesh-inventory',state['meshCount']==348,state['meshCount']);check('liveryuv-candidates',state['candidateCount']==8,state['candidateCount']);check('uv-semantic',state['uvSemantic']=='TEXCOORD_1',state['uvSemantic']);check('no-floating-decals',state['floatingDecals']==0,state['floatingDecals']);check('stam-port-scene-zero',state['stam']['portSceneObjects']==0,state['stam']);check('stam-port-mask-zero',state['stam']['portMasks']==0,state['stam']);check('stam-port-material-zero',state['stam']['portMaterials']==0,state['stam']);check('stam-starboard-one',state['stam']['starboardCount']==1,state['stam']);check('victory-flags-sided',state['victoryFlags']=={'port':0,'starboard':8},state['victoryFlags']);check('bomb-count-blocked',state['bombCount'] is None and state['bombStatus']=='blocked-count' and state['finalBakeApproved'] is False,state)
        plan=[('port-full','livery','port'),('starboard-full','livery','starboard'),('port-nose','livery','portNose'),('starboard-nose-stam','livery','stam'),('fixed-fins','livery','fins'),('top-symbol-area','livery','top'),('belly-transition','livery','bottom'),('port-nose-liveryuv','uv','portNose'),('starboard-nose-liveryuv','uv','starboardNose'),('normal-raking','normal','starboardNose'),('roughness','roughness','starboard'),('height','height','starboardNose'),('classification-mask','mask','perspective')]
        mode_hash={}
        for name,mode,view in plan:
            page.locator(f"button[data-mode='{mode}']").click();page.locator(f"button[data-view='{view}']").first.click();page.wait_for_timeout(700);item=shot(page,f'80-days-{name}');mode_hash[name]=item['sha256']
        page.locator('#registrationBtn').click();page.wait_for_timeout(300);shot(page,'80-days-e03-trace-model-registration')
        for mode in ['source','livery','normal','roughness','height']:
            page.locator(f"button[data-mode='{mode}']").click();page.locator("button[data-view='starboardNose']").first.click();page.wait_for_timeout(450);mode_hash[f'diff-{mode}']=shot(page,f'80-days-diff-{mode}')['sha256']
        check('mode-pixel-differences',len({mode_hash[f'diff-{m}'] for m in ['source','livery','normal','roughness','height']})==5,{m:mode_hash[f'diff-{m}'] for m in ['source','livery','normal','roughness','height']});check('screenshots-nonempty',all(x['bytes']>10000 for x in screens),screens);check('console-errors',not console,console);check('page-errors',not page_errors,page_errors);check('failed-requests',not failed,failed);browser.close()
    except Exception as e: checks.append({'name':'uncaught-exception','ok':False,'detail':f'{type(e).__name__}: {e}'})
    finally: server.shutdown();server.server_close()
    passed=sum(x['ok'] for x in checks);payload={'schema':'haihao.aircraft/80-days-browser-qa@2.0','generatedAtEpoch':time.time(),'testedUrl':url+'80-days-livery-workbench.html','headCommit':None,'sourceModel':{'bytes':23085972,'sha256':'541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'},'derivedModel':{'bytes':23789148,'sha256':'9f1b4efd5da75efee1dddbec1d06b1ad00dfb78dfb8c957a1faecaff23edad1a'},'summary':{'passed':passed,'failed':len(checks)-passed,'total':len(checks)},'checks':checks,'diagnostics':{'consoleErrors':console,'pageErrors':page_errors,'failedRequests':failed},'screenshots':screens};report.write_text(json.dumps(payload,ensure_ascii=False,indent=2));print(json.dumps(payload['summary'],indent=2));return 0 if payload['summary']['failed']==0 else 1
if __name__=='__main__': raise SystemExit(main())
