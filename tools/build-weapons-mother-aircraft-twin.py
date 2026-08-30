#!/usr/bin/env python3
"""Build the standalone Weapons Mother twin-aircraft-M2 behavior review page."""

from __future__ import annotations

import argparse
import base64
import hashlib
import importlib.util
import json
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
TEMPLATE = SCRIPT_DIR / "templates" / "weapons-mother-aircraft-twin.html"
AUDITOR = SCRIPT_DIR / "audit-weapons-mother-glb.py"
EXPECTED_SOURCE_BYTES = 18_536_776
EXPECTED_SOURCE_SHA256 = "3cb10b4c2cb6ae96656146f55e81f54a66338bcb817ed4727e4d79c38843d813"
EXPECTED_COMPONENT_BYTES = 1_133_936
EXPECTED_COMPONENT_SHA256 = "fa08c876c09dc4a346406f971cb78769e469a7d32e2b552770cf7191627183ce"


def load_auditor():
    spec = importlib.util.spec_from_file_location("weapons_mother_glb_audit", AUDITOR)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load auditor: {AUDITOR}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--components", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()

    source = args.source.resolve()
    if not source.is_file():
        raise FileNotFoundError(source)
    raw = source.read_bytes()
    source_sha256 = hashlib.sha256(raw).hexdigest()
    if len(raw) != EXPECTED_SOURCE_BYTES:
        raise ValueError(f"source byte count changed: {len(raw)} != {EXPECTED_SOURCE_BYTES}")
    if source_sha256 != EXPECTED_SOURCE_SHA256:
        raise ValueError(f"source SHA-256 changed: {source_sha256}")

    component_path = args.components.resolve()
    if not component_path.is_file():
        raise FileNotFoundError(component_path)
    component_raw = component_path.read_bytes()
    component_sha256 = hashlib.sha256(component_raw).hexdigest()
    if len(component_raw) != EXPECTED_COMPONENT_BYTES:
        raise ValueError(
            f"component byte count changed: {len(component_raw)} != {EXPECTED_COMPONENT_BYTES}"
        )
    if component_sha256 != EXPECTED_COMPONENT_SHA256:
        raise ValueError(f"component SHA-256 changed: {component_sha256}")

    audit = load_auditor()(source)
    template = TEMPLATE.read_text(encoding="utf-8")
    replacements = {
        "__MODEL_BASE64__": base64.b64encode(raw).decode("ascii"),
        "__COMPONENT_BASE64__": base64.b64encode(component_raw).decode("ascii"),
        "__COMPONENT_SHA256__": component_sha256,
        "__COMPONENT_BYTES__": f"{len(component_raw):,}",
        "__SOURCE_SHA256__": source_sha256,
        "__SOURCE_BYTES__": f"{len(raw):,}",
        "__SOURCE_MIB__": f"{len(raw) / 1024 / 1024:.2f}",
        "__SOURCE_TRIANGLES__": f"{audit['counts']['triangles']:,}",
        "__SOURCE_NODES__": str(audit["counts"]["nodes"]),
        "__SOURCE_TEXTURE_MIB__": f"{audit['estimatedDecodedTextureMiB']:.2f}",
    }
    page = template
    for token, value in replacements.items():
        page = page.replace(token, value)
    unresolved = sorted(token for token in replacements if token in page)
    if unresolved:
        raise ValueError(f"unresolved template tokens: {unresolved}")

    output = args.output.resolve()
    manifest_output = args.manifest.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page, encoding="utf-8", newline="\n")
    output_raw = output.read_bytes()
    output_sha256 = hashlib.sha256(output_raw).hexdigest()

    manifest = {
        "schema": "haihao.aircraft/weapons-mother-aircraft-twin-build@2.0.0",
        "status": "behavior-prototype-user-review",
        "source": {
            "file": source.name,
            "bytes": len(raw),
            "sha256": source_sha256,
            "selectedNode": "M2_0",
            "sourceGeometryStatus": "M2HB-like donor; not approved as aircraft M2 geometry",
            "license": "CC BY 4.0",
            "author": "buh",
            "url": "https://sketchfab.com/3d-models/m2-browning-ccf212e16b6748419cea6d7b14b30b48",
        },
        "componentPack": {
            "file": str(component_path.relative_to(REPO_ROOT)).replace("\\", "/"),
            "bytes": len(component_raw),
            "sha256": component_sha256,
            "nodes": [
                "barrel_module",
                "receiver_module",
                "backplate_module",
                "case_component",
                "projectile_component",
            ],
            "ammoSourceRole": "Object_11 bullet geometry from candidate 02; source GLB not embedded",
        },
        "output": {
            "file": str(output.relative_to(REPO_ROOT)).replace("\\", "/"),
            "bytes": len(output_raw),
            "sha256": output_sha256,
            "standaloneHtml": True,
            "embeddedSourceGlb": True,
            "embeddedComponentGlb": True,
            "externalRuntime": "Three.js 0.185.1 via jsDelivr",
        },
        "rig": {
            "root": "WM_B24_TWIN_M2_ROOT",
            "nodes": [
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
            ],
            "runtimeEffects": [
                "independent recoil cycles",
                "layered volumetric muzzle flash with smoke, sparks, and dynamic light",
                "configurable tracer cadence with tracer-off mode",
                "persistent dynamically batched shell-case accumulation with gravity and bounce",
                "belt-feed stepping",
                "continuous and single-shot controls",
                "paint scheme switching",
                "twin-assembly and service-module separation review",
            ],
            "muzzleDatum": {
                "sourceForwardVertexCount": 111,
                "sourceForwardY": 1.30915,
                "sourceCenterX": 0.0,
                "sourceCenterZ": -0.00548,
                "socket": [0.0, 1.316, -0.00548],
            },
        },
        "limitations": [
            "The normal rendered donor remains one fused mesh; service modules are connected-component review groupings, not an approved parts catalog.",
            "Projectile paths and shell-case trajectories are review visualization, not approved ballistics.",
            "Twin spacing, mount geometry, feed routing, ejection routing, and fire limits remain unresolved until a B-24 station is assigned.",
        ],
    }
    manifest_output.parent.mkdir(parents=True, exist_ok=True)
    manifest_output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
