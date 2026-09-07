# TASK 009 · B-24J-25-CO “80 DAYS” real-model livery production V1

## Mission

Continue from the merged historical-livery skillpack and produce the first real-model, browser-reviewable “80 DAYS” fuselage livery package. Work only on branch `feature/b24-80days-livery-production-v1` and push every completed artifact to GitHub.

This task must use the source-traceable rules already merged into `main`. It must not redraw, replace or deform the aircraft. It must not create a procedural or substitute B-24.

## Locked aircraft identity

- Aircraft: Consolidated B-24J-25-CO Liberator
- Name: `“80 DAYS”`
- Serial: `42-73257`
- Aircraft No.: `487`
- Unit: 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force
- Theater: China, 1944
- Aircraft ID: `308bg_374bs_42-73257_80-days`

## Authoritative model gate

Accept only:

- `b-24_liberator.glb`
- bytes: `23085972`
- SHA-256: `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`
- nodes: 1784
- meshes: 348
- triangles: 325358
- materials: 30
- embedded images: 18
- animations: 1
- animation channels: 2518

Search the repository, Release assets, Actions artifacts and accessible asset caches first. The user has already supplied this exact binary to the upstream asset bridge. Do not use another B-24. If the exact binary cannot cross into the checkout, implement all source-independent tooling and report the binary bridge as one explicit blocker.

## Historical evidence

Use the merged manifest at `data/aircraft/308bg/80-days-reference-manifest.json` and the evidence rules in `docs/aircraft-pipeline/`.

Direct evidence IDs:

- E01 `80_Days_China_2_1944.jpg`
- E02 `80days.jpg`
- E03 `80-days(1).jpg`
- E04 `80_Days_asisbiz_left.jpg`
- E05 `80_Days_asisbiz_no487.jpg`
- E06 `80_Days_asisbiz_inflight.jpg`
- E07 `80_Days_asisbiz_right_inflight.jpg`
- E08 `80_Days_SDASM_10_0018697.jpg`
- derived crop `stam_crop_zoom.png`

Preferred English-language source sites for restoration and provenance cross-checking:

- Asisbiz B-24 gallery and the four 42-73257 pages
- DAIN CBI contributed-photo collection for “80 DAYS”
- San Diego Air & Space Museum archive identifier `10_0018697`

Accept an asset only after filename, bytes and SHA-256 match the merged manifest. Keep originals outside generated output. Do not fabricate a missing scan or replace it with a generated reconstruction.

## Mission state

Use `80days-E03-placement-v1` as the initial placement state.

- `STAM`: starboard-only, directly below the upper rectangular side window
- victory flags: 8, supported only by E01 for this state
- bomb marks: unresolved until reviewer-approved annotations exist
- final bake: blocked while bomb count remains unresolved
- port and starboard shark mouth, title and dice: independently reconstructed
- do not combine markings from different dates

The browser may display unresolved bomb positions as review overlays. It must not paint an invented final bomb count.

## Production scope

Include only:

- fuselage exterior metal skin
- glazed-nose surrounding metal skin
- exterior fuselage access doors and painted maintenance panels
- both fixed vertical-fin painted skins

Exclude and preserve existing source materials for:

- propellers and hubs
- engines and engine internals
- wheels, tires, brakes and landing gear
- glass
- guns, barrels and turret interiors
- cockpit and interior
- lights, antennas, wires and small mechanisms
- wings, nacelles and horizontal-tail livery in this V1 package

No geometry edit is permitted. A non-destructive derived asset may add `LiveryUV` only on approved paint surfaces while preserving original UV, hierarchy, animation, materials and mechanisms.

## Required implementation

### 1. Asset-intake completion

- Extend the existing reference validator to support verified local files and documented remote provenance.
- Produce a report with each asset’s evidence ID, source URL, filename, bytes, SHA-256, dimensions, side, view and permitted use.
- A hash mismatch must fail CI.
- A missing asset must remain explicit and cannot silently fall back.

### 2. Model and mesh audit

- Verify the exact GLB.
- Produce `reports/80-days-model-compatibility.json` and `.md`.
- Classify all 348 source meshes.
- Identify approved fuselage and fixed-fin paint meshes by node, mesh, material, hierarchy and world bounds.
- Record every excluded or ambiguous mesh and reason.
- `review` items block final LiveryUV approval.

### 3. Non-destructive LiveryUV

Add or complete a headless Blender script:

`script/blender/prepare_b24_80days_livery_uv.py` or the repository-standard equivalent.

Requirements:

