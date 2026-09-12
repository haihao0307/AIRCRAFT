# 80 DAYS R9 — direct placement workbench

2026-09-12. This version implements direct placement controls, not completed historical reconstruction. visualAcceptance=false; productionReady=false.

R6 and the frozen Generic Mother01 are unchanged. The R9 module preserves R6 mouth, teeth, dice and name path constants byte-for-byte. Component 69 no longer drives the mapping. A photo pivot [0,546] maps to an explicit Mother01 world position, with one positive isotropic metres-per-pixel scale and in-plane rotation. +Z is forward, +Y is up, +X is port. Existing skin surfaces provide the wrap; there is no new inferred geometry. Initial placement [Z=6.7,Y=-1.1,scale=0.0013,angle=0] is a visual seed, not measured historical truth. Projection remains world-space on the fixed mother posture.

E04 was recovered from https://asisbiz.com/il2/B-24/308BG/images/42-73257-B-24J-Liberator-14AF-308BG374BS-no-487-named-80-Days-nose-art-left-side-China-01.jpg . Its SHA256 is 07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa, exactly matching the handoff. The existing download-folder workbench images did not match this hash and were not used as the E04 replacement.

Inspection shows an unresolved mismatch between the frozen model's glazed nose layout and the historical reference. A shift/scale of paint cannot establish structural equivalence. The port artwork is incomplete (upper teeth, title and other details remain missing); the visible photograph flag count also conflicts with the handoff text. Keep those conflicts explicit; do not silently invent or merge states. Starboard is not mirrored or reconstructed.

Implemented: live translation/scale/angle, reset, JSON export with identity/frame/source/uncertainty, front and port orthographic views, top orthographic view, front/rear perspective inspection, responsive controls with a reachable close button, and pause while hidden. Camera and projection changes do not rewrite the frozen mother.

Validation: tools/r9-check.py exercises live parameter update, reset, export, six cameras and 390x844 open/close. Screenshots and QA are retained outside the runtime in the intake record. Runtime success does not mean photo-view or engineering calibration.

Next: resolve the structural correspondence using the recovered E04, then calibrate the direct parameters in a matched view and recover missing visible artwork. A compatible nose cannot be inferred by modifying the frozen generic mother without a separate decision.

Continue fixed-version public HTTPS delivery, normal perspective and shared orthographic comparison rules. Do not activate revoked image-to-3D workflows.
