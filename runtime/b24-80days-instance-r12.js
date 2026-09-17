import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {NativeAircraft} from './native-aircraft.js';
import {BAY_POSES_R8 as BAY_POSES_R16} from './b24-r8-bay-poses.js';
import {applyDetailMaterials} from './b24-r10-detail-materials.js';
import {createSkinSystem} from './b24-r16-skin-system.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#scene');
const stage = $('#stage');
const loading = $('#loading');
const status = $('#status');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111512);

const perspective = new THREE.PerspectiveCamera(38, 1, 0.05, 300);
const ortho = new THREE.OrthographicCamera(-3, 3, 2, -2, 0.05, 300);
let activeCamera = perspective;

const orbitControls = new OrbitControls(perspective, canvas);
orbitControls.enableDamping = true;
const fixedControls = new OrbitControls(ortho, canvas);
fixedControls.enableDamping = true;
fixedControls.enableRotate = false;
fixedControls.enabled = false;

scene.add(new THREE.HemisphereLight(0xffffff, 0x70766f, 1.42));
const key = new THREE.DirectionalLight(0xffffff, 1.82);
key.position.set(11, 16, 13);
scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 1.18);
fill.position.set(-12, 7, -14);
scene.add(fill);
const under = new THREE.DirectionalLight(0xffffff, 1.25);
under.position.set(0, -12, 3);
scene.add(under);
const grid = new THREE.GridHelper(60, 30, 0x465145, 0x252c26);
grid.position.y = -2.64;
scene.add(grid);

window.__B24_STARTUP__ = {signal: undefined, report: () => {}};

const closedDoorAssetMatrices = {
  764: [-0.49668446950821343,0.0011307731244016028,0.014069963770630328,0,0.014070101328041505,0.000041894857995065575,0.4966857215883622,0,0.0011291336454995191,0.4968835947608482,-0.00007389760421291332,0,0.8929893849258252,-0.11867280071121095,-6.215742571136681,1],
  767: [-0.18265125350339223,0.0004158316623114882,0.0051741028303089465,0,0.005174153415811659,0.000015406457817620175,0.18265171394462346,0,0.000415228758667542,0.18272448002693129,-0.000027175180359972,0,0.9107880429065982,-0.10993806451448251,-6.214626848293713,1],
  773: [-0.495455446625045,-0.002166361297207074,-0.03464539317236424,0,-0.03464573921203004,-1.1677231358323145e-8,0.49546015973151086,0,-0.002161086061311173,0.4966652830940178,-0.0001511051640522352,0,-0.885395115535104,-0.11871993171932121,-6.215226474635511,1],
  776: [-0.1823878915073812,-0.0007974845607859755,-0.012753720348004982,0,-0.012753847732708197,-4.298642028453122e-9,0.18238962650405266,0,-0.0007955426320841896,0.18283325854118368,-0.00005562508688742101,0,-0.9092408840103107,-0.1100533783720577,-6.214442954298027,1]
};

const E04 = Object.freeze({
  width: 2000,
  height: 1243,
  sha256: '07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa'
});
const SOURCE_SHA = '799e52d96a3427ef11272974a1f2a1318fa1d32102dce445e079691fe36c12c4';
const R12_BRANCH_BASE = '09b3ad195b77ce45f9d6d548d1e7ac808c49c512';

const placement = {
  z: 6.7,
  y: -1.1,
  metresPerPixel: 0.0013,
  angle: 0
};
const placementUniform = {
  value: new THREE.Vector4(
    placement.z,
    placement.y,
    placement.metresPerPixel,
    placement.angle
  )
};

const SOURCE_URLS = Object.freeze({
  master: './assets/80-days-port-master/80-days-port-master.png',
  mouth: './assets/80-days-port-master/mouth.png',
  robby: './assets/80-days-port-master/robby.png',
  title: './assets/80-days-port-master/title.png',
  dice: './assets/80-days-port-master/dice.png'
});

const COMPONENT_ORDER = Object.freeze([
  'mouth',
  'robby',
  'title',
  'dice',
  'eye',
  'bombs',
  'flags'
]);

