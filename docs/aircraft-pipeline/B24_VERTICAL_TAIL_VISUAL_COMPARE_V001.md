# B24 双垂尾图纸与原始模型可视化对照 v0.0.1

## 目的

本页面把以下三类证据放在同一审查入口：

1. 锁定的 `b-24_liberator.glb` 原始参考飞机。
2. `AN 01-5E-3` page ix 的 B-24J 官方三视图。
3. 依据有限正投影轮廓制作的数据原生双垂尾视觉候选。

入口：`preview/b24-vertical-tail-compare-v001/index.html`

## 当前明确差异

| 项目 | 图纸候选 | 原始参考 | 当前结论 |
|---|---:|---:|---|
| 双垂尾中心间距 | 7.9248 m | 7.8047 m | 图纸候选增加约 0.1201 m，约 1.54% |
| 图纸全轮廓高度 | 3.633 m | 3.517 m | 口径不同，参考值只对应方向舵节点 719 与 744 |
| 图纸全轮廓弦长 | 2.783 m | 1.049 m | 口径不同，参考值只对应方向舵节点 |
| 候选厚度 | 0.195 m | 固定垂尾厚度尚未映射 | 未批准假设 |
| 方向舵行程 | ±30° | 动画语义尚未关闭 | 未批准候选 |
| 垂尾总面积 | 188 sq ft | 181.2 sq ft 候选记录 | `B24-VTAIL-CONFLICT-001` 继续阻断 |

## 参考节点修正

节点 `719` 与 `744` 目前只作为左右主方向舵候选。它们位于 `rudder_percent` 动画分支中，各有 980 个三角形。固定垂直安定面仍需要从静态合并尾段中完成正式映射，不能把方向舵节点当作完整垂尾。

## 来源锁

```text
file   b-24_liberator.glb
bytes  23,085,972
sha256 541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d
```

```text
source document  AN 01-5E-3
page             ix
variant          B-24J
original bytes   6,721,623
original sha256  de0819d07d35f37126ed62b3a6f02131aaded7cbaa5c49ce63187f72dab0f5b6
cleaned bytes    453,910
cleaned sha256   07449d0a39a22ae71851025960a9f0725f9ee3041d0ea6e1e6b6d03b29951df6
```

清理图只承担审查显示。原始扫描继续控制来源记录。

## 当前批准状态

```text
sourceApproved             false
variantApplicabilityApproved false
referenceMappingApproved   false
geometryRecipeApproved     false
behaviorApproved           false
surfaceProgramApproved     false
referenceParityApproved    false
verticalTailApproved       false
```

本版只建立可见的比较闭环。它不会替换原始模型，也不会把有限轮廓、厚度假设或冲突数据提升为生产几何。
