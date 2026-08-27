import fs from 'node:fs';
import path from 'node:path';

const registerPath = path.resolve('data/b24-engineering/source-register.json');
const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
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
if (!s016) {
  s016 = {
    source_id: 'B24-ENG-S016',
    title: 'Consolidated B-24J Liberator three-view line drawing',
    document_number: 'AN 01-5E-3',
    drawing_number: null,
    date: null,
    revision: null,
    source_type: 'official_manual_page_scan_and_review_derivative',
    authority_level: 'A',
    holder: 'United States military work; Wikimedia Commons host',
    host: 'Wikimedia Commons',
    source_url: 'https://commons.wikimedia.org/wiki/File:Consolidated_B-24J_Liberator_3-view_line_drawing.png',
    aircraft_variants: ['B-24J'],
    production_plant: null,
    block_range: null,
    format: ['PNG original upload scan', 'PNG cleaned review derivative'],
    pages_or_sheets: 'AN 01-5E-3 page ix',
    access_status: 'public_download_intake_configured',
    rights_status: 'public_domain_US_federal_government_work_as_marked_by_host',
    geometry_scope: ['B-24J three-view silhouette', 'orthographic view alignment', 'vertical-tail outline candidate'],
    current_verification: 'Source description, document/page attribution, author, variant and public-domain marking reviewed. Source bytes and image integrity pending Actions intake.',
    next_action: 'Download original scan and cleaned derivative, hash, compare, review crop and line preservation, then define calibration strategy.',
    notes: 'The original scan controls image provenance. The cleaned file is a review derivative only and cannot silently replace source pixels.'
  };
  register.sources.push(s016);
}

register.schemaVersion = '1.1.0';
register.lastReviewed = '2026-08-27';
register.registryStatus = 'research-source-registry-with-reviewed-authority-corrections';
register.sources.sort((a, b) => a.source_id.localeCompare(b.source_id));
fs.writeFileSync(registerPath, `${JSON.stringify(register, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  sourceCount: register.sources.length,
  s002Authority: s002.authority_level,
  s003Authority: s003.authority_level,
  s003GeometryUse: 'prohibited',
  s016Authority: s016.authority_level,
  s016Status: s016.access_status
}, null, 2));
