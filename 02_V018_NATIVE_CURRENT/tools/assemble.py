#!/usr/bin/env python3
"""Assemble the authorized compact candidate from locked source and local modules."""
import argparse,hashlib,json,re,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('destination',type=Path);a=p.parse_args();src=a.source.resolve();dst=a.destination.resolve();root=Path(__file__).resolve().parents[1]
if src==dst:raise ValueError('Source must remain read-only')
dst.mkdir(parents=True,exist_ok=True)
# No legacy binary or original image data is copied into the candidate.
if (dst/'assets').exists():shutil.rmtree(dst/'assets')
for name in ['audio.js','effect-state.js','effects.js','mission.js','world.js','style.css','startup.js','asset-loader.js']:
 shutil.copyfile(src/name,dst/name)
shutil.copytree(src/'vendor',dst/'vendor',dirs_exist_ok=True)
subprocess.run(['node',str(root/'tools/distill.mjs'),str(src),str(dst)],check=True)
report=json.loads((dst.parent/'reports/DISTILLATION.json').read_text());digest=report['payloadSha256'];size=report['rawPayloadBytes']
s=(src/'native-aircraft.js').read_text()
s=s.replace("import * as T from 'three';","import * as T from 'three';\nimport {MotionSystem} from './motion-system.js';")
s=s.replace('20260905-loader-r1','20260905-native-r1').replace('payloadBytes:16647376',f'payloadBytes:{size}').replace('7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2',digest)
s=s.replace("    this.tracks=m.animations[0].tracks.map", "    this.tracks=m.animations[0].tracks.map")
start=s.index('    this.tracks=m.animations[0].tracks.map');end=s.index('    this.setMechanics(1,0);',start)
s=s[:start]+'''    this.motion=new MotionSystem(this.nodes,m.motion,i=>this.block(i));
    this.spindles=this.motion.spindles;this.angles=this.motion.angles;this.speeds=this.motion.speeds;
    this.gearTracks=m.motion.actuators.gear.bindings;this.bayTracks=m.motion.actuators.bay.bindings;
'''+s[end:]
start=s.index('  sample(tr,time)');end=s.index('  minY(ids)',start)
s=s[:start]+'''  setMechanics(gear,bay){this.motion.set('gear',gear);this.motion.set('bay',bay);}
  spin(dt,rpm){this.motion.spin(dt,rpm);}
'''+s[end:]
s=re.sub(r"  reset\(\)\{this\.angles\.fill.*?\}\n", "  reset(){this.motion.reset();}\n",s)
s=s.replace('保留源节点层级，建立金属、玻璃和机械分区','恢复已核验部件姿态与独立机械控制器')
(dst/'native-aircraft.js').write_text(s)
s=(src/'app.js').read_text().replace('20260905-loader-r1','20260905-native-r1');s=s.replace("build:'B24_METAL_GRASS_MISSION_R1'","build:'B24_V018_COMPACT_DATA'")
(dst/'app.js').write_text(s)
s=(src/'production-effects.js').read_text().replace('20260905-loader-r1','20260905-native-r1').replace('B24_V0171_CLEAN_EFFECTS','B24_V018_COMPACT_DATA').replace('V017.1','V018')
s=s.replace("const box=document.createElement('section');", """api.compactData={sourceImages:0,sourceUV:0,dataBytes:"""+str(report['totalDataBytes'])+""",previousDataBytes:8917196,geometryMode:'exact-numeric-transition',parametricComplete:false,motion:plane.motion.summary()};
 const box=document.createElement('section');""")
s=s.replace('轮胎旧化、金属细节与残影</span>', '轮胎旧化、金属细节与残影</span>')
s=s.replace('关闭可比较原材质与显示效果。', f"飞机数据 {report['totalDataBytes']/1e6:.2f} MB，较上一版减少 {report['savePercent']:.1f}%。已移除原图片与 UV；整机曲面规则化仍在进行。关闭可比较原材质与显示效果。")
(dst/'production-effects.js').write_text(s)
s=(src/'index.html').read_text().replace('20260905-loader-r1','20260905-native-r1').replace('V017.1','V018').replace('正在启动 B24 V017 工作台','正在启动 B24 V018 工作台')
s=s.replace('整机数据、机械动画、跑道、任务循环、声音和镜头均按全量包继承。','载荷不含原图片和 UV。保留原外形，启用独立机械控制器。')
s=s.replace('解压原始几何与机械动画','解压纯数值几何与控制曲线')
s=s.replace('四发、起落架与弹舱动画</span><b>冻结','四发、起落架与弹舱控制</span><b>新系统对照')
s=s.replace('7ba1b923…34c2',digest[:8]+'…'+digest[-4:])
s=s.replace('V018 效果候选。','V018 数值精简与机械系统候选。')
(dst/'index.html').write_text(s)
# Same loader recovery/cache scheme, different identity; no source fallback.
s=(dst/'startup.js').read_text().replace('20260905-loader-r1','20260905-native-r1');(dst/'startup.js').write_text(s)
report['startupRecoveryPreserved']=True
runtime_files=[q for q in dst.rglob('*') if q.is_file()]
report['runtimeFileCount']=len(runtime_files);report['runtimeBytes']=sum(q.stat().st_size for q in runtime_files)
report['runtimeBlobs']={str(q.relative_to(dst)):hashlib.sha1(b'blob '+str(q.stat().st_size).encode()+b'\0'+q.read_bytes()).hexdigest() for q in runtime_files}
report['gpuGeneratedBuffers']=['procedural environment reflection','shadow maps','mission-event smoke canvas']
for q in runtime_files:
 if q.suffix in ['.glb','.gltf','.png','.jpg','.jpeg','.webp','.gif'] or q.name in ['native.bin.gz','native.json.gz']:raise ValueError('Disallowed source resource: '+str(q))
(dst.parent/'reports/DISTILLATION.json').write_text(json.dumps(report,indent=2))
print('ASSEMBLY_OK',report['runtimeFileCount'],report['totalDataBytes'])
