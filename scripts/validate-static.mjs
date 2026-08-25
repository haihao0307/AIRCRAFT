import { readFile } from 'node:fs/promises';

const manifestPath = 'data/aircraft/308bg/80-days-reference-manifest.json';
const missionStatesPath = 'data/aircraft/308bg/80-days-mission-states.json';
const aircraftPath = 'data/aircraft/308bg/80-days.json';
const statusPagePath = 'public/80-days-livery-status.html';
const intakeReportPath = 'reports/80-days-reference-intake.json';
const countSheetPath = 'reports/80-days-count-sheet.json';

const parseJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const manifest = await parseJson(manifestPath);
const missionStates = await parseJson(missionStatesPath);
const aircraft = await parseJson(aircraftPath);
const intakeReport = await parseJson(intakeReportPath);
const countSheet = await parseJson(countSheetPath);
const statusPage = await readFile(statusPagePath, 'utf8');
const statusPageLower = statusPage.toLowerCase();

if (manifest.schema !== 'haihao.aircraft/historical-reference-manifest@1.0') {
  throw new Error(`Unexpected reference-manifest schema: ${manifest.schema}`);
}
if (manifest.generatedReconstructionBoardsAcceptedAsEvidence !== false) {
  throw new Error('Generated reconstruction boards must remain excluded from historical evidence.');
}

const expectedIds = Array.from({ length: 8 }, (_, index) => `E${String(index + 1).padStart(2, '0')}`);
const actualIds = manifest.evidence.map((entry) => entry.evidenceId);
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
  throw new Error(`Evidence inventory must be E01 through E08; received ${actualIds.join(', ')}.`);
}

const expectedEvidence = {
  E01: ['80_Days_China_2_1944.jpg', 690771, 'c47c5285d0b95abf61cd426f43bbfb6f550d29b9f180ee52606283cf306d0ed5'],
  E02: ['80days.jpg', 504418, '38a82d8ac32f98182aee2e38bd6e288c409faae8b39e515445bbb0cc4bc2eee3'],
  E03: ['80-days(1).jpg', 89210, '4ffd9160fba0d00ffd47e4925bcddc55c4efde800e17e3b73afc26007b248c06'],
  E04: ['80_Days_asisbiz_left.jpg', 1006009, '07439c42eac526d5a209a6bf767853302089099eda4df11128a0e8b56a6a81fa'],
  E05: ['80_Days_asisbiz_no487.jpg', 1327936, '67add5aa17bc09fb3ddfdcaadcd799d9a153ccd3a19d672c874871f23587f8ab'],
  E06: ['80_Days_asisbiz_inflight.jpg', 3971800, '03453abd80fa7be489ef89a72c591d8d1800a3c7e2a00dca63b6e9ddbe831564'],
  E07: ['80_Days_asisbiz_right_inflight.jpg', 814824, '2a4d1873055dbfef67f0416f4515b03e8489a566f6c451f4a133a09bf7b1043f'],
  E08: ['80_Days_SDASM_10_0018697.jpg', 76204, '760ed33486cf24f6191391dbea07c9ee08eda07bec3bc5099b7fce0f37eecab0'],
};
for (const evidence of manifest.evidence) {
  const expected = expectedEvidence[evidence.evidenceId];
  if (!expected) throw new Error(`Unexpected evidence ID: ${evidence.evidenceId}`);
  const [filename, bytes, sha256] = expected;
  if (evidence.filename !== filename || evidence.bytes !== bytes || evidence.sha256 !== sha256) {
    throw new Error(`Locked reference metadata changed for ${evidence.evidenceId}.`);
  }
}

if (manifest.masterPackage.filename !== '374BS_80_DAYS_review_pack_v2.zip') {
  throw new Error('Master reference package filename changed.');
}
if (manifest.masterPackage.bytes !== 44303171) throw new Error('Master package byte count changed.');
if (manifest.masterPackage.sha256 !== '23428c52faf5f65d1fa97bf1402c9c4f8a3b721581ee6ba807a2ebe1cf52baee') {
  throw new Error('Master package SHA-256 changed.');
}

const stamCrop = manifest.derivedAssets?.find((entry) => entry.filename === 'stam_crop_zoom.png');
if (!stamCrop || stamCrop.independentEvidence !== false || !stamCrop.parentEvidenceIds?.includes('E03')) {
  throw new Error('STAM inspection crop must remain a derived child of E03.');
}

