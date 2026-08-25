# AIRCRAFT · UBANGI BAG III and B-24 turret production line

This repository is the ChatGPT upstream and Codex downstream workspace for the Haihao Aircraft Production Line.

## Current online result

[B-24 ventral ball-turret separation and motion prototype v0.9.7](https://raw.githack.com/haihao0307/AIRCRAFT/a7f77a8d6ca3aab7ad831b327fa9a53f2ee076d4/turret-motion-v1.html)

The standalone webpage runs with a procedural B-24 and independent turret immediately, so the complete interaction path can be reviewed before permanent topology extraction. It also accepts the locked GLB or the old embedded-HTML build.

Implemented prototype operations:

- component selection and hypothesis classification
- independent ball shell and twin-gun preview hierarchy
- exploded inspection view
- turret yaw and synchronized gun elevation
- scan mode and virtual-target tracking
- firing, muzzle-flash, tracer and recoil preview
- temporary whole-turret detachment and reattachment
- complete source-state restoration
- component-map import and export

The separation remains explicitly marked `hypothesis-motion-v1` until the exact source model topology audit is complete.

## Historical livery line

The first historical test aircraft is B-24J-45-CO serial `42-73436`, **UBANGI BAG III**, 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force.

The visible V1 livery board is a replaceable pipeline test. It does not claim final historical accuracy. The corrected V2 board will replace imagery and final PBR maps through the same livery contract.

The source model gate accepts only `b-24_liberator.glb`, exactly `23,085,972` bytes with SHA-256 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`.

## Independent historical livery production line

The repository now defines a second, model-agnostic straight production line for aircraft identity, unit hierarchy, crews, people, events, historical evidence, side-specific artwork, mission states, PBR textures, masks and portable livery packages.

The livery line does not store aircraft binaries, render hierarchy names, geometry, animation, target material slots or target texture coordinates. The aircraft consumer owns an external binding adapter and applies the approved package without modifying its historical record.

Review entry: `livery-production-line.html`

Core files:

- `TASK_009_MODEL_AGNOSTIC_HISTORICAL_LIVERY_LINE.md`
- `docs/livery-line/README.md`
- `data/livery-line/catalog.json`
- `data/livery-line/package-template.json`
- `schemas/historical-livery-record.schema.json`

```bash
npm test
npm run build
npm run validate:livery-line
```
