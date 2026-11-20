/* ============================================================
 * police.js — سیستم پلیس: شش سطح تعقیب، جست‌وجو، موانع، دستگیری
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  const POL = {
    wanted: 0,          // 0..6
    wantedPoints: 0,
    lastCrimePos: null,
    lastSeenTime: -999,
    state: 'calm',      // calm | searching | chasing
    units: [],          // TC.PoliceUnits alias
    crimes: [],
    roadblocks: [],
    bribeHint: false,
  };
  TC.PoliceUnits = POL.units;

  const LEVEL_NAMES = ['', 'جست‌وجوی خفیف', 'تعقیب پیاده', 'تعقیب جدی', 'نیروی کمکی', 'بازرسی شهری', 'حکومت نظامی'];

  const CRIMES = {
    assault: { pts: 2, name: 'حمله به شهروند' },
    shoot: { pts: 2, name: 'شلیک در ملأ عام' },
    carjack: { pts: 3, name: 'سرقت خودرو' },
    hitrun: { pts: 3, name: 'تصادف با عابر و فرار' },
    speeding: { pts: 1, name: 'سرعت غیرمجاز' },
    robbery: { pts: 5, name: 'سرقت' },
    copassault: { pts: 4, name: 'حمله به مأمور پلیس' },
  };

  /* ---------- گزارش جرم ---------- */
  POL.reportCrime = function (type, x, z, mult) {
    const c = CRIMES[type];
    if (!c) return;
    const pts = c.pts * (mult || 1);
    POL.wantedPoints += pts;
    POL.lastCrimePos = { x, z };
    POL.lastSeenTime = TC.G.playTimeSec;
    POL.crimes.push({ type, name: c.name, time: TC.G.playTimeSec, day: TC.G.day });
    if (POL.crimes.length > 30) POL.crimes.shift();
    // سطح تعقیب
    const thresholds = [0, 2, 5, 9, 14, 20, 28];
    let newLevel = 0;
    for (let i = 6; i >= 1; i--) if (POL.wantedPoints >= thresholds[i]) { newLevel = i; break; }
    if (newLevel > POL.wanted) {
      POL.wanted = newLevel;
      TC.Audio.jingle('wanted');
      TC.Audio.radio();
      TC.ui && TC.ui.notify('⚠️ سطح تعقیب ' + TC.faNum(newLevel) + ' — ' + LEVEL_NAMES[newLevel], 'error');
      TC.bus.emit('police:wanted', newLevel);
    }
    // عابرها فرار کنند
    for (const p of TC.NPC.peds) {
      if (!p.dead && M.dist2(p.pos.x, p.pos.z, x, z) < 30) p.fleeFromPoint(x, z);
    }
  };

  POL.clearWanted = function () {
    POL.wanted = 0;
    POL.wantedPoints = 0;
    POL.state = 'calm';
    POL.lastCrimePos = null;
    // حذف واحدهای فعال
    for (const u of [...POL.units]) POL.removeUnit(u);
    for (const rb of [...POL.roadblocks]) POL.removeRoadblock(rb);
    TC.bus.emit('police:wanted', 0);
  };

  /* ---------- واحدهای پلیس ---------- */
  POL.spawnFootCop = function (x, z) {
    const p = TC.NPC.spawnPed(x, z, 'cop');
    p.talkable = false;
    p.body.material = TC.NPC._matFor('#1a2a5a');
    p.name = 'مأمور پلیس';
    return p;
  };

  POL.spawnUnit = function (kind) {
    const player = TC.Player;
    // دور از دید بازیکن اسپاون شود
    let sp = null;
    for (let k = 0; k < 25; k++) {
      const cand = TC.NAV.randomRoadPoint(60, player.pos.x, player.pos.z);
      if (!cand) continue;
      const d = M.dist2(cand.x, cand.z, player.pos.x, player.pos.z);
      if (d > 55 && d < 150 && !TC.Physics.hasWallBetween(player.pos.x, player.pos.z, cand.x, cand.z)) { sp = cand; break; }
    }
    if (!sp) sp = TC.NAV.randomRoadPoint(60, player.pos.x, player.pos.z);
    if (!sp) return;
    const unit = { id: 'cop' + Math.random().toString(36).slice(2, 7), kind, state: 'pursuit', pos: null, stunned: 0 };
    if (kind === 'foot') {
      const ped = POL.spawnFootCop(sp.x, sp.z);
      unit.ped = ped;
      unit.pos = ped.pos;
    } else {
      const def = POL.wanted >= 4 ? TC.Vehicles.DEFS.police2 : TC.Vehicles.DEFS.police1;
      const v = TC.Vehicles.spawn(def, sp.x, sp.z, {
        ai: { kind: 'police', lane: 4.2 },
        color: '#1a2a4a',
      });
      v.allowedPolice = true;
      v.sirenOn = true;
      v.engineOn = true;
      v.ai.path = TC.NAV.route(v.pos.x, v.pos.z, player.pos.x, player.pos.z, 4.2);
      v.ai.idx = 1;
      v.ai.update = POL.updateCopCar;
      v.ai.copUnit = unit;
      unit.car = v;
      unit.pos = v.pos;
    }
    POL.units.push(unit);
    return unit;
  };

  POL.removeUnit = function (u) {
    const i = POL.units.indexOf(u);
    if (i >= 0) POL.units.splice(i, 1);
    if (u.ped) TC.NPC.removePed(u.ped);
    if (u.car) TC.Vehicles.remove(u.car);
  };

  /* AI خودروی پلیس */
  POL.updateCopCar = function (v, dt) {
    const unit = v.ai.copUnit;
    if (unit.stunned > 0) { unit.stunned -= dt; return { throttle: 0, steer: 0, brake: true }; }
    const player = TC.Player;
    const pv = TC.Player.inVehicle;
    const target = pv ? pv.pos : player.pos;
    // بازسازی مسیر هر ۱.۵ ثانیه
    v.ai._retimer = (v.ai._retimer || 0) - dt;
    if (v.ai._retimer <= 0) {
      v.ai._retimer = 1.5;
      const d = M.dist2(v.pos.x, v.pos.z, target.x, target.z);
      if (d < 45) {
        // مستقیم به سمت هدف (نزدیک — بدون مسیر)
        v.ai.path = [{ x: target.x, z: target.z }];
        v.ai.idx = 0;
      } else {
        v.ai.path = TC.NAV.route(v.pos.x, v.pos.z, target.x, target.z, 4.2);
        v.ai.idx = 1;
      }
    }
    const tp = v.ai.path[Math.min(v.ai.idx, v.ai.path.length - 1)];
    const dToTp = M.dist2(v.pos.x, v.pos.z, tp.x, tp.z);
    if (dToTp < 7 && v.ai.idx < v.ai.path.length - 1) { v.ai.idx++; }
    const desiredYaw = Math.atan2(tp.x - v.pos.x, tp.z - v.pos.z);
    const diff = M.angleDiff(v.yaw, desiredYaw);
    const steer = M.clamp(diff * 2, -1, 1);
    const d = M.dist2(v.pos.x, v.pos.z, target.x, target.z);
    let targetSpeed = v.def.top * 0.9 * M.clamp(1.15 - Math.abs(diff) * 0.8, 0.3, 1);
    if (d < 9) targetSpeed = Math.min(targetSpeed, Math.max(2, d * 1.2));
    // پیت: اگر خیلی نزدیک و در سرعت، ضربه بزن
    const throttle = v.speed < targetSpeed ? M.clamp((targetSpeed - v.speed) / 4, 0.2, 1) : 0;
    const brake = v.speed > targetSpeed + 3;
    return { throttle, steer, brake };
  };

  /* AI مأمور پیاده */
  POL.updateFootCop = function (u, dt) {
    const p = u.ped;
    if (!p || p.dead) return;
    const player = TC.Player;
    const target = player.pos;
    const d = M.dist2(p.pos.x, p.pos.z, target.x, target.z);
    // اگر بازیکن در خودروی سریع است، پیاده عقب می‌ماند
    if (player.inVehicle && Math.abs(player.inVehicle.speed) > 10) {
      p.state = 'walk';
      p.target = { x: target.x, z: target.z };
      return;
    }
    // حرکت مستقیم به بازیکن با اجتناب از دیوار
    const dx = target.x - p.pos.x, dz = target.z - p.pos.z;
    const dl = Math.hypot(dx, dz) || 1;
    const moveSpeed = d > 6 ? 5.4 : 3.2;
    p.yaw = M.lerpAngle(p.yaw, Math.atan2(dx, dz), 0.18);
    const nx = p.pos.x + Math.sin(p.yaw) * moveSpeed * dt;
    const nz = p.pos.z + Math.cos(p.yaw) * moveSpeed * dt;
    // تست مسیر — اگر دیوار، دور بزن
    if (TC.Physics.sweepCircle(p.pos.x, p.pos.z, nx - p.pos.x, nz - p.pos.z, 0.4)) {
      // جانبی حرکت کن
      const sideYaw = p.yaw + (p._side || (p._side = Math.random() < 0.5 ? 1.2 : -1.2));
      p.pos.x += Math.sin(sideYaw) * moveSpeed * 0.7 * dt;
      p.pos.z += Math.cos(sideYaw) * moveSpeed * 0.7 * dt;
      if (Math.random() < 0.02) p._side = -p._side;
    } else {
      p.pos.x = nx; p.pos.z = nz;
    }
    p.animPhase += dt * 9;
    TC.NPC.animateLimbs(p, 1.1);
    p.root.position.copyFrom(p.pos);
    p.root.rotation.y = p.yaw;
    // دستگیری
    if (d < C.arrestRadius && POL.canArrest()) {
      POL.arrest();
    }
    // حمله به بازیکن در سطح بالا (فقط خطر شلیک در سطح ۵+)
    if (POL.wanted >= 5 && d < 14 && d > 5 && Math.random() < 0.015) {
      TC.Audio.play3d('shoot', p.pos.x, p.pos.z, 0.8);
      TC.Player.damage(6, 'پلیس');
    }
  };

  POL.canArrest = function () {
    const player = TC.Player;
    if (player.inVehicle) {
      const v = player.inVehicle;
      return Math.abs(v.speed) < 2.5; // توقف کامل در خودرو
    }
    return true; // پیاده همیشه قابل دستگیری
  };

  /* ---------- دستگیری ---------- */
  POL.arrest = function () {
    if (TC.G.state === 'jail' || POL._arresting) return;
    POL._arresting = true;
    const player = TC.Player;
    TC.Audio.jingle('fail');
    TC.Audio.siren(false);
    TC.ui && TC.ui.notify('🚨 دستگیر شدید!', 'error');
    // جریمه و حکم
    const fine = Math.min(6000, 300 * POL.wanted + POL.crimes.length * 120);
    const sentence = Math.min(90, Math.round(4 * POL.wanted + POL.crimes.length * 0.6)); // ثانیه بازی در زندان (شبیه‌سازی دقیقه)
    TC.Economy.spend(fine, 'جریمه پلیسی');
    TC.Prison.jail(sentence, fine);
    setTimeout(() => { POL._arresting = false; }, 3000);
  };

  /* ---------- موانع پلیسی ---------- */
  POL.spawnRoadblock = function () {
    const player = TC.Player;
    const pv = TC.Player.inVehicle;
    if (!pv) return;
    // جلوتر روی مسیر بازیکن
    const fx = pv.pos.x + Math.sin(pv.yaw) * 60;
    const fz = pv.pos.z + Math.cos(pv.yaw) * 60;
    const rp = TC.NAV.nearestOnRoad(fx, fz, 40);
    if (!rp) return;
    const rb = { pos: { x: rp.x, z: rp.z }, yaw: Math.atan2(rp.dx, rp.dz), meshes: [], colliders: [] };
    const scene = TC.G.scene;
    for (let i = -2; i <= 2; i++) {
      const barrier = BABYLON.MeshBuilder.CreateBox('rb', { width: 3.4, height: 1.1, depth: 0.5 }, scene);
      const mat = new BABYLON.StandardMaterial('rbM', scene);
      mat.diffuseColor = new BABYLON.Color3(0.85, 0.35, 0.1);
      mat.specularColor = BABYLON.Color3.Black();
      mat.freeze();
      barrier.material = mat;
      const px = rp.x + Math.cos(rb.yaw) * i * 3.5;
      const pz = rp.z - Math.sin(rb.yaw) * i * 3.5;
      barrier.position.set(px, 0.55, pz);
      barrier.rotation.y = rb.yaw;
      barrier.freezeWorldMatrix();
      rb.meshes.push(barrier);
      rb.colliders.push(TC.Physics.addBox(px, pz, 3.4, 0.5, 1.1, 0, 'roadblock'));
    }
    POL.roadblocks.push(rb);
    TC.ui && TC.ui.notify('🚧 پلیس موانع جاده‌ای بسته است!', 'warn');
  };

  POL.removeRoadblock = function (rb) {
    const i = POL.roadblocks.indexOf(rb);
    if (i >= 0) POL.roadblocks.splice(i, 1);
    for (const m of rb.meshes) m.dispose();
    for (const c of rb.colliders) {
      const j = TC.Physics.colliders.indexOf(c);
      if (j >= 0) TC.Physics.colliders.splice(j, 1);
      // حذف از گرید
      const c0x = Math.floor(c.minX / 48), c1x = Math.floor(c.maxX / 48);
      const c0z = Math.floor(c.minZ / 48), c1z = Math.floor(c.maxZ / 48);
      for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
        const arr = TC.Physics.grid[cx + '|' + cz];
        if (arr) { const k = arr.indexOf(c); if (k >= 0) arr.splice(k, 1); }
      }
    }
  };

  /* ---------- به‌روزرسانی کل سیستم ---------- */
  POL.update = function (dt) {
    if (TC.G.state === 'menu' || TC.G.state === 'jail') return;
    const player = TC.Player;
    if (POL.wanted === 0) {
      // گشت‌زنی معمولی: هیچ واحد تعقیبی
      return;
    }
    // دید پلیس: اگر واحدی بازیکن را ببیند، آخرین موقعیت به‌روز می‌شود
    let seen = false;
    for (const u of POL.units) {
      if (!u.pos) continue;
      const d = M.dist2(u.pos.x, u.pos.z, player.pos.x, player.pos.z);
      if (d < 55 && !TC.Physics.hasWallBetween(u.pos.x, u.pos.z, player.pos.x, player.pos.z)) {
        seen = true;
        break;
      }
    }
    if (seen) {
      POL.state = 'chasing';
      POL.lastCrimePos = { x: player.pos.x, z: player.pos.z };
      POL.lastSeenTime = TC.G.playTimeSec;
    } else if (TC.G.playTimeSec - POL.lastSeenTime > 12) {
      POL.state = 'searching';
    }
    // کاهش سطح تعقیب هنگام فرار
    if (POL.state === 'searching' && TC.G.playTimeSec - POL.lastSeenTime > 45) {
      POL.wantedPoints = Math.max(0, POL.wantedPoints - 6 * dt);
      const thresholds = [0, 2, 5, 9, 14, 20, 28];
      let newLevel = 0;
      for (let i = 6; i >= 1; i--) if (POL.wantedPoints >= thresholds[i]) { newLevel = i; break; }
      if (newLevel < POL.wanted) {
        POL.wanted = newLevel;
        TC.Audio.radio();
        if (newLevel === 0) {
          TC.ui && TC.ui.notify('✅ از دست پلیس فرار کردید', 'success');
          POL.clearWanted();
          return;
        } else {
          TC.ui && TC.ui.notify('سطح تعقیب کاهش یافت: ' + TC.faNum(newLevel), 'success');
        }
      }
    }
    // اسپاون واحدها بر اساس سطح
    const wantFoot = [0, 1, 2, 2, 3, 4, 5][POL.wanted];
    const wantCars = [0, 0, 1, 2, 3, 4, 6][POL.wanted];
    let footCount = 0, carCount = 0;
    for (const u of POL.units) u.kind === 'foot' ? footCount++ : carCount++;
    // حذف واحدهای خیلی دور
    for (let i = POL.units.length - 1; i >= 0; i--) {
      const u = POL.units[i];
      const d = u.pos ? M.dist2(u.pos.x, u.pos.z, player.pos.x, player.pos.z) : 999;
      if (d > 260 && !seen) POL.removeUnit(u);
    }
    if (footCount < wantFoot && Math.random() < 0.02) POL.spawnUnit('foot');
    if (carCount < wantCars && Math.random() < 0.02) POL.spawnUnit('car');
    // موانع در سطح ۳+
    POL._rbTimer = (POL._rbTimer || 0) - dt;
    if (POL.wanted >= 3 && POL._rbTimer <= 0 && player.inVehicle && seen) {
      POL._rbTimer = 25;
      if (POL.roadblocks.length < 2) POL.spawnRoadblock();
    }
    // موانع قدیمی حذف شوند
    for (let i = POL.roadblocks.length - 1; i >= 0; i--) {
      const rb = POL.roadblocks[i];
      if (M.dist2(rb.pos.x, rb.pos.z, player.pos.x, player.pos.z) > 320) POL.removeRoadblock(rb);
    }
    // آژیر
    const chaseNear = seen && M.dist2(TC.Player.pos.x, TC.Player.pos.z, (POL.units[0] && POL.units[0].pos ? POL.units[0].pos.x : 9999), (POL.units[0] && POL.units[0].pos ? POL.units[0].pos.z : 9999)) < 70;
    TC.Audio.siren(POL.units.some(u => u.car), chaseNear ? 1 : 0.4);
    // به‌روزرسانی پیاده‌ها
    for (const u of POL.units) {
      if (u.kind === 'foot') POL.updateFootCop(u, dt);
    }
  };

  /* مأموریت پلیسی: گزارش‌های تصادفی */
  POL.randomReport = function () {
    const types = [
      { text: 'دزدی در سوپرمارکت مرکزی گزارش شده', crime: 'robbery' },
      { text: 'دعوای خیابانی در کوی زیتون', crime: 'assault' },
      { text: 'رانندگی خطرناک در بزرگراه', crime: 'speeding' },
      { text: 'مزاحمت در پارک بهاران', crime: 'assault' },
    ];
    const t = M.pick(types);
    const p = TC.NAV.randomRoadPoint(0, TC.Player.pos.x, TC.Player.pos.z);
    return { text: t.text, x: p.x, z: p.z, crime: t.crime };
  };

  POL.serialize = function () {
    return { wantedPoints: POL.wantedPoints, crimes: POL.crimes.slice(-10) };
  };
  POL.deserialize = function (d) {
    if (!d) return;
    POL.wantedPoints = d.wantedPoints || 0;
    POL.crimes = d.crimes || [];
    POL.wanted = 0;
    const thresholds = [0, 2, 5, 9, 14, 20, 28];
    for (let i = 6; i >= 1; i--) if (POL.wantedPoints >= thresholds[i]) { POL.wanted = i; break; }
  };

  TC.Police = POL;
})();
