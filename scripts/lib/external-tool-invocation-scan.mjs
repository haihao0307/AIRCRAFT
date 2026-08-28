const TOOL = 'img2threejs';

const stripQuotes = (value) => value.replace(/^["'`]|["'`]$/g, '');

export function scanExternalToolInvocations(relativePath, source) {
  const extension = relativePath.split('.').pop()?.toLowerCase();
  if (!['js', 'mjs', 'cjs', 'ts', 'tsx', 'yml', 'yaml', 'sh', 'py'].includes(extension)) return [];
  const findings = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    if (/^(?:echo|printf)\b/i.test(line)) continue;
    if (!['yml', 'yaml'].includes(extension) && /^(?:[-*]|\d+\.)\s/.test(line)) continue;

    let executable = false;
    if (['js', 'mjs', 'cjs', 'ts', 'tsx'].includes(extension)) {
      executable = /^(?:import\s|const\s+\w+\s*=\s*require\s*\(|let\s+\w+\s*=\s*require\s*\(|var\s+\w+\s*=\s*require\s*\()/i.test(line);
    } else if (['yml', 'yaml'].includes(extension)) {
      executable = /^-?\s*uses:\s*/i.test(line) || /^-?\s*run:\s*[^|>]/i.test(line);
    } else {
      executable = /^(?:npm|pnpm|yarn|pip|pip3|python|python3|git\s+clone)\b/i.test(line);
    }

    if (!executable || !line.toLowerCase().includes(TOOL)) continue;
    findings.push({ file: relativePath, line: index + 1, text: stripQuotes(line).slice(0, 240) });
  }
  return findings;
}
