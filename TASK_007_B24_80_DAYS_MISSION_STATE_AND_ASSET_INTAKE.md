# TASK 007 · B-24J-25-CO “80 DAYS” mission-state and asset-intake execution

## Mission

Continue the `feature/b24-80days-historical-livery-skillpack` branch from specification into an executable, auditable historical-reference intake stage for Consolidated B-24J-25-CO Liberator serial `42-73257`, aircraft number `487`, **“80 DAYS”**.

This task must produce working validation code, machine-readable evidence records, reports, tests and a reviewable status page. It must not alter aircraft geometry or claim that final PBR textures have been baked when the authoritative model or historical assets are absent.

## Authority and required reading

Follow these files in order:

1. `AGENTS.md`
2. `docs/SOURCE_LOCK.md`
3. `docs/UV_LIVERY_POLICY.md`
4. `TASK_006_B24_80_DAYS_HISTORICAL_LIVERY_SKILLPACK.md`
5. `docs/aircraft-pipeline/B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md`
6. `docs/aircraft-pipeline/B24_80_DAYS_TEXTURE_SPEC.md`
7. `docs/aircraft-pipeline/B24_80_DAYS_UV_AUDIT_CHECKLIST.md`
8. `docs/aircraft-pipeline/references/b24-80-days/README.md`

## Locked production boundary

- Preserve the authoritative GLB, hierarchy, mechanisms, original UV, animations and proportions.
- Work only on the fuselage exterior metal skin and fixed vertical-fin painted skins defined by TASK 006.
- Do not texture propellers, hubs, engines, engine internals, wheels, tires, landing gear, glass, guns, turret interiors, cockpit, aircraft interior, lights, antennas, wires or small mechanical fittings.
- Do not create a substitute aircraft mesh, procedural B-24, generated UV completion or fabricated PBR texture set.
- Do not merge to `main`.

## Historical marking rules

- White hand-painted title: `“80 DAYS”`, including quotation marks.
- Two white dice with dark pips below the title, traced separately per side.
- Shark mouth on both photographed sides, reconstructed separately per side.
- Deep-red mouth interior is an upstream-approved reconstruction pending verified original color evidence.
- White teeth with dark edging.
- `ROBBY` in the photographed forward location.
- Port `HUFF` is confirmed; starboard `HUFF` remains evidence-gated.
- `STAM` is starboard-only and directly below the upper rectangular side window.
- Tail: `273257` above `487`, with a white triangle on each fixed fin.
- One colored Japanese victory flag represents one credited Japanese aircraft destroyed.
- One bomb silhouette represents one completed bombing mission or sortie in this marking convention.
- Symbol counts must come from one selected mission state. Never merge counts from different photographs.

## Stage A · Reference asset intake validator

Create `scripts/validate-80-days-references.mjs`.

The script must:

1. Read the expected inventory from a machine-readable manifest committed under `data/aircraft/308bg/`.
2. Look for external files under:

   `source-input/historical/308bg/374bs/80-days/`

3. Validate exact filename, byte count and SHA-256 for:

   - `374BS_80_DAYS_review_pack_v2.zip`
   - `80_Days_China_2_1944.jpg`
   - `80days.jpg`
   - `80-days(1).jpg`
   - `80_Days_asisbiz_left.jpg`
   - `80_Days_asisbiz_no487.jpg`
   - `80_Days_asisbiz_inflight.jpg`
   - `80_Days_asisbiz_right_inflight.jpg`
   - `80_Days_SDASM_10_0018697.jpg`
   - `stam_crop_zoom.png`

4. Preserve absent files as an explicit `blocked-missing-asset` state.
5. Reject a present file with a wrong byte count or hash.
6. Write:

   - `reports/80-days-reference-intake.json`
   - `reports/80-days-reference-intake.md`

7. Exit successfully when all files are absent only if the report clearly records the blocked state. Exit non-zero for a hash mismatch, malformed manifest or inconsistent evidence metadata.

