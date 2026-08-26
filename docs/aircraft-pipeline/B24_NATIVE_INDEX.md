# B24 数据原生生产线索引

## 总控与任务

- `TASK_011_B24_REFERENCE_GLB_DISTILLATION_AND_SURFACE_MODULES.md`
- `docs/aircraft-pipeline/B24_DATA_NATIVE_MASTER.md`
- `docs/aircraft-pipeline/B24_REFERENCE_GLB_DISTILLATION.md`
- `docs/aircraft-pipeline/B24_SURFACE_MODULE_SYSTEM.md`
- `docs/aircraft-pipeline/B24_MODULAR_ASSEMBLY_ARCHITECTURE.md`

## 母体数据

- `data/b24-native/aircraft-master.json`
- `data/b24-native/assembly-graph.json`
- `data/b24-native/behavior-graph.json`
- `data/b24-native/surface-graph.json`
- `data/b24-native/evidence-graph.json`

## 参考适配器

- `data/b24-native/reference-adapters/authoritative-glb.json`
- Release `80-days-source-v1/b-24_liberator.glb`
- `reports/b24-native/reference-glb-distillation-baseline.json`

## 表面模块

- `data/b24-native/surface-modules/empennage/vertical-tail-module.template.json`

## 可重复工具

- `scripts/validate-b24-native-contracts.mjs`
- `scripts/distill-b24-reference-glb.mjs`
- `.github/workflows/b24-data-native-distillation.yml`

## 当前基线

```text
AssemblyGraph       31 nodes
BehaviorGraph       13 controllers
SurfaceGraph        62 slots
GLB runtime link    disabled
legacy UV authority reference-only
```

## 下一生产件

双垂直安定面与方向舵总成。该部件用于同时验证外形数据、左右手性、固定面与活动面、铰链轴、整机安装接口、表面模块和历史尾标锚点。
