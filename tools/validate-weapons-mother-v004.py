#!/usr/bin/env python3
"""Validate V004 source parity, delivery integrity, and user-facing controls."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path


REMOTE_SOURCE_URL = "https://raw.githubusercontent.com/haihao0307/AIRCRAFT/refs/heads/feature/b24-weapons-mother-v1/data/weapons-mother/b24-m2-aircraft-v004/distilled-reference.glb.gz"


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


def transform_column_major(matrix: list[float], point: list[float]) -> list[float]:
    return [
        matrix[row] * point[0]
        + matrix[4 + row] * point[1]
        + matrix[8 + row] * point[2]
        + matrix[12 + row]
        for row in range(3)
    ]


def point_error(left: list[float], right: list[float]) -> float:
    return sum((left[axis] - right[axis]) ** 2 for axis in range(3)) ** 0.5


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--glb", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--station-evidence", type=Path, required=True)
    parser.add_argument("--surface-contract", type=Path, required=True)
    parser.add_argument("--asset-contract", type=Path, required=True)
    parser.add_argument("--template", type=Path, required=True)
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
        args.template,
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
    template = args.template.read_text(encoding="utf-8")
    html = args.html.read_text(encoding="utf-8")

    glb_hash = sha256(args.glb)
    assert build["embeddedGlbSha256"] == glb_hash, "source GLB build hash drift"
    assert build["sha256"] == sha256(args.html), "HTML build hash drift"
    assert build["assetMode"] == "external", "online external-asset mode drift"
    assert build["externalGlbUrl"] == REMOTE_SOURCE_URL
    assert not build["singleFile"] and not build["directFileOpen"], "online delivery contract drift"
    assert len(html.encode("utf-8")) <= contract["budgets"]["htmlBytes"], "HTML budget exceeded"
    assert args.glb.stat().st_size <= contract["budgets"]["externalGlbBytes"], "GLB budget exceeded"
    compressed_source = args.glb.with_suffix(args.glb.suffix + ".gz")
    assert compressed_source.is_file(), "compressed remote source missing"
    assert compressed_source.stat().st_size <= contract["budgets"]["remoteCompressedSourceBytes"], "compressed source budget exceeded"
    assert hashlib.sha256(gzip.open(compressed_source, "rb").read()).hexdigest() == glb_hash, "compressed source does not restore the exact GLB"

    for token in (
        "__GLB_BASE64__",
        "__GLB_URL_JSON__",
        "__MANIFEST_JSON__",
        "__STATION_EVIDENCE_JSON__",
        "__SURFACE_CONTRACT_JSON__",
    ):
        assert token not in html, f"unresolved token {token}"
    assert "weaponsMotherTemplateSource" in template, "template direct-open guard missing"
    assert "../../preview/weapons-mother/b24-m2-aircraft-v004/index.html" in template, "template redirect target drift"
    assert "if(weaponsMotherTemplateSource)await new Promise(()=>{})" in template, "template module guard missing"
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

    assert 'class="control active" data-stage="waist-starboard"' in html, "default stage is not the complete starboard waist installation"
    assert 'setStage("waist-starboard")' in html, "runtime default stage drift"
    assert "root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),data.direction)" in html, "projectile tip is not aligned directly to trajectory"
    assert "const yToX=" not in html, "obsolete projectile-axis mapping returned"
    assert "makeAirframeInterface" not in html, "invented generic airframe interface returned"
    assert "B24_WAIST_FEED_AMMO_BOX_REFERENCE_ATTACHMENT" not in html, "unapproved generic ammunition box returned"
    assert "makeAircraftFeedAssembly" in html and "LIVE_12_7X99_LINKED_BELT" in html, "live-round feed system missing"
    assert "connectedToGun:true" in html and "originalRoutingMeshVisible:false" in html, "feed rounds are not bore-aligned and connected"
    assert "sourceFeedNode.parent.remove(sourceFeedNode)" in html, "obsolete B-24 routing ribbon is still visible"
    assert "cannon-es@0.20.0" in html and "new CANNON.Plane" in html, "rigid-body solver missing"
    assert "physicsWorld.step(1/60,dt,4)" in html, "fixed-step debris physics missing"
    assert "impactLimit:2+Math.floor(Math.random()*3)" in html, "debris impact limit must remain 2-4"
    assert "body.type=CANNON.Body.STATIC" in html, "settled debris is not removed from dynamic simulation"
    assert "data.up.clone().multiplyScalar(-1.28)" in html, "case ejection is not initially downward"
    assert "physicsWorld.removeBody" in html, "debris clear does not remove rigid bodies"
    assert "landingQuaternion" not in html and "pileRadius" not in html and "supportHeight" not in html, "obsolete floating-pile solver returned"
    assert "DecompressionStream" in html and "force-cache" in html, "compressed remote source loading missing"
    assert "spring.scale.z" in html and "bolt.position.z" in html and "barrel.position.x" in html, "mechanical cycle animation incomplete"
    assert "new THREE.ConeGeometry" not in html, "cartoon cone muzzle flash returned"
    assert "const pressure=new THREE.Mesh(new THREE.TorusGeometry" not in html, "cartoon ring muzzle flash returned"
    assert "data:image" not in html.lower(), "embedded image payload returned"
    assert f'const PACK_URL="{REMOTE_SOURCE_URL}"' in html, "remote source URL missing"
    assert "外置 GLB" not in html and "exact GLB" not in html, "hosted-GLB wording returned to the interface"

    for station_id, station_alignment in manifest["stationAlignments"].items():
        alignment = station_alignment["highDetailGunAlignment"]
        matrix = alignment["matrixColumnMajor"]
        source = alignment["sourceLandmarks"]
        target = alignment["targetLandmarks"]
        assert alignment["basisDeterminant"] == 1.0, f"left-handed alignment: {station_id}"
        assert point_error(transform_column_major(matrix, source["muzzle"]), target["muzzle"]) < 1e-6, f"muzzle landmark drift: {station_id}"
        assert point_error(transform_column_major(matrix, source["rear"]), target["rear"]) < 1e-6, f"rear-axis landmark drift: {station_id}"

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
        "b24.waist.starboard.flexible.rear_sight_exact.source_n0802",
        "b24.waist.port.flexible.rear_sight_exact.source_n0821",
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
    semantics = contract["construction"]["animationSemantics"]
    assert abs(semantics["muzzleSocketMeters"][0] - 0.9795744419) < 1e-10
    assert semantics["sourceProjectileAxis"] == "+Z"
    assert semantics["runtimeProjectileAxis"] == "source +Z tip aligned directly to measured world trajectory"
    assert semantics["sourceCaseAxis"] == "+Z"
    assert semantics["b24SourceUp"] == "+Y" and semantics["rendererUp"] == "+Z"
    assert semantics["starboardReferenceMuzzleAxis"] == "+Y"
    assert semantics["portReferenceMuzzleAxis"] == "-Y"
    assert semantics["alignmentBasis"] == "right-handed; determinant +1"
    assert contract["construction"]["defaultReviewStage"] == "B-24 starboard waist complete installation"
    starboard = contract["construction"]["sourceStationAssemblies"]["starboardWaist"]
    assert starboard == {
        "feedNode": 799,
        "gunNode": 802,
        "pivotNode": 805,
        "adapterCradleNode": 808,
        "airframeBraceNode": 811,
        "rearSightComponentRoots": [796, 800],
    }
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
            "projectile and source coordinate axes",
            "side-specific source-datum alignment",
            "source aircraft support and live-round feed assembly",
            "Cannon rigid-body case and link settling",
            "non-conical layered muzzle effect",
            "procedural surface controls",
            "remote source asset outside the hosted Site",
            "template-entry redirect",
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
