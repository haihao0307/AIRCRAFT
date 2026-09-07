# B-24 livery UV policy

The source GLB remains immutable. Production creates a second UV channel named `LiveryUV` on approved exterior paint surfaces while preserving the original UV.

## Included exterior paint surfaces

Fuselage, nose metal skin, wings, fixed tail, external control-surface skins, engine cowling and nacelle outer skins, bomb-bay doors, exterior access doors and painted panels.

## Excluded surfaces

Propellers, hubs, engine internals, exhaust mechanisms, wheels, tires, brakes, landing gear, glass, guns, barrels, turret interiors, cockpit, aircraft interior, lamps, antennas, wires and small mechanical fittings.

## Classification method

Use source node names, material identity, hierarchy, geometric position and visual audit. Name matching alone is insufficient. Every source mesh receives one of:

- `paintable-static`
- `paintable-dynamic`
- `transparent`
- `mechanical`
- `interior`
- `weapon`
- `review`

The report must cover all 348 meshes. A `review` item blocks final UV approval until inspected.

## Atlas priorities

1. Port nose art zone
2. Tail serial zone
3. fuselage insignia and mission markings
4. wing national insignia
5. doors, hatches and inspection close-ups
6. broad painted skin

The port nose receives the highest texel density and must not cross destructive UV seams through the text, pin-up figure, shark mouth or mission marks.
