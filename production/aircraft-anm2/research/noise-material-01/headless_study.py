"""Headless source-material experiment. Exports only report and review renders.
No .blend, model, vertex/UV array or image texture is exported.
"""
import sys,json,hashlib,time,os
from pathlib import Path
from array import array
import bpy
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from surface_program import Recipe,compile_blender,evaluate
args=sys.argv[sys.argv.index('--')+1:]
source=Path(args[0]);report_path=Path(args[1]);views=Path(args[2]);views.mkdir(parents=True,exist_ok=True)
source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash=='2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b'
assert bpy.app.background, 'This script must not run in a UI session'
assert bpy.app.version==(4,5,0)
report={'schema':'aircraft.headless.material-study/1','studyOnly':True,'sourceSha256':source_hash,
'blenderVersion':bpy.app.version_string,'background':bpy.app.background,'DISPLAY':os.environ.get('DISPLAY'),
'localIsolatedRunner':True,'userDesktopControlled':False,'productModelBuilt':False,'webWorkbenchBuilt':False,
'oldRuntimeImported':False,'oldAnimationImported':False,'oldMaterialImportedAsCandidate':False,
'candidatePhysicallyCalibrated':False,'humanVisualAccepted':False,'newAssetExported':False,'checks':{},'renders':[]}
started=time.monotonic()
try:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(source),import_pack_images=False)
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 def geom_sig():
  h=hashlib.sha256()
  for o in sorted(meshes,key=lambda o:o.name):
   h.update(o.name.encode());h.update(json.dumps([list(row) for row in o.matrix_world]).encode())
   a=array('f',[0])*(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',a);h.update(a.tobytes())
   b=array('i',[0])*len(o.data.loops);o.data.loops.foreach_get('vertex_index',b);h.update(b.tobytes())
   for uv in o.data.uv_layers:
    u=array('f',[0])*(len(uv.data)*2);uv.data.foreach_get('uv',u);h.update(u.tobytes())
  return h.hexdigest()
 before=geom_sig();report['originalMeshObjects']=len(meshes);report['originalImages']=len(bpy.data.images)
 chosen=[bpy.data.objects.get(n) for n in ('Object_23','Object_25')]
 assert all(o is not None and o.type=='MESH' for o in chosen)
 report['sourceMeshLabels']=[{'object':o.name,'parent':o.parent.name if o.parent else None} for o in chosen]
 for o in meshes:o.hide_render=o not in chosen
 mats=[];recipes=[]
 for o in chosen:
  local_span=max(max(v[i] for v in o.bound_box)-min(v[i] for v in o.bound_box) for i in range(3))
  r=Recipe('source-study.'+o.parent.name)
  m=compile_blender(r,local_span,footprint_sigma=.0005)
  o.data.materials.clear();o.data.materials.append(m);mats.append(m);recipes.append(r)
 report['nodeCounts']=[len(m.node_tree.nodes) for m in mats]
 report['checks']['imageNodesAbsent']=not any(n.bl_idname=='ShaderNodeTexImage' for m in mats for n in m.node_tree.nodes)
 report['checks']['noImageAssets']=len(bpy.data.images)==0
 max_delta=0.
 for o,r in zip(chosen,recipes):
  p=Vector((.123,.234,.345));world=o.matrix_world@p;rest=o.matrix_world.inverted()@world
  base=evaluate(r,tuple(p));other=evaluate(r,tuple(rest))
  max_delta=max(max_delta,abs(base['roughness']-other['roughness']))
 report['localCoordinateRoundTripRoughnessDelta']=max_delta
 report['checks']['restCoordinateRoundTrip']=max_delta<2e-4
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=128;s.cycles.seed=47;s.cycles.use_denoising=False
 s.render.threads_mode='FIXED';s.render.threads=6;s.render.resolution_x=768;s.render.resolution_y=512;s.render.resolution_percentage=100
 s.view_settings.view_transform='AgX';s.view_settings.exposure=0;s.view_settings.gamma=1
 s.world=bpy.data.worlds.new('headless-review-world');s.world.use_nodes=True
 s.world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.17,.18,1)
 s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
 points=[o.matrix_world@Vector(v) for o in chosen for v in o.bound_box]
 lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)]);center=(lo+hi)/2;size=max(hi-lo)
 cd=bpy.data.cameras.new('material-review-camera');cam=bpy.data.objects.new(cd.name,cd);s.collection.objects.link(cam);s.camera=cam
 cd.type='ORTHO';cam.location=center+Vector((.65,-4,1.8)).normalized()*size*3
 cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cd.clip_start=.001;cd.clip_end=1000
 rot=cam.rotation_euler.to_matrix().transposed();projected=[rot@(v-center) for v in points]
 w=max(v.x for v in projected)-min(v.x for v in projected);h=max(v.y for v in projected)-min(v.y for v in projected)
 cd.ortho_scale=max(w,h*1.5)*1.12
 for i,(direction,power) in enumerate([((1,-3,4),75),((-2,-1,1),30),((1,3,2),55)]):
  light=bpy.data.lights.new('review-light-'+str(i),'AREA');ob=bpy.data.objects.new(light.name,light);s.collection.objects.link(ob)
  ob.location=center+Vector(direction).normalized()*size*2;ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
  light.energy=power*size*size;light.shape='DISK';light.size=size*1.4
 bpy.context.view_layer.update()
 fixed={'cameraMatrix':[list(x) for x in cam.matrix_world], 'renderSize':[768,512],'samples':128,'seed':47,'viewTransform':'AgX'}
 def render(label):
  t=time.monotonic();s.render.filepath=str(views/(label+'.png'));bpy.ops.render.render(write_still=True)
  raw=Path(s.render.filepath).read_bytes();report['renders'].append({'label':label,'sha256':hashlib.sha256(raw).hexdigest(),'seconds':round(time.monotonic()-t,3)})
 for m in mats:
  for n in m.node_tree.nodes:
   if n.bl_idname=='ShaderNodeBump':n.inputs['Strength'].default_value=0
 render('base_fields_no_relief')
 for m in mats:
  for n in m.node_tree.nodes:
   if n.bl_idname=='ShaderNodeBump':n.inputs['Strength'].default_value=1
 render('same_fields_with_micro_relief')
 report['fixedRenderConditions']=fixed
 report['checks']['sameMeshAndUVAndWorldTransforms']=before==geom_sig()
 report['checks']['sourceFileUnchanged']=source_hash==hashlib.sha256(source.read_bytes()).hexdigest()
 report['checks']['actuallyHeadless']=bool(bpy.app.background)
 assert all(report['checks'].values()),report['checks']
 report['passed']=True
except Exception as e:
 report['passed']=False;report['error']=repr(e);raise
finally:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 report['releasedMeshDatablocks']=len(bpy.data.meshes)==0;report['releasedImageDatablocks']=len(bpy.data.images)==0
 report['elapsedSeconds']=round(time.monotonic()-started,3)
 report['scope']='Two original source mesh objects with new provisional material only. No weapon rebuilding, historical finish certification, automatic anti-aliasing or browser performance test.'
 report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('STUDY_REPORT',str(report_path),report.get('passed'))
