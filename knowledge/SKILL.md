# B24 adopted methods R2

Read date: 2026-09-05. Source coordinator: haihao0307/guilin-dem-pipeline, handoff/xiaoma-mentor-v1.1-20260905. Current catalog re-read at 498570fbe592b9a8578032af9bc1e51931c75072. The three full R1 cards previously read at da14fb018dd2f2eeebcf5586893dc8e08d9f1ec9 remain the method basis: geometry-context, realtime-world, procedural-geometry under docs/mother_coordination/learning-r1-20260905/skills/. Their principles are adopted narrowly, not treated as complete software mastery.

## Source-derived methods

Blender geometry-context card: record evaluation time, local/world space, attribute domain and instance sharing. Implementation here uses bind-local normalized positions for surface variation, and source-geometry instances for exposure samples. Mesh buffers and UV stay unchanged. The coordinate scale is dimensionless per part, not calibrated micrometres. Rotating or translating the aircraft must not slide its material pattern. No Blender application or export round-trip has been run.

UE realtime-world card and Niagara official overview: separate creation, state updates and rendering; visual outputs do not prove physical correctness. The added visual roll is computed from absolute mission age. Impact framing follows the existing impact event and respects manual camera selection. Reset and seek must reproduce state. Flight trajectories, impact physics and original mechanical tracks are not changed. No UE or Niagara runtime is embedded.

Houdini procedural-geometry card: preserve stable object identity, explicit dependencies and independent material/structure state. Source node IDs are used only with the locked payload; a different model must not reuse them without revalidation. The build allowlist rejects unknown files, missing imports and sibling-runtime dependencies. Historical snapshots never supply an automatic fallback.

## Independently checked official references this round

https://threejs.org/docs/pages/Material.html : onBeforeCompile/customProgramCacheKey, transparency and instancing-compatible material handling. Full relevant API sections read. The existing pinned WebGL renderer is retained; no claim of a WebGPU migration.

https://www.pbr-book.org/4ed/Reflection_Models/Roughness_Using_Microfacet_Theory : microfacet roughness changes the angular distribution of reflection. Relevant source section read. This supports varying roughness instead of modelling microscopic geometry, but supplies no B24 weathering parameters.

https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-for-unreal-engine : spawn, update, events and render stages read. This supports the state/presentation separation above; it does not supply the exact code or calibrate the effect.

Blender Texture Coordinate official page was attempted at https://docs.blender.org/manual/en/latest/render/shader_nodes/input/texture_coordinate.html and returned 402. No full-body reading claim is made. The successfully read coordinator card remains the Blender method source.

## Own implementation choices and limitations

runtime/production-effects.js is our bounded Three.js implementation, not copied software functionality. The artistic parameters are local choices: tire dust blend, weak metal colour/roughness variation, six source-blade shutter samples at a nominal 1/48-second exposure, and 0.8 rad/s visual roll. They are not asserted as B24 historical or measured physical values.

Surface selection follows the existing skinMaterials classification, excludes fabric/control surfaces, and keeps the frozen tire IDs separate. Originals are retained for A/B. No fake rivet grid, panel geometry or new UV layout is added. Glass, internal mechanics and original source materials are preserved.

Blade exposure uses the four original spindle axes and source blade geometry; it does not alternate directions by array order. Reset, pause and reverse seeking must keep state deterministic. The sampler has a fixed cost; unsupported source mappings must be reported, not guessed.

One switch compares old and new appearance at identical camera and task time. The actual baseline remains separately recoverable at the accepted V017 page. Candidate browser success does not approve its appearance.

## Tests and unresolved items

Ten state-logic tests ran locally and passed. They exercise bounds, reset, signed rotation, camera protection, material classification and invalid values. They do not prove shader compilation or aircraft appearance. The workflow reruns delivered source, verifies raw payload SHA-256, tests desktop 1440x900 and mobile 390x844, exercises all 18 task phases through explicit seeks, checks roll stability, four source rotor channels, A/B, manual camera, original graph and geometry preservation, reset, runtime errors and overflow. This does not claim an uninterrupted real-time 330-second loop test. Read the actual reports; unrun or failing stages are not passed.

Nose-wheel pose, source stock/empty-bay binding, and historically supported panel/UV corrections remain unresolved. No historical source was acquired to support guessing those changes. Weather, clouds and fog are deliberately deferred. Existing mission explosion smoke is a local event effect, not a weather or fog integration.

## Cleanup and recovery

The active branch is rebuilt from a positive file allowlist. Old task files, unrelated entrypoints, outdated workflows and unused directories are removed from this branch. The complete prior source remains at accepted/b24-v017-20260905 and ceed8183dc5fb8399349e73ebeef5b997d7d7389. Other branches and other Mother projects are not deleted. Recovery requires an explicit decision.
