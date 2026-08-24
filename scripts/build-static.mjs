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
await cp('public/80-days-livery-workbench.html', 'dist/80-days-livery-workbench.html');

console.log('Built authoritative B-24 static production site in dist/.');
console.log('Published the “80 DAYS” evidence status and real-model livery workbench.');
console.log('The workbench loads only the locked Release GLB and never draws a substitute aircraft.');
