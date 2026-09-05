"""Real Blender cross-check of the renderer-neutral inspection contract.
Generated coupons are disposable fixtures, never substituted for an Aircraft model.
"""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'core'))
from inspection import Assembly,Part,Session,native_to_blender,DEFAULT_MATERIAL
from recipe import Coupon,evaluate
import bpy
from mathutils import Matrix,Vector

checks=[]
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    if not condition:raise AssertionError(name)

report={'schema':'wm.native.inspection-blender/1','scope':'neutral fixtures only; no product model or browser rendering','productionReady':False,'visualAcceptance':False,'rendered':False,'checks':checks}
try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    report['blenderVersion']=bpy.app.version_string
    check('pinned_version',tuple(bpy.app.version)==(4,5,0))
    assembly=Assembly([Part('root',None,'base'),Part('plate','root','coat',rest=(0,.2,0),spread=(0,1,0)),Part('badge','plate','coat',rest=(.3,0,.1),spread=(.3,0,0)),Part('support','root','base',rest=(0,-.4,0),spread=(0,-.8,0))])
    session=Session(assembly,'a'*64)
    adapter=bpy.data.objects.new('one_native_to_blender_adapter',None)
    bpy.context.scene.collection.objects.link(adapter)
    # One +90 degree proper rotation maps native +Y up to Blender +Z up.
    # This adapts a declared NEW generator convention, not a guessed imported gun pose.
    adapter.matrix_world=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
    objects={};meshes=[]
    for i,p in enumerate(assembly.parts):
        o=bpy.data.objects.new(p.id,None);bpy.context.scene.collection.objects.link(o)
        o.parent=adapter if p.parent is None else objects[p.parent]
        o.matrix_parent_inverse=Matrix.Identity(4);objects[p.id]=o
        if p.parent is not None:
            points,faces=evaluate(Coupon(width=1+i*.1,height=.6,depth=.1,radius=.08))
            m=bpy.data.meshes.new(p.id+'.generated');m.from_pydata(points,[],faces);m.update()
            shape=bpy.data.objects.new(p.id+'.fixture',m);bpy.context.scene.collection.objects.link(shape);shape.parent=o
            meshes.append(shape)
    initial=[tuple(tuple(v.co) for v in s.data.vertices) for s in meshes]
    max_error=0.
    def apply(amount):
        session.set_spread(amount);frame=session.frame()
        for p in assembly.parts:objects[p.id].matrix_basis=Matrix(frame['pose'][p.id]['local'])
        bpy.context.view_layer.update()
        return frame
    for repeat in range(100):
        for amount in (0,.2,.6,1,.4,0):
            frame=apply(amount)
            for p in assembly.parts:
                expected=adapter.matrix_world @ Matrix(frame['pose'][p.id]['world'])
                actual=objects[p.id].matrix_world
                max_error=max(max_error,max(abs(expected[i][j]-actual[i][j]) for i in range(4) for j in range(4)))
    report['maxWorldMatrixDelta']=max_error
    check('parented_pose_agrees_with_core',max_error<1e-6)
    check('local_geometry_never_changed',initial==[tuple(tuple(v.co) for v in s.data.vertices) for s in meshes])
    expected=assembly.evaluate(0)
    check('returns_to_recorded_rest',all(max(abs(objects[p.id].matrix_basis[i][j]-expected[p.id]['local'][i][j]) for i in range(4) for j in range(4))<1e-6 for p in assembly.parts))
    check('native_up_becomes_blender_up',(adapter.matrix_world.to_3x3() @ Vector((0,1,0))-Vector((0,0,1))).length<1e-7)
    check('adapter_preserves_handedness',abs(adapter.matrix_world.determinant()-1)<1e-7)
    check('roundtrip_point',(adapter.matrix_world.inverted() @ (adapter.matrix_world @ Vector((.2,.3,.4)))-Vector((.2,.3,.4))).length<1e-7)
    session.solo('badge');visibility=session.frame()['visible']
    for shape in meshes:shape.hide_render=not visibility[shape.parent.name]
    check('solo_child_keeps_parent_transform',sum(not s.hide_render for s in meshes)==1 and not bpy.data.objects['badge.fixture'].hide_render)
    session.set_hidden('plate',True);visibility=session.frame()['visible']
    check('hidden_ancestor_suppresses_descendant',not visibility['badge'])
    session.reset();session.play();session.advance(.5);session.set_spread(.5)
    check('inspection_cancels_active_presentation',not session.playing and not session.frame()['events'])
    session.reset();session.play();session.advance(20)
    check('finished_demo_has_no_residual_effects',not session.playing and not session.frame()['events'])
    session.reset();state=session.snapshot();state['state']['materials']['coat']['roughness']=.8;session.restore(state)
    before=assembly.signature;before_mesh=initial
    check('material_edit_does_not_change_assembly',assembly.signature==before and before_mesh==[tuple(tuple(v.co) for v in s.data.vertices) for s in meshes])
    bad=session.snapshot();bad['recipeHash']='b'*64;previous=session.snapshot()
    try:session.restore(bad);raise AssertionError('bad identity accepted')
    except ValueError:pass
    check('invalid_import_is_atomic',session.snapshot()==previous)
    report['generatedMeshCount']=len(bpy.data.meshes)
    check('no_texture_images',len(bpy.data.images)==0)
    check('no_external_libraries',len(bpy.data.libraries)==0)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    check('generated_resources_released',len(bpy.data.meshes)==0 and len(bpy.data.objects)==0)
    report['passed']=True
except Exception as error:
    report['passed']=False;report['error']=repr(error)
finally:
    out=Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report,indent=2))
if not report['passed']:raise SystemExit(1)
