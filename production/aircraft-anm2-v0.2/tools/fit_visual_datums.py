"""Fit named exterior display datums, in the uncalibrated reference coordinate system."""
import json
from pathlib import Path
import numpy as np
from reference_geometry import read_source, EXPECTED

ROOT=Path(__file__).resolve().parents[1]
doc,src=read_source()
v,f=src[23]
t=v[f]
c=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0])
areas=np.linalg.norm(c,axis=1)/2
n=c/(2*areas[:,None]+1e-30)
cent=t.mean(axis=1)

def plane(axis,sign,interval):
    mask=(n[:,axis]*sign>.99999)&(cent[:,axis]>interval[0])&(cent[:,axis]<interval[1])
    keys=np.round(cent[:,axis],5)
    candidates=[]
    for k in np.unique(keys[mask]):
        m=mask&(keys==k)
        candidates.append((areas[m].sum(),m))
    _,m=max(candidates,key=lambda x:x[0])
    position=float(np.average(cent[m,axis],weights=areas[m]))
    residual=float(np.max(np.abs(t[m,:,axis]-position)))
    return position,residual,int(m.sum())

front=plane(0,1,(0.05,0.1))
rear=plane(0,-1,(-0.455,-0.44))
top=plane(1,1,(0.065,0.075))
side=plane(2,1,(0.02,0.028))
opposite=plane(2,-1,(-0.041,-0.035))
length=front[0]-rear[0]
barrel=src[9][0]
# Only the visible, unperforated cylindrical skin enters the fit.
skin=barrel[(barrel[:,0]>.15)&(barrel[:,0]<.36)]
initial=np.median(skin[:,1:],axis=0)
radius0=np.linalg.norm(skin[:,1:]-np.array([-.00035,-.0034]),axis=1)
skin=skin[(radius0>.022)&(radius0<.024)]
a=np.c_[2*skin[:,1],2*skin[:,2],np.ones(len(skin))]
b=(skin[:,1:]**2).sum(axis=1)
fit=np.linalg.lstsq(a,b,rcond=None)[0]
yz=fit[:2]
radius=float(np.sqrt(fit[2]+sum(yz**2)))
radialResidual=float(np.max(np.abs(np.linalg.norm(skin[:,1:]-yz,axis=1)-radius)))
axisResidual=[]
for low,high in [(0.155,.165),(.205,.215),(.255,.265),(.305,.315),(.355,.365)]:
    ring=skin[(skin[:,0]>low)&(skin[:,0]<high)]
    if len(ring)<6: continue
    a=np.c_[2*ring[:,1],2*ring[:,2],np.ones(len(ring))]
    r=np.linalg.lstsq(a,(ring[:,1:]**2).sum(axis=1),rcond=None)[0]
    axisResidual.append(float(np.linalg.norm(r[:2]-yz)/length))
origin=[front[0],float(yz[0]),float(yz[1])]
scale=1/length
def normalized(value,axis):return (value-origin[axis])*scale
def datum(id,label,axis,sign,result):
    value,residual,count=result
    return dict(datumId=id,label=label,kind='plane',axis=axis,normal=[sign if i==axis else 0 for i in range(3)],position=normalized(value,axis),sourceNode=23,supportingTriangles=count,residual=residual*scale,confidence=.97,status='reference-fitted')
datums=[
 dict(datumId='D01_LONGITUDINAL_AXIS',kind='axis',direction=[1,0,0],sourceNode=23,status='reference-fitted',confidence=.97,source='normal of receiver front/rear planes'),
 dict(datumId='D02_BARREL_CENTERLINE',kind='axis',direction=[1,0,0],point=[0,0,0],sourceNode=9,status='reference-fitted',confidence=.96,circleResidual=radialResidual*scale,ringCenterResidualMax=max(axisResidual),source='five exterior tube rings; no bounding-box center'),
 dict(datumId='D03_MUZZLE_PLANE',kind='plane',axis=0,normal=[1,0,0],position=normalized(float(barrel[:,0].max()),0),sourceNode=9,status='reference-fitted',confidence=.94,source='visible front termination planar rim'),
 datum('D04_RECEIVER_FRONT_PLANE','receiver front',0,1,front),
 datum('D05_RECEIVER_REAR_PLANE','receiver rear',0,-1,rear),
 datum('D06_RECEIVER_TOP_PLANE','receiver top',1,1,top),
 datum('D07_SIDE_PLATE_PLANE','positive-Z receiver outer face',2,1,side),
 datum('D08_OPPOSITE_SIDE_PLANE','negative-Z receiver outer face',2,-1,opposite)]
record=dict(schema='object-dna.datum-registration/0.2',entityId='ODNA:MECH:ANM2:PILOT-0001',generationId='GEN-0002',
 status='reference-datums-fitted-native-validation-pending',referenceSha256=EXPECTED,
 units='dimensionless; one receiver datum-plane separation = 1; not manufacturing dimensions',
 frame=dict(forward='+X',up='+Y',right='+Z',origin='barrel centerline at receiver-front plane',scaleReference='receiver front-to-rear datum planes'),
 sourceToReview=dict(origin=origin,uniformScale=scale,rotation=[0,0,0],method='named planes plus fitted cylinder centerline'),
 datums=datums,registrationPolicy=dict(sharedMechanicalDatumsRequired=True,boundingBoxCenterAlignmentAllowedAsFinal=False,totalLengthScaleAllowedAsFinal=False,referenceTransformReadOnly=True),
 acceptedResidualLimits=dict(plane=0.001,ringCenter=0.001),gatePass=False,nativeResiduals=None)
(ROOT/'DATUM_REGISTRATION_R02.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(dict(origin=origin,scale=scale,barrelRadius=radius*scale,ringCenterResidual=max(axisResidual),datums=datums),indent=2))
