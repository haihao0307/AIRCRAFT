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
- `docs/aircraft-pipeline/B24_VERTICAL_TAIL_SOURCE_INTAKE.md`
- `docs/aircraft-pipeline/EXTERNAL_METHOD_STUDY_IMG2THREEJS.md`

## 通用Aircraft Native Forge数据

- `data/aircraft-native/forge-policy.json`
- `data/aircraft-native/reusable-system-library.json`
- `data/aircraft-native/schemas/component-production-contract.schema.json`

## B24母体数据

- `data/b24-native/aircraft-master.json`
- `data/b24-native/assembly-graph.json`
- `data/b24-native/behavior-graph.json`
- `data/b24-native/surface-graph.json`
- `data/b24-native/evidence-graph.json`

## 首个组件

- `data/b24-native/components/empennage/vertical-tail-production.json`
- `data/b24-engineering/components/vertical-tail.json`
- `data/b24-native/surface-modules/empennage/vertical-tail-module.template.json`

## 垂尾优先图纸入库

- `data/b24-engineering/source-intake/vertical-tail-priority-sources.json`
- `scripts/intake-engineering-sources.mjs`
- `.github/workflows/b24-vertical-tail-source-intake.yml`
- artifact `b24-vertical-tail-priority-source-intake`

入库对象：

- `B24-ENG-S002`, `D-1840 / RD-6894`, Model 32 General Arrangement
- `B24-ENG-S003`, B-24 three-views, wing and undercarriage details

PDF在权属、标题栏、适用性和标定审核完成前只保存在短期Actions artifact中。

## 参考适配器与严格镜像

- `data/b24-native/reference-adapters/authoritative-glb.json`
- `data/b24-native/reference-mirror-contract.json`
- Release `80-days-source-v1/b-24_liberator.glb`
- `reports/b24-native/reference-glb-distillation-baseline.json`
- `reports/b24-native/reference-full-mirror-baseline.json`
- `preview/b24-reference-exact/online.html`

## 可重复工具

- `scripts/validate-aircraft-native-forge-policy.mjs`
- `scripts/validate-b24-native-contracts.mjs`
- `scripts/distill-b24-reference-glb.mjs`
- `scripts/extract-b24-reference-full-mirror.mjs`
- `scripts/validate-b24-reference-full-mirror.mjs`
- `.github/workflows/aircraft-native-forge-policy.yml`
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
Image2ThreeJS active integration    disabled
Image2ThreeJS retained role         external method study only
AssemblyGraph                       31 nodes
BehaviorGraph                       13 controllers
SurfaceGraph                        62 slots
strict reference viewer             online and source-locked
first native component              twin vertical tail and rudders
rough primitive prototype           retired
```

## 下一生产阶段

1. 运行垂尾优先图纸入库工作流，取得PDF哈希、页数、文本和逐页渲染。
2. 审核标题栏、修订、比例、B24J-CO适用性和扫描畸变。
3. 在精确参考网页中人工定位双垂尾与方向舵节点子树和动作轨道。
4. 依据批准图纸建立第一版垂尾GeometryRecipe。
5. 完成安装接口、方向舵轴线、八个蒙皮表面和实时颜色调节。
6. 进行固定视角、固定时间、多视图、拆装和浏览器验收。

任何新GeometryRecipe都要保留证据、派生过程和未批准字段。任何未明确区域保持`unresolved`。
