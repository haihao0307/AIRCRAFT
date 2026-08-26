# Model acquisition policy

Every candidate model is evaluated for exact airframe variant, source, author, license, modification rights, redistribution rights, geometry quality, moving-part separation, animation, UV, materials, and browser loadability.

Accepted paths:

1. Approve an accurate, licensable source model and lock its bytes and SHA-256.
2. Repair a licensable source model while keeping the original lock and creating a separate derived-model lock.
3. Build a measured prototype from drawings and photographs for silhouette, hierarchy, and animation planning.
4. Replace a prototype only after a production model passes the full source and geometry gate.

Image-to-procedural-model tools may support prototype studies. Their output remains `prototype` until dimensions, structure, license, moving parts, and visual accuracy are independently approved. Prototype output cannot silently replace an authoritative model.
