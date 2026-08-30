# B-24 twin aircraft M2 behavior prototype V001

index.html is a standalone review page with the selected m2_browning.glb source embedded. Three.js is loaded from the repository-standard jsDelivr import map.

The page provides:

- two shared-geometry gun instances with stable gun_L and gun_R roots;
- independent recoil cycles and shot scheduling;
- muzzle flash, pooled tracer projectiles, belt-feed stepping, and pooled shell-case ejection;
- continuous fire, single-shot, gun selection, rate, time-scale, yaw, and elevation controls;
- twin-assembly separation and semantic socket inspection;
- visible source attribution, modification notice, and unresolved engineering boundaries.

The donor M2_0 node is still a fused M2HB-like visual. The current recoil moves the complete donor visual and is explicitly an approximation. Exact aircraft M2 geometry, twin spacing, feed routing, ejection routing, harmonization, and fire limits remain unresolved until the user assigns the B-24 station and turret.

Rebuild from the locked source:

    python tools/build-weapons-mother-aircraft-twin.py --source 'G:\飞虎队十四航空队\各种机型\B-24_CBI\m2_browning.glb' --output 'preview\weapons-mother\b24-m2-aircraft-twin-v001\index.html' --manifest 'records\B24_WEAPONS_MOTHER_M2_AIRCRAFT_TWIN_BUILD_V001.json'

The build fails closed if the selected source byte count or SHA-256 changes.
