import * as THREE from 'three';

const SOURCE = Object.freeze({
  name: 'Weather Mother',
  version: '1.0.0-clean',
  baseline: '0.6.2-loop',
  sourceCommit: 'bf2aaa5d853af4f114c68d5bbafb99ea47134ef5',
  repositoryReadRef: '329670eea20d008189d0dce68d16899e667d8baf',
  entry: 'https://haihao0307.github.io/guilin-dem-pipeline/weather-mother/clean-v1/'
});

const PRESETS = Object.freeze({
  fair: Object.freeze({ label: '晴日积云', kind: 'Cu', density: 0.86, rain: 0, fog: 0.03, humidity: 68, instability: 0.45, snow: 0 }),
  coast: Object.freeze({ label: '海岸层积云', kind: 'Sc', density: 0.70, rain: 0.04, fog: 0.12, humidity: 83, instability: 0.22, snow: 0 }),
  mountain: Object.freeze({ label: '山间湿雾', kind: 'Cu', density: 0.80, rain: 0.07, fog: 0.44, humidity: 94, instability: 0.30, snow: 0 }),
  rain: Object.freeze({ label: '阴天降雨', kind: 'Ns', density: 1.12, rain: 0.70, fog: 0.20, humidity: 97, instability: 0.18, snow: 0 }),
  storm: Object.freeze({ label: '深对流雷暴', kind: 'Cb', density: 1.05, rain: 0.80, fog: 0.12, humidity: 94, instability: 0.98, snow: 0 }),
  rainbow: Object.freeze({ label: '雨过天晴和彩虹', kind: 'Cu', density: 0.65, rain: 0.42, fog: 0.05, humidity: 82, instability: 0.25, snow: 0, hour: 17.5, rainbow: true }),
  snow: Object.freeze({ label: '雪与低云', kind: 'St', density: 0.72, rain: 0, fog: 0.32, humidity: 91, instability: 0.10, snow: 1 }),
  high: Object.freeze({ label: '高空冰云', kind: 'Ci', density: 0.50, rain: 0, fog: 0.02, humidity: 50, instability: 0.12, snow: 0 })
});

const DEFAULTS = Object.freeze({
  weather: 'fair',
  hour: 16,
  wind: 12,
  direction: 270,
  turbulence: 0.25,
  enabled: true,
  atmosphereResponse: true,
  aircraftResponse: true,
  seed: 4217,
  loop: true
});

