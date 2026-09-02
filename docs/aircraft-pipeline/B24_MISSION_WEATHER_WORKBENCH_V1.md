# B24 full mission and Weather Mother workbench V1

## Purpose

This workbench restores the visible runway and one continuous aircraft mission before adding weather. The mission starts on the runway, taxis, takes off, climbs through multiple cloud layers, releases four bombs over a visible target, produces ground explosions, returns to the airport, descends, lands and taxis back.

## One workbench rule

The aircraft, runway, bombs, explosions, clouds, precipitation, camera and controls run in one Three.js scene and one page. No popup, second tab or separate weather desk is used. Developer diagnostics remain hidden by default.

## Propeller direction protection

Propeller motion is filtered from the authoritative GLB animation tracks. No alternating index rule is allowed. The runtime contract reports four source-track directions as `[1, 1, 1, 1]` so QA can fail if the former parity guess returns.

## Weather and cloud interaction

The visible weather cases are fair cumulus, layered thick cloud, storm wall, rain layer, low fog, snow and ice cloud, and post-rain sunset. Low, middle, high and storm cloud volumes occupy the same world as the aircraft. During penetration, nearby cloud sprites move away from the aircraft, local opacity opens a temporary cavity, wing condensation wakes appear, visibility decreases and turbulence increases. The volumes recover after passage.

## Protected systems

The exact B24 source identity remains 23,085,972 bytes and SHA256 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`. Existing geometry and source animation data are not rewritten. Existing texture maps are retained during this weather and mission pass. The historical livery issue remains a later task.

## Approval state

`visualAcceptance=false`

`productionReady=false`
