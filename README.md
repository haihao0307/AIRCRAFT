# AIRCRAFT Production Line

Clean production repository for authoritative aircraft models, stable flight runtimes, independent historical liveries, and final browser integration.

## Production structure

- `registry/models/` stores immutable model identity locks and provenance.
- `runtime/` stores approved flight-runtime locks and materialized runtime packages.
- `liveries/` stores one isolated production package per aircraft livery.
- `apps/production-line/` contains the visual production dashboard.
- `data/` contains the dashboard registries.
- `scripts/` validates contracts, materializes locked assets, and builds the static site.

## Current baseline

The authoritative B-24 model is locked by exact byte count and SHA-256. The B-24 v0.9.6 Gold standalone runtime, distribution package, component files, and behavior contract are independently checksum-locked. Their source bytes remain outside ordinary Git history until an exact local file passes the materialization gate.

The livery registry is intentionally empty. Every future historical aircraft receives an isolated livery branch and package below its airframe family.

## Commands

```bash
npm test
npm run build
npm run materialize:model -- /absolute/path/to/b-24_liberator.glb
npm run materialize:runtime -- /absolute/path/to/B24_v0.9.6_Gold.html
npm run clean
```

Materialized model and runtime files are generated, checksum-verified inputs. They are ignored by ordinary Git tracking and included in `dist/` only when present and exact.

`main` accepts reviewed production baselines. Model, runtime, livery, and integration work use separate branches and Draft pull requests until their own gates are complete.
