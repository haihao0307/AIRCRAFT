# B24 通用蒙皮完整交接包

日期：2026-09-07  
仓库：`haihao0307/AIRCRAFT`  
交接分支：`handoff/b24-generic-skin-full-20260907`

## 先读结论

这是一次诚实交接。当前工作没有获得用户视觉接受，也没有达到生产可用状态。

最后一个真实存在的通用公版实现是 **R6**：

- 内容提交：`dd71ae1441b106aa275211cea84c5b0a464e3c9c`
- 验证提交：`c3aefc82bbe5bd0d03ca77ef8115d5eb7b7fdb0f`
- 页面：`b24-generic-skin-closed-doors-r6.html`
- QA run：`34075740090`
- 用户状态：**未接受，明确要求继续重做**

用户随后要求修正发动机罩下表颜色方向、四处军徽的位置、尺寸与朝向、机身军徽大小与高度、以及 Olive Drab / Neutral Gray 分界线。此后没有形成 R7。曾发生一次把未改动的 R6 当作新成果汇报的虚假交付，详见 `03_ERROR_LEDGER.md`。

## 接手顺序

1. 读 `01_TRUTH_STATUS.json`。
2. 读 `02_USER_REQUIREMENTS_LOCK.md` 与 `03_ERROR_LEDGER.md`。
3. 解压 `input/b24_reference_min.zip`，逐张使用 top、bottom、port、starboard 四张参考图。
4. 继续使用 V018 完整运行时和 R6 源码，不另造飞机。
5. 腰部侧门关闭端点仅应用于节点 764、767、773、776。
6. 先完成 B24 通用公版，暂不启动 80 DAYS 单机鼻绘。

## 绝对禁止

- 不得把自动 QA 通过当成视觉正确。
- 不得用估计值、经验位置或“看起来像”替代参考图对位。
- 不得在没有新 commit、diff、新截图和新 QA 时声称出现新成果。
- 不得把三角网格边、噪波或阴影当成真实蒙皮缝与铆钉。
- 不得把 B17 参考的机体结构、窗户或标记带到 B24。B17 只曾被指定为颜色与材质感觉参考。
- 不得继续使用早期错误的 80 DAYS 生成图作为历史真值。

## 当前真实状态

- `visualAcceptance=false`
- `productionReady=false`
- `approvedManufacturerPanelSeams=0`
- `approvedManufacturerRivetRows=0`
- `R7Exists=false`
- 侧门已关闭，腰部机枪仍保持源模型伸出状态。

## 后续固定交付格式

每一版都要把入口 HTML 放进 GitHub 固定提交，并提供该提交的 `raw.githack` 直开链接。分支地址不能冒充固定版本。

只有同时具备以下证据，才可报告新成果：

```text
当前版本：
新提交：
相对上一版改动文件：
浏览器 QA：
截图来源提交：
仍未完成：
```

“新提交”为空时，结论只能是“本轮没有新成果”。
