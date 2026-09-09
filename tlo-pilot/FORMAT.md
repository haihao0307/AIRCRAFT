# TLO-M01 首次试存配置 0.1

状态：实验配置。TLO指Time/Location/Object共同语义；承载复用小妈WSD0/0.1草案。不是TLO定稿，不声称符合旧`wsd-v0.1.schema.json`。后者要求地球ID和具体世界时间，本公版没有这些事实，不能填零凑齐。

## 文件与公开读取

样本为`data/B24_Generic_Mother_01.tlo`。扩展名仅是试验标识；必须检查magic和配置。根文件16字节、小端序：`WSD0`(4 ASCII)、major uint16=0、minor uint16=1、chunkCount uint32、flags uint32=0。每块12字节头：FourCC(4 printable ASCII)、payloadLength uint32、CRC32 uint32，然后紧跟payload；无填充、尾字节或隐式压缩。CRC32是标准反射多项式0xEDB88320、初值及最终xor为0xffffffff。CRC只检测载荷损坏，不认证来源；全文件SHA256另给。

第0块必须是唯一`PROF`：UTF-8 JSON，仅用于自举，声明`profile=tlo-mother01-pilot/0.1`、`semanticEncoding=cbor-m01-subset/1`及必需块。版本/flags不支持、必需块缺失、重复、未知必需配置，都必须拒绝依赖该配置的判断。

以下每种必需块恰好一块；使用CBOR基本类型的受限编码，不是JSON文本套二进制后缀。

|FourCC|含义|
|---|---|
|VOCB|本配置词汇含义、必需词汇与数值政策|
|FRAM|局部米制参考架；世界位置未知；展示/测量约定|
|TIME|项目记录日期、版本时间与未知实物有效时间分开|
|DNA_|继承的表示、源节点/网格数量、材料未知、五种示意状态及规则依赖|
|OBJS|公版模板的持续身份及选取的6个语义区域；不是全部物理部件清单|
|RELS|类别、区域组成、位姿参考、Mother归属和版本派生分别命名|
|EVNT|有序项目接受/冻结事件；不编造历史飞机事件|
|PROV|输入包/代码/渲染版本、证据与提取覆盖、未证实主张|
|RMAP|原文件目录、长度、SHA256、BLOB块序号、资源角色、任务范围内的必需性|

其后每个`BLOB`直接包含一份原文件的字节。没有内嵌ZIP，也不重新序列化原文件。`RMAP.files[i].chunkOrdinal`是从PROF=0开始的全文件块序号；序号必须指向BLOB。每个BLOB恰好一个目录项，路径/资源ID/序号均唯一。路径为相对POSIX路径，不允许绝对路径、冒号、反斜杠、空段、`.`或`..`。恢复必须先验证全部CRC和文件SHA，不覆盖已有目标目录，不执行源文件。

未知可选FourCC允许读取其他内容，但必须报告未理解；完整回写保留原载荷和顺序。不得把未知块JSON解码。当前工具仅支持文件头0/1/0，因此不宣称任意未来头都能回写。

## CBOR受限配置

参照[RFC8949](https://www.rfc-editor.org/rfc/rfc8949)基本数据模型。所有长度确定，不使用indefinite-length、tags、undefined或非有限浮点。支持：uint64；负整数`-1-n`且n为uint64；字节串；严格UTF-8文本；有序数组；键为唯一文本的map；false、true、null；IEEE754 binary64。CBOR自身多字节值为大端，WSD头为小端，不可混淆。

整数和长度用最短可用编码，浮点固定binary64；map按已编码键的长度、再按字节排序。该配置的确定性不等于声称实现所有RFC规范化编码选项。解码深度上限64，数组/map数量上限100000；超过限制报告不支持，不能截断后继续。JavaScript安全整数范围之外用BigInt，导出JSON时表示为`{"$integer":"精确十进制字符串"}`，不转为失真的Number。

## 身份、关系、未知与范围

`objectId`是持续逻辑身份；内容SHA仅标识该内容版本。公版`urn:mother:aircraft:b24:generic:01`是数字模板，既不是所有B-24类别本身，也不是已知机号的实机。未来80 DAYS和机组只是plannedDerivative，不能由涂装名推断机号或机组。

`typeOf`类别、`representationPartOf`数字区域组成、`poseReferencedTo`位姿参考、`managedBy`Mother管理归属互不替代。源节点ID只是原数据索引，1784节点/348网格不等于物理部件数。其余源节点与材料细节仍按原文件保全，不声称都已抽取成声明式语义。

值状态分别为`unknown`、`not-provided`、`not-applicable`、`conflict`、`not-implemented`；数值0、false只表示明确已知的对应数值/布尔值。未定位到世界的局部对象没有默认经纬度0、地球原点或虚构时刻。项目日期不能代替实物制造或飞行时间。服役use/care/exposure是0..1外观强度，不是小时。

RMAP每项`requiredFor`说明它对完整文件恢复或既有渲染是否必要；基本语义依赖PROF和9个核心块。原数值机体仍是不可替代的过渡来源，不是一律可删的缓存。代码以数据封装，阅读器不eval/import容器内的代码。只有在另行恢复完整包并运行既有显式入口时才做3D运行验收。

## 试读验收

请记录文件SHA、读取器/配置版本、102文件的核验结果，并回答：对象身份；单位/世界位置；项目日期与世界时间区别；四类关系；制造精度是否已证实；80 DAYS是否已实例化。只打开网页或读本说明，不算读取二进制。两人运行同一工具是两份使用回执；Python与JS独立解码才是两套实现的交叉证据。

参考：小妈`TLO_公版母体01试存指导_2026-09-09.md`、WSD0草案及原`wsd_binary.mjs`。读取器必须可找到本配置和内嵌词汇；本配置未测跨任意AI平台的通用兼容性。