const PHASE_RESPONSE = Object.freeze({
  off: 0,
  crank: 0,
  idle: 0,
  taxi: 0.04,
  takeoff: 0.55,
  cruise: 1,
  approach: 0.72,
  landing: 0.24,
  shutdown: 0
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function solarDirection(hour) {
  const angle = ((hour - 12) / 12) * Math.PI;
  const latitude = Math.PI / 6;
  return new THREE.Vector3(
    -Math.sin(angle),
    Math.cos(latitude) * Math.cos(angle),
    Math.sin(latitude) * Math.cos(angle)
  ).normalize();
}

function windVector(speed, directionDegrees) {
  const radians = THREE.MathUtils.degToRad(directionDegrees);
  return new THREE.Vector3(
    -Math.sin(radians) * speed,
    0,
    Math.cos(radians) * speed
  );
}

function formatHour(hour) {
  const normalized = ((hour % 24) + 24) % 24;
  let h = Math.floor(normalized);
  let m = Math.round((normalized - h) * 60);
  if (m === 60) {
    h = (h + 1) % 24;
    m = 0;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function directionLabel(direction) {
  const labels = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  const index = Math.round((((direction % 360) + 360) % 360) / 45) % 8;
  return labels[index];
}

function estimateVisibilityKm(preset) {
  const attenuation = clamp(preset.fog * 0.88 + preset.rain * 0.46 + preset.snow * 0.32, 0, 0.96);
  return Math.max(1.2, Math.round((78 * Math.pow(1 - attenuation, 1.55)) * 10) / 10);
}

function mixColor(dayColor, nightColor, daylight) {
  return nightColor.clone().lerp(dayColor, clamp(daylight, 0, 1));
}

class B24WeatherBridge {
  constructor() {
    this.state = { ...DEFAULTS };
    this.runtime = null;
    this.weatherApi = null;
    this.frameLoaded = false;
    this.runtimeAttached = false;
    this.baseRendererExposure = null;
    this.baseLights = [];
    this.baseAircraft = null;
    this.aircraftResponseApplied = false;
    this.reloadTimer = 0;
    this.lastFrameUrl = '';
    this.animationHandle = 0;

    this.ui = {
      layer: document.querySelector('#weather-layer'),
      frame: document.querySelector('#weather-frame'),
      preset: document.querySelector('#weather-preset'),
      hour: document.querySelector('#weather-hour'),
      hourOutput: document.querySelector('#weather-hour-output'),
      wind: document.querySelector('#weather-wind'),
      windOutput: document.querySelector('#weather-wind-output'),
      direction: document.querySelector('#weather-direction'),
      directionOutput: document.querySelector('#weather-direction-output'),
      turbulence: document.querySelector('#weather-turbulence'),
      turbulenceOutput: document.querySelector('#weather-turbulence-output'),
      enabled: document.querySelector('#weather-enabled'),
      atmosphereResponse: document.querySelector('#weather-atmosphere-response'),
      aircraftResponse: document.querySelector('#weather-aircraft-response'),
      state: document.querySelector('#weather-state'),
      detail: document.querySelector('#weather-detail'),
      weatherReadout: document.querySelector('#weather-readout'),
      windReadout: document.querySelector('#wind-readout'),
      visibilityReadout: document.querySelector('#visibility-readout'),
      diagnosticList: document.querySelector('#diagnostic-list'),
      qaSummary: document.querySelector('#qa-summary'),
      reset: document.querySelector('#reset-runtime')
    };

    this.bindUi();
    this.syncUi();
    this.installFrame();
    this.attachRuntime();
    this.animate();
  }

  bindUi() {
    this.ui.preset?.addEventListener('change', () => {
      const next = this.ui.preset.value;
      if (!PRESETS[next]) return;
      this.state.weather = next;
      if (Number.isFinite(PRESETS[next].hour)) this.state.hour = PRESETS[next].hour;
      this.syncUi();
      this.applyEnvironment();
      this.scheduleFrameSync(true);
    });

    document.querySelectorAll('[data-weather-hour]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = Number(button.dataset.weatherHour);
        if (!Number.isFinite(next)) return;
        this.state.hour = clamp(next, 0, 24);
        this.syncUi();
        this.applyEnvironment();
        this.scheduleFrameSync(true);
      });
    });

    this.ui.hour?.addEventListener('input', () => {
      this.state.hour = clamp(Number(this.ui.hour.value), 0, 24);
      this.syncUi();
      this.applyEnvironment();
      this.syncWeatherApi();
    });
    this.ui.hour?.addEventListener('change', () => this.scheduleFrameSync(false));

    this.ui.wind?.addEventListener('input', () => {
      this.state.wind = clamp(Number(this.ui.wind.value), 0, 80);
      this.syncUi();
      this.applyEnvironment();
      this.syncWeatherApi();
    });

    this.ui.direction?.addEventListener('input', () => {
      this.state.direction = clamp(Number(this.ui.direction.value), 0, 360);
      this.syncUi();
      this.applyEnvironment();
      this.syncWeatherApi();
    });

    this.ui.turbulence?.addEventListener('input', () => {
      this.state.turbulence = clamp(Number(this.ui.turbulence.value), 0, 1);
      this.syncUi();
      this.applyEnvironment();
      this.syncWeatherApi();
    });

    this.ui.enabled?.addEventListener('change', () => {
      this.state.enabled = this.ui.enabled.checked;
      this.syncUi();
      this.applyEnvironment();
      this.scheduleFrameSync(false);
    });

    this.ui.atmosphereResponse?.addEventListener('change', () => {
      this.state.atmosphereResponse = this.ui.atmosphereResponse.checked;
      this.applyEnvironment();
    });

    this.ui.aircraftResponse?.addEventListener('change', () => {
      this.state.aircraftResponse = this.ui.aircraftResponse.checked;
      if (!this.state.aircraftResponse) this.restoreAircraft();
      this.applyEnvironment();
    });

    this.ui.reset?.addEventListener('click', () => {
      setTimeout(() => this.reset(), 0);
    });
  }

  installFrame() {
    if (!this.ui.frame) return;
    this.ui.frame.addEventListener('load', () => {
      this.frameLoaded = true;
      this.connectSameOriginWeatherApi();
      this.updateStatus();
      this.updateDiagnostic();
    });
    this.syncFrame(true);
  }

  connectSameOriginWeatherApi(attempt = 0) {
    if (!this.ui.frame) return;
    try {
      const frameWindow = this.ui.frame.contentWindow;
      const frameDocument = this.ui.frame.contentDocument;
      if (!frameWindow || !frameDocument) return;

      frameDocument.querySelector('.panel')?.remove();
      frameDocument.querySelector('.footer')?.remove();
      const loading = frameDocument.querySelector('#loading');
      if (loading) loading.style.display = 'none';
      frameDocument.documentElement.dataset.embeddedInB24 = 'true';
      this.ui.frame.classList.add('integrated-frame');

      const candidate = frameWindow.WeatherMother || null;
      if (candidate?.getConfiguration && candidate?.applyConfiguration && candidate.qa?.ready) {
        this.weatherApi = candidate;
        this.syncWeatherApi();
        this.ui.detail.textContent = 'Weather Mother 原生接口已连接，飞机与天气共用当前视口和右侧控制区。';
        return;
      }

      this.weatherApi = null;
      if (attempt < 60) {
        setTimeout(() => this.connectSameOriginWeatherApi(attempt + 1), 100);
      }
    } catch {
      this.weatherApi = null;
      this.ui.detail.textContent = '天气画面已在当前视口合成。跨源预览时使用锁定参数镜像驱动飞机响应。';
    }
  }

  buildFrameUrl() {
    const url = new URL(SOURCE.entry);
    url.searchParams.set('weather', this.state.weather);
    url.searchParams.set('hour', this.state.hour.toFixed(2));
    url.searchParams.set('seed', String(this.state.seed));
    url.searchParams.set('loop', this.state.loop ? '1' : '0');
    url.searchParams.set('embedded', 'b24-second-line');
    return url.href;
  }

  syncFrame(forceReload) {
    if (!this.ui.frame) return;
    this.ui.layer.dataset.enabled = String(this.state.enabled);
    if (!this.state.enabled) return;

    if (this.weatherApi) {
      this.syncWeatherApi();
      return;
    }

    const nextUrl = this.buildFrameUrl();
    if (forceReload || this.lastFrameUrl !== nextUrl) {
      this.lastFrameUrl = nextUrl;
      this.frameLoaded = false;
      this.ui.frame.src = nextUrl;
      this.updateStatus();
      this.updateDiagnostic();
    }
  }

  scheduleFrameSync(forceReload) {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.syncFrame(forceReload), 180);
  }

  syncWeatherApi() {
    if (!this.weatherApi?.getConfiguration || !this.weatherApi?.applyConfiguration) return false;
    const preset = PRESETS[this.state.weather];

    try {
      const current = this.weatherApi.getConfiguration();
      const configuration = {
        ...current,
        format: 'weather-mother-configuration',
        schemaVersion: 1,
        packageVersion: SOURCE.version,
        weather: this.state.weather,
        kind: preset.kind,
        seed: this.state.seed,
        controls: {
          ...current.controls,
          hour: this.state.hour,
          density: preset.density,
          rain: preset.rain,
          fog: preset.fog,
          humidity: preset.humidity,
          instability: preset.instability,
          wind: this.state.wind,
          cloudSpeed: this.state.wind,
          direction: this.state.direction,
          turbulence: this.state.turbulence
        },
        snow: preset.snow,
        switches: {
          ...current.switches,
          rainbow: Boolean(preset.rainbow),
          lightningEnabled: this.state.weather === 'storm',
          loopEnabled: this.state.loop
        }
      };
      this.weatherApi.applyConfiguration(configuration);
      return true;
    } catch (error) {
      console.warn('B24 Weather Mother API synchronization failed.', error);
      return false;
    }
  }

  attachRuntime() {
    const probe = () => {
      const runtime = window.__B24_V009_RUNTIME__;
      if (!runtime?.scene || !runtime?.renderer) {
        setTimeout(probe, 80);
        return;
      }

      this.runtime = runtime;
      this.runtimeAttached = true;
      this.baseRendererExposure ??= runtime.renderer.toneMappingExposure;
      this.captureLights();
      this.prepareTransparentRenderer();
      this.applyEnvironment();
      this.updateStatus();
      this.updateDiagnostic();
    };
    probe();
  }

  captureLights() {
    if (!this.runtime || this.baseLights.length) return;
    this.runtime.scene.traverse((object) => {
      if (!object.isLight) return;
      this.baseLights.push({
        object,
        intensity: object.intensity,
        color: object.color?.clone?.() || null,
        groundColor: object.groundColor?.clone?.() || null,
        position: object.position.clone()
      });
    });
  }

  captureAircraft() {
    const aircraft = this.runtime?.aircraft;
    if (!aircraft || this.baseAircraft?.object === aircraft) return;
    this.baseAircraft = {
      object: aircraft,
      position: aircraft.position.clone(),
      quaternion: aircraft.quaternion.clone()
    };
  }

  prepareTransparentRenderer() {
    if (!this.runtime) return;
    this.runtime.scene.background = null;
    this.runtime.renderer.setClearColor(0x000000, 0);
    this.runtime.renderer.setClearAlpha(0);
    this.runtime.renderer.domElement.dataset.weatherComposite = 'true';
  }

  restoreLights() {
    for (const entry of this.baseLights) {
      entry.object.intensity = entry.intensity;
      if (entry.color && entry.object.color) entry.object.color.copy(entry.color);
      if (entry.groundColor && entry.object.groundColor) entry.object.groundColor.copy(entry.groundColor);
      entry.object.position.copy(entry.position);
    }
    if (this.runtime && this.baseRendererExposure !== null) {
      this.runtime.renderer.toneMappingExposure = this.baseRendererExposure;
    }
  }

  applyEnvironment() {
    const preset = PRESETS[this.state.weather];
    this.ui.layer.dataset.enabled = String(this.state.enabled);

    if (!this.runtime) {
      this.updateReadouts();
      return;
    }

    if (!this.state.enabled) {
      this.runtime.scene.fog = null;
      this.runtime.scene.background = new THREE.Color(0x10161a);
      this.runtime.renderer.setClearColor(0x10161a, 1);
      this.runtime.renderer.setClearAlpha(1);
      this.restoreLights();
      this.restoreAircraft();
      this.updateReadouts();
      this.updateStatus();
      return;
    }

    this.prepareTransparentRenderer();

    if (!this.state.atmosphereResponse) {
      this.runtime.scene.fog = null;
      this.restoreLights();
      this.updateReadouts();
      this.updateStatus();
      return;
    }

    const sun = solarDirection(this.state.hour);
    const daylight = clamp((sun.y - 0.02) / 0.82, 0.03, 1);
    const precipitation = clamp(preset.rain + preset.snow * 0.65, 0, 1);
    const overcast = clamp(preset.density * 0.34 + precipitation * 0.45, 0, 0.82);

    const daySky = new THREE.Color(0xcbe0ee);
    const nightSky = new THREE.Color(0x3c4861);
    const fogColor = mixColor(daySky, nightSky, daylight).multiplyScalar(1 - precipitation * 0.22);

    const aircraftRadius = (() => {
      if (!this.runtime.aircraft) return 10;
      const sphere = new THREE.Box3().setFromObject(this.runtime.aircraft).getBoundingSphere(new THREE.Sphere());
      return Math.max(1, sphere.radius);
    })();
    const scaleCompensation = clamp(10 / aircraftRadius, 0.35, 2.5);
    const fogDensity = clamp(
      (0.0008 + preset.fog * 0.028 + precipitation * 0.012) * scaleCompensation,
      0.0004,
      0.075
    );
    this.runtime.scene.fog = new THREE.FogExp2(fogColor, fogDensity);

    const hemisphere = this.baseLights.find((entry) => entry.object.isHemisphereLight);
    const directional = this.baseLights.filter((entry) => entry.object.isDirectionalLight);
    const key = directional.find((entry) => entry.object.castShadow) || directional[0];
    const fill = directional.find((entry) => entry !== key);

    if (hemisphere) {
      hemisphere.object.intensity = 0.35 + daylight * 1.18 * (1 - overcast * 0.42);
      hemisphere.object.color.copy(mixColor(new THREE.Color(0xdcecf4), new THREE.Color(0x60708e), daylight));
      hemisphere.object.groundColor.copy(mixColor(new THREE.Color(0x4b5152), new THREE.Color(0x171c27), daylight));
    }

    if (key) {
      key.object.intensity = (0.22 + daylight * 3.15) * (1 - overcast * 0.72);
      const lightingSun = sun.clone();
      if (lightingSun.y < 0.08) lightingSun.y = 0.08;
      key.object.position.copy(lightingSun.normalize()).multiplyScalar(24);
      const warm = new THREE.Color(0xffc58f);
      const neutral = new THREE.Color(0xfff5e8);
      key.object.color.copy(warm.lerp(neutral, clamp(sun.y * 1.4, 0, 1)));
    }

    if (fill) {
      fill.object.intensity = 0.34 + daylight * 0.88 * (1 - overcast * 0.25);
      fill.object.color.copy(mixColor(new THREE.Color(0xa8c8dc), new THREE.Color(0x52637f), daylight));
    }

    this.runtime.renderer.toneMappingExposure = clamp(
      0.52 + daylight * 0.48 - overcast * 0.16,
      0.42,
      1.02
    );

    this.runtime.weatherEnvironment = this.getEnvironment();
    this.updateReadouts();
    this.updateStatus();
    window.dispatchEvent(new CustomEvent('b24-weather-environment', {
      detail: this.getEnvironment()
    }));
  }

  restoreAircraft() {
    if (!this.baseAircraft) return;
    this.baseAircraft.object.position.copy(this.baseAircraft.position);
    this.baseAircraft.object.quaternion.copy(this.baseAircraft.quaternion);
    this.aircraftResponseApplied = false;
  }

  applyAircraftResponse(timeSeconds) {
    this.captureAircraft();
    if (!this.baseAircraft) return;

    const factor = PHASE_RESPONSE[this.runtime?.phase] ?? 0;
    if (!this.state.enabled || !this.state.aircraftResponse || factor <= 0) {
      if (this.aircraftResponseApplied) this.restoreAircraft();
      return;
    }

    const normalizedWind = clamp(this.state.wind / 45, 0, 1.8);
    const amplitude = this.state.turbulence * normalizedWind * factor;
    const gust = 0.62 + 0.38 * Math.sin(timeSeconds * 0.37 + 1.9);
    const roll = Math.sin(timeSeconds * 1.03) * amplitude * 0.022 * gust;
    const pitch = Math.sin(timeSeconds * 0.71 + 0.8) * amplitude * 0.011;
    const yaw = Math.sin(timeSeconds * 0.43 + 2.2) * amplitude * 0.005;
    const lift = Math.sin(timeSeconds * 0.84 + 1.4) * amplitude * 0.035;

    const perturbation = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'XYZ'));
    this.baseAircraft.object.quaternion.copy(this.baseAircraft.quaternion).multiply(perturbation);

    const lateral = windVector(1, this.state.direction);
    this.baseAircraft.object.position
      .copy(this.baseAircraft.position)
      .addScaledVector(lateral, amplitude * 0.018 * Math.sin(timeSeconds * 0.58))
      .addScaledVector(new THREE.Vector3(0, 1, 0), lift);

    this.aircraftResponseApplied = true;
  }

  animate() {
    const frame = (timeMs) => {
      this.animationHandle = requestAnimationFrame(frame);
      if (this.runtimeAttached) {
        this.applyAircraftResponse(timeMs / 1000);
      }
    };
    this.animationHandle = requestAnimationFrame(frame);
  }

  syncUi() {
    const preset = PRESETS[this.state.weather];
    if (this.ui.preset) this.ui.preset.value = this.state.weather;
    if (this.ui.hour) this.ui.hour.value = String(this.state.hour);
    if (this.ui.wind) this.ui.wind.value = String(this.state.wind);
    if (this.ui.direction) this.ui.direction.value = String(this.state.direction);
    if (this.ui.turbulence) this.ui.turbulence.value = String(this.state.turbulence);
    if (this.ui.enabled) this.ui.enabled.checked = this.state.enabled;
    if (this.ui.atmosphereResponse) this.ui.atmosphereResponse.checked = this.state.atmosphereResponse;
    if (this.ui.aircraftResponse) this.ui.aircraftResponse.checked = this.state.aircraftResponse;

    this.ui.hourOutput.textContent = formatHour(this.state.hour);
    this.ui.windOutput.textContent = `${Math.round(this.state.wind)} m/s`;
    this.ui.directionOutput.textContent = `${Math.round(this.state.direction)}° ${directionLabel(this.state.direction)}`;
    this.ui.turbulenceOutput.textContent = this.state.turbulence.toFixed(2);

    document.querySelectorAll('[data-weather-hour]').forEach((button) => {
      button.classList.toggle('active', Math.abs(Number(button.dataset.weatherHour) - this.state.hour) < 0.03);
    });

    if (preset) this.updateReadouts();
  }

  updateReadouts() {
    const preset = PRESETS[this.state.weather];
    if (!preset) return;
    this.ui.weatherReadout.textContent = this.state.enabled ? preset.label : '天气层停用';
    this.ui.windReadout.textContent = `${Math.round(this.state.wind)} m/s · ${Math.round(this.state.direction)}°`;
    this.ui.visibilityReadout.textContent = this.state.enabled
      ? `${estimateVisibilityKm(preset).toFixed(1)} km`
      : '无天气衰减';
  }

  updateStatus() {
    if (!this.ui.state) return;
    if (!this.state.enabled) {
      this.ui.state.className = 'badge neutral';
      this.ui.state.textContent = '已停用';
      return;
    }

    if (this.frameLoaded && this.runtimeAttached) {
      this.ui.state.className = 'badge pass';
      this.ui.state.textContent = this.weatherApi ? '原生接口已接入' : '合成桥已接入';
      return;
    }

    this.ui.state.className = 'badge neutral';
    this.ui.state.textContent = '连接中';
  }

  updateDiagnostic() {
    const row = this.ui.diagnosticList?.querySelector('[data-check="weather"]');
    if (!row) return;
    const pass = this.frameLoaded && this.runtimeAttached;
    row.classList.remove('pass', 'fail');
    if (pass) row.classList.add('pass');
    row.querySelector('strong').textContent = pass ? 'PASS' : '等待';

    const rows = [...this.ui.diagnosticList.children];
    const passed = rows.filter((item) => item.classList.contains('pass')).length;
    const failed = rows.filter((item) => item.classList.contains('fail')).length;
    this.ui.qaSummary.className = `badge ${failed ? 'fail' : passed === rows.length ? 'pass' : 'neutral'}`;
    this.ui.qaSummary.textContent = failed
      ? `${failed} 项阻断`
      : passed === rows.length
        ? '运行自检通过'
        : `${passed} / ${rows.length}`;
  }

  reset() {
    this.state = { ...DEFAULTS };
    this.restoreAircraft();
    this.syncUi();
    this.applyEnvironment();
    this.scheduleFrameSync(true);
    this.syncWeatherApi();
  }

  getConfiguration() {
    return {
      schema: 'haihao.aircraft/b24-weather-mother-configuration@1.0.0',
      source: { ...SOURCE },
      ...this.state
    };
  }

  applyConfiguration(configuration = {}) {
    if (configuration.weather && PRESETS[configuration.weather]) this.state.weather = configuration.weather;
    if (Number.isFinite(Number(configuration.hour))) this.state.hour = clamp(Number(configuration.hour), 0, 24);
    if (Number.isFinite(Number(configuration.wind))) this.state.wind = clamp(Number(configuration.wind), 0, 80);
    if (Number.isFinite(Number(configuration.direction))) this.state.direction = clamp(Number(configuration.direction), 0, 360);
    if (Number.isFinite(Number(configuration.turbulence))) this.state.turbulence = clamp(Number(configuration.turbulence), 0, 1);
    if (typeof configuration.enabled === 'boolean') this.state.enabled = configuration.enabled;
    if (typeof configuration.atmosphereResponse === 'boolean') this.state.atmosphereResponse = configuration.atmosphereResponse;
    if (typeof configuration.aircraftResponse === 'boolean') this.state.aircraftResponse = configuration.aircraftResponse;
    if (Number.isFinite(Number(configuration.seed))) this.state.seed = Math.trunc(Number(configuration.seed));
    if (typeof configuration.loop === 'boolean') this.state.loop = configuration.loop;

    this.syncUi();
    this.applyEnvironment();
    this.scheduleFrameSync(true);
    this.syncWeatherApi();
    return this.getConfiguration();
  }

  getEnvironment() {
    const preset = PRESETS[this.state.weather];
    const wind = windVector(this.state.wind, this.state.direction);
    const sun = solarDirection(this.state.hour);
    return {
      schema: 'haihao.environment/weather-mother-b24-bridge@1.0.0',
      source: { ...SOURCE },
      units: {
        distance: 'm',
        speed: 'm/s',
        direction: 'degrees'
      },
      axes: {
        x: 'east',
        y: 'up',
        negativeZ: 'north',
        convention: '270 degree west wind blows toward positive X; 0 degree north wind blows toward positive Z'
      },
      enabled: this.state.enabled,
      preset: this.state.weather,
      label: preset.label,
      cloud: {
        kind: preset.kind,
        density: preset.density,
        instability: preset.instability
      },
      atmosphere: {
        fog: preset.fog,
        rain: preset.rain,
        snow: preset.snow,
        humidityPercent: preset.humidity,
        estimatedVisibilityKm: estimateVisibilityKm(preset)
      },
      wind: {
        speed: this.state.wind,
        directionFromDegrees: this.state.direction,
        vector: wind.toArray()
      },
      solar: {
        hour: this.state.hour,
        direction: sun.toArray()
      },
      coupling: {
        atmosphereResponse: this.state.atmosphereResponse,
        aircraftResponse: this.state.aircraftResponse,
        sourceDataMutation: false,
        geometryImpact: 'none',
        animationChannelImpact: 'none'
      },
      approval: {
        weatherMotherVisualApproved: false,
        b24IntegrationVisualApproved: false,
        productionReady: false
      }
    };
  }
}

const bridge = new B24WeatherBridge();
window.__B24_WEATHER_BRIDGE__ = bridge;
