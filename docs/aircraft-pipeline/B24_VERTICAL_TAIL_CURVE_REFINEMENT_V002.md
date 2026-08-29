# B24 双垂尾曲线精修 V002

## 目标

本阶段专门修正 V001 垂尾候选的直线分段、明显折点和圆角不连续问题。外轮廓由官方 B-24J 三视图逐点复核，并改为周期三次 B 样条表达。

## 来源

- 来源编号：`B24-ENG-S016`
- 文档：`AN 01-5E-3`
- 页码：`ix`
- 适用标注：`B-24J`
- 原扫描 SHA256：`de0819d07d35f37126ed62b3a6f02131aaded7cbaa5c49ce63187f72dab0f5b6`
- 清理审查图 SHA256：`07449d0a39a22ae71851025960a9f0725f9ee3041d0ea6e1e6b6d03b29951df6`

清理审查图只用于提高可读性，原扫描继续承担来源记录。

## V001 问题

V001 使用少量多边形顶点和直线段连接，顶部、前缘、后缘和底部转接处出现可见折角。形状的大体比例可以用于早期讨论，无法承担精细轮廓验收。

## V002 方法

- 31 个经过图纸复核的轮廓锚点
- 周期三次 B 样条
- C2 连续性
- 800 个显示采样点
- 独立光顺铰链边界
- 固定垂尾和方向舵分别表达
- 八个语义蒙皮表面继续保留

V002 的青色区域代表固定垂尾候选，橙色区域代表方向舵候选，黄色曲线代表分界和铰链候选。

## 三维显示候选

本阶段使用 7% 对称 NACA 00xx 截面作为厚度显示候选，用于观察圆滑边缘与分件效果。该厚度没有获得工程批准。双垂尾中心间距采用图纸标注 `26 ft 0 in`，对应 `7.9248 m`，工程标定仍保持关闭。

## 已关闭的问题

- V001 可见折线段
- 顶部硬拐
- 前缘圆角不连续
- 底部转接折角
- 固定垂尾与方向舵颜色和身份方向混淆

## 继续阻断的问题

- 图纸工程标定
- 固定垂尾根部安装边界
- 真实截面和厚度分布
- 方向舵精确铰链轴
- 正负行程
- 固定垂尾内部结构
- 与水平尾翼的真实接口
- 整机数据母体替换批准

## 在线入口

`preview/b24-vertical-tail-curve-v002/index.html`

## 数据入口

`data/b24-native/components/empennage/vertical-tail-curve-v002.json`

## 批准状态

```text
drawingCalibrationApproved      false
geometryRecipeApproved          false
hingeAxisApproved               false
thicknessApproved               false
referenceParityApproved         false
verticalTailApproved            false
```
