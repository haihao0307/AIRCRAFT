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
  throw new Error('Usage: node scripts/intake-engineering-images.mjs --config <json> --out-dir <directory>');
}

const configPath = path.resolve(args.config);
const outDir = path.resolve(args['out-dir']);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.schema !== 'haihao.aircraft/engineering-image-intake-config@1.0.0') {
  throw new Error(`Unsupported intake schema: ${config.schema}`);
}
if (!config.source?.source_id || !Array.isArray(config.files) || config.files.length === 0) {
  throw new Error('The image intake requires one source and at least one file');
}
fs.mkdirSync(outDir, { recursive: true });

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function inspectPng(bytes) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error('Payload does not have a valid PNG signature');
  }
  const chunkType = bytes.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') throw new Error(`Expected IHDR as first PNG chunk, received ${chunkType}`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bit_depth: bytes[24],
    color_type: bytes[25]
  };
}

async function downloadWithRetry(file, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const response = await fetch(file.requested_url, {
        redirect: 'follow',
        cache: 'no-store',
        headers: {
          'User-Agent': 'Haihao-Aircraft-Native-Forge/1.0 engineering-source-intake contact-via-github',
          Accept: 'image/png,image/*;q=0.9,*/*;q=0.1'
        },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      return { response, bytes, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(Math.min(30_000, attempt * 3500));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Failed to download ${file.file_role}: ${lastError?.message || lastError}`);
}

const records = [];
for (const file of config.files.sort((a, b) => a.review_priority - b.review_priority)) {
  const { response, bytes, attempt } = await downloadWithRetry(file);
  if (bytes.length < Number(file.minimum_bytes || 1)) {
    throw new Error(`${file.file_role} is too small: ${bytes.length} bytes`);
  }
  const png = inspectPng(bytes);
  if (file.expected_width && png.width !== file.expected_width) {
    throw new Error(`${file.file_role} width ${png.width} does not match ${file.expected_width}`);
  }
  if (file.expected_height && png.height !== file.expected_height) {
    throw new Error(`${file.file_role} height ${png.height} does not match ${file.expected_height}`);
  }
  const outputPath = path.join(outDir, file.output_filename);
  fs.writeFileSync(outputPath, bytes);
  records.push({
    file_role: file.file_role,
    output_filename: file.output_filename,
    requested_url: file.requested_url,
    resolved_url: response.url,
    bytes: bytes.length,
    sha256: sha256(bytes),
    png,
    response: {
      status: response.status,
      content_type: response.headers.get('content-type'),
      content_length: response.headers.get('content-length'),
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified')
    },
    download_attempt: attempt,
    downloaded_at: new Date().toISOString(),
    visual_review_status: 'pending-upstream-review',
    geometry_use_approved: false
  });
}

const manifest = {
  schema: 'haihao.aircraft/engineering-image-intake-manifest@1.0.0',
  intake_id: config.intake_id,
  generated_at: new Date().toISOString(),
  config: path.relative(process.cwd(), configPath).replaceAll(path.sep, '/'),
  source: config.source,
  records,
  required_review: config.required_review,
  approval: config.approval
};
fs.writeFileSync(
  path.join(outDir, 'intake-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);
console.log(JSON.stringify(manifest, null, 2));
