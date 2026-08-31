#!/usr/bin/env python3
"""Validate the V010 right-waist parity, hierarchy, physics and delivery contract."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import struct
from pathlib import Path


REMOTE_SOURCE_URL = "https://raw.githubusercontent.com/haihao0307/AIRCRAFT/cdcd5bfbf3c01d10c09eec3c2d386dab5251ad52/data/weapons-mother/b24-m2-aircraft-v004/distilled-reference.glb.gz"


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


def vector_subtract(left: list[float], right: list[float]) -> list[float]:
    return [left[axis] - right[axis] for axis in range(3)]


def vector_dot(left: list[float], right: list[float]) -> float:
    return sum(left[axis] * right[axis] for axis in range(3))


def vector_normalized(value: list[float]) -> list[float]:
    length = vector_dot(value, value) ** 0.5
    assert length > 1e-9, "zero-length landmark vector"
    return [component / length for component in value]


def projected_radial(point: list[float], origin: list[float], forward: list[float]) -> list[float]:
    delta = vector_subtract(point, origin)
    along = vector_dot(delta, forward)
    return [delta[axis] - forward[axis] * along for axis in range(3)]


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
    parser.add_argument("--expected-glb-url", default=REMOTE_SOURCE_URL)
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
    assert build["externalGlbUrl"] == args.expected_glb_url
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

    required_controls = (
        'data-stage="isolated"',
        'data-stage="waist-starboard"',
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
        'id="audio-toggle"',
        'id="clear-debris"',
    )
    for item in required_controls:
        assert item in html, f"missing control: {item}"
    assert 'data-stage="waist-port"' not in html and 'data-stage="a13"' not in html, "unaccepted stations are still interactive"

    assert 'class="control active" data-stage="waist-starboard"' in html, "default stage is not the starboard source-calibration view"
    assert 'setStage("waist-starboard")' in html, "runtime default stage drift"
    assert "root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),data.direction)" in html, "projectile tip is not aligned directly to trajectory"
    assert "const yToX=" not in html, "obsolete projectile-axis mapping returned"
    assert "makeAirframeInterface" not in html, "invented generic airframe interface returned"
    assert "B24_WAIST_FEED_AMMO_BOX_REFERENCE_ATTACHMENT" not in html, "unapproved generic ammunition box returned"
    assert "makeAircraftFeedAssembly" in html and "deriveSourceFeedCurve" in html and "LIVE_12_7X99_LINKED_BELT" in html, "source-routed live-round feed system missing"
    assert "REFERENCE_CONTAINER_LINKED_AMMUNITION_VISIBLE_PACK" in html and "MANUAL_FLEXIBLE_CHUTE_SIDE_RAIL" in html, "filled box-to-feedway route missing"
    assert "connectedToGun:true" in html and "airframeFixed:true" in html and 'parentSpace:"station-mount"' in html, "feed hierarchy is not airframe-fixed and gun-connected"
    assert "sourceFeedNode.visible=false" in html and "sourceFeedNode.parent.remove(sourceFeedNode)" not in html, "source B-24 route evidence was deleted instead of retained hidden"
    assert "mount.add(assembly)" in html and "gun.add(assembly)" not in html, "ammunition box and chute incorrectly inherit gun motion"
    assert "feedFrame(curve" in html and "roundAxis.dot(tangent)" in html, "round axes are not derived from belt tangent and gun bore"
    assert "cannon-es@0.20.0" in html and "new CANNON.Plane" in html, "rigid-body solver missing"
    assert "physicsWorld.step(1/60,dt,3)" in html, "fixed-step debris physics missing"
    assert "impactLimit:2+Math.floor(Math.random()*3)" in html, "debris impact limit must remain 2-4"
    assert "findSupportBody(event)" in html and "isSupport:true" in html, "only support collisions may count toward settling"
    assert "refreshSupportContacts()" in html and "physicsWorld.contacts" in html, "settling does not verify current support contact"
    assert "state.supported=false;state.supportBody=null" in html, "stale support state can still freeze debris in midair"
    assert "pendingSupport" not in html, "stale remembered support can still freeze debris in midair"
    assert "state.impactCount>=state.impactLimit&&state.supported" in html, "2-4 impact debris stop rule is not enforced"
    assert "MAX_ACTIVE_DEBRIS=96" in html and "MAX_SETTLED_PER_TYPE=8192" in html and "MAX_RECENT_SETTLED_COLLIDERS=72" in html, "bounded debris pools missing"
    assert "new THREE.InstancedMesh(cachedRuntimeGeometry(type)" in html, "settled debris instancing missing"
    assert "physicsWorld.removeBody(body)" in html, "settled debris remains in the dynamic solver"
    assert "data.up.clone().multiplyScalar(-1.34)" in html, "case ejection is not initially downward"
    assert "physicsWorld.removeBody" in html, "debris clear does not remove rigid bodies"
    assert all(token not in html for token in ("landingQuaternion", "pileRadius", "supportHeight", "pileCell", "pileHeightCap", "updatePileSupport", "pileBodies")), "obsolete floating-pile solver returned"
    assert "addSettledCollider" in html and "recentSettledColliders.shift()" in html, "bounded exact settled-debris support queue missing"
    assert "object.position.set(body.position.x,body.position.y,Math.max(body.position.z,floorClamp))" in html, "settled debris is not clamped above the verified floor at its solved support transform"
    assert "DecompressionStream" in html and "force-cache" in html, "compressed remote source loading missing"
    assert "spring.scale.z" in html and "bolt.position.z" in html and "barrel.position.x" in html, "mechanical cycle animation incomplete"
    for semantic in ("cycle.breech_lock", "cycle.accelerator", "cycle.belt_feed_lever", "cycle.feed_slide", "cycle.feed_pawl", "cycle.holding_pawl", "cycle.extractor"):
        assert semantic in html, f"manual-cycle action missing: {semantic}"
    assert all(item in html for item in ("audioDirector.shot", "audioDirector.feed", "audioDirector.eject", "audioDirector.chute", "audioDirector.impact")), "layered Web Audio event map missing"
    assert "Audio(" not in html and ".mp3" not in html.lower() and ".wav" not in html.lower(), "unlicensed external audio returned"
    assert "smokeInstances" in html and "sparkInstances" in html and "muzzleRigs" in html, "pooled firing effects missing"
    assert "effects.push" not in html and "new THREE.PointLight(0xffa554,18" not in html, "per-shot effects or lights returned"
    assert "new THREE.ConeGeometry" not in html, "cartoon cone muzzle flash returned"
    assert "const pressure=new THREE.Mesh(new THREE.TorusGeometry" not in html, "cartoon ring muzzle flash returned"
    assert "data:image" not in html.lower(), "embedded image payload returned"
    assert f'const PACK_URL="{args.expected_glb_url}"' in html, "remote source URL missing"
    assert "外置 GLB" not in html and "exact GLB" not in html, "hosted-GLB wording returned to the interface"
    assert "publishAlignmentQA()" in html and "window.__WM_QA__" in html, "final-world hierarchy alignment QA missing"
    assert 'version:"V010"' in html, "runtime QA version drift"
    assert "stage.matrix.fromArray(station.reviewTransform.matrixColumnMajor)" in html and "centerStage(stage,.16)" not in html, "station still uses an arbitrary post-alignment transform"
    assert "window.__WM_RUNTIME__" in html and "runDebrisStress" in html, "browser stress and inspection API missing"

    for station_id, station_alignment in manifest["stationAlignments"].items():
        alignment = station_alignment["highDetailGunAlignment"]
        matrix = alignment["matrixColumnMajor"]
        source = alignment["sourceLandmarks"]
        target = alignment["targetLandmarks"]
        assert alignment["basisDeterminant"] == 1.0, f"left-handed alignment: {station_id}"
        assert point_error(transform_column_major(matrix, source["muzzle"]), target["muzzle"]) < 1e-6, f"muzzle landmark drift: {station_id}"
        assert point_error(transform_column_major(matrix, source["rear"]), target["rear"]) < 1e-6, f"rear-axis landmark drift: {station_id}"
        mapped_muzzle = transform_column_major(matrix, source["muzzle"])
        mapped_rear = transform_column_major(matrix, source["rear"])
        mapped_roll_datum = transform_column_major(matrix, source["rollDatum"])
        mapped_forward = vector_normalized(vector_subtract(mapped_muzzle, mapped_rear))
        target_forward = vector_normalized(vector_subtract(target["muzzle"], target["rear"]))
        mapped_roll = vector_normalized(projected_radial(mapped_roll_datum, mapped_rear, mapped_forward))
        target_roll = vector_normalized(projected_radial(target["rollDatum"], target["rear"], target_forward))
        assert alignment["sourceUpAxis"] == "+Z", f"source vertical datum drift: {station_id}"
        assert vector_dot(mapped_roll, target_roll) > 0.999999, f"gun-node local +Z roll datum drift: {station_id}"
        review = station_alignment["reviewTransform"]
        assert review["reviewFloorZMeters"] == 0.0
        assert "no bounding-box auto-centering" in review["method"]

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
    assert semantics["alignmentBasis"].startswith("right-handed; determinant +1")
    assert semantics["physicsActiveBodyLimit"] == 96
    assert semantics["settledInstanceCapacityPerType"] == 8192
    assert semantics["recentSettledColliderLimit"] == 72
    assert len(semantics["audioStages"]) >= 7
    assert contract["construction"]["defaultReviewStage"] == "B-24 starboard waist source calibration"
    assert contract["construction"]["completionClaim"] == "corrective review; not AAA-final or engineering-approved"
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
    for phrase in ("b24.waist.starboard.flexible", "standing/flexible", "A-13", "E-10", "11-10-34"):
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
            "node-802 local +Y/+Z final-hierarchy alignment contract",
            "node-799 and manual-constrained airframe-fixed live-round feed assembly",
            "current-support-contact-only bounded Cannon case and link settling",
            "solved-transform persistent debris instancing and bounded exact colliders",
            "pooled non-conical flash, white smoke and fine sparks",
            "six-stage manual-evidence mechanism cycle",
            "layered procedural Web Audio events",
            "procedural surface controls",
            "remote source asset outside the hosted Site",
            "template-entry redirect",
            "HTML size budget",
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
