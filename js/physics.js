/* ============================================================
 * physics.js — برخورد با دنیا (AABB + spatial hash)، حرکت و ذرات برخورد
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;
  const CELL = 48;

  const Physics = {
    grid: {},        // "cx|cz" -> [colliders]
    colliders: [],
    wallsOnly: [],   // دیوارهای بلند برای دید AI
  };

  function cellKey(cx, cz) { return cx + '|' + cz; }

  /* افزودن باکس برخوردی: مرکز (x,z)، ابعاد w (محور x)، d (محور z)، ارتفاع h از y0 */
  Physics.addBox = function (x, z, w, d, h, y0, tag) {
    y0 = y0 || 0;
    const col = {
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2,
      minY: y0, maxY: y0 + h,
      tag: tag || 'world', x, z, w, d, h,
    };
    Physics.colliders.push(col);
    const c0x = Math.floor(col.minX / CELL), c1x = Math.floor(col.maxX / CELL);
    const c0z = Math.floor(col.minZ / CELL), c1z = Math.floor(col.maxZ / CELL);
    for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
      const k = cellKey(cx, cz);
      (Physics.grid[k] = Physics.grid[k] || []).push(col);
    }
    if (h >= 1.6 && y0 < 1.2) Physics.wallsOnly.push(col);
    return col;
  };

  Physics.query = function (x, z, r) {
    const out = [];
    const c0x = Math.floor((x - r) / CELL), c1x = Math.floor((x + r) / CELL);
    const c0z = Math.floor((z - r) / CELL), c1z = Math.floor((z + r) / CELL);
    const seen = new Set();
    for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
      const arr = Physics.grid[cellKey(cx, cz)];
      if (!arr) continue;
      for (const col of arr) if (!seen.has(col)) { seen.add(col); out.push(col); }
    }
    return out;
  };

  /* هل دادن دایره (بازیکن/NPC/خودرو) از باکس‌ها — ۲D با بررسی ارتفاع */
  Physics.resolveCircle = function (pos, radius, height) {
    height = height === undefined ? 1.7 : height;
    const feet = pos.y, head = pos.y + height;
    const cols = Physics.query(pos.x, pos.z, radius + 2);
    let hit = false, impact = 0;
    for (const c of cols) {
      if (c.maxY <= feet + 0.3 || c.minY >= head) continue; // رد شدن از روی/زیر
      // نزدیک‌ترین نقطه باکس به مرکز دایره
      const nx = M.clamp(pos.x, c.minX, c.maxX);
      const nz = M.clamp(pos.z, c.minZ, c.maxZ);
      let dx = pos.x - nx, dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      let d = Math.sqrt(d2);
      if (d < 1e-5) {
        // مرکز داخل باکس: هل به نزدیک‌ترین لبه
        const l = Math.abs(pos.x - c.minX), r = Math.abs(c.maxX - pos.x);
        const t = Math.abs(pos.z - c.minZ), b = Math.abs(c.maxZ - pos.z);
        const m = Math.min(l, r, t, b);
        if (m === l) pos.x = c.minX - radius; else if (m === r) pos.x = c.maxX + radius;
        else if (m === t) pos.z = c.minZ - radius; else pos.z = c.maxZ + radius;
        hit = true; impact = Math.max(impact, 5);
        continue;
      }
      const push = (radius - d) / d;
      pos.x += dx * push;
      pos.z += dz * push;
      hit = true;
      impact = Math.max(impact, 0);
    }
    return hit;
  };

  /* مکعب بین دو نقطه دیوار هست؟ (دید AI) — نمونه‌برداری خط */
  Physics.hasWallBetween = function (x0, z0, x1, z1, step) {
    step = step || 4;
    const dist = M.dist2(x0, z0, x1, z1);
    const n = Math.max(2, Math.ceil(dist / step));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = M.lerp(x0, x1, t), z = M.lerp(z0, z1, t);
      const cols = Physics.query(x, z, 0.4);
      for (const c of cols) {
        if (c.maxY < 1.4) continue;
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
      }
    }
    return false;
  };

  /* آب بودن موقعیت (خارج از ساحل) */
  Physics.isWater = function (x, z) {
    // دریا غرب و جنوب شهر — مرز ساحل:
    const N = TC.CONFIG.cityBlocks, half = (N * TC.CONFIG.blockPitch) / 2;
    const beachWest = -half - 120, beachSouth = half + 120;
    if (x < beachWest - 60) return true;
    if (z > beachSouth + 60) return true;
    return false;
  };
  Physics.isSand = function (x, z) {
    const N = TC.CONFIG.cityBlocks, half = (N * TC.CONFIG.blockPitch) / 2;
    const west = -half - 40, south = half + 40;
    if (x < west && x > west - 130 && z > -half && z < south) return true;
    if (z > south && z < south + 110 && x > west && x < half + 40) return true;
    return false;
  };

  /* پیش‌بینی برخورد سرعت بالا برای خودرو */
  Physics.sweepCircle = function (x, z, dx, dz, radius) {
    // امتحان موقعیت جدید؛ اگر برخورد، فقط تا قبل از برخورد برو
    const nx = x + dx, nz = z + dz;
    const cols = Physics.query(nx, nz, radius + 1);
    let blocked = false;
    for (const c of cols) {
      if (c.maxY <= 0.4) continue;
      const cx = M.clamp(nx, c.minX, c.maxX), cz = M.clamp(nz, c.minZ, c.maxZ);
      const ddx = nx - cx, ddz = nz - cz;
      if (ddx * ddx + ddz * ddz < radius * radius) { blocked = true; break; }
    }
    return blocked;
  };

  /* زیر پا: ارتفاع زمین (سطح صاف + سکوها) */
  Physics.groundHeight = function (x, z, feetY) {
    // سکو/پله: باکس‌های کوتاه که بالای آن‌ها زیر پا مناسب است
    const cols = Physics.query(x, z, 0.3);
    let g = 0;
    for (const c of cols) {
      if (x > c.minX - 0.1 && x < c.maxX + 0.1 && z > c.minZ - 0.1 && z < c.maxZ + 0.1) {
        if (c.maxY <= feetY + 0.55 && c.maxY > g) g = c.maxY; // سکوی کوتاه: بالا رفتن خودکار
      }
    }
    return g;
  };

  Physics.clear = function () {
    Physics.grid = {}; Physics.colliders = []; Physics.wallsOnly = [];
  };

  TC.Physics = Physics;
})();
