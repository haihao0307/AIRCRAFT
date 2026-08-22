"""Prepare a non-destructive B-24 LiveryUV in Blender.

Run:
blender --background --python scripts/blender/prepare_b24_livery_uv.py -- input.glb output.glb report.json
"""
from __future__ import annotations
import bpy
import json
import re
import sys
from pathlib import Path

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(ARGS) < 3:
    raise SystemExit('Usage: blender --background --python prepare_b24_livery_uv.py -- input.glb output.glb report.json')
INPUT, OUTPUT, REPORT = map(Path, ARGS[:3])
PATTERNS = {
    'transparent': re.compile(r'glass|window|windscreen|canopy|lens|light', re.I),
    'weapon': re.compile(r'gun|barrel|weapon|turret.*(?:inner|interior|mechan|mount)', re.I),
    'mechanical': re.compile(r'prop|blade|hub|engine|cylinder|exhaust|wheel|tire|tyre|brake|gear|strut|axle|hydraulic|piston', re.I),
    'interior': re.compile(r'cockpit|interior|seat|panel|instrument|cabin|crew|radio|bomb.*rack', re.I),
    'small-fitting': re.compile(r'antenna|aerial|wire|cable|lamp|pitot|mast', re.I),
    'paintable-dynamic': re.compile(r'aileron|elevator|rudder|flap|slat|spoiler|trim', re.I),
    'paintable-static': re.compile(r'fuselage|body|skin|nose|wing|stabil|fin|tailplane|cowling|cowl|nacelle|fairing|bomb.*door|hatch|access|panel|door', re.I),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(INPUT))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
report = {'input': str(INPUT), 'output': str(OUTPUT), 'meshCount': len(meshes), 'meshes': []}
paintable = []
for obj in meshes:
    material_names = ' '.join(slot.material.name for slot in obj.material_slots if slot.material)
    key = f'{obj.name} {material_names}'
    category = 'review'
    reason = 'No decisive semantic match; requires visual audit.'
    for candidate in ('transparent', 'weapon', 'mechanical', 'interior', 'small-fitting', 'paintable-dynamic', 'paintable-static'):
        if PATTERNS[candidate].search(key):
            category = candidate
            reason = f'Matched {candidate} semantic pattern in object or material name.'
            break
    obj['liveryCategory'] = category
    obj['liveryReason'] = reason
    if category.startswith('paintable'):
        paintable.append(obj)
        if obj.data.uv_layers:
            original = obj.data.uv_layers.active
            if original and original.name == 'UVMap':
                original.name = 'OriginalUV'
        if 'LiveryUV' not in obj.data.uv_layers:
            obj.data.uv_layers.new(name='LiveryUV')
    report['meshes'].append({'name': obj.name, 'materials': material_names, 'category': category, 'reason': reason})

bpy.ops.object.select_all(action='DESELECT')
for obj in paintable:
    obj.select_set(True)
    obj.data.uv_layers.active = obj.data.uv_layers.get('LiveryUV')
if paintable:
    bpy.context.view_layer.objects.active = paintable[0]
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=0.008, area_weight=0.15, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.008)
    bpy.ops.object.mode_set(mode='OBJECT')

review_count = sum(1 for item in report['meshes'] if item['category'] == 'review')
report['paintableCount'] = len(paintable)
report['reviewCount'] = review_count
report['approvalBlocked'] = review_count > 0
REPORT.parent.mkdir(parents=True, exist_ok=True)
REPORT.write_text(json.dumps(report, indent=2), encoding='utf-8')
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB', export_animations=True, export_materials='EXPORT', export_extras=True, export_yup=True)
print(json.dumps({'meshCount': len(meshes), 'paintableCount': len(paintable), 'reviewCount': review_count, 'output': str(OUTPUT)}))
if review_count:
    raise SystemExit(f'UV preparation exported for audit, but {review_count} meshes remain in review and block production approval.')
