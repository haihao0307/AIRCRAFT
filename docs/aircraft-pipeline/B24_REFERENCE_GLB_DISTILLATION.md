# B24 参考 GLB 第一轮蒸馏

## 1. 输入

本轮使用 GitHub Release `80-days-source-v1` 中的锁定参考文件：

```text
file    b-24_liberator.glb
bytes   23,085,972
sha256  541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d
```

任何字节数或哈希不一致的文件都会被蒸馏脚本拒绝。

## 2. 已提取清单

```text
nodes               1,784
meshes                348
triangles          325,358
materials              30
embedded images         18
animations               1
animation channels   2,518
```

蒸馏脚本同时输出：

1. 节点路径、父子关系、局部变换和世界位置。
2. 网格与图元清单、材质分配、顶点数和三角形数。
3. 世界包围盒。
4. 动画通道目标、属性、插值、关键帧数和时间范围。
5. 语义行为控制器的候选节点集合。
6. UV0、UV1 和图元属性关系。

## 3. UV 发现

第一轮真实解码结果：

```text
同时存在 TEXCOORD_0 与 TEXCOORD_1 的图元  299
两套坐标相同的图元                         299
两套坐标不同的图元                           0
```

这说明源模型中的第二套 UV 没有提供独立涂装参数域。旧 UV 继续用于模型定位与分区参考。B24 数据母体使用 62 个语义表面槽位和独立 SurfaceModule 合同。

## 4. 可以蒸馏进母体的信息

### 4.1 节点与装配参考

节点层级、相对变换和世界包围盒可以帮助建立部件位置候选。进入 AssemblyGraph 前需要重新命名、归类和验证。

### 4.2 动画参考

2,518 条动画通道可以帮助提取：

1. 起落架动作顺序。
2. 舱门先后关系。
3. 螺旋桨旋转轴与转向。
4. 舵面和襟翼运动方向。
5. 整流罩襟片动作。
6. 机构运动时长和相对时间。

母体将这些信息转成语义 BehaviorGraph。原动画剪辑和原节点名不成为公开控制接口。

### 4.3 几何测量参考

网格和包围盒可以帮助估算整机比例、部件位置、开口位置和第一版形状参数。原厂图纸到位后逐项替换估算值。

### 4.4 材质与表面参考

材质和 UV 分配可以辅助识别玻璃、金属外皮、机械件和内部件的现有分区。最终表面身份由 SurfaceGraph 控制。

## 5. 需要优先替换的区域

### 第一组

1. 炮塔与机炮。
2. 乘员实体、座位和离机路径。
3. 炸弹架与载荷约束。
4. 对外控制接口。

这些区域直接暴露原模型难以拆分和修改的问题。

### 第二组

1. 舵面。
2. 起落架。
3. 炸弹舱门。
4. 螺旋桨与整流罩襟片。

这一组保留运动参考，机构和状态机重新实现。

### 第三组

1. 机身。
2. 机翼。
3. 平尾和双垂尾。
4. 发动机短舱。

这一组先蒸馏测量，再由 GeometryRecipe 和原厂资料替换。

## 6. 数据母体结果

第一版数据原生基础已经形成：

```text
AssemblyGraph nodes       31
BehaviorGraph controllers 13
SurfaceGraph slots        62
```

31 个节点构成一架完整但较薄的 B24。后续每完成一个部件，就用批准的 GeometryRecipe、BehaviorGraph 和 SurfaceModule 替换对应参考区域。

## 7. 可重复执行

执行命令：

```bash
node scripts/validate-b24-native-contracts.mjs
node scripts/distill-b24-reference-glb.mjs \
  --glb /path/to/b-24_liberator.glb \
  --out-dir reports/b24-native
```

GitHub Actions 工作流会从 Release 下载权威 GLB，重新验证哈希并生成完整报告。GLB 本体不进入研究分支。

## 8. 当前状态

参考蒸馏可以作为派生证据使用。整机母体、几何配方、行为图和表面系统继续保持未批准状态，等待首个双垂尾与方向舵部件完成真实重建和浏览器验收。