const BASE_COMPONENTS = Object.freeze({
  mouth: {
    label: '鲨鱼嘴',
    rect: [-650, 455, 2150, 661],
    source: 'mouth',
    proof: 'retained-source-pixels'
  },
  robby: {
    label: 'ROBBY',
    rect: [390, 245, 190, 135],
    source: 'robby',
    proof: 'retained-source-pixels'
  },
  title: {
    label: '80 DAYS',
    rect: [840, 150, 1210, 340],
    source: 'title',
    proof: 'retained-source-pixels'
  },
  dice: {
    label: '骰子',
    rect: [1180, 575, 535, 262],
    source: 'dice',
    proof: 'retained-source-pixels'
  },
  eye: {
    label: '右眼源区',
    rect: [700, 145, 215, 220],
    source: 'master-crop',
    crop: [367, 134, 197, 203],
    proof: 'retained-source-crop'
  },
  bombs: {
    label: '任务炸弹',
    rect: [930, 72, 950, 82],
    source: 'master-crop',
    crop: [535, 88, 900, 76],
    proof: 'retained-contours-yellow-reference',
    countStatus: 'unresolved'
  },
  flags: {
    label: '日本旗标',
    rect: [1570, 160, 217, 55],
    source: 'master-crop',
    crop: [1126, 164, 199, 50],
    proof: 'four-flags-supported-by-known-reference',
    count: 4
  }
});

function cloneComponents() {
  return Object.fromEntries(
    COMPONENT_ORDER.map(name => [
      name,
      {
        ...BASE_COMPONENTS[name],
        rect: [...BASE_COMPONENTS[name].rect],
        crop: BASE_COMPONENTS[name].crop
          ? [...BASE_COMPONENTS[name].crop]
          : undefined,
        enabled: true
      }
    ])
  );
}
const components = cloneComponents();

function applyAssetMatrix(aircraft, nodeId, array) {
  const node = aircraft.nodes[nodeId];
  if (!node) return;
  aircraft.group.updateMatrixWorld(true);
  node.parent.updateMatrixWorld(true);
  const target = new THREE.Matrix4().multiplyMatrices(
    aircraft.group.matrixWorld,
    new THREE.Matrix4().fromArray(array)
  );
  const local = new THREE.Matrix4().multiplyMatrices(
    node.parent.matrixWorld.clone().invert(),
    target
  );
  local.decompose(node.position, node.quaternion, node.scale);
  node.matrixAutoUpdate = true;
  node.updateMatrix();
  node.updateMatrixWorld(true);
}

function lockMotherPosture(aircraft) {
  for (const [id, value] of Object.entries(closedDoorAssetMatrices)) {
    applyAssetMatrix(aircraft, Number(id), value);
  }
  for (const part of BAY_POSES_R16.parts) {
    applyAssetMatrix(aircraft, part.sourceNode, part.closed);
  }
  aircraft.group.updateMatrixWorld(true);
}

