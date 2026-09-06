# B24-first W04: sideplate face direction and provisional metal appearance

2026-09-06. Incremental visual work after W03. This is one independently generated exterior sideplate candidate, not a complete Aircraft Browning M2 or a verified B24 gun station. W02/W03 and reference archives remain unchanged. Rejected S01/R01 are not dependencies.

## Actual new work

W03's two cap profiles produced inward-facing surfaces. W04 explicitly generates outward visible caps and keeps their attachment interfaces open. A DoubleSide display can conceal such an error, so winding was separately inspected numerically and a front/back diagnostic view added.

Five source-view depth probes did not find a complete opposing rear surface. W03's filled rear plane was therefore not adopted into W04. The visible exterior envelope and relief-depth differences are preserved as source-derived appearance ratios; no wall thickness, manufacturing dimensions or historical physical tolerances are certified. Original source data remain unchanged. These are observations about the uploaded digital reference, not new original-drawing findings.

Matching analytic subdivisions repair shoulder T-junctions. Fixed-error sampling replaces some uniform subdivision. The final candidate has 4,904 triangles versus W03's 7,238, partly because unobserved back faces were omitted. It still has more triangles than the reference's selected sideplate. No measured GPU speedup is claimed.

surface.js is newly authored. It separates modest color variation, roughness and shallow normal perturbation, using stable part-rest coordinates and finite spectral budgets. Each wave is attenuated using an approximate pixel footprint. This does not prove full nonlinear PBR is alias-free. Linear base color is explicit and color/data diagnostic output handling is separated. Film defaults to zero; no generic rust or white-edge pattern is added. The grey metal palette is an art-directed candidate, not a period finish measurement. Original B24 installation, finish documentation and complete exterior reconstruction remain incomplete.

## Boundary and source

Temporary comparison input: the user's confirmed Aircraft GLB, SHA-256 2d6a1f323018523db42d1fe54dcf1a26661f139548134835779933d61ab68c8b. ReferenceInput checks the whole file, then displays source node 25 for comparison only. Before any source is selected, the independent candidate already exists. No reference file is uploaded or retained in browser storage, no sampled source vertices or UV table is embedded in the recipe. Source author metadata: Misja van Laatum, AN/M2 Browning .50 cal aircraft machine gun, CC-BY-4.0. This fitted appearance adaptation retains attribution; it is not a claim of original historical authorship or exact replication.

Permanent workbench inputs are readable scripts, recipe parameters and provenance. Generic Three.js r170, OrbitControls and their license are bundled. Renderer environment buffers and rule-generated triangles are transient. No product mesh or raster product texture is shipped.

## Verification performed before source publication

29 Node tests passed. Real browser interaction used the full HTML and the actual optional local reference in an isolated headless Chromium 143.0.7499.4 session with a private virtual display. Desktop 1500x950 and mobile-sized 390x844 viewports passed 40 and 41 checks. The full document was injected; local file/public navigation was not tested by those runs. There were no script/shader errors or network requests in these local checks. Reference input and independent geometry remained unchanged. Five silhouette comparisons were approximately 0.991 to 0.999 overlap; they do not establish depth, material or historical accuracy. Surface winding is consistent for the six generated components; three are deliberately open exterior shells, so no closed-solid or physical volume claim is made.

Public URL deployment and the separate actual-navigation public_check.py results require their own completion receipts. No deployment is inferred from the presence of this file. Local qa.py, detailed numerical tests and complete logs are in the user delivery package. Build/runtime source, Node tests and public navigation check are stored in this directory.

## Build

Download the pinned r170 three.module.js, examples/jsm/controls/OrbitControls.js and LICENSE into a temporary vendor directory; names and exact hashes are checked by build.py. Run:

python build.py --vendor /path/to/vendor --output /path/to/B24_ANM2_W04_DETAIL.html
THREE_MODULE=/path/to/vendor/three.module.js node --test test_recipe.mjs
python public_check.py https://published-entry/ --out /path/to/report

The build reads no product model or image. public_check.py needs Python Playwright and Pillow. Browser execution remains isolated from the user's desktop. This turn did not run Blender or create autonomous overnight work.

## External method references read this turn

Three.js Color Management: https://threejs.org/manual/en/color-management.html
PBRT Noise, especially footprint filtering: https://www.pbr-book.org/3ed-2018/Texture/Noise
Adobe Metal Edge Wear node inputs: https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/nodes-reference-for-substance-graphs/node-library/mesh-based-generators/mask-generators/metal-edge-wear

These are general graphics references, not historical material evidence. No B17 research or manufacturing CAD was added. The separately attached external project link was not adopted.
