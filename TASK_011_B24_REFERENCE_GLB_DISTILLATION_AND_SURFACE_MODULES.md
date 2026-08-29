# TASK 011 · B24 参考 GLB 蒸馏与可插拔表面模块

## 目标

从锁定的 `b-24_liberator.glb` 中提取仍有价值的整机结构、节点关系、运动轨迹、材料分区、原始 UV、包围盒和部件位置，将其转译为 B24 数据原生飞机母体。GLB 只作为可追溯参考适配器，母体由结构化数据、几何配方、行为规则、语义表面与证据链组成。

## 权威参考文件

- 文件：`b-24_liberator.glb`
- 字节数：`23,085,972`
- SHA-256：`541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`
- Release：`80-days-source-v1`
- 节点：1,784
- 网格：348
- 三角形：325,358
- 材质：30
- 动画：1
- 动画通道：2,518

任何输入未通过字节数和哈希校验时，蒸馏任务必须失败并停止。

## 蒸馏输出

1. `AircraftDNA`：机型身份、坐标约定、来源适配器和当前批准状态。
2. `AssemblyGraph`：稳定部件编号、父子关系、装配接口与替换状态。
3. `BehaviorGraph`：将 GLB 动画轨道转译为语义控制器种子，不把原始节点名当作最终控制合同。
4. `SurfaceGraph`：稳定语义表面和 62 个可独立接入的表面槽位。
5. `EvidenceGraph`：每一条蒸馏数据的来源、提取方法、置信度和审批状态。
6. `reference-adapter report`：完整 GLB 清单、UV 关系、动画通道、包围盒和可替换优先级。

## 表面与 UV 原则

UV 是表面坐标接口。母体保存语义表面、参数域、方向、接缝、锚点、左右关系和兼容规则。外部生产的 UV 模块通过 `surface_id` 和 `module_id` 接入。运行时可以临时生成纹理或网格映射，生成文件不成为母体真值。

原始 `TEXCOORD_0` 和 `TEXCOORD_1` 只作参考。若两者内容相同，不得宣告存在独立涂装 UV。任何新 UV 都必须写入独立模块，保留父来源和 QA 证据。

## 首批语义行为控制器

- `propulsion.propeller-spin`
- `landing-gear.deploy`
- `landing-gear.door-sequence`
- `bomb-bay.doors`
- `payload.release`
- `flight-control.flaps`
- `flight-control.ailerons`
- `flight-control.elevators`
- `flight-control.rudders`
- `turret.azimuth`
- `turret.elevation`
- `engine.cowling-flaps`
- `crew.detach-or-exit`

## 替换优先级

1. 炮塔、机炮和乘员实体。
2. 舵面、起落架、炸弹舱门和载荷约束。
3. 机身、机翼、尾翼和发动机短舱的参数化几何配方。
4. 玻璃、内部结构和小型外部附件。
5. 原始材质与 UV 映射。

## 验收门槛

- GLB 锁定校验通过。
- 节点、网格、三角形、材质、动画和动画通道清单与锁定记录一致。
- 母体数据不包含二进制 GLB 依赖。
- 31 个首批整机部件节点均有稳定 ID 和状态。
- 13 个行为控制器均能回溯到参考通道或明确标记为新系统占位。
- 62 个表面槽位均有稳定 `surface_id`、父部件和模块接口。
- 原始 UV 只被标记为参考，独立涂装 UV 未经 QA 不得批准。
- 每个蒸馏值都有来源和置信度。
- 当前保持 `aircraftDataMasterApproved=false`、`surfaceSystemApproved=false`。
