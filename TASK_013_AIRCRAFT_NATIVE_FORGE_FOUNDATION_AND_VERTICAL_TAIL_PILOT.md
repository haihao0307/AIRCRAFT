# TASK 013: Aircraft Native Forge foundation and B24 vertical-tail pilot

## Purpose

Create the first self-owned aircraft production framework for the AIRCRAFT repository. The long-term asset is structured aircraft knowledge and reproducible generation logic. B24J-CO is the first family master. B25, B17, B29 and later fighters must reuse the same contracts wherever the aircraft systems are equivalent.

## Direction lock

1. `Aircraft Native Forge` is the active production framework.
2. ChatGPT owns research synthesis, engineering interpretation, component boundaries, geometry decisions, behavior design, surface design and approval.
3. Codex may implement approved contracts and tests. It may not invent geometry, hidden structure or variant applicability.
4. All active production contracts, generators, runtimes, validators and review pages are repository-owned and reproducible.
5. GLB, CAD, STEP, FBX, OBJ and raster maps are reference inputs, verification artifacts or generated outputs. They never replace the structured mother data.
6. Unclear geometry must remain `unresolved` until a drawing, manual, measured reference or approved derivation resolves it.
7. Original drawings and official manuals control engineering reconstruction. The locked GLB supplies visual proportion, node, material and motion evidence at a lower authority level.

## Foundation deliverables

### A. Aircraft Native Forge policy

Create a machine-readable policy that defines:

- authority and source precedence
- repository-owned tool authority and execution boundaries
- renderer-independent mother-data contracts
- unresolved-data behavior
- family-level reuse rules
- generated-output status
- approval gates

### B. Reusable aircraft-system library

Register reusable system contracts for:

- coordinate and datum management
- assembly and detachable interfaces
- geometry recipes
- surface and skin programs
- flight controls
- propulsion
- landing gear
- bomb bay and payload
- turrets and guns
- crew stations and detach or exit behavior
- mission flight sequences
- damage states
- evidence and QA

Each system must separate reusable logic from aircraft-specific parameters.

### C. Component production contract

Create a schema for every native component. Required sections include:

- identity and variant scope
- source plan and source locks
- reference-model mapping
- GeometryRecipe
- AssemblyGraph interfaces
- SurfaceProgram and stable `surface_id` values
- BehaviorGraph bindings
- generated review outputs
- fixed QA gates
- approval state

### D. B24 first production component

Use the twin vertical stabilizer and rudder assembly as the first complete component.

The pilot must include:

1. left and right fixed vertical stabilizers
2. left and right rudders
3. installation datums
4. rudder hinge axes and motion limits
5. left and right independent surface identities
6. adjustable skin material parameters
7. historical-marking anchors
8. reference-GLB node mapping
9. drawing-calibrated geometry
10. browser review and A/B evidence

## Vertical-tail execution order

### Stage 1: source intake

- acquire and hash the verified general-arrangement and three-view sheets
- ingest structural-repair and illustrated-parts pages relevant to the tail
- record drawing number, revision, scale, applicable variant and page region
- reject sheets with unresolved scale or variant applicability

### Stage 2: reference mapping

- isolate candidate reference-GLB subtrees manually
- record source node index, stable path, mesh, transform, bounds and animation channels
- keep all candidates `candidate-not-approved` until multi-view inspection confirms them
- preserve the exact reference viewer for comparison

### Stage 3: geometry reconstruction

- calibrate side, rear or front and top views to the aircraft datum
- derive fixed-surface and rudder outlines from approved drawings
- define section stations, thickness, leading edge, trailing edge and tip closure
- generate GeometryRecipe data from approved curves and sections
- record every derived value and its parent evidence
- leave invisible internal details unresolved until supported

### Stage 4: assembly and motion

- define the two installation interfaces to the empennage
- define independent left and right rudder hinge axes
- map reference animation evidence to semantic `flight-control.rudders`
- validate neutral pose, positive and negative travel, clearances and reset behavior

### Stage 5: skin and surfaces

- bind all eight vertical-tail surface slots
- separate substrate, primer, paint, markings, panel seams, rivets, wear and PBR response
- allow real-time base-color and material adjustment in free-design mode
- preserve evidence-locked colors and markings in historical mode
- allow seam vertex duplication while preserving geometric position

### Stage 6: fixed QA

The component cannot be approved until it passes:

- source and variant applicability
- drawing calibration
- reference mapping coverage
- fixed-camera silhouette comparison
- section and thickness checks
- left and right installation checks
- rudder hinge and travel checks
- surface-ID and handedness checks
- adjustable-material checks
- historical-lock checks
- browser console and rendering checks
- replacement isolation, proving that other aircraft systems remain unchanged

## Approval flags

```text
aircraftNativeForgePolicyApproved       false
reusableSystemLibraryApproved           false
componentProductionContractApproved     false
verticalTailSourceApproved              false
verticalTailGeometryRecipeApproved      false
verticalTailAssemblyApproved            false
verticalTailBehaviorApproved            false
verticalTailSurfaceProgramApproved      false
verticalTailReferenceParityApproved     false
verticalTailApproved                    false
```

## Stop conditions

Stop the affected stage and keep its approval false when:

- required source files are unavailable
- scale, revision or variant is unresolved
- reference nodes cannot be distinguished confidently
- a generated curve conflicts with an approved drawing
- motion axes or travel ranges lack evidence
- surface identity changes after geometry regeneration
- a historical marking lacks a traceable source
- a browser review uses a substitute model or hidden fallback

## Completion target

Task 013 completes when the self-owned framework is enforceable in CI and the vertical-tail work package is ready for drawing intake and manual reference mapping. Geometry and behavior approval remain closed until real source and browser evidence are produced.
