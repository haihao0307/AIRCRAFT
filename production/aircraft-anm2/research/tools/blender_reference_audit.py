"""Temporary read-only Blender reference audit. Never exports mesh, UV or texture assets.
Optional images document the uploaded reference only; they are not a generated new product.
"""
import bpy,bmesh,json,hashlib,sys,argparse
from pathlib import Path
from mathutils import Vector

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def signature(objects):
    h=hashlib.sha256()
    for o in sorted(objects,key=lambda x:x.name):
        h.update(o.name.encode());h.update(str(tuple(tuple(r) for r in o.matrix_world)).encode())
        for v in o.data.vertices:h.update(str(tuple(v.co)).encode())
        for p in o.data.polygons:h.update(str(tuple(p.vertices)).encode())
    return h.hexdigest()

def audit(path,review=None):
    before=sha(path);bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path),import_pack_images=False)
    scene=bpy.context.scene;scene.view_layers[0].update()
    objects=[o for o in scene.objects if o.type=='MESH'];original=signature(objects)
    out={'file':path.name,'sha256':before,'blenderVersion':bpy.app.version_string,
         'importedMeshObjects':len(objects),'materials':len(bpy.data.materials),'images':len(bpy.data.images),
         'actions':len(bpy.data.actions),'objectDiagnostics':[],
         'scope':'Source-labelled appearance inventory only; no fabricated parts or physical dimensional calibration.'}
    points=[]
    for o in sorted(objects,key=lambda x:x.name):
        bm=bmesh.new();bm.from_mesh(o.data)
        out['objectDiagnostics'].append({'name':o.name,'parent':o.parent.name if o.parent else None,
          'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),'uvLayers':len(o.data.uv_layers),
          'hasCustomNormals':o.data.has_custom_normals,
          'boundaryEdgesInIndexTopology':sum(e.is_boundary for e in bm.edges),
          'nonManifoldEdgesInIndexTopology':sum(not e.is_manifold for e in bm.edges),
          'negativeWorldDeterminant':o.matrix_world.determinant()<0})
        bm.free();points.extend(o.matrix_world@Vector(v) for v in o.bound_box)
    out['topologyCaution']='UV/normal vertex splits can produce index boundaries; these counts alone do not prove visible damage or real part separability.'
    if review:
        review.mkdir(parents=True,exist_ok=True)
        lo=Vector([min(v[i] for v in points) for i in range(3)]);hi=Vector([max(v[i] for v in points) for i in range(3)])
        center=(lo+hi)*.5;span=max(hi-lo)
        scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12;scene.cycles.use_denoising=True
        scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
        scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
        scene.world=bpy.data.worlds.new('reference_review_world');scene.world.use_nodes=True
        scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.22,.24,1)
        scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.view_settings.view_transform='AgX'
        for k,v in enumerate([(3,-4,5),(-4,-2,3),(1,4,2)]):
            ld=bpy.data.lights.new('review_light_'+str(k),'AREA');ob=bpy.data.objects.new(ld.name,ld);scene.collection.objects.link(ob)
            ob.location=center+Vector(v).normalized()*span*2;ld.energy=span*span*(180 if k==0 else 100);ld.shape='DISK';ld.size=span*1.5
            ob.rotation_euler=(center-ob.location).to_track_quat('-Z','Y').to_euler()
        cd=bpy.data.cameras.new('review_camera');cam=bpy.data.objects.new('review_camera',cd);scene.collection.objects.link(cam);scene.camera=cam
        cd.type='ORTHO';cd.clip_start=.001;cd.clip_end=span*100
        renders=[]
        for name,v in [('all_oblique',(4,-6,3)),('all_side',(1,0,.07)),('all_top',(0,.02,1))]:
            cam.location=center+Vector(v).normalized()*span*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
            inv=cam.rotation_euler.to_matrix().transposed();cs=[inv@(v-center) for v in points]
            w=max(v.x for v in cs)-min(v.x for v in cs);h=max(v.y for v in cs)-min(v.y for v in cs);cd.ortho_scale=max(w,h*1.5)*1.1
            pathout=review/(name+'.png');scene.render.filepath=str(pathout);bpy.ops.render.render(write_still=True)
            renders.append({'file':pathout.name,'sha256':sha(pathout)})
        out['referenceReviewRenders']=renders;out['renderer']='Cycles CPU 12 samples, unmodified source material'
    out['sourceGeometryAndTransformsUnchanged']=signature(objects)==original
    out['sourceFileUnchanged']=sha(path)==before
    bpy.ops.wm.read_factory_settings(use_empty=True)
    out['temporaryMeshesReleased']=len(bpy.data.meshes)==0;out['temporaryImagesReleased']=len(bpy.data.images)==0
    return out
if __name__=='__main__':
    argv=sys.argv[sys.argv.index('--')+1:];p=argparse.ArgumentParser();p.add_argument('sources',nargs='+',type=Path);p.add_argument('--output',required=True,type=Path);p.add_argument('--review-dir',type=Path);a=p.parse_args(argv)
    r={'date':'2026-09-06','actualUploadedSources':True,'reports':[]}
    for i,path in enumerate(a.sources):
        r['reports'].append(audit(path,a.review_dir if i==0 else None));a.output.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    print('AUDIT_COMPLETE',[(x['file'],x['importedMeshObjects'],x['sourceFileUnchanged']) for x in r['reports']])
