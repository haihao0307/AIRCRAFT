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
await cp('80-days-texture-master-v2.html', 'dist/80-days-texture-master-v2.html');
await mkdir('dist/assets/model', { recursive: true });
await cp('public/assets/model/b-24_liberator.glb','dist/assets/model/b-24_liberator.glb');
await cp('public/assets/model/b-24_liberator_80days-liveryuv-v1.glb','dist/assets/model/b-24_liberator_80days-liveryuv-v1.glb');
await mkdir('dist/assets/livery/80-days', { recursive: true });
await cp('public/assets/livery/80-days', 'dist/assets/livery/80-days', { recursive: true });
console.log('Built authoritative B-24 static production site in dist/.');
console.log('Published the “80 DAYS” high-detail pre-binding texture master V2.');
console.log('The texture master remains model-free until upstream visual approval.');
