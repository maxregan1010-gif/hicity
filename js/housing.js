/* ============================================================
 * housing.js — خانه شخصی: اتاق خواب، پذیرایی، آشپزخانه، حمام،
 * کمد لباس، پارکینگ، خواب، ذخیره، مدیریت خودروها و دارایی‌ها
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Hs = {
    built: false,
    inside: false,
    houseTiers: [
      { id: 1, name: 'خانه شهرک آفتاب', price: 0, desc: 'خانه کوچک اولیه شما', slots: 3 },
      { id: 2, name: 'آپارتمان مرکز طوفان', price: 150000, desc: 'آپارتمان بزرگ در مرکز با گاراژ ۵ خودرو', slots: 5 },
      { id: 3, name: 'ویلای شاه‌نشین', price: 520000, desc: 'ویلای لوکس با گاراژ ۸ خودرو', slots: 8 },
    ],
    currentTier: 1,
  };

  /* ---------- ساخت داخل خانه ---------- */
  Hs.build = function () {
    if (Hs.built) return;
    const scene = TC.G.scene;
    const home = TC.World.playerHome;
    if (!home) return;
    const x = home.x, z = home.z;
    const wood = TC.World.mats.wood, metal = TC.World.mats.metal, concrete = TC.World.mats.concrete;
    // دیوارهای داخلی (اتاق‌بندی): پذیرایی بزرگ جنوب، اتاق خواب شمال غرب، آشپزخانه شمال شرق، حمام شرق
    function partition(cx, cz, w, d, h) {
      const b = BABYLON.MeshBuilder.CreateBox('pt', { width: w, height: h || 3.2, depth: d }, scene);
      b.material = concrete;
      b.position.set(cx, (h || 3.2) / 2, cz);
      b.freezeWorldMatrix();
      b.isPickable = false;
      TC.Physics.addBox(cx, cz, w, d, h || 3.2, 0, 'partition');
    }
    // پارتیشن اتاق خواب
    partition(x - 3, z - 3, 0.3, 8, 3.2);
    // پارتیشن آشپزخانه (با درگاه)
    partition(x + 2.5, z - 3, 0.3, 4.4, 3.2);
    partition(x + 2.5, z + 0.6, 3.4, 0.3, 3.2);
    // پارتیشن حمام
    partition(x + 6.4, z + 3, 0.3, 6, 3.2);
    partition(x + 5, z + 6, 2.9, 0.3, 3.2);
    // --- مبلمان ---
    // تخت
    const bed = BABYLON.MeshBuilder.CreateBox('bed', { width: 2.2, height: 0.55, depth: 3 }, scene);
    bed.material = wood;
    bed.position.set(x - 5, 0.4, z - 5);
    bed.freezeWorldMatrix();
    const mattress = BABYLON.MeshBuilder.CreateBox('matress', { width: 2, height: 0.25, depth: 2.8 }, scene);
    const mMat = new BABYLON.StandardMaterial('mM', scene);
    mMat.diffuseColor = BABYLON.Color3.FromHexString('#e8e4d8');
    mMat.specularColor = BABYLON.Color3.Black();
    mMat.freeze();
    mattress.material = mMat;
    mattress.position.set(x - 5, 0.8, z - 5);
    mattress.freezeWorldMatrix();
    // کمد لباس
    const closet = BABYLON.MeshBuilder.CreateBox('closet', { width: 2.6, height: 2.6, depth: 0.7 }, scene);
    closet.material = wood;
    closet.position.set(x - 6.5, 1.3, z - 1.2);
    closet.freezeWorldMatrix();
    TC.Physics.addBox(x - 6.5, z - 1.2, 2.6, 0.7, 2.6, 0, 'closet');
    // مبل پذیرایی
    for (const [sx, sz, ry] of [[x - 2, z + 4, 0], [x - 4.2, z + 2.6, Math.PI / 2], [x + 0.2, z + 2.6, -Math.PI / 2]]) {
      const sofa = BABYLON.MeshBuilder.CreateBox('sofa', { width: 2, height: 0.6, depth: 0.85 }, scene);
      sofa.material = wood;
      sofa.position.set(sx, 0.45, sz);
      sofa.rotation.y = ry;
      sofa.freezeWorldMatrix();
    }
    // میز تلویزیون + تلویزیون
    const tvStand = BABYLON.MeshBuilder.CreateBox('tvStand', { width: 1.8, height: 0.5, depth: 0.5 }, scene);
    tvStand.material = wood;
    tvStand.position.set(x - 2, 0.35, z + 6);
    tvStand.freezeWorldMatrix();
    const tv = BABYLON.MeshBuilder.CreateBox('tv', { width: 1.6, height: 0.9, depth: 0.08 }, scene);
    const tvMat = new BABYLON.StandardMaterial('tvM', scene);
    tvMat.diffuseColor = BABYLON.Color3.FromHexString('#0a0c14');
    tvMat.emissiveColor = new BABYLON.Color3(0.06, 0.09, 0.14);
    tvMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.6);
    tvMat.freeze();
    tv.material = tvMat;
    tv.position.set(x - 2, 1.2, z + 6.2);
    tv.freezeWorldMatrix();
    // آشپزخانه: کابینت + یخچال
    const counter = BABYLON.MeshBuilder.CreateBox('counter', { width: 4.4, height: 0.95, depth: 0.7 }, scene);
    counter.material = wood;
    counter.position.set(x + 4.6, 0.5, z - 4.8);
    counter.freezeWorldMatrix();
    const fridge = BABYLON.MeshBuilder.CreateBox('fridge', { width: 0.9, height: 2, depth: 0.8 }, scene);
    fridge.material = metal;
    fridge.position.set(x + 6.6, 1, z - 4.8);
    fridge.freezeWorldMatrix();
    TC.Physics.addBox(x + 6.6, z - 4.8, 0.9, 0.8, 2, 0, 'fridge');
    // حمام: وان
    const tub = BABYLON.MeshBuilder.CreateBox('tub', { width: 1, height: 0.6, depth: 2 }, scene);
    const tubM = new BABYLON.StandardMaterial('tubM', scene);
    tubM.diffuseColor = BABYLON.Color3.FromHexString('#e8f0f4');
    tubM.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
    tubM.freeze();
    tub.material = tubM;
    tub.position.set(x + 6.4, 0.35, z + 3);
    tub.freezeWorldMatrix();
    // پارکینگ جلوی خانه
    Hs.parkingPos = { x: home.room ? home.room.doorPos.x + 6 : x + 8, z: z + 11 };
    // خط پارک
    for (let i = -1; i <= 1; i++) {
      const line = BABYLON.MeshBuilder.CreatePlane('hLine', { width: 0.2, height: 5 }, scene);
      line.material = TC.World.mats.laneEdge;
      line.rotation.x = Math.PI / 2;
      line.position.set(x + i * 3.4, 0.02, z + 11);
      line.freezeWorldMatrix();
    }
    // تابلوی خانه
    TC.World.makeSign(x, 4.6, z + 7.2, 0, '🏠', 'خانه آرش راد', '#f5b301');
    Hs.built = true;
  };

  /* ---------- تعامل‌های خانه ---------- */
  Hs.init = function () {
    Hs.build();
    const home = TC.World.playerHome;
    // ورود/داشبورد خانه (نزدیک در)
    TC.addInteract({
      x: home.x, z: home.z + 7, radius: 4.5,
      text: 'خانه — داشبورد (دارایی‌ها، ذخیره، مدیریت)',
      action: () => Hs.openDashboard(),
    });
    // تخت
    TC.addInteract({
      x: home.x - 5, z: home.z - 5, radius: 2.6,
      text: 'خوابیدن تا فردا (ذخیره خودکار)',
      action: () => Hs.sleep(),
    });
    // کمد لباس
    TC.addInteract({
      x: home.x - 6.5, z: home.z - 1.2, radius: 2.6,
      text: 'کمد لباس — تغییر پوشش',
      action: () => TC.ui.openWardrobe(),
    });
    // گاوصندوق
    TC.addInteract({
      x: home.x + 6.6, z: home.z - 4.8, radius: 2.4,
      text: 'گاوصندوق — مشاهده موجودی',
      action: () => {
        TC.ui.dialogue('گاوصندوق', 'پول نقد: ' + TC.moneyFmt(TC.Economy.cash) + ' تومان\nموجودی بانک: ' + TC.moneyFmt(TC.Economy.bank) + ' تومان\nمجموع دارایی نقدی: ' + TC.moneyFmt(TC.Economy.cash + TC.Economy.bank) + ' تومان', [
          { label: 'بستن', action: () => { } },
        ]);
      },
    });
    // پارکینگ خودرو
    TC.addInteract({
      x: Hs.parkingPos.x, z: Hs.parkingPos.z, radius: 6,
      text: 'گاراژ خانه — مدیریت خودروها',
      action: () => TC.ui.openGarage(),
    });
  };

  Hs.openDashboard = function () {
    const garageCount = TC.Vehicles.playerGarage.length;
    const houseName = Hs.houseTiers[Hs.currentTier - 1].name;
    const body = TC.ui.shopUI;
    TC.ui.openShop('🏠 خانه آرش راد', (box) => {
      box.innerHTML = `
        <div class="row-line"><span>پول نقد</span><b class="rl-grow">${TC.moneyFmt(TC.Economy.cash)} تومان</b></div>
        <div class="row-line"><span>موجودی بانک</span><b class="rl-grow">${TC.moneyFmt(TC.Economy.bank)} تومان</b></div>
        <div class="row-line"><span>مسکن</span><b class="rl-grow">${houseName}</b></div>
        <div class="row-line"><span>خودروهای گاراژ</span><b class="rl-grow">${TC.faNum(garageCount)} دستگاه</b></div>
        <div class="row-line"><span>شغل فعال</span><b class="rl-grow">${TC.Jobs.active ? TC.Jobs.active.def.title : '—'}</b></div>
        <div class="row-line"><span>پیشرفت داستان</span><b class="rl-grow">فصل ${TC.faNum(Math.max(1, TC.Missions.storyIndex + 1))} از ۸</b></div>
        <div class="row-line"><span>روز بازی</span><b class="rl-grow">روز ${TC.faNum(TC.G.day)} — ${TC.dayName()}</b></div>
        <div class="shop-cat-bar" style="margin-top:14px">
          <button class="shop-cat" data-act="sleep">🛏️ استراحت تا فردا</button>
          <button class="shop-cat" data-act="wardrobe">👕 تغییر لباس</button>
          <button class="shop-cat" data-act="garage">🚗 مدیریت خودروها</button>
          <button class="shop-cat" data-act="save">💾 ذخیره بازی</button>
          <button class="shop-cat" data-act="estate">🏘️ ارتقای خانه (مشاور املاک)</button>
        </div>`;
      box.querySelectorAll('[data-act]').forEach(b => {
        b.onclick = () => {
          TC.ui.closeShop();
          const act = b.dataset.act;
          if (act === 'sleep') Hs.sleep();
          else if (act === 'wardrobe') TC.ui.openWardrobe();
          else if (act === 'garage') TC.ui.openGarage();
          else if (act === 'save') TC.Save.saveSlot(0);
          else if (act === 'estate') Hs.openEstate();
        };
      });
    });
  };

  Hs.sleep = function () {
    TC.ui.confirm('خوابیدن تا صبح؟ (بازی ذخیره می‌شود و ساعت به ۷ صبح می‌رود)', () => {
      // پایان روز کاری (حقوق و غیبت) سپس پیشروی زمان تا ۷ صبح روز بعد
      TC.bus.emit('day:end', TC.G.day);
      TC.G.day++;
      TC.G.time = 7 * 3600;
      TC.Player.health = 100;
      TC.Player.stamina = 100;
      TC.Audio.jingle('complete');
      TC.ui.notify('صبح روز ' + TC.faNum(TC.G.day) + ' (' + TC.dayName() + ') — استراحت کردید و سرحالید', 'success');
      TC.bus.emit('day:new', TC.G.day);
      TC.Save && TC.Save.saveSlot(0, true);
    });
  };

  Hs.openEstate = function () {
    const tier = Hs.houseTiers[Hs.currentTier];
    if (!tier) { TC.ui.notify('شما بهترین خانه شهر را دارید!', 'success'); return; }
    TC.ui.confirm('ارتقای مسکن به «' + tier.name + '» به قیمت ' + TC.moneyFmt(tier.price) + ' تومان؟', () => {
      if (TC.Economy.spend(tier.price, 'خرید ملک — ' + tier.name)) {
        Hs.currentTier = tier.id;
        TC.ui.notify('🎉 خانه جدید: ' + tier.name, 'success');
        TC.bus.emit('housing:change');
      }
    });
  };

  Hs.serialize = function () { return { currentTier: Hs.currentTier }; };
  Hs.deserialize = function (d) { if (d) Hs.currentTier = d.currentTier || 1; };

  TC.Housing = Hs;
})();
