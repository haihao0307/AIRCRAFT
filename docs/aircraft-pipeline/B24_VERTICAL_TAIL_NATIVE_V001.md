# B-24J-CO vertical-tail native candidate V001

Status: executable functional candidate; all engineering, semantic, visual and whole-aircraft approvals remain false.

## Evidence delivered

- The local S016 scan is byte-locked at 6,721,623 bytes and SHA256 `de0819d07d35f37126ed62b3a6f02131aaded7cbaa5c49ce63187f72dab0f5b6`.
- The locked reference GLB remains `B24-REF-GLB-001`, 23,085,972 bytes, SHA256 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`.
- Reference extraction explicitly preserves node 719 / mesh 125 and node 744 / mesh 130 as main-rudder leaf candidates. It audits ancestor and sibling animation nodes 706, 713, 708, 731, 738 and 733.
- The static tail node 1717 is split by triangle topology into negative- and positive-span fixed-fin candidate groups. The side labels remain spatial candidates, not approved historical left/right identity.
- Four recipes compile to four independent `THREE.BufferGeometry` objects without loading a GLB or mirroring one runtime side onto the other.
- The runtime implements neutral, maximum negative yaw and maximum positive yaw candidates. Automated checks cover fixed-surface stability, hinge-pivot stability and repeated-command determinism.
- Eight named surface slots bind to nonzero, non-overlapping triangle ranges. Panel, rivet, skin, roughness, normal and historical-marking programs are executable candidates.
- The browser workbench exposes Reference, Native, Overlay, Object ID, Wireframe, Normals, Surface ID, side isolation and `pilot.yaw` controls.

## Browser QA

The automated matrix runs at 1440 x 900 and 390 x 844. It captures neutral, maximum negative yaw and maximum positive yaw across six views, plus all six views for each of seven diagnostic modes. The artifact contains 120 screenshots, screenshot hashes, static and browser QA JSON, and console/network logs.

Functional QA passing does not approve geometry or visual parity. The workbench intentionally labels the result `FUNCTIONAL CANDIDATE - APPROVALS FALSE`.

## Remaining blockers

- S016 scan distortion and dimension endpoints are not approved; `source_drawing_residual` is unresolved. `anchor_fit` is reported separately and cannot substitute for drawing calibration.
- S002 revision and B-24J-CO applicability remain unresolved. S007, S008 and S009 complete manual/catalog intake is still blocked.
- The fixed-fin topology boundary, historical side assignment, rudder animation semantics and semantic node map await human review.
- Candidate thickness, twin-tail spacing, installation, hinge axis, gap and 30-degree travel are not engineering-approved.
- No collision-clearance proof against the complete aircraft assembly exists yet.
- Historical markings remain aircraft-instance-dependent.

Consequently `verticalTailApproved` and all six whole-aircraft approvals remain false.
