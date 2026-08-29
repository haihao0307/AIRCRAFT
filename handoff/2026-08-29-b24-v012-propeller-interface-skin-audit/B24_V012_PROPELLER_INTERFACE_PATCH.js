/* B24 V012 propeller interface recovery patch
 *
 * Applies after the frozen V010 review runtime is ready. The source payload,
 * geometry, animation and livery identity remain unchanged. The patch only
 * corrects the runtime material classification for the 1128-triangle member
 * inside each anim_prop[0-3]_still assembly. V009/V010 classified that member
 * as a hidden still-disc even though it is the solid hub connector mechanism.
 */
(function installB24V012PropellerInterfacePatch() {
  'use strict';

  const BUILD = 'B24_V012_PROPELLER_INTERFACE_SKIN_AUDIT_2026-08-29';
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const pathOf = (item) => String(item?.node?.def?.semanticPath || '').toLowerCase();
  const nameOf = (item) => String(item?.node?.def?.name || '');
  const isHubConnector = (item) => (
    item?.family === 'propeller'
    && item?.mesh?.triangleCount === 1128
    && pathOf(item).includes('_still_')
  );
  const worldPosition = (node) => {
    const matrix = node?.world;
    return matrix && matrix.length >= 15
      ? [Number(matrix[12]), Number(matrix[13]), Number(matrix[14])]
      : [0, 0, 0];
  };

  function sourceHubMaterial(viewer, item, fallback) {
    const source = viewer.m?.materials?.[item?.mesh?.material ?? 0] || {};
    const sourceColor = Array.isArray(source.baseColor)
      ? source.baseColor.slice(0, 3)
      : [0.47, 0.49, 0.50];
    return {
      ...fallback,
      color: sourceColor,
      alpha: 1,
      metal: clamp(Number(source.metallic ?? 0.72), 0.45, 0.88),
      rough: clamp(Number(source.roughness ?? 0.42), 0.22, 0.72),
      damageZone: 0,
      damageZoneClass: 'protected',
      protectedFromRidged: true,
      v012Role: 'propeller-hub-connector',
    };
  }

  function addInspectionControls(viewer, connectors) {
    if (document.getElementById('b24-v012-propeller-inspection')) return;
    const panel = document.createElement('div');
    panel.id = 'b24-v012-propeller-inspection';
    panel.style.cssText = [
      'position:fixed',
      'right:14px',
      'bottom:14px',
      'z-index:40',
      'display:flex',
      'gap:6px',
      'flex-wrap:wrap',
      'max-width:330px',
      'padding:8px',
      'border-radius:10px',
      'background:rgba(9,18,24,.88)',
      'border:1px solid rgba(180,210,222,.42)',
      'box-shadow:0 8px 24px rgba(0,0,0,.25)',
      'font:11px/1.3 system-ui,sans-serif',
    ].join(';');

    const title = document.createElement('span');
    title.textContent = 'V012 螺旋桨连接件检查';
    title.style.cssText = 'width:100%;color:#dcecf2;font-weight:700;padding:2px 3px 5px';
    panel.appendChild(title);

    const makeButton = (label, handler) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.style.cssText = 'cursor:pointer;border:1px solid #6d8792;border-radius:7px;background:#17313d;color:#e8f2f6;padding:6px 8px';
      button.addEventListener('click', handler);
      panel.appendChild(button);
    };

    makeButton('整机', () => window.__B24_V012_CAPTURE__?.setView('full'));
    connectors.forEach((entry, index) => {
      makeButton(`Prop ${index}`, () => window.__B24_V012_CAPTURE__?.setView(`prop${index}`));
    });
    document.body.appendChild(panel);
  }

  function patch(viewer) {
    if (!viewer || viewer.__v012PropellerInterfacePatched) return false;
    if (!viewer.__v010RidgedPatched || !window.__B24_V010_CAPTURE__) return false;

    viewer.__v012PropellerInterfacePatched = true;
    const previousMaterialFor = viewer.materialFor.bind(viewer);
    viewer.materialFor = function materialForV012(item) {
      const material = previousMaterialFor(item);
      return isHubConnector(item) ? sourceHubMaterial(this, item, material) : material;
    };

    viewer.updateWorld?.();
    const connectorItems = viewer.items.filter(isHubConnector);
    const connectorRecords = connectorItems.map((item) => ({
      name: nameOf(item),
      semanticPath: String(item?.node?.def?.semanticPath || ''),
      nodeId: item?.node?.def?.id ?? null,
      meshIndex: item?.mesh?.sourceIndex ?? item?.node?.def?.mesh ?? null,
      triangleCount: item?.mesh?.triangleCount ?? 0,
      worldPosition: worldPosition(item?.node),
      material: viewer.materialFor(item),
    }));

    const viewRecords = [...connectorRecords].sort((left, right) => (
      left.semanticPath.localeCompare(right.semanticPath)
    ));

    const originalCapture = window.__B24_V010_CAPTURE__;
    window.__B24_V012_CAPTURE__ = {
      setView(name) {
        if (name === 'full') {
          originalCapture.stopMotion();
          originalCapture.setView('full');
          return true;
        }
        const match = /^prop([0-3])$/.exec(String(name));
        if (!match) return false;
        const record = viewRecords[Number(match[1])];
        if (!record) return false;
        originalCapture.stopMotion();
        viewer.camera.target = record.worldPosition.slice();
        viewer.camera.yaw = 0;
        viewer.camera.pitch = 0.03;
        viewer.camera.distance = viewer.radius * 0.23;
        return true;
      },
      setPreset(name) {
        return originalCapture.setPreset(name);
      },
      stopMotion() {
        return originalCapture.stopMotion();
      },
      connectors() {
        return JSON.parse(JSON.stringify(viewRecords));
      },
      state() {
        return JSON.parse(JSON.stringify(window.__B24_V012_QA_STATE__));
      },
    };

    window.__B24_V012_QA_STATE__ = {
      schema: 'haihao.aircraft/b24-v012-propeller-interface-state@1.0.0',
      build: BUILD,
      ready: true,
      sourcePayloadChanged: false,
      geometryChanged: false,
      animationChanged: false,
      liveryIdentityChanged: false,
      runwayFlightSequenceChanged: false,
      aircraftPrimary: true,
      noiseToolLocalOverlay: true,
      correction: {
        previousRuntimeRole: 'still-disc',
        correctedRuntimeRole: 'propeller-hub-connector',
        sourceTriangleCount: 1128,
        connectorCount: connectorRecords.length,
        sourceMembersReused: true,
        newGeometryCreated: false,
      },
      connectors: viewRecords,
      approvals: {
        visualApproved: false,
        engineeringApproved: false,
        productionFrozen: false,
        wholeAircraftApproved: false,
        surfaceSystemApproved: false,
      },
    };

    document.documentElement.dataset.b24V012 = 'propeller-interface-recovery';
    document.documentElement.dataset.b24V012Geometry = 'unchanged';
    document.documentElement.dataset.b24V012Animation = 'unchanged';
    addInspectionControls(viewer, viewRecords);
    return true;
  }

  const timer = window.setInterval(() => {
    const viewer = window.__B24_NATIVE_V010__;
    if (patch(viewer)) window.clearInterval(timer);
  }, 80);
})();
