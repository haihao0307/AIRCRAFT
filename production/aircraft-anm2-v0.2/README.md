当前候选：**W11 总装与对象关系**。入口 `releases/w11/AIRCRAFT_ANM2_OBJECT_DNA_W11.html`，说明 `validation/W11_REVIEW.md`。W10、W09 固定版本保留。

当前新增候选：**W10 表面与形态**，入口 `releases/w10/AIRCRAFT_ANM2_OBJECT_DNA_W10.html`，说明 `validation/W10_REVIEW.md`。W09 作为前版保留。

# AN/M2 Object DNA W09

Open `releases/w09/AIRCRAFT_ANM2_OBJECT_DNA_W09.html`. It is self-contained and renders the native exterior immediately. Select the verified local GLB to compare; the reference is never uploaded or bundled.

W09 is a new GEN-0002 exterior review candidate focused on the receiver, plate layers and barrel-root transition. See `validation/W09_PREFLIGHT.json` and `validation/W09_VISUAL_REVIEW.md` for the measurements and remaining differences. User acceptance, complete geometry parity and production readiness remain false. The full exterior is context, not a completed B24 installation.

Readable truth: `rules/EXTERIOR_RECIPE_R01.json`, `rules/geometry-program.js`, semantic correspondence and datum registration. No permanent generated mesh or source vertex/index/UV tables. Named coordinates are uncalibrated digital-reference proportions, not manufacturing dimensions.

Build with Python: `python workbench/w09/build.py`. Runtime has no build-time dependency on the original. QA tools additionally need Node/Playwright and Python numpy, trimesh, scipy, shapely, rtree, networkx and Pillow. Local test paths are environment-specific. Reports are reproducible measurements; they do not establish historical accuracy.

Reference: Misja van Laatum, CC BY 4.0 according to the verified GLB metadata. Third-party runtime notices are in `vendor/THIRD_PARTY_NOTICES.txt`.
