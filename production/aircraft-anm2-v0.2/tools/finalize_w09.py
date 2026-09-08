from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[1]
def read(p):return json.loads((R/p).read_text(encoding='utf-8'))
def write(p,d):(R/p).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
m=read('validation/W09_MEASUREMENTS.json');runtime=read('validation/w09/RUNTIME.json')
pre={'schema':'object-dna.w09-preflight/1','status':'review-candidate','summary':'已载入真实原件：4 个局部 × 6 向轮廓重合率 95.8%–99.9%；仍保留局部表面与截面差异。','visualAcceptance':False,'productionReady':False,'geometryParityAccepted':False,'regionResults':[
 {'label':'原件身份与节点','value':'SHA-256 核验通过；28 节点及原始层级、矩阵保留'},
 {'label':'同条件对照','value':'4 个局部、24 个固定正交轮廓；7 个区域、49 张中性材质视图'},
 {'label':'轮廓检查','value':'交并比最低 '+format(min(x['iou'] for x in m['silhouettes'])*100,'.2f')+'%；同时记录质心、面积、周长、连通块、孔及轮廓距离'},
 {'label':'机匣基准面','value':'前后面拟合误差均小于 0.00004 倍机匣基准长度'},
 {'label':'三维可见表面','value':'4 个局部双向采样均通过：P95 ≤ 0.01，采样最大值 ≤ 0.03 倍机匣长度；不是精确等价证明'},
 {'label':'截面与内部层面','value':'共享平面已记录环、嵌套孔、面积、周长和质心；内部叠层拓扑仍不同，保持未通过等价验收'},
 {'label':'生成与运行','value':str(runtime['stats']['triangles'])+' 三角面；0 无效面 / 0 法线错误 / 0 浏览器错误'},
 {'label':'明确剩余差异','value':'开口外沿、端面倒角和局部平滑过渡；后部与整枪仅供上下文查看'},
 {'label':'交付与设备','value':'单文件，无外部运行资源；桌面与 390×844 布局已检查；未作实体手机性能认证'}],
 'measurements':'validation/W09_MEASUREMENTS.json','runtime':'validation/w09/RUNTIME.json','manualReview':'validation/W09_VISUAL_REVIEW.md',
 'criteria':{'runtime':'finite geometry, no degenerate triangles or bad normals; under pre-existing 100000-triangle budget','geometry':'four independent visible-surface regions pass p95 <= .01 and sampled maximum <= .03; declared before first visibility-filtered measurement; full mesh equivalence not accepted'},
 'remaining':['opening ledge taper and corner shading','hidden overlap surfaces differ; section topology not equivalent','rear and full exterior contextual only','disposal semantic mapping unresolved','B24 station, block, sight and external installation unknown']}
pre['visibleSurfaceReviewPassed']=all(v['pass'] for s in m['surfaces'].values() for v in s['visibleExterior'].values())
assert pre['visibleSurfaceReviewPassed']
pre['regionalChecks']=[{'region':r,'visibleSurfacePassed':all(v['pass'] for v in s['visibleExterior'].values()),'minimumSilhouetteIoU':min(x['iou'] for x in m['silhouettes'] if x['region']==r),'wholeSolidEquivalence':'not-accepted'} for r,s in m['surfaces'].items()]
write('validation/W09_PREFLIGHT.json',pre)
c=read('CURRENT.json');c['status']='W09-local-reference-tested-review-candidate';c['currentUserReviewCandidate']={'id':'W09','path':'releases/w09/AIRCRAFT_ANM2_OBJECT_DNA_W09.html','scope':'receiver, cover and plates, root and collar','approval':'awaiting-user-review'};c['firstGeometryGate'].update(status='measured-review-candidate-parity-not-accepted',publicDeliveryBlocked=False);c['referenceStudy'].update(nativeComparisonPerformed=True,inspectedCaptures=49);c['gates'].update(G1='mapped-exterior-scope; whole-object-missing-parts-retained',G2='datum-registration-verified',G3='measured-partial-candidate; parity-not-accepted',G4='not-started',G5='runtime-preflight-only');write('CURRENT.json',c)
s=read('SEMANTIC_PARTS_R02.json')
for p in s['parts']:
 if p.get('referenceCandidates'):
  p.update(truth='inferred',referenceMapped=True,nativeStatus='present-exterior-review-candidate',mappingStatus='visual-source-group-correspondence; historical-function-not-certified')
  p.pop('missingReason',None);p['evidence']+=['rules/EXTERIOR_RECIPE_R01.json','rules/geometry-program.js','validation/W09_VISUAL_REVIEW.md']
  p['visualAcceptance']=False
s['wholeObjectComplete']=False;s['firstScopePresence']='present';write('SEMANTIC_PARTS_R02.json',s)
d=read('DATUM_REGISTRATION_R02.json');d['status']='source-registration-and-generated-front-rear-plane-residuals-measured';d['nativePlaneChecks']=m['datumResiduals'];d['otherGeneratedDatums']='not independently certified';write('DATUM_REGISTRATION_R02.json',d)
l=read('LINEAGE.json');l['activeCandidate']={'id':'W09','generation':'GEN-0002','geometryProgram':'rules/geometry-program.js','legacyGeneratorInherited':False,'referenceGeometryPersisted':False,'visualAcceptance':False};write('LINEAGE.json',l)
a=read('ASSET_CONTRACT.json');a['acceptanceEvidence'].update(lockedCameraComparisons=['validation/w09/receiver-'+v+'.png' for v in ['side','reverse','top','bottom','front','back']],neutralLightingCapture='validation/w09/receiver-oblique.png',targetDeviceCapture='validation/w09/mobile-loaded.png',validatorReport='validation/W09_PREFLIGHT.json');a['variants']=[];write('ASSET_CONTRACT.json',a)
manifest={p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in (R/'validation/w09').glob('*.png')};write('validation/W09_CAPTURE_HASHES.json',manifest)
