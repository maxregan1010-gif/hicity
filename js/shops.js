/* ============================================================
 * shops.js — فروشگاه‌ها: رستوران، فست‌فود، کافی‌شاپ، لباس،
 * تجهیزات، اسلحه، تعمیرگاه، پمپ بنزین، سوپرمارکت، هتل، بیمارستان، بانک
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Shops = { npcs: [] };

  Shops.init = function () {
    // فروشگاه‌ها با داخل و فروشنده
    const FURNISH = {
      shop_rest: ['counter', 'tables'],
      shop_food: ['counter', 'tables'],
      shop_cafe: ['counter', 'tables'],
      shop_market: ['shelves', 'counter'],
      shop_cloth: ['shelves', 'counter'],
      shop_equip: ['shelves', 'counter'],
      shop_gun: ['shelves', 'counter'],
      hotel: ['counter', 'benches'],
      estate: ['desks'],
      taxi: ['desks'],
    };
    for (const sh of (TC.World.shops || [])) {
      TC.World.furnishRoom(sh.room, FURNISH[sh.type] || ['counter']);
      TC.NPC.spawnSpecial(sh.x - 2, sh.z + 3, 'فروشنده ' + sh.name, 'vendor', '#5a4a6a');
      TC.addInteract({
        x: sh.x, z: sh.z + 1, radius: 5,
        text: sh.name,
        action: () => Shops.openShop(sh),
      });
    }
    // تعمیرگاه
    const rep = TC.poiByType('repair')[0];
    if (rep) {
      TC.NPC.spawnSpecial(rep.x - 2, rep.z + 2, 'مکانیک حسن', 'mechanic', '#c96a2a');
      TC.addInteract({
        x: rep.x, z: rep.z + 1, radius: 6,
        text: 'تعمیرگاه — تعمیر خودرو',
        action: () => Shops.openRepair(),
      });
    }
    // پمپ بنزین‌ها
    for (const gas of TC.poiByType('gas')) {
      TC.addInteract({
        x: gas.x, z: gas.z, radius: 7,
        text: 'پمپ بنزین — سوخت‌گیری',
        action: () => Shops.openGas(gas),
      });
    }
    // بانک
    const bank = TC.poiByType('bank')[0];
    if (bank) {
      TC.NPC.spawnSpecial(bank.x - 3, bank.z - 2, 'منشی بانک', 'clerk', '#2a5caa');
      TC.addInteract({
        x: bank.x, z: bank.z - 2, radius: 6,
        text: 'بانک مرکزی طوفان — خدمات بانکی',
        action: () => Shops.openBank(),
      });
    }
    // بیمارستان
    const hosp = TC.poiByType('hospital')[0];
    if (hosp) {
      TC.NPC.spawnSpecial(hosp.x - 2, hosp.z - 2, 'پزشک معالج', 'doctor', '#e8e8f0');
      TC.addInteract({
        x: hosp.x, z: hosp.z - 2, radius: 6,
        text: 'بیمارستان مهر — درمان',
        action: () => Shops.openHospital(),
      });
    }
  };

  /* ---------- منوی فروشگاه عمومی ---------- */
  const SHOP_MENUS = {
    shop_rest: () => shopFoodMenu('رستوران بهار', [['kebab', 1], ['coffee', 1]]),
    shop_food: () => shopFoodMenu('فست‌فود برگر شاه', [['burger', 1], ['soda', 1]]),
    shop_cafe: () => shopFoodMenu('کافی‌شاپ دونه', [['coffee', 1], ['burger', 1]]),
    shop_market: () => shopFoodMenu('سوپرمارکت آفتاب', [['groceries', 1], ['soda', 1], ['burger', 1]]),
    shop_cloth: () => shopClothingMenu(),
    shop_equip: () => shopEquipmentMenu(),
    shop_gun: () => shopGunMenu(),
    hotel: () => shopHotelMenu(),
  };

  function shopFoodMenu(title, items) {
    TC.ui.openShop('🍽️ ' + title, (box) => {
      box.innerHTML = `<div class="shop-grid" id="shopGrid"></div>`;
      const grid = box.querySelector('#shopGrid');
      for (const [id] of items) {
        const it = TC.Inventory.ITEMS[id];
        if (!it) continue;
        const owned = TC.Inventory.count(id);
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
          <div class="si-name">${it.name}</div>
          <div class="si-desc">${it.desc}</div>
          <div class="si-props">
            <div class="si-prop"><span>سلامتی</span><b>+${TC.faNum(it.health || 0)}</b></div>
            <div class="si-prop"><span>انرژی</span><b>+${TC.faNum(it.stamina || 0)}</b></div>
            <div class="si-prop"><span>موجودی شما</span><b>${TC.faNum(owned)}</b></div>
          </div>
          <div class="si-price">${TC.moneyFmt(it.price)} تومان</div>
          <button class="si-btn buy">خرید و مصرف</button>
          <button class="si-btn">خرید (نگهداری)</button>`;
        const [buyEat, buyKeep] = el.querySelectorAll('button');
        buyEat.onclick = () => {
          if (TC.Economy.spend(it.price, 'خرید ' + it.name)) {
            TC.Inventory.add(id, 1);
            TC.Inventory.eat(id);
          }
        };
        buyKeep.onclick = () => {
          if (TC.Economy.spend(it.price, 'خرید ' + it.name)) TC.Inventory.add(id, 1);
        };
        grid.appendChild(el);
      }
    });
  }

  function shopClothingMenu() {
    TC.ui.openShop('👕 بوتیک ستاره — فروشگاه لباس', (box) => {
      const cats = [['همه', 'all'], ['پیراهن', 'shirt'], ['شلوار', 'pants'], ['کفش', 'shoes'], ['کلاه', 'hat'], ['اکسسوری', 'acc']];
      box.innerHTML = `<div class="shop-cat-bar" id="clothCats"></div><div class="shop-grid" id="clothGrid"></div>`;
      const catBar = box.querySelector('#clothCats');
      const grid = box.querySelector('#clothGrid');
      let curCat = 'all';
      function render() {
        grid.innerHTML = '';
        for (const [id, it] of Object.entries(TC.Inventory.ITEMS)) {
          if (it.type !== 'clothing') continue;
          const slotCat = it.slot === 'shirt' ? 'shirt' : it.slot === 'pants' ? 'pants' : it.slot === 'shoes' ? 'shoes' : it.slot === 'hat' ? 'hat' : 'acc';
          if (curCat !== 'all' && curCat !== slotCat) continue;
          const owned = TC.Inventory.has(id);
          const el = document.createElement('div');
          el.className = 'shop-item';
          el.innerHTML = `
            <div class="si-name"><span class="cloth-swatch" style="background:${it.color || '#555'}"></span> ${it.name}</div>
            <div class="si-desc">${it.desc}</div>
            <div class="si-price">${TC.moneyFmt(it.price)} تومان</div>
            <button class="si-btn ${owned ? '' : 'buy'}">${owned ? 'پوشیدن' : 'خرید و پوشیدن'}</button>`;
          el.querySelector('button').onclick = () => {
            if (!owned) {
              if (!TC.Economy.spend(it.price, 'خرید ' + it.name)) return;
              TC.Inventory.add(id, 1);
              TC.ui.notify(it.name + ' به کمد شما اضافه شد', 'success');
            }
            TC.Inventory.equip(id);
            TC.ui.notify(it.name + ' پوشیده شد — روی مدل شما اعمال شد', 'success');
            render();
          };
          grid.appendChild(el);
        }
      }
      for (const [label, key] of cats) {
        const b = document.createElement('button');
        b.className = 'shop-cat' + (key === 'all' ? ' active' : '');
        b.textContent = label;
        b.onclick = () => { curCat = key; catBar.querySelectorAll('.shop-cat').forEach(c => c.classList.remove('active')); b.classList.add('active'); render(); };
        catBar.appendChild(b);
      }
      render();
    });
  }

  function shopEquipmentMenu() {
    TC.ui.openShop('🛒 فروشگاه تجهیزات کوی', (box) => {
      box.innerHTML = `<div class="shop-grid" id="eqGrid"></div>`;
      const grid = box.querySelector('#eqGrid');
      for (const id of ['toolkit', 'firstaid', 'phone']) {
        const it = TC.Inventory.ITEMS[id];
        if (!it) continue;
        const owned = TC.Inventory.has(id);
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
          <div class="si-name">${it.name}</div>
          <div class="si-desc">${it.desc}</div>
          <div class="si-price">${it.price ? TC.moneyFmt(it.price) + ' تومان' : 'رایگان'}</div>
          <button class="si-btn ${owned ? '' : 'buy'}">${owned ? 'در اختیار دارید ✓' : 'خرید'}</button>`;
        el.querySelector('button').onclick = (e) => {
          if (owned) { TC.ui.notify('قبلاً خریده‌اید', 'warn'); return; }
          if (TC.Economy.spend(it.price, 'خرید ' + it.name)) {
            TC.Inventory.add(id, 1);
            TC.ui.notify(it.name + ' خریداری شد', 'success');
            el.querySelector('button').textContent = 'در اختیار دارید ✓';
          }
        };
        grid.appendChild(el);
      }
    });
  }

  function shopGunMenu() {
    TC.ui.openShop('🔫 اسلحه‌فروشی مرز', (box) => {
      box.innerHTML = `<div class="shop-grid" id="gunGrid"></div><div class="set-note">⚠️ استفاده از سلاح در شهر باعث جلب توجه پلیس می‌شود. مسئولیت با خریدار است.</div>`;
      const grid = box.querySelector('#gunGrid');
      for (const id of ['bat', 'pistol', 'ammo_pistol']) {
        const it = TC.Inventory.ITEMS[id];
        if (!it) continue;
        const owned = id === 'ammo_pistol' ? false : TC.Inventory.has(id);
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
          <div class="si-name">${it.name}</div>
          <div class="si-desc">${it.desc}</div>
          ${id === 'ammo_pistol' ? `<div class="si-prop"><span>مهمات فعلی</span><b>${TC.faNum(TC.Inventory.data.ammo.pistol || 0)}</b></div>` : ''}
          <div class="si-price">${TC.moneyFmt(it.price)} تومان</div>
          <button class="si-btn buy">${owned ? 'در اختیار دارید ✓' : 'خرید'}</button>`;
        el.querySelector('button').onclick = () => {
          if (owned) { TC.ui.notify('قبلاً خریده‌اید', 'warn'); return; }
          if (!TC.Economy.spend(it.price, 'خرید ' + it.name)) return;
          TC.Inventory.add(id, 1);
          if (it.type === 'weapon') {
            TC.Inventory.giveWeapon(it.weapon);
            TC.ui.notify(it.name + ' تحویل گرفتید — با X جابه‌جا کنید', 'success');
          } else if (it.type === 'ammo') {
            TC.Inventory.data.ammo[it.ammoFor] = (TC.Inventory.data.ammo[it.ammoFor] || 0) + it.count;
            TC.ui.notify('+' + TC.faNum(it.count) + ' مهمات', 'success');
          }
        };
        grid.appendChild(el);
      }
    });
  }

  function shopHotelMenu() {
    TC.ui.openShop('🏨 هتل آسمان', (box) => {
      box.innerHTML = `
        <div class="shop-grid">
          <div class="shop-item">
            <div class="si-name">اتاق یک‌شبه</div>
            <div class="si-desc">استراحت کامل، صبح سرحال بیدار می‌شوید. بازی ذخیره می‌شود.</div>
            <div class="si-price">${TC.moneyFmt(350)} تومان</div>
            <button class="si-btn buy">رزرو و استراحت</button>
          </div>
          <div class="shop-item">
            <div class="si-name">سوئیت VIP</div>
            <div class="si-desc">استراحت لوکس + سلامت کامل + انرژی کامل</div>
            <div class="si-price">${TC.moneyFmt(1200)} تومان</div>
            <button class="si-btn buy">رزرو سوئیت</button>
          </div>
        </div>`;
      const [normal, vip] = box.querySelectorAll('button');
      normal.onclick = () => {
        if (TC.Economy.spend(350, 'اقامت هتل')) { TC.Housing.sleep(); }
      };
      vip.onclick = () => {
        if (TC.Economy.spend(1200, 'اقامت VIP هتل')) {
          TC.Player.health = 100; TC.Player.stamina = 100;
          TC.Housing.sleep();
        }
      };
    });
  }

  Shops.openShop = function (sh) {
    const menu = SHOP_MENUS[sh.type];
    if (menu) menu();
    else {
      TC.ui.dialogue('فروشنده', 'خوش آمدید به ' + sh.name + '!', [{ label: 'ممنون', action: () => { } }]);
    }
  };

  /* ---------- تعمیرگاه ---------- */
  Shops.openRepair = function () {
    // خودروی نزدیک؟
    const v = TC.Vehicles.nearestEnterable(TC.Player.pos, 12);
    if (!v) {
      TC.ui.dialogue('مکانیک حسن', 'خودرویی نداری که تعمیر کنم. بیارش جلو!', [{ label: 'باشه', action: () => { } }]);
      return;
    }
    const dmg = Math.round(100 - v.health);
    if (dmg < 2) {
      TC.ui.dialogue('مکانیک حسن', 'ماشینت سالمه، نگران چی هستی؟', [{ label: 'باشه', action: () => { } }]);
      return;
    }
    const discount = TC.Inventory.has('toolkit') ? 0.8 : 1;
    const cost = Math.round(dmg * 28 * discount);
    TC.ui.dialogue('مکانیک حسن',
      'دختر/پسر جان، ماشینت ' + TC.faNum(dmg) + ' درصد آسیب دیده.\nهزینه تعمیر کامل: ' + TC.moneyFmt(cost) + ' تومان' +
      (discount < 1 ? ' (با جعبه ابزار ۲۰٪ تخفیف)' : ''),
      [
        { label: 'تعمیر کامل ✓', action: () => {
          if (TC.Economy.spend(cost, 'تعمیر خودرو')) {
            v.health = 100;
            TC.Audio.jingle('complete');
            TC.ui.notify('خودرو تعمیر شد — سلامت: ' + TC.faNum(100) + '٪', 'success');
          }
        } },
        { label: 'بذار برای بعد', action: () => { } },
      ]);
  };

  /* ---------- پمپ بنزین ---------- */
  Shops.openGas = function (gas) {
    const v = TC.Vehicles.nearestEnterable(TC.Player.pos, 14);
    if (!v) {
      TC.ui.notify('خودرویی برای سوخت‌گیری نزدیک نیست', 'warn');
      return;
    }
    if (v.def.type === 'bicycle') {
      TC.ui.notify('دوچرخه بنزین نمی‌خورد!', 'warn');
      return;
    }
    const need = v.def.fuel - v.fuel;
    if (need < 1) {
      TC.ui.notify('باک پر است!', 'success');
      return;
    }
    const cost = Math.round(need * 55);
    TC.ui.confirm('پرکردن باک (' + Math.round(need) + ' لیتر) — ' + TC.moneyFmt(cost) + ' تومان؟', () => {
      if (TC.Economy.spend(cost, 'سوخت‌گیری')) {
        v.fuel = v.def.fuel;
        TC.Audio.jingle('complete');
        TC.ui.notify('باک پر شد ✓', 'success');
      }
    });
  };

  /* ---------- بانک ---------- */
  Shops.openBank = function () {
    TC.ui.openShop('🏦 بانک مرکزی طوفان', (box) => {
      box.innerHTML = `
        <div class="row-line"><span>💵 پول نقد</span><b class="rl-grow" id="bankCash">${TC.moneyFmt(TC.Economy.cash)} تومان</b></div>
        <div class="row-line"><span>🏦 موجودی بانک</span><b class="rl-grow" id="bankBal">${TC.moneyFmt(TC.Economy.bank)} تومان</b></div>
        <div class="row-line">
          <input type="number" class="tx-in" id="bankAmt" placeholder="مبلغ (تومان)" min="0">
          <button class="si-btn buy" style="width:auto;padding:8px 16px" data-op="deposit">واریز</button>
          <button class="si-btn buy" style="width:auto;padding:8px 16px" data-op="withdraw">برداشت</button>
          <button class="si-btn" style="width:auto;padding:8px 16px" data-op="transfer">انتقال</button>
        </div>
        <h4 style="margin:12px 0 6px;color:var(--cyan)">تاریخچه تراکنش‌ها (آخرین ۱۰)</h4>
        <div id="bankHistory"></div>`;
      const refresh = () => {
        box.querySelector('#bankCash').textContent = TC.moneyFmt(TC.Economy.cash) + ' تومان';
        box.querySelector('#bankBal').textContent = TC.moneyFmt(TC.Economy.bank) + ' تومان';
        const hist = box.querySelector('#bankHistory');
        hist.innerHTML = TC.Economy.transactions.slice(-10).reverse().map(t => `
          <div class="row-line"><span>${t.label}</span>
          <span class="rl-grow" style="font-size:11px;color:var(--text-dim)">روز ${TC.faNum(t.day)} — ${t.time}</span>
          <b style="color:${t.amount > 0 ? 'var(--green)' : 'var(--red)'}">${t.amount > 0 ? '+' : ''}${TC.moneyFmt(t.amount)}</b></div>`).join('');
      };
      refresh();
      box.querySelectorAll('[data-op]').forEach(b => {
        b.onclick = () => {
          const amt = Math.round(parseFloat(box.querySelector('#bankAmt').value) || 0);
          if (amt <= 0) { TC.Audio.deny(); return; }
          const op = b.dataset.op;
          let ok = false;
          if (op === 'deposit') ok = TC.Economy.deposit(amt);
          else if (op === 'withdraw') ok = TC.Economy.withdraw(amt);
          else if (op === 'transfer') ok = TC.Economy.transfer(amt, 'حساب خانواده');
          if (ok) { TC.Audio.jingle('money'); refresh(); TC.ui.notify('عملیات بانکی انجام شد ✓', 'success'); }
        };
      });
    });
  };

  /* ---------- بیمارستان ---------- */
  Shops.openHospital = function () {
    const h = TC.Player.health;
    const cost = Math.round((100 - h) * 22) + 60;
    if (h >= 99) {
      TC.ui.dialogue('پزشک معالج', 'کاملاً سالم هستید! نیازی به درمان نیست.', [{ label: 'ممنون دکتر', action: () => { } }]);
      return;
    }
    TC.ui.dialogue('پزشک معالج',
      'سلامت شما: ' + TC.faNum(Math.round(h)) + ' از ۱۰۰\nهزینه درمان کامل: ' + TC.moneyFmt(cost) + ' تومان',
      [
        { label: 'درمان کامل ✓', action: () => {
          if (TC.Economy.spend(cost, 'درمان بیمارستان')) {
            TC.Player.health = 100;
            TC.Audio.jingle('complete');
            TC.ui.notify('درمان کامل شد — سلامتی ۱۰۰٪', 'success');
          }
        } },
        { label: 'الان نه', action: () => { } },
      ]);
  };

  Shops.serialize = function () { return {}; };
  Shops.deserialize = function () { };

  TC.Shops = Shops;
})();
