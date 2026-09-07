# UBANGI BAG III test-livery V1 handoff

## Purpose

This release runs the first complete website path for B-24J-45-CO serial 42-73436, **UBANGI BAG III**. The current livery board is a replaceable V1 pipeline test. Historical visual approval is deferred to the corrected V2 board.

## Implemented

- Locked aircraft identity and exact source-model byte count, SHA-256, source ID, author and license.
- GitHub Pages site with an exact public source-model preview and V1 livery board fallback.
- Full Three.js inspection path when the exact GLB is available from the same origin, imported as GLB, or extracted from an old embedded-HTML build.
- Exact byte and SHA-256 validation before a model is accepted.
- IndexedDB model cache after successful validation.
- Perspective, left, right, front, rear, top, bottom, nose and tail camera presets.
- Original material, test livery and UV-classification modes.
- Runtime exterior-surface classification and downloadable audit report.
- Replaceable livery manifest and active-livery contract.
- Adjustable port-nose test-decal projection for alignment work.
- Non-destructive UV preparation script for Blender.
- Automated source-lock, livery-status and website-copy tests.

## LiveryUV rule

Included surfaces: fuselage, nose metal skin, wings, fixed tail, outer control-surface skins, external engine cowling and nacelle skins, bomb-bay doors, exterior access doors and painted maintenance panels.

Excluded surfaces: propellers, hubs, engine internals, exhaust mechanisms, wheels, tires, brakes, landing gear, glass, guns, turret interiors, cockpit, aircraft interior, lights, antennas, wires and small mechanical fittings.

The original UV and source hierarchy remain immutable. `LiveryUV` is added only after the exact model passes the locked source gate.

## Verification completed locally

```text
node --check src/main.js: PASS
npm test: PASS, 3 tests
```

Local `npm install` could not complete within the managed-container network timeout. GitHub Actions installs dependencies and runs `npm test` plus `npm run build` on the pull request and main branch.

## Current production boundary

The exact GLB binary is recorded in the user's historical package and publish manifest, but has not yet crossed into the AIRCRAFT repository. The website therefore keeps two valid states:

1. Public online inspection state: exact public source-model embed plus V1 livery board.
2. Full Three.js livery state: activates automatically only after the locked GLB is restored or imported and passes byte/hash validation.

No substitute B-24 model, fake UV completion or fabricated PBR map is used.

## V2 replacement

The corrected V2 visual board will replace livery images, metadata and final baked PBR maps. Model hierarchy, original UV, animation, propellers, landing gear and website contracts stay unchanged.
