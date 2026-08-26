# B24 数据原生生产线索引

## 总控与任务

- `TASK_011_B24_REFERENCE_GLB_DISTILLATION_AND_SURFACE_MODULES.md`
- `TASK_012_B24_REFERENCE_FULL_MIRROR_AND_ANIMATION_DISTILLATION.md`
- `docs/aircraft-pipeline/B24_DATA_NATIVE_MASTER.md`
- `docs/aircraft-pipeline/B24_REFERENCE_GLB_DISTILLATION.md`
- `docs/aircraft-pipeline/B24_REFERENCE_FULL_MIRROR.md`
- `docs/aircraft-pipeline/B24_SURFACE_MODULE_SYSTEM.md`
- `docs/aircraft-pipeline/B24_MODULAR_ASSEMBLY_ARCHITECTURE.md`

## 母体数据

- `data/b24-native/aircraft-master.json`
- `data/b24-native/assembly-graph.json`
- `data/b24-native/behavior-graph.json`
- `data/b24-native/surface-graph.json`
- `data/b24-native/evidence-graph.json`

## 参考适配器与严格镜像

- `data/b24-native/reference-adapters/authoritative-glb.json`
- `data/b24-native/reference-mirror-contract.json`
- Release `80-days-source-v1/b-24_liberator.glb`
- `reports/b24-native/reference-glb-distillation-baseline.json`
- `reports/b24-native/reference-full-mirror-baseline.json`

## 表面模块

- `data/b24-native/surface-modules/empennage/vertical-tail-module.template.json`

## 可重复工具

- `scripts/validate-b24-native-contracts.mjs`
- `scripts/distill-b24-reference-glb.mjs`
- `scripts/extract-b24-reference-full-mirror.mjs`
- `scripts/validate-b24-reference-full-mirror.mjs`
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

## 当前状态

```text
AssemblyGraph                    31 nodes
BehaviorGraph                    13 controllers
SurfaceGraph                     62 slots
GLB production runtime link      disabled
strict structural mirror         local extraction passed
remote Actions mirror evidence   pending
exact replay browser             pending
legacy UV authority              reference-only
rough primitive prototype        retired
```

## 下一生产阶段

先完成镜像数据的精确浏览器重放，再进行发动机短舱、机鼻、双垂尾、炮塔、起落架和炸弹舱的人工语义映射。任何新 GeometryRecipe 都要与镜像参考件做固定视角、固定时间和多通道 A/B 检查。
