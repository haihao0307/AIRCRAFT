# TASK 002 · B-24 炮塔与机枪可拆分性审计

## 目标

对权威 B-24 GLB 的炮塔结构进行一次非破坏性技术审计，先以腹部球形双联炮塔为主，判断炮塔球壳、两挺机枪、炮管、支座、内部机构与机身开口能否被安全拆分成独立对象，并为下一阶段的旋转、俯仰、收放、损伤脱落或独立展示建立可靠结构。

当前阶段只做识别、拆分预览和报告，不加入自由落体、碰撞、爆炸或战斗逻辑。

## 权威模型锁

只允许使用：

- 文件：`b-24_liberator.glb`
- 字节：`23085972`
- SHA-256：`541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`
- 节点：1784
- 网格：348
- 动画：1
- 动画通道：2518

任何不满足锁定哈希的模型都不能作为结论依据。

## 现有合同边界

v0.9.6 已定义腹部双联炮塔视觉射击点：

- 左炮口：`[-0.26, -2.15, -0.55]`
- 右炮口：`[0.26, -2.15, -0.55]`
- 初始射击方向：`[0, -0.12, 0.99]`

当前运行合同明确保持 `sourceGunGeometryUnmodified = true` 与 `sourceWeaponNodesImmutable = true`。本任务不得直接破坏或覆盖原始层级、原动画、原材质和原节点。

## 必须完成的审计

加载并通过哈希校验后，对腹部炮塔附近所有候选节点和网格进行空间扫描、层级扫描和几何扫描。候选范围应围绕已知腹部双联炮塔坐标建立，随后用视觉检查修正。

每个候选对象记录：

- node index
- node name
- mesh index
- primitive 数量
- parent chain
- descendants
- local transform
- world transform
- world AABB 与尺寸
- material names
- vertex / index 数量
- animation channel references
- 是否与机身共享 mesh 或 primitive
- 几何连通岛数量
- 是否可以单独隐藏
- 是否可以单独复制
- 是否可以在保持世界变换的前提下 reparent

## 四类结论

必须将结果归入以下一种或多种情况：

### A · 已经是独立层级
炮塔球壳与机枪已经是独立节点或独立网格，只需重新建立枢轴与父子关系。

### B · 同一父级下的独立 primitive 或几何组
可以用 BufferGeometry group、primitive 或材质分组提取成独立 Mesh。

### C · 与机身同一 Mesh，但属于独立连通岛
需要离线脚本按连通岛切分，再修正原点、法线、切线和材质。

### D · 与机身焊接成连续拓扑
需要 Blender 中按空间、法线、材质和人工选择分离，并同时补出机身开口边缘或遮盖件。

不得在缺少真实模型证据时猜测属于哪一类。

## 非破坏性网站预览

在现有在线检查站中增加“炮塔审计”模式，只在审计分支工作：

1. 腹部炮塔候选节点高亮。
2. 球壳、左机枪、右机枪、炮管、内部机构、机身相邻蒙皮分别显示不同颜色。
3. 支持逐项隐藏与显示。
4. 支持“爆炸视图”滑块，将各部件沿局部方向小幅分离，便于观察，不改变源节点数据。
5. 支持“临时独立化”预览：克隆候选对象，使用保持世界变换的 reparent 方法放入独立 Group，原对象保留且可一键恢复。
6. 显示每个候选节点的名称、索引、父级、网格、材质、包围盒、动画通道数。
7. 导出完整审计 JSON。
8. 不得让炮塔真正掉落，不得加入物理，不得改动射击效果。

## 建议的下一阶段层级

若审计确认可拆，报告中评估下列目标层级是否适用：

```text
VentralTurretAssembly
  TurretAttachRoot
    TurretLift            可选，仅在真实结构和模型支持收放时启用
      TurretYaw
        TurretBallShell
        GunElevation
          GunLeft
            MuzzleLeft
          GunRight
            MuzzleRight
        SightAndInterior
```

要求：

- `TurretYaw` 只负责水平旋转。
- `GunElevation` 只负责双枪同步俯仰。
- 球壳是否随俯仰一起运动，必须依据真实模型结构和历史机构决定。
- 若模型包含可收放机构，再单独增加 `TurretLift`。
- 机枪与炮塔必须允许未来单独损坏、隐藏或替换。
- 原始 GLB 保持只读，正式可动结构应由导出的派生资产或运行时映射实现。

## 离线拆分脚本

如果属于 B、C 或 D 类，增加一个 Blender 审计脚本草案：

`scripts/blender/audit_and_extract_turret.py`

脚本至少应支持：

- 按节点、材质、连通岛、空间范围列出候选几何。
- 导出只读审计报告。
- 在显式 `--extract-preview` 参数下，复制源对象后进行试验性分离。
- 保留原始 UV、LiveryUV、法线、切线、材质槽和世界变换。
- 为球壳与双枪计算合理枢轴。
- 不覆盖原始 GLB。

## 输出文件

- `reports/turret-separation-audit.json`
- `reports/turret-separation-audit.md`
- `docs/TURRET_COMPONENT_CONTRACT.md`
- `scripts/audit-turret-hierarchy.mjs`
- `scripts/blender/audit_and_extract_turret.py`
- 在线审计界面与截图

## 验收标准

1. 结论基于锁定哈希模型。
2. 腹部炮塔候选范围完整，且每个候选对象有 node / mesh / parent / material / bounds 数据。
3. 明确判定 A、B、C 或 D 类，允许组合结论。
4. 球壳与两挺机枪能否独立化有明确结论和证据。
5. 原始模型、原动画、原材质与现有飞机运行逻辑零改动。
6. 网站可以高亮、隐藏、爆炸视图、临时独立化和一键恢复。
7. 报告明确下一阶段旋转层级、枢轴位置、自由度和风险。
8. 当前阶段不实现掉落或物理。

## 结论格式

最终报告首页必须直接给出：

- `ballShellSeparable`: yes / partial / no / blocked
- `gunsSeparable`: yes / partial / no / blocked
- `recommendedMethod`: reparent / primitive extraction / connected-island extraction / manual topology split
- `sourceModelVerified`: true / false
- `safeToProceedToMotionRig`: true / false
- `keyRisks`: 数组

完成全部审计后停止，等待上游决定是否进入可动炮塔系统。
