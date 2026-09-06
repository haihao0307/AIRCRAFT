# Aircraft native visual system: rule-only bootstrap

2026-09-05. Actual implementation: a small procedural geometry/material/presentation core and a Blender compatibility probe. The coupon is a neutral test fixture, not a replacement gun, not a new workbench, and not proof of Aircraft historical accuracy. Complete weapon visualization remains to be built and reviewed.

## Current contract

The user has approved an Aircraft-only historical digital-visualization system with independently selectable visual components, a separately sourced aircraft mount, PBR materials, presentation animations, and a one-in-five tracer appearance preset. These are visual tasks, not real-world weapon fabrication, operation, functional internal design or performance optimization.

Persist semantic part identities, compact geometry recipes, material programs, presentation states, source/permission metadata, and verification results. Do not persist imported or generated mesh assets, raster textures, sampled source UV arrays, vertex/index dumps, encoded geometry disguised as JS/JSON or baked blend files in this native package or its delivery. Temporary tessellation/GPU data may be generated from rules in memory and released. A hash is metadata, not a retained mesh. Screenshots are optional review evidence, never texture inputs; none are generated here.

Source models are optional temporary reference inputs. Their absence does not authorize guessed replacement geometry and does not require rebuilding an old exact-accessor package. Photos and other independent evidence can support an appearance recipe; uncertain sections remain unresolved. Referenced assets retain their source/permission attribution. Native code does not erase third-party rights.

No imports from S01, the old mixed-output viewer, or its camera patches. No requirement for a B24/aircraft dual-project UI. The separate B24 aircraft and livery projects remain untouched.

## Implemented and deliberately limited

core/recipe.py generates a rounded material coupon from five scalar parameters, computes absolute spread/return poses, and evaluates a simple analytic roughness field in local coordinates. Generated arrays exist only during evaluation. This deliberately small fixture is not the proposed quality of the final Aircraft model.

tools/check_release.py rejects known asset extensions, opaque payload patterns and large Python literal tables. It is a heuristic aid and can miss obfuscated data or produce false positives; provenance review and a clean dependency/network audit remain required. It does not scan the whole AIRCRAFT repository, which contains unrelated historical and aircraft assets.

tools/blender_probe.py creates three transient coupons and a connected Principled material graph using official bpy 4.5.0. It checks mesh validity, repeated spread/restore, local coordinates, absence of image assets and release of generated data. It exports only a JSON report. It does not render a picture, test a production browser or establish cross-renderer appearance parity.

Local Python unit tests passed before publication; remote Blender execution status must be read from the actual Actions result. Workflow has push/manual triggers only, no overnight agent or scheduled self-development. A successful workflow performs these finite tests and then stops.

## Next deliverable

First establish evidence-backed exterior semantics and correct orientation, then implement the complete static Aircraft visual object and independently evidenced mount. Add inspection/spread and source-bound material controls, followed by animation states and bounded visual-effect objects. Every adopted module needs a fixed-condition regression and explicit user visual review. No 90-degree patch chain, empty panel placeholder, or coupon should be delivered as the completed gun.

## Reproduce

PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s native/weapons-visual/tests -p 'test_*.py' -v

PYTHONDONTWRITEBYTECODE=1 python native/weapons-visual/tools/check_release.py native/weapons-visual

Under Python 3.11 with bpy==4.5.0 installed:

PYTHONDONTWRITEBYTECODE=1 python native/weapons-visual/tools/blender_probe.py reports/blender-probe.json

## Official sources checked this turn

Blender Python-module usage: https://docs.blender.org/api/main/info_advanced_blender_as_bpy.html (text retrieved). Official bpy package and interpreter requirement: https://pypi.org/project/bpy/4.5.0/ (text retrieved). Geometry Nodes introduction: https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/introduction.html (official indexed text read; full direct fetch failed). Adobe parameter exposure: https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/manage-parameters/exposing-a-parameter (relevant indexed text read). Adobe performance guidelines: https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/best-practices/performance-optimization-guidelines (text retrieved). These describe software concepts; the rule code and fixture are newly authored tests, not claims derived from a weapons manual.
