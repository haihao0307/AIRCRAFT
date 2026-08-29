# B24 可插拔表面与 UV 模块体系

## 1. 目标

将飞机外表面从固定模型 UV 中解耦。每个重要区域拥有稳定的语义表面 ID，任何团队或生产支线都可以针对指定表面生产 UV、矢量标记、板缝、铆钉、磨损和材质程序。模块经过验证后直接接入母体，整机几何重新生成时仍能保持表面身份和历史锚点。

## 2. SurfaceGraph

`data/b24-native/surface-graph.json` 是表面入口。第一版登记 62 个槽位。每个槽位至少保存：

1. `surface_id`
2. `component_id`
3. 左右或中心侧别
4. 表面区域角色
5. 当前几何状态
6. 当前模块绑定
7. 历史锚点策略
8. 原参考模型映射状态
9. QA 与批准状态

顶点索引和三角形索引可以变化，`surface_id` 必须稳定。

## 3. SurfaceModule 合同

一个外部表面模块建议使用以下结构：

```json
{
  "schema": "haihao.aircraft/surface-module@1.0.0",
  "module_id": "b24j-co-nose-starboard-surface-v1",
  "surface_ids": ["fuselage.nose.starboard.outer"],
  "coordinate_space": "component-local",
  "parameterization_type": "section-loft",
  "orientation": {
    "u_direction": "aft-to-forward",
    "v_direction": "lower-to-upper"
  },
  "seam_policy": [],
  "padding_policy": {},
  "handedness_policy": "side-specific",
  "semantic_anchors": [],
  "source_refs": [],
  "compatibility": {},
  "qa_status": "pending"
}
```

模块可以包含：

1. 参数域与映射函数。
2. 自定义 UV 坐标。
3. 矢量涂装路径。
4. 文字和编号轮廓。
5. 板缝、铆钉和检修盖板程序。
6. 粗糙度、金属度、法线与高度程序。
7. 历史时间状态和左右舷差异。
8. 网格三角面或曲面参数的派生映射。

## 4. UV 的角色

UV 是一种可选的二维表面坐标实现。母体优先保存语义表面和参数域。编译器可以根据运行目标生成：

1. `TEXCOORD_n` 属性。
2. 临时 atlas。
3. Canvas 贴图。
4. GPU 程序化表面。
5. 矢量路径的直接几何或 shader 表达。

如果某个生产支线提供经过批准的 UV 模块，编译器按模块的表面 ID、方向和接缝合同接入。模块无需修改整架飞机的其它表面。

## 5. 原参考模型 UV 审计

第一轮权威 GLB 蒸馏发现：

```text
同时包含 TEXCOORD_0 和 TEXCOORD_1 的图元  299
两套坐标的解码关系                         完全相同
独立涂装 UV                                未发现
```

因此原模型 UV 只能提供定位和分区参考。旧项目创建的八节点 `LiveryUV` 仍处于 `review-required`，其平面投影存在共享顶点跨接缝和三角形插值风险。它不进入数据母体。

## 6. 左右舷规则

1. 左右表面拥有不同 `surface_id`。
2. 历史涂装默认禁止自动镜像。
3. 几何只有在原厂资料明确对称时允许复用参数。
4. UV 模块必须声明手性和方向。
5. 同一图案在左右表面分别保存锚点和变形。
6. 时间累积标志必须声明 `mission_state_id`。

## 7. 接缝与共享顶点

语义接缝先于网格接缝定义。编译器在生成运行时几何时可以复制接缝顶点，从而允许两侧拥有独立参数坐标。几何位置保持一致，顶点身份可以因表面接口而分离。

任何要求同时冻结 position、normal、index 数组并创建新的非镜像 UV 岛的任务，都需要先判断共享顶点是否跨越语义接缝。发生冲突时，数据母体允许值保持的接缝顶点复制，并要求记录父顶点、复制原因和表面归属。

## 8. 模块目录建议

```text
data/b24-native/surface-modules/
  fuselage/
  wing/
  empennage/
  propulsion/
  bomb-bay/
  armament-fairings/
  instances/
    80-days/
    ubangi-bag-iii/
```

通用结构模块和具体历史实例模块分开保存。通用模块定义板缝、铆钉和表面参数，实例模块定义名称、队徽、序号、任务标志和时间状态。

## 9. QA 门槛

每个模块进入整机前需要通过：

1. `surface_id` 存在且侧别正确。
2. 单位、坐标空间和方向明确。
3. 接缝、padding 和边缘安全距离明确。
4. 左右舷无未经批准的镜像。
5. UV 无越界、无意外重叠和长三角跨岛插值。
6. 语义锚点能在几何重建后重新定位。
7. 历史标记能够回溯到证据和任务状态。
8. 运行时生成结果通过多角度浏览器检查。
9. 模块替换不会改变其它表面的输出。
10. 所有派生图像和网格保留父模块版本。

## 10. 当前状态

62 个槽位已经建立，模块编译器和首个垂直尾翼模块等待下一阶段实现。原参考模型 UV 继续保留在参考适配器中，`independentLiveryUvApproved=false`。
