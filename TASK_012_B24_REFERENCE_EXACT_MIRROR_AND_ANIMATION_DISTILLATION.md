# TASK 012 · B24 参考模型精确镜像与动画全量蒸馏

## 任务目标

以锁定的 `b-24_liberator.glb` 为唯一参考模型输入，建立一套可重复、可审计、零猜测的精确镜像基线。第一阶段完整保留参考模型的场景、节点、父子关系、局部变换、世界变换、网格访问器、材质、图像、UV、蒙皮、形变目标与全部动画采样数据。第二阶段由 ChatGPT 对这些数据逐项建立语义字典和飞机系统关系。自动工具只负责读取、校验、重放与报告，不负责判断飞机结构。

本任务不生成近似飞机，不使用 `img2threejs` 猜测外形，不授权任何自动语义候选进入正式母体。

## 锁定输入

```text
file       b-24_liberator.glb
bytes      23,085,972
SHA-256    541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d
nodes      1,784
meshes     348
triangles  325,358
materials  30
images     18
animations 1
channels   2,518
```

来源为仓库 Release `80-days-source-v1`。二进制继续作为只读参考资产，不提交到分支，也不成为最终数据母体。

## 总体原则

1. 先精确复制参考模型，再逐项母体化，再逐系统改进。
2. 所有原始数值都保留来源索引和哈希。
3. 所有语义结论均由 ChatGPT 审核并记录证据。
4. 名称匹配、包围盒聚类和动画模式识别只能生成候选。
5. 候选状态固定为 `candidate-not-approved`，不得自动写入 `AircraftDNA`、`AssemblyGraph` 或 `BehaviorGraph`。
6. 参考模型的缺陷也要如实保留在精确镜像中，后续通过独立替换层修复。
7. `img2threejs` 只可用于已经确定的局部执行和浏览器 QA。

## A. 全量静态镜像

必须提取并核验：

- GLB 头、JSON chunk、BIN chunk 与每个 chunk 的哈希
- scene、node、mesh、primitive、accessor、bufferView、material、texture、image、sampler
- skins、joints、inverse bind matrices
- morph targets、weights 与目标名称
- camera、light 与使用到的扩展
- 节点稳定路径、父子关系、局部矩阵、世界矩阵
- 每个 primitive 的属性、索引、模式、材质与三角形数量
- 每个 accessor 的类型、组件类型、步长、稀疏数据、逻辑数据哈希
- 每个网格节点的局部与世界包围盒
- 整机总包围盒、轴向尺寸与参考坐标状态
- `TEXCOORD_0`、`TEXCOORD_1` 以及其它 UV 数据的逐 primitive 比较

全量明细使用 JSONL 和构建 artifact 保存。仓库只提交稳定脚本、精简摘要和审查结论，避免把几十兆审计数据长期堆入 Git 历史。

## B. 动画全量蒸馏

全部 2,518 条动画通道必须记录：

- animation index 与名称
- sampler index
- target node、稳定路径与 target path
- input 与 output accessor
- interpolation
- key count
- 起止时间与持续时间
- 输出类型和维度
- 输出范围
- 原始逻辑数据哈希
- `CUBICSPLINE` 切线布局
- rotation 四元数连续性与单位长度检查
- 通道目标节点的父链、子树和同级关系

同时生成：

- 动画节点子图
- 可能的旋转枢轴候选
- 可能的同步动作组
- 关键时刻采样表
- 60 FPS 重放采样摘要

这些结果先保持低级轨道语义。后续由 ChatGPT 将其整理为起落架、舱门、螺旋桨、控制面、炮塔、枪管等飞机行为。

## C. 精确镜像缓存

构建流程应将 GLB 无损拆成只读参考镜像缓存：

```text
reference-mirror/
  manifest.json
  scene.gltf.json
  buffer.bin
  images/
  hashes.json
```

缓存必须保持全部原始数组、节点和动画，能够由标准加载器重放。它属于参考适配器的构建产物，不属于飞机母体。

## D. 浏览器精确镜像工作台

建立 `b24-reference-mirror-v001` 工作台，直接显示经哈希校验的参考模型，并提供：

- 原始动画播放、暂停、逐帧和时间轴拖动
- 透视、左舷、右舷、顶部、正面、后视
- 节点树、搜索、选择、隐藏、隔离
- 选中节点的稳定路径、变换、网格、材质和动画引用
- wireframe、normal、UV 与原材质诊断模式
- 参考模型与未来 native replacement 的同机位对比槽位
- 控制台零错误检查

工作台不显示近似生成飞机，也不把自动候选写入母体。

## E. ChatGPT 语义审查队列

语义审查以飞机系统为单位分批完成：

1. 整机根、机身、左右翼、平尾与双垂尾
2. 四台发动机、短舱、整流罩、螺旋桨
3. 起落架、轮胎、舱门和收放机构
4. 炸弹舱、舱门、弹架和炸弹
5. 机鼻、背部、腹部、尾部与腰部炮位
6. 副翼、襟翼、升降舵与方向舵
7. 座舱、乘员位置、出口和内部通道
8. 玻璃、天线、灯光与小型附件

每个确认项必须含：

```text
reference_node_ids
stable_paths
reference_mesh_ids
reference_animation_channels
component_id
role
parent_component_id
confidence
evidence
reviewer
approval_status
```

## 交付物

- `scripts/distill-b24-reference-full.mjs`
- `scripts/build-b24-reference-mirror-cache.mjs`
- `data/b24-native/reference-mirror/mirror-contract.json`
- `data/b24-native/reference-mirror/semantic-review-queue.json`
- `docs/aircraft-pipeline/B24_REFERENCE_EXACT_MIRROR_SPEC.md`
- `.github/workflows/b24-reference-exact-mirror.yml`
- 构建 artifact 中的全量静态与动画报告
- 后续独立提交的浏览器精确镜像工作台

## 验收门槛

1. 输入字节数与 SHA-256 精确匹配。
2. 节点、网格、三角形、材质、图像、动画和通道数量全部匹配锁定清单。
3. 每个访问器的逻辑数据哈希可重复。
4. 全部 2,518 条动画通道可重放且目标路径不丢失。
5. 镜像缓存重载后的节点、数组、动画和世界变换与原 GLB 一致。
6. 至少十二个固定机位与关键动画时刻完成原模型对原镜像截图比较。
7. 自动候选没有进入正式母体。
8. 当前所有工程与视觉批准状态继续为 `false`。
9. PR 保持 open、Draft、未合并。
