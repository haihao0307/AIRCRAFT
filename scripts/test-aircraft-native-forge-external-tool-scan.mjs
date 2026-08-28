import assert from 'node:assert/strict';
import { scanExternalToolInvocations } from './lib/external-tool-invocation-scan.mjs';

const cases = [
  ['scripts/live.mjs', "import thing from 'img2threejs';", true],
  ['scripts/live.cjs', "const thing = require('img2threejs');", true],
  ['scripts/live.sh', 'git clone https://example.invalid/img2threejs.git', true],
  ['scripts/live.sh', 'npm install img2threejs', true],
  ['.github/workflows/live.yml', '- uses: owner/img2threejs@v1', true],
  ['docs/note.md', 'npm install img2threejs is prohibited.', false],
  ['scripts/note.sh', 'echo "npm install img2threejs is prohibited"', false],
  ['scripts/regex.mjs', 'const forbidden = /import.*img2threejs/i;', false],
  ['.github/workflows/note.yml', "run: |\n  echo 'uses: owner/img2threejs@v1'", false]
];

for (const [file, source, shouldFail] of cases) {
  const findings = scanExternalToolInvocations(file, source);
  assert.equal(findings.length > 0, shouldFail, `${file}: ${source}`);
}

console.log(JSON.stringify({ ok: true, cases: cases.length }, null, 2));
