# Weapons Mother 第二次专题学习

日期：2026-09-05。范围：继续第一轮学习，重点补读材质、UV、法线及参数面板。性质：学习笔记、理解自查和后续检查设计。未创建或修改生产工作台。

本次写入前已重新读取专用分支 feature/b24-weapons-mother-v1，HEAD 为 0fce6bbbd135f03dacaa519a70b96d8371bc4ce0。前一轮 SKILL.md 已全文回读，blob 为 237d2ab79c72d7c372423174a8ba1c9f2fd195b7。该提交只更新学习记录，不能证明 R019 完整源码已经恢复。

## 一、沿用资料的补读

小妈来源仓库：haihao0307/guilin-dem-pipeline；读取分支：handoff/xiaoma-mentor-v1.1-20260905。本轮新读下列文件全文，blob 身份用于精确定位：

1. docs/mother_coordination/mentor-v1.1/MOTHER_STARTUP.md，e6071337c9733d3d7a4e621a95e830d29e57189c。
2. 同目录 REVIEW_DISPOSITION.md，3b72eac7b0a3e12d79afb8230fe110d218c56cc8。
3. 同目录 RECIPIENTS.md，49c524b4cbc5fa90a62b4b2401150c360a938ef3。
4. 同目录 full-handoff-v1.1.1/source/Mother_System_Xiaoma_Full_Handoff_V1.1.1_2026-09-05/sources/mentor_v1_1/00_小妈先读.md，c3eb9d4f67c8fb7a0994958b261940042a54a57c。

原文要求：区分证据、理解、表示和执行层的错误；固定比较条件；先做有限修正；保留可恢复版本；未执行的检查不能记为通过。完整知识平台无需成为一次有限修正的前置。上述原文没有审计全部 Mother 当前源码。

本线解释：进入原工作台后，先判断某个视觉问题源于几何、材质通道还是显示配置，再决定改哪一层。改善光照不能单独证明结构修复。学习阶段不改已确认模型、源 UV、节点和动画，不新建替代面板，不恢复撤回路线。Aircraft AN/M2 Core 与 B24 炮位适配继续独立。

## 二、官方资料补读及其适用范围

### 1. Blender：几何、法线和 UV 要分开判断

本轮再次尝试直接读取 Bevel Modifier、Weighted Normal Modifier、Editing UVs，读取接口仍返回 402；官方手册源文件访问也未成功。已补读官方检索片段，不能记为章节全文已读。

检索片段支持：Bevel 的 Clamp Overlap 限制倒角宽度以避免相交；Weighted Normal 的 Keep Sharp 保留锐边；UV 的 Average Island Scale 与 Minimize Stretch 分别涉及岛尺度和拉伸处理。[B1][B2][B3]

本线解释：倒角、着色法线、UV 编辑会作用于不同数据，不能相互替代验收。对现有源 UV 只计划诊断，不执行重排。原模型是否需要倒角、是否存在法线错误，仍要检查实际源数据。本轮未得出这些资产结论。

### 2. Designer：遮罩的输入条件

Metal Edge Wear 正文说明其输出为依据烘焙图及参数生成的黑白遮罩，输入包括 Curvature、Ambient Occlusion、Grunge、World Space Normal 和 Position 等。[A1]

本线解释：先追踪遮罩依据和适用区域，再谈磨损外观。自动凸边遮罩提供候选分布；它没有提供某件历史物品的真实磨损证据。基材、涂层、污染和使用痕迹需要各自的语义及来源，不能用统一噪声替代。

### 3. Designer：三平面投影与尺度

Tri Planar 正文说明：该节点在二维图流程中使用烘焙的 Position 与 World Space Normal 数据；建议高精度输入，相关输入理想精度为 16-bit 或更高；节点成本较重。[A2]

Height to Normal World Units 正文把 Surface Size 和 Height Depth 标为 cm，并允许选择法线格式。[A3]

本线解释：节点名不能证明无 UV 或零成本，文档也没有要求删除源 UV。迁移到网页前需另证运行时实现、采样坐标和成本。尺寸与高度幅度应分别记录；本轮没有为历史资产猜测凹凸尺寸，也没有执行烘焙。

### 4. 法线与色彩

Designer Project settings 的 General/3D scenes/Misc 章节涉及切线空间和 OpenGL/DirectX 法线格式；Normal Vector Rotation 说明它旋转的是切线空间法线向量，未移动像素位置，格式选项会翻转绿色通道。[A4][A5]

Three.js Color Management 区分颜色贴图、非颜色数据、Linear-sRGB 工作空间及输出转换，并指出调节灯光不能解决错误的色彩转换。[T1]

本线解释：法线格式与纹理上下方向分别记录；不能看到凹凸反向就同时翻图、翻 UV、反转绿色通道。先查对应通道、切线空间及实际输出链。网页文档的默认设置不等于本项目实际配置，本轮未检查 R019 的相关实现。

### 5. 面板参数

Exposing a parameter 的 Understanding、Limitations、Input Parameters、Previewing 和 Cleaning 章节已读。参数有 Identifier、Label、Group、Default、Min/Max 和 Clamp 等属性；静态参数存在发布后无法动态编辑的限制；Preview Mode 可检查发布后的参数表现。[A6]

本线解释：后续面板以少量有意义的控制项组织，不将每个内部节点都暴露成滑条。固定标识用于保存和恢复，显示名称可独立变化。每个候选控制项应记录作用通道、默认值、范围、依赖、是否动态，以及哪些历史模式下只读。这里仅定义检查项，未建立 SBSAR 到网页的执行桥接。

### 6. 材质模型迁移

