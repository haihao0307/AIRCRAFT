# B-24 公版母体 01

用户于2026-09-09确认R16作为公版母体，阶段冻结；后续逐架飞机从此基线派生。本轮不继续造型或外观研究。

[公版母体01 · 已验收R16固定公网预览](https://rawcdn.githack.com/haihao0307/AIRCRAFT/47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a/b24-wing-seams-r16.html)

入口：b24-wing-seams-r16.html。保留页面内R16标记，以准确对应用户实际验收画面。公版编号01是发布名称，不是新的视觉修改。R14连接工作台及其依赖随包保留，因为当前页面仍直接引用它。

## 包内内容

- runtime：现版真实使用的数值机体、动作、蒙皮、分色、服役状态及Three.js依赖；原机体348网格/1784节点载荷保持。
- docs/generic-mother-01：冻结合同、清理清单及逐机派生约定。
- docs/wing-seams-r16、service-life、skin-joints、knowledge：机制、来源与边界。部分历史资料链接指向已归档版本，见CLEANUP.json中的归档提交。
- reports/service-life-r16/public：固定公网验收截图与机器报告。
- MANIFEST.json和tools/verify-package.py：逐文件SHA256完整性检查。

## 本地接续

解压后运行 `python tools/verify-package.py` 检查完整性。开发预览可运行 `python -m http.server 18768 --bind 127.0.0.1`，打开对应HTML；正式交付必须继续给出经过实际验收的固定公网HTTPS地址，不以本地开发入口或ZIP替代。

如需复跑浏览器验收，安装Python的playwright和Chrome后运行 `python tools/wing-seams-r16-check.py`。脚本沿用18768开发端口；`--commit <SHA>`可验收固定公网版本。原始外部参考文件不随包分发，不能声称本包含用户原照片/PDF或原GLB。几何数值和运行时源代码完整，来源锁与限制已保留。

## 已确认范围

主翼上下拼缝起止、平尾/发动机罩分色、五种服役状态、排气积碳及前后透视/正交检查已获用户外观接受。具体制造尺寸、钉距和服役小时仍是示意；“接近成品”不是工程或适航精度认证。

## 历史与清理

从公版工作树移除旧实验入口、旧运行模块、重复测试截图和过期自动化；清单见docs/generic-mother-01/CLEANUP.json。完整历史保存在GitHub提交83a182720d78cb9da58457be7491bcc8fdee2a7c及既有分支，旧固定公网链接不变。不得从历史105段作废接缝重新生成新机。
