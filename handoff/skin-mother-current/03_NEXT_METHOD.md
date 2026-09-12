# Skin Mother — Next Method

This method is intentionally specific to the Skin Mother / livery line. Do not generalize it to unrelated Mothers whose work genuinely requires more complex systems.

## Port side first

Use the known left-side historical photo as the visual authority for the first pass. Preserve the R6 photo-derived artwork contours, but replace the bad registration logic.

Use only a few explicit placement controls:

- one or two visible aircraft structure references,
- horizontal/longitudinal offset,
- vertical offset,
- scale,
- local orientation if needed,
- minimal curvature wrap onto the existing fuselage skin.

The existing world-space skin shader approach can be retained if useful, but its photo origin/scale should be set directly from visual measurement rather than inferred from a guessed glass component.

## Same-view comparison loop

After each meaningful adjustment:

1. Render the aircraft from the historical-photo side/view.
2. Compare mouth, text/dice/name positions against the same visible aircraft structures in the photo.
3. Correct only the placement parameter that explains the mismatch.
4. Repeat until the reconstruction is visually close.

## Preserve factual uncertainty

Do not fill missing or occluded details by guess. If a title outline, mission-mark count, eye detail, or starboard marking is not supported by source evidence, keep it unresolved until the correct source is recovered.

## Starboard later and independently

After the port side is visually stable, repeat the same direct process using the independent right-side reference. Do not mirror the port artwork.

## Public delivery gate

A new version is not delivered merely because CI is green. Before calling a visual candidate complete:

- produce a fixed-commit HTTPS preview,
- actually open it,
- verify desktop and 390×844 mobile behavior,
- compare the relevant historical view,
- keep `visualAcceptance=false` until user approval.
