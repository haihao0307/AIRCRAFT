#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const readText = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const errors = [];
const warnings = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const policyPath = 'data/aircraft-native/tool-authority-policy.json';
const schemaPath = 'data/aircraft-native/schemas/component-reconstruction-contract.schema.json';
const componentPath = 'data/b24-native/components/empennage/vertical-tail-reconstruction.json';

for (const requiredPath of [policyPath, schemaPath, componentPath]) {
  assert(fs.existsSync(path.join(root, requiredPath)), `Missing required file: ${requiredPath}`);
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}

const policy = readJson(policyPath);
const schema = readJson(schemaPath);
const component = readJson(componentPath);

assert(policy.schema === 'haihao.aircraft/tool-authority-policy@1.0.0', 'Unexpected tool authority policy schema');
assert(policy.approval?.policyApproved === true, 'Tool authority policy must be approved');
assert(policy.approval?.externalToolIsolationApproved === true, 'External tool isolation must be approved');

const external = policy.external_tools?.img2threejs;
assert(Boolean(external), 'img2threejs policy entry is required for explicit isolation');
assert(external?.status === 'disabled-by-default', 'img2threejs must remain disabled by default');
assert(external?.classification === 'archived-external-research-reference', 'img2threejs classification must remain research reference only');
for (const field of [
  'runtime_dependency',
  'build_dependency',
  'analysis_authority',
  'structure_authority',
  'geometry_authority',
  'behavior_authority',
  'surface_authority',
  'qa_authority',
  'approval_authority',
  'automatic_invocation_allowed'
]) {
  assert(external?.[field] === false, `img2threejs field ${field} must be false`);
}
assert(external?.explicit_user_instruction_required === true, 'Explicit user instruction must be required before any img2threejs use');
assert(policy.drawing_first_rule?.guessing_allowed === false, 'Drawing-first policy must prohibit guessed approvals');
assert(policy.drawing_first_rule?.candidate_status === 'pending-source', 'Unverified candidates must remain pending-source');

assert(schema.$id === 'haihao.aircraft/component-reconstruction-contract.schema.json', 'Unexpected component contract schema id');
assert(schema.properties?.schema?.const === 'haihao.aircraft/component-reconstruction-contract@1.0.0', 'Component contract schema version mismatch');

assert(component.schema === 'haihao.aircraft/component-reconstruction-contract@1.0.0', 'Vertical-tail contract schema mismatch');
assert(component.contract_id === 'b24j-co-twin-vertical-tail-reconstruction-v1', 'Vertical-tail contract id mismatch');
assert(component.identity?.component_ids?.length === 4, 'Vertical-tail contract must define four primary components');
assert(component.geometry_recipe?.status === 'pending-source', 'Vertical-tail geometry must remain pending-source until drawings are approved');
assert(component.geometry_recipe?.unresolved_fields?.length > 0, 'Vertical-tail unresolved field ledger must not be empty');
assert(component.reference_model_mapping?.mapping_status !== 'approved', 'Reference node mapping cannot be approved before node review evidence exists');
assert(component.surface_contract?.surface_ids?.length === 8, 'Vertical-tail contract must define eight independent surface ids');
assert(new Set(component.surface_contract?.surface_ids || []).size === 8, 'Vertical-tail surface ids must be unique');
assert(component.surface_contract?.historical_instance_lock === true, 'Historical instance surface lock must remain enabled');
assert(component.qa_ledger?.result === 'pending', 'Vertical-tail QA result must remain pending');
assert(Object.values(component.approval || {}).every(value => value === false), 'All vertical-tail approvals must remain false at contract creation');

const approvedSourceIds = new Set(
  (component.source_ledger || [])
    .filter(source => source.approval_status === 'approved-source')
    .map(source => source.source_id)
);

for (const source of component.source_ledger || []) {
  if (source.acquisition_status === 'pending-real-download') {
    assert(source.approval_status === 'pending', `Pending source ${source.source_id} cannot be approved`);
    assert(source.sha256 === null, `Pending source ${source.source_id} must not contain an invented SHA256`);
    assert(source.bytes === null, `Pending source ${source.source_id} must not contain an invented byte count`);
  }
  if (source.approval_status === 'approved-source') {
    assert(typeof source.sha256 === 'string' && /^[a-f0-9]{64}$/.test(source.sha256), `Approved source ${source.source_id} must have SHA256`);
    assert(Number.isInteger(source.bytes) && source.bytes > 0, `Approved source ${source.source_id} must have a positive byte count`);
  }
}

const walkEvidencedValues = value => {
  if (Array.isArray(value)) {
    value.forEach(walkEvidencedValues);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.field_id === 'string' && typeof value.status === 'string' && 'evidence_refs' in value) {
    if (value.status === 'pending-source') {
      assert(value.value === null, `Pending field ${value.field_id} must have a null value`);
      assert(Array.isArray(value.evidence_refs) && value.evidence_refs.length === 0, `Pending field ${value.field_id} must not cite missing evidence`);
    }
    if (value.status === 'approved-source' || value.status === 'derived-from-approved-source') {
      assert(Array.isArray(value.evidence_refs) && value.evidence_refs.length > 0, `Approved field ${value.field_id} must cite evidence`);
      for (const ref of value.evidence_refs || []) {
        assert(approvedSourceIds.has(ref), `Approved field ${value.field_id} cites unapproved source ${ref}`);
      }
    }
  }
  Object.values(value).forEach(walkEvidencedValues);
};
walkEvidencedValues(component);

const packageJsonPath = path.join(root, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = readJson('package.json');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const names = Object.keys(packageJson[section] || {});
    assert(!names.some(name => name.toLowerCase().includes('img2threejs')), `package.json ${section} contains an img2threejs dependency`);
  }
}

const executableRoots = ['scripts', '.github/workflows'];
const executableExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.sh', '.yml', '.yaml']);
const forbiddenPatterns = [
  /(?:import|require)\s*\(?[^\n]*img2threejs/i,
  /(?:npm|pnpm|yarn|pip|python|python3)[^\n]*img2threejs/i,
  /git\s+clone[^\n]*img2threejs/i,
  /uses:\s*[^\n]*img2threejs/i
];

const visit = directory => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(full);
      continue;
    }
    if (!executableExtensions.has(path.extname(entry.name))) continue;
    const relative = path.relative(root, full).replaceAll('\\', '/');
    const text = fs.readFileSync(full, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) errors.push(`Active external-tool invocation found in ${relative}: ${pattern}`);
    }
  }
};
for (const directory of executableRoots) visit(path.join(root, directory));

if (component.reference_model_mapping?.candidates?.some(candidate => candidate.review_status === 'candidate-not-approved')) {
  warnings.push('Reference node candidates remain unapproved, as required before visual and parent-chain review.');
}

const report = {
  ok: errors.length === 0,
  policy: {
    id: policy.policy_id,
    drawingFirst: policy.drawing_first_rule?.guessing_allowed === false,
    img2threejs: {
      status: external?.status,
      runtimeDependency: external?.runtime_dependency,
      automaticInvocationAllowed: external?.automatic_invocation_allowed
    }
  },
  component: {
    id: component.contract_id,
    sourceCount: component.source_ledger?.length || 0,
    approvedSourceCount: approvedSourceIds.size,
    referenceCandidateCount: component.reference_model_mapping?.candidates?.length || 0,
    unresolvedFieldCount: component.geometry_recipe?.unresolved_fields?.length || 0,
    surfaceCount: component.surface_contract?.surface_ids?.length || 0,
    qaResult: component.qa_ledger?.result
  },
  warnings,
  errors
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
