# B-24 Weapons Mother AN/M2 V005

V005 keeps the exact source mesh/UV workflow and corrects the B-24 waist-gun installation, ammunition direction, firing cycle, and online delivery.

- `GUN_EXACT_SOURCE_MIRROR` is copied from the aircraft AN/M2 donor without vertex edits.
- Port and starboard waist mounts preserve their own locked B-24 reference nodes and original world transforms; the source muzzle axes are `-Y` and `+Y` respectively.
- The high-detail AN/M2 uses a right-handed rigid/uniform alignment matrix (`determinant +1`) for each side, avoiding reflected sights and reversed projectiles.
- The 12.7x99 mm case and projectile preserve the donor UVs and use one millimeter-to-meter conversion.
- Each exact B-24 feed guide contains complete source-derived live rounds; the ammunition review stage includes a 12-round inspection rack.
- Cases and disintegrating links are persistent, gravity-driven debris with bounce, shallow pile collision, and no timed disappearance.
- Barrel/extension short recoil, bolt travel, driving-spring compression, cocking-handle movement, and trigger motion follow the documented AN/M2 cycle. The removable internal layer remains a reference visualization, not newly approved hidden geometry.
- The muzzle effect uses layered procedural flame, thin sparks, a turbulent white-smoke plume, and a short-lived light; there are no embedded image files.
- The seated A-13 installation is represented as a manual-dimensioned evidence envelope, because no separable full A-13 source mesh is available.
- The procedural-field package drives deterministic color and roughness only. It never modifies source geometry.

Delivery is online-first. `index.html` loads the separately cached `distilled-reference.glb`; local QA therefore runs through an HTTP server rather than `file://`. The production entry is `https://weapons-mother-b24.sunhaihao.chatgpt.site/twin-m2.html`.
