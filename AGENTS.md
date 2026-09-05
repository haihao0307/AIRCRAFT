# B24 clean production

Active branch: feature/b24-v017-clean-restart-workbench. This branch is exclusively the B24 production workbench. Do not merge it into main or another production line without explicit approval.

Read CURRENT.json, ACCEPTED_BASELINE.json, UPSTREAM_LOCK.json and knowledge/SKILL.md first.

The user accepted V017 for continuation on 2026-09-05. Its source commit is ceed8183dc5fb8399349e73ebeef5b997d7d7389 and recovery branch is accepted/b24-v017-20260905. Preserve the accepted public page and its pinned dependencies. Acceptance of that version does not automatically approve V017.1 or engineering accuracy.

The only runtime is runtime/. Its geometry, hierarchy, native payload, four original spindle axes, mechanical tracks, runway, mission, audio and existing cameras are inherited from the accepted base. New presentation effects remain separately switchable. Do not substitute meshes, change original UV, invent panel positions, or overwrite approved appearance.

Weather Mother, clouds and fog are deferred by the user. No old weather import, iframe composition, external reconstruction dependency, fallback model or automatic historical-branch recovery is permitted. Only explicitly locked files may enter the runtime or full package. Other aircraft, weapons and livery branches are separate and untouched.

Run node --test tools/effect-state.test.js, python tools/build.py and python tools/browser_qa.py. Distinguish logic tests, actual browser checks, user visual acceptance and production readiness. Never promote a candidate merely because CI passed.
