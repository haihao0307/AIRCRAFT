# B-24 Weapons Mother M2 source candidates V001

Each review page is one standalone HTML file with its source GLB embedded. The Three.js review runtime is loaded from the repository-standard jsDelivr import map.

Open `index.html` for the local one-click launcher. It uses only local CSS and the checked-in QA thumbnails; its three buttons link directly to the standalone review pages below.

- `m2-browning.html` — `m2_browning.glb`
- `m2-browning-50cal-machine-gun.html` — `m2_browning_.50_cal_machine_gun.glb`
- `browning-m2.html` — `browning_m2.glb`

These pages are source-intake viewers, not approved B-24 weapon modules. They preserve the supplied GLB bytes, use a separate display-only normalization transform, expose locked source-axis views and mesh visibility, and show provenance and runtime complexity.

## Intake findings

| Candidate | Source scene contents | Triangles | Estimated decoded texture memory | Scale status |
| --- | --- | ---: | ---: | --- |
| `m2-browning` | gun, pedestal or mount, and ammunition box | 44,431 | 90.67 MiB | approximately 1.642 source units long; plausible meter-scale candidate, not approved |
| `m2-browning-50cal-machine-gun` | gun, ammunition and links, turret mount, and large base | 809,984 | 128.00 MiB | approximately 3.225 source units across the complete assembly; unresolved |
| `browning-m2` | gun, ammunition-related parts, and circular presentation base | 207,207 | 48.00 MiB | approximately 227.907 source units long; unit conversion required |

All three source GLBs pass the Khronos glTF Validator with zero errors and zero warnings. The first candidate contains informational unused UV attributes and one empty node. All three carry CC BY 4.0 metadata; attribution remains visible in each review page.

The user must still identify which candidate corresponds to which B-24 installation and where it belongs. Until then, weapon identity, source scale, mount point, firing behavior, and airframe interface remain unresolved.

Image2ThreeJS and similar image-to-3D workflows are disabled and are not part of these pages or their build process.
