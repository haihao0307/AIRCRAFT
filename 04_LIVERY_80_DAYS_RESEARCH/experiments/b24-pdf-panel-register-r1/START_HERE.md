# B24 PDF 分件与表面对应 R1

日期：2026-09-06。用户确认对象就是既有B24，沿V018蒸馏模型继续，先做有原始资料依据的逐片记录并保留复用能力。当前阶段没有另造飞机、没有贴入旧生成图，也没有改变原几何。

## 实际取得并查读的原件

本轮通过本分支工作流 B24 panel evidence intake R1，run 34020497143 / artifact 9985329527 取得三个PDF。下载成功及文件哈希另见该归档INTAKE.json；下载不代表内容已验收。

实际逐页查看了6页 B-24 Familiarization Training diagrams.pdf。文件2063066字节，SHA256 3388111edf0daaea0818371c6cef56f11d46ee722685021fc8c36c3c24d0c97d。第一页标题为Consolidated Vultee Aircraft Corporation / San Diego Division / B-24 Familiarization Training。

原文地址：https://archive.org/download/b-24-production-and-construction-analysis/B-24%20Familiarization%20Training%20diagrams.pdf

第2页Figure 3A / F32-3139为飞机分解图和装配图号表；第4页VE-485为左机翼检修口等类别；第5页VE-484为机身站位。第6页区分部分B24J与G/H尺寸。没有据此证明整套图适用于J-25-CO的全部制造细节。另两份机身剖示和生产分析只完成取得，不声明已完成全文复核。

## 当前三项关联

| 原文装配 | 原图索引与图号 | V018原节点/网格 | 原三角形 |
| --- | --- | --- | --- |
| AILERON ASSEMBLY，左舷候选 | 11 / 32W573 | 575 / 93 | 138 |
| AILERON ASSEMBLY，右舷候选 | 11 / 32W573 | 829 / 148 | 154 |
| ELEVATOR ASSEMBLY，主表面候选 | 3 / 32T503 | 729 / 127 | 388 |

原页支持装配名称和图号；现有模型按其原始层级中的aileron/elevator名称、侧别和位置建立待审关联。左右分别绑定已有源部件，没有镜像生成。升降舵选区不自动包括配平片和全部内部件。

这是 assembly_surface_correspondence / review_candidate。制造蒙皮板片完成数0；新增制造板缝0。没有依据的厚度、缝宽、铆钉、材料类别和细部边界留空。没有将分解示意图按截图尺寸硬铺到曲面，也没有完成几何轮廓配准。后续需取得32W573、32T503相关装配及蒙皮详图，并检查目标批次适用性。

## 实际本地实现

B24_PDF_Panel_Register_R1.html，5026882字节，SHA256 931b38feba44a9b84ac5cc41f0669f0f0471f25d3fdcf4fd483d010ed81a18ca。

包含完整原机、四视图、三个表面分别高亮/隔离、原PDF页预览、原三角形重心锚点、工作意见、单片及整套JSON导出与文件读回。点选锚点时自动单片显示，不把其他部件遮挡误当成选区。原图像素对应尚未验证，字段保持null。

原数据包含348个源网格及325358个三角形。原默认隐藏的慢转/模糊替代桨与旧覆盖面保持；四组静止三叶螺旋桨及其他参考可见。单片隔离仅控制显示，不删除数据。没有历史标记改动或新上色，噪波检查默认关闭。

完整数值载荷SHA256：13fceef4b1ed3fcd082b220e0e396bd8abb50e529cafd13f12a50250a89c0e0a。
蒙皮前缀SHA256：84d0eaf16e790989145605c3cd70de1fea64e1f62a58acfafb5455c0876e2e44。

data/panel-register.json保存来源SHA、页码、图号、部件/网格、原矩阵、属性SHA与原三角形范围。通用接口在source/panel-core.js，不依赖渲染器。读回拒绝错模型、错矩阵、错属性、越界三角形和无效重心坐标，禁止通过导入更改历史批准或添加猜测板缝。

## 实际验证

15组接口/负例测试通过；40项桌面1440x1000及移动视口390x844浏览器检查通过，浏览器环境Chromium / Playwright / Xvfb / SwiftShader。实际测试了文件导出读回、鼠标点选、错误模型拒绝、全部原始载荷哈希保持、参考部件恢复和四视图。实体手机、制造精度、历史适用性及用户视觉接受未完成。

## 交付与复用边界

会话交付了单文件HTML、源码与检查包，以及12430字节的独立表面模块包。源码包6612594字节，SHA256 b4b327d3daf0ca63c38a5d0ff8ad550260715e205f308f4d829935b9abfc27d5；它省略重复的已构建HTML，可运行source/build.py在包内重建，不覆盖旧文件。

独立模块包SHA256：5552d1dd0e56f93c757abb27d501e96eab707c1620fecace1c4dfc71fada4cc2。模块可以在同一V018数据上复用；其他模型需要新的验证适配。不能宣称所有B24型号直接通用。

本次GitHub提交保存取件流程与这份接续记录。上述HTML和完整源码包尚未上传本分支或发布公网；不要把本记录冒称全量远端备份或公网部署。PR13保持Draft、未合并，visualAcceptance=false，productionReady=false。
