# B24 金属机身与草地机场 R1 全量交接起点

本目录冻结 2026-09-03 的 `B24_METAL_GRASS_MISSION_R1` 状态，供归档、回看和后续有选择地提取成果。它不是用户已经批准的生产基线。

## 当前在线审查入口

https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-metal-grass-mission-r1/

## 冻结身份

- 源分支：`feature/b24-metal-grass-mission-r1-20260903`
- 源提交：`8ea0a34d016c46570e3916e37f587b2c7fb14ccf`
- 构建：`B24_METAL_GRASS_MISSION_R1`
- 整机数字载荷：16,647,376 bytes
- 整机数字载荷 SHA-256：`7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`
- 技术浏览器检查：30/30 通过，GitHub Actions run `33733439863`
- 用户视觉批准：`false`
- productionReady：`false`

## 重要边界

这份 R1 使用当前已恢复的整机审查资产继续工作，精确 `B24_V016_COMPLETE_WORKBENCH.html` 原件仍未恢复。全量包必须诚实保留这一点。

Weather Mother 尚未接入。没有加入山体。Weapons Mother 与 img2threejs 路线均被排除。

## 全量包内容

发布工作流会从已通过的浏览器证据制品中提取完整工作台、同源渲染依赖、整机压缩数据、任务与声音代码、九张浏览器截图、30 项检查报告和 QA 工具，同时收录当前整机审查源页、在线发布清单、执行手册、重新开线边界、逐文件 SHA-256 清单和本地启动脚本。

全量包将作为 GitHub Release 资产发布，标签为：

`b24-metal-grass-mission-r1-handoff-20260903`

## 下一条生产线

归档完成以后，从独立的 clean restart 分支重新开线。新生产线不自动继承 R1 的视觉决定，也不删除本归档。任何可复用内容都需要按组件明确选择，并保留真实来源与边界。
