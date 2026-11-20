/* ============================================================
 * ui.js — منوها: اصلی/توقف، تنظیمات کامل، تغییر کلیدها، تلفن،
 * کمد لباس، گاراژ، دیالوگ، انتخاب، تأیید، پیام بزرگ
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const UI = {
    keybinds: null,
    dialogueTimeout: null,
  };

  UI.notify = (text, kind) => TC.HUD && TC.HUD.notify(text, kind);

  /* ---------- دیالوگ ---------- */
  UI.dialogue = function (name, text, options) {
    const el = document.getElementById('hudDialogue');
    document.getElementById('dlgName').textContent = name;
    document.getElementById('dlgText').textContent = text;
    const opts = document.getElementById('dlgOptions');
    opts.innerHTML = '';
    for (const o of options || []) {
      const b = document.createElement('button');
      b.className = 'dlg-opt';
      b.textContent = o.label;
      b.onclick = () => {
        el.style.display = 'none';
        o.action && o.action();
      };
      opts.appendChild(b);
    }
    el.style.display = 'block';
    clearTimeout(UI.dialogueTimeout);
    if (!options || !options.length) {
      UI.dialogueTimeout = setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
  };

  /* ---------- انتخاب (choice) ---------- */
  UI.choice = function (title, options, cb) {
    const el = document.getElementById('confirmUI');
    document.getElementById('confirmText').textContent = title;
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    yes.textContent = options[0] ? options[0].label : 'گزینه ۱';
    no.textContent = options[1] ? options[1].label : 'گزینه ۲';
    yes.onclick = () => { el.style.display = 'none'; cb(options[0].value); };
    no.onclick = () => { el.style.display = 'none'; cb(options[1].value); };
    el.style.display = 'flex';
  };

  /* ---------- تأیید ---------- */
  UI.confirm = function (text, onYes) {
    const el = document.getElementById('confirmUI');
    document.getElementById('confirmText').textContent = text;
    const yes = document.getElementById('confirmYes');
    const no = document.getElementById('confirmNo');
    yes.textContent = 'بله';
    no.textContent = 'خیر';
    yes.onclick = () => { el.style.display = 'none'; onYes(); };
    no.onclick = () => { el.style.display = 'none'; };
    el.style.display = 'flex';
  };

  /* ---------- پیام بزرگ ---------- */
  UI.bigMessage = function (title, sub) {
    UI.notify(title, 'success');
    if (sub) UI.notify(sub, 'info');
  };

  /* ---------- پنجره فروشگاه عمومی ---------- */
  UI.openShop = function (title, renderFn) {
    const el = document.getElementById('shopUI');
    document.getElementById('shopTitle').textContent = title;
    const body = document.getElementById('shopBody');
    const foot = document.getElementById('shopFoot');
    body.innerHTML = '';
    foot.innerHTML = '';
    el.style.display = 'flex';
    const refreshMoney = () => {
      document.getElementById('shopMoney').textContent =
        '💵 ' + TC.moneyFmt(TC.Economy.cash) + '  🏦 ' + TC.moneyFmt(TC.Economy.bank);
    };
    refreshMoney();
    UI._shopRefreshMoney = refreshMoney;
    renderFn(body, foot);
    document.getElementById('shopClose').onclick = () => UI.closeShop();
  };
  UI.closeShop = function () {
    document.getElementById('shopUI').style.display = 'none';
    UI._shopRefreshMoney = null;
  };

  /* ---------- کمد لباس ---------- */
  UI.openWardrobe = function () {
    UI.openShop('👕 کمد لباس آرش', (box) => {
      const eq = TC.Inventory.data.clothesEquipped;
      let html = '<div class="set-note">لباس‌های فعلی روی مدل شخصیت اعمال شده‌اند. هر آیتم خریداری‌شده همیشه در کمد می‌ماند.</div>';
      html += '<div class="shop-cat-bar">';
      html += `<span class="cloth-chip">پیراهن فعلی: <span class="cloth-swatch" style="background:${eq.shirt}"></span></span>`;
      html += `<span class="cloth-chip">شلوار فعلی: <span class="cloth-swatch" style="background:${eq.pants}"></span></span>`;
      html += `<span class="cloth-chip">کفش فعلی: <span class="cloth-swatch" style="background:${eq.shoes}"></span></span>`;
      html += `<span class="cloth-chip">کلاه: ${eq.hat === 'none' ? '—' : eq.hat}</span>`;
      html += '</div><div class="shop-grid" id="wardrobeGrid"></div>';
      box.innerHTML = html;
      const grid = box.querySelector('#wardrobeGrid');
      let any = false;
      for (const [id, it] of Object.entries(TC.Inventory.ITEMS)) {
        if (it.type !== 'clothing' || !TC.Inventory.has(id)) continue;
        any = true;
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
          <div class="si-name"><span class="cloth-swatch" style="background:${it.color || '#555'}"></span> ${it.name}</div>
          <div class="si-desc">${it.desc}</div>
          <button class="si-btn buy">پوشیدن</button>`;
        el.querySelector('button').onclick = () => {
          TC.Inventory.equip(id);
          UI.notify(it.name + ' پوشیده شد ✓', 'success');
          UI.openWardrobe(); // رفرش
          UI.closeShop();
        };
        grid.appendChild(el);
      }
      if (!any) grid.innerHTML = '<div class="set-note">کمد خالی است! از «بوتیک ستاره» در خیابان تجاری لباس بخرید.</div>';
    });
  };

  /* ---------- گاراژ ---------- */
  UI.openGarage = function () {
    UI.openShop('🚗 گاراژ شخصی — مدیریت خودروها', (box) => {
      const cars = TC.Vehicles.playerGarage;
      if (!cars.length) {
        box.innerHTML = '<div class="set-note">گاراژ خالی است! از نمایشگاه‌های شهر خودرو بخرید.</div>';
        return;
      }
      const house = TC.Housing.houseTiers[TC.Housing.currentTier - 1];
      let html = `<div class="set-note">ظرفیت گاراژ: ${TC.faNum(cars.length)}/${TC.faNum(house.slots)} — ارتقای خانه ظرفیت را بیشتر می‌کند.</div><div class="shop-grid" id="garageGrid"></div>`;
      box.innerHTML = html;
      const grid = box.querySelector('#garageGrid');
      cars.forEach((car, idx) => {
        const def = TC.Vehicles.DEFS[car.defId];
        if (!def) return;
        const here = TC.ActiveVehicle && TC.ActiveVehicle.garageIdx === idx;
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `
          <div class="si-name">${def.name}</div>
          <div class="si-desc">پلاک: ${car.plate} — کارکرد: ${TC.faNum(Math.round(car.odometer))} متر</div>
          <div class="si-props">
            <div class="si-prop"><span>سلامت</span><b>${TC.faNum(Math.round(car.health))}٪</b></div>
            <div class="si-prop"><span>سوخت</span><b>${TC.faNum(Math.round(car.fuel))} لیتر</b></div>
            <div class="si-prop"><span>سرعت</span><b>${TC.faNum(Math.round(def.top * 3.6))} km/h</b></div>
          </div>
          ${here ? '<div class="set-note">این خودرو الان کنار شماست ✓</div>' : '<button class="si-btn buy">تحویل گرفتن (کنار شما)</button>'}
          <button class="si-btn sell">فروش به نمایشگاه</button>`;
        if (!here) {
          el.querySelector('.buy').onclick = () => {
            if (TC.Player.inVehicle) { UI.notify('اول از خودروی فعلی پیاده شوید', 'warn'); return; }
            const p = TC.Player.pos;
            const v = TC.Vehicles.deliverVehicle(car.defId, p.x + 4, p.z + 4);
            if (v) {
              v.health = car.health; v.fuel = car.fuel; v.odometer = car.odometer;
              UI.notify(def.name + ' تحویل داده شد — پشت سرتان است', 'success');
              UI.closeShop();
            }
          };
        }
        el.querySelector('.sell').onclick = () => {
          const price = TC.Dealerships.valuation(car);
          UI.confirm('فروش «' + def.name + '» به قیمت ' + TC.moneyFmt(price) + ' تومان؟ (به حساب بانکی واریز می‌شود)', () => {
            TC.Vehicles.sellVehicle(idx);
            UI.notify('خودرو فروخته شد: +' + TC.moneyFmt(price) + ' تومان', 'success');
            UI.openGarage();
            UI.closeShop();
          });
        };
        grid.appendChild(el);
      });
    });
  };

  /* ---------- فروش خودرو (در نمایشگاه) ---------- */
  UI.openSellVehicle = function () {
    UI.openGarage();
  };

  /* ---------- تلفن همراه ---------- */
  UI.openPhone = function () {
    const el = document.getElementById('phoneUI');
    el.style.display = 'flex';
    document.getElementById('phoneClock').textContent = TC.timeFmt(TC.G.time);
    const apps = [
      { icon: '🗺️', name: 'نقشه', badge: TC.Missions.active ? '۱' : null, fn: () => { UI.closePhone(); TC.Map.openBig(); } },
      { icon: '🧰', name: 'شغل من', fn: () => { UI.closePhone(); UI.openJobScreen(); } },
      { icon: '🚗', name: 'گاراژ', badge: TC.Vehicles.playerGarage.length ? null : null, fn: () => { UI.closePhone(); UI.openGarage(); } },
      { icon: '🏦', name: 'بانک', fn: () => { UI.closePhone(); TC.Shops.openBank(); } },
      { icon: '🎯', name: 'مأموریت‌ها', fn: () => { UI.closePhone(); UI.openMissionList(); } },
      { icon: '💊', name: 'کمک‌های اولیه', fn: () => { UI.closePhone(); TC.Inventory.useFirstAid(); } },
      { icon: '🚙', name: 'درخواست خودرو', fn: () => { UI.closePhone(); UI.requestVehicleDelivery(); } },
      { icon: '💾', name: 'ذخیره', fn: () => { UI.closePhone(); TC.Save.slotDialog('save'); } },
      { icon: '⚙️', name: 'تنظیمات', fn: () => { UI.closePhone(); UI.openSettings('game'); } },
    ];
    const wrap = document.getElementById('phoneApps');
    wrap.innerHTML = '';
    for (const app of apps) {
      const b = document.createElement('button');
      b.className = 'phone-app' + (app.badge ? ' has-badge' : '');
      b.innerHTML = `<span class="pa-ico">${app.icon}</span><span class="pa-name">${app.name}</span>` + (app.badge ? `<span class="pa-badge">${app.badge}</span>` : '');
      b.onclick = () => { TC.Audio.jingle('click'); app.fn(); };
      wrap.appendChild(b);
    };
    document.getElementById('phoneClose').onclick = () => UI.closePhone();
  };
  UI.closePhone = function () { document.getElementById('phoneUI').style.display = 'none'; };

  UI.requestVehicleDelivery = function () {
    const cars = TC.Vehicles.playerGarage;
    if (!cars.length) { UI.notify('گاراژ خالی است', 'warn'); return; }
    UI.openShop('🚙 درخواست تحویل خودرو (هزینه: ۲۰۰ تومان)', (box) => {
      const grid = document.createElement('div');
      grid.className = 'shop-grid';
      box.appendChild(grid);
      cars.forEach((car, idx) => {
        const def = TC.Vehicles.DEFS[car.defId];
        const el = document.createElement('div');
        el.className = 'shop-item';
        el.innerHTML = `<div class="si-name">${def.name}</div><div class="si-desc">سلامت: ${TC.faNum(Math.round(car.health))}٪ — سوخت: ${TC.faNum(Math.round(car.fuel))}</div>
          <button class="si-btn buy">ارسال به موقعیت من</button>`;
        el.querySelector('button').onclick = () => {
          if (TC.Player.inVehicle) { UI.notify('اول پیاده شوید', 'warn'); return; }
          if (!TC.Economy.spend(200, 'هزینه پیک خودرو')) return;
          const p = TC.Player.pos;
          const v = TC.Vehicles.deliverVehicle(car.defId, p.x + 5, p.z + 5);
          if (v) { v.health = car.health; v.fuel = car.fuel; v.odometer = car.odometer; }
          UI.closeShop();
          UI.notify('خودرو پشت سرتان تحویل شد', 'success');
        };
        grid.appendChild(el);
      });
    });
  };

  /* ---------- صفحه شغل من ---------- */
  UI.openJobScreen = function () {
    const info = TC.Jobs.panelInfo();
    UI.openShop('🧰 شغل من', (box) => {
      if (!info) {
        box.innerHTML = `<div class="set-note">شغلی ندارید! به یکی از ۱۲ دفتر استخدام شهر مراجعه کنید (آیکون 🧰 روی نقشه).</div>
        <div class="row-line"><button class="si-btn buy" id="jobListBtn">مشاهده مشاغل شهر</button></div>`;
        box.querySelector('#jobListBtn').onclick = () => {
          UI.closeShop();
          let html = '<div class="shop-grid">';
          for (const [id, def] of Object.entries(TC.JOB_DEFS)) {
            html += `<div class="shop-item"><div class="si-name">${def.title}</div>
              <div class="si-desc">${def.workplace}<br>${def.desc}</div>
              <div class="si-prop"><span>حقوق روزانه</span><b>${TC.moneyFmt(def.salary)}</b></div>
              <div class="si-prop"><span>شیفت</span><b>${TC.faNum(def.shift[0])}–${TC.faNum(def.shift[1])}</b></div></div>`;
          }
          box.innerHTML = html + '</div>';
        };
        return;
      }
      box.innerHTML = `
        <div class="row-line"><span>شغل</span><b class="rl-grow">${info.title}</b></div>
        <div class="row-line"><span>محل کار</span><b class="rl-grow">${info.workplace}</b></div>
        <div class="row-line"><span>حقوق روزانه</span><b class="rl-grow">${TC.moneyFmt(info.salary)} تومان</b></div>
        <div class="row-line"><span>سابقه کار</span><b class="rl-grow">${TC.faNum(info.streak)} روز</b></div>
        <div class="row-line"><span>وضعیت استخدام</span><b class="rl-grow">${info.attended ? '✅ حضور امروز ثبت شده' : '⏳ منتظر حضور امروز'}</b></div>
        <div class="row-line"><span>تعداد روزهای غیبت</span><b class="rl-grow">${TC.faNum(info.absences)} روز</b></div>
        <div class="row-line"><span>زمان پرداخت حقوق</span><b class="rl-grow">${info.salaryIn}</b></div>
        <div class="row-line"><span>شیفت کاری</span><b class="rl-grow">${TC.faNum(info.shift[0])}:۰۰ تا ${TC.faNum(info.shift[1])}:۰۰</b></div>
        <div class="row-line"><span>وضعیت شیفت</span><b class="rl-grow">${TC.JobMissions.inShift ? '🟢 شیفت فعال — مأموریت‌ها را انجام دهید' : '⚪ شیفت شروع نشده'}</b></div>
        <div class="shop-cat-bar" style="margin-top:14px">
          <button class="shop-cat" id="startShift">▶ شروع شیفت کاری</button>
          ${TC.JobMissions.inShift ? '<button class="shop-cat" id="endShift">⏹ پایان/رها کردن شیفت</button>' : ''}
          <button class="shop-cat danger" id="resignBtn">✖ استعفا از شغل</button>
        </div>`;
      box.querySelector('#startShift').onclick = () => { UI.closeShop(); TC.JobMissions.startShift(TC.Jobs.active.def.id); };
      const endBtn = box.querySelector('#endShift');
      if (endBtn) endBtn.onclick = () => { UI.closeShop(); TC.JobMissions.abandonShift(); };
      box.querySelector('#resignBtn').onclick = () => {
        UI.closeShop();
        UI.confirm('مطمئنید می‌خواهید استعفا دهید؟', () => TC.Jobs.resign());
      };
    });
  };

  UI.openMissionList = function () {
    UI.openShop('🎯 مأموریت‌ها و فعالیت‌ها', (box) => {
      let html = '';
      const ch = TC.Missions.currentChapter();
      if (ch) {
        html += `<div class="row-line"><span>📖 مأموریت داستانی فعال</span><b class="rl-grow">فصل ${TC.faNum(TC.Missions.storyIndex + 1)}: ${ch.title}</b></div>`;
        const step = ch.steps[TC.Missions.stepIndex];
        if (step) html += `<div class="row-line"><span>هدف جاری</span><b class="rl-grow">${step.text}</b></div>`;
      } else {
        html += '<div class="row-line"><span>داستان</span><b class="rl-grow">مأموریت داستانی فعالی نیست</b></div>';
      }
      const jp = TC.poiByType('job');
      html += `<div class="row-line"><span>🧰 دفاتر استخدام</span><b class="rl-grow">${TC.faNum(jp.length)} مرکز در شهر</b></div>`;
      html += `<div class="row-line"><span>🏁 مسابقه خیابانی</span><b class="rl-grow">در حاشیه پارک بهاران</b></div>`;
      html += `<div class="row-line"><span>💎 مکان‌های مخفی</span><b class="rl-grow">${TC.faNum(TC.Missions.stats.secretsFound)} از ۵ کشف شده</b></div>`;
      html += `<div class="row-line"><span>🚗 فروشگاه‌ها</span><b class="rl-grow">رستوران، فست‌فود، کافی‌شاپ، لباس، تجهیزات، اسلحه، سوپرمارکت</b></div>`;
      box.innerHTML = html;
    });
  };

  /* ---------- پروفایل شخصیت ---------- */
  UI.openCharScreen = function () {
    const el = document.getElementById('charScreen');
    el.style.display = 'flex';
    const stats = document.getElementById('charStats');
    const p = TC.Player;
    const job = TC.Jobs.active ? TC.Jobs.active.def.title : '—';
    stats.innerHTML = `
      <div class="char-stat">پول نقد<b>${TC.moneyFmt(TC.Economy.cash)} تومان</b></div>
      <div class="char-stat">موجودی بانک<b>${TC.moneyFmt(TC.Economy.bank)} تومان</b></div>
      <div class="char-stat">شغل فعال<b>${job}</b></div>
      <div class="char-stat">خودروها<b>${TC.faNum(TC.Vehicles.playerGarage.length)} دستگاه</b></div>
      <div class="char-stat">سلامت<b>${TC.faNum(Math.round(p.health))}٪</b></div>
      <div class="char-stat">سلاح فعلی<b>${{ fist: 'مشت', bat: 'چوب', pistol: 'کلت' }[p.currentWeapon]}</b></div>
      <div class="char-stat">روز بازی<b>${TC.faNum(TC.G.day)} — ${TC.dayName()}</b></div>
      <div class="char-stat">مأموریت‌های داستانی<b>${TC.faNum(TC.Missions.stats.missionsDone)} فصل انجام‌شده</b></div>`;
    const eq = TC.Inventory.data.clothesEquipped;
    document.getElementById('charClothes').innerHTML = `
      <h4>پوشش فعلی</h4>
      <span class="cloth-chip">پیراهن <span class="cloth-swatch" style="background:${eq.shirt}"></span></span>
      <span class="cloth-chip">شلوار <span class="cloth-swatch" style="background:${eq.pants}"></span></span>
      <span class="cloth-chip">کفش <span class="cloth-swatch" style="background:${eq.shoes}"></span></span>
      <span class="cloth-chip">کلاه: ${eq.hat === 'none' ? '—' : eq.hat}</span>
      ${eq.glasses ? '<span class="cloth-chip">عینک ✓</span>' : ''}
      ${eq.watch ? '<span class="cloth-chip">ساعت ✓</span>' : ''}`;
    document.getElementById('charJob').innerHTML = `
      <h4>سابقه شغلی</h4>
      ${TC.Jobs.history.length ? TC.Jobs.history.map(h => `<div class="row-line"><span>${h.title}</span><b class="rl-grow">${h.fired ? '❌ اخراج (غیبت)' : '✔ استعفا'} — ${TC.faNum(h.streak || 0)} روز کار</b></div>`).join('') : '<div class="set-note">هنوز شغلی نداشته‌اید</div>'}`;
    document.getElementById('charClose').onclick = () => el.style.display = 'none';
  };

  /* ---------- منوی اصلی ---------- */
  UI.showMainMenu = function () {
    document.getElementById('mainMenu').style.display = 'flex';
    TC.G.state = 'menu';
    const hasSave = localStorage.getItem('toofan_has_save') === '1';
    document.getElementById('mmContinue').style.display = hasSave ? 'block' : 'none';
    document.getElementById('mmNew').onclick = () => { TC.Audio.jingle('click'); TC.Start.newGame(); };
    document.getElementById('mmContinue').onclick = () => { TC.Audio.jingle('click'); TC.Start.continueGame(); };
    document.getElementById('mmLoad').onclick = () => { TC.Audio.jingle('click'); TC.Save.slotDialog('load'); };
    document.getElementById('mmSettings').onclick = () => { TC.Audio.jingle('click'); UI.openSettings('graphics'); };
    document.getElementById('mmControls').onclick = () => { TC.Audio.jingle('click'); UI.openControls(); };
    document.getElementById('mmCredits').onclick = () => {
      TC.Audio.jingle('click');
      UI.dialogue('شهر طوفان — نسخه ' + TC.VERSION,
        'یک جهان‌باز سه‌بعدی فارسی با Babylon.js\nشخصیت اصلی: آرش راد\nداستان: ۸ فصل — «طوفان می‌آید»\nهمه منابع داخل پروژه، بدون نیاز به اینترنت.', [
        { label: 'بستن', action: () => { } },
      ]);
    };
  };
  UI.hideMainMenu = function () { document.getElementById('mainMenu').style.display = 'none'; };

  /* ---------- منوی توقف ---------- */
  UI.pause = function (on) {
    TC.G.paused = on;
    document.getElementById('pauseMenu').style.display = on ? 'flex' : 'none';
    if (on) {
      document.getElementById('pauseStats').innerHTML =
        'روز ' + TC.faNum(TC.G.day) + ' — ' + TC.timeFmt(TC.G.time) + ' • پول: ' + TC.moneyFmt(TC.Economy.cash) +
        ' • بانک: ' + TC.moneyFmt(TC.Economy.bank) + ' • FPS: ' + TC.faNum(TC.G.fps);
      document.getElementById('pmResume').onclick = () => UI.pause(false);
      document.getElementById('pmSave').onclick = () => { TC.Save.slotDialog('save'); };
      document.getElementById('pmLoad').onclick = () => { TC.Save.slotDialog('load'); };
      document.getElementById('pmSettings').onclick = () => { UI.openSettings('graphics'); };
      document.getElementById('pmControls').onclick = () => { UI.openControls(); };
      document.getElementById('pmQuit').onclick = () => {
        TC.Save.saveSlot(0, true);
        location.reload();
      };
    }
  };

  /* ---------- تنظیمات ---------- */
  UI.openSettings = function (tab) {
    const el = document.getElementById('settingsUI');
    el.style.display = 'flex';
    document.getElementById('setClose').onclick = () => el.style.display = 'none';
    el.querySelectorAll('.set-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
      b.onclick = () => UI.openSettings(b.dataset.tab);
    });
    const body = document.getElementById('setBody');
    body.innerHTML = '';
    const S = TC.Settings.data;
    const row = (label, ctrlHtml) => {
      const d = document.createElement('div');
      d.className = 'set-row';
      d.innerHTML = `<label>${label}</label>${ctrlHtml}`;
      body.appendChild(d);
      return d;
    };
    if (tab === 'graphics') {
      row('کیفیت گرافیک', `<div class="seg" id="qSeg">
        ${['low', 'medium', 'high', 'ultra'].map(q => `<button data-q="${q}" class="${S.quality === q ? 'active' : ''}">${{ low: 'کم', medium: 'متوسط', high: 'زیاد', ultra: 'فوق‌العاده' }[q]}</button>`).join('')}
      </div>`);
      body.querySelector('#qSeg').querySelectorAll('button').forEach(b => b.onclick = () => {
        TC.setQuality(b.dataset.q);
        UI.openSettings('graphics');
      });
      row('کیفیت سایه', `<div class="seg" id="shSeg">
        ${[['off', 'خاموش'], ['low', 'کم'], ['high', 'زیاد']].map(([k, l]) => `<button data-s="${k}" class="${S.shadows === k ? 'active' : ''}">${l}</button>`).join('')}
      </div>`);
      body.querySelector('#shSeg').querySelectorAll('button').forEach(b => b.onclick = () => {
        S.shadows = b.dataset.s;
        TC.Settings.save();
        TC.applyShadowSetting();
        UI.openSettings('graphics');
      });
      row('کیفیت بافت', `<div class="seg" id="txSeg">
        ${[['low', 'کم'], ['high', 'زیاد']].map(([k, l]) => `<button data-t="${k}" class="${S.textures === k ? 'active' : ''}">${l}</button>`).join('')}
      </div>`);
      body.querySelector('#txSeg').querySelectorAll('button').forEach(b => b.onclick = () => {
        S.textures = b.dataset.t;
        TC.Settings.save();
        UI.openSettings('graphics');
      });
      row('کاهش خودکار کیفیت (بازی روان‌تر)', `<div class="seg" id="aqSeg">
        <button data-a="1" class="${S.autoQuality ? 'active' : ''}">روشن</button>
        <button data-a="0" class="${!S.autoQuality ? 'active' : ''}">خاموش</button></div>`);
      body.querySelector('#aqSeg').querySelectorAll('button').forEach(b => b.onclick = () => {
        S.autoQuality = b.dataset.a === '1';
        TC.perf.autoQuality = S.autoQuality;
        TC.Settings.save();
        UI.openSettings('graphics');
      });
      row('محدودیت FPS', `<select id="fpsCap">
        ${[[0, 'بدون محدودیت'], [30, '۳۰'], [60, '۶۰']].map(([v, l]) => `<option value="${v}" ${S.fpsCap === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>`);
      body.querySelector('#fpsCap').onchange = (e) => { S.fpsCap = +e.target.value; TC.Settings.save(); };
      row('نمایش FPS', `<div class="seg" id="fpsShow"><button data-f="1" class="${S.fpsShow ? 'active' : ''}">روشن</button><button data-f="0" class="${!S.fpsShow ? 'active' : ''}">خاموش</button></div>`);
      body.querySelector('#fpsShow').querySelectorAll('button').forEach(b => b.onclick = () => { S.fpsShow = b.dataset.f === '1'; TC.Settings.save(); UI.openSettings('graphics'); });
      row('اندازه HUD', `<input type="range" id="hudScale" min="0.7" max="1.4" step="0.05" value="${S.hudScale}"><span class="set-val" id="hudScaleV">${TC.faNum(S.hudScale.toFixed(2))}</span>`);
      body.querySelector('#hudScale').oninput = (e) => {
        S.hudScale = +e.target.value;
        document.documentElement.style.setProperty('--hud-scale', S.hudScale);
        document.getElementById('hud').style.zoom = S.hudScale;
        body.querySelector('#hudScaleV').textContent = TC.faNum(S.hudScale.toFixed(2));
        TC.Settings.save();
      };
    }
    if (tab === 'audio') {
      const volRow = (label, key) => {
        row(label, `<input type="range" min="0" max="1" step="0.05" value="${S[key]}" data-vol="${key}"><span class="set-val">${TC.faNum(Math.round(S[key] * 100))}٪</span>`);
      };
      volRow('صدای کلی', 'masterVol');
      volRow('جلوه‌های صوتی', 'sfxVol');
      volRow('موسیقی', 'musicVol');
      volRow('صدای محیط', 'ambientVol');
      body.querySelectorAll('[data-vol]').forEach(inp => {
        inp.oninput = () => {
          S[inp.dataset.vol] = +inp.value;
          TC.Settings.save();
          TC.Audio.applyVolumes();
          inp.nextElementSibling.textContent = TC.faNum(Math.round(+inp.value * 100)) + '٪';
        };
      });
    }
    if (tab === 'controls') {
      row('حساسیت دوربین (ماوس)', `<input type="range" min="0.4" max="2" step="0.1" value="${S.sensitivity}">`);
      body.querySelector('input[type=range]').oninput = (e) => { S.sensitivity = +e.target.value; TC.Settings.save(); };
      row('معکوس محور عمودی', `<div class="seg"><button data-i="1" class="${S.invertY ? 'active' : ''}">روشن</button><button data-i="0" class="${!S.invertY ? 'active' : ''}">خاموش</button></div>`);
      body.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { S.invertY = b.dataset.i === '1'; TC.Settings.save(); UI.openSettings('controls'); });
      row('فاصله دوربین', `<input type="range" min="0.6" max="1.6" step="0.1" value="${S.camDistance}">`);
      body.querySelectorAll('input[type=range]')[1].oninput = (e) => { S.camDistance = +e.target.value; TC.Settings.save(); };
      body.insertAdjacentHTML('beforeend', '<h4 style="margin:14px 0 4px;color:var(--cyan)">کلیدها — برای تغییر، روی دکمه کلیک و کلید جدید را بزنید</h4>');
      const kb = S.keybinds || {};
      const getBind = (act) => kb[act] || TC.DefaultKeys[act];
      const labels = {
        forward: 'حرکت جلو', back: 'حرکت عقب', left: 'چپ', right: 'راست',
        run: 'دویدن', jump: 'پرش', interact: 'تعامل', enterExit: 'ورود/خروج خودرو',
        camera: 'تغییر دوربین', map: 'نقشه', char: 'پروفایل', menu: 'منو', pause: 'توقف',
        phone: 'تلفن', horn: 'بوق', fire: 'شلیک', attack: 'حمله', lights: 'چراغ خودرو',
      };
      for (const [act, label] of Object.entries(labels)) {
        const d = row(label, `<button class="key-bind" data-act="${act}">${TC.keyName(getBind(act))}</button>`);
        d.querySelector('.key-bind').onclick = (e) => {
          const btn = e.target;
          btn.classList.add('waiting');
          btn.textContent = '…';
          const handler = (ev) => {
            ev.preventDefault();
            if (ev.code !== 'Escape') {
              kb[act] = ev.code;
              TC.Settings.save();
            }
            btn.textContent = TC.keyName(getBind(act));
            btn.classList.remove('waiting');
            window.removeEventListener('keydown', handler, true);
          };
          window.addEventListener('keydown', handler, true);
        };
      }
      row('', `<button class="mm-btn reset-keys" id="resetKeys">بازنشانی کلیدهای پیش‌فرض</button>`);
      body.querySelector('#resetKeys').onclick = () => {
        S.keybinds = null;
        TC.Settings.save();
        UI.openSettings('controls');
      };
    }
    if (tab === 'mobile') {
      if (!TC.G.isMobile) body.insertAdjacentHTML('beforeend', '<div class="set-note">این تنظیمات در دستگاه‌های لمسی فعال می‌شود؛ روی کامپیوتر فقط برای تست نمایش داده می‌شود.</div>');
      row('حساسیت دوربین لمسی', `<input type="range" min="0.4" max="2.2" step="0.1" value="${S.touchSensitivity}">`);
      row('اندازه جوی‌استیک', `<input type="range" min="0.7" max="1.5" step="0.1" value="${S.joySize}">`);
      row('اندازه دکمه‌ها', `<input type="range" min="0.7" max="1.4" step="0.1" value="${S.btnSize}">`);
      row('شفافیت کنترل‌ها', `<input type="range" min="0.3" max="1" step="0.05" value="${S.touchOpacity}">`);
      row('چیدمان کنترل رانندگی', `<select id="layoutSel">
        <option value="joystick" ${S.controlLayout === 'joystick' ? 'selected' : ''}>جوی‌استیک (فرمان + گاز)</option>
        <option value="buttons" ${S.controlLayout === 'buttons' ? 'selected' : ''}>دکمه‌های فرمان چپ/راست</option>
      </select>`);
      body.querySelectorAll('input[type=range]').forEach((inp, i) => {
        inp.oninput = () => {
          const keys = ['touchSensitivity', 'joySize', 'btnSize', 'touchOpacity'];
          S[keys[i]] = +inp.value;
          TC.Settings.save();
          TC.Mobile && TC.Mobile.applySettings();
        };
      });
      body.querySelector('#layoutSel').onchange = (e) => { S.controlLayout = e.target.value; TC.Settings.save(); TC.Mobile && TC.Mobile.rebuildButtons(); };
      row('', `<button class="mm-btn reset-keys" id="resetLayout">بازنشانی چیدمان دکمه‌ها</button>`);
      body.querySelector('#resetLayout').onclick = () => {
        S.mobileBtns = null;
        TC.Settings.save();
        TC.Mobile && TC.Mobile.rebuildButtons();
        UI.notify('چیدمان بازنشانی شد', 'success');
      };
      row('حالت ویرایش چیدمان (کشیدن دکمه‌ها)', `<div class="seg"><button data-e="1">روشن</button><button data-e="0" class="active">خاموش</button></div>`);
      body.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
        TC.Mobile && TC.Mobile.setEditMode(b.dataset.e === '1');
        body.querySelectorAll('[data-e]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
    }
    if (tab === 'game') {
      row('کیفیت کنترل‌های لمسی پیش‌فرض', `<div class="set-note">جوی‌استیک هشت‌جهته با بازگشت خودکار، دوربین با کشیدن در نیمه راست، دکمه‌های متناسب پیاده/رانندگی.</div>`);
      row('ذخیره خودکار', `<div class="seg"><button data-s="1" class="active">روشن</button></div><span class="set-val">هر ۲ دقیقه</span>`);
      row('نسخه بازی', `<span class="set-val">شهر طوفان ${TC.VERSION}</span>`);
    }
  };

  /* ---------- راهنمای کنترل ---------- */
  UI.openControls = function () {
    const el = document.getElementById('controlsUI');
    el.style.display = 'flex';
    document.getElementById('ctrlClose').onclick = () => el.style.display = 'none';
    const S = TC.Settings.data;
    const kb = S.keybinds || {};
    const k = (a, def) => TC.keyName(kb[a] || def);
    document.getElementById('ctrlBody').innerHTML = `
      <h4>🎮 کامپیوتر — پیاده</h4>
      <table class="ctrl-table">
        <tr><td><span class="key-cap">${k('forward')}</span><span class="key-cap">${k('left')}</span><span class="key-cap">${k('back')}</span><span class="key-cap">${k('right')}</span></td><td>حرکت (نسبت به دوربین)</td></tr>
        <tr><td><span class="key-cap">${k('run')}</span></td><td>دویدن (استقامت مصرف می‌کند)</td></tr>
        <tr><td><span class="key-cap">${k('jump')}</span></td><td>پرش</td></tr>
        <tr><td><span class="key-cap">${k('interact')}</span></td><td>تعامل (NPC، فروشگاه، تخت، خودرو نمایشی…)</td></tr>
        <tr><td><span class="key-cap">${k('enterExit')}</span></td><td>ورود/خروج از خودرو</td></tr>
        <tr><td><span class="key-cap">${k('attack')}</span></td><td>جابه‌جایی سلاح (مشت/چوب/کلت)</td></tr>
        <tr><td><span class="key-cap">${k('fire')}</span></td><td>شلیک/ضربه</td></tr>
        <tr><td><span class="key-cap">${k('char')}</span></td><td>پروفایل شخصیت</td></tr>
        <tr><td><span class="key-cap">${k('phone')}</span></td><td>تلفن همراه</td></tr>
        <tr><td><span class="key-cap">ماوس</span></td><td>چرخش دوربین (نگه دارید و بکشید)</td></tr>
      </table>
      <h4>🚗 کامپیوتر — رانندگی</h4>
      <table class="ctrl-table">
        <tr><td><span class="key-cap">${k('forward')}</span>/<span class="key-cap">${k('back')}</span></td><td>گاز / ترمز و دنده عقب</td></tr>
        <tr><td><span class="key-cap">${k('left')}</span>/<span class="key-cap">${k('right')}</span></td><td>فرمان</td></tr>
        <tr><td><span class="key-cap">${k('horn')}</span></td><td>بوق</td></tr>
        <tr><td><span class="key-cap">${k('camera')}</span></td><td>نمای بیرونی / کاپوت / داخل کابین</td></tr>
        <tr><td><span class="key-cap">${k('enterExit')}</span></td><td>خروج از خودرو</td></tr>
        <tr><td><span class="key-cap">Space</span></td><td>ترمز دستی (هلی‌کوپتر: بالا/پایین با W/S)</td></tr>
      </table>
      <h4>🗺️ عمومی</h4>
      <table class="ctrl-table">
        <tr><td><span class="key-cap">${k('map')}</span></td><td>نقشه بزرگ (کلیک = تعیین مقصد GPS)</td></tr>
        <tr><td><span class="key-cap">${k('menu')}</span>/<span class="key-cap">${k('pause')}</span></td><td>منوی توقف / رد کردن کات‌سین</td></tr>
        <tr><td>اسکرول</td><td>زوم دوربین</td></tr>
      </table>
      <h4>📱 موبایل</h4>
      <table class="ctrl-table">
        <tr><td>جوی‌استیک چپ</td><td>حرکت / در رانندگی: فرمان و گاز</td></tr>
        <tr><td>کشیدن نیمه راست</td><td>چرخش دوربین</td></tr>
        <tr><td>دکمه‌ها</td><td>دویدن، پرش، تعامل، خودرو، نقشه، تلفن، منو، بوق، ترمز…</td></tr>
        <tr><td>دو انگشت هم‌زمان</td><td>حرکت + دوربین + دکمه‌ها (Multi-Touch کامل)</td></tr>
        <tr><td>دکمه ⚙️</td><td>تنظیم اندازه/حساسیت/جابه‌جایی دکمه‌ها</td></tr>
      </table>
      <h4>🎮 دسته بازی (بلوتوث)</h4>
      <table class="ctrl-table">
        <tr><td>آنالوگ چپ</td><td>حرکت / فرمان</td></tr>
        <tr><td>آنالوگ راست</td><td>دوربین</td></tr>
        <tr><td>A/Cross</td><td>تعامل</td></tr>
        <tr><td>B/Circle</td><td>ترمز / خروج خودرو</td></tr>
        <tr><td>RT/R2</td><td>گاز</td></tr>
        <tr><td>Y/Triangle</td><td>ورود/خروج خودرو</td></tr>
        <tr><td>X/Square</td><td>پرش</td></tr>
      </table>`;
  };

  TC.ui = UI;
})();
