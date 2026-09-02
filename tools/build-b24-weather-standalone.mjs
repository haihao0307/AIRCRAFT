#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const glbPath = path.resolve(args.get('--glb') || process.env.B24_GLB || 'b-24_liberator.glb');
const weatherDir = path.resolve(args.get('--weather-dir') || process.env.WEATHER_DIR || 'weather-mother-clean-v1');
const outputDir = path.resolve(args.get('--output-dir') || process.env.OUTPUT_DIR || 'dist/b24-weather-standalone');
const weatherCommit = args.get('--weather-commit') || process.env.WEATHER_COMMIT || 'b5dd480efef00a05b1030ad723b402fe634025c3';
const buildCommit = process.env.GITHUB_SHA || args.get('--build-commit') || 'local-build';
const outputName = 'B24_WEATHER_MOTHER_STANDALONE.html';
const outputPath = path.join(outputDir, outputName);
const manifestPath = path.join(outputDir, 'B24_WEATHER_MOTHER_STANDALONE_MANIFEST.json');

const SOURCE_LOCK = Object.freeze({
  file: 'b-24_liberator.glb',
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
});

function readText(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required text file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function replaceRequired(source, matcher, replacement, label) {
  const next = source.replace(matcher, replacement);
  if (next === source) throw new Error(`Required build replacement did not match: ${label}`);
  return next;
}

function inlineScript(value) {
  return value
    .replaceAll('</script', '<\\/script')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function jsLiteral(value) {
  return JSON.stringify(value)
    .replaceAll('</script', '<\\/script')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function requireFiles(directory, names) {
  for (const name of names) {
    const file = path.join(directory, name);
    if (!fs.existsSync(file)) throw new Error(`Missing Weather Mother asset: ${file}`);
  }
}

fs.mkdirSync(outputDir, { recursive: true });
const temporaryDir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || outputDir, 'b24-weather-build-'));

const glb = fs.readFileSync(glbPath);
const glbHash = sha256(glb);
if (glb.byteLength !== SOURCE_LOCK.bytes || glbHash !== SOURCE_LOCK.sha256) {
  throw new Error(`Locked B24 source mismatch. bytes=${glb.byteLength}, sha256=${glbHash}`);
}

requireFiles(weatherDir, ['index.html', 'engine.js', 'field-worker.js', 'cloud.glsl', 'motion.js']);
let weatherHtml = readText(path.join(weatherDir, 'index.html'));
let weatherEngine = readText(path.join(weatherDir, 'engine.js'));
const weatherWorker = readText(path.join(weatherDir, 'field-worker.js'));
const weatherShader = readText(path.join(weatherDir, 'cloud.glsl'));
const weatherMotion = readText(path.join(weatherDir, 'motion.js'));

weatherEngine = replaceRequired(
  weatherEngine,
  "const baseURL=new URL('.',document.currentScript.src),",
  "const baseURL=new URL('.',location.href),",
  'Weather Mother inline base URL'
);
weatherEngine = replaceRequired(
  weatherEngine,
  /let FS;try\{const response=await fetch\(new URL\('cloud\.glsl\?v=clean-1\.0\.0',baseURL\)\);if\(!response\.ok\)throw Error\('Shader HTTP '\+response\.status\);FS=await response\.text\(\);\}catch\(e\)\{fail\(e,'shader fetch'\);return;\}/,
  "const FS=window.__WM_CLOUD_GLSL__;if(typeof FS!=='string'||!FS.length){fail('Embedded cloud shader missing','shader');return;}",
  'Weather Mother embedded cloud shader'
);
weatherEngine = replaceRequired(
  weatherEngine,
  "const worker=new Worker(new URL('field-worker.js?v=clean-1.0.0',baseURL));",
  "const worker=new Worker(URL.createObjectURL(new Blob([window.__WM_FIELD_WORKER_SOURCE__],{type:'text/javascript'})));",
  'Weather Mother embedded field worker'
);

weatherHtml = weatherHtml.replace(
  /<script\b[^>]*src=["'][^"']*(?:motion|engine|reuse)\.js[^"']*["'][^>]*>\s*<\/script>/gi,
  ''
);
const weatherBootstrap = `<style>
.panel,.footer{display:none!important}
#error{z-index:20!important}
#loading{right:18px!important;top:18px!important;background:#102739b8!important}
html,body{overscroll-behavior:none}
</style>
<script>
window.__WM_CLOUD_GLSL__=${jsLiteral(weatherShader)};
window.__WM_FIELD_WORKER_SOURCE__=${jsLiteral(weatherWorker)};
window.__WM_STANDALONE_SOURCE__=${jsLiteral({
  package: 'weather-mother/clean-v1',
  version: '1.0.0-clean',
  commit: weatherCommit,
  visualAcceptance: false,
  productionReady: false
})};
</script>
<script>${inlineScript(weatherMotion)}</script>
<script>${inlineScript(weatherEngine)}</script>`;
weatherHtml = replaceRequired(weatherHtml, '</body>', `${weatherBootstrap}</body>`, 'Weather Mother inline runtime');
if (/src=["'][^"']*(?:motion|engine|reuse)\.js/i.test(weatherHtml)) {
  throw new Error('Weather Mother still contains an external runtime script reference');
}
if (weatherHtml.includes('cloud.glsl?v=') || weatherHtml.includes('field-worker.js?v=')) {
  throw new Error('Weather Mother still contains an external shader or worker reference');
}

const previewDir = path.join(ROOT, 'preview/b24-data-native-v009');
let shellHtml = readText(path.join(previewDir, 'index.html'));
const baseCss = readText(path.join(previewDir, 'styles.css'));
const weatherCss = readText(path.join(previewDir, 'weather-integration.css'));
let appSource = readText(path.join(previewDir, 'app.js'));
let productionSource = readText(path.join(previewDir, 'production-patch.js'));
let bridgeSource = readText(path.join(previewDir, 'weather-bridge.js'));

appSource = replaceRequired(
  appSource,
  /const MODEL_CANDIDATES = Object\.freeze\(\[[\s\S]*?\]\);/,
  "const MODEL_CANDIDATES = Object.freeze([window.__B24_EMBEDDED_GLB_URL__]);",
  'embedded B24 source candidate'
);
appSource = replaceRequired(
  appSource,
  'this.scene.background = new THREE.Color(0x10161a);',
  'this.scene.background = null;',
  'transparent B24 scene background'
);
appSource = replaceRequired(
  appSource,
  "new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })",
  "new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })",
  'transparent B24 renderer'
);

productionSource = replaceRequired(
  productionSource,
  "import * as THREE from 'three';",
  "import * as THREE from 'three';\n(async()=>{",
  'production patch async wrapper start'
);
productionSource += '\n})();\n';

const standaloneSync = `
    if (window.__B24_WEATHER_SRCDOC__) {
      if (this.weatherApi) {
        this.syncWeatherApi();
        return;
      }
      if (forceReload || !this.frameLoaded) {
        this.frameLoaded = false;
        this.ui.frame.srcdoc = window.__B24_WEATHER_SRCDOC__;
        this.updateStatus();
        this.updateDiagnostic();
      }
      return;
    }
`;
bridgeSource = replaceRequired(
  bridgeSource,
  /  syncFrame\(forceReload\) \{\n    if \(!this\.ui\.frame\) return;\n    this\.ui\.layer\.dataset\.enabled = String\(this\.state\.enabled\);\n    if \(!this\.state\.enabled\) return;\n/,
  `  syncFrame(forceReload) {\n    if (!this.ui.frame) return;\n    this.ui.layer.dataset.enabled = String(this.state.enabled);\n    if (!this.state.enabled) return;\n${standaloneSync}`,
  'standalone Weather Mother srcdoc bridge'
);
bridgeSource = bridgeSource.replace(
  /repositoryReadRef: '[0-9a-f]+'/, 
  `repositoryReadRef: '${weatherCommit}'`
);

const patchedAppPath = path.join(temporaryDir, 'app.js');
const patchedProductionPath = path.join(temporaryDir, 'production-patch.js');
const patchedBridgePath = path.join(temporaryDir, 'weather-bridge.js');
const entryPath = path.join(temporaryDir, 'entry.js');
const bundlePath = path.join(temporaryDir, 'bundle.js');
fs.writeFileSync(patchedAppPath, appSource);
fs.writeFileSync(patchedProductionPath, productionSource);
fs.writeFileSync(patchedBridgePath, bridgeSource);
fs.writeFileSync(entryPath, [
  `import ${jsLiteral(patchedAppPath)};`,
  `import ${jsLiteral(patchedProductionPath)};`,
  `import ${jsLiteral(patchedBridgePath)};`
].join('\n'));

await build({
  entryPoints: [entryPath],
  bundle: true,
  outfile: bundlePath,
  format: 'iife',
  platform: 'browser',
  target: ['chrome110', 'edge110', 'firefox115', 'safari16'],
  minify: true,
  legalComments: 'none',
  logLevel: 'info',
  absWorkingDir: ROOT,
  nodePaths: [path.join(ROOT, 'node_modules')]
});
const bundle = readText(bundlePath);

shellHtml = shellHtml.replace(/<link rel="stylesheet" href="\.\/styles\.css">\s*/i, '');
shellHtml = shellHtml.replace(/<link rel="stylesheet" href="\.\/weather-integration\.css">\s*/i, '');
shellHtml = shellHtml.replace(/<script src="\.\/weather-alpha-bootstrap\.js"><\/script>\s*/i, '');
shellHtml = shellHtml.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/i, '');
shellHtml = shellHtml.replace(/<script type="module" src="\.\/app\.js"><\/script>\s*/i, '');
shellHtml = shellHtml.replace(/<script type="module" src="\.\/weather-bridge\.js"><\/script>\s*/i, '');
shellHtml = shellHtml.replace(
  /<title>[\s\S]*?<\/title>/i,
  '<title>B-24 Weather Mother 单文件联合工作台</title>'
);
shellHtml = replaceRequired(
  shellHtml,
  '</head>',
  `<style>${baseCss}\n${weatherCss}\n#standalone-badge{position:absolute;z-index:4;left:28px;top:88px;padding:6px 10px;border:1px solid rgba(121,198,154,.34);border-radius:999px;color:#b8efd0;background:rgba(10,20,16,.66);font:700 10px/1.2 system-ui,sans-serif;pointer-events:none;backdrop-filter:blur(10px)}@media(max-width:560px){#standalone-badge{left:18px;top:72px}}</style></head>`,
  'inline B24 workbench styles'
);
shellHtml = replaceRequired(
  shellHtml,
  '<div id="canvas-host">',
  '<div id="canvas-host"><div id="standalone-badge">单文件离线运行 · 权威 B-24 已内嵌</div>',
  'standalone badge'
);

const base64 = glb.toString('base64');
const chunkSize = 1024 * 1024;
const base64Chunks = [];
for (let offset = 0; offset < base64.length; offset += chunkSize) {
  base64Chunks.push(base64.slice(offset, offset + chunkSize));
}
const bootstrap = `<script>
window.__B24_WEATHER_SRCDOC__=${jsLiteral(weatherHtml)};
window.__B24_STANDALONE_BUILD__=${jsLiteral({
  schema: 'haihao.aircraft/b24-weather-standalone-build@1.0.0',
  buildCommit,
  weatherCommit,
  exactB24Bytes: glb.byteLength,
  exactB24Sha256: glbHash,
  singleHtml: true,
  externalNetworkRequestsExpected: 0,
  visualAcceptance: false,
  productionReady: false
})};
(()=>{
  const encoded=${jsLiteral(base64Chunks)};
  const parts=[];
  for(const chunk of encoded){
    const binary=atob(chunk);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);
    parts.push(bytes);
  }
  window.__B24_EMBEDDED_GLB_URL__=URL.createObjectURL(new Blob(parts,{type:'model/gltf-binary'}));
})();
</script>
<script>${inlineScript(bundle)}</script>`;
shellHtml = replaceRequired(shellHtml, '</body>', `${bootstrap}</body>`, 'inline standalone runtime');

const forbiddenExternalRuntime = [
  /<script[^>]+src=/i,
  /<link[^>]+href=["']https?:/i,
  /src=["']https?:\/\//i
];
for (const pattern of forbiddenExternalRuntime) {
  if (pattern.test(shellHtml)) throw new Error(`Standalone HTML contains forbidden external runtime reference: ${pattern}`);
}
if (!shellHtml.includes('window.__B24_EMBEDDED_GLB_URL__')) throw new Error('Embedded B24 source bootstrap missing');
if (!shellHtml.includes('window.__B24_WEATHER_SRCDOC__')) throw new Error('Embedded Weather Mother srcdoc missing');
if (!shellHtml.includes('window.__B24_WEATHER_BRIDGE__')) throw new Error('Weather bridge bundle missing');

fs.writeFileSync(outputPath, shellHtml);
const output = fs.readFileSync(outputPath);
const manifest = {
  schema: 'haihao.aircraft/b24-weather-standalone-manifest@1.0.0',
  file: outputName,
  bytes: output.byteLength,
  sha256: sha256(output),
  directOpen: true,
  singleHtml: true,
  iframeCount: (shellHtml.match(/<iframe\b/gi) || []).length,
  embeddedWeatherDocument: true,
  externalNetworkRequestsExpected: 0,
  lockedB24: SOURCE_LOCK,
  weatherMother: {
    package: 'weather-mother/clean-v1',
    version: '1.0.0-clean',
    commit: weatherCommit,
    embeddedFiles: ['index.html', 'engine.js', 'field-worker.js', 'cloud.glsl', 'motion.js']
  },
  build: {
    commit: buildCommit,
    generatedAt: new Date().toISOString(),
    threeVersion: '0.180.0',
    bundler: 'esbuild'
  },
  protections: {
    exactB24SourceVerified: true,
    geometryChanged: false,
    sourceAnimationChanged: false,
    sourceTextureChanged: false,
    v014FieldParametersChanged: false,
    historicalApprovalChanged: false
  },
  approval: {
    visualAcceptance: false,
    productionReady: false
  }
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

try {
  fs.rmSync(temporaryDir, { recursive: true, force: true });
} catch {
  // The generated delivery is already complete.
}
