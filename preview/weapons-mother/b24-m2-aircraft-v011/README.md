# B-24 Weapons Mother AN/M2 V011

V011 is a single-station corrective evidence gate. It deliberately exposes only the B-24 starboard/right-waist installation for acceptance. Port-waist and A-13 data remain retained for later work but are disabled in this review.

- `GUN_EXACT_SOURCE_MIRROR` is copied from the aircraft AN/M2 donor without vertex or UV edits.
- The donor +X bore maps to B-24 node 802 local +Y. Donor +Z maps to node 802 local +Z. The retained rear-sight components 796/800 are an independent overlay check and no longer control receiver roll.
- The station applies one declared +90 degree X basis conversion from B-24 +Y-up to renderer +Z-up. Node 808 centers review X/Y and the minimum source-Y vertex of node 811 defines review/physics floor Z=0. No bounding-box auto-centering remains.
- The accepted visible aircraft support is limited to locked source nodes 805, 808 and 811. No ground tripod, naval pedestal or display base is substituted.
- Source node 799 remains hidden route evidence. The live 12.7x99 mm rounds and extracted disintegrating links follow that route. The top outlet, flexible chute and feedway relation follows the 1944 Aircrewman's Gunnery Manual. The donor container is explicitly non-approved until the exact B-24 block installation drawing and part number are locked.
- Cases and links use SI-gravity Cannon rigid bodies. They may settle only while touching the real floor. Each active piece has a 2–4 impact ceiling, is frozen at a seeded pseudo-random low-pile transform after a short supported timeout, and is then removed from the dynamic solver. There is no growing invisible pile box or collider tower.
- Barrel/extension short recoil, bolt travel, spring compression, extractor transfer, feed lever/slide/pawls, cocking handle and counter-recoil are synchronized manual-cycle proxies. They remain reference visualization rather than an approved hidden-parts catalog.
- Firing audio is deterministic Web Audio synthesis with report, receiver impulse, bolt, feed, chute, ejection and case/link impact layers; no external recording is embedded.
- Flash, white smoke and fine sparks use fixed-capacity pools and one reusable light. `HIGH` and `BALANCED` are runtime performance tiers, not an AAA acceptance claim.
- The procedural-field package drives deterministic color and roughness only. It never changes source geometry.

The hosted page contains no GLB or embedded image payload. It loads the losslessly compressed distillation stream from an immutable AIRCRAFT commit after release. Production entry: `https://weapons-mother-b24.sunhaihao.chatgpt.site/twin-m2`.
