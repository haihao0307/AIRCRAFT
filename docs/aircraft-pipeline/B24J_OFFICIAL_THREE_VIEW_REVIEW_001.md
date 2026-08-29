# Official B-24J three-view review 001

## Source identity

The first official J-variant orthographic source has been acquired and reviewed.

```text
source id           B24-ENG-S016
source document     AN 01-5E-3
source page         ix
subject             Consolidated B-24J Liberator
credited author     U.S. Military
host                Wikimedia Commons
rights              public-domain U.S. federal government work
workflow run        33035435495
artifact id         9631818927
```

The hosted file is a cropped manual-page illustration. The image itself does not show the manual header, printed page number, drawing number, revision or title block. Its manual-page identity is therefore retained through the host provenance record while complete-page cross-check remains open.

## Locked image files

### Original uploaded scan

```text
bytes               6,721,623
SHA256              de0819d07d35f37126ed62b3a6f02131aaded7cbaa5c49ce63187f72dab0f5b6
dimensions          2,032 x 2,442 pixels
PNG                  8 bit, color type 2
last modified       2023-03-22
role                 source-image provenance and future calibration pixels
```

### Cleaned review derivative

```text
bytes               453,910
SHA256              07449d0a39a22ae71851025960a9f0725f9ee3041d0ea6e1e6b6d03b29951df6
dimensions          2,032 x 2,442 pixels
PNG                  8 bit, color type 3
last modified       2025-06-03
role                 line-visibility aid only
```

The cleaned file has the same dimensions and major view alignment. Its paper background has been removed or whitened and the linework has been darkened. A deterministic threshold check found that all cleaned pixels below grayscale 128 occur over original pixels below grayscale 200 at the same coordinates. It also found that 99.628 percent of original pixels below grayscale 128 lie within two pixels of a cleaned pixel below grayscale 128.

These metrics support major line preservation at the present resolution. They do not prove tonal equivalence, subpixel equivalence or the preservation of every fine annotation. The original scan remains the source-of-record.

## Visible content

The illustration contains:

1. plan view
2. front or rear view
3. side view
4. major aircraft dimensions
5. major component spacing dimensions
6. wing, horizontal-tail and vertical-tail area summaries

A visible note states that the illustration applies only to aircraft with nose and ball turrets. This configuration qualification must remain attached to every derived measurement.

The vertical-tail work can use the illustration for limited orthographic research because it visibly shows:

1. twin-fin lateral spacing
2. tail vertical envelope
3. fin and rudder side silhouette
4. plan-view placement relative to the horizontal tail
5. solid and dashed linework that may indicate hinge, balance or hidden geometry

The illustration does not establish section profiles, thickness, skin construction, spar and rib layout, hinge hardware or installation fasteners.

## Visible annotation candidates

```text
wingspan                              110 ft 0 in
overall length                         67 ft 7 5/8 in
overall height                         17 ft 11 in
twin-tail lateral span                 26 ft 0 in
tail vertical dimension                 9 ft 3 7/16 in
wing area, total                     1,048 sq ft
horizontal-tail area, total           192 sq ft
vertical-tail area, total             188 sq ft
```

The first three values can later anchor whole-aircraft view calibration. The 26-foot value is a candidate spacing anchor. The precise endpoints and engineering meaning of the 9-foot 3 7/16-inch value still require confirmation from the complete manual page and related diagrams.

None of these annotations currently authorizes production geometry. A recorded pixel region, endpoint definition, view transform and derivation are still required.

## Open source conflict

The Model 32 General Arrangement lists a candidate vertical-tail total area of 181.2 square feet. The official B-24J illustration lists 188 square feet.

```text
conflict id          B24-VTAIL-CONFLICT-001
S002 value           181.2 sq ft
S016 value           188 sq ft
status               unresolved
```

Possible explanations include variant or configuration difference, revision difference, a change in the definition of included balance area, or an unread scan annotation. No explanation has been selected. The conflict blocks area-derived scaling, variant approval and production geometry approval.

## Approved scope

The following are now approved:

```text
source-description provenance                    true
public-domain rights status                      true
original and cleaned image locks                 true
image integrity                                  true
B-24J illustration identity                      true
limited orthographic silhouette research         true
```

The following remain closed:

```text
cleaned derivative as geometry authority         false
complete manual-page cross-check                 false
absolute drawing calibration                     false
vertical-tail production geometry use            false
vertical-tail source set                         false
```

## Next work

1. Obtain or verify the complete page ix context and neighboring structural-repair pages.
2. Define exact pixel rectangles for the three orthographic views using the original scan.
3. Establish separate calibration transforms for plan, side and front or rear views.
4. Confirm the front or rear convention and the 9-foot 3 7/16-inch dimension endpoints.
5. Resolve the 181.2 versus 188 square-foot conflict.
6. Acquire tail structure, installation, hinge and skin pages from AN 01-5E-3, AN 01-5E-4 and ZE-32-047.
7. Keep GeometryRecipe, AssemblyGraph and BehaviorGraph approval closed until those checks pass.
