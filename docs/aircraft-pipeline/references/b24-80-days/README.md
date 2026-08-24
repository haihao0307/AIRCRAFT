# B-24J-25-CO “80 DAYS” external reference inventory

## Storage rule

The historical scans and review ZIP are external source assets. They are not embedded in this branch because of file size, provenance and licensing review. The asset bridge must provide them under their exact filenames before a final texture or symbol-count release.

Do not fabricate a missing file. Do not substitute a similarly named aircraft.

## Master package

| File | Bytes | SHA-256 | Verification |
|---|---:|---|---|
| `374BS_80_DAYS_review_pack_v2.zip` | 44,303,171 | `23428c52faf5f65d1fa97bf1402c9c4f8a3b721581ee6ba807a2ebe1cf52baee` | ZIP contains 40 files; archive test passes |

The package contains 8 direct “80 DAYS” images, 25 contextual 374th Bomb Squadron references, 4 contact sheets, a manifest, checksums and a Chinese readme.

## Direct-aircraft evidence files

| Evidence ID | External filename | ZIP path | Pixels | Bytes | SHA-256 | Principal use |
|---|---|---|---:|---:|---|---|
| E01 | `80_Days_China_2_1944.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E01_starboard_crew_STAM_mission_marks.jpg` | 1332×823 | 690,771 | `c47c5285d0b95abf61cd426f43bbfb6f550d29b9f180ee52606283cf306d0ed5` | Starboard `STAM`, title, dice, shark mouth, symbol rows |
| E02 | `80days.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E02_starboard_crew_title_dice_sharkmouth.jpg` | 1346×820 | 504,418 | `38a82d8ac32f98182aee2e38bd6e288c409faae8b39e515445bbb0cc4bc2eee3` | Starboard title, dice and shark-mouth paint edges |
| E03 | `80-days(1).jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E03_starboard_two_crew_STAM_position.jpg` | 640×490 | 89,210 | `4ffd9160fba0d00ffd47e4925bcddc55c4efde800e17e3b73afc26007b248c06` | Exact `STAM` location below upper rectangular window |
| E04 | `80_Days_asisbiz_left.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E04_port_nose_ROBBY_HUFF.jpg` | 2000×1243 | 1,006,009 | `07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa` | Port `ROBBY`, `HUFF`, title, dice, shark mouth and symbol rows |
| E05 | `80_Days_asisbiz_no487.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E05_port_front_ground_aircraft_487.jpg` | 1932×1455 | 1,327,936 | `67add5aa17bc09fb3ddfdcaadcd799d9a153ccd3a19d672c874871f23587f8ab` | Port-front nose geometry and curved shark-mouth wrap |
| E06 | `80_Days_asisbiz_inflight.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E06_port_inflight_full_aircraft.jpg` | 3744×2799 | 3,971,800 | `03453abd80fa7be489ef89a72c591d8d1800a3c7e2a00dca63b6e9ddbe831564` | Port full-aircraft scale and placement |
| E07 | `80_Days_asisbiz_right_inflight.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E07_starboard_inflight_full_aircraft.jpg` | 2000×933 | 814,824 | `2a4d1873055dbfef67f0416f4515b03e8489a566f6c451f4a133a09bf7b1043f` | Starboard full-aircraft scale, insignia and fin relationships |
| E08 | `80_Days_SDASM_10_0018697.jpg` | `374BS_80_DAYS_review_pack_v2/01_80_DAYS_original/E08_SDASM_10_0018697_nose_archive.jpg` | 640×419 | 76,204 | `760ed33486cf24f6191391dbea07c9ee08eda07bec3bc5099b7fce0f37eecab0` | Archive nose comparison, SDASM identifier 10_0018697 |

## Derived inspection crop

| File | Pixels | Bytes | SHA-256 | Use |
|---|---:|---:|---|---|
| `stam_crop_zoom.png` | 720×620 | 343,539 | `2dfdd44a6469f61d41dbe60954ba877effcb18235589bd2f7b5f8d0721839b1d` | Enlarged inspection crop of `STAM`; derived from direct source, not an independent source |

## Contextual photographs

The ZIP also contains B-24D and B-24J photographs from the 374th Bomb Squadron. They can support:

- general squadron paint practice
- weathering and maintenance context
- typical symbol-painting technique
- B-24 skin, rivet and panel treatment

They cannot prove “80 DAYS” side-specific art, symbol counts, crew-name placement, tail marking or color.

Files with `color_unverified` in their names are not approved color authorities.

## Required asset-bridge placement

Suggested local staging path:

```text
source-input/historical/308bg/374bs/80-days/
```

Expected files:

```text
374BS_80_DAYS_review_pack_v2.zip
80_Days_China_2_1944.jpg
80days.jpg
80-days(1).jpg
80_Days_asisbiz_left.jpg
80_Days_asisbiz_no487.jpg
80_Days_asisbiz_inflight.jpg
80_Days_asisbiz_right_inflight.jpg
80_Days_SDASM_10_0018697.jpg
stam_crop_zoom.png
```

## Intake validation

Before use:

1. Verify filename, byte count and SHA-256.
2. Record source page, collector or archive identifier when known.
3. Preserve the unedited original.
4. Store crops and contrast adjustments as derived assets with parent hashes.
5. Select one mission state before counting symbols.
6. Keep every count annotation and transformation in the release report.
