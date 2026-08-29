# 英文来源与核对记录

## 用户提供的主文章

- Dan Greenheck, “10 Noise Functions for Three.js TSL Shaders”
- https://threejsroadmap.com/blog/10-noise-functions-for-threejs-tsl-shaders
- 本轮直接抓取返回 403。英文搜索索引用于核对十项标题与顺序。除 V001 已保存的 Ridged 截图转录外，本包没有声称恢复其余九项文章代码。

## Three.js 官方资料

- TSL documentation: https://threejs.org/docs/pages/TSL.html
- TSL specification: https://threejs.org/docs/TSL.html
- TSL roadmap issue: https://github.com/mrdoob/three.js/issues/30849
- Current TSL simplex and curl source: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/tsl/math/curlNoise.js

官方资料用于确认当前 Three.js TSL 提供 `hash`、`snoise`、`snoiseVec3`、`curlNoise` 等能力。它们仍需在飞机生产线锁定版本内真实编译。

## 主来源算法参考

- Ashima Arts and Stefan Gustavson WebGL Noise: https://github.com/ashima/webgl-noise
- Stefan Gustavson PSRD noise: https://github.com/stegu/psrdnoise

这些来源用于理解经典 Perlin、Simplex 及相关 GLSL 实现和许可边界。V002 没有把第三方代码直接复制进 B24 页面。
