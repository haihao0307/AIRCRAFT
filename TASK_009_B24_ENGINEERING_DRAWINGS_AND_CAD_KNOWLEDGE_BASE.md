# TASK 009 · B-24 原厂工程图与 CAD 知识库

## 任务目标

在 AIRCRAFT 仓库内建立一套可追溯、可版本化、可逐步转译为 CAD 的 B-24 工程资料体系。该体系服务于三类长期工作：

1. 校核 B-24 外形、结构、蒙皮分区和零件位置。
2. 为历史涂装提供稳定的机身站位、窗框、检修口、铆钉线和面板边界。
3. 为后续可拆分零件、机构和内部结构生产提供经审批的几何母版。

当前阶段交付研究文档、来源登记、文档分类、变型基线和 CAD 重建规范。当前阶段不修改飞机几何，不替换权威 GLB，不生成可制造零件，也不宣告任何公开网络模型具有工程真值资格。

## 分支

`research/b24-engineering-drawings-cad-v1`

## 当前飞机基线

优先建立 Consolidated San Diego `CO` 工厂的 B-24J 系列基线，原因如下：

- 当前生产对象 `B-24J-45-CO 42-73436 UBANGI BAG III` 属于 B-24J-CO。
- 已入库的 `B-24J-25-CO 42-73257 “80 DAYS”` 也属于 B-24J-CO。
- B-24M 大批量原厂图可作为重要来源，但所有 M 型专属差异必须单独标注，未经验证不得套用到 J 型。

权威运行模型仍由 `docs/SOURCE_LOCK.md` 控制。工程图知识库为校核与未来重建提供证据，不自动取代现有模型。

## 核心术语

- `Three-view drawing`：三视图或正投影图，用于轮廓与比例检查。
- `General Arrangement Drawing`：总体布置图或总体图，常简称 GA，用于主要尺寸、站位和部件关系。
- `Manufacturer Engineering Drawing`：原厂工程图，包含图号、版本、材料、尺寸、公差和适用范围。
- `Production Drawing`：生产图，面向制造与装配。
- `Structural Repair Instructions`：结构修理手册，常含框、桁条、蒙皮、修补和材料规范。
- `Illustrated Parts Catalog`：图解零件目录，常含爆炸图、组号、零件号和适用变型。
- `Lofting / Ordinates`：放样与坐标表，用于恢复外形曲面和关键剖面。
- `Outer Mold Line`：外形理论面，简称 OML。

## 已确认的高价值来源

1. San Diego Air & Space Museum 的 Consolidated/Convair 原厂档案，通过 Internet Archive 公开了 B-24 文档集合。集合目录含 `D-1840 / RD-6894 B-24 Model 32 General Arrangement`、B-24 三视图与机翼及起落架详图、机身剖视图、生产与结构分析等条目。
2. `AN 01-5E-2` 系列装配与维护手册。
3. `AN 01-5E-3` 系列结构修理手册。
4. `AN 01-5E-4` 与 `ZE-32-047` 系列零件目录。
5. Warbirds Restoration 所述约 25,000 张 B-24M 原厂图扫描，通常以 TIFF 交付。
6. Smithsonian National Air and Space Museum 的美国空军工程图微缩胶片和技术图纸馆藏。
7. Museum of Flight 的蓝图与技术图纸馆藏。
8. 公共三视图、商业 DWG/DXF、游戏和可视化网格仅作为低等级对照资料。

## 证据等级

| 等级 | 内容 | 用途 |
|---|---|---|
| A | 可读标题栏、图号、版本和适用范围的原厂工程图 | 可进入几何真值审批 |
| B | 官方军方手册、结构修理手册、零件目录 | 可进入尺寸、结构和适用性审批 |
| C | 博物馆档案、修复机构实测、可核验原件照片 | 用于交叉校核与缺口补充 |
| D | 出版物三视图、商业矢量重绘、航模图 | 用于轮廓比较，不直接驱动零件尺寸 |
| E | 游戏模型、通用 3D 模型、图像生成或图像转 3D 结果 | 用于视觉参考和工具测试 |

## 本任务交付物

- `docs/aircraft-pipeline/B24_ENGINEERING_DRAWINGS_AND_CAD_OVERVIEW.md`
- `docs/aircraft-pipeline/B24_CAD_RECONSTRUCTION_SPEC.md`
- `docs/aircraft-pipeline/references/b24-engineering/README.md`
- `data/b24-engineering/source-register.json`
- `data/b24-engineering/document-taxonomy.json`
- `data/b24-engineering/variant-baseline.json`
- `docs/aircraft-pipeline/README.md` 的知识库入口

## 后续执行顺序

1. 下载允许公开获取的原始 PDF、TIFF 或图像，保留原文件名。
2. 计算字节数和 SHA-256，建立不可变来源清单。
3. 逐页渲染并检查标题栏、图号、版本、适用机型和扫描完整度。
4. 将每张图纸拆成独立 `sheet_id`，建立装配号与零件号关系图。
5. 先恢复总体布置、站位、翼展、机身长度、关键剖面和 OML。
6. 再恢复框、桁条、翼梁、翼肋、舱门、窗框、炮塔、起落架和控制面。
7. 建立从工程母版到涂装 UV、铆钉、板缝、检修盖板和零件锚点的映射。
8. 经过几何 QA、变型 QA、来源 QA 和上游视觉审核后，才允许产生正式 CAD 发布包。

## 验收门槛

1. 所有事实来源均有 `source_id`。
2. 所有外部文件在使用前均记录文件名、字节数、SHA-256、来源页和权利状态。
3. 图纸标题、图号、版本和日期分别存储，禁止只按文件名合并不同版本。
4. B-24D、J、L、M、PB4Y-1 以及不同工厂和生产批次分别标注适用性。
5. 扫描比例只能作为初始线索，最终标定依赖明确尺寸、站位或坐标表。
6. 左右结构仅在图纸明确对称时复用，照片和涂装不得自动镜像。
7. 每个 CAD 实体能够回溯到来源图纸、页码或图框区域。
8. 现有 `b-24_liberator.glb` 在本任务中保持不变。
9. 当前成果不得标记为可制造、适航或结构安全依据。
10. Draft PR 保持未合并，等待上游审查和第一批源文件真实入库。
