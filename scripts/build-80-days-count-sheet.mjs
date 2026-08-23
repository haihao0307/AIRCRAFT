import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const manifestPath = 'data/aircraft/308bg/80-days-reference-manifest.json';
const missionStatesPath = 'data/aircraft/308bg/80-days-mission-states.json';
const outputJsonPath = 'reports/80-days-count-sheet.json';
const outputSvgPath = 'reports/80-days-count-sheet.svg';

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const missionStates = JSON.parse(await readFile(missionStatesPath, 'utf8'));
const activeState = missionStates.states.find(
  (item) => item.missionStateId === missionStates.activePlacementStateId,
);
if (!activeState) throw new Error(`Active mission state not found: ${missionStates.activePlacementStateId}`);

const source = manifest.evidence.find((item) => item.evidenceId === 'E01');
if (!source) throw new Error('E01 is required for the initial victory-flag and bomb-mark count sheet.');

const sourcePath = path.join(manifest.stagingRoot, source.filename);
const annotationPath = path.join(manifest.stagingRoot, '80-days-E01-annotations.json');
const allowedTypes = new Set(['victory-flag', 'bomb-mark']);
const allowedStatuses = new Set(['verified', 'obscured', 'duplicate', 'not-a-symbol', 'unresolved']);

const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const writeOutputs = async (payload, svg) => {
  await mkdir(path.dirname(outputJsonPath), { recursive: true });
  await writeFile(outputJsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(outputSvgPath, svg, 'utf8');
  console.log(JSON.stringify({
    status: payload.status,
    source: payload.source,
    outputJsonPath,
    outputSvgPath,
  }, null, 2));
};

const blockedSvg = (status, detail) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="720" viewBox="0 0 1400 720">
  <rect width="1400" height="720" fill="#101820"/>
  <rect x="40" y="40" width="1320" height="640" rx="24" fill="#17242d" stroke="#b98c52" stroke-width="3"/>
  <text x="80" y="120" fill="#f0d6a2" font-family="system-ui,sans-serif" font-size="46" font-weight="700">B-24 “80 DAYS” symbol count sheet</text>
  <text x="80" y="190" fill="#efb07b" font-family="system-ui,sans-serif" font-size="28">Status: ${escapeXml(status)}</text>
  <text x="80" y="250" fill="#c9d4d9" font-family="system-ui,sans-serif" font-size="24">${escapeXml(detail)}</text>
  <text x="80" y="320" fill="#c9d4d9" font-family="system-ui,sans-serif" font-size="22">Required source: ${escapeXml(sourcePath)}</text>
  <text x="80" y="370" fill="#c9d4d9" font-family="system-ui,sans-serif" font-size="22">Expected SHA-256: ${source.sha256}</text>
  <text x="80" y="440" fill="#9fb0b8" font-family="system-ui,sans-serif" font-size="20">Restore the exact file, run npm run validate:80days:references, then rerun this command.</text>
  <text x="80" y="500" fill="#9fb0b8" font-family="system-ui,sans-serif" font-size="20">No symbol count is inferred from generated art or computer-vision guesses.</text>
</svg>
`;

let sourceStat;
try {
  sourceStat = await stat(sourcePath);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  const payload = {
    schema: 'haihao.aircraft/symbol-count-sheet@1.0',
    aircraftId: manifest.aircraftId,
    missionStateId: activeState.missionStateId,
    generatedAt: new Date().toISOString(),
    status: 'blocked-missing-asset',
    source: {
      evidenceId: 'E01',
      filename: source.filename,
      path: sourcePath,
      expectedBytes: source.bytes,
      expectedSha256: source.sha256,
      verified: false,
    },
    victoryFlagCount: 8,
    victoryFlagCountStatus: 'historical-record-only-pending-annotation',
    bombMarkCount: null,
    bombMarkCountStatus: 'requires-annotated-count',
    annotations: [],
    restorationAction: `Restore ${sourcePath} with the locked byte count and SHA-256, then rerun this command.`,
  };
  await writeOutputs(payload, blockedSvg(payload.status, 'The locked E01 source image is absent.'));
  process.exit(0);
}

const actualBytes = sourceStat.size;
const actualSha256 = await sha256File(sourcePath);
if (actualBytes !== source.bytes || actualSha256 !== source.sha256) {
  const payload = {
    schema: 'haihao.aircraft/symbol-count-sheet@1.0',
    aircraftId: manifest.aircraftId,
    missionStateId: activeState.missionStateId,
    generatedAt: new Date().toISOString(),
    status: 'integrity-failure',
    source: {
      evidenceId: 'E01',
      filename: source.filename,
      path: sourcePath,
      expectedBytes: source.bytes,
      actualBytes,
      expectedSha256: source.sha256,
      actualSha256,
      verified: false,
    },
    annotations: [],
  };
  await writeOutputs(payload, blockedSvg(payload.status, 'The present E01 file failed byte-count or SHA-256 validation.'));
  process.exitCode = 1;
} else {
  let annotation = null;
  try {
    annotation = JSON.parse(await readFile(annotationPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const imageBytes = await readFile(sourcePath);
  const imageData = `data:image/jpeg;base64,${imageBytes.toString('base64')}`;
  const width = source.pixels.width;
  const height = source.pixels.height;
  const canvasWidth = 1400;
  const imageWidth = 1280;
  const scale = imageWidth / width;
  const imageHeight = Math.round(height * scale);
  const imageX = 60;
  const imageY = 150;

  if (!annotation) {
    const payload = {
      schema: 'haihao.aircraft/symbol-count-sheet@1.0',
      aircraftId: manifest.aircraftId,
      missionStateId: activeState.missionStateId,
      generatedAt: new Date().toISOString(),
      status: 'requires-reviewer-annotation',
      source: {
        evidenceId: 'E01',
        filename: source.filename,
        path: sourcePath,
        bytes: actualBytes,
        sha256: actualSha256,
        verified: true,
        crop: { x: 0, y: 0, width, height },
      },
      annotationInput: annotationPath,
      allowedTypes: [...allowedTypes],
      allowedStatuses: [...allowedStatuses],
      knownVictoryFlagCount: 8,
      knownVictoryFlagCountStatus: 'source-record-supported-not-position-annotated',
      bombMarkCount: null,
      bombMarkCountStatus: 'requires-annotated-count',
      annotations: [],
      instructions: [
        'Create the annotation sidecar at annotationInput.',
        'Use original-image pixel coordinates and one record per visible candidate symbol.',
        'Assign type, status and bounding box; do not auto-approve detections.',
        'Set reviewApproved only after a human checks every numbered symbol.',
      ],
    };

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${imageY + imageHeight + 120}" viewBox="0 0 ${canvasWidth} ${imageY + imageHeight + 120}">
  <rect width="100%" height="100%" fill="#101820"/>
  <text x="60" y="62" fill="#f0d6a2" font-family="system-ui,sans-serif" font-size="38" font-weight="700">B-24 “80 DAYS” E01 reviewer count sheet</text>
  <text x="60" y="108" fill="#efb07b" font-family="system-ui,sans-serif" font-size="22">Source verified. Manual symbol boxes are still required. No automatic count is approved.</text>
  <image href="${imageData}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}"/>
  <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" fill="none" stroke="#d9b36c" stroke-width="3"/>
</svg>
`;
    await writeOutputs(payload, svg);
  } else {
    if (annotation.sourceSha256 !== source.sha256) {
      throw new Error('Annotation sidecar sourceSha256 does not match locked E01.');
    }
    if (!Array.isArray(annotation.symbols)) throw new Error('Annotation sidecar symbols must be an array.');

    const ids = new Set();
    const symbols = annotation.symbols.map((symbol, index) => {
      if (!symbol.id || ids.has(symbol.id)) throw new Error(`Duplicate or missing annotation ID at index ${index}.`);
      ids.add(symbol.id);
      if (!allowedTypes.has(symbol.type)) throw new Error(`Unsupported annotation type: ${symbol.type}`);
      if (!allowedStatuses.has(symbol.status)) throw new Error(`Unsupported annotation status: ${symbol.status}`);
      if (!Array.isArray(symbol.bbox) || symbol.bbox.length !== 4 || symbol.bbox.some((value) => !Number.isFinite(value))) {
        throw new Error(`Invalid bbox for annotation ${symbol.id}.`);
      }
      const [x, y, boxWidth, boxHeight] = symbol.bbox;
      if (x < 0 || y < 0 || boxWidth <= 0 || boxHeight <= 0 || x + boxWidth > width || y + boxHeight > height) {
        throw new Error(`Out-of-bounds bbox for annotation ${symbol.id}.`);
      }
      return { ...symbol };
    });

    const verifiedVictoryFlags = symbols.filter(
      (symbol) => symbol.type === 'victory-flag' && symbol.status === 'verified',
    ).length;
    const verifiedBombMarks = symbols.filter(
      (symbol) => symbol.type === 'bomb-mark' && symbol.status === 'verified',
    ).length;
    const unresolved = symbols.filter((symbol) => symbol.status === 'unresolved').length;
    const reviewApproved = annotation.reviewApproved === true && unresolved === 0;

    const payload = {
      schema: 'haihao.aircraft/symbol-count-sheet@1.0',
      aircraftId: manifest.aircraftId,
      missionStateId: activeState.missionStateId,
      generatedAt: new Date().toISOString(),
      status: reviewApproved ? 'reviewer-approved-count-sheet' : 'review-in-progress',
      source: {
        evidenceId: 'E01',
        filename: source.filename,
        path: sourcePath,
        bytes: actualBytes,
        sha256: actualSha256,
        verified: true,
        crop: annotation.crop ?? { x: 0, y: 0, width, height },
      },
      annotationInput: annotationPath,
      reviewApproved,
      verifiedVictoryFlagCount: verifiedVictoryFlags,
      verifiedBombMarkCount: verifiedBombMarks,
      unresolvedCount: unresolved,
      approvedForFinalBake: false,
      annotations: symbols,
    };

    const boxes = symbols
      .map((symbol, index) => {
        const [x, y, boxWidth, boxHeight] = symbol.bbox;
        const color =
          symbol.status === 'verified'
            ? symbol.type === 'victory-flag'
              ? '#ff655f'
              : '#f1c451'
            : symbol.status === 'unresolved'
              ? '#66b7ff'
              : '#aeb8bd';
        const sx = imageX + x * scale;
        const sy = imageY + y * scale;
        const sw = boxWidth * scale;
        const sh = boxHeight * scale;
        return `<g>
  <rect x="${sx.toFixed(2)}" y="${sy.toFixed(2)}" width="${sw.toFixed(2)}" height="${sh.toFixed(2)}" fill="none" stroke="${color}" stroke-width="3"/>
  <circle cx="${sx.toFixed(2)}" cy="${sy.toFixed(2)}" r="15" fill="${color}"/>
  <text x="${sx.toFixed(2)}" y="${(sy + 6).toFixed(2)}" text-anchor="middle" fill="#101820" font-family="system-ui,sans-serif" font-size="14" font-weight="700">${index + 1}</text>
  <title>${escapeXml(`${symbol.id}: ${symbol.type}, ${symbol.status}`)}</title>
</g>`;
      })
      .join('\n');

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${imageY + imageHeight + 140}" viewBox="0 0 ${canvasWidth} ${imageY + imageHeight + 140}">
  <rect width="100%" height="100%" fill="#101820"/>
  <text x="60" y="56" fill="#f0d6a2" font-family="system-ui,sans-serif" font-size="36" font-weight="700">B-24 “80 DAYS” E01 annotated symbol count</text>
  <text x="60" y="102" fill="#c9d4d9" font-family="system-ui,sans-serif" font-size="21">Verified flags: ${verifiedVictoryFlags} · Verified bombs: ${verifiedBombMarks} · Unresolved: ${unresolved} · Review approved: ${reviewApproved}</text>
  <image href="${imageData}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}"/>
  <rect x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" fill="none" stroke="#d9b36c" stroke-width="3"/>
  ${boxes}
</svg>
`;
    await writeOutputs(payload, svg);
  }
}
