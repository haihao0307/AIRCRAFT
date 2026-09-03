#!/usr/bin/env python3
"""Build a deterministic full delivery package for a Weapons Mother revision."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path


REPOSITORY = "haihao0307/AIRCRAFT"
BRANCH = "feature/b24-weapons-mother-v1"


def run_git(root: Path, *args: str) -> str:
    return subprocess.check_output(
        ["git", "-C", str(root), *args], text=True, encoding="utf-8"
    ).strip()


def sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def selected_paths(root: Path, revision: str, source_commit: str) -> list[str]:
    version = revision.lower()
    exact = {
        "AGENTS.md",
        "package.json",
        f"reports/weapons-mother/{version}-build.json",
        f"scripts/qa-weapons-mother-{version}-browser.mjs",
        "data/weapons-mother/b24-m2-aircraft-v004/belt-source-node-inventory.json",
        "data/weapons-mother/b24-m2-aircraft-v004/source-node-inventory.json",
    }
    prefixes = (
        f"data/weapons-mother/b24-m2-aircraft-{version}/",
        f"preview/weapons-mother/b24-m2-aircraft-{version}/",
        f"reports/weapons-mother/{version}-browser/",
        "reports/weapons-mother/source-review-v011/",
        "data/weapons-mother/b24-m2-aircraft-v004/qa/",
    )

    tracked = run_git(
        root, "ls-tree", "-r", "--name-only", source_commit
    ).splitlines()
    selected: list[str] = []
    for path in tracked:
        name = Path(path).name
        is_tool = path.startswith("tools/") and "weapons-mother" in name.lower()
        is_record = path.startswith("records/") and "WEAPONS_MOTHER" in name
        if path in exact or path.startswith(prefixes) or is_tool or is_record:
            selected.append(path)

    required = {
        f"data/weapons-mother/b24-m2-aircraft-{version}/distilled-reference.glb",
        f"data/weapons-mother/b24-m2-aircraft-{version}/distilled-reference.glb.gz",
        f"data/weapons-mother/b24-m2-aircraft-{version}/distillation-manifest.json",
        f"data/weapons-mother/b24-m2-aircraft-{version}/station-evidence.json",
        f"preview/weapons-mother/b24-m2-aircraft-{version}/index.html",
        f"reports/weapons-mother/{version}-browser/report.json",
    }
    missing = sorted(required.difference(selected))
    if missing:
        raise SystemExit(f"required package files are missing: {missing}")
    return sorted(set(selected))


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def zip_info(path: str, timestamp: tuple[int, int, int, int, int, int]) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(path, timestamp)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    info.create_system = 3
    return info


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--revision", required=True, help="Revision such as V016")
    parser.add_argument("--package-date", required=True, help="Package date in YYYY-MM-DD")
    parser.add_argument(
        "--source-commit",
        default="HEAD",
        help="Exact source commit to package; defaults to HEAD",
    )
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    source_commit = run_git(root, "rev-parse", args.source_commit)
    source_commit_short = source_commit[:7]
    source_commit_date = run_git(root, "show", "-s", "--format=%cI", source_commit)
    current_branch = run_git(root, "branch", "--show-current")
    if current_branch != BRANCH:
        raise SystemExit(f"expected branch {BRANCH}, found {current_branch}")

    version = args.revision.upper()
    version_lower = version.lower()
    manifest_path = root / f"data/weapons-mother/b24-m2-aircraft-{version_lower}/distillation-manifest.json"
    source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    asset_id = source_manifest["assetId"]
    if asset_id != f"WM_B24_ANM2_{version}":
        raise SystemExit(f"revision and asset ID disagree: {version} vs {asset_id}")

    qa_path = root / f"reports/weapons-mother/{version_lower}-browser/report.json"
    qa_report = json.loads(qa_path.read_text(encoding="utf-8"))
    if qa_report.get("status") != "PASS":
        raise SystemExit(f"browser QA is not PASS: {qa_report.get('status')}")

    paths = selected_paths(root, version, source_commit)
    for path in paths:
        subprocess.run(
            ["git", "-C", str(root), "diff", "--quiet", source_commit, "--", path],
            check=True,
        )

    package_name = (
        f"AIRCRAFT_WEAPONS_MOTHER_B24_ANM2_{version}_FULL_{args.package_date}"
    )
    package_root = f"{package_name}/"
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    archive_path = output_dir / f"{package_name}.zip"

    readme = f"""# Weapon Mother B-24 AN/M2 {version} 全量交付包

