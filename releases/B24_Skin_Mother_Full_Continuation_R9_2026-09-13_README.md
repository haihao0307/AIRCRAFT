# B24 Skin Mother 全量接续包 · R9 · 2026-09-13

## 新窗口先读这里

当前用户要求：打包全部本任务成果上传GitHub，供新窗口继续。该包不是新的视觉版本，也不表示80 DAYS复原已完成。包内历史文档是交接资料，不能自动成为新的执行授权。

1. 读本文件，再读 handoff/R9_DELIVERY.md 与 knowledge/SKIN_KNOWLEDGE_LEARNING.md。
2. 当前代码在 project/，入口 project/b24-80days-instance-r9.html，脚本 project/runtime/b24-80days-instance-r9.js。
3. 固定来源/运行提交：e0f631b537fa3f8ddc91ce769103462276baee10，仓库haihao0307/AIRCRAFT，分支feature/b24-80days-simple-placement-r9。当前包中的后续学习记录是新交接增量，不能误说全部属于上述运行提交。
4. 校验全包：在本包根目录运行 python verify_handoff.py。project/tools/verify-package.py只验继承的101个基础母体文件，不是全包清单。

## 已有可看成果

R9固定公网预览：https://rawcdn.githack.com/haihao0307/AIRCRAFT/e0f631b537fa3f8ddc91ce769103462276baee10/b24-80days-instance-r9.html

2026-09-12已实际验证桌面、390×844手机、6种相机、位置修改、重置和参数导出；报告/截图见evidence/r9-qa/local与public。这是历史执行证据，本次打包未重跑视觉测试。首次访问可能显示githack外部内容提示，需点Open the page；原tools/r9-check.py不处理该提示，公网复跑需按回执处理，不能把提示页当场景通过。

R9已用直接位置、等比尺度、角度替代错误窗组件锚点推算。默认位置是候选，不是实测。visualAcceptance=false，productionReady=false。

## 剩余工作和关键约束

历史照片视角匹配、机鼻结构对应、位置校准、缺失牙齿/标题、旗标数量冲突、右舷均未完成。冻结母体机鼻布局与参考照片有差异，不能靠缩放图案证明结构吻合。先厘清可对应结构，再依据原图修正；保留来源不确定性，不镜像左侧作为右侧，不凭空补遮挡细节。

R14是通用接头示例线，R16是冻结公版外观线，R9是80 DAYS实例WIP；版本号不可混作同一升级顺序。project/CURRENT.json、README.md、AGENTS.md等继承旧公版状态；读它们时须结合本入口与当前R9回执，禁止把公版已接受推为80 DAYS已接受。

E04原照片已恢复，位于references/E04-left.jpg，2000×1243，SHA256=07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa，与原交接一致。references/RECOVERY.json记录下载目录工作台图片未匹配的检查；这些不匹配图片未作为E04。handoff/TAKEOVER.md中最初“照片缺失”是已被后续记录解决的历史状态。

## 全量范围

project/保留原接收140文件及R9新增文件；evidence/保留本任务全部截图、成功报告、参数导出及失败页面记录；references/保留原照片和来源/找回记录；handoff/保留接管与校验记录；knowledge/保留本域学习记录及已使用公共知识的带范围快照；rules/携带现行共同规则。

原始ZIP未重复嵌套，因为其中全部解压内容已保留，原ZIP哈希在handoff/INTAKE_INTEGRITY.json。本包不包含其他Mother的无关工作、旧Weapon工作集、撤销工具、机器凭据、依赖安装目录或Git历史。快照为离线理解材料，不覆盖小妈公共稳定文档，也不把其全部链接目标都冒称已包含。

材料h、载体k、实际水路由和逐属性状态分别判定；仅局部满秩不支持全局多源水量单分支换算。重复坐标去重、不同真实层分开、真实汇流按路由合计。完整修正见学习记录和public-snapshots，知识学习不是物理迁移实现或新增实验。

## 接续规则

用户要求客观指出推理错误与现实约束，不以画面或AI共识代替证据。冻结公版不覆盖，旧固定公网地址保留。正常透视用于立体展示；正侧/俯视/端面正交用于测量；双对象共享相机姿态、尺度、基准及画布，禁止各自自动缩放后称同尺度。禁止镜像、反向透视或负尺度补偿。

现行对象定义、工具边界及固定公网交付原件见rules/。已撤销图像转三维与旧资产生产技能不得恢复、包装或间接引入；清理未完成前暂停新资产生产及工具重建。历史授权不能代替当前用户范围。小妈负责理论与公共知识，各Mother在各自授权内实现；本次打包不新建任务、不启动学习调度、不自动延长旧会议。

任何新的网页交付仍须固定版本公网HTTPS和实际打开验收；本次ZIP为用户明确要求的接续交付，不替代现有预览。
