import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SOURCE_LOCK = Object.freeze({
  file: 'b-24_liberator.glb',
  bytes: 23085972,
  sha256: '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d'
});

const MODEL_CANDIDATES = Object.freeze([
  new URL('../../public/b-24_liberator.glb', import.meta.url).href,
  new URL('../../public/models/b-24_liberator.glb', import.meta.url).href,
  new URL('../../public/assets/models/b-24_liberator.glb', import.meta.url).href,
  new URL('../b24-reference-mirror/b-24_liberator.glb', import.meta.url).href,
  'https://github.com/haihao0307/AIRCRAFT/releases/download/80-days-source-v1/b-24_liberator.glb'
]);

const PHASES = Object.freeze({
  off:      { label: 'OFF',      visualRpm: 0,    response: 9.0 },
  crank:    { label: 'CRANK',    visualRpm: 120,  response: 2.8 },
  idle:     { label: 'IDLE',     visualRpm: 650,  response: 2.4 },
  taxi:     { label: 'TAXI',     visualRpm: 1050, response: 2.0 },
  takeoff:  { label: 'TAKEOFF',  visualRpm: 2600, response: 1.7 },
  cruise:   { label: 'CRUISE',   visualRpm: 2200, response: 1.4 },
  approach: { label: 'APPROACH', visualRpm: 1650, response: 1.8 },
  landing:  { label: 'LANDING',  visualRpm: 950,  response: 2.2 },
  shutdown: { label: 'SHUTDOWN', visualRpm: 0,    response: 0.75 }
});

const NAME_RULES = Object.freeze({
  propeller: /prop|propeller|airscrew|air_screw|blade|spinner|rotor/i,
  blur: /blur|disc|disk|fast|spin/i,
  slow: /slow|medium|mid/i,
  glass: /glass|glazing|window|windscreen|windshield|canopy|plexi|transparent/i,
  hardware: /bolt|screw|nut|rivet|hinge|shaft|piston|strut|bracket|mount|linkage|actuator|gear|gun|barrel|bearing|axle|fork|yoke|spring|cable/i,
  rubber: /rubber|tire|tyre|boot|seal|hose/i,
  interior: /interior|cockpit|cabin|seat|floor|panel|console|instrument|bulkhead|rib|spar|frame/i,
  paint: /paint|olive|drab|insignia|marking|decal|stripe|nose.?art/i,
  belly: /belly|ventral|bomb|bay|rack|door|hatch|lower.?fuselage/i
});

const UI = Object.freeze({
  host: document.querySelector('#canvas-host'),
  loading: document.querySelector('#loading-panel'),
  loadingTitle: document.querySelector('#loading-title'),
  loadingDetail: document.querySelector('#loading-detail'),
  sourceLock: document.querySelector('#source-lock'),
  phaseReadout: document.querySelector('#phase-readout'),
  engineReadout: document.querySelector('#engine-readout'),
  propReadout: document.querySelector('#prop-readout'),
  fpsReadout: document.querySelector('#fps-readout'),
  runtimeState: document.querySelector('#runtime-state'),
  phaseGrid: document.querySelector('#phase-grid'),
  engineControls: document.querySelector('#engine-controls'),
  allEngines: document.querySelector('#all-engines'),
  audioToggle: document.querySelector('#audio-toggle'),
  surfaceToggle: document.querySelector('#surface-toggle'),
  glassToggle: document.querySelector('#glass-toggle'),
  diagnosticToggle: document.querySelector('#diagnostic-toggle'),
  diagnosticList: document.querySelector('#diagnostic-list'),
  qaSummary: document.querySelector('#qa-summary'),
  focusAircraft: document.querySelector('#focus-aircraft'),
  resetRuntime: document.querySelector('#reset-runtime')
});

function setLoading(title, detail) {
  UI.loadingTitle.textContent = title;
  UI.loadingDetail.textContent = detail;
}

function setDiagnostic(id, state, text) {
  const row = UI.diagnosticList.querySelector(`[data-check="${id}"]`);
  if (!row) return;
  row.classList.remove('pass', 'fail');
  if (state === 'pass' || state === 'fail') row.classList.add(state);
  row.querySelector('strong').textContent = text;
}

