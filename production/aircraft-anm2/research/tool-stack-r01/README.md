# Mechanical Distillation Tool Stack R01

Date: 2026-09-07. Scope: method research using the current Aircraft AN/M2 reference as a temporary visual test case. No product mesh, source vertex table, UV table, raster texture, functional internal mechanism, fabrication dimensions or operating instructions are persisted here.

## Why this exists

The goal is a reusable mechanical-asset compiler: accept a reference model, photographs, drawings and manuals; understand the object and its role; measure and register the evidence; convert the result into readable semantic constraints; generate a native asset; then verify it numerically and visually. Blender remains an optional background referee, not the authoritative data model.

The current Browning reference is the first trial because we already have a verified local GLB and a native W07 candidate. The method must later generalize to other mechanical assets without depending on weapon-specific code.

## Selected stack

### 1. Reference ingest and normalized measurement: Trimesh + NumPy/SciPy

Use Trimesh for GLB scene loading, node transforms, triangle access, principal-axis sanity checks and exact cross-section extraction. Trimesh documents single and parallel mesh-plane sections, and its proximity module supports closest-point, signed-distance and thickness queries when optional spatial-index dependencies are available.

Official docs:
- https://trimesh.org/section.html
- https://trimesh.org/trimesh.proximity.html
- https://trimesh.org/trimesh.inertia.html

Decision: keep Trimesh as the easiest reference parser and section-description layer. Do not make it the only numerical backend.

### 2. Fast cutting and distance kernel: VTK

Use VTK in the offline/background measurement process for repeated plane cuts, point-to-surface distance fields and later difference maps. The current isolated probe found VTK substantially faster than Trimesh for repeated cuts on this specific reference. The result is a local benchmark, not a universal performance claim.

VTK.js also exposes GPU cutting against plane, sphere, box, cylinder and cone implicit functions. We will not add VTK.js to the default browser workbench yet because the single-HTML review format rewards a smaller runtime. Browser cutting should first be implemented with the existing Three.js stack or precomputed normalized measurements.

Official VTK.js cutter docs:
- https://kitware.github.io/vtk-js/api/Rendering_Core_CutterMapper.html

Decision: native VTK is the preferred background difference/section engine in R01.

### 3. Parametric mechanical compiler backend: CadQuery / OCP / Open CASCADE

Use CadQuery/OCP as a non-interactive B-Rep compiler for readable rules such as plates, profiles, tubes, holes, slots, fillets, repeated exterior fasteners and attachment interfaces. Open CASCADE exposes curve and surface adaptors for B-Rep topology and geometry. The CAD kernel is a build target, not the source of truth: evidence, semantic constraints and our readable recipes remain authoritative.

Official OCCT docs:
- https://dev.opencascade.org/doc/refman/html/class_geom_adaptor.html
- https://dev.opencascade.org/doc/occt-7.6.0/refman/html/class_b_rep_adaptor___curve.html
- https://dev.opencascade.org/doc/occt-7.6.0/refman/html/class_b_rep_adaptor___surface.html

Decision: use CadQuery/OCP for precise parametric exterior reconstruction where primitives and B-Rep constraints are useful. Do not force every irregular reference region into CAD primitives.

### 4. Browser spatial queries: Three.js + three-mesh-bvh

Keep Three.js as the review renderer. Add a fixed, vendored three-mesh-bvh build only when W08 begins numeric browser measurements. It supports accelerated raycasting, closest-point queries, mesh-to-mesh distance, BVH traversal and scene/object BVHs. This is a better fit than adding a second full rendering framework to the workbench.

Official repository/docs:
- https://github.com/gkjohnson/three-mesh-bvh
- https://github.com/gkjohnson/three-mesh-bvh/blob/master/API.md

Decision: three-mesh-bvh is the browser measurement accelerator for the next experiment, subject to a size and compatibility gate before inclusion in a fixed single-HTML release.

### 5. Photograph and drawing registration: OpenCV first, COLMAP when multi-view evidence exists

Use OpenCV camera calibration and PnP when a photo can be tied to known 3D anchors or drawing landmarks. OpenCV's pinhole calibration model makes camera intrinsics, distortion and object-to-camera pose explicit. The R01 probe confirms the local environment can solve a synthetic PnP problem; it does not prove automatic real-photo alignment.

Use COLMAP only when several overlapping photographs of the same object are available. Its SfM pipeline recovers sparse 3D structure and camera poses from multiple viewpoints, followed optionally by multi-view stereo. This is the correct tool family for a future photo-only intake path.

Official docs:
- https://docs.opencv.org/5.0/tutorials/calib3d/camera_calibration/camera_calibration.html
- https://docs.opencv.org/doc/doxygen/html/d5/d1f/calib3d_solvePnP.html
- https://colmap.github.io/tutorial

Decision: OpenCV is the default photo-to-known-model registration tool. COLMAP is an optional multi-view reconstruction stage, not a dependency for model-based jobs.

### 6. Scan or reconstructed point-cloud registration: Open3D, optional

Open3D supports point-to-point, point-to-plane, symmetric and colored ICP, plus global registration. It belongs in the stack when scans, dense reconstructions or point clouds arrive. The current task already has a verified GLB, so Open3D is not required for R01 and was not installed in the local probe environment.