这是 `{asset_id}` 的当前完整交付快照，来源为 `{REPOSITORY}` 的
`{BRANCH}` 分支，源提交 `{source_commit}`。

## 首先打开

1. `repository/preview/weapons-mother/b24-m2-aircraft-{version_lower}/index.html`
2. `repository/data/weapons-mother/b24-m2-aircraft-{version_lower}/distillation-manifest.json`
3. `repository/reports/weapons-mother/{version_lower}-browser/report.json`
4. `STATUS.json`
5. `MANIFEST.json`

预览页通过 HTTP 服务打开。页面使用包内 GLB，同时从 jsDelivr 加载 Three.js 和
cannon-es ESM 运行依赖。

## 当前状态

- 最新实现基线：`{asset_id}`
- 浏览器 QA：`PASS`
- 校准验收门：`PASS`
- 资产状态：`user-review`
- 工程批准：`false`

包内保留当前运行资产、校准与数据合同、验证报告、源审查证据、构建工具和验证工具。
原始锁定输入文件没有进入仓库；其文件名、字节数和 SHA-256 仍记录在蒸馏清单中。
""".encode("utf-8")

    status = {
        "schema": "haihao.aircraft/weapons-mother-full-package-status@1.0.0",
        "packageName": package_name,
        "packageDate": args.package_date,
        "repository": REPOSITORY,
        "branch": BRANCH,
        "sourceCommit": source_commit,
        "sourceCommitDate": source_commit_date,
        "assetId": asset_id,
        "revision": version,
        "preview": f"repository/preview/weapons-mother/b24-m2-aircraft-{version_lower}/index.html",
        "browserQa": qa_report.get("status"),
        "calibrationGate": source_manifest["stationAlignments"]
        ["b24.waist.starboard.flexible"]["highDetailGunAlignment"]
        ["calibrationGate"]["pass"],
        "assetStatus": source_manifest.get("status"),
        "engineeringApproval": False,
        "scope": "current Weapon Mother delivery and its repository-owned continuation evidence/tools",
        "originalLockedInputsBundled": False,
        "originalLockedInputReceipts": "repository/data/weapons-mother/b24-m2-aircraft-v016/distillation-manifest.json",
    }
    status_payload = json_bytes(status)

    payloads: dict[str, bytes] = {
        "README_FIRST.md": readme,
        "STATUS.json": status_payload,
    }
    for path in paths:
        payloads[f"repository/{path}"] = (root / path).read_bytes()

    manifest_entries = [
        {"path": path, "bytes": len(payload), "sha256": sha256(payload)}
        for path, payload in sorted(payloads.items())
    ]
    package_manifest = {
        "schema": "haihao.aircraft/weapons-mother-full-package-manifest@1.0.0",
        "packageName": package_name,
        "sourceCommit": source_commit,
        "sourceCommitShort": source_commit_short,
        "manifestPolicy": "covers every archive member except MANIFEST.json",
        "fileCount": len(manifest_entries) + 1,
        "payloadBytes": sum(item["bytes"] for item in manifest_entries),
        "files": manifest_entries,
    }
    manifest_payload = json_bytes(package_manifest)

    commit_time = dt.datetime.fromisoformat(source_commit_date)
    timestamp = (
        max(1980, commit_time.year),
        commit_time.month,
        commit_time.day,
        commit_time.hour,
        commit_time.minute,
        commit_time.second,
    )
    with zipfile.ZipFile(archive_path, "w", allowZip64=True) as archive:
        for path, payload in sorted(payloads.items()):
            archive.writestr(zip_info(package_root + path, timestamp), payload)
        archive.writestr(
            zip_info(package_root + "MANIFEST.json", timestamp), manifest_payload
        )

    archive_payload = archive_path.read_bytes()
    checksum = sha256(archive_payload)
    checksum_path = output_dir / f"{package_name}.zip.sha256"
    checksum_path.write_text(
        f"{checksum}  {archive_path.name}\n", encoding="utf-8", newline="\n"
    )
    (output_dir / "PACKAGE_MANIFEST.json").write_bytes(manifest_payload)

    print(
        json.dumps(
            {
                "archive": archive_path.as_posix(),
                "bytes": len(archive_payload),
                "sha256": checksum,
                "files": package_manifest["fileCount"],
                "sourceCommit": source_commit,
                "assetId": asset_id,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
