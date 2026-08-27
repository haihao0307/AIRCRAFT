import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    result[key] = value;
    index += 1;
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
if (!args.config || !args['out-dir']) {
  throw new Error('Usage: node scripts/intake-engineering-sources.mjs --config <json> --out-dir <directory>');
}

const configPath = path.resolve(args.config);
const outDir = path.resolve(args['out-dir']);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.schema !== 'haihao.aircraft/engineering-source-intake-config@1.0.0') {
  throw new Error(`Unsupported intake schema: ${config.schema}`);
}
if (!Array.isArray(config.sources) || config.sources.length === 0) {
  throw new Error('The source intake configuration is empty');
}

fs.mkdirSync(outDir, { recursive: true });

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function downloadWithRetry(source, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const response = await fetch(source.requested_url, {
        redirect: 'follow',
        cache: 'no-store',
        headers: {
          'User-Agent': 'Haihao-Aircraft-Native-Forge/1.0 source-intake',
          Accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.1'
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      return { response, bytes, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 2500);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed to download ${source.source_id}: ${lastError?.message || lastError}`);
}

const records = [];
for (const source of config.sources) {
  if (!source.source_id || !source.requested_url || !source.output_filename) {
    throw new Error('Each source requires source_id, requested_url and output_filename');
  }
  const { response, bytes, attempt } = await downloadWithRetry(source);
  if (bytes.length < Number(source.minimum_bytes || 1)) {
    throw new Error(`${source.source_id} is too small: ${bytes.length} bytes`);
  }
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error(`${source.source_id} is not a PDF payload`);
  }

  const sourceDir = path.join(outDir, source.source_id);
  fs.mkdirSync(sourceDir, { recursive: true });
  const outputPath = path.join(sourceDir, source.output_filename);
  fs.writeFileSync(outputPath, bytes);

  const record = {
    schema: 'haihao.aircraft/engineering-source-intake-record@1.0.0',
    intake_id: config.intake_id,
    source_id: source.source_id,
    title: source.title,
    drawing_numbers: source.drawing_numbers || [],
    requested_url: source.requested_url,
    resolved_url: response.url,
    output_filename: source.output_filename,
    bytes: bytes.length,
    sha256: sha256(bytes),
    pdf_header: bytes.subarray(0, 8).toString('ascii'),
    response: {
      status: response.status,
      content_type: response.headers.get('content-type'),
      content_length: response.headers.get('content-length'),
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified')
    },
    download_attempt: attempt,
    downloaded_at: new Date().toISOString(),
    authority_level: source.authority_level,
    variant_applicability: source.variant_applicability,
    rights_status: source.rights_status,
    required_observations: source.required_observations || [],
    promotion_status: 'artifact-only-pending-rights-title-block-and-applicability-review',
    approvals: {
      sourceBytesVerified: true,
      titleBlockApproved: false,
      variantApplicabilityApproved: false,
      rightsApprovedForRepositoryCommit: false,
      geometryUseApproved: false
    }
  };
  fs.writeFileSync(
    path.join(sourceDir, 'intake-record.json'),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8'
  );
  records.push(record);
  console.log(JSON.stringify({
    source_id: record.source_id,
    bytes: record.bytes,
    sha256: record.sha256,
    resolved_url: record.resolved_url
  }));
}

const manifest = {
  schema: 'haihao.aircraft/engineering-source-intake-manifest@1.0.0',
  intake_id: config.intake_id,
  generated_at: new Date().toISOString(),
  config: path.relative(process.cwd(), configPath).replaceAll(path.sep, '/'),
  binary_commit_policy: config.binary_commit_policy,
  records,
  approvals: config.approval
};
fs.writeFileSync(
  path.join(outDir, 'download-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);
