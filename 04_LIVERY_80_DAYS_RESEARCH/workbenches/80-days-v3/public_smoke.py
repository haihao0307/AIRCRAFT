"""Public smoke test. All requests use the real network, with no route overrides."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
here=Path(__file__).resolve().parent
head=(here/'PUBLISHED_HEAD.txt').read_text().strip()
url=f'https://raw.githack.com/haihao0307/AIRCRAFT/{head}/80-days-workbench-v3.html'
report={'url':url,'commit':head,'requestOverrides':False,'visualAcceptance':False,'productionReady':False}
try:
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        page=b.new_page(viewport={'width':1440,'height':960})
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        response=page.goto(url,wait_until='domcontentloaded',timeout=90000)
        report['httpStatus']=response.status
        page.wait_for_function('window.__B24QA?.ready || window.__B24QA?.errors.length',timeout=60000)
        report['initial']=page.evaluate('window.__B24QA')
        if not report['initial']['ready']: raise RuntimeError('Public page did not initialize')
        page.wait_for_timeout(1000)
        page.screenshot(path=str(here/'qa/public-material.png'))
        page.locator('[data-mode="aircraft"]').click()
        page.wait_for_function('window.__B24QA.modelVerified || window.__B24QA.modelLoadError',timeout=120000)
        state=page.evaluate('window.__B24QA')
        report['realNetworkModelVerified']=state['modelVerified']
        report['modelLoadError']=state.get('modelLoadError')
        report['modelBytes']=state.get('modelBytes')
        report['pageErrors']=errors
        report['result']='passed' if response.status==200 and state['modelVerified'] and not errors else 'failed'
        page.screenshot(path=str(here/'qa/public-aircraft.png'))
        b.close()
except Exception as e:
    report['result']='failed'
    report['failure']=repr(e)
finally:
    (here/'PUBLIC_SMOKE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
if report['result']!='passed':raise SystemExit(1)
