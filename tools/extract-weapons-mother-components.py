#!/usr/bin/env python3
"""Extract deterministic service modules and one detailed .50-cal cartridge.

The script intentionally reads locked GLB sources with the Python standard
library only. It emits a compact, texture-free GLB whose geometry is assigned
the already-loaded donor materials at runtime. The retired source candidates
are therefore not embedded wholesale in the review page.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable


GUN_SHA256 = "3cb10b4c2cb6ae96656146f55e81f54a66338bcb817ed4727e4d79c38843d813"
AMMO_SHA256 = "d62531f0f9b3a7b65293e22615d51e48bd12d9ae7529214a9bfdc2c5f4887bb8"
GUN_BYTES = 18_536_776
AMMO_BYTES = 43_682_696

COMPONENT_TYPES = {
    5120: ("b", 1),
    5121: ("B", 1),
    5122: ("h", 2),
    5123: ("H", 2),
    5125: ("I", 4),
    5126: ("f", 4),
}
TYPE_COMPONENTS = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
}


@dataclass
class Glb:
    path: Path
    raw: bytes
    document: dict
    binary: bytes
    sha256: str


def load_glb(path: Path, expected_bytes: int, expected_sha256: str) -> Glb:
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    if len(raw) != expected_bytes:
        raise ValueError(f"source byte count changed for {path}: {len(raw)}")
    if digest != expected_sha256:
        raise ValueError(f"source SHA-256 changed for {path}: {digest}")
    if raw[:4] != b"glTF" or struct.unpack_from("<I", raw, 4)[0] != 2:
        raise ValueError(f"not a glTF 2 GLB: {path}")
    json_length, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise ValueError(f"first GLB chunk is not JSON: {path}")
    json_start = 20
    json_end = json_start + json_length
    document = json.loads(raw[json_start:json_end].decode("utf-8").rstrip(" \0"))
    binary_length, binary_type = struct.unpack_from("<II", raw, json_end)
    if binary_type != 0x004E4942:
        raise ValueError(f"second GLB chunk is not BIN: {path}")
    binary_start = json_end + 8
    binary = raw[binary_start : binary_start + binary_length]
    return Glb(path=path, raw=raw, document=document, binary=binary, sha256=digest)


def read_accessor(glb: Glb, accessor_index: int) -> list[tuple[float | int, ...]]:
    accessor = glb.document["accessors"][accessor_index]
    view = glb.document["bufferViews"][accessor["bufferView"]]
    component_type = accessor["componentType"]
    code, component_bytes = COMPONENT_TYPES[component_type]
    component_count = TYPE_COMPONENTS[accessor["type"]]
    packed_size = component_bytes * component_count
    stride = view.get("byteStride", packed_size)
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    fmt = "<" + code * component_count
    return [
        struct.unpack_from(fmt, glb.binary, offset + index * stride)
        for index in range(accessor["count"])
    ]


def mesh_primitive_by_node(glb: Glb, node_name: str) -> dict:
    for node in glb.document["nodes"]:
        if node.get("name") == node_name and "mesh" in node:
            mesh = glb.document["meshes"][node["mesh"]]
            if len(mesh["primitives"]) != 1:
                raise ValueError(f"expected one primitive at {node_name}")
            return mesh["primitives"][0]
    raise KeyError(f"node not found: {node_name}")


def connected_components(
    positions: list[tuple[float | int, ...]], indices: list[int]
) -> tuple[dict[int, list[int]], dict[int, tuple[tuple[float, float, float], tuple[float, float, float]]], list[int]]:
    parent = list(range(len(positions)))

    def find(value: int) -> int:
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value

    def union(left: int, right: int) -> None:
        left_root = find(left)
        right_root = find(right)
        if left_root != right_root:
            parent[right_root] = left_root

    for offset in range(0, len(indices), 3):
        union(indices[offset], indices[offset + 1])
        union(indices[offset], indices[offset + 2])

    roots = [find(index) for index in range(len(positions))]
    members: dict[int, list[int]] = {}
    for index, root in enumerate(roots):
        members.setdefault(root, []).append(index)
    bounds = {}
    for root, vertices in members.items():
        axes = [[float(positions[index][axis]) for index in vertices] for axis in range(3)]
        bounds[root] = (
            tuple(min(axis) for axis in axes),
            tuple(max(axis) for axis in axes),
        )
    return members, bounds, roots


def normalized(vector: Iterable[float]) -> tuple[float, float, float]:
    values = tuple(float(value) for value in vector)
    length = math.sqrt(sum(value * value for value in values)) or 1.0
    return tuple(value / length for value in values)


def transform_ammo_position(
    position: tuple[float | int, ...],
    source_bounds: tuple[tuple[float, float, float], tuple[float, float, float]],
    target_start: float,
    target_length: float,
    target_diameter: float,
) -> tuple[float, float, float]:
    minimum, maximum = source_bounds
    source_length = maximum[0] - minimum[0]
    radial_span = max(maximum[1] - minimum[1], maximum[2] - minimum[2])
    axial_scale = target_length / source_length
    radial_scale = target_diameter / radial_span
    center_y = (minimum[1] + maximum[1]) * 0.5
    center_z = (minimum[2] + maximum[2]) * 0.5
    return (
        (float(position[1]) - center_y) * radial_scale,
        target_start + (float(position[0]) - minimum[0]) * axial_scale,
        (float(position[2]) - center_z) * radial_scale,
    )


def transform_ammo_normal(
    normal: tuple[float | int, ...],
    source_bounds: tuple[tuple[float, float, float], tuple[float, float, float]],
    target_length: float,
    target_diameter: float,
) -> tuple[float, float, float]:
    minimum, maximum = source_bounds
    axial_scale = target_length / (maximum[0] - minimum[0])
    radial_scale = target_diameter / max(maximum[1] - minimum[1], maximum[2] - minimum[2])
    return normalized(
        (
            float(normal[1]) / radial_scale,
            float(normal[0]) / axial_scale,
            float(normal[2]) / radial_scale,
        )
    )


def subset_primitive(
    glb: Glb,
    primitive: dict,
    selected_roots: set[int],
    roots: list[int],
    position_transform: Callable[[tuple[float | int, ...]], tuple[float, float, float]] | None = None,
    normal_transform: Callable[[tuple[float | int, ...]], tuple[float, float, float]] | None = None,
) -> dict:
    source_indices = [int(value[0]) for value in read_accessor(glb, primitive["indices"])]
    selected_triangles = [
        source_indices[offset : offset + 3]
        for offset in range(0, len(source_indices), 3)
        if roots[source_indices[offset]] in selected_roots
    ]
    source_vertices = sorted({index for triangle in selected_triangles for index in triangle})
    remap = {source: target for target, source in enumerate(source_vertices)}
    attributes = {}
    for semantic, accessor_index in primitive["attributes"].items():
        values = read_accessor(glb, accessor_index)
        selected = [values[index] for index in source_vertices]
        if semantic == "POSITION" and position_transform:
            selected = [position_transform(value) for value in selected]
        elif semantic == "NORMAL" and normal_transform:
            selected = [normal_transform(value) for value in selected]
        attributes[semantic] = selected
    return {
        "attributes": attributes,
        "indices": [remap[index] for triangle in selected_triangles for index in triangle],
    }


class GlbBuilder:
    def __init__(self) -> None:
        self.binary = bytearray()
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.meshes: list[dict] = []
        self.nodes: list[dict] = []

    def align(self) -> None:
        while len(self.binary) % 4:
            self.binary.append(0)

    def add_accessor(
        self,
        values: list[tuple[float | int, ...]] | list[int],
        accessor_type: str,
        component_type: int,
        target: int,
        include_bounds: bool = False,
    ) -> int:
        self.align()
        offset = len(self.binary)
        code, _ = COMPONENT_TYPES[component_type]
        component_count = TYPE_COMPONENTS[accessor_type]
        fmt = "<" + code * component_count
        tuples = [(value,) if not isinstance(value, tuple) else value for value in values]
        for value in tuples:
            self.binary.extend(struct.pack(fmt, *value))
        byte_length = len(self.binary) - offset
        view_index = len(self.buffer_views)
        self.buffer_views.append(
            {"buffer": 0, "byteOffset": offset, "byteLength": byte_length, "target": target}
        )
        accessor = {
            "bufferView": view_index,
            "byteOffset": 0,
            "componentType": component_type,
            "count": len(values),
            "type": accessor_type,
        }
        if include_bounds and values:
            axes = list(zip(*tuples))
            accessor["min"] = [min(axis) for axis in axes]
            accessor["max"] = [max(axis) for axis in axes]
        accessor_index = len(self.accessors)
        self.accessors.append(accessor)
        return accessor_index

    def add_mesh(self, name: str, subset: dict, material: int) -> int:
        attributes = {}
        for semantic, values in subset["attributes"].items():
            if semantic.startswith("TEXCOORD_"):
                accessor_type = "VEC2"
            elif semantic == "TANGENT":
                accessor_type = "VEC4"
            else:
                accessor_type = "VEC3"
            attributes[semantic] = self.add_accessor(
                values,
                accessor_type,
                5126,
                34962,
                include_bounds=semantic == "POSITION",
            )
        indices = subset["indices"]
        component_type = 5123 if max(indices, default=0) <= 65_535 else 5125
        index_accessor = self.add_accessor(indices, "SCALAR", component_type, 34963)
        mesh_index = len(self.meshes)
        self.meshes.append(
            {
                "name": name,
                "primitives": [
                    {
                        "attributes": attributes,
                        "indices": index_accessor,
                        "material": material,
                        "mode": 4,
                    }
                ],
            }
        )
        self.nodes.append({"name": name, "mesh": mesh_index})
        return mesh_index

    def build(self, extras: dict) -> bytes:
        self.align()
        document = {
            "asset": {"version": "2.0", "generator": "Weapons Mother component extractor"},
            "scene": 0,
            "scenes": [{"name": "WM_COMPONENTS", "nodes": list(range(len(self.nodes)))}],
            "nodes": self.nodes,
            "meshes": self.meshes,
            "materials": [
                {"name": "donor_material_placeholder", "pbrMetallicRoughness": {"baseColorFactor": [0.2, 0.22, 0.22, 1], "metallicFactor": 0.8, "roughnessFactor": 0.36}},
                {"name": "case_brass_placeholder", "pbrMetallicRoughness": {"baseColorFactor": [0.58, 0.31, 0.08, 1], "metallicFactor": 0.9, "roughnessFactor": 0.26}},
                {"name": "projectile_copper_placeholder", "pbrMetallicRoughness": {"baseColorFactor": [0.54, 0.16, 0.05, 1], "metallicFactor": 0.82, "roughnessFactor": 0.24}},
            ],
            "buffers": [{"byteLength": len(self.binary)}],
            "bufferViews": self.buffer_views,
            "accessors": self.accessors,
            "extras": extras,
        }
        json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        while len(json_bytes) % 4:
            json_bytes += b" "
        binary_bytes = bytes(self.binary)
        while len(binary_bytes) % 4:
            binary_bytes += b"\0"
        total_length = 12 + 8 + len(json_bytes) + 8 + len(binary_bytes)
        return b"".join(
            [
                struct.pack("<4sII", b"glTF", 2, total_length),
                struct.pack("<II", len(json_bytes), 0x4E4F534A),
                json_bytes,
                struct.pack("<II", len(binary_bytes), 0x004E4942),
                binary_bytes,
            ]
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gun-source", required=True, type=Path)
    parser.add_argument("--ammo-source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    args = parser.parse_args()

    gun = load_glb(args.gun_source.resolve(), GUN_BYTES, GUN_SHA256)
    ammo = load_glb(args.ammo_source.resolve(), AMMO_BYTES, AMMO_SHA256)

    gun_primitive = mesh_primitive_by_node(gun, "M2_0")
    gun_positions = read_accessor(gun, gun_primitive["attributes"]["POSITION"])
    gun_indices = [int(value[0]) for value in read_accessor(gun, gun_primitive["indices"])]
    gun_members, gun_bounds, gun_roots = connected_components(gun_positions, gun_indices)
    gun_groups: dict[str, set[int]] = {"barrel_module": set(), "receiver_module": set(), "backplate_module": set()}
    for root, (minimum, maximum) in gun_bounds.items():
        if maximum[1] <= -0.24:
            gun_groups["backplate_module"].add(root)
        elif minimum[1] >= 0.30 or maximum[1] > 0.72:
            gun_groups["barrel_module"].add(root)
        else:
            gun_groups["receiver_module"].add(root)

    ammo_primitive = mesh_primitive_by_node(ammo, "Object_11")
    ammo_positions = read_accessor(ammo, ammo_primitive["attributes"]["POSITION"])
    ammo_indices = [int(value[0]) for value in read_accessor(ammo, ammo_primitive["indices"])]
    ammo_members, ammo_bounds, ammo_roots = connected_components(ammo_positions, ammo_indices)
    selected_round_roots = {
        root
        for root, (minimum, maximum) in ammo_bounds.items()
        if abs(((minimum[1] + maximum[1]) * 0.5) - 0.70389) < 0.045
        and abs(((minimum[2] + maximum[2]) * 0.5) + 0.01) < 0.065
    }
    case_roots = {root for root in selected_round_roots if ammo_bounds[root][1][0] < 0.81}
    projectile_roots = {root for root in selected_round_roots if ammo_bounds[root][0][0] > 0.79}
    if not case_roots or not projectile_roots:
        raise ValueError("failed to isolate one cartridge from Object_11")

    case_bounds = (
        tuple(min(ammo_bounds[root][0][axis] for root in case_roots) for axis in range(3)),
        tuple(max(ammo_bounds[root][1][axis] for root in case_roots) for axis in range(3)),
    )
    projectile_bounds = (
        tuple(min(ammo_bounds[root][0][axis] for root in projectile_roots) for axis in range(3)),
        tuple(max(ammo_bounds[root][1][axis] for root in projectile_roots) for axis in range(3)),
    )

    builder = GlbBuilder()
    for name in ("barrel_module", "receiver_module", "backplate_module"):
        builder.add_mesh(
            name,
            subset_primitive(gun, gun_primitive, gun_groups[name], gun_roots),
            material=0,
        )
    builder.add_mesh(
        "case_component",
        subset_primitive(
            ammo,
            ammo_primitive,
            case_roots,
            ammo_roots,
            position_transform=lambda value: transform_ammo_position(value, case_bounds, 0.0, 0.099, 0.0204),
            normal_transform=lambda value: transform_ammo_normal(value, case_bounds, 0.099, 0.0204),
        ),
        material=1,
    )
    builder.add_mesh(
        "projectile_component",
        subset_primitive(
            ammo,
            ammo_primitive,
            projectile_roots,
            ammo_roots,
            position_transform=lambda value: transform_ammo_position(value, projectile_bounds, 0.083, 0.055, 0.01295),
            normal_transform=lambda value: transform_ammo_normal(value, projectile_bounds, 0.055, 0.01295),
        ),
        material=2,
    )

    extras = {
        "schema": "haihao.aircraft/weapons-mother-component-pack@1.0.0",
        "gunSourceSha256": gun.sha256,
        "ammoSourceSha256": ammo.sha256,
        "ammoSourceNode": "Object_11",
        "gunSourceNode": "M2_0",
        "dimensionsMeters": {
            "caseLength": 0.099,
            "caseDiameter": 0.0204,
            "projectileVisibleStart": 0.083,
            "cartridgeOverallLength": 0.138,
            "projectileDiameter": 0.01295,
        },
        "status": "source-derived-visual-component; dimensions remain review values",
    }
    output_bytes = builder.build(extras)
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output_bytes)
    output_sha256 = hashlib.sha256(output_bytes).hexdigest()
    manifest = {
        "schema": "haihao.aircraft/weapons-mother-component-extraction@1.0.0",
        "status": "source-derived-visual-components-user-review",
        "sources": [
            {"file": gun.path.name, "bytes": len(gun.raw), "sha256": gun.sha256, "node": "M2_0", "role": "service modules"},
            {"file": ammo.path.name, "bytes": len(ammo.raw), "sha256": ammo.sha256, "node": "Object_11", "role": "case and projectile geometry"},
        ],
        "output": {"file": str(output_path), "bytes": len(output_bytes), "sha256": output_sha256},
        "nodes": [node["name"] for node in builder.nodes],
        "componentCounts": {
            "gunSourceConnectedComponents": len(gun_members),
            "ammoSourceConnectedComponents": len(ammo_members),
            "selectedCaseComponents": len(case_roots),
            "selectedProjectileComponents": len(projectile_roots),
        },
        "limitations": [
            "Gun modules are grouped by connected-component position, not an approved M2 parts catalog.",
            "Cartridge geometry is source-derived and rescaled to review dimensions; it is not an ordnance manufacturing model.",
            "No retired candidate GLB is embedded wholesale in the review artifact.",
        ],
    }
    manifest_path = args.manifest.resolve()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
