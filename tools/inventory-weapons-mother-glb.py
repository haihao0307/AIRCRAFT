#!/usr/bin/env python3
"""Create a source-traceable node and mesh inventory for Weapons Mother GLBs.

The report is intentionally dependency free.  It preserves source node indexes,
stable hierarchy paths, transforms, primitive attributes, triangle counts and
static accessor bounds so later extraction never has to guess which donor data
was used.
"""

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


def read_glb(path: Path) -> tuple[dict[str, Any], bytes]:
    raw = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(raw):
        raise ValueError(f"invalid glTF 2 GLB: {path}")
    document: dict[str, Any] | None = None
    offset = 12
    while offset < len(raw):
        chunk_length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        payload = raw[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == JSON_CHUNK:
            document = json.loads(payload.rstrip(b"\x00 \t\r\n").decode("utf-8"))
        elif chunk_type == BIN_CHUNK:
            continue
    if document is None:
        raise ValueError(f"GLB has no JSON chunk: {path}")
    return document, raw


def identity() -> list[list[float]]:
    return [[1.0 if row == column else 0.0 for column in range(4)] for row in range(4)]


def multiply(left: list[list[float]], right: list[list[float]]) -> list[list[float]]:
    return [
        [sum(left[row][axis] * right[axis][column] for axis in range(4)) for column in range(4)]
        for row in range(4)
    ]


def local_matrix(node: dict[str, Any]) -> list[list[float]]:
    if "matrix" in node:
        values = [float(value) for value in node["matrix"]]
        return [[values[column * 4 + row] for column in range(4)] for row in range(4)]
    tx, ty, tz = [float(value) for value in node.get("translation", [0, 0, 0])]
    sx, sy, sz = [float(value) for value in node.get("scale", [1, 1, 1])]
    x, y, z, w = [float(value) for value in node.get("rotation", [0, 0, 0, 1])]
    rotation = [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
        [0, 0, 0, 1],
    ]
    scale = [[sx, 0, 0, 0], [0, sy, 0, 0], [0, 0, sz, 0], [0, 0, 0, 1]]
    result = multiply(rotation, scale)
    result[0][3], result[1][3], result[2][3] = tx, ty, tz
    return result


def transform_point(matrix: list[list[float]], point: tuple[float, float, float]) -> list[float]:
    x, y, z = point
    values = [x, y, z, 1.0]
    return [sum(matrix[row][column] * values[column] for column in range(4)) for row in range(3)]


def primitive_triangles(document: dict[str, Any], primitive: dict[str, Any]) -> int:
    accessor_index = primitive.get("indices", primitive.get("attributes", {}).get("POSITION"))
    if accessor_index is None:
        return 0
    count = int(document["accessors"][accessor_index]["count"])
    mode = int(primitive.get("mode", 4))
    if mode == 4:
        return count // 3
    if mode in (5, 6):
        return max(0, count - 2)
    return 0


def rounded_matrix(matrix: list[list[float]]) -> list[float]:
    return [round(matrix[row][column], 8) for column in range(4) for row in range(4)]


def inventory(path: Path) -> dict[str, Any]:
    document, raw = read_glb(path)
    nodes = document.get("nodes", [])
    meshes = document.get("meshes", [])
    accessors = document.get("accessors", [])
    parents: dict[int, int] = {}
    for index, node in enumerate(nodes):
        for child in node.get("children", []):
            parents[int(child)] = index

    result_nodes: list[dict[str, Any]] = []
    visited: set[int] = set()

    def visit(index: int, parent_world: list[list[float]], parent_path: str) -> None:
        if index in visited:
            return
        visited.add(index)
        node = nodes[index]
        name = str(node.get("name") or f"node_{index}")
        stable_path = f"{parent_path}/{index}:{name}" if parent_path else f"/{index}:{name}"
        world = multiply(parent_world, local_matrix(node))
        mesh_index = node.get("mesh")
        mesh_report = None
        if mesh_index is not None:
            mesh = meshes[int(mesh_index)]
            primitives = []
            bounds_min = [math.inf, math.inf, math.inf]
            bounds_max = [-math.inf, -math.inf, -math.inf]
            for primitive_index, primitive in enumerate(mesh.get("primitives", [])):
                attributes = primitive.get("attributes", {})
                position_index = attributes.get("POSITION")
                source_bounds = None
                world_bounds = None
                if position_index is not None:
                    accessor = accessors[int(position_index)]
                    if "min" in accessor and "max" in accessor:
                        low = tuple(float(value) for value in accessor["min"])
                        high = tuple(float(value) for value in accessor["max"])
                        source_bounds = {"min": low, "max": high}
                        primitive_min = [math.inf, math.inf, math.inf]
                        primitive_max = [-math.inf, -math.inf, -math.inf]
                        for corner in itertools.product(*zip(low, high)):
                            point = transform_point(world, corner)
                            for axis in range(3):
                                primitive_min[axis] = min(primitive_min[axis], point[axis])
                                primitive_max[axis] = max(primitive_max[axis], point[axis])
                                bounds_min[axis] = min(bounds_min[axis], point[axis])
                                bounds_max[axis] = max(bounds_max[axis], point[axis])
                        world_bounds = {
                            "min": [round(value, 8) for value in primitive_min],
                            "max": [round(value, 8) for value in primitive_max],
                        }
                primitives.append(
                    {
                        "primitiveIndex": primitive_index,
                        "triangles": primitive_triangles(document, primitive),
                        "attributes": sorted(attributes),
                        "materialIndex": primitive.get("material"),
                        "sourceAccessorBounds": source_bounds,
                        "worldAccessorBounds": world_bounds,
                    }
                )
            finite = all(math.isfinite(value) for value in bounds_min + bounds_max)
            mesh_report = {
                "meshIndex": int(mesh_index),
                "meshName": mesh.get("name"),
                "triangles": sum(item["triangles"] for item in primitives),
                "primitives": primitives,
                "worldAccessorBounds": {
                    "min": [round(value, 8) for value in bounds_min],
                    "max": [round(value, 8) for value in bounds_max],
                    "size": [round(bounds_max[axis] - bounds_min[axis], 8) for axis in range(3)],
                }
                if finite
                else None,
            }
        result_nodes.append(
            {
                "nodeIndex": index,
                "name": name,
                "stablePath": stable_path,
                "parentNodeIndex": parents.get(index),
                "childNodeIndexes": [int(value) for value in node.get("children", [])],
                "localMatrixColumnMajor": rounded_matrix(local_matrix(node)),
                "worldMatrixColumnMajor": rounded_matrix(world),
                "mesh": mesh_report,
                "skinIndex": node.get("skin"),
                "cameraIndex": node.get("camera"),
            }
        )
        for child in node.get("children", []):
            visit(int(child), world, stable_path)

    scene_index = int(document.get("scene", 0))
    scenes = document.get("scenes", [])
    roots = [int(value) for value in scenes[scene_index].get("nodes", [])] if scenes else []
    for root in roots:
        visit(root, identity(), "")
    for index in range(len(nodes)):
        if index not in visited:
            visit(index, identity(), "/unreferenced")

    asset = document.get("asset", {})
    return {
        "schema": "haihao.aircraft/weapons-mother-source-node-inventory@1.0.0",
        "source": {
            "file": path.name,
            "absolutePath": str(path),
            "bytes": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "asset": asset,
        },
        "counts": {
            "nodes": len(nodes),
            "meshes": len(meshes),
            "materials": len(document.get("materials", [])),
            "animations": len(document.get("animations", [])),
            "animationChannels": sum(
                len(animation.get("channels", [])) for animation in document.get("animations", [])
            ),
        },
        "sceneRootNodeIndexes": roots,
        "nodes": result_nodes,
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = [inventory(path.resolve()) for path in args.paths]
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8", newline="\n")
    else:
        print(payload, end="")


if __name__ == "__main__":
    main()
