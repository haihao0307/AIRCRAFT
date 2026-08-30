#!/usr/bin/env python3
"""Build the Weapons Mother review HTML with embedded or external GLB delivery."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path


TOKENS = {
    "__GLB_BASE64__": "glb",
    "__GLB_URL_JSON__": "glb_url",
    "__MANIFEST_JSON__": "manifest",
    "__STATION_EVIDENCE_JSON__": "station_evidence",
    "__SURFACE_CONTRACT_JSON__": "surface_contract",
}


def compact_json(path: Path) -> str:
    return json.dumps(
        json.loads(path.read_text(encoding="utf-8")),
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", type=Path, required=True)
    parser.add_argument("--glb", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--station-evidence", type=Path, required=True)
    parser.add_argument("--surface-contract", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument(
        "--external-glb-url",
        help="Use a relative/absolute GLB URL instead of embedding base64 data",
    )
    args = parser.parse_args()

    html = args.template.read_text(encoding="utf-8")
    for token in TOKENS:
        count = html.count(token)
        if count != 1:
            raise SystemExit(f"expected exactly one {token}, found {count}")

    glb_bytes = args.glb.read_bytes()
    replacements = {
        "__GLB_BASE64__": (
            "" if args.external_glb_url else base64.b64encode(glb_bytes).decode("ascii")
        ),
        "__GLB_URL_JSON__": json.dumps(args.external_glb_url, ensure_ascii=False),
        "__MANIFEST_JSON__": compact_json(args.manifest),
        "__STATION_EVIDENCE_JSON__": compact_json(args.station_evidence),
        "__SURFACE_CONTRACT_JSON__": compact_json(args.surface_contract),
    }
    for token, value in replacements.items():
        html = html.replace(token, value)

    unresolved = [token for token in TOKENS if token in html]
    if unresolved:
        raise SystemExit(f"unresolved template tokens: {unresolved}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html, encoding="utf-8", newline="\n")
    output_bytes = args.output.read_bytes()

    report = {
        "schema": "haihao.aircraft/weapons-mother-html-build@1.0.0",
        "output": args.output.as_posix(),
        "bytes": len(output_bytes),
        "sha256": hashlib.sha256(output_bytes).hexdigest(),
        "embeddedGlbBytes": 0 if args.external_glb_url else len(glb_bytes),
        "embeddedGlbSha256": hashlib.sha256(glb_bytes).hexdigest(),
        "sourceGlbBytes": len(glb_bytes),
        "assetMode": "external" if args.external_glb_url else "embedded",
        "externalGlbUrl": args.external_glb_url,
        "singleFile": not bool(args.external_glb_url),
        "directFileOpen": not bool(args.external_glb_url),
        "runtimeDependency": "Three.js ESM from jsDelivr",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
