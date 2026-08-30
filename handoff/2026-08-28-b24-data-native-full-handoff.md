# B24 数据原生飞机生产线完整交接记录

日期：2026-08-28

## 一、项目目标

项目正在建立一套自有的 Aircraft Native Forge。长期主资产是结构化数据：

- AircraftDNA
- AssemblyGraph
- GeometryRecipe
- BehaviorGraph
- SurfaceGraph
- EvidenceGraph
- 自研 Runtime Compiler
- QA 与批准台账

GLB、FBX、CAD、STEP、UV 图集和栅格贴图只承担参考、交换、验证或可再生成输出的角色。

第一架飞机是 B24J CO。后续计划复用同一套生产逻辑制作 B25、B17、B29 等机型。

## 二、必须遵守的仓库约束

仓库：`haihao0307/AIRCRAFT`

工作分支：`research/b24-engineering-drawings-cad-v1`

交接前远端 HEAD：`ae067c035c6096cbdb6ebac18a558487ef173f1d`

PR：`#14`

状态：open、Draft、未合并

禁止事项：

- 禁止修改 `main`
- 禁止修改 `gh-pages`
- 禁止修改 Pages 设置
- 禁止强推
- 禁止改写历史
- 禁止创建替代 PR
- 禁止将 PR 转 Ready
- 禁止提前合并

若远端 HEAD 已变化，从最新远端 HEAD 正常快进，绝不能覆盖远端历史。

## 三、工具链权限

Blender 没有进入当前转换和网页运行链。当前数字继承转换器、ANFD 格式和 WebGL2 运行时均为自研路线。

## 四、锁定参考模型

文件：`b-24_liberator.glb`

字节数：`23,085,972`

SHA256：`541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`

清单：

- 场景 1
- 节点 1,784
- 网格 348
- 三角形 325,358
- 材质 30
- 嵌入图片 18
- 动画 1
- 动画通道 2,518

它提供视觉几何、节点层级、相对变换、材质分配和动画证据。工程精度继续由原厂图纸和官方手册校正。

## 五、当前自有数字格式

直接继承 V001 已经将参考模型转换为：

- 可读 JSON 母体
- `.anfd` 原始小端数字载荷
- 自研 WebGL2 运行时

原生载荷：

- 字节数 16,647,376
- SHA256 `7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`
- 组件节点 1,784
- 网格 348
- 顶点 307,273
- 索引 976,074
- 三角形 325,358
- 动画轨道 2,518
- 数字块 2,401

位置、法线、索引、UV 数值、局部变换、层级、动画时间和动画数值均经过逐流对比。机身运行显示已经停止使用旧 UV 与旧栅格贴图。

## 六、已经完成的主要里程碑

### 1. 权威参考镜像

完成锁定 GLB 的公开审核页、12 个同源二进制分块、逐块 SHA256、完整文件重组 SHA256、真实浏览器加载和节点隔离工具。

### 2. Aircraft Native Forge 架构

建立 drawing-first 数据合同、工具权限政策、通用部件重建 schema、31 节点薄整机 AssemblyGraph、13 控制器 BehaviorGraph 种子和 62 个 SurfaceGraph 槽位。

### 3. 垂尾研究

完成官方三视图入库、图纸冲突记录、参考方向舵直接提取、垂尾曲线 V002 和浏览器对照页。垂尾工程批准仍关闭。

### 4. 整机直接继承

完成完整几何、层级和动画的 JSON 加 ANFD 直接继承。它是快速参考壳，后续每个部件逐步用图纸校正。

### 5. 数字蒙皮

机身外表面已经执行：

- 不采样旧 UV
- 不采样旧栅格图集
- 旧表面覆盖节点默认隐藏
- 主色、金属度和粗糙度由数字参数控制

轮胎、液压支柱、发动机内部、螺旋桨和标准机械件允许保留直接继承的几何及通用局部外观。

### 6. 侧门和腰枪

左右腰部侧门已经有独立控制器。左右腰部机枪已建立自研首件，旧腰枪子树可以隐藏对照。

### 7. V006 至 V008

V006 被用户认可为明显进步的稳定基线。

V007 删除手动隐藏桨盘的产品选项，旋转模糊改由飞行状态自动控制。

V008 试图恢复平滑法线、玻璃、桨尖、发动机和脚架材质，并移除公开机械透视控制。用户实际检查后确认仍有多个阻断。

