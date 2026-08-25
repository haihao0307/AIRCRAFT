# Aircraft production architecture

## Four independent production lines

### Model library

The model library owns source-model identity, provenance, licensing status, structural inventory, and immutable hashes. A source model is stored once and referenced by `modelId`.

### Flight runtime

The flight line owns takeoff, landing, propeller channels, landing gear, smoke, combat effects, cameras, and browser runtime. Approved runtimes are checksum-locked and cannot be edited during livery work.

### Livery production

The livery line owns historical identity, evidence, side-specific artwork, paint-surface classification, UV preparation, PBR maps, weathering, and visual review. Each historical aircraft receives an isolated package below its airframe family.

### Integration review

The integration line combines one approved model, one approved runtime, and one approved livery. It validates model identity, animation channels, moving parts, flight behavior, rendering, and browser performance before release.

## Dependency direction

```text
model lock + runtime lock + livery approval -> integration package -> release
```

Model and runtime work never depend on a specific livery. A livery depends on exactly one model lock. Integration depends on all three approved inputs.

## Branch rules

- `model/<airframe>-<task>` for source-model intake or repair.
- `runtime/<airframe>-<version>` for flight-runtime work.
- `livery/<airframe>-<aircraft>-<version>` for a single historical livery.
- `integration/<airframe>-<aircraft>-<version>` for final assembly.

Every line uses its own draft pull request. `main` receives only completed gates.
