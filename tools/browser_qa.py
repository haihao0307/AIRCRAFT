#!/usr/bin/env python3
from pathlib import Path
import json,threading,http.server,functools,time,os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT/'runtime')))
threading.Thread(target=server.serve_forever,daemon=True).start()
(ROOT/'reports').mkdir(exist_ok=True)
URL=os.environ.get('B24_TEST_URL','http://127.0.0.1:8765/')
report={'checks':[],'viewports':[],'visualAcceptance':False,'productionReady':False,'url':URL,'synchronization':'wait for completed render after state mutation; no result-conditioned waits'}

def act(page,body='',arg=None):
    epoch=page.evaluate('(value)=>{const a=window.__B24_WORKBENCH__;'+body+';return a.frameCount;}',arg)
    page.wait_for_function('(epoch)=>window.__B24_WORKBENCH__.frameCount>epoch',arg=epoch,polling=100,timeout=45000)

def seek(page,t):
    act(page,'a.pause();a.seek(value)',t)

def check(name,value):
    report['checks'].append({'name':name,'passed':bool(value)})
    if not value: print('FAILED',name)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for width,height in [(1440,900),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.goto(URL,wait_until='domcontentloaded')
        page.wait_for_function('window.__B24_WORKBENCH__?.productionEffects?.ready',timeout=150000)
        act(page)
        print('READY',width,page.evaluate('window.__B24_WORKBENCH__.productionEffects.audit()'))
        a=page.evaluate('window.__B24_WORKBENCH__.productionEffects.audit()')
        check(f'{width} tire selection',a['surfaceCounts']['tire']==7)
        check(f'{width} skin selection',a['surfaceCounts']['skin']>0)
        check(f'{width} four source rotor channels',len(a['rotorChannels'])==4)
        check(f'{width} geometry references',a['sourceGeometryPreserved'])
        act(page,'window.__frozen={parents:a.plane.nodes.map(n=>n.parent?.uuid),geometries:a.plane.geometries.map(g=>g.uuid)};a.pause();a.seek(121)')
        q1=page.evaluate('window.__B24_WORKBENCH__.effects.bombs[0].o.quaternion.toArray()')
        act(page)
        q2=page.evaluate('window.__B24_WORKBENCH__.effects.bombs[0].o.quaternion.toArray()')
        check(f'{width} paused roll stable',q1==q2)
        a=page.evaluate('window.__B24_WORKBENCH__.productionEffects.audit()');check(f'{width} roll visible',a['lastRoll']>0)
        seek(page,122)
        q3=page.evaluate('window.__B24_WORKBENCH__.effects.bombs[0].o.quaternion.toArray()');check(f'{width} roll advances',q3!=q1)
        seek(page,121)
        check(f'{width} rewind roll deterministic',q1==page.evaluate('window.__B24_WORKBENCH__.effects.bombs[0].o.quaternion.toArray()'))
        seek(page,60)
        active=page.evaluate("(()=>{let n=0;window.__B24_WORKBENCH__.scene.traverse(o=>{if(o.name==='B24_SOURCE_BLADE_EXPOSURE'&&o.visible)n++});return n;})()")
        check(f'{width} blur active',active>0)
        page.screenshot(path=str(ROOT/f'reports/flight-{width}.png'))
        act(page,'a.productionEffects.setEnabled(false)')
        page.screenshot(path=str(ROOT/f'reports/flight-original-{width}.png'))
        check(f'{width} A/B toggle',page.evaluate('!window.__B24_WORKBENCH__.productionEffects.enabled'))
        act(page,'a.productionEffects.setEnabled(true)')
        phases=[]
        for t in [0,5,20,30,45,58,80,100,115,121,129,150,175,190,205,218,270,326]:
            seek(page,t)
            phases.append(page.evaluate('window.__B24_WORKBENCH__.getState().phase'))
        check(f'{width} eighteen phases',len(set(phases))==18)
        seek(page,150)
        check(f'{width} four releases impacts',page.evaluate('(()=>{const s=window.__B24_WORKBENCH__.getState();return s.released===4&&s.impacts===4;})()'))
        impact=page.evaluate('window.__B24_WORKBENCH__.effects.lastImpact')
        act(page,'a.setCamera("cinema");a.seek(value+.25)',impact)
        check(f'{width} impact shot framed',page.evaluate('window.__B24_WORKBENCH__.productionEffects.impactFramed'))
        page.screenshot(path=str(ROOT/f'reports/impact-{width}.png'))
        act(page,'a.setCamera("front")')
        check(f'{width} manual camera respected',page.evaluate('!window.__B24_WORKBENCH__.productionEffects.impactFramed'))
        act(page,'a.reset()')
        check(f'{width} reset',page.evaluate('(()=>{const a=window.__B24_WORKBENCH__;return a.getState().time===0&&a.effects.bombs.length===0&&a.productionEffects.lastRoll===0;})()'))
        check(f'{width} original parent graph unchanged',page.evaluate('JSON.stringify(__frozen.parents)===JSON.stringify(__B24_WORKBENCH__.plane.nodes.map(n=>n.parent?.uuid))'))
        check(f'{width} original geometry unchanged',page.evaluate('JSON.stringify(__frozen.geometries)===JSON.stringify(__B24_WORKBENCH__.plane.geometries.map(g=>g.uuid))'))
        check(f'{width} source manifest parents',page.evaluate('(()=>{const p=__B24_WORKBENCH__.plane;return p.m.components.every(d=>p.nodes[d.id].parent===(d.parent===null?p.group:p.nodes[d.parent]));})()'))
        check(f'{width} reset hides blur',page.evaluate("(()=>{let n=0;__B24_WORKBENCH__.scene.traverse(o=>{if(o.name==='B24_SOURCE_BLADE_EXPOSURE'&&o.visible)n++});return n===0;})()"))
        digest=page.evaluate("async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',__B24_WORKBENCH__.plane.payload)),v=>v.toString(16).padStart(2,'0')).join('')")
        check(f'{width} raw payload unchanged',digest=='7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2')
        check(f'{width} no weather or fog',page.evaluate('__B24_WORKBENCH__.scene.fog===null&&!__B24_WORKBENCH__.productionEffects.weather'))
        check(f'{width} no browser error',not errors and page.evaluate('__B24_WORKBENCH__.errors.length===0'))
        check(f'{width} no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        frames0=page.evaluate('__B24_WORKBENCH__.frameCount');page.wait_for_timeout(2000);frames1=page.evaluate('__B24_WORKBENCH__.frameCount')
        check(f'{width} rendering advances',frames1>frames0)
        report['viewports'].append({'width':width,'height':height,'errors':errors,'audit':page.evaluate('__B24_WORKBENCH__.productionEffects.audit()'),'frames_in_2s':frames1-frames0,'renderer':page.evaluate('(()=>{const g=__B24_WORKBENCH__.renderer.getContext();return g.getParameter(g.RENDERER);})()')})
        page.close()
    browser.close()
server.shutdown()
report['passed']=all(c['passed'] for c in report['checks']);report['passed_count']=sum(c['passed'] for c in report['checks']);report['total']=len(report['checks'])
(ROOT/'reports/BROWSER_QA.json').write_text(json.dumps(report,indent=2))
print('BROWSER_QA_REPORT',json.dumps(report))
raise SystemExit(0 if report['passed'] else 1)
