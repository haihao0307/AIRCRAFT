import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assert, readJson, sha256, writeAtomic } from './lib.mjs';

const source = process.argv[2];
assert(source, 'Usage: npm run materialize:model -- <local-file>');
assert(!/^https?:/i.test(source), 'Download the complete source first so its bytes can be verified locally.');

const lock = await readJson('registry/models/b24-liberator/source-model.lock.json');
const sourcePath = resolve(source);
const info = await stat(sourcePath);
assert(info.isFile(), `Model source is not a file: ${sourcePath}`);
assert(info.size === lock.bytes, `Model byte count mismatch. Expected ${lock.bytes}, received ${info.size}.`);

const bytes = await readFile(sourcePath);
const digest = sha256(bytes);
assert(digest === lock.sha256, `Model SHA-256 mismatch. Expected ${lock.sha256}, received ${digest}.`);

await writeAtomic(resolve(lock.targetPath), bytes);
console.log(`PASS model materialized: ${lock.targetPath}`);
console.log(`SHA-256 ${digest}`);
