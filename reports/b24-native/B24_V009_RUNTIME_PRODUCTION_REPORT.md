# B24 Data Native Runtime V009 Production Report

## Scope

V009 closes the first runtime foundation blockers recorded in the 2026-08-28 handoff without changing aircraft geometry authority, historical livery approval, the locked reference asset, main, gh-pages, or the Draft state of PR #14.

The implementation is available at:

`preview/b24-data-native-v009/index.html`

## Locked reference input

- File: `b-24_liberator.glb`
- Bytes: `23,085,972`
- SHA256: `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`
- Release tag: `80-days-source-v1`
- Authority: locked external reference only

The browser reads the GLB as bytes, verifies the exact byte count and SHA256, and only then passes the buffer to `GLTFLoader.parse`. Relative repository candidates and the locked release asset are tried in order. A mismatch is fail closed.

## Implemented runtime systems

### Four-engine state machine

Each of the four engine slots owns:

- enabled state
- current visual RPM
- target visual RPM
- response rate
- spatial cluster centre
- rotation targets
- inferred local rotation axes
- static, slow and blur visual sets

The shared flight phases are `off`, `crank`, `idle`, `taxi`, `takeoff`, `cruise`, `approach`, `landing` and `shutdown`. The current values are presentation parameters. They carry no engineering authority until original engine and propeller sources are approved.

### Continuous propeller rotation

Propeller motion is independent of the static, slow and blur representation choice. Angular displacement is integrated every frame from current RPM and bounded frame delta time. Changing visual representation does not pause rotation.

Rotation-axis evidence is selected in this order:

1. Quaternion tracks from the locked reference animation.
2. The smallest local geometry extent of the discovered propeller group.
3. A deterministic local fallback axis.

The four spatial groups are discovered from named propeller objects and animation channels, then clustered across the aircraft span. A missing group remains a visible QA failure.

### Engine sound lifecycle

V009 contains a four-channel procedural Web Audio preview. It starts only after a user gesture, follows each engine's current runtime RPM, supports mute, and disposes all sources plus the audio context on full reset.

This preview establishes the functional audio lifecycle. It is not a historically approved Pratt & Whitney R-1830 recording. `historicalAudioApproved` remains false.

### Semantic material calibration

The runtime clones reference materials and preserves available texture, normal, roughness and alpha maps. Calibration is applied by semantic group:

- exterior metal
- painted surface
- mechanical hardware
- glazing
- interior
- rubber

There is no whole-scene white material replacement. Exterior metal receives a restrained neutral PBR adjustment. Mechanical hardware receives darker metal response and higher roughness. Existing material colour and maps remain evidence inputs.

### Glazing

Detected glazing is upgraded to `MeshPhysicalMaterial` with physical transmission, low roughness, zero metalness and disabled depth writing. Reference colour and texture maps are retained. The user can compare calibrated glazing with the locked reference material.

### Deterministic reset

The initial V009 state snapshots every aircraft object's:

- position
- quaternion
- scale
- visibility
- layer mask
- morph target values
- material reference

Full reset stops and disposes audio, restores the snapshot, re-establishes the default V009 surface state, returns all four engines to `off`, restores the camera and compares the restored state fingerprint with the baseline. Belly, ventral, bomb-bay, rack, door, hatch and lower-fuselage name groups participate in the transient reset test so the previously observed belly void cannot be hidden from QA.

## Browser production console

The V009 page provides:

- exact source-lock status
- nine flight-phase controls
- four independent engine switches
- procedural audio control
- semantic surface calibration control
- physical glazing control
- engine-axis diagnostic markers
- engine, propeller, FPS and phase telemetry
- five fail-closed runtime self-checks
- full deterministic reset

## Automated validation

`node scripts/validate-b24-v009-runtime.mjs`

The validator checks:

- exact GLB file, byte and SHA lock in contract and runtime
- browser-side hash verification before GLTF parsing
- four-engine contract
- delta-time propeller integration
- separation of motion and visual representation switching
- complete phase-state vocabulary
- gesture-gated audio and reset disposal
- semantic surface groups
- absence of blanket white override
- physical glazing
- texture-map preservation
- deterministic reset and belly coverage
- closed approval ledger
- frozen `80 DAYS` historical livery
- complete browser control surface
- continued exclusion of external image reconstruction systems

GitHub Actions runs the validator with `set -euo pipefail`, performs a JavaScript syntax check, uploads the validation JSON, logs, contract and browser files, and writes a job summary.

## Approval boundary

The following implementation claims are true in V009:

- locked source verification implemented
- continuous propeller runtime implemented
- four-engine phase controller implemented
- procedural engine audio implemented
- semantic material calibration implemented
- glazing calibration implemented
- deterministic reset implemented
- static validation implemented

The following approvals remain false:

- runtime code reviewed
- browser QA approved
- visual quality approved
- historical audio approved
- engineering RPM approved
- surface system approved
- reference model cross-check approved
- aircraft data master approved

The `80 DAYS` historical livery remains frozen. No geometry recipe, surface authority, reference cross-check or whole-aircraft approval is promoted by this report.

## Required visual evidence before approval

The next browser run must preserve the exact head commit and record at least:

1. cold-load source-lock result
2. left-front parked view
3. right-front parked view
4. left-side taxi phase
5. right-side takeoff phase
6. front view showing four moving propellers
7. close view of mechanical hardware
8. cockpit glazing close view
9. belly and bomb-bay area before reset
10. belly and bomb-bay area after reset
11. audio start, mute and reset lifecycle log
12. browser console with zero uncaught errors

A static CI pass is evidence for implementation integrity only. Visual approval requires the browser evidence above and human review.
