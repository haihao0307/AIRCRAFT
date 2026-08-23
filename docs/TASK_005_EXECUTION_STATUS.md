# TASK 005 执行状态 · 权威 B-24 炮塔整合

状态：`active-search-and-integration`

## 唯一权威模型

- 文件：`b-24_liberator.glb`
- 字节：`23085972`
- SHA-256：`541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`
- 节点：1784
- 网格：348
- 三角面：325358
- 材质：30
- 内嵌图片：18
- 动画：1
- 动画通道：2518

## 已核验的完整发布包线索

### 首选包

- 文件：`Haihao_B24_Online_Publish_v0.9.6.zip`
- 字节：`9455362`
- SHA-256：`3a7e5a311aa12cefbd0db4bd97f5b4162ae43198de19d215debda2e388667bff`
- 内部模型路径：`payload/aircraft-pipeline/public/aircraft/b24/assets/b-24_liberator.glb`

### 修正版包

- 文件：`Haihao_B24_Online_Publish_v0.9.6_fixed.zip`
- 字节：`9456330`
- SHA-256：`77e1724f5e4e54730802c5cd2c4271e39bfcad7dd9f59364e8f786d7a35dae92`

### ASCII 安全包

- 文件：`Haihao_B24_Online_Publish_v0.9.6.2_ASCII_SAFE.zip`
- 字节：`9455800`
- SHA-256：`ebeb177ec7a219049608715fab6b7e5dfd4a534c0f9458ce4b685161ba720fb2`

三套发布清单均记录同一精确模型字节数与模型 SHA-256。

## 执行顺序

1. 检查仓库、全部历史分支、Release、Actions artifacts、工作区挂载和可访问对象存储。
2. 找到发布包后先校验压缩包哈希。
3. 解压模型后校验模型字节、SHA-256、GLB 头与完整清单。
4. 提交原模型到 `assets/model/b-24_liberator.glb`。
5. 扫描真实机鼻、背部、机腹、尾部与腰部机枪几何。
6. 按 A、B、C、D 四类记录真实拆分方法。
7. 必要时生成 `assets/model/b-24_liberator_turret-rig-v1.glb`，原模型保持只读。
8. 将炮塔运动合同绑定到真实几何。
9. 保留 v0.9.6 原有飞行、螺旋桨、起落架、轮子、烟雾、投弹、航线和材质逻辑。
10. 发布 `b24-authoritative-turrets-v0.9.9.html`，完成浏览器验收后再合并。

## 禁止项

- 程序化飞机
- 简化占位飞机
- 替代 B-24 模型
- 猜测炮塔节点后宣称完成
- 缺少精确 GLB 时发布假完成网页

所有完成成果必须提交并推送到本分支，随后在 PR 中记录测试、截图、哈希、已知问题和在线入口。
