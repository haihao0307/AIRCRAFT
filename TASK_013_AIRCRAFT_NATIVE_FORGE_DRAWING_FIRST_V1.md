# TASK 013

## Aircraft Native Forge 与图纸优先首件重建

## 一、任务目标

在现有 B24 权威参考模型精确镜像基础上，建立完全自研的 Aircraft Native Forge 第一版，并用双垂直安定面与左右方向舵总成完成第一条真实部件生产闭环。

本任务结束时，应当得到：

1. 可复用于 B24、B25、B17、B29 的通用飞机数据合同
2. 图纸优先的部件重建合同
3. 仓库原生工具权限政策
4. 双垂尾与方向舵的来源台账
5. 参考 GLB 节点到正式组件的审核映射
6. 第一版参数化几何配方
7. 方向舵行为合同
8. 八个蒙皮表面槽位和实时材质参数
9. 可拆装和重新安装演示
10. 图纸、参考 GLB 和数据原生结果的浏览器对照页

## 二、工作边界

1. 只在 `research/b24-engineering-drawings-cad-v1` 工作
2. 继续使用 Draft PR #14
3. 保持 PR open、Draft、未合并
4. 禁止强推、改写历史、修改 main、gh-pages 和 Pages 设置
5. 锁定参考模型保持不变
6. 所有重建、测量、验证和发布工具均由仓库管理并可重复执行
7. 禁止无证据推断飞机结构、尺寸、机构和表面
8. 所有新流程由仓库内自研数据合同、脚本和网页实现
9. 对无法从证据确认的数据使用 `pending-source`
10. 禁止为了形成完整外形而静默补值

## 三、证据优先级

依次使用：

1. Consolidated 原厂图纸
2. 官方 B24 技术手册和零件目录
3. 可识别飞机、时间和视角的历史照片
4. 锁定参考 GLB 的节点、网格、变换和动画轨道
5. 多来源推导候选
6. 临时视觉代理

来源冲突必须保留冲突记录。参考 GLB 对外形和机构有重要参考价值，但不自动获得工程批准。

## 四、第一阶段，工具与架构锁定

### 4.1 原生工具政策

机器可读政策：

`data/aircraft-native/tool-authority-policy.json`

验证内容：

1. package 依赖必须通过仓库审计。
2. 运行时 import 必须来自锁定依赖或仓库自有模块。
3. Actions 只执行受版本控制的生成器和验证器。
4. 自动几何批准、自动语义批准和静默补值均为关闭。
5. 工具输出必须记录输入、版本、参数、哈希和批准状态。
6. 用户和上游审批保留最终决策权。

### 4.2 通用数据合同

新增通用 component reconstruction contract，覆盖：

```text
identity
variant applicability
source ledger
reference node mapping
datums
stations
profiles
geometry recipe
assembly interfaces
motion interfaces
surface domains
material stack
behavior mapping
qa ledger
approval ledger
```

## 五、第二阶段，双垂尾图纸入库

优先寻找和核对：

1. B24J 三视图中的垂尾区域
2. `D-1840` 或 `RD-6894` 总体布置图中的尾翼尺寸与站位
3. `AN 01-5E-3` 中垂尾、方向舵、框、蒙皮和结构修理图
4. `AN 01-5E-4` 中垂尾与方向舵爆炸图、零件号和适用性
5. Consolidated 工厂目录中的总成号和零件号
6. B24J CO 历史照片中的左右外表面和标记位置

每份文件需要：

```text
SHA256
title block review
drawing number
revision
issue date
applicable variant
applicable serial range
sheet number
scale calibration
rights record
```

任何文件没有完成真实下载和哈希时，不得写成已入库。

## 六、第三阶段，参考 GLB 节点映射

使用现有在线精确镜像页和完整节点清单，确认：

1. 左垂直安定面固定结构
2. 左方向舵
3. 右垂直安定面固定结构
4. 右方向舵
5. 相关铰链、舵角机构和小附件
6. 与水平尾翼和后机身的父链
7. 原动画中影响方向舵的通道
8. 原材质和 UV 分配

每一个候选必须保存：

```text
reference_node_id
stable_node_path
parent_chain
mesh_ids
world_bounds
animation_channel_ids
candidate_role
review_status
evidence_refs
```

关键词、空间位置和对称性只用于产生候选，不能自动批准。

## 七、第四阶段，垂尾 GeometryRecipe

### 7.1 固定垂尾

至少定义：

```text
root datum
root chord
tip chord
leading edge curve
trailing edge curve
height stations
section profiles
thickness distribution
incidence
cant or toe angle
fillets
skin boundaries
attachment interface
```

