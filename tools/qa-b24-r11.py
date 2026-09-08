"""Browser evidence for the R11 skin candidate. Reference error is separate from technical checks."""
import argparse,hashlib,json,math,subprocess,time
from PIL import Image,ImageChops
import io
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:18767/b24-generic-skin-closed-doors-r11.html');ap.add_argument('--output',type=Path,default=ROOT/'reports/b24-r11');ap.add_argument('--channel',default='chrome');args=ap.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
report={'version':'R11','url':args.url,'commit':subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip(),
 'workingTreeDirty':bool(subprocess.check_output(['git','-C',str(ROOT),'status','--porcelain'],text=True).strip()),
 'sourceFiles':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'runtime/b24-r11-skin-system.js',ROOT/'runtime/b24-r7-reference.js',ROOT/'runtime/b24-r10-detail-materials.js',ROOT/'runtime/b24-r10-detail-regions.js',ROOT/'runtime/b24-r8-bay-poses.js',ROOT/'runtime/b24-generic-skin-closed-doors-r11.js',ROOT/'b24-generic-skin-closed-doors-r11.html']},
 'errors':[],'technicalChecks':[],'referenceMetrics':[], 'visualAcceptance':False,'productionReady':False}
checks=report['technicalChecks']
def check(name,value):checks.append({'name':name,'passed':bool(value)})
with sync_playwright() as p:
    browser=p.chromium.launch(channel=args.channel or None,headless=True,args=['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
    page.goto(args.url,wait_until='domcontentloaded')
    try:page.wait_for_function('window.__B24_GENERIC_R11__?.results?.length===4',polling=1000,timeout=120000)
    except Exception:
        report['body']=page.locator('body').inner_text();report['diagnostic']=page.locator('#diag').text_content();report['passed']=False
        (args.output/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False,indent=2));raise
    page.wait_for_timeout(700)
    print('Loaded R11; checking source and static coverage',flush=True)
    state=page.evaluate('window.__B24_GENERIC_R11__');report['state']=state
    bay=page.evaluate('window.__B24_BAY_R11__');report['bombBay']=bay
    check('All 60 R11 static fitted bay matrices applied exactly once',bay['parts']==60 and bay['maxMatrixError']<1e-6)
    buffers=page.evaluate('window.__B24_R11_QA__.sourceBufferAudit()');report['sourceBuffers']=buffers
    check('Original payload bytes unchanged after skin creation',buffers['payloadSHA256']=='f5ff859a7ff0e38112fa099d8c7d3a4cd8e859434701fb4dd9d81629374c5e3e')
    check('Complete V018 inventory retained',buffers['meshCount']==348 and buffers['components']==1784)
    check('Closed door node lock',state['closedDoorNodes']==[764,767,773,776])
    details=page.evaluate('window.__B24_DETAILS_R11__');report['details']=details
    check('Detail materials excluded from camouflage',not(set(state['paintNodes']) & {a['node'] for a in details['assignments']}))
    check('All twelve static blades carry the maker badge candidate',details['bladeCount']==12)
    old_details=json.loads((ROOT/'reports/b24-r8/qa.json').read_text(encoding='utf8'))['details']
    check('Engine base palette retained from R8 beneath new component accents',[a for a in details['assignments'] if a['node'] in [1669,1681,1741]]==[a for a in old_details['assignments'] if a['node'] in [1669,1681,1741]])
    inventory=page.evaluate('window.__B24_R11_QA__.inventory()')
    check('Static tires only; blurred alternatives hidden',all(not m['ancestorsVisible'] for m in inventory if 'tire_blurred' in m['path']))
    check('Visible main and nose tires remain rubber',all(m['color']=='383a36' for m in inventory if m['id'] in [598,1200,681]))
    previous=json.loads((ROOT/'reports/b24-r8/qa.json').read_text(encoding='utf8'))['state']
    check('Four accepted mark placements exactly equal R8',state['placements']==previous['placements'])
    check('Mark source-surface samples exactly equal R8',[r['samplePoints'] for r in state['results']]==[r['samplePoints'] for r in previous['results']])
    coverage=page.evaluate('''()=>{
      const ray=window.__B24_R11_QA__.ray,sideMisses=[],bottomMisses=[];let sideRays=0,bottomRays=0;
      const zs=[...Array.from({length:26},(_,i)=>-3.30+i*.095),...Array.from({length:27},(_,i)=>-.63+i*.095)];
      for(const z of zs){
        for(let j=0;j<=42;j++)for(const sign of [-1,1]){
          const y=-1.72+j*.01;sideRays++;
          if(!ray([sign*3,y,z],[-sign,0,0]).some(h=>h.point[0]*sign>.75&&h.point[0]*sign<1.2))sideMisses.push({sign,y,z});
        }
        for(let j=0;j<=40;j++){
          const x=-1+j*.05;bottomRays++;
          if(!ray([x,-5,z],[0,1,0]).some(h=>h.point[1]<-1.4))bottomMisses.push({x,z});
        }
      }
      return {sideRays,bottomRays,sideMisses,bottomMisses,limitation:'Finite ray coverage of static source geometry; not a pressure seal, collision or animated mechanism certification.'};
    }''');report['bayCoverage']=coverage
    check('Both bay side sills closed across 53 longitudinal stations',not coverage['sideMisses'])
    check('Bay underside and original central sill cover all sampled rays',not coverage['bottomMisses'])
    print('Coverage checked; capturing views',flush=True)
    check('Paint classification independent of normal sign',state['normalSignUsedForPaint'] is False)
    check('Exactly four independently calibrated marks',len(state['results'])==4 and len(state['placements'])==4)
    check('Loading screen hidden',page.locator('#loading').evaluate('(e)=>getComputedStyle(e).display')=='none')
    check('Rejected fragments are absent; no manufacturing approval claimed',state['approvedManufacturerPanelSeams']==0 and state['approvedManufacturerRivetRows']==0 and state['referenceSeams']['referenceFragments']==0)
    check('Rejected seam source not loaded',state['referenceSeams']['projectedSegments']==0 and not state['referenceSeams']['legacySourceLoaded'])
    refs={r['view']:r for r in json.loads((ROOT/'docs/b24-generic-skin/r7-reference-anchors.json').read_text(encoding='utf-8'))['views']}
    by={r['view']:r for r in state['results']};placement={r['view']:r for r in state['placements']}
    for view in ['orbit','top','bottom','port','starboard','front']:
        page.locator(f'button[data-view={view}]').click();page.wait_for_timeout(650)
        page.screenshot(path=str(args.output/(view+'.png')))
        check(view+' view selectable',page.evaluate('window.__B24_VIEW__')==view)
        if view not in by:continue
        result=by[view];ref=refs[view];pl=placement[view]
        samples=result['samplePoints'];check(view+' decal center and star tip hit source shell',samples['center'] is not None and samples['tip'] is not None)
        check(view+' high surface coverage',result['gridCoverage']>.96)
        if samples['center'] is None:continue
        x,y,z=samples['center'];cal=pl['calibration']
        if view in ['top','bottom']:
            span=abs(x)/cal['span'];chord=(cal['sectionLeading']-z)/(cal['sectionLeading']-cal['sectionTrailing'])
            center_pixel=[ref['wing']['centerlineX']+(-1 if view=='top' else 1)*span*abs(ref['wing']['tipX']-ref['wing']['centerlineX']),
               ref['wing']['leadingEdge'][1]+(1 if view=='top' else -1)*chord*abs(ref['wing']['trailingEdge'][1]-ref['wing']['leadingEdge'][1])]
        else:
            t=(cal['nose']-z)/(cal['nose']-cal['tail']);height=(cal['roof']-y)/(cal['roof']-cal['belly'])
            center_pixel=[ref['body']['noseX']+t*(ref['body']['tailX']-ref['body']['noseX']),ref['body']['roofAtMark']+height*(ref['body']['bellyAtMark']-ref['body']['roofAtMark'])]
        pixel_error=math.dist(center_pixel,ref['center'])
        projected=page.evaluate('points=>Object.fromEntries(Object.entries(points).map(([k,p])=>[k,p?window.__B24_R11_QA__.project(p):null]))',samples)
        tip_up=projected['tip'][1]<projected['center'][1]
        check(view+' rendered star tip points upward in reference camera',tip_up)
        actual_angle=math.degrees(math.atan2(projected['right'][1]-projected['left'][1],projected['right'][0]-projected['left'][0])) if projected['left'] and projected['right'] else None
        metric={'view':view,'centerBackprojectedPixels':center_pixel,'referenceCenterPixels':ref['center'],'centerMappingErrorPixels':pixel_error,
          'referenceAnnotationUncertaintyPixels':ref['uncertaintyPixels'],'rotationImageDegrees':actual_angle,
          'rotationErrorDegrees':abs(actual_angle-ref['rotationImageDegrees']) if actual_angle is not None else None,
          'widthReferencePixels':ref['bounds'][2]-ref['bounds'][0],'widthMappedPixels':result['visibleWidth']/pl['scaleMetresPerPixel'],
          'heightReferencePixels':ref['bounds'][3]-ref['bounds'][1],'heightMappedPixels':result['visibleHeight']/pl['scaleMetresPerPixel'],
          'projectedSamples':projected,'limitation':'Mapping consistency metric, not independent historical or visual acceptance. Reference/model structural differences remain.'}
        report['referenceMetrics'].append(metric)
        check(view+' orientation mapping within one degree',metric['rotationErrorDegrees'] is not None and metric['rotationErrorDegrees']<1)
    page.locator('#insigniaToggle').uncheck();check('Insignia visibility control',not page.locator('#insigniaToggle').is_checked());page.locator('#insigniaToggle').check()
    page.locator('#doorFocus').click();page.wait_for_timeout(650);page.screenshot(path=str(args.output/'door.png'))
    def pixels():return Image.open(io.BytesIO(page.locator('#scene').screenshot())).convert('RGB')
    marked=pixels();page.locator('#insigniaToggle').uncheck();page.wait_for_timeout(200);bare=pixels()
    changed=sum(max(p)>10 for p in ImageChops.difference(marked,bare).getdata());report['markChangedPixels']=changed
    check('Door close-up actually renders visible marking pixels',changed>10000);page.locator('#insigniaToggle').check()
    check('Rejected seam control removed',page.locator('#seamToggle').count()==0)
    check('Legacy seam module not requested',not page.evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('b24-r7-seams'))"))
    for detail in ['bay-port','bay-starboard','bay-bottom','engine','engine-starboard','cowl-side','gear','propeller','under-port','under-starboard','under-outer-port','under-outer-starboard','gear-starboard','under-tail']:
        page.locator(f'button[data-detail={detail}]').click();page.wait_for_timeout(650)
        page.screenshot(path=str(args.output/(detail+'.png')))
        check(detail+' detail camera selectable',page.evaluate('window.__B24_DETAIL_VIEW__')==detail)
    # Read real rendered wing colors on both sides; includes all four nacelle overlaps.
    role_audit=page.evaluate('window.__B24_R11_QA__.engineRoleAudit()');report['engineRoleAudit']=role_audit
    check('Material regions do not blend across source triangles',role_audit['mixedTriangles']==0)
    check('Engine source UV remains absent',not role_audit['originalUVPresent'])
    page.evaluate('window.__B24_R11_QA__.isolateWings(true)')
    samples=page.evaluate('window.__B24_R11_QA__.wingSurfaceSamples()');report['wingPixelAudit']={}
    for view,side in [('bottom','lower'),('top','upper')]:
        page.locator(f'button[data-view={view}]').click();page.wait_for_timeout(650)
        points=page.evaluate('(a)=>a.map(p=>window.__B24_R11_QA__.project(p))',[a[side] for a in samples])
        shot=pixels();shot.save(args.output/('isolated-wing-'+view+'.png'));failures=[]
        for sample,point in zip(samples,points):
            x,y=map(round,point);rgb=shot.getpixel((x,y));difference=rgb[2]-rgb[0]
            if (side=='lower' and difference<2) or (side=='upper' and difference>-10):failures.append({'sample':sample,'pixel':[x,y],'rgb':rgb})
        report['wingPixelAudit'][side]={'samples':len(samples),'failures':failures}
        check('Rendered '+side+' wing paint stays correct across span and four nacelles',len(samples)>100 and not failures)
    page.evaluate('window.__B24_R11_QA__.isolateWings(false)')
    page.evaluate('window.__B24_R11_QA__.isolateWings(true,[1717,726,729])')
    tail_samples=page.evaluate('window.__B24_R11_QA__.tailSurfaceSamples()');report['tailPixelAudit']={}
    for view,side in [('bottom','lower'),('top','upper')]:
        page.locator(f'button[data-view={view}]').click();page.wait_for_timeout(650)
        points=page.evaluate('(a)=>a.map(p=>window.__B24_R11_QA__.project(p))',[a[side] for a in tail_samples]);shot=pixels();shot.save(args.output/('isolated-tail-'+view+'.png'));failures=[]
        for sample,point in zip(tail_samples,points):
            rgb=shot.getpixel(tuple(map(round,point)));difference=rgb[2]-rgb[0]
            if (side=='lower' and difference<2) or (side=='upper' and difference>-10):failures.append({'sample':sample,'rgb':rgb})
        report['tailPixelAudit'][side]={'samples':len(tail_samples),'failures':failures}
        check('Rendered '+side+' tailplane paint including root',len(tail_samples)>=40 and not failures)
    page.evaluate('window.__B24_R11_QA__.isolateWings(false)')
    # Actual lower-lip pixels must be olive on inner and aft-offset outer cowls.
    page.evaluate('window.__B24_R11_QA__.hidePropellersForAudit(true)')
    report['cowlLipPixelAudit']=[]
    for lip in page.evaluate('window.__B24_R11_QA__.cowlLipSamples()'):
        page.evaluate('(a)=>window.__B24_R11_QA__.focus(...a)',[[lip['x'],lip['y'],6],[lip['x'],lip['y'],2.7]])
        page.wait_for_timeout(650);points=page.evaluate('(a)=>a.map(p=>window.__B24_R11_QA__.project(p))',lip['points']);shot=pixels()
        colors=[shot.getpixel(tuple(map(round,p))) for p in points];lip['colors']=colors;report['cowlLipPixelAudit'].append(lip)
        shot.save(args.output/('cowl-lip-'+str(lip['x'])+'.png'))
        check('Cowl lower lip olive at engine x='+str(lip['x']),len(colors)==3 and all(c[0]-c[2]>10 for c in colors))
    page.evaluate('window.__B24_R11_QA__.hidePropellersForAudit(false)')
    # Mobile checks verify fit and controls, not physical-device performance.
    page.set_viewport_size({'width':390,'height':844});page.locator('button[data-view=top]').evaluate('(e)=>e.click()');page.wait_for_timeout(650)
    page.screenshot(path=str(args.output/'mobile-top.png'))
    page.locator('#mobileToggle').click();check('Mobile controls open',page.locator('#panel').evaluate("e=>e.classList.contains('open')"))
    check('No browser errors',not report['errors']);browser.close()
report['passed']=all(x['passed'] for x in checks)
(args.output/'qa.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':report['passed'],'failed':[x for x in checks if not x['passed']],'errors':report['errors'],'passedChecks':sum(c['passed'] for c in checks),'totalChecks':len(checks),'bayCoverage':{k:v for k,v in report['bayCoverage'].items() if k!='limitation'}},ensure_ascii=False,indent=2))
raise SystemExit(0 if report['passed'] else 1)
