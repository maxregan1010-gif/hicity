/* ============================================================
 * camera.js — دوربین سوم‌شخص، خودرویی، داخلی و سینمایی
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Cam = {
    yaw: 0, pitch: -0.22, dist: 7.5,
    mode: 'third', // third | car | interior | hood | cinema
    shake: 0,
    lookX: 0, lookY: 0,
  };

  Cam.init = function () {
    Cam.attachMouse();
    Cam.attachTouch();
  };

  /* ---------- ماوس ---------- */
  Cam.attachMouse = function () {
    const canvas = TC.G.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      Cam._dragging = true;
    });
    window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') Cam._dragging = false; });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !Cam._dragging) return;
      const s = 0.0026 * TC.Settings.data.sensitivity;
      Cam.yaw += e.movementX * s; // حرکت موس و چرخش دوربین هم‌جهت
      Cam.pitch = M.clamp(Cam.pitch - e.movementY * s * (TC.Settings.data.invertY ? -1 : 1), -1.25, 0.9);
    });
    // چرخ اسکرول: فاصله دوربین
    window.addEventListener('wheel', (e) => {
      if (TC.G.state !== 'playing' || TC.G.paused) return;
      Cam.dist = M.clamp(Cam.dist + Math.sign(e.deltaY) * 0.7, 3, 16);
    }, { passive: true });
  };

  /* ---------- لمس (نیمه راست صفحه) — توسط mobileControls هم مدیریت می‌شود ---------- */
  Cam.attachTouch = function () {
    const canvas = TC.G.canvas;
    let touchId = null, lastX = 0, lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      if (TC.Mobile && TC.Mobile.handleCameraDown(e)) return; // اگر موبایل مدیریت کرد
      if (touchId !== null) return;
      touchId = e.pointerId;
      lastX = e.clientX; lastY = e.clientY;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || e.pointerId !== touchId) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const s = 0.005 * TC.Settings.data.touchSensitivity;
      Cam.yaw -= dx * s;
      Cam.pitch = M.clamp(Cam.pitch - dy * s * (TC.Settings.data.invertY ? -1 : 1), -1.25, 0.9);
    });
    const up = (e) => { if (e.pointerId === touchId) touchId = null; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  };

  /* ---------- به‌روزرسانی ---------- */
  Cam.update = function (dt) {
    const cam = TC.Engine.camera;
    if (!cam) return;
    if (TC.Missions && TC.Missions.cinema && TC.Missions.cinemaActive) {
      TC.Missions.updateCinema(dt);
      return;
    }
    const player = TC.Player;
    const veh = TC.ActiveVehicle;
    const s = TC.Settings.data.camDistance;
    if (veh && Cam.mode !== 'cinema') {
      Cam.updateVehicle(dt, cam, veh, s);
    } else if (player) {
      Cam.updateThird(dt, cam, player, s);
    }
    // لرزش برخورد
    if (Cam.shake > 0) {
      Cam.shake = Math.max(0, Cam.shake - dt * 3);
      cam.position.x += (Math.random() - 0.5) * Cam.shake * 0.8;
      cam.position.y += (Math.random() - 0.5) * Cam.shake * 0.6;
    }
  };

  Cam.updateThird = function (dt, cam, player, s) {
    const targetPos = player.pos.clone();
    targetPos.y += 1.65;
    const dist = Cam.dist * s;
    // موقعیت دوربین با چرخش
    const cy = Math.cos(Cam.pitch), sy = Math.sin(Cam.pitch);
    const off = new BABYLON.Vector3(
      Math.sin(Cam.yaw) * cy * dist,
      -sy * dist + 0.6,
      Math.cos(Cam.yaw) * cy * dist
    );
    let desired = targetPos.add(off);
    // دوربین داخل دیوار نرود
    const step = 12;
    for (let i = 1; i <= 4; i++) {
      const t = i / 4;
      const px = M.lerp(targetPos.x, desired.x, t);
      const pz = M.lerp(targetPos.z, desired.z, t);
      const py = M.lerp(targetPos.y, desired.y, t);
      if (TC.Physics.sweepCircle(targetPos.x, targetPos.z, px - targetPos.x, pz - targetPos.z, 0.5) && py < 2.4) {
        desired = targetPos.add(off.scale(0.45));
        break;
      }
    }
    if (desired.y < 0.5) desired.y = 0.5;
    // نرمی
    cam.position = BABYLON.Vector3.Lerp(cam.position, desired, 1 - Math.exp(-11 * dt));
    const look = targetPos.clone();
    look.y += 0.25;
    cam.setTarget(look);
    Cam.mode = 'third';
  };

  Cam.updateVehicle = function (dt, cam, veh, s) {
    // تغییر دوربین خودرو: بیرونی > کاپوت > داخلی
    const v = veh;
    const spd = Math.abs(v.speed);
    if (Cam.mode === 'interior') {
      // داخل کابین
      const seatOff = v.def.type === 'motorcycle' || v.def.type === 'bicycle' ? 1.1 : 0.45;
      const pos = new BABYLON.Vector3(
        v.pos.x + Math.sin(v.yaw) * 0.3,
        v.pos.y + seatOff + 0.75,
        v.pos.z + Math.cos(v.yaw) * 0.3
      );
      cam.position = pos;
      const fw = v.yaw + (v.def.type === 'motorcycle' ? 0 : Cam.yaw * 0.35);
      cam.setTarget(new BABYLON.Vector3(pos.x + Math.sin(fw) * 10, pos.y - 1.2, pos.z + Math.cos(fw) * 10));
      cam.fov = 0.98;
      return;
    }
    if (Cam.mode === 'hood') {
      const pos = new BABYLON.Vector3(v.pos.x + Math.sin(v.yaw) * 0.6, v.pos.y + 1.5, v.pos.z + Math.cos(v.yaw) * 0.6);
      cam.position = pos;
      cam.setTarget(new BABYLON.Vector3(pos.x + Math.sin(v.yaw) * 12, pos.y - 1.6, pos.z + Math.cos(v.yaw) * 12));
      cam.fov = 0.95;
      return;
    }
    // نمای دنبال‌کننده خودرو
    const dist = (7.2 + spd * 0.09) * s + (v.def.long ? 2.6 : 0);
    const height = 3.1 + spd * 0.02;
    // دوربین پشت خودرو اما با امکان چرخش آزاد
    const behind = new BABYLON.Vector3(
      v.pos.x - Math.sin(v.yaw + Cam.yaw * 0.4) * dist,
      v.pos.y + height,
      v.pos.z - Math.cos(v.yaw + Cam.yaw * 0.4) * dist
    );
    cam.position = BABYLON.Vector3.Lerp(cam.position, behind, 1 - Math.exp(-8 * dt));
    const look = new BABYLON.Vector3(v.pos.x + Math.sin(v.yaw) * 6, v.pos.y + 1.1, v.pos.z + Math.cos(v.yaw) * 6);
    cam.setTarget(look);
    cam.fov = M.lerp(cam.fov, 0.85 + spd * 0.004, 1 - Math.exp(-4 * dt));
    Cam.mode = Cam._vehMode || 'car';
  };

  /* چرخش بین نماهای خودرو */
  Cam.cycleVehicle = function () {
    const order = ['car', 'hood', 'interior'];
    const cur = Cam.mode === 'cinema' ? 'car' : (order.indexOf(Cam._vehMode || 'car') + 1) % 3;
    Cam._vehMode = order[cur];
    Cam.mode = Cam._vehMode;
    TC.Audio.jingle('click');
  };
  Cam.resetToThird = function () {
    Cam.mode = 'third';
    Cam._vehMode = null;
    TC.Engine.camera.fov = 0.95;
  };

  /* لرزش */
  Cam.addShake = function (amount) { Cam.shake = Math.min(1.2, Cam.shake + amount); };

  TC.Camera = Cam;
})();
