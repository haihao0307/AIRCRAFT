# V017 frozen component map

| Component | Runtime source | V017 handling |
| --- | --- | --- |
| Native B24 geometry and hierarchy | `assets/native.*.gz`, `native-aircraft.js` | Frozen byte-for-byte |
| Propeller, landing gear and bomb-bay animation | inherited source tracks in payload | Frozen byte-for-byte |
| Grass airfield and runway | `world.js` | Frozen byte-for-byte |
| 330-second mission and flight path | `mission.js` | Frozen byte-for-byte |
| Releases and explosions | `effects.js` | Frozen byte-for-byte |
| Flight sound | `audio.js` | Frozen byte-for-byte |
| Renderer and orbit controls | `vendor/` | Frozen byte-for-byte |
| Workbench identification and preservation view | `index.html`, `style.css`, `app.js` | V017 review shell |

Weather, mountains, Weapons Mother and img2threejs remain outside this first V017 review.
