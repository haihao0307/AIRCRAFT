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

The exact source GLB is committed under `public/assets/model/` and is copied to the same-origin build path. Every load path is accepted only after complete byte and SHA-256 verification. The workbench defaults to the derived LiveryUV GLB and retains strict local-file recovery. No substitute B-24 model is used.

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
asset intake: verified
expected external assets: 10
verified assets: 10
missing assets: 0
integrity failures: 0
mission state: 80days-E03-placement-v1
victory flags: starboard 8, individually boxed in E01; port 0
bomb marks: null, blocked-count
count sheet: review-required
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

## Production V2 evidence state

The Release ZIP now passes full archive integrity plus filename, byte, pixel-dimension and SHA-256 checks for E01 through E08. The reproducible E03 STAM crop is also locked, giving `expected 10 / verified 10 / missing 0 / integrityFailures 0`.

The exact source GLB remains immutable at `541c3dcf…efe8be0d`. The build deterministically derives a GLB that adds `TEXCOORD_1` only to source nodes 719, 744, 1654, 1666, 1678, 1714, 1747 and 1760. Its SHA is `9f1b4efd5da75efee1dddbec1d06b1ad00dfb78dfb8c957a1faecaff23edad1a`. The derived binary is staged in the complete site artifact rather than duplicated in the Git tree. The audit records all 348 meshes and confirms 1,784 nodes, 325,358 triangles, one animation and 2,518 channels.

Thirteen editable, side-specific SVG traces are linked to photo crops, source hashes, registration points and transforms. This includes separate port and starboard ROBBY forms because both sides are visible in independent photographs. The build deterministically renders the 8K Base Color and mask plus 4K OpenGL Normal, Roughness, Height, AO, Metallic and ID maps into the complete site artifact. Browser materials read those files through `TEXCOORD_1` and contain no floating marking geometry.

Historical state remains conservative:

- STAM exists only on starboard and is anchored below the E03 upper rectangular window.
- E01 supplies eight individually boxed starboard victory flags. Port remains evidence-gated empty.
- Bomb count is `null`, status is `blocked-count`, and `finalBakeApproved` is `false`.
- Trace, candidate-surface, UV stretch, texel-density and final visual review remain `review-required`.

Current reports:

- `reports/80-days-reference-intake.json`
- `reports/80-days-model-mesh-audit.json`
- `reports/80-days-liveryuv-qa.json`
- `reports/80-days-pbr-qa.json`
- `reports/80-days-browser-qa.json`, generated by the dedicated remote workflow for its exact commit

The remaining acceptance gate is reviewer inspection of the eight candidate surface masks and the remote browser screenshots for projection seams, window placement, texture stretch, port and starboard contamination, and PBR response. A green generic Validate job does not satisfy this gate. Final bake and merge remain prohibited.
