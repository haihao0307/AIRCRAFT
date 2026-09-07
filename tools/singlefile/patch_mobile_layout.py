#!/usr/bin/env python3
"""Apply deterministic narrow-screen corrections to the generated one-file HTML."""
from __future__ import annotations
import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one CSS anchor, found {count}: {old[:80]}")
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
    text = replace_once(
        text,
        ".panel{position:absolute;right:0;top:0;bottom:0;width:min(350px,88vw);z-index:10;transform:translateX(100%);transition:transform .22s;box-shadow:-10px 0 40px #0008}.panel.open{transform:none}",
        ".panel{position:absolute;right:0;top:0;bottom:0;width:min(350px,88vw);z-index:10;transform:none;visibility:hidden;opacity:0;pointer-events:none;transition:opacity .18s;box-shadow:-10px 0 40px #0008}.panel.open{visibility:visible;opacity:1;pointer-events:auto}",
    )
    text = replace_once(
        text,
        ".mobilePanel{display:none;position:absolute;right:14px;top:14px;z-index:4}",
        ".mobilePanel{display:none;position:absolute;right:14px;top:14px;z-index:12}",
    )
    text = replace_once(text, "const canvas=scene,renderer=", "const canvas=$('scene'),renderer=")
    args.html.write_text(text, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
