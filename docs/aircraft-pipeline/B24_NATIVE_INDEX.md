# B24 数据原生生产线索引

## 总控与任务

- `TASK_011_B24_REFERENCE_GLB_DISTILLATION_AND_SURFACE_MODULES.md`
- `TASK_012_B24_REFERENCE_FULL_MIRROR_AND_ANIMATION_DISTILLATION.md`
- `TASK_013_AIRCRAFT_NATIVE_FORGE_FOUNDATION_AND_VERTICAL_TAIL_PILOT.md`
- `docs/aircraft-pipeline/AIRCRAFT_NATIVE_FORGE_ARCHITECTURE.md`
- `docs/aircraft-pipeline/B24_DATA_NATIVE_MASTER.md`
- `docs/aircraft-pipeline/B24_REFERENCE_GLB_DISTILLATION.md`
- `docs/aircraft-pipeline/B24_REFERENCE_FULL_MIRROR.md`
- `docs/aircraft-pipeline/B24_SURFACE_MODULE_SYSTEM.md`
- `docs/aircraft-pipeline/B24_MODULAR_ASSEMBLY_ARCHITECTURE.md`

## 通用 Aircraft Native Forge 数据

- `data/aircraft-native/forge-policy.json`
- `data/aircraft-native/reusable-system-library.json`
- `data/aircraft-native/schemas/component-production-contract.schema.json`

## B24 母体数据

- `data/b24-native/aircraft-master.json`
- `data/b24-native/assembly-graph.json`
- `data/b24-native/behavior-graph.json`
- `data/b24-native/surface-graph.json`
- `data/b24-native/evidence-graph.json`

## 首个组件

- `data/b24-native/components/empennage/vertical-tail-production.json`
- `data/b24-engineering/components/vertical-tail.json`
- `data/b24-native/surface-modules/empennage/vertical-tail-module.template.json`

## 垂尾来源入库与审核

### 第一轮 PDF 入库

- `docs/aircraft-pipeline/B24_VERTICAL_TAIL_SOURCE_INTAKE.md`
- `docs/aircraft-pipeline/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.md`
- `data/b24-engineering/source-intake/vertical-tail-priority-sources.json`
- `data/b24-engineering/source-intake/results/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.json`
- `scripts/intake-engineering-sources.mjs`
- `.github/workflows/b24-vertical-tail-source-intake.yml`

结果：

- `B24-ENG-S002` 的 Model 32 总体布置图已下载、锁定和审核，可用于有限候选研究，生产几何批准仍为 false。
- `B24-ENG-S003` 经逐页检查确认为混合出版物和混合变型汇编，已降为 D 级比较资料，禁止控制生产几何。

### 官方 B-24J 三视图

- `docs/aircraft-pipeline/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.md`
- `data/b24-engineering/source-intake/b24j-official-three-view.json`
- `data/b24-engineering/source-intake/results/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.json`
- `scripts/intake-engineering-images.mjs`
- `.github/workflows/b24j-official-three-view-intake.yml`

结果：

- `B24-ENG-S016` 已从 `AN 01-5E-3` 第 ix 页来源链下载原始扫描和清理版。
- 原始扫描和清理版均已锁定字节、SHA256 和 2032 x 2442 像素尺寸。
- B-24J 有限正投影轮廓研究已经批准。
- 完整手册页核对、绝对标定和生产几何使用仍为 false。

### 冲突账本

- `data/b24-engineering/source-intake/results/B24J_CO_VERTICAL_TAIL_SOURCE_CONFLICTS.json`

当前阻断冲突：

```text
B24-ENG-S002 垂尾总面积候选   181.2 sq ft
B24-ENG-S016 垂尾总面积标注   188 sq ft
状态                            unresolved
```

禁止凭偏好选择一个数。必须通过版本、适用构型和面积定义核对解决。

## 参考适配器与严格镜像

- `data/b24-native/reference-adapters/authoritative-glb.json`
- `data/b24-native/reference-mirror-contract.json`
- Release `80-days-source-v1/b-24_liberator.glb`
- `reports/b24-native/reference-glb-distillation-baseline.json`
- `reports/b24-native/reference-full-mirror-baseline.json`
- `preview/b24-reference-exact/online.html`

## 可重复工具

- `scripts/validate-aircraft-native-forge-policy.mjs`
- `scripts/validate-b24-vertical-tail-source-review.mjs`
- `scripts/apply-b24-source-register-review.mjs`
- `scripts/validate-b24-native-contracts.mjs`
- `scripts/distill-b24-reference-glb.mjs`
- `scripts/extract-b24-reference-full-mirror.mjs`
- `scripts/validate-b24-reference-full-mirror.mjs`
- `.github/workflows/aircraft-native-forge-policy.yml`
- `.github/workflows/b24-source-register-review.yml`
- `.github/workflows/b24-data-native-distillation.yml`
- `.github/workflows/b24-reference-full-mirror.yml`

## 当前参考镜像基线

```text
source scenes             1
source nodes              1,784
source meshes             348
source triangles          325,358
source accessors          6,702
source animation channels 2,518
source animation samplers 2,518
native packed blocks      2,383
native mirror bytes       12,509,172
semantic auto approvals   0
```

## 当前方向

```text
active framework                    Aircraft Native Forge
AssemblyGraph                       31 nodes
BehaviorGraph                       13 controllers
SurfaceGraph                        62 slots
strict reference viewer             online and source-locked
first native component              twin vertical tail and rudders
rough primitive prototype           retired
```

## 下一生产阶段

1. 取得或核对 `AN 01-5E-3` 第 ix 页完整页面上下文。
2. 从原始扫描定义三组正投影视图的精确像素区域。
3. 为平面、侧面和前面或后面分别建立标定变换。
4. 解决 181.2 与 188 平方英尺的面积冲突。
5. 入库尾翼结构、安装、铰链和蒙皮相关手册页。
6. 在精确参考网页中人工定位双垂尾与方向舵节点子树和动作轨道。
7. 依据批准来源建立第一版垂尾 GeometryRecipe。
8. 完成安装接口、方向舵轴线、八个蒙皮表面和实时颜色调节。
9. 执行固定视角、固定时间、多视图、拆装和浏览器验收。

任何新 GeometryRecipe 都要保留证据、派生过程和未批准字段。任何未明确区域保持 `unresolved`。
