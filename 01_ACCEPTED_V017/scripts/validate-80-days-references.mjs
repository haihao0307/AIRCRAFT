import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = 'data/aircraft/308bg/80-days-reference-manifest.json';
const reportJsonPath = 'reports/80-days-reference-intake.json';
const reportMarkdownPath = 'reports/80-days-reference-intake.md';

const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const isSha256 = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.schema !== 'haihao.aircraft/historical-reference-manifest@1.0') {
  throw new Error(`Unsupported reference manifest schema: ${manifest.schema}`);
}
if (!manifest.stagingRoot || !manifest.masterPackage || !Array.isArray(manifest.evidence)) {
  throw new Error('Reference manifest is missing stagingRoot, masterPackage or evidence.');
}

const directIds = manifest.evidence.map((item) => item.evidenceId);
const expectedIds = Array.from({ length: 8 }, (_, index) => `E${String(index + 1).padStart(2, '0')}`);
if (JSON.stringify(directIds) !== JSON.stringify(expectedIds)) {
  throw new Error(`Direct evidence IDs must be ordered E01 through E08; received ${directIds.join(', ')}`);
}

const assets = [
  { ...manifest.masterPackage, recordType: 'master-package' },
  ...manifest.evidence.map((item) => ({ ...item, recordType: 'direct-evidence' })),
  ...(manifest.derivedAssets ?? []).map((item) => ({ ...item, recordType: 'derived-asset' })),
];

const filenames = new Set();
for (const asset of assets) {
  if (!asset.filename || !Number.isInteger(asset.bytes) || asset.bytes <= 0 || !isSha256(asset.sha256)) {
    throw new Error(`Malformed asset record: ${JSON.stringify(asset)}`);
  }
  if (filenames.has(asset.filename)) throw new Error(`Duplicate reference filename: ${asset.filename}`);
  filenames.add(asset.filename);
}
for (const derived of manifest.derivedAssets ?? []) {
  if (derived.independentEvidence !== false || !Array.isArray(derived.parentEvidenceIds)) {
    throw new Error(`Derived asset must be non-independent and name its parent evidence: ${derived.filename}`);
  }
  for (const parentId of derived.parentEvidenceIds) {
    if (!directIds.includes(parentId)) throw new Error(`Unknown derived-asset parent: ${parentId}`);
  }
}

const results = [];
for (const asset of assets) {
  const filePath = path.join(manifest.stagingRoot, asset.filename);
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      results.push({
        filename: asset.filename,
        evidenceId: asset.evidenceId ?? null,
        recordType: asset.recordType,
        path: filePath,
        status: 'integrity-failure',
        reasons: ['path-is-not-a-regular-file'],
        expectedBytes: asset.bytes,
        actualBytes: null,
        expectedSha256: asset.sha256,
        actualSha256: null,
      });
      continue;
    }

    const actualBytes = fileStat.size;
    const actualSha256 = await sha256File(filePath);
    const reasons = [];
    if (actualBytes !== asset.bytes) reasons.push('byte-count-mismatch');
    if (actualSha256 !== asset.sha256) reasons.push('sha256-mismatch');

    results.push({
      filename: asset.filename,
      evidenceId: asset.evidenceId ?? null,
      recordType: asset.recordType,
      path: filePath,
      status: reasons.length ? 'integrity-failure' : 'verified',
      reasons,
      expectedBytes: asset.bytes,
      actualBytes,
      expectedSha256: asset.sha256,
      actualSha256,
    });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    results.push({
      filename: asset.filename,
      evidenceId: asset.evidenceId ?? null,
      recordType: asset.recordType,
      path: filePath,
      status: 'missing',
      reasons: ['file-not-present'],
      expectedBytes: asset.bytes,
      actualBytes: null,
      expectedSha256: asset.sha256,
      actualSha256: null,
    });
  }
}

const summary = {
  expected: results.length,
  verified: results.filter((item) => item.status === 'verified').length,
  missing: results.filter((item) => item.status === 'missing').length,
  integrityFailures: results.filter((item) => item.status === 'integrity-failure').length,
};

let status = 'verified';
if (summary.integrityFailures > 0) status = 'integrity-failure';
else if (summary.verified === 0) status = 'blocked-missing-asset';
else if (summary.missing > 0) status = 'blocked-partial-assets';

const report = {
  schema: 'haihao.aircraft/reference-intake-report@1.0',
  aircraftId: manifest.aircraftId,
  generatedAt: new Date().toISOString(),
  manifestPath,
  stagingRoot: manifest.stagingRoot,
  status,
  blocking: status !== 'verified',
  summary,
  results,
  restorationAction:
    status === 'verified'
      ? null
      : `Restore the exact external files under ${manifest.stagingRoot}/ and rerun npm run validate:80days:references.`,
};

await mkdir(path.dirname(reportJsonPath), { recursive: true });
await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const markdown = [
  '# “80 DAYS” historical reference intake',
  '',
  `- Status: \`${status}\``,
  `- Staging root: \`${manifest.stagingRoot}/\``,
  `- Expected: ${summary.expected}`,
  `- Verified: ${summary.verified}`,
  `- Missing: ${summary.missing}`,
  `- Integrity failures: ${summary.integrityFailures}`,
  '',
  '| ID | File | State | Bytes | SHA-256 |',
  '|---|---|---|---:|---|',
  ...results.map(
    (item) =>
      `| ${item.evidenceId ?? item.recordType} | \`${item.filename}\` | \`${item.status}\` | ${item.actualBytes ?? 'missing'} / ${item.expectedBytes} | \`${item.actualSha256 ?? 'missing'}\` |`,
  ),
  '',
  status === 'verified'
    ? 'All locked historical source assets passed byte-count and SHA-256 validation.'
    : `Blocked action: restore the exact files under \`${manifest.stagingRoot}/\`. Missing files are allowed as a documented blocked state. Any integrity mismatch fails validation.`,
  '',
].join('\n');

await writeFile(reportMarkdownPath, markdown, 'utf8');
console.log(JSON.stringify({ status, summary, reportJsonPath, reportMarkdownPath }, null, 2));

if (summary.integrityFailures > 0) process.exitCode = 1;
