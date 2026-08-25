# B-24 flight runtime v0.9.6 Gold

The approved standalone HTML and its distribution package are checksum-locked in `runtime.lock.json`.

Materialize the standalone source with:

```bash
npm run materialize:runtime -- /absolute/path/to/source.html
```

The command reads the entire local file, calculates SHA-256, rejects every mismatch, and writes an atomic copy to `public/runtime/b24/v0.9.6/index.html` only after verification.

The generated public copy remains outside ordinary Git tracking. Any behavior change requires a new runtime version and a new lock record.