async function loadTexture(loader, url) {
  const texture = await loader.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

async function loadSourceTextures() {
  const loader = new THREE.TextureLoader();
  const entries = await Promise.all(
    Object.entries(SOURCE_URLS).map(async ([keyName, url]) => [
      keyName,
      await loadTexture(loader, url)
    ])
  );
  return Object.fromEntries(entries);
}

function createProjectionUniforms(textures) {
  const uniforms = {
    visible: {value: 1},
    anchor: placementUniform,
    masterMap: {value: textures.master},
    mouthMap: {value: textures.mouth},
    robbyMap: {value: textures.robby},
    titleMap: {value: textures.title},
    diceMap: {value: textures.dice},
    rects: {},
    enabled: {}
  };
  for (const name of COMPONENT_ORDER) {
    uniforms.rects[name] = {
      value: new THREE.Vector4(...components[name].rect)
    };
    uniforms.enabled[name] = {
      value: components[name].enabled ? 1 : 0
    };
  }
  return uniforms;
}

function installComponentProjection(paintMeshes, textures) {
  const uniforms = createProjectionUniforms(textures);

  const declarations = `
uniform sampler2D r12MasterMap;
uniform sampler2D r12MouthMap;
uniform sampler2D r12RobbyMap;
uniform sampler2D r12TitleMap;
uniform sampler2D r12DiceMap;
uniform float r12Visible;
uniform vec4 r12Anchor;
uniform vec4 r12RectMouth;
uniform vec4 r12RectRobby;
uniform vec4 r12RectTitle;
uniform vec4 r12RectDice;
uniform vec4 r12RectEye;
uniform vec4 r12RectBombs;
uniform vec4 r12RectFlags;
uniform float r12EnabledMouth;
uniform float r12EnabledRobby;
uniform float r12EnabledTitle;
uniform float r12EnabledDice;
uniform float r12EnabledEye;
uniform float r12EnabledBombs;
uniform float r12EnabledFlags;
`;

  const projectionCode = `
vec2 r12Delta=vec2(r12Anchor.x-vSkinWorld.z,r12Anchor.y-vSkinWorld.y)/r12Anchor.z;
float r12Cos=cos(r12Anchor.w),r12Sin=sin(r12Anchor.w);
vec2 r12Photo=vec2(
  r12Cos*r12Delta.x+r12Sin*r12Delta.y,
  546.0-r12Sin*r12Delta.x+r12Cos*r12Delta.y
);
float r12PortGate=step(0.045,vSkinWorld.x)*r12Visible;
vec2 r12uv;
float r12inside;
vec4 r12layer;

r12uv=(r12Photo-r12RectMouth.xy)/r12RectMouth.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledMouth;
r12layer=texture2D(r12MouthMap,vec2(r12uv.x,1.0-r12uv.y));
r12layer.a*=r12inside;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);

r12uv=(r12Photo-r12RectRobby.xy)/r12RectRobby.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledRobby;
r12layer=texture2D(r12RobbyMap,vec2(r12uv.x,1.0-r12uv.y));
r12layer.a*=r12inside;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);

r12uv=(r12Photo-r12RectTitle.xy)/r12RectTitle.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledTitle;
r12layer=texture2D(r12TitleMap,vec2(r12uv.x,1.0-r12uv.y));
r12layer.a*=r12inside;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);

r12uv=(r12Photo-r12RectDice.xy)/r12RectDice.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledDice;
r12layer=texture2D(r12DiceMap,vec2(r12uv.x,1.0-r12uv.y));
r12layer.a*=r12inside;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);

r12uv=(r12Photo-r12RectEye.xy)/r12RectEye.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledEye;
vec2 r12EyeSource=vec2((367.0+r12uv.x*197.0)/2000.0,1.0-(134.0+r12uv.y*203.0)/1243.0);
r12layer=texture2D(r12MasterMap,r12EyeSource);
float r12EyeMask=1.0-smoothstep(0.92,1.0,length((r12uv-vec2(0.5))*2.0));
r12layer.a*=r12inside*r12EyeMask;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);

r12uv=(r12Photo-r12RectBombs.xy)/r12RectBombs.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledBombs;
vec2 r12BombSource=vec2((535.0+r12uv.x*900.0)/2000.0,1.0-(88.0+r12uv.y*76.0)/1243.0);
r12layer=texture2D(r12MasterMap,r12BombSource);
float r12Lum=dot(r12layer.rgb,vec3(0.2126,0.7152,0.0722));
r12layer.rgb=mix(vec3(0.322,0.227,0.035),vec3(0.937,0.745,0.118),step(0.11,r12Lum));
r12layer.a*=r12inside;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);

r12uv=(r12Photo-r12RectFlags.xy)/r12RectFlags.zw;
r12inside=step(0.0,r12uv.x)*step(r12uv.x,1.0)*step(0.0,r12uv.y)*step(r12uv.y,1.0)*r12PortGate*r12EnabledFlags;
vec2 r12FlagSource=vec2((1126.0+r12uv.x*199.0)/2000.0,1.0-(164.0+r12uv.y*50.0)/1243.0);
r12layer=texture2D(r12MasterMap,r12FlagSource);
r12layer.a*=r12inside;
outgoingLight=mix(outgoingLight,r12layer.rgb,r12layer.a);
`;

  for (const mesh of paintMeshes) {
    const material = mesh.material;
    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey?.bind(material);

    material.onBeforeCompile = shader => {
      previous?.(shader);
      shader.uniforms.r12MasterMap = uniforms.masterMap;
      shader.uniforms.r12MouthMap = uniforms.mouthMap;
      shader.uniforms.r12RobbyMap = uniforms.robbyMap;
      shader.uniforms.r12TitleMap = uniforms.titleMap;
      shader.uniforms.r12DiceMap = uniforms.diceMap;
      shader.uniforms.r12Visible = uniforms.visible;
      shader.uniforms.r12Anchor = uniforms.anchor;
      shader.uniforms.r12RectMouth = uniforms.rects.mouth;
      shader.uniforms.r12RectRobby = uniforms.rects.robby;
      shader.uniforms.r12RectTitle = uniforms.rects.title;
      shader.uniforms.r12RectDice = uniforms.rects.dice;
      shader.uniforms.r12RectEye = uniforms.rects.eye;
      shader.uniforms.r12RectBombs = uniforms.rects.bombs;
      shader.uniforms.r12RectFlags = uniforms.rects.flags;
      shader.uniforms.r12EnabledMouth = uniforms.enabled.mouth;
      shader.uniforms.r12EnabledRobby = uniforms.enabled.robby;
      shader.uniforms.r12EnabledTitle = uniforms.enabled.title;
      shader.uniforms.r12EnabledDice = uniforms.enabled.dice;
      shader.uniforms.r12EnabledEye = uniforms.enabled.eye;
      shader.uniforms.r12EnabledBombs = uniforms.enabled.bombs;
      shader.uniforms.r12EnabledFlags = uniforms.enabled.flags;
      shader.fragmentShader = declarations + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        projectionCode + '\n#include <opaque_fragment>'
      );
    };

    material.customProgramCacheKey = () =>
      `${previousKey ? previousKey() : ''}|80days-r12-independent-components-v1`;
    material.needsUpdate = true;
  }

  return {
    setVisible(value) {
      uniforms.visible.value = value ? 1 : 0;
    },
    setEnabled(name, value) {
      if (!uniforms.enabled[name]) return;
      components[name].enabled = Boolean(value);
      uniforms.enabled[name].value = value ? 1 : 0;
      syncAudit();
    },
    updateRect(name) {
      if (!uniforms.rects[name]) return;
      uniforms.rects[name].value.set(...components[name].rect);
      syncAudit();
    }
  };
}

