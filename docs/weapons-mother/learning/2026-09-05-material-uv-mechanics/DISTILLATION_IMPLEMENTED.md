# 蒸馏方法已进入源码：首个有限实现

日期：2026-09-05。读取起点：feature/b24-weapons-mother-v1，25b55b2f92d27cde57e0998938bd336b3fd2cb31。

## 这次蒸馏了什么

文件格式转换只解决数据载体问题。可持续使用的蒸馏还要保留来源和适用边界，分离可复用规则与对象参数，形成明确接口，用反例检验，再接回原生产任务。

本轮只实现其中一个有限闭环：材质参数与源身份绑定，保留两条子项目的独立状态，让原 R019 面板拥有可检查的接入接口。没有声称已经掌握完整机械造型、所有材料或软件，也没有把读取访问器当成理解机械结构。

## 来源、提炼与代码对应

R019 的索引 HTML 提供五个参数标识 wear、oil、oxidation、roughness、detail，以及原默认值和十项直接依赖。索引对应 file_0000000040c4823095d04ab4183a4dee。只能确认已读的页面声明，完整原文件字节与运行时仍未取得。未猜测其四套材质预设的配方。

Adobe Exposing a parameter 的 Understanding、Input Parameters、Limitations 章节支持固定标识、明确默认值、范围、分组及发布限制。本线将参数接口思想实现为 material-session.mjs 的 PARAMS、createSession、snapshot、restore；保存与恢复策略属于本轮自行实现，不是 Adobe 提供的代码。

Three.js Color Management 的 Input、Working、Output 和 Common mistakes 章节支持区分颜色与非颜色数据。本线实现 textureEncoding、decodeTextureSample 和显式法线约定辅助函数；未接入实际 R019 着色器，未改变渲染器配置。

小妈既有 START_HERE、MOTHER_STARTUP、REVIEW_DISPOSITION 的固定条件、来源追踪、有限修正和分项验收要求，落实为源身份检查、参数隔离、依赖门和测试报告。先前笔记保留原文定位；本轮不宣称小妈已复核本实现。

附件参考项目只作适用性分类，其重建路线未安装、未复制、未引入生产。Blender 官方属性文档本轮正文访问仍失败，不能记为全文已读。

## 实际新增源码

src/mechanical-product-forge/knowledge-distillation/material-session.mjs：仅管理五项无量纲参数，拒绝非法值，分别保存 aircraft 与 b24 状态。快照绑定几何、UV 和节点关系的身份摘要；不接受另一来源的快照。可按项目设为只读。颜色数据转换与数值数据解释分开。

src/mechanical-product-forge/knowledge-distillation/r019-panel-bridge.mjs：沿用原五个输入控件标识，读取宿主运行时当前值，避免静态 HTML 默认值覆盖已有状态。依赖缺失、哈希未核实、宿主不明确移交输入事件时停用接入。导入记录同步两个项目；恢复失败时停用控件。没有新建生产页面，没有模型加载器或替代几何。

tools/audit-distillation-source.py：只读检查已锁定的历史测试资产，生成访问器、UV、节点、材质与动画摘要。要求显式源文件哈希。只支持当前明确测试的内嵌未压缩密集标量/向量访问器；稀疏、矩阵及必需扩展布局直接拒绝。该工具不导出几何，不改变实体武器制造能力，不将历史测试样本提升为生产基线。

## 已执行验证

42 项 Node 单元测试通过。9 项 Python 数据读取测试通过。两个浏览器测试尺寸为 1440×900 和 390×844，共 24 项合成 DOM/模拟运行时交互检查通过。

历史 V016 测试样本为 8,585,888 字节、150 个访问器，其中 40 个被 UV 语义引用，40 个节点与 33 个网格。源 SHA-256 为 81ec8016743c6e9cb86b6221c1d665be1d061b42ae73e241c7ddc572ea3af6c4，读取前后保持不变。本结果不能证明 R019 一致性。

测试暴露并修复了本轮新模块的一项错误：导入记录时只把当前项目状态同步给模拟运行时。现在两个项目都同步，失败时尝试恢复旧状态。这里没有把新模块缺陷归因于旧生产代码。

首次本地 HTTP 浏览器导航被环境阻止。最终交互检查使用本地注入的合成 DOM 和内存源码，不访问生产网页、不渲染产品。浏览器测试结果不能算作三维视觉验收。汇总见 reports/weapons-mother/distillation-20260905/SUMMARY.json；完整逐项日志与历史样本摘要在本轮源码验证包中。

复跑：在仓库根目录运行 node --test tests/weapons-mother/distillation.test.mjs；python tests/weapons-mother/test_source_audit.py；python tests/weapons-mother/browser_bridge_test.py。前两项无第三方依赖；浏览器项需要 Python Playwright 与 Chromium，可用 CHROMIUM_EXECUTABLE 指定浏览器位置。

## 接回原工作台的接口与阻塞

宿主需要实现 ownsMaterialInputs=true、readSourceLock()、readMaterialState(project)、applyMaterialState(request)。最后一项须同步确认成功，并只修改本次允许的材质状态。宿主原有输入监听需先明确移交，防止重复生效。预期哈希须来自独立核验的来源，不能用同一次读取结果自行宣布获批。依赖门只检查给定记录，不负责下载缺失文件或判断历史真实性。

挂载后由原工作台的项目切换调用 select(project)，保存、恢复分别调用 exportState() 与 importState(text)，重置调用 reset()。导入先校验完整快照，再同步两个项目；这属于校验加补偿恢复，没有声称跨任意渲染器的原子事务。外部并发改材质、异步运行时与着色器实现尚不在已验证范围内。

当前 pinned HEAD 的 data/weapons-mother/anm2-exact-v019 与 src/mechanical-product-forge 目录读取均返回 404。新增接入模块没有补造其中缺失的原始运行时和精确数据。R019 十项依赖仍待恢复，原面板尚未实际挂载本模块，生产入口未改动，未部署新网页。V016 继续仅作历史测试样本。

本轮状态：方法已实现并完成有限测试；真实 R019 集成 blocked_source_missing；新材质视觉效果、Blender/Designer 实操、小妈复核、用户视觉验收均未完成。后续直接处理真实 R019 接入，不用继续增加学习文档替代生产。

## 本轮官方原文

Adobe 参数暴露：https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/manage-parameters/exposing-a-parameter

Three.js 色彩管理：https://threejs.org/manual/en/color-management.html

Blender 属性参考，本轮访问失败：https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/attributes_reference.html
