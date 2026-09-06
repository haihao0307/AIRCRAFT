"""Real Chromium/WebGL first-candidate checks. Visual acceptance remains with the user."""
import argparse,functools,http.server,json,threading,time,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops,ImageStat

def run(html,out,url=None):
 out.mkdir(parents=True,exist_ok=True);result={'candidate':'Aircraft native R01','realWebGL':True,'visualAcceptance':False,'viewports':[]};server=None
 if url is None:
  server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(html.parent)))
  threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/{html.name}'
 result['url']=url
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']);result['browser']=browser.version
  for label,w,h in [('desktop',1600,1000),('mobile',390,844)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1);page=ctx.new_page();page.set_default_timeout(30000);r={'label':label,'checks':[],'errors':[],'requests':[]};result['viewports'].append(r)
   page.on('pageerror',lambda e:r['errors'].append(str(e)));page.on('console',lambda m:r['errors'].append(m.text) if m.type=='error' else None);page.on('request',lambda q:r['requests'].append(q.url))
   def check(name,good):
    r['checks'].append({'name':name,'passed':bool(good)})
    if not good:raise AssertionError(name)
   def frames(n=3):
    k=page.evaluate('WM.frames');page.wait_for_function('(n)=>WM.frames>=n',arg=k+n,timeout=90000)
   def snap(name):frames();page.screenshot(path=str(out/f'{label}-{name}.png'))
   def slider(name,v):page.locator('#'+name).evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));}',v)
   try:
    resp=page.goto(url,wait_until='load',timeout=120000);page.wait_for_function('window.WM?.ready===true',timeout=120000);frames();check('http_200',resp.status==200);snap('initial')
    a=page.evaluate('WM.audit()');r['initialAudit']=a;check('actual_scene_rendered',a['renderer']['triangles']>1000);check('eight_exterior_groups',len(a['parts'])==8);check('single_native_up_axis',a['upAxis']==[0,1,0] and a['rootIdentity']);check('no_persistent_reference_mesh',a['referenceMeshLoads']==0 and a['referenceVertexTables']==0 if 'referenceVertexTables' in a else a['referenceMeshLoads']==0);check('no_horizontal_scroll',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.locator('#info').click();check('sources_open',page.locator('#sources').evaluate('e=>e.open'));page.locator('#close-info').click()
    if w<900:page.locator('#mobile-parts').click();page.wait_for_timeout(300);snap('parts-panel')
    page.locator('[data-part="cover"]').click();check('select_part',page.evaluate('WM.state().selected')=='cover');page.locator('#solo').click();frames();check('solo_part',page.evaluate('WM.state().solo')=='cover');page.locator('#solo').click();page.locator('#hide').click();check('hide_part',page.evaluate('WM.state().hidden.includes("cover")'));page.locator('#show-all').click();frames()
    slider('spread',1);check('spread_reaches_one',page.evaluate('WM.state().spread===1&&!WM.state().playing'));check('play_disabled_when_exploded',page.locator('#play').is_disabled())
    if w<900:page.locator('[data-close]').first.click();page.wait_for_timeout(300)
    page.evaluate('WM.view("hero",true)');snap('exploded')
    check('repeat_spread_exact_rest',page.evaluate('(()=>{for(let i=0;i<100;i++){WM.setSpread(1);WM.setSpread(0);}return WM.audit().restRestored&&WM.audit().geometryUnchanged;})()'))
    if w<900:page.locator('#mobile-material').click();page.wait_for_timeout(300);snap('material-panel')
    for k in ['roughness','wear','oil','detail']:
     slider(k,.61);check('material_'+k,page.evaluate('(k)=>WM.materials()[k]===.61',k))
    for mode in ['color','roughness','normal','wire','surface']:
     page.locator('[data-mode="'+mode+'"]').click();frames();check('mode_'+mode,page.evaluate('WM.state().mode')==mode)
    page.locator('[data-light="neutral"]').click();check('neutral_light',page.evaluate('WM.state().light')=='neutral');page.locator('[data-light="studio"]').click()
    check('snapshot_roundtrip',page.evaluate('(()=>{const s=WM.snapshot();WM.setSpread(.5);WM.restore(s);return WM.state().spread===s.state.spread&&!WM.state().playing;})()'))
    check('wrong_recipe_rejected_atomically',page.evaluate('(()=>{const before=JSON.stringify(WM.snapshot()),s=WM.snapshot();s.schema="other";try{WM.restore(s);return false}catch{return before===JSON.stringify(WM.snapshot())}})()'))
    if w<900:page.locator('[data-close]').last.click();page.wait_for_timeout(300)
    page.evaluate('WM.select("receiver");WM.view("detail",true);WM.setMaterials({roughness:.10,wear:.24,oil:.2,detail:.55})');frames();page.locator('#canvas').screenshot(path=str(out/f'{label}-rough-low.png'))
    page.evaluate('WM.setMaterials({roughness:.9,wear:.24,oil:.2,detail:.55})');frames();page.locator('#canvas').screenshot(path=str(out/f'{label}-rough-high.png'))
    aa=Image.open(out/f'{label}-rough-low.png').convert('RGB');bb=Image.open(out/f'{label}-rough-high.png').convert('RGB');diff=ImageChops.difference(aa,bb);r['roughnessMeanPixelDelta']=sum(ImageStat.Stat(diff).mean)/3;check('material_changes_real_pixels',r['roughnessMeanPixelDelta']>.05)
    page.evaluate('WM.setMaterials({roughness:.5,wear:.24,oil:.2,detail:.55});WM.select(null)');snap('detail');page.locator('#compare').click();snap('comparison');page.locator('#compare').click();page.evaluate('WM.reset()');frames()
    page.locator('#play').click();frames(7);check('play_advances_time',page.evaluate('WM.state().time>0&&WM.state().playing'));page.locator('#play').click();t=page.evaluate('WM.state().time');frames();check('pause_freezes_time',page.evaluate('WM.state().time')==t)
    page.evaluate('WM.seek(.63)');check('fifth_event_accent',page.evaluate('WM.audit().events.some(e=>e.index===5&&e.tracer)'));snap('animation');check('bounded_effect_pool',page.evaluate('WM.audit().activeCases<=WM.audit().capacity'))
    page.evaluate('WM.seek(12)');check('complete_clears_effects',page.evaluate('WM.audit().activeCases===0'));page.locator('#replay').click();check('replay_clears_state',page.evaluate('WM.state().time===0&&WM.audit().activeCases===0'))
    page.locator('[data-view="side"]').click();page.wait_for_timeout(600);snap('side');page.locator('[data-view="top"]').click();page.wait_for_timeout(600);snap('top');page.evaluate('WM.reset()');frames();snap('final')
    final=page.evaluate('WM.audit()');r['finalAudit']=final;check('geometry_preserved_during_controls',final['geometryUnchanged'] and final['rootIdentity']);check('no_javascript_shader_errors',not r['errors']);check('self_contained_requests',len([u for u in r['requests'] if not u.startswith(url.split('/aircraft/')[0])])==0 if '/aircraft/' in url else all(u.startswith('http://127.0.0.1:') for u in r['requests']))
   except Exception as e:
    r['failure']=str(e);r['traceback']=traceback.format_exc()
    try:page.screenshot(path=str(out/f'{label}-failure.png'))
    except Exception:pass
   finally:ctx.close()
  browser.close()
 if server:server.shutdown()
 result['passed']=all('failure' not in r for r in result['viewports']);result['passedChecks']=sum(sum(c['passed'] for c in r['checks']) for r in result['viewports']);(out/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':result['passed'],'checks':result['passedChecks']}))
 if not result['passed']:raise SystemExit(1)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('html',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--url');a=p.parse_args();run(a.html,a.out,a.url)
