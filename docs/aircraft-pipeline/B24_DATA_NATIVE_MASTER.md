# B24 数据原生飞机母体

## 1. 定位

B24 项目的长期主资产是一套可读取、可修改、可编译、可继承的数据母体。几何、动作、表面、乘员、武器、载荷和历史实例都由结构化合同连接。浏览器根据母体实时生成可观察和可操控的飞机。

母体的首个对象为 `B24J_CO_DATA_NATIVE_MASTER`。它同时承担 `Aircraft Native Forge` 的第一架完整验证机。完成后，同一套框架通过替换 AircraftDNA、装配数据、几何参数、系统配置和证据资料，继续生产 B25、B17、B29 和后续战斗机。

## 2. 总控关系

ChatGPT负责上游总设计与判断：

1. 资料选择与证据等级
2. 飞机家族、机型、工厂和批次适用性
3. 整机装配树与稳定部件编号
4. 几何配方、接口、运动轴和控制逻辑
5. 表面分区、蒙皮层、历史锚点和模块合同
6. 视觉验收、冲突判断、替换优先级和批准状态

Codex负责执行已经批准的数据合同、生成器、测试和网页实现。缺少资料时必须停止对应阶段并保留 `unresolved`。

Image2ThreeJS只保留为外部方法研究资料。默认禁用，不参与结构判断、几何生成、蒙皮、行为、运行时或批准。未来只有用户明确点名并限定任务范围时，才允许开展隔离实验。

## 3. Aircraft Native Forge

B24母体由自研框架编译。框架包含八个生产层：

1. Evidence Intake，来源、图纸、手册、照片、参考模型、测量、哈希和置信度
2. AircraftDNA，机型身份、工厂、批次、坐标、总体布局和实例继承
3. AssemblyGraph，零件树、安装接口、拆卸关系、运动轴和插槽
4. GeometryRecipe，站位、剖面、轮廓、翼型、放样、开口和细节规则
5. SurfaceProgram，蒙皮、颜色、标志、板缝、铆钉、磨损和PBR参数
6. BehaviorGraph，飞控、动力、起落架、弹舱、武器、乘员和任务流程
7. Runtime Compiler，Three.js、WebGPU、碰撞、LOD、临时UV和发布输出
8. QA and Approval，来源、尺寸、结构、运动、表面、历史和浏览器验收

## 4. 核心数据合同

### 4.1 AircraftDNA

保存飞机身份、坐标系、单位、变型、工厂、批次、整机尺度、系统布局和历史实例继承关系。

### 4.2 AssemblyGraph

保存稳定 `component_id`、父子关系、装配接口、安装基准、局部坐标、运动轴、拆卸关系、替换状态、紧固件组、质量字段和系统插槽。

第一版薄整机骨架包含31个节点，覆盖机身、机翼、尾翼、动力、起落架、武器、载荷、乘员和外部系统。参考模型中的可隐藏节点只能提供分件证据，正式可拆零件还要补齐完整装配合同。

### 4.3 GeometryRecipe

保存能够重新生成形状的数据：

1. 站位与剖面
2. 轮廓曲线与放样规则
3. 翼型、后掠、上反角、扭转和厚度分布
4. 开口、面板、舱门和活动边界
5. 重复结构、铆钉阵列和紧固件模式
6. 局部曲面参数与接口连续性

原厂图纸和官方手册控制工程几何。参考GLB用于轮廓、位置和动作交叉检查。任何视觉估算都必须保留派生记录和未批准状态。

### 4.4 SurfaceProgram

SurfaceProgram保存稳定语义表面和蒙皮层。第一版SurfaceGraph含62个槽位，覆盖机身左右舷、机翼上下表面、控制面、双垂尾、四组短舱与整流罩、炸弹舱门、炮塔整流区域和座舱区域。

每个表面可以独立包含：

1. 金属或织物基材
2. 底漆与防腐层
3. 主色漆或自然金属参数
4. 局部颜色变化
5. 国籍、单位、编号和机头艺术
6. 板缝、检修盖板和铆钉
7. 油污、烟熏、泥土、掉漆和氧化
8. 粗糙度、金属度、法线和高度

