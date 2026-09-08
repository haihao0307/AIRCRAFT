"""Read native buffers via stdin only. Persist measurements, never product meshes."""
import sys,json,base64,io
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage
from reference_geometry import read_source

root=Path(__file__).resolve().parents[1]
data=json.load(sys.stdin)
reg=json.loads((root/'DATUM_REGISTRATION_R02.json').read_text(encoding='utf-8'))['sourceToReview']
_,src=read_source()
source={k:trimesh.Trimesh((v-np.array(reg['origin']))*reg['uniformScale'],f,process=False) for k,(v,f) in src.items()}
native=[(m,trimesh.Trimesh(np.array(m['vertices']).reshape(-1,3),np.array(m['indices']).reshape(-1,3),process=False)) for m in data['native']]
regions={'rear':([17,19,21,27],['rear','sideHandle'],None),'supply':([6,7,11],['supplyBox','supplyBelt'],None)}
report={'schema':'object-dna.w11-measurements/1','units':'receiver datum separation = 1; uncalibrated display coordinates','surfaceMethod':'bidirectional area-weighted surface sampling, 4000 points each, exact nearest triangle; includes hidden overlapping surfaces; diagnostic, not exterior-only acceptance','silhouetteMethod':'identical orthographic camera and pixel viewport; threshold 127; 4-neighbour boundary; distances in pixels','stats':data['stats'],'silhouettes':[],'surfaces':{},'sections':{},'datumResiduals':[]}
for m in data['masks']:
 a,b=[np.asarray(Image.open(io.BytesIO(base64.b64decode(s))).convert('RGB'))[:,:,0]>127 for s in m['data']]
 overlay=np.full((*a.shape,3),245,dtype=np.uint8);overlay[a&b]=[100,116,122];overlay[a&~b]=[0,160,210];overlay[b&~a]=[220,65,50]
 Image.fromarray(overlay).save(root/'validation/w11'/('difference-'+m['region']+'-'+m['view']+'.png'))
 def desc(x):
  edge=x & ~ndimage.binary_erosion(x);ys,xs=np.nonzero(x)
  return {'areaPixels':int(x.sum()),'perimeterBoundaryPixels':int(edge.sum()),'centroidPixels':[float(xs.mean()),float(ys.mean())],'connectedComponents':int(ndimage.label(x)[1]),'holes':int(ndimage.label(ndimage.binary_fill_holes(x)&~x)[1])},edge
 da,ea=desc(a);db,eb=desc(b);dist=np.r_[ndimage.distance_transform_edt(~eb)[ea],ndimage.distance_transform_edt(~ea)[eb]]
 report['silhouettes'].append({'region':m['region'],'view':m['view'],'iou':float((a&b).sum()/(a|b).sum()),'contourP95Pixels':float(np.percentile(dist,95)),'contourMaxPixels':float(dist.max()),'reference':da,'native':db})
for name,(nodes,groups,clip) in regions.items():
 a=trimesh.util.concatenate([source[n] for n in nodes]);b=trimesh.util.concatenate([mesh for m,mesh in native if m['semantic'] in groups])
 if clip is not None:a=a.slice_plane([clip,0,0],[-1,0,0]);b=b.slice_plane([clip,0,0],[-1,0,0])
 measures={}
 for direction,first,second in [('referenceToNative',a,b),('nativeToReference',b,a)]:
  pts,_=trimesh.sample.sample_surface(first,4000,seed=409)
  distances=[]
  for p in np.array_split(pts,20):distances.extend(trimesh.proximity.closest_point(second,p)[1])
  measures[direction]={'mean':float(np.mean(distances)),'p95':float(np.percentile(distances,95)),'maxSampled':float(np.max(distances))}
 # Additional exterior-only test: a sampled point must have an unobstructed
 # ray toward at least one of the six review directions on its OWN surface.
 # Declare these review thresholds before running this new visibility test.
 measures['visibleExteriorThresholds']={'p95':.01,'maxSampled':.03,'scope':'each direction independently; dimensionless review tolerance, not manufacturing tolerance'}
 visible_results={}
 for direction,first,second in [('referenceToNative',a,b),('nativeToReference',b,a)]:
  pts,_=trimesh.sample.sample_surface(first,2000,seed=911)
  visible=np.zeros(len(pts),dtype=bool)
  for axis in range(3):
   for sign in [-1,1]:
    d=np.eye(3)[axis]*sign
    for ids in np.array_split(np.flatnonzero(~visible),20):
     if len(ids):visible[ids]|=~first.ray.intersects_any(pts[ids]+d*1e-5,np.tile(d,(len(ids),1)))
  distances=[]
  for p in np.array_split(pts[visible],20):
   if len(p):distances.extend(trimesh.proximity.closest_point(second,p)[1])
  p95=float(np.percentile(distances,95));mx=float(np.max(distances))
  if p95>.01:
   bad=pts[visible][np.array(distances)>.01];print('VISIBLE ERROR REGION',name,direction,'bounds',bad.min(axis=0).tolist(),bad.max(axis=0).tolist(),'centroid',bad.mean(axis=0).tolist(),flush=True)
  visible_results[direction]={'visibleSamples':int(visible.sum()),'p95':p95,'maxSampled':mx,'pass':p95<=.01 and mx<=.03}
 measures['visibleExterior']=visible_results
 report['surfaces'][name]=measures
 print(name,measures,flush=True)
 # Shared plane sections: geometric contour loops, no normalized envelopes.
 stations=[-1.10,-1.05] if name=='rear' else [-.2,-.15,-.05]
 sections=[]
 for x in stations:
  row={'planeX':x}
  for label,mesh in [('reference',a),('native',b)]:
   sec=mesh.section(plane_origin=[x,0,0],plane_normal=[1,0,0])
   if sec is None:row[label]={'loops':0};continue
   loops=[p[:,1:] for p in sec.discrete if len(p)>3 and np.linalg.norm(p[0]-p[-1])<1e-5]
   from shapely.geometry import Polygon
   polys=[Polygon(p) for p in loops];polys=[p for p in polys if p.is_valid and p.area>1e-10]
   # Nested loops reported explicitly; disjoint/overlapping solid shells remain separate.
   row[label]={'loops':len(loops),'validLoops':len(polys),'nestedLoops':sum(any(q.contains(p.representative_point()) and q.area>p.area for q in polys) for p in polys),'summedLoopArea':sum(p.area for p in polys),'summedPerimeter':sum(p.length for p in polys),'areaWeightedCentroidYZ':(np.average([[p.centroid.x,p.centroid.y] for p in polys],axis=0,weights=[p.area for p in polys]).tolist() if polys else None)}
  sections.append(row)
 report['sections'][name]=sections
for datum,meshname,axis,target in [('front','receiver-central-shell',0,0),('rear','receiver-central-shell',0,-1)]:
 mesh=next(mesh for m,mesh in native if m['name']==meshname)
 normals=mesh.face_normals;centers=mesh.triangles_center;valid=(abs(normals[:,axis])>.9999)&(abs(centers[:,axis]-target)<.02)
 pos=float(np.average(centers[valid,axis],weights=mesh.area_faces[valid]));report['datumResiduals'].append({'datum':datum,'nativeFittedPlane':pos,'target':target,'absoluteResidual':abs(pos-target),'fit':'area weighted planar generated triangles'})
(root/'validation/W11_MEASUREMENTS.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('min silhouette IoU',min(m['iou'] for m in report['silhouettes']))