## Stage B · Machine-readable evidence and mission states

Create:

- `data/aircraft/308bg/80-days-reference-manifest.json`
- `data/aircraft/308bg/80-days-mission-states.json`

Requirements:

- Encode evidence IDs `E01` through `E08`, filenames, views, side, principal use, byte counts and hashes already documented in the reference README.
- Record `stam_crop_zoom.png` as a derived crop with its parent evidence relationship.
- Create candidate mission-state records without inventing dates.
- Use `E03` as the initial placement state for `STAM` because it gives the clearest window relationship.
- Record the visible Japanese victory-flag count as `8` only where supported by the selected direct photograph and source record.
- Keep the bomb-mark count `null` and status `requires-annotated-count` until a reproducible count sheet is produced from an accepted source asset.
- Do not use generated reconstruction boards as evidence.

Each mission state must include:

```json
{
  "missionStateId": "80days-E03-placement-v1",
  "primaryEvidence": "E03",
  "supportingEvidence": ["E01", "E02"],
  "victoryFlagCount": 8,
  "victoryFlagStatus": "verified-visible",
  "bombMarkCount": null,
  "bombMarkStatus": "requires-annotated-count",
  "approvedForFinalBake": false
}
```

## Stage C · Count-sheet pipeline

Create `scripts/build-80-days-count-sheet.mjs`.

When the accepted source image exists, the script must produce a non-destructive annotation package:

- `reports/80-days-count-sheet.svg`
- `reports/80-days-count-sheet.json`

Rules:

- Preserve the original image outside the repository output.
- Record the source hash and crop coordinates.
- Number each accepted victory flag and bomb mark.
- Let the reviewer mark a symbol `verified`, `obscured`, `duplicate`, `not-a-symbol` or `unresolved`.
- Do not auto-approve computer-vision guesses.
- Final counts must be derived from reviewer-approved annotations.
- If the image is missing, write a blocked report with exact restoration instructions.

## Stage D · Production status page

Create a static review page under:

`public/80-days-livery-status.html`

The page must display:

- locked aircraft identity
- current mission-state ID
- asset-intake status
- direct evidence table E01 to E08
- side-specific marking matrix
- `STAM` starboard-only rule
- victory-flag and bomb-mark meanings
- PBR and UV readiness gates
- explicit blocked reasons
- links to the skillpack documents and generated reports

The page must not display a substitute airplane or generated side profile as evidence.

## Stage E · Tests and workflow

Add tests that verify:

1. Reference manifest JSON parses and matches the documented filename, byte and hash inventory.
2. Mission-state JSON contains no approved final state with a null bomb count.
3. `STAM` is starboard-only.
4. No mission state combines symbol counts across evidence dates.
5. The status page contains the locked aircraft identity and blocked-state language.
6. Existing source-lock and static-site tests continue to pass.

Add scripts to `package.json`:

```json
"validate:80days:references": "node scripts/validate-80-days-references.mjs",
"build:80days:count-sheet": "node scripts/build-80-days-count-sheet.mjs"
```

Integrate the reference validator into CI in a fail-safe mode. Missing external assets must produce a visible blocked report. Hash mismatches must fail CI.

## Stage F · Handoff

Update `HANDOFF.md` with a clearly separated “80 DAYS historical livery intake” section containing:

- changed files
- commands run
- tests and output
- current mission-state ID
- missing assets
- blocked gates
- exact next action needed from upstream

## Required verification

Run and report:

```bash
npm test
npm run build
npm run validate:80days:references
npm run build:80days:count-sheet
```

If required historical files or the authoritative GLB are absent, finish the task with an explicit verified blocked report. Do not fake completion.

## Completion response

Return:

1. branch and commit SHA
2. changed files
3. test results
4. asset-intake state
5. mission-state record
6. count-sheet status
7. preview URL or branch file URL
8. remaining blockers
