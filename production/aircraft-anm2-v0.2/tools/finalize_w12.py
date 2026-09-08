from pathlib import Path
import json
R=Path('.')
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
qa=json.loads((R/'validation/w12/QA.json').read_text(encoding='utf-8'));assert qa['passed']
report={'status':'review-candidate','summary':'双参考载入、分体与开合复位、对象坐标、导出及手机布局已检查；几何与历史验收仍待确认。','visualAcceptance':False,'productionReady':False,'regionResults':[{'label':'对象与身份','value':str(qa['objectCount'])+' 个对象记录 + 3 个根记录；58 组弹壳、弹头与链节；旧 ID 可解析'},{'label':'展示控制','value':'单弹分体、箱盖开合、总装展开；全部复位恢复原几何'},{'label':'枪口','value':'管壁与开放中心；轴向中心射线不命中管口几何'},{'label':'运行检查','value':'302 网格 / 207077 三角形；0 退化面、0 异常法线、0 浏览器错误'},{'label':'坐标和表面','value':'相对坐标链一致；材质场不随相机和灯光改变'},{'label':'原件','value':'航空参考 13 网格；单弹参考 3 网格；本地读取，均保持原始层级矩阵'},{'label':'尚未验收','value':'几何一致性、B24 安装与瞄具、历史材质；无来源动画、无击发动画'}]}
write(R/'validation/W12_PREFLIGHT.json',report)
p=R/'rules/w12/object-dna.js';s=p.read_text(encoding='utf-8').replace('W12 checks pending; historical and user acceptance pending','W12 coordinate and runtime checks passed; geometry, historical and user acceptance pending');p.write_text(s,encoding='utf-8')
p=R/'workbench/w12/build.py';s=p.read_text(encoding='utf-8').replace('W10 with W12 rear corrections and supply additions','W11 core with W12 hollow tube, separate cartridge parts and box details');p.write_text(s,encoding='utf-8')
p=R/'CURRENT.json';d=json.loads(p.read_text(encoding='utf-8'));d['previousUserReviewCandidate']=d['currentUserReviewCandidate'];d['currentUserReviewCandidate']={'id':'W12','path':'releases/w12/AIRCRAFT_ANM2_OBJECT_DNA_W12.html','scope':'multi-reference exterior distillation, independent cartridge parts, hollow muzzle, box lid and semantic finishes','approval':'awaiting-user-review'};d['status']='W12-tested-exterior-review-candidate';write(p,d)
text='''# W12 — 分体与表面研究

W12 继承 W11 固定数字参考架和原件布局，新增单颗弹药分体、弹箱箱盖开合与枪口近景。历史版本不修改。

- 58 个展示实例各自分出弹壳、弹头、链节。枪管与护套分组；弹箱拆为薄壁箱体和盖/提手组。总计 248 个对象记录以及 3 个根记录。身份不再随知识版本变化，保留 W11 ID 映射。
- 本地单弹参考为 HKM4 的 12.7x99 M2 Ball 练习模型；其材质名称与实际对象有错配，已按实际几何识别弹壳和弹头。仅统一旋转、缩放和位移对齐，不声明制造尺度。7.62x54mmR 仅贡献分体语义，不作为 M2 尺寸来源。
- Browning M2 参考贡献弹箱板层、提手、扣件、链节与表面分区母题；不引入地面三脚架或未经证实的航空瞄具。箱体沿用 W11 布局比例，内部装载未知，开盖为空腔。
- 弹壳内唇、链节环带、展示铰链和表面斑驳包含自主外观解释；尚未逐面通过原件几何门槛。分体与开合是新编写的展示控制，检查的四个源文件均无动画。未实现击发、装填、内部工作机构或制造结构。
- 七类表面：钢、箱体漆面、五金、黄铜、铜色、链节钢、木质。材质坐标固定在数字参考架，可切换洁净/斑驳候选，无自动历史老化；未接入世界内核，未完成重新网格化映射。

实际 QA：302 网格，207077 三角形，0 退化面，0 异常法线，0 浏览器错误。248 坐标链与实际变换一致；所有展示状态复位后几何散列一致；W11 除枪管/供弹外的核心几何保持一致。轴向中心射线不命中新增管口。两种本地原件载入、导出和 390px 手机布局通过检查。性能预算仅为当前浏览器测试，未验证低端实机帧率。

参考只通过本地文件 API 读取，网页不包含源网格、纹理或原文件缓冲；可读规则为独立外观解释。原文件仍需保留，不因本轮完成而建议删除。

补充来源（CC BY 4.0，来自文件元数据）：
- HKM4: https://sketchfab.com/3d-models/127x99mm-m2-ball-still-practice-no-texture-57f4f57322cf4ab998363321e9ed3e19
- Pedro Belthori: https://sketchfab.com/3d-models/ammo-762-x-54mmr-d097387f41cc483fa1bd9b0296ebcf90
- emran.bayati: https://sketchfab.com/3d-models/browning-m2-381c0f1939e843ceae232500e24e7231
- Misja van Laatum: https://sketchfab.com/3d-models/anm2-browning-50-cal-aircraft-machine-gun-83d967f5d3ea4fe18603514741c781d5

主交付保持固定版本公网 HTTPS 预览；规则见 PUBLIC_PREVIEW_DELIVERY_RULE.md。几何、历史及用户验收待定，生产就绪为 false。
'''
(R/'validation/W12_REVIEW.md').write_text(text,encoding='utf-8')
for name in ['README.md','START_HERE.md']:
 p=R/name;s=p.read_text(encoding='utf-8');p.write_text('当前候选：**W12 分体与表面研究**。说明 `validation/W12_REVIEW.md`；可重建源码在 `rules/w12` 与 `workbench/w12`。主预览使用本轮交付的固定提交公网链接；W11 及更早版本保留。\n\n'+s,encoding='utf-8')