- preserve original UV
- add `LiveryUV`
- unique port and starboard islands
- highest texel density for shark mouth, title, dice, STAM, symbol rows and fin serial
- no seam through readable title, dice faces, teeth, STAM or serial
- no mirrored side-specific islands
- at least 4K functional target, 8K recommended production target
- report overlap, stretch, padding and texel density
- no excluded mechanical or transparent parts in the atlas

Output a traceable derived model only when the exact source binary is available:

`assets/model/b-24_liberator_80days-liveryuv-v1.glb`

Record source SHA, script revision and derived SHA.

### 4. Editable marking package

Create separate editable source layers or SVG/PNG masks for:

- port shark mouth
- starboard shark mouth
- port `“80 DAYS”`
- starboard `“80 DAYS”`
- port dice
- starboard dice
- ROBBY
- port HUFF
- provisional starboard HUFF only when evidence supports it
- starboard STAM
- victory flags
- bomb-mark review layer
- national insignia masks where the approved fuselage scope includes them
- port and starboard fin `273257`, `487`, white triangle
- olive drab, neutral gray, touch-up, exposed metal, oil, dust and grime masks

Do not use a clean computer font as the final hand-painted title. Preserve quotation marks.

### 5. PBR production package

Produce model-derived maps against `LiveryUV` when the model and evidence gates pass:

- Base Color, sRGB
- Normal, OpenGL tangent-space unless the runtime proves another convention
- Roughness, linear
- Height or Displacement, linear and physically restrained
- AO, optional according to runtime contract
- Metallic mask, only for genuinely exposed metal
- editable ID and decal masks

Target naming follows `B24_80_DAYS_TEXTURE_SPEC.md`.

Surface requirements:

- olive drab over neutral gray
- deep-red shark-mouth interior
- aged white teeth and dark edging
- white hand-painted title with quotation marks
- two independently traced dice below title
- dense readable rivet rows
- panel seams, inspection plates, hatches, patch plates and restrained oil-canning
- chipped paint, field touch-ups, dust, grime and directional oil streaks
- repeated-mission operational wear while still maintained and airworthy
- no factory-new finish
- no wreck corrosion
- no fantasy bullet holes
- no black-dot rivets in Base Color

When a final map cannot be source-approved because an evidence or count gate remains open, produce a clearly labeled `review-only` layer and keep final-bake approval false.

### 6. Browser review workbench

Publish a real-model review page:

`public/80-days-livery-workbench.html`

The page must never draw a substitute aircraft. It must fail closed when the exact GLB or derived audited model is absent.

Required modes:

- source material
- 80 DAYS review livery
- Base Color
- Normal
- Roughness
- Height or Displacement
- LiveryUV checker
- mask and evidence overlay

Required views:

- port full side
- starboard full side
- port nose
- starboard nose and STAM
- both fixed fins
- top fuselage symbol rows
- underside transition
- rivet and panel glancing-light close-up

Show live source hash, derived hash, mission state, evidence IDs, unresolved bomb count, mesh classification statistics and final-bake gate.

### 7. Tests and evidence

Add automated checks for:

- exact model size and hash
- model inventory
- no geometry mutation
- source UV preserved
- LiveryUV present only on approved meshes
- STAM absent on port and located under the correct starboard window
- no port/starboard mirroring
- title quotation marks retained
- 8 E01-supported victory flags in the selected review state
- bomb count unresolved until annotation approval
- excluded parts have no 80 DAYS material or maps
- PBR map dimensions, color spaces and conventions
- zero browser console errors
- production build

Capture review screenshots and store machine-readable QA reports.

## Required outputs

- verified historical asset-intake report
- exact model and compatibility report
- full 348-mesh classification report
- Blender LiveryUV script
- derived model when source binary is available
- editable marking masks
- PBR maps or clearly gated review-only maps
- `public/80-days-livery-workbench.html`
- browser screenshots
- UV and PBR QA reports
- updated `HANDOFF.md`
- updated status page
- tests and GitHub Actions integration

## Completion states

Use one precise status:

- `complete`: exact model, exact evidence, mission counts, LiveryUV, PBR, browser and QA all pass
- `review-ready`: real model and LiveryUV workbench pass, but one historical visual decision awaits upstream approval
- `blocked-assets`: exact external reference binaries or exact GLB cannot cross the asset bridge
- `blocked-count`: source files are verified but bomb-count annotation remains unresolved
- `blocked-model-audit`: exact model is present but compatibility or mesh classification has unresolved items

Never use `complete` while any required gate remains open.

## Git rules

- Work only on `feature/b24-80days-livery-production-v1`.
- Commit and push every completed artifact.
- Keep the PR open and Draft until real-model browser evidence exists.
- Do not modify `main` directly.
- Do not merge.
- Do not force-push or rewrite history.
- Post commit SHA, changed files, commands, test output, screenshots, preview path and blockers in the PR.
