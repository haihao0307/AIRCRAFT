(() => {
  const marker = '__B24_ALPHA_BOOTSTRAP__';
  if (window[marker]?.active) return;

  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, attributes) {
    const isWebGl = type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl';
    if (!isWebGl) return originalGetContext.call(this, type, attributes);

    const requested = attributes && typeof attributes === 'object' ? attributes : {};
    return originalGetContext.call(this, type, {
      ...requested,
      alpha: true,
      premultipliedAlpha: true
    });
  };

  window[marker] = Object.freeze({
    active: true,
    purpose: 'Allow the locked B24 renderer to composite over the Weather Mother layer in one viewport.',
    sourceDataMutation: false
  });
})();
