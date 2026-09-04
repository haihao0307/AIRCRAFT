# B24 V017 clean restart

This branch is the work-version 17 continuation point.

## Source boundary

The verified GitHub full handoff release `b24-metal-grass-mission-r1-handoff-20260903` is the adopted restart example. The missing exact `B24_V016_COMPLETE_WORKBENCH.html` has not been recovered. V017 preserves this distinction.

## Frozen inheritance

* Native B24 payload SHA-256: `7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`
* 1,784 components, 348 meshes, 325,358 triangles
* Four propeller channels, landing gear and bomb-bay animation
* Grass airfield, runway coordinates, taxi strip and clear sky
* Eighteen-stage, 330-second mission
* Four releases, four impacts, effects, synthesized audio and six cameras

## Review

Online workbench: `https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-v017-clean-restart/`

GitHub Pages commit: `7f50c265a92c80d965951b3ee62dee434526064e`

Browser QA: PASS 53/53

Static QA: PASS 34/34

`visualAcceptance=false`

`productionReady=false`

The next implementation must preserve all frozen files and change only the component explicitly opened for work. Weather Mother, mountains, Weapons Mother and img2threejs remain outside this first V017 review.
