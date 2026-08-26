# Aircraft pipeline skillpacks

This directory stores reusable production specifications for historically researched aircraft liveries, source-traceable engineering research and the data-native aircraft master.

## Repository-level authority

The source lock in `../SOURCE_LOCK.md`, repository guidance in `../../AGENTS.md`, and UV policy in `../UV_LIVERY_POLICY.md` remain authoritative. The locked GLB is an immutable reference sample. Native systems may replace its functions only after full extraction, manual semantic mapping and parity review.

## Registered skillpacks

See [`SKILL_INDEX.md`](./SKILL_INDEX.md).

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
- [First vertical-tail surface module template](../../data/b24-native/surface-modules/empennage/vertical-tail-module.template.json)

Status: the structural full-mirror extractor has passed a local run against the locked GLB. It covered 1,784 nodes, 348 meshes, 6,702 accessors and 2,518 animation channels with zero automatic semantic approvals. Remote Actions evidence and exact-replay browser parity remain pending. Rough primitive prototypes are retired.

## B-24 engineering drawings and source knowledge base

- [Engineering drawings and CAD overview](./B24_ENGINEERING_DRAWINGS_AND_CAD_OVERVIEW.md)
- [CAD reconstruction specification](./B24_CAD_RECONSTRUCTION_SPEC.md)
- [External engineering source inventory](./references/b24-engineering/README.md)
- [Structured source register](../../data/b24-engineering/source-register.json)
- [Document taxonomy](../../data/b24-engineering/document-taxonomy.json)
- [Variant baseline](../../data/b24-engineering/variant-baseline.json)
- [Reconstruction tool register](../../data/b24-engineering/reconstruction-tools.json)
- [Whole-aircraft assembly master](../../data/b24-engineering/assembly-master.json)
- [Vertical-tail pilot manifest](../../data/b24-engineering/components/vertical-tail.json)

Status: source registry v1 and reconstruction rules are prepared. Public-file intake, title-block extraction and drawing calibration continue as supporting evidence for native replacement geometry.

## B-24J-25-CO “80 DAYS” review entry

- [Historical livery overview](./B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md)
- [Texture specification](./B24_80_DAYS_TEXTURE_SPEC.md)
- [UV audit checklist](./B24_80_DAYS_UV_AUDIT_CHECKLIST.md)
- [Prompt skillpack](./B24_80_DAYS_PROMPT_SKILLPACK.md)
- [Acceptance checklist](./B24_80_DAYS_ACCEPTANCE_CHECKLIST.md)
- [External reference inventory](./references/b24-80-days/README.md)
- [Side-specific marking evidence diagram](./diagrams/B24_80_DAYS_MARKING_EVIDENCE.svg)
- [PBR and UV pipeline diagram](./diagrams/B24_80_DAYS_PBR_UV_PIPELINE.svg)

Status: historical research and production specification are ready. Final livery production will target stable native surface slots after geometry and SurfaceModule approval.
