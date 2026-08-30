#!/usr/bin/env python3
"""Validate V004 source parity, delivery integrity, and user-facing controls."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def glb_json(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise AssertionError(f"not a GLB: {path}")
    version, declared_length = struct.unpack_from("<II", data, 4)
    assert version == 2, f"unsupported GLB version {version}"
    assert declared_length == len(data), "GLB declared length mismatch"
    json_length, json_type = struct.unpack_from("<II", data, 12)
    assert json_type == 0x4E4F534A, "first GLB chunk is not JSON"
    return json.loads(data[20 : 20 + json_length].decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--station-evidence", type=Path, required=True)
    parser.add_argument("--surface-contract", type=Path, required=True)
    parser.add_argument("--asset-contract", type=Path, required=True)
    parser.add_argument("--html", type=Path, required=True)
    parser.add_argument("--build-report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--source-dir",
        type=Path,
        action="append",
        default=[],
        help="Directory containing a manifest source file (repeatable)",
    )
    args = parser.parse_args()

    for path in (
        args.glb,
        args.manifest,
        args.station_evidence,
        args.surface_contract,
        args.asset_contract,
        args.html,
        args.build_report,
    ):
        assert path.is_file(), f"missing file: {path}"

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    station = json.loads(args.station_evidence.read_text(encoding="utf-8"))
    surface = json.loads(args.surface_contract.read_text(encoding="utf-8"))
    contract = json.loads(args.asset_contract.read_text(encoding="utf-8"))
    build = json.loads(args.build_report.read_text(encoding="utf-8"))
    document = glb_json(args.glb)
    html = args.html.read_text(encoding="utf-8")

    glb_hash = sha256(args.glb)
    assert build["embeddedGlbSha256"] == glb_hash, "embedded GLB build hash drift"
    assert build["sha256"] == sha256(args.html), "HTML build hash drift"
    assert build["singleFile"] and build["directFileOpen"], "delivery contract drift"
    assert len(html.encode("utf-8")) <= contract["budgets"]["htmlBytes"], "HTML budget exceeded"

    for token in (
        "__GLB_BASE64__",
        "__MANIFEST_JSON__",
        "__STATION_EVIDENCE_JSON__",
        "__SURFACE_CONTRACT_JSON__",
    ):
        assert token not in html, f"unresolved token {token}"
    assert "Image2Three" not in html and "image2three" not in html.lower()

    required_controls = (
        'data-stage="isolated"',
        'data-stage="waist-starboard"',
        'data-stage="waist-port"',
        'data-stage="a13"',
        'data-stage="feed"',
        'id="surface-scheme"',
        'id="wear"',
        'id="oil"',
        'id="oxidation"',
        'id="roughness"',
        'id="field-scale"',
        'id="field-seed"',
        'id="internal-toggle"',
        'id="service-toggle"',
        'id="ammo-toggle"',
        'id="reference-toggle"',
        'id="fire-toggle"',
        'id="single-shot"',
        'id="tracer-toggle"',
        'id="clear-debris"',
    )
    for item in required_controls:
        assert item in html, f"missing control: {item}"

    names = {node.get("name", "") for node in document.get("nodes", [])}
    required_nodes = {
        "gun.receiver_body.source_n023",
        "gun.barrel_jacket_and_core.source_n009",
        "gun.trigger.source_n021",
        "mechanism.bolt.source_n014",
        "mechanism.spring.source_n012",
        "ammo.case.source_n002",
        "ammo.projectile_assembled.source_n004",
        "feed.disintegrating_link.exact_source",
        "b24.waist.starboard.flexible.aircraft_adapter_cradle.source_n0808",
        "b24.waist.starboard.flexible.airframe_triangular_brace.source_n0811",
        "b24.waist.port.flexible.airframe_triangular_brace.source_n0824",
    }
    missing_nodes = sorted(required_nodes - names)
    assert not missing_nodes, f"missing semantic nodes: {missing_nodes}"

    meshes = document.get("meshes", [])
    uv_meshes = 0
    for mesh in meshes:
        for primitive in mesh.get("primitives", []):
            if "TEXCOORD_0" in primitive.get("attributes", {}):
                uv_meshes += 1
    assert uv_meshes >= 20, f"unexpected UV coverage: {uv_meshes} mesh primitives"
    assert len(document.get("materials", [])) >= 8, "material family count regressed"

    assert contract["construction"]["sourceExactExterior"] is True
    assert contract["construction"]["sourceUvPreserved"] is True
    assert abs(contract["construction"]["animationSemantics"]["muzzleSocketMeters"][0] - 0.9795744419) < 1e-10
    assert ".9795744419" in html, "runtime muzzle socket no longer matches source barrel maximum"
    assert "A-13" in " ".join(contract["construction"]["stationMounts"])
    assert contract["approvalGates"]["A13FullGeometry"].startswith("blocked")

    surface_inputs = {item["id"] for item in surface["editableInputs"]}
    for field in ("scheme", "wear", "oil", "oxidation", "roughness", "fieldScale", "seed"):
        assert field in surface_inputs, f"surface input missing: {field}"
    assert surface["geometryPolicy"] == "immutable source geometry"

    station_text = json.dumps(station, ensure_ascii=False)
    for phrase in ("port-starboard", "standing/flexible", "A-13", "E-10"):
        assert phrase.lower() in station_text.lower(), f"station evidence missing: {phrase}"

    source_records = manifest.get("sources", [])
    assert len(source_records) >= 6, "source provenance incomplete"
    for source in source_records:
        candidates = [directory / source["file"] for directory in args.source_dir]
        source_path = next((candidate for candidate in candidates if candidate.is_file()), None)
        assert source_path is not None, f"source missing: {source['file']}"
        assert source["sha256"].lower() == sha256(source_path), f"source hash drift: {source_path}"

    report = {
        "schema": "haihao.aircraft/weapons-mother-validation@1.0.0",
        "status": "PASS",
        "htmlBytes": len(html.encode("utf-8")),
        "htmlSha256": sha256(args.html),
        "glbBytes": args.glb.stat().st_size,
        "glbSha256": glb_hash,
        "nodes": len(document.get("nodes", [])),
        "meshes": len(meshes),
        "materials": len(document.get("materials", [])),
        "uvMeshPrimitives": uv_meshes,
        "sourceRecords": len(source_records),
        "checks": [
            "source hashes",
            "semantic nodes",
            "UV preservation",
            "station evidence",
            "procedural surface controls",
            "single-file delivery",
            "HTML size budget",
            "Image2ThreeJS exclusion",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
