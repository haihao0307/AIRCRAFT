# 小妈实际试读回执：TLO-M01 0.1

日期：2026-09-09，北京时间10:31—10:36。结论：**已真实读取二进制，当前样本的文件保全及所列核心语义核对通过。**本回执不是仅审读FORMAT，也不把当前成功扩大为最终TLO标准、全部对象语义提取或跨任意读取器兼容。

## 1. 读取对象与工具

- 样本：`data/B24_Generic_Mother_01.tlo`，19,095,163字节。
- 实测SHA-256：`fb76422e2999536a935132b2c28c382e69a86bef9969cf2ca21e9650da8e01a5`，与请求一致。
- 配置：`tlo-mother01-pilot/0.1`；容器`WSD0`，major/minor/flags=`0/1/0`；语义编码`cbor-m01-subset/1`；词汇`tlo-m01-vocabulary/0.1`。
- 运行环境：Python 3.12.10；先阅读FORMAT.md、tools/verify.py、tools/codec.py，再运行验证。使用`-B`禁止生成字节码缓存，未指定`--extract`或`--output`。
- 实际执行：`python -B -X utf8 G:/AIRCRAFT/b24-mother01-tlo-pilot-20260909/tlo-pilot/tools/verify.py`，退出码0，输出`passed: true`。
- 随后直接从样本读取并审看全部九个核心块；另用Python标准库独立扫描WSD头/分块/CRC、对照原ZIP和内嵌清单。CBOR语义解码仍使用随附codec；这不是第二套独立CBOR实现。

本次所读文件版本以散列固定：

| 文件 | SHA-256 |
|---|---|
| FORMAT.md | `8fb3ce66a6048e836877f5a6927f024dc5b49fbfb5cc0e0879f7b227172dea2b` |
| tools/verify.py | `679f38d700550c3a237f80d71ea908be5d284aeb3f9dea61779c56bd10e4ade9` |
| tools/codec.py | `5ae2c64b2a58e1fcdb82a70668e92f55d23c61cfb57256db8b647c2fc09fa78e` |

## 2. 实际检查结果

| 检查 | 本次结果 |
|---|---|
| 容器结构 | 112块：PROF 1块、九类核心语义各1块、BLOB 102块；文件末尾准确结束 |
| 完整性 | 112个载荷CRC均通过；没有未知可选块；102项路径、资源ID、BLOB序号一一对应 |
| RMAP | 102个BLOB的长度和SHA-256全部匹配记录 |
| 整容器往返 | 随附验证器复用原载荷重新封装，输出与输入逐字节相同 |
| 语义解码/重编码 | 另将九个核心块经`cbor_decode`得到的值送回`cbor_encode`，九块均与原载荷逐字节相同；限于本样本及同一Python实现 |
| 原ZIP对照 | 实际读`../releases/B24_Generic_Mother_01_Full_2026-09-09.zip`；核对ZIP整体SHA，102份文件的路径集合及内容逐字节全部一致，无缺项或额外项 |
| 内嵌MANIFEST | 101条文件记录的长度/SHA全部通过；另1份是MANIFEST.json自身，已通过RMAP及原ZIP直接字节比较 |
| 固定文档依赖 | 实际读取本地FORMAT.md及references/xiaoma-guidance.md，散列分别与PROF.specSHA256及PROV.guidance.sha256一致 |

原ZIP实测SHA-256：`c50241d9587267025dcb8849b195ca4f31a1b653604a69a16928c8cf61002b84`。ZIP条目具有单一根目录`B24_Generic_Mother_01/`，去除此包装目录后与RMAP路径集合相等；压缩包没有重复文件名。

初步与当前试验工作树逐文件对照时，只有工作树MANIFEST.json与样本内版本不同。随后确认样本内MANIFEST与上述指定哈希原ZIP完全一致，因此本回执采用原ZIP作为本次原包保全基线，**不把工作树清单差异判断为TLO损坏**。

