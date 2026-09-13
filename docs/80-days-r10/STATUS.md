# 80 DAYS R10 — E04 scan calibration takeover

Date: 2026-09-13
Branch: `feature/b24-80days-scan-calibration-r10`
Base handoff commit: `8e8fa722888af584a1243497639f2ec1bb185077`
R9 runtime base: `e0f631b537fa3f8ddc91ce769103462276baee10`

## What changed

R9 remains unchanged. R10 adds a separate scan/calibration workbench at `b24-80days-scan-r10.html` and a machine-readable anchor seed at `docs/80-days-r10/E04_SCAN_ANCHORS_R10.json`.

The workbench places the recovered E04 historical image beside the existing R9 3D workbench. It locks the existing E04 window box `[767,163,947,359]` and center `[857,261]`, then permits additional point sampling for mouth, tooth, title, dice, flag and structural anchors. Exported coordinates stay in original E04 pixel space and are never mirrored.

## Why this is separate from R9

The frozen generic Mother01 nose glazing does not yet have proven structural equivalence to the historical E04 nose. Moving/scaling artwork cannot prove that equivalence. Therefore R10 does not change Mother01 geometry or claim a completed livery reconstruction. It first separates two questions:

1. Where are stable observable anchors in the historical photo?
2. Which Mother01 structures, if any, correspond to those anchors under one physically plausible view?

Only after question 2 is supported should direct livery placement parameters be recalibrated.

## Current evidence lock

- E04 dimensions: 2000×1243.
- E04 SHA256: `07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa`.
- Port window box: x 767..947, y 163..359.
- Port window center: (857,261).
- Existing R9 placement `[Z=6.7,Y=-1.1,scale=0.0013,angle=0]` remains a visual seed, not a measurement.
- Port artwork remains incomplete; title, upper teeth and disputed mission/flag details are not silently invented.
- Starboard is not mirrored from port.

## Next scan pass

Prioritize anchors that can test structural correspondence before decorative detail:

1. window corners/edges already locked;
2. nose skin/glazing boundary intersections visible in E04;
3. mouth endpoints and strongest curvature breaks;
4. dice corners only after the structure fit is stable;
5. title and teeth after placement is no longer compensating for structure mismatch;
6. flag/mission marks remain evidence-conflict items until count/state is resolved.

For the 3D side, record each candidate Mother01 anchor in world coordinates with camera/view metadata. Do not use independent auto-fit/auto-scale between image and model and call that same scale.

## QA state

`visualAcceptance=false`
`productionReady=false`

The new source has been committed, but full rendered public-browser QA has not yet been completed in this environment. Do not mark the fixed-version preview accepted until the historical image loads and the R9 iframe plus scan overlay are actually exercised at desktop and 390×844.
