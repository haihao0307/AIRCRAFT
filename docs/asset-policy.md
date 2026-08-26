# Asset policy

## Authoritative model

The source model is stored once and identified by exact bytes and SHA-256. Every runtime and livery references its `modelId`. A derived GLB receives a new ID, a parent-model reference, a transformation record, and independent regression evidence.

## Gold runtime

The approved flight runtime is installed only from a complete local byte stream that matches its standalone SHA-256. Its distribution archive, component files, behavior contract, and source-model identity are locked separately.

## Materialization

Model and runtime source bytes are generated working assets. The materialization commands verify all required bytes before writing to their public target paths. Materialized binaries and large standalone runtime files remain outside ordinary Git tracking.

## Livery assets

Each livery owns its evidence manifest, side-specific artwork, UV work, PBR maps, and QA. A livery package cannot duplicate the source model or alter the Gold runtime.

## Generated outputs

`dist/`, browser screenshots, QA videos, temporary bakes, and rejected experiments are build outputs. They remain outside `main` and may be published as workflow artifacts when review requires them.
