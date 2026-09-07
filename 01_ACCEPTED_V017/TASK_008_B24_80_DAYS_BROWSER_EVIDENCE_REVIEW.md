# TASK 008 · B-24J-25-CO “80 DAYS” browser evidence review and annotation station

## Mission

Continue the existing `feature/b24-80days-historical-livery-skillpack` branch by turning the TASK 007 evidence gate into a usable browser review station for the upstream museum-restoration workflow.

The reviewer must be able to load the historical files locally in the browser, validate them without uploading source photography, inspect E01 through E08, annotate victory flags and bomb mission marks, and export a traceable mission-state package. The application must preserve the authoritative-aircraft lock and must not create a substitute B-24, fabricated evidence, a guessed UV layout, or final PBR maps.

## Required reading and authority order

1. `AGENTS.md`
2. `docs/SOURCE_LOCK.md`
3. `docs/UV_LIVERY_POLICY.md`
4. `TASK_006_B24_80_DAYS_HISTORICAL_LIVERY_SKILLPACK.md`
5. `TASK_007_B24_80_DAYS_MISSION_STATE_AND_ASSET_INTAKE.md`
6. `data/aircraft/308bg/80-days-reference-manifest.json`
7. `data/aircraft/308bg/80-days-mission-states.json`
8. `docs/aircraft-pipeline/B24_80_DAYS_ACCEPTANCE_CHECKLIST.md`

## Locked identity

- Aircraft: Consolidated B-24J-25-CO Liberator
- Nickname: “80 DAYS”
- Serial: `42-73257`
- Aircraft number: `487`
- Unit: 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force
- Theater: China, 1944
- Pipeline ID: `308bg_374bs_42-73257_80-days`

## Hard production boundary

- Keep the authoritative GLB, source hierarchy, geometry, mechanisms, animation and original UV immutable.
- Do not generate, display or embed a procedural replacement aircraft.
- Do not claim final livery approval from generated color boards.
- Do not modify propellers, hubs, engines, wheels, tires, landing gear, glass, guns, turret interiors, cockpit or aircraft interior.
- Do not upload the user's historical source images to a server. Browser review must operate locally with `File`, `Blob`, `ArrayBuffer`, `URL.createObjectURL`, Web Crypto and IndexedDB when needed.
- Do not transmit source image bytes through analytics, telemetry or network requests.
- Do not merge to `main`.

## Stage A · Browser evidence review page

Create:

`public/80-days-evidence-review.html`

The page must be desktop-first and usable on a tablet. It must include:

1. Locked aircraft identity and historical warnings.
2. A local-file drop zone for the exact ten expected assets.
3. Client-side byte-count and SHA-256 validation against `data/aircraft/308bg/80-days-reference-manifest.json`.
4. An E01 through E08 evidence table showing:
   - evidence ID
   - expected filename
   - side and view
   - principal use
   - expected bytes and SHA-256
   - local validation state
5. A clear statement that generated reconstruction boards are excluded from the evidence chain.
6. A no-network indicator and visible privacy notice.
7. A reset action that revokes object URLs, clears loaded image bytes and clears local review state after confirmation.

The master ZIP may be validated as a binary file by size and SHA-256. ZIP extraction is optional. Do not introduce a third-party CDN dependency solely for ZIP extraction.

## Stage B · Historical image inspection

For accepted E01 through E08 images, provide:

- image selector
- fit, 100 percent and 200 percent views
- pan and zoom
- brightness, contrast and gamma display adjustments that never overwrite the source
- grayscale and negative display modes for tonal inspection
- source metadata panel with filename, bytes, SHA-256, evidence ID and principal use
- side-specific badges for port, starboard and archive-secondary
- screenshot-safe image frame with a visible `display adjustment only` label when adjustments are active

Do not use OCR as authority. Optional text suggestions may be displayed only as unapproved notes.

## Stage C · E01 reviewer annotation canvas

E01 controls the initial symbol review. Implement a non-destructive canvas or SVG overlay with:

- rectangle creation, move, resize and delete
- zoom-safe coordinates stored in original-image pixels
- one record per candidate symbol
- automatically assigned stable IDs
- symbol type:
  - `victory-flag`
  - `bomb-mark`
- review status:
  - `verified`
  - `obscured`
  - `duplicate`
  - `not-a-symbol`
  - `unresolved`
