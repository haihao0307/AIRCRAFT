"""Actual URL/file Chromium tests for W05. No reference upload and no mock renderer.
Source-context behavior is separately tested locally with the actual supplied GLB.
"""
import argparse, hashlib, json, traceback
from pathlib import Path
from urllib.parse import urlsplit
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

def run(url,out,expected=None):
 out.mkdir(parents=True,exist_ok=True)
 report={'version':'W05','url':url,'mode':'actual HTTP navigation' if url.startswith('http') else 'actual local file navigation','wholeSourceTested':False,'visualAcceptance':False,'completeReplicaFinished':False,'viewports':[]}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
  report['browser']=browser.version
  for label,w,h in [('desktop',1500,950),('mobile',390,844)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1,accept_downloads=True)
   page=ctx.new_page();page.set_default_timeout(30000)
   r={'label':label,'viewport':[w,h],'checks':[],'errors':[],'requests':[]};report['viewports'].append(r)
   page.on('pageerror',lambda e:r['errors'].append(str(e)))
   page.on('console',lambda m:r['errors'].append(m.text) if m.type=='error' else None)
   page.on('request',lambda q:r['requests'].append(q.url))
   def check(name,ok):
    r['checks'].append({'name':name,'passed':bool(ok)})
    if not ok:raise AssertionError(name)
   def settled():
    n=page.evaluate('W05.frame');page.evaluate('W05.requestRender()');page.wait_for_function('(n)=>W05.frame>n',arg=n,timeout=60000);page.wait_for_timeout(150)
   def snap(name):settled();page.screenshot(path=str(out/f'{label}-{name}.png'))
   def slider(k,v):page.locator('#'+k).evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));}',v)
   try:
    response=page.goto(url,wait_until='load',timeout=90000)
    page.wait_for_function('window.W05?.ready&&W05.frame>0',timeout=90000)
    if url.startswith('http'):
     check('public_http_200',response.status==200)
     r['servedHTMLSha256']=hashlib.sha256(response.body()).hexdigest()
     if expected:check('exact_reviewed_HTML',r['servedHTMLSha256']==expected)
    initial=page.evaluate('W05.audit()');r['initialAudit']=initial
    check('native_sideplate_without_reference',not initial['referenceLoaded'] and initial['nativeStats']['featureGroups']==6)
    check('W04_geometry_retained',initial['nativeStats']['triangles']==4904 and initial['nativeGeometryUnchanged'])
    check('actual_triangles_rendered',initial['renderer']['triangles']>1000)
    check('no_horizontal_overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.locator('#info').click();check('source_scope_opens',page.locator('#info-dialog').evaluate('e=>e.open'));page.locator('#close-info').click();snap('initial')
    if w<900:
     page.locator('#surface-mobile').click();page.wait_for_timeout(250);check('mobile_keeps_3d_visible',page.locator('#stage').bounding_box()['height']>100)
    fixed=page.evaluate('W05.snapshot().camera')
    for preset in ['baseline','service','dry','oily','oxidized','weathered']:
     page.locator('[data-preset="'+preset+'"]').click();settled();check('preset_'+preset,page.locator('[data-preset="'+preset+'"]').evaluate('e=>e.classList.contains("active")'))
    for key in ['roughness','metalness','grain','relief','film','wear','oxidation','dust','scratches']:
     slider(key,.63);check('control_'+key,page.evaluate('(k)=>W05.surfaceValues()[k]',key)==.63)
    check('invalid_input_is_atomic',page.evaluate('(()=>{const v=W05.surfaceValues();try{W05.setSurface({...v,metalness:NaN});return false}catch{return JSON.stringify(v)===JSON.stringify(W05.surfaceValues())}})()'))
    with page.expect_download() as di:page.locator('#export').click()
    record=out/f'{label}-parameters.json';di.value.save_as(str(record))
    slider('dust',.11);page.locator('#note-file').set_input_files(str(record));page.wait_for_function('W05.surfaceValues().dust===.63')
    check('actual_parameter_export_import',page.evaluate('W05.surfaceValues().dust===.63'))
    check('presets_preserve_camera',page.evaluate('(s)=>["position","target"].every(k=>s[k].every((v,i)=>Math.abs(v-W05.snapshot().camera[k][i])<1e-10))',fixed))
    for mode in ['basecolor','roughness','metalness','normal','facing','wire','neutral','pbr']:
     page.locator('[data-channel="'+mode+'"]').click();settled();check('channel_'+mode,page.evaluate('W05.state().channel')==mode)
    page.locator('[data-preset="service"]').click()
    if w<900:snap('material-panel');page.locator('[data-close]').last.click();page.wait_for_timeout(250)
    page.evaluate('W05.showAll();W05.fit("oblique")');settled();base=page.evaluate('W05.surfaceValues()')
    for key in ['roughness','metalness']:
     for name,value in [('low',.12),('high',.9)]:
      page.evaluate('([v,k,x])=>W05.setSurface({...v,[k]:x})',[base,key,value]);settled();page.locator('#viewport').screenshot(path=str(out/f'{label}-{key}-{name}.png'))
     a=Image.open(out/f'{label}-{key}-low.png').convert('RGB');b=Image.open(out/f'{label}-{key}-high.png').convert('RGB')
     delta=sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3;r[key+'MeanPixelDelta']=delta;check(key+'_changes_rendered_pixels',delta>.05)
    page.evaluate('(v)=>W05.setSurface(v)',base);page.evaluate('W05.fit("reverse")');snap('reverse')
    check('reverse_gap_explained',not page.locator('#rear-note').is_hidden())
    a=page.evaluate('W05.audit()');check('no_fabricated_backplate_or_screw_shank',not a['rearIsClosedSolid'] and not a['screwShanksOrThreadsBuilt'])
    page.evaluate('for(let i=0;i<100;i++){W05.setSpread(1);W05.setSpread(0)}');check('spread_preserves_geometry',page.evaluate('W05.audit()')['nativeGeometryHash']==initial['nativeGeometryHash'])
    page.evaluate('W05.fit("oblique")');snap('final')
    r['finalAudit']=page.evaluate('W05.audit()')
    check('no_script_or_shader_errors',not r['errors'])
    check('no_external_assets_or_source_transfer',len(r['requests'])==1 and urlsplit(r['requests'][0]).scheme==urlsplit(url).scheme)
   except Exception as e:
    r['failure']=str(e);r['traceback']=traceback.format_exc()
    try:page.screenshot(path=str(out/f'{label}-failure.png'))
    except Exception:pass
   finally:ctx.close()
  browser.close()
 report['passed']=all('failure' not in r for r in report['viewports'])
 report['passedChecks']=sum(sum(c['passed'] for c in r['checks']) for r in report['viewports'])
 (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'passed':report['passed'],'checks':report['passedChecks'],'failures':[r.get('failure') for r in report['viewports']]}))
 if not report['passed']:raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('url');p.add_argument('--out',type=Path,required=True);p.add_argument('--sha256');a=p.parse_args();run(a.url,a.out,a.sha256)