function resize() {
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const aspect = width / height;
  renderer.setSize(width, height, false);
  perspective.aspect = aspect;
  perspective.updateProjectionMatrix();
  const halfHeight = ortho.userData.halfHeight || 2;
  ortho.left = -halfHeight * aspect;
  ortho.right = halfHeight * aspect;
  ortho.top = halfHeight;
  ortho.bottom = -halfHeight;
  ortho.updateProjectionMatrix();
}

function setOrtho(position, target, halfHeight) {
  activeCamera = ortho;
  orbitControls.enabled = false;
  fixedControls.enabled = true;
  ortho.userData.halfHeight = halfHeight;
  ortho.position.fromArray(position);
  ortho.up.set(0, 1, 0);
  fixedControls.target.fromArray(target);
  ortho.lookAt(fixedControls.target);
  ortho.zoom = 1;
  fixedControls.update();
  resize();
}

function setPerspective(position, target) {
  activeCamera = perspective;
  fixedControls.enabled = false;
  orbitControls.enabled = true;
  perspective.position.fromArray(position);
  perspective.up.set(0, 1, 0);
  orbitControls.target.fromArray(target);
  orbitControls.update();
}

function setView(view) {
  grid.visible = view === 'orbit';
  if (view === 'port') {
    setOrtho([40, -0.82, 5.63], [0, -0.82, 5.63], 1.73);
  } else if (view === 'orbit') {
    setPerspective([26, 8, 24], [0, 0, -2.56]);
  } else {
    setPerspective([3, -0.4, 10.05], [0.35, -0.82, 6.25]);
  }
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  status.textContent =
    view === 'port'
      ? 'R12 · 左舷逐件校准'
      : view === 'orbit'
        ? 'R12 · 整机透视'
        : 'R12 · 左前 3/4';
}

