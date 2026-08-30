# 程序化字段知识库 V1.0.0

## 来源锁

原始包：`PROCEDURAL_FIELD_KNOWLEDGE_MINI_V1.0_2026-08-30(3).zip`

大小：`13,456 bytes`

SHA256：`d69ecd2677507db9342a1d66092a8d6cf4255141346b14cc4629303bf1c4f396`

状态：只读知识源。飞机项目只能建立适配层，禁止反向覆盖本知识源。

## 核心字段链

`Source Field → Shape Field → Data and Mask Field → Color Field → Render Field → QA`

1. Source Field 保存原始几何、组件、UV、材质、图像、历史证据和批准状态。
2. Shape Field 只允许通过已批准遮罩施加有界变化。B24 V014 的 Shape Impact 固定为 `none`。
3. Data and Mask Field 由 Truth Mask、Parent Mask、Process Mask 和 Separation Mask 组成。
4. Color Field 使用数据驱动综合色彩和事件驱动的多通道响应。
5. Render Field 负责 PBR、环境响应、清光罩层和诊断通道。
6. QA 同时验证确定性、来源锁、遮罩边界、通道关联、浏览器错误和批准状态。

## 尺度预算

1. Macro 负责宽缓色差、日晒、整体粉化和大范围环境暴露。
2. Meso 负责排气带、机油流痕、走道磨损、板块色差和检修区域。
3. Micro 负责铝板细颗粒、轻微划痕、粗糙度和微法线。
4. Micro 默认禁止改变飞机主几何。

## 复合规则

1. 同一事件必须共享主遮罩和主 Domain Warp。
2. 同一事件可以同时驱动 Albedo、Metallic、Roughness、Normal、AO、Wetness 和 Clear Coat。
3. 同类效果采用多次低强度复合，保留大面积安静区域。
4. 噪波只负责遮罩内部的形态变化、密度变化和边缘破碎。
5. 排气、机油、脚印、板缝、铆钉和掉漆的位置必须来自部件、源贴图、工程资料或历史照片。

## B24 适配规则

1. 锁定 B24 GLB 大小为 `23,085,972 bytes`。
2. 锁定 B24 GLB SHA256 为 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`。
3. V013 原始机械颜色、螺旋桨连接件、发动机内部、液压支架和机腹白色件永久进入保护遮罩。
4. 历史涂装、几何、动画和跑道飞行序列均独立冻结。
5. 整机自动分配保持关闭。任何试验区通过人工视觉批准后才能扩展。

## 原始包文件锁

| 文件 | Bytes | SHA256 |
| --- | ---: | --- |
| `01_CORE_KNOWLEDGE.md` | 5,600 | `f065c18f67629281038167903162f49adba681deead185ccb07b3c1c5b6316d7` |
| `02_ADAPTATION_GUIDE.md` | 2,294 | `a717c16542b6e9e24cc05370caa71fbd341a1f921019a0a764ef3ac321e6438a` |
| `field_contract.schema.json` | 2,906 | `2b954934c7bdc87aa15b5ded86513928a069b4246689addff769e4c204e7928f` |
| `field_graph_recipes.json` | 2,154 | `d88e95ed5b2fe4205de70e48ebd090092da5781dd9d24483a22afa22d78330e2` |
| `field_reference.js` | 5,622 | `8fd54c74b44a6abd6fe35619a10b08b396c7c71ac57ee37e77246b4c531078a5` |

## 批准边界

知识入库不等于材质批准。视觉、材质、历史、工程、整机和生产冻结批准默认保持 `false`。
