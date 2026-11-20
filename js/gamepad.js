/* ============================================================
 * gamepad.js — پشتیبانی از دسته بازی (کیبورد جایگزین موبایل هم هست)
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const GP = {
    connected: false,
    index: null,
    prev: {},
  };

  GP.init = function () {
    window.addEventListener('gamepadconnected', (e) => {
      GP.connected = true;
      GP.index = e.gamepad.index;
      TC.ui && TC.ui.notify('🎮 دسته بازی متصل شد', 'success');
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (GP.index === e.gamepad.index) {
        GP.connected = false;
        GP.index = null;
        TC.ui && TC.ui.notify('دسته بازی قطع شد', 'warn');
      }
    });
  };

  const dz = (v) => Math.abs(v) < 0.16 ? 0 : v;

  GP.update = function () {
    if (!GP.connected || TC.G.state === 'menu') return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads[GP.index];
    if (!gp) return;
    const V = TC.Virtual;
    const p = TC.Player;
    const veh = p.inVehicle;
    const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0);
    const rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
    const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
    const just = (i) => btn(i) && !GP.prev[i];
    // حرکت / فرمان
    if (veh) {
      V.steerX = lx;
      V.gasY = (gp.buttons[7] && gp.buttons[7].value > 0.1 ? gp.buttons[7].value : 0) - (gp.buttons[6] && gp.buttons[6].value > 0.1 ? gp.buttons[6].value : 0); // RT گاز، LT ترمز
      V.brake = btn(1); // B ترمز
      if (veh.def.type === 'heli' || veh.def.type === 'plane') {
        V.upDown = -ly;
      }
    } else {
      V.moveX = lx;
      V.moveY = -ly;
      V.run = btn(10); // L3 یا RT
      if (btn(7) && gp.buttons[7].value > 0.4) V.run = true;
    }
    // دوربین
    const sens = 2.6 * TC.Settings.data.sensitivity;
    TC.Camera.yaw += rx * sens * TC.G.dt; // هم‌جهت با استیک
    TC.Camera.pitch = M.clamp(TC.Camera.pitch - ry * sens * TC.G.dt * (TC.Settings.data.invertY ? -1 : 1), -1.25, 0.9);
    // دکمه‌ها
    if (just(0)) { // A — تعامل
      p.doInteract();
      TC.Virtual.interact = true;
      setTimeout(() => { TC.Virtual.interact = false; }, 300);
    }
    if (just(2)) V.jump = true;          // X — پرش
    if (just(3)) MobToggleVehicle();     // Y — ورود/خروج
    if (just(4)) TC.Inventory.toggleWeapon(); // LB — سلاح
    if (just(5)) TC.Camera.cycleVehicle();    // RB — دوربین
    if (btn(2)) V.fire = true; else if (!btn(2)) V.fire = false;
    if (just(9)) TC.ui.pause(true);      // Start — منو
    if (just(8)) MobToggleMap();         // Back — نقشه
    if (just(12)) { TC.G.routeTarget && TC.G.routePath && TC.Map.setDestination(TC.G.routeTarget.x, TC.G.routeTarget.z, TC.G.routeTarget.name); }
    if (just(13)) TC.Map.openBig();      // Down — نقشه
    // بوق
    TC.Vehicles.horn(btn(0) && veh ? btn(0) : false);
    // لرزش هنگام آسیب
    if (TC.Player.health < 30 && gp.vibrationActuator && Math.random() < 0.02) {
      try { gp.vibrationActuator.playEffect('dual-rumble', { duration: 120, strongMagnitude: 0.6, weakMagnitude: 0.4 }); } catch (e) { /* ignore */ }
    }
    // ذخیره وضعیت
    GP.prev = {};
    for (let i = 0; i < gp.buttons.length; i++) GP.prev[i] = btn(i);

    function MobToggleVehicle() {
      if (TC.Player.inVehicle) TC.Vehicles.exit(TC.Player.inVehicle);
      else {
        const v = TC.Vehicles.nearestEnterable(TC.Player.pos, 5);
        if (v) TC.Vehicles.enter(v);
      }
    }
    function MobToggleMap() {
      const el = document.getElementById('bigMap');
      if (el.style.display === 'flex') TC.Map.closeBig();
      else TC.Map.openBig();
    }
  };

  TC.Gamepad = GP;
})();
