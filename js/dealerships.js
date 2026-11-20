/* ============================================================
 * dealerships.js — نمایشگاه‌های خودرو: بازدید سه‌بعدی، مشخصات،
 * خرید (نقد/بانکی)، فروش خودرو، گاراژ شخصی
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const DE = {
    built: false,
    showroomStock: {
      economy: ['sedan', 'hatch', 'ridecar', 'taxi'],
      sports: ['sport1', 'sport2', 'sport3'],
      luxury: ['luxury1', 'luxury2', 'classic'],
      suv: ['suv', 'pickup'],
      moto: ['moto1', 'moto2', 'bicycle'],
      heavy: ['truck', 'bus'],
      boat: ['boat', 'yatch'],
      air: ['planeS', 'heli'],
    },
    viewer: null,   // {mesh, yaw, def, canvasCtx}
  };

  DE.build = function () {
    if (DE.built) return;
    // در هر نمایشگاه چند خودرو نمایشی روی پایه
    for (const d of (TC.World.dealers || [])) {
      const stock = DE.showroomStock[d.type] || ['sedan'];
      d.stock = stock;
      // خودروهای نمایشی داخل سالن
      d.displayCars = [];
      const n = Math.min(3, stock.length);
      for (let i = 0; i < n; i++) {
        const def = TC.Vehicles.DEFS[stock[i]];
        if (!def) continue;
        const parts = TC.Vehicles.buildMesh(def);
        const px = d.x - 6 + i * 6, pz = d.z - 2;
        parts.root.position.set(px, 0, pz);
        parts.root.rotation.y = -0.4 + i * 0.5;
        parts.root.freezeWorldMatrix();
        parts.root.isPickable = false;
        d.displayCars.push({ def, parts, x: px, z: pz });
        // پایه نمایش
        const pad = BABYLON.MeshBuilder.CreateCylinder('pad', { diameter: 5, height: 0.15, tessellation: 24 }, TC.G.scene);
        pad.material = TC.World.mats.metal;
        pad.position.set(px, 0.07, pz);
        pad.freezeWorldMatrix();
        TC.Physics.addBox(px, pz, 5, 5, 0.15, 0, 'pad');
      }
      // تعامل خرید
      TC.addInteract({
        x: d.x, z: d.z + 8.5, radius: 7,
        text: d.name + ' — بازدید و خرید خودرو',
        action: () => DE.openShowroom(d),
      });
      // تعامل فروش خودروی شخصی
      TC.addInteract({
        x: d.x + 9, z: d.z + 8.5, radius: 5,
        text: 'فروش خودروی شخصی به این نمایشگاه',
        action: () => TC.ui.openSellVehicle(d),
      });
    }
    DE.built = true;
  };

  /* ---------- منوی نمایشگاه با پیش‌نمای ۳بعدی ---------- */
  DE.openShowroom = function (d) {
    TC.ui.openShop('🚗 ' + d.name, (box) => {
      box.innerHTML = `
        <div class="set-note">برای چرخاندن خودرو، انگشت/ماوس را روی پیش‌نما بکشید. قیمت با پول نقد یا بانک پرداخت می‌شود.</div>
        <div class="shop-grid" id="dealerGrid"></div>`;
      const grid = box.querySelector('#dealerGrid');
      for (const defId of d.stock) {
        const def = TC.Vehicles.DEFS[defId];
        if (!def) continue;
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
          <div class="si-canvas"><canvas width="280" height="140"></canvas><span class="si-tag">${def.cls === 'police' ? '' : { economy: 'اقتصادی', sports: 'اسپرت', luxury: 'لوکس', suv: 'شاسی‌بلند', moto: 'موتور', heavy: 'سنگین', boat: 'شناور', air: 'هوایی', classic: 'کلاسیک', taxi: 'تاکسی' }[def.cls] || ''}</span></div>
          <div class="si-name">${def.name}</div>
          <div class="si-desc">${def.desc}</div>
          <div class="si-props">
            <div class="si-prop"><span>سرعت نهایی</span><b>${TC.faNum(Math.round(def.top * 3.6))} km/h</b></div>
            <div class="si-prop"><span>شتاب</span><b>${TC.faNum(def.accel)}</b></div>
            <div class="si-prop"><span>هندلینگ</span><b>${TC.faNum(def.handling)}</b></div>
            <div class="si-prop"><span>ظرفیت</span><b>${TC.faNum(def.seats)} نفر</b></div>
            <div class="si-prop"><span>سوخت</span><b>${TC.faNum(def.fuel)} لیتر</b></div>
            <div class="si-prop"><span>سلامت اولیه</span><b>۱۰۰٪</b></div>
          </div>
          <div class="si-price">${TC.moneyFmt(def.price)} تومان</div>
          <button class="si-btn buy">خرید — نقد</button>
          <button class="si-btn buy">خرید — بانکی</button>`;
        // پیش‌نمای ۳بعدی سبک: رسم دوبعدی شبیه خودرو + چرخش با درگ
        DE.drawCarPreview(el.querySelector('canvas'), def, el);
        const [bCash, bBank] = el.querySelectorAll('button');
        bCash.onclick = () => DE.buy(def, 'cash');
        bBank.onclick = () => DE.buy(def, 'bank');
        grid.appendChild(el);
      }
    });
  };

  /* پیش‌نمای دو‌بعدی متحرک خودرو (بدون engine دوم) */
  DE.drawCarPreview = function (canvas, def, itemEl) {
    const ctx = canvas.getContext('2d');
    let angle = 0, dragging = false, lastX = 0, spinV = 0.01;
    const colors = { car: 1, truck: 1, bus: 1.4, motorcycle: 0.5, bicycle: 0.5, boat: 1, plane: 1.6, heli: 1 };
    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // پس‌زمینه
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, 140);
      g.addColorStop(0, '#1e2a44'); g.addColorStop(1, '#0c1018');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.72, 90, 22, 0, 0, 7); ctx.fill();
      const long = def.long ? 1.3 : 1;
      const L = 74 * (colors[def.type] || 1) * long, W = 34 * (colors[def.type] || 1);
      const cx = w / 2, cy = h * 0.56;
      ctx.save();
      ctx.translate(cx, cy);
      const sq = Math.abs(Math.sin(angle));
      const scaleSide = 0.4 + sq * 0.6; // جلوه چرخش ساده
      // بدنه (نمای بالا-سه‌رخ ساده)
      ctx.rotate(0);
      // سایه
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 18, L / 2 * scaleSide, 12, 0, 0, 7); ctx.fill();
      // بدنه
      ctx.fillStyle = def.color;
      ctx.beginPath();
      const bw = L * scaleSide;
      ctx.roundRect ? ctx.roundRect(-bw / 2, -W / 2 * scaleSide, bw, W * scaleSide, 8) : ctx.rect(-bw / 2, -W / 2 * scaleSide, bw, W * scaleSide);
      ctx.fill();
      // کابین
      ctx.fillStyle = 'rgba(20,28,40,0.85)';
      const cw = bw * 0.42;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-cw / 2 + bw * 0.04, -W / 2 * scaleSide * 0.72, cw, W * scaleSide * 0.72, 5) : ctx.rect(-cw / 2 + bw * 0.04, -W / 2 * scaleSide * 0.72, cw, W * scaleSide * 0.72);
      ctx.fill();
      // چرخ‌ها
      ctx.fillStyle = '#15171b';
      const wr = 7 * (colors[def.type] || 1);
      for (const [px, pz] of [[-bw / 2 + 10, -W / 2 * scaleSide], [bw / 2 - 10, -W / 2 * scaleSide], [-bw / 2 + 10, W / 2 * scaleSide], [bw / 2 - 10, W / 2 * scaleSide]]) {
        ctx.beginPath(); ctx.ellipse(px, pz * 0.9, wr, wr * 0.6, 0, 0, 7); ctx.fill();
      }
      // چراغ‌ها
      if (Math.cos(angle) > 0) {
        ctx.fillStyle = '#ffe9a0';
        ctx.fillRect(bw / 2 - 4, -W / 2 * scaleSide + 3, 3, 5);
        ctx.fillRect(bw / 2 - 4, W / 2 * scaleSide - 8, 3, 5);
      }
      ctx.restore();
    }
    function loop() {
      if (!canvas.isConnected) return;
      if (!dragging) angle += spinV;
      draw();
      requestAnimationFrame(loop);
    }
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.style.cursor = 'grabbing'; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      angle += (e.clientX - lastX) * 0.02;
      lastX = e.clientX;
    });
    window.addEventListener('pointerup', () => { dragging = false; canvas.style.cursor = 'grab'; });
    loop();
  };

  /* ---------- خرید ---------- */
  DE.buy = function (def, method) {
    if (def.cls === 'police') return;
    const garageMax = TC.Housing.houseTiers[TC.Housing.currentTier - 1].slots;
    if (TC.Vehicles.playerGarage.length >= garageMax) {
      TC.ui.notify('گاراژ پر است! (' + TC.faNum(garageMax) + ' جا) خانه بزرگ‌تر بخرید یا خودرو بفروشید', 'warn');
      return;
    }
    TC.ui.confirm('خرید «' + def.name + '» به قیمت ' + TC.moneyFmt(def.price) + ' تومان؟', () => {
      if (TC.Vehicles.buyVehicle(def.id, method)) {
        TC.Audio.jingle('complete');
        TC.ui.notify('🎉 ' + def.name + ' به گاراژ شما اضافه شد!', 'success');
      }
    });
  };

  /* ---------- قیمت‌گذاری فروش ---------- */
  DE.valuation = function (car) {
    const def = TC.Vehicles.DEFS[car.defId];
    if (!def) return 0;
    const wear = M.clamp(car.health / 100, 0.3, 1);
    const usage = M.clamp(1 - car.odometer / 80000, 0.5, 1);
    return Math.round(def.price * 0.62 * wear * usage);
  };

  TC.Dealerships = DE;
})();
