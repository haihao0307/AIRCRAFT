#!/usr/bin/env python3
"""Validate the standalone Weapons Mother twin-M2 behavior review artifact."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
from pathlib import Path


MODEL_PATTERN = re.compile(
    r'<script id="model-data" type="application/octet-stream">([A-Za-z0-9+/=\r\n]+)</script>'
)
COMPONENT_PATTERN = re.compile(
    r'<script id="component-data" type="application/octet-stream">([A-Za-z0-9+/=\r\n]+)</script>'
)
EXPECTED_SOURCE_SHA256 = "3cb10b4c2cb6ae96656146f55e81f54a66338bcb817ed4727e4d79c38843d813"
EXPECTED_SOURCE_BYTES = 18_536_776
EXPECTED_COMPONENT_SHA256 = "fa08c876c09dc4a346406f971cb78769e469a7d32e2b552770cf7191627183ce"
EXPECTED_COMPONENT_BYTES = 1_133_936
REQUIRED_NODES = [
    "WM_B24_TWIN_M2_ROOT",
    "azimuth_pivot",
    "elevation_pivot",
    "twin_mount_root",
    "gun_L",
    "gun_R",
    "recoil_root_L",
    "recoil_root_R",
    "muzzle_L",
    "muzzle_R",
    "bore_axis_L",
    "bore_axis_R",
    "feed_L",
    "feed_R",
    "case_eject_L",
    "case_eject_R",
    "barrel_module",
    "receiver_module",
    "backplate_module",
    "case_component",
    "projectile_component",
]
REQUIRED_CONTROLS = [
    'id="fire-toggle"',
    'id="single-shot"',
    'id="clear-effects"',
    'id="rpm"',
    'id="timescale"',
    'id="yaw"',
    'id="elevation"',
    'id="separate-toggle"',
    'id="sockets-toggle"',
    'id="service-toggle"',
    'id="tracer-toggle"',
    'id="tracer-interval"',
    'id="paint-select"',
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--contract", required=True, type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    html_path = args.html.resolve()
    html_bytes = html_path.read_bytes()
    text = html_bytes.decode("utf-8")
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    contract = json.loads(args.contract.read_text(encoding="utf-8"))
    manifest_text = json.dumps(manifest, ensure_ascii=False)
    errors: list[str] = []

    model_match = MODEL_PATTERN.search(text)
    embedded = b""
    if not model_match:
        errors.append("missing embedded GLB payload")
    else:
        try:
            embedded = base64.b64decode(model_match.group(1), validate=True)
        except Exception as error:
            errors.append(f"invalid embedded GLB payload: {error}")
    embedded_hash = hashlib.sha256(embedded).hexdigest() if embedded else None
    if len(embedded) != EXPECTED_SOURCE_BYTES:
        errors.append(f"embedded source bytes changed: {len(embedded)}")
    if embedded_hash != EXPECTED_SOURCE_SHA256:
        errors.append(f"embedded source SHA-256 changed: {embedded_hash}")

    component_match = COMPONENT_PATTERN.search(text)
    embedded_component = b""
    if not component_match:
        errors.append("missing embedded component GLB payload")
    else:
        try:
            embedded_component = base64.b64decode(component_match.group(1), validate=True)
        except Exception as error:
            errors.append(f"invalid embedded component GLB payload: {error}")
    component_hash = hashlib.sha256(embedded_component).hexdigest() if embedded_component else None
    if len(embedded_component) != EXPECTED_COMPONENT_BYTES:
        errors.append(f"embedded component bytes changed: {len(embedded_component)}")
    if component_hash != EXPECTED_COMPONENT_SHA256:
        errors.append(f"embedded component SHA-256 changed: {component_hash}")

    html_hash = hashlib.sha256(html_bytes).hexdigest()
    if manifest.get("output", {}).get("sha256") != html_hash:
        errors.append("HTML SHA-256 does not match the build manifest")
    if manifest.get("source", {}).get("selectedNode") != "M2_0":
        errors.append("build manifest does not lock selected donor node M2_0")
    if manifest.get("status") != "behavior-prototype-user-review":
        errors.append("build manifest status is not fail-closed for user review")

    for marker in REQUIRED_NODES:
        if marker not in text and marker not in manifest_text:
            errors.append(f"missing runtime marker: {marker}")
    for marker in REQUIRED_CONTROLS:
        if marker not in text:
            errors.append(f"missing runtime marker: {marker}")
    for marker in [
        'data-qa="loading"',
        'data-fire-state="loading"',
        "M2HB",
        "57 英寸航空型",
        "three@0.185.1",
        "CC BY 4.0",
        "configurable tracer cadence",
        "persistent dynamically batched shell-case accumulation",
        'muzzle.position.set(0,1.316,-0.00548)',
        'data-case-persistence',
    ]:
        if marker not in text and marker not in manifest_text:
            errors.append(f"missing boundary or behavior marker: {marker}")

    for retired in [
        "m2_browning_.50_cal_machine_gun.glb",
        "browning_m2.glb",
        "m2-browning-50cal-machine-gun.html",
        "browning-m2.html",
    ]:
        if retired in text:
            errors.append(f"retired candidate leaked into selected artifact: {retired}")

    for forbidden in [
        'muzzle.position.set(0.035,1.325,0.012)',
        'item.life = 3.2',
        'const maxCases = 96',
    ]:
        if forbidden in text:
            errors.append(f"retired behavior remains in V002: {forbidden}")

    unresolved = contract.get("unresolved", [])
    if not any("B-24 station" in item for item in unresolved):
        errors.append("asset contract does not keep the B-24 station unresolved")
    if contract.get("runtime", {}).get("animation") is not True:
        errors.append("asset contract does not require animation")

    report = {
        "schema": "haihao.aircraft/weapons-mother-aircraft-twin-validation@2.0.0",
        "status": "PASS" if not errors else "FAIL",
        "artifact": {
            "file": str(html_path),
            "bytes": len(html_bytes),
            "sha256": html_hash,
            "embeddedGlbBytes": len(embedded),
            "embeddedGlbSha256": embedded_hash,
            "embeddedComponentGlbBytes": len(embedded_component),
            "embeddedComponentGlbSha256": component_hash,
        },
        "checks": {
            "semanticNodes": len(REQUIRED_NODES),
            "interactiveControls": len(REQUIRED_CONTROLS),
            "selectedDonorNode": "M2_0",
            "retiredCandidatesAbsent": not any(
                retired in text
                for retired in [
                    "m2_browning_.50_cal_machine_gun.glb",
                    "browning_m2.glb",
                    "m2-browning-50cal-machine-gun.html",
                    "browning-m2.html",
                ]
            ),
            "imageLedExternal3dGenerationEnabled": False,
            "muzzleDatumLocked": 'muzzle.position.set(0,1.316,-0.00548)' in text,
            "persistentCases": 'data-case-persistence' in text,
            "configurableTracerCadence": 'id="tracer-interval"' in text,
        },
        "errors": errors,
    }
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(output, encoding="utf-8", newline="\n")
    print(output, end="")
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
