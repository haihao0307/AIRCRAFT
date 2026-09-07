#!/usr/bin/env python3
"""Source-derived blade profile experiment; never binds the production aircraft."""
import argparse,gzip,json,hashlib,time
from pathlib import Path
import numpy as np
from scipy.interpolate import PchipInterpolator

p=argparse.ArgumentParser();p.add_argument('--source',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--mesh',type=int,default=243);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
start=time.perf_counter();raw=gzip.decompress((a.source/'assets/native.bin.gz').read_bytes());manifest=json.loads(gzip.decompress((a.source/'assets/native.json.gz').read_bytes()));h=hashlib.sha256(raw).hexdigest();assert h=='7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2'
def block(i):
 b=manifest['blocks'][i];dt={'f32':'<f4','u16':'<u2','u32':'<u4'}[b['dtype']];return np.frombuffer(raw,dtype=dt,offset=b['offset'],count=b['byteLength']//np.dtype(dt).itemsize)
mesh=manifest['meshes'][a.mesh];v=block(mesh['positionBlock']).reshape(-1,3).astype(float);tri=v[block(mesh['indexBlock']).reshape(-1,3)];zmin,zmax=v[:,2].min(),v[:,2].max();span=zmax-zmin

def section(z,N=256):
 # Reconstruct the edge-connected contour, rejecting gaps, branches and multiple loops.
 segments=[]
 for t in tri:
  pts=[]
  for j in range(3):
   u,w=t[j],t[(j+1)%3]
   if (u[2]<=z<w[2]) or (w[2]<=z<u[2]):pts.append(u[:2]+(z-u[2])/(w[2]-u[2])*(w[:2]-u[:2]))
  if len(pts)==2 and np.linalg.norm(pts[0]-pts[1])>1e-10:segments.append(pts)
 coords={};edges=set()
 for pp in segments:
  keys=[tuple(np.round(x,8)) for x in pp]
  if keys[0]==keys[1]:continue
  for key,pt in zip(keys,pp):coords[key]=pt
  edges.add(tuple(sorted(keys)))
 graph={k:set() for k in coords}
 for u,w in edges:graph[u].add(w);graph[w].add(u)
 if any(len(x)!=2 for x in graph.values()):raise ValueError('Non-manifold source section at '+str(z))
 first=min(graph);seq=[first];prev=None;cur=first
 while True:
  nxt=next(x for x in sorted(graph[cur]) if x!=prev)
  if nxt==first:break
  if nxt in seq:raise ValueError('Self revisiting contour')
  seq.append(nxt);prev,cur=cur,nxt
 if len(seq)!=len(coords):raise ValueError('More than one source loop at '+str(z))
 poly=np.array([coords[k] for k in seq]);area=np.sum(poly[:,0]*np.roll(poly[:,1],-1)-poly[:,1]*np.roll(poly[:,0],-1))
 if area<0:poly=poly[::-1]
 pts=np.vstack([poly,poly[:1]]);length=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts,axis=0),axis=1))];length/=length[-1]
 # Uniform arc samples feed the descriptor; the connected polyline remains the distance reference.
 u=np.arange(N)/N;return poly,np.column_stack([np.interp(u,length,pts[:,j]) for j in range(2)])

def distance(pts,poly):
 e=np.roll(poly,-1,axis=0)-poly;d=pts[:,None,:]-poly;alpha=np.clip((d*e).sum(-1)/np.maximum((e*e).sum(-1),1e-20),0,1);return np.linalg.norm(d-alpha[:,:,None]*e,axis=-1).min(-1)

from scipy.optimize import minimize_scalar
M=17;N=192;cache={};iterations=[]
def coef(z):
 if z not in cache:
  poly,pts=section(z,N);cache[z]=np.fft.rfft(pts,axis=0)/N
 return cache[z]
