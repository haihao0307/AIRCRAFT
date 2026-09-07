"""Measure the recovered user reference bytes; never infer markings outside the four ROIs.

Usage: python tools/calibrate-b24-r7.py --references <directory> --overlay <local.html>
The reference images stay local. Git receives measurements and provenance only.
"""
import argparse, base64, hashlib, json, math
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SPECS={
 'top':dict(size=[1969,1265],sha='d55b9d47530b1fc5a0523e7005ab4d2f10d5f3b2ef00c83b827cf5c21004e68b',
   bounds=[231,431,363,497],center=[297,464],starTip=[297,436],
   barSamples=[[234,258],[334,358],453,475],nose='up',
   wing=dict(centerlineX=998,tipX=63,leadingEdge=[297,417],trailingEdge=[297,546])),
 'bottom':dict(size=[2048,1197],sha='429754754a1acebe1ec5395c3553229019612ceab35d0bfe19b5a2eb804925ea',
   bounds=[1623,717,1748,782],center=[1685.5,749.5],starTip=[1685,724],
   barSamples=[[1627,1650],[1721,1743],739,762],nose='down',
   wing=dict(centerlineX=1015,tipX=1911,leadingEdge=[1685.5,796],trailingEdge=[1685.5,675])),
 'port':dict(size=[1241,862],sha='a3b4968ba2fbdfddb1b2a27d56bf248f787a7352e7b715a7a0a79f63de3a3b8d',
   bounds=[662,282,842,376],center=[752,329],starTip=[752,286],
   barSamples=[[665,700],[803,837],314,344],nose='left',
   body=dict(noseX=28,tailX=1170,roofAtMark=252,bellyAtMark=408,
     sections=[[110,285,394,407],[250,263,400,421],[400,251,401,426],
               [600,251,397,424],[752,252,387,408],[880,252,375,392],
               [960,252,362,380],[1100,252,342,355],[1150,280,328,337]])),
 'starboard':dict(size=[1323,497],sha='2b3dee062a574245f83109f14f176dfc88a4f26d07406003c80e3a2510e32f6d',
   bounds=[422,243,601,336],center=[511.5,289.5],starTip=[511,247],
   barSamples=[[425,461],[561,596],274,306],nose='right',
   body=dict(noseX=1234,tailX=111,roofAtMark=212,bellyAtMark=356,
     sections=[[1190,250,369,382],[1050,234,368,387],[925,216,363,389],
               [750,212,358,387],[620,212,351,376],[511.5,212,344,356],
               [400,212,331,346],[300,212,312,330],[150,259,287,299]])),
}

def measure(view,spec,folder):
    path=folder/(view+'.webp'); raw=path.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==spec['sha'], f'{view}: source changed'
    im=Image.open(path).convert('RGB'); assert list(im.size)==spec['size']
    left,right,y0,y1=spec['barSamples']; centers=[]
    for x0,x1 in [left,right]:
        pixels=[(x,y) for x in range(x0,x1+1) for y in range(y0,y1+1)
                if min(im.getpixel((x,y)))>180 and max(im.getpixel((x,y)))-min(im.getpixel((x,y)))<45]
        centers.append([sum(p[k] for p in pixels)/len(pixels) for k in [0,1]])
    angle=math.degrees(math.atan2(centers[1][1]-centers[0][1],centers[1][0]-centers[0][0]))
    out={k:v for k,v in spec.items() if k!='barSamples'}
    out.update(view=view,sourceFile=path.name,rotationImageDegrees=angle,barCentroids=centers,
        centerNormalized=[spec['center'][i]/spec['size'][i] for i in [0,1]],
        extentNormalized=[(spec['bounds'][i+2]-spec['bounds'][i])/spec['size'][i] for i in [0,1]],
        uncertaintyPixels=3,measurement='manual silhouette and emblem bounds; white-bar angle from thresholded pixels')
    if 'wing' in spec:
        w=spec['wing'];out['spanFraction']=abs(spec['center'][0]-w['centerlineX'])/abs(w['tipX']-w['centerlineX'])
        out['chordFraction']=abs(spec['center'][1]-w['leadingEdge'][1])/abs(w['trailingEdge'][1]-w['leadingEdge'][1])
    else:
        b=spec['body'];out['lengthFraction']=(spec['center'][0]-b['noseX'])/(b['tailX']-b['noseX'])
        out['heightFraction']=(spec['center'][1]-b['roofAtMark'])/(b['bellyAtMark']-b['roofAtMark'])
        out['demarcation']=[dict(lengthFraction=(x-b['noseX'])/(b['tailX']-b['noseX']),
            heightFraction=(split-roof)/(belly-roof),pixel=[x,split]) for x,roof,split,belly in b['sections']]
    return out

