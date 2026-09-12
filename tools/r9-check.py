from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys
base=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:18769/'
out=Path('../r9-qa')/('public' if base.startswith('https') else 'local');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(base+'b24-80days-instance-r9.html');page.wait_for_function('window.__B24_80DAYS_R9__',timeout=60000)
 for v in ['nose-port','port','front','rear','top','orbit']:
  page.locator(f'[data-view="{v}"]').click();page.wait_for_timeout(300);page.screenshot(path=str(out/f'{v}.png'))
 page.locator('[data-view="port"]').click();page.locator('#place-z').fill('6.5');assert page.evaluate('window.__B24_80DAYS_R9__.mapping.placement.z')==6.5
 with page.expect_download() as d:page.locator('#placement-export').click()
 d.value.save_as(str(out/'export.json'));page.locator('#placement-reset').click();assert page.evaluate('window.__B24_80DAYS_R9__.mapping.placement.z')==6.7
 page.set_viewport_size({'width':390,'height':844});page.locator('#mobileToggle').click();page.screenshot(path=str(out/'mobile.png'));assert page.locator('#placement-export').is_visible();assert page.evaluate('document.documentElement.scrollWidth<=390')
 page.locator('#panelClose').click();page.screenshot(path=str(out/'mobile-scene.png'));assert not page.locator('#panel').is_visible()
 report={'url':base,'errors':errors,'controls':True,'export':True,'reset':True,'viewport':[390,844],'visualAcceptance':False};(out/'qa.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close();assert not errors
