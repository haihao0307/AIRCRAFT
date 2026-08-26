# Aircraft pipeline skillpacks

This directory stores reusable production specifications for historically researched aircraft liveries and source-traceable engineering research. Each skillpack separates historical evidence, geometry authority, UV policy, PBR map responsibilities, prompt templates and acceptance gates.

## Repository-level authority

The global source lock in `../SOURCE_LOCK.md`, repository guidance in `../../AGENTS.md`, and UV policy in `../UV_LIVERY_POLICY.md` remain authoritative. A livery or engineering skillpack cannot replace the source GLB, alter its hierarchy, or silently include excluded mechanical and transparent parts.

## Registered skillpacks

See [`SKILL_INDEX.md`](./SKILL_INDEX.md).

## B-24 data-native aircraft master

- [Data-native master architecture](./B24_DATA_NATIVE_MASTER.md)
- [Modular assembly architecture](./B24_MODULAR_ASSEMBLY_ARCHITECTURE.md)
- [Pluggable surface and UV modules](./B24_SURFACE_MODULE_SYSTEM.md)
- [Aircraft master contract](../../data/b24-native/aircraft-master.json)
- [Assembly graph](../../data/b24-native/assembly-graph.json)
- [Behavior graph](../../data/b24-native/behavior-graph.json)
- [Surface graph](../../data/b24-native/surface-graph.json)
- [Evidence graph](../../data/b24-native/evidence-graph.json)
- [Authoritative GLB reference adapter](../../data/b24-native/reference-adapters/authoritative-glb.json)
- [First vertical-tail surface module template](../../data/b24-native/surface-modules/empennage/vertical-tail-module.template.json)

Status: the first native foundation contains 31 assembly nodes, 13 semantic behavior controllers and 62 pluggable surface slots. The authoritative GLB is an external reference adapter. The aircraft master and surface system remain unapproved pending component reconstruction and browser QA.

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

Status: source registry v1 and reconstruction rules are prepared. Public-file intake, title-block extraction and drawing calibration continue as supporting evidence for the data-native master.

## B-24J-25-CO “80 DAYS” review entry

- [Historical livery overview](./B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md)
- [Texture specification](./B24_80_DAYS_TEXTURE_SPEC.md)
- [UV audit checklist](./B24_80_DAYS_UV_AUDIT_CHECKLIST.md)
- [Prompt skillpack](./B24_80_DAYS_PROMPT_SKILLPACK.md)
- [Acceptance checklist](./B24_80_DAYS_ACCEPTANCE_CHECKLIST.md)
- [External reference inventory](./references/b24-80-days/README.md)
- [Side-specific marking evidence diagram](./diagrams/B24_80_DAYS_MARKING_EVIDENCE.svg)
- [PBR and UV pipeline diagram](./diagrams/B24_80_DAYS_PBR_UV_PIPELINE.svg)

Status: research and production specification ready. Final livery production will target stable native surface slots after geometry and surface-module approval.
