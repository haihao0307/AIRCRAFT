"""Author dimensionless exterior rules from inspected, named visual features.
This is not a vertex/UV/triangle export. No physical calibration or hidden mechanism.
"""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
datum=json.loads((ROOT/'DATUM_REGISTRATION_R02.json').read_text())
o=datum['sourceToReview']['origin']; s=datum['sourceToReview']['uniformScale']
X=lambda v:round((v-o[0])*s,6)
Y=lambda v:round((v-o[1])*s,6)
Z=lambda v:round((v-o[2])*s,6)
D=lambda v:round(v*s,6)
def bounds(lo,hi):return dict(lo=[X(lo[0]),Y(lo[1]),Z(lo[2])],hi=[X(hi[0]),Y(hi[1]),Z(hi[2])])
def xy(x,y):return [X(x),Y(y)]

p=dict(schema='object-dna.exterior-geometry-program/0.2',revision='GEN-0002-W09-R01',entityId=datum['entityId'],
 purpose='nonfunctional visual reconstruction from an uncalibrated digital reference',
 previousResultUsedAsGeometryInput=False,units=datum['units'],frame=datum['frame'],
 evidence=dict(sourceSha256=datum['referenceSha256'],inspection='research/reference-intake-20260907/REVIEW.md',
               truth='inferred visual rules; source-group measurements are not factory dimensions'),
 sourceNodes=dict(receiver=23,sideplate=25,collar=15,barrel=9,rearGrips=17,rearCylinder=21,rearControl=27,sideHandle=19))
p['receiver']=dict(
 rear=-1,front=0,sideLo=Z(-.039246),sideHi=Z(.02518),innerNegative=Z(-.027255),
 faceX0=X(-.447569),faceX1=X(.072591),faceY0=Y(-.042492),faceY1=Y(.063632),
 bevel=D(.002668),zFlatLo=Z(-.036577),zFlatHi=Z(.022511),
 feedWindow=dict(x0=X(-.075621),x1=X(.046206),y0=Y(.023012),y1=Y(.042407),
                 notchX0=X(-.041723),notchX1=X(-.015138),notchY=Y(.052489)),
 negativeSlot=dict(x0=X(-.368159),x1=X(-.139392),y0=Y(.008096),y1=Y(.023348),floorZ=Z(-.027255)),
 negativeLowerPlate={**bounds([-.395897,-.017362,-.042861],[-.239911,.004071,-.039246]),
                     'windows':[[X(-.382221),X(-.343902),Y(-.012849),Y(-.001279),Z(-.02885)],
                                [X(-.291907),X(-.252022),Y(-.012849),Y(-.001279),Z(-.031408)]]},
 negativeTabs=[bounds([a,-.012266,-.046529],[a+.010728,.021434,-.037624]) for a in [-.442632,-.131443]],
 rearUpperLip=bounds([-.460951,.051678,-.036577],[-.447569,.065519,.022511]),
 rearLowerLip=bounds([-.460279,-.049283,-.036577],[-.447569,-.04516,.022511]),
 bottomRail=dict(x0=X(-.447569),x1=X(-.19807),shoulderEnd=X(-.175226),
                 y0=Y(-.066936),y1=Y(-.044379),shoulderY=Y(-.059321),
                 z0=Z(-.045428),z1=Z(.031363),bevel=D(.0011)),
 lowerEars=dict(x0=X(-.288633),x1=X(-.255420),y0=Y(-.085511),y1=Y(-.060679),
                zIntervals=[[Z(-.029836),Z(-.014935)],[Z(.000272),Z(.015173)]],
                holeCenter=xy(-.2720265,-.0740),holeRadius=D(.0063)))
p['cover']=dict(x0=X(-.447569),x1=X(-.001115),bandX0=X(-.053847),
 y0=Y(.042407),sideY=Y(.06455),topY=Y(.071318),
 z0=Z(-.044341),z1=Z(.030274),topZ0=Z(-.037575),topZ1=Z(.023509),
 bandZ0=Z(-.049457),bandZ1=Z(.034557),
 notchX0=X(-.041723),notchX1=X(-.015138),notchY=Y(.052489),
 pad={**bounds([-.434210,.071318,-.021614],[-.297198,.077881,.008612]),'corner':D(.005)},
 topButton=dict(center=[X(-.146737),Y(.070679),Z(.004451)],radius=D(.008768),rise=D(.004587)))
