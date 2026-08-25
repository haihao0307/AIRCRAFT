import { readFile } from 'node:fs/promises';
import process from 'node:process';

const root = process.cwd();
const rootPage = await readFile(`${root}/livery-production-line.html`, 'utf8');
const publicPage = await readFile(`${root}/public/livery-production-line.html`, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(rootPage === publicPage, 'Root and public livery preview pages must remain identical.');
assert(rootPage.includes('<title>历史涂装生产线 V0.1</title>'), 'Missing V0.1 page title.');
assert(rootPage.includes("fetch('./data/livery-line/catalog.json')"), 'The page must load the independent livery catalog.');
assert(!rootPage.includes('b-24_liberator.glb'), 'The livery web preview must not depend on the aircraft binary.');
assert(!/<script\s+[^>]*src=/i.test(rootPage), 'The first preview must not depend on external scripts.');

const requiredIds = [
  'workflow',
  'overview',
  'airframe',
  'people',
  'events',
  'evidence',
  'textures',
  'export',
  'aircraftSelect',
  'stageTrack',
  'downloadRecord',
  'jsonDialog'
];

for (const id of requiredIds) {
  assert(rootPage.includes(`id="${id}"`), `Missing required web preview element: ${id}`);
}

const scriptMatch = rootPage.match(/<script type="module">([\s\S]*?)<\/script>/);
assert(scriptMatch, 'Missing inline module script.');
new Function(scriptMatch[1]);

console.log('Historical livery web preview validated: V0.1.');
console.log('Root and public copies match; required sections and inline script parse successfully.');
console.log('Target aircraft binary references found: 0.');
