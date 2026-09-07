#!/usr/bin/env python3
from pathlib import Path
import argparse,json,hashlib

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path('.'));ap.add_argument('--output',type=Path,required=True);a=ap.parse_args()
    root=a.root
    src_path=root/'production/aircraft-anm2/releases/w07/AIRCRAFT_B24_ANM2_W07_PROGRESS.html'
    graph_path=root/'production/aircraft-anm2/object-dna-v0.1/MEASUREMENT_GRAPH_R01.json'
    here=root/'production/aircraft-anm2/workbench/w08'
    src=src_path.read_text();css=(here/'w08.css').read_text();mk=(here/'measurement-kernel.js').read_text();ov=(here/'overlay.js').read_text();prior=json.loads(graph_path.read_text())
    prior_small={'schema':prior['schema'],'measurementId':prior['measurementId'],'anchors':prior['anchors'],'globalRatios':prior['globalRatios']}
    marker='window.W07={ready:true,'
    if marker not in src: raise RuntimeError('W07 runtime marker missing')
    src=src.replace(marker,"window.W07={ready:true,_targets:()=>({nativeRoot:native.root,referenceWrapper:refView?.wrapper||null,nativeScene,refScene,nativeBox,nativeSize,nativeCenter}),",1)
    src=src.replace('</style>',css+'\n</style>',1)
    panel='''<section id="w08-measure" aria-label="Object DNA Measurement Kernel"><canvas id="w08-chart"></canvas><div class="w08-side"><div class="w08-head"><span>OBJECT DNA · MEASUREMENT KERNEL R01</span><span id="w08-run">启动中</span></div><div class="w08-grid"><span>Native</span><b id="w08-native">待测</b><span>Reference</span><b id="w08-ref">载入原件后测量</b><span>截面包络差</span><b id="w08-diff">等待 A/B</b></div><div class="w08-range"><span>截面 t</span><input id="w08-t" type="range" min="0" max="1" step="0.001" value="0.399654"><output id="w08-tout">0.400</output></div><div class="w08-grid"><span>最近语义锚点</span><b id="w08-anchor">A4_RECEIVER_FRONT_TRANSITION · inferred</b></div><button id="w08-remeasure">重新测量当前双对象</button><div class="w08-note">64 个归一化纵向截面。只比较外部包络与语义锚点，不保存原件顶点、UV或制造尺寸。默认重点位于机匣与前部连续关系。</div></div></section>'''
    src=src.replace('</main>',panel+'</main>',1)
    script='\n<script>window.W08_MEASUREMENT_PRIOR='+json.dumps(prior_small,separators=(',',':'))+';</script>\n<script>'+mk.replace('</script','<\\/script')+'</script>\n<script>'+ov.replace('</script','<\\/script')+'</script>\n'
    src=src.replace('</body>',script+'</body>',1)
    src=src.replace('W07 双对象与功能关系工作台','W08 Object DNA Measurement Kernel 工作台').replace('W07 进展版','W08 测量内核版')
    a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(src)
    receipt={'schema':'object-dna.w08.fixed-html/0.1','bytes':a.output.stat().st_size,'sha256':sha(a.output),'sourceW07Sha256':sha(src_path),'measurementGraphSha256':sha(graph_path),'referenceEmbedded':False,'productMeshFiles':0,'productRasterTextures':0,'nativeRuntimeSections':64,'referenceRuntimeSectionsWhenLoaded':64,'visualAcceptance':False,'productionReady':False}
    a.output.with_suffix('.receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__': main()
