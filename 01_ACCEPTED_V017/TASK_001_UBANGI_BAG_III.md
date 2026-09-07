# TASK 001 · UBANGI BAG III first production aircraft

## Mission

Build a high-completion Three.js online inspection site that runs the approved first-round **UBANGI BAG III** test livery through the complete path from locked source asset to a reversible livery system.

The current V1 board is approved only for pipeline testing. It does not claim final historical accuracy. A corrected V2 board will later replace textures, metadata and baked PBR maps through the same livery contract.

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

The V1 test board is stored as text-safe base64 chunks under `source-assets/approved-board-base64/`. `npm run rebuild:livery-reference` reconstructs `public/assets/livery/ubangi-bag-iii/approved-board.webp`, and `npm run verify:livery` validates its locked byte count and SHA-256. The livery manifest is in the same public directory.

Treat the board as a replaceable pipeline target. It is not a ready-made UV atlas and it is not final historical approval. Reconstruct final livery assets only against the exact real model and real UV after the V2 board is approved.

The left nose must retain:

- shark mouth
- pin-up figure
- exact text `UBANGI BAG III`
- two rows of mission bomb marks

The tail serial must read `42-73436`.

## UV production rule

Preserve all original UV data. Add a second UV set named `LiveryUV` only to paintable exterior surfaces.

Include:

- fuselage exterior skin
- glazed-nose surrounding metal skin
- wing upper and lower exterior skins
- fixed horizontal and vertical tail skins
- outer skins of ailerons, elevators, rudders and flaps
- external engine cowling and nacelle skins
- bomb-bay doors
- exterior access doors and painted maintenance panels

Exclude:

- propellers and hubs
- engine cylinders, exhaust mechanisms and internal engine parts
- tires, wheels, brakes and landing-gear struts/mechanisms
- all glass
- guns, barrels and internal turret mechanisms
- cockpit and interior equipment
- lamps, antennas, wires and small mechanical fittings

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

The online V1 pipeline site may use a calibrated projected decal as an intermediate comparison mode. Production approval remains blocked until the exact model has a dedicated LiveryUV and V2-derived baked map set.

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

Build a desktop-first and usable mobile inspection site with:

- automatic authoritative model loading
- perspective, left, right, front, rear, top and bottom camera presets
- orbit, pan and zoom
- original material, UBANGI BAG III, UV audit, normal, height and roughness inspection modes
- close-up nose and tail presets
- animation play, pause and timeline
- landing-gear and propeller regression controls or a preserved full-flight-sequence entry
- livery strength, weathering, normal and height controls within safe ranges
- mesh classification statistics
- source hash and inventory panel
- visible historical aircraft identity and attribution
- no placeholder aircraft geometry
- zero console errors

Publish with GitHub Pages. Include a public URL in the final handoff.

## Automation

Required scripts:

- `npm run extract:model -- <primary-html> <output-glb>`
- `npm run verify:model`
- `npm run test`
- `npm run build`

Use Blender headless processing when Blender is available:

`blender --background --python scripts/blender/prepare_b24_livery_uv.py -- <input-glb> <output-glb> <report-json>`

When Blender is absent, keep the script and fail with an explicit actionable report. Do not fake UV completion.

## Validation gates

1. Source GLB byte count and SHA-256 exact match.
2. Source inventory matches the locked counts.
3. Original animation and hierarchy remain available.
4. `LiveryUV` exists only on approved paintable exterior meshes.
5. Excluded mechanical and transparent meshes are absent from the livery atlas.
6. Nose art is correctly placed on the port side, readable and not mirrored.
7. Tail serial is correctly placed and readable.
8. No livery texture is applied to propellers, wheels, glass, guns or interior parts.
9. Original and livery modes switch without reloading or destroying source materials.
10. Browser console has zero errors.
11. Production build and static deployment pass.
12. Visual screenshots include left full aircraft, left nose close-up, top, bottom, right, tail close-up, UV audit and PBR inspection.

## Deliverables

- complete source code
- source extraction and verification scripts
- Blender UV preparation script
- prepared livery-ready GLB or an explicit verified blocked report if the exact binary has not yet crossed the asset bridge
- full PBR map set
- mesh classification report
- regression report
- screenshots
- GitHub Pages deployment
- `HANDOFF.md` containing changed files, commands, test output, source hashes, known uncertainties and next steps

The upstream controller may merge this branch after tests, build and website review pass so GitHub Pages can publish the test site. Codex must not merge on its own.
