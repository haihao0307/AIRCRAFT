# B24 V018: compact data and independent motion

[Open the V018 workbench](https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-native-data/)

The aircraft data download is 4,061,477 bytes, reduced from 8,917,196 bytes by 54.4534%. All 18 source image assets and all source UV blocks were removed. The 348 meshes preserve every position, normal and index value; indices use an exact 16-bit encoding. No original GLB, old monolithic payload or raster image asset is requested by this runtime.

An independent MotionSystem restores 1784 initial poses and runs explicit gear/bay controls and four rotor channels. Its mechanical curves are source-derived; their migration does not prove engineering-correct linkage reconstruction. The whole-aircraft shape remains an exact numeric-mesh transition. Full parametric geometry is not complete.

Actual evidence: 1044 geometry equality checks, 514 pose/control states and 916976 node comparisons, 76/76 local browser assertions, 76/76 public browser assertions, and 27/27 public byte identities. Desktop and mobile-sized Chromium each completed two uninterrupted 330-second task cycles at rate 1 with zero seeks. This is a SwiftShader test environment, not a physical mobile-device performance claim.

The accepted V017 base and previous V017.1 page are unchanged. Weather, clouds and fog remain deferred. Source raster textures are absent; the renderer still generates reflection, shadow and event-smoke buffers. Test screenshots in reports are evidence, not runtime assets.

Read CURRENT.json, NEXT_START_HERE.md and knowledge/RECEIPT.md for exact versions and remaining work. The candidate still needs user visual review. Build scripts use a pinned reference outside runtime; the reference is never a runtime fallback.
