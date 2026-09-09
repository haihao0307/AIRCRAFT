from pathlib import Path
import hashlib,json,zipfile,sys,uuid
from codec import cbor_encode,encode_wsd,decode_profile

ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'tlo-pilot';DATA=OUT/'data';DATA.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
SOURCE_COMMIT='636f26ec102680b4154a6f9dca0cf49fc951f51e'
RENDER_COMMIT='47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a'
ZIP_SHA='c50241d9587267025dcb8849b195ca4f31a1b653604a69a16928c8cf61002b84'
archive=(ROOT/'releases/B24_Generic_Mother_01_Full_2026-09-09.zip').read_bytes();assert sha(archive)==ZIP_SHA
with zipfile.ZipFile(ROOT/'releases/B24_Generic_Mother_01_Full_2026-09-09.zip') as z:
    resources={n.split('/',1)[1]:z.read(n) for n in z.namelist() if not n.endswith('/')}
assert len(resources)==102
baseline=json.loads(resources['MANIFEST.json'])
for f in baseline['files']:assert sha(resources[f['path']])==f['sha256'] and len(resources[f['path']])==f['bytes']
accepted=json.loads(resources['CURRENT.json']);qa=json.loads(resources['reports/service-life-r16/public/qa.json'])
oid='urn:mother:aircraft:b24:generic:01';typeid='urn:type:aircraft:b24:generic-family';fid=oid+':local-frame'
unknown=lambda reason:{'status':'unknown','reason':reason}
profile={'profile':'tlo-mother01-pilot/0.1','status':'experimental-not-a-final-TLO-standard','container':'WSD0/0.1','semanticEncoding':'cbor-m01-subset/1','requiredChunks':['VOCB','FRAM','TIME','DNA_','OBJS','RELS','EVNT','PROV','RMAP'],'optionalUnknownChunks':'preserve raw bytes on whole-file roundtrip; do not interpret','blobEncoding':'identity bytes; path and SHA256 in RMAP','readerExecution':'data-only; embedded JS is never executed by the reader','spec':'../FORMAT.md'}
vocab={'id':'tlo-m01-vocabulary/0.1','definitions':{
    'objectId':'Persistent logical identity; a content hash identifies a revision, not a new physical object.',
    'genericTemplate':'Reusable digital aircraft baseline; no assertion that this record is a particular historical aircraft.',
    'recordedDate':'Project record date; never silently interpreted as historical aircraft world time.',
    'worldTime':'Effective physical-world time, explicitly unknown when no evidence exists.',
    'localFrame':'Coordinate frame of the inherited numeric model; not a geographic CRS.',
    'valueStatus':'known, unknown, not-provided, not-applicable, conflict, or not-implemented; zero is a known numerical value only.',
    'typeOf':'Category membership, not physical containment or pose parenting.',
    'representationPartOf':'A named region of this digital baseline; source node IDs identify its inherited representation.',
    'poseReferencedTo':'A reference-frame relation; must not be inferred from type or project ownership.',
    'managedBy':'Project responsibility; not physical composition.',
    'derivedFrom':'Versioned source lineage; independent of physical parentage.',
    'normalizedService':'Illustrative 0..1 appearance state; not elapsed hours or dates.',
    'requiredFor':'basic-meaning, full-file-recovery, or rendering; necessity has a declared task scope.',
    'sourceResource':'Byte-exact resource in the accepted package, including exact numeric transition and editable code.',
    'evidenceResource':'Acceptance/documentation material; not runtime geometry and not proof of historical accuracy.',
    'visualAcceptance':'User acceptance of displayed appearance; does not establish manufacturing calibration.',
    'plannedDerivative':'A future work direction only; no historical instance, crew membership, or identifying number is fabricated.'},
    'requiredTerms':['objectId','genericTemplate','worldTime','localFrame','valueStatus','typeOf','poseReferencedTo','managedBy','derivedFrom','normalizedService'],
    'numericPolicy':'Integers retain exact signed/unsigned values through 64 bits. Binary64 floats remain binary64. This profile uses no implicit defaults.'}
