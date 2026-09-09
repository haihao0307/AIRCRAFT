from pathlib import Path
import argparse,json,hashlib,urllib.request
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[2];ap=argparse.ArgumentParser();ap.add_argument('--commit');args=ap.parse_args();out=root/'tlo-pilot/reports'/('public' if args.commit else 'local');out.mkdir(parents=True,exist_ok=True)
base='http://127.0.0.1:18769/';launch=[]
if args.commit:
    edge=next(a['data'] for a in json.load(urllib.request.urlopen('https://dns.google/resolve?name=rawcdn.githack.com&type=A'))['Answer'] if a['type']==1)
    launch=['--host-resolver-rules=MAP rawcdn.githack.com '+edge];base='https://rawcdn.githack.com/haihao0307/AIRCRAFT/'+args.commit+'/'
sample=(root/'tlo-pilot/data/B24_Generic_Mother_01.tlo').read_bytes();expected=hashlib.sha256(sample).hexdigest();report={'url':base+'tlo-pilot/index.html','errors':[],'badResponses':[]}
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True,args=launch);page=b.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('response',lambda r:report['badResponses'].append({'url':r.url,'status':r.status}) if r.status>=400 else None)
    page.goto(report['url'],wait_until='domcontentloaded',timeout=120000)
    if 'External Content Notice' in page.title():page.get_by_role('button',name='Open the page').click()
    page.wait_for_function('window.__TLO_PILOT__?.verified.passed',timeout=120000);report['verified']=page.evaluate('__TLO_PILOT__.verified')
    assert report['verified']['sha256']==expected and report['verified']['resourceFiles']==102
    assert page.locator('#name').inner_text()=='B-24 公版母体 01'
    assert '未知' in page.locator('#timeFields').inner_text();assert page.locator('#relations tr').count()==10
    page.screenshot(path=str(out/'reader-desktop.png'),full_page=True)
    page.locator('#search').fill('runtime/b24-reference-panels-r16.js');assert page.locator('#resources tr').count()==1
    with page.expect_download() as dl:page.locator('#resources button').click()
    file=dl.value;file.save_as(str(out/'downloaded-panels.js'))
    assert (out/'downloaded-panels.js').read_bytes()==(root/'runtime/b24-reference-panels-r16.js').read_bytes()
    with page.expect_download() as dl:page.locator('#export').click()
    file=dl.value;file.save_as(str(out/'semantic-export.json'));export=json.loads((out/'semantic-export.json').read_text(encoding='utf8'))
    assert export['chunks']['TIME']['worldTime']['status']=='unknown' and len(export['chunks']['RMAP']['files'])==102
    # Corrupt local input must clear the last valid result instead of retaining a false pass.
    corrupt=bytearray(sample);corrupt[-1]^=1
    page.locator('#file').set_input_files({'name':'damaged.tlo','mimeType':'application/octet-stream','buffer':bytes(corrupt)})
    page.wait_for_function('document.querySelector("#status").classList.contains("error")');assert page.locator('#result').is_hidden()
    assert page.evaluate('window.__TLO_PILOT__===undefined');page.screenshot(path=str(out/'corruption-rejected.png'))
    page.locator('#reload').click();page.wait_for_function('window.__TLO_PILOT__?.verified.passed',timeout=120000)
    page.set_viewport_size({'width':390,'height':844});page.locator('#search').fill('');page.wait_for_timeout(100)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(out/'reader-mobile.png'),full_page=True)
    report['downloadRawFile']=True;report['semanticExport']=True;report['damagedInputRejected']=True;report['mobileOverflow']=False
    if args.commit:
        report['publicFiles']=[]
        for path in ['tlo-pilot/index.html','tlo-pilot/reader.js','tlo-pilot/reader-codec.js','tlo-pilot/reader.css','tlo-pilot/FORMAT.md']:
            actual=bytes(page.evaluate('async p=>Array.from(new Uint8Array(await(await fetch(new URL(p,location.href))).arrayBuffer()))','../'+path))
            expected_bytes=(root/path).read_bytes();assert actual.replace(b'\r\n',b'\n')==expected_bytes.replace(b'\r\n',b'\n'),path
            report['publicFiles'].append({'path':path,'sha256':hashlib.sha256(actual).hexdigest()})
    b.close()
assert not report['errors'] and not report['badResponses'],report
report['passed']=True;(out/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print('PASS',report['url'])
