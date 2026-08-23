# TASK 006 · B-24J-25-CO “80 DAYS” historical livery skillpack

## Mission

Integrate the historical livery research for Consolidated B-24J-25-CO Liberator serial `42-73257`, aircraft number `487`, **“80 DAYS”**, into the Haihao Aircraft Production Line as a reusable, source-traceable fuselage-livery skillpack.

This task is a documentation and production-specification integration. It does not authorize a geometry change, a substitute aircraft mesh, a final texture bake, or a merge to `main`.

## Locked aircraft identity

- Aircraft: Consolidated B-24J-25-CO Liberator
- Nickname: “80 DAYS”
- Serial: `42-73257`
- Aircraft number: `487`
- Unit: 308th Bomb Group, 374th Bomb Squadron
- Air force: Fourteenth Air Force
- Theater and period: China, 1944
- Aircraft ID: `308bg_374bs_42-73257_80-days`

## Branch production boundary

This branch adds only:

- historical livery research notes
- side-specific marking rules
- fuselage and fixed-fin UV audit requirements
- Base Color, Normal, Roughness, Height or Displacement, and optional AO specifications
- reusable prompts for image research and texture production
- review and acceptance gates
- text-safe internal diagrams
- a structured aircraft metadata record

This branch must not:

- modify the authoritative aircraft GLB
- alter aircraft proportions, node hierarchy, animation, mechanisms, or existing UV data
- create a replacement B-24 mesh
- texture propellers, hubs, tires, wheels, landing gear, engine internals, glass, guns, turret interiors, cockpit or interior equipment
- invent a marking, move a marking, mirror a marking, or lock a mission-mark count without photograph-specific evidence

## Source hierarchy

Use the external review package and the individual scans listed in:

`docs/aircraft-pipeline/references/b24-80-days/README.md`

Evidence IDs `E01` through `E08` are the direct-aircraft references. Other 374th Bomb Squadron aircraft are contextual references only and cannot prove a marking on “80 DAYS”.

## Mandatory historical constraints

1. The white hand-painted title is exactly `“80 DAYS”`, including quotation marks.
2. Two white dice with dark pips sit below the title. Their perspective, pip layout and side-specific paint distortion must be traced independently from each side.
3. The shark mouth appears on both photographed sides. Use a deep-red reconstruction for the mouth interior, white teeth, and dark edging. Record the red as an upstream-approved reconstruction color pending a verified original color photograph.
4. `ROBBY` is a small white crew-name marking in the forward nose area. Place it from the selected side photograph and do not use a mirrored coordinate.
5. `HUFF` is a small white crew-name marking near the cockpit area. Port placement is photographically clear. Starboard placement requires the selected reference to be sufficiently legible before it is baked.
6. `STAM` is starboard-only in the current evidence set. It sits immediately below the upper rectangular side window shown in `E01` and `E03`. Do not place `STAM` on the port side.
7. Tail marking: `273257` above `487`, with a white triangle on the vertical fin. Validate each fixed fin independently.
8. Japanese victory flags are colored symbols. One flag records one credited Japanese aircraft destroyed.
9. Bomb silhouettes are mission symbols. One bomb records one completed bombing mission or sortie in the historical marking system used by the aircraft.
10. Victory flags and bomb symbols accumulate over time. A production texture must declare one `mission_state_id` and reproduce the counts and arrangement visible in that selected reference state. Do not combine symbols from photographs taken at different times.
11. Port and starboard art must be reconstructed separately. No automatic horizontal mirror is permitted.
12. Aircraft geometry and silhouette remain controlled by the authoritative source model and its variant audit. Generated side-view art is a placement guide only.

## Required repository deliverables

- `docs/aircraft-pipeline/B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md`
- `docs/aircraft-pipeline/B24_80_DAYS_TEXTURE_SPEC.md`
- `docs/aircraft-pipeline/B24_80_DAYS_UV_AUDIT_CHECKLIST.md`
- `docs/aircraft-pipeline/B24_80_DAYS_PROMPT_SKILLPACK.md`
- `docs/aircraft-pipeline/B24_80_DAYS_ACCEPTANCE_CHECKLIST.md`
- `docs/aircraft-pipeline/SKILL_INDEX.md`
- `docs/aircraft-pipeline/references/b24-80-days/README.md`
- `docs/aircraft-pipeline/diagrams/B24_80_DAYS_MARKING_EVIDENCE.svg`
- `docs/aircraft-pipeline/diagrams/B24_80_DAYS_PBR_UV_PIPELINE.svg`
- `data/aircraft/308bg/80-days.json`

## Validation gates

1. All required files exist and all internal links resolve.
2. JSON parses successfully.
3. The branch preserves the source-model lock and does not modify geometry or runtime code.
4. `STAM` is documented as starboard-only and below the correct rectangular window.
5. Japanese flags and bomb marks have correct meanings and no undocumented fixed count.
6. Port and starboard rules are separate.
7. UV guidance preserves the original UV and adds `LiveryUV` only to approved exterior fuselage and fixed-fin paint surfaces for this skillpack.
8. PBR responsibilities are separated. Color, surface relief and reflectance are not baked into the wrong map.
9. Rivet, seam, patch, inspection-panel and operational-wear requirements are explicit and physically restrained.
10. Final merge remains blocked until upstream historical review approves a single mission-state reconstruction and the authoritative model passes the UV audit.