Official docs:
- https://www.open3d.org/docs/latest/tutorial/pipelines/icp_registration.html
- https://www.open3d.org/docs/latest/tutorial/pipelines/global_registration.html

Decision: optional adapter, no current production dependency.

### 7. Material language: own SurfaceProgram aligned to OpenPBR semantics; MaterialX as interchange

Keep our compact SurfaceProgram as the authoritative production data. Align its semantics with OpenPBR concepts such as base substrate, metalness, specular roughness and optional coat rather than inventing ambiguous channel meanings. OpenPBR is an open ASWF surface-shading specification; its metadata recommendations also reinforce version, color-space and world-unit declarations.

MaterialX represents shader graphs as DAGs and ShaderGen can generate GLSL, OSL, MDL and MSL. MaterialX also has a web viewer that generates ESSL and renders through Three.js. We can therefore add a MaterialX export/import adapter later without making the full MaterialX runtime a mandatory part of every review HTML.

Official docs:
- https://academysoftwarefoundation.github.io/OpenPBR/
- https://materialx.org/Specification.html
- https://materialx.org/Tools.html
- https://materialx.org/docs/api/class_shader_graph.html

Decision: OpenPBR-like semantic schema now; MaterialX interoperability later. No raster product textures are required by this decision.

### 8. Verification: numerical first, Playwright visual second

Numerical gates should include normalized section-envelope difference, surface-distance distributions, anchor/axis error, silhouette difference and repeated rebuild identity. Browser review remains Playwright-based with fixed viewports and fixed cameras. User visual acceptance remains a separate gate.

## Actual local Browning probe

The verified local reference was read from an isolated runtime. Only normalized external metrics and timing results were retained. The source file itself, absolute dimensions, source coordinates and UVs are absent from this research directory.

Environment used locally:
- Trimesh 4.11.1
- VTK 9.6.2
- OpenCV 4.13.0
- CadQuery 2.8.0 / OCP backend
- NumPy 2.3.5
- SciPy 1.17.0

Observed on this one source and machine:
- Trimesh GLB scene load: about 77.79 ms.
- 96 Trimesh cross sections: about 265.64 ms.
- 96 VTK cross sections: about 55.14 ms.
- 3,000 VTK point-to-surface distance evaluations: about 74.91 ms.
- Generic CadQuery B-Rep build plus tessellation: about 60.21 ms.
- Synthetic OpenCV solvePnP: about 1.221 ms, zero synthetic reprojection error.
- Trimesh exact proximity was not exercised because its optional `rtree` dependency is absent in this isolated environment. This is recorded as a blocker rather than silently switching algorithms.

The main visible reference subset used by W07 has a principal long-axis sanity check whose absolute dot product with the W07 X-axis is 0.999962. Ninety-six sampled cross sections were non-empty. These are normalized exterior checks only and do not establish firearm engineering dimensions or functional internals.

## Current best combination

For the next Browning experiment, use this sequence:

1. `Reference Intake`: our verified GLB reader plus Trimesh scene inventory.
2. `Axis and Anchor Solver`: NumPy/SciPy with explicit user/evidence confirmation.
3. `Section Kernel`: VTK for repeated sections, Trimesh for path/contour semantics.
4. `Primitive/Constraint Fitting`: NumPy/SciPy, then CadQuery/OCP for accepted B-Rep primitives.
5. `Native Recipe`: repository-owned semantic rules and exceptions.
6. `Browser Difference`: Three.js plus a fixed three-mesh-bvh build after size testing.
7. `Photo Adapter`: OpenCV PnP; COLMAP only for real multi-view photo sets.
8. `Surface Compiler`: SurfaceProgram using OpenPBR-aligned semantics; optional MaterialX interchange.
9. `Independent Referee`: headless Blender only when a second renderer or difficult topology inspection is useful.
10. `Gates`: numerical difference report, fixed browser captures, then user visual approval.

## What we deliberately reject

- No permanent source-mesh copy in the native asset.
- No encoded vertex or UV dump described as a recipe.
- No noise field used to hide missing openings, fasteners or silhouette errors.
- No automatic promotion of a primitive fit to historical truth.
- No B17 installation geometry used as B24 evidence.
- No full MaterialX, VTK.js, Open3D, COLMAP or Blender dependency in every browser workbench.
- No claim that small file size automatically means faster rendering.

## Next concrete experiment: MeasurementKernel R01

The next implementation should stay beside W07 and add a measurement kernel rather than new appearance polish:

- Build the reference/main-gun BVH and native BVH.
- Establish a confirmed exterior long axis and named anchor planes.
- Generate 64 to 128 normalized cross sections along that axis.
- Compare section envelopes and contour count between reference and native object.
- Produce a color-coded deviation strip without storing source section coordinates in Git.
- Detect candidate planes/cylinders/slots only as proposals, each with confidence and source linkage.
- Start with the receiver and barrel exterior continuity. Keep feed opening, sight and B24 installation as explicit unresolved items until their evidence is acquired.
- Benchmark the browser bundle-size increase before accepting three-mesh-bvh into the fixed single-file release.

The method is considered successful only when it improves both explanation and repeatability: the system must tell us what differs, why a generated feature exists, which evidence supports it, and which rule should change to correct it.