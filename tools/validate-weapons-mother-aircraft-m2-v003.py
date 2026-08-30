#!/usr/bin/env python3
"""Validate the repository-native Weapons Mother aircraft M2 V003 review page."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
ARTIFACT = (
    REPO_ROOT
    / "preview"
    / "weapons-mother"
    / "b24-m2-aircraft-twin-v003"
)
HTML = ARTIFACT / "index.html"
CONTRACT = ARTIFACT / "asset-contract.json"
EVIDENCE = ARTIFACT / "evidence.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> None:
    text = HTML.read_text(encoding="utf-8")
    raw = HTML.read_bytes()
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    evidence = json.loads(EVIDENCE.read_text(encoding="utf-8"))

    require(len(raw) <= contract["budgets"]["htmlBytes"], "HTML byte budget exceeded")
    require("<script id=\"model-data\"" not in text, "embedded model-data is forbidden")
    require(".glb</script>" not in text.lower(), "embedded GLB marker found")
    require(
        'data-reference-glb-embedded="false"' in text,
        "reference-GLB exclusion marker missing",
    )
    require(
        contract["construction"]["aircraftM2OverallLengthMeters"] == 1.448,
        "aircraft M2 length contract changed",
    )

    required_nodes = [
        "WM_B24_AIRCRAFT_M2_TWIN_V003",
        'root.name="gun_"+side',
        'makeGun("L");makeGun("R")',
        "receiver_module_",
        "barrel_extension_",
        "bolt_",
        "driving_spring_",
        "charging_handle_",
        "muzzle_socket_",
        "bore_axis_",
        "feed_socket_",
        "case_eject_",
        "link_eject_",
        "m2_disintegrating_link",
        "round_12_7x99",
        "persistent_case_batch",
        "persistent_link_batch",
    ]
    missing = [node for node in required_nodes if node not in text]
    require(not missing, f"missing semantic nodes: {missing}")

    required_behaviors = [
        "spawnTracer",
        "spawnSmoke",
        "spawnSparks",
        "spawnCase",
        "spawnLink",
        "setService",
        "setAmmo",
        "applyPaint",
        "getMuzzleRay",
    ]
    missing_behaviors = [name for name in required_behaviors if name not in text]
    require(not missing_behaviors, f"missing behaviors: {missing_behaviors}")

    require(
        "No reference GLB is embedded or shipped in V003." in evidence["decisions"],
        "evidence graph does not lock reference-only use",
    )
    require(
        "exact B-24 gun position" in evidence["unresolved"],
        "B-24 station uncertainty must remain explicit",
    )

    report = {
        "schema": "haihao.aircraft/weapons-mother-v003-validation@1.0.0",
        "status": "pass",
        "artifact": str(HTML.relative_to(REPO_ROOT)).replace("\\", "/"),
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "referenceGlbEmbedded": False,
        "declaredOverallLengthMeters": 1.448,
        "semanticNodeChecks": len(required_nodes),
        "behaviorChecks": len(required_behaviors),
        "stationMount": "unresolved",
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
