/* ============================================================
 * save.js — ذخیره چنداسلاتی با IndexedDB + ذخیره خودکار
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Save = {
    db: null,
    slots: ['خودکار', 'اسلات ۱', 'اسلات ۲', 'اسلات ۳'],
    lastAutosave: 0,
  };

  Save.open = function () {
    return new Promise((resolve, reject) => {
      if (Save.db) return resolve(Save.db);
      const req = indexedDB.open('toofan_city', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('saves')) {
          db.createObjectStore('saves', { keyPath: 'slot' });
        }
      };
      req.onsuccess = () => { Save.db = req.result; resolve(Save.db); };
      req.onerror = () => reject(req.error);
    });
  };

  /* ---------- جمع‌آوری وضعیت همه سیستم‌ها ---------- */
  Save.collect = function () {
    return {
      version: TC.VERSION,
      savedAt: Date.now(),
      day: TC.G.day,
      time: TC.G.time,
      playTimeSec: Math.round(TC.G.playTimeSec),
      quality: TC.G.quality,
      weather: TC.Weather ? TC.Weather.state : 'sunny',
      player: TC.Player.serialize(),
      economy: TC.Economy.serialize(),
      inventory: TC.Inventory.serialize(),
      vehicles: TC.Vehicles.serializeGarage(),
      activeVehicle: TC.Vehicles.serializeActive(),
      jobs: TC.Jobs.serialize(),
      jobShift: TC.JobMissions.serialize(),
      missions: TC.Missions.serialize(),
      police: TC.Police.serialize(),
      prison: TC.Prison.serialize(),
      world: TC.World.serialize(),
      housing: TC.Housing.serialize(),
      garageCars: TC.Vehicles.playerGarage.length,
    };
  };

  Save.apply = function (data) {
    TC.G.day = data.day || 1;
    TC.G.time = data.time || TC.CONFIG.startHour * 3600;
    TC.G.playTimeSec = data.playTimeSec || 0;
    if (data.weather && TC.Weather) TC.Weather.apply(data.weather, true);
    TC.Player.deserialize(data.player);
    TC.Economy.deserialize(data.economy);
    TC.Inventory.deserialize(data.inventory);
    TC.Vehicles.deserializeGarage(data.vehicles);
    TC.Jobs.deserialize(data.jobs);
    TC.JobMissions.deserialize(data.jobShift);
    TC.Missions.deserialize(data.missions);
    TC.Police.deserialize(data.police);
    TC.Housing.deserialize(data.housing);
    if (data.prison && data.prison.active) {
      TC.Prison.deserialize(data.prison);
    }
    if (data.world) TC.World.deserialize(data.world);
    // خودروی فعال
    if (data.activeVehicle) {
      const v = TC.Vehicles.deliverVehicle(TC.Vehicles.playerGarage[data.activeVehicle.garageIdx].defId, data.activeVehicle.x, data.activeVehicle.z);
      if (v) {
        v.health = data.activeVehicle.health;
        v.fuel = data.activeVehicle.fuel;
        v.odometer = data.activeVehicle.odometer;
        v.yaw = data.activeVehicle.yaw || 0;
        TC.Player.enterVehicle(v);
      }
    }
  };

  /* ---------- ذخیره در اسلات ---------- */
  Save.saveSlot = function (slot, silent) {
    const data = Save.collect(); // همزمان با فراخوانی — قبل از هر تغییر بعدی
    return Save.open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ slot, data });
      tx.oncomplete = () => {
        localStorage.setItem('toofan_has_save', '1');
        if (!silent) {
          TC.ui.notify('💾 بازی ذخیره شد (' + Save.slots[slot] + ')', 'success');
          TC.Audio.jingle('complete');
        }
        resolve(true);
      };
      tx.onerror = () => { TC.ui.notify('خطا در ذخیره!', 'error'); reject(tx.error); };
    }));
  };

  /* ---------- بارگذاری ---------- */
  Save.loadSlot = function (slot) {
    return Save.open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readonly');
      const req = tx.objectStore('saves').get(slot);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => reject(req.error);
    }));
  };

  Save.deleteSlot = function (slot) {
    return Save.open().then(db => new Promise((resolve) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').delete(slot);
      tx.oncomplete = () => resolve(true);
    }));
  };

  /* ---------- پنجره اسلات‌ها ---------- */
  Save.slotDialog = function (mode) {
    const el = document.getElementById('slotUI');
    document.getElementById('slotTitle').textContent = mode === 'save' ? '💾 ذخیره بازی' : '📂 بارگذاری بازی';
    el.style.display = 'flex';
    document.getElementById('slotClose').onclick = () => el.style.display = 'none';
    const list = document.getElementById('slotList');
    list.innerHTML = '<div class="set-note">در حال خواندن…</div>';
    Save.open().then(db => new Promise((resolve) => {
      const tx = db.transaction('saves', 'readonly');
      const store = tx.objectStore('saves');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    })).then(rows => {
      list.innerHTML = '';
      const bySlot = {};
      for (const r of rows) bySlot[r.slot] = r.data;
      for (let i = 0; i <= TC.CONFIG.saveSlots; i++) {
        const data = bySlot[i];
        const div = document.createElement('div');
        div.className = 'slot-item';
        const meta = data
          ? 'روز ' + TC.faNum(data.day) + ' — ' + TC.timeFmt(data.time) + ' • ' + TC.moneyFmt(data.economy ? data.economy.cash : 0) + ' تومان • ' + new Date(data.savedAt).toLocaleString('fa-IR')
          : 'خالی';
        div.innerHTML = `
          <div class="sl-ico">${data ? '💾' : '📁'}</div>
          <div class="sl-info"><div class="sl-name">${Save.slots[i]}</div><div class="sl-meta">${meta}</div></div>
          ${mode === 'save' ? '<button class="sl-btn">ذخیره اینجا</button>' : (data ? '<button class="sl-btn">بارگذاری</button>' : '')}
          ${data ? '<button class="sl-btn">🗑</button>' : ''}`;
        const [saveBtn, delBtn] = div.querySelectorAll('.sl-btn');
        if (saveBtn) saveBtn.onclick = () => {
          Save.saveSlot(i).then(() => { el.style.display = 'none'; });
        };
        if (mode === 'load' && data && saveBtn) saveBtn.textContent = 'بارگذاری';
        if (delBtn) delBtn.onclick = (e) => {
          e.stopPropagation();
          TC.ui.confirm('اسلات «' + Save.slots[i] + '» حذف شود؟', () => {
            Save.deleteSlot(i);
            Save.slotDialog(mode);
          });
        };
        if (mode === 'load' && data) {
          div.onclick = (e) => {
            if (e.target === delBtn) return;
            el.style.display = 'none';
            Save.loadSlot(i).then(d => { if (d) TC.Start.applyLoaded(d); });
          };
        }
        list.appendChild(div);
      }
    });
  };

  /* ---------- ذخیره خودکار ---------- */
  Save.update = function (dt) {
    if (!TC.G.started || TC.G.state === 'menu') return;
    Save.lastAutosave += dt;
    if (Save.lastAutosave >= TC.CONFIG.autosaveSec) {
      Save.lastAutosave = 0;
      Save.saveSlot(0, true);
    }
  };

  TC.Save = Save;
})();
