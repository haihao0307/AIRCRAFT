# B-24 Weapons Mother AN/M2 V004

V004 replaces the procedural V003 gun shell with exact source mesh and UV data.

- `GUN_EXACT_SOURCE_MIRROR` is copied from the aircraft AN/M2 donor without vertex edits.
- The port and starboard waist mounts preserve the locked B-24 reference nodes and original world transforms.
- The high-detail AN/M2 is attached to each waist source gun axis with one documented rigid/uniform alignment matrix.
- The 12.7x99 mm case and projectile preserve the donor UVs and use one millimeter-to-meter conversion.
- Bolt, spring and cocking-handle geometry is a visible, removable mechanical reference layer; it is not approved as AN/M2 aircraft internal geometry.
- The seated A-13 installation is represented as a manual-dimensioned evidence envelope, because no separable full A-13 source mesh is available.
- The procedural-field package drives deterministic color and roughness only. It never modifies source geometry.

Open `index.html` directly. Internet access is needed for the Three.js runtime loaded from jsDelivr.
