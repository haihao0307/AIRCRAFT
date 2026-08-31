# B-24 Weapons Mother AN/M2 V009

V009 is a corrective source-parity review. It keeps the V008 firing cadence, dual-gun operation, audio timing and pooled runtime path while correcting the gun roll datum, feed hierarchy and debris support logic. It is not labeled AAA-final or engineering-approved.

- `GUN_EXACT_SOURCE_MIRROR` is copied from the aircraft AN/M2 donor without vertex edits.
- Port and starboard waist mounts preserve their own locked B-24 reference nodes and original world transforms; the source muzzle axes are `-Y` and `+Y` respectively.
- The high-detail AN/M2 maps its declared +X bore and authored +Z vertical to B-24 nodes 802 and 821 plus their exact rear-sight radial datum (`determinant +1`). V008's incorrect node-19 grip-center roll inference has been removed.
- The 12.7x99 mm case and projectile preserve the donor UVs and use one millimeter-to-meter conversion.
- Nodes 799 and 818 remain hidden, traceable route evidence. Their source geometry is sampled to build each feed centerline; the donor box is fixed to station/mount space, and the source route endpoint meets the receiver through the same final-hierarchy gun calibration instead of an invented feed socket. The box remains a non-approved shape reference until exact aircraft-block installation evidence is locked.
- Live rounds are oriented from the local belt tangent and gun bore instead of a fixed world axis. The donor box carries an internal linked-ammunition layout rather than loose rounds attached to its exterior.
- Cases and disintegrating links persist visually. Support state is rebuilt from the current Cannon contact set every step; stale contacts cannot freeze debris in midair, and settled pieces are snapped to the active support top before becoming instances.
- The source B-24 triangular braces 811 and 824 measure about 0.952 m in their locked world bounds and are not shortened without position-specific manual evidence.
- Barrel/extension short recoil, bolt travel, driving-spring compression, cocking-handle movement, and trigger motion follow the documented AN/M2 cycle. The removable internal layer remains a reference visualization, not newly approved hidden geometry.
- The muzzle effect uses layered procedural flame, thin sparks, a turbulent white-smoke plume, and a short-lived light; there are no embedded image files.
- The seated A-13 installation is represented as a manual-dimensioned evidence envelope, because no separable full A-13 source mesh is available.
- The procedural-field package drives deterministic color and roughness only. It never modifies source geometry.

Delivery is online-first. The hosted Site contains only the application and loads the losslessly compressed source stream from the AIRCRAFT GitHub branch; the working GLB remains in the source-data directory and is not copied into the hosted page. Local QA therefore runs through HTTP rather than `file://`. The production entry is `https://weapons-mother-b24.sunhaihao.chatgpt.site/twin-m2`.
