# B24 V017.1 validation history

2026-09-05. The first Actions run 33958506160 on source 83413cf18cc5fb7696ab6c98f95cd2b2d897c563 passed 10 logic tests and exact native-payload verification. Browser assertions passed 33/40. Seven effect-state assertions failed; no runtime console error was recorded. The failed report and screenshots remain in artifact 9967179318. Do not rewrite this run as passed.

Screenshots independently showed the blade exposure and impact framing while the preceding assertions had read false. The test used fixed 100 to 700 ms sleeps on a software-rendering runner that reported about 2 frames/s in a short sample. This indicated a state-read/render timing problem.

At 96c73abf091f6f60eecc55c74d4b6121f8f9c8af the test was changed to wait for a completed render after each atomic state mutation, never wait for the desired assertion value. Production effect code was unchanged. Added checks cover rewind reproducibility, manifest parent identity, hidden blur after reset and raw in-browser payload SHA-256. Run 33958792522 passed 48/48 browser assertions and 10/10 logic tests; resulting full-runtime commit e50e0a0071d1c1c54dab7ccbefb3c129ea35f130. This supports the timing diagnosis for the first run.

Screenshot inspection also found cropped wings and a wrapped heading at portrait width. The following bounded presentation patch preserves horizontal camera coverage on portrait screens and shortens the heading layout. Impact close-up framing and desktop projection remain unchanged. No source model, source animation, flight path, airfield or material parameter is altered by this patch. Its new verification must be read separately from the passing earlier run.

All browser tests use real headless Chromium with SwiftShader at 1440x900 and 390x844. Viewport emulation is not a physical mobile-device performance test. Eighteen phases are reached by explicit seek operations; an uninterrupted real-time 330-second flight is not claimed. Artistic wear, exposure sampling and visual roll remain presentation approximations awaiting user review. The accepted V017 baseline remains preserved independently.
