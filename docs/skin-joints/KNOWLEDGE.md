# 蒙皮接缝与铆钉：R14 可复用增量

日期：2026-09-08。本轮把 R12 的搭接与 R13 的加强件关系提升为共用模块，新增衬板对接与厚板埋头。旧小样与整机 R11 保持原发布内容。

## 结构与显示

`skin-joints-r14.js` 以连接对象、接头类型、路径、钉距、证据级别生成有身份的钉排。衬板对接的左、右两排分别连接左外板/衬板、右外板/衬板，不把每枚钉都写成贯穿三块板。折线路径以累计弧长布点，不把每段起点重复计数。活动边界没有紧固件记录时返回空钉排。

结构工作台根据同一孔轴生成外板、内板、贯穿杆、预制头与镦头；有厚度、真实通孔、闭合孔壁。埋头版本使用 100 度锥面，外板厚 2 mm、锥深 1 mm，保留直孔段。顶面齐平。这里是切削窝的几何示例；压窝是板材成形，必须另外建立两层嵌套，当前未实现，不能把锥孔改名作为压窝。

B-24 集成版限制在后机身一小块曲面，生成 2 排示意对接钉排及一排示意加强件钉排。只显示外側头部和接缝，不修改原壳、不生成贯穿孔、不声称重建隐藏背板。坐标和 25 mm 钉距均为演示配置；未制造校准。原源节点 1714/1747 的曲面投射用于贴附；候选不存在时跳过，不能把钉头悬在空中。法向按指定外侧方向定向，不改原始法向数组。未导入作废旧接缝线，也未将 R11 的候选作为测量输入。

两种表示共享钉排/连接语义，但精度范围不同。后续型号需要独立的部件标识、材料/接头类型、曲面适配器、标尺和资料证据；不要求所有飞机使用相同参数。

## 实际查阅的依据

- [EAA，Flush Riveting Tips，Tony Bingelis](https://www.eaa.org/eaa/aircraft-building/builderresources/while-youre-building/building-articles/metal/flush-riveting-tips)：阅读埋头与压窝段，支持两者的区分、锥形头与窝匹配、板层应嵌套的关系。没有把文中某个厚度或工具条件扩成所有飞机的制造参数。
- [EAA，Setting or Driving Solid Rivets，Jack Dueck](https://www.eaa.org/eaa/news-and-publications/eaa-news-and-aviation-news/bits-and-pieces-newsletter/09-2015-setting-or-driving-solid-rivets)：沿用 R12 已读图 8 的镦头示意比例 1.5D/0.5D。制造头轮廓和所有示例尺寸仍不代表公差标准。
- [FAA，PHAK Chapter 3，图 3-14](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/phak/05_phak_ch3.pdf#page=9)：沿用 R13 已读结构图，区分蒙皮与内侧加强结构。
- [A72-176 原摄影者图集](https://www.grubby-fingers-aircraft-illustration.com/liberator_A72-176_walkaround.html)：本轮核对图集文字身份为修复中的 B-24M，并列有后机身照片。049 细图未成功打开，未从该照片测量或声称完成同部位对位。修复件与未知标尺也不能证明战时目标改型的线位。
- [AAP 721.94 Volume 6 扫描件](https://aircraft-manuals-ehive.s3.ap-southeast-2.amazonaws.com/PDFA/TAME2022.7.pdf)：下载补全后实际检查封面/目录与 PDF 第 8 页，身份是 Sabre Mk 31/32，不能用于 B-24 坐标。另阅读 PDF 第 95 页、印刷页 1-78、图 1-52，可见修补板、填片与内部构件的关系；只作为“接头需辨明连接对象”的异机型例证，不复制其维修方法和参数。

B-24 结构维修手册 AN 01-5E-3 / AP 2396A 仍只取得目录记录。FAA AC65-15A 等未完成可读图页核验的条目不升级为已验证来源。新增用户 SVG 继续作为线义待核对候选，具体评估见 `docs/reference-review/AIRFIX_SVG_2026-09-08.md`。

## 验证口径与边界

`tools/skin-joints-r14-check.py` 检查 3 接头 × 2 钉头 × 5 视图、孔轴射线与实体射线、板壳闭合边/非流形边/退化面、体积与圆孔/锥孔解析值、重复重建资源数、弧长与活动边界规则、移动布局、B-24 源载荷哈希、近远细节开关及公开版本文件一致性。

工作台静止后停止重复绘制，隐藏页面不绘制。整机新增钉头使用一次实例化绘制，线段一次绘制，远处隐藏微小钉头。浏览器自动化采用 SwiftShader 软件图形，只能证明功能、资源量和本机运行情况，不能据此承诺真机 GPU 帧率。历史整机着色器成本不计为本轮新增性能成绩。

本轮完成范围是可调用的基础模块与两页交互；全机制造线、实测钉距、薄板压窝、修理方案、复材连接和真实变形仍未完成。后续在取得可定位结构图/内外对位与尺度依据时扩展实例，不将示意线升级为事实。
