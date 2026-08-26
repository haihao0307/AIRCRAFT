import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function writeAtomic(path, buffer) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, buffer);
  await rename(temporary, path);
}
