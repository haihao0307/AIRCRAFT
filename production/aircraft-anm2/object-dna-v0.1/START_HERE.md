# Aircraft Browning M2 / AN/M2 — Object DNA V0.1 Pilot

Date: 2026-09-07

This branch is the first practical Object DNA Kernel pilot. It starts from the verified Aircraft reference and the current W07 comparison workbench, while keeping all historical and B-24 applicability gaps explicit.

## Pilot goal

Turn the current reference/candidate workflow into a reproducible browser-first Object DNA asset:

`Identity -> Ontology -> Semantics -> Evidence -> Measurement -> GeometryProgram -> SurfaceCoordinates -> MaterialProgram -> Lifecycle/Evolution -> Behavior -> World Object Contract`

The pilot is successful only when these layers can regenerate and verify the review object without treating a product mesh, UV map or raster texture as the permanent primary asset.

## Stable pilot identity

See `ENTITY.json`.

This pilot ID identifies our versioned digital reconstruction entity. It does not claim to be the serial identity of a specific historical physical gun.

## First implementation order

1. Read-only Reference Twin and Native Twin in the same comparison frame.
2. Evidence ledger and truth state for every major exterior feature.
3. Measurement Kernel: principal axis, named datums, normalized sections, silhouette and anchor difference.
4. Rebuild exterior geometry by semantic parts and constraints.
5. SurfaceCoordinateProgram with explicit direction and scale.
6. MaterialProgram with cause-based layers and neutral shape-review mode.
7. Lifecycle/Evolution history model.
8. State-driven historical presentation behavior.
9. Export the World Object Contract for B-24 placement after exact applicability is resolved.

## Current immediate exterior gaps

- barrel-to-receiver exterior continuity
- receiver top and plate layering
- feed-side opening/top-cover exterior relationship
- visible disposal-side openings where supported
- sight and sight base appropriate to the exact B-24 context
- exterior controls and fastener families
- B-24-specific ammunition box, feed route, mount/suspension and disposal relationships

The B-24-specific layer stays evidence-gated until the aircraft model/block/station/date applicability is resolved.

## Safety and scope

Historical visualization only. No functional internal mechanism, fabrication dimensions, tolerances, optimization or operating instructions are part of this pilot.

## Shared architecture handoff

Xiaoma / World Kernel handoff package:
`haihao0307/guilin-dem-pipeline`, branch `handoff/object-dna-kernel-v0.1-20260907`, path `docs/mother_coordination/object-dna-kernel-v0.1-20260907/`.

Current state: researchReady=true, pilotImplementationReady=true, visualAcceptance=false, productionReady=false.
