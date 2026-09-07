# B-24J-25-CO “80 DAYS” UV audit checklist

## A. Source lock and non-destructive setup

- [ ] The input file passes the repository source-model byte, hash and inventory gate.
- [ ] Original mesh names, hierarchy, animation and materials are unchanged.
- [ ] The original UV set is preserved byte-for-byte where the tool permits and visually verified elsewhere.
- [ ] A second UV channel named `LiveryUV` is created only on approved paintable meshes.
- [ ] No substitute aircraft or fallback mesh is present.
- [ ] The target configuration has a recorded B-24J-25-CO compatibility audit.

## B. Scope classification

Included for this skillpack:

- [ ] fuselage exterior metal skin
- [ ] glazed-nose surrounding metal skin
- [ ] exterior fuselage access doors and painted maintenance panels
- [ ] both fixed vertical-fin painted skins

Excluded:

- [ ] propellers and hubs
- [ ] engine internals and exhaust mechanisms
- [ ] wheels, tires, brakes and landing-gear mechanisms
- [ ] all glass
- [ ] guns, barrels and turret interiors
- [ ] cockpit and aircraft interior
- [ ] lights, antennas, wires and small mechanical fittings
- [ ] wings, nacelles and horizontal-tail livery in the current package

Every source mesh must retain a classification and reason. An unresolved `review` item blocks approval.

## C. Side separation

- [ ] Port and starboard fuselage islands are unique and independently paintable.
- [ ] No shared or mirrored UV island carries side-specific lettering or artwork.
- [ ] `STAM` can be painted on starboard without appearing on port.
- [ ] Port and starboard shark mouths can use different tooth placement and wrap.
- [ ] Port and starboard title and dice can use different paint distortion and wear.
- [ ] Both fixed vertical fins can be checked independently.

## D. Nose and forward fuselage

- [ ] No destructive seam crosses a readable portion of `“80 DAYS”`.
- [ ] No destructive seam cuts through a dice face, pip or major perspective edge.
- [ ] Shark-mouth seams follow low-salience panel boundaries where possible.
- [ ] Teeth near the nose curvature remain readable and do not stretch across the glass boundary.
- [ ] `ROBBY` has adequate texel density and does not touch a mip-bleed edge.
- [ ] Port `HUFF` has adequate texel density.
- [ ] Starboard `HUFF` remains uncommitted until the selected reference is legible.
- [ ] Starboard `STAM` is directly below the correct upper rectangular side window.
- [ ] `STAM` does not cross a UV seam or appear on the port island.

## E. Mission and victory mark zone

- [ ] Japanese victory flags and bomb mission marks are separate mask groups.
- [ ] Each symbol row can be changed without repainting the whole fuselage.
- [ ] The layout supports a declared mission state and revision.
- [ ] Count and spacing are copied from the selected reference, not generated procedurally.
- [ ] Obscured symbols can remain masked as unknown during review.
- [ ] Mipmaps do not merge adjacent flag discs or bomb silhouettes.

## F. Tail marking zone

- [ ] `273257` is readable without vertical stretch.
- [ ] `487` is centered according to the selected fin reference.
- [ ] The white triangle follows the photographed size and panel relationship.
- [ ] Port and starboard fin distortion is validated independently.
- [ ] Rudder or movable-surface boundaries are handled without double-painting or texture crawling.

## G. Texel density

- [ ] Nose-art texel density is the highest priority.
- [ ] `STAM`, victory flags, bomb marks and tail serial remain readable at museum close-up distance.
- [ ] Density changes occur at documented island boundaries.
- [ ] Left and right corresponding zones use comparable density without forced mirroring.
- [ ] A checker texture proves low stretch on title, dice, teeth, symbols and serials.
- [ ] Any zone below the rivet-readability target receives a higher-resolution tile instead of enlarged painted rivets.

## H. Padding and mip safety

- [ ] Island padding meets the renderer's worst-case mip requirement.
- [ ] White markings have no olive or gray color bleed at distance.
- [ ] Deep-red mouth paint does not bleed onto neutral-gray underside or glass.
- [ ] Black or dark outlines do not form accidental halos.
- [ ] Normal and height maps use matching dilation at island borders.

## I. Normal and displacement continuity

- [ ] Rivet rows continue through UV seams without jumps or doubled heads.
- [ ] Panel seams align across tiles and island boundaries.
- [ ] Height midpoint or signed convention is documented.
- [ ] Tangent-space normal convention is documented.
- [ ] Mirrored tangent artifacts are absent.
- [ ] Displacement does not change silhouette or mechanical clearances.

## J. Visual QA

- [ ] Port orthographic screenshot attached.
- [ ] Starboard orthographic screenshot attached.
- [ ] Nose checker screenshot attached.
- [ ] `STAM` close-up screenshot attached.
- [ ] Both fin screenshots attached.
- [ ] Normal-map glancing-light screenshot attached.
- [ ] Roughness-only screenshot attached.
- [ ] Height-only screenshot attached.
- [ ] Seam and padding report attached.
- [ ] Mission-state symbol count sheet attached.

## K. Blockers

The UV audit fails when any of the following occurs:

- a side-specific marking is mirrored
- `STAM` appears on port or moves away from the starboard rectangular window
- lettering or dice are visibly stretched
- rivet rows break or double at seams
- excluded mechanical or transparent parts enter the atlas
- original UV data is overwritten
- the source model fails the lock
- the mission-state count is undocumented
