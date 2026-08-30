#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const result = { module: '', output: '', assets: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--module') result.module = argv[++index];
    else if (value === '--output') result.output = argv[++index];
    else result.assets.push(value);
  }
  if (!result.module || !result.output || result.assets.length === 0) {
    throw new Error('usage: run-khronos-gltf-validator.mjs --module <module.mjs> --output <report.json> <asset.glb>...');
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const validator = await import(pathToFileURL(args.module).href);
const results = [];

for (const assetPath of args.assets) {
  const bytes = await readFile(assetPath);
  const report = await validator.validateBytes(new Uint8Array(bytes), {
    uri: assetPath,
    maxIssues: 2000,
  });
  results.push({
    file: assetPath.split(/[\\/]/).pop(),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    validatorVersion: report.validatorVersion,
    validatedAt: report.validatedAt,
    issues: report.issues,
    info: report.info,
  });
}

const output = {
  schema: 'haihao.aircraft/weapons-mother-khronos-gltf-validation@1.0.0',
  validator: 'KhronosGroup glTF-Validator npm',
  status: results.every(result => result.issues.numErrors === 0) ? 'PASS_NO_ERRORS' : 'FAIL',
  approvalBoundary: 'Source-format validation only; no B-24 weapon, scale, mount, geometry, material, or runtime approval.',
  results,
};
await writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  status: output.status,
  results: results.map(result => ({
    file: result.file,
    errors: result.issues.numErrors,
    warnings: result.issues.numWarnings,
    infos: result.issues.numInfos,
    hints: result.issues.numHints,
  })),
}, null, 2));
if (output.status === 'FAIL') process.exitCode = 1;
