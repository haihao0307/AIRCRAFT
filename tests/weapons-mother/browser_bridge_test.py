"""Browser integration-contract tests on a synthetic DOM/runtime, not product rendering."""
import json
from pathlib import Path
import re
import os
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
HTML = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R019 DOM contract fixture</title><style>body{font:16px sans-serif;margin:16px}label{display:flex;margin:12px 0;gap:8px;align-items:center}input{min-width:0;flex:1}output{width:48px}#status{overflow-wrap:anywhere}</style></head><body><p id="status">合成 DOM 合同测试，未加载生产模型</p>''' + ''.join(f'<label>{key}<input id="{key}" type="range" min="0" max="1" step=".01"><output></output></label>' for key in ['wear','oil','oxidation','roughness','detail']) + '''<script type="module">
import {createSession} from '/src/mechanical-product-forge/knowledge-distillation/material-session.mjs';
import {mountR019MaterialPanel, R019_DEPENDENCIES} from '/src/mechanical-product-forge/knowledge-distillation/r019-panel-bridge.mjs';
const lock=Object.fromEntries(['aircraft','b24'].map((p,i)=>[p,{revision:'SYNTHETIC-TEST-ONLY',geometrySha256:String(i).repeat(64),uvSha256:'a'.repeat(64),nodeGraphSha256:'b'.repeat(64)}]));
const runtime=createSession(lock); runtime.set('oil',.41);
let sourceLock=structuredClone(lock);
window.calls=[];
const adapter={ownsMaterialInputs:true,readSourceLock:()=>sourceLock,readMaterialState:p=>runtime.read(p),applyMaterialState:r=>{window.calls.push(structuredClone(r));for(const[k,v]of Object.entries(r.values)) runtime.set(k,v,r.project);return true;}};
window.boot=(full=true)=>{window.bridge?.dispose();window.bridge=mountR019MaterialPanel({document,adapter,sourceLock:lock,dependencies:full?R019_DEPENDENCIES.map(path=>({path,available:true,expectedSha256:'a'.repeat(64),actualSha256:'a'.repeat(64)})):[]});};
window.changeSource=()=>{sourceLock.aircraft.uvSha256='c'.repeat(64)};
window.restoreSource=()=>{sourceLock=structuredClone(lock)};
window.runtimeRead=p=>runtime.read(p);
window.fixtureReady=true;
</script></body></html>'''

results={'kind':'synthetic_dom_and_runtime_contract_only','productRendererTested':False,'R019OriginalRuntimeRecovered':False,'viewports':[]}
# Entirely local synthetic DOM execution; no HTTP navigation or production renderer.
with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox'])
  for w,h in [(1440,900),(390,844)]:
   page=browser.new_page(viewport={'width':w,'height':h}); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
   body, script = HTML.split('<script type="module">',1)
   page.set_content(body+'</body></html>')
   modules = [(ROOT/'src/mechanical-product-forge/knowledge-distillation'/f).read_text(encoding='utf-8') for f in ['material-session.mjs','r019-panel-bridge.mjs']]
   bundle = '\n'.join(modules+[script.split('</script>')[0]])
   bundle = re.sub(r'^import .*?;\s*$', '', bundle, flags=re.MULTILINE).replace('export ', '')
   page.add_script_tag(content=bundle);page.wait_for_function('window.fixtureReady===true')
   checks=[]
   def check(name, expr):
    value=page.evaluate(expr)
    assert value, name
    checks.append({'name':name,'passed':True})
   def set_value(key,v):page.evaluate('([key,v])=>{const x=document.getElementById(key);x.value=String(v);x.dispatchEvent(new Event("input",{bubbles:true}))}',[key,v])
   page.evaluate('boot(false)')
   check('Missing dependencies disable all five controls','!bridge.ready&&[...document.querySelectorAll("input")].every(x=>x.disabled)&&document.getElementById("status").textContent.includes("10")')
   page.evaluate('boot(true)')
   check('Mount reads runtime state rather than HTML default','bridge.ready&&Number(document.getElementById("oil").value)===.41&&calls.length===0')
   set_value('wear',.8)
   check('Input reaches adapter exactly once','calls.length===1&&runtimeRead("aircraft").wear===.8')
   check('Displayed output follows state','document.getElementById("wear").nextElementSibling.value==="0.80"')
   page.evaluate('bridge.select("b24")');set_value('wear',.9)
   check('Two projects remain isolated','runtimeRead("aircraft").wear===.8&&runtimeRead("b24").wear===.9')
   page.evaluate('bridge.reset()')
   check('Reset changes only selected project','runtimeRead("aircraft").wear===.8&&runtimeRead("b24").wear===.32')
   page.evaluate('window.saved=bridge.exportState();bridge.select("aircraft")');set_value('wear',.2);page.evaluate('bridge.importState(saved)')
   check('Export/import restores source-bound state','runtimeRead("aircraft").wear===.8&&JSON.parse(bridge.exportState()).active==="b24"')
   check('Wrong source import rejected','(()=>{const s=JSON.parse(saved);s.sourceLock.aircraft.uvSha256="f".repeat(64);try{bridge.importState(JSON.stringify(s));return false}catch{return runtimeRead("aircraft").wear===.8}})()')
   page.evaluate('window.countBeforeDispose=calls.length;bridge.dispose()');set_value('wear',.7)
   check('Dispose removes listeners','calls.length===countBeforeDispose&&!bridge.ready')
   page.evaluate('boot(true)');set_value('wear',.6)
   check('Remount does not duplicate listeners','calls.length===countBeforeDispose+1')
   page.evaluate('changeSource();window.countBeforeMismatch=calls.length');set_value('wear',.2)
   check('Runtime source drift blocks stale parameter write','!bridge.ready&&calls.length===countBeforeMismatch&&[...document.querySelectorAll("input")].every(x=>x.disabled)')
   check('Fixture remains within viewport','document.documentElement.scrollWidth<=window.innerWidth')
   assert not errors,errors
   results['viewports'].append({'width':w,'height':h,'checks':checks,'pageErrors':errors})
   page.close()
  browser.close()
results['passedChecks']=sum(len(x['checks']) for x in results['viewports'])
out=ROOT/'reports/weapons-mother/distillation-20260905/browser-contract-tests.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passedChecks':results['passedChecks'],'productRendererTested':False},indent=2))
