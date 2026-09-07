# B-24J-25-CO “80 DAYS” prompt skillpack

## 1. How to use this skillpack

Replace every bracketed variable before execution:

```text
[PRIMARY_REFERENCE_ID]
[SUPPORTING_REFERENCE_IDS]
[MISSION_STATE_ID]
[VICTORY_FLAG_COUNT]
[BOMB_MARK_COUNT]
[OUTPUT_RESOLUTION]
[RENDERER_OR_TOOL]
```

The count variables must come from one selected historical state. When a symbol is obscured, record it as unresolved. Do not guess.

## 2. Shared hard constraints

Append this block to every prompt:

```text
Historical museum reconstruction of Consolidated B-24J-25-CO Liberator “80 DAYS”, serial 42-73257, aircraft no. 487, 308th Bomb Group, 374th Bomb Squadron, Fourteenth Air Force, China, 1944. Preserve the authoritative aircraft geometry, silhouette, node hierarchy, animation, mechanisms and original UV. Fuselage and fixed vertical-fin livery only. Do not redesign the aircraft. Reconstruct markings only from [PRIMARY_REFERENCE_ID] with support from [SUPPORTING_REFERENCE_IDS]. Use one declared mission state, [MISSION_STATE_ID]. Port and starboard are independent. No mirrored art. Olive drab upper surfaces over neutral gray undersides. Deep-red shark-mouth interior, white teeth and dark edging. White hand-painted “80 DAYS” title with quotation marks and two white dice with dark pips below. Visible dense rivet rows, panel seams, inspection plates, repair patches, chipped paint, grime, oil streaks, field touch-ups, fading and repeated-mission operational wear. Keep wear airworthy and maintained. Preserve editable masks and source traceability.
```

## 3. Port-side reconstruction prompt

```text
Create a strict port-side livery reconstruction for B-24J-25-CO “80 DAYS”. Use E04 as the principal nose-art reference and E05/E06 only for geometry-relative scale and full-side placement. Show the port shark mouth, white “80 DAYS” title with quotation marks, two white dice, ROBBY in the forward nose area, and HUFF near the cockpit at the photographed coordinates. Reproduce the port victory-flag and bomb-symbol rows for [MISSION_STATE_ID], using exactly [VICTORY_FLAG_COUNT] flags and [BOMB_MARK_COUNT] bombs counted from the selected state. Do not include STAM on the port side. Follow source panel breaks, rivet rows and curved-surface distortion. Fuselage and fixed-fin paint only. No propeller, wheel, gear, engine, glass, gun, turret-interior or cockpit retexturing.
```

## 4. Starboard-side reconstruction prompt

```text
Create a strict starboard-side livery reconstruction for B-24J-25-CO “80 DAYS”. Use E01/E02/E03 as the principal ground references and E07 only for full-side scale and insignia relationships. Show the starboard shark mouth, white “80 DAYS” title with quotation marks, two side-specific dice, ROBBY in the forward nose area, and the photographed victory-flag and bomb-symbol rows for [MISSION_STATE_ID]. Place STAM only on this side, immediately below the upper rectangular side window, matching E01 and E03 in font scale, angle and spacing. Do not move STAM toward the nose and do not place it on port. Add HUFF only when the selected starboard reference is legible enough to locate it. Use exactly [VICTORY_FLAG_COUNT] flags and [BOMB_MARK_COUNT] bombs from the selected state. Fuselage and fixed-fin paint only. No mirrored port texture.
```

## 5. Tail-detail prompt

```text
Create a fixed-vertical-fin livery detail for “80 DAYS”. Preserve the real source-model fin geometry. Paint 273257 above 487 with a white triangle beneath. Validate both fixed fins independently against the selected full-aircraft reference. Follow rivet lines, panel breaks, hinge and movable-surface boundaries. Use faded olive drab, repaired panels, chipped white paint and restrained grime. Do not paint excluded mechanical fittings or invent squadron codes.
```

## 6. Shark-mouth close-up prompt

```text
Create a museum-review close-up of the “80 DAYS” shark mouth on the selected [port|starboard] side. Trace tooth count, tooth spacing, jaw line and curvature from [PRIMARY_REFERENCE_ID]. Use a deep-red interior, aged white teeth and dark edging. Show hand-painted brush irregularity, chipped paint at panel seams, fading, abrasion and grime. Preserve the real nose glazing boundary, turret opening and metal-panel geometry. Do not use a plain black interior. Do not copy the opposite side by mirroring.
```

