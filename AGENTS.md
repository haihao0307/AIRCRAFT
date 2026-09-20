# AIRCRAFT repository guidance

## Authority

ChatGPT is the upstream controller. Codex is the downstream engineering executor. Follow the active task file exactly and return verifiable results through GitHub.

## Current scope

The active production aircraft is B-24J-45-CO serial 42-73436, **UBANGI BAG III**, 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force, China Theater, 1944 to 1945.

## Hard rules

1. Keep the authoritative source GLB immutable and preserve its node hierarchy, original animation, propeller channels, landing-gear calibration, weapons nodes, materials, and textures.
2. Do not create a substitute aircraft mesh, procedural fallback aircraft, or alternate B-24 model.
3. Livery work is non-destructive. Preserve the source UV and create a separate `LiveryUV` only on approved exterior paint surfaces.
4. Exclude propellers, engine internals, wheels, tires, brakes, landing-gear mechanisms, glass, guns, turret interiors, cockpit/interior parts, lights, antennas, and small mechanical fittings from the livery atlas.
5. Keep external painted cowling and nacelle skins, fuselage skin, nose skin, wing skin, fixed tail skin, control-surface outer skins, bomb-bay doors, and exterior access panels in the livery system.
6. Every factual source, transformation, generated asset, and test result must be recorded.
7. No unrelated refactor. No silent asset substitution. No merge until upstream review.

## User review delivery

1. The primary visual acceptance deliverable is a directly clickable online HTML page.
2. Opening the supplied link must enter the interactive workbench in the browser. A ZIP archive, downloadable HTML attachment, artifact card, screenshot, repository file view, or setup instruction cannot replace the online HTML review entry.
3. Do not report a visual candidate as ready until its public URL returns successfully and a real browser has loaded the page, renderer, aircraft data, controls, and requested interaction.
4. Build archives and full packages are secondary records. Provide them only after an explicit package request or after the online HTML review page is already available.
5. If publication or browser verification has not completed, state that the online review page is not ready. Never present a local build result as an online delivery.
6. Keep the last accepted online page available while a new candidate is being developed. Publish new work to a separate review path until the user accepts it.
7. Once the user accepts a component, preserve its actual source files, parameters, dependency contract, and accepted evidence. Later work changes only the requested component and its genuine dependencies.

## All Mother visual-output rule

All AIRCRAFT Mothers and later production modules default to **no image generation and no image editing**. Do not generate concept images, beauty renders, preview pictures, reference images, posters, thumbnails, or still images as a substitute for the requested 3D result.

Only use an image-generation or image-editing tool when the user explicitly asks for an image in the current conversation. Requests such as “做一个看看”, “试试做一个”, “给我看成果”, “参考这个形状做一个” default to a real 3D deliverable: interactive HTML, Three.js/WebGPU workbench, procedural geometry, GLB/3D file when requested, or the relevant production source.

Screenshots may be generated internally for QA and evidence, but must not be sent as the creative deliverable unless the user explicitly asks for screenshots or images.

## Mandatory real-3D checklist

Every plan, task card, README, START_HERE, handoff, meeting note, delivery note, and acceptance checklist must include equivalent checks for all of the following:

- [ ] No generated image is being used as a substitute for the real 3D implementation.
- [ ] Production source files were actually changed.
- [ ] The user-facing result is a real interactive 3D workbench.
- [ ] The scene is rendered by the actual 3D runtime, not a still image, video, fake Canvas frame, or placeholder page.
- [ ] Camera and required controls can be operated.
- [ ] The fixed public HTTPS page and a real browser were verified.
- [ ] A screenshot-only result without the workbench is an automatic failure and must not be delivered.

When no runnable 3D candidate exists yet, continue engineering and state that the candidate is not ready. Never generate a picture to fill the gap.


## KAOPU Mother Production OS R2 — 跨仓库强制规则

本仓库全部 Mother / Codex / 子执行端同时遵守 KAOPU 中央生产制度：
`haihao0307/guilin-dem-pipeline/knowledge/MOTHER_PRODUCTION_OPERATING_SYSTEM_R2_ZH.md`

相关中央硬门禁：
- `REFERENCE_REPLICATION_NO_CREATIVE_SUBSTITUTE_GATE.md`
- `TASK_FRESHNESS_AND_NO_STALE_DELIVERY_GATE.md`

默认流程固定为：`LOCK → EXECUTE → VERIFY → PROMOTE`。

任何“按参考做 / 复刻 / 学习 / 照着做 / 不要想象补画”任务默认：
- `TASK_MODE=REPLICATION_LOCKED`
- `CREATIVE_AUTHORIZATION=false`

未经用户当前任务明确授权，不得自行简化、补画、重新设计、做 generic/toy/placeholder，也不得为了“先给用户看”制造一个差不多的可见替身。未知区域保持 UNKNOWN / SOURCE_ENTRY_REQUIRED / MEASUREMENT_REQUIRED。被拒绝的创作替代不得成为下一版父节点。

任何“这是最新结果 / 昨晚做的 / 本轮修改后的效果”必须证明发生在当前任务 dispatch 之后，并绑定当前 head。旧模型、旧页面、旧截图、旧 release 只能作为 BASELINE/BEFORE；没有新成果时必须报告 `NO_NEW_ARTIFACT`，不得拿旧产物填空。最新构建失败时不得 silent fallback 后把旧版冒充当前版。

每个明确任务只处理一个 primary defect，并记录最小 Task Anchor：target、baseSha、accepted baseline、reference set、protected invariants、forbidden routes、acceptance gates。Producer 不能批准自己；候选在进入用户视野前至少通过 Contract / Freshness / Reference Fidelity / Machine gates。两次内部失败仍未解决同一 bounded task 时进入 ROOT_CAUSE_REVIEW，不继续凭感觉微调。

用户的重要纠正必须进入 regression case，避免同类错误再次由用户发现。评估进展只看目标相关 fresh delta、实际测试和门禁，不看 branch/Issue/README/截图数量。

以上为生产制度，不覆盖本仓库更严格的领域专用规则；如有冲突，用户当前明确指令与更严格冻结/安全/真值规则优先。
