# 80 DAYS LiveryUV seam duplication reviewer decision

Status: approval required

Final LiveryUV approval: false

Final bake approval: false

## Finding

The current generator assigns `TEXCOORD_1.v` from each vertex local `position.x` sign. It does not create a topology seam. Indexed triangles that contain vertices on both sides of `x=0` therefore interpolate between the lower and upper atlas halves.

Across the eight candidate nodes, the locked source contains 2,217 triangles crossing that split. Of those, 2,163 have a generated V span of at least 0.45. There are 1,531 indexed vertices referenced by triangles assigned to opposite sides. This produces the long white strips visible in run 32811487861.

The full machine readable evidence is in `reports/80-days-liveryuv-topology-analysis.json`.

## Minimal fuselage counterexample

Node 1654, mesh 313, primitive 0, stable path:

`/Sketchfab_model[0]/root[1]/GLTF_SceneRootNode[2]/node_0_1084[3]/node_1_1022[1652]/_1398[1653]/Object_1654[1654]`

Vertex 7911 is shared by triangle 8568 and triangles 8561 and 8569.

Vertex 7911 has position `[0.0004883, 0.0749535, -0.9370098]`, normal `[-0.0860726, 0.8256383, 0.5575957]` and original UV `[0.1450523, 0.5892577]`.

Triangle 8568 uses indices `[7923, 7911, 7924]`. Its generated V values are `[0.3932791, 0.8951705, 0.3970620]`. The triangle therefore interpolates across 0.5018914 of the atlas height.

Triangle 8561 uses indices `[7906, 7907, 7911]`. Its generated V values are `[0.8939884, 0.8972985, 0.8951705]` and belongs wholly to the upper half.

To put triangle 8568 wholly in the lower island while keeping triangle 8561 in the upper island, vertex 7911 needs two `TEXCOORD_1` values. glTF vertex attributes are indexed together, so this requires a duplicate vertex with identical position and normal values and a redirected triangle index.

## Constraint conflict

Value preserving seam duplication leaves the rendered surface, triangle geometry, bounds, hierarchy and animation unchanged. It appends duplicate values to the position and normal accessors and changes affected index values. The position, normal and index arrays therefore cannot retain identical byte lengths and SHA hashes.

The strict array hash requirement and the independent non mirrored port and starboard island requirement cannot both be satisfied for this source topology.

The current diagnostic GLB remains rejected. Its UV report records `layoutStatus` and `stretchStatus` as `failed`. It must not be used as visual acceptance evidence.

## Requested reviewer decision

Approve value preserving seam vertex duplication on the eight already reviewed candidate nodes only.

If approved, the replacement invariance gate will require:

1. Every duplicated position and normal value exactly equals its source seam vertex.
2. No triangle corner position or normal value changes after resolving redirected indices.
3. Triangle count, world bounds, node hierarchy, materials, animations and 2,518 animation channels remain unchanged.
4. A provenance table maps each duplicate vertex and redirected index to the source vertex and triangle.
5. Only approved seam corners receive duplicates.
6. Original `TEXCOORD_0` values remain unchanged for all original vertices.
7. Port and starboard `LiveryUV` islands pass overlap, padding, stretch, texel density and pixel continuity review.

Until this decision is approved, `finalLiveryUVApproved` and `finalBakeApproved` remain false. No new livery bake, STAM registration, victory flag placement, tail marking replacement or browser visual acceptance claim may be made from the rejected projection.
