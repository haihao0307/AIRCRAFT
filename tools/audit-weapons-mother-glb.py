#!/usr/bin/env python3
"""Deterministic, dependency-free intake audit for Weapons Mother GLB sources."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import struct
import sys
from pathlib import Path
from typing import Any


JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def read_glb(path: Path) -> tuple[dict[str, Any], bytes, bytes]:
    raw = path.read_bytes()
    if len(raw) < 20:
        raise ValueError("file is too small to be a GLB")
    magic, version, declared_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2:
        raise ValueError(f"unsupported GLB header: magic={magic!r}, version={version}")
    if declared_length != len(raw):
        raise ValueError(
            f"declared GLB length {declared_length} does not match file length {len(raw)}"
        )

    gltf: dict[str, Any] | None = None
    binary = b""
    offset = 12
    while offset < len(raw):
        if offset + 8 > len(raw):
            raise ValueError("truncated GLB chunk header")
        chunk_length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        end = offset + chunk_length
        if end > len(raw):
            raise ValueError("truncated GLB chunk payload")
        payload = raw[offset:end]
        offset = end
        if chunk_type == JSON_CHUNK:
            gltf = json.loads(payload.rstrip(b"\x00 \t\r\n").decode("utf-8"))
        elif chunk_type == BIN_CHUNK:
            binary = payload

    if gltf is None:
        raise ValueError("GLB has no JSON chunk")
    return gltf, binary, raw


def matrix_identity() -> list[list[float]]:
    return [[1.0 if row == col else 0.0 for col in range(4)] for row in range(4)]


def matrix_multiply(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    return [
        [sum(a[row][k] * b[k][col] for k in range(4)) for col in range(4)]
        for row in range(4)
    ]


def node_matrix(node: dict[str, Any]) -> list[list[float]]:
    if "matrix" in node:
        source = [float(value) for value in node["matrix"]]
        return [[source[col * 4 + row] for col in range(4)] for row in range(4)]

    tx, ty, tz = [float(value) for value in node.get("translation", [0, 0, 0])]
    sx, sy, sz = [float(value) for value in node.get("scale", [1, 1, 1])]
    x, y, z, w = [float(value) for value in node.get("rotation", [0, 0, 0, 1])]

    xx, yy, zz = x * x, y * y, z * z
    xy, xz, yz = x * y, x * z, y * z
    wx, wy, wz = w * x, w * y, w * z
    rotation = [
        [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 0],
        [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0],
        [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0],
        [0, 0, 0, 1],
    ]
    scale = [[sx, 0, 0, 0], [0, sy, 0, 0], [0, 0, sz, 0], [0, 0, 0, 1]]
    transform = matrix_multiply(rotation, scale)
    transform[0][3], transform[1][3], transform[2][3] = tx, ty, tz
    return transform


def transform_point(matrix: list[list[float]], point: tuple[float, float, float]) -> list[float]:
    x, y, z = point
    values = [x, y, z, 1.0]
    return [sum(matrix[row][col] * values[col] for col in range(4)) for row in range(3)]


def image_dimensions(payload: bytes) -> tuple[int, int] | None:
    if payload.startswith(b"\x89PNG\r\n\x1a\n") and len(payload) >= 24:
        return struct.unpack_from(">II", payload, 16)
    if payload.startswith(b"\xff\xd8"):
        offset = 2
        while offset + 9 <= len(payload):
            if payload[offset] != 0xFF:
                offset += 1
                continue
            marker = payload[offset + 1]
            offset += 2
            if marker in (0xD8, 0xD9):
                continue
            if offset + 2 > len(payload):
                break
            segment_length = struct.unpack_from(">H", payload, offset)[0]
            if marker in {
                0xC0,
                0xC1,
                0xC2,
                0xC3,
                0xC5,
                0xC6,
                0xC7,
                0xC9,
                0xCA,
                0xCB,
                0xCD,
                0xCE,
                0xCF,
            } and offset + 7 <= len(payload):
                height, width = struct.unpack_from(">HH", payload, offset + 3)
                return width, height
            if segment_length < 2:
                break
            offset += segment_length
    if payload.startswith(b"RIFF") and payload[8:12] == b"WEBP" and len(payload) >= 30:
        kind = payload[12:16]
        if kind == b"VP8X":
            width = 1 + int.from_bytes(payload[24:27], "little")
            height = 1 + int.from_bytes(payload[27:30], "little")
            return width, height
        if kind == b"VP8L" and len(payload) >= 25:
            bits = int.from_bytes(payload[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    return None


def image_payload(gltf: dict[str, Any], binary: bytes, image: dict[str, Any]) -> bytes | None:
    view_index = image.get("bufferView")
    if view_index is None:
        return None
    view = gltf.get("bufferViews", [])[view_index]
    if view.get("buffer", 0) != 0:
        return None
    start = int(view.get("byteOffset", 0))
    end = start + int(view["byteLength"])
    return binary[start:end]


def accessor_count(gltf: dict[str, Any], index: int | None) -> int:
    if index is None:
        return 0
    return int(gltf.get("accessors", [])[index].get("count", 0))


def primitive_triangles(gltf: dict[str, Any], primitive: dict[str, Any]) -> int:
    count = accessor_count(gltf, primitive.get("indices"))
    if not count:
        count = accessor_count(gltf, primitive.get("attributes", {}).get("POSITION"))
    mode = int(primitive.get("mode", 4))
    if mode == 4:
        return count // 3
    if mode in (5, 6):
        return max(0, count - 2)
    return 0


def audit(path: Path) -> dict[str, Any]:
    gltf, binary, raw = read_glb(path)
    accessors = gltf.get("accessors", [])
    meshes = gltf.get("meshes", [])
    nodes = gltf.get("nodes", [])
    scene_index = int(gltf.get("scene", 0))
    scenes = gltf.get("scenes", [])

    primitive_count = 0
    geometry_vertices = 0
    geometry_triangles = 0
    morph_target_count = 0
    for mesh in meshes:
        for primitive in mesh.get("primitives", []):
            primitive_count += 1
            geometry_vertices += accessor_count(
                gltf, primitive.get("attributes", {}).get("POSITION")
            )
            geometry_triangles += primitive_triangles(gltf, primitive)
            morph_target_count += len(primitive.get("targets", []))

    duplicate_names: list[dict[str, Any]] = []
    name_indexes: dict[str, list[int]] = {}
    for index, node in enumerate(nodes):
        name_indexes.setdefault(node.get("name", ""), []).append(index)
    for name, indexes in sorted(name_indexes.items()):
        if name and len(indexes) > 1:
            duplicate_names.append({"name": name, "nodeIndexes": indexes})

    bounds_min = [math.inf, math.inf, math.inf]
    bounds_max = [-math.inf, -math.inf, -math.inf]
    scene_mesh_instances = 0
    scene_primitive_instances = 0
    scene_triangle_instances = 0

    def visit(node_index: int, parent: list[list[float]]) -> None:
        nonlocal scene_mesh_instances, scene_primitive_instances, scene_triangle_instances
        node = nodes[node_index]
        world = matrix_multiply(parent, node_matrix(node))
        mesh_index = node.get("mesh")
        if mesh_index is not None:
            scene_mesh_instances += 1
            mesh = meshes[mesh_index]
            for primitive in mesh.get("primitives", []):
                scene_primitive_instances += 1
                scene_triangle_instances += primitive_triangles(gltf, primitive)
                position_index = primitive.get("attributes", {}).get("POSITION")
                if position_index is None:
                    continue
                accessor = accessors[position_index]
                if "min" not in accessor or "max" not in accessor:
                    continue
                low = [float(value) for value in accessor["min"]]
                high = [float(value) for value in accessor["max"]]
                for corner in itertools.product(*zip(low, high)):
                    point = transform_point(world, corner)
                    for axis in range(3):
                        bounds_min[axis] = min(bounds_min[axis], point[axis])
                        bounds_max[axis] = max(bounds_max[axis], point[axis])
        for child in node.get("children", []):
            visit(int(child), world)

    if scenes:
        for root in scenes[scene_index].get("nodes", []):
            visit(int(root), matrix_identity())

    finite_bounds = all(math.isfinite(value) for value in bounds_min + bounds_max)
    bounds = None
    if finite_bounds:
        size = [bounds_max[axis] - bounds_min[axis] for axis in range(3)]
        center = [(bounds_max[axis] + bounds_min[axis]) / 2 for axis in range(3)]
        bounds = {
            "min": [round(value, 6) for value in bounds_min],
            "max": [round(value, 6) for value in bounds_max],
            "size": [round(value, 6) for value in size],
            "center": [round(value, 6) for value in center],
            "staticAccessorBoundsOnly": True,
        }

    images = []
    decoded_texture_bytes = 0
    for index, image in enumerate(gltf.get("images", [])):
        payload = image_payload(gltf, binary, image)
        dimensions = image_dimensions(payload) if payload else None
        decoded_mip_bytes = None
        if dimensions:
            decoded_mip_bytes = math.ceil(dimensions[0] * dimensions[1] * 4 * 4 / 3)
            decoded_texture_bytes += decoded_mip_bytes
        images.append(
            {
                "index": index,
                "name": image.get("name"),
                "mimeType": image.get("mimeType"),
                "encodedBytes": len(payload) if payload else None,
                "dimensions": list(dimensions) if dimensions else None,
                "estimatedRgba8MipBytes": decoded_mip_bytes,
            }
        )

    materials = []
    for index, material in enumerate(gltf.get("materials", [])):
        materials.append(
            {
                "index": index,
                "name": material.get("name"),
                "alphaMode": material.get("alphaMode", "OPAQUE"),
                "doubleSided": bool(material.get("doubleSided", False)),
                "extensions": sorted(material.get("extensions", {}).keys()),
            }
        )

    animations = []
    for animation_index, animation in enumerate(gltf.get("animations", [])):
        duration = 0.0
        sampler_inputs: set[int] = set()
        for sampler in animation.get("samplers", []):
            input_index = sampler.get("input")
            if input_index is not None:
                sampler_inputs.add(int(input_index))
                maximum = accessors[input_index].get("max", [0])
                if maximum:
                    duration = max(duration, float(maximum[0]))
        channels = []
        for channel in animation.get("channels", []):
            target = channel.get("target", {})
            node_index = target.get("node")
            channels.append(
                {
                    "nodeIndex": node_index,
                    "nodeName": nodes[node_index].get("name") if node_index is not None else None,
                    "path": target.get("path"),
                }
            )
        animations.append(
            {
                "index": animation_index,
                "name": animation.get("name"),
                "durationSeconds": round(duration, 6),
                "channels": channels,
            }
        )

    skins = [
        {
            "index": index,
            "name": skin.get("name"),
            "jointCount": len(skin.get("joints", [])),
            "skeletonNode": skin.get("skeleton"),
        }
        for index, skin in enumerate(gltf.get("skins", []))
    ]

    asset = gltf.get("asset", {})
    extras = asset.get("extras", {})
    return {
        "schema": "haihao.aircraft/weapons-mother-source-glb-audit@1.0.0",
        "file": path.name,
        "bytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "glbVersion": 2,
        "assetMetadata": {
            "generator": asset.get("generator"),
            "title": extras.get("title"),
            "author": extras.get("author"),
            "license": extras.get("license"),
            "source": extras.get("source"),
        },
        "extensionsUsed": gltf.get("extensionsUsed", []),
        "extensionsRequired": gltf.get("extensionsRequired", []),
        "counts": {
            "scenes": len(scenes),
            "nodes": len(nodes),
            "meshes": len(meshes),
            "primitives": primitive_count,
            "vertices": geometry_vertices,
            "triangles": geometry_triangles,
            "morphTargets": morph_target_count,
            "materials": len(gltf.get("materials", [])),
            "textures": len(gltf.get("textures", [])),
            "images": len(gltf.get("images", [])),
            "animations": len(gltf.get("animations", [])),
            "skins": len(gltf.get("skins", [])),
            "cameras": len(gltf.get("cameras", [])),
        },
        "sceneInstances": {
            "meshInstances": scene_mesh_instances,
            "primitiveInstances": scene_primitive_instances,
            "triangleInstances": scene_triangle_instances,
        },
        "bounds": bounds,
        "duplicateNodeNames": duplicate_names,
        "materials": materials,
        "images": images,
        "estimatedDecodedTextureMiB": round(decoded_texture_bytes / 1024 / 1024, 2),
        "animations": animations,
        "skins": skins,
        "intakeStatus": "source-candidate-only",
        "b24MountAssignment": "unresolved-user-mapping-required",
        "geometryApproval": False,
        "runtimeApproval": False,
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    result = [audit(path.resolve()) for path in args.paths]
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
