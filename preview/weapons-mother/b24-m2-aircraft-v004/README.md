# B-24 Weapons Mother AN/M2 V006

V006 keeps the exact source mesh/UV workflow and corrects the B-24 waist-gun calibration, feed-round direction, persistent rigid-body debris, and online delivery.

- `GUN_EXACT_SOURCE_MIRROR` is copied from the aircraft AN/M2 donor without vertex edits.
- Port and starboard waist mounts preserve their own locked B-24 reference nodes and original world transforms; the source muzzle axes are `-Y` and `+Y` respectively.
- The high-detail AN/M2 uses measured muzzle, rear-axis, and sight-roll landmarks for a right-handed rigid/uniform alignment matrix (`determinant +1`) on each side.
- The 12.7x99 mm case and projectile preserve the donor UVs and use one millimeter-to-meter conversion.
- Each exact B-24 feed guide contains complete source-derived live rounds; every round follows the feed-guide centerline while its projectile axis remains parallel to the measured bore axis.
- Cases and disintegrating links use Cannon rigid bodies with SI gravity, floor and inter-object collision, friction, bounce, sleep, and no timed disappearance.
- Barrel/extension short recoil, bolt travel, driving-spring compression, cocking-handle movement, and trigger motion follow the documented AN/M2 cycle. The removable internal layer remains a reference visualization, not newly approved hidden geometry.
- The muzzle effect uses layered procedural flame, thin sparks, a turbulent white-smoke plume, and a short-lived light; there are no embedded image files.
- The seated A-13 installation is represented as a manual-dimensioned evidence envelope, because no separable full A-13 source mesh is available.
- The procedural-field package drives deterministic color and roughness only. It never modifies source geometry.

Delivery is online-first. The hosted Site contains only the application and loads a 3.41 MB losslessly compressed source stream from the AIRCRAFT GitHub branch; the 7.73 MB working GLB remains in the source-data directory and is not copied into the hosted page. Local QA therefore runs through HTTP rather than `file://`. The production entry is `https://weapons-mother-b24.sunhaihao.chatgpt.site/twin-m2.html`.
