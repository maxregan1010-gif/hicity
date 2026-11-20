/* ============================================================
 * hud.js — رابط کاربری بازی: پول، سلامت، مأموریت، خودرو،
 * اعلان‌ها، تعامل، نقشه کوچک (چرخشی)، ساعت و منطقه
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const HUD = {
    els: {},
    notifQueue: [],
    lastDistrict: '',
  };

  HUD.init = function () {
    const ids = ['hudCash', 'hudBank', 'moneyFlash', 'hudClock', 'hudDate', 'hudDistrict', 'hudWeather',
      'hudWanted', 'wantedStars', 'wantedHint', 'barHealth', 'valHealth', 'barStamina', 'valStamina',
      'weaponIcon', 'valAmmo', 'hudMission', 'pmTitle', 'pmDesc', 'pmObjective', 'pmSteps', 'pmReward', 'pmProgress',
      'hudJob', 'jobPanelTitle', 'jobPanelTask', 'jobPanelInfo', 'jobPanelProgress',
      'hudVehicle', 'vehSpeed', 'vehGear', 'barFuel', 'barVehHealth', 'vehName',
      'hudNotifications', 'hudInteract', 'interactText', 'interactKey', 'minimap', 'gpsHint', 'crosshair', 'hudFps'];
    for (const id of ids) HUD.els[id] = document.getElementById(id);
    document.getElementById('hud').style.display = 'block';
    HUD.lastMinimapDraw = 0;
  };

  /* ---------- اعلان ---------- */
  HUD.notify = function (text, kind) {
    const box = HUD.els.hudNotifications || document.getElementById('hudNotifications');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'notif ' + (kind || '');
    div.textContent = text;
    box.appendChild(div);
    setTimeout(() => div.classList.add('out'), 4200);
    setTimeout(() => div.remove(), 4700);
    while (box.children.length > 4) box.firstChild.remove();
  };

  /* ---------- فلش پول ---------- */
  HUD.moneyFlash = function (text, kind) {
    const el = HUD.els.moneyFlash;
    if (!el) return;
    el.textContent = text;
    el.className = 'money-flash ' + (kind || '');
    el.classList.remove('show');
    void el.offsetWidth; // restart animation
    el.classList.add('show');
  };

  /* ---------- تعامل ---------- */
  HUD.setInteract = function (it) {
    const el = HUD.els.hudInteract;
    if (!el) return;
    if (it && !TC.ActiveVehicle) {
      el.style.display = 'flex';
      HUD.els.interactText.textContent = it.text;
      HUD.els.interactKey.textContent = TC.isMobile() ? '👆' : (TC.keyName(TC.Settings.data.keybinds ? TC.Settings.data.keybinds.interact : null) || 'E');
    } else {
      el.style.display = 'none';
    }
  };

  /* ---------- به‌روزرسانی هر فریم ---------- */
  HUD.update = function (dt) {
    const e = HUD.els;
    if (!e.hudCash) return;
    // پول
    e.hudCash.textContent = TC.moneyFmt(TC.Economy.cash);
    e.hudBank.textContent = TC.moneyFmt(TC.Economy.bank);
    // ساعت و تاریخ
    e.hudClock.textContent = TC.timeFmt(TC.G.time);
    e.hudDate.textContent = 'روز ' + TC.faNum(TC.G.day) + ' — ' + TC.dayName();
    // منطقه
    const district = HUD.districtAtPlayer();
    if (district !== HUD.lastDistrict) {
      HUD.lastDistrict = district;
      e.hudDistrict.textContent = district;
      if (district) TC.bus.emit('hud:district', district);
    }
    // آب‌وهوا
    if (TC.Weather) e.hudWeather.textContent = TC.Weather.icon() + ' ' + TC.Weather.name();
    // سلامت
    const p = TC.Player;
    e.barHealth.style.width = M.clamp(p.health, 0, 100) + '%';
    e.valHealth.textContent = TC.faNum(Math.round(p.health));
    e.barStamina.style.width = M.clamp(p.stamina, 0, 100) + '%';
    e.valStamina.textContent = TC.faNum(Math.round(p.stamina));
    // سلاح
    const weapons = { fist: '👊', bat: '🏏', pistol: '🔫' };
    e.weaponIcon.textContent = weapons[p.currentWeapon] || '👊';
    if (p.currentWeapon === 'pistol') {
      e.valAmmo.textContent = 'مهمات: ' + TC.faNum(TC.Inventory.data.ammo.pistol || 0);
    } else if (p.currentWeapon === 'bat') {
      e.valAmmo.textContent = 'چوب بیسبال';
    } else {
      e.valAmmo.textContent = '';
    }
    // کراس‌هیر
    e.crosshair.style.display = p.currentWeapon !== 'fist' && !TC.ActiveVehicle && TC.G.state === 'playing' ? 'block' : 'none';
    // تعقیب پلیس
    const w = TC.Police.wanted;
    if (w > 0) {
      e.hudWanted.style.display = 'block';
      let stars = '';
      for (let i = 1; i <= 6; i++) {
        stars += '<span class="star' + (i <= w ? (HUD._lastW !== w ? ' ap' : '') : ' off') + '">★</span>';
      }
      e.wantedStars.innerHTML = stars;
      const hint = TC.Police.state === 'searching' ? 'پلیس در حال جست‌وجو — از دید خارج شو!' : 'در حال تعقیب — فرار کن یا بایست تا دستگیری!';
      if (e.wantedHint.textContent !== hint) e.wantedHint.textContent = hint;
      HUD._lastW = w;
    } else {
      e.hudWanted.style.display = 'none';
    }
    // پنل مأموریت داستان
    HUD.updateMissionPanel();
    // پنل شغل
    HUD.updateJobPanel();
    // پنل خودرو
    HUD.updateVehiclePanel();
    // GPS
    HUD.updateGps();
    // نقشه کوچک (هر ۳ فریم)
    HUD._mmFrame = (HUD._mmFrame || 0) + 1;
    if (HUD._mmFrame % 2 === 0) TC.Map.drawMinimap(e.minimap);
  };

  HUD.districtAtPlayer = function () {
    const N = TC.CONFIG.cityBlocks, half = (N * TC.CONFIG.blockPitch) / 2;
    const x = TC.Player.pos.x, z = TC.Player.pos.z;
    // خارج از شهر؟
    if (TC.Physics.isWater(x, z)) return 'دریای طوفان';
    if (TC.Physics.isSand(x, z)) return 'ساحل مرجان';
    if (x > half + 46) {
      if (z < -20 && x > half + 150) return 'فرودگاه بین‌المللی آرش';
      if (Math.abs(z - 30) < 60 || Math.abs(z - 150) < 70) return 'منطقه امنیتی';
      return 'حاشیه شرقی';
    }
    if (z > half + 46) {
      if (x < -half - 30) return 'بندر شرقی';
      if (x > half + 40) return 'کوه‌های پارسه';
      return 'حاشیه جنوبی';
    }
    if (z < -half - 46) return x < -100 ? 'جنگل سبزان' : 'جاده روستایی';
    if (x < -half - 46) return 'ساحل مرجان';
    // داخل شهر
    const bx = Math.floor((x + half) / TC.CONFIG.blockPitch);
    const bz = Math.floor((z + half) / TC.CONFIG.blockPitch);
    const d = TC.districtAt(bx, bz);
    return d ? TC.DISTRICTS[d].name : 'حاشیه شهر';
  };

  HUD.updateMissionPanel = function () {
    const e = HUD.els;
    const ms = TC.Missions;
    let show = false, title = '', desc = '', objective = '', stepsHtml = '', reward = '', progress = '';
    if (ms.active && ms.currentChapter()) {
      const ch = ms.currentChapter();
      const step = ch.steps[ms.stepIndex];
      show = true;
      title = '📖 ' + ch.title;
      desc = 'فصل ' + TC.faNum(ms.storyIndex + 1) + ' از ' + TC.faNum(8);
      objective = step ? '🎯 ' + step.text : '';
      reward = 'پاداش فصل: ' + TC.moneyFmt(ch.reward) + ' تومان';
      // مراحل
      let sh = '';
      ch.steps.forEach((s, i) => {
        const cls = i < ms.stepIndex ? 'done' : i === ms.stepIndex ? 'cur' : '';
        const mark = i < ms.stepIndex ? '✓' : i === ms.stepIndex ? '▶' : '·';
        sh += `<div class="pm-step ${cls}"><span>${mark}</span><span>${s.text}</span></div>`;
      });
      stepsHtml = sh;
      progress = `<div class="pg-bar"><div class="pg-fill" style="width:${Math.round(ms.stepIndex / ch.steps.length * 100)}%"></div></div>
        <div class="pg-text">پیشرفت فصل: ${TC.faNum(ms.stepIndex)}/${TC.faNum(ch.steps.length)}</div>`;
    } else if (ms.race) {
      show = true;
      title = '🏁 مسابقه خیابانی';
      objective = 'ایستگاه ' + TC.faNum(ms.race.idx + 1) + ' از ۵';
      progress = `<div class="pg-bar"><div class="pg-fill" style="width:${ms.race.idx / 5 * 100}%"></div></div>
        <div class="pg-text">زمان: ${TC.faNum(Math.round(ms.race.time))} ثانیه</div>`;
    }
    if (show) {
      e.hudMission.style.display = 'block';
      e.pmTitle.textContent = title;
      e.pmDesc.textContent = desc;
      e.pmObjective.textContent = objective;
      e.pmSteps.innerHTML = stepsHtml;
      e.pmReward.textContent = reward;
      e.pmProgress.innerHTML = progress;
    } else {
      e.hudMission.style.display = 'none';
    }
  };

  HUD.updateJobPanel = function () {
    const e = HUD.els;
    const info = TC.Jobs.panelInfo();
    const jm = TC.JobMissions;
    if (!info) {
      e.hudJob.style.display = 'none';
      return;
    }
    e.hudJob.style.display = 'block';
    e.jobPanelTitle.textContent = '🧰 ' + info.title;
    let task = '';
    if (jm.inShift && jm.task) {
      task = '🎯 ' + jm.task.desc;
    } else if (jm.inShift) {
      task = '⏳ در حال آماده‌سازی مأموریت بعدی…';
    } else {
      task = info.attended ? '✅ حضور امروز ثبت شد' : '📍 برای ثبت حضور در ساعت شیفت به ' + info.workplace + ' بروید';
      if (info.inShift && !jm.inShift) task += ' (شیفت فعال است — می‌توانید شیفت را شروع کنید)';
    }
    e.jobPanelTask.textContent = task;
    e.jobPanelInfo.innerHTML =
      'حقوق: ' + TC.moneyFmt(info.salary) + ' تومان/روز • ' +
      'شیفت: ' + TC.faNum(info.shift[0]) + '–' + TC.faNum(info.shift[1]) + ' • ' +
      'سابقه: ' + TC.faNum(info.streak) + ' روز • ' +
      'غیبت: ' + TC.faNum(info.absences) + ' روز • ' +
      (info.inShift ? '<span style="color:var(--green)">در ساعت کاری ✓</span>' : '<span style="color:var(--text-dim)">خارج از شیفت</span>');
    if (jm.inShift) {
      e.jobPanelProgress.innerHTML = `<div class="pg-bar"><div class="pg-fill" style="width:${jm.tasksDone / jm.tasksGoal * 100}%"></div></div>
        <div class="pg-text">مأموریت‌های شیفت: ${TC.faNum(jm.tasksDone)}/${TC.faNum(jm.tasksGoal)} — درآمد: ${TC.moneyFmt(jm.earned)}</div>`;
    } else {
      e.jobPanelProgress.innerHTML = '';
    }
  };

  HUD.updateVehiclePanel = function () {
    const e = HUD.els;
    const v = TC.ActiveVehicle;
    if (!v) {
      e.hudVehicle.style.display = 'none';
      return;
    }
    e.hudVehicle.style.display = 'block';
    const kmh = Math.round(Math.abs(v.speed) * 3.6);
    e.vehSpeed.textContent = TC.faNum(kmh);
    let gear = 'D';
    if (v.speed < -0.5) gear = 'R';
    else if (Math.abs(v.speed) < 0.5) gear = 'N';
    e.vehGear.textContent = 'دنده: ' + gear + ' • ' + v.def.name;
    const fuelPct = v.def.fuel > 900 ? 100 : M.clamp(v.fuel / v.def.fuel * 100, 0, 100);
    e.barFuel.style.width = fuelPct + '%';
    e.barVehHealth.style.width = M.clamp(v.health, 0, 100) + '%';
    e.vehName.textContent = v.def.type === 'heli' || v.def.type === 'plane' ? 'ارتفاع: ' + TC.faNum(Math.round(v.pos.y)) + ' متر' : '';
  };

  HUD.updateGps = function () {
    const e = HUD.els;
    const target = TC.G.routeTarget;
    if (!target) {
      e.gpsHint.style.display = 'none';
      return;
    }
    const pos = TC.ActiveVehicle ? TC.ActiveVehicle.pos : TC.Player.pos;
    const d = M.dist2(pos.x, pos.z, target.x, target.z);
    if (d < TC.CONFIG.arriveRadius) {
      e.gpsHint.style.display = 'none';
      TC.ui && TC.ui.notify('📍 به مقصد رسیدید: ' + target.name, 'success');
      TC.G.routeTarget = null;
      TC.G.routePath = null;
      return;
    }
    e.gpsHint.style.display = 'block';
    e.gpsHint.textContent = '🧭 ' + target.name + ' — ' + TC.faNum(Math.round(d)) + ' متر';
  };

  TC.HUD = HUD;
})();