function updateQaSummary() {
  const rows = [...UI.diagnosticList.children];
  const pass = rows.filter((row) => row.classList.contains('pass')).length;
  const fail = rows.filter((row) => row.classList.contains('fail')).length;
  UI.qaSummary.className = `badge ${fail ? 'fail' : pass === rows.length ? 'pass' : 'neutral'}`;
  UI.qaSummary.textContent = fail ? `${fail} 项阻断` : pass === rows.length ? '运行自检通过' : `${pass} / ${rows.length}`;
}

function objectLabel(object) {
  const labels = [];
  let cursor = object;
  for (let depth = 0; cursor && depth < 4; depth += 1, cursor = cursor.parent) {
    if (cursor.name) labels.push(cursor.name);
  }
  const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
  for (const material of materials) {
    if (material?.name) labels.push(material.name);
  }
  return labels.join(' ').toLowerCase();
}

function rounded(value) {
  return Math.round(value * 1e6) / 1e6;
}

function sha256Hex(buffer) {
  return crypto.subtle.digest('SHA-256', buffer).then((digest) =>
    [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
  );
}

function parseGlb(loader, buffer, basePath) {
  return new Promise((resolve, reject) => loader.parse(buffer, basePath, resolve, reject));
}

async function loadLockedReference() {
  const loader = new GLTFLoader();
  const failures = [];

  for (const url of MODEL_CANDIDATES) {
    try {
      setLoading('正在读取锁定 B-24 参考资产', url.replace(location.origin, ''));
      const response = await fetch(url, { cache: 'force-cache', mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== SOURCE_LOCK.bytes) {
        throw new Error(`字节数 ${buffer.byteLength} 与锁定值不一致`);
      }
      const digest = await sha256Hex(buffer);
      if (digest !== SOURCE_LOCK.sha256) {
        throw new Error(`SHA256 ${digest} 与锁定值不一致`);
      }
      const basePath = url.slice(0, url.lastIndexOf('/') + 1);
      const gltf = await parseGlb(loader, buffer, basePath);
      return { gltf, url, digest, bytes: buffer.byteLength };
    } catch (error) {
      failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`所有锁定资产候选均不可用。\n${failures.join('\n')}`);
}

function inferAxisFromQuaternionTrack(object, animations) {
  const descendantNames = new Set();
  object.traverse((node) => {
    if (node.name) descendantNames.add(node.name.toLowerCase());
  });
  if (object.name) descendantNames.add(object.name.toLowerCase());

  for (const clip of animations) {
    for (const track of clip.tracks) {
      if (!track.name.toLowerCase().endsWith('.quaternion')) continue;
      const nodeName = track.name.slice(0, track.name.lastIndexOf('.')).toLowerCase();
      if (![...descendantNames].some((name) => nodeName === name || nodeName.endsWith(name))) continue;
      if (track.values.length < 8) continue;

      const first = new THREE.Quaternion().fromArray(track.values, 0).normalize();
      let offset = track.values.length - 4;
      const quarter = Math.floor(track.values.length / 16) * 4;
      if (quarter >= 4) offset = quarter;
      const sample = new THREE.Quaternion().fromArray(track.values, offset).normalize();
      const delta = first.clone().invert().multiply(sample).normalize();
      if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
      const sine = Math.sqrt(Math.max(0, 1 - delta.w * delta.w));
      if (sine > 1e-4) {
        return new THREE.Vector3(delta.x / sine, delta.y / sine, delta.z / sine).normalize();
      }
    }
  }
  return null;
}

function inferAxisFromGeometry(object) {
  let bestMesh = null;
  let bestVolume = -Infinity;
  object.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    node.geometry.computeBoundingBox();
    const box = node.geometry.boundingBox;
    if (!box) return;
    const size = box.getSize(new THREE.Vector3());
    const volume = size.x * size.y * size.z;
    if (volume > bestVolume) {
      bestVolume = volume;
      bestMesh = { node, size };
    }
  });
  if (!bestMesh) return new THREE.Vector3(0, 0, 1);
  const { size } = bestMesh;
  if (size.x <= size.y && size.x <= size.z) return new THREE.Vector3(1, 0, 0);
  if (size.y <= size.x && size.y <= size.z) return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function findPropellerPivot(object) {
  let pivot = object;
  let cursor = object.parent;
  for (let depth = 0; cursor && depth < 4; depth += 1, cursor = cursor.parent) {
    const label = objectLabel(cursor);
    if (NAME_RULES.propeller.test(label)) pivot = cursor;
    else if (depth > 0) break;
  }
  return pivot;
}

function removeNestedTargets(targets) {
  const unique = [...new Set(targets)];
  return unique.filter((candidate) => !unique.some((other) => {
    if (other === candidate) return false;
    let cursor = candidate.parent;
    while (cursor) {
      if (cursor === other) return true;
      cursor = cursor.parent;
    }
    return false;
  }));
}

function kMeansFour(entries, axis) {
  if (!entries.length) return [[], [], [], []];
  const values = entries.map((entry) => entry.center.getComponent(axis)).sort((a, b) => a - b);
  const centroids = [0.08, 0.36, 0.64, 0.92].map((q) => values[Math.min(values.length - 1, Math.floor(q * values.length))]);
  let groups = [[], [], [], []];

  for (let iteration = 0; iteration < 18; iteration += 1) {
    groups = [[], [], [], []];
    for (const entry of entries) {
      const value = entry.center.getComponent(axis);
      let bestIndex = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const distance = Math.abs(value - centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      groups[bestIndex].push(entry);
    }
    groups.forEach((group, index) => {
      if (group.length) centroids[index] = group.reduce((sum, entry) => sum + entry.center.getComponent(axis), 0) / group.length;
    });
  }

  return groups
    .map((group, index) => ({ group, centroid: centroids[index] }))
    .sort((a, b) => a.centroid - b.centroid)
    .map((item) => item.group);
}

function discoverEngineGroups(scene, animations) {
  const candidates = new Set();
  scene.traverse((object) => {
    if (!object.visible || !object.isObject3D) return;
    if (NAME_RULES.propeller.test(objectLabel(object))) candidates.add(findPropellerPivot(object));
  });

  for (const clip of animations) {
    for (const track of clip.tracks) {
      const lowered = track.name.toLowerCase();
      if (!lowered.endsWith('.quaternion') || !NAME_RULES.propeller.test(lowered)) continue;
      const nodeName = track.name.slice(0, track.name.lastIndexOf('.'));
      const object = scene.getObjectByName(nodeName);
      if (object) candidates.add(findPropellerPivot(object));
    }
  }

  const targets = removeNestedTargets([...candidates]).filter((object) => object !== scene);
  scene.updateMatrixWorld(true);
  const entries = targets.map((object) => ({
    object,
    center: new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
  }));

  if (!entries.length) return [];
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  entries.forEach(({ center }) => {
    min.min(center);
    max.max(center);
  });
  const spread = max.clone().sub(min);
  const axis = spread.x >= spread.y && spread.x >= spread.z ? 0 : spread.y >= spread.z ? 1 : 2;
  const clusters = kMeansFour(entries, axis);

  return clusters.map((cluster, index) => {
    const clusterTargets = cluster.map((entry) => entry.object);
    const visuals = { static: new Set(), slow: new Set(), blur: new Set() };
    for (const target of clusterTargets) {
      target.traverse((object) => {
        if (!object.isMesh && object.children.length) return;
        const label = objectLabel(object);
        if (NAME_RULES.blur.test(label)) visuals.blur.add(object);
        else if (NAME_RULES.slow.test(label)) visuals.slow.add(object);
        else visuals.static.add(object);
      });
    }
    const center = cluster.reduce((sum, entry) => sum.add(entry.center), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, cluster.length));
    return {
      id: index + 1,
      enabled: true,
      currentRpm: 0,
      targetRpm: 0,
      response: PHASES.off.response,
      center,
      targets: clusterTargets.map((object) => ({
        object,
        axis: inferAxisFromQuaternionTrack(object, animations) ?? inferAxisFromGeometry(object),
        direction: index % 2 === 0 ? 1 : -1
      })),
      visuals,
      lastVisualMode: 'static'
    };
  });
}

function setEngineVisualMode(engine, mode) {
  engine.lastVisualMode = mode;
  const hasSlow = engine.visuals.slow.size > 0;
  const hasBlur = engine.visuals.blur.size > 0;
  const effective = mode === 'blur' && !hasBlur ? hasSlow ? 'slow' : 'static' : mode === 'slow' && !hasSlow ? 'static' : mode;
  for (const [name, objects] of Object.entries(engine.visuals)) {
    for (const object of objects) object.visible = engine.enabled && name === effective;
  }
}

function updateEngine(engine, dt) {
  const target = engine.enabled ? engine.targetRpm : 0;
  engine.currentRpm = THREE.MathUtils.damp(engine.currentRpm, target, engine.response, dt);
  if (Math.abs(engine.currentRpm) < 0.05 && target === 0) engine.currentRpm = 0;
  const radians = (engine.currentRpm / 60) * Math.PI * 2 * dt;
  if (radians !== 0) {
    for (const targetEntry of engine.targets) {
      targetEntry.object.rotateOnAxis(targetEntry.axis, radians * targetEntry.direction);
    }
  }
  const mode = engine.currentRpm < 90 ? 'static' : engine.currentRpm < 720 ? 'slow' : 'blur';
  if (mode !== engine.lastVisualMode) setEngineVisualMode(engine, mode);
}

function classifyMaterial(mesh, material) {
  const label = `${objectLabel(mesh)} ${material?.name ?? ''}`.toLowerCase();
  if (NAME_RULES.glass.test(label)) return 'glazing';
  if (NAME_RULES.rubber.test(label)) return 'rubber';
  if (NAME_RULES.hardware.test(label)) return 'mechanical-hardware';
  if (NAME_RULES.interior.test(label)) return 'interior';
  if (NAME_RULES.paint.test(label)) return 'painted-surface';
  return 'exterior-metal';
}

function cloneMaterial(material) {
  const clone = material.clone();
  clone.name = `${material.name || material.type}__v009_reference`;
  return clone;
}

function calibratedMaterial(reference, category) {
  if (category === 'glazing') {
    const material = new THREE.MeshPhysicalMaterial();
    material.name = `${reference.name}__v009_glazing`;
    material.color.copy(reference.color ?? new THREE.Color(0xc7d3d8));
    material.map = reference.map ?? null;
    material.normalMap = reference.normalMap ?? null;
    material.roughnessMap = reference.roughnessMap ?? null;
    material.alphaMap = reference.alphaMap ?? null;
    material.transparent = true;
    material.opacity = Math.min(reference.opacity ?? 1, 0.34);
    material.transmission = 0.84;
    material.roughness = 0.13;
    material.metalness = 0;
    material.ior = 1.49;
    material.thickness = 0.008;
    material.depthWrite = false;
    material.side = reference.side === THREE.BackSide ? THREE.DoubleSide : reference.side;
    material.envMapIntensity = 0.9;
    material.needsUpdate = true;
    return material;
  }

  const material = reference.clone();
  material.name = `${reference.name}__v009_${category}`;
  const textured = Boolean(material.map);
  if ('metalness' in material && 'roughness' in material) {
    if (category === 'mechanical-hardware') {
      material.metalness = Math.max(material.metalness ?? 0, 0.78);
      material.roughness = THREE.MathUtils.clamp(Math.max(material.roughness ?? 0, 0.43), 0.43, 0.68);
      if (material.color) material.color.lerp(new THREE.Color(0x4f5558), textured ? 0.12 : 0.42);
    } else if (category === 'rubber') {
      material.metalness = 0;
      material.roughness = 0.78;
      if (material.color) material.color.lerp(new THREE.Color(0x222526), textured ? 0.08 : 0.48);
    } else if (category === 'interior') {
      material.metalness = Math.min(material.metalness ?? 0, 0.38);
      material.roughness = Math.max(material.roughness ?? 0, 0.55);
    } else if (category === 'painted-surface') {
      material.metalness = Math.min(material.metalness ?? 0, 0.46);
      material.roughness = THREE.MathUtils.clamp(material.roughness ?? 0.52, 0.42, 0.7);
    } else {
      material.metalness = Math.max(material.metalness ?? 0, 0.68);
      material.roughness = THREE.MathUtils.clamp(material.roughness ?? 0.36, 0.3, 0.52);
      if (material.color) material.color.lerp(new THREE.Color(0xaeb2b2), textured ? 0.06 : 0.19);
    }
  }
  if ('envMapIntensity' in material) material.envMapIntensity = category === 'interior' ? 0.55 : 0.9;
  material.needsUpdate = true;
  return material;
}

class SurfaceCalibrator {
  constructor(scene) {
    this.entries = [];
    this.counts = new Map();
    const cloneCache = new Map();

    scene.traverse((mesh) => {
      if (!mesh.isMesh || !mesh.material) return;
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const reference = sourceMaterials.map((source) => {
        if (!cloneCache.has(source)) cloneCache.set(source, cloneMaterial(source));
        return cloneCache.get(source);
      });
      const categories = reference.map((material) => classifyMaterial(mesh, material));
      const calibrated = reference.map((material, index) => calibratedMaterial(material, categories[index]));
      categories.forEach((category) => this.counts.set(category, (this.counts.get(category) ?? 0) + 1));
      this.entries.push({ mesh, wasArray: Array.isArray(mesh.material), reference, calibrated, categories });
    });
  }

  apply(surfaceEnabled, glassEnabled) {
    for (const entry of this.entries) {
      const materials = entry.reference.map((reference, index) => {
        const category = entry.categories[index];
        if (category === 'glazing') return glassEnabled ? entry.calibrated[index] : reference;
        return surfaceEnabled ? entry.calibrated[index] : reference;
      });
      entry.mesh.material = entry.wasArray ? materials : materials[0];
    }
  }

  dispose() {
    for (const entry of this.entries) {
      entry.reference.forEach((material) => material.dispose());
      entry.calibrated.forEach((material) => material.dispose());
    }
  }
}

class EngineAudioBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.channels = [];
    this.muted = false;
  }

  async start(engines) {
    if (this.context) {
      await this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('当前浏览器不支持 Web Audio API');
    this.context = new AudioContextClass({ latencyHint: 'interactive' });
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 18;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.008;
    compressor.release.value = 0.22;
    this.master = this.context.createGain();
    this.master.gain.value = 0.17;
    this.master.connect(compressor).connect(this.context.destination);

    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) noiseData[index] = Math.random() * 2 - 1;

    this.channels = engines.map((engine, index) => {
      const output = this.context.createGain();
      output.gain.value = 0;
      const panner = this.context.createStereoPanner();
      panner.pan.value = THREE.MathUtils.clamp((index - 1.5) / 1.8, -0.9, 0.9);
      output.connect(panner).connect(this.master);

      const fundamental = this.context.createOscillator();
      fundamental.type = 'sawtooth';
      const harmonic = this.context.createOscillator();
      harmonic.type = 'triangle';
      const harmonicGain = this.context.createGain();
      harmonicGain.gain.value = 0.23;
      const lowpass = this.context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.Q.value = 0.7;

      const noise = this.context.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseFilter = this.context.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.value = 0.55;
      const noiseGain = this.context.createGain();
      noiseGain.gain.value = 0.035;

      fundamental.connect(lowpass).connect(output);
      harmonic.connect(harmonicGain).connect(output);
      noise.connect(noiseFilter).connect(noiseGain).connect(output);
      fundamental.start();
      harmonic.start();
      noise.start();
      return { engine, output, fundamental, harmonic, lowpass, noiseFilter, sources: [fundamental, harmonic, noise] };
    });
    await this.context.resume();
  }

  update() {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const channel of this.channels) {
      const rpm = channel.engine.enabled ? channel.engine.currentRpm : 0;
      const normalized = THREE.MathUtils.clamp(rpm / 2600, 0, 1);
      const baseFrequency = 26 + rpm * 0.029;
      channel.fundamental.frequency.setTargetAtTime(baseFrequency, now, 0.035);
      channel.harmonic.frequency.setTargetAtTime(baseFrequency * 2.02, now, 0.035);
      channel.lowpass.frequency.setTargetAtTime(150 + normalized * 1080, now, 0.05);
      channel.noiseFilter.frequency.setTargetAtTime(95 + normalized * 820, now, 0.05);
      channel.output.gain.setTargetAtTime(this.muted ? 0 : normalized * 0.23, now, 0.055);
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  async dispose() {
    if (!this.context) return;
    for (const channel of this.channels) {
      for (const source of channel.sources) {
        try { source.stop(); } catch { /* source already stopped */ }
      }
    }
    await this.context.close();
    this.context = null;
    this.master = null;
    this.channels = [];
  }
}

class StateSnapshot {
  constructor(scene) {
    this.entries = [];
    scene.traverse((object) => {
      this.entries.push({
        object,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
        visible: object.visible,
        layersMask: object.layers.mask,
        morphs: object.morphTargetInfluences ? [...object.morphTargetInfluences] : null,
        material: object.isMesh ? object.material : null
      });
    });
  }

  restore() {
    for (const entry of this.entries) {
      entry.object.position.copy(entry.position);
      entry.object.quaternion.copy(entry.quaternion);
      entry.object.scale.copy(entry.scale);
      entry.object.visible = entry.visible;
      entry.object.layers.mask = entry.layersMask;
      if (entry.morphs && entry.object.morphTargetInfluences) {
        entry.object.morphTargetInfluences.splice(0, entry.object.morphTargetInfluences.length, ...entry.morphs);
      }
      if (entry.object.isMesh) entry.object.material = entry.material;
      entry.object.updateMatrix();
    }
  }

  fingerprint() {
    return JSON.stringify(this.entries.map((entry) => {
      const object = entry.object;
      const material = object.isMesh ? object.material : null;
      const materials = Array.isArray(material) ? material : material ? [material] : [];
      return [
        object.uuid,
        rounded(object.position.x), rounded(object.position.y), rounded(object.position.z),
        rounded(object.quaternion.x), rounded(object.quaternion.y), rounded(object.quaternion.z), rounded(object.quaternion.w),
        rounded(object.scale.x), rounded(object.scale.y), rounded(object.scale.z),
        object.visible ? 1 : 0,
        object.layers.mask,
        ...materials.map((item) => item.uuid)
      ];
    }));
  }
}

class B24Runtime {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10161a);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 10000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.86;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    UI.host.append(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 0.2;
    this.controls.maxDistance = 10000;

    this.aircraft = null;
    this.gltf = null;
    this.engines = [];
    this.surfaceCalibrator = null;
    this.snapshot = null;
    this.snapshotFingerprint = null;
    this.audio = new EngineAudioBank();
    this.phase = 'off';
    this.clock = new THREE.Clock();
    this.lastFrameTime = performance.now();
    this.fpsFrames = 0;
    this.fpsStart = performance.now();
    this.frameHandle = 0;
    this.diagnosticGroup = new THREE.Group();
    this.diagnosticGroup.name = 'B24_V009_DIAGNOSTIC_MARKERS';
    this.diagnosticGroup.visible = false;
    this.scene.add(this.diagnosticGroup);

    this.defaultCamera = {
      position: new THREE.Vector3(15, 9, 19),
      target: new THREE.Vector3()
    };

    this.installLighting();
    this.bindUi();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      this.clock.getDelta();
      this.lastFrameTime = performance.now();
    });
  }

  installLighting() {
    const hemisphere = new THREE.HemisphereLight(0xdce7ec, 0x343a3d, 1.6);
    this.scene.add(hemisphere);
    const key = new THREE.DirectionalLight(0xfff5e8, 3.2);
    key.position.set(10, 16, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 120;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xa8c8dc, 1.2);
    fill.position.set(-12, 5, -10);
    this.scene.add(fill);
  }

  bindUi() {
    UI.phaseGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-phase]');
      if (button) this.setPhase(button.dataset.phase);
    });
    UI.allEngines.addEventListener('click', () => {
      const shouldEnable = this.engines.some((engine) => !engine.enabled);
      this.engines.forEach((engine) => { engine.enabled = shouldEnable; });
      this.renderEngineControls();
    });
    UI.audioToggle.addEventListener('change', async () => {
      try {
        if (UI.audioToggle.checked) {
          await this.audio.start(this.engines);
          this.audio.setMuted(false);
        } else {
          this.audio.setMuted(true);
        }
      } catch (error) {
        UI.audioToggle.checked = false;
        UI.runtimeState.textContent = error instanceof Error ? error.message : String(error);
      }
    });
    UI.surfaceToggle.addEventListener('change', () => this.applySurfaceOptions());
    UI.glassToggle.addEventListener('change', () => this.applySurfaceOptions());
    UI.diagnosticToggle.addEventListener('change', () => {
      this.diagnosticGroup.visible = UI.diagnosticToggle.checked;
    });
    UI.focusAircraft.addEventListener('click', () => this.focusAircraft());
    UI.resetRuntime.addEventListener('click', () => this.reset());
  }

  async initialize() {
    try {
      const loaded = await loadLockedReference();
      this.gltf = loaded.gltf;
      this.aircraft = loaded.gltf.scene;
      this.aircraft.name = this.aircraft.name || 'B24_LOCKED_REFERENCE';
      this.scene.add(this.aircraft);
      this.aircraft.updateMatrixWorld(true);

      UI.sourceLock.dataset.state = 'pass';
      UI.sourceLock.querySelector('strong').textContent = '锁定参考资产校验通过';
      UI.sourceLock.querySelector('small').textContent = `${loaded.bytes.toLocaleString()} bytes · SHA256 已匹配`;
      setDiagnostic('source', 'pass', 'PASS');

      this.engines = discoverEngineGroups(this.aircraft, loaded.gltf.animations ?? []);
      while (this.engines.length < 4) {
        this.engines.push({
          id: this.engines.length + 1,
          enabled: true,
          currentRpm: 0,
          targetRpm: 0,
          response: PHASES.off.response,
          center: new THREE.Vector3(),
          targets: [],
          visuals: { static: new Set(), slow: new Set(), blur: new Set() },
          lastVisualMode: 'static'
        });
      }
      if (this.engines.length > 4) this.engines.length = 4;

      this.surfaceCalibrator = new SurfaceCalibrator(this.aircraft);
      this.surfaceCalibrator.apply(true, true);
      this.createDiagnosticMarkers();
      this.setPhase('off');
      this.renderEngineControls();
      this.focusAircraft();
      this.snapshot = new StateSnapshot(this.aircraft);
      this.snapshotFingerprint = this.snapshot.fingerprint();

      await this.runSelfChecks();
      UI.loading.classList.add('hidden');
      UI.runtimeState.textContent = 'V009 运行中';
      this.animate();
    } catch (error) {
      console.error(error);
      UI.sourceLock.dataset.state = 'fail';
      UI.sourceLock.querySelector('strong').textContent = '锁定参考资产校验失败';
      setDiagnostic('source', 'fail', 'FAIL');
      updateQaSummary();
      setLoading('B-24 锁定资产无法建立', error instanceof Error ? error.message : String(error));
      UI.loading.querySelector('.spinner').style.display = 'none';
    }
  }

  createDiagnosticMarkers() {
    this.diagnosticGroup.clear();
    for (const engine of this.engines) {
      const marker = new THREE.AxesHelper(0.7);
      marker.position.copy(engine.center);
      marker.name = `ENGINE_${engine.id}_AXIS_DIAGNOSTIC`;
      marker.className = 'diagnostic-marker';
      this.diagnosticGroup.add(marker);
    }
  }

  applySurfaceOptions() {
    this.surfaceCalibrator?.apply(UI.surfaceToggle.checked, UI.glassToggle.checked);
  }

  setPhase(phaseName) {
    const phase = PHASES[phaseName];
    if (!phase) return;
    this.phase = phaseName;
    for (const engine of this.engines) {
      engine.targetRpm = phase.visualRpm;
      engine.response = phase.response;
    }
    UI.phaseReadout.textContent = phase.label;
    UI.runtimeState.textContent = phaseName === 'off' ? '停机' : '运行中';
    [...UI.phaseGrid.querySelectorAll('[data-phase]')].forEach((button) => {
      button.classList.toggle('active', button.dataset.phase === phaseName);
    });
  }

  renderEngineControls() {
    UI.engineControls.replaceChildren();
    for (const engine of this.engines) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `engine-button ${engine.enabled ? 'active' : ''}`;
      button.innerHTML = `<strong>ENGINE ${engine.id}</strong><small>${engine.targets.length ? `${engine.targets.length} 旋转组` : '未识别'}</small>`;
      button.addEventListener('click', () => {
        engine.enabled = !engine.enabled;
        button.classList.toggle('active', engine.enabled);
      });
      UI.engineControls.append(button);
    }
  }

  focusAircraft() {
    if (!this.aircraft) return;
    const box = new THREE.Box3().setFromObject(this.aircraft);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.5);
    const direction = new THREE.Vector3(1.35, 0.58, 1.55).normalize();
    this.camera.position.copy(sphere.center).addScaledVector(direction, radius * 2.65);
    this.camera.near = Math.max(0.01, radius / 1000);
    this.camera.far = radius * 30;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(sphere.center);
    this.controls.minDistance = radius * 0.28;
    this.controls.maxDistance = radius * 8;
    this.controls.update();
    this.defaultCamera.position.copy(this.camera.position);
    this.defaultCamera.target.copy(this.controls.target);
  }

  async reset() {
    if (!this.snapshot) return;
    await this.audio.dispose();
    UI.audioToggle.checked = false;
    UI.surfaceToggle.checked = true;
    UI.glassToggle.checked = true;
    UI.diagnosticToggle.checked = false;
    this.diagnosticGroup.visible = false;
    this.snapshot.restore();
    this.engines.forEach((engine) => {
      engine.enabled = true;
      engine.currentRpm = 0;
      engine.targetRpm = 0;
      engine.response = PHASES.off.response;
      engine.lastVisualMode = 'static';
    });
    this.applySurfaceOptions();
    this.setPhase('off');
    this.renderEngineControls();
    this.camera.position.copy(this.defaultCamera.position);
    this.controls.target.copy(this.defaultCamera.target);
    this.controls.update();
    this.aircraft.updateMatrixWorld(true);
    const restored = this.snapshot.fingerprint() === this.snapshotFingerprint;
    setDiagnostic('reset', restored ? 'pass' : 'fail', restored ? 'PASS' : 'FAIL');
    updateQaSummary();
  }

  async runSelfChecks() {
    const completeEngines = this.engines.filter((engine) => engine.targets.length > 0);
    const enginePass = completeEngines.length === 4;
    setDiagnostic('engines', enginePass ? 'pass' : 'fail', `${completeEngines.length} / 4`);

    const firstTarget = completeEngines[0]?.targets[0];
    let rotationPass = false;
    if (firstTarget) {
      const before = firstTarget.object.quaternion.clone();
      const testEngine = completeEngines[0];
      const priorCurrent = testEngine.currentRpm;
      const priorTarget = testEngine.targetRpm;
      testEngine.enabled = true;
      testEngine.currentRpm = 900;
      testEngine.targetRpm = 900;
      updateEngine(testEngine, 0.12);
      rotationPass = before.angleTo(firstTarget.object.quaternion) > 1e-5;
      testEngine.currentRpm = priorCurrent;
      testEngine.targetRpm = priorTarget;
      this.snapshot.restore();
    }
    setDiagnostic('rotation', rotationPass ? 'pass' : 'fail', rotationPass ? 'PASS' : 'FAIL');

    const materialCounts = this.surfaceCalibrator?.counts ?? new Map();
    const hardwareCount = materialCounts.get('mechanical-hardware') ?? 0;
    const glassCount = materialCounts.get('glazing') ?? 0;
    const exteriorCount = materialCounts.get('exterior-metal') ?? 0;
    const materialsPass = hardwareCount > 0 && glassCount > 0 && exteriorCount > 0;
    setDiagnostic('materials', materialsPass ? 'pass' : 'fail', `${hardwareCount} / ${glassCount} / ${exteriorCount}`);

    const bellyObject = (() => {
      let match = null;
      this.aircraft.traverse((object) => {
        if (!match && NAME_RULES.belly.test(objectLabel(object))) match = object;
      });
      return match;
    })();
    if (bellyObject) bellyObject.visible = !bellyObject.visible;
    if (firstTarget) firstTarget.object.rotateOnAxis(firstTarget.axis, 0.41);
    this.snapshot.restore();
    this.applySurfaceOptions();
    const resetPass = this.snapshot.fingerprint() === this.snapshotFingerprint;
    setDiagnostic('reset', resetPass ? 'pass' : 'fail', resetPass ? 'PASS' : 'FAIL');
    updateQaSummary();
  }

  resize() {
    const width = Math.max(1, UI.host.clientWidth);
    const height = Math.max(1, UI.host.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    const frame = () => {
      this.frameHandle = requestAnimationFrame(frame);
      const now = performance.now();
      if (document.hidden) {
        this.lastFrameTime = now;
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - this.lastFrameTime) / 1000));
      this.lastFrameTime = now;
      for (const engine of this.engines) updateEngine(engine, dt);
      this.audio.update();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      this.fpsFrames += 1;
      if (now - this.fpsStart >= 800) {
        const fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsStart));
        UI.fpsReadout.textContent = String(fps);
        this.fpsFrames = 0;
        this.fpsStart = now;
      }
      const active = this.engines.filter((engine) => engine.enabled).length;
      const moving = this.engines.filter((engine) => engine.currentRpm > 30 && engine.targets.length).length;
      const averageRpm = this.engines.reduce((sum, engine) => sum + engine.currentRpm, 0) / Math.max(1, this.engines.length);
      UI.engineReadout.textContent = `${active} / 4`;
      UI.propReadout.textContent = moving ? `${moving} 组持续转动 · ${Math.round(averageRpm)} RPM*` : '静止';
    };
    frame();
  }
}

const runtime = new B24Runtime();
runtime.initialize();
window.__B24_V009_RUNTIME__ = runtime;
