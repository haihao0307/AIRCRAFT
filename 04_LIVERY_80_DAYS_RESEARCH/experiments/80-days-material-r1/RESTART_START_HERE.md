# “80 DAYS” 涂装线接续 R1

日期：2026-09-05。范围：历史涂装接续与有限材质数学实验。当前对象为 B-24J-25-CO “80 DAYS”，42-73257，487，308th BG / 374th BS / Fourteenth Air Force。此目录不接管整机、飞行、机构或武器工作。

## 先认清上次停在哪里

继续使用既有分支 `feature/b24-80days-texture-master-v2`。本轮追加前 HEAD 为 `7eadf5511c8b3721f6ece46c587ac88428c93740`，可用于恢复原稿与失败对照。此提交是恢复点，未获得视觉通过。PR #13 继续保持 Draft、未合并。

必须先读 [2026-08-25 的 V2 退回意见](https://github.com/haihao0307/AIRCRAFT/pull/13#issuecomment-5410918044)。PR 正文的 review-required 不能覆盖后来的明确退回。V2 已被退回，下一视觉目标为 V3。最后人工接受的完整 “80 DAYS” 涂装版本在本次检索中未找到，状态为 unknown。

V3 要逐项解决字形与引号、嘴形和牙齿、骰子透视与点位、圆窗和 STAM 矩形窗关系、姓名标记、任务标记、真实蒙皮接缝与铆钉、骰子后方暗污渍，以及照片叠加对照。旧图的重复网格、通用字体、夸大三角形鲨鱼嘴和任意散点旧化均不得作为成品继续沿用。

## 已定位的恢复来源

| 用途 | 固定来源 |
| --- | --- |
| 退回的 V2 工作台与母版载荷 | `7eadf5511c8b3721f6ece46c587ac88428c93740` 下 `80-days-texture-master-v2.html` 和 `assets/livery/80-days/texture-master-v2/` |
| 既有分侧矢量素材 | 同提交 `assets/livery/80-days/traces/`，仅供检查与重做，不能视为已接受图形 |
| 材质与 UV 原合同 | 同提交 `docs/aircraft-pipeline/B24_80_DAYS_TEXTURE_SPEC.md`、`reports/80-days-liveryuv-qa.json` |
| 独立涂装线边界 | `3d37c59567f6f1623ac1404d062d2bdd612731a0` 下 `docs/livery-line/README.md` |
| 双语飞机和机组研究库 | `23f974acbed375bdfb1bb6acc113d55cf002f651` 下 `knowledge/aircraft/b24/80-days/` |
| 照片、人员、未决问题与来源 | 上述研究库 `data/knowledge-base.json`、`data/source-registry.json` |

本次读取了上述任务、规格、研究库和相关报告。没有宣称下载了全部大文件、解压了五份 V2 载荷，或已逐像素检查所有历史照片。旧在线预览地址已定位，本轮浏览器运行验证为 not_run。

研究库的原始照片字节与档案索引要区分。两张用户原图在原说明中位于普通 Git 历史之外；本次读取到来源与回执，未验证其原始图像字节。机身姓名标记与真实机组成员分别登记，不能根据 ROBBY、HUFF、STAM 猜实名。

现存 V2 记录与退回意见写有八面右舷旗标；本轮未重新计数，不把它升级为新的目视结论。炸弹数量仍待可复核标注。不得合并不同照片时期的数量。口腔深红等已采用重建色与黑白照片能直接支持的形状信息分别保存。

## 小妈资料接收与本线采用

已读小妈的总控入口、R1 技能目录、Aircraft 作业、导师复核相关段落和材料资源导航。位置为 `haihao0307/guilin-dem-pipeline` 的 `handoff/xiaoma-mentor-v1.1-20260905`，入口 `docs/mother_coordination/mentor-v1.1/README.md`，R1 目录为 `docs/mother_coordination/learning-r1-20260905/`。

采用的有限方法：固定相机、尺度和光照比较；用明确失败样本检验修正；来源、候选实现、测试和人工接受分开；保留恢复点；不把协调分支合入生产。资源导航 R13 的 PBRT 材质与照明路线、R14 的受控参数比较、R15 的跨工具材质表达及 R16 的程序化材质入口可继续按本线问题深入。本轮没有完整读完这些书籍或软件文档。

补充查读的英文官方原文：

- [Epic Physically Based Materials](https://dev.epicgames.com/documentation/en-us/unreal-engine/physically-based-materials-in-unreal-engine)：Metallic 与 Roughness。完整漆层按非金属处理，露出金属的区域分别处理；粗糙度承担反射变化。
- [Three.js Color Management](https://threejs.org/manual/en/color-management.html)：Base Color 的 sRGB 与非颜色贴图分开，颜色空间错误不能靠调灯掩盖。
- Blender Principled 官方页本轮直读返回 402。Blender、Unreal Engine 的软件实操均为 not_run；未修改项目引擎或依赖版本。

## 本次实际实现与验证

`material-channels.mjs` 为独立实验模块，没有接入旧工作台，也没有覆盖旧母版。

`paintCoverageToMetalness` 只处理“不透明介质漆层覆盖裸金属”的有限情形。完整漆面输出 0，裸金属输出 1，中间值只表示边界像素面积覆盖。它不模拟透明清漆、油膜、多层反射、腐蚀或长期风化。

`heightToNormals` 从高度的有限差分计算并归一化切线法线，要求显式一致的空间采样尺度，保留 OpenGL / DirectX 的 Y 分量约定。行索引沿 +V；读取顶部向下的位图时，调用端须另行核对行方向。算法不创建真实板缝或铆钉位置，不推断飞机尺寸，不修正旧 UV。默认只限制输出数组为 256 MiB；总内存与 8K 分块生产仍未测试。

`channelRoles` 记录 Base Color 为 sRGB，其余数据通道为 non-color。它只提供语义约定，尚未接入渲染器的实际纹理设置。

运行命令：

```bash
node --test experiments/80-days-material-r1/material-channels.test.mjs
```

2026-09-05 在 Node v22.16.0 本地执行，10 项通过，0 项失败。覆盖漆层和露铝、输入不变、非法覆盖率、平面中性法线、梯度方向、Y 约定切换、尺度一致性、法线归一化、单位与内存边界、通道角色。测试使用明确合成数据，仅验证当前数学与接口性质。

受测文件 SHA-256：

```text
0485aeb5c2c608e099032a0e529329982e69e5c4f0ea6acfb0a15c90ee3a0201  material-channels.mjs
c955840e83ecdbc8d7fc3991386984a01cb4c8238877a6075ed9a76bcc60cd14  material-channels.test.mjs
```

## 下一张真实视觉样片

先定位并校验所选右舷照片原件，用正确的上部矩形窗定位 STAM，并连同 “80 DAYS” 字形、骰子、鲨鱼嘴、邻近蒙皮和暗污渍逐项对齐。保留原照片与复原图的透明叠加、标尺、100% 和 200% 检查。左右舷独立处理，不镜像，不用生成图作历史证据。

材料检查固定三套光照：中性检查、掠射检查、展示光照。颜色、粗糙度、法线、高度、金属和各旧化蒙版独立查看。先定位需要修正的表面现象，再制作带有结构和位置依据的掩膜。油痕、积尘、褪色、补漆与露铝不得共享一张无因果的随机噪声。

照片校正画布与真实 UV 审核图的关系按 V3 退回意见继续解决；三角角点映射及整机材质应用仍受原门禁限制。本实验不授予模型改动许可。

## 继续生效的停止线

`visualAcceptance=false`；`productionReady=false`；`modelBinding=0`。V3 外观尚未交付，原始模型、节点、动画、机构和既有 UV 未被本轮修改。旧 `scripts/build-80-days-pbr.mjs` 已在自己的报告中标为 rejected-invalid-liveryuv，不能直接作为正式烘焙器。

真实照片逐像素复核、桌面和 390×844 移动端浏览器回归、Blender/UE 往返、整机贴合与跨对象验证均为 not_run。GitHub Actions 的旧成功记录不构成本次测试证据。只有新的源文件、代码或视觉证据才能推进相应状态；用户决定最终视觉接受。
