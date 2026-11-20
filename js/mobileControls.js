/* ============================================================
 * mobileControls.js — کنترل لمسی کامل: جوی‌استیک مجازی هشت‌جهته،
 * دوربین لمسی، دکمه‌های متناسب (پیاده/رانندگی/هوایی)، Multi-Touch،
 * جابه‌جایی دکمه‌ها با کشیدن، تنظیم اندازه/حساسیت/شفافیت، Safe Area
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Mob = {
    active: false,
    joyPointer: null,
    camPointer: null,
    editMode: false,
    buttons: [],
    cameraPtrLast: null,
    // وضعیت نگه‌داشته‌شده ورودی لمسی — بعد از Input.update هر فریم دوباره اعمال می‌شود
    joyState: {
      joy: false, moveX: 0, moveY: 0, steerX: 0, gasY: 0, upDown: 0,
      btnRun: false, btnBrake: false, btnFire: false,
      btnGas: false, btnGasVal: 0, btnSteer: false, btnSteerVal: 0, btnUpDown: false, btnUpDownVal: 0,
    },
  };

  /* ---------- تشخیص دستگاه ---------- */
  TC.isMobile = function () {
    return TC.G.isMobile;
  };
  TC.keyName = function (code) {
    if (!code) return null;
    const map = {
      KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyC: 'C',
      KeyM: 'M', KeyI: 'I', KeyP: 'P', KeyH: 'H', KeyR: 'R', KeyX: 'X', KeyQ: 'Q', KeyZ: 'Z', KeyL: 'L',
      Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Shift', Tab: 'Tab', Escape: 'Esc',
      Enter: 'Enter', ControlLeft: 'Ctrl', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    };
    return map[code] || code.replace('Key', '').replace('Digit', '');
  };

  Mob.detect = function () {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const force = location.search.indexOf('mobile=1') >= 0; // حالت اجباری برای تست
    TC.G.isMobile = force || (isTouch && (isUA || Math.min(screen.width, screen.height) < 820));
    TC.G.isTablet = !force && isTouch && !isUA && Math.min(screen.width, screen.height) >= 820;
    if (TC.G.isMobile || TC.G.isTablet) {
      document.body.classList.add('is-mobile');
      if (TC.G.isTablet) document.body.classList.add('is-tablet');
    }
    return TC.G.isMobile || TC.G.isTablet;
  };

  /* ---------- فعال‌سازی ---------- */
  Mob.init = function () {
    if (!Mob.detect()) {
      document.getElementById('joystickZone').style.display = 'none';
      return;
    }
    Mob.active = true;
    document.getElementById('joystickZone').style.display = 'block';
    document.getElementById('touchButtons').style.display = 'block';
    Mob.setupJoystick();
    Mob.setupCamera();
    Mob.rebuildButtons();
    Mob.setupOrientation();
    Mob.applySettings();
    // جلوگیری از حرکت صفحه
    document.addEventListener('touchmove', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    // رویدادهای ورود/خروج خودرو: تغییر چیدمان
    TC.bus.on('player:enterVehicle', () => Mob.rebuildButtons());
    TC.bus.on('player:exitVehicle', () => Mob.rebuildButtons());
  };

  /* ---------- چیدمان و جهتنما ---------- */
  Mob.setupOrientation = function () {
    const overlay = document.getElementById('rotateOverlay');
    function check() {
      const portrait = window.innerHeight > window.innerWidth;
      overlay.style.display = (portrait && TC.G.state !== 'menu') ? 'flex' : 'none';
    }
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', () => setTimeout(check, 250));
    check();
    // قفل جهت اگر مجاز بود
    Mob.tryLock = () => {
      try {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => { });
        }
      } catch (e) { /* ignore */ }
    };
  };

  /* ---------- جوی‌استیک — مسیر اصلی: Touch Events (مقاوم در برابر لغو مرورگر) ---------- */
  Mob.setupJoystick = function () {
    const zone = document.getElementById('joystickZone');
    const base = document.getElementById('joyBase');
    const knob = document.getElementById('joyKnob');
    const R = 52;
    const hasTouch = typeof TouchEvent !== 'undefined';
    let cx = 0, cy = 0;

    const start = (x, y, id) => {
      if (Mob.joyPointer !== null) return;
      Mob.joyPointer = id;
      try { zone.setPointerCapture(id); } catch (err) { /* شناسه ساختگی/لمس ممکن است قابل capture نباشد — مهم نیست */ }
      const r = zone.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      Mob.joyMove(x, y);
      navigator.vibrate && navigator.vibrate(8);
    };
    const release = (id) => {
      if (id !== Mob.joyPointer) return;
      Mob.joyPointer = null;
      knob.style.left = '37px';
      knob.style.top = '37px';
      const V = TC.Virtual;
      const J = Mob.joyState;
      J.joy = false; J.moveX = 0; J.moveY = 0; J.steerX = 0; J.gasY = 0; J.upDown = 0;
      V.moveX = 0; V.moveY = 0;
      V.steerX = Mob._steerFromJoy ? 0 : V.steerX;
      V.gasY = Mob._gasFromJoy ? 0 : V.gasY;
      V.upDown = Mob._upFromJoy ? 0 : V.upDown;
      Mob._steerFromJoy = Mob._gasFromJoy = Mob._upFromJoy = false;
    };

    // لمس واقعی: touch events با preventDefault — مرورگر gesture اسکرول تولید نمی‌کند
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      start(t.clientX, t.clientY, 't' + t.identifier);
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (Mob.joyPointer === 't' + t.identifier) Mob.joyMove(t.clientX, t.clientY);
      }
    }, { passive: false });
    const touchEnd = (e) => { for (const t of e.changedTouches) release('t' + t.identifier); };
    zone.addEventListener('touchend', touchEnd);
    zone.addEventListener('touchcancel', touchEnd);

    // پشتیبان: pointer events (ماوس/قلم در دسکتاپ و مرورگرهای بدون TouchEvent)
    zone.addEventListener('pointerdown', (e) => {
      if (hasTouch && e.pointerType === 'touch') return; // توسط touchstart مدیریت می‌شود
      start(e.clientX, e.clientY, e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === Mob.joyPointer) Mob.joyMove(e.clientX, e.clientY);
    });
    zone.addEventListener('pointerup', (e) => release(e.pointerId));
    zone.addEventListener('pointercancel', (e) => release(e.pointerId));

    Mob.joyMove = function (x, y) {
      let dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.left = (37 + dx) + 'px';
      knob.style.top = (37 + dy) + 'px';
      const dead = 0.14;
      let nx = dx / R, ny = -dy / R;
      const mag = Math.hypot(nx, ny);
      if (mag < dead) { nx = 0; ny = 0; }
      const V = TC.Virtual;
      const J = Mob.joyState;
      const veh = TC.ActiveVehicle;
      J.joy = true;
      if (veh && (veh.def.type === 'car' || veh.def.type === 'truck' || veh.def.type === 'bus' || veh.def.type === 'boat')) {
        // رانندگی: افقی = فرمان، عمودی = گاز/ترمز
        J.steerX = nx; J.gasY = ny; J.moveX = 0; J.moveY = 0; J.upDown = 0;
        Mob._steerFromJoy = true; Mob._gasFromJoy = true;
      } else if (veh && (veh.def.type === 'motorcycle' || veh.def.type === 'bicycle')) {
        J.steerX = nx; J.gasY = ny; J.moveX = 0; J.moveY = 0; J.upDown = 0;
        Mob._steerFromJoy = true; Mob._gasFromJoy = true;
      } else if (veh && veh.def.type === 'heli') {
        // هلی: افقی = چرخش، عمودی = جلو/عقب، دکمه‌ها = بالا/پایین
        J.steerX = nx; J.upDown = ny; J.moveX = 0; J.moveY = 0; J.gasY = 0;
        Mob._steerFromJoy = true; Mob._upFromJoy = true;
      } else if (veh && veh.def.type === 'plane') {
        J.steerX = nx; J.upDown = ny; J.moveX = 0; J.moveY = 0; J.gasY = 0;
        Mob._steerFromJoy = true; Mob._upFromJoy = true;
      } else {
        J.moveX = nx; J.moveY = ny; J.steerX = 0; J.gasY = 0; J.upDown = 0;
      }
      // اعمال فوری برای همین فریم (applyJoy هر فریم دوباره اعمال می‌کند)
      V.moveX = J.moveX; V.moveY = J.moveY; V.steerX = J.steerX; V.gasY = J.gasY; V.upDown = J.upDown;
    };
  };

  /* اعمال وضعیت لمسی پس از Input.update — وگرنه کیبورد هر فریم آن را صفر می‌کند */
  Mob.applyJoy = function () {
    const J = Mob.joyState, V = TC.Virtual;
    if (!Mob.active) return;
    if (J.joy) {
      V.moveX = J.moveX; V.moveY = J.moveY;
      V.steerX = J.steerX; V.gasY = J.gasY; V.upDown = J.upDown;
    }
    if (J.btnRun) V.run = true;
    if (J.btnBrake) V.brake = true;
    if (J.btnFire) V.fire = true;
    if (J.btnGas) V.gasY = J.btnGasVal;
    if (J.btnSteer) V.steerX = J.btnSteerVal;
    if (J.btnUpDown) V.upDown = J.btnUpDownVal;
  };

  /* ---------- دوربین لمسی (نیمه راست) — Touch اول، pointer پشتیبان ---------- */
  Mob.setupCamera = function () {
    const canvas = TC.G.canvas;
    const hasTouch = typeof TouchEvent !== 'undefined';
    let lastX = 0, lastY = 0;
    const begin = (x, y, id) => {
      if (Mob.camPointer !== null) return;
      Mob.camPointer = id;
      try { canvas.setPointerCapture(id); } catch (err) { /* ignore */ }
      lastX = x; lastY = y;
    };
    const moved = (x, y) => {
      if (Mob.camPointer === null) return;
      const s = 0.005 * TC.Settings.data.touchSensitivity;
      const dx = x - lastX, dy = y - lastY;
      TC.Camera.yaw += dx * s; // کشیدن و چرخش دوربین هم‌جهت
      TC.Camera.pitch = M.clamp(TC.Camera.pitch - dy * s * (TC.Settings.data.invertY ? -1 : 1), -1.25, 0.9);
      lastX = x; lastY = y;
    };
    const end = (id) => {
      if (id === Mob.camPointer) { Mob.camPointer = null; Mob.cameraPtrLast = null; }
    };

    // لمس واقعی
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.34) continue; // ناحیه جوی‌استیک
        e.preventDefault();
        begin(t.clientX, t.clientY, 't' + t.identifier);
        break;
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (Mob.camPointer === null || String(Mob.camPointer).charAt(0) !== 't') return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (Mob.camPointer === 't' + t.identifier) { moved(t.clientX, t.clientY); break; }
      }
    }, { passive: false });
    const touchEnd = (e) => { for (const t of e.changedTouches) end('t' + t.identifier); };
    canvas.addEventListener('touchend', touchEnd);
    canvas.addEventListener('touchcancel', touchEnd);

    // پشتیبان pointer
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      if (hasTouch) return; // توسط touchstart مدیریت می‌شود
      if (e.clientX < window.innerWidth * 0.34) return;
      begin(e.clientX, e.clientY, e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId === Mob.camPointer) moved(e.clientX, e.clientY);
    });
    const up = (e) => end(e.pointerId);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  };
  // camera.js می‌پرسد آیا موبایل خودش مدیریت می‌کند
  Mob.handleCameraDown = function (e) {
    return Mob.active && e.pointerType === 'touch';
  };

  /* ---------- تعریف دکمه‌ها ---------- */
  Mob.buttonDefs = () => {
    const veh = TC.ActiveVehicle;
    const defs = [];
    if (!veh) {
      // پیاده
      defs.push(
        { id: 'run', icon: '🏃', label: 'دویدن', pos: { bottom: 34, left: 96 }, hold: (on) => { Mob.joyState.btnRun = on; TC.Virtual.run = on; } },
        { id: 'jump', icon: '⤒', label: 'پرش', pos: { bottom: 104, left: 30 }, press: () => { TC.Virtual.jump = true; } },
        { id: 'interact', icon: '💬', label: 'تعامل', pos: { bottom: 34, left: 176 }, accent: true, press: () => {
          TC.Player.doInteract();
          TC.Virtual.interact = true;
          setTimeout(() => { TC.Virtual.interact = false; }, 400);
        } },
        { id: 'enterExit', icon: '🚪', label: 'خودرو', pos: { bottom: 104, left: 108 }, press: () => Mob.toggleVehicle() },
        { id: 'attack', icon: '✊', label: 'سلاح', pos: { bottom: 174, left: 30 }, press: () => TC.Inventory.toggleWeapon() },
        { id: 'fire', icon: '💥', label: 'حمله', pos: { bottom: 174, left: 108 }, danger: true, hold: (on) => { Mob.joyState.btnFire = on; TC.Virtual.fire = on; } },
        { id: 'firstaid', icon: '💊', label: 'کمک', pos: { bottom: 174, left: 186 }, small: true, press: () => TC.Inventory.useFirstAid() },
        { id: 'phone', icon: '📱', label: 'تلفن', pos: { top: 76, right: 16 }, small: true, press: () => TC.ui.openPhone() },
        { id: 'map', icon: '🗺️', label: 'نقشه', pos: { top: 76, right: 84 }, small: true, press: () => Mob.toggleMap() },
        { id: 'cam', icon: '📷', label: 'دوربین', pos: { top: 76, right: 152 }, small: true, press: () => { TC.Camera.dist = M.clamp(TC.Camera.dist + 1.5, 3, 16); } },
        { id: 'menu', icon: '⚙️', label: 'منو', pos: { top: 76, right: 220 }, small: true, press: () => TC.ui.pause(true) },
      );
    } else {
      const t = veh.def.type;
      const isAir = t === 'heli' || t === 'plane';
      if (TC.Settings.data.controlLayout === 'buttons' && !isAir) {
        // چیدمان دکمه‌ای رانندگی
        defs.push(
          { id: 'gas', icon: '⛽', label: 'گاز', pos: { bottom: 34, right: 28 }, gas: true, hold: (on) => { Mob.joyState.btnGas = on; Mob.joyState.btnGasVal = on ? 1 : 0; TC.Virtual.gasY = on ? 1 : 0; } },
          { id: 'brake', icon: '🛑', label: 'ترمز', pos: { bottom: 104, right: 28 }, hold: (on) => { Mob.joyState.btnBrake = on; TC.Virtual.brake = on; } },
          { id: 'steerL', icon: '◀', label: 'فرمان', pos: { bottom: 34, left: 96 }, wide: true, hold: (on) => { Mob.joyState.btnSteer = on; Mob.joyState.btnSteerVal = on ? -1 : 0; TC.Virtual.steerX = on ? -1 : 0; } },
          { id: 'steerR', icon: '▶', label: 'فرمان', pos: { bottom: 34, left: 178 }, wide: true, hold: (on) => { Mob.joyState.btnSteer = on; Mob.joyState.btnSteerVal = on ? 1 : 0; TC.Virtual.steerX = on ? 1 : 0; } },
          { id: 'reverse', icon: '⏮', label: 'عقب', pos: { bottom: 104, left: 137 }, hold: (on) => { Mob.joyState.btnGas = on; Mob.joyState.btnGasVal = on ? -1 : 0; TC.Virtual.gasY = on ? -1 : 0; } },
        );
      }
      if (isAir) {
        defs.push(
          { id: 'up', icon: '▲', label: 'بالا', pos: { bottom: 34, right: 28 }, hold: (on) => { Mob.joyState.btnGas = on; Mob.joyState.btnGasVal = on ? 1 : 0; TC.Virtual.gasY = on ? 1 : 0; } },
          { id: 'down', icon: '▼', label: 'پایین', pos: { bottom: 104, right: 28 }, hold: (on) => { Mob.joyState.btnGas = on; Mob.joyState.btnGasVal = on ? -1 : 0; TC.Virtual.gasY = on ? -1 : 0; } },
          { id: 'fwd', icon: '⬆', label: 'جلو', pos: { bottom: 104, right: 96 }, hold: (on) => { Mob.joyState.btnUpDown = on; Mob.joyState.btnUpDownVal = on ? 1 : 0; TC.Virtual.upDown = on ? 1 : 0; } },
          { id: 'back', icon: '⬇', label: 'عقب', pos: { bottom: 34, right: 96 }, hold: (on) => { Mob.joyState.btnUpDown = on; Mob.joyState.btnUpDownVal = on ? -1 : 0; TC.Virtual.upDown = on ? -1 : 0; } },
        );
      }
      defs.push(
        { id: 'exit', icon: '🚪', label: 'خروج', pos: { bottom: 174, right: 28 }, accent: true, press: () => Mob.toggleVehicle() },
        { id: 'horn', icon: '📢', label: 'بوق', pos: { bottom: 174, right: 96 }, hold: (on) => TC.Vehicles.horn(on) },
        { id: 'cam', icon: '📷', label: 'دوربین', pos: { bottom: 174, right: 164 }, press: () => TC.Camera.cycleVehicle() },
        { id: 'brakeHand', icon: '🛑', label: 'ترمز', pos: { top: 76, right: 16 }, small: true, hold: (on) => { Mob.joyState.btnBrake = on; TC.Virtual.brake = on; } },
        { id: 'map', icon: '🗺️', label: 'نقشه', pos: { top: 76, right: 84 }, small: true, press: () => Mob.toggleMap() },
        { id: 'phone', icon: '📱', label: 'تلفن', pos: { top: 76, right: 152 }, small: true, press: () => TC.ui.openPhone() },
        { id: 'menu', icon: '⚙️', label: 'منو', pos: { top: 76, right: 220 }, small: true, press: () => TC.ui.pause(true) },
      );
    }
    return defs;
  };

  Mob.toggleVehicle = function () {
    if (TC.Player.inVehicle) {
      TC.Vehicles.exit(TC.Player.inVehicle);
    } else {
      const v = TC.Vehicles.nearestEnterable(TC.Player.pos, 5);
      if (v) TC.Vehicles.enter(v);
      else TC.ui && TC.ui.notify('خودرویی نزدیک نیست', 'warn');
    }
  };
  Mob.toggleMap = function () {
    const el = document.getElementById('bigMap');
    if (el.style.display === 'flex') TC.Map.closeBig();
    else TC.Map.openBig();
  };

  /* ---------- ساخت دکمه‌ها ---------- */
  Mob.rebuildButtons = function () {
    const wrap = document.getElementById('touchButtons');
    if (!Mob.active || !wrap) return;
    wrap.innerHTML = '';
    Mob.buttons = [];
    const saved = TC.Settings.data.mobileBtns || {};
    for (const def of Mob.buttonDefs()) {
      const b = document.createElement('div');
      b.className = 'tbtn' + (def.small ? ' small' : '') + (def.accent ? ' accent' : '') + (def.danger ? ' danger' : '') + (def.gas ? ' gas' : '') + (def.wide ? ' wide' : '');
      b.innerHTML = `<span class="tbtn-ico">${def.icon}</span><span>${def.label}</span>`;
      b.dataset.bid = def.id;
      // موقعیت: ذخیره‌شده یا پیش‌فرض
      const pos = saved[def.id] || def.pos;
      for (const k of ['top', 'bottom', 'left', 'right']) {
        if (pos[k] !== undefined) b.style[k] = pos[k] + 'px';
      }
      wrap.appendChild(b);
      const btn = { def, el: b, pressed: false };
      Mob.buttons.push(btn);
      const hasTouch = typeof TouchEvent !== 'undefined';
      const press = (e) => {
        b.setPointerCapture && (() => { try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } })();
        if (Mob.editMode) { Mob.dragTarget = { btn, dx: e.clientX - b.offsetLeft, dy: e.clientY - b.offsetTop }; return; }
        btn.pressed = true;
        b.classList.add('pressed');
        navigator.vibrate && navigator.vibrate(10);
        TC.Audio.jingle('click');
        if (def.press) def.press();
        if (def.hold) def.hold(true);
      };
      const release = () => {
        if (!btn.pressed) return;
        btn.pressed = false;
        b.classList.remove('pressed');
        if (def.hold) def.hold(false);
      };
      // رویدادها — لمس واقعی اول (preventDefault تا gesture مرورگر قطع نشود)
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        press({ pointerId: 't' + t.identifier, clientX: t.clientX, clientY: t.clientY });
      }, { passive: false });
      const touchRelease = (e) => { for (const t of e.changedTouches) release(); };
      b.addEventListener('touchend', touchRelease);
      b.addEventListener('touchcancel', touchRelease);
      // پشتیبان pointer
      b.addEventListener('pointerdown', (e) => {
        if (hasTouch && e.pointerType === 'touch') return; // توسط touchstart مدیریت می‌شود
        e.preventDefault();
        e.stopPropagation();
        press(e);
      });
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
    }
    Mob.applySettings();
  };

  /* ویرایش چیدمان: کشیدن دکمه‌ها */
  Mob.setEditMode = function (on) {
    Mob.editMode = on;
    document.getElementById('touchButtons').classList.toggle('edit', on);
    Mob.buttons.forEach(b => b.el.classList.toggle('tbtn-edit-mode', on));
    if (!on && Mob.dragTarget) Mob.dragTarget = null;
    TC.ui && TC.ui.notify(on ? 'حالت ویرایش: دکمه‌ها را با انگشت جابه‌جا کنید' : 'چیدمان ذخیره شد', 'info');
    if (!on) Mob.saveLayout();
  };

  Mob.saveLayout = function () {
    const saved = {};
    for (const b of Mob.buttons) {
      saved[b.def.id] = {
        top: b.el.style.top ? parseInt(b.el.style.top) : undefined,
        bottom: b.el.style.bottom ? parseInt(b.el.style.bottom) : undefined,
        left: b.el.style.left ? parseInt(b.el.style.left) : undefined,
        right: b.el.style.right ? parseInt(b.el.style.right) : undefined,
      };
    }
    TC.Settings.data.mobileBtns = saved;
    TC.Settings.save();
  };

  window.addEventListener('pointermove', (e) => {
    if (!Mob.editMode || !Mob.dragTarget) return;
    const { btn, dx, dy } = Mob.dragTarget;
    const el = btn.el;
    el.style.top = Math.max(4, e.clientY - dy) + 'px';
    el.style.left = Math.max(4, e.clientX - dx) + 'px';
    el.style.bottom = 'auto';
    el.style.right = 'auto';
  });
  window.addEventListener('pointerup', () => {
    if (Mob.editMode && Mob.dragTarget) {
      Mob.dragTarget = null;
      Mob.saveLayout();
    }
  });

  /* ---------- اعمال تنظیمات ظاهری ---------- */
  Mob.applySettings = function () {
    const S = TC.Settings.data;
    document.documentElement.style.setProperty('--joy-scale', S.joySize);
    document.documentElement.style.setProperty('--btn-scale', S.btnSize);
    const zone = document.getElementById('joystickZone');
    const base = document.getElementById('joyBase');
    if (zone && base) {
      zone.style.transform = `scale(${S.joySize})`;
      zone.style.transformOrigin = 'bottom left';
      zone.style.opacity = S.touchOpacity;
    }
    const wrap = document.getElementById('touchButtons');
    if (wrap) {
      wrap.style.opacity = S.touchOpacity;
      for (const b of Mob.buttons) {
        b.el.style.transform = `scale(${S.btnSize})`;
        b.el.style.transformOrigin = 'center';
      }
    }
  };

  TC.Mobile = Mob;
})();
