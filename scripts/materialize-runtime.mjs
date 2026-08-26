import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assert, readJson, sha256, writeAtomic } from './lib.mjs';

const source = process.argv[2];
assert(source, 'Usage: npm run materialize:runtime -- <local-file>');
assert(!/^https?:/i.test(source), 'Download the complete source first so its bytes can be verified locally.');

const lock = await readJson('runtime/b24/v0.9.6-gold/runtime.lock.json');
const sourcePath = resolve(source);
const info = await stat(sourcePath);
assert(info.isFile(), `Runtime source is not a file: ${sourcePath}`);

const bytes = await readFile(sourcePath);
const digest = sha256(bytes);
assert(
  digest === lock.sourceArtifact.sha256,
  `Runtime SHA-256 mismatch. Expected ${lock.sourceArtifact.sha256}, received ${digest}.`
);

await writeAtomic(resolve(lock.sourceArtifact.targetPath), bytes);
console.log(`PASS runtime materialized: ${lock.sourceArtifact.targetPath}`);
console.log(`SHA-256 ${digest}`);
