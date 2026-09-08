# R8 evidence

Browser screenshots and qa.json were generated from clean commit 73e22dc003de56c8aaeb22c20367366449c36821, using local Chrome/SwiftShader. All 50 checks passed. The 4,558 side-sill rays and 2,173 underside rays had no misses at their sampled positions. All four marking placements and their sampled source-surface points exactly match R7.

Fixed preview: https://rawcdn.githack.com/haihao0307/AIRCRAFT/73e22dc003de56c8aaeb22c20367366449c36821/b24-generic-skin-closed-doors-r8.html

bay-section-before.png and bay-section-after.png are offline cross-section diagnostics, not browser captures. Orange is the source forward-port door chain; blue is existing surrounding source geometry. They were generated from the hash-locked external bay package with tools/fit-b24-r8-bay.py. rigid-fit-audit.json independently verifies that all members of each chain receive one common rigid transformation, preserving source scale and relative slat geometry. screenshot-sha256.json distinguishes every image by exact bytes.

See ../../docs/b24-generic-skin/R8.md for source references and limits. Static closed-pose validation is separate from animation, manufacturing accuracy, physical-device performance and user visual acceptance.

Public URL verification also passed: all five changed HTML/JavaScript files matched their Git blobs byte-for-byte. Chrome loaded the actual public aircraft after clicking the hosting provider's initial "Open the page" notice, verified the full payload hash, 348 meshes, 60 bay parts and 12 marked blades, and captured the public engine and bay close-ups without browser or aircraft HTTP errors. The notice is a hosting interstitial; first-time visitors may need to click its button. Public checks are in public-files.json and public-browser.json.
