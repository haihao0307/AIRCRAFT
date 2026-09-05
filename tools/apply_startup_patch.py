#!/usr/bin/env python3
"""Exact, idempotent startup-only edits; refuse unknown preimages."""
from pathlib import Path
import hashlib,json
R=Path(__file__).resolve().parents[1];P=json.loads((R/'STARTUP_PATCH.json').read_text())
def blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
for name,base in P['base_runtime_blobs'].items():
    path=R/'runtime'/name;data=path.read_bytes()
    if blob(data)==P['authorized_runtime_blobs'][name]:continue
    if blob(data)!=base:raise ValueError('Unknown startup preimage: '+name)
    s=data.decode()
    if name=='native-aircraft.js':
        s=s.replace("import * as T from 'three';","import * as T from 'three';\nimport {createAssetLoader} from './asset-loader.js?boot=20260905-loader-r1';\nimport {LAYOUT} from './asset-layout.js?boot=20260905-loader-r1';",1)
        a=s.index('async function decompressed(');b=s.index('export class NativeAircraft',a);s=s[:a]+s[b:]
        a=s.index("    progress(.12,");b=s.index('    const m=JSON.parse',a)
        s=s[:a]+'''    progress(.05,'连接整机数据分段');
    const loader=createAssetLoader(LAYOUT,{baseURL:import.meta.url,signal:window.__B24_STARTUP__?.signal,
      onProgress:s=>{window.__B24_STARTUP__?.report(s);
        const label={download:'下载整机数据',retry:'连接中断，正在重试当前分段','verify-compressed':'校验已下载的完整数据',decompress:'解压原始几何与机械动画','verify-decoded':'核对原始载荷身份',complete:'整机数据校验完成'}[s.stage];
        if(label)progress(s.stage==='download'||s.stage==='retry'?.05+.45*s.receivedBytes/s.totalBytes:s.stage==='complete'?.67:.57,label);
      }});
    const {json:manifestBytes,bin:payload}=await loader.load();
'''+s[b:]
        s=s.replace("progress(.50,'保留源节点层级，建立金属、玻璃和机械分区');","progress(.70,'保留源节点层级，建立金属、玻璃和机械分区');\n    await new Promise(resolve=>requestAnimationFrame(resolve));")
    elif name=='app.js':
        s=s.replace("from './native-aircraft.js';","from './native-aircraft.js?boot=20260905-loader-r1';").replace('main().catch(fail);','export {main};')
        s=s.replace("$('loading').classList.add('hidden');$('play').disabled=false;$('reset').disabled=false;syncUI();","syncUI();")
    elif name=='production-effects.js':
        s=s.replace("if(typeof window!=='undefined'){","if(typeof window!=='undefined'&&!window.__B24_BOOTSTRAP_MANAGED__){")
    elif name=='index.html':
        s=s.replace('<h2>正在启动 B24 V017 工作台</h2>','<h2>正在启动 B24 V017.1 工作台</h2>').replace('<p id="loadText">读取已校验的整机数字资产</p>','<p id="loadText">连接三维程序</p>')
        s=s.replace('<p class="quiet">整机数据、机械动画、跑道、任务循环、声音和镜头均按全量包继承。</p>','<p id="loadDetail" aria-live="polite">准备连接</p><div id="loadActions" hidden><button id="loadRetry" type="button">重新连接</button><button id="loadCopy" type="button">复制诊断</button></div><pre id="loadDiagnostic">20260905-loader-r1</pre><p class="quiet">原始飞机与动画保持。分段下载逐项校验，连接中断会自动重试。</p>')
        s=s.replace('<script type="module" src="app.js"></script>\n<script type="module" src="production-effects.js"></script>','<script src="startup.js?boot=20260905-loader-r1"></script>')
        s=s.replace('</style></head>','''#loadDetail{font-size:12px;line-height:1.7;color:#c4cfb8}#loadActions{display:flex;gap:10px;margin-top:16px}#loadActions[hidden]{display:none}#loadActions button{background:#324334;color:#eff2d8;border:1px solid #77845f;padding:10px 14px;border-radius:5px;cursor:pointer}#loadDiagnostic{font:10px/1.5 monospace;white-space:pre-wrap;overflow-wrap:anywhere;color:#a7b196;max-height:180px;overflow:auto}#loading .loadcard{max-width:calc(100vw - 36px)}
</style></head>''')
    result=s.encode()
    if blob(result)!=P['authorized_runtime_blobs'][name]:raise ValueError('Startup patch output mismatch: '+name)
    path.write_bytes(result)