function snapshotComponents() {
  return Object.fromEntries(
    COMPONENT_ORDER.map(name => [
      name,
      {
        label: components[name].label,
        rect: [...components[name].rect],
        enabled: components[name].enabled,
        source: components[name].source,
        crop: components[name].crop
          ? [...components[name].crop]
          : undefined,
        proof: components[name].proof,
        count: components[name].count,
        countStatus: components[name].countStatus
      }
    ])
  );
}

function syncAudit() {
  if (!window.__B24_80DAYS_R12__) return;
  window.__B24_80DAYS_R12__.components = snapshotComponents();
  window.__B24_80DAYS_R12__.calibration.export = {
    schema: 'haihao.aircraft/80-days-r12-calibration@1',
    placement: {...placement},
    components: snapshotComponents()
  };
}

function updateCalibrationReadout(name) {
  const readout = $('#calibrationReadout');
  if (!readout) return;
  const component = components[name];
  readout.textContent = `${component.label} · x ${component.rect[0]} · y ${component.rect[1]} · w ${component.rect[2]} · h ${component.rect[3]}`;
}

function installCalibrationUI(projection) {
  const select = $('#componentSelect');
  const toggles = $('#componentToggles');
  const controls = $('#calibrationControls');
  if (!select || !toggles || !controls) return;

  for (const name of COMPONENT_ORDER) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = components[name].label;
    select.append(option);

    const label = document.createElement('label');
    label.className = 'component-toggle';
    label.innerHTML = `<input type="checkbox" data-component="${name}" checked><span>${components[name].label}</span>`;
    toggles.append(label);
  }

  let selected = COMPONENT_ORDER[0];
  updateCalibrationReadout(selected);

  select.addEventListener('change', () => {
    selected = select.value;
    updateCalibrationReadout(selected);
  });

  toggles.addEventListener('change', event => {
    const input = event.target.closest('input[data-component]');
    if (!input) return;
    projection.setEnabled(input.dataset.component, input.checked);
    status.textContent = `${components[input.dataset.component].label}：${input.checked ? '显示' : '隐藏'}`;
  });

  controls.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.dx || button.dataset.dy) {
      components[selected].rect[0] += Number(button.dataset.dx || 0);
      components[selected].rect[1] += Number(button.dataset.dy || 0);
      projection.updateRect(selected);
      updateCalibrationReadout(selected);
      status.textContent = `${components[selected].label} 已移动`;
      return;
    }

    if (button.dataset.scale) {
      const scale = Number(button.dataset.scale);
      const rect = components[selected].rect;
      const centerX = rect[0] + rect[2] / 2;
      const centerY = rect[1] + rect[3] / 2;
      rect[2] = Math.max(1, Math.round(rect[2] * scale));
      rect[3] = Math.max(1, Math.round(rect[3] * scale));
      rect[0] = Math.round(centerX - rect[2] / 2);
      rect[1] = Math.round(centerY - rect[3] / 2);
      projection.updateRect(selected);
      updateCalibrationReadout(selected);
      status.textContent = `${components[selected].label} 已缩放`;
      return;
    }

    if (button.id === 'resetCalibration') {
      const baseline = cloneComponents();
      for (const name of COMPONENT_ORDER) {
        components[name].rect = [...baseline[name].rect];
        components[name].enabled = true;
        projection.updateRect(name);
        projection.setEnabled(name, true);
        const input = toggles.querySelector(`[data-component="${name}"]`);
        if (input) input.checked = true;
      }
      updateCalibrationReadout(selected);
      status.textContent = 'R12 初始逐件位置已恢复';
      return;
    }

    if (button.id === 'exportCalibration') {
      syncAudit();
      const payload = JSON.stringify(
        window.__B24_80DAYS_R12__.calibration.export,
        null,
        2
      );
      try {
        await navigator.clipboard.writeText(payload);
        status.textContent = '校准 JSON 已复制';
      } catch {
        console.info('R12_CALIBRATION_EXPORT', payload);
        status.textContent = '校准 JSON 已写入控制台';
      }
    }
  });

  addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement) return;
    const step = event.shiftKey ? 10 : 2;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') components[selected].rect[0] -= step;
    if (event.key === 'ArrowRight') components[selected].rect[0] += step;
    if (event.key === 'ArrowUp') components[selected].rect[1] -= step;
    if (event.key === 'ArrowDown') components[selected].rect[1] += step;
    projection.updateRect(selected);
    updateCalibrationReadout(selected);
    status.textContent = `${components[selected].label} 已移动 ${step}px`;
  });
}

