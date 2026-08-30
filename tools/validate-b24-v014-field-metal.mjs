#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const ROOT = process.cwd();
const readJson = (path) => JSON.parse(fs.readFileSync(`${ROOT}/${path}`, 'utf8'));
const sha256 = (path) => crypto.createHash('sha256').update(fs.readFileSync(`${ROOT}/${path}`)).digest('hex');
const checks = [];
const check = (id, pass, detail) => checks.push({ id, pass: Boolean(pass), detail });

const knowledgePath = 'knowledge/procedural-field/v1.0.0/PROCEDURAL_FIELD_KNOWLEDGE_V1.json';
const referencePath = 'knowledge/procedural-field/v1.0.0/field_reference.js';
const fieldPath = 'data/b24-native/surface-fields/B24_V014_FIELD_SYSTEM.json';
const docPath = 'docs/aircraft-pipeline/B24_PROCEDURAL_FIELD_METAL_PILOT_V014.md';
const cleanupPath = 'records/B24_V014_CLEANUP_LEDGER.json';
const receiptPath = 'records/B24_V014_IMPLEMENTATION_RECEIPT.json';

for (const path of [knowledgePath, referencePath, fieldPath, docPath, cleanupPath, receiptPath]) {
  check(`file:${path}`, fs.existsSync(`${ROOT}/${path}`), path);
}

const knowledge = readJson(knowledgePath);
const field = readJson(fieldPath);
const cleanup = readJson(cleanupPath);
const receipt = readJson(receiptPath);

check('knowledge-source-lock', knowledge.sourceLock.packageSha256 === 'd69ecd2677507db9342a1d66092a8d6cf4255141346b14cc4629303bf1c4f396', knowledge.sourceLock.packageSha256);
check('reference-source-hash', sha256(referencePath) === '8fd54c74b44a6abd6fe35619a10b08b396c7c71ac57ee37e77246b4c531078a5', sha256(referencePath));
check('knowledge-pipeline', JSON.stringify(knowledge.pipeline) === JSON.stringify(['source-field','shape-field','data-and-mask-field','color-field','render-field','qa']), knowledge.pipeline);
check('knowledge-masks', ['truth-mask','parent-mask','process-mask','separation-mask'].every((value) => knowledge.maskFamilies.includes(value)), knowledge.maskFamilies);
check('knowledge-scales', ['macro','meso','micro'].every((value) => Object.hasOwn(knowledge.scaleBudget, value)), Object.keys(knowledge.scaleBudget));
check('knowledge-deterministic', knowledge.referenceImplementation.deterministic === true, knowledge.referenceImplementation);

const lockedGlb = field.sourceLock.baseline.lockedGlb;
check('locked-glb-bytes', lockedGlb.bytes === 23085972, lockedGlb.bytes);
check('locked-glb-hash', lockedGlb.sha256 === '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d', lockedGlb.sha256);
check('source-read-only', field.sourceLock.readOnly === true, field.sourceLock.readOnly);
check('shape-impact-none', field.sourceLock.shapeImpact === 'none' && field.fieldGraph.shapeImpact === 'none', [field.sourceLock.shapeImpact, field.fieldGraph.shapeImpact]);
check('pilot-node-count', field.maskRegistry.pilot.truthMask.sourceNodeIds.length === 23, field.maskRegistry.pilot.truthMask.sourceNodeIds.length);
check('pilot-one-wing', field.maskRegistry.pilot.truthMask.sourceNodeIds[0] === 1711, field.maskRegistry.pilot.truthMask.sourceNodeIds[0]);
check('pilot-cowl-count', field.maskRegistry.pilot.truthMask.sourceNodeIds.slice(1).length === 22, field.maskRegistry.pilot.truthMask.sourceNodeIds.slice(1).length);
check('whole-aircraft-closed', field.maskRegistry.pilot.parentMask.wholeAircraftAssignment === false && field.fieldGraph.wholeAircraftAutoAssignment === false, false);
check('protected-mechanical-colours', field.maskRegistry.pilot.protectedRegions.includes('v013-mechanical-source-colours'), field.maskRegistry.pilot.protectedRegions);
check('field-graph-required-stages', ['sourceReadOnly','truthMask','parentMask','sharedDomainWarp','macroFbm','mesoFbm','microFbm','sourceStructure','engineExhaustSoot','oilSeepage','fiveStopMetalPalette','roughnessCorrelation','detailNormal','ggxMetal','lightClearCoat','diagnosticChannels'].every((stage) => field.fieldGraph.pipeline.includes(stage)), field.fieldGraph.pipeline);
check('forbidden-global-grime', field.eventLibrary.forbidden.includes('global-random-grime') && field.eventLibrary.forbidden.includes('whole-aircraft-noise-replacement'), field.eventLibrary.forbidden);
check('approvals-closed', Object.values(field.approvalLedger).every((value) => value === false), field.approvalLedger);

check('cleanup-seven-files', cleanup.removed.length === 7, cleanup.removed.length);
check('cleanup-keeps-provenance', cleanup.preserved.includes('handoff/2026-08-29-b24-v010-ridged-noise-v002') && cleanup.preserved.includes('handoff/2026-08-29-b24-v012-propeller-interface-skin-audit'), cleanup.preserved);
check('receipt-preview-pass', receipt.status === 'PASS_PREVIEW_ONLY', receipt.status);
check('receipt-one-click', receipt.generatedDelivery.oneClickHtml.singleFile === true && receipt.generatedDelivery.oneClickHtml.iframeCount === 0 && receipt.generatedDelivery.oneClickHtml.networkRequests === 0, receipt.generatedDelivery.oneClickHtml);
check('receipt-browser-pass', receipt.qa.browser.failed === 0 && receipt.qa.browser.pageErrors === 0 && receipt.qa.browser.consoleErrors === 0 && receipt.qa.browser.networkRequests === 0 && receipt.qa.browser.webglErrors === 0, receipt.qa.browser);
check('receipt-static-pass', receipt.qa.static.failed === 0 && receipt.qa.static.passed === 16, receipt.qa.static);
check('receipt-protected', receipt.protectedSystems.v013MechanicalColoursPreserved === true && receipt.protectedSystems.geometryChanged === false && receipt.protectedSystems.animationChanged === false && receipt.protectedSystems.runwayFlightSequenceChanged === false, receipt.protectedSystems);
check('receipt-approvals-closed', Object.values(receipt.approvalLedger).every((value) => value === false), receipt.approvalLedger);

const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(fs.readFileSync(`${ROOT}/${referencePath}`, 'utf8'), sandbox, { filename: referencePath });
const referenceApi = sandbox.module.exports;
const derived = referenceApi.deriveSeeds(24014357);
const fieldA = referenceApi.evaluateFields(3.38, 3.2, derived, { worldScale: 0.41 });
const fieldB = referenceApi.evaluateFields(3.38, 3.2, derived, { worldScale: 0.41 });
check('reference-runtime-api', Boolean(derived && fieldA), { derived, fieldA });
check('reference-determinism', JSON.stringify(fieldA) === JSON.stringify(fieldB), { fieldA, fieldB });

const failed = checks.filter((entry) => !entry.pass);
const report = {
  schema: 'haihao.aircraft/b24-v014-repository-validation@1.0.0',
  status: failed.length ? 'FAIL' : 'PASS_PREVIEW_ONLY',
  checks,
  totals: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  approvalBoundary: field.approvalLedger,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
