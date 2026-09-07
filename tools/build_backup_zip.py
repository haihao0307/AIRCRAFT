#!/usr/bin/env python3
from __future__ import annotations
import hashlib
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "B24_FULL_BACKUP_2026-09-07_R1.zip"
EXCLUDE = {".git", OUT.name, "SHA256SUMS.txt"}
files = sorted(p for p in ROOT.rglob("*") if p.is_file() and not any(part in EXCLUDE for part in p.parts))
with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for path in files:
        rel = path.relative_to(ROOT).as_posix()
        info = zipfile.ZipInfo(rel, date_time=(2026, 9, 7, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100644 & 0xFFFF) << 16
        zf.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
digest = hashlib.sha256(OUT.read_bytes()).hexdigest()
(ROOT / "SHA256SUMS.txt").write_text(f"{digest}  {OUT.name}\n", encoding="utf-8")
print(f"{OUT} {OUT.stat().st_size} {digest}")
