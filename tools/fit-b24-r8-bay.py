"""Fit the static rigid slat chains to both center and side sill in source coordinates."""
import argparse,hashlib,json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser(description=__doc__)
ap.add_argument('--source',required=True,type=Path,help='External B24_LIVERY_DATA_BAY_FIXED_R1 package data directory')
ap.add_argument('--plot',type=Path,help='Optional cross-section diagnostic PNG outside runtime')
args=ap.parse_args()
SOURCE=args.source
m=json.loads((SOURCE/'SKIN_MANIFEST.json').read_text(encoding='utf8'))
payload=(SOURCE/'geometry.bin').read_bytes()
assert hashlib.sha256(payload).hexdigest()==m['payload']['sha256']=='84d0eaf16e790989145605c3cd70de1fea64e1f62a58acfafb5455c0876e2e44'
parts={p['sourceNode']:p for p in m['parts']}
recipe=json.loads((SOURCE/'BOMB_BAY_RECIPE.json').read_text(encoding='utf8'))
def geometry(id):
 p=parts[id];b=m['buffers'][p['attributes']['position']]
 v=np.frombuffer(payload,dtype='<f4',count=b['scalarCount'],offset=b['byteOffset']).reshape(-1,3).astype(float)
 mat=np.array(p['localToAssetColumnMajor']).reshape(4,4,order='F')
 world=v@mat[:3,:3].T+mat[:3,3]
 return v,world,mat

def section(id,z=0):
 v,w,mat=geometry(id)
 p=parts[id];b=m['buffers'][p['attributes']['index']]
 idx=np.frombuffer(payload,dtype={'u16':'<u2','u32':'<u4'}[b['dtype']],count=b['scalarCount'],offset=b['byteOffset']).reshape(-1,3)
 segments=[]
 for tri in w[idx]:
  pts=[]
  for a,c in [(tri[0],tri[1]),(tri[1],tri[2]),(tri[2],tri[0])]:
   if (a[2]<=z<c[2]) or (c[2]<=z<a[2]):pts.append((a+(c-a)*(z-a[2])/(c[2]-a[2]))[:2])
  if len(pts)==2:segments.append(pts)
 return np.array(segments)

def plot(path,z=0,matrices=None):
 from PIL import Image,ImageDraw
 im=Image.new('RGB',(1400,1100),'#111820');d=ImageDraw.Draw(im)
 def xy(p):return (int(60+p[0]*900),int(1000-(p[1]+2.3)*900))
 for id in [1714,1747,1760]+[s['id'] for s in recipe['slats'] if s['group']=='forward.port']:
  seg=section(id,z)
  if matrices and id in matrices:
   old=geometry(id)[2];new=matrices[id];transform=new@np.linalg.inv(old)
   a=np.concatenate([seg,np.full((*seg.shape[:2],1),z),np.ones((*seg.shape[:2],1))],axis=-1)
   seg=(a@transform.T)[:,:,:2]
  for a,b in seg:
   d.line([xy(a),xy(b)],fill='#87c4e4' if id>1650 else '#f4b46b',width=2)
 im.save(path)

def fit():
 from scipy.optimize import brentq
 from scipy.spatial.transform import Rotation
 fitted={};audit=[]
 for group in ['forward.port','forward.starboard','aft.port','aft.starboard']:
  slats=sorted([s for s in recipe['slats'] if s['group']==group],key=lambda s:s['rank'])
  sign=1 if group.endswith('.port') else -1
  z=0 if group.startswith('forward') else -2.1
  first,last=slats[0]['id'],slats[-1]['id']
  boundary=section(1714,z).reshape(-1,2)
  boundary=boundary[(boundary[:,0]*sign>.8)&(boundary[:,1]<-1)]
  low=boundary[boundary[:,1].argmin()]
  target=np.array([low[0]-sign*.010,low[1]+.008,z])
  chain=section(last,z).reshape(-1,2)
  chain=np.column_stack([chain,np.full(len(chain),z)])
  pivot=np.array([0,section(first,z)[:,:,1].min(),z])
  axis=geometry(first)[2][:3,1];axis=axis/np.linalg.norm(axis)
  if axis[2]<0:axis=-axis
  def rotate(angle):return Rotation.from_rotvec(axis*angle*sign).as_matrix()
  def moved(angle):return (chain-pivot)@rotate(angle).T+pivot
  angle=brentq(lambda a:moved(a)[:,1].max()-target[1],0,.35)
  pts=moved(angle);tip=pts[pts[:,1].argmax()];dx=target[0]-tip[0]
  correction=np.eye(4);correction[:3,:3]=rotate(angle);correction[:3,3]=pivot-rotate(angle)@pivot+np.array([dx,0,0])
  for s in slats:fitted[s['id']]=correction@geometry(s['id'])[2]
  audit.append({'group':group,'axis':axis.tolist(),'pivot':pivot.tolist(),'rotationDegrees':float(np.degrees(angle)*sign),'translationX':float(dx),'sillTarget':target.tolist(),'method':'Rigid chain rotation and translation; inner ends overlap existing central sill. No new cover or vertex edits.'})
 return fitted,audit

if __name__=='__main__':
 fitted,audit=fit()
 output={'sourcePackage':'B24_LIVERY_DATA_BAY_FIXED_R1_2026-09-07','sourceGeometrySHA256':m['payload']['sha256'],'method':'R8 static side-sill fit on original rigid slat groups','groups':audit,'parts':[{'sourceNode':id,'closed':mat.flatten(order='F').tolist()} for id,mat in fitted.items()]}
 (ROOT/'runtime/b24-r8-bay-poses.js').write_text('export const BAY_POSES_R8='+json.dumps(output,separators=(',',':'))+';\n',encoding='utf8')
 if args.plot:plot(args.plot,matrices=fitted)
 print(json.dumps(audit,indent=2))
