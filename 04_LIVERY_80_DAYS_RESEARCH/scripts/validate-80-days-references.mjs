import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';

const manifestPath = 'data/aircraft/308bg/80-days-reference-manifest.json';
const reportJsonPath = 'reports/80-days-reference-intake.json';
const reportMarkdownPath = 'reports/80-days-reference-intake.md';
const zipArg = process.argv.find((arg) => arg.startsWith('--zip='));
const zipPath = zipArg?.slice(6) || process.env.EIGHTY_DAYS_REVIEW_ZIP || '';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function dimensions(bytes) {
  if (bytes.subarray(1, 4).toString('ascii') === 'PNG') return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      offset += 2 + length;
    }
  }
  throw new Error('unsupported image format');
}

const results = [];
let zipEntries = [];
if (zipPath) {
  const zipBytes = await readFile(zipPath);
  const zipStat = await stat(zipPath);
  zipEntries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  execFileSync('unzip', ['-t', zipPath], { stdio: 'pipe' });
  const expected = manifest.masterPackage;
  const reasons = [];
  if (zipStat.size !== expected.bytes) reasons.push('byte-count-mismatch');
  if (sha(zipBytes) !== expected.sha256) reasons.push('sha256-mismatch');
  if (zipEntries.length !== expected.expectedFileCount) reasons.push('zip-entry-count-mismatch');
  results.push({ recordType: 'master-package', filename: expected.filename, path: zipPath, status: reasons.length ? 'integrity-failure' : 'verified', reasons, expectedBytes: expected.bytes, actualBytes: zipStat.size, expectedSha256: expected.sha256, actualSha256: sha(zipBytes), expectedZipEntries: expected.expectedFileCount, actualZipEntries: zipEntries.length, zipIntegrity: 'tested' });

  for (const asset of manifest.evidence) {
    const bytes = execFileSync('unzip', ['-p', zipPath, asset.zipPath], { maxBuffer: 12 * 1024 * 1024 });
    const actualPixels = dimensions(bytes);
    const reasons = [];
    if (!zipEntries.includes(asset.zipPath)) reasons.push('zip-path-missing');
    if (bytes.length !== asset.bytes) reasons.push('byte-count-mismatch');
    if (sha(bytes) !== asset.sha256) reasons.push('sha256-mismatch');
    if (actualPixels.width !== asset.pixels.width || actualPixels.height !== asset.pixels.height) reasons.push('pixel-dimensions-mismatch');
    results.push({ recordType: 'direct-evidence', evidenceId: asset.evidenceId, filename: asset.filename, zipPath: asset.zipPath, status: reasons.length ? 'integrity-failure' : 'verified', reasons, expectedBytes: asset.bytes, actualBytes: bytes.length, expectedSha256: asset.sha256, actualSha256: sha(bytes), expectedPixels: asset.pixels, actualPixels });
  }
} else {
  for (const asset of [manifest.masterPackage, ...manifest.evidence]) results.push({ recordType: asset.evidenceId ? 'direct-evidence' : 'master-package', evidenceId: asset.evidenceId ?? null, filename: asset.filename, status: 'missing', reasons: ['release-zip-not-provided'], expectedBytes: asset.bytes, actualBytes: null, expectedSha256: asset.sha256, actualSha256: null });
}

for (const asset of manifest.derivedAssets) {
  try {
    const bytes = await readFile(asset.path);
    const actualPixels = dimensions(bytes);
    const reasons = [];
    if (bytes.length !== asset.bytes) reasons.push('byte-count-mismatch');
    if (sha(bytes) !== asset.sha256) reasons.push('sha256-mismatch');
    if (actualPixels.width !== asset.pixels.width || actualPixels.height !== asset.pixels.height) reasons.push('pixel-dimensions-mismatch');
    results.push({ recordType: 'derived-asset', filename: asset.filename, path: asset.path, parentEvidenceIds: asset.parentEvidenceIds, derivation: asset.derivation, status: reasons.length ? 'integrity-failure' : 'verified', reasons, expectedBytes: asset.bytes, actualBytes: bytes.length, expectedSha256: asset.sha256, actualSha256: sha(bytes), expectedPixels: asset.pixels, actualPixels });
  } catch (error) {
    results.push({ recordType: 'derived-asset', filename: asset.filename, path: asset.path, status: 'missing', reasons: [error.code || error.message], expectedBytes: asset.bytes, actualBytes: null, expectedSha256: asset.sha256, actualSha256: null });
  }
}

const summary = { expected: results.length, verified: results.filter((item) => item.status === 'verified').length, missing: results.filter((item) => item.status === 'missing').length, integrityFailures: results.filter((item) => item.status === 'integrity-failure').length };
const status = summary.integrityFailures ? 'integrity-failure' : summary.missing ? 'blocked-missing-asset' : 'verified';
const report = { schema: 'haihao.aircraft/reference-intake-report@2.0', aircraftId: manifest.aircraftId, generatedAt: new Date().toISOString(), releaseTag: '80-days-source-v1', sourceUrl: manifest.masterPackage.releaseUrl, status, blocking: status !== 'verified', summary, zipIntegrity: zipPath ? { tested: true, entries: zipEntries.length } : { tested: false }, results };
await writeFile(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
const rows = results.map((item) => `| ${item.evidenceId ?? item.recordType} | \`${item.filename}\` | \`${item.status}\` | ${item.actualBytes ?? 'missing'} / ${item.expectedBytes} | \`${item.actualSha256 ?? 'missing'}\` |`);
await writeFile(reportMarkdownPath, ['# “80 DAYS” historical reference intake', '', `- Status: \`${status}\``, `- Expected: ${summary.expected}`, `- Verified: ${summary.verified}`, `- Missing: ${summary.missing}`, `- Integrity failures: ${summary.integrityFailures}`, `- ZIP integrity: ${zipPath ? `passed, ${zipEntries.length} entries` : 'not run'}`, '', '| ID | File | State | Bytes | SHA-256 |', '|---|---|---|---:|---|', ...rows, ''].join('\n'));
console.log(JSON.stringify({ status, summary, zipEntries: zipEntries.length }, null, 2));
if (status === 'integrity-failure') process.exitCode = 1;
