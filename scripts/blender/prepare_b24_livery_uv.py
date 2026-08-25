"""Locked Blender fallback for the 80 DAYS LiveryUV. Only eight audited nodes may receive LiveryUV."""
from __future__ import annotations
import bpy, hashlib, json, struct, sys
from pathlib import Path

SOURCE_SHA='541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
ALLOWED_NODE_IDS={719,744,1654,1666,1678,1714,1747,1760}
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if len(args)<3: raise SystemExit('Usage: blender --background --python prepare_b24_livery_uv.py -- input.glb output.glb report.json')
source_path,output_path,report_path=map(Path,args[:3]);payload=source_path.read_bytes()
if len(payload)!=23085972 or hashlib.sha256(payload).hexdigest()!=SOURCE_SHA: raise SystemExit('authoritative source GLB lock mismatch')
json_len=struct.unpack_from('<I',payload,12)[0];gltf=json.loads(payload[20:20+json_len].decode('utf8').rstrip(' \0'))
allowed_names={gltf['nodes'][i].get('name',f'node_{i}'):i for i in ALLOWED_NODE_IDS}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source_path));meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];paintable=[];records=[]
for obj in meshes:
    node_id=allowed_names.get(obj.name);allowed=node_id in ALLOWED_NODE_IDS
    if allowed:
        paintable.append(obj)
        if 'LiveryUV' not in obj.data.uv_layers: obj.data.uv_layers.new(name='LiveryUV')
    elif 'LiveryUV' in obj.data.uv_layers: raise SystemExit(f'excluded object unexpectedly contains LiveryUV: {obj.name}')
    records.append({'object':obj.name,'sourceNodeIndex':node_id,'liveryAllowed':allowed,'reason':'locked eight-node allow list' if allowed else 'excluded by locked allow list'})
if len(meshes)!=348 or len(paintable)!=8: raise SystemExit(f'inventory mismatch: meshes={len(meshes)} paintable={len(paintable)}')
bpy.ops.object.select_all(action='DESELECT')
for obj in paintable: obj.select_set(True);obj.data.uv_layers.active=obj.data.uv_layers['LiveryUV']
bpy.context.view_layer.objects.active=paintable[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15192,island_margin=.008,area_weight=.15,correct_aspect=True,scale_to_bounds=False);bpy.ops.uv.pack_islands(rotate=False,margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
report={'schema':'haihao.aircraft/blender-liveryuv@1.0','sourceSha256':SOURCE_SHA,'meshCount':len(meshes),'allowedNodeIds':sorted(ALLOWED_NODE_IDS),'paintableCount':len(paintable),'records':records,'reviewStatus':'review-required','finalLiveryUVApproved':False};report_path.parent.mkdir(parents=True,exist_ok=True);report_path.write_text(json.dumps(report,indent=2),encoding='utf8');output_path.parent.mkdir(parents=True,exist_ok=True);bpy.ops.export_scene.gltf(filepath=str(output_path),export_format='GLB',export_animations=True,export_materials='EXPORT',export_extras=True,export_yup=True);print(json.dumps({'meshCount':len(meshes),'paintableCount':len(paintable),'output':str(output_path)}))