### 7.2 方向舵

至少定义：

```text
hinge axis
hinge stations
leading edge profile
trailing edge profile
balance geometry
maximum left angle
maximum right angle
clearance envelope
actuation interface
surface boundaries
```

### 7.3 禁止项

1. 不使用简单盒体或平板替代正式曲面
2. 不使用单张照片估计隐藏剖面
3. 不因左右相似就自动镜像历史表面
4. 不在缺少证据时填写看似合理的工程数值

## 八、第五阶段，AssemblyGraph 和拆装

正式组件建议：

```text
empennage.vertical.left.stabilizer
empennage.vertical.left.rudder
empennage.vertical.right.stabilizer
empennage.vertical.right.rudder
```

每个组件补齐：

```text
parent component
installation datums
attachment interfaces
fastener groups
removal dependencies
removal sequence
replaceable flag
movable flag
mass properties status
surface ids
behavior ids
```

网页演示需要支持：

```text
isolate
detach
attach
replace candidate
explode view
restore assembly
```

拆卸后不得修改组件自身局部坐标和 GeometryRecipe。

## 九、第六阶段，SurfaceGraph 与蒙皮

建立八个独立表面：

```text
empennage.vertical.left.stabilizer.outer
empennage.vertical.left.stabilizer.inner
empennage.vertical.left.rudder.outer
empennage.vertical.left.rudder.inner
empennage.vertical.right.stabilizer.outer
empennage.vertical.right.stabilizer.inner
empennage.vertical.right.rudder.outer
empennage.vertical.right.rudder.inner
```

每个表面需要：

```text
parameter domain
u and v direction
seam policy
panel boundaries
rivet patterns
material stack
marking anchors
historical instance overrides
```

实时材质调整至少包含：

```text
base color
metalness
roughness
primer visibility
paint wear
oxidation
panel contrast
rivet contrast
```

历史实例模式需要保护尾号、单位标志和左右侧差异。

## 十、第七阶段，BehaviorGraph

将原动画轨道蒸馏为：

```text
flight-control.rudders.command
flight-control.rudders.left-angle
flight-control.rudders.right-angle
flight-control.rudders.neutral-return
```

需要确认：

1. 左右方向舵同步关系
2. 正负角方向
3. 枢轴位置
4. 原动画角度范围
5. 图纸或手册规定的运动范围
6. 手动拖动与任务动画之间的优先级
7. 复位逻辑
8. 运动包络和碰撞检查

## 十一、第八阶段，浏览器对照与验收

建立三栏或可切换对照：

1. 原厂图纸和标定轮廓
2. 锁定参考 GLB 对应节点
3. Aircraft Native Forge 数据原生组件

必备视图：

```text
left
right
front
rear
top
bottom
three-quarter left
three-quarter right
hinge closeup
root attachment closeup
surface parameter view
exploded assembly view
```

网页必须显示：

```text
source status
pending fields
approved fields
reference node ids
component ids
surface ids
current geometry recipe version
current behavior version
current material parameters
```

## 十二、验收门槛

### 12.1 来源

1. 关键轮廓和安装数据具有可追溯来源
2. 图纸适用性明确
3. 扫描和派生文件哈希完整
4. 未取得来源的数据保持 pending

### 12.2 几何

1. 多视角轮廓对齐
2. 左右站位正确
3. 厚度和剖面连续
4. 根部安装无穿插和悬空
5. 固定面与活动面间隙合理
6. 不保留粗糙占位几何

### 12.3 行为

1. 枢轴正确
2. 正负角方向正确
3. 左右同步关系正确
4. 运动范围有来源
5. 无穿插和越界
6. 可从任意状态复位

### 12.4 表面

1. 八个 surface id 独立
2. 左右历史标记不自动镜像
3. 颜色可实时调整
4. 板缝和铆钉保持稳定
5. 几何重建后锚点能够重新定位
6. UV 或程序化参数域无跨接缝拉伸

### 12.5 复用

通用 schema、编译器和 QA 不能含 B24 专用硬编码。机型专用数据位于独立目录。

## 十三、批准状态

本任务创建时：

```text
toolAuthorityPolicyApproved             true
drawingFirstWorkflowApproved            true
verticalTailSourcesApproved              false
verticalTailReferenceNodeMapApproved     false
verticalTailGeometryRecipeApproved       false
verticalTailAssemblyApproved             false
verticalTailBehaviorApproved             false
verticalTailSurfaceModuleApproved        false
verticalTailBrowserQaApproved            false
aircraftDataMasterApproved               false
```

只有所有垂尾门槛通过后，首件才能替换薄整机骨架中的临时尾翼。
