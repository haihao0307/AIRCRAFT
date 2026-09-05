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

## 2026-09-05: B24 learning intake R1

Continue on this branch. Read [the B24-specific material, Blender, UE and dependency skill card](docs/b24-learning-r1-20260905/SKILL.md), [source and acceptance state](docs/b24-learning-r1-20260905/STATE.json), and [validation scope](docs/b24-learning-r1-20260905/VALIDATION.md).

The intake baseline is `b6c47ba3f27330776c7a473094d7c29375993d1c`. Xiaoma materials were read from `haihao0307/guilin-dem-pipeline` at `da14fb018dd2f2eeebcf5586893dc8e08d9f1ec9`. No coordination branch was merged.

This update records applicable methods and adds a read-only change-boundary guard. Existing aircraft assets, materials, original UV, mechanical tracks, airfield, mission, audio, cameras and published workbench are unchanged. The earlier QA counts above are inherited records, not tests rerun by this learning intake. The last user-accepted rollback target remains unresolved; this intake does not approve a candidate version.

Run `python tools/verify_b24_learning_boundary.py --self-test` for isolated guard tests. In a clean local clone of this intake, run `python tools/verify_b24_learning_boundary.py --repo .` to check its committed change boundary. The guard is scoped to this learning update; a later authorized production change needs its own task and validation.

The next bounded experiment is exterior-skin material selection under fixed lighting. Blender/UE/Houdini application tests, live browser recheck, material visual review and cross-object reuse remain not_run or pending. The existing workbench URL above remains the entry.
