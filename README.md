# AIRCRAFT · 80 DAYS R12 retained workbench

The user requested on 2026-11-08 that only the last aircraft version be retained in the current working tree. This branch retains the existing R12 workbench, its source artwork, exact aircraft data chunks, Three.js files and all imported modules. Runtime bytes are unchanged.

- Review entry: `b24-80days-r12-review-direct.html`.
- Equivalent existing entry: `b24-80days-instance-r12.html`.
- Latest existing R12 handoff ZIP and its SHA256 file are retained under `releases/`.
- Status and calibration data: `docs/80-days-r12/`.
- R7/R8/R10/R16-named files still retained under `runtime/` are dependencies used by R12, not additional old workbench versions.

R12 was not visually accepted or production ready before cleanup, and this cleanup does not claim otherwise. Its most recent known browser QA failed. Only syntax and dependency-preservation checks were performed here.

Superseded workbench entries, unused modules, older ZIP packages and generated QA images were removed with a normal recoverable commit. No Git history, branches, tags, Release assets or deployed site was deleted. No workflow/deployment was requested. Previous versions remain recoverable from commit `0ec4d9d7c652e5b399a31b68b6de44ba24b9b274` and historical branch/commit references.

`CLEANUP_RECEIPT_2026-11-08.json` contains exact kept/deleted paths, sizes and blob hashes. Logical tree reduction does not mean GitHub history storage has been released.
