# B24 production

[Open V017.1 effects candidate](https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-v0171-clean-effects/)

[Open accepted V017 base](https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-v017-clean-restart/)

The user accepted V017 for continuation on 2026-09-05. Its exact source remains at accepted/b24-v017-20260905 and ceed8183dc5fb8399349e73ebeef5b997d7d7389. V017.1 is a separately published candidate awaiting visual review. Weather and fog are deferred.

This branch contains only the active B24 workbench, its locked data and renderer, current knowledge and checks. Historical tasks, unrelated entrypoints and unused workflows have been removed from this branch. Other branches and other Mother projects were not deleted. The historical recovery branch is never a runtime fallback.

V017.1 adds reversible bind-local tire dust and weak metal roughness variation, source-blade exposure samples, absolute-time visual roll, an impact close-up that respects manual camera selection, and portrait-screen framing. These are presentation approximations, not calibrated historical or engineering measurements. Use the effect checkbox for an A/B comparison.

Actual checks: 10/10 logic, 48/48 browser, 22/22 public page. All 16 public runtime files match the tested bytes. Original node parents and native geometry/payload are preserved. The accepted public V017 index was checked unchanged. Read CURRENT.json, knowledge/RECEIPT.md and the reports for exact scope and commits.

Nose-wheel pose correction, source payload inventory/empty-bay binding and historically grounded panel/UV corrections remain pending. The eighteen phases were checked by seeking; an uninterrupted 330-second real-time test and physical mobile-device performance test are not claimed.

Build and check: node --test tools/effect-state.test.js; python tools/build.py; python tools/browser_qa.py. Public validation: python tools/public_qa.py. To inspect the bundled runtime locally, serve runtime/ through a local HTTP server. Normal review uses the online links above.
