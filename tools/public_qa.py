#!/usr/bin/env python3
"""Verify the deployed workbench and every byte-pinned runtime dependency."""
from pathlib import Path
import concurrent.futures,hashlib,json,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE='https://haihao0307.github.io/guilin-dem-pipeline/aircraft/'
URL=BASE+'b24-v0171-clean-effects/'
EXPECTED=json.loads((ROOT/'reports/BUILD.json').read_text())['files']
report={'url':URL,'files':[],'checks':[],'errors':[],'visualAcceptance':False,'productionReady':False}
def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def get(url):
    request=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'B24-public-verification'})
    with urllib.request.urlopen(request,timeout=45) as response:return response.read()
def check(name,passed):report['checks'].append({'name':name,'passed':bool(passed)})
def verify_file(item):
    name,expected=item;data=get(URL+name+'?b24verify='+expected)
    return {'path':name,'bytes':len(data),'expected_blob':expected,'actual_blob':blob(data),'passed':blob(data)==expected}
def act(page,body=''):
    epoch=page.evaluate('()=>{const a=window.__B24_WORKBENCH__;'+body+';return a.frameCount;}')
    page.wait_for_function('(n)=>__B24_WORKBENCH__.frameCount>n',arg=epoch,polling=100,timeout=45000)
try:
    deadline=time.monotonic()+180
    while True:
        try:
            if blob(get(URL+'index.html?b24verify='+EXPECTED['index.html']))==EXPECTED['index.html']:break
        except Exception:
            if time.monotonic()>=deadline:raise
        if time.monotonic()>=deadline:raise TimeoutError('Expected public index not deployed')
        time.sleep(5)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:report['files']=list(pool.map(verify_file,EXPECTED.items()))
    check('all sixteen deployed runtime files match tested bytes',len(report['files'])==16 and all(x['passed'] for x in report['files']))
    accepted=get(BASE+'b24-v017-clean-restart/index.html?b24verify=accepted')
    check('accepted V017 public index unchanged',blob(accepted)=='4668be04ca97f92406dbdfcb6f10957df512bc7b')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for width,height in [(1440,900),(390,844)]:
            page=browser.new_page(viewport={'width':width,'height':height});errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            response=page.goto(URL+'?b24verify='+EXPECTED['index.html'],wait_until='domcontentloaded')
            check(f'{width} public HTTP 200',response.status==200)
            page.wait_for_function('window.__B24_WORKBENCH__?.productionEffects?.ready',timeout=150000);act(page)
            check(f'{width} correct build',page.evaluate('__B24_WORKBENCH__.build==="B24_V0171_CLEAN_EFFECTS"'))
            page.locator('#play').click();act(page)
            check(f'{width} actual play button starts task',page.evaluate('__B24_WORKBENCH__.mission.running&&__B24_WORKBENCH__.mission.time>0'))
            page.locator('#play').click();act(page)
            check(f'{width} actual play button pauses task',page.evaluate('!__B24_WORKBENCH__.mission.running'))
            act(page,'a.seek(60);a.setCamera("orbit")')
            check(f'{width} original four rotor channels',page.evaluate('__B24_WORKBENCH__.productionEffects.rotorChannels.length===4'))
            check(f'{width} no weather or fog',page.evaluate('__B24_WORKBENCH__.scene.fog===null&&!__B24_WORKBENCH__.productionEffects.weather'))
            check(f'{width} acceptance separated',page.evaluate('__B24_WORKBENCH__.acceptedBaseline.visualAcceptance&&!__B24_WORKBENCH__.visualAcceptance'))
            check(f'{width} no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            page.screenshot(path=str(ROOT/f'reports/public-{width}.png'))
            act(page,'a.reset()')
            check(f'{width} reset returns to ground start',page.evaluate('__B24_WORKBENCH__.mission.time===0&&__B24_WORKBENCH__.effects.bombs.length===0'))
            check(f'{width} no browser errors',not errors and page.evaluate('__B24_WORKBENCH__.errors.length===0'))
            report['errors']+=errors;page.close()
        browser.close()
except Exception as error:
    report['errors'].append(repr(error));check('public verification completed',False)
finally:
    report['passed']=not report['errors'] and all(c['passed'] for c in report['checks']) and len(report['checks'])==22
    report['passed_count']=sum(c['passed'] for c in report['checks']);report['total']=len(report['checks'])
    (ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/PUBLIC_QA.json').write_text(json.dumps(report,indent=2))
    print('PUBLIC_QA',json.dumps(report),flush=True)
raise SystemExit(0 if report['passed'] else 1)
