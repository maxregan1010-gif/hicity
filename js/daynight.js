/* ============================================================
 * daynight.js — چرخه شبانه‌روز: خورشید، آسمان، چراغ‌ها، پنجره‌ها
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  const DN = { phase: 'morning' };

  /* پیشرفت زمان — ثانیه بازی به ثانیه واقعی */
  DN.tick = function (dt) {
    if (TC.G.paused || TC.G.state === 'menu') return;
    // یک روز = dayLengthMinutes دقیقه واقعی
    const scale = (24 * 3600) / (C.dayLengthMinutes * 60);
    TC.G.time += dt * scale;
    if (TC.G.time >= 86400) {
      TC.G.time -= 86400;
      TC.bus.emit('day:end', TC.G.day);
      TC.G.day++;
      TC.bus.emit('day:new', TC.G.day);
    }
    DN.updateSky();
  };

  DN.hour = function () { return TC.G.time / 3600; };
  DN.isNight = function () { const h = DN.hour(); return h < 5.8 || h > 19.4; };

  DN.updateSky = function () {
    const W = TC.World;
    if (!W || !W.sunDisc) return;
    const h = DN.hour(); // 0..24
    // زاویه خورشید: طلوع ۶، غروب ۱۹
    const dayT = M.clamp((h - 6) / 13, 0, 1); // 0..1 در طول روز
    const sunAng = Math.PI * dayT; // از شرق به غرب
    const sunX = Math.cos(sunAng) * 600;
    const sunY = Math.sin(sunAng) * 500;
    const sunZ = 120;
    W.sunDisc.position.set(sunX, Math.max(sunY, -60), sunZ);
    W.moonDisc.position.set(-Math.cos(sunAng) * 500, Math.max(Math.sin(sunAng + Math.PI) * 400, -40), -100);
    // نور خورشید
    const sun = TC.Engine.sun;
    const night = DN.isNight();
    let sunI = 0, sunColor, hemiI, skyTop, skyMid, skyHor;
    if (h < 5) { // شب عمیق
      sunI = 0.02; hemiI = 0.22;
      sunColor = [0.35, 0.42, 0.6]; skyTop = '#050a18'; skyMid = '#0c1530'; skyHor = '#1a2440';
    } else if (h < 6.5) { // طلوع
      const t = (h - 5) / 1.5;
      sunI = M.lerp(0.05, 1.4, t); hemiI = M.lerp(0.24, 0.5, t);
      sunColor = [M.lerp(0.5, 1, t), M.lerp(0.4, 0.85, t), M.lerp(0.45, 0.75, t)];
      skyTop = '#1a2a55'; skyMid = '#4a5a8a'; skyHor = '#e8925a';
    } else if (h < 9) { // صبح
      sunI = 2.0; hemiI = 0.55;
      sunColor = [1, 0.93, 0.8]; skyTop = '#3a6ea8'; skyMid = '#87b5e0'; skyHor = '#cfe0f0';
    } else if (h < 16) { // روز
      sunI = 2.3; hemiI = 0.6;
      sunColor = [1, 0.97, 0.9]; skyTop = '#2d6ab0'; skyMid = '#87b5e0'; skyHor = '#d5e6f5';
    } else if (h < 18) { // عصر
      sunI = 1.8; hemiI = 0.5;
      sunColor = [1, 0.88, 0.72]; skyTop = '#3a6ea8'; skyMid = '#8fb0d8'; skyHor = '#e8c89a';
    } else if (h < 19.5) { // غروب
      const t = (h - 18) / 1.5;
      sunI = M.lerp(1.6, 0.1, t); hemiI = M.lerp(0.5, 0.3, t);
      sunColor = [1, M.lerp(0.7, 0.4, t), M.lerp(0.5, 0.3, t)];
      skyTop = '#2a3a6a'; skyMid = '#7a6a9a'; skyHor = '#e87a4a';
    } else { // شب
      sunI = 0.02; hemiI = 0.24;
      sunColor = [0.35, 0.42, 0.6]; skyTop = '#050a18'; skyMid = '#0c1530'; skyHor = '#1a2440';
    }
    // جهت نور
    const sunDir = new BABYLON.Vector3(-sunX, -Math.max(sunY, 30), -sunZ + 80).normalize();
    sun.direction = sunDir;
    sun.intensity = sunI * (TC.Weather ? TC.Weather.sunFactor() : 1);
    sun.diffuse = new BABYLON.Color3(sunColor[0], sunColor[1], sunColor[2]);
    TC.Engine.hemi.intensity = hemiI * (TC.Weather ? TC.Weather.sunFactor() : 1) + 0.08;
    TC.Engine.hemi.groundColor = new BABYLON.Color3(0.24, 0.2, 0.17);
    // آسمان
    TC.World.paintSky(skyHor, skyMid, skyTop);
    // موقعیت سایه دنبال بازیکن
    if (TC.Player && TC.Player.mesh && TC.Engine.shadowEnabled) {
      const p = TC.Player.pos;
      const sunPos = p.clone().add(sunDir.scale(-140));
      sun.position = sunPos;
    } else {
      sun.position = new BABYLON.Vector3(60, 140, -60);
    }
    // فاز نام
    DN.phase = h < 5.8 ? 'night' : h < 9 ? 'morning' : h < 16 ? 'noon' : h < 19.4 ? 'evening' : 'night';
    // چراغ‌ها و پنجره‌ها در شب
    const lampOn = night || h < 6.8 || h > 18.2;
    if (lampOn !== DN._lampOn) {
      DN._lampOn = lampOn;
      const mats = TC.World.nightMats;
      if (lampOn) {
        for (const m of mats) {
          if (m === TC.World.mats.lampGlow) m.emissiveColor = new BABYLON.Color3(1, 0.9, 0.65);
          else m.emissiveColor = new BABYLON.Color3(0.6, 0.55, 0.42);
        }
        TC.Props && TC.Props.lensRed && (TC.Props.lensRed.emissiveColor = new BABYLON.Color3(1, 0.15, 0.1));
        TC.Props && TC.Props.lensGreen && (TC.Props.lensGreen.emissiveColor = new BABYLON.Color3(0.15, 1, 0.3));
        TC.Props && TC.Props.lensYellow && (TC.Props.lensYellow.emissiveColor = new BABYLON.Color3(1, 0.8, 0.1));
      } else {
        for (const m of mats) m.emissiveColor = BABYLON.Color3.Black();
        TC.Props && TC.Props.lensRed && (TC.Props.lensRed.emissiveColor = BABYLON.Color3.Black());
        TC.Props && TC.Props.lensGreen && (TC.Props.lensGreen.emissiveColor = BABYLON.Color3.Black());
        TC.Props && TC.Props.lensYellow && (TC.Props.lensYellow.emissiveColor = BABYLON.Color3.Black());
      }
    }
    // رنگ مه
    const fog = TC.G.scene.fogColor;
    fog.set(M.lerp(fog.r, 0.68, 0.1), M.lerp(fog.g, 0.72, 0.1), M.lerp(fog.b, 0.8, 0.1));
    const skyRGB = TC.hexToRGB1(skyMid);
    if (DN._fogTarget) {
      fog.r = M.damp(fog.r, skyRGB[0], 2, TC.G.dt || 0.016);
      fog.g = M.damp(fog.g, skyRGB[1], 2, TC.G.dt || 0.016);
      fog.b = M.damp(fog.b, skyRGB[2], 2, TC.G.dt || 0.016);
    } else { DN._fogTarget = true; fog.set(skyRGB[0], skyRGB[1], skyRGB[2]); }
  };

  TC.hexToRGB1 = function (hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  };

  TC.DayNight = DN;
})();
