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

1. 入库并校准B24总体图、三视图和尾翼相关手册页面。
2. 在精确参考网页中人工定位双垂尾与方向舵的节点子树和动作轨道。
3. 依据图纸建立第一版垂尾GeometryRecipe。
4. 完成安装接口、方向舵轴线、八个蒙皮表面和实时颜色调节。
5. 进行固定视角、固定时间、多视图、拆装和浏览器验收。

任何新GeometryRecipe都要保留证据、派生过程和未批准字段。任何未明确区域保持`unresolved`。
