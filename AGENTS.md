# AIRCRAFT repository guidance

## Authority

ChatGPT is the upstream controller for research, aircraft-system analysis, geometry decisions, behavior design, surface design, variant judgment and approval. Codex and Image2ThreeJS are downstream executors. They must follow the active task and return verifiable evidence through GitHub.

## Current scope

The active family master is `B24J_CO_DATA_NATIVE_MASTER`. Initial historical instances are:

- B-24J-25-CO serial 42-73257, “80 DAYS”
- B-24J-45-CO serial 42-73436, “UBANGI BAG III”

## Reference lock

The locked `b-24_liberator.glb` is the authoritative visual and motion reference sample. It remains immutable and is never silently replaced. Its node hierarchy, geometry, materials, textures and 2,518 animation channels must be fully distilled before a corresponding native system is replaced.

## Hard rules

1. Verify the locked reference file by filename, byte count, SHA-256 and inventory before every extraction.
2. Do not generate a guessed primitive aircraft, procedural fallback aircraft or approximate substitute for review.
3. Native reconstruction is allowed only through source-traceable extraction, manual semantic mapping, GeometryRecipe, BehaviorGraph and fixed parity gates.
4. Unknown nodes, hidden structures and uncertain motion groups remain `unresolved`. Keyword matches and Image2ThreeJS output never receive automatic approval.
5. Every native replacement must retain a mapping to source node indexes, stable paths, evidence, transforms, surfaces and review captures.
6. The exact mirror remains available until the replacement system meets or exceeds the reference sample in fixed-camera and fixed-time A/B review.
7. Image2ThreeJS may execute approved local geometry and browser QA. It cannot analyze the whole aircraft, select component boundaries or approve structure.
8. GLB, FBX, OBJ, STEP, CAD files and raster atlases are reference, verification or generated artifacts. The long-term aircraft mother data is structured and renderer-independent.
9. Surface work binds through stable semantic `surface_id` values. UV, vector markings, panels, rivets and generated maps are replaceable SurfaceModules.
10. Record every factual source, transformation, generated artifact, hash, test result, uncertainty and approval state.
11. No unrelated refactor, no hidden asset substitution, no force push and no merge until upstream and user review.
