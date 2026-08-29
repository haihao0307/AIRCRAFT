# TASK 012 · B24 参考样机全量镜像与动画蒸馏

## 任务目标

以锁定的 `b-24_liberator.glb` 为唯一参考样机，先建立容器无关、可验证、可逐项审查的全量镜像数据，再开始飞机系统语义映射和原生替换。

本任务结束前，不生成任何依靠基本体猜测出来的 B24 整机，也不允许 Image2ThreeJS、图像生成器或关键词脚本决定飞机结构。

## 当前分支

`research/b24-engineering-drawings-cad-v1`

PR #14 继续保持 open、Draft、未合并。

## 权威参考锁

```text
file                 b-24_liberator.glb
bytes                23,085,972
SHA-256              541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d
scenes               1
nodes                1,784
meshes               348
triangles            325,358
materials            30
embedded images      18
animations           1
animation channels   2,518
animation samplers   2,518
accessors            6,702
buffer views         24
```

## 总控边界

ChatGPT 负责：

1. 判断节点与飞机系统之间的关系。
2. 判断机构、枢轴、运动顺序和变型适用性。
3. 制定整机装配树、GeometryRecipe、BehaviorGraph 和 SurfaceGraph。
4. 审查每个替换件是否达到参考样机质量。
5. 决定哪些原始数据可以升级为母体数据。

Image2ThreeJS 只承担已经确定后的局部表达、浏览器执行和 QA 辅助。它没有结构分析权、语义批准权和几何替换权。参考工具入口保留为项目外部执行器。fileciteturn127file0

## 已停止的路线

以下内容退出正式生产路径：

- 由少量基本体拼出的整机示意模型
- 根据名称或单张图自动猜测发动机舱、机鼻和炮塔
- 未经过参考样机逐项对比的程序化替换
- 自动提交压缩原型包的 bootstrap 工作流
- 依靠一张截图宣告整机外形通过

## 阶段 A · 容器无关全量镜像

执行器必须从锁定 GLB 中完整提取：

- scene 和 node 层级
- 父子关系与稳定路径
- 原始 TRS 或 matrix
- 解析后的局部矩阵与世界矩阵
- mesh 与 primitive 合同
- 所有 attribute、index、morph target 和 material 引用
- 6,702 个 accessor 的原始数值字节
- material、texture、sampler 和 18 个嵌入图像
- 2,518 个动画 channel 与 2,518 个 sampler
- 动画时间、插值、目标节点和目标属性

所有 accessor 被紧密打包成项目自己的按哈希寻址数据块。该数据包不依赖 GLB 容器，也不获得最终飞机母体资格。

### 阶段 A 当前本地结果

```text
source accessors              6,702
unique packed blocks          2,383
native mirror payload bytes   12,509,172
payload SHA-256               28af96e0cc84e5768ee2da7de68c478d04b9f30507b08465f74b6c33ec6980ff
animation timeline start      0.0416666679 s
animation timeline end        16.6666660309 s
animation duration            16.6249993630 s
semantic auto approvals       0
```

本地提取与独立校验通过。远端 Actions 证据尚未完成前，`structural_mirror_extractor_approved` 保持 `false`。

## 阶段 B · 精确重放运行时

下一步由项目运行时直接读取镜像清单与 `reference-accessor-payload.bin`，不读取 GLB 容器。

重放器必须完整恢复：

- 348 个 mesh
- 325,358 个三角形
- 原节点层级
- 原材质与图像引用
- 原动画通道
- 原关键帧插值

### 几何一致性门槛

1. 每个 accessor 的字节哈希一致。
2. 每个节点的局部矩阵最大绝对误差不超过 `1e-7`。
3. 每个节点的世界矩阵最大绝对误差不超过 `1e-6`。
4. mesh、primitive、attribute、index 和 material 绑定数量完全一致。
5. 禁止使用近似基本体代替缺失 mesh。

