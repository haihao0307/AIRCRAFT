# AIRCRAFT repository guidance

## Authority

ChatGPT is the upstream controller. Codex is the downstream engineering executor. Follow the active task file exactly and return verifiable results through GitHub.

## Current scope

The active production aircraft is B-24J-45-CO serial 42-73436, **UBANGI BAG III**, 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force, China Theater, 1944 to 1945.

## Hard rules

1. Keep the authoritative source GLB immutable and preserve its node hierarchy, original animation, propeller channels, landing-gear calibration, weapons nodes, materials, and textures.
2. Do not create a substitute aircraft mesh, procedural fallback aircraft, or alternate B-24 model.
3. Livery work is non-destructive. Preserve the source UV and create a separate `LiveryUV` only on approved exterior paint surfaces.
4. Exclude propellers, engine internals, wheels, tires, brakes, landing-gear mechanisms, glass, guns, turret interiors, cockpit/interior parts, lights, antennas, and small mechanical fittings from the livery atlas.
5. Keep external painted cowling and nacelle skins, fuselage skin, nose skin, wing skin, fixed tail skin, control-surface outer skins, bomb-bay doors, and exterior access panels in the livery system.
6. Every factual source, transformation, generated asset, and test result must be recorded.
7. No unrelated refactor. No silent asset substitution. No merge until upstream review.

## User review delivery

1. The primary visual acceptance deliverable is a directly clickable online HTML page.
2. Opening the supplied link must enter the interactive workbench in the browser. A ZIP archive, downloadable HTML attachment, artifact card, screenshot, repository file view, or setup instruction cannot replace the online HTML review entry.
3. Do not report a visual candidate as ready until its public URL returns successfully and a real browser has loaded the page, renderer, aircraft data, controls, and requested interaction.
4. Build archives and full packages are secondary records. Provide them only after an explicit package request or after the online HTML review page is already available.
5. If publication or browser verification has not completed, state that the online review page is not ready. Never present a local build result as an online delivery.
6. Keep the last accepted online page available while a new candidate is being developed. Publish new work to a separate review path until the user accepts it.
7. Once the user accepts a component, preserve its actual source files, parameters, dependency contract, and accepted evidence. Later work changes only the requested component and its genuine dependencies.
