#!/usr/bin/env python3
"""Render deterministic structural contact sheets directly from GLB geometry.

This is a measurement/identification aid, not a beauty renderer.  It uses only
NumPy and Pillow from the bundled workspace runtime and never alters the source.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


COMPONENTS = {
    5120: (np.int8, 1),
    5121: (np.uint8, 1),
    5122: (np.int16, 2),
    5123: (np.uint16, 2),
    5125: (np.uint32, 4),
    5126: (np.float32, 4),
}
WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read_glb(path: Path) -> tuple[dict[str, Any], bytes]:
    raw = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", raw, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(raw):
        raise ValueError(f"invalid glTF 2 GLB: {path}")
    document = None
    binary = b""
    offset = 12
    while offset < len(raw):
        length, chunk_type = struct.unpack_from("<II", raw, offset)
        offset += 8
        payload = raw[offset : offset + length]
        offset += length
        if chunk_type == 0x4E4F534A:
            document = json.loads(payload.rstrip(b"\x00 \t\r\n").decode("utf-8"))
        elif chunk_type == 0x004E4942:
            binary = payload
    if document is None:
        raise ValueError("GLB has no JSON chunk")
    return document, binary


def accessor(document: dict[str, Any], binary: bytes, index: int) -> np.ndarray:
    item = document["accessors"][index]
    view = document["bufferViews"][item["bufferView"]]
    dtype, component_bytes = COMPONENTS[item["componentType"]]
    width = WIDTHS[item["type"]]
    packed = component_bytes * width
    stride = int(view.get("byteStride", packed))
    offset = int(view.get("byteOffset", 0)) + int(item.get("byteOffset", 0))
    count = int(item["count"])
    if stride == packed:
        values = np.frombuffer(binary, dtype=dtype, count=count * width, offset=offset).reshape(count, width)
    else:
        values = np.ndarray(
            shape=(count, width),
            dtype=dtype,
            buffer=binary,
            offset=offset,
            strides=(stride, component_bytes),
        ).copy()
    return values


def matrix(node: dict[str, Any]) -> np.ndarray:
    if "matrix" in node:
        return np.array(node["matrix"], dtype=np.float64).reshape(4, 4, order="F")
    translation = np.array(node.get("translation", [0, 0, 0]), dtype=np.float64)
    scale = np.array(node.get("scale", [1, 1, 1]), dtype=np.float64)
    x, y, z, w = [float(value) for value in node.get("rotation", [0, 0, 0, 1])]
    rotation = np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1],
        ],
        dtype=np.float64,
    )
    scale_matrix = np.diag([scale[0], scale[1], scale[2], 1.0])
    result = rotation @ scale_matrix
    result[:3, 3] = translation
    return result


def material_color(document: dict[str, Any], index: int | None) -> np.ndarray:
    if index is None or index >= len(document.get("materials", [])):
        return np.array([0.32, 0.39, 0.41], dtype=np.float64)
    material = document["materials"][index]
    factor = material.get("pbrMetallicRoughness", {}).get("baseColorFactor", [0.32, 0.39, 0.41, 1])
    color = np.array(factor[:3], dtype=np.float64)
    if float(color.max()) < 0.12:
        color = color * 2.6 + 0.12
    return np.clip(color, 0.05, 0.86)


def collect_geometry(
    document: dict[str, Any], binary: bytes, roots: list[int]
) -> tuple[list[tuple[np.ndarray, np.ndarray, np.ndarray]], list[int]]:
    nodes = document.get("nodes", [])
    meshes = document.get("meshes", [])
    root_set = set(roots)
    selected: set[int] = set()

    def mark(index: int) -> None:
        if index in selected:
            return
        selected.add(index)
        for child in nodes[index].get("children", []):
            mark(int(child))

    for root in roots:
        mark(root)

    parents: dict[int, int] = {}
    for index, node in enumerate(nodes):
        for child in node.get("children", []):
            parents[int(child)] = index

    world_cache: dict[int, np.ndarray] = {}

    def world(index: int) -> np.ndarray:
        if index in world_cache:
            return world_cache[index]
        parent = parents.get(index)
        result = matrix(nodes[index]) if parent is None else world(parent) @ matrix(nodes[index])
        world_cache[index] = result
        return result

    geometry = []
    mesh_nodes = []
    for index in sorted(selected):
        node = nodes[index]
        mesh_index = node.get("mesh")
        if mesh_index is None:
            continue
        mesh_nodes.append(index)
        transform = world(index)
        for primitive in meshes[int(mesh_index)].get("primitives", []):
            if int(primitive.get("mode", 4)) != 4 or "POSITION" not in primitive.get("attributes", {}):
                continue
            positions = accessor(document, binary, primitive["attributes"]["POSITION"]).astype(np.float64)
            homogeneous = np.column_stack([positions[:, :3], np.ones(len(positions))])
            positions_world = (transform @ homogeneous.T).T[:, :3]
            if "indices" in primitive:
                indices = accessor(document, binary, primitive["indices"]).reshape(-1).astype(np.int64)
            else:
                indices = np.arange(len(positions_world), dtype=np.int64)
            triangles = indices[: len(indices) // 3 * 3].reshape(-1, 3)
            geometry.append((positions_world, triangles, material_color(document, primitive.get("material"))))
    if not geometry:
        raise ValueError(f"selected roots contain no triangle geometry: {sorted(root_set)}")
    return geometry, mesh_nodes


def camera_basis(direction: tuple[float, float, float]) -> np.ndarray:
    forward = np.array(direction, dtype=np.float64)
    forward /= np.linalg.norm(forward)
    up_hint = np.array([0.0, 0.0, 1.0])
    if abs(float(np.dot(forward, up_hint))) > 0.92:
        up_hint = np.array([0.0, 1.0, 0.0])
    right = np.cross(forward, up_hint)
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)
    return np.vstack([right, up, forward])


def render_panel(
    geometry: list[tuple[np.ndarray, np.ndarray, np.ndarray]],
    direction: tuple[float, float, float],
    title: str,
    size: tuple[int, int],
) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (8, 14, 17))
    draw = ImageDraw.Draw(image)
    basis = camera_basis(direction)
    all_points = np.vstack([positions for positions, _, _ in geometry])
    center = (all_points.min(axis=0) + all_points.max(axis=0)) * 0.5
    transformed_sets = [(positions - center) @ basis.T for positions, _, _ in geometry]
    transformed_all = np.vstack(transformed_sets)
    span = transformed_all[:, :2].max(axis=0) - transformed_all[:, :2].min(axis=0)
    scale = min((width - 70) / max(span[0], 1e-9), (height - 92) / max(span[1], 1e-9))
    projected_sets = []
    for transformed in transformed_sets:
        projected_sets.append(
            np.column_stack(
                [
                    width * 0.5 + transformed[:, 0] * scale,
                    height * 0.53 - transformed[:, 1] * scale,
                    transformed[:, 2],
                ]
            )
        )
    faces = []
    light = np.array([-0.32, 0.52, 0.79])
    light /= np.linalg.norm(light)
    for projected, (positions, triangles, base_color) in zip(projected_sets, geometry):
        view_positions = (positions - center) @ basis.T
        for triangle in triangles:
            a, b, c = view_positions[triangle]
            normal = np.cross(b - a, c - a)
            length = np.linalg.norm(normal)
            if length <= 1e-12:
                continue
            normal /= length
            shade = 0.40 + 0.52 * abs(float(np.dot(normal, light)))
            color = tuple(int(value * 255) for value in np.clip(base_color * shade, 0, 1))
            points = [(float(projected[index, 0]), float(projected[index, 1])) for index in triangle]
            depth = float(projected[triangle, 2].mean())
            faces.append((depth, points, color))
    for _, points, color in sorted(faces, key=lambda item: item[0]):
        draw.polygon(points, fill=color, outline=(25, 38, 42))
    draw.rectangle((0, 0, width, 44), fill=(10, 23, 27))
    draw.text((18, 13), title, fill=(232, 181, 84), font=ImageFont.load_default())
    draw.rectangle((14, height - 29, width - 14, height - 14), outline=(58, 76, 79))
    draw.text((20, height - 27), f"geometry faces: {len(faces):,}", fill=(150, 172, 174), font=ImageFont.load_default())
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--root-node", type=int, action="append", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--label", default="GLB structural source")
    parser.add_argument("--width", type=int, default=1440)
    parser.add_argument("--height", type=int, default=1080)
    args = parser.parse_args()
    document, binary = read_glb(args.source.resolve())
    geometry, mesh_nodes = collect_geometry(document, binary, args.root_node)
    panel_size = (args.width // 2, args.height // 2)
    views = [
        ((1.0, -1.0, 0.72), "isometric A"),
        ((-1.0, 1.0, 0.72), "isometric B"),
        ((0.0, -1.0, 0.0), "front axis"),
        ((1.0, 0.0, 0.0), "side axis"),
    ]
    sheet = Image.new("RGB", (args.width, args.height), (5, 9, 11))
    for view_index, (direction, view_label) in enumerate(views):
        panel = render_panel(geometry, direction, f"{args.label} · {view_label}", panel_size)
        sheet.paste(panel, ((view_index % 2) * panel_size[0], (view_index // 2) * panel_size[1]))
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (18, args.height - 17),
        f"source nodes {args.root_node}; mesh nodes {mesh_nodes}",
        fill=(208, 218, 216),
        font=ImageFont.load_default(),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)


if __name__ == "__main__":
    main()
