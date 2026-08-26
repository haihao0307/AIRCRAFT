# B-24 工程图与 CAD 外部来源登记

## 存储规则

大型 PDF、TIFF、缩微胶片复制件和商业取得的图纸包放在外部资产桥中。GitHub 分支保存来源登记、文件清单、哈希、页级预览、可追溯矢量和 QA 报告。

任何未实际取得的文件均标记为 `pending_intake`。目录条目、搜索摘要和销售页面不能替代原文件检查。不得虚构字节数、SHA-256、页数、图号或版本。

建议本地暂存路径：

```text
source-input/engineering/b24/
```

建议分区：

```text
00_manifests/
01_consolidated_factory_drawings/
02_usaaf_manuals/
03_structural_repair/
04_parts_catalogs/
05_archives_and_microfilm/
06_restoration_measurements/
07_secondary_three_views/
08_visual_models/
derived/page-previews/
derived/calibration/
derived/vector-traces/
derived/cad/
```

## 第一批来源

### San Diego Air & Space Museum / Internet Archive

入口：

`https://archive.org/details/b-24-production-and-construction-analysis`

公开目录中已找到：

- `D-1840, RD-6894 B-24 Model 32 General Arrangement.pdf`
- `B-24 3-views, wing and undercarriage details.pdf`
- `B-24 Fuselage Cutaway diagram.pdf`
- `B-24 Production and Construction Analysis.pdf`

当前状态：目录元数据已核验，原始 PDF 尚未进入本项目资产桥，页面内容、标题栏、版本、尺寸和扫描质量等待逐页检查。

### Warbirds Restoration

入口：

`https://warbirdsrestoration.com/`

该机构说明其数字资料库加入过约 25,000 张 B-24M Liberator 图纸，通常以 TIFF 数字下载形式交付。

当前状态：需要联系确认现有可购目录、许可范围、交付结构和是否含原始图号索引。整批资料先归入 B-24M 来源层。

### AirCorps Library

入口：

`https://aircorpslibrary.com/library-documents/b-24`

已发现 `AN 01-5E-2`，1945 年 3 月 30 日修订，页面记录为 1,218 页。

当前状态：需要取得对应版本并核对扫描页数、封面、变更页和适用机型。

### B-24 Liberator Restoration Australia

装配与结构手册入口：

`https://www.b24australia.org.au/library/air-craft-manuals-b-24/field-maintenance-manuals`

零件手册入口：

`https://www.b24australia.org.au/library/air-craft-manuals-b-24/parts-manuals`

已确认目录包含：

- `T.O. 01-5E-2`
- `AN 01-5E-3`
- `AN 01-5E-4`
- `T.O. 01-5E-4A`
- `ZE-32-047`

当前状态：手册目录和版本信息已记录，原始扫描等待合法取得与哈希入库。

### Smithsonian National Air and Space Museum

美国空军工程图微缩胶片：

`https://airandspace.si.edu/collection-archive/united-states-air-force-aircraft-engineering-drawings-microfilm/sova-nasm-xxxx-0521`

技术与比例图纸：

`https://airandspace.si.edu/archives/archival-collections/technical-scale-drawings`

当前状态：建立定向检索请求，优先查询 Consolidated B-24、Model 32、图号 D-1840、RD-6894、机身放样、机翼结构和 B-24J-CO 适用图。

### Museum of Flight

入口：

`https://archives.museumofflight.org/repositories/2/resources/698`

该馆的蓝图与技术图纸集合包含总体图、三视图、剖视图、装配图和部件详图，并列出 Consolidated Aircraft Corporation 相关材料。

当前状态：需要馆员检索与复制许可确认。

### Wikimedia Commons B-24J 三视图

入口：

`https://commons.wikimedia.org/wiki/File:Consolidated_B-24J_Liberator_3-view_line_drawing.png`

来源标注为 `AN 01-5E-3` 第 ix 页，美国军方作品。适合建立第一版轮廓检查和页面识别样例。

当前状态：可作为公共领域预览来源。正式尺寸仍需回到完整手册与原厂图。

### Rhino Red Prints B-24J 矢量包

入口：

`https://rhinoredprints.com/product/consolidated-b-24j-liberator/`

提供 DWG、DXF、CDR 和多视图。销售页同时提示可能存在误差。

当前状态：D 级辅助资料。不得作为蒙皮、结构或零件尺寸母版。

### img2threejs

入口：

`https://github.com/img2threejs/img2threejs`

当前状态：工具候选。可用于研究图像到 Three.js 可视化的辅助流程，输出统一归入 E 级派生预览。该工具不提供原厂图号、尺寸、公差、材料和变型适用性。

## 建议的首批外部文件名

文件取得后尽量保留原名，并在清单中增加规范化别名：

```text
D-1840_RD-6894_B-24_Model_32_General_Arrangement.pdf
B-24_3-views_wing_and_undercarriage_details.pdf
B-24_Fuselage_Cutaway_diagram.pdf
B-24_Production_and_Construction_Analysis.pdf
AN_01-5E-2_1945-03-30.pdf
AN_01-5E-3_1943-05.pdf
AN_01-5E-4_1944-06.pdf
ZE-32-047_1944-04.pdf
WAR_BIRDS_B24M_DRAWINGS_MANIFEST.csv
```

规范化别名不得覆盖原始文件名。

## 入库清单字段

每个文件必须记录：

```text
source_id
external_filename
normalized_alias
bytes
sha256
downloaded_at
source_url
archive_identifier
document_number
drawing_number
revision
date
pages_or_sheets
aircraft_variants
production_plant
block_range
format
rights_status
access_status
scan_quality
parent_source
notes
```

## 入库验证

1. 验证文件名、字节数和 SHA-256。
2. 检查压缩包和 PDF 完整性。
3. 逐页渲染，记录缺页、重复页和不可读页。
4. 人工核对封面、标题栏、变更页和适用性。
5. 将每张工程图拆成独立 sheet 记录。
6. 任何裁切、旋转、去噪和拼接都保留父哈希。
7. 未完成权利审查的文件不得公开再分发。
8. 未完成变型核对的图纸不得驱动 B-24J 正式几何。
