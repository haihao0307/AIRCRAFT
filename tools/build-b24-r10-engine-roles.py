import argparse,json,numpy as np
from pathlib import Path
ap=argparse.ArgumentParser(description='Build cosmetic engine role ranges from offline source geometry and welded component records');ap.add_argument('--input',required=True,type=Path,help='Directory containing geometry.json and components.json from the pinned source');args=ap.parse_args();out=args.input;data={m['id']:m for m in json.loads((out/'geometry.json').read_text())};components=json.loads((out/'components.json').read_text());m=data[1669];p=np.array(m['positions']).reshape(-1,3);mat=np.array(m['matrix']).reshape(4,4).T;w=(np.c_[p,np.ones(len(p))]@mat.T)[:,:3];roles=np.zeros(len(p),dtype=int);records=[]
for c in next(m['parts'] for m in components if m['id']==1669):
 v=w[c['vertices']];center=v.mean(0);ex=3.378 if abs(center[0])<5.5 else 7.802;ey=-.05645 if abs(center[0])<5.5 else .09068
 rad=np.linalg.norm(np.c_[np.abs(v[:,0])-ex,v[:,1]-ey],axis=1);span=np.ptp(v,axis=0);std=np.sqrt(np.maximum(np.linalg.eigvalsh(np.cov(v.T)),0));role=0
 if rad.max()>.5 and rad.min()>.15 and span[2]<.21 and c['triangles']>=40:role=1
 if rad.max()-rad.min()>.20 and span[2]<.075 and std[-1]>.07 and std[1]<.025:role=2
 elif rad.max()-rad.min()>.18 and .12<span[2]<.4 and std[-1]>.08 and std[0]<.016 and std[1]<.06 and c['triangles']>35:role=3
 if c['triangles']<=12 and max(span)<.055 and v[:,2].min()+(0.2874 if abs(center[0])>5.5 else 0)>2.7:role=4
 if role:roles[c['vertices']]=role;records.append({'seedTriangle':c['firstTriangle'],'role':role,'triangles':c['triangles']})
ranges=[];start=0
for i in range(1,len(roles)+1):
 if i==len(roles) or roles[i]!=roles[start]:
  if roles[start]:ranges.append([start,i-start,int(roles[start])])
  start=i
root=Path(__file__).resolve().parents[1];(root/'runtime/b24-r10-detail-regions.js').write_text('// Cosmetic material regions on unchanged source vertices; see docs/b24-generic-skin/R10.md.\nexport const ENGINE_ROLES='+json.dumps({'node':1669,'vertexCount':len(p),'ranges':ranges},separators=(',',':'))+';\n')
(root/'docs/b24-generic-skin/r10-engine-components.json').write_text(json.dumps({'sourcePayloadSHA256':'f5ff859a7ff0e38112fa099d8c7d3a4cd8e859434701fb4dd9d81629374c5e3e','method':'Welded source-component shape inspection; cosmetic roles, not manufacturer part-number identification','roles':{'1':'cylinder and rocker metal','2':'slender pushrod-cover candidate','3':'curved line and accessory candidate','4':'small exposed fastener candidate'},'records':records},indent=2))
print('Role component counts',dict(zip(*np.unique([r['role'] for r in records],return_counts=True))),'ranges',len(ranges))

gear={}
for node,seeds in {627:{0:1,104:1,1791:1,1863:1,1329:2,1489:2},1214:{0:1,96:1,1136:1,1200:1,672:2,832:2}}.items():
 values=np.zeros(len(data[node]['positions'])//3,dtype=int)
 for c in next(x['parts'] for x in components if x['id']==node):
  if c['firstTriangle'] in seeds:values[c['vertices']]=seeds[c['firstTriangle']]
 runs=[];start=0
 for i in range(1,len(values)+1):
  if i==len(values) or values[i]!=values[start]:
   if values[start]:runs.append([start,i-start,int(values[start])])
   start=i
 gear[node]={'vertexCount':len(values),'ranges':runs,'seeds':seeds}
with (root/'runtime/b24-r10-detail-regions.js').open('a',encoding='utf8') as f:f.write('export const GEAR_LINE_ROLES='+json.dumps(gear,separators=(',',':'))+';\n')
