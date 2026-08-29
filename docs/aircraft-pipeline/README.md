# Aircraft pipeline skillpacks

This directory stores reusable production specifications for historically researched aircraft liveries, source-traceable engineering research and the repository-owned data-native aircraft framework.

## Repository-level authority

The source lock in `../SOURCE_LOCK.md`, repository guidance in `../../AGENTS.md`, and UV policy in `../UV_LIVERY_POLICY.md` remain authoritative. The locked GLB is an immutable reference sample. Original drawings and official manuals carry higher engineering authority. Native systems replace reference functions only after extraction, manual semantic mapping and parity review.

## Registered skillpacks

See [`SKILL_INDEX.md`](./SKILL_INDEX.md).

## Aircraft Native Forge

- [Aircraft Native Forge architecture](./AIRCRAFT_NATIVE_FORGE_ARCHITECTURE.md)
- [External method study: Image2ThreeJS](./EXTERNAL_METHOD_STUDY_IMG2THREEJS.md)
- [Forge policy](../../data/aircraft-native/forge-policy.json)
- [Reusable system library](../../data/aircraft-native/reusable-system-library.json)
- [Component production schema](../../data/aircraft-native/schemas/component-production-contract.schema.json)

Status: the self-owned framework is active at foundation stage. Image2ThreeJS active integration is disabled. Public methods have been distilled into repository-owned contracts. No external reconstruction tool has structure, generation, runtime or approval authority.

## B-24 data-native aircraft master

- [Data-native master architecture](./B24_DATA_NATIVE_MASTER.md)
- [Modular assembly architecture](./B24_MODULAR_ASSEMBLY_ARCHITECTURE.md)
- [Strict reference full mirror](./B24_REFERENCE_FULL_MIRROR.md)
- [Pluggable surface and UV modules](./B24_SURFACE_MODULE_SYSTEM.md)
- [Aircraft master contract](../../data/b24-native/aircraft-master.json)
- [Assembly graph](../../data/b24-native/assembly-graph.json)
- [Behavior graph](../../data/b24-native/behavior-graph.json)
- [Surface graph](../../data/b24-native/surface-graph.json)
- [Evidence graph](../../data/b24-native/evidence-graph.json)
- [Authoritative GLB reference adapter](../../data/b24-native/reference-adapters/authoritative-glb.json)
- [Reference mirror contract](../../data/b24-native/reference-mirror-contract.json)
- [Vertical-tail production contract](../../data/b24-native/components/empennage/vertical-tail-production.json)
- [First vertical-tail surface module template](../../data/b24-native/surface-modules/empennage/vertical-tail-module.template.json)

Status: the exact online reference viewer verifies and renders the locked 23,085,972-byte GLB, 1,784 nodes, 348 meshes and 2,518 animation channels. The structural full mirror contains zero automatic semantic approvals. The first native component is the twin vertical stabilizer and rudder assembly. Source, geometry, assembly, behavior, surface and parity approvals remain closed.

## B-24 engineering drawings and source knowledge base

- [Engineering drawings and CAD overview](./B24_ENGINEERING_DRAWINGS_AND_CAD_OVERVIEW.md)
- [CAD reconstruction specification](./B24_CAD_RECONSTRUCTION_SPEC.md)
- [Vertical-tail priority source intake](./B24_VERTICAL_TAIL_SOURCE_INTAKE.md)
- [External engineering source inventory](./references/b24-engineering/README.md)
- [Structured source register](../../data/b24-engineering/source-register.json)
- [Document taxonomy](../../data/b24-engineering/document-taxonomy.json)
- [Variant baseline](../../data/b24-engineering/variant-baseline.json)
- [External method and tool register](../../data/b24-engineering/reconstruction-tools.json)
- [Vertical-tail source intake configuration](../../data/b24-engineering/source-intake/vertical-tail-priority-sources.json)
- [Whole-aircraft assembly master](../../data/b24-engineering/assembly-master.json)
- [Vertical-tail pilot manifest](../../data/b24-engineering/components/vertical-tail.json)

Status: source registry v1 and reconstruction rules are prepared. A repeatable Actions intake downloads the first General Arrangement and three-view PDFs, verifies their bytes and SHA256, extracts PDF metadata and text, renders every page, and keeps the binaries artifact-only until rights, title block, applicability and calibration review are complete. CAD remains an optional verification layer.

## B-24J-25-CO “80 DAYS” review entry

- [Historical livery overview](./B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md)
- [Texture specification](./B24_80_DAYS_TEXTURE_SPEC.md)
- [UV audit checklist](./B24_80_DAYS_UV_AUDIT_CHECKLIST.md)
- [Prompt skillpack](./B24_80_DAYS_PROMPT_SKILLPACK.md)
- [Acceptance checklist](./B24_80_DAYS_ACCEPTANCE_CHECKLIST.md)
- [External reference inventory](./references/b24-80-days/README.md)
- [Side-specific marking evidence diagram](./diagrams/B24_80_DAYS_MARKING_EVIDENCE.svg)
- [PBR and UV pipeline diagram](./diagrams/B24_80_DAYS_PBR_UV_PIPELINE.svg)

Status: historical research and production specification are ready. Final livery production will target stable native surface slots after geometry and SurfaceProgram approval.
