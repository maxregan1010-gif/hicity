/* ============================================================
 * player.js — شخصیت اصلی «آرش راد»: بدن، انیمیشن، لباس، سلامت، تعامل
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Pl = {
    pos: null, yaw: 0, vel: null,
    health: 100, stamina: 100,
    onGround: true, inVehicle: null,
    mesh: {}, animPhase: 0, state: 'idle',
    walkSpeed: 3.4, runSpeed: 6.8,
    weapons: { fist: true }, currentWeapon: 'fist',
    fireCooldown: 0,
    dead: false,
    arrestState: null,
  };

  /* ---------- ساخت بدن شخصیت ---------- */
  Pl.build = function (spawn) {
    const scene = TC.G.scene;
    Pl.pos = new BABYLON.Vector3(spawn.x, 0, spawn.z);
    Pl.vel = new BABYLON.Vector3(0, 0, 0);
    const root = new BABYLON.TransformNode('playerRoot', scene);
    const body = new BABYLON.TransformNode('playerBody', scene);
    body.parent = root;
    const mat = (n, c) => {
      const m = new BABYLON.StandardMaterial(n, scene);
      m.diffuseColor = BABYLON.Color3.FromHexString(c);
      m.specularColor = new BABYLON.Color3(0.04, 0.04, 0.04);
      return m;
    };
    const skinM = mat('pSkin', '#c98d5f');
    const shirtM = mat('pShirt', '#2a5caa');
    const pantsM = mat('pPants', '#33383f');
    const shoeM = mat('pShoe', '#22252b');
    const hairM = mat('pHair', '#241a12');
    const headM = mat('pHead', '#c98d5f');
    Pl.mats = { skin: skinM, shirt: shirtM, pants: pantsM, shoe: shoeM, hair: hairM, head: headM };

    // تنه
    const torso = BABYLON.MeshBuilder.CreateCapsule('pTorso', { height: 0.72, radius: 0.24, tessellation: 8 }, scene);
    torso.material = shirtM;
    torso.position.y = 1.12;
    torso.parent = body;
    // شانه‌ها
    const shoulders = BABYLON.MeshBuilder.CreateBox('pShoulder', { width: 0.56, height: 0.16, depth: 0.22 }, scene);
    shoulders.material = shirtM;
    shoulders.position.y = 1.44;
    shoulders.parent = body;
    // گردن و سر
    const neck = BABYLON.MeshBuilder.CreateCylinder('pNeck', { diameter: 0.13, height: 0.12 }, scene);
    neck.material = skinM;
    neck.position.y = 1.54;
    neck.parent = body;
    const head = BABYLON.MeshBuilder.CreateSphere('pHead', { diameter: 0.34, segments: 8 }, scene);
    head.material = headM;
    head.scaling.y = 1.18;
    head.position.y = 1.76;
    head.parent = body;
    const hair = BABYLON.MeshBuilder.CreateSphere('pHair', { diameter: 0.36, segments: 8 }, scene);
    hair.material = hairM;
    hair.scaling.y = 0.9;
    hair.position.y = 1.86;
    hair.parent = body;
    // صورت: چشم و بینی — رو به جلو (+z؛ جهت حرکت کاراکتر)
    const eyeM = mat('pEye', '#1a1a22');
    const eyeL = BABYLON.MeshBuilder.CreateSphere('pEyeL', { diameter: 0.05, segments: 4 }, scene);
    eyeL.material = eyeM; eyeL.position.set(-0.07, 1.78, 0.155); eyeL.parent = body;
    const eyeR = eyeL.clone('pEyeR'); eyeR.position.set(0.07, 1.78, 0.155);
    const nose = BABYLON.MeshBuilder.CreateSphere('pNose', { diameter: 0.06, segments: 4 }, scene);
    nose.material = skinM; nose.position.set(0, 1.72, 0.17); nose.parent = body;
    // دست‌ها — با پیوت شانه
    function makeArm(side) {
      const pivot = new BABYLON.TransformNode('pArmP' + side, scene);
      pivot.parent = body;
      pivot.position.set(side * 0.31, 1.42, 0);
      const upper = BABYLON.MeshBuilder.CreateCapsule('pArm' + side, { height: 0.62, radius: 0.085, tessellation: 6 }, scene);
      upper.material = shirtM;
      upper.position.y = -0.31;
      upper.parent = pivot;
      const hand = BABYLON.MeshBuilder.CreateSphere('pHand' + side, { diameter: 0.13, segments: 5 }, scene);
      hand.material = skinM;
      hand.position.y = -0.66;
      hand.parent = pivot;
      return pivot;
    }
    const armL = makeArm(-1), armR = makeArm(1);
    // پاها — با پیوت لگن
    function makeLeg(side) {
      const pivot = new BABYLON.TransformNode('pLegP' + side, scene);
      pivot.parent = body;
      pivot.position.set(side * 0.13, 0.78, 0);
      const leg = BABYLON.MeshBuilder.CreateCapsule('pLeg' + side, { height: 0.72, radius: 0.1, tessellation: 6 }, scene);
      leg.material = pantsM;
      leg.position.y = -0.36;
      leg.parent = pivot;
      const foot = BABYLON.MeshBuilder.CreateBox('pFoot' + side, { width: 0.15, height: 0.12, depth: 0.3 }, scene);
      foot.material = shoeM;
      foot.position.set(0, -0.74, 0.06); // پنجه کفش رو به جلو (+z)
      foot.parent = pivot;
      return pivot;
    }
    const legL = makeLeg(-1), legR = makeLeg(1);
    // کلاه و عینک و اکسسوری (پیش‌فرض مخفی)
    const hatCap = BABYLON.MeshBuilder.CreateCylinder('pHatCap', { diameter: 0.4, height: 0.14, tessellation: 10 }, scene);
    hatCap.material = mat('pHatM', '#c0392b');
    hatCap.position.y = 1.98; hatCap.parent = body; hatCap.isVisible = false;
    const hatPeak = BABYLON.MeshBuilder.CreateBox('pHatPeak', { width: 0.34, height: 0.04, depth: 0.2 }, scene);
    hatPeak.material = hatCap.material;
    hatPeak.position.set(0, 1.94, 0.26); hatPeak.parent = body; hatPeak.isVisible = false; // لبه کلاه رو به جلو
    const hatBeanie = BABYLON.MeshBuilder.CreateSphere('pHatBeanie', { diameter: 0.37, segments: 8 }, scene);
    hatBeanie.material = hatCap.material;
    hatBeanie.scaling.y = 0.75; hatBeanie.position.y = 1.96; hatBeanie.parent = body; hatBeanie.isVisible = false;
    const glasses = BABYLON.MeshBuilder.CreateTorus('pGlasses', { diameter: 0.3, thickness: 0.025, tessellation: 8 }, scene);
    glasses.material = mat('pGlassM', '#181820');
    glasses.position.set(0, 1.79, 0.14);
    glasses.rotation.x = Math.PI / 2;
    glasses.scaling.y = 0.7;
    glasses.parent = body; glasses.isVisible = false;
    const watch = BABYLON.MeshBuilder.CreateTorus('pWatch', { diameter: 0.11, thickness: 0.03, tessellation: 8 }, scene);
    watch.material = mat('pWatchM', '#d8d8e0');
    watch.position.set(-0.31, 0.95, 0);
    watch.rotation.x = Math.PI / 2;
    watch.parent = body; watch.isVisible = false;
    const phoneM = BABYLON.MeshBuilder.CreateBox('pPhone', { width: 0.08, height: 0.16, depth: 0.02 }, scene);
    phoneM.material = mat('pPhoneM', '#1a2a40');
    phoneM.parent = body; phoneM.isVisible = false;
    Pl.phoneMesh = phoneM;

    Pl.mesh = { root, body, torso, head, hair, armL, armR, legL, legR, hatCap, hatPeak, hatBeanie, glasses, watch };
    const parts = [torso, shoulders, neck, head, hair, eyeL, eyeR, nose, hatCap, hatPeak, hatBeanie, glasses, watch,
      ...Pl.mesh.armL.getChildren(), ...Pl.mesh.armR.getChildren(), ...Pl.mesh.legL.getChildren(), ...Pl.mesh.legR.getChildren()];
    Pl.allMeshes = parts.filter(p => p.getClassName && p.getClassName() === 'Mesh');
    Pl.mesh.torso.receiveShadows = true;
    Pl.mesh.head.receiveShadows = true;
    if (TC.Engine.shadowEnabled) {
      TC.Engine.sg.addShadowCaster(torso);
      TC.Engine.sg.addShadowCaster(head);
      TC.Engine.sg.addShadowCaster(Pl.mesh.legL.getChildren()[0]);
      TC.Engine.sg.addShadowCaster(Pl.mesh.legR.getChildren()[0]);
    }
  };

  /* ---------- لباس ---------- */
  Pl.applyClothes = function (clothes) {
    // clothes: {shirt: colorHex, pants: colorHex, shoes: colorHex, hat: 'none'|'cap'|'beanie'|color, glasses: bool, watch: bool}
    if (!Pl.mats) return;
    const c = clothes || {};
    if (c.shirt) Pl.mats.shirt.diffuseColor = BABYLON.Color3.FromHexString(c.shirt);
    if (c.pants) Pl.mats.pants.diffuseColor = BABYLON.Color3.FromHexString(c.pants);
    if (c.shoes) Pl.mats.shoe.diffuseColor = BABYLON.Color3.FromHexString(c.shoes);
    if (c.hair) Pl.mats.hair.diffuseColor = BABYLON.Color3.FromHexString(c.hair);
    // کلاه
    const hat = c.hat || 'none';
    const isCap = hat === 'cap', isBeanie = hat === 'beanie';
    Pl.mesh.hatCap.isVisible = isCap;
    Pl.mesh.hatPeak.isVisible = isCap;
    Pl.mesh.hatBeanie.isVisible = isBeanie;
    if (c.hatColor) Pl.mesh.hatCap.material.diffuseColor = BABYLON.Color3.FromHexString(c.hatColor);
    Pl.mesh.glasses.isVisible = !!c.glasses;
    Pl.mesh.watch.isVisible = !!c.watch;
  };
  Pl.defaultClothes = () => ({ shirt: '#2a5caa', pants: '#33383f', shoes: '#22252b', hair: '#241a12', hat: 'none', glasses: false, watch: false });

  /* ---------- حرکت و فیزیک ---------- */
  Pl.update = function (dt) {
    if (Pl.dead) return;
    const V = TC.Virtual;
    // داخل خودرو؟ حرکت توسط خودرو انجام می‌شود
    if (Pl.inVehicle) {
      Pl.updateVehiclePose(dt);
      Pl.fireCooldown -= dt;
      Pl.regenStamina(dt, true);
      return;
    }
    // ورودی حرکت نسبت به دوربین
    let mx = V.moveX, mz = V.moveY;
    const mag = Math.hypot(mx, mz);
    const cam = TC.Engine.camera;
    let moving = mag > 0.08;
    if (moving) {
      // جهت دوربین
      const fw = cam.getDirection(BABYLON.Axis.Z); fw.y = 0; fw.normalize();
      const rt = cam.getDirection(BABYLON.Axis.X); rt.y = 0; rt.normalize();
      const dirX = rt.x * mx + fw.x * mz;
      const dirZ = rt.z * mx + fw.z * mz;
      const dl = Math.hypot(dirX, dirZ) || 1;
      // دویدن با استقامت
      const wantRun = (V.run || (V.runHeld === true)) && Pl.stamina > 2;
      const speed = wantRun ? Pl.runSpeed : Pl.walkSpeed;
      Pl.vel.x = M.damp(Pl.vel.x, (dirX / dl) * speed * Math.min(1, mag), 12, dt);
      Pl.vel.z = M.damp(Pl.vel.z, (dirZ / dl) * speed * Math.min(1, mag), 12, dt);
      Pl.yaw = M.lerpAngle(Pl.yaw, Math.atan2(Pl.vel.x, Pl.vel.z), 1 - Math.exp(-14 * dt));
      Pl.state = wantRun ? 'run' : 'walk';
      // مصرف استقامت
      if (wantRun) {
        Pl.stamina = Math.max(0, Pl.stamina - dt * 11);
      }
      // صدا
      Pl._stepT = (Pl._stepT || 0) + speed * dt;
      if (Pl._stepT > 1.55) {
        Pl._stepT = 0;
        TC.Audio.footstep(wantRun);
      }
    } else {
      Pl.vel.x = M.damp(Pl.vel.x, 0, 14, dt);
      Pl.vel.z = M.damp(Pl.vel.z, 0, 14, dt);
      Pl.state = 'idle';
    }
    Pl.regenStamina(dt, false);
    // پرش
    if (V.jump && Pl.onGround) {
      Pl.vel.y = 5.6;
      Pl.onGround = false;
      Pl.state = 'jump';
      TC.bus.emit('player:jump');
    }
    V.jump = false;
    // گرانش
    Pl.vel.y -= 15 * dt;
    // حرکت
    Pl.pos.x += Pl.vel.x * dt;
    Pl.pos.z += Pl.vel.z * dt;
    Pl.pos.y += Pl.vel.y * dt;
    // زمین
    const gh = TC.Physics.groundHeight(Pl.pos.x, Pl.pos.z, Pl.pos.y);
    if (Pl.pos.y <= gh + 0.01 && Pl.vel.y <= 0) {
      if (!Pl.onGround && Pl.vel.y < -9) {
        const dmg = (-Pl.vel.y - 9) * 5;
        if (dmg > 4) Pl.damage(dmg, 'سقوط');
      }
      Pl.pos.y = gh;
      Pl.vel.y = 0;
      Pl.onGround = true;
    } else if (Pl.pos.y > gh + 0.05) {
      Pl.onGround = false;
    }
    // برخورد با دیوارها
    TC.Physics.resolveCircle(Pl.pos, 0.42, 1.7);
    // محدوده جهان
    const lim = 1400;
    Pl.pos.x = M.clamp(Pl.pos.x, -lim, lim);
    Pl.pos.z = M.clamp(Pl.pos.z, -lim, lim);
    // در آب؟
    if (TC.Physics.isWater(Pl.pos.x, Pl.pos.z)) {
      // شنا ساده: شناور ماندن
      if (Pl.pos.y < TC.CONFIG.waterLevel + 0.4) {
        Pl.pos.y = TC.CONFIG.waterLevel + 0.4;
        Pl.vel.y = 0;
        Pl.onGround = false;
        Pl.state = 'swim';
        Pl.stamina = Math.max(0, Pl.stamina - dt * 4);
      }
    }
    // خشک شدن ناگهانی خارج آب: هیچ — برمی‌گردد روی زمین با گرانش
    // انیمیشن
    Pl.animate(dt);
    // اعمال روی مش
    Pl.mesh.root.position.copyFrom(Pl.pos);
    Pl.mesh.body.rotation.y = Pl.yaw;
    Pl.checkInteract();
    // شلیک
    Pl.fireCooldown -= dt;
    if (V.fire && Pl.currentWeapon !== 'fist') Pl.tryShoot();
    // اسپری خون؟ نه — ساده
  };

  Pl.regenStamina = function (dt, resting) {
    if (resting || Pl.state === 'idle' || Pl.state === 'walk') {
      Pl.stamina = Math.min(100, Pl.stamina + dt * (resting ? 9 : 5));
    }
    Pl.health = Math.min(100, Pl.health + dt * (Pl.health < 100 && Pl.state !== 'run' ? 0.4 : 0));
  };

  Pl.animate = function (dt) {
    const mp = Pl.mesh;
    const sp = Math.hypot(Pl.vel.x, Pl.vel.z);
    if (Pl.state === 'walk' || Pl.state === 'run') {
      Pl.animPhase += dt * (4.5 + sp * 1.35);
      const swing = Math.sin(Pl.animPhase) * (Pl.state === 'run' ? 1.0 : 0.62);
      mp.armL.rotation.x = swing * 0.8;
      mp.armR.rotation.x = -swing * 0.8;
      mp.legL.rotation.x = -swing;
      mp.legR.rotation.x = swing;
      mp.body.position.y = Math.abs(Math.sin(Pl.animPhase)) * 0.05;
    } else if (Pl.state === 'jump' || !Pl.onGround) {
      mp.armL.rotation.x = -2.4; mp.armR.rotation.x = -2.4;
      mp.legL.rotation.x = -0.5; mp.legR.rotation.x = 0.3;
    } else if (Pl.state === 'swim') {
      Pl.animPhase += dt * 5;
      const s = Math.sin(Pl.animPhase);
      mp.armL.rotation.x = -2.2 + s * 0.7; mp.armR.rotation.x = -2.2 - s * 0.7;
      mp.legL.rotation.x = s * 0.5; mp.legR.rotation.x = -s * 0.5;
      mp.body.rotation.x = 1.2;
      mp.body.position.y = -0.5;
    } else {
      // ایستادن — نفس کشیدن
      Pl.animPhase += dt * 1.7;
      const b = Math.sin(Pl.animPhase) * 0.045;
      mp.armL.rotation.x = M.damp(mp.armL.rotation.x, b, 8, dt);
      mp.armR.rotation.x = M.damp(mp.armR.rotation.x, -b, 8, dt);
      mp.legL.rotation.x = M.damp(mp.legL.rotation.x, 0, 8, dt);
      mp.legR.rotation.x = M.damp(mp.legR.rotation.x, 0, 8, dt);
      mp.body.position.y = b * 0.4;
    }
    if (Pl.state !== 'swim') mp.body.rotation.x = M.damp(mp.body.rotation.x, 0, 8, dt);
  };

  /* نشستن در خودرو/موتور */
  Pl.updateVehiclePose = function (dt) {
    const v = Pl.inVehicle;
    if (!v || !v.pos) return;
    const mp = Pl.mesh;
    if (v.def.type === 'motorcycle' || v.def.type === 'bicycle') {
      mp.root.setEnabled(true);
      mp.root.position.set(v.pos.x, v.pos.y + 0.45, v.pos.z);
      mp.root.rotation.y = v.yaw;
      mp.body.rotation.y = 0;
      mp.body.rotation.x = 0.25;
      mp.legL.rotation.x = -1.3; mp.legR.rotation.x = -1.1;
      mp.armL.rotation.x = -1.1; mp.armR.rotation.x = -1.1;
    } else {
      mp.root.setEnabled(false);
    }
  };

  /* ---------- آسیب و مرگ ---------- */
  Pl.damage = function (amount, source) {
    if (Pl.dead || TC.G.state === 'jail') return;
    Pl.health = Math.max(0, Pl.health - amount);
    TC.bus.emit('player:damaged', { amount, source });
    if (Pl.health <= 0) Pl.die(source);
  };
  Pl.die = function (source) {
    if (Pl.dead) return;
    Pl.dead = true;
    TC.Audio.jingle('fail');
    TC.ui && TC.ui.notify('بازگشت به بیمارستان…', 'error');
    // انیمیشن افتادن
    Pl.mesh.body.rotation.x = 1.5;
    setTimeout(() => Pl.respawnHospital(), 2600);
  };
  Pl.respawnHospital = function () {
    const h = TC.World.hospitalRoom;
    const fee = Math.min(600, Math.max(100, Math.round((100 - Pl.health) * 5) + 200));
    if (TC.Economy) TC.Economy.spend(fee, 'هزینه درمان بیمارستان');
    Pl.health = 100;
    Pl.stamina = 100;
    Pl.dead = false;
    Pl.mesh.body.rotation.x = 0;
    if (h) Pl.pos = new BABYLON.Vector3(h.doorPos.x, 0, h.doorPos.z + 3);
    if (TC.Police) TC.Police.clearWanted();
    TC.bus.emit('player:respawn');
  };

  /* ---------- تعامل ---------- */
  Pl.checkInteract = function () {
    let best = null, bd = Infinity;
    for (const it of TC.G.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = M.dist2(Pl.pos.x, Pl.pos.z, it.x, it.z);
      if (d < it.radius && d < bd) { bd = d; best = it; }
    }
    Pl.nearInteract = best;
    // نمایش راهنما در HUD
    if (TC.HUD) TC.HUD.setInteract(best);
  };
  Pl.doInteract = function () {
    if (Pl.nearInteract) {
      TC.Audio.jingle('click');
      Pl.nearInteract.action();
    }
  };

  /* ---------- سلاح ---------- */
  Pl.setWeapon = function (id) {
    if (id !== 'fist' && !(TC.Inventory && TC.Inventory.has(id))) return;
    Pl.currentWeapon = id;
    TC.bus.emit('player:weapon', id);
  };
  Pl.tryShoot = function () {
    if (Pl.fireCooldown > 0) return;
    const w = Pl.currentWeapon;
    const spec = { bat: { cd: 0.7, dmg: 22, range: 2.4, melee: true }, pistol: { cd: 0.42, dmg: 30, range: 60 } }[w];
    if (!spec) return;
    if (TC.Inventory && !TC.Inventory.useAmmo(w)) { Pl.setWeapon('fist'); return; }
    Pl.fireCooldown = spec.cd;
    // جهت دوربین
    const cam = TC.Engine.camera;
    const dir = cam.getDirection(BABYLON.Axis.Z);
    dir.y = 0; dir.normalize();
    const ox = Pl.pos.x + dir.x * 0.5, oz = Pl.pos.z + dir.z * 0.5;
    TC.Audio.play3d('shoot', ox, oz, 1);
    if (spec.melee) {
      // ضربه نزدیک: نزدیک‌ترین NPC در جلو
      for (const p of TC.Pedestrians) {
        if (p.dead) continue;
        const d = M.dist2(p.pos.x, p.pos.z, ox, oz);
        if (d < spec.range) {
          const dot = ((p.pos.x - ox) * dir.x + (p.pos.z - oz) * dir.z) / (d || 1);
          if (dot > 0.4) {
            p.damage(spec.dmg, 'player');
            TC.Police && TC.Police.reportCrime('assault', Pl.pos.x, Pl.pos.z);
            break;
          }
        }
      }
    } else {
      // شلیک: برخورد با NPC یا دیوار
      let hit = null, hd = Infinity;
      for (const p of TC.Pedestrians) {
        if (p.dead) continue;
        const d = M.dist2(p.pos.x, p.pos.z, ox, oz);
        const dot = ((p.pos.x - ox) * dir.x + (p.pos.z - oz) * dir.z) / (d || 1);
        if (d < spec.range && dot > 0.92 && d < hd) { hit = p; hd = d; }
      }
      for (const u of TC.PoliceUnits) {
        if (u.dead || !u.ped) continue;
        const d = M.dist2(u.pos.x, u.pos.z, ox, oz);
        const dot = ((u.pos.x - ox) * dir.x + (u.pos.z - oz) * dir.z) / (d || 1);
        if (d < spec.range && dot > 0.92 && d < hd) { hit = u.ped; hd = d; }
      }
      if (hit && !TC.Physics.hasWallBetween(ox, oz, hit.pos.x, hit.pos.z)) {
        hit.damage(spec.dmg, 'player');
        TC.Police && TC.Police.reportCrime('shoot', Pl.pos.x, Pl.pos.z);
      } else {
        TC.Police && TC.Police.reportCrime('shoot', Pl.pos.x, Pl.pos.z, 0.4);
      }
    }
  };

  /* ---------- ورود/خروج خودرو ( توسط vehicles.js مدیریت می‌شود) ---------- */
  Pl.enterVehicle = function (v) {
    Pl.inVehicle = v;
    TC.ActiveVehicle = v;
    TC.Audio.engineStart(v.def.sound);
    Pl.mesh.root.setEnabled(false);
    if (v.def.type !== 'motorcycle' && v.def.type !== 'bicycle') Pl.mesh.root.setEnabled(false);
    else Pl.mesh.root.setEnabled(true);
    TC.bus.emit('player:enterVehicle', v);
  };
  Pl.exitVehicle = function () {
    const v = Pl.inVehicle;
    if (!v) return;
    Pl.inVehicle = null;
    TC.ActiveVehicle = null;
    TC.Audio.engineStop();
    TC.Audio.skid(false);
    // خروج سمت چپ خودرو
    const side = v.yaw + Math.PI / 2;
    Pl.pos.set(v.pos.x + Math.sin(side) * 2.4, 0, v.pos.z + Math.cos(side) * 2.4);
    TC.Physics.resolveCircle(Pl.pos, 0.42, 1.7);
    Pl.vel.setAll(0);
    Pl.mesh.root.setEnabled(true);
    Pl.mesh.body.rotation.x = 0;
    if (TC.Mobile && TC.Mobile.active) TC.Mobile.rebuildButtons();
    TC.bus.emit('player:exitVehicle', v);
  };

  /* ---------- ذخیره/بارگذاری ---------- */
  Pl.serialize = function () {
    return {
      x: Pl.pos.x, y: Pl.pos.y, z: Pl.pos.z, yaw: Pl.yaw,
      health: Pl.health, stamina: Pl.stamina,
      weapon: Pl.currentWeapon,
      clothes: TC.Inventory ? TC.Inventory.data.clothesEquipped : Pl.defaultClothes(),
    };
  };
  Pl.deserialize = function (d) {
    if (!d) return;
    Pl.pos = new BABYLON.Vector3(d.x, d.y || 0, d.z);
    Pl.yaw = d.yaw || 0;
    Pl.health = d.health !== undefined ? d.health : 100;
    Pl.stamina = d.stamina !== undefined ? d.stamina : 100;
    Pl.currentWeapon = d.weapon || 'fist';
    Pl.applyClothes(d.clothes);
  };

  TC.Player = Pl;
})();
