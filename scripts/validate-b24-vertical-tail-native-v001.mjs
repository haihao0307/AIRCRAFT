import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { createB24VerticalTailRuntime } from '../src/b24-native/vertical-tail-runtime-v001.js';

const contract = JSON.parse(fs.readFileSync('data/b24-native/components/empennage/vertical-tail-native-candidate-v001.json', 'utf8'));
const module = JSON.parse(fs.readFileSync('data/b24-native/surface-modules/empennage/vertical-tail-module.template.json', 'utf8'));
const runtime = createB24VerticalTailRuntime(THREE);
const worldVertices = (mesh) => {
  const attribute = mesh.geometry.getAttribute('position');
  return Array.from({ length: attribute.count }, (_, index) => new THREE.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(mesh.matrixWorld));
};
const minimumVertexClearance = (first, second) => {
  let minimum = Infinity;
  for (const a of worldVertices(first)) for (const b of worldVertices(second)) minimum = Math.min(minimum, a.distanceTo(b));
  return minimum;
};
assert.equal(contract.recipes.length, 4);
assert.equal(runtime.components.size, 4);
assert.equal(runtime.report().bufferGeometryCount, 4);
assert.equal(new Set(Object.values(runtime.report().geometryHashes)).size, 4, 'four recipes must compile independently');
assert.equal(runtime.report().surfaces.length, 8);
assert.equal(new Set(runtime.report().surfaces.map((entry) => entry.surfaceId)).size, 8);
assert.ok(runtime.report().surfaces.every((entry) => entry.triangleCount > 0));
assert.equal(module.parameter_domains.length, 8);
assert.ok(Object.values(module.surface_programs).every(Boolean));

const fixedBefore = [...runtime.components.values()].filter((mesh) => mesh.userData.role === 'stabilizer').map((mesh) => mesh.matrixWorld.clone());
const pivotBefore = [...runtime.pivots.values()].map((pivot) => pivot.getWorldPosition(new THREE.Vector3()));
for (let cycle = 0; cycle < 25; cycle += 1) for (const value of [0, -1, 1, 0]) runtime.setPilotYaw(value);
const pivotAfter = [...runtime.pivots.values()].map((pivot) => pivot.getWorldPosition(new THREE.Vector3()));
assert.ok(pivotBefore.every((point, index) => point.distanceTo(pivotAfter[index]) < 1e-10), 'rudder pivots drifted');
assert.ok(fixedBefore.every((matrix, index) => matrix.equals([...runtime.components.values()].filter((mesh) => mesh.userData.role === 'stabilizer')[index].matrixWorld)), 'fixed fins moved');
runtime.setPilotYaw(-1); assert.ok([...runtime.pivots.values()].every((pivot) => Math.abs(pivot.rotation.y + Math.PI / 6) < 1e-10));
runtime.setPilotYaw(1); assert.ok([...runtime.pivots.values()].every((pivot) => Math.abs(pivot.rotation.y - Math.PI / 6) < 1e-10));
runtime.setPilotYaw(0); assert.ok([...runtime.pivots.values()].every((pivot) => pivot.rotation.y === 0));
const clearanceByState = {};
for (const value of [-1, 0, 1]) {
  runtime.setPilotYaw(value);
  clearanceByState[value] = {};
  for (const side of ['left', 'right']) {
    const clearance = minimumVertexClearance(runtime.components.get(`empennage.vertical.${side}.stabilizer`), runtime.components.get(`empennage.vertical.${side}.rudder`));
    clearanceByState[value][side] = clearance;
    assert.ok(clearance >= runtime.constants.rudderGap * 0.95, `${side} candidate fin/rudder vertex clearance collapsed at yaw ${value}`);
  }
}
runtime.setPilotYaw(0);
assert.ok(Object.values(contract.approval).every((value) => value === false));

const source = fs.readFileSync(contract.source.local_asset);
assert.equal(source.length, contract.source.bytes);
assert.equal(crypto.createHash('sha256').update(source).digest('hex'), contract.source.sha256);
const report = { schema: 'haihao.aircraft/b24-vertical-tail-static-qa@1.0.0', status: 'pass', ...runtime.report(), sourceLockVerified: true, repeatedCommandCycles: 25, candidateVertexClearanceMetres: clearanceByState, completeAircraftCollisionApproval: false };
fs.mkdirSync('reports/b24-native/generated/vertical-tail-v001', { recursive: true });
fs.writeFileSync('reports/b24-native/generated/vertical-tail-v001/static-qa.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
