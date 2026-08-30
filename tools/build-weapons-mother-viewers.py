#!/usr/bin/env python3
"""Build one-file Three.js review pages for Weapons Mother GLB candidates."""

from __future__ import annotations

import argparse
import base64
import html
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
AUDIT_SCRIPT = SCRIPT_DIR / "audit-weapons-mother-glb.py"


def load_auditor():
    spec = importlib.util.spec_from_file_location("weapons_mother_glb_audit", AUDIT_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load audit module: {AUDIT_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.audit


def parse_asset(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("asset must be CANDIDATE_ID=PATH")
    candidate_id, source = value.split("=", 1)
    candidate_id = candidate_id.strip()
    if not candidate_id or any(character not in "abcdefghijklmnopqrstuvwxyz0123456789-" for character in candidate_id):
        raise argparse.ArgumentTypeError(
            "candidate ID may contain only lowercase letters, digits, and hyphens"
        )
    return candidate_id, Path(source)


def human_size(value: int) -> str:
    return f"{value / 1024 / 1024:.2f} MiB"


def make_html(candidate_id: str, source: Path, audit: dict[str, Any]) -> str:
    metadata = audit["assetMetadata"]
    counts = audit["counts"]
    bounds = audit.get("bounds") or {"size": [0, 0, 0]}
    title = metadata.get("title") or source.stem
    author = metadata.get("author") or "Unknown author"
    source_url = metadata.get("source") or ""
    license_text = metadata.get("license") or "Unresolved"
    required_extension = ", ".join(audit.get("extensionsRequired", [])) or "none"
    used_extension = ", ".join(audit.get("extensionsUsed", [])) or "none"
    duplicate_count = len(audit.get("duplicateNodeNames", []))
    raw = source.read_bytes()
    if len(raw) != audit["bytes"]:
        raise ValueError(f"source changed during build: {source}")
    model_base64 = base64.b64encode(raw).decode("ascii")
    audit_json = json.dumps(audit, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    page = r'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>__TITLE__ · Weapons Mother</title>
  <script type="importmap">
    {"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/"}}
  </script>
  <style>
    :root{color-scheme:dark;--bg:#071014;--panel:#0c1a20;--panel2:#10252d;--line:#29434c;--text:#edf5f4;--muted:#91aaa9;--accent:#e1a84b;--ok:#66d39b;--warn:#f0bd63;--danger:#ff7d70}
    *{box-sizing:border-box}html,body{height:100%;margin:0}body{font-family:Inter,"Segoe UI","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);overflow:hidden}
    button,a{font:inherit}.shell{height:100%;display:grid;grid-template-columns:minmax(290px,360px) 1fr}.panel{position:relative;z-index:2;overflow:auto;padding:22px 20px 28px;background:linear-gradient(180deg,rgba(16,37,45,.98),rgba(7,16,20,.98));border-right:1px solid var(--line);box-shadow:20px 0 50px rgba(0,0,0,.25)}
    .eyebrow{color:var(--accent);font-size:11px;letter-spacing:.18em;text-transform:uppercase}.title{font-size:29px;line-height:1.05;margin:8px 0 6px}.subtitle{margin:0 0 14px;color:var(--muted);font-size:13px}.badges{display:flex;gap:7px;flex-wrap:wrap;margin:14px 0 18px}.badge{border:1px solid var(--line);background:#09171c;border-radius:999px;padding:5px 8px;font-size:10px;letter-spacing:.05em}.badge.warn{border-color:#7d6234;color:#ffd68a}.badge.ok{border-color:#315f4b;color:#9ceabb}
    .warning{padding:12px 13px;border:1px solid #704f29;background:rgba(128,79,24,.18);color:#ffdca3;border-radius:12px;font-size:12px;line-height:1.55}.section{margin-top:19px}.section h2{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#afc6c4;margin:0 0 9px}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}.metric{border:1px solid var(--line);background:rgba(5,14,18,.62);border-radius:10px;padding:9px}.metric b{display:block;font-size:16px;color:#fff}.metric span{font-size:10px;color:var(--muted)}
    .controls{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.controls button,.wide-button{border:1px solid var(--line);background:#10242b;color:var(--text);border-radius:9px;padding:9px 7px;cursor:pointer;font-size:11px}.controls button:hover,.wide-button:hover,.controls button.active{border-color:var(--accent);background:#1c3035}.controls button.active{color:#ffd99b}.wide-button{width:100%;margin-top:7px}.part-list{display:grid;gap:5px;max-height:220px;overflow:auto;padding-right:4px}.part{display:flex;gap:8px;align-items:center;padding:7px 8px;border:1px solid #213940;border-radius:8px;background:rgba(7,18,22,.55);font-size:10px}.part input{accent-color:var(--accent)}
    .source{font-size:11px;line-height:1.55;color:var(--muted);overflow-wrap:anywhere}.source a{color:#f0c274}.hash{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:9px;color:#7f9998;word-break:break-all}.viewport{position:relative;min-width:0;background:radial-gradient(circle at 45% 34%,#1f3539 0,#0b171b 45%,#050b0d 100%)}canvas{display:block;width:100%;height:100%}.hud{position:absolute;top:16px;right:16px;display:flex;gap:8px;align-items:center;z-index:1}.hud-chip{padding:7px 10px;border:1px solid rgba(157,191,190,.25);background:rgba(5,14,17,.78);backdrop-filter:blur(12px);border-radius:999px;font-size:10px;color:#bad0ce}.load{position:absolute;inset:0;display:grid;place-items:center;background:#071014;z-index:4;transition:opacity .35s}.load.hidden{opacity:0;pointer-events:none}.load-card{width:min(440px,80%);text-align:center}.load-card strong{display:block;font-size:18px;margin-bottom:8px}.load-card span{font-size:12px;color:var(--muted)}.bar{height:5px;border-radius:99px;background:#172b31;overflow:hidden;margin-top:14px}.bar i{display:block;width:8%;height:100%;background:linear-gradient(90deg,#d79634,#f7d596);transition:width .2s}.error{color:#ff9b90}.axis-note{position:absolute;bottom:16px;left:16px;border:1px solid rgba(157,191,190,.25);background:rgba(5,14,17,.78);padding:9px 11px;border-radius:10px;font-size:10px;color:#9eb7b5}.runtime{color:#72dbac}
    @media(max-width:820px){body{overflow:auto}.shell{height:auto;min-height:100%;grid-template-columns:1fr}.panel{border-right:0;border-bottom:1px solid var(--line)}.viewport{min-height:65vh}.part-list{max-height:160px}}
  </style>
</head>
<body data-qa="loading" data-candidate="__CANDIDATE_ID__">
  <main class="shell">
    <aside class="panel">
      <div class="eyebrow">B-24 · Weapons Mother · source intake</div>
      <h1 class="title">__TITLE__</h1>
      <p class="subtitle">独立来源候选检视页 · 原始 GLB 未改写</p>
      <div class="badges">
        <span class="badge warn">B-24 挂位未解析</span>
        <span class="badge">SOURCE CANDIDATE</span>
      </div>
      <div class="warning">当前页面只证明该 GLB 能被独立加载和检查，不代表型号、尺度、安装位置、历史适用性或 B-24 回接已经批准。显示归一化仅用于检视，不会改写源资产。</div>

      <section class="section">
        <h2>Source audit</h2>
        <div class="metrics">
          <div class="metric"><b>__TRIANGLES__</b><span>triangles</span></div>
          <div class="metric"><b>__PRIMITIVES__</b><span>primitives / draw calls</span></div>
          <div class="metric"><b>__FILE_MIB__</b><span>embedded GLB</span></div>
          <div class="metric"><b>__TEXTURE_MIB__</b><span>estimated RGBA8 mip memory</span></div>
          <div class="metric"><b>__NODES__</b><span>nodes</span></div>
          <div class="metric"><b>__DUPLICATES__</b><span>duplicate node-name groups</span></div>
        </div>
      </section>

      <section class="section">
        <h2>Locked axis views</h2>
        <div class="controls" id="view-controls">
          <button data-view="iso" class="active">斜视</button><button data-view="px">+X</button><button data-view="nx">−X</button>
          <button data-view="py">+Y</button><button data-view="pz">+Z</button><button data-view="nz">−Z</button>
        </div>
      </section>

      <section class="section">
        <h2>Lighting and diagnostics</h2>
        <div class="controls" id="light-controls">
          <button data-light="neutral" class="active">中性</button><button data-light="grazing">掠射</button><button data-light="dark">低曝光</button>
          <button id="wireframe">线框</button><button id="grid-toggle" class="active">网格</button><button id="spin-toggle">自转</button>
        </div>
        <button class="wide-button" id="reset-parts">恢复全部部件</button>
      </section>

      <section class="section">
        <h2>Runtime mesh visibility</h2>
        <div class="part-list" id="part-list"><div class="part">模型加载后生成部件表…</div></div>
      </section>

      <section class="section source">
        <h2>Provenance</h2>
        <div>作者：__AUTHOR__</div>
        <div>许可：<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">__LICENSE__</a></div>
        <div>来源：<a href="__SOURCE_URL__" target="_blank" rel="noreferrer">原始模型页面</a></div>
        <div>扩展：used __USED_EXTENSIONS__; required __REQUIRED_EXTENSIONS__</div>
        <div>源尺寸：__BOUNDS__（glTF 源单位，未经 B-24 尺度批准）</div>
        <div class="hash">SHA-256 __SHA256__</div>
      </section>
    </aside>

    <section class="viewport" id="viewport">
      <div class="hud"><span class="hud-chip" id="runtime-state">等待模型</span><span class="hud-chip" id="runtime-stats">0 calls · 0 tris</span></div>
      <div class="load" id="load"><div class="load-card"><strong>载入 __TITLE__</strong><span id="load-label">正在解码内嵌 GLB…</span><div class="bar"><i id="load-bar"></i></div></div></div>
      <div class="axis-note">锁定源坐标轴；页面仅对展示容器做居中与等比缩放</div>
    </section>
  </main>
  <script id="model-data" type="application/octet-stream">__MODEL_BASE64__</script>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

    const AUDIT = __AUDIT_JSON__;
    const viewport = document.getElementById('viewport');
    const loaderOverlay = document.getElementById('load');
    const loadLabel = document.getElementById('load-label');
    const loadBar = document.getElementById('load-bar');
    const runtimeState = document.getElementById('runtime-state');
    const runtimeStats = document.getElementById('runtime-stats');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x091317);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    viewport.prepend(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.screenSpacePanning = true;
    controls.autoRotateSpeed = 1.4;

    const hemi = new THREE.HemisphereLight(0xdcebf0, 0x25302d, 1.45);
    const key = new THREE.DirectionalLight(0xffefd3, 4.4);
    key.position.set(4, 5, 6);
    const rim = new THREE.DirectionalLight(0x8fc5ff, 2.2);
    rim.position.set(-5, 2, -4);
    scene.add(hemi, key, rim);

    const grid = new THREE.GridHelper(8, 32, 0x6f817b, 0x27393c);
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    scene.add(grid);
    const axes = new THREE.AxesHelper(1.1);
    scene.add(axes);

    const displayRoot = new THREE.Group();
    displayRoot.name = 'WeaponsMother_DisplayNormalization';
    scene.add(displayRoot);
    let modelScene = null;
    let normalizedBox = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    let wireframeEnabled = false;
    let meshEntries = [];

    function resize() {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();

    function setView(name) {
      const center = normalizedBox.getCenter(new THREE.Vector3());
      const sphere = normalizedBox.getBoundingSphere(new THREE.Sphere());
      const radius = Math.max(sphere.radius, 0.25);
      const directions = {
        iso: new THREE.Vector3(1.35, 0.85, 1.45),
        px: new THREE.Vector3(1, 0, 0), nx: new THREE.Vector3(-1, 0, 0),
        py: new THREE.Vector3(0, 1, 0), pz: new THREE.Vector3(0, 0, 1), nz: new THREE.Vector3(0, 0, -1)
      };
      const direction = (directions[name] || directions.iso).normalize();
      const distance = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * 1.25;
      camera.position.copy(center).add(direction.multiplyScalar(distance));
      camera.near = Math.max(distance / 1000, 0.001);
      camera.far = distance * 30;
      camera.updateProjectionMatrix();
      controls.target.copy(center);
      controls.minDistance = radius * 0.25;
      controls.maxDistance = radius * 12;
      controls.update();
      document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    }

    function setLighting(mode) {
      document.querySelectorAll('[data-light]').forEach(button => button.classList.toggle('active', button.dataset.light === mode));
      if (mode === 'grazing') {
        renderer.toneMappingExposure = 1.0; hemi.intensity = 0.45; key.intensity = 6.8; rim.intensity = 1.1;
        key.position.set(7, 0.4, 1.2); scene.background.setHex(0x0a1012);
      } else if (mode === 'dark') {
        renderer.toneMappingExposure = 0.52; hemi.intensity = 0.35; key.intensity = 1.4; rim.intensity = 0.7;
        key.position.set(4, 5, 6); scene.background.setHex(0x030708);
      } else {
        renderer.toneMappingExposure = 1.05; hemi.intensity = 1.45; key.intensity = 4.4; rim.intensity = 2.2;
        key.position.set(4, 5, 6); scene.background.setHex(0x091317);
      }
    }

    function runtimePath(object) {
      const segments = [];
      let current = object;
      while (current && current !== modelScene) {
        const index = current.parent ? current.parent.children.indexOf(current) : 0;
        segments.unshift(`${current.name || current.type}[${index}]`);
        current = current.parent;
      }
      return segments.join('/');
    }

    function buildPartList() {
      const list = document.getElementById('part-list');
      list.replaceChildren();
      meshEntries.forEach((mesh, index) => {
        const label = document.createElement('label');
        label.className = 'part';
        const input = document.createElement('input');
        input.type = 'checkbox'; input.checked = true;
        input.addEventListener('change', () => { mesh.visible = input.checked; });
        const text = document.createElement('span');
        text.textContent = `${String(index + 1).padStart(2, '0')} · ${runtimePath(mesh)}`;
        label.append(input, text); list.append(label);
      });
    }

    function decodeEmbeddedGlb() {
      const encoded = document.getElementById('model-data').textContent.trim();
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      const chunk = 1024 * 1024;
      for (let start = 0; start < binary.length; start += chunk) {
        const end = Math.min(start + chunk, binary.length);
        for (let index = start; index < end; index++) bytes[index] = binary.charCodeAt(index);
        loadBar.style.width = `${8 + (end / binary.length) * 30}%`;
      }
      return bytes.buffer;
    }

    const glbBuffer = decodeEmbeddedGlb();
    loadLabel.textContent = '正在解析网格、材质与内嵌贴图…';
    loadBar.style.width = '42%';
    const blobUrl = URL.createObjectURL(new Blob([glbBuffer], { type: 'model/gltf-binary' }));
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(blobUrl, gltf => {
      URL.revokeObjectURL(blobUrl);
      modelScene = gltf.scene;
      displayRoot.add(modelScene);
      const sourceBox = new THREE.Box3().setFromObject(modelScene);
      const sourceCenter = sourceBox.getCenter(new THREE.Vector3());
      const sourceSize = sourceBox.getSize(new THREE.Vector3());
      const longest = Math.max(sourceSize.x, sourceSize.y, sourceSize.z, 0.0001);
      const displayScale = 3.8 / longest;
      modelScene.position.copy(sourceCenter).multiplyScalar(-1);
      displayRoot.scale.setScalar(displayScale);
      displayRoot.updateMatrixWorld(true);
      normalizedBox = new THREE.Box3().setFromObject(displayRoot);
      const bottom = normalizedBox.min.y;
      grid.position.y = bottom - 0.035;
      axes.position.set(normalizedBox.min.x - 0.18, bottom, normalizedBox.min.z - 0.18);

      meshEntries = [];
      modelScene.traverse(object => {
        if (object.isMesh) {
          meshEntries.push(object);
          object.castShadow = false;
          object.receiveShadow = false;
        }
      });
      buildPartList();
      setView('iso');
      loadBar.style.width = '100%';
      loadLabel.textContent = 'GLB 已载入';
      runtimeState.textContent = `PASS · ${meshEntries.length} meshes`;
      runtimeState.classList.add('runtime');
      document.body.dataset.qa = 'passed';
      setTimeout(() => loaderOverlay.classList.add('hidden'), 250);
      console.info('WEAPONS_MOTHER_QA_READY', {
        candidateId: document.body.dataset.candidate,
        sha256: AUDIT.sha256,
        meshes: meshEntries.length,
        triangles: AUDIT.counts.triangles,
        b24MountAssignment: AUDIT.b24MountAssignment
      });
    }, event => {
      if (event.total) loadBar.style.width = `${42 + (event.loaded / event.total) * 55}%`;
    }, error => {
      URL.revokeObjectURL(blobUrl);
      document.body.dataset.qa = 'failed';
      loadLabel.textContent = `加载失败：${error.message || error}`;
      loadLabel.classList.add('error');
      runtimeState.textContent = 'FAILED';
      console.error('WEAPONS_MOTHER_QA_FAILED', error);
    });

    document.getElementById('view-controls').addEventListener('click', event => {
      const name = event.target.dataset.view;
      if (name) setView(name);
    });
    document.getElementById('light-controls').addEventListener('click', event => {
      const mode = event.target.dataset.light;
      if (mode) setLighting(mode);
    });
    document.getElementById('wireframe').addEventListener('click', event => {
      wireframeEnabled = !wireframeEnabled;
      event.currentTarget.classList.toggle('active', wireframeEnabled);
      meshEntries.forEach(mesh => {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => { if (material) material.wireframe = wireframeEnabled; });
      });
    });
    document.getElementById('grid-toggle').addEventListener('click', event => {
      grid.visible = !grid.visible; axes.visible = grid.visible;
      event.currentTarget.classList.toggle('active', grid.visible);
    });
    document.getElementById('spin-toggle').addEventListener('click', event => {
      controls.autoRotate = !controls.autoRotate;
      event.currentTarget.classList.toggle('active', controls.autoRotate);
    });
    document.getElementById('reset-parts').addEventListener('click', () => {
      meshEntries.forEach(mesh => { mesh.visible = true; });
      document.querySelectorAll('#part-list input').forEach(input => { input.checked = true; });
    });

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      runtimeStats.textContent = `${renderer.info.render.calls} calls · ${renderer.info.render.triangles.toLocaleString()} tris`;
    }
    animate();
  </script>
</body>
</html>
'''

    replacements = {
        "__TITLE__": html.escape(str(title)),
        "__CANDIDATE_ID__": html.escape(candidate_id),
        "__TRIANGLES__": f"{counts['triangles']:,}",
        "__PRIMITIVES__": f"{counts['primitives']:,}",
        "__FILE_MIB__": human_size(audit["bytes"]),
        "__TEXTURE_MIB__": f"{audit['estimatedDecodedTextureMiB']:.2f} MiB",
        "__NODES__": f"{counts['nodes']:,}",
        "__DUPLICATES__": str(duplicate_count),
        "__AUTHOR__": html.escape(str(author)),
        "__LICENSE__": html.escape(str(license_text)),
        "__SOURCE_URL__": html.escape(str(source_url), quote=True),
        "__USED_EXTENSIONS__": html.escape(used_extension),
        "__REQUIRED_EXTENSIONS__": html.escape(required_extension),
        "__BOUNDS__": " × ".join(f"{value:.6g}" for value in bounds["size"]),
        "__SHA256__": audit["sha256"],
        "__MODEL_BASE64__": model_base64,
        "__AUDIT_JSON__": audit_json,
    }
    for key, value in replacements.items():
        page = page.replace(key, value)
    if "__" in page:
        unresolved = sorted({part.split("__", 1)[0] for part in page.split("__")[1::2]})
        raise ValueError(f"unresolved template placeholders: {unresolved}")
    return page


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--asset", action="append", type=parse_asset, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--audit-output", type=Path, required=True)
    args = parser.parse_args()

    audit_glb = load_auditor()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.audit_output.parent.mkdir(parents=True, exist_ok=True)
    audits = []
    outputs = []
    for candidate_id, source in args.asset:
        source = source.resolve()
        if not source.is_file():
            raise FileNotFoundError(source)
        audit = audit_glb(source)
        audit["candidateId"] = candidate_id
        output = args.output_dir / f"{candidate_id}.html"
        output.write_text(make_html(candidate_id, source, audit), encoding="utf-8", newline="\n")
        audits.append(audit)
        outputs.append({"candidateId": candidate_id, "source": str(source), "output": str(output), "bytes": output.stat().st_size})

    args.audit_output.write_text(
        json.dumps(
            {
                "schema": "haihao.aircraft/weapons-mother-m2-intake@1.0.0",
                "status": "source-candidates-only",
                "b24MountAssignment": "unresolved-user-mapping-required",
                "assets": audits,
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({"outputs": outputs, "auditOutput": str(args.audit_output)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
