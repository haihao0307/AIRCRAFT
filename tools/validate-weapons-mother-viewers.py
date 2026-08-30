#!/usr/bin/env python3
"""Validate embedded GLB identity and policy markers in Weapons Mother viewers."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any


MODEL_PATTERN = re.compile(
    r'<script id="model-data" type="application/octet-stream">([A-Za-z0-9+/=\r\n]+)</script>'
)
AUDIT_PREFIX = "const AUDIT = "
AUDIT_SUFFIX = ";\n    const viewport"


def validate_html(path: Path, audit_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []
    candidate_match = re.search(r'data-candidate="([a-z0-9-]+)"', text)
    candidate_id = candidate_match.group(1) if candidate_match else None
    if not candidate_id:
        errors.append("missing candidate ID")
    elif candidate_id not in audit_by_id:
        errors.append(f"candidate ID is not present in audit registry: {candidate_id}")

    model_match = MODEL_PATTERN.search(text)
    embedded = b""
    if not model_match:
        errors.append("missing embedded GLB payload")
    else:
        try:
            embedded = base64.b64decode(model_match.group(1), validate=True)
        except Exception as error:
            errors.append(f"invalid embedded GLB base64: {error}")
    if embedded and not embedded.startswith(b"glTF"):
        errors.append("embedded payload is not a GLB")

    embedded_audit = None
    audit_start = text.find(AUDIT_PREFIX)
    audit_end = text.find(AUDIT_SUFFIX, audit_start + len(AUDIT_PREFIX))
    if audit_start < 0 or audit_end < 0:
        errors.append("missing embedded audit JSON")
    else:
        audit_text = text[audit_start + len(AUDIT_PREFIX) : audit_end]
        try:
            embedded_audit = json.loads(audit_text)
        except Exception as error:
            errors.append(f"invalid embedded audit JSON: {error}")

    registry_audit = audit_by_id.get(candidate_id or "")
    if registry_audit and embedded:
        actual_hash = hashlib.sha256(embedded).hexdigest()
        if actual_hash != registry_audit["sha256"]:
            errors.append("embedded GLB SHA-256 does not match registry")
        if len(embedded) != registry_audit["bytes"]:
            errors.append("embedded GLB byte count does not match registry")
    else:
        actual_hash = hashlib.sha256(embedded).hexdigest() if embedded else None

    if registry_audit and embedded_audit:
        if embedded_audit.get("sha256") != registry_audit["sha256"]:
            errors.append("embedded audit SHA-256 does not match registry")
        if embedded_audit.get("b24MountAssignment") != "unresolved-user-mapping-required":
            errors.append("B-24 mount assignment is not fail-closed")

    required_markers = [
        "NO IMAGE2THREEJS",
        "原始 GLB 未改写",
        "B-24 挂位未解析",
        "WEAPONS_MOTHER_QA_READY",
        "https://creativecommons.org/licenses/by/4.0/",
        "three@0.185.1",
    ]
    for marker in required_markers:
        if marker not in text:
            errors.append(f"missing marker: {marker}")

    forbidden_runtime_markers = [
        "scripts/aircraft_workflow.py",
        "forge/state.py",
        "img2threejs-result",
        "img2threejs-task",
    ]
    for marker in forbidden_runtime_markers:
        if marker in text:
            errors.append(f"forbidden Image2ThreeJS runtime marker: {marker}")

    return {
        "file": str(path),
        "candidateId": candidate_id,
        "htmlBytes": path.stat().st_size,
        "embeddedGlbBytes": len(embedded),
        "embeddedGlbSha256": actual_hash,
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    parser.add_argument("html", nargs="+", type=Path)
    args = parser.parse_args()

    registry = json.loads(args.audit.read_text(encoding="utf-8"))
    audit_by_id = {asset["candidateId"]: asset for asset in registry["assets"]}
    results = [validate_html(path, audit_by_id) for path in args.html]
    report = {
        "schema": "haihao.aircraft/weapons-mother-viewer-validation@1.0.0",
        "status": "PASS" if all(result["status"] == "PASS" for result in results) else "FAIL",
        "image2ThreeJsEnabled": False,
        "results": results,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output, encoding="utf-8", newline="\n")
    print(output, end="")
    if report["status"] != "PASS":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
