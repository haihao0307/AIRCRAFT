#!/usr/bin/env python3
"""Probe a temporary reference with geometry-analysis backends.

This script records normalized exterior metrics and timings only. It does not write
source coordinates, UVs, absolute dimensions, product mesh files, or internal
functional geometry. The reference stays outside the repository.
"""
from pathlib import Path
import argparse, hashlib, json, time
import numpy as np
import trimesh
import vtk
from vtk.util import numpy_support
import cv2
import cadquery as cq

EXPECTED_SHA256 = "2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b"
CORE_NODES = ["Object_9", "Object_15", "Object_17", "Object_19", "Object_21", "Object_23", "Object_25", "Object_27"]


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def run(source):
    source = Path(source)
    identity = file_sha256(source)
    if identity != EXPECTED_SHA256:
        raise ValueError("Reference identity does not match the verified Aircraft sample")

    report = {
        "schema": "mechanical-distillation.tool-probe/1",
        "sourceIdentity": identity,
        "sourceBytes": source.stat().st_size,
        "referencePersistedInReport": False,
        "absoluteWeaponDimensionsPersisted": False,
        "tools": {},
        "normalized": {},
    }

    started = time.perf_counter()
    scene = trimesh.load(source, force="scene", process=False)
    report["tools"]["trimesh_load_ms"] = round((time.perf_counter() - started) * 1000, 2)

    parts = []
    for node in CORE_NODES:
        transform, geometry_name = scene.graph[node]
        geometry = scene.geometry[geometry_name].copy()
        geometry.apply_transform(transform)
        parts.append(geometry)
    core = trimesh.util.concatenate(parts)
    bounds = core.bounds
    extents = bounds[1] - bounds[0]
    length = float(extents[0])

    report["normalized"].update({
        "core_node_count": len(CORE_NODES),
        "mesh_vertices": int(len(core.vertices)),
        "mesh_faces": int(len(core.faces)),
        "height_over_length": round(float(extents[1] / length), 6),
        "depth_over_length": round(float(extents[2] / length), 6),
    })

    _, eigenvectors = np.linalg.eigh(np.cov(core.vertices.T))
    axis = eigenvectors[:, -1]
    report["normalized"]["pca_long_axis_abs_dot_x"] = round(float(abs(axis[0])), 6)

    xs = np.linspace(bounds[0, 0] + 0.01 * length, bounds[1, 0] - 0.01 * length, 96)
    started = time.perf_counter()
    sections = []
    for x in xs:
        section = core.section(plane_origin=[x, 0, 0], plane_normal=[1, 0, 0])
        if section is None or len(section.vertices) == 0:
            sections.append(None)
            continue
        yz = np.asarray(section.vertices)[:, 1:3]
        span = yz.max(0) - yz.min(0)
        sections.append({
            "x": round(float((x - bounds[0, 0]) / length), 4),
            "height": round(float(span[0] / length), 5),
            "depth": round(float(span[1] / length), 5),
            "entities": len(section.entities),
        })
    report["tools"]["trimesh_96_sections_ms"] = round((time.perf_counter() - started) * 1000, 2)
    report["normalized"]["sections_nonempty"] = sum(row is not None for row in sections)
    sample_indices = np.linspace(0, 95, 12, dtype=int)
    report["normalized"]["section_summary"] = [sections[i] for i in sample_indices]

    report["tools"]["trimesh_proximity_available"] = False
    report["tools"]["trimesh_proximity_blocker"] = "Optional rtree package absent in the recorded isolated environment"

    points = vtk.vtkPoints()
    points.SetData(numpy_support.numpy_to_vtk(core.vertices.astype(np.float64), deep=True))
    polys = vtk.vtkCellArray()
    face_data = np.hstack([np.full((len(core.faces), 1), 3, dtype=np.int64), core.faces.astype(np.int64)]).ravel()
    polys.SetCells(len(core.faces), numpy_support.numpy_to_vtkIdTypeArray(face_data, deep=True))
    polydata = vtk.vtkPolyData()
    polydata.SetPoints(points)
    polydata.SetPolys(polys)

    rng = np.random.default_rng(20260907)
    query = bounds[0] + rng.random((3000, 3)) * extents
    implicit = vtk.vtkImplicitPolyDataDistance()
    implicit.SetInput(polydata)
    started = time.perf_counter()
    distances = np.asarray([abs(implicit.EvaluateFunction(*map(float, p))) for p in query])
    report["tools"]["vtk_3000_surface_distance_ms"] = round((time.perf_counter() - started) * 1000, 2)
    report["normalized"]["vtk_distance_mean_over_length"] = round(float(np.mean(distances) / length), 6)

    started = time.perf_counter()
    vtk_counts = []
    for x in xs:
        plane = vtk.vtkPlane()
        plane.SetOrigin(float(x), 0, 0)
        plane.SetNormal(1, 0, 0)
        cutter = vtk.vtkCutter()
        cutter.SetInputData(polydata)
        cutter.SetCutFunction(plane)
        cutter.Update()
        vtk_counts.append(cutter.GetOutput().GetNumberOfCells())
    report["tools"]["vtk_96_sections_ms"] = round((time.perf_counter() - started) * 1000, 2)
    report["normalized"]["vtk_nonempty_sections"] = sum(count > 0 for count in vtk_counts)

    started = time.perf_counter()
    calibration = cq.Workplane("XY").box(1.0, 0.18, 0.12).edges("|Z").fillet(0.018).faces(">X").workplane().hole(0.045)
    vertices, triangles = calibration.val().tessellate(0.01)
    report["tools"]["cadquery_brep_build_and_tessellate_ms"] = round((time.perf_counter() - started) * 1000, 2)
    report["normalized"]["cadquery_test_vertices"] = len(vertices)
    report["normalized"]["cadquery_test_triangles"] = len(triangles)

    object_points = np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]], np.float64)
    intrinsics = np.array([[900,0,640],[0,900,360],[0,0,1]], np.float64)
    distortion = np.zeros(5)
    rvec = np.array([[0.2],[-0.1],[0.15]])
    tvec = np.array([[0.1],[-0.2],[5.0]])
    image_points, _ = cv2.projectPoints(object_points, rvec, tvec, intrinsics, distortion)
    image_points = image_points.reshape(-1, 2)
    started = time.perf_counter()
    ok, r2, t2 = cv2.solvePnP(object_points, image_points, intrinsics, distortion, flags=cv2.SOLVEPNP_ITERATIVE)
    report["tools"]["opencv_solvepnp_ms"] = round((time.perf_counter() - started) * 1000, 3)
    projected = cv2.projectPoints(object_points, r2, t2, intrinsics, distortion)[0].reshape(-1, 2)
    report["normalized"]["opencv_pnp_success"] = bool(ok)
    report["normalized"]["opencv_pnp_reprojection_px"] = round(float(np.mean(np.linalg.norm(projected - image_points, axis=1))), 8)

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Local verified Aircraft GLB, kept outside Git")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = run(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
