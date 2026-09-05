#!/usr/bin/env python3
"""Real Chromium WebGL tests of the built S01 page. No synthetic DOM or renderer.
Software GPU runner results do not certify physical-device performance or visual approval.
"""
import argparse, functools, hashlib, http.server, json, pathlib, threading, time, traceback
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

def run(html, out):
 out.mkdir(parents=True,exist_ok=True)
 report={'scope':'S01 historical visual sample; R019 not restored','htmlSha256':hashlib.sha256(html.read_bytes()).hexdigest(),'realWebGL':True,'productionReady':False,'userVisualAcceptance':False,'viewports':[]}
 handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(html.parent))
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 started=time.monotonic();failures=[]
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
   report['browser']=browser.version
   for width,height in [(1440,1000),(390,844)]:
    label='desktop' if width>760 else 'mobile'
    ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,accept_downloads=True)
    page=ctx.new_page();page.set_default_timeout(25000)
    result={'name':label,'viewport':[width,height],'checks':[],'pageErrors':[],'consoleErrors':[],'requests':[]}
    report['viewports'].append(result)
    page.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
    page.on('console',lambda m:result['consoleErrors'].append(m.text) if m.type=='error' else None)
    page.on('request',lambda r:result['requests'].append(r.url))
    def check(name,condition):
     result['checks'].append({'name':name,'passed':bool(condition)})
     if not condition:raise AssertionError(name)
    def frames(count=3):
     n=page.evaluate('__WM_STUDIO__.renders')
     page.wait_for_function('(n)=>__WM_STUDIO__.renders>=n',arg=n+count,timeout=60000)
    def set_range(key,value):
     page.locator('#'+key).evaluate('(el,v)=>{el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));}',value)
    def capture(name):
     frames();page.screenshot(path=str(out/(label+'-'+name+'.png')))
    try:
     t=time.monotonic();response=page.goto(f'http://127.0.0.1:{server.server_port}/{html.name}',wait_until='load',timeout=90000)
     page.wait_for_function('window.__WM_STUDIO__?.ready===true',timeout=90000);frames()
     result['initializationSeconds']=round(time.monotonic()-t,3)
     check('real_document_loaded',response.status==200)
     result['webgl']=page.evaluate('(()=>{const g=document.getElementById("viewport").getContext("webgl2");const e=g.getExtension("WEBGL_debug_renderer_info");return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)};})()')
     capture('initial')
     audit=page.evaluate('()=>__WM_STUDIO__.audit()');result['initialAudit']=audit
     check('product_triangles_rendered',audit['productSceneRendered'] and audit['renderer']['render']['triangles']>=12709)
     check('all_31_original_accessors_exact',audit['sourceMatch'] and audit['exactAccessorMatch'] and audit['accessors']==31)
     check('source_node_matrices_unchanged',audit['nodeTransformsUnchanged'])
     check('layout_no_horizontal_overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
     page.locator('#source-info').click();check('source_dialog_opens',page.locator('#source-dialog').evaluate('e=>e.open'))
     check('source_scope_explicit', 'V016' in page.locator('#source-dialog').inner_text() and 'R019' in page.locator('#source-dialog').inner_text())
     page.locator('#close-source').click()
     if width<760:
      page.locator('#open-panel').click();check('mobile_panel_opens',page.locator('#panel').evaluate('e=>e.classList.contains("open")'));capture('panel')
     for name in ['wear','oil','oxidation','roughness','detail']:
      set_range(name,.57);check('control_'+name,page.evaluate('(n)=>__WM_STUDIO__.state().values[n]===.57',name))
     with page.expect_download() as di:page.locator('#save-state').click()
     saved=out/(label+'-saved.json');di.value.save_as(str(saved));expected=json.loads(saved.read_text())['values']
     set_range('roughness',.2);page.locator('#state-file').set_input_files(str(saved));page.wait_for_function('__WM_STUDIO__.state().values.roughness===.57')
     check('actual_export_import_restores_parameters',page.evaluate('__WM_STUDIO__.state().values')==expected)
     check('wrong_source_record_rejected',page.evaluate('(()=>{const before=__WM_STUDIO__.snapshot();const s=structuredClone(before);s.sourceLock.uvSha256="0".repeat(64);try{__WM_STUDIO__.restore(s);return false}catch{return JSON.stringify(before)===JSON.stringify(__WM_STUDIO__.snapshot());}})()'))
     check('invalid_values_rejected_without_mutation',page.evaluate('(()=>{const before=__WM_STUDIO__.snapshot();try{__WM_STUDIO__.applyValues({...before.values,oil:Infinity});return false}catch{return JSON.stringify(before)===JSON.stringify(__WM_STUDIO__.snapshot());}})()'))
     page.locator('#reset-material').click();check('reset_restores_study_defaults',page.evaluate('__WM_STUDIO__.state().values.roughness===.50&&__WM_STUDIO__.state().values.oil===.28'))
     for mode in ['color','roughness','normal','uv','wire','surface']:
      page.locator('[data-channel="'+mode+'"]').click();frames();check('channel_'+mode,page.evaluate('__WM_STUDIO__.state().channel')==mode)
      if mode=='uv':capture('uv')
     for mode in ['neutral','grazing','studio']:
      page.locator('[data-light="'+mode+'"]').click();frames();check('light_'+mode,page.evaluate('__WM_STUDIO__.state().light')==mode)
     if width<760:page.locator('#close-panel').click();check('mobile_panel_closes',not page.locator('#panel').evaluate('e=>e.classList.contains("open")'))
     page.evaluate('__WM_STUDIO__.setView("detail",false)');frames()
     fixed=page.evaluate('__WM_STUDIO__.state()');set_range('roughness',.12);frames();page.locator('#viewport').screenshot(path=str(out/(label+'-rough-low.png')))
     set_range('roughness',.91);frames();page.locator('#viewport').screenshot(path=str(out/(label+'-rough-high.png')))
     a=Image.open(out/(label+'-rough-low.png')).convert('RGB');b=Image.open(out/(label+'-rough-high.png')).convert('RGB')
     region=(int(a.width*.1),int(a.height*.28),int(a.width*.9),int(a.height*.70));difference=ImageChops.difference(a.crop(region),b.crop(region));changed=sum(1 for px in difference.getdata() if max(px)>2)
     result['roughnessPixelDifference']={'crop':region,'pixelsOver2':changed,'meanAbsoluteChannelDelta':sum(ImageStat.Stat(difference).mean)/3}
     check('roughness_changes_real_model_pixels',changed>200)
     current=page.evaluate('__WM_STUDIO__.state()');delta=max(abs(x-y) for key in ['camera','target'] for x,y in zip(fixed[key],current[key]));result['fixedCameraMaxAbsoluteDelta']=delta;check('roughness_comparison_same_camera_and_exposure',delta<1e-10 and fixed['exposure']==current['exposure'])
     page.evaluate('__WM_STUDIO__.applyValues({wear:.32,oil:.28,oxidation:.12,roughness:.50,detail:.68})');capture('detail')
     page.locator('#compare').click();frames();check('same_camera_AB_activated',page.evaluate('__WM_STUDIO__.state().compared'));capture('compare')
     set_range('split',63);check('split_control_moves_boundary',page.evaluate('__WM_STUDIO__.state().split===.63'))
     page.locator('#compare').click();page.evaluate('__WM_STUDIO__.setView("hero",false)');frames()
     for mode in ['side','top','detail','hero']:
      page.locator('[data-view="'+mode+'"]').click();page.wait_for_timeout(600);frames();check('camera_'+mode,page.evaluate('__WM_STUDIO__.state().currentView')==mode)
     before=page.evaluate('__WM_STUDIO__.state().camera');page.locator('#rotate').click();frames(6);check('auto_orbit_changes_camera',before!=page.evaluate('__WM_STUDIO__.state().camera'));page.locator('#rotate').click()
     page.evaluate('__WM_STUDIO__.setView("hero",false)');frames();capture('final')
     final=page.evaluate('()=>__WM_STUDIO__.audit()');result['finalAudit']=final
     check('all_parameter_camera_changes_preserve_source',final['sourceMatch'] and final['exactAccessorMatch'] and final['nodeTransformsUnchanged'])
     external=[u for u in result['requests'] if not u.startswith(f'http://127.0.0.1:{server.server_port}/') and not u.startswith(('blob:','data:'))]
     check('no_external_asset_requests',not external)
     check('no_javascript_or_shader_errors',not result['pageErrors'] and not result['consoleErrors'])
    except Exception as e:
     result['failure']=str(e);result['traceback']=traceback.format_exc();failures.append(label+': '+str(e))
     try:page.screenshot(path=str(out/(label+'-failure.png')))
     except Exception:pass
    finally:ctx.close()
   # Separate real local-file load checks that the delivered single HTML needs no server/CDN.
   ctx=browser.new_context(viewport={'width':1100,'height':760});p=ctx.new_page();requests=[];p.on('request',lambda r:requests.append(r.url))
   try:
    p.goto(html.resolve().as_uri(),wait_until='load',timeout=90000);p.wait_for_function('window.__WM_STUDIO__?.ready&&__WM_STUDIO__.renders>2',timeout=90000)
    offline=p.evaluate('()=>__WM_STUDIO__.audit()');report['fileURLTest']={'passed':offline['exactAccessorMatch'] and offline['productSceneRendered'],'requests':requests};p.screenshot(path=str(out/'offline-file.png'))
    if not report['fileURLTest']['passed']:failures.append('local-file audit')
   except Exception as e:report['fileURLTest']={'passed':False,'failure':str(e)};failures.append('local-file: '+str(e))
   ctx.close();browser.close()
 finally:
  server.shutdown();report['elapsedSeconds']=round(time.monotonic()-started,3);report['passedChecks']=sum(sum(c['passed'] for c in v['checks']) for v in report['viewports']);report['failures']=failures;report['passed']=not failures
  (out/'browser-qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'passed':report['passed'],'passedChecks':report['passedChecks'],'failures':failures},ensure_ascii=False))
 if failures:raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('html',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args();run(a.html,a.output)