p['positivePlate']=dict(x0=X(-.442165),shoulder=X(-.232280),taperStart=X(-.2212),x1=X(-.171357),
 y0=Y(-.038347),y1=Y(.030343),tipBottom=Y(-.02316),tipTop=Y(.01168),
 zBack=Z(.018607),zNose=Z(.03142),zFace=Z(.041561),zRecess=Z(.03468),corner=D(.0033),
 slot=dict(x0=X(-.435025),x1=X(-.183715),y0=Y(-.01324),y1=Y(.00515)),
 recesses=[dict(x0=X(-.42168),x1=X(-.31249),transition=D(.01106),top=Y(.01135),bottom=Y(-.01931)),
           dict(x0=X(-.28619),x1=X(-.25708),transition=D(.0041),top=Y(.0118),bottom=Y(-.01914))],
 heads=[dict(id='rear-upper-cap',kind='dome',center=[X(-.434756),Y(.022213),Z(.040596)],radius=D(.0042255),rise=D(.002182)),
        dict(id='rear-lower-cap',kind='dome',center=[X(-.434756),Y(-.020339),Z(.040675)],radius=D(.0042255),rise=D(.002182)),
        dict(id='lower-round-head',kind='cylinder',center=[X(-.246263),Y(-.026101),Z(.036615)],radius=D(.0068695),rise=D(.013739)),
        dict(id='upper-hex-a',kind='hex',center=[X(-.29898),Y(.014011),Z(.040372)],radius=D(.0065),rise=D(.006007)),
        dict(id='upper-hex-b',kind='hex',center=[X(-.222878),Y(.014011),Z(.029774)],radius=D(.0065),rise=D(.006007))])
p['receiverHeads']=dict(radius=D(.00428),rise=D(.002249),
 rows=[dict(id='upper',x0=X(-.432537),pitch=D(.031691),count=8,y=Y(.050174),zPair=[Z(-.043539),Z(.030356)]),
       dict(id='lower',x0=X(-.432537),pitch=D(.031691),count=8,y=Y(-.050918),zPair=[Z(-.044440),Z(.030356)]),
       dict(id='forward-lower',x0=X(-.101113),pitch=D(.016480),count=5,y=Y(-.033034),zPair=[Z(-.038802),Z(.024475)])],
 frontPositions=[xy(.066312,.055926),xy(.066312,.038680),xy(.053012,.060018)],
 frontZPair=[Z(-.038561),Z(.024499)],
 rearTop=dict(x=X(-.453514),y=Y(.064948),zs=[Z(-.029243),Z(.01509)]),
 frontHex=dict(x=X(.024094),y=Y(.056671),zs=[Z(-.037578),Z(.023577)],radius=D(.00615),rise=D(.00555)))
p['feedLedges']=dict(x0=X(-.075611),x1=X(.046212),y0=Y(.010639),y1=Y(.023012),
 positiveZ0=Z(.02518),positiveZ1=Z(.041262),negativeZ0=Z(-.0575),negativeZ1=Z(-.039246),
 centerX0=X(-.042793),centerX1=X(-.014262),centerPositive=Z(.04270),centerNegative=Z(-.059904))
p['collar']=dict(x0=X(.071325),x1=X(.126162),centerYZ=[Y(-.00016),Z(-.003987)],
 radius=D(.03647),endRadius=D(.03532),bevel=D(.00115),radialSegments=24,
 lug=dict(x0=X(.0827),x1=X(.12369),y0=Y(-.062614),y1=Y(-.030),z0=Z(-.02087),z1=Z(.01289),
          corner=D(.006),holeCenter=xy(.1089,-.0470),holeRadius=D(.0078)))
