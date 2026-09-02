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

  const readinessWatchdogMs = 7000;
  const readinessWatchdog = window.setInterval(() => {
    const bridge = window.__B24_WEATHER_BRIDGE__;
    if (!bridge?.frameLoaded) return;

    if (bridge.nativeReady) {
      window.clearInterval(readinessWatchdog);
      return;
    }

    const frame = document.querySelector('#weather-frame');
    if (!frame?.src) return;

    try {
      const sameOrigin = new URL(frame.src, location.href).origin === location.origin;
      if (!sameOrigin) {
        window.clearInterval(readinessWatchdog);
        return;
      }
    } catch {
      return;
    }

    bridge.connectSameOriginWeatherApi?.(0);
  }, readinessWatchdogMs);

  window[marker] = Object.freeze({
    active: true,
    purpose: 'Allow the locked B24 renderer to composite over the Weather Mother layer in one viewport.',
    readinessWatchdogMs,
    sourceDataMutation: false
  });
})();
