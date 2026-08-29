const SCALE = 0.01673;
const SPACING = 7.9248;
const THICKNESS = 0.195;
const RUDDER_GAP = 0.018;
const MAX_YAW = Math.PI / 6;
const ORIGIN = [499, 2258];

const ANCHORS = [[490,2056],[505,2052],[525,2051],[545,2053],[565,2059],[583,2070],[598,2085],[607,2103],[612,2124],[614,2147],[614,2171],[612,2194],[606,2215],[596,2232],[582,2246],[565,2256],[545,2262],[523,2264],[503,2262],[485,2257],[469,2248],[457,2236],[449,2220],[444,2201],[442,2180],[442,2158],[442,2136],[444,2114],[450,2095],[460,2079],[474,2066]];
const HINGE = [[499,2059],[499.5,2095],[500.5,2140],[502,2190],[504,2235],[506,2258]];
const toProfile = ([x, y]) => [(x - ORIGIN[0]) * SCALE, (ORIGIN[1] - y) * SCALE];
const shiftedHinge = (point, direction) => {
  const [z, y] = toProfile(point);
  return [z + direction * RUDDER_GAP / 2, y];
};
const FIXED_PROFILE = [shiftedHinge(HINGE[0], 1), ...ANCHORS.slice(1, 18).map(toProfile), shiftedHinge(HINGE.at(-1), 1), ...HINGE.slice(1, -1).reverse().map((point) => shiftedHinge(point, 1))];
const RUDDER_PROFILE = [shiftedHinge(HINGE[0], -1), toProfile(ANCHORS[0]), ...ANCHORS.slice(18).reverse().map(toProfile), shiftedHinge(HINGE.at(-1), -1), ...HINGE.slice(1, -1).reverse().map((point) => shiftedHinge(point, -1))];

const fnv1a = (values) => {
  let hash = 0x811c9dc5;
  for (const value of values) {
    const bytes = new Uint8Array(new Float32Array([value]).buffer);
    for (const byte of bytes) hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

function pushTriangle(target, a, b, c) {
  target.push(...a, ...b, ...c);
}

function buildGeometry(THREE, profile, side, componentId, surfaceIds) {
  const outward = side === 'left' ? -1 : 1;
  const center = side === 'left' ? -SPACING / 2 : SPACING / 2;
  const outerX = center + outward * THICKNESS / 2;
  const innerX = center - outward * THICKNESS / 2;
  const points = profile.map(([z, y]) => new THREE.Vector2(z, y));
  const faces = THREE.ShapeUtils.triangulateShape(points, []);
  const outer = [];
  const inner = [];
  for (const [a, b, c] of faces) {
    const pa = profile[a], pb = profile[b], pc = profile[c];
    pushTriangle(outer, [outerX, pa[1], pa[0]], [outerX, pb[1], pb[0]], [outerX, pc[1], pc[0]]);
    pushTriangle(inner, [innerX, pc[1], pc[0]], [innerX, pb[1], pb[0]], [innerX, pa[1], pa[0]]);
  }
  for (let index = 0; index < profile.length; index += 1) {
    const next = (index + 1) % profile.length;
    const a = profile[index], b = profile[next];
    pushTriangle(outer, [outerX, a[1], a[0]], [innerX, a[1], a[0]], [outerX, b[1], b[0]]);
    pushTriangle(outer, [outerX, b[1], b[0]], [innerX, a[1], a[0]], [innerX, b[1], b[0]]);
  }
  const positions = [...outer, ...inner];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.addGroup(0, outer.length / 3, 0);
  geometry.addGroup(outer.length / 3, inner.length / 3, 1);
  geometry.userData = {
    componentId,
    geometryHash: fnv1a(positions),
    runtimeMirror: false,
    surfaceDomains: [
      { surfaceId: surfaceIds[0], triangleStart: 0, triangleCount: outer.length / 9 },
      { surfaceId: surfaceIds[1], triangleStart: outer.length / 9, triangleCount: inner.length / 9 }
    ]
  };
  return geometry;
}

function materialPair(THREE, color) {
  return [
    new THREE.MeshStandardMaterial({ color, roughness: 0.54, metalness: 0.66, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.72), roughness: 0.63, metalness: 0.57, side: THREE.DoubleSide })
  ];
}

function addDetails(THREE, group, profile, side, role) {
  const center = side === 'left' ? -SPACING / 2 : SPACING / 2;
  const linePoints = profile.map(([z, y]) => new THREE.Vector3(center + (side === 'left' ? -1 : 1) * (THICKNESS / 2 + 0.004), y, z));
  linePoints.push(linePoints[0]);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePoints), new THREE.LineBasicMaterial({ color: role === 'rudder' ? 0xffa24a : 0x77e4ed }));
  line.userData.surfaceProgram = 'panel-boundary';
  group.add(line);
  const rivets = profile.filter((_, index) => index % 2 === 0).map(([z, y]) => new THREE.Vector3(center + (side === 'left' ? -1 : 1) * (THICKNESS / 2 + 0.007), y, z));
  const points = new THREE.Points(new THREE.BufferGeometry().setFromPoints(rivets), new THREE.PointsMaterial({ color: 0xd8e1df, size: 0.025, sizeAttenuation: true }));
  points.userData.surfaceProgram = 'rivet';
  group.add(points);
}

