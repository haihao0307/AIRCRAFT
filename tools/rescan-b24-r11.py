"""Fresh visual transcription from original four-view images. No legacy line input."""
from pathlib import Path
from PIL import Image
import hashlib,json,html

root=Path('G:/AIRCRAFT/skin-mother')
source=Path('G:/AIRCRAFT/skin-mother-intake-20260907/recovered-reference-candidates')
out=Path('G:/AIRCRAFT/skin-mother-intake-20260907/r11-rescan');out.mkdir(exist_ok=True)
records=[]
def add(view,part,kind,points,note=''):
    records.append(dict(id=f'{view}-fresh-{sum(r["view"]==view for r in records)+1:03}',view=view,part=part,kind=kind,points=points,
        coordinates='source-image-pixels; origin top-left',status='visually-readable-drawing-candidate',
        precision='approximate visual transcription; not subpixel tracing',manufacturingConfirmed=False,projectedToAircraft=False,rivetBasis=False,note=note))

# Visible continuous boundaries only. Gaps hidden by artwork, engine or labels are not filled.
for part,kind,pts,note in [
 ('image-left outer wing','panel-boundary-candidate',[[463,417],[463,506]],''),
 ('image-left outer wing','panel-boundary-candidate',[[109,439],[109,491]],'Tip region excluded beyond the straight visible segment.'),
 ('image-left outer wing','control-surface-boundary',[[115,499],[294,503],[460,510]],'Keep separate from a riveted skin joint.'),
 ('image-left mid wing','panel-boundary-candidate',[[540,451],[650,450],[773,449]],''),
 ('image-left mid wing','panel-boundary-candidate',[[541,477],[654,477],[771,476]],''),
 ('image-left mid wing','panel-boundary-candidate',[[528,419],[529,507]],'Adjacent nacelle boundary requires component assignment.'),
 ('image-left mid wing','panel-boundary-candidate',[[777,422],[777,515]],'Do not continue into nacelle.'),
 ('image-left inner wing','panel-boundary-candidate',[[804,465],[932,467]],''),
 ('image-left inner wing','control-surface-boundary',[[804,520],[937,526]],''),
 ('image-right inner wing','panel-boundary-candidate',[[1067,466],[1198,466]],''),
 ('image-right inner wing','control-surface-boundary',[[1066,526],[1198,520]],''),
 ('image-right mid wing','panel-boundary-candidate',[[1224,451],[1386,451]],''),
 ('image-right mid wing','panel-boundary-candidate',[[1225,478],[1461,478]],''),
 ('image-right mid wing','panel-boundary-candidate',[[1201,423],[1201,515]],''),
 ('image-right outer wing','panel-boundary-candidate',[[1503,430],[1503,503]],''),
 ('image-right outer wing','panel-boundary-candidate',[[1743,437],[1743,498]],''),
 ('image-right outer wing','panel-boundary-candidate',[[1543,459],[1740,459]],''),
 ('image-right outer wing','control-surface-boundary',[[1544,510],[1711,501],[1879,495]],''),
 ('image-left tailplane','panel-boundary-candidate',[[842,998],[842,1037]],''),
 ('image-left tailplane','panel-boundary-candidate',[[896,998],[896,1038]],''),
 ('image-left tailplane','control-surface-boundary',[[796,1043],[977,1043]],''),
 ('image-right tailplane','panel-boundary-candidate',[[1105,998],[1105,1037]],''),
 ('image-right tailplane','panel-boundary-candidate',[[1159,998],[1159,1037]],''),
 ('image-right tailplane','control-surface-boundary',[[1028,1043],[1208,1043]],''),
 ('aft fuselage','panel-boundary-candidate',[[948,650],[1056,650]],''),
 ('aft fuselage','panel-boundary-candidate',[[954,746],[1050,746]],''),
 ('aft fuselage','panel-boundary-candidate',[[960,842],[1044,842]],''),
 ('aft fuselage','panel-boundary-candidate',[[967,950],[1035,950]],''),
 ('image-left outer nacelle','cover-boundary-candidate',[[528,339],[602,340]],'Cover seam, flap boundary and fastener type require close-up confirmation.'),
 ('image-left outer nacelle','cover-boundary-candidate',[[530,379],[603,379]],''),
 ('image-left inner nacelle','cover-boundary-candidate',[[776,325],[848,326]],''),
 ('image-right inner nacelle','cover-boundary-candidate',[[1150,325],[1225,325]],''),
 ('image-right outer nacelle','cover-boundary-candidate',[[1399,339],[1471,339]],''),
]: add('top',part,kind,pts,note)

