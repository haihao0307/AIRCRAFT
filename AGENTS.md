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


## 用户最终交付格式：单体 HTML 双击直开（2026-09-21 永久规则）

凡是交给用户直接打开、查看、测试、验收的网页、三维工作台或演示，**最终交付本体必须是一个独立的 `.html` 文件**。用户只需双击即可运行；不得要求解压、配置路径、运行 npm/Vite/Python/local server、另外放 assets 目录或再打开第二个工具。

所有运行必需的 JavaScript、Three.js/runtime、shader、CSS、图片、数据、模型、音频和 decoder 必须在构建时封装进该 HTML（inline / data URI / base64 / typed array / compressed payload + inline decoder / Blob URL 均可）。核心运行不得依赖 CDN、远程图片/GLB/JSON、GitHub raw、localhost 或首次 service-worker 预缓存。

发布前必须真实执行 `file://` / 本地双击测试：首帧成功、关键交互可用、console 0 error、无缺失资源、无 CORS 核心失败、无需服务器、核心功能所需网络请求为 0。内部开发仍可多文件；用户交付必须 build 成一个 standalone HTML。

单文件规则不允许降低三维、物理、材质、数据或视觉质量；禁止用截图/视频/简化展示壳代替真实工作台。在线固定网址可以作为附加镜像，但不能替代 standalone HTML，也不能成为其运行前提。

若本仓库旧规则写“只交公开网址/必须服务器”，与本条冲突时以用户 2026-09-21 最新单体 HTML 指令为准。跨 Mother 完整规范见 `haihao0307/guilin-dem-pipeline@5791e1edef55b75888e783d5d355cc2cdfe277ba:knowledge/SINGLE_FILE_DOUBLE_CLICK_HTML_DELIVERY_GATE.md`。


## Mother Factory Execution Mode R3（2026-09-21 永久角色分工）

Production Mother 是执行车间，不是项目总设计者。小妈/Coordinator负责研究、复杂思考、任务拆解、方法选择、跨模块协调和验收；Production Mother 收到冻结好的 Task Anchor 后立即执行一个 bounded production defect，修改源码/数据/几何、跑测试、写 receipt，再领取下一个明确任务。

`thinking / still thinking / analyzing / waiting / cannot think / unable to think` 不再是合法生产状态。若当前模型/会话/工具确实无法继续，必须立即返回 `EXECUTOR_CAPABILITY_BLOCKED`，包含 taskId、baseSha、已完成 artifact、下一条具体 command、实际能力/工具限制；不得长时间原地思考，不得自主降模型、降画质、降门槛或换对象。模型切换由协调层决定。

已有明确 Task Anchor 时禁止重新写 master plan、重新选题或等待用户反复说“继续”。首轮必须实际执行 first command / source diff / numeric probe，或者给出精确 BLOCKED_VALID。一个 Mother 一次只解决一个 primary defect；做完后按 nextTaskPointer 接下一个零件，不能自己发明下一任务。

跨 Mother 完整规范：`haihao0307/guilin-dem-pipeline@8c8635a512d6d136c202e96187f8b31d93325bd9:knowledge/MOTHER_FACTORY_EXECUTION_MODE_R3_ZH.md`。R2 的 LOCK→EXECUTE→VERIFY→PROMOTE、参考复刻、freshness、verifier、单体 HTML 等门禁全部保留；R3 只进一步锁死“Production Mother 主要职责是 EXECUTE，不是重新 THINK”。


## Complex Asset R4：禁止单一细节卡死整条生产线（2026-09-22 永久规则）

复杂资产执行 `MOTHER_PARALLEL_COVERAGE_EXECUTION_R4_ZH.md`。R3 的“一次一个 primary defect”解释为**一个 lane 一个 defect**，不是“整个复杂资产只能串行做一个局部”。一个复杂资产默认拆成 3–5 个互不冲突的工位；SPECIMEN_LOCAL / CONTACT_LOCAL 问题最多连续 2 个 bounded increments，仍不通过就 `HOLD_LOCAL` 并轮转其他独立系统，不能让一只手、一只眼、一个接缝长期卡住帽子、衣服、其他人物、材质、烟雾、动作或其他母型。

进入 MICRO_DETAIL 前必须达到 breadth floor：主要系统不能长期 UNSTARTED。物理尺寸必须量最终生成/变形后的可见世界空间几何，配置目标值不等于通过。Assembly 每 2–4 个 bounded increments 生成一次整体 heartbeat，并最终输出一个 standalone HTML。

Canonical policy: `haihao0307/guilin-dem-pipeline@885ce18fbd7ee58b4458ee49eae3f77610f92a0b:knowledge/MOTHER_PARALLEL_COVERAGE_EXECUTION_R4_ZH.md`。
