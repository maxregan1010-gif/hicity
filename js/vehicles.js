/* ============================================================
 * vehicles.js — خودرو، موتور، تاکسی، کامیون، اتوبوس، قایق، هواپیما،
 * هلیکوپتر: مدل سه‌بعدی، فیزیک آرکید، آسیب، سوخت، چراغ، در
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  /* ---------- تعریف وسیله‌ها ---------- */
  const DEFS = {
    sedan:     { name: 'پرشیا کلاسیک', type: 'car', cls: 'economy', price: 18000, top: 30, accel: 7.5, handling: 2.6, mass: 1, sound: 'car', seats: 4, color: '#8a9bb0', fuel: 42, desc: 'سدان اقتصادی برای هر روز' },
    hatch:     { name: 'نیما کوچک', type: 'car', cls: 'economy', price: 14000, top: 27, accel: 6.8, handling: 2.9, mass: 0.85, sound: 'car', seats: 4, color: '#c8b070', fuel: 36, desc: 'هچ‌بک جمع‌وجور' },
    sport1:    { name: 'طوفان GT', type: 'car', cls: 'sports', price: 128000, top: 52, accel: 14, handling: 3.4, mass: 1.1, sound: 'sport', seats: 2, color: '#c0392b', fuel: 58, desc: 'اسپرت پرقدرت خیابانی' },
    sport2:    { name: 'شهاب RS', type: 'car', cls: 'sports', price: 165000, top: 58, accel: 16, handling: 3.6, mass: 1.05, sound: 'sport', seats: 2, color: '#f5b301', fuel: 62, desc: 'پرچم‌دار سرعت' },
    sport3:    { name: 'آذرخش X', type: 'car', cls: 'sports', price: 240000, top: 64, accel: 18.5, handling: 3.8, mass: 1, sound: 'sport', seats: 2, color: '#111318', fuel: 66, desc: 'ابرسپرت نادر' },
    luxury1:   { name: 'سلطان ۷۰۰', type: 'car', cls: 'luxury', price: 210000, top: 44, accel: 10, handling: 2.7, mass: 1.3, sound: 'car', seats: 4, color: '#1a1d26', fuel: 70, desc: 'سدان لوکس مدیران' },
    luxury2:   { name: 'دلاویو', type: 'car', cls: 'luxury', price: 320000, top: 48, accel: 12, handling: 2.9, mass: 1.35, sound: 'car', seats: 4, color: '#e8e4d8', fuel: 74, desc: 'لوکس‌ترین سدان شهر' },
    classic:   { name: 'کابری پنجاه‌وسه', type: 'car', cls: 'classic', price: 88000, top: 32, accel: 7, handling: 2.4, mass: 1.2, sound: 'classic', seats: 2, color: '#3a7a9a', fuel: 50, desc: 'کلاسیک نوستالژیک' },
    taxi:      { name: 'تاکسی طوفان', type: 'car', cls: 'taxi', price: 22000, top: 29, accel: 7.2, handling: 2.7, mass: 1, sound: 'car', seats: 4, color: '#f5b301', fuel: 44, taxi: true, desc: 'رنگ زرد رسمی تاکسی‌ها' },
    ridecar:   { name: 'سوار شهری', type: 'car', cls: 'economy', price: 20000, top: 29, accel: 7.3, handling: 2.8, mass: 1, sound: 'car', seats: 4, color: '#2f8a7a', fuel: 42, desc: 'خودرو تاکسی اینترنتی' },
    pickup:    { name: 'باربند کوچک', type: 'car', cls: 'suv', price: 32000, top: 30, accel: 7, handling: 2.3, mass: 1.3, sound: 'truck', seats: 2, color: '#5a6a4a', fuel: 60, long: true, desc: 'وانت کاربردی' },
    suv:       { name: 'کوهنورد XT', type: 'car', cls: 'suv', price: 96000, top: 36, accel: 9, handling: 2.5, mass: 1.4, sound: 'car', seats: 5, color: '#3a4a5a', fuel: 68, long: true, desc: 'شاسی‌بلند خانوادگی' },
    truck:     { name: 'کامیون پارس', type: 'truck', cls: 'heavy', price: 180000, top: 24, accel: 3.4, handling: 1.5, mass: 3.2, sound: 'truck', seats: 2, color: '#2a6a8a', fuel: 130, long: true, desc: 'کامیون باربری سنگین' },
    bus:       { name: 'اتوبوس شهری', type: 'bus', cls: 'heavy', price: 150000, top: 22, accel: 3, handling: 1.4, mass: 3, sound: 'truck', seats: 12, color: '#2a7a3a', fuel: 120, long: true, desc: 'اتوبوس خطوط شهری' },
    moto1:     { name: 'روباه ۱۲۵', type: 'motorcycle', cls: 'moto', price: 16000, top: 26, accel: 8.5, handling: 3.4, mass: 0.4, sound: 'motorcycle', seats: 1, color: '#b03a2e', fuel: 14, desc: 'موتور سبک شهری' },
    moto2:     { name: 'صاعقه ۶۰۰', type: 'motorcycle', cls: 'moto', price: 78000, top: 44, accel: 14, handling: 3.7, mass: 0.45, sound: 'motorcycle', seats: 1, color: '#1a1d26', fuel: 18, desc: 'موتور پرقدرت' },
    bicycle:   { name: 'دوچرخه آفتاب', type: 'bicycle', cls: 'moto', price: 900, top: 9, accel: 3, handling: 3.6, mass: 0.2, sound: 'none', seats: 1, color: '#3a8a3a', fuel: 999, desc: 'بدون سوخت، پر از سلامتی' },
    boat:      { name: 'قایق موج‌شکن', type: 'boat', cls: 'boat', price: 65000, top: 22, accel: 5, handling: 2.2, mass: 1.6, sound: 'boat', seats: 3, color: '#e8e4d8', fuel: 60, desc: 'قایق تفریحی سریع' },
    yatch:     { name: 'یخت سلطان دریا', type: 'boat', cls: 'boat', price: 420000, top: 16, accel: 3, handling: 1.6, mass: 3, sound: 'boat', seats: 8, color: '#f5f0e8', fuel: 120, long: true, desc: 'یخت لوکس ولخرج‌ها' },
    planeS:    { name: 'هوایورد کوچک', type: 'plane', cls: 'air', price: 280000, top: 40, accel: 6, handling: 1.8, mass: 1.4, sound: 'plane', seats: 2, color: '#e8e4d8', fuel: 90, desc: 'هواپیمای دوردسته' },
    planeL:    { name: 'پرواز شهری', type: 'plane', cls: 'air', price: 900000, top: 46, accel: 5, handling: 1.4, mass: 3, sound: 'plane', seats: 8, color: '#e8e8f0', fuel: 200, long: true, desc: 'هواپیمای مسافربری خطوط طوفان' },
    heli:      { name: 'بال‌گرد خبری', type: 'heli', cls: 'air', price: 520000, top: 34, accel: 7, handling: 2.4, mass: 1.5, sound: 'heli', seats: 4, color: '#2a3a4a', fuel: 100, desc: 'هلیکوپتر دو موتوره' },
    police1:   { name: 'گشت پلیس', type: 'car', cls: 'police', price: 0, top: 38, accel: 10, handling: 3, mass: 1.1, sound: 'car', seats: 4, color: '#1a2a4a', fuel: 55, police: true, desc: 'خودرو گشت‌زنی' },
    police2:   { name: 'پursuit پلیس', type: 'car', cls: 'police', price: 0, top: 48, accel: 13.5, handling: 3.4, mass: 1.1, sound: 'sport', seats: 4, color: '#1a2a4a', fuel: 58, police: true, desc: 'تعقیب و گریز سطح بالا' },
  };

  const V = {
    DEFS,
    all: [],
    playerGarage: [], // {defId, health, fuel, odometer, color}
  };

  /* ---------- ساخت مش خودرو ---------- */
  function carMat(name, hex, opts) {
    const m = new BABYLON.StandardMaterial(name, TC.G.scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = new BABYLON.Color3(0.55, 0.55, 0.6);
    m.specularPower = 64;
    if (opts && opts.emissive) m.emissiveColor = BABYLON.Color3.FromHexString(opts.emissive);
    return m;
  }

  V.buildMesh = function (def, colorOverride) {
    const scene = TC.G.scene;
    const color = colorOverride || def.color;
    const root = new BABYLON.TransformNode('vRoot', scene);
    const parts = { root };
    const paint = carMat('vPaint' + def.name, color);
    const dark = carMat('vDark', '#1a1d22');
    const glassM = new BABYLON.StandardMaterial('vGlass', scene);
    glassM.diffuseColor = new BABYLON.Color3(0.15, 0.2, 0.28);
    glassM.alpha = 0.72;
    glassM.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    glassM.specularPower = 96;
    const tireM = carMat('vTire', '#181a1e');
    tireM.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    const rimM = carMat('vRim', '#aeb4be');
    const headM = carMat('vHead', '#ffe9c0', { emissive: '#332a10' });
    const tailM = carMat('vTail', '#ff3a30', { emissive: '#4a0e0a' });
    parts.paint = paint; parts.dark = dark; parts.glass = glassM; parts.headM = headM; parts.tailM = tailM;
    const t = def.type;

    if (t === 'car' || t === 'truck' || t === 'bus') {
      const long = def.long ? 1.45 : 1;
      const len = (t === 'bus' ? 8.4 : t === 'truck' ? 7.6 : 4.4) * (def.long && t === 'car' ? 1 : 1);
      const width = t === 'truck' ? 2.5 : t === 'bus' ? 2.6 : 1.9;
      const bodyH = t === 'bus' ? 2.5 : 0.75;
      // بدنه اصلی
      const body = BABYLON.MeshBuilder.CreateBox('vBody', { width, height: bodyH, depth: len }, scene);
      body.material = paint;
      body.position.y = t === 'bus' ? 1.7 : 0.72;
      body.parent = root;
      // کابین
      if (t !== 'truck') {
        const cabL = t === 'bus' ? len * 0.75 : len * 0.5;
        const cab = BABYLON.MeshBuilder.CreateBox('vCab', { width: width * 0.92, height: t === 'bus' ? 1.3 : 0.7, depth: cabL }, scene);
        cab.material = paint;
        cab.position.set(0, t === 'bus' ? 3.4 : 1.4, t === 'bus' ? -0.5 : -len * 0.08);
        cab.parent = root;
        const wind = BABYLON.MeshBuilder.CreateBox('vWind', { width: width * 0.86, height: t === 'bus' ? 1.1 : 0.6, depth: 0.1 }, scene);
        wind.material = glassM;
        wind.position.set(0, t === 'bus' ? 3.4 : 1.45, t === 'bus' ? -0.5 - cabL / 2 + 0.1 : -len * 0.08 - cabL / 2 + 0.1);
        wind.parent = root;
        // شیشه‌های جانبی
        for (const s of [-1, 1]) {
          const side = BABYLON.MeshBuilder.CreateBox('vSideG', { width: 0.08, height: t === 'bus' ? 1 : 0.5, depth: cabL * 0.86 }, scene);
          side.material = glassM;
          side.position.set(s * width * 0.46, t === 'bus' ? 3.4 : 1.45, t === 'bus' ? -0.5 : -len * 0.08);
          side.parent = root;
        }
      } else {
        // کامیون: کابین جلو + بار بندی
        const cab = BABYLON.MeshBuilder.CreateBox('vCab', { width: width * 0.95, height: 2, depth: 2.2 }, scene);
        cab.material = paint;
        cab.position.set(0, 2.1, len / 2 - 1.2);
        cab.parent = root;
        const cargo = BABYLON.MeshBuilder.CreateBox('vCargo', { width: width, height: 2.6, depth: len * 0.62 }, scene);
        cargo.material = carMat('vCargoM', '#c8ccd2');
        cargo.position.set(0, 1.7, -len * 0.15);
        cargo.parent = root;
      }
      // وانت بار
      if (def.name.includes('باربند')) {
        const bed = BABYLON.MeshBuilder.CreateBox('vBed', { width: width * 0.94, height: 0.5, depth: len * 0.42 }, scene);
        bed.material = dark;
        bed.position.set(0, 1.15, -len * 0.22);
        bed.parent = root;
      }
      // درها (نمای بیرونی برای انیمیشن)
      const doors = [];
      for (const s of [-1, 1]) {
        const door = BABYLON.MeshBuilder.CreateBox('vDoor', { width: 0.06, height: 0.65, depth: len * 0.32 }, scene);
        door.material = paint;
        door.position.set(s * width / 2, 0.78, -len * 0.05);
        door.parent = root;
        doors.push({ mesh: door, side: s });
      }
      parts.doors = doors;
      // چراغ‌ها
      const lights = [];
      for (const s of [-1, 1]) {
        const hl = BABYLON.MeshBuilder.CreateBox('vHl', { width: 0.42, height: 0.2, depth: 0.08 }, scene);
        hl.material = headM;
        hl.position.set(s * width * 0.32, 0.75, len / 2 + 0.01);
        hl.parent = root;
        const tl = BABYLON.MeshBuilder.CreateBox('vTl', { width: 0.42, height: 0.18, depth: 0.08 }, scene);
        tl.material = tailM;
        tl.position.set(s * width * 0.32, 0.75, -len / 2 - 0.01);
        tl.parent = root;
        lights.push({ head: hl, tail: tl });
      }
      parts.lightSet = lights;
      // چراغ گردان پلیس
      if (def.police) {
        const bar = BABYLON.MeshBuilder.CreateBox('vBar', { width: 1.1, height: 0.16, depth: 0.3 }, scene);
        bar.material = dark;
        bar.position.set(0, 2.15, -0.2);
        bar.parent = root;
        const rM = carMat('vBarR', '#ff2222', { emissive: '#660000' });
        const bM = carMat('vBarB', '#2255ff', { emissive: '#000a66' });
        const r = BABYLON.MeshBuilder.CreateBox('vBarR2', { width: 0.5, height: 0.14, depth: 0.26 }, scene);
        r.material = rM; r.position.set(-0.28, 2.28, -0.2); r.parent = root;
        const b = BABYLON.MeshBuilder.CreateBox('vBarB2', { width: 0.5, height: 0.14, depth: 0.26 }, scene);
        b.material = bM; b.position.set(0.28, 2.28, -0.2); b.parent = root;
        parts.policeBar = { r, b, rM, bM };
        // رنگ پلیسی: نوار سفید
        const stripe = BABYLON.MeshBuilder.CreateBox('vStripe', { width: width + 0.02, height: 0.3, depth: len * 0.5 }, scene);
        stripe.material = carMat('vStripeM', '#e8e8e8');
        stripe.position.set(0, 0.72, 0);
        stripe.parent = root;
      }
      if (def.taxi) {
        const sign = BABYLON.MeshBuilder.CreateBox('vTaxiSign', { width: 0.9, height: 0.22, depth: 0.3 }, scene);
        sign.material = carMat('vTaxiM', '#f5b301', { emissive: '#554400' });
        sign.position.set(0, 2.1, -0.3);
        sign.parent = root;
      }
      // چرخ‌ها
      const wheels = [];
      const wr = t === 'truck' || t === 'bus' ? 0.62 : 0.42;
      const ww = t === 'truck' || t === 'bus' ? 0.4 : 0.28;
      const wheelGeo = BABYLON.MeshBuilder.CreateCylinder('wheelGeo', { diameter: wr * 2, height: ww, tessellation: 12 }, scene);
      wheelGeo.rotation.z = Math.PI / 2;
      wheelGeo.bakeCurrentTransformIntoVertices();
      const positions = t === 'truck' || t === 'bus'
        ? [[-width / 2 + 0.1, wr, len / 2 - 1.2], [width / 2 - 0.1, wr, len / 2 - 1.2], [-width / 2 + 0.1, wr, -len / 2 + 1.4], [width / 2 - 0.1, wr, -len / 2 + 1.4], [-width / 2 + 0.1, wr, -len / 2 + 2.8], [width / 2 - 0.1, wr, -len / 2 + 2.8]]
        : [[-width / 2 + 0.05, wr, len * 0.32], [width / 2 - 0.05, wr, len * 0.32], [-width / 2 + 0.05, wr, -len * 0.32], [width / 2 - 0.05, wr, -len * 0.32]];
      for (const [px, py, pz] of positions) {
        const w = new BABYLON.Mesh('vWheel', scene);
        wheelGeo.geometry.applyToMesh(w);
        w.material = tireM;
        w.position.set(px, py, pz);
        w.parent = root;
        const rim = BABYLON.MeshBuilder.CreateCylinder('vRim', { diameter: wr * 0.9, height: ww + 0.02, tessellation: 10 }, scene);
        rim.rotation.z = Math.PI / 2;
        rim.material = rimM;
        rim.parent = w;
        wheels.push(w);
      }
      parts.wheels = wheels;
      parts.wheelSteer = [wheels[0], wheels[1]];
      V._lastDims = { len, width, bodyH };
    }
    else if (t === 'motorcycle' || t === 'bicycle') {
      const isBike = t === 'bicycle';
      const frame = BABYLON.MeshBuilder.CreateBox('mFrame', { width: 0.34, height: 0.4, depth: 1.9 }, scene);
      frame.material = paint;
      frame.position.y = 0.72;
      frame.parent = root;
      const seat = BABYLON.MeshBuilder.CreateBox('mSeat', { width: 0.4, height: 0.14, depth: 0.5 }, scene);
      seat.material = dark;
      seat.position.set(0, 0.98, -0.35);
      seat.parent = root;
      if (!isBike) {
        const tank = BABYLON.MeshBuilder.CreateSphere('mTank', { diameter: 0.5, segments: 6 }, scene);
        tank.material = paint;
        tank.scaling.z = 1.6;
        tank.position.set(0, 1.0, 0.3);
        tank.parent = root;
        const handle = BABYLON.MeshBuilder.CreateBox('mHandle', { width: 0.75, height: 0.08, depth: 0.08 }, scene);
        handle.material = dark;
        handle.position.set(0, 1.15, 0.72);
        handle.parent = root;
      }
      const wr = isBike ? 0.34 : 0.38;
      const wheelGeo = BABYLON.MeshBuilder.CreateCylinder('mWheelGeo', { diameter: wr * 2, height: 0.14, tessellation: 12 }, scene);
      wheelGeo.rotation.z = Math.PI / 2;
      wheelGeo.bakeCurrentTransformIntoVertices();
      const wheels = [];
      for (const pz of [0.85, -0.85]) {
        const w = new BABYLON.Mesh('mWheel', scene);
        wheelGeo.geometry.applyToMesh(w);
        w.material = tireM;
        w.position.set(0, wr, pz);
        w.parent = root;
        wheels.push(w);
      }
      parts.wheels = wheels;
      parts.wheelSteer = [wheels[0]];
      parts.lightSet = [];
      const hl = BABYLON.MeshBuilder.CreateSphere('mHl', { diameter: 0.18, segments: 6 }, scene);
      hl.material = headM;
      hl.position.set(0, 1.05, 0.95);
      hl.parent = root;
      V._lastDims = { len: 2.1, width: 0.7, bodyH: 1 };
    }
    else if (t === 'boat') {
      const hull = BABYLON.MeshBuilder.CreateBox('bHull', { width: 2.6, height: 1, depth: def.long ? 9 : 5.4 }, scene);
      hull.material = paint;
      hull.position.y = 0.4;
      hull.parent = root;
      const bow = BABYLON.MeshBuilder.CreateCylinder('bBow', { diameterTop: 0, diameterBottom: 2.6, height: 2.4, tessellation: 4 }, scene);
      bow.rotation.x = Math.PI / 2;
      bow.rotation.y = Math.PI / 4;
      bow.material = paint;
      bow.position.set(0, 0.4, (def.long ? 9 : 5.4) / 2 + 1.1);
      bow.parent = root;
      if (!def.long) {
        const cabin = BABYLON.MeshBuilder.CreateBox('bCab', { width: 1.6, height: 1, depth: 1.8 }, scene);
        cabin.material = glassM;
        cabin.position.set(0, 1.4, -0.6);
        cabin.parent = root;
      } else {
        const deck = BABYLON.MeshBuilder.CreateBox('bDeck', { width: 2.2, height: 1.6, depth: 5 }, scene);
        deck.material = glassM;
        deck.position.set(0, 1.6, -1.4);
        deck.parent = root;
      }
      parts.wheels = [];
      parts.lightSet = [];
      V._lastDims = { len: def.long ? 11 : 7.8, width: 2.6, bodyH: 1 };
    }
    else if (t === 'plane') {
      const scale = def.long ? 1 : 0.55;
      const fus = BABYLON.MeshBuilder.CreateCylinder('pFus', { diameter: 1.6 * scale, height: 14 * scale, tessellation: 10 }, scene);
      fus.rotation.x = Math.PI / 2;
      fus.material = paint;
      fus.position.y = 2 * scale;
      fus.parent = root;
      const wing = BABYLON.MeshBuilder.CreateBox('pWing', { width: 16 * scale, height: 0.25, depth: 2.6 * scale }, scene);
      wing.material = paint;
      wing.position.set(0, 2.1 * scale, 0.6 * scale);
      wing.parent = root;
      for (const s of [-1, 1]) {
        const tail = BABYLON.MeshBuilder.CreateBox('pTail', { width: 0.25, height: 2.4 * scale, depth: 1.6 * scale }, scene);
        tail.material = paint;
        tail.position.set(s * 5 * scale, 2.8 * scale, -6 * scale);
        tail.parent = root;
        const eng = BABYLON.MeshBuilder.CreateCylinder('pEng', { diameter: 0.9 * scale, height: 2 * scale, tessellation: 8 }, scene);
        eng.rotation.x = Math.PI / 2;
        eng.material = dark;
        eng.position.set(s * 4.4 * scale, 1.7 * scale, 1 * scale);
        eng.parent = root;
      }
      const cockpit = BABYLON.MeshBuilder.CreateSphere('pCock', { diameter: 1.4 * scale, segments: 8 }, scene);
      cockpit.material = glassM;
      cockpit.position.set(0, 2.3 * scale, 5.4 * scale);
      cockpit.parent = root;
      // چرخ فرود
      const wheels = [];
      const wg = BABYLON.MeshBuilder.CreateCylinder('pWheelG', { diameter: 0.8, height: 0.3, tessellation: 10 }, scene);
      wg.rotation.z = Math.PI / 2;
      wg.bakeCurrentTransformIntoVertices();
      for (const [px, pz] of [[-3 * scale, 2.4 * scale], [3 * scale, 2.4 * scale], [0, -6 * scale]]) {
        const w = new BABYLON.Mesh('pWheel', scene);
        wg.geometry.applyToMesh(w);
        w.material = tireM;
        w.position.set(px, 0.4, pz);
        w.parent = root;
        wheels.push(w);
      }
      parts.wheels = wheels;
      parts.wheelSteer = [];
      parts.lightSet = [];
      V._lastDims = { len: 14 * scale, width: 16 * scale, bodyH: 2 };
    }
    else if (t === 'heli') {
      const body = BABYLON.MeshBuilder.CreateCapsule('hBody', { height: 3.2, radius: 1.15, tessellation: 10 }, scene);
      body.rotation.x = Math.PI / 2;
      body.material = paint;
      body.position.y = 1.9;
      body.parent = root;
      const glass = BABYLON.MeshBuilder.CreateSphere('hGlass', { diameter: 1.9, segments: 8 }, scene);
      glass.material = glassM;
      glass.position.set(0, 1.9, 1.4);
      glass.parent = root;
      const tail = BABYLON.MeshBuilder.CreateBox('hTail', { width: 0.3, height: 0.4, depth: 4.4 }, scene);
      tail.material = paint;
      tail.position.set(0, 2.1, -3.4);
      tail.parent = root;
      const rotorM = dark;
      const rotor = BABYLON.MeshBuilder.CreateBox('hRotor', { width: 9.5, height: 0.09, depth: 0.5 }, scene);
      rotor.material = rotorM;
      rotor.position.y = 4.2;
      rotor.parent = root;
      const tailRotor = BABYLON.MeshBuilder.CreateBox('hTRotor', { width: 0.09, height: 1.6, depth: 0.3 }, scene);
      tailRotor.material = rotorM;
      tailRotor.position.set(0.35, 2.6, -5.3);
      tailRotor.parent = root;
      for (const s of [-1, 1]) {
        const skid = BABYLON.MeshBuilder.CreateBox('hSkid', { width: 0.14, height: 0.14, depth: 3.4 }, scene);
        skid.material = dark;
        skid.position.set(s * 0.9, 0.25, 0);
        skid.parent = root;
      }
      parts.wheels = [];
      parts.rotor = rotor;
      parts.tailRotor = tailRotor;
      parts.lightSet = [];
      V._lastDims = { len: 8, width: 3, bodyH: 3 };
    }

    // ادغام اجزای ثابت برای کاهش draw call (بدون چرخ‌ها و درها)
    const staticParts = [];
    root.getChildMeshes().forEach(m => {
      if (parts.wheels && parts.wheels.indexOf(m) >= 0) return;
      if (parts.doors && parts.doors.some(d => d.mesh === m)) return;
      if (parts.policeBar && (m === parts.policeBar.r || m === parts.policeBar.b)) return;
      staticParts.push(m);
    });
    const merged = BABYLON.Mesh.MergeMeshes(staticParts, true, true, undefined, false, true);
    if (merged) {
      merged.parent = root;
      merged.isPickable = false;
      parts.body = merged;
    }
    return parts;
  };

  /* ---------- اسپاون وسیله ---------- */
  V.spawn = function (defId, x, z, opts) {
    opts = opts || {};
    const def = typeof defId === 'object' ? defId : DEFS[defId];
    if (!def) return null;
    const scene = TC.G.scene;
    const parts = V.buildMesh(def, opts.color);
    const v = {
      def, parts,
      pos: new BABYLON.Vector3(x, def.type === 'boat' ? C.waterLevel + 0.2 : 0, z),
      yaw: opts.yaw || 0,
      speed: 0, steer: 0,
      health: opts.health !== undefined ? opts.health : 100,
      fuel: opts.fuel !== undefined ? opts.fuel : def.fuel,
      odometer: opts.odometer || 0,
      engineOn: false, lightsOn: false, braking: false,
      ai: opts.ai || null, // {path, idx, laneOffset, targetSpeed, kind: 'traffic'|'police'|'job'}
      driver: opts.driver || null,
      color: opts.color || def.color,
      parked: opts.parked || false,
      plate: 'طو-' + M.randInt(10, 99) + '‌' + M.randInt(100, 999),
      doorAnim: 0,
      owner: opts.owner || null,
    };
    v.parts.root.position.copyFrom(v.pos);
    v.parts.root.rotation.y = v.yaw;
    // برخورد
    const dims = V._lastDims;
    v.radius = Math.max(dims.len, dims.width) * 0.42;
    v.long = dims.len;
    v.width = dims.width;
    TC.Vehicles.all.push(v);
    if (!opts.ai && !opts.parked) {
      // سایه
      if (TC.Engine.shadowEnabled && v.parts.body) TC.Engine.sg.addShadowCaster(v.parts.body);
    }
    return v;
  };

  V.remove = function (v) {
    const i = TC.Vehicles.all.indexOf(v);
    if (i >= 0) TC.Vehicles.all.splice(i, 1);
    if (v.parts && v.parts.root) v.parts.root.dispose(false, true);
    if (TC.Player.inVehicle === v) { TC.Player.inVehicle = null; TC.ActiveVehicle = null; TC.Audio.engineStop(); }
  };

  /* ---------- فیزیک رانندگی ---------- */
  V.update = function (v, dt) {
    const def = v.def;
    // ورودی: بازیکن یا AI
    let throttle = 0, steerIn = 0, brake = false, upDown = 0;
    if (TC.Player.inVehicle === v) {
      const inp = TC.Virtual;
      if (def.type === 'heli') {
        throttle = inp.gasY; // بالا/پایین
        upDown = inp.upDown;
        steerIn = inp.steerX;
        v.collective = throttle;
        v.pitchIn = inp.gasY;
      } else if (def.type === 'plane') {
        throttle = inp.gasY > 0 ? 1 : 0;
        upDown = inp.upDown; // pitch
        steerIn = inp.steerX;
      } else {
        throttle = inp.gasY;
        steerIn = inp.steerX;
        brake = inp.brake;
      }
    } else if (v.ai && v.ai.update) {
      const c = v.ai.update(v, dt);
      if (c) { throttle = c.throttle; steerIn = c.steer; brake = c.brake; upDown = c.up || 0; }
    } else return;

    // سوخت
    if (def.type !== 'bicycle' && v.fuel > 0) {
      v.fuel = Math.max(0, v.fuel - dt * (0.02 + Math.abs(throttle) * 0.10 + v.speed * 0.0006) * (def.type === 'heli' || def.type === 'plane' ? 3 : 1));
      if (v.fuel <= 0) { throttle = 0; }
    } else if (def.type !== 'bicycle') throttle = 0;

    const damaged = v.health < 30 ? 0.55 : v.health < 60 ? 0.8 : 1;
    const top = def.top * damaged;

    if (def.type === 'heli') {
      V.updateHeli(v, dt, throttle, steerIn, upDown);
    } else if (def.type === 'plane') {
      V.updatePlane(v, dt, throttle, steerIn, upDown);
    } else if (def.type === 'boat') {
      V.updateBoat(v, dt, throttle, steerIn);
    } else {
      V.updateCar(v, dt, throttle, steerIn, brake, top);
    }

    // چرخ‌ها
    if (v.parts.wheels) {
      const spin = v.speed * dt * 3;
      for (const w of v.parts.wheels) w.rotation.x += spin;
      if (v.parts.wheelSteer) for (const w of v.parts.wheelSteer) w.rotation.y = M.lerp(w.rotation.y, v.steer * 0.55, 1 - Math.exp(-10 * dt));
    }
    // روتور هلی
    if (v.parts.rotor) {
      const on = v.engineOn;
      v._rotorSpeed = M.damp(v._rotorSpeed || 0, on ? 22 : 0, 1.2, dt);
      v.parts.rotor.rotation.y += v._rotorSpeed * dt;
      v.parts.tailRotor.rotation.x += v._rotorSpeed * dt * 1.6;
    }
    // صدا
    if (TC.Player.inVehicle === v && TC.Audio.engineNodes) {
      const rpm = def.type === 'heli' ? (v._rotorSpeed || 0) / 22 : M.clamp(Math.abs(v.speed) / top, 0, 1);
      TC.Audio.engineUpdate(rpm, Math.abs(throttle));
    }
    // برخورد با دنیا
    if (def.type !== 'heli' || v.pos.y < 2) {
      const hit = TC.Physics.resolveCircle(v.pos, v.radius, 1.4);
      if (hit) {
        const impact = Math.abs(v.speed);
        if (impact > 4) {
          v.damage(impact * 1.6, 'برخورد');
          TC.Audio.play3d('crash', v.pos.x, v.pos.z, M.clamp(impact / 16, 0.2, 1));
          if (TC.Player.inVehicle === v) {
            TC.Camera.addShake(impact / 24);
            TC.Player.damage(impact * 0.4, 'برخورد خودرو');
          }
          v.speed *= -0.25;
          if (v.ai) v.ai.stunned = 1.2;
        } else v.speed *= 0.4;
      }
    }
    // برخورد خودروها با هم
    for (const o of TC.Vehicles.all) {
      if (o === v) continue;
      const d = M.dist2(v.pos.x, v.pos.z, o.pos.x, o.pos.z);
      const minD = (v.radius + o.radius) * 0.82;
      if (d < minD && d > 0.01) {
        const push = (minD - d) / d * 0.5;
        const dx = (v.pos.x - o.pos.x) * push, dz = (v.pos.z - o.pos.z) * push;
        const vm = def.mass, om = o.def.mass;
        v.pos.x += dx * (om / (vm + om)) * 2; v.pos.z += dz * (om / (vm + om)) * 2;
        o.pos.x -= dx * (vm / (vm + om)) * 2; o.pos.z -= dz * (vm / (vm + om)) * 2;
        const rel = Math.abs(v.speed - o.speed);
        if (rel > 6) {
          v.damage(rel * 1.2, 'تصادم'); o.damage(rel * 1.2, 'تصادم');
          TC.Audio.play3d('crash', v.pos.x, v.pos.z, M.clamp(rel / 20, 0.2, 0.9));
          if (TC.Player.inVehicle === v || TC.Player.inVehicle === o) TC.Camera.addShake(rel / 20);
        }
        v.speed *= 0.72; o.speed *= 0.72;
        if (v.ai) v.ai.stunned = 0.8;
        if (o.ai) o.ai.stunned = 0.8;
      }
    }
    // برخورد با عابرها
    if (Math.abs(v.speed) > 3) {
      for (const p of TC.Pedestrians) {
        if (p.dead) continue;
        const d = M.dist2(v.pos.x, v.pos.z, p.pos.x, p.pos.z);
        if (d < v.radius * 0.8) {
          p.damage(Math.abs(v.speed) * 3.5, 'تصادم با خودرو');
          v.speed *= 0.8;
          if (v.driver === 'player') TC.Police && TC.Police.reportCrime('hitrun', v.pos.x, v.pos.z);
        }
      }
      // بازیکن پیاده
      if (!TC.Player.inVehicle && !TC.Player.dead) {
        const d = M.dist2(v.pos.x, v.pos.z, TC.Player.pos.x, TC.Player.pos.z);
        if (d < v.radius * 0.85) {
          TC.Player.damage(Math.abs(v.speed) * 2.2, 'تصادف');
          TC.Camera.addShake(0.4);
        }
      }
    }
    // انیمیشن در (هنگام ورود/خروج)
    if (v.doorAnim > 0) {
      v.doorAnim -= dt * 2;
      if (v.parts.doors) {
        const openAmt = Math.sin(M.clamp(v.doorAnim, 0, 1) * Math.PI) * 0.9;
        for (const d of v.parts.doors) d.mesh.rotation.y = d.side * openAmt * 1.4;
      }
    }
    // اعمال موقعیت
    v.parts.root.position.copyFrom(v.pos);
    v.parts.root.rotation.y = v.yaw;
    if (def.type === 'plane' || def.type === 'heli') {
      v.parts.root.rotation.x = M.clamp(v._pitchVis || 0, -0.35, 0.35);
      v.parts.root.rotation.z = M.clamp(v._rollVis || 0, -0.5, 0.5);
    }
    // چراغ‌ها و دود آسیب
    V.updateVisuals(v, dt);
  };

  V.updateCar = function (v, dt, throttle, steerIn, brake, top) {
    const def = v.def;
    v.steer = M.damp(v.steer, steerIn, 8, dt);
    // شتاب
    if (throttle > 0.05) {
      v.speed += def.accel * throttle * dt * (1 - M.clamp(Math.abs(v.speed) / top, 0, 1));
    } else if (throttle < -0.05) {
      if (v.speed > 1) v.speed -= def.accel * 1.7 * dt; // ترمز
      else v.speed = Math.max(-top * 0.35, v.speed + def.accel * 0.5 * throttle * dt); // دنده عقب
    }
    if (brake) v.speed = M.damp(v.speed, 0, 3.5, dt);
    // اصطکاک
    v.speed -= v.speed * dt * 0.35;
    if (Math.abs(v.speed) < 0.15 && Math.abs(throttle) < 0.05) v.speed = 0;
    v.speed = M.clamp(v.speed, -top * 0.4, top);
    // فرمان
    const speedFactor = M.clamp(Math.abs(v.speed) / 12, 0, 1);
    const turn = v.steer * def.handling * speedFactor * (v.speed < 0 ? -1 : 1) * dt;
    v.yaw += turn;
    // لغزش ترمز دستی
    const skidding = brake && Math.abs(v.speed) > 8;
    v.braking = brake || throttle < -0.05;
    TC.Audio.skid(TC.Player.inVehicle === v && skidding, M.clamp(Math.abs(v.speed) / 20, 0.3, 1));
    // حرکت
    v.pos.x += Math.sin(v.yaw) * v.speed * dt;
    v.pos.z += Math.cos(v.yaw) * v.speed * dt;
    v.odometer += Math.abs(v.speed) * dt;
    v.pos.y = 0;
  };

  V.updateBoat = function (v, dt, throttle, steerIn) {
    const def = v.def;
    // قایق فقط روی آب
    const inWater = TC.Physics.isWater(v.pos.x, v.pos.z) || v.pos.y < C.waterLevel + 0.5;
    v.steer = M.damp(v.steer, steerIn, 4, dt);
    if (throttle > 0.05) v.speed += def.accel * dt * (1 - M.clamp(v.speed / def.top, 0, 1));
    else if (throttle < -0.05) v.speed -= def.accel * 0.6 * dt;
    v.speed -= v.speed * dt * 0.5;
    v.speed = M.clamp(v.speed, -4, def.top);
    if (!inWater && Math.abs(v.speed) > 2) {
      v.damage(8 * dt, 'خشکی'); v.speed *= 0.9;
    }
    v.yaw += v.steer * def.handling * M.clamp(Math.abs(v.speed) / 8, 0, 1) * dt;
    v.pos.x += Math.sin(v.yaw) * v.speed * dt;
    v.pos.z += Math.cos(v.yaw) * v.speed * dt;
    const targetY = C.waterLevel + 0.25 + Math.sin(TC.G.playTimeSec * 1.4) * 0.12;
    v.pos.y = M.damp(v.pos.y, targetY, 3, dt);
    v.odometer += Math.abs(v.speed) * dt;
    v._pitchVis = -M.clamp(v.speed / def.top, 0, 1) * 0.12;
  };

  V.updateHeli = function (v, dt, collective, steerIn, pitchIn) {
    const def = v.def;
    if (!v.engineOn) return;
    v.alt = v.alt || 0;
    // ارتفاع
    const lift = collective * def.accel * 1.1;
    v.velH = (v.velH || 0) + lift * dt;
    v.velH = M.clamp(v.velH, -8, 10);
    if (Math.abs(collective) < 0.1) v.velH = M.damp(v.velH, -1.2, 1.5, dt);
    v.pos.y += v.velH * dt;
    if (v.pos.y <= 0) { v.pos.y = 0; v.velH = 0; }
    v.pos.y = Math.min(v.pos.y, 220);
    // حرکت افقی
    v._pitchVis = M.damp(v._pitchVis || 0, pitchIn * 0.3, 3, dt);
    v._rollVis = M.damp(v._rollVis || 0, -steerIn * 0.3, 3, dt);
    const fwd = pitchIn * def.top * 0.6;
    const strafe = steerIn * def.top * 0.35;
    v.yaw += 0;
    v.pos.x += Math.sin(v.yaw) * fwd * dt + Math.cos(v.yaw) * strafe * dt;
    v.pos.z += Math.cos(v.yaw) * fwd * dt - Math.sin(v.yaw) * strafe * dt;
    v.speed = fwd;
    v.odometer += Math.abs(fwd) * dt;
    v._pitchVis = -M.clamp(fwd / def.top, -0.5, 0.5) * 0.35;
  };

  V.updatePlane = function (v, dt, throttle, steerIn, pitchIn) {
    const def = v.def;
    if (!v.engineOn) return;
    // سرعت
    if (throttle > 0.05) v.speed += def.accel * dt * 0.6;
    v.speed = M.clamp(v.speed, 0, def.top);
    // بلند شدن با سرعت کافی
    const liftSpeed = 14;
    if (v.pos.y > 0.5 || v.speed > liftSpeed) {
      v._pitchVis = M.damp(v._pitchVis || 0, pitchIn * 0.3, 3, dt);
      const climb = -pitchIn * 8 * (v.speed / def.top) + 0;
      v.velY = (v.velY || 0) + climb * dt;
      v.velY = M.clamp(v.velY, -6, 7);
      v.pos.y += v.velY * dt;
      if (v.pos.y <= 0) {
        // فرود
        if (Math.abs(v.velY) > 5 || Math.abs(v.speed) > 30) {
          v.damage(40, 'فرود سخت');
          TC.Camera.addShake(0.8);
        }
        v.pos.y = 0; v.velY = 0;
      }
      v.pos.y = Math.min(v.pos.y, 300);
    } else {
      v.pos.y = M.damp(v.pos.y, 0, 8, dt);
    }
    // چرخش فرمان روی زمین
    const turnRate = v.pos.y < 1 ? 1.1 : 0.55;
    v.yaw += steerIn * turnRate * M.clamp(v.speed / 10, 0.2, 1) * dt;
    v.pos.x += Math.sin(v.yaw) * v.speed * dt;
    v.pos.z += Math.cos(v.yaw) * v.speed * dt;
    v._rollVis = M.damp(v._rollVis || 0, -steerIn * 0.25, 3, dt);
    v.odometer += v.speed * dt;
  };

  V.updateVisuals = function (v, dt) {
    // چراغ‌های جلو/عقب
    const night = TC.DayNight && TC.DayNight.isNight();
    const on = v.lightsOn || (night && (TC.Player.inVehicle === v));
    if (v.parts.headM) {
      v.parts.headM.emissiveColor = on ? new BABYLON.Color3(0.9, 0.8, 0.5) : new BABYLON.Color3(0.12, 0.1, 0.06);
      const braking = v.braking || (v.speed < -0.5);
      v.parts.tailM.emissiveColor = braking ? new BABYLON.Color3(0.85, 0.1, 0.05) : new BABYLON.Color3(0.2, 0.03, 0.02);
    }
    // چراغ گردان پلیس
    if (v.parts.policeBar && v.sirenOn) {
      v._barT = (v._barT || 0) + dt * 6;
      const ph = Math.sin(v._barT) > 0;
      v.parts.policeBar.rM.emissiveColor = ph ? new BABYLON.Color3(1, 0.1, 0.1) : new BABYLON.Color3(0.3, 0, 0);
      v.parts.policeBar.bM.emissiveColor = ph ? new BABYLON.Color3(0.1, 0.2, 1) : new BABYLON.Color3(0, 0, 0.4);
    } else if (v.parts.policeBar) {
      v.parts.policeBar.rM.emissiveColor = new BABYLON.Color3(0.25, 0, 0);
      v.parts.policeBar.bM.emissiveColor = new BABYLON.Color3(0, 0, 0.3);
    }
    // دود آسیب
    if (v.health < 40 && TC.G.engine) {
      v._smokeT = (v._smokeT || 0) + dt;
      if (v._smokeT > 0.2 && v.parts.body) {
        v._smokeT = 0;
        if (!TC.Vehicles._smokePS) {
          const ps = new BABYLON.ParticleSystem('smoke', 300, TC.G.scene);
          const tex = new BABYLON.DynamicTexture('smokeT', { width: 32, height: 32 }, TC.G.scene, false);
          const cx = tex.getContext();
          const g = cx.createRadialGradient(16, 16, 2, 16, 16, 15);
          g.addColorStop(0, 'rgba(60,60,65,0.7)'); g.addColorStop(1, 'rgba(60,60,65,0)');
          cx.fillStyle = g; cx.fillRect(0, 0, 32, 32);
          tex.update(false); tex.hasAlpha = true;
          ps.particleTexture = tex;
          ps.minSize = 0.6; ps.maxSize = 2.2;
          ps.minLifeTime = 0.9; ps.maxLifeTime = 1.8;
          ps.emitRate = 24;
          ps.direction1 = new BABYLON.Vector3(-0.4, 2.4, -0.4);
          ps.direction2 = new BABYLON.Vector3(0.4, 3.4, 0.4);
          ps.minEmitPower = 0.4; ps.maxEmitPower = 1;
          ps.color1 = new BABYLON.Color4(0.25, 0.25, 0.27, 0.5);
          ps.color2 = new BABYLON.Color4(0.2, 0.2, 0.22, 0.4);
          ps.colorDead = new BABYLON.Color4(0.2, 0.2, 0.22, 0);
          ps.start();
          TC.Vehicles._smokePS = ps;
        }
        TC.Vehicles._smokePS.emitter = new BABYLON.Vector3(v.pos.x, v.pos.y + 1.2, v.pos.z);
        TC.Vehicles._smokePS.emitRate = v.health < 15 ? 60 : 24;
      }
    }
  };

  V.damage = function (v, amount, source) {
    v.health = Math.max(0, v.health - amount);
    if (v.health <= 0 && v.def.type !== 'bicycle') {
      v.speed *= 0.2;
      if (TC.Player.inVehicle === v) {
        TC.ui && TC.ui.notify('خودرو کاملاً خراب شد! به تعمیرگاه بروید', 'error');
        TC.Audio.engineStop();
      }
    }
  };
  // فراخوانی به شکل v.damage(...) — bind
  const _origSpawn = V.spawn;
  V.spawn = function (defId, x, z, opts) {
    const v = _origSpawn(defId, x, z, opts);
    if (v) v.damage = (a, s) => V.damage(v, a, s);
    return v;
  };

  /* ---------- ورود/خروج بازیکن ---------- */
  V.nearestEnterable = function (pos, maxDist) {
    let best = null, bd = maxDist || 4.5;
    for (const v of TC.Vehicles.all) {
      const d = M.dist2(pos.x, pos.z, v.pos.x, v.pos.z);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return best;
  };

  V.enter = function (v) {
    if (v.def.type === 'bicycle') { /* دوچرخه بدون سوخت */ }
    if (v.locked) { TC.ui && TC.ui.notify('این خودرو قفل است', 'warn'); return; }
    // اگر NPC راننده دارد: سرقت
    if (v.ai && v.ai.kind === 'traffic' && v.driver) {
      v.driver.fleeFrom(v);
      v.ai = null;
      v.driver = null;
      TC.Police && TC.Police.reportCrime('carjack', v.pos.x, v.pos.z);
    }
    if (v.def.police && !v.allowedPolice) {
      TC.Police && TC.Police.reportCrime('carjack', v.pos.x, v.pos.z, 1.5);
    }
    v.engineOn = true;
    v.doorAnim = 1;
    TC.Audio.play3d('door', v.pos.x, v.pos.z, 0.8);
    TC.Player.enterVehicle(v);
    TC.Camera.mode = 'car';
    TC.Camera._vehMode = TC.Camera._vehMode || 'car';
    if (TC.Mobile && TC.Mobile.active) TC.Mobile.rebuildButtons();
  };

  V.exit = function (v) {
    v.engineOn = v.def.type === 'heli' || v.def.type === 'plane' ? false : v.engineOn;
    if (v.def.type === 'heli' || v.def.type === 'plane') v.engineOn = false;
    v.doorAnim = 1;
    TC.Audio.play3d('door', v.pos.x, v.pos.z, 0.8);
    TC.Camera.resetToThird();
    TC.Player.exitVehicle();
  };

  V.toggleEngine = function (v) {
    v.engineOn = !v.engineOn;
    if (v.engineOn) TC.Audio.engineStart(v.def.sound);
    else TC.Audio.engineStop();
    TC.ui && TC.ui.notify(v.engineOn ? 'موتور روشن شد' : 'موتور خاموش شد');
  };

  V.horn = function (on) { TC.Audio.horn(on); };

  /* ---------- گاراژ بازیکن ---------- */
  V.buyVehicle = function (defId, payMethod) {
    const def = DEFS[defId];
    if (!def) return false;
    if (!TC.Economy.spend(def.price, 'خرید ' + def.name, payMethod)) return false;
    V.playerGarage.push({ defId, health: 100, fuel: def.fuel, odometer: 0, color: def.color, plate: 'طو-' + M.randInt(10, 99) + '‌' + M.randInt(100, 999) });
    TC.bus.emit('garage:change');
    return true;
  };
  V.sellVehicle = function (idx) {
    const car = V.playerGarage[idx];
    if (!car) return 0;
    const def = DEFS[car.defId];
    const wear = M.clamp(car.health / 100, 0.3, 1);
    const usage = M.clamp(1 - car.odometer / 80000, 0.5, 1);
    const price = Math.round(def.price * 0.62 * wear * usage);
    V.playerGarage.splice(idx, 1);
    TC.Economy.earn(price, 'فروش ' + def.name, 'bank');
    TC.bus.emit('garage:change');
    return price;
  };
  V.deliverVehicle = function (defId, x, z) {
    // تحویل خودرو از گاراژ به کنار بازیکن
    const idx = V.playerGarage.findIndex(c => c.defId === defId);
    if (idx < 0) return null;
    const car = V.playerGarage[idx];
    const v = V.spawn(car.defId, x, z, { color: car.color, health: car.health, fuel: car.fuel, odometer: car.odometer, owner: 'player' });
    v.garageIdx = idx;
    return v;
  };
  V.storeToGarage = function (v) {
    if (v.garageIdx === undefined) return false;
    const car = V.playerGarage[v.garageIdx];
    if (car) { car.health = v.health; car.fuel = v.fuel; car.odometer = v.odometer; }
    V.remove(v);
    TC.bus.emit('garage:change');
    return true;
  };

  /* ---------- اسپاون خودروهای پارک‌شده و ترافیک اولیه ---------- */
  V.buildStatic = function () {
    // خودروهای پارک‌شده با instance (بدون فیزیک)
    const spots = TC.Props.parkedSpots || [];
    const staticDefs = ['sedan', 'hatch', 'taxi', 'pickup', 'suv', 'classic'];
    const colors = ['#8a9bb0', '#c8b070', '#c0392b', '#3a7a9a', '#5a6a4a', '#2a2e36', '#e8e4d8'];
    M.resetSeed(777);
    for (const s of spots) {
      const def = DEFS[staticDefs[M.srandInt(0, staticDefs.length - 1)]];
      const color = colors[M.srandInt(0, colors.length - 1)];
      const parts = V.buildMesh(def, color);
      parts.root.position.set(s.x, 0, s.z);
      parts.root.rotation.y = s.ry || 0;
      parts.root.freezeWorldMatrix();
      parts.root.isPickable = false;
      // ثبت برخورد کم‌هزینه
      TC.Physics.addBox(s.x, s.z, 1.9, 4.2, 1.4, 0, 'parkedcar');
    }
    // تاکسی‌های خطی و اتوبوس در ایستگاه‌ها
    V.spawn('taxi', TC.roadCoord(6) + 6, TC.roadCoord(6) + 40, { parked: false, color: '#f5b301' });
    // قایق‌ها در اسکله و ساحل
    if (TC.World.harbor) {
      V.spawn('boat', TC.World.harbor.x - 30, TC.CONFIG.waterLevel + 0, { yaw: 0.5 });
      V.spawn('boat', TC.World.harbor.x + 26, C.waterLevel - 3, { yaw: -0.3 });
    }
    for (const bs of (TC.World.boatSpots || [])) {
      V.spawn(M.randInt(0, 1) ? 'boat' : 'yatch', bs.x, C.waterLevel, { yaw: M.rand(0, 6) });
    }
    // هواپیما در فرودگاه
    if (TC.World.airport) {
      V.spawn('planeS', TC.World.airport.x - 14, TC.World.airport.z + 30, { yaw: Math.PI });
      V.spawn('planeL', TC.World.airport.x + 14, TC.World.airport.z - 40, { yaw: 0 });
    }
    // هلیکوپتر پلیس روی بام اداره پلیس + یکی در فرودگاه
    const pol = TC.poiByType('police')[0];
    if (pol) V.spawn('heli', pol.x + 22, pol.z - 20, { yaw: 0.4 });
    if (TC.World.airport) V.spawn('heli', TC.World.airport.x - 30, TC.World.airport.z - 60, { yaw: 1 });
  };

  V.serializeGarage = function () { return JSON.parse(JSON.stringify(V.playerGarage)); };
  V.deserializeGarage = function (d) {
    if (Array.isArray(d)) V.playerGarage = JSON.parse(JSON.stringify(d));
    TC.bus.emit('garage:change');
  };
  /* خودروی فعال (وسط خیابان) ذخیره شود */
  V.serializeActive = function () {
    const v = TC.Player.inVehicle;
    if (!v || v.garageIdx === undefined) return null;
    return { garageIdx: v.garageIdx, health: v.health, fuel: v.fuel, odometer: v.odometer, x: v.pos.x, z: v.pos.z, yaw: v.yaw };
  };

  TC.Vehicles = V;
})();
