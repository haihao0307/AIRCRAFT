/* Browser-side inventory. Run against the locked source before material replacement. */

function materialMaps(material) {
  const slots = ['map','alphaMap','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','bumpMap','displacementMap','lightMap','envMap'];
  return Object.fromEntries(slots.map((slot) => [slot, Boolean(material?.[slot])]));
}

function ancestorPath(object, maxDepth = 8) {
  const parts = [];
  let cursor = object;
  for (let depth = 0; cursor && depth < maxDepth; depth += 1, cursor = cursor.parent) {
    parts.push(cursor.name || cursor.type || `unnamed-${depth}`);
  }
  return parts.join(' / ');
}

export function collectB24SourceMaterialInventory(scene) {
  const records = new Map();
  let assignments = 0;
  scene.traverse((mesh) => {
    if (!mesh?.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material, slot) => {
      assignments += 1;
      const key = material.uuid || `${material.name}:${slot}`;
      if (!records.has(key)) {
        records.set(key, {
          uuid: material.uuid || null,
          name: material.name || '',
          type: material.type || '',
          transparent: Boolean(material.transparent),
          opacity: Number(material.opacity ?? 1),
          transmission: Number(material.transmission ?? 0),
          alphaTest: Number(material.alphaTest ?? 0),
          depthWrite: material.depthWrite !== false,
          side: material.side ?? null,
          blending: material.blending ?? null,
          metalness: 'metalness' in material ? Number(material.metalness ?? 0) : null,
          roughness: 'roughness' in material ? Number(material.roughness ?? 1) : null,
          maps: materialMaps(material),
          assignmentCount: 0,
          meshNames: [],
          ancestorPaths: []
        });
      }
      const record = records.get(key);
      record.assignmentCount += 1;
      if (record.meshNames.length < 50 && !record.meshNames.includes(mesh.name || '')) record.meshNames.push(mesh.name || '');
      const path = ancestorPath(mesh);
      if (record.ancestorPaths.length < 50 && !record.ancestorPaths.includes(path)) record.ancestorPaths.push(path);
    });
  });
  const materials = [...records.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    schema: 'haihao.aircraft/b24-source-material-inventory@1.0.0',
    generatedAt: new Date().toISOString(),
    uniqueMaterialCount: materials.length,
    materialAssignments: assignments,
    materials
  };
}
