# Weapons Mother 学习记录 R1

日期：2026-09-05。状态：source_grounded_learning_draft。范围：Blender、Substance Designer、材质、UV、武器历史及通用机械基础。

## 身份与边界

本轮写入前读取 AIRCRAFT 专用分支 feature/b24-weapons-mother-v1，HEAD 为 44e0bb7c4a005228dd511e5387664d2c56c26758。该身份不表示 V016 可以替代 R019。既有接续记录中的 R019 完整依赖仍未恢复；本轮只新增学习文档，不改变几何、UV、节点、动画或运行入口，不更新生产版本和人工验收状态。Aircraft AN/M2 Core 与 B24 炮位适配保持独立。

武器知识沿历史研究和数字展示展开，积累型号、年代、平台、可观察结构与材料证据。通用机械教学选用民用案例。本记录不提供实体武器制造、改装或性能优化方案。

## 已读的小妈资料

来源：haihao0307/guilin-dem-pipeline，分支 handoff/xiaoma-mentor-v1.1-20260905。

1. docs/mother_coordination/mentor-v1.1/README.md，blob a2298b4bf953b5cd56103303609f614c58f5b26a。
2. docs/mother_coordination/learning-r1-20260905/START_HERE.md，blob 0433081169512f69040e82b9901c99bdaa2f1172。
3. 同目录 ASSIGNMENTS.md，blob 5bef409dee41bf80457e533ac738977b84a51309。
4. 同目录 SKILL_INDEX.md，blob 39bc208bc7525cbf1b1c15092eafcab90304aacc。
5. 同目录 skills/geometry-context/SKILL.md，blob 8057fd5584fa1de2203351085cf894b14fb43db0。

提炼：坐标系、求值时刻和属性域必须写清；资料读取、实现、实测、跨对象复用及用户接受独立记录；协调分支只作资料来源。未读完全部原始导师材料，未完成小妈理解复核，不宣称完整 R1-A 已通过。

## 五个学习方向

### A. Blender 造型与几何检查

原词：Bevel、Weighted Normal、Fields、Attributes、Instances。Bevel 与 Weighted Normal 的官方索引分别说明边缘倒角和自定义法线处理，完整正文仍待补读。

本线用法：轮廓与拓扑、着色法线、对象变换分开检查，学习修改器不授权改写锁定源网格。输入为源身份、节点路径、局部和最终变换；输出为几何/法线/坐标问题分类。

拟定试验：在独立民用展示样件上分开改变法线和倒角，检查轮廓与网格统计，再检查两个实例的局部/世界变换。反例：高光变顺或相机移动后看似对齐，不能证明装配已修复。试验未执行。

### B. UV 与显示管线

原词：Seams、Minimize Stretch、Color Management。Blender 官方索引说明接缝和 UV 展开、角度失真控制；Three.js 文档区分颜色与非颜色数据。常见颜色贴图采用 sRGB，法线、粗糙度等数据通常不作颜色转换。

本线用法：保留源 UV，分别检查接缝、拉伸、取样尺度、切线/法线约定和色彩输出。UV 为无量纲参数坐标，不能当成物理尺寸。输入为源 UV 身份、通道用途、编码与坐标约定；输出为通道与 UV 诊断表。

拟定试验：固定几何、相机、光照和输出，改变一项编码设置后比较。反例：编码错误后提高亮度，不足以修复通道解释。本轮未检查 R019 实际编码，不断言它具有此错误。

### C. Substance Designer 材质

已读 Sub-graphs、Exposed Parameters、Metal Edge Wear、Tri Planar 和 OpenPBR 相关章节。子图封装网络，暴露参数定义外部接口；边缘磨损节点依据烘焙数据生成遮罩；Designer 的 Tri Planar 使用位置及世界空间法线数据完成二维图中的投影。OpenPBR 建议依据真实参考组织表面层并换光验证。