## 7. Surface material prompt

```text
Create a close-up PBR surface study of the “80 DAYS” fuselage skin. Show individually readable rivet rows, lap joints, inspection hatches, fasteners, patch plates, subtle sheet-metal oil-canning, panel-to-panel olive-drab variation, neutral-gray lower transition, field touch-ups, fine scratches, chipped paint, dust, grime and directional oil staining from repeated operations. Keep all construction aligned to source panels. Avoid random procedural noise, wreck corrosion, fantasy bullet holes and uniform black rivet dots.
```

## 8. Base Color prompt

```text
Generate Base Color only for the approved fuselage and fixed-fin LiveryUV. No baked lighting, no specular highlights, no hard AO shadows and no fake relief shading. Include olive drab, neutral gray, all historically supported markings, pigment fading, field repairs, dirt color, oil color and exposed-metal color where paint is lost. Keep port and starboard masks separate. Keep STAM starboard-only below the upper rectangular window. Preserve an editable [MISSION_STATE_ID] symbol layer.
```

## 9. Normal-map prompt

```text
Generate a tangent-space OpenGL Normal map for the approved fuselage and fixed-fin LiveryUV. Reconstruct rivet heads, flush-fastener recesses, lap joints, panel seams, inspection-plate edges, repair-patch steps, restrained dents and subtle oil-canning. Derive paths from source construction and references. Preserve continuity across UV seams. Keep relief physically restrained. Do not encode color, grime, shadows or lettering pigment. Do not affect glass, guns, tires, landing gear, propellers, engine internals or cockpit parts.
```

## 10. Height or Displacement prompt

```text
Generate a linear Height or Displacement map for low-frequency fuselage and fixed-fin relief. Include restrained sheet-metal oil-canning, lapped panel steps, raised repair patches, shallow reference-supported dents and selected access-panel relief. Use a documented neutral midpoint or signed convention. Do not change the silhouette, window fit, turret ring, door clearance or movable-surface gap. Keep micro rivets in the Normal map when displacement density is insufficient.
```

## 11. Roughness prompt

```text
Generate a linear Roughness map for the “80 DAYS” fuselage and fixed fins. Make chalked sun-faded paint rougher, maintenance-contact areas slightly smoother, oily grime smoother, dry dust rougher, touch-up paint locally distinct, and aged hand-painted markings subtly different from the base coat. Follow airflow, access patterns and material history. Avoid uniform noise and painted fake highlights.
```

## 12. UV audit prompt

```text
Audit the existing source model without changing geometry. Preserve original UV and create LiveryUV only on approved fuselage exterior metal skin, nose surrounding metal, exterior fuselage panels and both fixed vertical fins. Keep port and starboard unique. Prioritize nose art, STAM, symbol rows and fin serial. Detect stretch, overlap, mirrored islands, insufficient padding, broken rivet continuity and seams crossing readable markings. Produce annotated screenshots and a machine-readable report. Any unresolved mesh must be marked review and must block final approval.
```

## 13. Negative constraints

Do not allow:

```text
alternate B-24 mesh; changed aircraft silhouette; changed greenhouse cockpit; changed nose turret; changed wing, tail or fuselage proportions; mirrored port/starboard art; STAM on port; STAM moved away from the starboard rectangular window; missing quotation marks; computer-perfect title lettering; mirrored dice; plain black shark-mouth interior; invented pin-up art; invented squadron code; fixed victory or mission count without a selected photo state; mixed counts from different dates; generic random rivets; black rivet dots in Base Color; oversized rivet relief; broken panel seams; wreck corrosion; fantasy bullet holes; clean factory-new finish; cartoon style; polished modern warbird finish; texture on propellers, hubs, engines, wheels, tires, landing gear, glass, guns, turret interiors, cockpit, interior, lights, antennas or wires; destructive replacement of original UV; baked lighting in Base Color; AO halos around every rivet; silhouette-changing displacement.
```

## 14. Required completion report

Every execution must return:

```yaml
aircraft_id: 308bg_374bs_42-73257_80-days
mission_state_id: ...
primary_reference: ...
supporting_references: [...]
port_completed: true|false
starboard_completed: true|false
stam_starboard_only_verified: true|false
victory_flag_count: ...
bomb_mark_count: ...
counts_status: verified|provisional|obscured
uv_audit_status: pass|blocked
maps:
  base_color: path-or-null
  normal: path-or-null
  roughness: path-or-null
  height_displacement: path-or-null
  ao: path-or-null
known_uncertainties: [...]
```
