# B24 Native Direct Inheritance V001

## Purpose

Build a fast whole-aircraft checkpoint by directly inheriting the locked B-24 reference model into an Aircraft Native Forge owned numeric format. This checkpoint avoids manual geometric reconstruction and performs no drawing-led correction.

## Locked source

- File: `b-24_liberator.glb`
- Bytes: `23,085,972`
- SHA256: `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`

## Native format

Schema:

`haihao.aircraft/native-direct-mirror@0.1.0`

The native package consists of:

- a readable JSON manifest for the scene, component hierarchy, materials, meshes, UV channels, animations and approval ledger;
- a raw little-endian numeric payload named `.anfd`;
- a self-developed WebGL runtime that does not load GLB, FBX, OBJ or a glTF loader;
- an embedded standalone HTML review build;
- deterministic source-to-native comparison and delivery receipts.

## Directly inherited data

- 1 scene
- 1,784 component nodes
- 348 meshes
- 307,273 vertices
- 976,074 indices
- 325,358 triangles
- 30 materials
- 18 embedded source images preserved as numeric byte blocks
- UV0 and UV1 where present
- 1 original animation
- 2,518 animation tracks

Positions, normals, indices, UV values, local transforms, hierarchy, animation times and animation values are copied exactly after the source hash is verified.

## Numeric validation

- 1,666 mesh numeric stream comparisons: pass
- 2,518 animation stream comparisons: pass
- 18 source image byte comparisons: pass
- component and mesh counts: pass
- runtime GLB load: false
- runtime glTF loader dependency: false

## Preview behavior

The first browser preview uses average colours measured from the source images together with inherited metallic and roughness factors. Source image bytes remain in the numeric payload for later native texture compilation. The page includes camera presets, original animation playback, inherited material mode and a uniform airframe-skin colour mode.

A static native reconstruction fallback is embedded so the page still displays the complete aircraft when WebGL is unavailable.

## Current boundary

- `directInheritanceBuilt=true`
- `sourceHashVerified=true`
- `visualParityApproved=false`
- `engineeringAccuracyApproved=false`
- `nativeMasterApproved=false`

This checkpoint is the fast reference shell. Original drawings will subsequently correct known simplifications and component boundaries while preserving the directly inherited baseline for comparison.
