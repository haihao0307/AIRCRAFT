# Object DNA 独立试读回执 · 2026-09-09

已实际读取二进制，不以网页或说明文档代替试读。读取器为同目录 `object-dna-read.py`（object-dna-read/0.1，Python 3.12 标准库），按 FORMAT.md 独立实现文件头、块 CRC32、受限 CBOR、RMAP 路径/唯一性/长度/SHA256 与整容器逐字节回写核验；没有 import 原 codec，没有执行内嵌代码，也没有写出原资产。

- 样本：`data/B24_Generic_Mother_01.tlo`，19,095,163 字节。
- SHA256：`fb76422e2999536a935132b2c28c382e69a86bef9969cf2ca21e9650da8e01a5`。
- 配置：WSD0/0.1，tlo-mother01-pilot/0.1，cbor-m01-subset/1。
- 112 块全部 CRC32 通过；102 个文件全部长度和 SHA256 通过；BLOB 与 RMAP 一一对应；整容器回写 byte-exact；无未知可选块。
- 原 `tools/verify.py` 也已运行通过，但这里只把自己的读取器计作本任务的一套独立实现。不能把两次运行算成两种语言交叉验证。

## 语义判读

对象持续身份为 `urn:mother:aircraft:b24:generic:01`，版本 01/R16，是 B-24 公版数字模板，不是 B-24 全类别本身或特定机号实机。内容 SHA 标识版本字节，不能替代持续身份。

局部右手架采用米与弧度，Y 向上、Z 向机头；世界位置/世界位姿 unknown，地理 CRS 与世界父架 not-provided。不能填入经纬度 0。2026-09-09 是项目接受和试存记录日，Git 时间是来源版本时间；世界飞行时刻与飞行小时 unknown。服役滑块是 0..1 示意外观，不能解释为时间。

typeOf 是类别，representationPartOf 是数字区域组成，poseReferencedTo 是位姿参考架，managedBy 是 Mother 管理归属；derivedFrom 另表版本来源。这些关系没有互相代替。

制造精度未证实，铝合金牌号 unknown；面板位置 approximate、铆钉间距 illustrative，用户接受外观不能升级为工程标定。80 DAYS 与机组仅 plannedDerivative，implemented=false、identity=unknown，未实例化。

## 完整 K / Object DNA 边界

本样本通过的是“所声明的 102 文件范围完整保全”和“选定基础语义可读”，不是完整飞机 Object DNA 已完成。OBJS 只有模板根加 6 个 digitalRegion；1784 源节点、348 网格不是物理部件数量。其余节点语义、精确数字几何、shader 与原知识文本仍作为原文件保全，没有全部提炼为声明式语义。源数字机体仍是必要过渡来源，不能称为可删除缓存。原包之外的 PDF/GLB/照片不在此完整性范围。

读取器接受当前已声明配置并严格校验本样本；它是独立最小试读实现，不声称通过任意恶意输入或未来配置的通用兼容测试。本回执未重做 3D 渲染验收，也未更改已接受公版。

复现：在 tlo-pilot 目录运行 `python reviews/object-dna-read.py`。中文值另以 ASCII Unicode 转义核查，容器内中文正常；终端编码显示不构成数据损坏。