### 浏览器一致性门槛

使用同一相机、同一灯光、同一背景和同一渲染参数，对参考 GLB 与镜像重放器进行：

- 正面
- 后面
- 左舷
- 右舷
- 顶部
- 底部
- 四个斜向视角

每个视角至少比较动画时间：

```text
0.0416666679
4.1666667
8.3333333
12.5
16.6666660
```

需要输出颜色、深度、法线和对象 ID 四组证据。单张透视截图不能作为通过依据。

## 阶段 C · 动画语义蒸馏

原动画长度约 16.625 秒。所有通道先原样保存，再由上游逐组审查。

当前名称检索只产生候选：

| 候选组 | 直接名称命中 | 包含子树节点 |
|---|---:|---:|
| 螺旋桨 | 30 | 222 |
| 起落架结构 | 82 | 288 |
| 机轮 | 2 | 30 |
| 炸弹舱门 | 255 | 459 |
| 襟翼相关 | 184 | 454 |
| 副翼 | 4 | 10 |
| 升降舵 | 4 | 10 |
| 方向舵 | 12 | 30 |
| 发动机整流罩襟片 | 176 | 440 |
| 炮塔 | 0 | 0 |
| 机炮 | 0 | 0 |
| 乘员 | 0 | 0 |

名称候选不能直接进入 BehaviorGraph。炮塔、机炮和乘员必须结合世界位置、包围盒、父子关系、动画轨迹与真实渲染逐件认定。

## 阶段 D · 飞机系统语义地图

每个获批映射至少记录：

- `source_node_indexes`
- `source_stable_paths`
- `native_component_id`
- `system_role`
- `fixed_or_movable`
- `pivot_definition`
- `motion_axes`
- `motion_range`
- `surface_ids`
- `evidence_refs`
- `review_captures`
- `confidence`
- `approval_status`

未经审核的节点统一保持 `unresolved`。

## 阶段 E · 逐系统超越

只有完成精确重放和语义冻结后，才按以下顺序替换：

1. 发动机短舱、整流罩和螺旋桨系统。
2. 机鼻、座舱框架和前炮塔区域。
3. 双垂尾、方向舵、平尾和升降舵。
4. 起落架、舱门和减震机构。
5. 炸弹舱、炸弹架与投弹约束。
6. 炮塔、机炮、供弹与乘员插槽。
7. 机身、机翼、控制面和外部小部件。
8. 独立 SurfaceModule、UV、板缝、铆钉与历史涂装。

每次替换都保留参考件与新件的 A/B 页面。新件未通过时，参考镜像继续承担该系统的显示和动作。

## 本任务交付物

- `data/b24-native/reference-mirror-contract.json`
- `docs/aircraft-pipeline/B24_REFERENCE_FULL_MIRROR.md`
- `scripts/extract-b24-reference-full-mirror.mjs`
- `scripts/validate-b24-reference-full-mirror.mjs`
- `.github/workflows/b24-reference-full-mirror.yml`
- `reports/b24-native/reference-full-mirror-baseline.json`

Actions artifact 中生成：

- `manifest.json`
- `qa.json`
- `scene-graph.json`
- `meshes.json`
- `accessors.json`
- `source-assets.json`
- `animations.json`
- `semantic-candidates.json`
- `reference-accessor-payload.bin`
- `images/`

## 合并门槛

1. 粗糙原型 bootstrap 文件全部清除。
2. 权威文件字节数和哈希验证通过。
3. 全部 6,702 个 accessor 通过独立哈希校验。
4. 1,784 个节点与 348 个 mesh 完整覆盖。
5. 2,518 个动画通道与 sampler 完整覆盖。
6. 自动语义批准数量为零。
7. 精确重放浏览器 QA 完成。
8. 第一批人工系统映射完成。
9. 第一套改进部件达到或超过参考样机。
10. PR 继续保持 Draft，等待用户视觉检查。
