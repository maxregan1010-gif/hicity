/* ============================================================
 * jobs.js — ۱۲ شغل: استخدام در دفاتر، حقوق روزانه، غیبت، استعفا
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const JOBS = {
    police:     { id: 'police', title: 'افسر پلیس', workplace: 'اداره پلیس مرکزی', salary: 900, fee: 0, shift: [8, 18], uniform: { shirt: '#1a3a8a', pants: '#1a2a3a' }, desc: 'گشت‌زنی، رسیدگی به گزارش‌ها و مأموریت‌های پلیسی' },
    taxi:       { id: 'taxi', title: 'راننده تاکسی', workplace: 'شرکت تاکسی‌رانی طوفان', salary: 550, fee: 500, shift: [7, 23], uniform: { shirt: '#e8b40a', pants: '#3a3a3a' }, desc: 'رساندن مسافرها به مقصد و دریافت کرایه' },
    ride:       { id: 'ride', title: 'راننده تاکسی اینترنتی', workplace: 'شرکت تاکسی‌رانی طوفان', salary: 600, fee: 300, shift: [7, 24], uniform: { shirt: '#2f8a7a', pants: '#3a3a3a' }, desc: 'پذیرش سفارش‌های اپلیکیشنی' },
    courier:    { id: 'courier', title: 'پیک موتوری', workplace: 'مرکز پیک طوفان', salary: 480, fee: 200, shift: [9, 22], uniform: { shirt: '#c0392b', pants: '#33383f' }, desc: 'برداشتن و تحویل بسته‌ها با موتور' },
    carcourier: { id: 'carcourier', title: 'پیک خودرو', workplace: 'مرکز پیک طوفان', salary: 700, fee: 400, shift: [9, 22], uniform: { shirt: '#2c6a8a', pants: '#33383f' }, desc: 'تحویل مرسوله‌های حجیم با خودرو' },
    banker:     { id: 'banker', title: 'کارمند بانک', workplace: 'بانک مرکزی طوفان', salary: 1100, fee: 800, shift: [8, 15], uniform: { shirt: '#22262e', pants: '#33383f' }, desc: 'پذیرش مشتریان و انجام وظایف بانکی' },
    guard:      { id: 'guard', title: 'نگهبان زندان', workplace: 'زندان مرکزی طوفان', salary: 850, fee: 0, shift: [6, 20], uniform: { shirt: '#2a3a2a', pants: '#2a2a2a' }, desc: 'گشت‌زنی و کنترل زندانیان' },
    waiter:     { id: 'waiter', title: 'کارمند رستوران', workplace: 'رستوران بهار', salary: 500, fee: 150, shift: [11, 23], uniform: { shirt: '#e8e8e8', pants: '#2a2a2a' }, desc: 'سرویس‌دهی به مشتریان رستوران' },
    truck:      { id: 'truck', title: 'راننده کامیون', workplace: 'باربری پارس', salary: 950, fee: 600, shift: [6, 22], uniform: { shirt: '#8a6a2a', pants: '#33383f' }, desc: 'حمل بارهای سنگین بین مراکز' },
    factory:    { id: 'factory', title: 'کارگر کارخانه', workplace: 'کارخانه صنعتی پارس', salary: 520, fee: 100, shift: [7, 17], uniform: { shirt: '#6a6a72', pants: '#3a3a3a' }, desc: 'کار در خط تولید کارخانه' },
    security:   { id: 'security', title: 'نگهبان ساختمان', workplace: 'گشت امنیت شاه‌نشین', salary: 560, fee: 200, shift: [10, 22], uniform: { shirt: '#2a2a3a', pants: '#2a2a2a' }, desc: 'گشت‌زنی و حفاظت از ساختمان‌ها' },
    bus:        { id: 'bus', title: 'راننده اتوبوس', workplace: 'اداره اتوبوس‌رانی', salary: 640, fee: 350, shift: [6, 22], uniform: { shirt: '#2a7a3a', pants: '#33383f' }, desc: 'پیمودن خطوط اتوبوس شهری' },
  };

  const Jobs = {
    active: null,       // {def, hiredDay, attendedToday, absences, streak, lastAttended}
    history: [],
    inShift: false,
  };

  Jobs.init = function () {
    // دفاتر استخدام با تعامل
    for (const office of (TC.World.jobOffices || [])) {
      const def = JOBS[office.type];
      if (!def) continue;
      TC.addInteract({
        x: office.x, z: office.z + 1, radius: 4,
        text: 'صحبت با مسئول استخدام — ' + def.title,
        action: () => Jobs.startHiring(def, office),
      });
    }
  };

  /* ---------- فرآیند استخدام ---------- */
  Jobs.startHiring = function (def, office) {
    if (Jobs.active && Jobs.active.def.id === def.id) {
      TC.ui.dialogue('مسئول استخدام', 'شما همین حالا در این جایگاه مشغول به کار هستید. شیفت از ساعت ' + TC.faNum(def.shift[0]) + ' تا ' + TC.faNum(def.shift[1]) + ' است.', [
        { label: 'شروع شیفت کاری', action: () => TC.JobMissions.startShift(def.id) },
        { label: 'بستن', action: () => { } },
      ]);
      return;
    }
    const lines = [
      'به ' + def.workplace + ' خوش آمدی.',
      'شغل: «' + def.title + '» — ' + def.desc,
      'حقوق روزانه: ' + TC.moneyFmt(def.salary) + ' تومان',
      'هزینه استخدام: ' + TC.moneyFmt(def.fee) + ' تومان',
      'شیفت کاری: ساعت ' + TC.faNum(def.shift[0]) + ' تا ' + TC.faNum(def.shift[1]),
      'توجه: اگر دو روز متوالی سر کار نیایی، اخراج می‌شوی!',
    ];
    const options = [];
    if (Jobs.active) {
      options.push({ label: 'باید اول شغل فعلی‌ام را رها کنم', action: () => { } });
    } else if (TC.Economy.canAfford(def.fee)) {
      options.push({
        label: 'پرداخت ' + TC.moneyFmt(def.fee) + ' تومان و استخدام ✓',
        action: () => {
          if (def.fee > 0) TC.Economy.spend(def.fee, 'هزینه استخدام ' + def.title);
          Jobs.hire(def);
        },
      });
    } else {
      options.push({ label: 'پول کافی ندارم…', action: () => { } });
    }
    options.push({ label: 'فقط می‌خواستم بپرسم', action: () => { } });
    TC.ui.dialogue('مسئول استخدام ' + def.workplace, lines.join('\n'), options);
  };

  Jobs.hire = function (def) {
    Jobs.active = {
      def, hiredDay: TC.G.day,
      attendedToday: false, absences: 0, consecutiveAbsence: 0,
      streak: 0, lastSalaryDay: 0,
    };
    TC.ui && TC.ui.notify('🎉 استخدام شدید: ' + def.title, 'success');
    TC.Audio.jingle('complete');
    // لباس فرم
    if (def.uniform && TC.Inventory) {
      Object.assign(TC.Inventory.data.clothesEquipped, def.uniform);
      TC.Player.applyClothes(TC.Inventory.data.clothesEquipped);
    }
    TC.bus.emit('jobs:change');
  };

  Jobs.resign = function () {
    if (!Jobs.active) return;
    const title = Jobs.active.def.title;
    Jobs.history.push({ title, from: Jobs.active.hiredDay, to: TC.G.day, streak: Jobs.active.streak });
    Jobs.active = null;
    Jobs.inShift = false;
    if (TC.JobMissions) TC.JobMissions.endShift();
    TC.ui && TC.ui.notify('از شغل «' + title + '» استعفا دادید', 'warn');
    TC.bus.emit('jobs:change');
  };

  /* ---------- حضور در محل کار ---------- */
  Jobs.checkAttendance = function () {
    if (!Jobs.active) return;
    const def = Jobs.active.def;
    const h = TC.G.time / 3600;
    // در ساعت شیفت و نزدیک محل کار؟
    const wp = TC.poiByType('job').find(p => p.data && p.data.jobType === def.id);
    const inShift = h >= def.shift[0] && h <= def.shift[1];
    if (inShift && wp) {
      const d = M.dist2(TC.Player.pos.x, TC.Player.pos.z, wp.x, wp.z);
      if (d < 30 && !Jobs.active.attendedToday) {
        Jobs.active.attendedToday = true;
        Jobs.active.consecutiveAbsence = 0;
        Jobs.active.absences = Math.max(0, Jobs.active.absences - 0);
        TC.ui && TC.ui.notify('✅ حضور ثبت شد — ' + def.title + ' (حقوق امشب واریز می‌شود)', 'success');
        TC.bus.emit('jobs:change');
      }
    }
  };

  /* پایان روز: غیبت و پرداخت */
  TC.bus.on('day:new', () => {
    if (Jobs.active) {
      if (!Jobs.active.attendedToday) {
        Jobs.active.consecutiveAbsence++;
        Jobs.active.absences++;
        TC.ui && TC.ui.notify('⚠️ دیروز سر کار حاضر نشدید (غیبت ' + TC.faNum(Jobs.active.consecutiveAbsence) + ' روز متوالی)', 'warn');
        if (Jobs.active.consecutiveAbsence >= 2) {
          const title = Jobs.active.def.title;
          TC.ui.notify('❌ به دلیل دو روز غیبت متوالی از «' + title + '» اخراج شدید', 'error');
          Jobs.history.push({ title, from: Jobs.active.hiredDay, to: TC.G.day, streak: Jobs.active.streak, fired: true });
          Jobs.active = null;
          Jobs.inShift = false;
          if (TC.JobMissions) TC.JobMissions.endShift();
        }
      } else {
        Jobs.active.consecutiveAbsence = 0;
      }
      Jobs.active.attendedToday = false;
      TC.bus.emit('jobs:change');
    }
  });

  /* اطلاعات پنل «شغل من» */
  Jobs.panelInfo = function () {
    if (!Jobs.active) return null;
    const def = Jobs.active.def;
    const h = TC.G.time / 3600;
    const inShift = h >= def.shift[0] && h <= def.shift[1];
    const wp = TC.poiByType('job').find(p => p.data && p.data.jobType === def.id);
    return {
      title: def.title,
      workplace: def.workplace,
      salary: def.salary,
      streak: Jobs.active.streak,
      absences: Jobs.active.absences,
      attended: Jobs.active.attendedToday,
      inShift,
      shift: def.shift,
      workPos: wp ? { x: wp.x, z: wp.z } : null,
      salaryIn: 'پایان روز کاری',
    };
  };

  Jobs.serialize = function () {
    return Jobs.active ? {
      id: Jobs.active.def.id, hiredDay: Jobs.active.hiredDay,
      attendedToday: Jobs.active.attendedToday, absences: Jobs.active.absences,
      consecutiveAbsence: Jobs.active.consecutiveAbsence, streak: Jobs.active.streak,
      history: Jobs.history,
    } : { history: Jobs.history };
  };
  Jobs.deserialize = function (d) {
    Jobs.history = d.history || [];
    Jobs.active = null;
    if (d && d.id && JOBS[d.id]) {
      Jobs.active = {
        def: JOBS[d.id], hiredDay: d.hiredDay || 1,
        attendedToday: !!d.attendedToday, absences: d.absences || 0,
        consecutiveAbsence: d.consecutiveAbsence || 0, streak: d.streak || 0,
      };
    }
    TC.bus.emit('jobs:change');
  };

  TC.Jobs = Jobs;
  TC.JOB_DEFS = JOBS;
})();
