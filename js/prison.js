/* ============================================================
 * prison.js — زندان مرکزی: سلول‌ها، راهرو، غذاخوری، حیاط،
 * نگهبان‌ها، زندانی‌ها، شمارش محکومیت و آزادی
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Pri = {
    built: false,
    active: false,
    sentenceLeft: 0,
    finePaid: 0,
    guards: [],
    inmates: [],
    gateOpen: false,
  };

  /* ---------- ساخت زندان ---------- */
  Pri.build = function () {
    if (Pri.built) return;
    const scene = TC.G.scene;
    const site = TC.World.prisonSite;
    if (!site) return;
    const x = site.x, z = site.z;
    // دیوارهای محوطه بزرگ (۲۰×۲۶)
    const W2 = 22, D2 = 28, wallH = 6;
    const stone = TC.World.mats.stone;
    function wall(cx, cz, ww, dd) {
      const b = BABYLON.MeshBuilder.CreateBox('priW', { width: ww, height: wallH, depth: dd }, scene);
      b.material = stone;
      b.position.set(cx, wallH / 2, cz);
      b.freezeWorldMatrix();
      b.isPickable = false;
      TC.Physics.addBox(cx, cz, ww, dd, wallH, 0, 'prisonWall');
      return b;
    }
    wall(x, z - D2 / 2, W2 + 1, 0.8);
    wall(x, z + D2 / 2, W2 + 1, 0.8);
    wall(x - W2 / 2, z, 0.8, D2 + 1);
    // دیوار شرقی با دروازه (شکاف وسط)
    wall(x + W2 / 2, z - D2 / 2 + 2.5, 0.8, 5);
    wall(x + W2 / 2, z + D2 / 2 - 2.5, 0.8, 5);
    // برجک‌های نگهبانی
    for (const [tx, tz] of [[x - W2 / 2, z - D2 / 2], [x + W2 / 2, z - D2 / 2], [x - W2 / 2, z + D2 / 2], [x + W2 / 2, z + D2 / 2]]) {
      const tower = BABYLON.MeshBuilder.CreateCylinder('priTower', { diameter: 3, height: 9, tessellation: 8 }, scene);
      tower.material = stone;
      tower.position.set(tx, 7.5, tz);
      tower.freezeWorldMatrix();
      TC.Physics.addBox(tx, tz, 3, 3, 9, 0, 'tower');
    }
    // --- داخل محوطه ---
    // ساختمان سلول‌ها (شمال): راهرو + ۶ سلول
    const cellB = TC.World.makeRoom({ x, z: z - 9, w: W2 - 4, d: 10, h: 3.6, doorSide: 's', name: 'prisonBlock', wallMat: stone });
    // دیوارهای داخلی سلول‌ها
    const cellW = (W2 - 4) / 6;
    for (let i = 1; i < 6; i++) {
      const wx = x - (W2 - 4) / 2 + i * cellW;
      const part = BABYLON.MeshBuilder.CreateBox('priCell', { width: 0.3, height: 3.2, depth: 9 }, scene);
      part.material = stone;
      part.position.set(wx, 1.6, z - 9);
      part.freezeWorldMatrix();
      TC.Physics.addBox(wx, z - 9, 0.3, 9, 3.2, 0, 'cellWall');
    }
    Pri.cells = [];
    for (let i = 0; i < 6; i++) {
      const cx = x - (W2 - 4) / 2 + cellW * (i + 0.5);
      Pri.cells.push({ x: cx, z: z - 11.5 });
      // تخت
      const bed = BABYLON.MeshBuilder.CreateBox('priBed', { width: 1, height: 0.5, depth: 2 }, scene);
      bed.material = TC.World.mats.metal;
      bed.position.set(cx - 1, 0.25, z - 12.5);
      bed.freezeWorldMatrix();
    }
    // غذاخوری (جنوب)
    const canteen = TC.World.makeRoom({ x, z: z + 8, w: 16, d: 10, h: 3.6, doorSide: 'n', name: 'canteen', wallMat: TC.World.mats.concrete });
    // میزهای غذاخوری
    for (let i = 0; i < 3; i++) {
      const table = BABYLON.MeshBuilder.CreateBox('priTable', { width: 3.4, height: 0.12, depth: 1.2 }, scene);
      table.material = TC.World.mats.wood;
      table.position.set(x - 4 + i * 4, 0.85, z + 8);
      table.freezeWorldMatrix();
      for (const s of [-1, 1]) {
        const leg = BABYLON.MeshBuilder.CreateBox('priLeg', { width: 0.15, height: 0.85, depth: 0.15 }, scene);
        leg.material = TC.World.mats.metal;
        leg.position.set(x - 4 + i * 4 + s * 1.4, 0.42, z + 8);
        leg.freezeWorldMatrix();
      }
    }
    // دفتر مدیریت (جنوب شرقی)
    const office = TC.World.makeRoom({ x: x + 6, z: z + 8, w: 8, d: 8, h: 3.4, doorSide: 'n', name: 'priOffice', wallMat: TC.World.mats.concrete });
    // اتاق ملاقات (جنوب غربی)
    const visit = TC.World.makeRoom({ x: x - 6, z: z + 8, w: 8, d: 8, h: 3.4, doorSide: 'n', name: 'priVisit', wallMat: TC.World.mats.concrete });
    // دروازه ورودی (شرق) — در متحرک
    const gate = BABYLON.MeshBuilder.CreateBox('priGate', { width: 0.5, height: 4.5, depth: 5 }, scene);
    gate.material = TC.World.mats.metal;
    gate.position.set(x + W2 / 2, 2.25, z);
    gate.freezeWorldMatrix();
    Pri.gateMesh = gate;
    Pri.gatePivot = new BABYLON.TransformNode('priGatePivot', scene);
    Pri.gatePivot.position.set(x + W2 / 2, 0, z - 2.5);
    gate.parent = null;
    gate.position.set(0, 2.25, 2.5);
    gate.parent = Pri.gatePivot;
    Pri.doorX = x + W2 / 2;
    Pri.doorZ = z;
    Pri.built = true;
    Pri.site = { x, z, W: W2, D: D2, cellB, canteen, office, visit };
    // POI برای آزادشدن روی نقشه موجود است (prison)
    console.log('[Toofan] زندان ساخته شد');
  };

  /* ---------- باز کردن/بستن دروازه ---------- */
  Pri.setGate = function (open) {
    if (!Pri.gatePivot) return;
    Pri.gateOpen = open;
    Pri._gateTarget = open ? -1.8 : 0;
  };

  /* ---------- زندانی شدن ---------- */
  Pri.jail = function (seconds, fine) {
    Pri.build();
    Pri.active = true;
    Pri.sentenceLeft = seconds;
    Pri.finePaid = fine || 0;
    TC.G.state = 'jail';
    // انتقال به سلول
    const cell = M.pick(Pri.cells);
    TC.Player.inVehicle && TC.Player.exitVehicle();
    TC.Player.pos.set(cell.x, 0, cell.z);
    TC.Player.mesh.root.setEnabled(true);
    TC.Police.clearWanted();
    Pri.setGate(true);
    TC.ui && TC.ui.notify('⛓️ محکومیت: ' + TC.faNum(Math.ceil(seconds)) + ' ثانیه زندان — استراحت کن و صبر کن', 'error');
    // زندانی‌ها و نگهبان‌ها
    Pri.spawnPrisoners();
    TC.bus.emit('prison:enter');
  };

  Pri.spawnPrisoners = function () {
    // پاکسازی قدیمی‌ها
    for (const g of Pri.guards) TC.NPC.removePed(g);
    for (const p of Pri.inmates) TC.NPC.removePed(p);
    Pri.guards = []; Pri.inmates = [];
    const site = Pri.site;
    for (let i = 0; i < 5; i++) {
      const g = TC.NPC.spawnPed(site.x - 6 + i * 3, site.z + 2, 'guard');
      g.talkable = false;
      g.body.material = TC.NPC._matFor('#2a3a2a');
      g.name = 'نگهبان زندان';
      Pri.guards.push(g);
    }
    for (let i = 0; i < 7; i++) {
      const p = TC.NPC.spawnPed(site.x + M.rand(-8, 8), site.z + M.rand(2, 12), 'inmate');
      p.talkable = false;
      p.body.material = TC.NPC._matFor('#c96a2a');
      p.name = 'زندانی';
      Pri.inmates.push(p);
    }
  };

  /* ---------- به‌روزرسانی ---------- */
  Pri.update = function (dt) {
    // انیمیشن دروازه
    if (Pri._gateTarget !== undefined && Pri.gatePivot) {
      Pri.gatePivot.rotation.y = M.damp(Pri.gatePivot.rotation.y, Pri._gateTarget, 3, dt);
    }
    if (!Pri.active) return;
    // شمارش معکوس (۲ برابر سریع‌تر)
    Pri.sentenceLeft -= dt * 2;
    if (Pri.sentenceLeft <= 0) {
      Pri.release();
      return;
    }
    // نگهبان‌ها گشت بزنند
    for (const g of Pri.guards) {
      if (!g.target || M.dist2(g.pos.x, g.pos.z, g.target.x, g.target.z) < 1.5) {
        g.target = { x: Pri.site.x + M.rand(-8, 8), z: Pri.site.z + M.rand(-4, 12) };
      }
      const dx = g.target.x - g.pos.x, dz = g.target.z - g.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      g.yaw = M.lerpAngle(g.yaw, Math.atan2(dx, dz), 0.12);
      g.pos.x += Math.sin(g.yaw) * 1.6 * dt;
      g.pos.z += Math.cos(g.yaw) * 1.6 * dt;
      g.animPhase += dt * 5;
      TC.NPC.animateLimbs(g, 0.5);
      g.root.position.copyFrom(g.pos);
      g.root.rotation.y = g.yaw;
    }
    // زندانی‌ها راه بروند/بنشینند
    for (const p of Pri.inmates) {
      if (!p.target || M.dist2(p.pos.x, p.pos.z, p.target.x, p.target.z) < 1.5) {
        p.target = { x: Pri.site.x + M.rand(-8, 8), z: Pri.site.z + M.rand(-12, 12) };
      }
      const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      p.yaw = M.lerpAngle(p.yaw, Math.atan2(dx, dz), 0.1);
      p.pos.x += Math.sin(p.yaw) * 1.2 * dt;
      p.pos.z += Math.cos(p.yaw) * 1.2 * dt;
      p.animPhase += dt * 4;
      TC.NPC.animateLimbs(p, 0.45);
      p.root.position.copyFrom(p.pos);
      p.root.rotation.y = p.yaw;
    }
  };

  Pri.release = function () {
    Pri.active = false;
    TC.G.state = 'playing';
    Pri.setGate(false);
    // خروج از دروازه
    TC.Player.pos.set(Pri.doorX + 4, 0, Pri.doorZ);
    TC.ui && TC.ui.notify('🔓 آزاد شدید! سعی کنید دوباره دستگیر نشوید', 'success');
    TC.Audio.jingle('complete');
    TC.bus.emit('prison:release');
  };

  Pri.serialize = function () {
    return { active: Pri.active, sentenceLeft: Pri.sentenceLeft };
  };
  Pri.deserialize = function (d) {
    if (!d) return;
    if (d.active) {
      Pri.jail(d.sentenceLeft || 10, 0);
    }
  };

  TC.Prison = Pri;
})();
