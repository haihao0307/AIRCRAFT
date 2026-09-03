# B24 clean production restart R2

This branch is the clean continuation point after the R1 full handoff release.

## Frozen parent

- Release tag: `b24-metal-grass-mission-r1-full-handoff-20260903`
- Frozen handoff commit: `e752d281760d9d95efed565f54b66bd6b7903387`
- Runtime source commit: `8ea0a34d016c46570e3916e37f587b2c7fb14ccf`
- Full package: `AIRCRAFT_B24_METAL_GRASS_MISSION_R1_FULL_HANDOFF_2026-09-03.zip`
- Current online review: `https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-metal-grass-mission-r1/`

## Restart method

1. Open the current online HTML and identify which components pass visually.
2. A passed component is frozen with its actual source, parameters and evidence.
3. Change one requested component and its genuine dependencies at a time.
4. Keep every accepted component available during later work.
5. Publish a separate directly clickable online HTML page for each new review.
6. Do not substitute the missing exact V016, Weapons Mother, img2threejs, iframe composition, mountains or an alternate aircraft mesh.
7. Technical checks, user visual acceptance and production readiness remain separate states.

## Initial state

- Exact V016 recovered: false
- Technical browser verification of inherited R1: PASS 30/30
- User visual acceptance: pending
- Weather integration: paused
- `visualAcceptance=false`
- `productionReady=false`
