# Weapons Mother B-24 aircraft M2 twin V003

Open `index.html` directly in a web browser. The page is a single-file interactive review artifact; it loads Three.js from jsDelivr and does not embed any third-party reference GLB.

V003 replaces the V002 M2HB-like runtime donor with a repository-owned semantic reconstruction of the 57-inch-class aircraft M2 envelope. The reconstruction combines manual-controlled behavior with separately audited visual references:

- aircraft silhouette and construction landmarks from the AN/M2 reference;
- bolt, spring and charging-handle articulation concepts from the mechanical M2 reference;
- a newly authored .50-caliber cartridge hierarchy with case, primer, projectile and disintegrating link;
- brass and copper PBR response informed by the supplied material-only references;
- independent recoil, bolt travel, belt indexing, persistent cases and links, tracer cadence, layered fire/smoke and service separation.

The displayed light yoke remains an aircraft-interface study. It is deliberately not labeled as a B-24-approved mount because the exact gun position, B-24J-CO block/serial and turret model are unresolved. Once those are supplied, the yoke, feed direction and case/link ejection paths must be replaced from the applicable manual.

Files:

- `index.html` — directly openable interactive review page.
- `asset-contract.json` — shot, semantic, device and runtime budgets.
- `evidence.json` — source roles, hashes, provenance decisions and unresolved gates.
- `qa-report.json` — browser views, interaction checks and measured runtime sample.

Measured browser sample: 38 persistent cases plus 38 persistent disintegrating links, about 353k rendered triangles, 166 draw calls and 60 FPS. Debris geometry intentionally grows as the user continues firing; use **清理试验区** when a clean performance comparison is needed.

No Image2ThreeJS or other image-led geometry generator is used.
