import test from 'node:test';
import assert from 'node:assert/strict';
import { channelRoles, paintCoverageToMetalness, heightToNormals } from './material-channels.mjs';
const units = { spacingU: 1, spacingV: 1, heightScale: 1 };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('opaque paint is non-metal; exposed metal is metal; edge coverage is explicit', () => {
  assert.deepEqual([...paintCoverageToMetalness([1, 0, 0.25])], [0, 1, 0.75]);
});
test('paint mask is not changed and unrelated color cannot control metalness', () => {
  const values = new Float32Array([1, 0]);
  paintCoverageToMetalness(values);
  assert.deepEqual([...values], [1, 0]);
  assert.notEqual(paintCoverageToMetalness([1])[0], 0x24 / 255);
});
test('invalid coverage is rejected rather than silently clamped', () => {
  for (const v of [[-0.1], [1.1], [NaN], [Infinity], ['1'], []]) {
    assert.throws(() => paintCoverageToMetalness(v));
  }
});
test('flat height produces a neutral normal, not a decorative RGB pattern', () => {
  const n = heightToNormals([2, 2, 2, 2], 2, 2, units);
  assert.deepEqual([...n], [0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 1]);
});
test('positive U slope points against the height gradient, including boundaries', () => {
  const values = [0, 1, 2, 0, 1, 2, 0, 1, 2];
  const before = [...values];
  const n = heightToNormals(values, 3, 3, units);
  for (let i = 0; i < n.length; i += 3) {
    close(n[i], 0.5 - 0.5 / Math.sqrt(2));
    close(n[i + 1], 0.5); close(n[i + 2], 0.5 + 0.5 / Math.sqrt(2));
  }
  assert.deepEqual(values, before);
});
test('OpenGL and DirectX differ only in tangent Y', () => {
  const gl = heightToNormals([0, 0, 1, 1], 2, 2, units);
  const dx = heightToNormals([0, 0, 1, 1], 2, 2, { ...units, convention: 'DirectX' });
  for (let i = 0; i < gl.length; i += 3) {
    close(gl[i], dx[i]); close(gl[i + 1] + dx[i + 1], 1); close(gl[i + 2], dx[i + 2]);
  }
});
test('consistent rescaling of height and spacing preserves the normal', () => {
  const a = heightToNormals([0, 1, 2, 3], 2, 2, units);
  const b = heightToNormals([0, 1, 2, 3], 2, 2, { spacingU: 1000, spacingV: 1000, heightScale: 1000 });
  assert.deepEqual(a, b);
});
test('normals are normalized and remain in the encoded range', () => {
  const n = heightToNormals([0, 0.2, 0.7, -0.3, 1, 0.4, 0, 2, -1], 3, 3, units);
  for (let i = 0; i < n.length; i += 3) {
    for (let j = 0; j < 3; j++) assert.ok(n[i + j] >= 0 && n[i + j] <= 1);
    close(Math.hypot(n[i] * 2 - 1, n[i + 1] * 2 - 1, n[i + 2] * 2 - 1), 1);
  }
});
test('missing units, malformed grids, unknown conventions and over-budget outputs fail', () => {
  assert.throws(() => heightToNormals([0, 0, 0, 0], 2, 2));
  assert.throws(() => heightToNormals([0], 2, 2, units));
  assert.throws(() => heightToNormals([0, 0, NaN, 0], 2, 2, units));
  assert.throws(() => heightToNormals([0, 0, 0, 0], 2, 2, { ...units, spacingU: 0 }));
  assert.throws(() => heightToNormals([0, 0, 0, 0], 2, 2, { ...units, convention: 'unknown' }));
  assert.throws(() => heightToNormals([0, 0, 0, 0], 2, 2, { ...units, maxOutputBytes: 1 }));
  assert.throws(() => heightToNormals([0, Number.MAX_VALUE, Number.MAX_VALUE, 0], 2, 2, units));
});
test('only base color is color-managed; scalar maps and normals stay non-color', () => {
  assert.equal(channelRoles.baseColor, 'sRGB');
  for (const [key, value] of Object.entries(channelRoles)) {
    if (key !== 'baseColor') assert.equal(value, 'non-color');
  }
});