for part,kind,pts,note in [
 ('image-left outer wing','panel-boundary-candidate',[[172,720],[399,711]],''),
 ('image-left outer wing','panel-boundary-candidate',[[172,743],[395,741]],''),
 ('image-left outer wing','panel-boundary-candidate',[[172,760],[313,761]],'Stop before the access-panel outline.'),
 ('image-left outer wing','panel-boundary-candidate',[[337,762],[396,763]],'Resume only after the access-panel outline.'),
 ('image-left outer wing','panel-boundary-candidate',[[401,715],[401,785]],''),
 ('image-left outer wing','panel-boundary-candidate',[[502,711],[502,790]],''),
 ('image-left outer wing','tip-panel-boundary-candidate',[[168,706],[168,781]],''),
 ('image-right outer wing','panel-boundary-candidate',[[1540,713],[1861,721]],''),
 ('image-right outer wing','panel-boundary-candidate',[[1540,740],[1610,741]],'Artwork interrupts the rest; no extrapolation.'),
 ('image-right outer wing','panel-boundary-candidate',[[1748,742],[1862,742]],'Separate segment beyond artwork.'),
 ('image-right outer wing','panel-boundary-candidate',[[1537,716],[1537,790]],''),
 ('image-right outer wing','tip-panel-boundary-candidate',[[1868,707],[1868,780]],''),
 ('aft fuselage','panel-boundary-candidate',[[980,285],[1049,285]],''),
 ('aft fuselage','panel-boundary-candidate',[[973,388],[1058,388]],''),
 ('aft fuselage','panel-boundary-candidate',[[967,480],[1065,480]],''),
 ('aft fuselage','panel-boundary-candidate',[[964,574],[1069,574]],'Adjacent bomb-bay boundary; do not turn door corrugations into rivet rows.'),
 ('forward fuselage','panel-boundary-candidate',[[963,915],[1073,915]],''),
 ('forward fuselage','panel-boundary-candidate',[[971,969],[1064,969]],''),
 ('image-left tailplane','control-surface-boundary',[[812,199],[978,199]],''),
 ('image-right tailplane','control-surface-boundary',[[1049,199],[1218,199]],''),
 ('image-left outer nacelle','cover-boundary-candidate',[[565,870],[639,870]],''),
 ('image-left inner nacelle','cover-boundary-candidate',[[799,883],[875,883]],''),
 ('image-right inner nacelle','cover-boundary-candidate',[[1158,883],[1232,883]],''),
 ('image-right outer nacelle','cover-boundary-candidate',[[1395,870],[1469,870]],''),
]: add('bottom',part,kind,pts,note)

for part,pts,note in [
 ('aft fuselage',[[650,270],[743,270]],''),
 ('aft fuselage',[[783,271],[944,271]],'Interrupted at marked/artwork region.'),
 ('aft fuselage',[[844,308],[944,308]],'Only segment outside insignia.'),
 ('aft fuselage',[[652,348],[704,348]],'Stop at insignia.'),
 ('aft fuselage',[[842,331],[945,331]],''),
 ('aft fuselage',[[842,351],[946,351]],''),
 ('aft fuselage',[[946,260],[947,363]],''),
 ('aft fuselage',[[840,258],[841,288]],'Upper segment only; remainder occluded by artwork.'),
 ('aft fuselage',[[840,346],[841,381]],'Lower segment resumes beyond artwork.'),
 ('center fuselage',[[649,256],[649,375]],'Keep endpoints clear of painted lower demarcation.'),
 ('center fuselage',[[344,348],[344,397]],'Below wing root only.'),
 ('center fuselage',[[295,348],[295,397]],'Below wing root only.'),
]: add('port',part,'panel-boundary-candidate',pts,note)

