#!/usr/bin/env python3
"""Apply a deterministic narrow-screen layout correction to the generated one-file HTML."""
from __future__ import annotations
import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    if text.count(old) != 1:
        raise RuntimeError(f"Expected one CSS anchor, found {text.count(old)}: {old[:80]}")
    return text.replace(old, new, 1)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", type=Path, required=True)
    args = parser.parse_args()
    text = args.html.read_text(encoding="utf-8")
    text = replace_once(
        text,
        ".panel{overflow:auto;background:",
        ".panel{overflow:auto;overflow-x:hidden;background:",
    )
    text = replace_once(
        text,
        ".footer{padding-top:14px;",
        ".footer{padding-top:14px;overflow-wrap:anywhere;word-break:break-word;",
    )
    text = replace_once(
        text,
        ".viewbar{max-width:calc(100% - 28px);overflow-x:auto;left:14px;right:14px;transform:none}",
        ".viewbar{left:14px;right:auto;width:calc(100% - 28px);max-width:none;overflow-x:auto;transform:none}",
    )
    text = replace_once(text, "const canvas=scene,renderer=", "const canvas=$('scene'),renderer=")
    args.html.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
