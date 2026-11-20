/* ============================================================
 * worldProps.js — عناصر محیطی: درخت، چراغ خیابان، چراغ راهنمایی،
 * نیمکت، سطل زباله، ایستگاه اتوبوس، تابلو، خودروهای پارک‌شده
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  const P = { templates: {} };

  /* یک مش الگو می‌سازد و با thin instance ها تکثیر می‌کند (Float32Array + فرزندان الگو) */
  function thinClone(template, spots, name) {
    if (!spots.length) return null;
    const buf = new Float32Array(spots.length * 16);
    spots.forEach((s, i) => {
      const sc = s.s ? new BABYLON.Vector3(s.s, s.s, s.s) : BABYLON.Vector3.One();
      const m = BABYLON.Matrix.Compose(
        sc,
        BABYLON.Quaternion.RotationYawPitchRoll(s.ry || 0, 0, 0),
        new BABYLON.Vector3(s.x, s.y || 0, s.z)
      );
      m.copyToArray(buf, i * 16);
    });
    template.thinInstanceSetBuffer('matrix', buf, 16, true);
    template.thinInstanceRefreshBoundingInfo(true);
    template.freezeWorldMatrix();
    template.isPickable = false;
    // فرزندان الگو (درِ دوبین، گلِ گلدان و…) هم با همان ماتریس‌ها تکثیر شوند
    for (const child of [...template.getChildren()]) {
      if (!child.getClassName || child.getClassName() !== 'Mesh') continue;
      const cBuf = new Float32Array(spots.length * 16);
      spots.forEach((s, i) => {
        const k = s.s || 1;
        const m = BABYLON.Matrix.Compose(
          s.s ? new BABYLON.Vector3(k, k, k) : BABYLON.Vector3.One(),
          BABYLON.Quaternion.RotationYawPitchRoll(s.ry || 0, 0, 0),
          new BABYLON.Vector3(s.x + child.position.x * k, (s.y || 0) + child.position.y * k, s.z + child.position.z * k)
        );
        m.copyToArray(cBuf, i * 16);
      });
      child.setParent(null);
      child.thinInstanceSetBuffer('matrix', cBuf, 16, true);
      child.thinInstanceRefreshBoundingInfo(true);
      child.freezeWorldMatrix();
      child.isPickable = false;
    }
    return template;
  }

  P.build = function () {
    const scene = TC.G.scene;
    const N = C.cityBlocks, half = (N * C.blockPitch) / 2;
    M.resetSeed(4242);

    /* ---------- درخت‌ها ---------- */
    const trunk = BABYLON.MeshBuilder.CreateCylinder('trunk', { diameterTop: 0.5, diameterBottom: 0.7, height: 3.4, tessellation: 6 }, scene);
    const trunkMat = new BABYLON.StandardMaterial('trunkM', scene);
    trunkMat.diffuseColor = BABYLON.Color3.FromHexString('#5a4030');
    trunkMat.specularColor = BABYLON.Color3.Black();
    trunkMat.freeze();
    trunk.material = trunkMat;
    const leaves = BABYLON.MeshBuilder.CreateSphere('leaves', { diameter: 5.2, segments: 6 }, scene);
    leaves.position.y = 4.6;
    leaves.scaling.y = 1.2;
    const leavesMat = new BABYLON.StandardMaterial('leavesM', scene);
    leavesMat.diffuseColor = BABYLON.Color3.FromHexString('#3a7a32');
    leavesMat.specularColor = BABYLON.Color3.Black();
    leavesMat.freeze();
    leaves.material = leavesMat;
    const palm = BABYLON.MeshBuilder.CreateCylinder('palm', { diameterTop: 0.4, diameterBottom: 0.55, height: 6.5, tessellation: 6 }, scene);
    palm.bakeCurrentTransformIntoVertices();
    palm.material = trunkMat;
    const palmTop = BABYLON.MeshBuilder.CreateSphere('palmTop', { diameter: 3.4, segments: 5 }, scene);
    palmTop.position.y = 7;
    palmTop.scaling.y = 0.5;
    palmTop.material = leavesMat;
    const bush = BABYLON.MeshBuilder.CreateSphere('bush', { diameter: 2.2, segments: 5 }, scene);
    bush.material = leavesMat;

    const treeSpots = [], palmSpots = [], bushSpots = [];
    // درخت در خیابان‌های شهری هر ۴۰ متر
    for (let i = 0; i <= N; i++) {
      for (let d = -half + 20; d < half - 10; d += 42) {
        for (const s of [-1, 1]) {
          const swOff = C.roadHalf + C.sidewalkW * 0.55;
          if ((i + Math.round(d / 42)) % 2 === 0) {
            treeSpots.push({ x: TC.roadCoord(i) + swOff * s, z: d + M.srand() * 6, ry: M.srand() * 3 });
            treeSpots.push({ x: d + M.srand() * 6, z: TC.roadCoord(i) + swOff * s, ry: M.srand() * 3 });
          }
        }
      }
    }
    // جنگل شمال غرب
    for (let i = 0; i < 160; i++) {
      const fx = -half - 60 - M.srand() * 420, fz = -half - 120 - M.srand() * 420;
      if (Math.abs(fx) > 1800 || Math.abs(fz) > 1800) continue;
      treeSpots.push({ x: fx, z: fz, ry: M.srand() * 3, s: 0.8 + M.srand() * 0.7 });
    }
    // پارک بهاران
    const parkC = TC.blockCenter(2, 1), parkC2 = TC.blockCenter(3, 2);
    for (let i = 0; i < 26; i++) {
      treeSpots.push({ x: parkC.x + (M.srand() - 0.5) * 40, z: parkC.z + (M.srand() - 0.5) * 40, ry: M.srand() * 3 });
      treeSpots.push({ x: parkC2.x + (M.srand() - 0.5) * 40, z: parkC2.z + (M.srand() - 0.5) * 40, ry: M.srand() * 3 });
      bushSpots.push({ x: parkC.x + (M.srand() - 0.5) * 44, z: parkC.z + (M.srand() - 0.5) * 44 });
    }
    // نخل‌های ساحل
    for (let i = 0; i < 30; i++) {
      palmSpots.push({ x: -half - 60 - M.srand() * 70, z: -100 + M.srand() * (half * 2 + 150), ry: M.srand() * 3 });
      palmSpots.push({ x: -200 + M.srand() * (half * 2), z: half + 60 + M.srand() * 60, ry: M.srand() * 3 });
    }
    // درخت کنار جاده روستایی
    for (let i = 0; i < 40; i++) {
      treeSpots.push({ x: (M.srand() - 0.5) * 90, z: -half - 60 - M.srand() * 160, ry: M.srand() * 3 });
    }
    thinClone(trunk, treeSpots, 'trunks');
    thinClone(leaves, treeSpots, 'leavesAll');
    thinClone(palm, palmSpots, 'palms');
    thinClone(palmTop, palmSpots, 'palmTops');
    thinClone(bush, bushSpots, 'bushes');
    // برخورد درخت‌ها فقط تعداد محدود (نزدیک جاده) — برای عملکرد از برخورد صرف‌نظر و فقط پارک‌ها قلم می‌خورند
    for (const s of bushSpots) TC.Physics.addBox(s.x, s.z, 2, 2, 1.2, 0, 'bush');

    /* ---------- چراغ خیابان ---------- */
    const pole = BABYLON.MeshBuilder.CreateCylinder('pole', { diameter: 0.22, height: 7, tessellation: 6 }, scene);
    const poleMat = new BABYLON.StandardMaterial('poleM', scene);
    poleMat.diffuseColor = BABYLON.Color3.FromHexString('#4a5058');
    poleMat.specularColor = BABYLON.Color3.Black();
    poleMat.freeze();
    pole.material = poleMat;
    const lampHead = BABYLON.MeshBuilder.CreateBox('lampHead', { width: 1.6, height: 0.25, depth: 0.7 }, scene);
    lampHead.material = poleMat;
    const lampBulb = BABYLON.MeshBuilder.CreateSphere('lampBulb', { diameter: 0.5, segments: 6 }, scene);
    lampBulb.material = TC.World.mats.lampGlow;
    const poleSpots = [];
    for (let i = 0; i <= N; i++) {
      for (let d = -half + 16; d < half; d += 34) {
        const swOff = C.roadHalf + 1.2;
        poleSpots.push({ x: TC.roadCoord(i) + swOff, z: d, ry: Math.PI / 2 });
        poleSpots.push({ x: TC.roadCoord(i) - swOff, z: d + 17, ry: -Math.PI / 2 });
        poleSpots.push({ x: d, z: TC.roadCoord(i) + swOff, ry: 0 });
        poleSpots.push({ x: d + 17, z: TC.roadCoord(i) - swOff, ry: Math.PI });
      }
    }
    thinClone(pole, poleSpots, 'poles');
    const armSpots = poleSpots.map(s => ({ x: s.x + Math.sin(s.ry) * 0.8, z: s.z + Math.cos(s.ry) * 0.8, y: 7, ry: s.ry }));
    thinClone(lampHead, armSpots, 'lampArms');
    const bulbSpots = armSpots.map(s => ({ x: s.x + Math.sin(s.ry) * 0.8, z: s.z + Math.cos(s.ry) * 0.8, y: 6.8, ry: 0 }));
    thinClone(lampBulb, bulbSpots, 'lampBulbs');
    TC.World.lampBulbs = bulbSpots; // برای روشن شدن شبانه (متریال مشترک)
    P.lampPositions = bulbSpots;

    /* ---------- چراغ راهنمایی ---------- */
    P.trafficLights = [];
    const tlMatPole = poleMat;
    const lensR = new BABYLON.StandardMaterial('lensR', scene);
    lensR.diffuseColor = new BABYLON.Color3(0.2, 0.02, 0.02); lensR.emissiveColor = BABYLON.Color3.Black(); lensR.specularColor = BABYLON.Color3.Black(); lensR.freeze();
    const lensG = new BABYLON.StandardMaterial('lensG', scene);
    lensG.diffuseColor = new BABYLON.Color3(0.02, 0.2, 0.05); lensG.emissiveColor = BABYLON.Color3.Black(); lensG.specularColor = BABYLON.Color3.Black(); lensG.freeze();
    const lensY = new BABYLON.StandardMaterial('lensY', scene);
    lensY.diffuseColor = new BABYLON.Color3(0.25, 0.15, 0.02); lensY.emissiveColor = BABYLON.Color3.Black(); lensY.specularColor = BABYLON.Color3.Black(); lensY.freeze();
    const boxT = BABYLON.MeshBuilder.CreateBox('tlBox', { width: 0.5, height: 1.5, depth: 0.4 }, scene);
    boxT.material = tlMatPole;
    const lensT = BABYLON.MeshBuilder.CreateSphere('tlLens', { diameter: 0.3, segments: 6 }, scene);
    lensT.material = lensR;
    // تقاطع‌های مرکزی شهر (۵×۵ مرکز)
    const c0 = Math.floor(N / 2);
    for (let i = c0 - 2; i <= c0 + 3; i++) {
      for (let j = c0 - 2; j <= c0 + 3; j++) {
        const x = TC.roadCoord(i), z = TC.roadCoord(j);
        for (const s of [-1, 1]) {
          const px = x + s * (C.roadHalf + 1), pz = z + s * (C.roadHalf + 1);
          const base = BABYLON.MeshBuilder.CreateCylinder('tlPole', { diameter: 0.2, height: 5.5, tessellation: 6 }, scene);
          base.material = tlMatPole;
          base.position.set(px, 2.75, pz);
          base.freezeWorldMatrix();
          const bx = boxT.createInstance('tlB');
          bx.position.set(px, 6, pz);
          bx.rotation.y = Math.PI / 2;
          const lens = lensT.createInstance('tlL');
          lens.position.set(px, 6.4, pz + 0.25);
          const light = {
            x: px, z: pz, lens, state: 'green',
            mats: { red: lensR, green: lensG, yellow: lensY },
            axis: s > 0 ? 'ew' : 'ns',
          };
          P.trafficLights.push(light);
          TC.Physics.addBox(px, pz, 0.25, 0.25, 5.5, 0, 'tlPole');
        }
      }
    }
    P.lensRed = lensR; P.lensGreen = lensG; P.lensYellow = lensY;
    TC.World.nightMats.push(lensR, lensG, lensY);

    /* ---------- نیمکت، سطل، ایستگاه اتوبوس، تابلو ---------- */
    const benchMat = TC.World.mats.wood;
    const bench = BABYLON.MeshBuilder.CreateBox('bench', { width: 2.2, height: 0.55, depth: 0.7 }, scene);
    bench.material = benchMat;
    const trash = BABYLON.MeshBuilder.CreateCylinder('trash', { diameterTop: 0.5, diameterBottom: 0.4, height: 1, tessellation: 8 }, scene);
    const trashMat = new BABYLON.StandardMaterial('trashM', scene);
    trashMat.diffuseColor = BABYLON.Color3.FromHexString('#3e6b4f');
    trashMat.specularColor = BABYLON.Color3.Black();
    trashMat.freeze();
    trash.material = trashMat;
    const benchSpots = [], trashSpots = [];
    for (let i = 0; i <= N; i++) {
      for (let d = -half + 30; d < half - 20; d += 60) {
        const swOff = C.roadHalf + C.sidewalkW * 0.6;
        if ((i * 7 + Math.round(d / 60)) % 3 === 0) benchSpots.push({ x: TC.roadCoord(i) + swOff, z: d, ry: Math.PI / 2 });
        if ((i * 5 + Math.round(d / 60)) % 4 === 1) trashSpots.push({ x: TC.roadCoord(i) - swOff, z: d + 8 });
        if ((i * 3 + Math.round(d / 60)) % 4 === 2) benchSpots.push({ x: d, z: TC.roadCoord(i) - swOff, ry: 0 });
        if ((i * 2 + Math.round(d / 60)) % 5 === 3) trashSpots.push({ x: d + 12, z: TC.roadCoord(i) + swOff });
      }
    }
    thinClone(bench, benchSpots, 'benches');
    for (const s of benchSpots) TC.Physics.addBox(s.x, s.z, 2.2, 0.7, 0.9, 0, 'bench');
    thinClone(trash, trashSpots, 'trashes');
    for (const s of trashSpots) TC.Physics.addBox(s.x, s.z, 0.6, 0.6, 1.1, 0, 'trash');

    // ایستگاه اتوبوس
    const bsMat = TC.World.mats.metal;
    const busStops = [
      { x: TC.roadCoord(4) + C.roadHalf + 3, z: TC.roadCoord(6) + 20, ry: 0 },
      { x: TC.roadCoord(8) - C.roadHalf - 3, z: TC.roadCoord(8) + 20, ry: Math.PI },
      { x: TC.roadCoord(6) + C.roadHalf + 3, z: TC.roadCoord(10) + 20, ry: 0 },
      { x: TC.roadCoord(10) - C.roadHalf - 3, z: TC.roadCoord(4) + 20, ry: Math.PI },
    ];
    for (const bs of busStops) {
      const shelter = BABYLON.MeshBuilder.CreateBox('busSh', { width: 5, height: 0.15, depth: 2.2 }, scene);
      shelter.material = bsMat;
      shelter.position.set(bs.x, 3, bs.z);
      shelter.freezeWorldMatrix();
      for (const s of [-1, 1]) {
        const leg = BABYLON.MeshBuilder.CreateCylinder('busLeg', { diameter: 0.15, height: 3 }, scene);
        leg.material = bsMat;
        leg.position.set(bs.x, 1.5, bs.z + s);
        leg.freezeWorldMatrix();
      }
      const bench2 = bench.clone('busBench');
      bench2.material = benchMat;
      bench2.position.set(bs.x, 0.5, bs.z);
      bench2.freezeWorldMatrix();
      TC.Physics.addBox(bs.x, bs.z, 5, 2.2, 3, 0, 'busstop');
      TC.addPOI('parking', bs.x, bs.z, 'ایستگاه اتوبوس');
    }
    P.busStops = busStops;

    // تابلوهای تبلیغاتی بزرگ
    const bbSpots = [
      { x: TC.roadCoord(6), z: TC.blockCenter(5, 5).z, ry: 0.4 },
      { x: TC.blockCenter(9, 7).x, z: TC.roadCoord(8), ry: 1.2 },
      { x: TC.blockCenter(3, 9).x, z: TC.roadCoord(10), ry: 2.2 },
      { x: half + 100, z: 100, ry: -1.2 },
      { x: -200, z: -half - 70, ry: 0 },
    ];
    const bbFrame = BABYLON.MeshBuilder.CreateBox('bb', { width: 12, height: 6, depth: 0.4 }, scene);
    const bbMat = new BABYLON.StandardMaterial('bbM', scene);
    bbMat.diffuseTexture = TC.Tex.billboard;
    bbMat.emissiveTexture = TC.Tex.billboard;
    bbMat.emissiveColor = new BABYLON.Color3(0.35, 0.35, 0.35);
    bbMat.specularColor = BABYLON.Color3.Black();
    bbMat.freeze();
    bbFrame.material = bbMat;
    TC.World.nightMats.push(bbMat);
    for (const s of bbSpots) {
      const bb = bbFrame.clone('bbInst');
      bb.position.set(s.x, 9, s.z);
      bb.rotation.y = s.ry;
      bb.freezeWorldMatrix();
      for (const lx of [-4, 4]) {
        const leg = BABYLON.MeshBuilder.CreateBox('bbLeg', { width: 0.5, height: 6, depth: 0.5 }, scene);
        leg.material = TC.World.mats.metal;
        leg.position.set(s.x + Math.cos(s.ry) * lx, 3, s.z - Math.sin(s.ry) * lx);
        leg.freezeWorldMatrix();
      }
      TC.Physics.addBox(s.x, s.z, 12, 1, 12, 0, 'billboard');
    }

    /* ---------- خودروهای پارک‌شده (با templates خودرو) ---------- */
    P.parkedSpots = [];
    for (let i = 0; i <= N; i++) {
      for (let d = -half + 24; d < half - 10; d += 26) {
        const swOff = C.roadHalf - 1.6;
        if ((i * 11 + Math.round(d / 26)) % 5 === 0) P.parkedSpots.push({ x: TC.roadCoord(i) + swOff, z: d, ry: Math.PI / 2 });
        if ((i * 7 + Math.round(d / 26)) % 6 === 2) P.parkedSpots.push({ x: d, z: TC.roadCoord(i) - swOff, ry: 0 });
        if ((i * 13 + Math.round(d / 26)) % 7 === 3) P.parkedSpots.push({ x: d + 13, z: TC.roadCoord(i) + swOff, ry: Math.PI });
      }
    }
    // پارکینگ مرکزی
    const pk = TC.blockCenter(7, 7);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
      P.parkedSpots.push({ x: pk.x - 12 + i * 5, z: pk.z - 3 + j * 6, ry: Math.PI / 2 });
    }
    // اسپاون واقعی خودروها در vehicles.js انجام می‌شود

    /* ---------- تابلوهای رانندگی ---------- */
    const signTex = new BABYLON.DynamicTexture('roadSignTex', { width: 128, height: 128 }, scene, true);
    {
      const c2 = signTex.getContext();
      c2.fillStyle = '#1a5aa8'; c2.fillRect(0, 0, 128, 128);
      c2.strokeStyle = '#fff'; c2.lineWidth = 6; c2.strokeRect(8, 8, 112, 112);
      c2.fillStyle = '#fff';
      c2.beginPath(); c2.moveTo(30, 88); c2.lineTo(64, 34); c2.lineTo(98, 88); c2.closePath(); c2.fill();
      c2.fillStyle = '#1a5aa8'; c2.fillRect(56, 58, 16, 22);
      signTex.update(false);
      signTex.hasAlpha = false;
    }
    const signMat = new BABYLON.StandardMaterial('roadSignM', scene);
    signMat.diffuseTexture = signTex;
    signMat.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.3);
    signMat.specularColor = BABYLON.Color3.Black();
    signMat.freeze();
    TC.World.nightMats.push(signMat);
    const signSpots = [];
    for (let i = 1; i <= N; i += 2) {
      signSpots.push({ x: TC.roadCoord(i) + C.roadHalf + 2.4, z: TC.roadCoord(Math.floor(N / 2)) + 6, ry: Math.PI / 2 });
      signSpots.push({ x: TC.roadCoord(Math.floor(N / 2)) + 6, z: TC.roadCoord(i) - C.roadHalf - 2.4, ry: 0 });
    }
    const signBoard = BABYLON.MeshBuilder.CreatePlane('signBoard', { width: 1.6, height: 1.6 }, scene);
    signBoard.material = signMat;
    const signPoleT = BABYLON.MeshBuilder.CreateCylinder('signPole', { diameter: 0.12, height: 3.4, tessellation: 6 }, scene);
    signPoleT.material = poleMat;
    for (const s of signSpots) {
      const pole = signPoleT.createInstance('sp');
      pole.position.set(s.x, 1.7, s.z);
      const board = signBoard.clone('sb');
      board.position.set(s.x, 3.4, s.z);
      board.rotation.y = s.ry;
      board.freezeWorldMatrix();
      TC.Physics.addBox(s.x, s.z, 0.2, 0.2, 3.6, 0, 'sign');
    }
    signBoard.dispose(); signPoleT.dispose();

    /* ================= اشیاء ریز شهری (Thin Instance) ================= */
    const colMat = (name, hex) => {
      const m = new BABYLON.StandardMaterial(name, scene);
      m.diffuseColor = BABYLON.Color3.FromHexString(hex);
      m.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
      m.freeze();
      return m;
    };
    const swOff = C.roadHalf + C.sidewalkW * 0.5;

    // --- هیدرنت آتش‌نشانی ---
    const hydrantT = BABYLON.MeshBuilder.CreateCylinder('hydrantT', { diameterTop: 0.26, diameterBottom: 0.34, height: 0.8, tessellation: 8 }, scene);
    hydrantT.material = colMat('hydrantM', '#c0392b');
    const hydrantCap = BABYLON.MeshBuilder.CreateSphere('hydrantCap', { diameter: 0.24, segments: 6 }, scene);
    hydrantCap.material = hydrantT.material;
    hydrantCap.position.y = 0.42;
    hydrantCap.parent = hydrantT;
    const hydrantSpots = [];
    for (let i = 1; i < N; i += 2) {
      for (let d = -half + 50; d < half - 30; d += 96) {
        hydrantSpots.push({ x: TC.roadCoord(i) + swOff + 1.2, z: d, ry: 0 });
        hydrantSpots.push({ x: d + 40, z: TC.roadCoord(i) - swOff - 1.2, ry: 0 });
      }
    }
    thinClone(hydrantT, hydrantSpots, 'hydrants');
    for (const s of hydrantSpots) TC.Physics.addBox(s.x, s.z, 0.4, 0.4, 0.9, 0, 'hydrant');

    // --- مخروط‌های راهنما (مناطق کار جاده) ---
    const coneT = BABYLON.MeshBuilder.CreateCylinder('coneT', { diameterTop: 0.06, diameterBottom: 0.3, height: 0.6, tessellation: 8 }, scene);
    coneT.material = colMat('coneM', '#e8781e');
    const coneSpots = [];
    for (let k = 0; k < 12; k++) {
      const p = TC.NAV.randomRoadPoint(0, 0, 0);
      const ang = M.srand() * 6.28;
      for (let j = 0; j < 5; j++) {
        coneSpots.push({ x: p.x + Math.cos(ang) * (j * 1.7), z: p.z + Math.sin(ang) * (j * 1.7), y: 0 });
      }
    }
    // مخروط اطراف کارخانه‌ها و بندر
    for (let k = 0; k < 10; k++) {
      const cx2 = half + 60 + M.srand() * 200, cz2 = -200 + M.srand() * 400;
      coneSpots.push({ x: cx2, z: cz2, y: 0 });
    }
    thinClone(coneT, coneSpots, 'cones');

    // --- دوبین زباله بزرگ ---
    const dumpT = BABYLON.MeshBuilder.CreateBox('dumpT', { width: 2.1, height: 1.2, depth: 1.2 }, scene);
    dumpT.material = colMat('dumpM', '#3e6b4f');
    const dumpLid = BABYLON.MeshBuilder.CreateBox('dumpLid', { width: 2.15, height: 0.12, depth: 1.25 }, scene);
    dumpLid.material = colMat('dumpLidM', '#2f5540');
    dumpLid.position.y = 0.66;
    dumpLid.parent = dumpT;
    const dumpSpots = [];
    for (let i = 0; i < N; i += 3) {
      for (let d = -half + 60; d < half - 40; d += 130) {
        dumpSpots.push({ x: TC.roadCoord(i) - swOff - 1.6, z: d + 20, ry: M.srand() * 0.3 - 0.15 });
      }
    }
    thinClone(dumpT, dumpSpots, 'dumpsters');
    for (const s of dumpSpots) TC.Physics.addBox(s.x, s.z, 2.1, 1.2, 1.3, 0, 'dumpster');

    // --- صندوق پست ---
    const mailT = BABYLON.MeshBuilder.CreateBox('mailT', { width: 0.55, height: 0.6, depth: 0.45 }, scene);
    mailT.material = colMat('mailM', '#2a5caa');
    const mailLeg = BABYLON.MeshBuilder.CreateBox('mailLeg', { width: 0.12, height: 0.55, depth: 0.12 }, scene);
    mailLeg.material = poleMat;
    mailLeg.position.y = -0.55;
    mailLeg.parent = mailT;
    const mailSpots = [];
    for (let i = 2; i < N; i += 4) {
      mailSpots.push({ x: TC.roadCoord(i) + swOff + 1, z: -half + 70 + i * 30, ry: 0 });
      mailSpots.push({ x: -half + 90 + i * 25, z: TC.roadCoord(i) + swOff + 1, ry: Math.PI / 2 });
    }
    thinClone(mailT, mailSpots, 'mailboxes');
    for (const s of mailSpots) TC.Physics.addBox(s.x, s.z, 0.6, 0.5, 1.2, 0, 'mailbox');

    // --- بولاردهای فلزی (محدودکننده ورود خودرو) ---
    const bolT = BABYLON.MeshBuilder.CreateCylinder('bolT', { diameter: 0.16, height: 0.9, tessellation: 8 }, scene);
    bolT.material = colMat('bolM', '#5a6470');
    const bolSpots = [];
    const pk2 = TC.blockCenter(7, 7);
    for (let i = 0; i < 6; i++) {
      bolSpots.push({ x: pk2.x - 15 + i * 6, z: pk2.z + 8, y: 0 });
    }
    const polP = TC.poiByType('police')[0];
    if (polP) for (let i = 0; i < 5; i++) bolSpots.push({ x: polP.x - 18, z: polP.z - 8 + i * 4, y: 0 });
    for (let i = 0; i < 4; i++) {
      const p3 = TC.NAV.randomRoadPoint(0, 0, 0);
      for (let j = 0; j < 4; j++) bolSpots.push({ x: p3.x + j * 2.4, z: p3.z + 6, y: 0 });
    }
    thinClone(bolT, bolSpots, 'bollards');
    for (const s of bolSpots) TC.Physics.addBox(s.x, s.z, 0.2, 0.2, 0.9, 0, 'bollard');

    // --- بشکه‌ها (صنعتی/بندر) ---
    const barrelT = BABYLON.MeshBuilder.CreateCylinder('barrelT', { diameter: 0.62, height: 0.95, tessellation: 10 }, scene);
    barrelT.material = colMat('barrelM', '#8a5a2a');
    const barrelSpots = [];
    for (let k = 0; k < 26; k++) {
      const inIndustrial = k % 2 === 0;
      const bx2 = inIndustrial ? half - 80 + M.srand() * 200 : -half - 90 + M.srand() * 50;
      const bz2 = inIndustrial ? 40 + M.srand() * 300 : 665 + M.srand() * 45;
      barrelSpots.push({ x: bx2, z: bz2, ry: M.srand() * 3, y: inIndustrial ? 0 : 1.03 });
    }
    thinClone(barrelT, barrelSpots, 'barrels');
    for (let k = 0; k < barrelSpots.length; k += 2) {
      const s = barrelSpots[k];
      TC.Physics.addBox(s.x, s.z, 0.7, 0.7, s.y > 0.5 ? 1.9 : 0.95, 0, 'barrel');
    }

    // --- جعبه‌ها و پالت‌ها (کوی/صنعتی/بندر) ---
    const crateT = BABYLON.MeshBuilder.CreateBox('crateT', { width: 1, height: 1, depth: 1 }, scene);
    crateT.material = TC.World.mats.wood;
    const crateSpots = [];
    for (let k = 0; k < 30; k++) {
      const zone = k % 3;
      const bx3 = zone === 0 ? half - 100 + M.srand() * 250 : zone === 1 ? -half + 60 + M.srand() * 300 : -half - 70 + M.srand() * 60;
      const bz3 = zone === 0 ? 60 + M.srand() * 300 : zone === 1 ? half - 150 + M.srand() * 250 : half + 60 + M.srand() * 70;
      const stack = M.srand() < 0.4 ? 2 : 1;
      for (let s2 = 0; s2 < stack; s2++) crateSpots.push({ x: bx3 + M.srand() * 0.3, z: bz3, y: 0.5 + s2 * 1.02, ry: M.srand() * 0.6 });
      TC.Physics.addBox(bx3, bz3, 1.2, 1.2, stack, 0, 'crate');
    }
    thinClone(crateT, crateSpots, 'crates');

    // --- دریچه فاضلاب روی آسفالت ---
    const manholeT = BABYLON.MeshBuilder.CreateCylinder('manholeT', { diameter: 1.15, height: 0.04, tessellation: 12 }, scene);
    manholeT.material = colMat('manholeM', '#2a2d32');
    const manholeSpots = [];
    for (let i = 1; i < N; i += 3) {
      for (let d = -half + 30; d < half; d += 64) {
        manholeSpots.push({ x: TC.roadCoord(i) + 3.2, z: d, y: 0.015 });
        manholeSpots.push({ x: d + 20, z: TC.roadCoord(i) - 3.2, y: 0.015 });
      }
    }
    thinClone(manholeT, manholeSpots, 'manholes');

    // --- گودال آب (جذاب‌تر در باران) ---
    const puddleT = BABYLON.MeshBuilder.CreateCylinder('puddleT', { diameter: 2.6, height: 0.02, tessellation: 10 }, scene);
    const puddleM = new BABYLON.StandardMaterial('puddleM', scene);
    puddleM.diffuseColor = new BABYLON.Color3(0.16, 0.18, 0.2);
    puddleM.specularColor = new BABYLON.Color3(0.8, 0.8, 0.9);
    puddleM.specularPower = 128;
    puddleM.alpha = 0.62;
    puddleM.freeze();
    puddleT.material = puddleM;
    const puddleSpots = [];
    for (let k = 0; k < 46; k++) {
      const p4 = TC.NAV.randomRoadPoint(0, 0, 0);
      puddleSpots.push({ x: p4.x + (M.srand() - 0.5) * 12, z: p4.z + (M.srand() - 0.5) * 12, y: 0.022, ry: 0, s: 0.6 + M.srand() * 0.9 });
    }
    thinClone(puddleT, puddleSpots, 'puddles');

    // --- گلدان‌های خیابانی (تجاری و لوکس) ---
    const planterT = BABYLON.MeshBuilder.CreateCylinder('planterT', { diameterTop: 0.75, diameterBottom: 0.55, height: 0.5, tessellation: 10 }, scene);
    planterT.material = colMat('planterM', '#a8552e');
    const planterFlower = BABYLON.MeshBuilder.CreateSphere('planterF', { diameter: 0.6, segments: 5 }, scene);
    planterFlower.material = leavesMat;
    planterFlower.scaling.y = 0.7;
    planterFlower.position.y = 0.22;
    planterFlower.parent = planterT;
    const planterSpots = [];
    for (let i = 2; i < N - 2; i += 2) {
      for (let d = -half + 40; d < half - 30; d += 88) {
        planterSpots.push({ x: TC.roadCoord(i) + swOff + 0.9, z: d + 12, y: 0 });
        planterSpots.push({ x: d + 55, z: TC.roadCoord(i) - swOff - 0.9, y: 0 });
      }
    }
    thinClone(planterT, planterSpots, 'planters');
    for (let k = 0; k < planterSpots.length; k += 3) TC.Physics.addBox(planterSpots[k].x, planterSpots[k].z, 0.8, 0.8, 0.6, 0, 'planter');

    // --- دستگاه فروش خودکار کنار مغازه‌ها ---
    const vendT = BABYLON.MeshBuilder.CreateBox('vendT', { width: 1, height: 2, depth: 0.7 }, scene);
    const vendM = new BABYLON.StandardMaterial('vendM', scene);
    vendM.diffuseColor = BABYLON.Color3.FromHexString('#c0392b');
    vendM.emissiveColor = new BABYLON.Color3(0.12, 0.03, 0.02);
    vendM.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    vendM.freeze();
    vendT.material = vendM;
    TC.World.nightMats.push(vendM);
    const vendSpots = [];
    for (const sh of (TC.World.shops || [])) {
      vendSpots.push({ x: sh.x + sh.room.w / 2 + 0.6, z: sh.z + 5.5, ry: 0 });
    }
    vendSpots.push({ x: TC.roadCoord(6) + swOff + 1.4, z: TC.roadCoord(6) + 30, ry: 0 });
    vendSpots.push({ x: TC.roadCoord(8) - swOff - 1.4, z: TC.roadCoord(8) - 30, ry: 0 });
    thinClone(vendT, vendSpots, 'vending');
    for (const s of vendSpots) TC.Physics.addBox(s.x, s.z, 1, 0.7, 2, 0, 'vending');

    // --- دکه روزنامه/میوه ---
    const standT = BABYLON.MeshBuilder.CreateBox('standT', { width: 1.7, height: 1.7, depth: 1 }, scene);
    standT.material = colMat('standM', '#e8b40a');
    const standRoof = BABYLON.MeshBuilder.CreateBox('standRoof', { width: 1.9, height: 0.1, depth: 1.2 }, scene);
    standRoof.material = colMat('standRoofM', '#c0392b');
    standRoof.position.y = 1;
    standRoof.parent = standT;
    const standSpots = [];
    for (let i = 3; i < N - 2; i += 4) {
      standSpots.push({ x: TC.roadCoord(i) + swOff + 2, z: -half + 90 + i * 34, ry: Math.PI / 2 });
    }
    thinClone(standT, standSpots, 'stands');
    for (const s of standSpots) TC.Physics.addBox(s.x, s.z, 1.2, 1.7, 1.8, 0, 'stand');

    // --- سنگ‌های حاشیه شهر ---
    const rockT = BABYLON.MeshBuilder.CreateSphere('rockT', { diameter: 1.1, segments: 4 }, scene);
    rockT.material = colMat('rockM', '#8a8278');
    rockT.scaling.y = 0.55;
    rockT.bakeCurrentTransformIntoVertices();
    const rockSpots = [];
    for (let k = 0; k < 90; k++) {
      const zone = k % 3;
      const rx2 = zone === 0 ? half + 90 + M.srand() * 380 : zone === 1 ? (M.srand() - 0.5) * 700 : half + 120 + M.srand() * 300;
      const rz2 = zone === 0 ? half + 200 + M.srand() * 380 : zone === 1 ? -(half + 100 + M.srand() * 200) : half + 160 + M.srand() * 320;
      rockSpots.push({ x: rx2, z: rz2, y: 0, ry: M.srand() * 3, s: 0.5 + M.srand() * 1.6 });
    }
    thinClone(rockT, rockSpots, 'rocks');

    // --- پرنده‌های چرخان بالای پارک و ساحل ---
    P.birds = [];
    const birdMat = colMat('birdM', '#3a3f4a');
    for (let k = 0; k < 10; k++) {
      const bird = BABYLON.MeshBuilder.CreateBox('bird', { width: 0.7, height: 0.08, depth: 0.25 }, scene);
      bird.material = birdMat;
      const center = k % 2 === 0 ? { x: parkC.x, z: parkC.z } : { x: -half - 150, z: 200 };
      P.birds.push({
        mesh: bird, cx: center.x, cz: center.z,
        r: 16 + M.rand(0, 26), h: 12 + M.rand(0, 14),
        speed: 0.25 + M.rand(0, 0.4), phase: M.rand(0, 6.28),
        flap: M.rand(4, 7),
      });
    }
    P.updateBirds = function (dt) {
      const t = performance.now() / 1000;
      for (const b of P.birds) {
        const ang = t * b.speed + b.phase;
        b.mesh.position.set(b.cx + Math.cos(ang) * b.r, b.h + Math.sin(t * 1.7 + b.phase) * 1.6, b.cz + Math.sin(ang) * b.r);
        b.mesh.rotation.y = -ang;
        b.mesh.rotation.z = Math.sin(t * b.flap) * 0.35;
      }
    };

    P.ready = true;
    console.log('[Toofan] عناصر محیطی: چراغ', poleSpots.length, 'درخت', treeSpots.length, 'اشیاء ریز:', hydrantSpots.length + coneSpots.length + dumpSpots.length + mailSpots.length + bolSpots.length + barrelSpots.length + crateSpots.length + planterSpots.length + rockSpots.length + manholeSpots.length + puddleSpots.length);
  };

  /* ---------- منطق چراغ راهنمایی ---------- */
  P.updateTrafficLights = function (dt) {
    P._tlPhase = (P._tlPhase || 0) + dt;
    const cycle = 14;
    const t = P._tlPhase % cycle;
    let nsState, ewState;
    if (t < 6) { nsState = 'green'; ewState = 'red'; }
    else if (t < 7.5) { nsState = 'yellow'; ewState = 'red'; }
    else if (t < 13) { nsState = 'red'; ewState = 'green'; }
    else { nsState = 'red'; ewState = 'yellow'; }
    for (const tl of P.trafficLights) {
      const st = tl.axis === 'ns' ? nsState : ewState;
      if (tl.state !== st) {
        tl.state = st;
        const mat = st === 'red' ? P.lensRed : st === 'green' ? P.lensGreen : P.lensYellow;
        tl.lens.material = mat;
      }
    }
  };
  P.lightStateFor = function (dirNS) {
    const t = (P._tlPhase || 0) % 14;
    if (dirNS) return t < 6 ? 'green' : t < 7.5 ? 'yellow' : 'red';
    return t < 7.5 || t >= 13 ? 'red' : t < 13 ? 'green' : 'yellow';
  };

  TC.Props = P;
})();