frames={'frames':[{'id':fid,'kind':'local-model','units':{'length':'m','angle':'rad'},'handedness':'right','axes':{'x':'inherited lateral positive axis','y':'up','z':'forward toward nose'},'origin':'inherited model root, not geodetic origin','worldLocation':unknown('generic baseline has no evidenced geographic position'),'worldCRS':{'status':'not-provided'},'worldPose':unknown('no placement in Earth frame')}],'frameContract':'Presentation uses normal perspective; measurement views are explicitly orthographic. Paired comparisons share camera, datum and scale.'}
time={'recordedDate':{'status':'known','value':'2026-09-09','calendar':'Gregorian','precision':'day','meaning':'project acceptance and trial record'},'worldTime':unknown('generic baseline has no historical flight instant'),'flightHours':unknown('service sliders were not calibrated to hours'),'stateTimeMode':'illustrative-static-preset','eventOrder':'array-order; project events only'}
objects=[{'objectId':oid,'kind':'genericTemplate','name':'B-24 公版母体 01','typeId':typeid,'version':'01/R16','status':'user-accepted-frozen','frameId':fid,'serialNumber':{'status':'not-applicable','reason':'template, not a historical individual'},'crew':{'status':'not-applicable','reason':'no crew assigned to a generic template'},'worldTimeRef':'TIME.worldTime','snapshotId':'mother01-r16-accepted-20260909','capabilities':['inspect-source-model','switch-illustrative-service-state','view-labeled-orthographic-measurement','derive-separate-aircraft-instance'],'limitations':['no engineering calibration','no calibrated flight-hour model','not a completed historical 80 DAYS aircraft']}]
regions=[('mainwing-negative-x','负X主翼',[1696]),('mainwing-positive-x','正X主翼',[1708]),('horizontal-tail','平尾区域',[1717,726,729]),('cowl-surface-a','发动机罩表面A',[1693]),('cowl-surface-b','发动机罩表面B',[1711]),('exhaust-outlets','四个排气出口的源表面',[1681])]
relations=[{'id':'rel:type','kind':'typeOf','subject':oid,'object':typeid},{'id':'rel:frame','kind':'poseReferencedTo','subject':oid,'object':fid},{'id':'rel:management','kind':'managedBy','subject':oid,'object':'urn:mother:skin'},{'id':'rel:source','kind':'derivedFrom','subject':oid,'object':'urn:git:haihao0307/AIRCRAFT:'+SOURCE_COMMIT}]
for suffix,name,nodes in regions:
    rid=oid+':region:'+suffix;objects.append({'objectId':rid,'kind':'digitalRegion','name':name,'sourceNodeIds':nodes,'sourceIndexSpace':'inherited numeric source node IDs','frameId':fid,'worldTimeRef':'TIME.worldTime'})
    relations.append({'id':'rel:region:'+suffix,'kind':'representationPartOf','subject':rid,'object':oid})
