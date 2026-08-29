import * as THREE from 'three';

const PROP_PATTERN = /prop|propeller|airscrew|air_screw|blade|spinner|rotor/i;
const BLUR_PATTERN = /blur|disc|disk|fast|spin/i;
const SLOW_PATTERN = /slow|medium|mid/i;

function trackNodeName(trackName) {
  try {
    return THREE.PropertyBinding.parseTrackName(trackName).nodeName;
  } catch {
    return trackName.slice(0, trackName.lastIndexOf('.'));
  }
}

function axisFromTrack(track) {
  if (!track || track.values.length < 8) return new THREE.Vector3(0, 0, 1);
  const first = new THREE.Quaternion().fromArray(track.values, 0).normalize();
  const sampleOffset = Math.max(4, Math.floor((track.values.length - 4) / 8) * 4);
  const sample = new THREE.Quaternion().fromArray(track.values, sampleOffset).normalize();
  const delta = first.clone().invert().multiply(sample).normalize();
  if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
  const sine = Math.sqrt(Math.max(0, 1 - delta.w * delta.w));
  if (sine <= 1e-5) return new THREE.Vector3(0, 0, 1);
  return new THREE.Vector3(delta.x / sine, delta.y / sine, delta.z / sine).normalize();
}

function visualSets(target) {
  const result = { static: new Set(), slow: new Set(), blur: new Set() };
  const scanRoots = new Set([target]);
  if (target.parent) scanRoots.add(target.parent);
  for (const root of scanRoots) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      const label = `${object.name ?? ''} ${Array.isArray(object.material) ? object.material.map((item) => item?.name ?? '').join(' ') : object.material?.name ?? ''}`;
      if (!PROP_PATTERN.test(label) && root !== target) return;
      if (BLUR_PATTERN.test(label)) result.blur.add(object);
      else if (SLOW_PATTERN.test(label)) result.slow.add(object);
      else result.static.add(object);
    });
  }
  if (!result.static.size && !result.slow.size && !result.blur.size) result.static.add(target);
  return result;
}

function clusterFour(entries) {
  if (entries.length < 4) return [];
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const entry of entries) {
    min.min(entry.center);
    max.max(entry.center);
  }
  const spread = max.clone().sub(min);
  const axis = spread.x >= spread.y && spread.x >= spread.z ? 0 : spread.y >= spread.z ? 1 : 2;
  const sorted = entries.map((entry) => entry.center.getComponent(axis)).sort((a, b) => a - b);
  const centroids = [0.08, 0.36, 0.64, 0.92].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]);
  let groups = [[], [], [], []];
  for (let iteration = 0; iteration < 20; iteration += 1) {
    groups = [[], [], [], []];
    for (const entry of entries) {
      const value = entry.center.getComponent(axis);
      let choice = 0;
      let distance = Infinity;
      centroids.forEach((centroid, index) => {
        const candidateDistance = Math.abs(value - centroid);
        if (candidateDistance < distance) {
          distance = candidateDistance;
          choice = index;
        }
      });
      groups[choice].push(entry);
    }
    groups.forEach((group, index) => {
      if (group.length) centroids[index] = group.reduce((sum, entry) => sum + entry.center.getComponent(axis), 0) / group.length;
    });
  }
  return groups.map((group, index) => ({ group, centroid: centroids[index] })).sort((a, b) => a.centroid - b.centroid).map((item) => item.group);
}

function buildAnimationLedEngines(runtime) {
  const tracksByObject = new Map();
  for (const clip of runtime.gltf?.animations ?? []) {
    for (const track of clip.tracks) {
      if (!track.name.toLowerCase().endsWith('.quaternion') || !PROP_PATTERN.test(track.name)) continue;
      const object = runtime.aircraft.getObjectByName(trackNodeName(track.name));
      if (!object) continue;
      if (!tracksByObject.has(object)) tracksByObject.set(object, track);
    }
  }
  runtime.aircraft.updateMatrixWorld(true);
  const entries = [...tracksByObject].map(([object, track]) => ({
    object,
    track,
    center: new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
  }));
  const groups = clusterFour(entries);
  if (groups.length !== 4 || groups.some((group) => group.length === 0)) return null;

  return groups.map((group, index) => {
    const center = group.reduce((sum, entry) => sum.add(entry.center), new THREE.Vector3()).multiplyScalar(1 / group.length);
    const visuals = { static: new Set(), slow: new Set(), blur: new Set() };
    for (const entry of group) {
      const localVisuals = visualSets(entry.object);
      for (const key of Object.keys(visuals)) localVisuals[key].forEach((object) => visuals[key].add(object));
    }
    return {
      id: index + 1,
      enabled: true,
      currentRpm: 0,
      targetRpm: 0,
      response: 9,
      center,
      targets: group.map((entry) => ({
        object: entry.object,
        axis: axisFromTrack(entry.track),
        direction: index % 2 === 0 ? 1 : -1
      })),
      visuals,
      lastVisualMode: 'static'
    };
  });
}

async function waitForRuntime() {
  const deadline = performance.now() + 180000;
  while (performance.now() < deadline) {
    const runtime = window.__B24_V009_RUNTIME__;
    if (runtime?.aircraft && runtime?.gltf && runtime?.snapshot) return runtime;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('B24 V009 runtime did not initialize before production-patch timeout');
}

try {
  const runtime = await waitForRuntime();
  const engines = buildAnimationLedEngines(runtime);
  if (engines) {
    runtime.engines = engines;
    runtime.setPhase(runtime.phase ?? 'off');
    runtime.renderEngineControls();
    runtime.createDiagnosticMarkers();
    await runtime.runSelfChecks();
    window.__B24_V009_PRODUCTION_PATCH__ = {
      status: 'animation-led-engine-pivots-active',
      engineCount: engines.length,
      targets: engines.map((engine) => engine.targets.length)
    };
  } else {
    window.__B24_V009_PRODUCTION_PATCH__ = {
      status: 'base-discovery-retained',
      engineCount: runtime.engines.length,
      targets: runtime.engines.map((engine) => engine.targets.length)
    };
  }
} catch (error) {
  console.error(error);
  window.__B24_V009_PRODUCTION_PATCH__ = {
    status: 'failed',
    error: error instanceof Error ? error.message : String(error)
  };
}