for part,pts,note in [
 ('aft fuselage',[[316,232],[417,232]],''),
 ('aft fuselage',[[318,269],[417,269]],''),
 ('aft fuselage',[[318,293],[417,293]],''),
 ('aft fuselage',[[366,316],[455,320]],'Stop before insignia.'),
 ('aft fuselage',[[315,220],[316,329]],''),
 ('aft fuselage',[[423,222],[423,272]],'Stop at insignia border.'),
 ('aft fuselage',[[424,307],[424,340]],'Resume below insignia.'),
 ('aft fuselage',[[617,220],[617,349]],'End before painted lower demarcation.'),
 ('center fuselage',[[764,304],[764,355]],'Only the segment below the wing root; corrected during fresh overlay review.'),
 ('center fuselage',[[863,305],[863,356]],''),
 ('center fuselage',[[918,308],[919,358]],''),
 ('forward fuselage',[[1017,305],[1128,305]],'Do not include windows or nose art.'),
]: add('starboard',part,'panel-boundary-candidate',pts,note)

sources=[]
for view in ['top','bottom','port','starboard']:
    p=source/(view+'.webp');w,h=Image.open(p).size
    sources.append(dict(view=view,path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),width=w,height=h,
        type='paint-instruction illustration; not a structural drawing',rivetPointsResolvable=False))
    for r in [r for r in records if r['view']==view]:
        assert len(r['points'])>=2 and all(0<=x<w and 0<=y<h for x,y in r['points'])
register=dict(schema='b24-fresh-seam-observations/1',date='2026-09-08',version='R11',
    legacyReferenceLines='REJECTED BY USER; none read by this script or used as input',
    status='first-pass four-view reinspection; candidate observations only',
    method='Independent manual visual transcription from original images at native dimensions; no AI enhancement, no legacy SVG tracing, no mirrored invention.',
    sources=sources,records=records,
    reviewedRegions=['both main-wing faces','both fuselage sides','aft fuselage upper and lower faces','four nacelles','horizontal tailplane upper and lower faces','vertical fins'],
    unresolved=[
      'Fine rivet rows and sizes are not resolved by these paint-instruction images.',
      'Vertical fin illustrations contain rib/control-surface markings and artwork; no new skin seam adopted there.',
      'Wing-root occlusion, nose artwork, insignia, numbered arrows and lower-paint demarcations are excluded.',
      'Bomb-bay corrugations and control-surface subdivision lines must not be interpreted as riveted skin seams.',
      'All candidates need classification and 3D part-local calibration before any replacement seam is rendered.'
    ],manufacturerApprovedSeams=0,approvedRivetRows=0,newRenderedSeams=0)
(out/'fresh-seam-observations.json').write_text(json.dumps(register,ensure_ascii=False,indent=2),encoding='utf-8')
dest=root/'docs/b24-generic-skin/r11-fresh-seam-observations.json';dest.write_text(json.dumps(register,ensure_ascii=False,indent=2),encoding='utf-8')
colors={'panel-boundary-candidate':'#00ebff','control-surface-boundary':'#ff7c00','cover-boundary-candidate':'#ff00da'}
sections=[]
for s in sources:
    v=s['view'];lines=''.join(f'<polyline points="{" ".join(f"{x},{y}" for x,y in r["points"])}" stroke="{colors.get(r["kind"],"#00ebff")}"><title>{html.escape(r["id"]+" "+r["part"]+" "+r["note"])}</title></polyline>' for r in records if r['view']==v)
    sections.append(f'<section><h2>{v}</h2><svg viewBox="0 0 {s["width"]} {s["height"]}" width="{s["width"]}" height="{s["height"]}"><image href="../recovered-reference-candidates/{v}.webp" width="{s["width"]}" height="{s["height"]}"/><g fill="none" stroke-width="1.2" opacity=".8">{lines}</g></svg></section>')
(out/'review.html').write_text('<!doctype html><meta charset="utf-8"><title>Fresh R11 seam observations</title><style>body{margin:0;background:#eee;font:16px sans-serif}h1,p,h2{padding:10px}section{width:max-content}svg{display:block}body.hide g{display:none}</style><h1>R11 原图重新识别 · 候选，未装配</h1><p>青色：待确认板界；橙色：活动面边界；紫色：罩板边界。按空格切换观察线。所有铆钉仍未识别。</p>'+''.join(sections)+'<script>onkeydown=e=>{if(e.code==="Space"){e.preventDefault();document.body.classList.toggle("hide")}}</script>',encoding='utf-8')
print(json.dumps({'records':len(records),'byView':{v:sum(r['view']==v for r in records) for v in ['top','bottom','port','starboard']},'rendered':0}))
