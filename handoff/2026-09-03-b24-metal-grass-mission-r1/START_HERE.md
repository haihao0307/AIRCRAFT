# B24 Metal Grass Mission R1 full handoff

This directory freezes the current B24 metal and grass-airfield review before a clean production-line restart.

## Frozen review

- Build: `B24_METAL_GRASS_MISSION_R1`
- Direct online HTML: `https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-metal-grass-mission-r1/`
- Readable source commit: `8ea0a34d016c46570e3916e37f587b2c7fb14ccf`
- Full browser evidence run: `33733439863`, result `PASS 30/30`
- Live HTML verification run: `33737127679`, result `success`
- Native payload SHA-256: `7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`

## Important status

This handoff is an archive of the current working candidate. It is not a claim that the missing historical exact V016 was recovered.

- `exactV016Recovered=false`
- `weatherIntegrated=false`
- `newMountains=false`
- `weaponsMotherIncluded=false`
- `img2threejsIncluded=false`
- `visualAcceptance=false`
- `productionReady=false`

## Full package

The GitHub Release tag is:

`b24-metal-grass-mission-r1-full-handoff-20260903`

The release contains the complete runnable web directory, native aircraft payload, pinned Three.js dependencies, readable source, browser evidence, screenshots, manifests, checksums, and local start helpers.

Primary package name:

`AIRCRAFT_B24_METAL_GRASS_MISSION_R1_FULL_HANDOFF_2026-09-03.zip`

## Restart boundary

After this package is frozen, new production work starts on a separate clean branch. This archived R1 remains available for reference and must not be silently mixed into the new line. The new line must identify its aircraft source explicitly before any visual or mission work begins.