## 七、用户最新确认的 V008 阻断

以下内容全部需要录入下一道任务，禁止遗漏：

1. 声音按钮无法真正发声。
2. 螺旋桨只在启动瞬间运动，飞行阶段没有持续旋转。
3. 发动机、发动机罩、短舱、起落架和轮舱内部的原有通用颜色及材质层次没有恢复完整。
4. 机身整体颜色过淡，白天环境下发灰，细节和立体感不足。
5. 着色后仍不够清晰，圆润感和质感弱于参考模型。
6. 复位状态下机腹仍有空缺或错误开口。
7. 玻璃透明度、反射、高光和深度排序仍需复核。
8. 螺旋桨桨叶文字、黄色桨尖和桨毂细节需要保留为无 UV 数字分区。
9. 正式展示模式不得默认透出内部结构。
10. 以上基础问题关闭后，下一阶段才进入 B24J CO 具体机组历史涂装。

## 八、V009 应采用的技术路线

### 声音

- 只在用户点击后创建并恢复 AudioContext
- 不申请麦克风、摄像头、位置或本地文件权限
- 提供声音开关
- 声音随相机距离连续衰减
- 需要真实浏览器验证有非零输出节点和状态切换

### 螺旋桨

- 静止时显示完整桨叶
- 发动机启动后每帧持续更新旋转
- 飞行阶段持续旋转，不能只触发一次
- 模糊盘只由发动机转速和飞行状态自动生成
- 产品界面不得出现“隐藏桨盘”选项
- 黄色桨尖和桨叶小字采用局部几何坐标或矢量程序，不使用旧 UV

### 机械标准件材料

需要逐语义组恢复：

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

机身外部历史涂装继续走自研数字蒙皮。标准机械件允许按锁定参考模型的通用颜色和材质语言恢复。

### 画面与材质

- 校正 sRGB 与线性空间
- 降低过高环境光
- 恢复方向光与阴影层次
- 校正曝光和高光
- 使用继承平滑法线
- 排查错误 alpha 与透明叠层
- 玻璃按独立透明队列渲染，关闭深度写入，保持合理深度测试

### 机腹复位

- 对比时间 0、复位按钮和门状态机
- 检查炸弹舱门、机腹盖板、侧门、起落架门及被错误隐藏的节点
- 复位后必须无错误空洞
- 增加固定机腹截图和节点可见性报告

## 九、V009 最低验收

1. 打开声音后能够听到连续发动机声音，关闭后静音。
2. 相机远近变化时声音连续衰减。
3. 地面静止、发动机启动、飞行、降落四阶段的桨叶状态正确。
4. 飞行阶段连续至少 10 秒，螺旋桨每帧更新。
5. 发动机、罩、短舱、起落架和轮舱内部材质恢复可辨识层次。
6. 机身无旧 UV、无旧栅格贴图、无破碎叠层。
7. 整体色彩不发白，曲面圆润，玻璃清晰。
8. 复位后机腹无缺口。
9. 桌面 1440×900 和移动 390×844 均完成真实浏览器截图和控制台检查。
10. V009 浏览器 QA 通过前，所有工程批准继续保持 false。

## 十、批准状态

保持：

- `toolAuthorityPolicyApproved=true`
- `drawingFirstWorkflowApproved=true`
- `externalImageReconstructionActive=false`
- `aircraftDataMasterApproved=false`
- `assemblyGraphApproved=false`
- `geometryRecipesApproved=false`
- `behaviorGraphApproved=false`
- `surfaceSystemApproved=false`
- `referenceModelCrossCheckApproved=false`
- `verticalTailSourcesApproved=false`
- `verticalTailGeometryRecipeApproved=false`
- `verticalTailBehaviorApproved=false`
- `verticalTailSurfaceModuleApproved=false`
- `verticalTailBrowserQaApproved=false`

## 十一、新对话启动

继续时先阅读：

1. 本文件
2. `handoff/2026-08-28-b24-data-native-current-status.json`
3. `handoff/2026-08-28-b24-data-native-next-task-v009.md`
4. `docs/aircraft-pipeline/B24_NATIVE_REVIEW_V008.md`
5. `data/b24-native/native-review-v008-contract.json`

重新确认远端 HEAD 后，从最新状态继续。
