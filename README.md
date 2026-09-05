# B24 production

This branch contains only the active B24 workbench, its locked dependency manifest, current knowledge and checks. Historical tasks and unrelated entrypoints have been removed from this active branch. Their original commit remains recoverable; other branches were not deleted.

Accepted V017: https://haihao0307.github.io/guilin-dem-pipeline/aircraft/b24-v017-clean-restart/

Read NEXT_START_HERE.md. V017.1 is a separate effects candidate using the same interface. It adds bind-local tire weathering and subtle metal roughness variation, source-blade exposure samples, time-derived visual roll and an impact camera hold. These are presentation approximations, not calibrated engineering or historical measurements.

Weather and fog are not connected. Nose-wheel pose correction, source payload inventory/empty-bay binding, and historically grounded panel/UV corrections remain pending. No claim of completing them is made.

Build: node --test tools/effect-state.test.js; python tools/build.py; python tools/browser_qa.py. The builder downloads only hash-locked dependencies missing from runtime/, verifies the native payload, and rejects unlisted runtime files. It never restores an old production branch.
