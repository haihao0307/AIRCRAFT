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

---

# “80 DAYS” historical livery intake

## Scope added

This branch now includes an executable evidence-intake and mission-state gate for B-24J-25-CO serial `42-73257`, aircraft no. `487`, **“80 DAYS”**. It adds no aircraft geometry, UV, material, texture, animation or mechanism changes.

Added production functions:

- locked external-reference manifest for the master ZIP, E01 through E08, and the E03-derived `STAM` crop
- exact filename, byte-count and SHA-256 intake validation
- explicit blocked reports for absent source assets
- hard failure for an integrity mismatch
- mission-state record `80days-E03-placement-v1`
- reviewer-controlled E01 symbol count-sheet builder
- static historical-livery status page
- CI and package-script integration

## Commands

```text
npm run validate:80days:references
npm run build:80days:count-sheet
npm test
npm run build
```

## Verified blocked state

```text
asset intake: blocked-missing-asset
expected external assets: 10
verified assets: 0
missing assets: 10
integrity failures: 0
mission state: 80days-E03-placement-v1
victory flags: 8, supported only by E01
bomb marks: null, requires-annotated-count
count sheet: blocked-missing-asset
final bake: false
```

Committed reports:

- `reports/80-days-reference-intake.json`
- `reports/80-days-reference-intake.md`
- `reports/80-days-count-sheet.json`
- `reports/80-days-count-sheet.svg`

The review page is `public/80-days-livery-status.html` and is published at `/80-days-livery-status.html` by the static build.

## Historical rules locked

- `STAM` is starboard-only and sits directly below the upper rectangular side window shown by E03 and E01.
- E03 controls placement; E01 supports the provisional visible count of eight Japanese victory flags.
- Bomb marks remain uncounted until an accepted E01 file receives reviewer-approved bounding-box annotations.
- Port and starboard shark mouth, title and dice must be traced independently.
- Generated reconstruction boards remain outside the evidence chain.

## Remaining blockers

1. Restore the ten exact historical assets under `source-input/historical/308bg/374bs/80-days/`.
2. Rerun the validator and resolve every missing or mismatched file.
3. Create and review `80-days-E01-annotations.json`; approve each visible flag and bomb individually.
4. Restore and validate the authoritative `b-24_liberator.glb`.
5. Audit B-24J-25-CO compatibility and all source meshes.
6. Create non-destructive `LiveryUV` only on approved fuselage and fixed-fin paint surfaces.
7. Complete PBR-map, historical placement and runtime regression review before any final bake or merge.
