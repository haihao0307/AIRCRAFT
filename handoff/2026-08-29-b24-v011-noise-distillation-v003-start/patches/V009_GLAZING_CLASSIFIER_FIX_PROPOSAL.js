/* Proposal only. Capture the exact 37-source-material inventory before merge. */

const GLASS_CONTEXT_RULE = /cockpit|turret|nose|waist|dorsal|ventral|canopy|window|windscreen|windshield|plexi|glass|glaz/i;

function sourceMaterialEvidence(material) {
  return {
    name: material?.name ?? '',
    type: material?.type ?? '',
    transparent: Boolean(material?.transparent),
    opacity: Number(material?.opacity ?? 1),
    transmission: Number(material?.transmission ?? 0),
    hasAlphaMap: Boolean(material?.alphaMap),
    alphaTest: Number(material?.alphaTest ?? 0),
    depthWrite: material?.depthWrite !== false,
    blending: material?.blending ?? null
  };
}

function classifyMaterialDecision(mesh, material) {
  const label = `${objectLabel(mesh)} ${material?.name ?? ''}`.toLowerCase();
  const evidence = sourceMaterialEvidence(material);
  const excluded = NAME_RULES.paint.test(label)
    || NAME_RULES.propeller.test(label)
    || NAME_RULES.blur.test(label)
    || NAME_RULES.rubber.test(label)
    || NAME_RULES.hardware.test(label);
  const transparentSignal = evidence.transmission > 0
    || evidence.transparent
    || evidence.opacity < 0.999
    || evidence.hasAlphaMap
    || evidence.alphaTest > 0;

  if (NAME_RULES.glass.test(label)) {
    return { category: 'glazing', reason: 'explicit-glass-name', confidence: 1, evidence, label, unresolvedTransparentCandidate: false };
  }
  if (!excluded && evidence.transmission >= 0.05) {
    return { category: 'glazing', reason: 'physical-transmission', confidence: 0.98, evidence, label, unresolvedTransparentCandidate: false };
  }
  if (!excluded && GLASS_CONTEXT_RULE.test(label) && evidence.transparent && evidence.opacity <= 0.8) {
    return { category: 'glazing', reason: 'glass-context-plus-transparency', confidence: 0.92, evidence, label, unresolvedTransparentCandidate: false };
  }
  if (!excluded && evidence.transparent && evidence.opacity <= 0.45 && !evidence.hasAlphaMap) {
    return { category: 'glazing', reason: 'strong-transparent-low-opacity', confidence: 0.78, evidence, label, unresolvedTransparentCandidate: false };
  }
  if (NAME_RULES.rubber.test(label)) return { category: 'rubber', reason: 'rubber-name', confidence: 1, evidence, label, unresolvedTransparentCandidate: false };
  if (NAME_RULES.hardware.test(label)) return { category: 'mechanical-hardware', reason: 'hardware-name', confidence: 1, evidence, label, unresolvedTransparentCandidate: false };
  if (NAME_RULES.interior.test(label)) return { category: 'interior', reason: 'interior-name', confidence: 1, evidence, label, unresolvedTransparentCandidate: transparentSignal };
  if (NAME_RULES.paint.test(label)) return { category: 'painted-surface', reason: 'paint-name', confidence: 1, evidence, label, unresolvedTransparentCandidate: false };
  return {
    category: 'exterior-metal',
    reason: transparentSignal ? 'unresolved-transparent-fallback' : 'default-exterior-metal',
    confidence: transparentSignal ? 0.25 : 0.7,
    evidence,
    label,
    unresolvedTransparentCandidate: transparentSignal
  };
}

function classifyMaterial(mesh, material) {
  return classifyMaterialDecision(mesh, material).category;
}

/* SurfaceCalibrator must retain each decision and export reason, confidence,
 * source evidence and unresolved transparent candidates to browser QA.
 * Required screenshot: 05_material_glass.png.
 */
