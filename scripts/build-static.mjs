import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'turret-motion-v1.html', '404.html', 'src', 'assets', 'data', 'docs']) {
  await cp(path, `dist/${path}`, { recursive: true });
}
console.log('Built static GitHub Pages site in dist/');
