/* ============================================================
 * weather.js — آب‌وهوا: آفتابی، ابری، بارانی، مه‌آلود، طوفانی
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const WEATHERS = ['sunny', 'cloudy', 'rain', 'fog', 'storm'];
  const NAMES = { sunny: 'آفتابی', cloudy: 'ابری', rain: 'بارانی', fog: 'مه‌آلود', storm: 'طوفانی' };
  const ICONS = { sunny: '☀️', cloudy: '⛅', rain: '🌧️', fog: '🌫️', storm: '⛈️' };

  const We = {
    state: 'sunny',
    timer: 300, // ثانیه تا تغییر آب‌وهوا
    rainPS: null,
    lightningTimer: 0,
  };

  We.init = function () {
    const scene = TC.G.scene;
    // ذرات باران
    const ps = new BABYLON.ParticleSystem('rain', 2600, scene);
    const tex = new BABYLON.DynamicTexture('rainDrop', { width: 8, height: 32 }, scene, false);
    const ctx = tex.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, 'rgba(180,210,255,0)');
    g.addColorStop(0.5, 'rgba(180,210,255,0.75)');
    g.addColorStop(1, 'rgba(180,210,255,0.15)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 32);
    tex.update(false); tex.hasAlpha = true;
    ps.particleTexture = tex;
    ps.emitter = new BABYLON.Vector3(0, 20, 0);
    ps.minEmitBox = new BABYLON.Vector3(-30, 14, -30);
    ps.maxEmitBox = new BABYLON.Vector3(30, 18, 30);
    ps.color1 = new BABYLON.Color4(0.7, 0.8, 1, 0.6);
    ps.color2 = new BABYLON.Color4(0.6, 0.7, 0.9, 0.5);
    ps.colorDead = new BABYLON.Color4(0.6, 0.7, 0.9, 0.1);
    ps.minSize = 0.06; ps.maxSize = 0.12;
    ps.minLifeTime = 0.55; ps.maxLifeTime = 0.8;
    ps.emitRate = 900;
    ps.direction1 = new BABYLON.Vector3(-1, -22, -1);
    ps.direction2 = new BABYLON.Vector3(1, -26, 1);
    ps.gravity = new BABYLON.Vector3(0, -6, 0);
    ps.minEmitPower = 1; ps.maxEmitPower = 2;
    ps.updateSpeed = 0.028;
    ps.start();
    ps.stop();
    We.rainPS = ps;
    We.apply('sunny', true);
  };

  We.apply = function (state, instant) {
    We.state = state;
    const scene = TC.G.scene;
    // باران
    if (state === 'rain' || state === 'storm') {
      if (We.rainPS && !We.rainPS.isStarted()) We.rainPS.start();
      if (We.rainPS) We.rainPS.emitRate = state === 'storm' ? 2200 : 1000;
    } else if (We.rainPS && We.rainPS.isStarted()) We.rainPS.stop();
    // مه
    const base = TC.CONFIG.drawDistance[TC.G.quality];
    if (state === 'fog') { scene.fogStart = 20; scene.fogEnd = Math.min(190, base * 0.3); }
    else if (state === 'rain') { scene.fogStart = 60; scene.fogEnd = base * 0.62; }
    else if (state === 'storm') { scene.fogStart = 40; scene.fogEnd = base * 0.5; }
    else { scene.fogStart = base * 0.45; scene.fogEnd = base; }
    // آسفالت خیس
    const asph = TC.World.mats.asphalt;
    if (asph) {
      asph.unfreeze && asph.unfreeze();
      if (state === 'rain' || state === 'storm') {
        asph.specularColor = new BABYLON.Color3(0.55, 0.55, 0.62);
        asph.specularPower = 64;
        asph.diffuseTexture && (asph.diffuseTexture.level = 0.82);
      } else {
        asph.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
        asph.specularPower = 32;
        asph.diffuseTexture && (asph.diffuseTexture.level = 1);
      }
      asph.freeze();
    }
    TC.bus.emit('weather:change', state);
  };

  We.sunFactor = function () {
    switch (We.state) {
      case 'sunny': return 1;
      case 'cloudy': return 0.72;
      case 'rain': return 0.5;
      case 'fog': return 0.6;
      case 'storm': return 0.36;
      default: return 1;
    }
  };

  We.update = function (dt) {
    if (TC.G.paused || TC.G.state === 'menu') return;
    // تغییر دوره‌ای آب‌وهوا
    We.timer -= dt;
    if (We.timer <= 0) {
      We.timer = 180 + Math.random() * 300;
      const r = Math.random();
      let next;
      if (r < 0.36) next = 'sunny';
      else if (r < 0.62) next = 'cloudy';
      else if (r < 0.78) next = 'rain';
      else if (r < 0.9) next = 'fog';
      else next = 'storm';
      if (next !== We.state) {
        We.apply(next);
        if (TC.ui && TC.ui.notify) TC.ui.notify('آب‌وهوا: ' + ICONS[next] + ' ' + NAMES[next]);
      }
    }
    // ذرات باران دنبال دوربین/بازیکن
    if (We.rainPS && We.rainPS.isStarted()) {
      const ref = TC.ActiveVehicle ? TC.ActiveVehicle.pos : (TC.Player ? TC.Player.pos : null);
      if (ref) {
        We.rainPS.emitter.x = ref.x;
        We.rainPS.emitter.z = ref.z;
      }
    }
    // رعد و برق
    if (We.state === 'storm') {
      We.lightningTimer -= dt;
      if (We.lightningTimer <= 0) {
        We.lightningTimer = 4 + Math.random() * 9;
        We.flash();
      }
    }
  };

  We.flash = function () {
    const scene = TC.G.scene;
    const hemi = TC.Engine.hemi;
    const old = hemi.intensity;
    hemi.intensity = 3.2;
    setTimeout(() => { hemi.intensity = old * 0.3; }, 70);
    setTimeout(() => { hemi.intensity = old; }, 140);
    setTimeout(() => { TC.Audio.thunder(); }, 300 + Math.random() * 800);
  };

  We.name = () => NAMES[We.state];
  We.icon = () => ICONS[We.state];

  TC.Weather = We;
})();
