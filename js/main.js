/* ============================================================
 * main.js — راه‌اندازی بازی، ورودی کیبورد، حلقه اصلی و اتصال سیستم‌ها
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  /* ---------- مدیریت کلید ---------- */
  const Input = {
    keys: {},
    binds: null,
  };

  Input.refreshBinds = function () {
    Input.binds = Object.assign({}, TC.DefaultKeys, TC.Settings.data.keybinds || {});
  };
  Input.is = function (action) {
    return !!Input.keys[Input.binds[action]];
  };
  Input.axis = function (neg, pos) {
    return (Input.is(pos) ? 1 : 0) - (Input.is(neg) ? 1 : 0);
  };

  const KEY_FALLBACK = {
    w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD', e: 'KeyE', f: 'KeyF', c: 'KeyC',
    m: 'KeyM', i: 'KeyI', p: 'KeyP', h: 'KeyH', r: 'KeyR', x: 'KeyX', q: 'KeyQ', z: 'KeyZ', l: 'KeyL',
    ' ': 'Space', shift: 'ShiftLeft', tab: 'Tab', escape: 'Escape', enter: 'Enter',
    arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight',
  };
  function normCode(e) {
    if (e.code) return e.code;
    return KEY_FALLBACK[(e.key || '').toLowerCase()] || '';
  }

  Input.init = function () {
    Input.refreshBinds();
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      const code = normCode(e);
      if (code) Input.keys[code] = true;
      e._tcCode = code;
      Input.onPress(e, code);
      if (['Space', 'Tab'].includes(code) || code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      const code = normCode(e);
      if (code) Input.keys[code] = false;
      Input.onRelease(e, code);
    });
    window.addEventListener('blur', () => { Input.keys = {}; });
  };

  Input.onPress = function (e, codeIn) {
    const code = codeIn !== undefined ? codeIn : normCode(e);
    const B = Input.binds;
    // کات‌سین: Esc رد کردن
    if (TC.Missions.cinemaActive && code === 'Escape') { TC.Missions.skipCinema(); return; }
    if (TC.G.state !== 'playing' && TC.G.state !== 'jail') {
      if (code === 'Escape') {
        // بستن پنجره‌های باز
        for (const id of ['shopUI', 'slotUI', 'settingsUI', 'controlsUI', 'phoneUI', 'charScreen', 'bigMap']) {
          const el = document.getElementById(id);
          if (el.style.display !== 'none' && el.style.display !== '') { el.style.display = 'none'; return; }
        }
        if (TC.G.started) TC.ui.pause(false);
      }
      return;
    }
    if (code === B.interact) {
      TC.Player.doInteract();
      TC.Virtual.interact = true;
      setTimeout(() => { TC.Virtual.interact = false; }, 400);
    }
    else if (code === B.enterExit) {
      if (TC.Player.inVehicle) TC.Vehicles.exit(TC.Player.inVehicle);
      else {
        const v = TC.Vehicles.nearestEnterable(TC.Player.pos, 5);
        if (v) TC.Vehicles.enter(v);
        else TC.ui.notify('خودرویی نزدیک نیست', 'warn');
      }
    }
    else if (code === B.camera) {
      if (TC.Player.inVehicle) TC.Camera.cycleVehicle();
      else TC.Camera.dist = TC.Camera.dist === 7.5 ? 4 : TC.Camera.dist === 4 ? 11 : 7.5;
    }
    else if (code === B.map) {
      const el = document.getElementById('bigMap');
      if (el.style.display === 'flex') TC.Map.closeBig();
      else TC.Map.openBig();
    }
    else if (code === B.char) {
      const el = document.getElementById('charScreen');
      if (el.style.display === 'flex') el.style.display = 'none';
      else TC.ui.openCharScreen();
    }
    else if (code === B.phone) {
      const el = document.getElementById('phoneUI');
      if (el.style.display === 'flex') TC.ui.closePhone();
      else TC.ui.openPhone();
    }
    else if (code === B.menu || code === B.pause) {
      const open = ['shopUI', 'slotUI', 'settingsUI', 'controlsUI', 'phoneUI', 'charScreen', 'bigMap'].some(id => {
        const el = document.getElementById(id);
        return el.style.display === 'flex' || el.style.display === 'block';
      });
      if (open) {
        for (const id of ['shopUI', 'slotUI', 'settingsUI', 'controlsUI', 'phoneUI', 'charScreen', 'bigMap']) {
          document.getElementById(id).style.display = 'none';
        }
      } else {
        TC.ui.pause(!TC.G.paused);
      }
    }
    else if (code === B.jump) { TC.Virtual.jump = true; }
    else if (code === B.attack) { TC.Inventory.toggleWeapon(); }
    else if (code === B.horn && TC.Player.inVehicle) { TC.Vehicles.horn(true); }
    else if (code === B.lights && TC.Player.inVehicle) {
      const v = TC.Player.inVehicle;
      v.lightsOn = !v.lightsOn;
      TC.ui.notify('چراغ‌ها: ' + (v.lightsOn ? 'روشن' : 'خاموش'));
    }
  };
  Input.onRelease = function (e, codeIn) {
    const B = Input.binds;
    const code = codeIn !== undefined ? codeIn : normCode(e);
    if (code === B.horn) TC.Vehicles.horn(false);
  };

  /* به‌روزرسانی ورودی هر فریم — ترجمه کلیدها به Virtual */
  Input.update = function () {
    const V = TC.Virtual;
    const veh = TC.Player.inVehicle;
    if (veh) {
      const t = veh.def.type;
      if (t === 'heli') {
        V.upDown = Input.axis('back', 'forward');
        V.gasY = (Input.is('run') ? 1 : 0) - (Input.is('jump') ? 1 : 0); // Shift بالا / Space پایین
        V.steerX = Input.axis('left', 'right');
      } else if (t === 'plane') {
        V.upDown = Input.axis('back', 'forward');
        V.gasY = Input.is('run') ? 1 : 0; // Shift گاز
        V.steerX = Input.axis('left', 'right');
      } else {
        V.gasY = Input.axis('back', 'forward');
        V.steerX = Input.axis('left', 'right');
        V.brake = Input.is('jump'); // Space ترمز دستی
      }
      V.moveX = 0; V.moveY = 0;
      V.run = false;
    } else {
      V.moveX = Input.axis('left', 'right');
      V.moveY = Input.axis('back', 'forward');
      V.run = Input.is('run');
      V.gasY = 0; V.steerX = 0; V.brake = false; V.upDown = 0;
    }
    V.fire = Input.is('fire');
  };

  TC.Input = Input;

  /* ---------- تنظیم سایه از تنظیمات ---------- */
  TC.applyShadowSetting = function () {
    const s = TC.Settings.data.shadows;
    const Eng = TC.Engine;
    if (s === 'off') {
      if (Eng.sg) { Eng.sg.dispose(); Eng.sg = null; }
      Eng.shadowEnabled = false;
    } else {
      Eng.setupShadows();
      if (Eng.shadowEnabled && TC.Player && TC.Player.mesh) {
        Eng.sg.addShadowCaster(TC.Player.mesh.torso);
        Eng.sg.addShadowCaster(TC.Player.mesh.head);
      }
    }
  };

  /* ---------- حلقه اصلی ---------- */
  function gameLoop(dt) {
    TC.G.playTimeSec += dt;
    if (TC.Props && TC.Props.updateBirds) TC.Props.updateBirds(dt);
    Input.update();
    if (TC.Mobile && TC.Mobile.applyJoy) TC.Mobile.applyJoy(); // ورودی لمسی بعد از کیبورد اعمال شود
    TC.Gamepad.update();
    TC.DayNight.tick(dt);
    TC.Weather.update(dt);
    TC.Props.updateTrafficLights(dt);
    TC.Player.update(dt);
    TC.Camera.update(dt);
    // خودروها (فعال‌ها)
    for (let i = TC.Vehicles.all.length - 1; i >= 0; i--) {
      const v = TC.Vehicles.all[i];
      if (v.parked) continue;
      if (TC.Player.inVehicle === v || v.ai) {
        TC.Vehicles.update(v, dt);
      }
    }
    TC.NPC.update(dt);
    TC.Police.update(dt);
    TC.Prison.update(dt);
    TC.Jobs.checkAttendance();
    TC.JobMissions.update(dt);
    TC.Missions.update(dt);
    TC.Audio.update(dt);
    TC.HUD.update(dt);
    TC.Save.update(dt);
    // انیمیشن دریا
    if (TC.World.seaMeshes) {
      const t = TC.G.playTimeSec * 0.02;
      for (const sea of TC.World.seaMeshes) {
        if (sea.material && sea.material.diffuseTexture) {
          sea.material.diffuseTexture.uOffset = t % 1;
          sea.material.diffuseTexture.vOffset = (t * 0.6) % 1;
        }
      }
    }
  }

  /* ---------- شروع بازی ---------- */
  const Start = {};

  Start.newGame = function () {
    TC.Audio.init();
    TC.ui.hideMainMenu();
    // ریست وضعیت
    TC.G.day = 1;
    TC.G.time = C.startHour * 3600;
    TC.G.playTimeSec = 0;
    TC.Economy.cash = 850;
    TC.Economy.bank = 2500;
    TC.Economy.transactions = [];
    TC.Inventory.data.items = { phone: 1, shirt_blue: 1, pants_dark: 1, shoes_black: 1 };
    TC.Inventory.data.ammo = { pistol: 0 };
    TC.Inventory.data.weapons = { bat: false, pistol: false };
    TC.Inventory.data.clothesEquipped = TC.Player.defaultClothes();
    TC.Inventory.init();
    TC.Vehicles.playerGarage = [];
    TC.Jobs.active = null;
    TC.Jobs.history = [];
    TC.Missions.storyIndex = -1;
    TC.Missions.choice = null;
    TC.Missions.stats = { missionsDone: 0, racesWon: 0, secretsFound: 0, helpedCitizens: 0 };
    TC.Police.clearWanted();
    // جای شروع: ایستگاه قطار شمالی
    TC.Player.pos.set(0, 0, -620);
    TC.Player.yaw = 0;
    TC.Player.health = 100;
    TC.Player.stamina = 100;
    TC.G.state = 'playing';
    TC.G.started = true;
    TC.HUD.init();
    if (TC.Mobile && TC.Mobile.active) TC.Mobile.tryLock && TC.Mobile.tryLock();
    TC.ui.notify('به شهر طوفان خوش آمدید، آرش!', 'success');
    // شروع داستان با کات‌سین
    setTimeout(() => TC.Missions.startStory(), 800);
  };

  Start.continueGame = function () {
    TC.Audio.init();
    TC.Save.loadSlot(0).then(d => {
      if (d) {
        Start.applyLoaded(d);
      } else {
        TC.ui.notify('ذخیره‌ای پیدا نشد — بازی جدید شروع می‌شود', 'warn');
        Start.newGame();
      }
    }).catch(() => {
      TC.ui.notify('خطا در بارگذاری', 'error');
    });
  };

  Start.applyLoaded = function (d) {
    TC.ui.hideMainMenu();
    TC.Save.apply(d);
    TC.G.state = 'playing';
    TC.G.started = true;
    TC.HUD.init();
    if (TC.Mobile && TC.Mobile.active) TC.Mobile.rebuildButtons();
    TC.ui.notify('بازی بارگذاری شد — روز ' + TC.faNum(TC.G.day), 'success');
    TC.bus.emit('game:loaded');
  };

  TC.Start = Start;

  /* ---------- بارگذاری اولیه ---------- */
  const boot = {
    steps: [
      ['راه‌اندازی موتور سه‌بعدی', () => { TC.Engine.init(); TC.Camera.init(); TC.Mobile.init(); }],
      ['تولید شهر طوفان…', () => { TC.World.build(); TC.Weather.init(); }],
      ['ساخت زندان مرکزی', () => { TC.Prison.build(); }],
      ['خانه، فروشگاه‌ها و نمایشگاه‌ها', () => {
        TC.Inventory.init();
        TC.NPC.init();
        TC.Housing.init();
        TC.Shops.init();
        TC.Dealerships.build();
      }],
      ['مأموریت‌ها و استخدام‌ها', () => {
        TC.Jobs.init();
        TC.Missions.initSide();
        TC.Map.init();
      }],
      ['خودروها و ترافیک شهر', () => {
        TC.Vehicles.buildStatic();
        TC.Gamepad.init();
      }],
      ['ساخت شخصیت آرش راد', () => {
        TC.Player.build({ x: 0, z: -620 });
      }],
      ['آماده‌سازی نهایی', () => {
        TC.Input.init();
        TC.Settings.load();
        TC.Input.refreshBinds();
        TC.Audio.applyVolumes();
        const q = TC.Settings.data.quality;
        TC.setQuality(q, true);
        TC.Engine.startLoop(gameLoop);
      }],
    ],
    i: 0,
  };

  function runBoot() {
    if (boot.i >= boot.steps.length) {
      // پایان
      document.getElementById('loadingBar').style.width = '100%';
      document.getElementById('loadingText').textContent = 'آماده!';
      setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
        TC.ui.showMainMenu();
        TC.G.started = true; // برای دوربین منو
      }, 400);
      return;
    }
    const [label, fn] = boot.steps[boot.i];
    document.getElementById('loadingText').textContent = label + '…';
    document.getElementById('loadingBar').style.width = Math.round(boot.i / boot.steps.length * 100) + '%';
    // نکته‌ها
    const tips = [
      'با کلید F سوار خودروها شوید و با E با فروشگاه‌ها و مردم صحبت کنید.',
      'مأموریت‌های شغلی پول خوبی می‌دهند — از دفاتر 🧰 استخدام شوید.',
      'پلیس با شش سطح تعقیب می‌آید! بعد از جرم، از دید خارج شوید.',
      'نقشه کامل با کلید M — برای تعیین مقصد روی نقشه کلیک کنید.',
      'در خانه می‌توانید بخوابید، لباس عوض کنید و بازی را ذخیره کنید.',
      'خودروهای نمایشگاه را با کشیدن انگشت/ماوس بچرخانید و بخرید.',
    ];
    document.getElementById('loadingTip').textContent = '💡 ' + tips[boot.i % tips.length];
    setTimeout(() => {
      try {
        fn();
      } catch (e) {
        console.error('boot step failed:', label, e);
        TC.fatalError('خطا در مرحله «' + label + '»: ' + (e && e.message ? e.message : e));
        return;
      }
      boot.i++;
      runBoot();
    }, 30);
  }

  /* ---------- خطای سراسری ---------- */
  window.addEventListener('error', (e) => {
    console.error('[Toofan]', e.message, e.filename, e.lineno);
  });

  /* شروع */
  window.addEventListener('DOMContentLoaded', () => {
    TC.Settings.load();
    document.documentElement.style.setProperty('--hud-scale', TC.Settings.data.hudScale);
    if (!window.BABYLON) {
      TC.fatalError('کتابخانه Babylon.js بارگذاری نشد. فایل assets/js/babylon.js را بررسی کنید.');
      return;
    }
    runBoot();
  });
})();