- reviewer note
- confidence note that remains descriptive and does not auto-approve
- numbered boxes and a legend
- separate counts for each type and status

The UI may begin with eight provisional victory-flag records only after E01 passes exact validation. Their status must begin as `unresolved` or `source-record-supported`, never silently `verified`. The reviewer must confirm each one.

Bomb marks must remain uncounted until individually boxed and reviewed.

## Stage D · STAM placement inspection

Use E03 as the controlling placement photograph and E01 as supporting evidence.

Provide a dedicated `STAM` inspection view that:

- displays E03 and the derived `stam_crop_zoom.png` side by side when both are validated
- records that the crop is derived from E03 and is not independent evidence
- overlays a movable reference rectangle for the upper rectangular side window
- overlays a separate text baseline marker immediately below the window
- exports normalized and source-pixel placement coordinates
- locks the side to `starboard`
- blocks any attempt to assign `STAM` to port

## Stage E · Mission-state export

Export a JSON package with this minimum structure:

```json
{
  "schema": "haihao.aircraft/80-days-review-package@1.0",
  "aircraftId": "308bg_374bs_42-73257_80-days",
  "missionStateId": "80days-E03-placement-v1",
  "primaryPlacementEvidence": "E03",
  "symbolCountEvidence": "E01",
  "sourceHashes": {},
  "displayAdjustments": {},
  "stamPlacement": {},
  "annotations": [],
  "verifiedVictoryFlagCount": 0,
  "verifiedBombMarkCount": 0,
  "unresolvedCount": 0,
  "reviewerApproval": false,
  "approvedForFinalBake": false
}
```

Rules:

- Preserve every source SHA-256.
- Record the original-image pixel coordinates for each annotation.
- Keep `reviewerApproval` false until every accepted symbol is resolved.
- Keep `approvedForFinalBake` false in this stage.
- Include a warning when the visible eight-flag source record and manually verified box count disagree.
- Never combine counts from different photographic states.

Also export a review SVG that embeds no historical raster bytes by default. It should contain the boxes, numbers, source filename, source hash, crop coordinates and instructions for reopening the original file locally.

## Stage F · Import and round-trip validation

The page must import its own exported JSON and restore:

- source associations by filename and hash
- annotation boxes
- statuses and notes
- display adjustments
- STAM placement guides
- mission-state metadata

Source files must be reselected locally and revalidated. An imported package must never bypass source validation.

## Stage G · Automated tests

Add browser-independent tests for the pure data logic. Required checks:

1. Exact manifest matching by filename, bytes and SHA-256.
2. Wrong hash blocks an image.
3. E03 remains the controlling `STAM` placement evidence.
4. `STAM` cannot be assigned to port.
5. Annotation coordinates remain in source pixels after display zoom changes.
6. Bomb count derives only from `verified` bomb boxes.
7. Victory count derives only from `verified` victory boxes.
8. `reviewerApproval` remains false while any accepted candidate is unresolved.
9. A JSON export and import round trip preserves all review data.
10. Generated reconstruction boards cannot be registered as evidence.
11. No network fetch is used for source photography.
12. Existing source-lock, TASK 007 and static-build tests continue to pass.

Add scripts as appropriate, such as:

```json
"test:80days:review": "node scripts/test-80-days-evidence-review.mjs"
```

Keep the implementation dependency-light and static-host compatible.

## Stage H · Status and documentation integration

Update:

- `public/80-days-livery-status.html`
- `docs/aircraft-pipeline/README.md`
- `HANDOFF.md`
- `package.json`
- `.github/workflows/validate.yml`
- `scripts/build-static.mjs`

Add a visible link from the production status page to the evidence review station.

The build must publish:

- `/80-days-livery-status.html`
- `/80-days-evidence-review.html`

## Verification

Run and report:

```bash
npm run validate:80days:references
npm run build:80days:count-sheet
npm test
npm run build
```

Also run any new review-specific test command.

Required manual checks:

- loading a valid small test fixture
- rejecting a wrong hash
- creating, moving and resizing an annotation
- JSON export and import round trip
- reset and object-URL cleanup
- no network requests for local source images

## Completion response

Return:

1. branch and commit SHA
2. changed files
3. automated test results
4. browser review features implemented
5. privacy and no-upload verification
6. current asset-intake state
7. current mission-state and count-sheet state
8. preview URL or branch file URL
9. remaining blockers

Keep the pull request in draft. Do not merge.