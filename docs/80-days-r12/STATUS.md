# B-24 “80 DAYS” — Skin Mother R12 status

## What R12 changes

R12 continues from `feature/b24-80days-scan-calibration-r10` commit
`09b3ad195b77ce45f9d6d548d1e7ac808c49c512`.

It keeps the frozen generic B-24 Mother unchanged and replaces the R11
single flattened art composite with seven independently adjustable layers:

1. shark mouth;
2. ROBBY;
3. “80 DAYS” title;
4. dice;
5. photo-derived eye source region;
6. mission-bomb source region;
7. Japanese flag source region.

The fixed visual-review entry is:

`b24-80days-r12-review-direct.html`

The stable runnable alias is:

`b24-80days-instance-r12.html`

## Deliberate correction

R11 painted red windshield/frame bands with world-coordinate horizontal and
vertical bars. That gave the appearance of precision without proving that the
bars corresponded to the actual frame meshes. R12 removes those red bars by
default. Glass stays transparent. Red frame paint must return only after a
verified frame-mesh binding exists.

## Historical constraints now enforced

- left and right sides are independent; R12 does not mirror the port art;
- the known-reference Japanese flag count is four, not the six used by the
  R11 materialization workflow;
- mission-bomb silhouettes remain photo-derived, yellow, and downward;
- the mission-bomb total is still unresolved and is not claimed as final;
- source artwork is retained; no replacement font, generated teeth, or
  substitute eye is introduced.

## Calibration behavior

Every component has its own photo-space rectangle. The review page can:

- select a component;
- move it by 2 or 10 source pixels;
- scale it around its center;
- hide/show it independently;
- reset to the checked-in R12 seed;
- export the current calibration JSON.

These controls are for registration, not proof that the seed is historically
accepted.

## Acceptance state

- `motherGeometryModified=false`
- `sourceRedrawn=false`
- `visualAcceptance=false`
- `productionReady=false`

R12 is a stronger calibration workbench, not a declaration that the final
“80 DAYS” livery has passed visual acceptance.
