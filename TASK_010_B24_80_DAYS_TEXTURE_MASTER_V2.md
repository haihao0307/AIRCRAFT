# TASK 010 · B-24J-25-CO “80 DAYS” 高精度涂装母版 V2

## 目标

先完成一张可放大、可切换 PBR 通道、可导出 2K / 4K / 8K 的完整历史涂装母版，交由上游进行视觉确认。确认通过前，不得开始权威飞机模型的 LiveryUV 三角角点绑定，不得改写模型材质槽，也不得宣告整机涂装完成。

## 飞机身份

- Consolidated B-24J-25-CO Liberator
- Aircraft name: “80 DAYS”
- Serial: 42-73257
- Aircraft number: 487
- Fourteenth Air Force
- 308th Bomb Group
- 374th Bomb Squadron
- China Theater, 1944

## 本轮交付

- 左舷与右舷独立机身母版
- 左右机鼻高密度贴图区
- 两侧固定垂尾贴图区
- Base Color
- Normal OpenGL
- Roughness
- Height
- Ambient Occlusion
- Metallic
- Decal Mask
- Classification ID
- LiveryUV 审核图
- 窗框与开口边界
- 可放大检查的板缝、铆钉、紧固件和检修盖
- 褪色、污渍、油痕、掉漆和露铝层
- 单独可关闭的待证战损层
- 2K、4K、8K 浏览器生成和 PNG 导出

## 历史硬约束

1. “80 DAYS” 保留引号，左右舷分别制作。
2. 左右鲨鱼嘴分别制作，口腔采用待原始彩色证据继续校正的深红重建色。
3. STAM 只进入右舷，并位于上部矩形侧窗正下方。
4. ROBBY 与 HUFF 按左舷证据保存；右舷 HUFF 为 0。
5. 右舷胜利旗为 8，左舷为 0。
6. 炸弹数量保持 null，当前母版不绘制炸弹标记。
7. 两侧固定垂尾显示 273257、487 和白色三角。
8. 旧来源模型的 402366、1 号圆标和其他非本机标记不得进入母版。
9. 所有逐处战损在缺少直接照片证明时只能进入待证层。

## 审核入口

`80-days-texture-master-v2.html`

该入口通过同源压缩载荷恢复完整工作台，不依赖外部 CDN，不加载 GLB。用户批准该母版以后，下一任务才允许建立真实 LiveryUV 与模型材质绑定。