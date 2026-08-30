import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = relative => JSON.parse(readText(relative));

const policy = readJson('data/aircraft-native/forge-policy.json');
assert.equal(policy.schema, 'haihao.aircraft/native-forge-policy@1.0.0');
assert.equal(policy.system_id, 'AIRCRAFT_NATIVE_FORGE');
assert.equal(policy.status, 'active-foundation');
assert.equal(policy.authority.upstream_controller, 'ChatGPT');
assert.equal(policy.authority.implementation_executor, 'Codex');
assert.equal(policy.authority.automatic_semantic_approval, false);
assert.equal(policy.mother_data.renderer_independent, true);
assert.equal(policy.uncertainty_policy.unknown_state, 'unresolved');
assert.equal(policy.uncertainty_policy.silent_interpolation_allowed, false);

const externalToolEntries = Object.entries(policy.external_tools ?? {});
for (const [toolId, externalTool] of externalToolEntries) {
  assert.equal(externalTool.default_enabled, false, `${toolId} must remain disabled by default`);
  assert.equal(externalTool.active_integration, false, `${toolId} active integration must remain disabled`);
  assert.equal(externalTool.runtime_dependency, false, `${toolId} cannot be a runtime dependency`);
  for (const authorityField of [
    'generation_authority',
    'structural_authority',
    'surface_authority',
    'behavior_authority',
    'approval_authority'
  ]) {
    assert.equal(externalTool[authorityField], false, `${toolId} cannot receive ${authorityField}`);
  }
  assert.equal(
    externalTool.activation,
    'explicit-user-instruction-and-isolated-task-only',
    `${toolId} activation policy drift`
  );
}

const tools = readJson('data/b24-engineering/reconstruction-tools.json');
const registeredExternalStudies = (tools.tools ?? []).filter(tool =>
  String(tool.classification ?? '').includes('study')
);
for (const registeredTool of registeredExternalStudies) {
  if ('default_enabled' in registeredTool) {
    assert.equal(registeredTool.default_enabled, false, `${registeredTool.tool_id} must default to disabled`);
  }
  if ('runtime_dependency' in registeredTool) {
    assert.equal(registeredTool.runtime_dependency, false, `${registeredTool.tool_id} cannot be a runtime dependency`);
  }
  if (registeredTool.activation_policy && typeof registeredTool.activation_policy === 'object') {
    if ('automatic_promotion' in registeredTool.activation_policy) {
      assert.equal(
        registeredTool.activation_policy.automatic_promotion,
        false,
        `${registeredTool.tool_id} cannot be promoted automatically`
      );
    }
  }
}

const library = readJson('data/aircraft-native/reusable-system-library.json');
assert.equal(library.library_id, 'AIRCRAFT_NATIVE_REUSABLE_SYSTEMS');
assert.ok(Array.isArray(library.systems) && library.systems.length >= 12);
const systemIds = library.systems.map(system => system.system_id);
assert.equal(new Set(systemIds).size, systemIds.length, 'reusable system ids must be unique');
for (const required of [
  'core.coordinate-datum',
  'core.assembly-interface',
  'core.geometry-recipe',
  'core.surface-program',
  'core.behavior-state',
  'airframe.flight-controls',
  'propulsion.engine-propeller',
  'ground.landing-gear',
  'payload.bomb-bay',
  'armament.turret-and-gun',
  'crew.station-and-exit',
  'mission.flight-sequence',
  'evidence.provenance',
  'qa.fixed-review'
]) {
  assert.ok(systemIds.includes(required), `missing reusable system ${required}`);
}

const schema = readJson('data/aircraft-native/schemas/component-production-contract.schema.json');
assert.equal(schema.properties.schema.const, 'haihao.aircraft/component-production-contract@1.0.0');
for (const required of [
  'identity',
  'source_plan',
  'reference_mapping',
  'geometry_recipe',
  'assembly_interfaces',
  'surface_program',
  'behavior_contract',
  'qa',
  'approval'
]) {
  assert.ok(schema.required.includes(required), `component schema must require ${required}`);
}

const production = readJson('data/b24-native/components/empennage/vertical-tail-production.json');
assert.equal(production.schema, 'haihao.aircraft/component-production-contract@1.0.0');
assert.equal(production.work_package_id, 'B24J_CO_VERTICAL_TAIL_NATIVE_001');
assert.equal(production.family_master_id, 'B24J_CO_DATA_NATIVE_MASTER');
assert.equal(production.status, 'source-intake');
assert.equal(production.source_plan.unknown_policy, 'unresolved');
assert.equal(production.reference_mapping.approval, false);
assert.equal(production.reference_mapping.automatic_keyword_approval, false);
assert.equal(production.geometry_recipe.authority, 'drawing-led-with-reference-model-cross-check');
assert.equal(production.behavior_contract.semantic_controller, 'flight-control.rudders');
assert.equal(production.surface_program.surface_ids.length, 8);
assert.equal(new Set(production.surface_program.surface_ids).size, 8);
assert.equal(production.surface_program.parameterization.left_right_mirroring, false);
assert.equal(production.surface_program.free_design_mode.enabled, true);
assert.equal(production.surface_program.historical_mode.enabled, true);
assert.ok(Object.values(production.approval).every(value => value === false));

const pilot = readJson('data/b24-engineering/components/vertical-tail.json');
assert.equal(pilot.schemaVersion, '2.0.0');
assert.equal(pilot.production_contract, 'data/b24-native/components/empennage/vertical-tail-production.json');
assert.ok(pilot.native_forge_assets, 'native forge asset block is required');
assert.equal('visual_proxy_assets' in pilot, false, 'legacy visual proxy execution block must be removed');
for (const pilotStudy of pilot.external_method_studies ?? []) {
  assert.equal(pilotStudy.active_integration, false, 'external method study integration must remain disabled');
  assert.equal(pilotStudy.default_enabled, false, 'external method study must remain disabled by default');
  assert.equal(pilotStudy.authority, 'none', 'external method study cannot receive aircraft authority');
}

const agents = readText('AGENTS.md');
assert.ok(agents.includes('AIRCRAFT_NATIVE_FORGE'));

const master = readText('docs/aircraft-pipeline/B24_DATA_NATIVE_MASTER.md');
assert.ok(master.includes('Aircraft Native Forge'));

console.log(JSON.stringify({
  ok: true,
  framework: policy.system_id,
  externalToolRecords: externalToolEntries.length,
  externalToolActive: externalToolEntries.some(([, tool]) => tool.active_integration === true),
  registeredExternalStudies: registeredExternalStudies.length,
  reusableSystems: library.systems.length,
  firstComponent: production.work_package_id,
  firstComponentSurfaceSlots: production.surface_program.surface_ids.length,
  approvalsClosed: Object.values(production.approval).every(value => value === false)
}, null, 2));
