# AIRCRAFT repository guidance

## Authority

ChatGPT is the upstream controller. Codex is the downstream engineering executor. Follow the active task file exactly and return verifiable results through GitHub.

## Current scope

The active production aircraft is B-24J-45-CO serial 42-73436, **UBANGI BAG III**, 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force, China Theater, 1944 to 1945.

## Hard rules

1. Keep the authoritative source GLB immutable and preserve its node hierarchy, original animation, propeller channels, landing-gear calibration, weapons nodes, materials, and textures.
2. Do not create a substitute aircraft mesh, procedural fallback aircraft, or alternate B-24 model.
3. Livery work is non-destructive. Preserve the source UV and create a separate `LiveryUV` only on approved exterior paint surfaces.
4. Exclude propellers, engine internals, wheels, tires, brakes, landing-gear mechanisms, glass, guns, turret interiors, cockpit/interior parts, lights, antennas, and small mechanical fittings from the livery atlas.
5. Keep external painted cowling and nacelle skins, fuselage skin, nose skin, wing skin, fixed tail skin, control-surface outer skins, bomb-bay doors, and exterior access panels in the livery system.
6. Every factual source, transformation, generated asset, and test result must be recorded.
7. No unrelated refactor. No silent asset substitution. No merge until upstream review.

## Mandatory startup for the “80 DAYS” livery line, 2026-09-06

For this scoped task the aircraft is B-24J-25-CO “80 DAYS”, serial 42-73257. The older UBANGI BAG III scope above does not authorize using that aircraft's livery or geometry as this task's reference.

Read [MUSEUM_RESTORATION_RULES.md](experiments/80-days-material-r1/MUSEUM_RESTORATION_RULES.md) before any new restoration work. The user requires evidence-only museum skin restoration: leave unsupported areas unresolved, preserve the selected photograph's placement and shapes, and never invent or beautify historical features. B17 photographs are limited color and bomb-glyph references; they do not supply B24 window geometry, markings placement or counts. Recognition of bomb-tip and flag shapes does not approve the generated board's layout.

The generated nose-art board identified in that record is rejected and ineligible as production evidence. Continue the piecewise HTML/source workflow. Do not generate concept images without a separate explicit user request. Preserve existing accepted relationships and source bytes. The R2.1 local checkpoint is an approach/work checkpoint, not final acceptance of every piece. This instruction update does not authorize model changes, final binding, merging, or claims of visual completion.
