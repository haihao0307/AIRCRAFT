# 最新接续：R15 蒙皮与服役生命周期（2026-09-08）

当前分支 `feature/b24-service-life-r15`。[R15固定公网预览与验收](docs/service-life/PUBLIC_PREVIEW.md)已完成；固定代码为 `1e0504037f8caa2f651fd860b52be1dbbf09e148`，入口 `b24-service-life-r15.html`。五种服役状态、使用/保养/暴露独立调节、轮胎胎面/胎侧/轮毂细节及其他固定外表面的缝/钉排已实现。两侧腹部漆界尖角由截面尖峰修正，前轮后方重叠表面以深度偏移稳定显示，无原UV输入。

详细机制、来源和范围见 [R15知识](docs/service-life/KNOWLEDGE.md)。新增全机缝位、钉距、战损与修复为外观示意；原机壳数组不变，未据此声称制造复原或结构损伤分析。原始载荷哈希、348网格/1784节点、军徽锚点保持；禁止复用已作废105段线。R14结构工作台与旧版链接保留。继续遵守固定版本公网HTTPS交付规则，公网实际验收之后才能交付。以下为历史交接。

# 最新接续：R14 蒙皮连接模块（2026-09-08）

当前工作分支 `feature/aircraft-skin-joints-r14`。新增结构工作台 `aircraft-skin-joints-r14.html` 与 B-24 局部集成 `b24-skin-integration-r14.html`。见 [知识与实际资料边界](docs/skin-joints/KNOWLEDGE.md)、[范围合同](docs/skin-joints/CONTRACT.md)。[R14固定公网预览与实际验收](docs/skin-joints/PUBLIC_PREVIEW.md)已完成；两页均通过公网浏览器交互和关键资源一致性检查。

三类接头、凸头/埋头、孔/杆/板厚共同生成。后机身 88 枚外侧钉头和接缝是未测量的示意集成，严禁改称 B-24 制造线；机壳未开孔，压窝尚未实现。旧105段、R11候选及历史源文件不重新启用。继续遵守固定版本公网 HTTPS 规则，旧版本不改。以下均为历史交接。

# 最新接续：R13 蒙皮—加强件关系（2026-09-08）

当前分支 feature/b24-skin-stiffener-study-r13；[R13固定公网预览](docs/stiffener-study/PUBLIC_PREVIEW.md)已实际浏览器验收。用户提供三张照片，观察与来源记录在docs/stiffener-study/photo-observations.json，知识在同目录KNOWLEDGE.md。本轮做通用结构反例，不将钉排直接解释为蒙皮搭缝；实例截面和毫米尺度仍未知。下次有效证据是同部位内外对位、标尺或结构图。R12及整机R11保持原样，禁止复用作废旧接缝线，继续遵守统一公网规则。以下为历史交接。

# 最新接续：R12 蒙皮铆接学习样板（2026-09-08）

当前分支 feature/b24-skin-rivet-study-r12。独立小样已完成公网验收，见 [R12 固定预览](docs/rivet-study/PUBLIC_PREVIEW.md) 与 [知识正文](docs/rivet-study/KNOWLEDGE.md)。本轮不替换 R11 整机。继续学习须保留资料、示例参数与实机测量的区别；旧接缝线禁止复用。统一公网规则继续有效，旧版本不覆盖。下文是历史蒸馏交接，不能覆盖本节当前任务。

# Continue B24 native distillation

Active continuation branch: feature/b24-native-distillation-r1 in haihao0307/AIRCRAFT. Read CURRENT.json, AGENTS.md, knowledge/NATIVE_R1.md and knowledge/RECEIPT.md. Re-read the live remote HEAD before writing.

V018 is published at https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-native-data/ . Runtime tree f3c9569088d052f2f47c3a30871f814b7705f481 is the tested and public-byte-verified candidate. It contains 27 files and downloads 4,061,477 bytes of aircraft data in 9 segments. No original image assets or source UV blocks remain in its data.

Do not return to the former b24-v017 workbench branch as the active production line. It remains a frozen comparison source at b8b2a6c441fa9a9b7e0831f4217511b4968d266e. The accepted V017 remains ceed8183dc5fb8399349e73ebeef5b997d7d7389 on accepted/b24-v017-20260905. Both older public pages are unchanged.

Completed: compact image-free data, exact geometry retention and source-equivalent motion migration into poses and explicit controllers. Passed actual local/public browser tests and two real-time cycles in each of two viewports. Read original SOAK reports as well as the summary.

Not complete: whole-aircraft geometry recipes, corrected engineering linkages, payload inventory/empty-bay binding and historically grounded panel/marking reconstruction. Source actuator curves remain in the new control representation. Parametric profile trials are isolated from runtime and must not be imported after a failed shape check.

Weather, clouds and fog remain deferred. Runtime GPU reflection/shadow/smoke buffers are separately disclosed. visualAcceptance=false and productionReady=false apply to V018. CI executes submitted builds/tests; no overnight autonomous coding agent was started.
