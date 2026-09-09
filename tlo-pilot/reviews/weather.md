# Weather Mother：TLO-M01 首次试读回执

日期：2026-09-09。范围：按委托实际试读本地二进制与核心语义，只写本回执；未改冻结公版、生产资产或其他参与者文件。

## 实际读取与核验

已先读 FORMAT.md，并阅读 tools/verify.py、tools/codec.py。实际执行：

    python -B -X utf8 G:/AIRCRAFT/b24-mother01-tlo-pilot-20260909/tlo-pilot/tools/verify.py

另以 Python Path.read_bytes() 实际读取同一样本，调用提供的 verify()，逐项查看解码后的 VOCB、FRAM、TIME、DNA_、OBJS、RELS、EVNT、PROV；不是只读格式说明或打开预览网页。读取期间未执行 BLOB 内代码。

|项目|实际结果|
|---|---|
|样本|data/B24_Generic_Mother_01.tlo|
|SHA256|fb76422e2999536a935132b2c28c382e69a86bef9969cf2ca21e9650da8e01a5|
|文件长度|19,095,163 字节，与委托一致|
|运行工具|Python 3.12.10；现成 verify.py + codec.py；使用 -B 不生成字节码缓存|
|容器|实际 magic WSD0；版本 0/1，flags 0|
|配置|tlo-mother01-pilot/0.1；cbor-m01-subset/1；词汇 tlo-m01-vocabulary/0.1|
|块数|112：PROF + 9 核心块 + 102 BLOB|
|容器检查|工具报告通过；全部载荷 CRC、头/长度/尾部、所需核心块及资源映射检查通过|
|102 资源|102/102 原字节 BLOB 的长度和 RMAP SHA256 相符；路径、资源ID及块序号唯一且所有 BLOB 均有映射|
|回封装|工具报告 wholeContainerRoundtrip=byte-exact|
|未理解的可选块|本样本没有，unknownOptionalChunks=[]|
|读取器 SHA256|verify.py：679f38d700550c3a237f80d71ea908be5d284aeb3f9dea61779c56bd10e4ade9；codec.py：5ae2c64b2a58e1fcdb82a70668e92f55d23c61cfb57256db8b647c2fc09fa78e|

这是使用提供的 Python 实现所得的实际接收回执，不是独立解码器交叉证据。102 文件是在内存中逐份核验，本轮没有 --extract 落盘，也未运行恢复目录的 verify-package.py。工具输出 fullFileRecovery 的准确范围在此是全部 RMAP 文件哈希通过，不能表述成本轮已经完成落盘恢复或三维运行验收。

byte-exact 回封装采用原块载荷与顺序，证明本轮容器重封装字节一致；它不单独证明所有 CBOR 语义重新编码的一致性、完整原资料提取或任意未来配置兼容。CRC/自含哈希也不是独立来源认证；本轮另核对委托给定的全文件 SHA。

## 六项独立语义回答

1. **这是什么对象？**解码对象为 B-24 公版母体01，是已接受、冻结的数字模板，持续身份 urn:mother:aircraft:b24:generic:01，版本 01/R16，snapshotId 为 mother01-r16-accepted-20260909。它不是 B-24 类别本身，也不是某架已有历史机号的实机。OBJS 共7项，是模板与6个数字区域；1784源节点、348网格不是已证实的物理部件数。
2. **米制局部坐标是否就是现实经纬度原点？**不是。FRAM 是右手 local-model，长度 m、角度 rad，Y向上、Z朝机鼻、X为继承横向正轴，原点为原模型根。worldLocation/worldPose 为 unknown，worldCRS/worldParentFrame 为 not-provided。modelRootScale=[1,1,1] 是局部模型缩放，不能当作已知世界姿态或地理定位，更不能补经纬度(0,0)。正负X区域名称也不应在未核对机体左右约定时擅自改名。
3. **项目日期是否等于实物有效时间？**不是。recordedDate=2026-09-09，Gregorian、day精度，是项目接受/试存记录；sourceVersionTime=2026-09-09T10:13:38+08:00 是Git包版本时间。worldTime 与 flightHours 明确 unknown。EVNT 只记录有序的项目外观接受和冻结事件，没有提供实机历史事件。日期、提交时间与 snapshotId 均不能推导当时真实天气或飞机飞行时刻。
4. **四类关系是否混淆？**本样本明确区分 typeOf（类别）、representationPartOf（数字区域组成）、poseReferencedTo（位姿参考架）、managedBy（Mother管理归属）；解码 RELS 中用各自 kind 明示，未把管理者当物理父对象或把类别当姿态父架。另有 derivedFrom 指源代码版本谱系，不是物理血缘/空间组成。区域还用 frameId 显式引用局部架；不能仅由 representationPartOf 自动推断其完整变换矩阵。
5. **制造精度是否已证实？**没有。PROV 将外观接受标为 supported，将精确制造面板位置标为 not-established；对象限制包含 no engineering calibration。DNA_ 明说面板位置 approximate、铆钉间距 illustrative，合金牌号 unknown。文件字节一致、展示米制和用户接受外观均不升级为制造精度证据。
6. **80 DAYS及机组是否已实例化？**没有。DNA_.nextPhase.status=plannedDerivative，implemented=false，具体历史身份 unknown。公版自身 crew/serialNumber 为 not-applicable；这与未来实例尚缺身份资料是不同状态，不能把任何一项补成真实机号或人员关系。

## Weather 接收边界：时间、参考架、状态与未知

可理解的部分：内嵌词汇与核心语义足以说明模板身份、局部架、项目时间、源版本及示意状态。五个 servicePresets 的 use/care/exposure 是0..1外观强度，damage/repair 是示意标志；stateTimeMode=illustrative-static-preset。它们不是经标定的服役小时、累积降雨、表面水量或真实损伤事件史。切换预设也不能被接收者登记为历史上发生了一次维修。

unknown、not-provided、not-applicable、not-implemented 等状态可以区分；本轮没有把未知填零。已知0/false应保留其明示含义，比如 implemented=false，而不是一律判作缺测。词汇还允许 conflict，但本次未见需要解释为已发生冲突的字段实例。

尚不能成立的跨领域查询：样本没有世界锚定/有效实物时间，也没有给出用于动态风雨查询的运动点速度、实际气象驱动或其有效域。因此我不能据此对机翼查询真实风、计算雨滴相对运动面通量、积分湿润史，或宣称 Weather/Skin 已接通。未来须显式补齐相容参考架、位置/姿态、物理时间及各场的有效状态；使用本样本 snapshotId 只标识这份接受的表示快照，不能自动对齐一个外部天气快照。缺风不是零风，缺表面历史不是干燥初态。

保全与理解的区别：本轮102份资源均经过字节核验，但详细几何、其余节点语义、着色/外观规则仍主要由原资源保全；未将它们全部独立解释成声明式物理知识。提供的函数需要原Three.js运行时；本轮未执行、未复验这些渲染能力。不把实验TLO-M01读通表述为全体系TLO定稿、旧schema合规或任意AI平台通用兼容。

结论：本次实际二进制读取及102份资源核验通过；在此实验配置范围内，Weather接收者能区分时间、局部参考架、示意状态和未知。物理世界定位、历史气象/材料收支与跨领域运行接入仍不具备必要事实。
