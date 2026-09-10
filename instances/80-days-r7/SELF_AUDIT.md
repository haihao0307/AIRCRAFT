# 80 DAYS R7 · REGISTRATION SELF AUDIT

Status: `single-window-affine-rejected`

R7 compared five Mother-01 glass hypotheses against the same E04 photo-coordinate sheet without changing the shark-mouth/dice geometry.

## Fixed-view result

All five simple single-window affine registrations are rejected as final restoration transforms.

- `69`: least catastrophic visually, but still produces a mouth that is too narrow/low and pushes the dice too far aft. Its identity as the E04 traced window is not established.
- `59`: mouth becomes too deep/low and intrudes around the lower nose; rejected.
- `63`: mouth becomes too large and crosses the greenhouse/lower nose relationship incorrectly; rejected.
- `7`: registration drives the mouth down to the belly and the dice toward the wheel area; rejected.
- `8`: the affine projection moves most of the art away from the visible painted skin; rejected as an affine transform.

The screenshots are evidence for rejecting the transforms, not proof that the underlying glass component itself is wrong.

## New evidence from normalized window-shape matching

A separate geometry-only comparison split Mother node `1723` into 548 connected glass components and compared the E04 17-point window polygon against each candidate after normalization.

Top scores:

1. component `8`: score `0.7563`, IoU `0.8019`
2. component `81`: score `0.7438`, IoU `0.8015`
3. component `7`: score `0.6744`, IoU `0.8052`
4. component `80`: score `0.6737`, IoU `0.8047`
5. component `69`: score `0.6561`, IoU `0.7892`

Therefore `component 69` must not remain the preferred identity hypothesis merely because its affine projection happened to keep the mouth inside the fuselage envelope. The best geometric-shape hypothesis is currently the `8/81` pair.

## Interpretation

The combination “component 8/81 matches the photographed window shape best, but the one-window affine texture transform looks wrong” is evidence that the registration model is under-constrained and perspective-distorted. It does **not** justify altering the historical mouth/dice paths to make an affine transform look better.

## Next gate

1. keep `8/81` as the leading window-identity hypothesis, not truth;
2. derive a projective registration from the photographed window polygon to the actual connected-glass polygon, rather than center/width/height scaling;
3. add a second independent structural correspondence (frame/seam/gun mount or another photographed window) before locking the transform;
4. if no two-anchor transform can satisfy the photograph and Mother-01 nose structure simultaneously, record an instance nose-configuration mismatch and correct the aircraft instance structure before livery.

`visualAcceptance=false`
`productionReady=false`