export function createB24VerticalTailRuntime(THREE) {
  const root = new THREE.Group();
  root.name = 'b24.vertical-tail.native-candidate-v001';
  const components = new Map();
  const pivots = new Map();
  const definitions = [
    ['left', 'stabilizer', 'empennage.vertical.left.stabilizer', FIXED_PROFILE, ['empennage.vertical.left.stabilizer.outer','empennage.vertical.left.stabilizer.inner']],
    ['left', 'rudder', 'empennage.vertical.left.rudder', RUDDER_PROFILE, ['empennage.vertical.left.rudder.outer','empennage.vertical.left.rudder.inner']],
    ['right', 'stabilizer', 'empennage.vertical.right.stabilizer', FIXED_PROFILE, ['empennage.vertical.right.stabilizer.outer','empennage.vertical.right.stabilizer.inner']],
    ['right', 'rudder', 'empennage.vertical.right.rudder', RUDDER_PROFILE, ['empennage.vertical.right.rudder.outer','empennage.vertical.right.rudder.inner']]
  ];
  for (const [side, role, componentId, profile, surfaces] of definitions) {
    const geometry = buildGeometry(THREE, profile, side, componentId, surfaces);
    const mesh = new THREE.Mesh(geometry, materialPair(THREE, role === 'rudder' ? 0xc97738 : 0x4f9ca5));
    mesh.name = componentId;
    mesh.userData = { componentId, side, role, geometryRecipeApproved: false };
    if (role === 'rudder') {
      const hinge = toProfile(HINGE[0]);
      const center = side === 'left' ? -SPACING / 2 : SPACING / 2;
      const pivot = new THREE.Group();
      pivot.name = `${componentId}.hinge-pivot`;
      pivot.position.set(center, hinge[1], hinge[0]);
      mesh.position.set(-center, -hinge[1], -hinge[0]);
      pivot.add(mesh);
      root.add(pivot);
      pivots.set(side, pivot);
    } else {
      root.add(mesh);
    }
    addDetails(THREE, role === 'rudder' ? mesh : root, profile, side, role);
    components.set(componentId, mesh);
  }
  const neutralFixedMatrices = new Map([...components].filter(([, mesh]) => mesh.userData.role === 'stabilizer').map(([id, mesh]) => [id, mesh.matrix.clone()]));
  const setPilotYaw = (value) => {
    const normalized = Math.max(-1, Math.min(1, Number(value) || 0));
    for (const pivot of pivots.values()) pivot.rotation.y = normalized * MAX_YAW;
    root.updateMatrixWorld(true);
    return normalized;
  };
  const report = () => ({
    componentCount: components.size,
    bufferGeometryCount: [...components.values()].filter((mesh) => mesh.geometry?.isBufferGeometry).length,
    geometryHashes: Object.fromEntries([...components].map(([id, mesh]) => [id, mesh.geometry.userData.geometryHash])),
    surfaces: [...components.values()].flatMap((mesh) => mesh.geometry.userData.surfaceDomains),
    yawDegrees: [...pivots.values()][0].rotation.y * 180 / Math.PI,
    fixedMatricesUnchanged: [...neutralFixedMatrices].every(([id, matrix]) => matrix.equals(components.get(id).matrix)),
    runtimeLoadsGlb: false,
    approvals: { geometryRecipesApproved: false, behaviorGraphApproved: false, surfaceSystemApproved: false, verticalTailApproved: false }
  });
  setPilotYaw(0);
  return { root, components, pivots, setPilotYaw, report, constants: { spacing: SPACING, thickness: THICKNESS, rudderGap: RUDDER_GAP, maxYawDegrees: 30 } };
}
