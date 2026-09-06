"""Temporary neutral-light close inspection of source-labelled visual groups.
Uses a view-layer material override solely for legibility. No source geometry edits or exports.
"""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
src=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[sys.argv.index('--')+2]);out.mkdir(parents=True,exist_ok=True)
old=hashlib.sha256(src.read_bytes()).hexdigest();bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(src),import_pack_images=False);s=bpy.context.scene
objects=[o for o in s.objects if o.type=='MESH']
s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.device='CPU';s.cycles.use_denoising=True
s.render.resolution_x=1600;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world=bpy.data.worlds.new('inspection-world');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.13,.14,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
mat=bpy.data.materials.new('diagnostic-neutral-override');mat.use_nodes=True
p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.18,.19,.20,1);p.inputs['Roughness'].default_value=.55;p.inputs['Metallic'].default_value=.15
s.view_layers[0].material_override=mat
cd=bpy.data.cameras.new('review-camera');cam=bpy.data.objects.new('review-camera',cd);s.collection.objects.link(cam);s.camera=cam;cd.type='ORTHO';cd.clip_start=.001;cd.clip_end=1000
lights=[]
for i in range(3):
    d=bpy.data.lights.new('review-area-'+str(i),'AREA');o=bpy.data.objects.new(d.name,d);s.collection.objects.link(o);lights.append(o)
body_names=['Object_9','Object_15','Object_17','Object_19','Object_21','Object_23','Object_25','Object_27']
views=[('core_oblique',body_names,(2,-4,3)),('core_profile',body_names,(0,-1,.12)),('receiver_detail',['Object_17','Object_19','Object_21','Object_23','Object_25','Object_27'],(1,-4,2)),('receiver_reverse',['Object_17','Object_19','Object_21','Object_23','Object_25','Object_27'],(1,4,2))]
records=[]
for name,selection,angle in views:
    for o in objects:o.hide_render=o.name not in selection
    pts=[o.matrix_world@Vector(v) for o in objects if not o.hide_render for v in o.bound_box]
    lo=Vector([min(v[i] for v in pts) for i in range(3)]);hi=Vector([max(v[i] for v in pts) for i in range(3)]);center=(lo+hi)/2;span=max(hi-lo)
    cam.location=center+Vector(angle).normalized()*span*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    inv=cam.rotation_euler.to_matrix().transposed();ps=[inv@(v-center) for v in pts];w=max(v.x for v in ps)-min(v.x for v in ps);h=max(v.y for v in ps)-min(v.y for v in ps);cd.ortho_scale=max(w,h*1.6)*1.16
    for o,vec,power in zip(lights,[(2,-3,4),(-2,1,3),(2,4,1)],[70,35,50]):
        o.location=center+Vector(vec).normalized()*span*2;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler();o.data.energy=power*span*span;o.data.size=span*1.8
    s.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    records.append({'file':name+'.png','sha256':hashlib.sha256((out/(name+'.png')).read_bytes()).hexdigest(),'sourceObjectNames':selection})
assert hashlib.sha256(src.read_bytes()).hexdigest()==old
r={'blenderVersion':bpy.app.version_string,'referenceSha256':old,'diagnosticMaterialOverride':True,'newGeometryCreated':False,'meshExported':False,'sourceUnchanged':True,'scope':'Source visual inspection only; selected groups are not certified physical disassembly groups.','renders':records}
bpy.ops.wm.read_factory_settings(use_empty=True);r['temporaryMeshDataReleased']=len(bpy.data.meshes)==0
(out.parent/'reports/detail-review.json').write_text(json.dumps(r,indent=2)+'\n')
