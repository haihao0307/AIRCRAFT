/**
 * Limited material-math experiment. No aircraft loading, UV binding or bake.
 * Paint coverage is area coverage of opaque dielectric paint over bare metal.
 * Intermediate values represent mixed boundary pixels, not metallic paint.
 */
export const channelRoles = Object.freeze({
  baseColor: 'sRGB',
  normal: 'non-color',
  roughness: 'non-color',
  height: 'non-color',
  metallic: 'non-color',
  ambientOcclusion: 'non-color',
  decalMask: 'non-color',
});

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be finite`);
  }
  return value;
}
function positive(value, name) {
  finite(value, name);
  if (value <= 0) throw new RangeError(`${name} must be positive`);
  return value;
}
function validateValues(values, expectedLength) {
  if (!values || !Number.isSafeInteger(values.length) || values.length < 1) {
    throw new TypeError('a non-empty numeric array is required');
  }
  if (expectedLength !== undefined && values.length !== expectedLength) {
    throw new RangeError('sample count does not match dimensions');
  }
  for (let i = 0; i < values.length; i++) finite(values[i], `sample ${i}`);
}

export function paintCoverageToMetalness(coverage) {
  validateValues(coverage);
  for (let i = 0; i < coverage.length; i++) {
    if (coverage[i] < 0 || coverage[i] > 1) {
      throw new RangeError('paint coverage must be within [0, 1]');
    }
  }
  return Float32Array.from(coverage, value => 1 - value);
}

/**
 * Height samples increase with +U columns and +V rows. Output is encoded
 * tangent-space normal RGB in [0,1]. The caller must explicitly specify
 * spacingU, spacingV and heightScale in mutually consistent length units.
 * No physical unit, artwork scale or historical surface relief is inferred.
 * OpenGL is +Y; DirectX flips only the encoded tangent Y component.
 * Finite differences use one-sided boundaries and centered interiors.
 */
export function heightToNormals(values, width, height, options = {}) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 2 || height < 2 || !Number.isSafeInteger(width * height)) {
    throw new RangeError('dimensions must be safe integers of at least 2');
  }
  const { spacingU, spacingV, heightScale, convention = 'OpenGL',
    maxOutputBytes = 256 * 1024 * 1024 } = options;
  positive(spacingU, 'spacingU');
  positive(spacingV, 'spacingV');
  positive(heightScale, 'heightScale');
  positive(maxOutputBytes, 'maxOutputBytes');
  if (!['OpenGL', 'DirectX'].includes(convention)) {
    throw new RangeError('unsupported normal convention');
  }
  const count = width * height;
  if (count * 3 * Float32Array.BYTES_PER_ELEMENT > maxOutputBytes) {
    throw new RangeError('normal output exceeds the explicit memory budget');
  }
  validateValues(values, count);
  const result = new Float32Array(count * 3);
  const ySign = convention === 'OpenGL' ? 1 : -1;
  for (let v = 0; v < height; v++) {
    const va = Math.max(0, v - 1), vb = Math.min(height - 1, v + 1);
    for (let u = 0; u < width; u++) {
      const ua = Math.max(0, u - 1), ub = Math.min(width - 1, u + 1);
      const du = (values[v * width + ub] - values[v * width + ua]) *
        heightScale / ((ub - ua) * spacingU);
      const dv = (values[vb * width + u] - values[va * width + u]) *
        heightScale / ((vb - va) * spacingV);
      finite(du, 'height gradient U'); finite(dv, 'height gradient V');
      const length = Math.hypot(du, dv, 1);
      finite(length, 'normal length');
      const i = (v * width + u) * 3;
      result[i] = 0.5 - 0.5 * du / length;
      result[i + 1] = 0.5 - 0.5 * ySign * dv / length;
      result[i + 2] = 0.5 + 0.5 / length;
    }
  }
  return result;
}
