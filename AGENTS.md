# AIRCRAFT repository guidance

## Weapons Mother latest user decision (2026-09-05)

For Weapons Mother work, read `docs/weapons-mother/RESTART_START_HERE.md` before any historical handoff or learning note. The user has rejected S01 and requested its deletion, selecting a single clean Aircraft aviation-gun digital-asset line. Do not restore S01, continue its transform patches, or require the old two-project UI. Recover only individually validated visual-animation or component assets from older work as donors. The complete Aircraft original is not yet acquired in this restart; source identification is not source recovery or orientation approval. Other aircraft, B24 whole-aircraft and livery work remain unchanged.

## Authority

ChatGPT is the upstream controller for research, aircraft-system analysis, geometry decisions, behavior design, surface design, variant judgment, conflict resolution and approval.

Codex is the downstream implementation executor. It may implement approved contracts, generators, tests, review pages and repository changes. It must stop when required evidence is missing and must never invent hidden geometry, dimensions, variant applicability or approval.

## Current scope

The active production framework is `AIRCRAFT_NATIVE_FORGE`. The active family master is `B24J_CO_DATA_NATIVE_MASTER`. Initial historical instances are:

- B-24J-25-CO serial 42-73257, “80 DAYS”
- B-24J-45-CO serial 42-73436, “UBANGI BAG III”

The first complete native component is the twin vertical stabilizer and rudder assembly.

## Reference lock

The locked `b-24_liberator.glb` is the immutable visual and motion reference sample. Its node hierarchy, geometry, materials, images and 2,518 animation channels must be distilled before the corresponding native system is replaced.

Original manufacturer drawings, official technical orders, parts catalogs and approved measurements carry higher engineering authority than the reference model.

## Aircraft Native Forge

The long-term mother data is renderer-independent and consists of:

1. AircraftDNA
2. AssemblyGraph
3. GeometryRecipe
4. SurfaceProgram
5. BehaviorGraph
6. EvidenceGraph
7. ApprovalLedger

GLB, FBX, OBJ, STEP, CAD files, UV atlases and raster textures are reference inputs, verification artifacts or reproducible outputs.

## Hard rules

1. Verify every locked source by filename, byte count, SHA-256 and inventory before extraction.
2. Do not generate a guessed primitive aircraft, hidden fallback aircraft or approximate substitute for review.
3. Native reconstruction requires source-traceable extraction, manual semantic mapping, GeometryRecipe, BehaviorGraph, SurfaceProgram and fixed parity gates.
4. Unknown nodes, hidden structures, uncertain dimensions and uncertain motion groups remain `unresolved`.
5. Every native replacement must retain source node indexes, stable paths, evidence, transforms, bounds, surfaces, animation channels and review captures.
6. The exact reference mirror remains available until a replacement meets or exceeds it in fixed-camera, fixed-time and multi-view review.
7. Original drawings and official manuals control geometry when they conflict with the reference model.
8. Active generators, schemas, validators and browser workbenches must be repository-owned and reproducible.
9. Surface work binds through stable semantic `surface_id` values. UV, vector markings, panels, rivets and generated maps are replaceable SurfaceModules.
10. Free-design material controls may adjust base color and PBR response. Historical mode must preserve evidence-locked colors, side-specific markings and mission state.
11. Reusable aircraft-system logic must separate from aircraft-specific dimensions, configuration and evidence so later B25, B17, B29 and fighter projects can inherit the framework safely.
12. Record every factual source, transformation, generated artifact, hash, test result, uncertainty and approval state.
13. No unrelated refactor, hidden asset substitution, force push or merge before upstream and user review.
