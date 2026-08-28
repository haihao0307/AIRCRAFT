# 继续 AIRCRAFT Draft PR #14，完成 B24 数据原生整机 V009

只在现有分支 `research/b24-engineering-drawings-cad-v1` 工作。开始时重新确认远端 HEAD。交接前基线是 `ae067c035c6096cbdb6ebac18a558487ef173f1d`，后续交接文件提交会继续推进 HEAD。若远端已有新提交，从最新远端 HEAD 正常快进。保持 PR #14 open、Draft、未合并。禁止强推、改写历史、新建替代 PR、修改 `main`、`gh-pages` 或 Pages 设置。

先完整阅读：

- `handoff/2026-08-28-b24-data-native-full-handoff.md`
- `handoff/2026-08-28-b24-data-native-current-status.json`
- `docs/aircraft-pipeline/B24_NATIVE_REVIEW_V008.md`
- `data/b24-native/native-review-v008-contract.json`
- `docs/aircraft-pipeline/B24_NATIVE_DIRECT_INHERIT_V001.md`
- `data/b24-native/direct-inherit-v001-contract.json`
- `docs/SOURCE_LOCK.md`

锁定参考模型：

- `b-24_liberator.glb`
- 23,085,972 bytes
- SHA256 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`

当前 ANFD 载荷：

- 16,647,376 bytes
- SHA256 `7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`

## 一、声音必须真实可用

1. 在用户点击后创建或 resume `AudioContext`。
2. 禁止申请麦克风、摄像头、位置或本地文件权限。
3. 开启后必须有连续可听的四发动机声音，关闭后必须静音。
4. 音量、低通和高频随相机距离连续变化。
5. 增加真实浏览器测试，验证 AudioContext 状态、非零 gain、开关与距离衰减。

## 二、螺旋桨必须持续运动

1. 静止时显示完整桨叶。
2. 发动机启动后每一帧持续更新桨叶角度。
3. 飞行阶段连续至少 10 秒，不能只在进入阶段时触发一次。
4. 降落和停车后按状态恢复。
5. 模糊盘由发动机转速与 FlightState 自动控制，界面中不得出现“隐藏桨盘”选项。
6. 黄色桨尖、小字和桨毂继续使用无 UV 的局部数字程序。

## 三、恢复机械标准件外观

逐语义组恢复参考模型通用颜色和材料层次：

- 发动机内部
- 发动机罩
- 整流罩活动片
- 短舱
- 起落架支柱
- 液压杆
- 轮胎
- 轮毂
- 轮舱内部
- 机腹内部标准件

机身外部历史蒙皮继续保持无旧 UV、无旧栅格图集。机械件可以保留锁定参考模型的通用颜色及材质语言。

## 四、修复偏淡与质感下降

1. 校正 sRGB 与线性空间。
2. 降低过高环境光与曝光。
3. 恢复方向光、阴影、高光和材料对比。
4. 继续使用继承的平滑法线。
5. 排查错误 alpha、雾化和透明叠层。
6. 玻璃独立排序，关闭 depthWrite，保持 depthTest，并复核 alpha、粗糙度、反射和颜色。

## 五、修复复位后的机腹空洞

1. 对比时间 0、复位按钮和各门状态机。
2. 检查炸弹舱门、机腹盖板、起落架门、侧门以及被错误隐藏的节点。
3. 复位后机腹必须闭合，无空洞和悬空板件。
4. 输出固定机腹截图和节点可见性报告。

## 六、真实浏览器 QA

必须在桌面 1440×900 和移动 390×844 各完成：

- 页面加载
- 声音开关
- 距离衰减
- 飞行阶段持续螺旋桨
- 侧门
- 复位后机腹
- 发动机与轮舱近景
- 玻璃
- 控制台 0 错误

发布新的 V009 固定预览入口和 artifact。自动 QA 通过与视觉批准分开记录。

## 七、交付

提交并 push 到同一分支，给出：

- 起始 HEAD
- 最终 HEAD
- 提交 hash
- 修改文件清单
- Actions runs
- artifacts
- 在线预览入口
- 桌面和移动截图
- 仍未通过的项目

所有整机、几何、行为、表面和视觉批准继续保持 false。完成上述基础闭环后，才进入 `80 DAYS` 历史涂装。