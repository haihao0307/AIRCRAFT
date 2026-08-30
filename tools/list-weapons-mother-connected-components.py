#!/usr/bin/env python3
"""List triangle-connected components for one GLB mesh node."""

from __future__ import annotations

import argparse
import importlib.util
import json
import struct
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("extract-weapons-mother-components.py")
SPEC = importlib.util.spec_from_file_location("wm_component_extract_for_list", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load {MODULE_PATH}")
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def raw_glb(path: Path):
    raw = path.read_bytes()
    json_length = struct.unpack_from("<I", raw, 12)[0]
    json_end = 20 + json_length
    document = json.loads(raw[20:json_end].decode("utf-8").rstrip(" \0"))
    binary_length = struct.unpack_from("<I", raw, json_end)[0]
    binary = raw[json_end + 8 : json_end + 8 + binary_length]
    return MODULE.Glb(path, raw, document, binary, "unlocked-inspection")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--node", required=True)
    args = parser.parse_args()
    glb = raw_glb(args.source.resolve())
    primitive = MODULE.mesh_primitive_by_node(glb, args.node)
    positions = MODULE.read_accessor(glb, primitive["attributes"]["POSITION"])
    indices = [int(value[0]) for value in MODULE.read_accessor(glb, primitive["indices"])]
    members, bounds, roots = MODULE.connected_components(positions, indices)
    triangles = {root: 0 for root in members}
    for offset in range(0, len(indices), 3):
        triangles[roots[indices[offset]]] += 1
    report = []
    for root, vertices in members.items():
        low, high = bounds[root]
        report.append(
            {
                "root": root,
                "vertices": len(vertices),
                "triangles": triangles[root],
                "min": low,
                "max": high,
                "size": [high[axis] - low[axis] for axis in range(3)],
                "center": [(high[axis] + low[axis]) * 0.5 for axis in range(3)],
            }
        )
    report.sort(key=lambda item: (-item["triangles"], item["root"]))
    print(json.dumps({"source": str(glb.path), "node": args.node, "components": report}, indent=2))


if __name__ == "__main__":
    main()
