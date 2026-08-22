# TASK 001 · UBANGI BAG III first production aircraft

## Mission

Build a high-completion Three.js online inspection site that applies the approved first-round **UBANGI BAG III** livery to the authoritative B-24 model and proves the complete route from locked source asset to reversible historical livery.

Work directly in this branch. Implement code, tests, generated reports, and GitHub Pages deployment. Do not stop at planning.

## Locked identity

- Aircraft: Consolidated B-24J-45-CO Liberator
- Serial: 42-73436
- Nickname: UBANGI BAG III
- Unit: 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force
- Theater: China, 1944 to 1945
- Aircraft ID: `308bg_374bs_42-73436_ubangi-bag-iii`

## Authoritative model contract

The only permitted source model is:

- File: `b-24_liberator.glb`
- Bytes: `23085972`
- SHA-256: `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`
- Nodes: 1784
- Meshes: 348
- Triangles: 325358
- Materials: 30
- Embedded images: 18
- Animations: 1
- Animation channels: 2518
- Author: CreadorDeMu
- License: CC BY 4.0

The upstream controller has locked two historical package sources in its File Library:

1. `B24_飞机生产线_v0.9.6_单一土质地面_隐藏大弧航线_投弹机枪版.html`, primary source.
2. `B24_飞机生产线_v0.9.5_真实模型内置版.html`, fallback source.

Implement and test `scripts/extract-glb-from-html.mjs` so the primary HTML can be converted to the exact locked GLB when the upstream asset bridge writes it into `source-input/`. Never download or substitute another model.

## Approved visual source

The approved board source is stored as base64 chunks in `source-assets/approved-board-base64/`. Run `npm run rebuild:livery-reference` to rebuild `public/assets/livery/ubangi-bag-iii/approved-board.webp` before development. The livery manifest is in the same public directory.

Treat the board as the approved first visual direction. It is a visual target, not a ready-made UV atlas. Reconstruct the livery against the real model and real UV.

The left nose must retain:

- shark mouth
- pin-up figure
- exact text `UBANGI BAG III`
- two rows of mission bomb marks

The tail serial must read `42-73436`.

## UV production rule

Preserve all original UV data. Add a second UV set named `LiveryUV` only to paintable exterior surfaces.

Include fuselage exterior skin, glazed-nose surrounding metal skin, wing upper and lower exterior skins, fixed horizontal and vertical tail skins, outer skins of ailerons, elevators, rudders and flaps, external engine cowling and nacelle skins, bomb-bay doors, exterior access doors and painted maintenance panels.

Exclude propellers and hubs, engine cylinders and internal mechanisms, tires, wheels, brakes and landing-gear mechanisms, all glass, guns and turret internals, cockpit and interior equipment, lamps, antennas, wires and small mechanical fittings.

Write the final classification to `reports/livery-mesh-classification.json`. Every one of the 348 source meshes must have a recorded category and reason. Ambiguous meshes must be listed as `review`, never silently included.

## Material output

Produce real model-derived PBR maps using `LiveryUV`:

- Base Color
- Normal
- Height
- Roughness
- AO
- Metallic or metalness mask when supported
- decal and marking masks

A calibrated projected decal can exist as an intermediate comparison mode. The production display must use the dedicated model UV and baked map set.

Surface target:

- faded wartime olive-drab upper surfaces
- aged light-gray underside
- moderate China-theater service wear
- directional engine exhaust staining
- restrained paint wear and maintenance touch-ups
- clear panel seams, doors, hatches and rivet detail in close inspection
- no wreck-like corrosion
- no excessive black rivet dots in Base Color

Normal and height intensity must be physically restrained. Do not deform mechanical clearances, door edges, glass fits, gun mounts, or moving control surfaces.

## Runtime preservation

Carry forward the verified behavior contracts from v0.9.6:

- one authoritative GLB
- original hierarchy and animation retained
- source-channel propellers retained
- verified landing-gear endpoints retained
- single yellow compacted-earth ground retained
- visible route geometry remains hidden
- aircraft nose follows the hidden route tangent
- combat effects remain external to the source GLB
- livery switching is reversible

Livery work must not regress propeller rotation, landing gear, wheel contact, smoke, route direction, takeoff direction, or existing flight phases.

## Website

Build a desktop-first and usable mobile inspection site with automatic authoritative model loading, perspective and orthographic camera presets, orbit/pan/zoom, original material and livery modes, UV/normal/height/roughness inspections, close-up nose and tail presets, animation controls, preserved flight-sequence entry, safe material controls, mesh classification statistics, source hash and inventory panel, historical identity and attribution, zero placeholder aircraft geometry, and zero console errors.

Publish with GitHub Pages and include the public URL in `HANDOFF.md`.

## Required commands

- `npm run rebuild:livery-reference`
- `npm run extract:model -- <primary-html> <output-glb>`
- `npm run verify:model`
- `npm run test`
- `npm run build`

Use Blender headless processing when available:

`blender --background --python scripts/blender/prepare_b24_livery_uv.py -- <input-glb> <output-glb> <report-json>`

When Blender is absent, keep the script and fail with an explicit report. Do not fake UV completion.

## Validation gates

1. Source GLB byte count and SHA-256 exact match.
2. Source inventory matches the locked counts.
3. Original animation and hierarchy remain available.
4. `LiveryUV` exists only on approved paintable exterior meshes.
5. Excluded mechanical and transparent meshes are absent from the livery atlas.
6. Nose art is correctly placed on the port side, readable and not mirrored.
7. Tail serial is correctly placed and readable.
8. No livery texture is applied to propellers, wheels, glass, guns or interior parts.
9. Original and livery modes switch without destroying source materials.
10. Browser console has zero errors.
11. Production build and static deployment pass.
12. Screenshots include full left side, port nose close-up, top, bottom, right side, tail, UV audit and PBR inspections.

## Deliverables

Complete source code, extraction and verification scripts, Blender UV script, prepared livery-ready GLB or a verified blocked report until the exact binary crosses the asset bridge, full PBR map set, mesh classification report, regression report, screenshots, GitHub Pages deployment, and `HANDOFF.md`.

Do not merge this branch. Stop after pushing the completed implementation and posting the handoff to the pull request.
