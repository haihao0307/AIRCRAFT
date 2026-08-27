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
assert.equal(s002.file, 'B24-ENG-S002_D-1840_RD-6894_Model-32_General-Arrangement.pdf');
assert.equal(s002.bytes, 4492789);
assert.equal(s002.sha256, '5ad3742e0462d4a7f2c44ade8b990b11e6ef77141565fb4c9804e9d507ef970e');
assert.equal(s002.approval.sourceBytesVerified, true);
assert.equal(s002.approval.geometryUseApproved, false);
assert.equal(s002.variant_applicability.B24J_CO, 'unresolved');
assert.ok(s002.clearly_observed_data_candidates.length >= 8);
assert.ok(s002.clearly_observed_data_candidates.every(candidate => candidate.approved === false));

assert.equal(s003.bytes, 606488);
assert.equal(s003.sha256, '4af64c224942c5225cbf784f52a8e17d4ab49d4de5990f0e0f91add7feea63bf');
assert.equal(s003.pages, 5);
assert.equal(s003.visual_classification, 'secondary-mixed-source-mixed-variant-compilation');
assert.equal(s003.authority_reclassification.reviewed_grade, 'D_secondary_comparison_only');
assert.equal(s003.approval.authorityGradeApproved, true);
assert.equal(s003.approval.geometryUseApproved, false);
assert.equal(s003.page_review.length, 5);

const s016Config = readJson('data/b24-engineering/source-intake/b24j-official-three-view.json');
assert.equal(s016Config.schema, 'haihao.aircraft/engineering-image-intake-config@1.0.0');
assert.equal(s016Config.source.source_id, 'B24-ENG-S016');
assert.equal(s016Config.source.source_document, 'AN 01-5E-3');
assert.equal(s016Config.source.source_page, 'ix');
assert.equal(s016Config.source.variant, 'B-24J');
assert.equal(s016Config.source.rights, 'public-domain-US-federal-government-work');
assert.equal(s016Config.files.length, 2);
assert.ok(s016Config.files.some(file => file.file_role === 'original-upload-scan'));
assert.ok(s016Config.files.some(file => file.file_role === 'cleaned-darkened-review-derivative'));
assert.equal(s016Config.approval.imageIntegrityApproved, false);
assert.equal(s016Config.approval.B24JIdentityApproved, false);
assert.equal(s016Config.approval.orthographicUseApproved, false);
assert.equal(s016Config.approval.verticalTailGeometryUseApproved, false);

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
assert.equal(production.geometry_recipe.status, 'awaiting-official-b24j-three-view-and-structural-sources');

console.log(JSON.stringify({
  ok: true,
  review: review.review_id,
  s002: {
    sha256: s002.sha256,
    limitedCandidateUse: review.approval.S002LimitedCandidateUseApproved,
    geometryUseApproved: s002.approval.geometryUseApproved
  },
  s003: {
    sha256: s003.sha256,
    reviewedGrade: s003.authority_reclassification.reviewed_grade,
    geometryUseApproved: s003.approval.geometryUseApproved
  },
  replacementSource: s016Config.source.source_id,
  allVerticalTailApprovalsClosed: Object.values(production.approval).every(value => value === false)
}, null, 2));
