# B24 数字资产蒸馏小包 V001

这个小包用于把原始 B24 模型蒸馏成可长期维护的数字资产方法，并把武器系统拆成单独生产线。

## 你现在可以怎么用

1. 当前窗口继续保留 B24 机体生产线。
2. 新开一个窗口，直接把 `04_WEAPON_SUBLINE_START_PROMPT.md` 里的内容发过去。
3. 那个新窗口只处理机枪、炸弹、挂架、投放逻辑和回接接口。
4. 做完之后，把武器线产出的包带回当前窗口，再与机体线合流。

## 当前边界

- 机体主线继续存在，不能丢。
- 跑道、发动机启动顺序、起飞和降落动作线继续保留。
- 噪波只是表面层工具，不再当主线。
- 武器系统和机体系统分线制作。
- 80 DAYS 历史涂装仍在待确认阶段，当前不冻结最终涂装。

## 当前已确认事实

- V010 干净整机基线已经恢复。
- V012 已找回四个螺旋桨与发动机之间的实体连接件。
- 原始贴图里已经确认存在机身蒙皮、板缝、铆钉状点列、检修盖和局部污迹信息。
- 原始 glTF 材质合同没有独立 normalTexture 槽，铆钉细节当前主要烘焙在原始贴图中。

## 包内文件

- `00_README_FIRST.md`
- `01_B24_DIGITAL_ASSET_DISTILLATION_METHOD.md`
- `02_AIRFRAME_WEAPON_SPLIT_RULES.md`
- `03_AIRFRAME_BASELINE_STATUS.json`
- `04_WEAPON_SUBLINE_START_PROMPT.md`
- `05_EXPECTED_WEAPON_HAND_BACK_SCHEMA.json`
- `06_SELECTED_EVIDENCE_MANIFEST.json`
- `evidence/` 目录下的少量关键图
