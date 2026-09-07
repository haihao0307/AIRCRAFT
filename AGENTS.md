# B24 livery workbench clean restart R1

Active branch: `restart/b24-livery-workbench-clean-r1-20260907`.

Read `CURRENT.json`, `BACKUP_POINTER.json`, `SOURCE_LOCKS.json`, and `NEXT_START_HERE.md` before writing. The complete pre-restart state is frozen at backup commit `f3b1f1a27b036df7d41ddda653ec6662ffe05653` on `backup/b24-full-snapshot-20260907-r1`.

This branch is a clean livery-only line. Do not merge an old B24 branch wholesale. Do not restore deprecated image-to-3D reconstruction, old weather, weapons, mission runtime, source GLB, source raster texture payload, or the discarded source UV payload.

The baseline workbench is a verified single HTML with exact static numeric skin geometry. Both waist side doors are closed by default and retain reopen endpoints. The static subset currently lacks propeller assemblies. Restoring the four propellers and hubs as visible fit references is the first geometry task. They are not paint targets until explicitly classified.

Required review cameras are port, starboard, nose, tail, top, bottom, and three-quarter. Free orbit, pan, zoom, close detail inspection, and stable part selection must remain.

The bomb-bay source closed endpoint contains an approximately 250.75 mm centre opening. The diagnosis is preserved under `diagnostics/`. Do not hide it with a patch strip. Its repair must be a separate verified candidate and later shared by both animated and static lines.

80 DAYS and UBANGI BAG III sources are read-only evidence at the commits in `SOURCE_LOCKS.json`. Rejected, unfinished, or historically uncertain artwork must not become active merely because it exists in backup.

Every review delivery is one self-contained HTML at a full immutable Git commit and is opened through a raw.githack URL. Run desktop and 390 x 844 checks before issuing the link. New candidates keep `visualAcceptance=false` and `productionReady=false` until the user explicitly accepts them.
