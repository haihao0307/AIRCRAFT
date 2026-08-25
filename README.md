# AIRCRAFT Production Line

Clean production repository for authoritative aircraft models, stable flight runtimes, independent historical liveries, and final browser integration.

## Production structure

- `registry/models/` stores immutable model identity locks and provenance.
- `runtime/` stores approved flight-runtime locks and materialized runtime packages.
- `liveries/` stores one isolated production package per aircraft livery.
- `apps/production-line/` is the visual production dashboard source.
- `data/` is the dashboard registry.
- `scripts/` validates contracts and builds the static site.

## Current baseline

The B-24 authoritative model is locked by byte count and SHA-256. The approved B-24 v0.9.6 flight package is located and checksum-locked. Its source files must be materialized into this repository in a later dedicated import commit without altering their bytes.

## Commands

```bash
npm test
npm run build
```

`main` should contain only reviewed production baselines. New model, runtime, livery, and integration work belongs in a dedicated branch and pull request.
