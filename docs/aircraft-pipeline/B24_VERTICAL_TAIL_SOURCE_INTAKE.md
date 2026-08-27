# B24 vertical-tail priority source intake

## Purpose

This intake acquires the first two manufacturer-archive sources needed to calibrate the B24J-CO twin vertical-tail GeometryRecipe:

1. `B24-ENG-S002`, drawing numbers `D-1840` and `RD-6894`, Model 32 General Arrangement
2. `B24-ENG-S003`, B-24 three-views, wing and undercarriage details

The source binaries remain in a short-lived GitHub Actions artifact until rights, title block, revision and variant applicability are reviewed. The workflow commits no downloaded PDF to the repository.

## Intake sequence

1. Read `data/b24-engineering/source-intake/vertical-tail-priority-sources.json`.
2. Download each source from the registered Internet Archive item.
3. Follow redirects and record the resolved URL.
4. Verify HTTP success, minimum byte count and PDF magic bytes.
5. Compute SHA256.
6. Run `pdfinfo` and record page count, page size and PDF metadata.
7. Extract layout-preserving text with `pdftotext`.
8. Render every page to PNG with `pdftoppm` for visual title-block and drawing inspection.
9. Create a combined intake manifest.
10. Upload PDFs, manifests, text, metadata and rendered pages as one Actions artifact.

## Approval boundaries

A successful download proves only that the registered bytes were acquired and are readable as PDF.

The following remain false after intake:

```text
titleBlockApproved
variantApplicabilityApproved
rightsApprovedForRepositoryCommit
drawingCalibrationApproved
geometryUseApproved
```

Visual inspection must confirm:

- drawing number and title
- revision and change state
- scale and units
- view convention and alignment
- B-24J-CO applicability
- aircraft datum and station references
- vertical-tail outline and installation relationship
- scan skew, stretch and local distortion

## Geometry-use rule

No curve, section, distance or angle enters GeometryRecipe until its source region, calibration transform, derivation and approval state are recorded.

The General Arrangement can establish overall relationships and datum candidates. The three-view sheet can assist silhouette and view alignment. Structural and parts-manual sources are still required for installation details, sections, hinges, skin, ribs, spars and fasteners.

## Artifact contents

```text
_intake/
  download-manifest.json
  combined-intake-report.json
  B24-ENG-S002/
    source PDF
    intake-record.json
    pdfinfo.txt
    extracted-text.txt
    renders/page-*.png
  B24-ENG-S003/
    source PDF
    intake-record.json
    pdfinfo.txt
    extracted-text.txt
    renders/page-*.png
```

## Current status

```text
source configuration prepared    true
repeatable downloader prepared   true
workflow prepared                true
source bytes acquired            pending Actions run
title blocks reviewed            false
vertical-tail calibration        false
geometry use approved            false
```
