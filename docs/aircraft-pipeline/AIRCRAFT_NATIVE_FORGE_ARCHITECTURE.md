# Aircraft Native Forge architecture

## 1. System objective

`Aircraft Native Forge` is the repository-owned framework for constructing, operating, inspecting and inheriting aircraft from structured data. Its first complete family master is `B24J_CO_DATA_NATIVE_MASTER`.

The durable asset is the combination of aircraft identity, sources, assembly, geometry, surfaces, behavior and approval records. Browser geometry, CAD solids, GLB files and raster maps are reproducible representations of that asset.

## 2. Authority model

ChatGPT controls:

1. source selection and evidence grading
2. aircraft-family and variant applicability
3. component boundaries and stable identifiers
4. geometry interpretation and derivation
5. installation interfaces and motion axes
6. surface partitioning and material behavior
7. system behavior and flight-sequence logic
8. conflict resolution and approval

Codex implements approved contracts, generators, tests and review pages. It must preserve uncertainty and stop when an input required by the contract is missing.

Image-led reconstruction systems are external method studies. They remain disabled unless the user explicitly names a tool and authorizes a narrowly scoped experiment. Their output has no automatic path into the aircraft master.

## 3. Eight production layers

### 3.1 Evidence Intake

This layer stores:

- original drawings and manuals
- title blocks, revisions and applicability notes
- historical photographs
- locked reference models
- measurements and calibration transforms
- file hashes and acquisition records
- confidence, derivation and approval state

Source precedence is:

1. approved original manufacturer drawing or official technical order
2. approved parts catalog, repair manual or service data
3. verified measured surviving-aircraft data
4. locked reference-model measurements and animation evidence
5. historical photographic inference
6. generated hypothesis

A lower level cannot silently overwrite an approved higher level.

### 3.2 AircraftDNA

AircraftDNA identifies the family, variant, factory, block, serial instance, coordinate system, units, major layout and configuration options.

It also defines inheritance. A B24J-CO instance can inherit the family master and override block-specific equipment, historical markings, mission state and permitted configuration differences.

### 3.3 AssemblyGraph

AssemblyGraph defines the whole aircraft as detachable and replaceable systems.

Each component records:

- `component_id`
- parent and children
- local frame and aircraft transform
- installation datums
- attachment type and fastener group
- detachable and replaceable state
- removal dependencies
- moving pivots and travel envelopes
- mass-property fields
- sockets for crew, payload and equipment
- source and approval state

Visual node separation in a reference model is only evidence. A production component requires the complete assembly contract above.

### 3.4 GeometryRecipe

GeometryRecipe stores reproducible shape logic:

- aircraft stations and datums
- section profiles
- planform and side outlines
- loft and sweep rules
- thickness, twist, dihedral and incidence
- openings and cutouts
- control-surface boundaries
- panel boundaries and repeated features
- interface continuity
- tolerances for review

All important geometry decisions must live in data. Free-form runtime code may test an idea, then the accepted parameters and rules must return to GeometryRecipe.

### 3.5 SurfaceProgram

SurfaceProgram controls the aircraft skin without binding the master to one UV atlas or texture set.

Each stable surface can contain independent layers:

1. substrate and sheet material
2. primer and corrosion protection
3. base paint or natural-metal finish
4. local color variation
5. national, unit and serial markings
6. nose art and mission markings
7. panel seams and access panels
8. rivets and fasteners
9. oil, exhaust, dirt and operational wear
10. roughness, metalness, normal and height response

Free-design mode allows live adjustment of base color and material response. Historical mode locks approved colors, side-specific markings and time-specific mission state.

### 3.6 BehaviorGraph

BehaviorGraph stores semantic controls and mechanism state:

- propulsion and propeller rotation
- flight-control surfaces
- landing gear and door sequence
- bomb-bay doors and payload release
- turret azimuth and gun elevation
- crew attachment, station change and exit
- engine and system startup
- mission and flight sequences
- damage and failure modes

Reference animation tracks provide timing, axis and sequence evidence. Public runtime controls use semantic system names and remain independent from source-model node names.

### 3.7 Runtime Compiler

The compiler reads the approved data and produces a chosen representation:

```text
AircraftDNA
+ AssemblyGraph
+ GeometryRecipe
+ SurfaceProgram
+ BehaviorGraph
+ aircraft instance
= runtime aircraft
```

A runtime build may contain Three.js `BufferGeometry`, WebGPU materials, generated UV attributes, collision geometry, LODs, temporary texture maps and animation state. Every build product retains the parent master version and can be regenerated.

### 3.8 QA and Approval

Approval is layered. A visually attractive result cannot bypass source, structure or behavior checks.

Required evidence includes:

- source and file-lock checks
- variant applicability
- fixed-camera and fixed-time comparison
- dimensions and section checks
- component attachment and clearance
- motion-axis and sequence checks
- surface identity and handedness
- color and material response
- historical evidence
- browser console and rendering evidence
- isolation tests proving that one replacement does not change unrelated systems

## 4. External-method distillation policy

Useful ideas may be studied from public tools, papers and production systems. Their value is converted into repository-owned principles and contracts.

Retained principles include:

- staged production with explicit gates
- component-first decomposition
- deterministic checks before visual review
- browser-based multi-view review
- recorded uncertainty
- bounded correction loops
- resumable state with evidence

The AIRCRAFT repository does not import the external tool as a runtime, generator or authority. New code uses repository-owned names, schemas, validators and acceptance tests.

## 5. B24 first-component strategy

The complete B24 reference remains visible while native systems replace it one component at a time.

The twin vertical-tail assembly is the first proof component because it exercises:

- paired left and right parts
- fixed and movable aerodynamic surfaces
- installation interfaces
- hinge axes and control behavior
- eight independent surface slots
- adjustable skin parameters
- historical marking anchors
- fixed-camera comparison

The approved native component replaces only its mapped reference subtrees. All other reference systems remain unchanged until their own production contracts pass.

## 6. Family reuse

The framework separates reusable mechanisms from aircraft-specific data.

Reusable across B24, B25, B17, B29 and later fighters:

- units, datums and coordinate contracts
- component and interface grammar
- loft, section and planform recipes
- surface-layer and historical-instance grammar
- flight-control state machines
- propulsion, landing-gear, payload, turret and crew interfaces
- mission flight-sequence grammar
- evidence and QA contracts

Aircraft-specific inputs include:

- stations, sections and dimensions
- installation locations
- engine count and type
- gear geometry and sequence
- weapon and crew configuration
- control-surface ranges
- historical markings
- variant and block applicability

This separation allows a new aircraft to reuse the production system while preserving its own engineering evidence and geometry.

## 7. Current status

```text
aircraftNativeForgePolicyApproved       false
reusableSystemLibraryApproved           false
componentProductionContractApproved     false
B24 reference mirror available          true
B24 native whole-aircraft approved       false
first component                          twin vertical tail and rudders
Image2ThreeJS active integration         disabled
```
