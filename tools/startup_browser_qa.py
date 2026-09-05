#!/usr/bin/env python3
"""Real browser regression including header stalls, body stalls, corrupt bytes and retry."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import functools,http.server,json,threading,time,urllib.parse,subprocess,shutil,os
ROOT=Path(__file__).resolve().parents[1];RT=ROOT/'runtime';REPORT=ROOT/'reports';REPORT.mkdir(exist_ok=True)
layout=json.loads((RT/'asset-layout.js').read_text().split('export const LAYOUT = ',1)[1].rstrip(';\n'))
first=layout['datasets'][0]['parts'][0]['url'][1:];counts={};guard=threading.Lock()
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def do_GET(self):
        mode=self.headers.get('X-B24-Test-Mode','normal');path=urllib.parse.urlsplit(self.path).path
        with guard:n=counts.get((mode,path),0)+1;counts[(mode,path)]=n
        try:
            if mode=='module-error' and path.endswith('/app.js'):
                self.send_error(503);return
            if path==first and mode in ('retry','header-stall','body-stall','permanent','corrupt','slow'):
                data=(RT/path.lstrip('/')).read_bytes()
                if mode=='retry' and n==1:self.send_error(503);return
                if mode=='permanent' or (mode=='header-stall' and n==1):time.sleep(70);return
                self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.end_headers()
                if mode=='body-stall' and n==1:self.wfile.write(data[:1]);self.wfile.flush();time.sleep(70);return
                if mode=='corrupt':data=bytes([data[0]^255])+data[1:]
                if mode=='slow':
                    for i in range(0,len(data),8192):self.wfile.write(data[i:i+8192]);self.wfile.flush();time.sleep(.15)
                else:self.wfile.write(data)
                return
            super().do_GET()
        except (BrokenPipeError,ConnectionResetError):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',8877),functools.partial(Handler,directory=str(RT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
report={'checks':[],'cases':[],'visualAcceptance':False,'productionReady':False,'scope':'startup and controls; no physical-device or complete-flight claim'}
def check(name,passed,**evidence):report['checks'].append({'name':name,'passed':bool(passed),**evidence});print(name,bool(passed),flush=True)
def ready(page):page.wait_for_function("window.__B24_STARTUP__?.status==='ready'",timeout=160000)
def failed(page):page.wait_for_function("window.__B24_STARTUP__?.status==='failed'",timeout=70000)
def snap(page):return page.evaluate('({status:__B24_STARTUP__.status,phase:__B24_STARTUP__.phase,error:__B24_STARTUP__.error,received:__B24_STARTUP__.receivedBytes,verified:__B24_STARTUP__.verifiedBytes,completed:__B24_STARTUP__.completedParts,cached:__B24_STARTUP__.cachedParts,retries:__B24_STARTUP__.retries,detail:document.getElementById("loadDetail").textContent})')
try:
    with sync_playwright() as p:
        opts={'headless':True,'args':['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
        if os.environ.get('B24_CHROMIUM'):opts['executable_path']=os.environ['B24_CHROMIUM']
        browser=p.chromium.launch(**opts)
        for mode in ['normal','mobile','retry','header-stall','body-stall','permanent','corrupt','module-error','slow']:
            w,h=(390,844) if mode=='mobile' else (1440,900)
            context=browser.new_context(viewport={'width':w,'height':h},extra_http_headers={'X-B24-Test-Mode':mode});page=context.new_page();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            requested=[];page.on('request',lambda r:requested.append(r.url))
            began=time.monotonic();page.goto('http://127.0.0.1:8877/',wait_until='domcontentloaded')
            if mode in ('normal','mobile','retry','header-stall','body-stall'):
                ready(page);s=snap(page)
                check(mode+' ready and overlay hidden',page.locator('#loading').evaluate("e=>e.classList.contains('hidden')"))
                check(mode+' all eighteen parts verified',s['completed']==18 and s['verified']==8917196,**s)
                check(mode+' no monolithic gzip request',not any('.gz' in u for u in requested))
                check(mode+' original payload identity',page.evaluate("__B24_WORKBENCH__.plane.digest==='7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2'"))
                if mode in ('retry','header-stall','body-stall'):check(mode+' request actually retried',s['retries']>=1)
                if mode in ('normal','mobile'):
                    page.screenshot(path=str(REPORT/f'startup-ready-{w}.png'))
                    page.locator('#play').click();page.wait_for_function('__B24_WORKBENCH__.mission.time>0');check(mode+' play works',page.evaluate('__B24_WORKBENCH__.mission.running'))
                    page.locator('#play').click();check(mode+' pause works',page.evaluate('!__B24_WORKBENCH__.mission.running'))
                    page.locator('#reset').click();check(mode+' reset works',page.evaluate('__B24_WORKBENCH__.mission.time===0'))
                    page.reload(wait_until='domcontentloaded');ready(page);check(mode+' verified cache reuse',snap(page)['cached']==18)
                check(mode+' no uncaught error',not errors,errors=errors)
            elif mode in ('permanent','corrupt','module-error'):
                failed(page);s=snap(page);check(mode+' visible finite failure',page.locator('#loadActions').is_visible(),**s)
                check(mode+' no false ready',not page.evaluate('Boolean(window.__B24_WORKBENCH__?.ready)'))
                if mode=='permanent':
                    check('blocked headers exactly three attempts',counts[(mode,first)]==3)
                    page.screenshot(path=str(REPORT/'startup-retry.png'))
                    context.set_extra_http_headers({'X-B24-Test-Mode':'resume'});page.locator('#loadRetry').click();page.wait_for_load_state('domcontentloaded');ready(page)
                    check('actual reconnect button resumes using cache',snap(page)['cached']>0,**snap(page))
                if mode=='corrupt':check('corrupt data rejected by checksum',s['error']['code']=='INTEGRITY_MISMATCH')
            elif mode=='slow':
                page.wait_for_function("__B24_STARTUP__?.receivedBytes>0&&__B24_STARTUP__?.completedParts<18",timeout=10000)
                s=snap(page);check('slow connection shows real received bytes before completion',s['received']>0 and 'MB' in s['detail'],**s)
                page.screenshot(path=str(REPORT/'startup-progress.png'));ready(page);check('slow connection eventually loads',snap(page)['status']=='ready')
            report['cases'].append({'case':mode,'elapsed_seconds':round(time.monotonic()-began,2),'state':snap(page)})
            context.close()
        browser.close()
except Exception as error:
    check('test suite completed',False,error=repr(error))
finally:
    server.shutdown();report['passed']=all(c['passed'] for c in report['checks']);report['passed_count']=sum(c['passed'] for c in report['checks']);report['total']=len(report['checks'])
    (REPORT/'STARTUP_QA.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('STARTUP_QA',json.dumps(report,ensure_ascii=False),flush=True)
raise SystemExit(0 if report['passed'] else 1)
