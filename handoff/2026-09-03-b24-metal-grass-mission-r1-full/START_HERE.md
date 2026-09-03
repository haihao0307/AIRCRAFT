# B24 Metal Grass Mission R1 full handoff

This directory freezes the current B24 workbench before a clean production restart.

## Primary review entry

https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-metal-grass-mission-r1/

The primary user-facing deliverable remains the directly clickable online HTML page. The ZIP produced from this handoff is a preservation and restart asset.

## Frozen runtime identity

- Build: `B24_METAL_GRASS_MISSION_R1`
- Runtime source commit: `8ea0a34d016c46570e3916e37f587b2c7fb14ccf`
- Browser evidence run: `33733439863`
- Browser evidence: `PASS 30/30`
- Evidence artifact ID: `9884964353`
- Evidence artifact archive SHA-256: `94dd9f4bae178f3986999510e67bb83f97d8dd4c927d72eae3240639033e5d3e`
- Native aircraft payload SHA-256: `7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`
- Source hierarchy: 1,784 components and 348 source meshes
- Four inherited spindle channels: `1454`, `1385`, `1431`, `1408`

## What is preserved

- Readable HTML, CSS and JavaScript workbench source
- Same-origin pinned Three.js runtime
- Native aircraft geometry and animation payload
- Four-engine start and shutdown sequence
- Grass airfield and grass runway
- Takeoff, climb, cruise, bomb-bay, four releases, ground impacts, return, approach, landing, rollout and taxi-back sequence
- Programmatically synthesized engine, wind, release, explosion and touchdown audio
- Camera controls and automatic shot sequence
- Desktop and mobile browser evidence
- QA script, exact file checksums and handoff records

## Important source qualification

The missing exact `B24_V016_COMPLETE_WORKBENCH.html` was not recovered. This R1 uses the inherited native payload extracted from the currently published aircraft review page whose HTML identity is:

- Review file label: `B24_V012_PROPELLER_INTERFACE_REVIEW.html`
- Review HTML SHA-256: `7cf4c78cea99f9bf3aed5507cbcb2bdb49a71465b3c4aabc29563214f3da2fde`

The package must preserve this qualification. It must never be renamed or represented as the exact recovered V016.

## Exclusions

- No Weapons Mother runtime
- No img2threejs or image2three pipeline
- No substitute aircraft mesh
- No iframe scene composition
- No mountain scenery
- No Weather Mother integration in this frozen R1

## Approval state

- Technical browser verification: passed
- User visual acceptance: pending
- `visualAcceptance=false`
- `productionReady=false`

## Restart rule

A new production branch starts from this frozen state. Future work keeps accepted components intact, changes only the requested component and its genuine dependencies, and always publishes a directly clickable online HTML page before presenting package records.
