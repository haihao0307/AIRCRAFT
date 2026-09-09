# 公版母体01 · TLO试存

这是独立实验，冻结母体01和R16公网入口不变。先读FORMAT.md。样本：data/B24_Generic_Mother_01.tlo。

执行`python -X utf8 tlo-pilot/tools/verify.py`，验证所有块、102个原文件和语义依赖。可加`--extract <一个尚不存在的目录>`恢复完整包；随后在恢复目录运行`python tools/verify-package.py`。恢复不执行代码。

构建命令：`python -X utf8 tlo-pilot/tools/build.py`，输入为仓库内冻结ZIP，构建器首先核对其固定SHA。测试：`python -X utf8 tlo-pilot/tools/test_codec.py`。JSON语义视图从二进制解码生成，不单独维护事实。

`reviews/`收各Mother实际试读回执；通知送达、文档理解、实际文件打开和独立实现分别记录。不得把待回执写成已验证。后续具体80 DAYS及机组制作不在本试存中冒充完成。
