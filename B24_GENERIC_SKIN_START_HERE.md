# B24 通用公版蒙皮 V1

日期：2026-09-06。分支：`feature/b24-generic-skin-master-v1`。

## 目标

先完成可被多架 B24 历史实例复用的通用蒙皮层。单机机鼻画、机名、任务炸弹、胜利标记、单机修补和特定任务状态全部放在后续实例层，不进入公版。

## 当前公版包含

- V018 蒸馏整机继续作为显示和回贴基线；原节点、几何、螺旋桨、机构和运行数据不改写。
- 六个检查视图：立体、左舷、右舷、上视、下视、机头。
- 上表 Olive Drab / 下表 Neutral Gray 的工作近似显示。现代屏幕色值只用于工作台，不冒称二战原始军方色卡实测值。
- 1944 星条国籍标志的独立候选层，四处位置来自用户提供的 B24 涂装参考方向，仍需逐视图锁定位置和尺度。
- 螺旋桨和机构参考默认保留显示。
- 侧舱、舱门、窗节点只做源节点审查；没有确认关闭状态前不隐藏、不替换、不编造关闭几何。

## 尚未加入公版的结构内容

制造蒙皮板缝：0 条批准。
铆钉排：0 条批准。
检修口制造边界：待原厂或军方图纸逐项建立。

现有三角网格边、程序化噪波和模型渲染线均不得直接冒充真实板缝。已建立的 PDF 分件登记继续作为证据入口，后续取得具体装配/蒙皮详图后逐片绑定。

## 分层规则

`GENERIC_BASE_COLOR`：通用上/下表色。
`GENERIC_NATIONAL_INSIGNIA`：通用国籍标志，位置和尺度逐处审核。
`GENERIC_PANEL_SEAMS`：只接收有工程图依据的板缝。
`GENERIC_RIVETS`：只接收有工程图或清晰原机证据的铆钉排。
`GENERIC_ACCESS_PANELS`：检修口与舱盖边界。
`INSTANCE_LIVERY`：单机图案和任务状态，公版中为空。

所有层独立开关和版本化。任何实例层不得反写通用公版。

## 当前公开检查入口

`b24-generic-skin-v1.html`

固定提交版本可通过 RawGitHack 直接打开。当前分支不修改仓库主线，不合并，不声明生产完成。

## 当前状态

`genericSkinWorkbench=true`
`instanceNoseArtIncluded=false`
`manufacturerSeamsApproved=0`
`manufacturerRivetRowsApproved=0`
`sideDoorClosedVerified=false`
`visualAcceptance=false`
`productionReady=false`
