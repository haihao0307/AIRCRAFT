#!/usr/bin/env python3
"""Measure V010 AN/M2-to-B-24 station registration candidates.

This is a read-only diagnostic.  It compares the exact donor exterior point
cloud with the locked B-24 waist-gun mesh and reports deterministic PCA and
symmetric nearest-surface error statistics in final world coordinates.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np


HERE = Path(__file__).resolve().parent
DISTILLER_PATH = HERE / "distill-weapons-mother-v004.py"
SPEC = importlib.util.spec_from_file_location("wm_distiller_v010_analysis", DISTILLER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load {DISTILLER_PATH}")
DISTILLER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = DISTILLER
SPEC.loader.exec_module(DISTILLER)


GUN_NODES = (9, 15, 17, 19, 21, 23, 25, 27)


def as_array(points: list[list[float]]) -> np.ndarray:
    return np.asarray(points, dtype=np.float64)


def world_points(glb, matrices, node_indexes: tuple[int, ...]) -> np.ndarray:
    points: list[list[float]] = []
    for node_index in node_indexes:
        points.extend(DISTILLER.node_world_positions(glb, matrices, node_index))
    return as_array(points)


def mesh_local_points(glb, node_index: int) -> np.ndarray:
    node = glb.document["nodes"][node_index]
    primitive = glb.document["meshes"][node["mesh"]]["primitives"][0]
    return as_array(DISTILLER.read_accessor(glb, primitive["attributes"]["POSITION"]))


def pca(points: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    center = points.mean(axis=0)
    covariance = np.cov(points - center, rowvar=False)
    values, vectors = np.linalg.eigh(covariance)
    order = np.argsort(values)[::-1]
    return center, values[order], vectors[:, order]


def describe(points: np.ndarray) -> dict[str, object]:
    center, values, vectors = pca(points)
    return {
        "count": int(points.shape[0]),
        "center": center.tolist(),
        "boundsMin": points.min(axis=0).tolist(),
        "boundsMax": points.max(axis=0).tolist(),
        "extent": np.ptp(points, axis=0).tolist(),
        "pcaValues": values.tolist(),
        "pcaVectorsColumns": vectors.tolist(),
    }


def matrix_from_column_major(values: list[float]) -> np.ndarray:
    return np.asarray(values, dtype=np.float64).reshape((4, 4), order="F")


def transform(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    homogeneous = np.concatenate([points, np.ones((points.shape[0], 1))], axis=1)
    return (homogeneous @ matrix.T)[:, :3]


def deterministic_sample(points: np.ndarray, count: int) -> np.ndarray:
    if points.shape[0] <= count:
        return points
    indexes = np.linspace(0, points.shape[0] - 1, count, dtype=np.int64)
    return points[indexes]


def nearest_distances(source: np.ndarray, target: np.ndarray, chunk: int = 256) -> np.ndarray:
    result = np.empty(source.shape[0], dtype=np.float64)
    for start in range(0, source.shape[0], chunk):
        batch = source[start : start + chunk]
        delta = batch[:, None, :] - target[None, :, :]
        squared = np.einsum("ijk,ijk->ij", delta, delta)
        result[start : start + batch.shape[0]] = np.sqrt(squared.min(axis=1))
    return result


def error_report(source: np.ndarray, target: np.ndarray, sample_count: int) -> dict[str, float]:
    source_sample = deterministic_sample(source, sample_count)
    target_sample = deterministic_sample(target, sample_count)
    source_to_target = nearest_distances(source_sample, target_sample)
    target_to_source = nearest_distances(target_sample, source_sample)
    combined = np.concatenate([source_to_target, target_to_source])
    return {
        "sampleCountEach": int(min(sample_count, source.shape[0], target.shape[0])),
        "rmsMeters": float(np.sqrt(np.mean(combined * combined))),
        "meanMeters": float(np.mean(combined)),
        "p95Meters": float(np.quantile(combined, 0.95)),
        "maxMeters": float(np.max(combined)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--b24-source", type=Path, required=True)
    parser.add_argument("--anm2-source", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--sample-count", type=int, default=1800)
    args = parser.parse_args()

    b24 = DISTILLER.load_glb(
        args.b24_source.resolve(),
        DISTILLER.LOCKS["b24"]["bytes"],
        DISTILLER.LOCKS["b24"]["sha256"],
    )
    anm2 = DISTILLER.load_glb(
        args.anm2_source.resolve(),
        DISTILLER.LOCKS["anm2"]["bytes"],
        DISTILLER.LOCKS["anm2"]["sha256"],
    )
    matrices = {"b24": DISTILLER.world_matrices(b24), "anm2": DISTILLER.world_matrices(anm2)}
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    donor = world_points(anm2, matrices["anm2"], GUN_NODES)

    stations = {}
    for station_id, node_index in (
        ("b24.waist.starboard.flexible", 802),
        ("b24.waist.port.flexible", 821),
    ):
        target_world = world_points(b24, matrices["b24"], (node_index,))
        target_local = mesh_local_points(b24, node_index)
        alignment = manifest["stationAlignments"][station_id]["highDetailGunAlignment"]
        aligned = transform(donor, matrix_from_column_major(alignment["matrixColumnMajor"]))
        stations[station_id] = {
            "targetWorld": describe(target_world),
            "targetLocal": describe(target_local),
            "alignedDonorWorld": describe(aligned),
            "currentSymmetricSurfaceError": error_report(aligned, target_world, args.sample_count),
        }

    report = {
        "schema": "haihao.aircraft/weapons-mother-alignment-analysis@1.0.0",
        "donorWorld": describe(donor),
        "stations": stations,
    }
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8", newline="\n")
    print(payload, end="")


if __name__ == "__main__":
    main()