if (missionStates.schema !== 'haihao.aircraft/mission-states@1.0') {
  throw new Error(`Unexpected mission-state schema: ${missionStates.schema}`);
}
if (missionStates.sideSpecificRules?.STAM?.port !== 'prohibited-no-current-evidence') {
  throw new Error('STAM must remain prohibited on the port side.');
}
if (missionStates.sideSpecificRules?.STAM?.starboard !== 'required-directly-below-upper-rectangular-side-window') {
  throw new Error('STAM starboard placement rule changed.');
}
if (missionStates.sideSpecificRules?.sharkMouth?.mirroringAllowed !== false) {
  throw new Error('Port and starboard shark mouths must not be mirrored.');
}
if (missionStates.sideSpecificRules?.titleAndDice?.mirroringAllowed !== false) {
  throw new Error('Port and starboard title and dice must not be mirrored.');
}

const activeState = missionStates.states.find(
  (state) => state.missionStateId === missionStates.activePlacementStateId,
);
if (!activeState) throw new Error('Active mission state is missing.');
if (activeState.primaryEvidence !== 'E03') throw new Error('E03 must control the initial STAM placement state.');
if (activeState.countSourceMode !== 'single-state-only') {
  throw new Error('Mission marks must be counted from one selected state only.');
}
if (activeState.victoryFlagCount !== 8 || JSON.stringify(activeState.victoryFlagCountEvidence) !== '["E01"]') {
  throw new Error('The provisional eight-victory-flag record must remain sourced only to E01.');
}
if (activeState.bombMarkCount !== null || activeState.bombMarkStatus !== 'blocked-count') {
  throw new Error('Bomb count must remain unresolved until reviewer annotation.');
}
for (const state of missionStates.states) {
  if (state.approvedForFinalBake === true && state.bombMarkCount == null) {
    throw new Error(`Mission state ${state.missionStateId} cannot be final-bake approved with a null bomb count.`);
  }
  if (state.countSourceMode !== 'single-state-only') {
    throw new Error(`Mission state ${state.missionStateId} violates the single-state count rule.`);
  }
}

if (aircraft.aircraftId !== '308bg_374bs_42-73257_80-days' || aircraft.serial !== '42-73257') {
  throw new Error('Locked “80 DAYS” aircraft identity changed.');
}
if (aircraft.sourceModelPolicy?.geometryMutationAllowed !== false) {
  throw new Error('Geometry mutation must remain prohibited.');
}
if (!aircraft.liveryScope?.excluded?.includes('propellers') || !aircraft.liveryScope?.excluded?.includes('tires')) {
  throw new Error('Propellers and tires must remain outside this livery package.');
}

for (const marker of [
  'B-24J-25-CO',
  '42-73257',
  'Aircraft No. 487',
  '80days-E03-placement-v1',
  'verified intake',
  'STAM',
  'starboard only',
  'one colored japanese victory flag',
  'one bomb silhouette',
  'No substitute aircraft',
]) {
  if (!statusPageLower.includes(marker.toLowerCase())) throw new Error(`Status-page marker missing: ${marker}`);
}
if (statusPage.includes('<canvas') || statusPage.includes('three.module') || statusPage.includes('procedural aircraft')) {
  throw new Error('The historical status page must not render a substitute aircraft.');
}

if (intakeReport.aircraftId !== manifest.aircraftId || intakeReport.status !== 'verified') {
  throw new Error('Committed intake report must expose the verified state.');
}
if (intakeReport.summary?.expected !== 10 || intakeReport.summary?.integrityFailures !== 0) {
  throw new Error('Committed intake report summary is inconsistent with the locked inventory.');
}
if (countSheet.missionStateId !== activeState.missionStateId) {
  throw new Error('Count sheet does not target the active mission state.');
}
if (countSheet.status !== 'review-required' || countSheet.bombMarkCount !== null || countSheet.bombMarkCountStatus !== 'blocked-count') {
  throw new Error('Committed count sheet must remain review-gated with an unresolved bomb count.');
}

console.log(JSON.stringify({
  ok: true,
  aircraftId: aircraft.aircraftId,
  missionStateId: activeState.missionStateId,
  directEvidence: manifest.evidence.length,
  assetIntakeStatus: intakeReport.status,
  countSheetStatus: countSheet.status,
  finalBakeApproved: false,
}, null, 2));
