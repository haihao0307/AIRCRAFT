# Aircraft pipeline skillpacks

This directory stores reusable production specifications for historically researched aircraft liveries and source-traceable engineering research. Each skillpack separates historical evidence, geometry authority, UV policy, PBR map responsibilities, prompt templates and acceptance gates.

## Repository-level authority

The global source lock in `../SOURCE_LOCK.md`, repository guidance in `../../AGENTS.md`, and UV policy in `../UV_LIVERY_POLICY.md` remain authoritative. A livery or engineering skillpack cannot replace the source GLB, alter its hierarchy, or silently include excluded mechanical and transparent parts.

## Registered skillpacks

See [`SKILL_INDEX.md`](./SKILL_INDEX.md).

## B-24 engineering drawings and CAD knowledge base

- [Engineering drawings and CAD overview](./B24_ENGINEERING_DRAWINGS_AND_CAD_OVERVIEW.md)
- [CAD reconstruction specification](./B24_CAD_RECONSTRUCTION_SPEC.md)
- [External engineering source inventory](./references/b24-engineering/README.md)
- [Structured source register](../../data/b24-engineering/source-register.json)
- [Document taxonomy](../../data/b24-engineering/document-taxonomy.json)
- [Variant baseline](../../data/b24-engineering/variant-baseline.json)

Status: source registry v1 and reconstruction rules prepared. Public-file intake, checksums, page rendering, title-block extraction and CAD reconstruction remain pending. The engineering master is not approved.

## B-24J-25-CO “80 DAYS” review entry

- [Historical livery overview](./B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md)
- [Texture specification](./B24_80_DAYS_TEXTURE_SPEC.md)
- [UV audit checklist](./B24_80_DAYS_UV_AUDIT_CHECKLIST.md)
- [Prompt skillpack](./B24_80_DAYS_PROMPT_SKILLPACK.md)
- [Acceptance checklist](./B24_80_DAYS_ACCEPTANCE_CHECKLIST.md)
- [External reference inventory](./references/b24-80-days/README.md)
- [Side-specific marking evidence diagram](./diagrams/B24_80_DAYS_MARKING_EVIDENCE.svg)
- [PBR and UV pipeline diagram](./diagrams/B24_80_DAYS_PBR_UV_PIPELINE.svg)

Status: research and production specification ready. Final livery baking remains blocked until a single mission-state reference is selected, the authoritative source model is available to the branch, and the `LiveryUV` audit passes.
