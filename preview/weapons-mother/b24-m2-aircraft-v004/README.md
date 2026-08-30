# B-24 Weapons Mother AN/M2 V007

V007 keeps the exact source mesh/UV workflow and locks each B-24 waist gun to its authored node axis, replaces the visible routing ribbons with a compact linked live-round feed, and bounds rigid-body simulation cost.

- `GUN_EXACT_SOURCE_MIRROR` is copied from the aircraft AN/M2 donor without vertex edits.
- Port and starboard waist mounts preserve their own locked B-24 reference nodes and original world transforms; the source muzzle axes are `-Y` and `+Y` respectively.
- The high-detail AN/M2 maps its declared +X bore and +Z up axes directly to the exact local axis basis of B-24 nodes 802 and 821 (`determinant +1`); asymmetric grips can no longer tilt the calibration.
- The 12.7x99 mm case and projectile preserve the donor UVs and use one millimeter-to-meter conversion.
- Nodes 799 and 818 remain traceable but are hidden at runtime. Each waist gun now receives a compact source-derived assembly containing complete live rounds, extracted disintegrating-link geometry and the source ammunition box, connected directly to the receiver.
- Cases and disintegrating links persist visually but become static after 2–4 debounced impacts (or normal solver sleep), preventing endless rigid-body updates.
- The source B-24 triangular braces 811 and 824 measure about 0.952 m in their locked world bounds and are not shortened without position-specific manual evidence.
- Barrel/extension short recoil, bolt travel, driving-spring compression, cocking-handle movement, and trigger motion follow the documented AN/M2 cycle. The removable internal layer remains a reference visualization, not newly approved hidden geometry.
- The muzzle effect uses layered procedural flame, thin sparks, a turbulent white-smoke plume, and a short-lived light; there are no embedded image files.
- The seated A-13 installation is represented as a manual-dimensioned evidence envelope, because no separable full A-13 source mesh is available.
- The procedural-field package drives deterministic color and roughness only. It never modifies source geometry.

Delivery is online-first. The hosted Site contains only the application and loads a 3.41 MB losslessly compressed source stream from the AIRCRAFT GitHub branch; the 7.73 MB working GLB remains in the source-data directory and is not copied into the hosted page. Local QA therefore runs through HTTP rather than `file://`. The production entry is `https://weapons-mother-b24.sunhaihao.chatgpt.site/twin-m2.html`.
