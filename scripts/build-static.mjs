import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

const publishPaths = [
  'index.html',
  'b24-four-turret-v0.9.8.html',
  '404.html',
  'assets',
  'data',
  'docs',
];

for (const path of publishPaths) {
  await cp(path, `dist/${path}`, { recursive: true });
}

console.log('Built fail-closed authoritative B-24 correction site in dist/.');
console.log('Procedural aircraft prototypes are intentionally excluded.');
