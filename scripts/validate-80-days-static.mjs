import { readFile } from 'node:fs/promises';

const AIRCRAFT_ID = '308bg_374bs_42-73257_80-days';
const MODEL_SHA256 = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const MODEL_BYTES = 23085972;

const requiredDocuments = [
  'docs/aircraft-pipeline/B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md',
  'docs/aircraft-pipeline/B24_80_DAYS_TEXTURE_SPEC.md',
  'docs/aircraft-pipeline/B24_80_DAYS_UV_AUDIT_CHECKLIST.md',
  'docs/aircraft-pipeline/B24_80_DAYS_PROMPT_SKILLPACK.md',
  'docs/aircraft-pipeline/B24_80_DAYS_ACCEPTANCE_CHECKLIST.md',
  'docs/aircraft-pipeline/SKILL_INDEX.md',
  'docs/aircraft-pipeline/references/b24-80-days/README.md',
];

const readText = (path) => readFile(path, 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const assertIncludes = (source, marker, label) => {
  assert(source.includes(marker), `${label} missing required marker: ${marker}`);
};

for (const path of requiredDocuments) {
  const content = await readText(path);
  assert(content.trim().length > 80, `${path} is missing or unexpectedly empty`);
}

const aircraft = await readJson('data/aircraft/308bg/80-days.json');
assert(aircraft.aircraftId === AIRCRAFT_ID, '80 DAYS aircraftId changed');
assert(aircraft.variant === 'B-24J-25-CO', '80 DAYS variant changed');
assert(aircraft.serial === '42-73257', '80 DAYS serial changed');
assert(aircraft.aircraftNumber === '487', '80 DAYS aircraft number changed');
assert(aircraft.group === '308th Bomb Group', '80 DAYS group changed');
assert(aircraft.squadron === '374th Bomb Squadron', '80 DAYS squadron changed');
assert(aircraft.sourceModelPolicy.bytes === MODEL_BYTES, 'authoritative model byte lock changed');
assert(aircraft.sourceModelPolicy.sha256 === MODEL_SHA256, 'authoritative model hash lock changed');
assert(aircraft.sourceModelPolicy.geometryMutationAllowed === false, 'geometry mutation must remain forbidden');

const included = new Set(aircraft.liveryScope.included);
const excluded = new Set(aircraft.liveryScope.excluded);
for (const required of [
  'fuselage-exterior-metal-skin',
  'glazed-nose-surrounding-metal-skin',
  'fuselage-exterior-access-panels',
  'fixed-vertical-fin-painted-skins',
]) {
  assert(included.has(required), `livery scope missing required surface: ${required}`);
}
for (const forbidden of [
  'propellers',
  'engines',
  'wheels',
  'tires',
  'landing-gear',
  'glass',
  'guns',
  'turret-interiors',
  'cockpit',
  'interior',
]) {
  assert(excluded.has(forbidden), `livery scope must exclude: ${forbidden}`);
}

const states = await readJson('data/aircraft/308bg/80-days-mission-states.json');
assert(states.aircraftId === AIRCRAFT_ID, 'mission-state aircraftId changed');
assert(states.activePlacementStateId === '80days-E03-placement-v1', 'active mission state changed');
assert(states.sideSpecificRules.STAM.port === 'prohibited-no-current-evidence', 'STAM must remain prohibited on port side');
assert(
  states.sideSpecificRules.STAM.starboard === 'required-directly-below-upper-rectangular-side-window',
  'STAM starboard placement rule changed',
);
assert(states.sideSpecificRules.sharkMouth.mirroringAllowed === false, 'shark mouth mirroring must remain forbidden');
assert(states.sideSpecificRules.titleAndDice.mirroringAllowed === false, 'title and dice mirroring must remain forbidden');
assert(Array.isArray(states.states) && states.states.length >= 1, 'mission-state list is empty');
const activeState = states.states.find((entry) => entry.missionStateId === states.activePlacementStateId);
assert(activeState, 'active mission state record missing');
assert(activeState.victoryFlagCount === 8, 'E01-supported victory-flag count changed');
assert(activeState.victoryFlagCountEvidence.includes('E01'), 'victory-flag count must cite E01');
assert(activeState.bombMarkCount === null, 'bomb count must remain unresolved until annotated review');
assert(activeState.bombMarkStatus === 'requires-annotated-count', 'bomb count status changed');
assert(activeState.approvedForFinalBake === false, 'final bake must remain blocked');
assert(activeState.generatedReconstructionBoardsAcceptedAsEvidence === false, 'generated boards cannot become evidence');

const manifest = await readJson('data/aircraft/308bg/80-days-reference-manifest.json');
assert(manifest.aircraftId === AIRCRAFT_ID, 'reference-manifest aircraftId changed');
assert(manifest.generatedReconstructionBoardsAcceptedAsEvidence === false, 'generated boards cannot become evidence');
assert(manifest.masterPackage.filename === '374BS_80_DAYS_review_pack_v2.zip', 'review package filename changed');
assert(manifest.masterPackage.expectedFileCount === 40, 'review package file count changed');
assert(Array.isArray(manifest.evidence) && manifest.evidence.length === 8, 'E01-E08 manifest must contain eight direct evidence records');
assert(new Set(manifest.evidence.map((entry) => entry.evidenceId)).size === 8, 'evidence IDs must be unique');
assert(manifest.derivedAssets?.length === 1, 'STAM inspection crop record missing');
assert(manifest.derivedAssets[0].filename === 'stam_crop_zoom.png', 'STAM crop filename changed');
assert(manifest.derivedAssets[0].independentEvidence === false, 'STAM crop must remain derived evidence');

const overview = await readText('docs/aircraft-pipeline/B24_80_DAYS_HISTORICAL_LIVERY_OVERVIEW.md');
for (const marker of ['B-24J-25-CO', '42-73257', '487', 'STAM', 'ROBBY', 'HUFF', '273257']) {
  assertIncludes(overview, marker, 'historical overview');
}

const textureSpec = await readText('docs/aircraft-pipeline/B24_80_DAYS_TEXTURE_SPEC.md');
for (const marker of ['Base Color', 'Normal', 'Roughness', 'Height', '8K', 'rivet', 'panel seams']) {
  assertIncludes(textureSpec, marker, 'texture specification');
}

const uvChecklist = await readText('docs/aircraft-pipeline/B24_80_DAYS_UV_AUDIT_CHECKLIST.md');
for (const marker of ['Shark-mouth', 'mirrored', 'Texel', '273257', '487']) {
  assertIncludes(uvChecklist, marker, 'UV checklist');
}

const promptSkillpack = await readText('docs/aircraft-pipeline/B24_80_DAYS_PROMPT_SKILLPACK.md');
for (const marker of [
  'fuselage and fixed vertical-fin livery only',
  'olive drab',
  'neutral gray',
  'deep-red',
  'STAM',
  'negative',
]) {
  assertIncludes(promptSkillpack.toLowerCase(), marker.toLowerCase(), 'prompt skillpack');
}

const acceptance = await readText('docs/aircraft-pipeline/B24_80_DAYS_ACCEPTANCE_CHECKLIST.md');
for (const marker of ['STAM', 'Shark mouth', 'rivet', 'fuselage', 'silhouette']) {
  assertIncludes(acceptance, marker, 'acceptance checklist');
}

const skillIndex = await readText('docs/aircraft-pipeline/SKILL_INDEX.md');
assertIncludes(skillIndex, 'B-24J-25-CO “80 DAYS” Historical Livery Skillpack', 'skill index');

const statusPage = await readText('public/80-days-livery-status.html');
for (const marker of [
  'B-24J-25-CO “80 DAYS”',
  '42-73257',
  'blocked-missing-asset',
  '80days-E03-placement-v1',
  'STAM',
  'Final bake: not approved',
]) {
  assertIncludes(statusPage, marker, 'status page');
}
for (const forbidden of ['makeProceduralAircraft', 'new THREE.', 'generated aircraft profile']) {
  assert(!statusPage.includes(forbidden), `status page contains forbidden substitute-rendering marker: ${forbidden}`);
}

const intake = await readJson('reports/80-days-reference-intake.json');
assert(['verified', 'blocked-missing-asset'].includes(intake.status), `unexpected intake status: ${intake.status}`);
assert(intake.summary.expected === 10, 'reference intake expected count must remain 10');
assert(intake.summary.integrityFailures === 0, 'committed intake report contains integrity failures');

const countSheet = await readJson('reports/80-days-count-sheet.json');
assert(['review-required', 'blocked-missing-asset'].includes(countSheet.status), `unexpected count-sheet status: ${countSheet.status}`);

console.log(JSON.stringify({
  ok: true,
  aircraftId: aircraft.aircraftId,
  missionStateId: states.activePlacementStateId,
  directEvidence: manifest.evidence.length,
  assetIntakeStatus: intake.status,
  countSheetStatus: countSheet.status,
  finalBakeApproved: activeState.approvedForFinalBake,
}, null, 2));
