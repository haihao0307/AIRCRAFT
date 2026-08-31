#!/usr/bin/env python3
"""Build the traceable Weapons Mother AN/M2 geometry distillation pack.

The source vertex data, normals and UVs are copied exactly.  Only hierarchy,
semantic names, placeholder surface bindings and documented group transforms
are added.  No source mesh is decimated, smoothed or non-uniformly reshaped.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import struct
import sys
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
SOURCE_MODULE_PATH = HERE / "extract-weapons-mother-components.py"
SPEC = importlib.util.spec_from_file_location("wm_component_extract", SOURCE_MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load {SOURCE_MODULE_PATH}")
SOURCE_MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = SOURCE_MODULE
SPEC.loader.exec_module(SOURCE_MODULE)

Glb = SOURCE_MODULE.Glb
GlbBuilder = SOURCE_MODULE.GlbBuilder
load_glb = SOURCE_MODULE.load_glb
read_accessor = SOURCE_MODULE.read_accessor
connected_components = SOURCE_MODULE.connected_components
subset_primitive = SOURCE_MODULE.subset_primitive


LOCKS = {
    "b24": {
        "bytes": 23_085_972,
        "sha256": "541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d",
    },
    "anm2": {
        "bytes": 6_548_040,
        "sha256": "2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b",
    },
    "mechanism": {
        "bytes": 11_057_836,
        "sha256": "16c6d1e5edbba99d7a9b6dbff75d55b4abe5cd8974432086d576722f728a499d",
    },
    "cartridge": {
        "bytes": 777_908,
        "sha256": "f109fb80201d3c2339394c41155a4ca5e8f912f732c7d5d83832087356d81026",
    },
    "belt": {
        "bytes": 43_682_696,
        "sha256": "d62531f0f9b3a7b65293e22615d51e48bd12d9ae7529214a9bfdc2c5f4887bb8",
    },
    "fieldPackage": {
        "bytes": 13_456,
        "sha256": "d69ecd2677507db9342a1d66092a8d6cf4255141346b14cc4629303bf1c4f396",
    },
}


MATERIALS = [
    {
        "name": "wm_receiver_steel",
        "extras": {"surface_id": "wm.receiver.steel", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.065, 0.075, 0.073, 1],
            "metallicFactor": 0.92,
            "roughnessFactor": 0.43,
        },
    },
    {
        "name": "wm_barrel_steel",
        "extras": {"surface_id": "wm.barrel.steel", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.052, 0.058, 0.056, 1],
            "metallicFactor": 0.95,
            "roughnessFactor": 0.38,
        },
    },
    {
        "name": "wm_small_steel",
        "extras": {"surface_id": "wm.small.steel", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.08, 0.087, 0.082, 1],
            "metallicFactor": 0.88,
            "roughnessFactor": 0.46,
        },
    },
    {
        "name": "wm_feed_steel",
        "extras": {"surface_id": "wm.feed.steel", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.12, 0.13, 0.12, 1],
            "metallicFactor": 0.82,
            "roughnessFactor": 0.48,
        },
    },
    {
        "name": "wm_case_brass",
        "extras": {"surface_id": "wm.ammo.case.brass", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.57, 0.34, 0.095, 1],
            "metallicFactor": 0.94,
            "roughnessFactor": 0.28,
        },
    },
    {
        "name": "wm_projectile_copper",
        "extras": {"surface_id": "wm.ammo.projectile.copper", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.45, 0.16, 0.055, 1],
            "metallicFactor": 0.9,
            "roughnessFactor": 0.3,
        },
    },
    {
        "name": "wm_mount_structure",
        "extras": {"surface_id": "wm.mount.aircraft.structure", "fieldEnabled": True},
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.11, 0.125, 0.115, 1],
            "metallicFactor": 0.72,
            "roughnessFactor": 0.56,
        },
    },
    {
        "name": "wm_mechanism_reference",
        "extras": {
            "surface_id": "wm.mechanism.reference",
            "fieldEnabled": False,
            "approval": "reference-only",
        },
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.62, 0.19, 0.07, 0.9],
            "metallicFactor": 0.72,
            "roughnessFactor": 0.4,
        },
        "alphaMode": "BLEND",
        "doubleSided": True,
    },
    {
        "name": "wm_b24_reference_gun",
        "extras": {
            "surface_id": "wm.reference.b24.gun",
            "fieldEnabled": False,
            "approval": "locked-reference-mirror",
        },
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.08, 0.32, 0.38, 0.32],
            "metallicFactor": 0.3,
            "roughnessFactor": 0.7,
        },
        "alphaMode": "BLEND",
        "doubleSided": True,
    },
]


def identity() -> list[list[float]]:
    return [[1.0 if row == column else 0.0 for column in range(4)] for row in range(4)]


def multiply(left: list[list[float]], right: list[list[float]]) -> list[list[float]]:
    return [
        [sum(left[row][axis] * right[axis][column] for axis in range(4)) for column in range(4)]
        for row in range(4)
    ]


def node_matrix(node: dict[str, Any]) -> list[list[float]]:
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


def world_matrices(glb: Glb) -> dict[int, list[list[float]]]:
    nodes = glb.document.get("nodes", [])
    parents: dict[int, int] = {}
    for index, node in enumerate(nodes):
        for child in node.get("children", []):
            parents[int(child)] = index
    cache: dict[int, list[list[float]]] = {}

    def world(index: int) -> list[list[float]]:
        if index in cache:
            return cache[index]
        parent = parents.get(index)
        cache[index] = node_matrix(nodes[index]) if parent is None else multiply(world(parent), node_matrix(nodes[index]))
        return cache[index]

    for index in range(len(nodes)):
        world(index)
    return cache


def column_major(matrix: list[list[float]]) -> list[float]:
    return [matrix[row][column] for column in range(4) for row in range(4)]


def source_path(glb: Glb, node_index: int) -> str:
    nodes = glb.document.get("nodes", [])
    parents: dict[int, int] = {}
    for index, node in enumerate(nodes):
        for child in node.get("children", []):
            parents[int(child)] = index
    parts = []
    current: int | None = node_index
    while current is not None:
        parts.append(f"{current}:{nodes[current].get('name') or f'node_{current}'}")
        current = parents.get(current)
    return "/" + "/".join(reversed(parts))


def add_source_node(
    builder: Any,
    glb: Glb,
    source_node_index: int,
    semantic_name: str,
    material_index: int,
    matrices: dict[int, list[list[float]]],
    role: str,
) -> int:
    node = glb.document["nodes"][source_node_index]
    mesh = glb.document["meshes"][node["mesh"]]
    if len(mesh.get("primitives", [])) != 1:
        raise ValueError(f"expected one primitive at source node {source_node_index}")
    primitive = mesh["primitives"][0]
    attributes = {
        semantic: read_accessor(glb, int(accessor_index))
        for semantic, accessor_index in primitive.get("attributes", {}).items()
    }
    if "indices" in primitive:
        indices = [int(value[0]) for value in read_accessor(glb, int(primitive["indices"]))]
    else:
        indices = list(range(len(attributes["POSITION"])))
    builder.add_mesh(
        semantic_name,
        {"attributes": attributes, "indices": indices},
        material=material_index,
    )
    output_index = len(builder.nodes) - 1
    output_node = builder.nodes[output_index]
    output_node["matrix"] = column_major(matrices[source_node_index])
    output_node["extras"] = {
        "sourceFile": glb.path.name,
        "sourceSha256": glb.sha256,
        "sourceNodeIndex": source_node_index,
        "sourceNodeName": node.get("name"),
        "sourceStablePath": source_path(glb, source_node_index),
        "sourceWorldMatrixColumnMajor": column_major(matrices[source_node_index]),
        "sourceAttributes": sorted(attributes),
        "uvPreserved": "TEXCOORD_0" in attributes,
        "geometryOperation": "exact accessor copy; no vertex position modification",
        "role": role,
    }
    return output_index


def add_group(builder: Any, name: str, children: list[int], extras: dict[str, Any]) -> int:
    index = len(builder.nodes)
    builder.nodes.append({"name": name, "children": children, "extras": extras})
    return index


def add_link_subset(
    builder: Any,
    glb: Glb,
    matrices: dict[int, list[list[float]]],
) -> int:
    source_node_index = 12
    node = glb.document["nodes"][source_node_index]
    primitive = glb.document["meshes"][node["mesh"]]["primitives"][0]
    positions = read_accessor(glb, primitive["attributes"]["POSITION"])
    indices = [int(value[0]) for value in read_accessor(glb, primitive["indices"])]
    _, bounds, roots = connected_components(positions, indices)
    selected_roots = {174, 199, 224}
    if not selected_roots.issubset(bounds):
        raise ValueError("locked Object_12 link component roots changed")
    subset = subset_primitive(glb, primitive, selected_roots, roots)
    builder.add_mesh("feed.disintegrating_link.exact_source", subset, material=3)
    output_index = len(builder.nodes) - 1
    low = [min(bounds[root][0][axis] for root in selected_roots) for axis in range(3)]
    high = [max(bounds[root][1][axis] for root in selected_roots) for axis in range(3)]
    center = [(low[axis] + high[axis]) * 0.5 for axis in range(3)]
    source_world = matrices[source_node_index]
    recentered = [row[:] for row in source_world]
    recentered[0][3] = -sum(source_world[0][axis] * center[axis] for axis in range(3))
    recentered[1][3] = -sum(source_world[1][axis] * center[axis] for axis in range(3))
    recentered[2][3] = -sum(source_world[2][axis] * center[axis] for axis in range(3))
    builder.nodes[output_index]["matrix"] = column_major(recentered)
    builder.nodes[output_index]["extras"] = {
        "sourceFile": glb.path.name,
        "sourceSha256": glb.sha256,
        "sourceNodeIndex": source_node_index,
        "sourceNodeName": node.get("name"),
        "sourceStablePath": source_path(glb, source_node_index),
        "selectedConnectedComponentRoots": sorted(selected_roots),
        "sourceComponentBounds": {"min": low, "max": high},
        "sourceAttributes": sorted(subset["attributes"]),
        "uvPreserved": "TEXCOORD_0" in subset["attributes"],
        "geometryOperation": "exact connected-component accessor copy; rigid recenter transform only",
        "role": "M2 disintegrating link visual reference",
    }
    return output_index


def add_source_component_subset(
    builder: Any,
    glb: Glb,
    matrices: dict[int, list[list[float]]],
    source_node_index: int,
    selected_roots: set[int],
    semantic_name: str,
    material_index: int,
    role: str,
) -> int:
    """Copy selected connected components without changing source vertices or UVs."""
    node = glb.document["nodes"][source_node_index]
    primitive = glb.document["meshes"][node["mesh"]]["primitives"][0]
    positions = read_accessor(glb, primitive["attributes"]["POSITION"])
    indices = [int(value[0]) for value in read_accessor(glb, primitive["indices"])]
    _, bounds, roots = connected_components(positions, indices)
    if not selected_roots.issubset(bounds):
        raise ValueError(
            f"locked component roots changed for source node {source_node_index}: {selected_roots}"
        )
    subset = subset_primitive(glb, primitive, selected_roots, roots)
    builder.add_mesh(semantic_name, subset, material=material_index)
    output_index = len(builder.nodes) - 1
    builder.nodes[output_index]["matrix"] = column_major(matrices[source_node_index])
    builder.nodes[output_index]["extras"] = {
        "sourceFile": glb.path.name,
        "sourceSha256": glb.sha256,
        "sourceNodeIndex": source_node_index,
        "sourceNodeName": node.get("name"),
        "sourceStablePath": source_path(glb, source_node_index),
        "selectedConnectedComponentRoots": sorted(selected_roots),
        "sourceAttributes": sorted(subset["attributes"]),
        "uvPreserved": "TEXCOORD_0" in subset["attributes"],
        "geometryOperation": "exact connected-component accessor copy; source world matrix preserved",
        "role": role,
    }
    return output_index


def serialize(builder: Any, roots: list[int], extras: dict[str, Any], asset_id: str) -> bytes:
    builder.align()
    document = {
        "asset": {
            "version": "2.0",
            "generator": f"AIRCRAFT_NATIVE_FORGE Weapons Mother {asset_id} distiller",
            "extras": extras,
        },
        "scene": 0,
        "scenes": [{"name": asset_id.replace("WM_B24_ANM2_", "WM_B24_M2_"), "nodes": roots}],
        "nodes": builder.nodes,
        "meshes": builder.meshes,
        "materials": MATERIALS,
        "buffers": [{"byteLength": len(builder.binary)}],
        "bufferViews": builder.buffer_views,
        "accessors": builder.accessors,
    }
    json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    binary_bytes = bytes(builder.binary)
    while len(binary_bytes) % 4:
        binary_bytes += b"\0"
    total = 12 + 8 + len(json_bytes) + 8 + len(binary_bytes)
    return b"".join(
        [
            struct.pack("<4sII", b"glTF", 2, total),
            struct.pack("<II", len(json_bytes), 0x4E4F534A),
            json_bytes,
            struct.pack("<II", len(binary_bytes), 0x004E4942),
            binary_bytes,
        ]
    )


def normalized_column(values: list[float]) -> list[float]:
    length = math.sqrt(sum(value * value for value in values))
    return [value / length for value in values]


def vector_subtract(left: list[float], right: list[float]) -> list[float]:
    return [left[axis] - right[axis] for axis in range(3)]


def vector_dot(left: list[float], right: list[float]) -> float:
    return sum(left[axis] * right[axis] for axis in range(3))


def vector_cross(left: list[float], right: list[float]) -> list[float]:
    return [
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0],
    ]


def vector_length(value: list[float]) -> float:
    return math.sqrt(vector_dot(value, value))


def vector_normalized(value: list[float]) -> list[float]:
    length = vector_length(value)
    if length < 1e-9:
        raise ValueError("cannot normalize zero-length landmark vector")
    return [component / length for component in value]


def point_mean(points: list[list[float]]) -> list[float]:
    if not points:
        raise ValueError("cannot average an empty landmark selection")
    return [sum(point[axis] for point in points) / len(points) for axis in range(3)]


def point_bounds_center(points: list[list[float]]) -> list[float]:
    return [
        (min(point[axis] for point in points) + max(point[axis] for point in points)) * 0.5
        for axis in range(3)
    ]


def transform_point(matrix: list[list[float]], point: tuple[float | int, ...]) -> list[float]:
    value = [float(point[0]), float(point[1]), float(point[2]), 1.0]
    return [sum(matrix[row][axis] * value[axis] for axis in range(4)) for row in range(3)]


def node_world_positions(
    glb: Glb,
    matrices: dict[int, list[list[float]]],
    node_index: int,
    selected_roots: set[int] | None = None,
) -> list[list[float]]:
    node = glb.document["nodes"][node_index]
    primitive = glb.document["meshes"][node["mesh"]]["primitives"][0]
    positions = read_accessor(glb, primitive["attributes"]["POSITION"])
    selected_indexes = list(range(len(positions)))
    if selected_roots is not None:
        indices = [int(value[0]) for value in read_accessor(glb, primitive["indices"])]
        members, bounds, _ = connected_components(positions, indices)
        if not selected_roots.issubset(bounds):
            raise ValueError(f"landmark roots changed at source node {node_index}")
        selected_indexes = [index for root in selected_roots for index in members[root]]
    matrix = matrices[node_index]
    return [transform_point(matrix, positions[index]) for index in selected_indexes]


def projected_radial(point: list[float], origin: list[float], forward: list[float]) -> list[float]:
    delta = vector_subtract(point, origin)
    along = vector_dot(delta, forward)
    return [delta[axis] - forward[axis] * along for axis in range(3)]


def gun_alignment(
    anm2: Glb,
    anm2_matrices: dict[int, list[list[float]]],
    b24: Glb,
    b24_matrices: dict[int, list[list[float]]],
    gun_node: int,
    muzzle_sign: int,
    sight_roots: set[int],
) -> dict[str, Any]:
    # The locked B-24 gun nodes are authored on a normalized local Y axis.  That
    # node axis is the only rigid datum shared by the receiver, barrel and exact
    # rear-sight subset.  Inferring a bore line from the centroid of the whole
    # exterior mesh tilts the gun because grips and the back plate are not
    # radially symmetric.  Keep the source gun on its declared +X bore axis and
    # map it directly to the station's side-specific local +/-Y node axis.
    source_points = []
    for node_index in (9, 15, 17, 19, 21, 23, 25, 27):
        source_points.extend(node_world_positions(anm2, anm2_matrices, node_index))
    source_min = min(point[0] for point in source_points)
    source_max = max(point[0] for point in source_points)
    source_muzzle_slice = point_mean(
        [point for point in source_points if point[0] > source_max - 0.018]
    )
    source_muzzle = [source_max, source_muzzle_slice[1], source_muzzle_slice[2]]
    source_rear = [source_min, source_muzzle_slice[1], source_muzzle_slice[2]]
    source_forward = [1.0, 0.0, 0.0]
    # The aircraft AN/M2 donor is authored with +X along the bore and +Z as the
    # receiver vertical.  V008 incorrectly inferred the roll datum from node 19
    # (a grip/control component).  Its off-axis center introduced an artificial
    # roll of roughly fourteen degrees even though the bore landmarks passed.
    # Use the source-authored +Z axis directly.  The exact B-24 rear sight is
    # retained as an independent visual landmark; it must not become a second
    # controller that can roll the whole gun away from the station node basis.
    source_up = [0.0, 0.0, 1.0]
    source_roll_datum = [source_rear[0], source_rear[1], source_rear[2] + 1.0]

    target_matrix = b24_matrices[gun_node]
    target_muzzle = transform_point(target_matrix, (0.0, float(muzzle_sign), 0.0))
    target_rear = transform_point(target_matrix, (0.0, float(-muzzle_sign), 0.0))
    target_forward = vector_normalized(
        [target_matrix[row][1] * muzzle_sign for row in range(3)]
    )
    target_sight = point_bounds_center(
        node_world_positions(b24, b24_matrices, gun_node, sight_roots)
    )

    # V009 incorrectly used the rear-sight radial as the station roll datum.
    # On node 802 that radial differs from the node's own local +Z by about
    # fifteen degrees, so the bore endpoints passed while the receiver was
    # visibly rolled.  Node-local +Z is the rigid datum shared by the retained
    # reference receiver, barrel and sight.  Orthogonalize it against the bore
    # axis to remove any source scale/shear residue, then map donor +Z to it.
    raw_target_up = vector_normalized([target_matrix[row][2] for row in range(3)])
    target_up = vector_normalized(
        [
            raw_target_up[axis]
            - target_forward[axis] * vector_dot(raw_target_up, target_forward)
            for axis in range(3)
        ]
    )
    target_roll_datum = [target_rear[axis] + target_up[axis] for axis in range(3)]
    source_width = vector_normalized(vector_cross(source_up, source_forward))
    target_width = vector_normalized(vector_cross(target_up, target_forward))

    source_length = vector_length(vector_subtract(source_muzzle, source_rear))
    target_length = vector_length(vector_subtract(target_muzzle, target_rear))
    scale = target_length / source_length
    source_basis = [source_forward, source_width, source_up]
    target_basis = [target_forward, target_width, target_up]
    rotation = [
        [sum(target_basis[axis][row] * source_basis[axis][column] for axis in range(3)) for column in range(3)]
        for row in range(3)
    ]
    rotation_scale = [[rotation[row][column] * scale for column in range(3)] for row in range(3)]
    translation = [
        target_muzzle[row] - sum(rotation_scale[row][axis] * source_muzzle[axis] for axis in range(3))
        for row in range(3)
    ]
    row_major = [
        rotation_scale[0] + [translation[0]],
        rotation_scale[1] + [translation[1]],
        rotation_scale[2] + [translation[2]],
        [0, 0, 0, 1],
    ]
    return {
        "matrixColumnMajor": column_major(row_major),
        "uniformScale": scale,
        "referenceMuzzleLocalAxis": f"{'+' if muzzle_sign > 0 else '-'}Y",
        "basisDeterminant": 1.0,
        "sourcePrimaryLengthMeters": source_length,
        "targetReferenceLengthMeters": target_length,
        "sourceLandmarks": {
            "muzzle": source_muzzle,
            "rear": source_rear,
            "rollDatum": source_roll_datum,
        },
        "targetLandmarks": {
            "muzzle": target_muzzle,
            "rear": target_rear,
            "rollDatum": target_roll_datum,
            "rearSight": target_sight,
        },
        "sourceUpAxis": "+Z",
        "targetRollDatum": "locked B-24 gun-node local +Z, orthogonalized to the side-specific local +/-Y bore axis",
        "rearSightRole": "independent retained reference landmark; not an alignment controller",
        "method": "uniform scale and right-handed rigid calibration from donor +X bore and +Z vertical to the locked B-24 gun-node +/-Y bore and local +Z basis",
    }


def station_review_transform(
    b24: Glb,
    b24_matrices: dict[int, list[list[float]]],
    anchor_node: int,
    floor_node: int,
) -> dict[str, Any]:
    """Create the one documented source-Y-up to review-Z-up placement.

    The station geometry remains in its exact B-24 world coordinates.  This
    matrix performs only the renderer basis conversion and a reproducible
    translation: the selected aircraft adapter is centered in review X/Y and
    the lowest verified brace vertex is placed on review floor Z=0.
    """

    anchor = point_bounds_center(node_world_positions(b24, b24_matrices, anchor_node))
    floor_points = node_world_positions(b24, b24_matrices, floor_node)
    source_floor_y = min(point[1] for point in floor_points)
    row_major = [
        [1.0, 0.0, 0.0, -anchor[0]],
        [0.0, 0.0, -1.0, anchor[2]],
        [0.0, 1.0, 0.0, -source_floor_y],
        [0.0, 0.0, 0.0, 1.0],
    ]
    return {
        "matrixColumnMajor": column_major(row_major),
        "basisConversion": "B-24 source +Y up to renderer +Z up; +90 degrees about X",
        "anchorNodeIndex": anchor_node,
        "anchorSourceWorldMeters": anchor,
        "floorNodeIndex": floor_node,
        "sourceFloorYMeters": source_floor_y,
        "reviewFloorZMeters": 0.0,
        "method": "exact source world placement plus one documented basis conversion and datum translation; no bounding-box auto-centering",
    }


def verify_field_package(path: Path) -> dict[str, Any]:
    raw = path.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    expected = LOCKS["fieldPackage"]
    if len(raw) != expected["bytes"] or digest != expected["sha256"]:
        raise ValueError(f"procedural field package lock changed: {path}")
    return {"file": path.name, "bytes": len(raw), "sha256": digest}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--b24-source", type=Path, required=True)
    parser.add_argument("--anm2-source", type=Path, required=True)
    parser.add_argument("--mechanism-source", type=Path, required=True)
    parser.add_argument("--cartridge-source", type=Path, required=True)
    parser.add_argument("--belt-source", type=Path, required=True)
    parser.add_argument("--field-package", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument(
        "--alignment-calibration",
        type=Path,
        help="axis-locked surface registration produced by the Weapons Mother calibration tool",
    )
    parser.add_argument(
        "--asset-id",
        default="WM_B24_ANM2_V011",
        help="output asset identifier; defaults to the frozen V011 pack",
    )
    args = parser.parse_args()

    sources = {
        "b24": load_glb(
            args.b24_source.resolve(), LOCKS["b24"]["bytes"], LOCKS["b24"]["sha256"]
        ),
        "anm2": load_glb(
            args.anm2_source.resolve(), LOCKS["anm2"]["bytes"], LOCKS["anm2"]["sha256"]
        ),
        "mechanism": load_glb(
            args.mechanism_source.resolve(),
            LOCKS["mechanism"]["bytes"],
            LOCKS["mechanism"]["sha256"],
        ),
        "cartridge": load_glb(
            args.cartridge_source.resolve(),
            LOCKS["cartridge"]["bytes"],
            LOCKS["cartridge"]["sha256"],
        ),
        "belt": load_glb(
            args.belt_source.resolve(), LOCKS["belt"]["bytes"], LOCKS["belt"]["sha256"]
        ),
    }
    matrices = {key: world_matrices(value) for key, value in sources.items()}
    field_source = verify_field_package(args.field_package.resolve())
    alignment_calibration = {}
    if args.alignment_calibration:
        calibration_path = args.alignment_calibration.resolve()
        alignment_calibration = json.loads(calibration_path.read_text(encoding="utf-8"))
        if alignment_calibration.get("assetId") != args.asset_id:
            raise ValueError(f"alignment calibration is not a {args.asset_id} result")
        if not alignment_calibration.get("acceptance", {}).get("pass"):
            raise ValueError("alignment calibration failed its surface/axis acceptance gate")

    builder = GlbBuilder()
    builder.nodes = []
    builder.meshes = []

    gun_children = []
    for node_index, name, material, role in [
        (9, "gun.barrel_jacket_and_core.source_n009", 1, "aircraft AN/M2 barrel source mirror"),
        (15, "gun.front_mount_ring.source_n015", 2, "front mount ring source mirror"),
        (17, "gun.handgrip.source_n017", 2, "handgrip source mirror"),
        (19, "gun.grip.source_n019", 2, "grip source mirror"),
        (21, "gun.trigger.source_n021", 2, "trigger source mirror"),
        (23, "gun.receiver_body.source_n023", 0, "receiver body source mirror"),
        (25, "gun.sideplate.source_n025", 0, "removable sideplate source mirror"),
        (27, "gun.button.source_n027", 2, "small control source mirror"),
    ]:
        gun_children.append(
            add_source_node(builder, sources["anm2"], node_index, name, material, matrices["anm2"], role)
        )
    gun_group = add_group(
        builder,
        "GUN_EXACT_SOURCE_MIRROR",
        gun_children,
        {
            "status": "source-exact-exterior-geometry",
            "declaredUnits": "meter",
            "forwardAxis": "+X",
            "upAxis": "+Z",
            "engineeringApproval": False,
        },
    )

    feed_children = []
    for node_index, name, material, role in [
        (11, "feed.ammunition_box.aircraft_source_n011", 3, "AN/M2 ammunition-container reference; not a chute"),
    ]:
        feed_children.append(
            add_source_node(builder, sources["anm2"], node_index, name, material, matrices["anm2"], role)
        )
    for node_index, name, role in [
        (13, "feed.ammunition_container.dense_object13", "dense reference ammunition-container exterior"),
        (14, "feed.ammunition_container_handle.dense_object14", "dense reference container handle/loop accessory"),
        (15, "feed.ammunition_container_insert.dense_object15", "dense reference container insert/separator plate"),
    ]:
        feed_children.append(
            add_source_node(builder, sources["belt"], node_index, name, 3, matrices["belt"], role)
        )
    # Keep the complete authored belt arrays in the distilled pack.  Object_11
    # is the source round array and Object_12 is the matching disintegrating
    # link array; they are display/reference geometry, while the runtime still
    # uses the centered one-link subset for pooled animation.
    feed_children.extend([
        add_source_node(
            builder,
            sources["belt"],
            11,
            "feed.original_linked_round_array.source_object11",
            5,
            matrices["belt"],
            "source-exact complete linked-round array; authored belt reference",
        ),
        add_source_node(
            builder,
            sources["belt"],
            12,
            "feed.original_disintegrating_belt.source_object12",
            3,
            matrices["belt"],
            "source-exact complete disintegrating-link array; authored belt reference",
        ),
    ])
    feed_group = add_group(
        builder,
        "FEED_SOURCE_MIRROR",
        feed_children,
        {
            "status": f"source-exact-reference-components; {args.asset_id} semantic map corrected",
            "aircraftRoute": "B-24 node 799 -> loaded box outlet -> flexible guide -> AN/M2 feedway",
            "notAChuteNodes": [4, 6, 7],
            "denseReferenceNodes": [13, 14, 15],
            "originalFeedReferences": {
                "roundArray": {"sourceNodeIndex": 11, "sourceNodeName": "Object_11"},
                "linkArray": {"sourceNodeIndex": 12, "sourceNodeName": "Object_12"},
            },
        },
    )

    cartridge_children = []
    for node_index, name, material, role in [
        (2, "ammo.case.source_n002", 4, "exact source case with preserved UV"),
        (4, "ammo.projectile_assembled.source_n004", 5, "exact source assembled projectile with preserved UV"),
        (3, "ammo.projectile_exploded.source_n003", 5, "exact source exploded projectile with preserved UV"),
    ]:
        cartridge_children.append(
            add_source_node(
                builder,
                sources["cartridge"],
                node_index,
                name,
                material,
                matrices["cartridge"],
                role,
            )
        )
    cartridge_group = add_group(
        builder,
        "CARTRIDGE_EXACT_SOURCE_MIRROR",
        cartridge_children,
        {
            "status": "source-exact-geometry-and-uv",
            "sourceUnits": "millimeter",
            "unitConversionToMeters": 0.001,
            "sourceOverallLengthMillimeters": 139.270119,
            "sourceCaseDiameterMillimeters": 20.42006,
        },
    )
    builder.nodes[cartridge_group]["scale"] = [0.001, 0.001, 0.001]

    link_node = add_link_subset(builder, sources["belt"], matrices["belt"])
    link_group = add_group(
        builder,
        "LINK_EXACT_SOURCE_MIRROR",
        [link_node],
        {
            "status": "source-exact-selected-components",
            "linkType": "M2 disintegrating link visual reference",
            "finalPartsCatalogApproval": False,
        },
    )

    mechanism_children = []
    for node_index, name, role in [
        (12, "mechanism.spring.source_n012", "return spring geometry reference"),
        (14, "mechanism.bolt.source_n014", "bolt geometry reference"),
        (16, "mechanism.cocking_handle.source_n016", "cocking handle geometry reference"),
        (18, "mechanism.donor_body.source_n018", "alignment body; hidden in product view"),
        (20, "mechanism.donor_barrel.source_n020", "alignment barrel; hidden in product view"),
    ]:
        mechanism_children.append(
            add_source_node(
                builder,
                sources["mechanism"],
                node_index,
                name,
                7,
                matrices["mechanism"],
                role,
            )
        )
    mechanism_group = add_group(
        builder,
        "MECHANISM_REFERENCE_SOURCE_MIRROR",
        mechanism_children,
        {
            "status": "mechanical-reference-only-not-aircraft-parts-catalog-approved",
            "sourceUnitInference": "centimeter-like; isolated mirror preserved raw",
            "aircraftOverlayMatrixRowMajor": [
                [0.0, 0.0, -0.01, 0.23896],
                [0.01, 0.0, 0.0, -0.0038],
                [0.0, 0.01, 0.0, -0.0916],
                [0.0, 0.0, 0.0, 1.0],
            ],
        },
    )

    station_groups = []
    station_manifest = {}
    for station_id, gun_node, muzzle_sign, sight_roots, anchor_node, floor_node, node_specs in [
        (
            "b24.waist.starboard.flexible",
            802,
            1,
            {569, 591, 600, 616, 617, 796, 798, 800, 802},
            808,
            811,
            [
                (799, "feed_belt", 3),
                (802, "reference_gun", 8),
                (805, "pivot_buffers", 6),
                (808, "aircraft_adapter_cradle", 6),
                (811, "airframe_triangular_brace", 6),
            ],
        ),
        (
            "b24.waist.port.flexible",
            821,
            -1,
            {736, 757, 768, 770, 787, 792, 799, 971, 973, 975, 977},
            821,
            824,
            [
                (818, "feed_belt", 3),
                (821, "reference_gun", 8),
                (824, "airframe_triangular_brace", 6),
            ],
        ),
    ]:
        children = []
        for node_index, component, material in node_specs:
            children.append(
                add_source_node(
                    builder,
                    sources["b24"],
                    node_index,
                    f"{station_id}.{component}.source_n{node_index:04d}",
                    material,
                    matrices["b24"],
                    f"locked B-24 reference {component}",
                )
            )
        children.append(
            add_source_component_subset(
                builder,
                sources["b24"],
                matrices["b24"],
                gun_node,
                sight_roots,
                f"{station_id}.rear_sight_exact.source_n{gun_node:04d}",
                2,
                "locked B-24 reference rear sight components",
            )
        )
        group = add_group(
            builder,
            station_id,
            children,
            {
                "status": "locked-B24-reference-mirror",
                "stationType": "standing/flexible waist station",
                "finalApplicability": "block-and-aircraft-instance-review-required",
            },
        )
        station_groups.append(group)
        alignment = gun_alignment(
            sources["anm2"],
            matrices["anm2"],
            sources["b24"],
            matrices["b24"],
            gun_node,
            muzzle_sign,
            sight_roots,
        )
        calibration = alignment_calibration if station_id == "b24.waist.starboard.flexible" else None
        if calibration:
            alignment["matrixColumnMajor"] = calibration["matrixColumnMajor"]
            alignment["uniformScale"] = calibration["worldUniformScale"]
            alignment["sourceLandmarks"] = calibration["sourceLandmarks"]
            alignment["surfaceRegistration"] = calibration["surfaceRegistration"]
            alignment["axisDot"] = calibration["axisDot"]
            alignment["calibrationGate"] = calibration["acceptance"]
            alignment["calibrationTargetNode"] = calibration["targetNode"]
            alignment["calibrationMethod"] = calibration["method"]
            for key in ("targetLocalTranslation", "targetLocalMatrixColumnMajor", "datumCorrection", "presentationLiftMeters", "presentationLiftFrame", "presentationElevationDegrees", "presentationElevationFrame"):
                if key in calibration:
                    alignment[key] = calibration[key]
            alignment["method"] = calibration["method"]
        station_manifest[station_id] = {
            "sourceGunNodeIndex": gun_node,
            "sourceRearSightComponentRoots": sorted(sight_roots),
            "reviewTransform": station_review_transform(
                sources["b24"], matrices["b24"], anchor_node, floor_node
            ),
            "highDetailGunAlignment": alignment,
        }

    roots = [gun_group, feed_group, cartridge_group, link_group, mechanism_group] + station_groups
    pack_extras = {
        "schema": "haihao.aircraft/weapons-mother-distilled-geometry-pack@1.0.0",
        "assetId": args.asset_id,
        "status": "review-source-mirrors-and-semantic-distillation",
        "geometryPolicy": "source vertex data exact; only documented rigid/uniform transforms allowed",
        "materials": "placeholder stable surface_id bindings; geometry UV preserved",
    }
    output_bytes = serialize(builder, roots, pack_extras, args.asset_id)
    output_path = args.output.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output_bytes)
    output_sha = hashlib.sha256(output_bytes).hexdigest()

    manifest = {
        "schema": "haihao.aircraft/weapons-mother-distillation-manifest@1.0.0",
        "assetId": args.asset_id,
        "status": "user-review",
        "sources": [
            {
                "role": key,
                "file": glb.path.name,
                "bytes": len(glb.raw),
                "sha256": glb.sha256,
                "license": glb.document.get("asset", {}).get("extras", {}).get("license"),
                "author": glb.document.get("asset", {}).get("extras", {}).get("author"),
                "sourceUrl": glb.document.get("asset", {}).get("extras", {}).get("source"),
            }
            for key, glb in sources.items()
        ]
        + [{"role": "procedural-field-knowledge", **field_source}],
        "output": {
            "file": str(output_path),
            "bytes": len(output_bytes),
            "sha256": output_sha,
            "materials": len(MATERIALS),
            "meshNodes": sum(1 for node in builder.nodes if "mesh" in node),
        },
        "stationAlignments": station_manifest,
        "mechanismOverlay": builder.nodes[mechanism_group]["extras"],
        "sourceSelections": {
            "aircraftGunExterior": [9, 15, 17, 19, 21, 23, 25, 27],
            "aircraftFeedReferences": [11],
            "denseFeedReferences": [13, 14, 15],
            "originalFeedReferences": {
                "roundArray": {"sourceNodeIndex": 11, "sourceNodeName": "Object_11"},
                "linkArray": {"sourceNodeIndex": 12, "sourceNodeName": "Object_12"},
            },
            "cartridge": [2, 4, 3],
            "beltLink": {"sourceNodeIndex": 12, "connectedComponentRoots": [174, 199, 224]},
            "mechanismReference": [12, 14, 16, 18, 20],
            "b24WaistStarboard": [799, 802, 805, 808, 811],
            "b24WaistPort": [818, 821, 824],
        },
        "limitations": [
            "The mechanism donor is not an approved aircraft AN/M2 internal parts catalog; spring, bolt and cocking handle remain reference-only.",
            "The locked B-24 GLB supplies standing waist station geometry but no separable A-13 lower ball turret mesh.",
            "A-13 seated installation remains controlled by AN 11-45G-1 evidence and must not be replaced by an invented generic pedestal.",
            "The procedural field package affects runtime surface color and roughness only; it does not alter source geometry.",
            "Starboard gun registration is an area-weighted, axis-locked surface solve; p95 and RMS are recorded in highDetailGunAlignment.surfaceRegistration.",
            "AN/M2 source nodes 4, 6 and 7 are complete round geometry and are explicitly forbidden as feed-chute labels.",
        ],
    }
    manifest_path = args.manifest.resolve()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
