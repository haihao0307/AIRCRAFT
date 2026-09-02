# B24 第二次数据原生生产线与 Weather Mother 同工作台接入 V001

## 目标

本轮将 Weather Mother 直接装入 B24 第二次数据原生生产线现有工作台。飞机、天气、光照、雾、风场响应、发动机控制、诊断与复位共用一个桌面、一个三维视口和一个右侧控制区。

接入目标页面为 `preview/b24-data-native-v009/index.html`。生产入口 `preview/b24-data-native-v009/index-production.html`继续复用同一页面壳和同一控制体系。

## 冻结基线

1. 远端起始提交为 `9e89ee328ce3c0ff4f23a34e126389d36294732a`。
2. 工作分支为 `feature/b24-v014-procedural-field-metal-pilot`。
3. 锁定 B24 GLB 大小继续保持 `23,085,972` bytes。
4. 锁定 B24 GLB SHA256 继续保持 `541c3dcfb98ab590cdb1bc90d6ddcdfe80bce2a4b937f3bccefab0c7efe8be0d`。
5. V014 程序化金属试验区、原始贴图、飞机几何、动画通道、跑道飞行序列和历史涂装批准状态均保持冻结。

## Weather Mother 来源

接入来源为 `haihao0307/guilin-dem-pipeline` 中的 `weather-mother/clean-v1`。

来源版本为 `1.0.0-clean`，基线为 `0.6.2-loop`，源提交为 `bf2aaa5d853af4f114c68d5bbafb99ea47134ef5`，仓库读取参考为 `329670eea20d008189d0dce68d16899e667d8baf`。

天气案例覆盖晴日积云、海岸层积云、山间湿雾、阴天降雨、深对流雷暴、雨过天晴和彩虹、雪与低云、高空冰云。

## 同工作台结构

`#canvas-host` 内部包含 Weather Mother 环境层和锁定 B24 Three.js 飞机层。环境层处于背景，飞机层使用透明 WebGL 合成。Weather Mother 自带控制面板在同源部署状态下自动隐藏，所有可操作参数集中到 B24 现有右侧 `#control-panel`。

页面没有增加弹窗、新标签页或第二个顶层工作台。生产入口仍从同一个 `index.html` 建立运行时。

## 统一控制

右侧天气控制区提供天气案例、时刻、风速、来风方向、湍流、天气层开关、大气响应和飞机风场响应。

桥接运行时公开以下接口：

```js
const bridge = window.__B24_WEATHER_BRIDGE__;

bridge.getConfiguration();
bridge.applyConfiguration({
  weather: 'storm',
  hour: 17.5,
  wind: 22,
  direction: 270,
  turbulence: 0.55
});
bridge.getEnvironment();
bridge.reset();
```

每次环境变化会发送 `b24-weather-environment` 事件，供后续飞行、积水、结冰、尾流和任务系统继续接入。

## 坐标与单位

距离单位为米，速度单位为米每秒，方向单位为度。坐标约定为正 X 向东、正 Y 向上、负 Z 向北。270 度西风吹向正 X，0 度北风吹向正 Z。

## 飞机响应边界

天气层可在运行时驱动场景雾、光照、曝光、估算能见度和受飞行阶段限制的轻度机体扰动。停机、启动、怠速和关车阶段不会产生机体湍流摇摆。

所有响应只存在于浏览器运行时，不写入 AircraftDNA、AssemblyGraph、GeometryRecipe、SurfaceProgram、BehaviorGraph、原始动画或 V014 表面字段参数。

## 验证边界

静态验证检查同工作台结构、Weather Mother 源锁、接口、控制项、透明合成脚本、生产入口复用、无新窗口规则和审批冻结状态。

真实浏览器视觉验收仍保持待用户确认。Weather Mother 自身人工视觉批准、B24 天气融合视觉批准和 productionReady 均保持 `false`。
