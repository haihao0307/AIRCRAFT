# B24 参考样机全量镜像规范

## 1. 定位

全量镜像是锁定参考 GLB 与数据原生飞机母体之间的保真桥梁。它保存参考样机的全部可读取事实，同时阻止自动猜测进入 AircraftDNA、AssemblyGraph、GeometryRecipe、BehaviorGraph 和 SurfaceGraph。

全量镜像完成后，浏览器可以在不读取 GLB 容器的条件下重放同一场景、几何、材质和动画。随后再由上游逐系统分析、命名和替换。

## 2. 数据层

### 2.1 来源锁

参考文件必须同时通过：

- 文件名
- 字节数
- SHA-256
- 场景清单
- 节点清单
- 网格和三角形清单
- 材质与图像清单
- 动画通道清单

任何一项变化都会停止提取。

### 2.2 场景图

`scene-graph.json` 保存：

- scene 根节点
- 全部 node 原始字段
- 父节点
- 稳定路径
- 解析后的局部矩阵
- 解析后的世界矩阵

稳定路径包含节点名和源节点索引，避免重名造成歧义。

### 2.3 网格合同

`meshes.json` 保存：

- mesh 索引和名称
- primitive 索引
- drawing mode
- attribute 到 accessor 的映射
- index accessor
- material 索引
- morph target
- triangle count

这一层不修改顶点，不重算法线，不合并网格，也不改变索引。

### 2.4 原生访问器载荷

`reference-accessor-payload.bin` 保存全部 accessor 的紧密排列字节。

规则：

1. 每个 accessor 从原 buffer view 和 stride 中逐元素抽取。
2. 数据不进行数值转换。
3. 每个唯一数据块以 SHA-256 寻址。
4. 相同数据块允许去重。
5. 数据块使用四字节对齐。
6. `accessors.json` 保存原 accessor 元数据与新数据块位置。

该格式属于项目自己的参考镜像载荷。它服务于精确重放和差异分析，不直接成为最终几何配方。

### 2.5 材质与图像

`source-assets.json` 保存 glTF 材质、纹理、采样器和图像之间的原始引用。18 个嵌入图像按原始字节提取，并分别记录 SHA-256。

这些图像属于参考证据。未来 SurfaceProgram 可以重新生成材质和表面，但每次替换需要保留与参考表面的对照。

### 2.6 动画

`animations.json` 保存：

- animation 索引和名称
- timeline 范围
- sampler 的 input、output 和 interpolation
- channel 的 target node 和 target path
- 稳定节点路径

动画数据继续引用 `accessors.json` 中的精确载荷。任何行为语义都需要后续人工审查。

## 3. 语义安全

`semantic-candidates.json` 只保存搜索候选。

每个候选组同时记录：

- 直接名称命中
- 这些命中节点包含的完整子树
- 动画通道数量
- mesh 关联

所有组固定使用：

```text
status = candidate-only-upstream-review-required
automatic_approval = false
```

关键词命中不等于飞机部件认定。炮塔、机炮和乘员当前没有直接名称命中，继续保持 unresolved。

## 4. 精确重放协议

精确重放器需要实现 glTF 中本参考文件实际使用的能力：

- node hierarchy
- TRS 和 matrix
- indexed triangle primitives
- POSITION
- NORMAL
- TEXCOORD_0
- TEXCOORD_1
- materials
- embedded images
- translation animation
- rotation animation
- scale animation
- LINEAR 或源文件声明的插值

实现后需要进行两类比较。

### 4.1 数据比较

- accessor 哈希
- 节点矩阵
- primitive 绑定
- material 和 texture 绑定
- 动画时间与关键帧

### 4.2 浏览器比较

固定相机、固定时间和固定渲染参数，同时渲染参考 GLB 与镜像重放器。

至少输出：

- Base Color
- depth
- world normal
- component ID

任何结构缺失、机头多余物体、发动机舱错误、控制面错位和动作方向错误都会成为阻断项。

## 5. 替换原则

参考镜像按系统逐步被原生实现替换。每个替换件必须满足：

1. 有稳定 `component_id`。
2. 有来源证据。
3. 有与参考节点的映射。
4. 有独立 GeometryRecipe。
5. 有独立 BehaviorGraph 目标。
6. 有稳定 SurfaceGraph 槽位。
7. 有参考件与新件 A/B 证据。
8. 质量达到参考样机或高于参考样机。

替换过程中可以保留混合状态。已通过的系统使用原生实现，尚未通过的系统继续使用镜像参考数据。

## 6. Image2ThreeJS 的使用边界

Image2ThreeJS 可以在结构已经确定后执行局部程序化表达、转台截图和浏览器检查。其项目入口由外部工具登记保存。fileciteturn127file0

它不能：

- 推断整机结构
- 自动判断发动机短舱
- 自动决定炮塔和机炮节点
- 自动补全隐藏区域
- 批准几何替换
- 批准动画语义

## 7. 当前状态

本地权威文件提取与独立验证已经通过。远端 Actions artifact 和精确重放浏览器尚待完成，因此所有视觉、行为和替换批准继续保持 false。