本线用法：区分基材、表面处理或涂层、污染和使用痕迹，相关通道共享有意义的遮罩；少量参数须有明确语义。先使用民用金属外壳样件学习，具体历史表面的材料、颜色和磨损另行取证。

输入：表面依据、语义分区、源 UV/坐标、必要烘焙数据、种子与版本。输出：材质图说明、遮罩关系与参数接口。拟定验证：固定曝光，分别查看底色、粗糙度、法线，再做组合、换光和新样件比较。

反例：自动把所有边缘刷亮，不证明历史磨损真实；同名参数不保证跨渲染器一致；不把 SBSAR 直接当成本项目已有网页运行能力。尚未生成 .sbs/.sbsar，未运行 Designer，未制作新浏览器材质。

### D. 武器历史与证据

美国空军博物馆介绍区分航空武器的固定式与活动式配置。Smithsonian 检索到的 AN/M2 记录标注 Boeing B-17G，索引已定位，图像未逐张核验。

本线用法：为型号、年代、平台、安装形式、外观部件与表面依据建卡。B-17 的参考不自动证明 B24 安装细节。输入为馆藏编号及来源适用范围，输出为证据卡与未知清单。拟定比较同型号不同平台资料，拒绝由修复展品外观推定全部服役状态。未完成新的历史材料判定。

### E. 通用机械

已读 MIT 2.007 Design and Manufacturing I 课程大纲，内容覆盖紧固件、接头、弹簧、轴承、齿轮、离合器、联轴器、带、链、轴、机械图样与实验能力；未完成该课程。

长期学习依次积累图样与单位、零部件功能、连接和运动关系、材料与表面、失效现象、参数化表达与验证。先在明确民用对象上解释正确，再用未参与调参的新对象检验。能力以识别问题、解释依据、预测影响和验证结果判断，不能由课程目录推定全面掌握。

## 状态与下一步

已完成：共享资料阅读、英文来源查读、五方向方法与反例提炼。

未完成：部分 Blender 正文补读、完整 PBR Guide、软件实操、导出往返、浏览器检查、跨对象实测、小妈理解复核和用户验收。实际安装版本 unknown；software_execution=not_run；production_adoption=not_approved；成本 not_measured。

第一优先级为材质分层、源 UV 保护及色彩空间，试验先限于独立民用展示样件。后续在真实接续时更新记录，不声称后台持续学习，不修改模型权重。

## 官方英文来源与读取程度

Blender Bevel，索引摘要已读：
https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/bevel.html

Blender Weighted Normal，索引摘要已读：
https://docs.blender.org/manual/en/latest/modeling/modifiers/normals/weighted_normal.html

Blender UV Editing，Minimize Stretch 索引摘要已读：
https://docs.blender.org/manual/en/latest/modeling/meshes/uv/editing.html

Three.js Color Management，正文已读：
https://threejs.org/manual/en/color-management.html

Adobe Graph Key Concepts，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/substance-compositing-graph-key-concepts

Adobe Exposing a Parameter，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/manage-parameters/exposing-a-parameter

Adobe Metal Edge Wear，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/mesh-based-generators/mask-generators/metal-edge-wear

Adobe Tri Planar，正文已读：
https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/mesh-based-generators/utilities-mesh-based-generators/tri-planar

Adobe OpenPBR Overview，相关表面分层及 Best Practices 章节已读：
https://experienceleague.adobe.com/en/docs/substance-3d/general-knowledge/openpbr/openpbr-overview

美国空军国家博物馆相关馆藏介绍，正文已读：
https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/4232201/elegant-simplicity-the-weapon-designs-of-john-moses-browning/

Smithsonian AN/M2 (Boeing B-17G)，索引已定位，全文及图像待核验：
https://airandspace.si.edu/collection-objects/machine-gun-50-caliber-browning-anm2/nasm_A19680511000

MIT 2.007，大纲已读：
https://ocw.mit.edu/courses/2-007-design-and-manufacturing-i-spring-2009/pages/syllabus/
