import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'apps/production-line/index.html'), path.join(dist, 'index.html'));
await cp(path.join(root, 'apps/production-line/styles.css'), path.join(dist, 'styles.css'));
await cp(path.join(root, 'apps/production-line/app.js'), path.join(dist, 'app.js'));
await cp(path.join(root, 'data'), path.join(dist, 'data'), { recursive: true });

console.log('Built static production dashboard in dist/.');
