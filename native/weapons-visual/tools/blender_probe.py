"""Blender integration on neutral coupons. Report only; no blend, mesh, texture or image export."""
import sys, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'core'))
from recipe import Coupon,evaluate,signature,presentation_pose,roughness
import bpy
import bmesh
from mathutils import Vector

checks=[]
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    if not condition:raise AssertionError(name)

def build(label,recipe):
    pts,fs=evaluate(recipe)
    mesh=bpy.data.meshes.new(label);mesh.from_pydata(pts,[],fs);mesh.update()
    check(label+'_valid_mesh',not mesh.validate())
    obj=bpy.data.objects.new(label,mesh);bpy.context.scene.collection.objects.link(obj)
    bm=bmesh.new();bm.from_mesh(mesh)
    check(label+'_closed_manifold',all(e.is_manifold for e in bm.edges))
    check(label+'_positive_volume',bm.calc_volume(signed=True)>0)
    bm.free()
    return obj

report={'scope':'neutral visual coupons; no weapon geometry, dimensions or functional mechanism',
        'productionReady':False,'visualAcceptance':False,'rendered':False,'checks':checks}
try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    report['blenderVersion']=bpy.app.version_string
    check('pinned_blender_version',tuple(bpy.app.version)==(4,5,0))
    recipes=[Coupon(),Coupon(width=2.4,height=1.6,depth=.16,radius=.12),Coupon(width=1.1,height=.6,depth=.1,radius=.08)]
    objects=[build('coupon_'+str(i),r) for i,r in enumerate(recipes)]
    baseline=[tuple(tuple(v.co) for v in o.data.vertices) for o in objects]
    rests=[(0,0,0),(0,0,.24),(.52,0,.44)]
    offsets=[(0,0,0),(0,0,1),(0,0,2)]
    for _ in range(100):
        for t in (0,.5,1,.25,0):
            for o,r,d in zip(objects,rests,offsets):o.location=presentation_pose(r,d,t)
    check('spread_returns_to_rest',all((o.location-Vector(r)).length<1e-6 for o,r in zip(objects,rests)))
    check('spread_never_changes_local_geometry',baseline==[tuple(tuple(v.co) for v in o.data.vertices) for o in objects])
    check('no_hidden_object_rotation',all(all(v==0 for v in o.rotation_euler) for o in objects))
    point=Vector((.31,.2,0));sample=roughness(tuple(point));errors=[]
    for t in (0,.5,1,0):
        objects[1].location=presentation_pose(rests[1],offsets[1],t)
        bpy.context.view_layer.update()
        m=objects[1].matrix_world
        restored=m.inverted() @ (m @ point)
        errors.append(abs(roughness(tuple(restored))-sample))
    report['materialCoordinateMaxError']=max(errors)
    check('material_local_coordinates_stable',max(errors)<1e-6)
    mat=bpy.data.materials.new('native_linear_material');mat.use_nodes=True
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;nodes.clear()
    coord=nodes.new('ShaderNodeTexCoord');xyz=nodes.new('ShaderNodeSeparateXYZ')
    scale=nodes.new('ShaderNodeMath');scale.operation='MULTIPLY';scale.inputs[1].default_value=32
    sine=nodes.new('ShaderNodeMath');sine.operation='SINE'
    amp=nodes.new('ShaderNodeMath');amp.operation='MULTIPLY';amp.inputs[1].default_value=.04
    add=nodes.new('ShaderNodeMath');add.operation='ADD';add.inputs[1].default_value=.45;add.use_clamp=True
    bsdf=nodes.new('ShaderNodeBsdfPrincipled');out=nodes.new('ShaderNodeOutputMaterial')
    bsdf.inputs['Base Color'].default_value=(.10,.12,.13,1);bsdf.inputs['Metallic'].default_value=.9
    links.new(coord.outputs['Object'],xyz.inputs['Vector']);links.new(xyz.outputs['X'],scale.inputs[0])
    links.new(scale.outputs[0],sine.inputs[0]);links.new(sine.outputs[0],amp.inputs[0]);links.new(amp.outputs[0],add.inputs[0])
    links.new(add.outputs[0],bsdf.inputs['Roughness']);links.new(bsdf.outputs[0],out.inputs['Surface'])
    for o in objects:o.data.materials.append(mat)
    check('roughness_linked_to_analytic_graph',bsdf.inputs['Roughness'].is_linked)
    check('graph_uses_object_local_coordinates',coord.outputs['Object'].is_linked and coord.object is None)
    check('no_image_texture_nodes',all(n.bl_idname!='ShaderNodeTexImage' for n in nodes))
    check('no_image_assets',len(bpy.data.images)==0)
    check('no_external_libraries',len(bpy.data.libraries)==0)
    report['generatedMeshCount']=len(bpy.data.meshes)
    report['generatedVertices']=[len(o.data.vertices) for o in objects]
    report['recipeSignatures']=[signature(r) for r in recipes]
    report['shaderNodeCount']=len(nodes)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    check('transient_meshes_released',len(bpy.data.meshes)==0)
    check('transient_materials_released',len(bpy.data.materials)==0)
    report['passed']=True
except Exception as e:
    report['passed']=False;report['error']=repr(e)
finally:
    out=Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
