# B24 Native Review V008

## Purpose

Retain the V007 direct-native whole-aircraft baseline while restoring the visual quality lost during the first no-UV surface transition.

## Locked decisions

- The public review view keeps the external airframe fully opaque.
- The public mechanical-transparency control is removed.
- The manual propeller-hide option is removed.
- Propeller blur remains controlled by the temporary flight-state bridge.
- Fuselage skin continues to avoid the legacy UV atlas and legacy raster surface overlays.
- Standard components use independent numeric materials derived from the locked reference model and reviewed component roles.

## V008 changes

1. Smooth shading now gives 97% weight to inherited vertex normals and uses the geometric derivative normal only as a fallback.
2. Glass is recalibrated as a dedicated low-roughness translucent material.
3. Propeller blades use a no-UV local-coordinate surface program for dark blades, yellow tips and compact stencil marks.
4. Cowl flaps, engine mechanisms, landing-gear mechanisms, wheels, hubs and interior details use separate numeric material rules.
5. Legacy surface overlays and replaced waist-gun meshes remain excluded from the live draw list.
6. Normal review can no longer reveal internal systems by enabling exterior transparency.

## Direct-native payload

The geometry and animation payload remains unchanged:

- components: 1,784
- meshes: 348
- vertices: 307,273
- triangles: 325,358
- animation tracks: 2,518
- payload bytes: 16,647,376
- payload SHA256: `7ba1b923844f5161911e9aa63b18191e0d08ff8de4b3750204aa544320bd34c2`

## Current approval status

- `visualReviewCandidate=true`
- `visualParityApproved=false`
- `engineeringAccuracyApproved=false`
- `nativeMasterApproved=false`

V008 is a visual-quality checkpoint. Drawing-led correction and component-level approval remain open.
