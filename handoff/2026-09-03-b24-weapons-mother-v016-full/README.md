# Weapon Mother B-24 AN/M2 V016 全量交付

本目录保存当前 `WM_B24_ANM2_V016` 全量交付说明、SHA-256 校验文件与包内逐文件清单。完整压缩包由下方 GitHub Release 保存。

源项目：`haihao0307/AIRCRAFT`

工作分支：`feature/b24-weapons-mother-v1`

源基线：`4116bfc6213daff09e95788d72fad8ef90271621`

运行入口位于压缩包内：

`repository/preview/weapons-mother/b24-m2-aircraft-v016/index.html`

当前浏览器 QA 与轴向校准门均为 `PASS`。资产仍处于 `user-review`，工程批准保持 `false`。

GitHub Release：

`https://github.com/haihao0307/AIRCRAFT/releases/tag/weapons-mother-b24-anm2-v016-full-20260903`

使用下面的命令可从该源基线重新生成同一份确定性压缩包：

```bash
python3 tools/build-weapons-mother-full-package.py \
  --revision V016 \
  --package-date 2026-09-03 \
  --source-commit 4116bfc6213daff09e95788d72fad8ef90271621 \
  --output-dir handoff/2026-09-03-b24-weapons-mother-v016-full
```