OpenPBR 本轮读到 Interoperability、Material types、Blending Between Material Behaviors，以及 Working with OpenPBR 的概念架构部分。原文区分材质模型与交换格式，并明确灯光、算法、色彩管理和功能支持仍可能导致跨应用外观差异。[A7]

本线解释：可学习分层思想和参数语义，不能只复制参数名便宣称网页等价。此阅读没有授权升级渲染器，也没有为历史对象确定新的表面材料。

## 三、八项理解自查

以下是书面作答，尚未经小妈独立复核，也未作为软件测试通过记录。

Q1：改法线后高光更顺，能否证明零件位置正确？
答：不能据此作位置结论。需要分别检查几何与最终对象变换。高光属于本次观察，坐标关系需要自己的证据。

Q2：发现 UV 岛尺度不一致，是否立即 Average Island Scale？
答：先核对是否为有意安排、源 UV 保护要求及问题部位。当前只允许读回和诊断；重排会改变源数据，不能自动执行。

Q3：打开三平面开关即可保证没有接缝？
答：该 Designer 节点依赖位置和世界空间法线烘焙数据，精度与混合设置也重要。网页实现另需证明。不能从开关名得出最终画面结论。

Q4：粗糙度数据 0.5 要不要作 sRGB 颜色解码？
答：按 T1 的普通非颜色数据路径保留其数据意义。T1 给出的颜色示例中，sRGB 0.5 转入线性约为 0.214041140；不能将该颜色变换无条件用于粗糙度。

Q5：法线凸凹颠倒时，能否直接把整张图上下翻转？
答：应先区分像素/UV 方向、法线向量格式与切线基。A5 明确向量旋转不移动像素。没有实际配置和对照，不决定翻转操作。

Q6：自动磨损遮罩看起来合理，能否作为历史证据？
答：它只能作为生成结果。型号、平台、年代、修复状态与观察来源仍需独立核对；不得拿别的平台外观自动证明 B24 细节。

Q7：Designer 里能调的参数，发布后都能在网页调吗？
答：A6 列出静态参数等限制；网页还需要自己的实现或集成。必须分别证明参数暴露、发布能力与网页执行能力。

Q8：新旧画面不同是否足以证明修复有效？
答：先确认源版本、对象、相机、尺度、姿态或时间、灯光、输出配置和未参与试验的参数相同。此后再看预先指定的问题及回归项，不能把变化本身当作改进。

## 四、回到现有工作台后的检查顺序

以下均为待实施方案，本轮未改任何面板或生产文件。

先回读 R019 页面及全部直接依赖，记录实际加载版本、源数据身份与缺失项。既有接续记录称依赖恢复未完成，本轮没有复查这些依赖，状态继续为 unverified；V016 不提升为最新基线。

随后在原面板的现有能力内固定一个对象和比较条件，检查底色、粗糙度、法线、UV/坐标与最终组合。必要新增诊断能力时，沿现有面板做增量改动；具体布局需先看实际面板，不能凭记忆设计替代版本。

第一项修改优先选择有正确参照、范围有限的材质或 UV 显示问题。对比使用同一源对象，保持几何、源 UV、节点、动画和另一个子项目不变。历史锁定参数保持保护，测试中的自由参数与历史事实分开。

恢复与验收分开：运行错误检查、视觉比较、用户接受分别记录。结果仍以可交互三维工作台交付，不用学习笔记或图片代替生产结果。

## 五、状态

本轮已做：R1 回读；四份小妈/导师资料全文阅读；七份 Adobe 页面相关正文或章节及 Three.js 色彩管理正文补读；三项 Blender 官方检索片段补读；八题书面自查；面板检查顺序整理。

未做：Blender 上述章节全文读取；Blender/Designer 实操；烘焙或导出；数值实验；浏览器检查；生产网页打开/更新/部署；R019 依赖恢复；跨对象验证；小妈复核和用户视觉验收。

软件实际安装版本 unknown。software_execution=not_run；production_files_changed=false；workbench_opened=false；review_by_xiaoma=not_run。状态只描述本轮，不重置既有有效批准。

学习后回到现有生产任务，不把读完所有软件手册作为开工前置；尚有不足的主题在实际任务需要时继续补读。

## 官方来源定位

本节属于对既有官方来源的外部查读，与上面的小妈原文分开记录。检索日期为 2026-09-05。不采用中文网站信源。

[B1] Blender Bevel Modifier，官方检索片段；正文访问 402：
https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/bevel.html

[B2] Blender Weighted Normal Modifier，官方检索片段；正文访问 402：
https://docs.blender.org/manual/en/latest/modeling/modifiers/normals/weighted_normal.html

[B3] Blender Editing UVs，官方检索片段；正文访问 402：
https://docs.blender.org/manual/en/latest/modeling/meshes/uv/editing.html

[A1] Adobe Metal Edge Wear，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/mesh-based-generators/mask-generators/metal-edge-wear

[A2] Adobe Tri Planar，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/mesh-based-generators/utilities-mesh-based-generators/tri-planar

[A3] Adobe Height to Normal World Units，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/filters/normal-map/height-to-normal-world-units

[A4] Adobe Project settings，相关 Project/3D View/Bakers/General 章节已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/workspace/preferences/project-settings

[A5] Adobe Normal Vector Rotation，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/filters/normal-map/normal-vector-rotation

[A6] Adobe Exposing a parameter，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/manage-parameters/exposing-a-parameter

[A7] Adobe OpenPBR，读取上述指定章节，未宣称整页所有章节及全部图示已审阅：
https://experienceleague.adobe.com/en/docs/substance-3d/general-knowledge/openpbr/openpbr-overview

[T1] Three.js Color Management，正文已读：
https://threejs.org/manual/en/color-management.html
