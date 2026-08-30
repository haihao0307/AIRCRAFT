# B24 模块化整机装配架构

## 1. 目标

这套架构允许 B24 按部件逐步生产，同时保证每个独立成果最终能够装回同一架飞机。它把来源真值、工程 CAD、运行时模型和历史涂装分成不同层，并通过稳定的部件编号、坐标、接口和来源链连接起来。

## 2. 四层体系

### 2.1 来源层

保存原始 PDF、TIFF、照片、图纸页、标题栏、图号、版本、日期、适用机型、工厂、生产批次、文件哈希和权利状态。

来源层只保存事实和证据。任何裁切、拉正、增强或矢量描摹都作为派生文件保存，并记录父文件哈希和变换参数。

### 2.2 工程定义层

保存：

- 工程坐标和单位
- 机身站位、纵剖线和水线
- 控制尺寸与公差
- 放样坐标和剖面
- 参数化曲线、曲面和实体
- 零件号、装配号和变型适用性
- 接口、基准、孔位、轴线和运动范围

正式工程母版优先保存为开放参数数据、CadQuery 或 FreeCAD 源、STEP 和检查报告。任何网格格式都属于工程母版的派生输出。

### 2.3 运行时层

保存网页和游戏运行所需的优化网格、LOD、动画层级、碰撞体、材质、纹理和交互逻辑。运行时资产必须由工程定义层或经过批准的视觉资产派生，并保留来源映射。

### 2.4 涂装与表面生产层

保存每架具体飞机的历史标记、涂装分区、表面锚点、UV、PBR 通道、铆钉、板缝、检修盖板、磨损和任务状态。

涂装锚点同时引用：

- `component_id`
- 工程坐标
- CAD 曲面参数或面 ID
- 运行时网格与三角面映射
- 左右舷和时间状态
- 历史证据 ID

## 3. 全机装配树

建议的顶层装配树如下：

```text
B24J_CO_ENGINEERING_MASTER
  reference-system
  fuselage-assembly
    nose-assembly
    forward-fuselage
    center-fuselage
    bomb-bay-assembly
    aft-fuselage
    tail-cone
  wing-assembly
    center-wing
    left-inner-wing
    left-outer-wing
    right-inner-wing
    right-outer-wing
    flaps
    ailerons
  empennage-assembly
    horizontal-tail-center
    left-horizontal-stabilizer
    left-elevator
    right-horizontal-stabilizer
    right-elevator
    left-vertical-stabilizer
    left-rudder
    right-vertical-stabilizer
    right-rudder
  propulsion-assembly
    engine-1
    engine-2
    engine-3
    engine-4
    nacelles
    propellers
  landing-gear-assembly
  turret-and-armament-assembly
  glazing-and-openings
  exterior-panels-and-fairings
  systems-reference
  livery-surface-map
```

这棵树表达工程关系。运行时可以为了性能合并网格，但稳定部件编号、父子关系和装配接口不能丢失。

## 4. 坐标和基准

### 4.1 工程坐标

- `X` 向机头为正
- `Y` 向右舷为正
- `Z` 向上为正
- 单位为毫米
- 角度为度，计算内部可使用弧度

正式原点等待原厂总体图和站位资料确认。确认前以 `origin_status: provisional` 表示。

### 4.2 Three.js 映射

统一使用：

```text
three.x = engineering.y
three.y = engineering.z
three.z = engineering.x
```

所有导出器调用同一映射函数。部件代码中禁止自行交换轴、反转符号或重新定义前方。

### 4.3 局部坐标

每个部件拥有局部坐标，但必须声明：

- `local_origin`
- `local_axes`
- `parent_interface_id`
- `transform_to_parent`
- `transform_to_aircraft`
- `transform_status`

局部原点优先落在真实安装基准、轴线交点或图纸定义基准上。视觉中心和包围盒中心只能作为明确标记的临时原点。

## 5. 部件合同

每个部件记录至少包含：

- 稳定 `component_id`
- 中文和英文名称
- 父装配和子部件
- 固定件、活动件或可拆件角色
- 左、右、中性侧别
- 适用变型、工厂和批次
- 工程来源
- 局部坐标与全机变换
- 安装接口
- 运动轴和范围
- CAD 源与导出
- 运行时资产
- 涂装表面和历史锚点
- 未知项、假设、冲突和置信度
- QA 状态和审批状态

## 6. 接口优先原则

部件可以按不同速度生产，接口必须先冻结。接口包括：

- 安装平面
- 中心线
- 轴线
- 孔位或紧固件组
- 剖面边界
- 允许间隙
- 父子变换
- 运动包络
- 表面连续性约束

缺少真实尺寸时可以建立 `pending_source` 接口占位。占位值不能进入正式工程发布，也不能隐藏在默认参数中。

## 7. 垂直尾翼首件路线

### 7.1 组件

- `empennage.vertical.left.stabilizer`
- `empennage.vertical.left.rudder`
- `empennage.vertical.right.stabilizer`
- `empennage.vertical.right.rudder`
- `empennage.vertical.left.hinge-axis`
- `empennage.vertical.right.hinge-axis`
- 左右安装接口
- 左右外蒙皮与涂装表面

### 7.2 为什么从这里开始

垂直尾翼具有清楚的外轮廓、明确的活动面、左右成对关系和重要历史标记。一个小范围试验就能覆盖整套体系中最关键的坐标、接口、运动、表面和涂装映射问题。

### 7.3 试验输出

```text
source-input/b24-engineering/empennage/
derived/calibrated/empennage/
derived/vector/empennage/
derived/cad/vertical-tail/
derived/runtime/vertical-tail/
data/b24-engineering/components/vertical-tail.json
reports/b24-engineering/vertical-tail/
```

二进制大文件可以由外部资产桥保存。GitHub 中保留清单、哈希、参数、源代码、报告和轻量预览。

## 8. 双重回路

每个部件都有两条同步回路。

### 工程回路

```text
原厂来源
  到 标定图纸
  到 尺寸和剖面
  到 参数化 CAD
  到 STEP
  到 投影和尺寸 QA
```

### 运行时验证回路

```text
已标定图纸和组件合同
  到 原生运行时网格
  到 浏览器多视角
  到 视觉 QA
  到 运行时批准候选
```

两条回路在装配接口、全机坐标、轮廓投影和表面锚点处交汇。视觉回路发现问题，工程回路决定最终几何。工程回路生成的运行时网格还需要视觉回路验证。

## 9. 审批状态

每个部件分别维护：

- `sourceIntakeApproved`
- `variantApplicabilityApproved`
- `runtimePreviewApproved`
- `engineeringCadApproved`
- `assemblyInterfaceApproved`
- `runtimeMeshApproved`
- `liverySurfaceApproved`
- `componentFinalApproved`

只有全部必要状态通过，部件才能进入正式整机发布。整机审批还需要所有部件版本、接口版本和整机回归测试共同通过。
