# B24 native distillation R1

Continue the user-approved plan on feature/b24-native-distillation-r1. This is the compact-data and motion migration branch. The prior workbench branch and accepted V017 are unchanged. Read CURRENT.json, AGENTS.md and knowledge/NATIVE_R1.md, then actual reports. Do not claim the whole-aircraft geometric recipe stage is complete.

The deterministic compiler removes source images, unused UV streams, source texture/material references and unused full animation tracks. It preserves every source geometric number, all 1784 initial component poses and the selected mechanical playback domain. Existing source animation data is transformed into explicit actuator curves; engineering linkage reconstruction is still a separate stage.

Source reference is pinned to b8b2a6c441fa9a9b7e0831f4217511b4968d266e and exists only in the offline build/test checkout. It must never enter runtime or the candidate ZIP. No fallback asset or unrelated workflow is allowed. Browser rendering buffers are disclosed separately from image assets.

The CI actually builds and tests the code, then runs two real-time 330-second cycles at desktop and mobile viewport sizes. That automation validates existing code; it is not an autonomous agent that invents missing geometry while the conversation is inactive.
