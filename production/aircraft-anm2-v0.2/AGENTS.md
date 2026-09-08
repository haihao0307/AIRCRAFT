# Aircraft AN/M2 V0.2 execution rules

## Identity and scope

Preserve Entity ID `ODNA:MECH:ANM2:PILOT-0001`. Use generation `GEN-0002` for this clean restart. Work on the Aircraft Browning M2 / AN/M2 exterior and B-24 applicability. B17 remains deferred.

The active target is Web. Blender may run only as an isolated background measuring or checking instrument. CAD, temporary meshes, UVs and renderer buffers are build products. Permanent truth remains Object DNA, evidence, semantic constraints, readable geometry rules, surface coordinates, material rules, lifecycle, behavior and approval state.

## Mandatory historical read

Before editing, read the full V001 handoff package source, especially `FAILURE_LEDGER.md`, `VALID_KNOWLEDGE.md`, `NEXT_PRODUCTION_GATES.md`, the W08 rejection record and the current state files.

## Prohibited inheritance

1. Do not copy the W06 whole-gun geometry into the active generator.
2. Do not use W07 total-length scaling and bounding-box-center translation as final registration.
3. Do not use W08 per-object normalized min/max section envelopes as parity evidence.
4. Do not average away receiver errors with long barrel regions.
5. Do not mark an object complete when required semantic parts are absent.
6. Do not use B17 mounts, suspension, boxes, sights or disposal paths to fill B24 gaps.
7. Do not recover retired S01, R01 or other rejected chains.
8. Do not use PBR, transparency, bloom, dirt or strong highlights to hide geometry differences.
9. Do not publish a review HTML before the actual local reference has been loaded and inspected by the executor.
10. Do not equate CI success with historical accuracy or visual acceptance.

## Reference Twin

Accept only the verified local file with 6,548,040 bytes and SHA-256 `2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b`. Preserve its nodes and transforms in the temporary reference view. Never upload, cache or serialize its product geometry into the repository.

## Geometry order

1. Semantic correspondence table.
2. Mechanical datum registration.
3. Receiver datum shell.
4. Top cover and plate layering.
5. Rear exterior groups.
6. Receiver front plane, barrel centerline, barrel root and front collar.
7. Ventilated jacket and forward termination.
8. Evidence-backed feed-side and disposal-side exterior openings.
9. Sight and controls after exact B24 applicability evidence.
10. B24 box, feed route, mounting and disposal layer after World Kernel contract.

## Review gate

Use identical neutral materials and fixed orthographic cameras for geometry approval. Required checks include part presence, named datum residuals, contour centroid, area, perimeter, loop and hole count, 2D contour distance, side/top/end silhouette overlap, 3D surface distance and fixed-view manual inspection.

User-facing review requires a self-contained single HTML in an immutable GitHub commit and a raw.githack link. Keep `visualAcceptance=false` and `productionReady=false` until the user explicitly changes them.

## Public preview delivery rule (2026-09-08)

Read PUBLIC_PREVIEW_DELIVERY_RULE.md. Preserve fixed-version public HTTPS previews and old links. Before final delivery, open the actual public URL and verify version, resources and core interactions. Local tests or HTTP 200 alone are insufficient. Carry this rule into subsequent versions and handoffs; do not modify frozen historical artifacts.

## Camera correction from user (2026-09-08)

For all subsequent object work, also read OBJECT_DNA_ASSEMBLY_POLICY.md. Each semantic entity needs its own DNA record and declared relative frame. Include ammunition supply and associated display objects in the station relationship model; do not mistake display meshes for physical parts or unknown transforms for identity transforms.

Default spatial presentation must use ordinary perspective with normal depth scaling. W10 used orthographic projection in the orbiting display, creating confusing depth cues; do not repeat this default. Measurement uses explicitly labeled fixed side/top/end orthographic views. Oblique orthographic views are supplementary and cannot alone determine depth proportions. Never use inverse perspective, mirroring, negative scale, or independent per-object fitting to compensate. Reference and native views share projection, pose, datum, zoom and equivalent viewport aspect. Verify views from both ends and after resize. Preserve frozen W10; apply corrections in the next version.

