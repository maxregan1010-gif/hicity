/* ============================================================
 * engine.js — موتور Babylon.js، کیفیت گرافیک، سایه، حلقه رندر
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, C = TC.CONFIG;

  const Engine = {
    scene: null, sun: null, hemi: null, sg: null, pipeline: null, shadowCasters: [],
  };

  Engine.init = function () {
    const canvas = document.getElementById('renderCanvas');
    TC.G.canvas = canvas;
    let engine;
    try {
      engine = new BABYLON.Engine(canvas, true, {
        stencil: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      }, false);
    } catch (e) {
      TC.fatalError('موتور سه‌بعدی اجرا نشد: ' + (e && e.message ? e.message : e));
      throw e;
    }
    if (!engine._webGLVersion || engine._webGLVersion < 2) {
      console.warn('WebGL2 در دسترس نیست؛ با WebGL1 ادامه می‌دهیم.');
    }
    TC.G.engine = engine;
    const scene = new BABYLON.Scene(engine);
    TC.G.scene = scene;
    Engine.scene = scene;
    scene.clearColor = new BABYLON.Color4(0.45, 0.62, 0.85, 1.0);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogColor = new BABYLON.Color3(0.62, 0.72, 0.86);
    scene.fogStart = 300; scene.fogEnd = C.drawDistance[TC.G.quality];
    scene.skipPointerMovePicking = true;
    scene.autoClear = true;
    scene.autoClearDepthAndStencil = true;
    scene.blockMaterialDirtyMechanism = true;

    // دوربین خنثی (موقعیت هر فریم دستی تنظیم می‌شود)
    const cam = new BABYLON.FreeCamera('mainCam', new BABYLON.Vector3(0, 30, -40), scene);
    cam.minZ = 0.3;
    cam.maxZ = 1600;
    cam.fov = 0.95;
    scene.activeCamera = cam;
    Engine.camera = cam;

    // نورها
    Engine.sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-0.4, -1, 0.35), scene);
    Engine.sun.position = new BABYLON.Vector3(60, 120, -60);
    Engine.sun.intensity = 2.2;
    Engine.sun.diffuse = new BABYLON.Color3(1, 0.96, 0.88);
    Engine.hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    Engine.hemi.intensity = 0.55;
    Engine.hemi.groundColor = new BABYLON.Color3(0.28, 0.24, 0.2);

    // سایه
    Engine.setupShadows();

    // افکت پس‌فرآیند
    Engine.setupPipeline();

    // رزولوشن
    TC.setQuality(TC.G.quality, true);

    // رویداد تغییر اندازه
    window.addEventListener('resize', () => engine.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => engine.resize(), 300));
  };

  Engine.setupShadows = function () {
    const scene = Engine.scene;
    if (Engine.sg) { Engine.sg.dispose(); Engine.sg = null; }
    Engine.sun.shadowMinZ = 1;
    Engine.sun.shadowMaxZ = 260;
    Engine.sun.autoUpdateExtends = false;
    Engine.sun.shadowFrustumSize = 130;
    const size = C.shadowMapSize[TC.G.quality];
    if (!size) { Engine.shadowEnabled = false; return; }
    const sg = new BABYLON.ShadowGenerator(size, Engine.sun);
    sg.usePercentageCloserFiltering = size >= 1024;
    sg.filteringQuality = BABYLON.ShadowGenerator.QUALITY_LOW;
    sg.bias = 0.0035;
    sg.normalBias = 0.01;
    sg.darkness = 0.35;
    Engine.sg = sg;
    Engine.shadowEnabled = true;
  };

  Engine.setupPipeline = function () {
    const scene = Engine.scene;
    if (Engine.pipeline) { Engine.pipeline.dispose(); Engine.pipeline = null; }
    const p = new BABYLON.DefaultRenderingPipeline('toofanPipe', false, scene, [Engine.camera]);
    p.fxaaEnabled = true;
    p.samples = 1;
    const q = TC.G.quality;
    p.bloomEnabled = (q === 'high' || q === 'ultra');
    p.bloomThreshold = 0.92;
    p.bloomWeight = 0.22;
    p.bloomKernel = 48;
    p.bloomScale = 0.5;
    p.imageProcessingEnabled = true;
    p.imageProcessing.contrast = 1.18;
    p.imageProcessing.exposure = 1.05;
    p.imageProcessing.toneMappingEnabled = true;
    p.imageProcessing.vignetteEnabled = (q !== 'low');
    p.imageProcessing.vignetteWeight = 1.6;
    p.imageProcessing.vignetteStretch = 0.4;
    Engine.pipeline = p;
  };

  Engine.addShadowCaster = function (mesh) {
    if (Engine.sg) Engine.sg.addShadowCaster(mesh, false);
    mesh.receiveShadows = false;
  };
  Engine.receiveShadow = function (mesh) { mesh.receiveShadows = true; };

  TC.addShadowCaster = Engine.addShadowCaster;
  TC.receiveShadow = Engine.receiveShadow;

  /* اعمال کیفیت گرافیک */
  TC.setQuality = function (q, silent) {
    TC.G.quality = q;
    TC.Settings.data.quality = q;
    TC.Settings.save();
    const C2 = TC.CONFIG;
    // رزولوشن رندر
    TC.G.engine.setHardwareScalingLevel(C2.hardwareScale[q]);
    // مه و فاصله دید
    const scene = TC.G.scene;
    scene.fogEnd = C2.drawDistance[q];
    scene.fogStart = C2.drawDistance[q] * 0.45;
    if (Engine.camera) Engine.camera.maxZ = Math.max(900, C2.drawDistance[q] * 1.5);
    // سایه
    Engine.setupShadows();
    if (Engine.shadowEnabled) {
      // بازیکن و خودرو فعال سایه دارند
      if (TC.Player && TC.Player.mesh && TC.Player.mesh.torso) Engine.addShadowCaster(TC.Player.mesh.torso);
    }
    Engine.setupPipeline();
    // تراکم موجودات زنده
    if (TC.NPC && TC.NPC.applyDensity) TC.NPC.applyDensity();
    if (!silent && TC.ui && TC.ui.notify) TC.ui.notify('کیفیت گرافیک: ' + TC.qualityName(q));
  };

  /* حلقه رندر */
  Engine.startLoop = function (updateFn) {
    const engine = TC.G.engine, scene = TC.G.scene;
    let last = performance.now();
    let fpsAcc = 0, fpsCount = 0, lastCap = 0;
    const capMs = () => TC.Settings.data.fpsCap > 0 ? 1000 / TC.Settings.data.fpsCap : 0;
    engine.runRenderLoop(() => {
      const now = performance.now();
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.25) dt = 0.25; // جلوگیری از جهش بعد از تعلیق تب
      // محدودیت FPS
      const cap = capMs();
      if (cap > 0 && now - lastCap < cap - 1.5) return;
      lastCap = now;
      TC.G.dt = Math.min(dt, 0.1);
      if (!TC.G.paused && TC.G.state !== 'menu') {
        try { updateFn(TC.G.dt); } catch (e) { console.error('update:', e); }
      } else if (TC.G.state === 'menu') {
        try { TC.menuCam && TC.menuCam(TC.G.dt); } catch (e) { /* ignore */ }
      }
      scene.render();
      fpsCount++; fpsAcc += dt;
      if (fpsAcc >= 0.5) {
        TC.G.fps = Math.round(fpsCount / fpsAcc);
        TC.perf.push(TC.G.fps);
        fpsAcc = 0; fpsCount = 0;
        const fpsEl = document.getElementById('hudFps');
        if (TC.Settings.data.fpsShow && fpsEl) { fpsEl.style.display = 'block'; fpsEl.textContent = TC.G.fps + ' FPS'; }
        else if (fpsEl) fpsEl.style.display = 'none';
      }
    });
  };

  /* دوربین منوی اصلی — چرخش آرام روی شهر */
  TC.menuCam = function (dt) {
    if (!Engine.camera || !TC.G.started) return;
    TC._menuAngle = (TC._menuAngle || 0) + dt * 0.05;
    const r = 260, cx = 0, cz = 0;
    Engine.camera.position.x = cx + Math.cos(TC._menuAngle) * r;
    Engine.camera.position.z = cz + Math.sin(TC._menuAngle) * r;
    Engine.camera.position.y = 120;
    Engine.camera.setTarget(BABYLON.Vector3.Zero());
  };

  TC.Engine = Engine;
})();
