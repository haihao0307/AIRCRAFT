#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const EXPECTED_BYTES = 23_085_972;
const EXPECTED_SHA256 = '541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d';
const path = resolve(process.argv[2] ?? 'public/assets/model/b-24_liberator.glb');
let buffer;
try {
  buffer = await readFile(path);
} catch {
  console.error(`Authoritative GLB missing: ${path}`);
  process.exit(1);
}
const magic = buffer.subarray(0, 4).toString('ascii');
const declared = buffer.length >= 12 ? buffer.readUInt32LE(8) : -1;
const sha256 = createHash('sha256').update(buffer).digest('hex');
const ok = magic === 'glTF' && declared === buffer.length && buffer.length === EXPECTED_BYTES && sha256 === EXPECTED_SHA256;
console.log(JSON.stringify({ path, magic, declared, bytes: buffer.length, sha256, ok }, null, 2));
if (!ok) process.exit(1);
