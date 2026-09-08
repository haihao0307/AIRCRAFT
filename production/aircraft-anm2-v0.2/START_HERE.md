当前候选：**W11 总装与对象关系**。入口 `releases/w11/AIRCRAFT_ANM2_OBJECT_DNA_W11.html`，说明 `validation/W11_REVIEW.md`。W10、W09 固定版本保留。

当前新增候选：**W10 表面与形态**，入口 `releases/w10/AIRCRAFT_ANM2_OBJECT_DNA_W10.html`，说明 `validation/W10_REVIEW.md`。W09 作为前版保留。

# Aircraft AN/M2 Object DNA V0.2 Clean Restart

分支：`rebuild/aircraft-anm2-object-dna-v0.2-clean-restart`

稳定对象 ID：`ODNA:MECH:ANM2:PILOT-0001`

当前生产代：`GEN-0002`

## 当前状态

本目录是新的活动生产入口。旧目录 `production/aircraft-anm2/` 保留为只读历史与失败对照。当前审阅候选为 W09，入口见 `README.md`。已实际载入原件进行对照，四个局部的双向可见表面采样通过本轮审阅阈值；详细结果和剩余差异见 `validation/W09_PREFLIGHT.json`。几何等价与用户验收仍未通过。

`visualAcceptance=false`

`productionReady=false`

`measurementKernelAccepted=false`

`geometryParityAccepted=false`

`B24InstallationComplete=false`

## 必须先读

1. `CURRENT.json`
2. `AGENTS.md`
3. `LINEAGE.json`
4. `SEMANTIC_PARTS_R02.json`
5. `DATUM_REGISTRATION_R02.json`
6. `handoffs/weapons-mother/AIRCRAFT_ANM2_OBJECT_DNA_FULL_HANDOFF_2026-09-07_V001/source/00_RESTART_START_HERE.md`
7. `handoffs/weapons-mother/AIRCRAFT_ANM2_OBJECT_DNA_FULL_HANDOFF_2026-09-07_V001/source/FAILURE_LEDGER.md`
8. `handoffs/weapons-mother/AIRCRAFT_ANM2_OBJECT_DNA_FULL_HANDOFF_2026-09-07_V001/source/NEXT_PRODUCTION_GATES.md`

## 第一阶段

先建立 Reference Twin 与 Native Twin 共用的机械基准，随后只重建第一个语义区域：

`receiver datum shell + top cover/plate layering + barrel-root/front-collar transition`

最低基准：

1. 枪体纵向主轴
2. 枪管中心轴
3. 枪口端面
4. 机匣前端面
5. 机匣后端面
6. 机匣顶面
7. 侧板基准面

禁止使用整枪包围盒长度和中心作为最终注册。禁止采用 W08 的每对象独立归一化包络作为形态正确性证明。

## 参考原件

文件：`anm2_browning_.50_cal_aircraft_machine_gun(1).glb`

大小：`6,548,040` 字节

SHA-256：`2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b`

原件只允许本地只读载入。它不进入产品数据和交接包。

## 发布门槛

下一版用户可见 HTML 需要满足：

1. 执行者已经实际载入原件。
2. 固定正侧、反侧、俯视、后视、轴向和局部近景均已检查。
3. 第一语义区域肉眼有明确收敛。
4. 基准误差、轮廓误差、表面距离和 required 部件完整率通过门槛。
5. 中性材质下形态成立。
6. 单文件 HTML 写入固定 GitHub commit。
7. 聊天中交付 raw.githack 直开链接。

用户不能再成为第一位真实参考载入后的视觉检查者。
