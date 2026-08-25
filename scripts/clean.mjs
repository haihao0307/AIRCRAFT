import { rm } from 'node:fs/promises';

const generated = [
  'dist',
  'public/runtime/b24/v0.9.6/index.html',
  'public/assets/models/b24-liberator/b-24_liberator.glb'
];

for (const path of generated) {
  await rm(path, { recursive: true, force: true });
}

console.log('Removed generated build and materialized asset files.');