def overlay(refs,folder,path):
    cards=[]
    for r in refs:
        v=r['view'];w,h=r['size'];x0,y0,x1,y1=r['bounds'];cx,cy=r['center']
        source=base64.b64encode((folder/(v+'.webp')).read_bytes()).decode()
        extra=''
        if 'demarcation' in r:
            points=' '.join(','.join(map(str,p['pixel'])) for p in r['demarcation'])
            extra=f'<polyline points="{points}" fill="none" stroke="#e032af" stroke-width="3"/>'
        else:
            a=r['wing']['leadingEdge'];b=r['wing']['trailingEdge']
            extra=f'<path d="M {a[0]} {a[1]} L {b[0]} {b[1]}" stroke="#e032af" stroke-width="3"/>'
        cards.append(f'''<section><h2>{v} — nose {r['nose']}</h2><p>center {r['center']} · angle {r['rotationImageDegrees']:.3f}° · ±3 px annotation uncertainty</p>
        <svg viewBox="0 0 {w} {h}"><image href="data:image/webp;base64,{source}" width="{w}" height="{h}"/>
        {extra}<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="none" stroke="#00c8e8" stroke-width="3"/>
        <path d="M {cx-14} {cy} H {cx+14} M {cx} {cy-14} V {cy+14} M {cx} {cy} L {r['starTip'][0]} {r['starTip'][1]}" stroke="#ee2c30" stroke-width="2"/></svg></section>''')
    path.write_text('<!doctype html><meta charset="utf-8"><title>B24 R7 reference calibration</title><style>body{background:#edf0f2;font:16px system-ui;margin:24px}section{background:white;margin:24px 0;padding:20px;border:1px solid #aaa}svg{width:100%;max-height:850px}p{color:#333}</style><h1>B24 R7 — reference measurements</h1><p>Local recovered source candidates. Cyan: emblem bounds. Red: center/star tip. Magenta: chord or paint boundary. No geometry or historical approval inferred.</p>'+''.join(cards),encoding='utf-8')

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--references',type=Path,required=True);ap.add_argument('--overlay',type=Path,required=True);args=ap.parse_args()
    refs=[measure(v,s,args.references) for v,s in SPECS.items()]
    report=dict(schema='b24-skin-reference-calibration/1',version='R7',axes={'nose':'+Z','up':'+Y','port':'+X'},
        scope='User-requested appearance alignment only; recovered Airfix B-24D candidates applied to locked V018 geometry.',
        originalJPEGIdentityVerified=False,visualAcceptance=False,productionReady=False,
        sourceURL='https://uk.airfix.com/products/consolidated-b-24d-liberator-a09011',
        sourceClaim='Manufacturer identifies A09011 as B-24D. Does not establish applicability to the target variant.',views=refs)
    dest=ROOT/'docs/b24-generic-skin/r7-reference-anchors.json';dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'runtime/b24-r7-reference.js').write_text('// Generated by tools/calibrate-b24-r7.py from hashed local references.\nexport const REFERENCE = '+json.dumps(report,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    overlay(refs,args.references,args.overlay)
    print(json.dumps({r['view']:{k:r[k] for k in ['center','rotationImageDegrees','spanFraction','chordFraction','lengthFraction','heightFraction'] if k in r} for r in refs},indent=2))
