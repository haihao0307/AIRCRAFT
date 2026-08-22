#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const EXPECTED_BYTES = 23_085_972;
const EXPECTED_SHA256 = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const [inputArg, outputArg = 'public/assets/model/b-24_liberator.glb'] = process.argv.slice(2);
if (!inputArg) {
  console.error('Usage: node scripts/extract-glb-from-html.mjs <source.html> [output.glb]');
  process.exit(2);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const html = await readFile(inputPath, 'utf8');
const clean = text => text.replace(/\\\r?\n/g, '').replace(/\s+/g, '');
function decodeCandidate(base64, source) {
  try {
    const buffer = Buffer.from(clean(base64), 'base64');
    if (buffer.length < 12 || buffer.subarray(0, 4).toString('ascii') !== 'glTF') return null;
    if (buffer.readUInt32LE(8) !== buffer.length) return null;
    return { buffer, source };
  } catch {
    return null;
  }
}

const candidates = [];
const patterns = [
  ['data-url', /data:model\/(?:gltf-binary|octet-stream);base64,([A-Za-z0-9+/=\s\\]+)/g],
  ['quoted-glb', /["'`]((?:Z2xURg)[A-Za-z0-9+/=\s\\]{100000,})["'`]/g],
  ['bare-glb', /(Z2xURg[A-Za-z0-9+/=]{100000,})/g]
];
for (const [label, pattern] of patterns) {
  for (const match of html.matchAll(pattern)) {
    const candidate = decodeCandidate(match[1], label);
    if (candidate) candidates.push(candidate);
  }
}
const exact = candidates.find(({ buffer }) => buffer.length === EXPECTED_BYTES && createHash('sha256').update(buffer).digest('hex') === EXPECTED_SHA256);
if (!exact) {
  console.error(`No exact authoritative GLB found in ${inputPath}. Valid GLB candidates: ${candidates.length}`);
  for (const [index, { buffer, source }] of candidates.entries()) {
    console.error(`${index + 1}. ${source}: ${buffer.length} bytes, ${createHash('sha256').update(buffer).digest('hex')}`);
  }
  process.exit(1);
}
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, exact.buffer);
console.log(`Extracted authoritative GLB to ${outputPath}`);
console.log(`bytes=${exact.buffer.length}`);
console.log(`sha256=${EXPECTED_SHA256}`);
