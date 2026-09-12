# Skin Mother — Handoff State — 2026-09-12

## 1. Frozen generic mother

The authoritative generic B-24 mother is `B-24 公版母体 01` / `b24-generic-mother-01`.

- Status: `user-accepted-frozen`
- Branch: `accepted/b24-generic-mother-01`
- Freeze commit: `636f26ec102680b4154a6f9dca0cf49fc951f51e`
- Visual version: R16
- Render commit: `47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a`
- Engineering calibration: false

Accepted scope includes upper/lower main-wing seam endpoints, tailplane/engine-cowling paint separation, five service-life states, exhaust-carbon buildup, and front/back perspective/orthographic inspection. Specific-aircraft work must inherit this mother without rewriting it.

## 2. 80 DAYS aircraft identity

- Type: B-24J-25-CO
- Serial: 42-73257
- Name: `80 DAYS`
- Unit: 14AF / 308BG / 374BS
- Aircraft number: 487

Historical reconstruction rules already established:

- Shark-mouth interior: dark red.
- Teeth: aged off-white and photo-derived, not uniform generated triangles.
- No red iris/eye component.
- Right-side eye: crescent + triangle.
- No left-window eye.
- Left and right sides are independent; never mirror.
- Left confirmed names: `ROBBY`, `HUFF`.
- Right confirmed name: `STAM`.
- Do not duplicate ROBBY onto the right side.
- Four Japanese flags are historically supported for the known reference state; dark red.
- Bomb markings are yellow and point downward; exact count remains unresolved and must not be invented.
- `80 DAYS` title must use traced/photo-derived outline; no generic bold font.
- Dice faces/pips must follow the visible photo, not default dice layouts.
- Occluded shark-mouth teeth must not be guessed into existence.

## 3. Runtime history

### R6 — stable technical base

Branch ancestry used for R9. Stable head before R9 handoff docs:

`6a6403b256514cf8943395bcfc8ed0fa0e841922`

R6 browser QA succeeded on desktop and 390×844 mobile. This only proves runtime loading/self-audit. It is NOT visual acceptance.

Known visual defect: the photo-derived mouth/art projection is registered to a provisional glass anchor and lands across the wrong nose/glazing region.

R6 recovered useful artwork data from the historical photo: mouth perimeter, visible teeth, ROBBY/HUFF paths, dice faces and visible pip contours. Preserve those photo-derived shapes.

### R7 — diagnostic only

R7 tested multiple connected glass/window candidates. It demonstrated that the earlier provisional component 69 was a poor identity anchor and that automatic containment/candidate ranking did not reliably identify the correct historical feature.

Do not continue R7 as the product path.

### R8 — failed/dead-end diagnostic

Branch: `feature/b24-80days-projective-r8`

Head: `479e812c2461e91083c8f1e286fb05b23508cd5f`

R8 attempted projective/homography registration and failed with `singular homography`. This line is intentionally abandoned for Skin Mother.

### R9 — current continuation branch

Branch: `feature/b24-80days-simple-placement-r9`

R9 was forked from the stable R6 head and is now the only intended continuation line. At this handoff point it contains no new accepted livery placement yet; its purpose is to continue with direct observational placement instead of automatic feature solving.

## 4. Visual acceptance state

- Generic Mother01: accepted/frozen.
- 80 DAYS R6: runtime-stable, visually not accepted.
- R7: diagnostic only.
- R8: failed/dead end.
- R9: current WIP continuation; no visual acceptance yet.

Do not report 80 DAYS as production-ready until a fixed-commit public preview has been opened and visually checked against the historical reference.
