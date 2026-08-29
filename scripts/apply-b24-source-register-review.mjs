import fs from 'node:fs';
import path from 'node:path';

const registerPath = path.resolve('data/b24-engineering/source-register.json');
const productionPath = path.resolve('data/b24-native/components/empennage/vertical-tail-production.json');
const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const production = JSON.parse(fs.readFileSync(productionPath, 'utf8'));
if (!Array.isArray(register.sources)) throw new Error('source-register.json has no sources array');

const s003 = register.sources.find(source => source.source_id === 'B24-ENG-S003');
if (!s003) throw new Error('B24-ENG-S003 is missing from the source register');
s003.source_type = 'secondary_mixed_source_mixed_variant_compilation';
s003.authority_level = 'D';
s003.aircraft_variants = [
  'B-24E printed magazine drawing with conflicting B-24H annotation',
  'B-24H secondary page',
  'B-24J specifications summary page',
  'B-24D-CO and B-24E-FO Aerodata plates'
];
s003.production_plant = null;
s003.block_range = null;
s003.access_status = 'downloaded_and_reviewed_artifact_only';
s003.rights_status = 'mixed-publication-rights-review-required';
s003.geometry_scope = [
  'secondary silhouette comparison',
  'variant difference discovery',
  'wing and undercarriage visual reference'
];
s003.current_verification = 'Downloaded and rendered in Actions run 33034102484. The five-page PDF mixes 1944 magazine material, unresolved B-24H and B-24J summary pages, and 1979 Aerodata B-24D/E plates. It is not one manufacturer drawing set.';
s003.next_action = 'Retain for comparison only. Verify every discovered feature against official B-24J drawings or manuals before use.';
s003.notes = 'Authority reclassified from candidate A to D by B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001. Production geometry use is prohibited.';
s003.review_refs = [
  'data/b24-engineering/source-intake/results/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.json',
  'docs/aircraft-pipeline/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.md'
];
s003.file_lock = {
  bytes: 606488,
  sha256: '4af64c224942c5225cbf784f52a8e17d4ab49d4de5990f0e0f91add7feea63bf',
  workflow_run_id: 33034102484,
  artifact_id: 9631369355
};

const s002 = register.sources.find(source => source.source_id === 'B24-ENG-S002');
if (!s002) throw new Error('B24-ENG-S002 is missing from the source register');
s002.access_status = 'downloaded_and_reviewed_artifact_only';
s002.current_verification = 'Downloaded, hashed and visually reviewed in Actions run 33034102484. The sheet visibly identifies GENERAL ARRANGEMENT / B-24 CONSOLIDATED MOD. 32. Title-block drawing number, revision, date, B-24J-CO applicability and calibration remain unresolved because the scan is damaged and faded.';
s002.next_action = 'Resolve title block, revision, scale and B-24J-CO applicability; calibrate scan distortion; verify candidate control-surface and airfoil data against official manuals.';
s002.review_refs = [
  'data/b24-engineering/source-intake/results/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.json',
  'docs/aircraft-pipeline/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.md'
];
s002.file_lock = {
  bytes: 4492789,
  sha256: '5ad3742e0462d4a7f2c44ade8b990b11e6ef77141565fb4c9804e9d507ef970e',
  workflow_run_id: 33034102484,
  artifact_id: 9631369355
};

let s016 = register.sources.find(source => source.source_id === 'B24-ENG-S016');
if (!s016) throw new Error('B24-ENG-S016 is missing from the source register');
s016.source_type = 'official_manual_page_crop_with_review_derivative';
s016.authority_level = 'A';
s016.aircraft_variants = ['B-24J, illustration qualified to aircraft with nose and ball turrets'];
s016.access_status = 'downloaded_locked_and_reviewed_artifact_only';
s016.rights_status = 'public_domain_US_federal_government_work_as_marked_by_host';
s016.geometry_scope = [
  'B-24J orthographic silhouette research',
  'whole-aircraft view alignment',
  'vertical-tail spacing and envelope dimension-anchor research',
  'reference-model silhouette cross-check'
];
s016.current_verification = 'Original and cleaned files were downloaded in Actions run 33035435495. Both are 2032 x 2442 pixels. The original scan is source-of-record; the cleaned file is review-only. Limited B-24J orthographic silhouette use is approved, while full-page cross-check, calibration and production geometry use remain false.';
s016.next_action = 'Recover or verify complete AN 01-5E-3 page ix context, define exact view crops and calibration transforms, confirm the tail-dimension endpoints, and resolve the 181.2 versus 188 square-foot area conflict.';
s016.notes = 'The crop visibly contains plan, front or rear and side views plus dimensions. It lacks a visible manual header, page number, drawing number, revision, scale and title block.';
s016.review_refs = [
  'data/b24-engineering/source-intake/results/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.json',
  'docs/aircraft-pipeline/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.md',
  'data/b24-engineering/source-intake/results/B24J_CO_VERTICAL_TAIL_SOURCE_CONFLICTS.json'
];
s016.file_locks = {
  original_scan: {
    bytes: 6721623,
    sha256: 'de0819d07d35f37126ed62b3a6f02131aaded7cbaa5c49ce63187f72dab0f5b6'
  },
  cleaned_review_derivative: {
    bytes: 453910,
    sha256: '07449d0a39a22ae71851025960a9f0725f9ee3041d0ea6e1e6b6d03b29951df6',
    engineering_authority: false
  },
  workflow_run_id: 33035435495,
  artifact_id: 9631818927,
  artifact_sha256: 'd449639de4bbd412685a3249b2d7c058305cf247cd3998cddb156ffb1b8c9cce'
};
s016.approval = {
  sourceDescriptionProvenanceApproved: true,
  rightsApproved: true,
  imageIntegrityApproved: true,
  B24JIllustrationIdentityApproved: true,
  limitedOrthographicSilhouetteUseApproved: true,
  fullManualPageCrossCheckApproved: false,
  drawingCalibrationApproved: false,
  productionGeometryUseApproved: false
};

