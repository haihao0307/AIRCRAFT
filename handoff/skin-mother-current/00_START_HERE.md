# Skin Mother — Current Full Handoff — 2026-09-12

Start here for the current B-24 Skin Mother line.

## Current working branch

`feature/b24-80days-simple-placement-r9`

This branch was intentionally forked from the last technically stable 80 DAYS runtime baseline, R6, at commit:

`6a6403b256514cf8943395bcfc8ed0fa0e841922`

R9 is a handoff/work branch. No R9 visual result has been accepted yet.

## Frozen accepted mother

The generic B-24 mother remains frozen and must not be modified by 80 DAYS work:

- Branch: `accepted/b24-generic-mother-01`
- Freeze commit: `636f26ec102680b4154a6f9dca0cf49fc951f51e`
- Accepted visual render commit: `47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a`
- Fixed preview: `https://rawcdn.githack.com/haihao0307/AIRCRAFT/47ba8a21676b49e6a1d4d6d4285c28ba1f2f538a/b24-wing-seams-r16.html`

## Current 80 DAYS state

Aircraft: B-24J-25-CO 42-73257 “80 DAYS”, 14AF / 308BG / 374BS, no. 487.

R6 is the current stable technical base. Its CI/browser QA succeeded, but its artwork placement is NOT visually accepted. The mouth/art placement crosses the wrong nose/glazing region and must be recalibrated.

R7 and R8 are diagnostic/dead-end history. Do not continue their automatic feature-search or homography approach. Their lessons are recorded in `01_HANDOFF_STATE.md`.

## Required continuation method

For Skin Mother only, use the simple direct workflow:

1. Observe the historical photo.
2. Measure markings relative to obvious aircraft structures visible in that same photo.
3. Place them on the existing aircraft geometry with a small number of explicit offsets/scales/orientation parameters.
4. Use only the local fuselage curvature needed to wrap the art back to the skin.
5. Render from the same or near-same viewpoint and compare visually; iterate until close.

Do not add feature matching, candidate-window searching, homography solving, or other unnecessary inference when direct placement works.

First finish the port/left-side photo reconstruction. Only after it visually works should the starboard/right side be placed independently from its own photo. Never mirror one side to create the other.
