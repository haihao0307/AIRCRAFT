# B-24J “80 DAYS” bilingual knowledge package

This directory is the authoritative research package for B-24J-25-CO `42-73257`, aircraft number `487`, “80 DAYS”.

## Purpose

The package stores the bilingual aircraft and crew knowledge layer that supports later historical livery production. It is research-ready and does not mark a final texture as approved.

## Contents

- `index.html`, `styles.css`, `app.js`: standalone bilingual web interface
- `data/knowledge-base.json`: aircraft, name meaning, photographs, people, final flight, locked facts and open questions
- `data/source-registry.json`: source pages, direct media URLs, archive identifiers, access dates and rights notes
- `data/source-registry.json` also preserves the byte counts and SHA-256 receipts for user-supplied originals. Original photo bytes stay outside ordinary Git history and are recovered through the source page or external asset bridge.
- `../../../schemas/aircraft-crew-group.schema.json`: shared structure for later aircraft and crew groups

## Production boundary

The knowledge package may feed livery research and review. It does not activate a livery, modify the authoritative B-24 model, alter the Gold runtime, or authorize a final texture bake.
