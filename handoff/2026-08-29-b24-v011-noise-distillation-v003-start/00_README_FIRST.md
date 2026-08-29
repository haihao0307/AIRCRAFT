# AIRCRAFT B24 V011 噪波蒸馏生产线起步

日期：2026-08-29

知识版本：Noise Knowledge V003 Draft

来源仓库：`haihao0307/AIRCRAFT`

来源分支：`research/b24-engineering-drawings-cad-v1`

来源 PR：`#14`，继续保持 open、Draft、未合并

来源实验父提交：`1010e49817a62985b94ab8a9e1605ba89b07a759`

当前集成基线：`6587e02d9b91d2e5ed82ceb6c84ca14573488ff8`

当前工作分支：`feature/b24-v011-noise-distillation-v003`

## 已完成的读取与审计

1. 已复核 V010 交接说明、状态、实现说明、Ridged 补丁、浏览器 QA、交付收据、像素差异、视觉板和 Noise Knowledge V002。
2. V010 继续继承 V009 R1 的载荷、几何与动画。记录统计为 1,784 个组件、348 个 mesh、307,273 个顶点、325,358 个三角形和 2,518 条动画轨道。
3. V010 Ridged 层继续由零件语义、Ridged 阈值、宽域损伤场、几何过渡代理和通用服役状态共同门控。
4. 保护组 121 个绘制件的最大 Ridged 权重保持 0。Height 与 Normal 关闭，全局 Metalness 增益关闭。
5. 两条 V009 远端浏览器工作流均为 9 项通过、2 项失败，阻断为 `semantic-material-groups` 缺少 `glazing`，以及 `physical-glazing=0`。
6. V009 分类器只读取名称，没有读取 `transparent`、`opacity`、`transmission`、`alphaMap`、`alphaTest` 与 `depthWrite`。本分支先加入材料库存提取器和分类修复提案，均不得在库存证据形成前宣告通过。

## V011 最短顺序

1. 导出 37 个源材质的准确库存。
2. 依据名称、物理透明属性和上下文修复玻璃分类，同时排除 decal、螺旋桨 blur、轮胎和机械件。
3. 重新运行两条 V009 浏览器 QA，补齐 `05_material_glass.png`。
4. 固定回放 V010 Off、Service、Diagnostic，确认像素差异与保护组没有回退。
5. 进行 Simplex 官方 TSL 编译 A/B，只替换宏观基础场。
6. 将局部损伤拆成新鲜露铝、氧化露铝、漆层崩边和积垢破损四类状态。
7. Worley 只进入局部腐蚀候选，Curl 只进入流向污迹候选，Domain Warping 只扰动受限破损边界。

## 权威边界

面板线、铆钉、检修盖板和结构接缝继续由拓扑或权威图控制。噪波不能替代结构信息。

外部 `img2threejs` 仅提供流程方法参考，默认关闭，不取得 B24 几何、运行时、命名或批准权。

所有视觉、Ridged、表面系统、历史、工程、整机与生产冻结批准继续保持 `false`。
