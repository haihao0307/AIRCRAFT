#!/usr/bin/env python3
"""Solve a constrained AN/M2-to-B-24 node 802 surface registration.

The source AN/M2 +X bore axis is locked to the B-24 reference node local +Y
axis.  The solver may only change one uniform scale, a roll about the bore, and
translation.  It cannot tilt the bore, mirror the source, or non-uniformly
reshape source geometry.  Surface sampling is area weighted and deterministic;
nearest-neighbour work is implemented in NumPy so the calibration has no SciPy
runtime dependency.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

import numpy as np


HERE = Path(__file__).resolve().parent
DISTILLER_PATH = HERE / "distill-weapons-mother-v004.py"
SPEC = importlib.util.spec_from_file_location("wm_distiller_v011_calibration", DISTILLER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load {DISTILLER_PATH}")
DISTILLER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = DISTILLER
SPEC.loader.exec_module(DISTILLER)


GUN_NODES = (9, 15, 17, 19, 21, 23, 25, 27)
STATION_ID = "b24.waist.starboard.flexible"


def as_matrix(values: list[list[float]]) -> np.ndarray:
    return np.asarray(values, dtype=np.float64)


def transform_points(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    homogeneous = np.concatenate([points, np.ones((points.shape[0], 1))], axis=1)
    return (homogeneous @ matrix.T)[:, :3]


def primitive_triangles(glb, node_index: int, matrix: np.ndarray | None) -> np.ndarray:
    node = glb.document["nodes"][node_index]
    primitive = glb.document["meshes"][node["mesh"]]["primitives"][0]
    vertices = np.asarray(
        DISTILLER.read_accessor(glb, primitive["attributes"]["POSITION"]),
        dtype=np.float64,
    )
    if matrix is not None:
        vertices = transform_points(vertices, matrix)
    if "indices" in primitive:
        indices = np.asarray(
            [int(value[0]) for value in DISTILLER.read_accessor(glb, primitive["indices"])],
            dtype=np.int64,
        )
    else:
        indices = np.arange(vertices.shape[0], dtype=np.int64)
    return vertices[indices.reshape((-1, 3))]


def area_weighted_sample(triangles: np.ndarray, count: int, seed: int) -> np.ndarray:
    edges_a = triangles[:, 1] - triangles[:, 0]
    edges_b = triangles[:, 2] - triangles[:, 0]
    areas = np.linalg.norm(np.cross(edges_a, edges_b), axis=1) * 0.5
    valid = areas > 1e-14
    triangles = triangles[valid]
    areas = areas[valid]
    cumulative = np.cumsum(areas)
    rng = np.random.default_rng(seed)
    selected = np.searchsorted(cumulative, rng.random(count) * cumulative[-1])
    chosen = triangles[selected]
    root_u = np.sqrt(rng.random(count))
    v = rng.random(count)
    return (
        (1.0 - root_u)[:, None] * chosen[:, 0]
        + (root_u * (1.0 - v))[:, None] * chosen[:, 1]
        + (root_u * v)[:, None] * chosen[:, 2]
    )


def sample_source(glb, matrices, count: int) -> np.ndarray:
    triangles = np.concatenate(
        [
            primitive_triangles(glb, node, as_matrix(matrices[node]))
            for node in GUN_NODES
        ],
        axis=0,
    )
    return area_weighted_sample(triangles, count, 2401)


def sample_target_local(glb, node_index: int, count: int) -> np.ndarray:
    triangles = primitive_triangles(glb, node_index, None)
    return area_weighted_sample(triangles, count, 802)


def nearest(source: np.ndarray, target: np.ndarray, chunk: int = 192) -> tuple[np.ndarray, np.ndarray]:
    indexes = np.empty(source.shape[0], dtype=np.int64)
    distances = np.empty(source.shape[0], dtype=np.float64)
    for start in range(0, source.shape[0], chunk):
        batch = source[start : start + chunk]
        delta = batch[:, None, :] - target[None, :, :]
        squared = np.einsum("ijk,ijk->ij", delta, delta)
        local = np.argmin(squared, axis=1)
        indexes[start : start + batch.shape[0]] = local
        distances[start : start + batch.shape[0]] = np.sqrt(
            squared[np.arange(batch.shape[0]), local]
        )
    return indexes, distances


def canonical_source(points: np.ndarray) -> np.ndarray:
    """Map source +X bore/+Z up to target-local +Y bore/+Z up."""
    return np.column_stack((-points[:, 1], points[:, 0], points[:, 2]))


def roll_matrix(angle: float) -> np.ndarray:
    cosine = math.cos(angle)
    sine = math.sin(angle)
    return np.asarray(
        [[cosine, 0.0, sine], [0.0, 1.0, 0.0], [-sine, 0.0, cosine]],
        dtype=np.float64,
    )


def apply_parameters(
    canonical: np.ndarray, angle: float, scale: float, translation: np.ndarray
) -> np.ndarray:
    return canonical @ roll_matrix(angle).T * scale + translation


def symmetric_error(aligned: np.ndarray, target: np.ndarray) -> dict[str, float]:
    _, forward = nearest(aligned, target)
    _, reverse = nearest(target, aligned)
    combined = np.concatenate((forward, reverse))
    return {
        "rms": float(np.sqrt(np.mean(combined * combined))),
        "mean": float(np.mean(combined)),
        "median": float(np.median(combined)),
        "p95": float(np.quantile(combined, 0.95)),
        "max": float(np.max(combined)),
    }


def robust_objective(aligned: np.ndarray, target: np.ndarray) -> float:
    _, forward = nearest(aligned, target)
    _, reverse = nearest(target, aligned)
    combined = np.concatenate((forward, reverse))
    cutoff = np.quantile(combined, 0.88)
    retained = combined[combined <= cutoff]
    return float(np.sqrt(np.mean(retained * retained)) + np.quantile(combined, 0.95) * 0.18)


def fit_axis_locked_similarity(
    source_pairs: np.ndarray,
    target_pairs: np.ndarray,
    scale_min: float,
    scale_max: float,
) -> tuple[float, float, np.ndarray]:
    source_center = source_pairs.mean(axis=0)
    target_center = target_pairs.mean(axis=0)
    source_zero = source_pairs - source_center
    target_zero = target_pairs - target_center
    a = float(
        np.sum(source_zero[:, 0] * target_zero[:, 0])
        + np.sum(source_zero[:, 2] * target_zero[:, 2])
    )
    b = float(
        np.sum(source_zero[:, 2] * target_zero[:, 0])
        - np.sum(source_zero[:, 0] * target_zero[:, 2])
    )
    angle = math.atan2(b, a)
    rotation = roll_matrix(angle)
    rotated = source_zero @ rotation.T
    denominator = float(np.sum(source_zero * source_zero))
    scale = float(np.sum(rotated * target_zero) / max(denominator, 1e-12))
    scale = min(scale_max, max(scale_min, scale))
    translation = target_center - (source_center @ rotation.T) * scale
    return angle, scale, translation


def solve_candidate(
    canonical: np.ndarray,
    target: np.ndarray,
    initial_angle: float,
    initial_scale: float,
    scale_min: float,
    scale_max: float,
    iterations: int,
) -> tuple[float, float, np.ndarray, float]:
    rotation = roll_matrix(initial_angle)
    translation = target.mean(axis=0) - (canonical.mean(axis=0) @ rotation.T) * initial_scale
    angle = initial_angle
    scale = initial_scale
    best_score = math.inf
    best = (angle, scale, translation.copy())
    for _ in range(iterations):
        aligned = apply_parameters(canonical, angle, scale, translation)
        target_indexes, source_distances = nearest(aligned, target)
        source_indexes, target_distances = nearest(target, aligned)
        source_cutoff = np.quantile(source_distances, 0.86)
        target_cutoff = np.quantile(target_distances, 0.86)
        source_keep = source_distances <= source_cutoff
        target_keep = target_distances <= target_cutoff
        pair_source = np.concatenate(
            (canonical[source_keep], canonical[source_indexes[target_keep]]), axis=0
        )
        pair_target = np.concatenate(
            (target[target_indexes[source_keep]], target[target_keep]), axis=0
        )
        angle, scale, translation = fit_axis_locked_similarity(
            pair_source, pair_target, scale_min, scale_max
        )
        aligned = apply_parameters(canonical, angle, scale, translation)
        score = robust_objective(aligned, target)
        if score < best_score:
            best_score = score
            best = (angle, scale, translation.copy())
    return best[0], best[1], best[2], best_score


def row_major_local_matrix(angle: float, scale: float, translation: np.ndarray) -> np.ndarray:
    canonical = np.asarray(
        [[0.0, -1.0, 0.0], [1.0, 0.0, 0.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    result = np.eye(4, dtype=np.float64)
    result[:3, :3] = roll_matrix(angle) @ canonical * scale
    result[:3, 3] = translation
    return result


def column_major(matrix: np.ndarray) -> list[float]:
    return matrix.reshape(16, order="F").tolist()


def metric_report(aligned: np.ndarray, target: np.ndarray, world_scale: float) -> dict[str, float]:
    local = symmetric_error(aligned, target)
    return {
        "rmsMeters": local["rms"] * world_scale,
        "meanMeters": local["mean"] * world_scale,
        "medianMeters": local["median"] * world_scale,
        "p95Meters": local["p95"] * world_scale,
        "maxMeters": local["max"] * world_scale,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--b24-source", type=Path, required=True)
    parser.add_argument("--anm2-source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--station-node", type=int, default=802)
    parser.add_argument("--sample-count", type=int, default=1800)
    parser.add_argument("--iterations", type=int, default=18)
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
    b24_matrices = DISTILLER.world_matrices(b24)
    anm2_matrices = DISTILLER.world_matrices(anm2)
    source = sample_source(anm2, anm2_matrices, args.sample_count)
    target = sample_target_local(b24, args.station_node, args.sample_count)
    canonical = canonical_source(source)

    source_span = float(np.ptp(source[:, 0]))
    target_span = float(np.ptp(target[:, 1]))
    initial_scale = target_span / source_span
    scale_min = initial_scale * 0.94
    scale_max = initial_scale * 1.06

    coarse: list[tuple[float, float]] = []
    for degrees in range(-180, 180, 10):
        angle = math.radians(degrees)
        rotation = roll_matrix(angle)
        translation = target.mean(axis=0) - (canonical.mean(axis=0) @ rotation.T) * initial_scale
        aligned = apply_parameters(canonical, angle, initial_scale, translation)
        coarse.append((robust_objective(aligned, target), angle))
    coarse.sort(key=lambda item: item[0])

    candidates = []
    for _, angle in coarse[:6]:
        candidates.append(
            solve_candidate(
                canonical,
                target,
                angle,
                initial_scale,
                scale_min,
                scale_max,
                args.iterations,
            )
        )
    angle, scale, translation, score = min(candidates, key=lambda item: item[3])
    aligned = apply_parameters(canonical, angle, scale, translation)

    target_world = as_matrix(b24_matrices[args.station_node])
    local_matrix = row_major_local_matrix(angle, scale, translation)
    world_matrix = target_world @ local_matrix
    target_world_scale = float(np.linalg.norm(target_world[:3, 1]))
    surface = metric_report(aligned, target, target_world_scale)

    source_muzzle_x = float(source[:, 0].max())
    source_rear_x = float(source[:, 0].min())
    muzzle_band = source[source[:, 0] >= source_muzzle_x - 0.018]
    bore_yz = muzzle_band[:, 1:3].mean(axis=0)
    source_muzzle = np.asarray([source_muzzle_x, bore_yz[0], bore_yz[1]], dtype=np.float64)
    source_rear = np.asarray([source_rear_x, bore_yz[0], bore_yz[1]], dtype=np.float64)
    mapped_muzzle_local = transform_points(source_muzzle[None, :], local_matrix)[0]
    mapped_rear_local = transform_points(source_rear[None, :], local_matrix)[0]
    mapped_muzzle_world = transform_points(source_muzzle[None, :], world_matrix)[0]
    mapped_rear_world = transform_points(source_rear[None, :], world_matrix)[0]
    world_uniform_scale = float(np.linalg.norm(world_matrix[:3, 0]))
    source_axis_world = world_matrix[:3, 0] / world_uniform_scale
    target_axis_world = target_world[:3, 1] / np.linalg.norm(target_world[:3, 1])

    result = {
        "schema": "haihao.aircraft/weapons-mother-axis-locked-registration@1.0.0",
        "assetId": "WM_B24_ANM2_V011",
        "stationId": STATION_ID,
        "sourceGunNodes": list(GUN_NODES),
        "targetNode": args.station_node,
        "method": "deterministic area-weighted symmetric surface ICP constrained to +X source bore -> +Y target-local bore, uniform scale, bore-axis roll, and translation",
        "constraints": {
            "sourceForward": "+X",
            "targetForward": "node 802 local +Y",
            "nonUniformScale": False,
            "reflection": False,
            "freeBoreTilt": False,
        },
        "sampleCountEach": args.sample_count,
        "coarseSeedDegrees": [math.degrees(item[1]) for item in coarse[:6]],
        "rollDegrees": math.degrees(angle),
        "targetLocalUniformScale": scale,
        "worldUniformScale": world_uniform_scale,
        "targetLocalTranslation": translation.tolist(),
        "targetLocalMatrixColumnMajor": column_major(local_matrix),
        "matrixColumnMajor": column_major(world_matrix),
        "surfaceRegistration": surface,
        "robustObjectiveTargetLocal": score,
        "sourceLandmarks": {
            "muzzle": source_muzzle.tolist(),
            "rear": source_rear.tolist(),
            "rollDatum": (source_rear + np.asarray([0.0, 0.0, 1.0])).tolist(),
        },
        "mappedLandmarks": {
            "muzzleTargetLocal": mapped_muzzle_local.tolist(),
            "rearTargetLocal": mapped_rear_local.tolist(),
            "muzzleWorld": mapped_muzzle_world.tolist(),
            "rearWorld": mapped_rear_world.tolist(),
        },
        "axisDot": float(np.dot(source_axis_world, target_axis_world)),
        "acceptance": {
            "axisDotMinimum": 0.999999,
            "surfaceP95MetersMaximum": 0.045,
            "surfaceRmsMetersMaximum": 0.03,
            "pass": bool(
                float(np.dot(source_axis_world, target_axis_world)) >= 0.999999
                and surface["p95Meters"] <= 0.045
                and surface["rmsMeters"] <= 0.03
            ),
        },
    }
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(payload, encoding="utf-8", newline="\n")
    print(payload, end="")


if __name__ == "__main__":
    main()
