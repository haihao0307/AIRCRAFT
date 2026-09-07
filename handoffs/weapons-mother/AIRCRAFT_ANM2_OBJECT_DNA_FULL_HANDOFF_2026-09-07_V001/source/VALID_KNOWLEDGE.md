# 仍然有效的知识与方法

本文件只列可以带入新生产线的内容。它们仍需在新的实现中重新验证，不能自动继承旧页面的视觉接受状态。

## 1. 对象身份

稳定对象 ID：`ODNA:MECH:ANM2:PILOT-0001`

这个 ID 属于 Aircraft Browning M2 / AN/M2 数字重建对象。重新启动生产周期时保持不变。具体历史实体、具体枪号、具体 B24 飞机和枪位仍未绑定。

## 2. Object DNA 核心结构

当前有效层次：

1. Identity
2. Ontology
3. Semantics
4. FunctionGraph
5. EvidenceGraph
6. MeasurementGraph 接口
7. GeometryProgram 接口
8. SurfaceCoordinateProgram 接口
9. MaterialProgram 接口
10. LifecycleGraph
11. EvolutionGraph
12. BehaviorGraph
13. EventHistory
14. ApprovalLedger
15. WorldObjectContract

MeasurementGraph 的接口思想保留，W08 的具体包络算法被否决。

## 3. 真值等级

每条结论必须标记：

1. `known`
2. `inferred`
3. `estimated`
4. `unknown`

每条记录还要带来源、适用范围、时间范围、对象或部件 ID、置信度与冲突状态。

## 4. 参考输入身份

主参考文件：`anm2_browning_.50_cal_aircraft_machine_gun(1).glb`

大小：`6,548,040` 字节

SHA-256：`2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b`

已确认库存：28 节点、13 网格、51 访问器、151,832 顶点、139,891 三角形、12 个含 UV 的网格、0 图片、0 动画。

这些数字用于身份核验与源库存保护。参考模型的作者比例、命名、摆放和隐藏结构仍需历史资料交叉核验。

## 5. B24 优先级

当前只推进 B24 相关 Aircraft AN/M2。B17 资料延期。任何安装架、吊具、弹药箱、瞄具、枪位接口和排出路径必须绑定 B24 的具体型号、批次、枪位和日期，不能由其他飞机配置替代。

## 6. 资料路线

有效来源线索：

1. 1942-04-30，美国战争部 TM 9-225，Aircraft M2 fixed and flexible。
2. B-24 Australia 馆藏目录中的 ZE-32-047、AN 01-5E-4 等 B24 部件资料线索。
3. AirCorps Library 的 B24 安装、维护与武器资料目录。

目录记录只表示线索存在。没有实际读到图页时，不得把目录文字当成已经取得的原始图纸。

## 7. 双对象生产方式

有效原则：

1. Reference Twin 与 Native Twin 同时存在。
2. Reference Twin 只读。
3. Native Twin 只读取自己的规则。
4. 两者共享同一机械基准、相机、光照与审查材质。
5. 可以并排、轮廓叠合、差异热图和语义区域隔离。
6. 参考体不进入最终产品文件。

W07 的总包围盒中心对齐不在有效知识内。

## 8. 测量工具组合

经过实际探针的组合：

1. Trimesh 负责 GLB 场景解析、节点变换、截面语义和基础几何分析。
2. VTK 负责后台重复切片和表面距离。
3. NumPy 与 SciPy 负责轴、平面、圆柱、曲线和约束拟合。
4. CadQuery / OCP / Open CASCADE 作为参数化 BRep 编译后端。
5. Three.js 负责网页运行与审查。
6. three-mesh-bvh 作为后续网页空间查询候选。
7. OpenCV 用于照片与已知三维锚点注册。
8. COLMAP 与 Open3D 只在多视图照片、扫描或点云任务中按需接入。

一次本地探针中，96 个截面：Trimesh 约 265.64 ms，VTK 约 55.14 ms。这个结果只适用于当时机器和源文件，不能作为普遍性能结论。

## 9. 材质原则

1. 保存 cause-based MaterialProgram。
2. 区分基材、表面处理、制造痕迹、维护、磨耗、污染、氧化与微观响应。
3. 色彩、粗糙度、金属度、法线和浅位移可共享原因，响应函数分别定义。
4. 稳定部件局部坐标控制材质附着。
5. 传统 UV 作为 SurfaceCoordinateProgram 的一种编译输出。
6. 辅助弹药图片只研究材质分层，不复制图片、原 UV、几何和刻字。
7. 年代材质没有完成标定，旧化预设不能称为历史真值。

## 10. 时间与生命周期

对象状态由时间、环境、使用、维护、损伤、修复和事件历史共同决定。相同年龄可以产生不同状态。Lifecycle 与 Evolution 的骨架有效，具体变化规律尚未经过历史和材料数据标定。

## 11. 网页端与交付

最终运行方向固定为 Web。Mesh、UV、材质节点和动画缓存可以在运行时生成。永久数据以 GitHub 版本化保存。

每个审查版本必须：

1. 自包含单文件 HTML。
2. 固定 GitHub commit。
3. raw.githack 直开链接。
4. 桌面与 390×844 手机尺寸检查。
5. 实际参考体载入后的人工预检。
6. 未得到用户批准时保持 `visualAcceptance=false`。
