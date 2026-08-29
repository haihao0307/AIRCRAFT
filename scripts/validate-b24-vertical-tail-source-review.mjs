import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const review = readJson('data/b24-engineering/source-intake/results/B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001.json');
assert.equal(review.schema, 'haihao.aircraft/engineering-source-review@1.0.0');
assert.equal(review.review_id, 'B24_VERTICAL_TAIL_PRIORITY_SOURCE_REVIEW_001');
assert.equal(review.workflow_run_id, 33034102484);
assert.equal(review.artifact.id, 9631369355);
assert.equal(review.artifact.sha256, '4a0be2c3f2cb717f408d9409308deadef42eb012019e1bbc4535a99869f57cc4');

const s002 = review.sources.find(source => source.source_id === 'B24-ENG-S002');
const s003 = review.sources.find(source => source.source_id === 'B24-ENG-S003');
assert.ok(s002 && s003, 'S002 and S003 source reviews are required');
assert.equal(s002.bytes, 4492789);
assert.equal(s002.sha256, '5ad3742e0462d4a7f2c44ade8b990b11e6ef77141565fb4c9804e9d507ef970e');
assert.equal(s002.approval.geometryUseApproved, false);
assert.equal(s002.variant_applicability.B24J_CO, 'unresolved');
assert.ok(s002.clearly_observed_data_candidates.every(candidate => candidate.approved === false));
assert.equal(s003.bytes, 606488);
assert.equal(s003.sha256, '4af64c224942c5225cbf784f52a8e17d4ab49d4de5990f0e0f91add7feea63bf');
assert.equal(s003.authority_reclassification.reviewed_grade, 'D_secondary_comparison_only');
assert.equal(s003.approval.geometryUseApproved, false);

const official = readJson('data/b24-engineering/source-intake/results/B24J_OFFICIAL_THREE_VIEW_REVIEW_001.json');
assert.equal(official.schema, 'haihao.aircraft/engineering-image-source-review@1.0.0');
assert.equal(official.review_id, 'B24J_OFFICIAL_THREE_VIEW_REVIEW_001');
assert.equal(official.source_id, 'B24-ENG-S016');
assert.equal(official.workflow.run_id, 33035435495);
assert.equal(official.workflow.artifact_id, 9631818927);
assert.equal(official.workflow.artifact_sha256, 'd449639de4bbd412685a3249b2d7c058305cf247cd3998cddb156ffb1b8c9cce');
assert.equal(official.source_identity.source_document, 'AN 01-5E-3');
assert.equal(official.source_identity.source_page, 'ix');
assert.equal(official.source_identity.variant, 'B-24J');
assert.equal(official.files.original_scan.bytes, 6721623);
assert.equal(official.files.original_scan.sha256, 'de0819d07d35f37126ed62b3a6f02131aaded7cbaa5c49ce63187f72dab0f5b6');
assert.equal(official.files.cleaned_review_derivative.bytes, 453910);
assert.equal(official.files.cleaned_review_derivative.sha256, '07449d0a39a22ae71851025960a9f0725f9ee3041d0ea6e1e6b6d03b29951df6');
assert.equal(official.files.original_scan.width_px, 2032);
assert.equal(official.files.original_scan.height_px, 2442);
assert.equal(official.files.cleaned_review_derivative.geometry_role.includes('cannot replace'), true);
assert.equal(official.derivative_comparison.same_pixel_dimensions, true);
assert.equal(official.derivative_comparison.byte_identical, false);
assert.equal(official.derivative_comparison.cleaned_derivative_geometry_authority, false);
assert.equal(official.approval.sourceDescriptionProvenanceApproved, true);
assert.equal(official.approval.rightsApproved, true);
assert.equal(official.approval.imageIntegrityApproved, true);
assert.equal(official.approval.B24JIllustrationIdentityApproved, true);
assert.equal(official.approval.limitedOrthographicSilhouetteUseApproved, true);
assert.equal(official.approval.fullManualPageCrossCheckApproved, false);
assert.equal(official.approval.drawingCalibrationApproved, false);
assert.equal(official.approval.verticalTailProductionGeometryUseApproved, false);
assert.equal(official.approval.verticalTailSourceSetApproved, false);

const conflicts = readJson('data/b24-engineering/source-intake/results/B24J_CO_VERTICAL_TAIL_SOURCE_CONFLICTS.json');
assert.equal(conflicts.schema, 'haihao.aircraft/source-conflict-ledger@1.0.0');
assert.equal(conflicts.conflicts.length, 1);
const areaConflict = conflicts.conflicts[0];
assert.equal(areaConflict.conflict_id, 'B24-VTAIL-CONFLICT-001');
assert.equal(areaConflict.field, 'vertical_tail_area_total_sq_ft');
assert.equal(areaConflict.status, 'unresolved');
assert.equal(areaConflict.severity, 'blocking');
assert.deepEqual(areaConflict.values.map(item => item.value), [181.2, 188]);
assert.equal(areaConflict.approval, false);
assert.equal(conflicts.approval.allBlockingConflictsResolved, false);
assert.equal(conflicts.approval.verticalTailGeometryPromotionAllowed, false);

const production = readJson('data/b24-native/components/empennage/vertical-tail-production.json');
const requiredSourceIds = production.source_plan.required_sources.map(source => source.source_id);
const comparisonSourceIds = production.source_plan.comparison_sources.map(source => source.source_id);
assert.ok(requiredSourceIds.includes('B24-ENG-S002'));
assert.ok(requiredSourceIds.includes('B24-ENG-S016'));
assert.equal(requiredSourceIds.includes('B24-ENG-S003'), false);
assert.ok(comparisonSourceIds.includes('B24-ENG-S003'));
const comparisonS003 = production.source_plan.comparison_sources.find(source => source.source_id === 'B24-ENG-S003');
assert.equal(comparisonS003.authority_grade, 'D');
assert.equal(comparisonS003.geometry_use_approved, false);
assert.ok(Object.values(production.approval).every(value => value === false));

const registerPath = path.join(root, 'data/b24-engineering/source-register.json');
if (fs.existsSync(registerPath)) {
  const register = readJson('data/b24-engineering/source-register.json');
  const registeredS003 = register.sources.find(source => source.source_id === 'B24-ENG-S003');
  const registeredS016 = register.sources.find(source => source.source_id === 'B24-ENG-S016');
  assert.ok(registeredS003 && registeredS016);
  assert.equal(registeredS003.authority_level, 'D');
  if (registeredS016.file_locks) {
    assert.equal(registeredS016.file_locks.original_scan.sha256, official.files.original_scan.sha256);
    assert.equal(registeredS016.file_locks.cleaned_review_derivative.engineering_authority, false);
    assert.equal(registeredS016.approval.productionGeometryUseApproved, false);
  }
}

console.log(JSON.stringify({
  ok: true,
  priorityReview: review.review_id,
  officialReview: official.review_id,
  officialOriginalSha256: official.files.original_scan.sha256,
  limitedOrthographicUseApproved: official.approval.limitedOrthographicSilhouetteUseApproved,
  productionGeometryUseApproved: official.approval.verticalTailProductionGeometryUseApproved,
  openBlockingConflicts: conflicts.conflicts.filter(item => item.status !== 'resolved' && item.severity === 'blocking').length,
  allVerticalTailApprovalsClosed: Object.values(production.approval).every(value => value === false)
}, null, 2));
