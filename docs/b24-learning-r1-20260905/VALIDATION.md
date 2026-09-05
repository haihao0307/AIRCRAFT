# B24 学习接入验证记录

日期：2026-09-05。会话：B24-RESUME-20260905-R1。

## 实际执行

本次在 Linux 容器中使用 Python 3.13.5、Git 2.47.3，执行：

```sh
python tools/verify_b24_learning_boundary.py --self-test
```

结果为 10 项测试通过，0 项失败，unittest 本次报告耗时 0.082 秒。该耗时仅为小型检查器自测，不能用作 B24 加载、渲染或模型处理的性能数据。

实际测试覆盖：允许范围、空差异、模型/运行文件越界、删除与改名来源、路径前缀逃逸、文件类型变更、含换行的路径、截断数据、意外改名格式，以及临时合成 Git 仓库中的正反例。合成仓库检查确认：合法知识追加通过；未提交的运行修改失败；已提交的运行修改失败；替换原入口失败。

检查器不修改待检查的仓库。自测只修改自行创建的临时测试目录。

## 交付脚本与本地已测脚本一致

本地脚本 SHA-256：`e85bd885a09bd03f8c32fec821ce9ecac66d36b7cafe9e0102e16744b33c8481`。

本地 `git hash-object`：`4da8675225b566ce16bace80b204cb5fb9c0cbfc`。

GitHub 在提交 `f3dea04cf9b50ab3757e99ae99a8890e08767bb3` 回读相同路径得到相同 blob：`4da8675225b566ce16bace80b204cb5fb9c0cbfc`。据此确认提交的脚本与本地已测内容一致。

## 实际远端差异核对

已通过 GitHub compare_commits 读取：

* 基线：`b6c47ba3f27330776c7a473094d7c29375993d1c`
* 检查目标：`ddb8c42953148bc6e2998df08f29b378a6c16cb6`
* 关系：ahead，4 个提交，behind 为 0；merge-base 为上述基线。

完整返回的文件变化为：

| 路径 | 状态 | 增加行 | 删除行 |
| --- | --- | ---: | ---: |
| NEXT_START_HERE.md | modified | 12 | 0 |
| docs/b24-learning-r1-20260905/SKILL.md | added | 104 | 0 |
| docs/b24-learning-r1-20260905/STATE.json | added | 93 | 0 |
| tools/verify_b24_learning_boundary.py | added | 168 | 0 |

将这份真实远端结果规范化为检查器的路径输入后，`policy_errors=[]`。范围内没有模型、数据、材质运行代码、动画、机场、任务、声音、镜头、原 UV、vendor 或网页修改。

本记录自身随后作为第五个允许路径新增。交付前还需再次查看基线到最终提交的远端差异。上面的范围有明确目标提交，不冒充尚未执行的最终提交检查。

## 可复查方式与限制

有完整、干净的本地仓库时可执行：

```sh
python tools/verify_b24_learning_boundary.py --repo .
```

此命令检查提交祖先关系、整个提交范围的允许路径、原重启入口的完整前缀及工作区是否干净。本次未取得完整 AIRCRAFT 本地克隆，因此真实仓库的这条本地端到端命令为 not_run；已执行的是临时 Git 集成测试和真实远端差异检查。

这是一项本次知识更新范围的检查工具，不能替代生产功能测试，也没有接入 GitHub Actions 强制门禁。今后授权修改生产代码时应建立新任务与新检查范围，不能靠放宽此学习检查器跳过原部件保护。

## 未执行或待决定

| 项目 | 本次状态 |
| --- | --- |
| Blender / UE / Houdini / PBRT 软件运行 | not_run |
| 当前 native payload 下载后重新计算 SHA-256 | not_run |
| 在线页面真实浏览器启动及交互复测 | not_run |
| 新材质 A/B 视觉实验 | planned_not_run |
| 完整飞行动画复测 | not_run |
| 浏览器性能测量 | not_run |
| 小妈理解复核 | pending |
| 跨对象复用 | not_run |
| 用户视觉接受与生产批准 | 保留 V017 原状态，均未提升 |

已通过 GitHub 读取发布页 HTML 源，确认现有 V017 入口及其资源基路径；这不构成页面已经在用户浏览器打开的证据。原入口记载的 Browser QA 53/53 和 Static QA 34/34 为继承记录，本次没有重复执行。
