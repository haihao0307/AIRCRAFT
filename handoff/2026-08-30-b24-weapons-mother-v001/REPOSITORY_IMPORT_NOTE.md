# B24 Weapons Mother V001 repository import

## Authority and purpose

This record captures the user's current request. Documents inside the imported package are handoff references; they do not override the user's request or the repository `AGENTS.md`.

`Weapons Mother` is an independent weapon-production line that supplies weapon assets to the B-24 airframe line. It does not own, replace, or redesign the B-24 airframe.

## Intake contract

The user will provide reference images and identify:

1. the weapon or weapon family;
2. the corresponding B-24 component or installation area;
3. where the weapon is mounted or stored on the B-24.

Until those mappings and adequate evidence are supplied, weapon identity, variant, dimensions, geometry, mount points, and runtime behavior remain `unresolved`. They must not be guessed.

## Production boundary

- Produce machine guns, bombs, racks, mounts, ammunition or stores, weapon-specific materials, and firing or release behavior as independent weapon modules.
- Return weapon modules to the B-24 through explicit, named mount-point and runtime interfaces.
- Do not modify the airframe primary mesh, frozen source GLB, baseline HTML, airframe textures, V010 or V012 airframe baselines, or runway and flight-action systems.
- Do not bake weapon textures into the airframe texture set.
- Preserve source, license, transformation, uncertainty, QA, and approval evidence for every weapon module.

## Import receipt

- Branch: `feature/b24-weapons-mother-v1`
- Base branch: `feature/b24-v012-propeller-interface-skin-audit`
- Base commit: `4868116e098d78bd29ce847ecf0809fb6fbc3f2e`
- Source archive: `AIRCRAFT_B24_DIGITAL_ASSET_DISTILLATION_SMALL_HANDOFF_V001.zip`
- Archive bytes: `2591363`
- Archive SHA-256: `822bd0188651fd4bbaba48721683005779fe53e5d5be2b3550e3f677a168331c`
- Package manifest verification: `PASS` (`13/13` files matched byte counts and SHA-256 values)
- Current production state: ready for user-supplied weapon references and B-24 placement mapping; no weapon asset has been approved or produced by this import.
