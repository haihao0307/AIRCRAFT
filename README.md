# B24 full snapshot backup R1

Date: 2026-09-07

This branch is an immutable recovery snapshot for the current B24 production, compact numeric runtime, static skin workbench, side-door endpoints, bomb-bay closure diagnosis, and the two relevant livery research lines.

## Snapshot directories

1. `01_ACCEPTED_V017/` is the user-accepted continuation baseline.
2. `02_V018_NATIVE_CURRENT/` contains the compact image-free numeric runtime and the measured bomb-bay closure diagnosis.
3. `03_SKIN_SINGLEFILE_V018_R2/` contains the verified fixed single-file static skin workbench with both waist side doors closed by default and reopenable.
4. `04_LIVERY_80_DAYS_RESEARCH/` preserves the current 80 DAYS research branch as read-only evidence. It is not automatically accepted for visual production.
5. `05_LIVERY_UBANGI_RESEARCH/` preserves the current UBANGI BAG III research branch as read-only evidence. It is not automatically accepted for visual production.

The restart line must read `BACKUP_MANIFEST.json` and `RESTART_PLAN.md`. Archive content must never be imported wholesale into the active runtime. Only explicitly selected, verified, and relevant files may cross into the restarted livery workbench.

The accepted V017 page, V018 compact page, and earlier fixed commits remain unchanged. Weather, clouds, and fog remain outside this restart until Weather Mother is rebuilt and explicitly integrated.
