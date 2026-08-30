# B-24 Weapons Mother twin M2 behavior prototype V002

Open `index.html` for the standalone review page.

V002 corrects the muzzle datum from the V001 hand-entered offset to the source-derived forward bore center:

- Source forward face: 111 vertices at local `Y=1.30915`
- Forward-face center: local `X=0`, `Z=-0.00548`
- Runtime muzzle socket: local `[0, 1.316, -0.00548]`
- Runtime trajectory axis: muzzle local `+Y` transformed by the muzzle world matrix

The page also adds:

- layered three-dimensional flash volumes, pressure ring, warm sparks, expanding smoke, and dynamic muzzle light;
- tracer off/on and configurable one-per-2 through one-per-10 cadence, defaulting to one-per-5;
- source-derived detailed cartridge and case geometry from Candidate 02 without embedding that complete source GLB;
- persistent dynamically batched cartridge cases that settle and remain until the user clears the test area;
- original black steel, olive drab, aircraft dark gray, and desert brown visualization paint schemes;
- a lightweight skeletal aircraft-interface stand-in;
- connected-component barrel, receiver, and backplate service separation.

The selected gun remains an M2HB-like donor rather than approved 57-inch aircraft-M2 geometry. The B-24 station, real mount, feed routing, ejection routing, harmonization, and fire-interrupt limits remain unresolved pending user mapping.