dna={'id':oid+':dna','version':'01','representation':'exact-numeric-transition-with-editable-runtime','sourceMeshCount':qa['source']['meshCount'],'sourceNodeCount':1784,'numericPayloadSHA256':accepted['numericPayloadSHA256'],'servicePresets':qa['states'],'serviceUnits':{'use':'normalized 0..1','care':'normalized 0..1','exposure':'normalized 0..1','damage':'illustrative event flag','repair':'illustrative event flag'},'materialSystem':{'appearance':'inherited olive upper and grey underside paint','alloyGrade':unknown('not established by this accepted visual baseline')},'panelRule':'upper/lower finite endpoints in runtime/b24-reference-panels-r16.js; positions approximate, rivet spacing illustrative','functions':[{'resource':'runtime/b24-service-life-r16.js','role':'appearance state evaluation','execution':'requires the original Three.js runtime; not evaluated by this data reader'},{'resource':'runtime/b24-reference-panels-r16.js','role':'finite panel definition and mapped microdetail','execution':'requires inherited source wing geometry'}],'nextPhase':{'label':'80 DAYS and separate aircraft/crew systems','status':'plannedDerivative','identity':unknown('specific historical identity and crew evidence to be provided'),'implemented':False}}
events={'events':[{'id':'project:acceptance:20260909','kind':'project-visual-acceptance','date':'2026-09-09','subject':oid,'source':'user acceptance of R16'},{'id':'project:freeze:20260909','kind':'project-baseline-freeze','date':'2026-09-09','subject':oid,'sourceCommit':SOURCE_COMMIT}],'historicalAircraftEvents':{'status':'not-provided'}}
provenance={'sourcePackageSHA256':ZIP_SHA,'sourceCommit':SOURCE_COMMIT,'renderCommit':RENDER_COMMIT,'acceptedPreview':accepted['preview'],'retainedKnowledgeScope':'all 102 file entries in the accepted full ZIP, including its manifest; no original PDF/GLB outside that ZIP is claimed retained','claimBoundaries':[{'claim':'accepted appearance','status':'supported','evidence':'docs/wing-seams-r16/PUBLIC_PREVIEW.md'},{'claim':'precise manufacturing panel positions','status':'not-established','evidence':'docs/wing-seams-r16/KNOWLEDGE.md'},{'claim':'physical-world time/geography','status':'unknown','evidence':'generic baseline'}],'formatSources':['TLO人机共读与知识交换.md, 2026-09-08','06_WSD_BINARY_FORMAT_DRAFT.md, WSD0/0.1','RFC8949 CBOR basic data model; constrained experimental subset'],'formatStatus':'trial profile only; no claim of universally supported final TLO format'}
time['sourceVersionTime']={'status':'known','value':'2026-09-09T10:13:38+08:00','meaning':'Git source package commit time; not historical aircraft time'}
frames['frames'][0]['modelRootScale']=[1,1,1]
frames['frames'][0]['worldParentFrame']={'status':'not-provided'}
provenance['archiveCommit']='83a182720d78cb9da58457be7491bcc8fdee2a7c'
provenance['commitRoles']={'sourceCommit':'clean frozen full-package source','renderCommit':'user-accepted unchanged visual build','archiveCommit':'pre-cleanup R16 handoff history','trialCommit':'outside payload, fixed by the published delivery receipt to avoid self-reference'}
provenance['semanticCoverage']={'extracted':['template identity','6 named digital regions','local units/frame and world unknown','5 illustrative service presets','project acceptance/freeze','separate relation kinds','whole-package resource inventory'],'preservedOpaque':['remaining inherited source-node semantics','detailed numeric geometry','shader implementation and visual rules','original knowledge/report prose'],'notIncluded':['external source PDF/GLB/photos outside the accepted ZIP'],'physicalPartCount':'not inferred from node or mesh counts'}
provenance['guidance']={'path':'../references/xiaoma-guidance.md','sha256':sha((OUT/'references/xiaoma-guidance.md').read_bytes()),'role':'theory guidance, not a successful test receipt'}
profile['specSHA256']=sha((OUT/'FORMAT.md').read_bytes())
core=[('VOCB',vocab),('FRAM',frames),('TIME',time),('DNA_',dna),('OBJS',{'objects':objects}),('RELS',{'relations':relations}),('EVNT',events),('PROV',provenance)]
blob_start=1+len(core)+1
rmap={'files':[],'pathPolicy':'relative POSIX paths, no absolute path or traversal; extraction never executes files','scope':'all accepted ZIP entries'}
for i,(path,b) in enumerate(sorted(resources.items())):
    role='sourceResource' if path.startswith('runtime/') or path.endswith('.html') else 'evidenceResource'
    rmap['files'].append({'resourceId':str(uuid.uuid5(uuid.NAMESPACE_URL,'mother01:'+path)),'path':path,'bytes':len(b),'sha256':sha(b),'chunkOrdinal':blob_start+i,'role':role,'requiredFor':['full-file-recovery']+(['rendering'] if role=='sourceResource' else []),'encoding':'identity'})
chunks=[('PROF',json.dumps(profile,separators=(',',':'),ensure_ascii=False).encode('utf8'))]+[(t,cbor_encode(v)) for t,v in core]+[('RMAP',cbor_encode(rmap))]+[('BLOB',b) for _,b in sorted(resources.items())]
data=encode_wsd(chunks);profile2,decoded,raw=decode_profile(data);assert len(raw)==112
for t,v in core:assert decoded[t]==v
assert decoded['RMAP']==rmap
target=DATA/'B24_Generic_Mother_01.tlo';target.write_bytes(data)
# These exports are derived aids, not separately maintained authority.
export={'profile':profile2,'chunks':decoded,'sourceFileSHA256':sha(data)}
(DATA/'semantic-view.json').write_text(json.dumps(export,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
receipt={'profile':profile2['profile'],'sourceCommit':SOURCE_COMMIT,'sourcePackageSHA256':ZIP_SHA,'tloSHA256':sha(data),'tloBytes':len(data),'resourceFiles':len(resources),'chunks':len(chunks),'semanticBytes':sum(len(b) for t,b in chunks if t!='BLOB'),'sourceFileBytes':sum(map(len,resources.values())),'fullFileRecovery':'pending independent verification','productionBaselineModified':False}
(DATA/'BUILD.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(receipt,ensure_ascii=False))
