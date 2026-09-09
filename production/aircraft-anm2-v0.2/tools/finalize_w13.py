from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
q=json.loads((R/'validation/w13/QA.json').read_text(encoding='utf8'));assert q['passed']
write(R/'validation/W13_PREFLIGHT.json',{'status':'review-candidate','version':'W13','summary':'单发、连发、五发一曳光、两次弹跳停稳与复位通过自动预检；外观及历史适用性待用户审阅。','visualAcceptance':False,'productionReady':False,'regionResults':[{'label':'动画与复位','value':'4 序列 / 两次弹跳 / 停稳零速度 / 可重复拖动'},{'label':'外观几何','value':'396 网格 / 212337 三角形 / 0 退化与异常法线'},{'label':'本地参考','value':'5 文件身份、层级与变换核验通过'},{'label':'限制','value':'展示轨迹与简化碰撞；内部机构、实际弹道与历史厂号未知'}]})
p=R/'CURRENT.json';d=json.loads(p.read_text(encoding='utf8'))
if d['currentUserReviewCandidate']['id']!='W13':d['previousUserReviewCandidate']=d['currentUserReviewCandidate']
d['currentUserReviewCandidate']={'id':'W13','path':'releases/w13/AIRCRAFT_ANM2_OBJECT_DNA_W13.html','scope':'authored exterior animation, procedural finish, markings and candidate display mount/sights','approval':'awaiting-user-review'};d['status']='W13-tested-animation-review-candidate';d['referenceInput']['fileName']='anm2_browning_.50_cal_aircraft_machine_gun.glb';write(p,d)
for name in ['README.md','START_HERE.md']:
 p=R/name;s=p.read_text(encoding='utf8')
 if not s.startswith('当前候选：**W13'):p.write_text('当前候选：**W13 动态质感研究**。说明 `validation/W13_REVIEW.md`，规则与页面源码位于 `rules/w13`、`workbench/w13`。固定提交公网预览交付；W12 及更早版本保留。\n\n'+s,encoding='utf8')
