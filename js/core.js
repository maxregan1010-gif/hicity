/* ============================================================
 * شهر طوفان — Toofan City
 * core.js — هسته: فضای نام سراسری، پیکربندی، ابزارها، رویدادها
 * ============================================================ */
window.TC = window.TC || {};
(function () {
  'use strict';

  /* ---------- نسخه و پیکربندی کلی ---------- */
  TC.VERSION = '1.0.0';
  TC.CONFIG = {
    // چرخه شبانه‌روز: یک روز کامل بازی = 24 دقیقه واقعی
    dayLengthMinutes: 24,
    startHour: 8.0,
    // مقیاس‌های شهر
    blockPitch: 84,          // فاصله مرکز خیابان تا خیابان بعدی (متر)
    roadHalf: 11,            // نصف عرض جاده آسفالت
    sidewalkW: 5,            // عرض پیاده‌رو
    cityBlocks: 14,          // تعداد بلوک در هر ضلع هسته شهری
    waterLevel: -6,
    // عملکرد
    drawDistance: { low: 380, medium: 560, high: 800, ultra: 1100 },
    npcCount: { low: 8, medium: 14, high: 22, ultra: 30 },
    trafficCount: { low: 8, medium: 14, high: 20, ultra: 26 },
    shadowMapSize: { low: 0, medium: 1024, high: 1024, ultra: 2048 },
    hardwareScale: { low: 1.5, medium: 1.25, high: 1.0, ultra: 1.0 },
    // ذخیره
    autosaveSec: 120,
    saveSlots: 3,
    // پلیس
    arrestRadius: 3.2,
    // GPS
    arriveRadius: 9,
  };

  /* ---------- وضعیت سراسری بازی ---------- */
  TC.G = {
    scene: null, engine: null, canvas: null,
    started: false, paused: false, state: 'boot', // boot|menu|playing|cutscene|jail|dead
    time: TC.CONFIG.startHour * 3600, // ثانیه از نیمه‌شب
    day: 1,
    playTimeSec: 0,
    quality: 'high',
    isMobile: false, isTablet: false,
    fps: 60,
    input: null,
    colliders: [],
    spatial: null,
    interactables: [],
    pois: [],          // {id, name, type, icon, x, z, radius, color, data}
    trafficLights: [],
    routeTarget: null, // مقصد GPS فعال {x, z, name}
    routePath: null,
    lastKnownPos: null,
    gameSpeed: 1,
  };

  /* ---------- ابزار ریاضی ---------- */
  const M = {};
  M.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.dist2 = (x1, z1, x2, z2) => { const dx = x2 - x1, dz = z2 - z1; return Math.sqrt(dx * dx + dz * dz); };
  M.dist3 = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  M.angleDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  M.lerpAngle = (a, b, t) => a + M.angleDiff(a, b) * t;
  M.rand = (a, b) => a + Math.random() * (b - a);
  M.randInt = (a, b) => Math.floor(M.rand(a, b + 1));
  M.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  M.damp = (cur, target, lambda, dt) => M.lerp(cur, target, 1 - Math.exp(-lambda * dt));

  // PRNG قطعی برای تولید شهر (هر بار همان شهر)
  let seed = 1337;
  M.srand = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  M.srandInt = (a, b) => a + Math.floor(M.srand() * (b - a + 1));
  M.srandPick = (arr) => arr[Math.floor(M.srand() * arr.length)];
  M.resetSeed = (s) => { seed = (s === undefined ? 1337 : s); };

  TC.M = M;

  /* ---------- قالب‌بندی فارسی ---------- */
  const faNum = (n) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  TC.faNum = faNum;
  TC.moneyFmt = (n) => faNum(Math.round(n).toLocaleString('en-US')).replace(/,/g, '٬');
  TC.timeFmt = (sec) => {
    const h = Math.floor(sec / 3600) % 24, m = Math.floor((sec % 3600) / 60);
    return faNum(String(h).padStart(2, '0')) + ':' + faNum(String(m).padStart(2, '0'));
  };
  TC.dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  TC.dayName = () => TC.dayNames[(TC.G.day - 1) % 7];

  /* ---------- باس رویداد ---------- */
  const bus = { map: {} };
  bus.on = (ev, fn) => { (bus.map[ev] = bus.map[ev] || []).push(fn); return fn; };
  bus.off = (ev, fn) => { const l = bus.map[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } };
  bus.emit = (ev, data) => { const l = bus.map[ev]; if (l) for (let i = 0; i < l.length; i++) { try { l[i](data); } catch (e) { console.error('[bus:' + ev + ']', e); } } };
  TC.bus = bus;

  /* ---------- ثبات‌های منطقه شهر ---------- */
  // مناطق: هر بلوک بر اساس مختصات به منطقه‌ای تعلق دارد
  TC.DISTRICTS = {
    downtown:   { name: 'مرکز طوفان', color: '#4dd2ff', base: 'tower' },
    commercial: { name: 'خیابان تجاری پارس', color: '#f5b301', base: 'shop' },
    residential:{ name: 'شهرک آفتاب', color: '#7ee081', base: 'house' },
    slums:      { name: 'کوی زیتون', color: '#b09a72', base: 'slum' },
    luxury:     { name: 'ویلاهای شاه‌نشین', color: '#e89ee8', base: 'villa' },
    industrial: { name: 'منطقه صنعتی پارس', color: '#a9b6c8', base: 'factory' },
    harbor:     { name: 'بندر شرقی', color: '#5cc8d8', base: 'harbor' },
    security:   { name: 'منطقه امنیتی', color: '#7f9ae0', base: 'office' },
    park:       { name: 'پارک بهاران', color: '#69d869', base: 'park' },
    beach:      { name: 'ساحل مرجان', color: '#ffd97a', base: 'beach' },
    countryside:{ name: 'جاده روستایی', color: '#c8d89a', base: 'none' },
    forest:     { name: 'جنگل سبزان', color: '#3a9a3a', base: 'none' },
    airport:    { name: 'فرودگاه بین‌المللی آرش', color: '#d8d8e8', base: 'none' },
    mountains:  { name: 'کوه‌های پارسه', color: '#9a8a7a', base: 'none' },
  };
  TC.districtAt = (bx, bz) => {
    // bx,bz: شاخص بلوک (0..N-1)؛ خارج از هسته => حومه
    const N = TC.CONFIG.cityBlocks, c = (N - 1) / 2;
    const d = Math.max(Math.abs(bx - c), Math.abs(bz - c));
    if (bx >= 0 && bx < N && bz >= 0 && bz < N) {
      if (d <= 1) return 'downtown';
      if (d <= 2) return 'commercial';
      if (bx >= N - 3 && bz >= N - 3) return 'slums';
      if (bx <= 3 && bz >= N - 3) return 'luxury';
      if (bx >= N - 4 && bz <= 3) return 'industrial';
      if (bx >= N - 5 && bz > 3 && bz < N - 3 && d > 3) return 'industrial';
      if (bx <= 4 && bz <= 3 && d > 2) return 'park';
      return 'residential';
    }
    return null;
  };

  /* ---------- ثبت نقاط مهم شهر (POI) ---------- */
  TC.POI_TYPES = {
    home:       { icon: '🏠', label: 'خانه', color: '#f5b301' },
    police:     { icon: '🚓', label: 'اداره پلیس', color: '#4d8dff' },
    hospital:   { icon: '🏥', label: 'بیمارستان', color: '#ff6b81' },
    bank:       { icon: '🏦', label: 'بانک مرکزی طوفان', color: '#29c9e8' },
    prison:     { icon: '⛓️', label: 'زندان مرکزی', color: '#8892a8' },
    dealership: { icon: '🚗', label: 'نمایشگاه خودرو', color: '#e89ee8' },
    shop_cloth: { icon: '👕', label: 'فروشگاه لباس', color: '#ffb84d' },
    shop_equip: { icon: '🛒', label: 'فروشگاه تجهیزات', color: '#ffb84d' },
    shop_food:  { icon: '🍔', label: 'فست‌فود', color: '#ff8c42' },
    shop_rest:  { icon: '🍽️', label: 'رستوران', color: '#ff8c42' },
    shop_cafe:  { icon: '☕', label: 'کافی‌شاپ', color: '#a9745b' },
    shop_market:{ icon: '🏪', label: 'سوپرمارکت', color: '#7ee081' },
    shop_gun:   { icon: '🔫', label: 'فروشگاه اسلحه', color: '#ff5c5c' },
    repair:     { icon: '🔧', label: 'تعمیرگاه خودرو', color: '#c8ccd8' },
    gas:        { icon: '⛽', label: 'پمپ بنزین', color: '#4dc9ff' },
    hotel:      { icon: '🏨', label: 'هتل آسمان', color: '#e8d04d' },
    job:        { icon: '🧰', label: 'محل استخدام', color: '#35d073' },
    estate:     { icon: '🏘️', label: 'مشاور املاک', color: '#c88ee8' },
    train:      { icon: '🚆', label: 'ایستگاه قطار', color: '#a8a8b8' },
    airportPoi: { icon: '✈️', label: 'ترمینال فرودگاه', color: '#d8d8e8' },
    parking:    { icon: '🅿️', label: 'پارکینگ عمومی', color: '#4d8dff' },
    race:       { icon: '🏁', label: 'مسابقه', color: '#ff4d4d' },
    mission:    { icon: '⭐', label: 'مأموریت', color: '#ffd04d' },
    secret:     { icon: '💎', label: 'مکان مخفی', color: '#8ff3ff' },
    taxi:       { icon: '🚕', label: 'شرکت تاکسی‌رانی', color: '#ffd04d' },
    club:       { icon: '🎯', label: 'کلوپ', color: '#e84da8' },
  };
  TC.addPOI = (type, x, z, name, extra) => {
    const t = TC.POI_TYPES[type];
    const poi = Object.assign({ id: 'poi' + TC.G.pois.length, type, name: name || t.label, x, z, icon: t.icon, color: t.color, radius: 10 }, extra || {});
    TC.G.pois.push(poi);
    return poi;
  };
  TC.poiByType = (type) => TC.G.pois.filter(p => p.type === type);

  /* ---------- مختصات مرکز شهر ---------- */
  TC.cityOrigin = () => {
    const N = TC.CONFIG.cityBlocks, pitch = TC.CONFIG.blockPitch;
    return { x: 0, z: 0, half: (N * pitch) / 2 };
  };
  // مرکز بلوک (bx,bz) — بلوک i بین خیابان‌های i و i+1
  TC.blockCenter = (bx, bz) => {
    const N = TC.CONFIG.cityBlocks, pitch = TC.CONFIG.blockPitch, half = (N * pitch) / 2;
    // خیابان‌ها در خطوط k*pitch - half؛ بلوک‌ها بین دو خیابان
    const gx = -half + (bx + 0.5) * pitch + 0; // مرکز بلوک
    const gz = -half + (bz + 0.5) * pitch;
    return { x: gx, z: gz };
  };
  TC.roadCoord = (k) => {
    const N = TC.CONFIG.cityBlocks, pitch = TC.CONFIG.blockPitch, half = (N * pitch) / 2;
    return -half + k * pitch;
  };

  /* ---------- منابع: تکسچرهای رویه‌ای ---------- */
  TC.Tex = {}; // در world.js پر می‌شود

  /* ---------- پیلود خطا ---------- */
  TC.fatalError = (msg) => {
    const el = document.getElementById('fatalError');
    document.getElementById('fatalErrorMsg').textContent = msg;
    el.style.display = 'flex';
    console.error(msg);
  };

  /* ---------- ردیابی کارایی ---------- */
  TC.perf = { samples: [], avg: 60, lowStreak: 0, autoQuality: true };
  TC.perf.push = (fps) => {
    const p = TC.perf;
    p.samples.push(fps);
    if (p.samples.length > 120) p.samples.shift();
    let s = 0; for (const v of p.samples) s += v;
    p.avg = s / p.samples.length;
    if (p.autoQuality && TC.G.started) {
      if (p.avg < 24 && fps < 24) p.lowStreak++; else p.lowStreak = Math.max(0, p.lowStreak - 1);
      if (p.lowStreak > 900) { // حدود ۱۵ ثانیه افت
        p.lowStreak = 0;
        const order = ['ultra', 'high', 'medium', 'low'];
        const i = order.indexOf(TC.G.quality);
        if (i < order.length - 1) { TC.setQuality(order[i + 1]); TC.ui && TC.ui.notify && TC.ui.notify('کیفیت گرافیک به «' + TC.qualityName(order[i + 1]) + '» کاهش یافت برای روان‌تر شدن بازی', 'warn'); }
      }
    }
  };
  TC.qualityName = (q) => ({ low: 'کم', medium: 'متوسط', high: 'زیاد', ultra: 'فوق‌العاده' }[q] || q);

  /* ---------- تنظیمات کاربر ---------- */
  TC.Settings = {
    data: {
      quality: 'high', autoQuality: true, shadows: 'high', textures: 'high',
      fpsCap: 60, hudScale: 1.0, sensitivity: 1.0, touchSensitivity: 1.0,
      masterVol: 0.8, sfxVol: 0.9, musicVol: 0.6, ambientVol: 0.7,
      joySize: 1.0, btnSize: 1.0, touchOpacity: 0.7, controlLayout: 'joystick',
      fpsShow: false, invertY: false, camDistance: 1.0,
      keybinds: null,
      mobileBtns: null,
    },
    load() {
      try {
        const raw = localStorage.getItem('toofan_settings');
        if (raw) Object.assign(this.data, JSON.parse(raw));
      } catch (e) { /* ignore */ }
    },
    save() {
      try { localStorage.setItem('toofan_settings', JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    },
  };

  /* ---------- ورودی مجازی مشترک (کیبورد/لمس/گیم‌پد) ---------- */
  TC.Virtual = {
    moveX: 0, moveY: 0,        // حرکت پیاده
    steerX: 0, gasY: 0,        // رانندگی
    run: false, jump: false, interact: false, enterExit: false, brake: false,
    fire: false, upDown: 0,    // هلیکوپتر/قایق
  };

  /* ---------- کلیدها ---------- */
  TC.DefaultKeys = {
    forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
    run: 'ShiftLeft', jump: 'Space', interact: 'KeyE', enterExit: 'KeyF',
    camera: 'KeyC', map: 'KeyM', char: 'KeyI', menu: 'Tab', pause: 'Escape',
    phone: 'KeyP', horn: 'KeyH', fire: 'KeyR', radio: 'KeyQ',
    attack: 'KeyX', crouch: 'KeyZ', lights: 'KeyL',
  };

  /* ---------- ثبت interactable ها ---------- */
  TC.addInteract = (opts) => {
    // opts: {x, y, z, radius, text, key, action, enabled(), once}
    const it = Object.assign({ radius: 3.5, key: 'interact', enabled: () => true }, opts);
    TC.G.interactables.push(it);
    return it;
  };
  TC.removeInteract = (it) => {
    const i = TC.G.interactables.indexOf(it);
    if (i >= 0) TC.G.interactables.splice(i, 1);
  };

  /* ---------- نشست جاری بازیکن ---------- */
  TC.Player = null; // در player.js ساخته می‌شود
  TC.ActiveVehicle = null;

  /* ---------- لیست خودروهای متحرک ---------- */
  TC.Vehicles = [];
  TC.NPCs = [];
  TC.Pedestrians = [];
  TC.PoliceUnits = [];

})();
