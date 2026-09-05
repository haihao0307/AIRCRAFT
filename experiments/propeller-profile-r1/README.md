# Propeller profile study: rejected representation, retained evidence

This directory is outside runtime and is not loaded by the workbench. The current numeric geometry remains unchanged. The local trial measures distances to the locked source mesh, not to an original engineering drawing or a manufactured blade.

Replay with Python 3.13.5, NumPy 2.3.5 and SciPy 1.17.0:

```sh
OPENBLAS_NUM_THREADS=1 python experiments/propeller-profile-r1/replay.py --source PATH_TO_PINNED_RUNTIME --out OUTPUT_DIRECTORY
```

The source is AIRCRAFT@b8b2a6c441fa9a9b7e0831f4217511b4968d266e and the script verifies its raw payload SHA-256. It reconstructs edge-connected plane/triangle intersection loops, aligns section phase, fits shared closed Fourier descriptors, writes float32 parameters, reads them back and validates 223 separately sampled sections. The script returns a report even when the numerical gate fails; a zero process exit is not a passed geometric gate. Always read numericalGatePassed.

The replay matched the original numerical results. Maximum local distance 0.005264386563130123 exceeded the preselected 0.004 gate, and cap/full-surface verification was not performed. No production replacement was made. These normalized-space distances must not be reported as metres or millimetres.

The experiment showed why a small generic section representation cannot be accepted from one attractive view or low mean error. Increasing span stations alone left local feature error. Chordwise models also need to handle the source's small overhangs. The next proposed representation separates root, main blade and tip and preserves feature curves; it has not yet been implemented or validated.
