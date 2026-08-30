# B24 V014 程序化字段金属材质试验区

## 目标

本轮把程序化字段知识正式接入 B24 表面生产线，并在右侧内发动机舱、整圈整流罩瓣和相邻机翼建立首个金属材质试验区。

## 冻结输入

1. V013 原始机械颜色基线提交 `4868116e098d78bd29ce847ecf0809fb6fbc3f2e`。
2. 锁定 B24 GLB 大小 `23,085,972` bytes。
3. 锁定 B24 GLB SHA256 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`。
4. V013 机械原色、螺旋桨连接件、发动机内部、液压支架和机腹白色件全部受保护。
5. 几何、动画、跑道飞行序列和 80 DAYS 历史批准状态不变。

## 字段链

`Source Field → Truth Mask → Parent Mask → Shared Domain Warp → Macro/Meso/Micro → Event Fields → Five Stop Metal Palette → PBR Channels → Diagnostic Channels`

Source Field 永久只读。程序化层只作用于渲染通道。本轮 Shape Impact 为 `none`。

## 首个试验区

1. 右侧内发动机舱中心约为 `[3.38, 0.0, 3.20]`。
2. 机翼父绘制件为 node `1711`、mesh `332`、`8,948` triangles。
3. 整流罩瓣共 22 个源绘制件。
4. 源材质为 material `6`，Base Color texture `5`，Metallic Roughness 与 Occlusion texture `1`。
5. 父遮罩采用柔和椭圆和发动机核心遮罩，整机自动分配关闭。

## 材质输出

1. 源贴图只用于提取板缝、铆钉状点列和已有明暗结构。
2. 五段综合色彩生成中性铝色，避免恢复旧涂装污染。
3. 排气油烟沿发动机后方气流方向形成。
4. 机油渗漏受发动机接缝、重力和后向气流共同约束。
5. Source Detail 同时驱动局部颜色、粗糙度和微法线。
6. GGX 金属主层与低强度清光罩层分离计算。
7. Micro 字段只进入粗糙度和微法线，不改变主几何。

## 交互和验收

单文件 HTML 提供整机、试验区、近景、源细节、父遮罩、排气场、粗糙度和金属度检查。默认关闭旧噪波层。所有人工批准保持 `false`。

## 生产边界

V014 只验证一个右侧内发动机舱和相邻机翼。其它三台发动机、完整机翼、机身、双垂尾、机腹和起落架区域在视觉批准前不得自动继承本试验参数。
