/** Opt-in adapter for the existing R019 numeric controls. No alternative viewer, model, or loader. */
import { PARAMS, PROJECTS, createSession } from './material-session.mjs';
export const R019_DEPENDENCIES = Object.freeze([
  '../../src/mechanical-product-forge/r019-exact-workbench.css',
  ...['exact-data-catalog', 'aircraft-anm2-core.exactdata', 'feed-system.exactdata', 'ammunition.exactdata',
    'disintegrating-link.exactdata', 'mechanism-reference.exactdata', 'b24-starboard-adapter.exactdata', 'b24-port-reference.exactdata']
    .map(x => `../../data/weapons-mother/anm2-exact-v019/${x}.js`),
  '../../src/mechanical-product-forge/anm2-exact-data-runtime.js'
]);
const validHash = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
export function dependencyGate(records) {
  const items = R019_DEPENDENCIES.map(path => {
    const matches = Array.isArray(records) ? records.filter(r => r?.path === path) : [];
    const r = matches.length === 1 ? matches[0] : null;
    const reason = matches.length > 1 ? 'duplicate' : !r ? 'missing' : r.available !== true ? 'unavailable'
      : !validHash(r.expectedSha256) ? 'unverified_source' : !validHash(r.actualSha256) ? 'not_hashed'
      : r.expectedSha256 !== r.actualSha256 ? 'hash_mismatch' : 'verified';
    return { path, reason };
  });
  return { ready: items.every(x => x.reason === 'verified'), items, blocked: items.filter(x => x.reason !== 'verified').length };
}
export function mountR019MaterialPanel({ document, adapter, sourceLock, dependencies = [], sessionOptions = {} }) {
  const gate = dependencyGate(dependencies);
  const controls = Object.keys(PARAMS).map(key => [key, document.getElementById(key)]);
  const status = document.getElementById('status');
  if (controls.some(([, el]) => !el) || !status) throw new Error('Required R019 DOM controls are missing');
  if (status.dataset.wmMaterialBridge === 'mounted') throw new Error('Material bridge is already mounted');
  // The renderer must explicitly hand over the five material inputs to avoid duplicate listeners.
  const usable = adapter?.ownsMaterialInputs === true && ['applyMaterialState', 'readSourceLock', 'readMaterialState'].every(k => typeof adapter[k] === 'function');
  if (!gate.ready || !usable) {
    controls.forEach(([, el]) => { el.disabled = true; });
    status.textContent = !gate.ready ? `R019 依赖待核实：${gate.blocked} 项` : 'R019 材质运行接口尚未接入';
    return Object.freeze({ ready: false, gate, dispose() {} });
  }
  const observed = createSession(adapter.readSourceLock()).snapshot().sourceLock;
  const expected = createSession(sourceLock).snapshot().sourceLock;
  if (JSON.stringify(observed) !== JSON.stringify(expected)) throw new Error('Runtime source identity mismatch');
  const initial = Object.fromEntries(PROJECTS.map(p => [p, adapter.readMaterialState(p)]));
  const session = createSession(sourceLock, { ...sessionOptions, initial });
  const listeners = [];
  let disposed = false;
  const guard = () => { if (disposed) throw new Error('Material bridge has been disposed'); };
  function render() {
    for (const [key, input] of controls) {
      input.value = String(session.read()[key]);
      input.disabled = !session.editable();
      const output = input.nextElementSibling;
      if (output?.tagName === 'OUTPUT') output.value = session.read()[key].toFixed(2);
    }
  }
  function apply(projects = [session.active]) {
    const current = createSession(adapter.readSourceLock()).snapshot().sourceLock;
    if (JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('Runtime source changed');
    // Small value object only. No geometry, node graph, UV or source-file mutation authority.
    for (const project of projects) {
      const result = adapter.applyMaterialState({ project, values: session.read(project), source: session.snapshot().sourceLock[project] });
      if (result !== true) throw new Error('Runtime did not acknowledge synchronous material update');
    }
  }
  function change(fn, projects) {
    guard();
    const previous = session.snapshot();
    try { fn(); apply(projects); status.textContent = '材质参数已交给运行时，视觉效果待检查'; }
    catch (error) {
      session.restore(previous);
      try { apply(PROJECTS); } catch { status.textContent = '运行时恢复失败，参数已停用'; controls.forEach(([, el]) => { el.disabled = true; }); disposed = true; }
      if (!disposed) status.textContent = `参数变更已撤销：${error.message}`;
      throw error;
    } finally { if (!disposed) render(); }
  }
  // Mounting reads actual runtime values and never applies HTML defaults to an existing material.
  render();
  for (const [key, input] of controls) {
    const listener = () => {
      try {
        if (!input.value.trim()) throw new Error('Empty parameter value');
        change(() => session.set(key, Number(input.value)));
      } catch (error) { if (!disposed) render(); status.textContent = `参数未采用：${error.message}`; }
    };
    input.addEventListener('input', listener); listeners.push([input, listener]);
  }
  status.dataset.wmMaterialBridge = 'mounted';
  return Object.freeze({
    get ready() { return !disposed; }, gate,
    select(project) { change(() => session.select(project)); },
    reset() { change(() => session.reset()); },
    exportState() { guard(); return JSON.stringify(session.snapshot(), null, 2); },
    importState(text) { change(() => session.restore(JSON.parse(text)), PROJECTS); },
    dispose() { for (const [el, fn] of listeners) el.removeEventListener('input', fn); disposed = true; delete status.dataset.wmMaterialBridge; }
  });
}