addEventListener('resize', resize);
resize();

try {
  const aircraft = await NativeAircraft.load(() => {});
  scene.add(aircraft.group);
  aircraft.group.position.set(0, 0, 0);
  aircraft.group.rotation.set(0, 0, 0);
  aircraft.group.scale.set(1, 1, 1);
  aircraft.group.updateMatrixWorld(true);
  lockMotherPosture(aircraft);
  applyDetailMaterials(aircraft, renderer);

  const skinSystem = createSkinSystem(aircraft, renderer);
  const textures = await loadSourceTextures();
  const projection = installComponentProjection(skinSystem.paintMeshes, textures);

  window.__B24_80DAYS_R12__ = {
    schema: 'haihao.aircraft/80-days-instance-runtime@12.0',
    predecessor: {
      branch: 'feature/b24-80days-scan-calibration-r10',
      commit: R12_BRANCH_BASE,
      runtime: 'R11.3'
    },
    mother: {
      id: 'b24-generic-mother-01',
      freezeCommit: '636f26ec102680b4154a6f9dca0cf49fc951f51e',
      modified: false
    },
    sourceArtwork: {
      sha256: SOURCE_SHA,
      referenceSha256: E04.sha256,
      redrawn: false,
      transport: 'independent-source-textures-and-provenance-crops'
    },
    projection: {
      method: 'independent-component-world-projection',
      leftRightMirrored: false,
      placement: {...placement}
    },
    components: snapshotComponents(),
    historicalConstraints: {
      sharkMouthInterior: 'dark-red-source-pixels',
      teeth: 'photo-derived-no-generated-uniform-triangles',
      redIris: false,
      leftWindowEye: false,
      portNames: ['ROBBY', 'HUFF-unresolved'],
      starboardNames: ['STAM-unstarted'],
      japaneseFlags: 4,
      missionBombCount: 'unresolved',
      missionBombDirection: 'downward',
      starboard: 'independent-not-mirrored-unstarted'
    },
    windowFrames: {
      red: false,
      glassTransparent: true,
      mode: 'unpainted-pending-verified-frame-mesh-binding',
      reason: 'R11 world-coordinate bars were not structural proof'
    },
    calibration: {
      independentlyAdjustable: true,
      keyboardStepPx: 2,
      shiftedKeyboardStepPx: 10,
      export: null
    },
    visualAcceptance: false,
    productionReady: false
  };
  syncAudit();

  window.__B24_AIRCRAFT__ = aircraft;
  loading.hidden = true;
  setView('port');
  installCalibrationUI(projection);

  $('#artToggle')?.addEventListener('change', event => {
    projection.setVisible(event.target.checked);
  });
  $('#views')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-view]');
    if (button) setView(button.dataset.view);
  });
} catch (error) {
  console.error(error);
  loading.hidden = false;
  loading.textContent = 'R12 载入失败：' + String(error?.message || error);
  status.textContent = 'R12 载入失败';
  window.__B24_80DAYS_R12_ERROR__ = String(error?.stack || error);
}

renderer.setAnimationLoop(() => {
  orbitControls.update();
  fixedControls.update();
  renderer.render(scene, activeCamera);
});