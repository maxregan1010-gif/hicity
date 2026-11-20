/* ============================================================
 * npc.js — عابران پیاده، رانندگان ترافیک، فروشنده‌ها و رفتارها
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  const NPC = {
    peds: [],      // عابرهای فعال
    traffic: [],   // خودروهای ترافیک فعال
    geos: null,    // هندسه‌های مشترک
    lines: [
      'سلام! امروز هوا خوبه نه؟', 'این شهر هر روز عجیب‌تر میشه…',
      'شنیدی؟ یکی از نمایشگاه‌ها خودرو فروشی داره!', 'از دست پلیس‌های این شهر خسته شدم.',
      'رستوران بهار کباب فوق‌العاده‌ای داره.', 'میدونی کجا پول خوب در میاره؟ کار در بانک!',
      'الکی نگو، شب‌ها که میشه این حوالی امن نیست.', 'من تو ساختمان مرکزی کار می‌کنم.',
      'کوچه‌های کوی زیتون رو بهتر بشناس، خطرناکه!', 'یه روزی این شهر رو ترک می‌کنم…',
      'جشن افتتاح نمایشگاه جدید رو دیدی؟', 'موتورسیکلت‌های صاعقه واقعاً سریعن!',
    ],
    helpLines: ['راه بیمارستان رو گم کردم، کمکم می‌کنی؟', 'پول برگشتم رو لازم دارم، بی‌زحمت!', 'به بانک باید برسم، مسیر رو بلدی؟'],
  };

  const SKINS = ['#c98d5f', '#a87550', '#8a5f3f', '#d8a878', '#e8b088'];
  const SHIRTS = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#2c3e50', '#16a085', '#d35400', '#7f8c8d'];
  const PANTS = ['#33383f', '#4a4a55', '#5a4632', '#2c3e50', '#3a3a3a'];
  const HAIRS = ['#241a12', '#3a2a1a', '#12100e', '#4a3421', '#5a5a5a'];
  const NAMES = ['رضا', 'مریم', 'علی', 'زهرا', 'حسین', 'فاطمه', 'امیر', 'نرگس', 'محمد', 'سارا', 'کیوان', 'لیلا', 'بهزاد', 'شیرین', 'کامران', 'پریسا'];

  /* ساخت هندسه‌های مشترک یک‌بار */
  NPC.init = function () {
    const scene = TC.G.scene;
    NPC.geos = {};
    const torso = BABYLON.MeshBuilder.CreateCapsule('npcTorsoGeo', { height: 0.68, radius: 0.22, tessellation: 6 }, scene);
    NPC.geos.torso = torso;
    const limb = BABYLON.MeshBuilder.CreateCapsule('npcLimbGeo', { height: 0.6, radius: 0.08, tessellation: 5 }, scene);
    limb.bakeCurrentTransformIntoVertices();
    NPC.geos.limb = limb;
    const head = BABYLON.MeshBuilder.CreateSphere('npcHeadGeo', { diameter: 0.32, segments: 6 }, scene);
    NPC.geos.head = head;
    NPC.matCache = {};
    NPC._matFor = (hex) => {
      if (!NPC.matCache[hex]) {
        const m = new BABYLON.StandardMaterial('npcM' + hex, scene);
        m.diffuseColor = BABYLON.Color3.FromHexString(hex);
        m.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
        m.freeze();
        NPC.matCache[hex] = m;
      }
      return NPC.matCache[hex];
    };
  };

  /* اسپاون یک عابر */
  NPC.spawnPed = function (x, z, kind) {
    const scene = TC.G.scene;
    const skin = M.pick(SKINS), shirt = M.pick(SHIRTS), pants = M.pick(PANTS), hair = M.pick(HAIRS);
    const root = new BABYLON.TransformNode('npc', scene);
    // تنه + سر (مترج شده)
    const torso = new BABYLON.Mesh('npcT', scene);
    NPC.geos.torso.geometry.applyToMesh(torso);
    torso.material = NPC._matFor(shirt);
    torso.position.y = 1.08;
    torso.parent = root;
    const head = new BABYLON.Mesh('npcH', scene);
    NPC.geos.head.geometry.applyToMesh(head);
    head.material = NPC._matFor(skin);
    head.scaling.y = 1.15;
    head.position.y = 1.72;
    head.parent = root;
    const hairM = new BABYLON.Mesh('npcHair', scene);
    NPC.geos.head.geometry.applyToMesh(hairM);
    hairM.material = NPC._matFor(hair);
    hairM.scaling.set(1.05, 0.8, 1.05);
    hairM.position.y = 1.86;
    hairM.parent = root;
    const bodyParts = [torso, head, hairM];
    const body = BABYLON.Mesh.MergeMeshes(bodyParts, true, true, undefined, false, true);
    body.parent = root;
    // دست و پا (instance از هندسه مشترک)
    function limb(side, isLeg) {
      const piv = new BABYLON.TransformNode('np', scene);
      piv.parent = root;
      piv.position.set(side * (isLeg ? 0.12 : 0.28), isLeg ? 0.76 : 1.38, 0);
      const l = new BABYLON.Mesh('nl', scene);
      NPC.geos.limb.geometry.applyToMesh(l);
      l.material = NPC._matFor(isLeg ? pants : shirt);
      l.position.y = -0.28;
      l.parent = piv;
      return piv;
    }
    const ped = {
      root, body,
      armL: limb(-1, false), armR: limb(1, false),
      legL: limb(-1, true), legR: limb(1, true),
      pos: new BABYLON.Vector3(x, 0, z),
      yaw: M.rand(0, 6.28), vel: BABYLON.Vector3.Zero(),
      state: 'walk', animPhase: M.rand(0, 6),
      health: 100, dead: false, deadT: 0,
      kind: kind || 'ped',
      name: M.pick(NAMES) + ' ' + M.pick(['محمدی', 'احمدی', 'کریمی', 'رضایی', 'موسوی', 'حسینی']),
      target: null, path: null, pathIdx: 0,
      fleeFrom: null, fleeT: 0,
      talkable: kind !== 'vendor',
      helper: Math.random() < 0.06,
      schedule: Math.random(),
    };
    ped.damage = (amount, source) => NPC.damagePed(ped, amount, source);
    ped.fleeFromPoint = (px, pz) => { ped.fleeFrom = new BABYLON.Vector2(px, pz); ped.fleeT = 8; ped.state = 'flee'; };
    NPC.peds.push(ped);
    return ped;
  };

  NPC.removePed = function (p) {
    const i = NPC.peds.indexOf(p);
    if (i >= 0) NPC.peds.splice(i, 1);
    p.root.dispose(false, true);
  };

  NPC.damagePed = function (p, amount, source) {
    if (p.dead) return;
    p.health -= amount;
    // فرار از خطر
    if (source === 'player' && p.pos) p.fleeFromPoint(TC.Player.pos.x, TC.Player.pos.z);
    if (p.health <= 0) {
      p.dead = true;
      p.deadT = 0;
      p.body.rotation.x = 1.5;
      p.root.position.y = 0.3;
      TC.Audio.play3d('voice', p.pos.x, p.pos.z, 0.8);
      if (source === 'player' && TC.Police) TC.Police.reportCrime('assault', p.pos.x, p.pos.z, amount > 60 ? 1.6 : 0.8);
      if (amount > 60 && TC.Missions) TC.Missions.onNpcDeath && TC.Missions.onNpcDeath();
    } else if (Math.random() < 0.6) {
      TC.Audio.play3d('voice', p.pos.x, p.pos.z, 0.5);
    }
  };

  NPC.updatePeds = function (dt) {
    const player = TC.Player;
    for (const p of NPC.peds) {
      if (p.dead) {
        p.deadT += dt;
        if (p.deadT > 25) NPC.removePed(p);
        continue;
      }
      const dPlayer = M.dist2(p.pos.x, p.pos.z, player.pos.x, player.pos.z);
      // فرار
      if (p.state === 'flee' && p.fleeFrom) {
        p.fleeT -= dt;
        const dx = p.pos.x - p.fleeFrom.x, dz = p.pos.z - p.fleeFrom.y;
        const d = Math.hypot(dx, dz) || 1;
        p.yaw = M.lerpAngle(p.yaw, Math.atan2(dx, dz), 0.2);
        p.pos.x += Math.sin(p.yaw) * 5.2 * dt;
        p.pos.z += Math.cos(p.yaw) * 5.2 * dt;
        p.animPhase += dt * 10;
        if (p.fleeT <= 0) { p.state = 'walk'; p.target = null; }
        NPC.animateLimbs(p, 1.2);
      } else if (p.state === 'talk') {
        // رو به بازیکن بایستد
        p.yaw = M.lerpAngle(p.yaw, Math.atan2(player.pos.x - p.pos.x, player.pos.z - p.pos.z), 0.15);
        NPC.animateLimbs(p, 0);
      } else if (dPlayer < 4 && player.currentWeapon !== 'fist' && Math.random() < 0.02) {
        p.fleeFromPoint(player.pos.x, player.pos.z);
      } else {
        // قدم زدن روی پیاده‌رو
        if (!p.target || M.dist2(p.pos.x, p.pos.z, p.target.x, p.target.z) < 3) {
          p.target = TC.NAV.randomSidewalkPoint(p.pos.x, p.pos.z, 4, 70);
        }
        const dx = p.target.x - p.pos.x, dz = p.target.z - p.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const speed = p.kind === 'worker' ? 1.4 : 1.7;
        p.yaw = M.lerpAngle(p.yaw, Math.atan2(dx, dz), 0.1);
        p.pos.x += Math.sin(p.yaw) * speed * dt;
        p.pos.z += Math.cos(p.yaw) * speed * dt;
        p.animPhase += dt * 6;
        NPC.animateLimbs(p, 0.6);
      }
      // برخورد ساده با دیوارها
      if (p.state !== 'dead') {
        const hit = TC.Physics.resolveCircle(p.pos, 0.35, 1.6);
        if (hit && p.target) p.target = null;
        // در آب نیفتد
        if (TC.Physics.isWater(p.pos.x, p.pos.z)) { p.target = null; p.pos.x -= Math.sin(p.yaw) * 3 * dt; p.pos.z -= Math.cos(p.yaw) * 3 * dt; }
      }
      p.root.position.copyFrom(p.pos);
      p.root.rotation.y = p.yaw;
    }
  };

  NPC.animateLimbs = function (p, amt) {
    const s = Math.sin(p.animPhase) * amt;
    p.armL.rotation.x = s;
    p.armR.rotation.x = -s;
    p.legL.rotation.x = -s;
    p.legR.rotation.x = s;
    p.body.position.y = Math.abs(Math.sin(p.animPhase)) * 0.04 * amt;
  };

  /* ---------- ترافیک ---------- */
  NPC.spawnTraffic = function () {
    const player = TC.Player;
    const p = TC.NAV.randomRoadPoint(70, player.pos.x, player.pos.z);
    if (!p) return;
    const defs = ['sedan', 'hatch', 'taxi', 'pickup', 'suv', 'classic', 'ridecar'];
    const def = TC.Vehicles.DEFS[M.pick(defs)];
    const colors = ['#8a9bb0', '#c8b070', '#c0392b', '#3a7a9a', '#5a6a4a', '#2a2e36', '#e8e4d8', '#1a6a8a'];
    // جهت حرکت: به سمت گره بعدی روی جاده
    const a = TC.NAV.nearest(p.x, p.z);
    const adj = TC.NAV.nodes[a].adj;
    const b = M.pick(adj);
    const destNode = M.pick(TC.NAV.nodes).id;
    const lane = 4.2;
    const v = TC.Vehicles.spawn(def, p.x, p.z, {
      ai: { kind: 'traffic', lane, driver: 'npc' },
      color: M.pick(colors),
    });
    v.ai.path = TC.NAV.route(p.x, p.z, TC.NAV.nodes[destNode].x, TC.NAV.nodes[destNode].z, lane);
    v.ai.idx = 1;
    v.ai.targetSpeed = def.top * M.rand(0.5, 0.75);
    v.ai.stunned = 0;
    v.engineOn = true;
    v.ai.update = NPC.updateTrafficAI;
    NPC.traffic.push(v);
  };

  NPC.updateTrafficAI = function (v, dt) {
    const ai = v.ai;
    if (ai.stunned > 0) { ai.stunned -= dt; return { throttle: 0, steer: 0, brake: true }; }
    const player = TC.Player;
    // مسیر
    if (!ai.path || ai.idx >= ai.path.length) {
      const dest = M.pick(TC.NAV.nodes);
      ai.path = TC.NAV.route(v.pos.x, v.pos.z, dest.x, dest.z, ai.lane);
      ai.idx = 1;
    }
    const tp = ai.path[ai.idx];
    const dToTarget = M.dist2(v.pos.x, v.pos.z, tp.x, tp.z);
    if (dToTarget < 8) { ai.idx++; return { throttle: 0.4, steer: 0 }; }
    // فرمان به سمت هدف
    const desiredYaw = Math.atan2(tp.x - v.pos.x, tp.z - v.pos.z);
    const diff = M.angleDiff(v.yaw, desiredYaw);
    const steer = M.clamp(diff * 1.6, -1, 1);
    // سرعت هدف با توجه به پیچ
    let targetSpeed = ai.targetSpeed * M.clamp(1.2 - Math.abs(diff), 0.35, 1);
    // چراغ راهنمایی
    const nextNodeDist = M.dist2(v.pos.x, v.pos.z, TC.NAV.nodes[TC.NAV.nearest(v.pos.x, v.pos.z)].x, TC.NAV.nodes[TC.NAV.nearest(v.pos.x, v.pos.z)].z);
    const tl = TC.Props.trafficLights;
    for (const t of tl) {
      const d = M.dist2(v.pos.x, v.pos.z, t.x, t.z);
      if (d < 14) {
        const dirNS = Math.abs(Math.cos(v.yaw)) > Math.abs(Math.sin(v.yaw));
        const st = TC.Props.lightStateFor(dirNS);
        if (st !== 'green' && d < 11 && d > 5.5) targetSpeed = 0;
        break;
      }
    }
    // مانع جلو: بازیکن/خودرو/عابر
    const aheadX = v.pos.x + Math.sin(v.yaw) * (4 + v.speed * 0.6);
    const aheadZ = v.pos.z + Math.cos(v.yaw) * (4 + v.speed * 0.6);
    if (!TC.Player.inVehicle) {
      const dp = M.dist2(aheadX, aheadZ, player.pos.x, player.pos.z);
      if (dp < 3.4) targetSpeed = 0;
    }
    for (const o of TC.Vehicles.all) {
      if (o === v) continue;
      const d = M.dist2(aheadX, aheadZ, o.pos.x, o.pos.z);
      if (d < 3.6) { targetSpeed = Math.min(targetSpeed, o.speed * 0.8); }
    }
    for (const ped of NPC.peds) {
      if (ped.dead) continue;
      if (M.dist2(aheadX, aheadZ, ped.pos.x, ped.pos.z) < 2.6) targetSpeed = 0;
    }
    const throttle = v.speed < targetSpeed - 0.5 ? M.clamp((targetSpeed - v.speed) / 6, 0.15, 1) : 0;
    const brake = v.speed > targetSpeed + 1.5;
    return { throttle, steer, brake };
  };

  /* مدیریت استخر: اسپاون/حذف بر اساس فاصله */
  NPC.updatePool = function (dt) {
    const player = TC.Player;
    const q = TC.G.quality;
    const pedMax = C.npcCount[q], trafMax = C.trafficCount[q];
    const night = TC.DayNight.isNight();
    const pedTarget = night ? Math.floor(pedMax * 0.4) : pedMax;
    // حذف دورها
    for (let i = NPC.peds.length - 1; i >= 0; i--) {
      const p = NPC.peds[i];
      if (M.dist2(p.pos.x, p.pos.z, player.pos.x, player.pos.z) > 190) NPC.removePed(p);
    }
    for (let i = NPC.traffic.length - 1; i >= 0; i--) {
      const v = NPC.traffic[i];
      if (M.dist2(v.pos.x, v.pos.z, player.pos.x, player.pos.z) > 240) {
        const j = TC.Vehicles.all.indexOf(v);
        if (j >= 0) TC.Vehicles.all.splice(j, 1);
        v.parts.root.dispose(false, true);
        NPC.traffic.splice(i, 1);
      }
    }
    // افزودن نزدیک‌ها
    if (NPC.peds.length < pedTarget) {
      const sp = TC.NAV.randomSidewalkPoint(player.pos.x, player.pos.z, 55, 150);
      NPC.spawnPed(sp.x, sp.z);
    }
    if (NPC.traffic.length < trafMax) {
      NPC.spawnTraffic();
    }
  };

  NPC.applyDensity = function () {
    const q = TC.G.quality;
    while (NPC.peds.length > C.npcCount[q]) NPC.removePed(NPC.peds[NPC.peds.length - 1]);
    while (NPC.traffic.length > C.trafficCount[q]) {
      const v = NPC.traffic.pop();
      const j = TC.Vehicles.all.indexOf(v);
      if (j >= 0) TC.Vehicles.all.splice(j, 1);
      v.parts.root.dispose(false, true);
    }
  };

  /* مکالمه با NPC */
  NPC.talk = function (p) {
    if (!p.talkable || p.dead) return;
    p.state = 'talk';
    setTimeout(() => { if (!p.dead) p.state = 'walk'; }, 4000);
    TC.Audio.play3d('voice', p.pos.x, p.pos.z, 0.7);
    if (p.helper && Math.random() < 0.7) {
      // کمک به شهروند — پاداش کوچک
      TC.ui.dialogue(p.name, M.pick(NPC.helpLines), [
        {
          label: '«حتماً، این راهو برو» (+۵۰ تومان انرژی مثبت!)',
          action: () => {
            TC.Economy.earn(50, 'کمک به شهروند');
            TC.ui.notify('شهروند از کمک شما خوشحال شد', 'success');
            TC.bus.emit('story:helpedCitizen');
          },
        },
        { label: '«ببخشید، عجله دارم»', action: () => { } },
      ]);
      p.helper = false;
    } else {
      TC.ui.dialogue(p.name, M.pick(NPC.lines), [
        { label: 'خداحافظ', action: () => { } },
      ]);
    }
  };

  /* NPCهای ثابت (فروشنده، منشی و…) */
  NPC.spawnSpecial = function (x, z, name, role, color) {
    const p = NPC.spawnPed(x, z, 'vendor');
    p.talkable = false;
    p.state = 'idle';
    p.name = name;
    p.role = role;
    if (color) {
      p.body.material = NPC._matFor(color);
    }
    p.target = null;
    NPC.animateLimbs(p, 0);
    return p;
  };

  NPC.update = function (dt) {
    if (TC.G.state === 'menu') return;
    NPC.updatePeds(dt);
    NPC.updatePool(dt);
  };

  NPC.serialize = function () { return {}; };
  NPC.deserialize = function () { };

  TC.NPC = NPC;
})();
