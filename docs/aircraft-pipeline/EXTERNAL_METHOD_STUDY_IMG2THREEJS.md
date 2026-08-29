# External method study: Image2ThreeJS

## Status

```text
classification       external-method-study
active integration   disabled
default execution    disabled
runtime dependency   none
structural authority none
approval authority   none
```

The reviewed public source is the Image2ThreeJS repository at commit `441af85a96523569511154b6321859b79f3592f5`, reviewed on 2026-08-27. This record preserves provenance for the method study. The AIRCRAFT repository does not import, invoke or depend on that project.

## Knowledge retained

The following general production ideas are useful and have been translated into repository-owned contracts:

1. staged production with an explicit ordered state
2. component decomposition before geometry generation
3. deterministic geometry checks before browser review
4. fixed review gates for every production stage
5. browser turntable and multi-view inspection
6. explicit low-confidence or unresolved states
7. bounded correction loops
8. evidence-backed resumability
9. stable sockets, pivots and runtime component identities
10. separation of visual review from automatic approval

## Knowledge adapted for aircraft

The aircraft pipeline replaces generic object assumptions with domain-specific contracts:

- manufacturer datums and aircraft stations
- original drawing number, revision and applicability
- aerodynamic sections and planforms
- installation and detachable interfaces
- flight-control axes and travel limits
- landing-gear and door sequences
- engine, payload, turret and crew systems
- stable semantic skin surfaces
- historical side-specific markings
- mission-state and damage-state inheritance
- fixed-camera and fixed-time reference parity

## Roles excluded from the active pipeline

The external project has no authority to:

- analyze the whole aircraft
- choose aircraft component boundaries
- infer hidden engineering structure
- assign dimensions or tolerances
- select variant applicability
- generate production geometry
- generate approved surface mapping
- define mechanism behavior
- approve visual parity
- approve historical accuracy
- run as a repository dependency

## Activation rule

A future experiment may use the external tool only when the user explicitly names it and defines a narrow task. That experiment must be isolated from the aircraft master, retain `external-experiment` status and pass all normal source, geometry, behavior, surface and browser gates before any result can be reconsidered.

## Independent implementation rule

All active production code uses repository-owned names, schemas and validators. Public ideas may inform architecture. Copied code is not part of the current plan. Any future copied source would require a separate license and attribution review before entering the repository.