def aligned(zs):
 c=np.array([coef(z)[:M].copy() for z in zs]);kk=np.arange(M)
 for j in range(1,len(c)):
  aa=c[j].copy();bb=c[j-1];prod=np.sum(aa*np.conj(bb),axis=1);prod[0]=0
  def objective(phi):return -float(np.real(np.sum(prod*np.exp(1j*kk*phi))))
  grid=np.linspace(-np.pi,np.pi,193);vals=[objective(p) for p in grid];best=grid[np.argmin(vals)];res=minimize_scalar(objective,bounds=(best-2*np.pi/192,best+2*np.pi/192),method='bounded',options={'xatol':1e-10});c[j]*=np.exp(1j*kk[:,None]*res.x)
 return np.stack([c.real,c.imag],axis=-1)
def generate(params,n=N):
 c=params[...,0]+1j*params[...,1];full=np.zeros((n//2+1,2),complex);full[:M]=c;return np.fft.irfft(full*n,n=n,axis=0)
zs=list(np.linspace(zmin+span*1e-4,zmax-span*1e-4,13))
for it in range(38):
 zs=sorted(zs);params=aligned(zs);sp=PchipInterpolator(zs,params,axis=0);worst=(0,None)
 for lo,hi in zip(zs,zs[1:]):
  for f in [.25,.5,.75]:
   z=lo+(hi-lo)*f;poly,ref=section(z,128);g=generate(sp(z));ds=np.r_[distance(ref,g),distance(g,poly)]
   if ds.max()>worst[0]:worst=(float(ds.max()),float(z))
 row={'stations':len(zs),'trainMax':worst[0],'worstZ':worst[1]};iterations.append(row);print(row,flush=True)
 if worst[0]<.0025 or min(abs(z-worst[1]) for z in zs)<1e-7:break
 zs.append(worst[1])
params=params.astype(np.float32);zs=np.array(zs,dtype=np.float32)
rec={'schema':'b24-closed-profile-recipe/2','sourceMesh':a.mesh,'sourcePayloadSHA256':h,'sourceSpace':'source normalized mesh local; uncalibrated in metres','sourceSpan':[float(zmin),float(zmax)],'domain':[float(zs[0]),float(zs[-1])],'stations':zs.tolist(),'coefficients':params.tolist(),'modes':M,'interpolation':'PCHIP per real and imaginary component','contourOrientation':'counterclockwise','phase':'successive-section Fourier-correlation alignment','productionBinding':0,'visualAcceptance':False}
rawRecipe=json.dumps(rec,separators=(',',':')).encode();(a.out/'blade-recipe.json').write_bytes(rawRecipe);back=json.loads(rawRecipe);sp=PchipInterpolator(back['stations'],back['coefficients'],axis=0);rng=np.random.default_rng(729103);ds=[]
for z in np.sort(rng.uniform(back['domain'][0],back['domain'][1],223)):
 poly,ref=section(z,256);g=generate(sp(z),256);ds.extend(distance(ref,g));ds.extend(distance(g,poly))
e=np.array(ds);report={'method':'edge-connected closed Fourier profile with phase alignment','sourceContourConnectionVerified':True,'trainingHistory':iterations,'validationSeed':729103,'unseenValidationSections':223,'serializedFloat32Revalidated':True,'maxLocal':float(e.max()),'rmsLocal':float(np.sqrt(np.mean(e*e))),'p95Local':float(np.quantile(e,.95)),'maxRelativeToSourceSpan':float(e.max()/span),'jsonBytes':len(rawRecipe),'gzipJSONBytes':len(gzip.compress(rawRecipe,mtime=0)),'parameterBytes':int(params.nbytes+zs.nbytes),'gateMaxLocal':.004,'numericalGatePassed':bool(e.max()<.004),'capSurfaceValidated':False,'fullSurfaceValidated':False,'productionBinding':0,'visualAcceptance':False,'elapsedSeconds':time.perf_counter()-start};(a.out/'PROFILE_QA.json').write_text(json.dumps(report,indent=2));print('REPORT',json.dumps(report),flush=True)
