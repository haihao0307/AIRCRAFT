"""Run only after verify.py --extract and serving that recovered directory on 18770."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2];out=root/'tlo-pilot/reports/recovered';out.mkdir(parents=True,exist_ok=True)
report={'url':'http://127.0.0.1:18770/b24-wing-seams-r16.html','source':'102 files extracted from TLO sample fb76422e2999536a935132b2c28c382e69a86bef9969cf2ca21e9650da8e01a5','errors':[],'badResponses':[],'states':{},'cameras':{}}
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':1440,'height':960})
    page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None);page.on('response',lambda r:report['badResponses'].append(r.url) if r.status>=400 else None)
    page.goto(report['url'],wait_until='domcontentloaded',timeout=120000);page.wait_for_function('window.__B24_SERVICE_R16__',timeout=120000)
    report['sourceAudit']=page.evaluate('__B24_R16_QA__.sourceBufferAudit()');assert report['sourceAudit']['payloadSHA256']=='f5ff859a7ff0e38112fa099d8c7d3a4cd8e859434701fb4dd9d81629374c5e3e' and report['sourceAudit']['meshCount']==348
    for preset in ['new','maintained','field','damage','repaired']:
        page.locator('[data-life='+preset+']').click();s=page.evaluate('__B24_SERVICE_R16__.state()');assert s['preset']==preset;report['states'][preset]=s
    page.locator('[data-life=maintained]').click()
    for view in ['orbit','perspective-front','perspective-rear','top','bottom','front','rear']:
        page.locator('#views [data-view='+view+']').click();page.wait_for_timeout(120);camera=page.evaluate('__B24_R16_QA__.camera()');report['cameras'][view]=camera
        assert camera['rootScale']==[1,1,1] and camera['type']==('perspective' if view in ['orbit','perspective-front','perspective-rear'] else 'orthographic')
        if view in ['orbit','perspective-front','perspective-rear','top']:page.screenshot(path=str(out/(view+'.png')))
    page.locator('[data-service-view=tail-root]').click();page.screenshot(path=str(out/'tail-root.png'))
    page.locator('#views [data-view=orbit]').click();page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'mobile.png'))
    b.close()
assert not report['errors'] and not report['badResponses'],report
report['passed']=True;(out/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print('PASS recovered TLO 3D source and core interactions',flush=True)