没有落盘解包，也没有运行恢复目录中的verify-package.py；上述101项包内清单核验直接针对内存中的原始BLOB执行同等长度/哈希比较。未运行任何内嵌JS、Python或三维入口。

## 3. 从二进制记录独立回答语义问题

| 问题 | 实际读取后的答案及字段依据 |
|---|---|
| 这是什么对象？ | B-24公版母体01，`OBJS.objects[0].kind=genericTemplate`；持续身份`urn:mother:aircraft:b24:generic:01`，版本`01/R16`。它是已接受并冻结的数字公版，不是整个B-24类别，也不是已确定机号的实机。7条对象记录是公版加6个数字区域，不代表只有7个实物部件。 |
| 米制局部坐标就是现实经纬度原点吗？ | 不是。FRAM记录长度m、角度rad、右手架、Y向上、Z向机头、继承模型根原点。worldLocation/worldPose为unknown，worldCRS/worldParentFrame为not-provided。没有地理定位依据；米制也不等于制造尺寸已校准。 |
| 项目日期等于实物有效时间吗？ | 不等于。TIME.recordedDate是2026-09-09项目接受/试存日期，sourceVersionTime是源提交时间；worldTime未知，flightHours未知。五种servicePresets是示意外观，use/care/exposure为0..1强度，不能解释成实际小时。EVNT数组中的两项是项目接受/冻结事件，不是历史飞机事件。 |
| 四类关系是否混淆？ | 本样本没有混淆：typeOf指向类别，representationPartOf把6个数字区域关联到公版，poseReferencedTo指向局部参考架，managedBy指向Skin Mother；derivedFrom另指固定来源提交。这里已表达的是数字区域组成，尚未提取完整实物装配/连接关系。 |
| 制造精度已证实吗？ | 没有。OBJS.limitations包含no engineering calibration；PROV将精确制造线位标为not-established；DNA_说明面板位置近似、钉距示意，合金牌号未知。用户视觉接受不能代替实机制造或测量证据。 |
| 80 DAYS及机组已实例化吗？ | 没有。DNA_.nextPhase.status为plannedDerivative，implemented=false，具体历史身份unknown。公版自身的crew、serialNumber是not-applicable；未出现已实例化80 DAYS或机组的对象记录。 |

PROV还明确区分三类已有提交：source=`636f26ec102680b4154a6f9dca0cf49fc951f51e`，render=`47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a`，archive=`83a182720d78cb9da58457be7491bcc8fdee2a7c`；试存发布提交另在交付回执固定。实际只读本地Git确认source提交存在，其时间为`2026-09-09T10:13:38+08:00`，与TIME记录相符；本轮未进行远端Git或公网发布核验。

## 4. 理解范围和剩余限制

本次能够解释VOCB、FRAM、TIME、DNA_、OBJS、RELS、EVNT、PROV和RMAP中上述记录。PROV.semanticCoverage已将剩余节点语义、细致数值几何、着色器/显示规则及原知识报告文字标为preservedOpaque。它们的文件字节已保全，但本回执没有解析全部几何、评估规则或重建实物；348网格/1784节点作为样本声明读到，未重新统计源几何。

随附`verify.py`的成功有明确边界：它检查RMAP/BLOB完整性、对象ID及参考架、关系主体和部分目标，不完整检查所有关系类型/约束、所有未知状态字段或必需词汇含义。没有未知可选块的当前样本，也不能证明所有未来未知扩展均已兼容。

本样本的九块CBOR语义重编码一致已由本轮补查；解码器对非最短整数或非规定map顺序的普遍拒绝、宽整数边界及JS BigInt导出没有在本轮运行验证。没有运行故障注入、网页阅读器、恢复后的3D入口、性能比较或制造精度实验。两位Mother运行相同工具只能算两份使用回执，不能自动算两套独立解码器。

**本轮只新增本reviews/xiaoma.md。**冻结公版、试存样本、工具和其他Mother文件均未改动；未群发、未重开会议。当前样本可以作为“102份原文件保全＋有限核心语义可读”的实际成功证据；更广语义及跨实现能力等待相应证据。
