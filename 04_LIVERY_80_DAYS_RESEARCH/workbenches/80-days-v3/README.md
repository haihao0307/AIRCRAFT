# “80 DAYS” 可交互预审工作台 V3.0

入口为仓库根目录 `80-days-workbench-v3.html`。构建结果为单文件 HTML，内置 Three.js 0.169.0、所需模块和两张原照。三维样片首屏无需 CDN；原始机体仅在点击时联网读取并验证 23,085,972 字节及 SHA-256。页面中的原始机体保留旧源资产涂装，未应用新的 “80 DAYS” 材质。

四个模式：三维材质样片、原照与蒙版对照、只读原始机体、学习记录。支持旋转、缩放、平移、三个相机位置、转动开关、中性/掠射/展示照明、七种查看通道、参数导出和视图保存。移动布局目标为 390×844。

## 本轮材料与来源

小妈技能卡：`guilin-dem-pipeline` 的 `handoff/xiaoma-mentor-v1.1-20260905`，`docs/mother_coordination/learning-r1-20260905/skills/geometry-context/SKILL.md`，本次读取 blob `8057fd5584fa1de2203351085cf894b14fb43db0`。采用几何上下文、实例身份、显示与权威数据隔离、有限对照和分别报告接受状态的做法。

用户补充的参考仓库：`https://github.com/img2threejs/img2threejs`。读取 README 的材质相关段落及 `docs/materials/README.md`，后者本次读取 blob `c435d5b71cc749f004aa01332c6418a937593f7c`。只吸收区域材质身份、有界参数起点、受控视角检查、保留不确定性的办法；没有安装其整套生成流程，没有替换飞机或恢复其他旧生产线。

补充英文官方资料：

- https://threejs.org/manual/en/color-management.html 。已读正文，颜色纹理与数据纹理的语义分别接入。
- https://docs.blender.org/manual/en/latest/render/shader_nodes/displacement/normal_map.html 。已读取官方搜索索引的非颜色与 UV 匹配说明，正文直读接口返回 402；Blender 软件实操未执行。

图形依据来自已找回的左舷2000×1243与右舷640×490原照。URL、像素尺寸、字节数和 SHA-256 写在 BUILD_RECEIPT.json。原图未修补或移除人物。可见文字与图案在限定区域中分离为蒙版；右舷遮挡的嘴形和骰子留空，不补造任务标记数量。

左舷原照更清晰，因此首屏采用左舷材质试片；右舷 STAM 与矩形窗的观察仍独立保留。这里的图形仍保留照片透视，完整描摹、几何展平、精确 UV 与机体绑定均待后续。

## 真正接入的实现

基础颜色使用 sRGB；粗糙度、高度、法线、金属与蒙版使用非颜色数据。原始通道检查着色器直接显示数据，不施加展示光照和色调映射。边缘磨损的颜色、粗糙度与金属性采样同一归一化覆盖场。法线采用既有 R1 高度梯度函数，并显式处理 Canvas 行方向与 +V 的转换。

材料试片采用独立曲面。其曲率、接缝、铆钉尺度和布置只验证材质表现，未声明为原机真实几何或注册坐标。漆色与粗糙度是可编辑的重建参数，未由黑白照片唯一测得。油污与褪色演示也未构成长时间物理风化验证。

`refine_source.py` 记录首次浏览器审查后的小范围修正。首次应用须匹配原 app Git blob；以后检测已存在的修正标志并跳过。它只修改本工作台 app，不访问飞机资产。修正后的 app 源码随构建一起提交。

## 复现

```bash
python -m pip install Pillow==11.3.0 playwright==1.55.0
python -m playwright install chromium
python workbenches/80-days-v3/refine_source.py
python workbenches/80-days-v3/build.py
node --test experiments/80-days-material-r1/material-channels.test.mjs
python workbenches/80-days-v3/qa.py
```

BROWSER_QA.json 属于桌面与模拟移动视口的浏览器行为检查。CI 使用软件渲染，性能数字不能当作用户硬件成绩。PUBLIC_SMOKE.json 另行记录固定公网入口与真实网络模型读取；这项测试不替换请求。

源码检查、浏览器检查与人类视觉审批分别记录。`visualAcceptance=false`、`productionReady=false`、`modelBinding=0` 继续生效。PR #13 保持 Draft、未合并，旧 V2 失败对照与权威源资产保留。
