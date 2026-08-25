# “80 DAYS” Texture Master V2 Review

This review stage deliberately stops before aircraft-model binding.

The browser workbench reconstructs a high-detail historical livery atlas from the authoritative B-24 candidate-skin projection and the side-specific aircraft evidence. It exposes separate port and starboard fuselage skins, high-density nose regions, fixed-fin regions, structural detail and PBR review channels.

## Review controls

- 2048, 4096 and 8192 texture generation
- Base Color, LiveryUV, Decal Mask, Normal OpenGL, Roughness, Height, AO, Metallic and Classification ID
- panel seams, rivets, fasteners and inspection-hatch controls
- window and excluded-opening boundaries
- fading, grime, oil streaks, paint chipping and exposed-metal controls
- an isolated inferred battle-damage layer that can be disabled completely
- full atlas, port nose, starboard nose, fixed fins and structural close-up views
- PNG and settings-JSON export

## Locked history

- aircraft identity: B-24J-25-CO, 42-73257, aircraft 487, “80 DAYS”
- STAM: starboard only, below the upper rectangular side window
- ROBBY and HUFF: retained from port evidence; no starboard HUFF
- victory flags: eight on starboard, zero on port
- bomb marks: null and absent until reproducible count approval
- fixed fins: 273257, 487 and a white triangle
- port and starboard title, dice and shark mouth are independently produced

## Approval gate

The texture master remains `visualAcceptance: review-required` and `modelBinding: not-started-by-design`. Approval of this browser master is required before any triangle-corner LiveryUV mapping, target material assignment or model render is authorized.