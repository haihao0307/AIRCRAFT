# B24 vertical-tail priority source review 001

## Review basis

GitHub Actions run `33034102484` downloaded, hashed, inspected and rendered the first two registered sources for the B24J-CO vertical-tail pilot. The artifact contains the original PDFs, intake manifests, PDF metadata and six full-page renders.

```text
artifact            b24-vertical-tail-priority-source-intake
artifact id         9631369355
artifact bytes      89,756,519
artifact SHA256     4a0be2c3f2cb717f408d9409308deadef42eb012019e1bbc4535a99869f57cc4
expires             2026-09-26
```

## B24-ENG-S002

```text
file                D-1840 / RD-6894 Model 32 General Arrangement
PDF bytes           4,492,789
PDF SHA256          5ad3742e0462d4a7f2c44ade8b990b11e6ef77141565fb4c9804e9d507ef970e
pages               1
embedded scan       5,400 x 10,570 px JPEG
```

The sheet visibly identifies itself as:

```text
GENERAL ARRANGEMENT
B-24 CONSOLIDATED MOD. 32
```

It contains whole-aircraft orthographic views, a perspective sketch, dimensions, area data, control-surface movements, airfoil references, center-of-gravity data and weights.

The scan has heavy fold staining, uneven exposure, edge damage and a partially illegible title block. `D-1840` and `RD-6894` are currently confirmed by archive filename metadata. Their exact location in the damaged title block has not been visually confirmed.

Clearly visible candidate data relevant to the first component include:

```text
vertical tail total area                         181.2 sq ft
fins including rudder balance, total             132.3 sq ft
fin, each                                          60.65 sq ft
rudder, total                                     text appears 59.9 sq ft
each rudder including tab aft of hinge line        24.45 sq ft
rudder tabs, total                                text appears 1.3 sq ft
rudder travel                                     30 degrees each side
vertical-tail airfoil entry                       0007
```

These values remain candidates. Model 32 applicability to B-24J-CO, revision, date, scale, scan distortion and exact title-block identity still require resolution. No candidate has entered GeometryRecipe or BehaviorGraph as approved data.

## B24-ENG-S003

```text
file                B-24 3-views, wing and undercarriage details
PDF bytes           606,488
PDF SHA256          4af64c224942c5225cbf784f52a8e17d4ab49d4de5990f0e0f91add7feea63bf
pages               5
```

Visual review shows that this PDF is a mixed secondary compilation:

1. Page 1 is a `CONSOLIDATED B-24E` drawing from *Model Airplane News*, February 1944, with a handwritten `B-24H` annotation.
2. Page 2 is marked `B-24H`; its publication title is not visible.
3. Page 3 is a `B-24J Specifications` summary page with a general three-view.
4. Page 4 is A. Granger's 1979 Aerodata International No. 11 Plate 2 for B-24D-CO and B-24E-FO, scale 1/72.
5. Page 5 is A. Granger's 1979 Aerodata International No. 11 Plate 4 for B-24D-CO and B-24E-FO, scale 1/72.

The file has therefore been reclassified:

```text
old candidate grade      A
reviewed grade           D, secondary comparison only
```

It remains useful for visual cross-checking and discovering questions. It cannot control B-24J-CO geometry, installation, sections, motion or manufacturing detail.

## Corrected source route

The mixed S003 file created a source gap. A stronger source has now been registered for intake:

```text
source id            B24-ENG-S016
subject              official B-24J three-view
source document      AN 01-5E-3, page ix
author                U.S. Military
rights                public domain in the United States
```

The next intake will preserve both the original archived scan and a cleaned review derivative, calculate hashes, inspect dimensions and verify that the image represents the J variant before it becomes an orthographic silhouette source.

## Approval state

```text
S002 source bytes verified                    true
S002 limited candidate use                    true
S002 B24J-CO geometry use                     false
S003 source bytes verified                    true
S003 secondary reclassification               true
S003 production geometry use                  false
official B24J three-view acquired             false
vertical-tail source set approved             false
vertical-tail GeometryRecipe approved         false
```