自由设计模式允许实时调整主色和PBR响应。历史模式锁定已批准颜色、左右舷标志和任务时间状态。外部生产的UV、矢量涂装和表面程序通过稳定 `surface_id` 接入。

### 4.5 BehaviorGraph

保存语义输入、状态机、机构顺序、约束和输出目标。第一版包含13个控制器种子，覆盖螺旋桨、起落架、炸弹舱、载荷释放、襟翼、副翼、升降舵、方向舵、炮塔、整流罩襟片和乘员离机。

原GLB的动画通道用于提取时序、方向、枢轴候选和运动范围。公开控制接口使用语义名称，避免依赖原模型节点名。

### 4.6 EvidenceGraph

保存来源文件、哈希、图号、页码、提取方法、变换过程、置信度和审批状态。

证据优先级为：

1. 已批准原厂图纸或官方技术命令
2. 已批准零件目录、维修手册或维护数据
3. 已核验实机测量
4. 锁定参考模型的测量和动作证据
5. 历史照片推断
6. 生成假设

低等级资料不能静默覆盖高等级批准数据。

## 5. 参考GLB的角色

锁定文件：

```text
b-24_liberator.glb
bytes  23,085,972
sha256 541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d
```

它提供：

1. 1,784个节点及父子关系
2. 348个网格与世界包围盒
3. 325,358个三角形的参考外形
4. 30个材质和18个嵌入图像的分配关系
5. 1段动画与2,518条动画通道
6. 起落架、螺旋桨、舱门、舵面和其它机构的运动示例
7. 部件位置、粗略尺寸和整机比例的比较基准

精确参考网页继续保留，直到所有对应原生系统通过固定视角、固定时间和多视图验收。

## 6. 逐部件替换

正式路线为：

1. 保留完整参考飞机
2. 建立一个组件的来源和参考映射
3. 用图纸制作GeometryRecipe
4. 补齐装配接口、蒙皮和行为
5. 进行固定A/B和隔离测试
6. 只替换该组件映射的参考子树
7. 保持其它系统完全不变

第一套完整组件为双垂直安定面与左右方向舵。

后续优先处理：

1. 发动机、短舱、整流罩和螺旋桨
2. 机鼻与座舱
3. 炮塔与机炮
4. 起落架
5. 炸弹舱、弹架和载荷
6. 机翼、飞控面和机身分段
7. 乘员、舱内通道和外部设备

## 7. 运行时编译

```text
AircraftDNA
+ AssemblyGraph
+ GeometryRecipe
+ SurfaceProgram
+ BehaviorGraph
+ aircraft instance
= runtime aircraft
```

运行时可以生成BufferGeometry、WebGPU材质、临时UV、碰撞体、LOD、动画状态和发布包。每个输出保留母体版本，能够重新生成。

## 8. B24到后续机型的继承

可复用内容包括：

1. 坐标与单位合同
2. AssemblyGraph语法和拆装接口
3. GeometryRecipe通用放样器
4. SurfaceProgram和历史实例机制
5. BehaviorGraph控制器和状态机
6. Crew、Payload、Turret、LandingGear和Propulsion系统接口
7. 完整起飞、任务和降落流程语法
8. EvidenceGraph和QA门槛

B25、B17、B29和战斗机需要提供自己的图纸、尺寸、装配树、系统配置、运动参数和历史实例。生产框架继续复用。

## 9. 当前批准状态

```text
aircraftNativeForgePolicyApproved  false
reusableSystemLibraryApproved      false
componentProductionContractApproved false
aircraftDataMasterApproved         false
assemblyGraphApproved              false
geometryRecipesApproved            false
behaviorGraphApproved              false
surfaceSystemApproved              false
referenceModelCrossCheckApproved   false
verticalTailApproved               false
```

当前成果属于自研基础架构、精确参考蒸馏和首个组件的生产准备阶段。
