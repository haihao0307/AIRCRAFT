# TASK 009 · 独立历史涂装生产线 V1

## 任务目标

在 AIRCRAFT 仓库中建立第二条长期直线生产任务，专门管理历史涂装及其全部上下文资料。该生产线与飞机本体生产线平行运行，数据和资产不依赖任何具体三维飞机文件。

涂装线必须覆盖：

- 飞机身份与批次
- 空军、轰炸大队、轰炸中队与战区层级
- 机组、人员、地勤、照片人物与机身姓名标记
- 历史事件、任务、损伤、修理、转场与拍摄时间线
- 原始照片、档案来源、裁切、证据等级与推断记录
- 左右舷独立涂装、编号、单位标志、机鼻绘与任务标记
- 任务时态冻结
- PBR 贴图、透明贴花和可编辑蒙版
- 历史审核、贴图审核、版本与谱系
- 可直接交给飞机消费端的独立涂装包

## 两条生产线的边界

### 飞机本体线

负责三维表面、机构、动画、飞行、起降、炮塔、武器、起落架、螺旋桨、材质运行时和网页渲染。

### 历史涂装线

负责历史资料、人物关系、事件时间线、证据、图形复原、贴图和导出包。

涂装线禁止保存或修改：

- 飞机二进制文件
- 渲染层级或节点名
- 表面几何
- 动画通道
- 目标材质槽
- 目标纹理坐标
- 特定网页运行时代码

消费端必须提供自己的外部绑定适配器。适配器把标准语义区域映射到该飞机实现的表面。适配器不属于涂装包。

## 十段直线状态机

生产顺序固定为：

```text
飞机身份
→ 部队编制
→ 机组与人物
→ 事件与任务
→ 照片与证据
→ 涂装复原
→ 时态冻结
→ 贴图与蒙版
→ 历史验收
→ 独立包导出
```

每一段必须有状态、证据、负责人、输入、输出和阻塞原因。后段不得绕过前段的阻塞门槛。

## 首批记录

### “80 DAYS”

- Consolidated B-24J-25-CO
- Serial 42-73257
- Aircraft No. 487
- Fourteenth Air Force
- 308th Bomb Group
- 374th Bomb Squadron
- China Theater, 1944

继续保留当前 E01 至 E08 证据、任务时态和标记语义。把 `ROBBY`、`HUFF`、`STAM` 作为待解析的机身姓名标记保存，未取得直接证据前不得推断为完整人员身份。

### UBANGI BAG III

- Consolidated B-24J-45-CO
- Serial 42-73436
- Fourteenth Air Force
- 308th Bomb Group
- 374th Bomb Squadron
- China Theater, 1944 to 1945

保留飞机身份。现有 V1 图形继续标记为流程测试材料。V2 必须通过历史照片、人物、事件、左右舷和任务时态研究后再进入贴图生产。

## 目录与合同

建立并维护：

```text
docs/livery-line/README.md
schemas/historical-livery-record.schema.json
data/livery-line/catalog.json
data/livery-line/package-template.json
data/livery-line/records/*.json
scripts/validate-livery-line.mjs
public/livery-production-line.html
```

`data/livery-line/records/` 是涂装线的权威结构化入口。原有 `data/aircraft/308bg/` 文件在迁移完成前只作为历史输入和兼容资料，后续应逐步变成指向新记录的薄兼容层。

## 网页要求

在飞机生产线入口中新增一条清晰的“历史涂装生产线”直线，并提供独立详情页。

详情页必须：

- 以十段横向流程显示生产状态
- 显示空军、大队、中队、飞机、机组、人物、事件、证据和导出状态
- 可以在 “80 DAYS” 与 UBANGI BAG III 之间切换
- 明确区分已锁定事实、待研究、推断、流程测试和已批准成品
- 明确显示当前没有任何目标三维资产依赖
- 明确显示最终包由飞机消费端通过外部适配器应用
- 不加载三维飞机，不因权威飞机二进制缺失而阻塞资料浏览

## 独立导出包

最终成品必须符合 `haihao.livery/package@1.0`，至少包含：

```text
manifest.json
identity.json
organization.json
crew.json
events.json
evidence.json
markings.json
mission-state.json
provenance.json
decals/
textures/
masks/
previews/
checksums.sha256
```

贴图至少支持 Base Color、Normal、Roughness、Height、可选 AO、可选 Metallic，以及可编辑标记蒙版和旧化蒙版。

所有图形必须支持左右舷分别制作。任何自动镜像都必须经过证据批准。

## 历史资料规则

1. 事实、推断和未知项必须分栏记录。
2. 每个历史事件必须带来源或明确标记为待研究。
3. 每个人物必须有独立 personId。机身文字在身份未确认时只能记录为 nameMarking。
4. 一张派生裁切必须记录父证据与变换过程。
5. 生成图、现代复原图和其他飞机只能作为参考，不能证明本机事实。
6. 任务标记和胜利标记必须绑定单一时间状态。
7. 修订历史身份、人员关系和事件时，必须保留版本与变更说明。

## 验收门槛

1. `npm test` 包含独立涂装线验证并通过。
2. 涂装记录包含 identity、organization、crew、events、evidence、livery 和 export。
3. 所有 catalog 记录路径存在，ID 一致。
4. `data/livery-line/` 中没有飞机二进制、层级、表面几何、动画、目标材质槽或目标纹理坐标依赖键。
5. 网页在没有飞机二进制的环境中正常打开并显示两架飞机的历史状态。
6. “80 DAYS” 的未解析姓名不得被当作实名机组。
7. UBANGI BAG III 的 V1 图形不得被标为最终历史批准。
8. 导出包模板清楚规定消费端绑定责任。
9. 本任务不得改动飞机本体、炮塔、动画、几何或权威资产状态。
10. 保持 PR 为 Draft，完成代码和真实浏览器验收前不得合并。