p['barrel']=dict(rootX=X(.074423),jacketEnd=X(.92197),radius=D(.02298),innerRadius=D(.0152),radialSegments=96,
 holePattern=dict(firstX=X(.39065),pitch=D(.03894),stations=14,holesPerStation=4,
                  evenAngleDegrees=45,oddAngleDegrees=0,radius=D(.01065),
                  evidence='56 disconnected visible perforation wall regions; 14 alternating axial stations'),
 endBand=dict(x0=X(.912264),x1=X(.938968),radius=D(.028566),bevel=D(.0008)),
 termination=dict(x0=X(.9272),x1=X(.979574),radius=D(.02154),openingRadius=D(.01058),recessX=X(.95258)))
p['rear']=dict(
 gripCenters=[[X(-.495773),Z(.052926)],[X(-.496123),Z(-.060390)]],
 gripY0=Y(-.04197),gripY1=Y(.056827),gripRadius=D(.014763),capRadius=D(.016254),
 upperCapY=[Y(.060734),Y(.065180)],lowerCapY=[Y(-.049488),Y(-.045041)],
 frame=dict(x0=X(-.513291),x1=X(-.447833),z0=Z(-.077304),z1=Z(.069281),corner=D(.016),width=D(.0068),
            upper=[Y(.055086),Y(.061182)],lower=[Y(-.045538),Y(-.039443)]),
 cylinder=dict(x0=X(-.526714),x1=X(-.446072),centerYZ=[Y(.003353),Z(-.006328)],radius=D(.018933)),
 upperControl=dict(x0=X(-.494173),x1=X(-.447924),y0=Y(.020617),y1=Y(.058003),z0=Z(-.038616),z1=Z(.025988),thickness=D(.006)))
p['sideHandle']=dict(centerXY=[X(-.2478215),Y(.04732)],z0=Z(.050392),z1=Z(.139463),radius=D(.014692),
 armXY=[xy(-.281929,-.017),xy(-.274,-.02359),xy(-.242,-.004),xy(-.235781,.041),xy(-.237,.054),xy(-.248,.059864),xy(-.259,.050),xy(-.261,.024),xy(-.273,-.005)],
 armZ0=Z(.040651),armZ1=Z(.05214),
 attachment=bounds([-.274475,-.012948,.006836],[-.243484,.004663,.042178]),
 head=dict(center=[X(-.259084),Y(-.004251),Z(.049251)],radius=D(.0080),rise=D(.007408)))
out=ROOT/'rules';out.mkdir(exist_ok=True)
(out/'EXTERIOR_RECIPE_R01.json').write_text(json.dumps(p,indent=2)+'\n')
contract=json.loads(Path('C:/Users/Administrator/.codex/skills/create-production-3d-assets/assets/asset-contract.template.json').read_text())
contract.update(asset=dict(name='AN/M2 GEN-0002 W09 exterior review',role='hero',sourceMethod='procedural',
 provenance=[dict(author='Misja van Laatum',license='CC-BY-4.0 per GLB metadata',sourceSha256=datum['referenceSha256'])],licenseNotes='Credit reference author; no source mesh redistribution.'),
 visual=dict(approvedReferences=[datum['referenceSha256']],closestCameraMeters=None,maximumScreenCoveragePercent=85,
 silhouetteCriticalViews=['positive-Z','negative-Z','top','bottom','front','rear','receiver-root-close'],
 artDirectionNotes='Shared neutral opaque material; orthographic twins; no weathering until geometry gates pass.'),
 runtime=dict(renderer='Three.js',targetDevices=['desktop WebGL2','390x844 mobile layout'],weakestTestDevice='not physically tested; headless software renderer used',animation=False,physics=False,
 requiredNodeNames=['receiver','cover','positivePlate','collar','barrel','rear','sideHandle'],requiredExtensions=[]),
 budgets=dict(downloadMiB=2.5,decodedTextureMiB=0,triangles=100000,primitives=240,materials=3,drawCalls=240,bones=0,frameTimeMs=33.3),
 delivery=dict(format='self-contained fixed-commit HTML',glb=False,editableSourceRequired=True),
 acceptanceEvidence=dict(lockedCameraComparisons=[],neutralLightingCapture='',targetDeviceCapture='',validatorReport='pending',glbAuditReport='not-applicable'))
(ROOT/'ASSET_CONTRACT.json').write_text(json.dumps(contract,indent=2)+'\n')
print('Authored dimensionless named exterior rules:',len(p),'groups; no mesh/UV/index arrays.')