const requiredS016 = production.source_plan.required_sources.find(source => source.source_id === 'B24-ENG-S016');
if (!requiredS016) throw new Error('B24-ENG-S016 is missing from the vertical-tail production source plan');
requiredS016.status = 'intake-reviewed-limited-orthographic-use';
requiredS016.review_ref = 'data/b24-engineering/source-intake/results/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.json';
requiredS016.limited_orthographic_silhouette_use_approved = true;
requiredS016.full_manual_page_cross_check_approved = false;
requiredS016.drawing_calibration_approved = false;
requiredS016.geometry_use_approved = false;
requiredS016.file_locks = s016.file_locks;

production.source_plan.open_conflicts = [
  {
    conflict_id: 'B24-VTAIL-CONFLICT-001',
    path: 'data/b24-engineering/source-intake/results/B24J_CO_VERTICAL_TAIL_SOURCE_CONFLICTS.json',
    field: 'vertical_tail_area_total_sq_ft',
    values: [181.2, 188],
    status: 'unresolved',
    blocking: true
  }
];
production.geometry_recipe.candidate_evidence = production.geometry_recipe.candidate_evidence.filter(item => item.source_id !== 'B24-ENG-S016');
production.geometry_recipe.candidate_evidence.push(
  {
    source_id: 'B24-ENG-S016',
    field: 'twin_tail_lateral_span',
    observed_value: '26 FT 0 IN',
    status: 'illustration-annotation-verified-not-yet-calibrated'
  },
  {
    source_id: 'B24-ENG-S016',
    field: 'tail_vertical_dimension',
    observed_value: '9 FT 3 7/16 IN',
    status: 'illustration-annotation-verified-definition-pending'
  },
  {
    source_id: 'B24-ENG-S016',
    field: 'vertical_tail_area_total_sq_ft',
    observed_value: 188,
    status: 'illustration-annotation-verified-conflict-open'
  }
);
production.geometry_recipe.source_conflicts = production.source_plan.open_conflicts;
production.geometry_recipe.status = 'official-b24j-three-view-limited-use-approved-awaiting-calibration-and-structural-sources';
production.qa.evidence = production.qa.evidence.filter(item => item.evidence_id !== 'B24J_OFFICIAL_THREE_VIEW_REVIEW_001');
production.qa.evidence.push({
  evidence_id: 'B24J_OFFICIAL_THREE_VIEW_REVIEW_001',
  path: 'data/b24-engineering/source-intake/results/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.json',
  result: 'official-b24j-three-view-acquired-limited-orthographic-use-approved-production-geometry-blocked'
});
production.next_actions = [
  'Recover or verify complete AN 01-5E-3 page ix context and neighboring manual pages.',
  'Define exact original-scan pixel crops for plan, side and front or rear views.',
  'Build independent calibration transforms for every orthographic view.',
  'Resolve the B24-VTAIL-CONFLICT-001 area conflict before any area-derived geometry.',
  'Resolve S002 title block, revision, scale and B24J-CO applicability before promoting candidate values.',
  'Acquire complete AN 01-5E-3, AN 01-5E-4 and ZE-32-047 tail sections.',
  'Identify and isolate reference-model tail candidates in six views.',
  'Author the first calibrated outline records while all production approvals remain false.'
];
if (!Object.values(production.approval).every(value => value === false)) {
  throw new Error('The source review must not promote a vertical-tail production approval');
}

register.schemaVersion = '1.2.0';
register.lastReviewed = '2026-08-27';
register.registryStatus = 'research-source-registry-with-reviewed-authority-and-image-locks';
register.sources.sort((a, b) => a.source_id.localeCompare(b.source_id));
fs.writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`, 'utf8');
fs.writeFileSync(productionPath, `${JSON.stringify(production, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  sourceCount: register.sources.length,
  s002Authority: s002.authority_level,
  s003Authority: s003.authority_level,
  s003GeometryUse: 'prohibited',
  s016Authority: s016.authority_level,
  s016Status: s016.access_status,
  s016LimitedOrthographicUse: requiredS016.limited_orthographic_silhouette_use_approved,
  openVerticalTailConflicts: production.source_plan.open_conflicts.length,
  allVerticalTailApprovalsClosed: Object.values(production.approval).every(value => value === false)
}, null, 2));
