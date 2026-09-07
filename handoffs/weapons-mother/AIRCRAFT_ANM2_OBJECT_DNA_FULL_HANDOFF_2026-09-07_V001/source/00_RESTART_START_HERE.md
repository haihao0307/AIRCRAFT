# Aircraft AN/M2 Object DNA 全量交接包 V001

日期：2026-09-07
仓库：`haihao0307/AIRCRAFT`
冻结前生产分支：`feature/object-dna-kernel-v0.1-browning-pilot`
失败状态提交：`7b8a0f0b18d9ba10fa8c993e10bfed76ca23261c`
稳定对象 ID：`ODNA:MECH:ANM2:PILOT-0001`

## 先读什么

1. `HANDOFF.md`
2. `FAILURE_LEDGER.md`
3. `VALID_KNOWLEDGE.md`
4. `NEXT_PRODUCTION_GATES.md`
5. `HANDOFF.json`
6. 包内 `snapshot/production/aircraft-anm2/object-dna-v0.1/W08_REJECTION_2026-09-07.md`
7. 包内 `snapshot/production/aircraft-anm2/object-dna-v0.1/PILOT_STATE_R01.json`

## 当前真实状态

当前没有可交给用户继续审阅的有效候选。W08 已正式退回，只能作为失败对照。W06 的程序化 PBR 与部分外观方法可以用于研究，W06 整枪几何不能成为新线形态基线。W07 的双对象工作方式、只读参考载入与固定提交单文件交付方式可以保留；W07 的总包围盒注册方法不能保留。W08 的 64 截面最小最大包络测量不能用于几何一致性判断。

`visualAcceptance=false`
`productionReady=false`
`measurementKernelAccepted=false`
`geometryParityAccepted=false`
`B24InstallationComplete=false`

## 新线的第一件事

新生产线先建立共享机械基准，再重建第一个语义区域。最低基准包括：

1. 枪体纵向主轴
2. 枪管中心轴
3. 枪口端面
4. 机匣前端面
5. 机匣后端面
6. 机匣顶面

第一个重建区域固定为 `receiver and barrel-root transition`。必须先在同一中性材质、同一正交镜头、同一机械基准下，与真实参考体完成肉眼和数值双重核验。没有出现清楚的可见收敛，不能发布下一版 HTML。

## 参考输入

原件文件名：`anm2_browning_.50_cal_aircraft_machine_gun(1).glb`

大小：`6,548,040` 字节

SHA-256：`2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b`

原件不进入产品数据，不放入本交接 ZIP。重启时通过本地只读 File API 或隔离后台研究环境临时载入。辅助弹药文件只允许研究材质，不得采用其几何、尺寸、刻字、UV 与弹种身份。

## 范围约束

当前只做 B24 优先的 Aircraft Browning M2 / AN/M2。B17 照片和安装关系继续延期，不能用于填补 B24 枪架、吊具、弹药箱、瞄具或排出路径。精确 B24 型号、批次、枪位和服役日期仍待原始资料确认。

永久数据保存 Object DNA、语义、证据、测量约束、形态规则、表面坐标、材质规则、生命周期、行为状态、历史与验收记录。产品 mesh、参考顶点表、源 UV 表、图片贴图和改名编码副本不进入永久生产数据。

## 交付规则

下一次用户可见候选必须是一个自包含 HTML，经过真实参考体载入后的人工预检，再写入 GitHub 固定提交。聊天中交付固定 commit 的 `raw.githack` 直开链接。旧版本保留，直到用户明确批准清理。
