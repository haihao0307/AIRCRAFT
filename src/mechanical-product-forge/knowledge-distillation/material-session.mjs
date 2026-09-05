/** Evidence-bound, renderer-independent material state. No mesh writes or preset fabrication. */
export const SCHEMA = 'wm.material-session/1';
export const PROJECTS = Object.freeze(['aircraft', 'b24']);
export const PARAMS = Object.freeze({
  wear: Object.freeze({ min: 0, max: 1, step: .01, default: .32 }),
  oil: Object.freeze({ min: 0, max: 1, step: .01, default: .28 }),
  oxidation: Object.freeze({ min: 0, max: 1, step: .01, default: .12 }),
  roughness: Object.freeze({ min: 0, max: 1, step: .01, default: .50 }),
  detail: Object.freeze({ min: 0, max: 1, step: .01, default: .68 })
}); // IDs and defaults transcribed from the indexed R019 HTML. Historical correctness unverified.
const SHA = /^[a-f0-9]{64}$/;
const clone = x => JSON.parse(JSON.stringify(x));
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const defaults = () => Object.fromEntries(Object.entries(PARAMS).map(([key, v]) => [key, v.default]));
function projectId(project) { requireThat(PROJECTS.includes(project), 'Unknown project'); return project; }
function valuesChecked(input) {
  requireThat(input && typeof input === 'object' && !Array.isArray(input), 'Invalid parameter object');
  requireThat(Object.keys(input).length === Object.keys(PARAMS).length, 'Parameter set mismatch');
  const out = {};
  for (const [key, spec] of Object.entries(PARAMS)) {
    requireThat(Object.hasOwn(input, key), `Missing parameter: ${key}`);
    const value = input[key];
    requireThat(typeof value === 'number' && Number.isFinite(value), `Not finite: ${key}`);
    requireThat(value >= spec.min && value <= spec.max, `Out of range: ${key}`);
    out[key] = value;
  }
  return out;
}
function identityChecked(lock) {
  requireThat(lock && typeof lock === 'object', 'Source lock required');
  const out = {};
  for (const project of PROJECTS) {
    const source = lock[project];
    requireThat(source && typeof source.revision === 'string' && source.revision.trim(), `Missing revision: ${project}`);
    for (const field of ['geometrySha256', 'uvSha256', 'nodeGraphSha256']) {
      requireThat(SHA.test(source[field] || ''), `Missing source identity: ${project}.${field}`);
    }
    out[project] = Object.fromEntries(['revision', 'geometrySha256', 'uvSha256', 'nodeGraphSha256'].map(k => [k, source[k]]));
  }
  return out;
}
export function createSession(sourceLock, { lockedProjects = [], initial } = {}) {
  const lock = identityChecked(sourceLock);
  const protectedProjects = new Set(lockedProjects.map(projectId));
  const state = Object.fromEntries(PROJECTS.map(p => [p, initial ? valuesChecked(initial[p]) : defaults()]));
  const original = clone(state);
  let active = 'aircraft';
  return Object.freeze({
    get active() { return active; },
    select(project) { active = projectId(project); return this.read(); },
    read(project = active) { return clone(state[projectId(project)]); },
    editable(project = active) { return !protectedProjects.has(projectId(project)); },
    set(key, value, project = active) {
      projectId(project);
      requireThat(!protectedProjects.has(project), 'Historical/project state is read-only');
      requireThat(Object.hasOwn(PARAMS, key), 'Unknown parameter');
      state[project] = valuesChecked({ ...state[project], [key]: value });
      return this.read(project);
    },
    reset(project = active) {
      projectId(project);
      requireThat(!protectedProjects.has(project), 'Historical/project state is read-only');
      state[project] = clone(original[project]);
      return this.read(project);
    },
    snapshot() { return { schema: SCHEMA, sourceLock: clone(lock), active, projects: clone(state) }; },
    restore(snapshot) {
      requireThat(snapshot && snapshot.schema === SCHEMA, 'Snapshot schema mismatch');
      requireThat(JSON.stringify(identityChecked(snapshot.sourceLock)) === JSON.stringify(lock), 'Snapshot belongs to another source');
      const nextActive = projectId(snapshot.active);
      requireThat(snapshot.projects && Object.keys(snapshot.projects).length === PROJECTS.length, 'Project set mismatch');
      const next = Object.fromEntries(PROJECTS.map(p => [p, valuesChecked(snapshot.projects[p])]));
      for (const p of protectedProjects) requireThat(JSON.stringify(next[p]) === JSON.stringify(state[p]), 'Snapshot changes a read-only project');
      // Commit only after every project, parameter and source identity has passed.
      for (const p of PROJECTS) state[p] = next[p];
      active = nextActive;
      return this.read();
    }
  });
}
const COLOR = new Set(['baseColorTexture', 'emissiveTexture']);
const DATA = new Set(['normalTexture', 'roughnessTexture', 'metallicTexture', 'occlusionTexture', 'heightTexture']);
export function textureEncoding(role) {
  if (COLOR.has(role)) return 'srgb';
  if (DATA.has(role)) return 'data';
  throw new Error('Unrecognized texture role: explicit metadata required');
}
export function srgbToLinear(value) {
  requireThat(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1, 'Expected sRGB value in [0,1]');
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}
export function decodeTextureSample(role, value) {
  requireThat(typeof value === 'number' && Number.isFinite(value), 'Expected finite sample');
  return textureEncoding(role) === 'srgb' ? srgbToLinear(value) : value;
}
export function normalConventionY(y, convention) {
  requireThat(typeof y === 'number' && Number.isFinite(y) && y >= -1 && y <= 1, 'Expected signed normal component');
  requireThat(['opengl', 'directx'].includes(convention), 'Unknown normal convention');
  return convention === 'directx' ? -y : y; // Does not modify UVs, pixel rows or the tangent frame.
}
