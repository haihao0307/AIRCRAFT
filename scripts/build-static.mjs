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
  'reports',
];

for (const path of publishPaths) {
  await cp(path, `dist/${path}`, { recursive: true });
}

await cp('public/80-days-livery-status.html', 'dist/80-days-livery-status.html');

console.log('Built fail-closed authoritative B-24 correction site in dist/.');
console.log('Published the “80 DAYS” evidence and mission-state status page.');
console.log('Procedural aircraft prototypes are intentionally excluded.');
