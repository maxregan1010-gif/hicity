/* ============================================================
 * jobMissions.js — شیفت کاری و مأموریت‌های اختصاصی هر شغل
 * تاکسی، پیک، پلیس، بانک، نگهبان، کامیون، کارخانه، اتوبوس و…
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const JM = {
    inShift: false, jobId: null,
    task: null,           // مأموریت جاری
    tasksDone: 0, tasksGoal: 0,
    earned: 0,
    marker: null,         // {x, z, label}
    checkpointIdx: 0,
  };

  /* ---------- شروع شیفت ---------- */
  JM.startShift = function (jobId) {
    const job = TC.Jobs.active;
    if (!job || job.def.id !== jobId) {
      TC.ui && TC.ui.notify('ابتدا در دفتر استخدامِ این شغل استخدام شوید', 'warn');
      return;
    }
    const def = job.def;
    const h = TC.G.time / 3600;
    if (h < def.shift[0] || h > def.shift[1]) {
      TC.ui && TC.ui.notify('ساعت کاری نیست! شیفت از ' + TC.faNum(def.shift[0]) + ' تا ' + TC.faNum(def.shift[1]) + ' است', 'warn');
      return;
    }
    JM.inShift = true;
    JM.jobId = jobId;
    JM.tasksDone = 0;
    JM.earned = 0;
    JM.tasksGoal = { taxi: 4, ride: 4, courier: 4, carcourier: 3, police: 3, banker: 4, guard: 3, waiter: 3, truck: 2, factory: 3, security: 3, bus: 2 }[jobId] || 3;
    JM.nextTask();
    TC.ui && TC.ui.notify('🕒 شیفت کاری «' + def.title + '» شروع شد', 'success');
    TC.bus.emit('jobShift:start', jobId);
  };

  JM.endShift = function () {
    if (!JM.inShift) return;
    JM.inShift = false;
    JM.task = null;
    JM.marker = null;
    // پاداش پایان شیفت
    if (JM.tasksDone > 0 && TC.Jobs.active) {
      const bonus = 120 + TC.Jobs.active.streak * 25;
      TC.Economy.earn(bonus, 'پاداش پایان شیفت — ' + TC.Jobs.active.def.title);
      TC.ui && TC.ui.notify('✅ شیفت تمام شد: ' + TC.faNum(JM.tasksDone) + ' مأموریت انجام شد', 'success');
    }
    TC.bus.emit('jobShift:end');
  };

  JM.abandonShift = function () {
    if (!JM.inShift) return;
    TC.ui.confirm('شیفت کاری رها شود؟ پاداش پایان شیفت از دست می‌رود.', () => {
      JM.inShift = false;
      JM.task = null;
      JM.marker = null;
      TC.ui.notify('شیفت رها شد', 'warn');
      TC.bus.emit('jobShift:end');
    });
  };

  /* ---------- ساخت مأموریت بعدی ---------- */
  JM.nextTask = function () {
    if (!JM.inShift) return;
    const gen = {
      taxi: taskTaxiFare, ride: taskTaxiFare, courier: taskCourier, carcourier: taskCourier,
      police: taskPolice, banker: taskBanker, guard: taskGuardPatrol, waiter: taskWaiter,
      truck: taskTruck, factory: taskFactory, security: taskSecurity, bus: taskBus,
    }[JM.jobId];
    JM.task = gen ? gen() : null;
    JM.checkpointIdx = 0;
    if (JM.task) {
      JM.marker = JM.task.marker ? { x: JM.task.marker.x, z: JM.task.marker.z, label: JM.task.desc } : null;
    }
  };

  JM.completeTask = function () {
    if (!JM.task) return;
    JM.tasksDone++;
    TC.Economy.earn(JM.task.reward, JM.task.payLabel || 'مأموریت شغلی');
    JM.earned += JM.task.reward;
    TC.Audio.jingle('complete');
    TC.ui && TC.ui.notify('✔ ' + JM.task.doneText + ' (+' + TC.moneyFmt(JM.task.reward) + ' تومان)', 'success');
    JM.task.onDone && JM.task.onDone();
    JM.task = null;
    JM.marker = null;
    if (JM.tasksDone >= JM.tasksGoal) {
      JM.endShift();
    } else {
      setTimeout(() => JM.nextTask(), 1200);
    }
    TC.bus.emit('jobShift:progress');
  };

  /* ---------- به‌روزرسانی مأموریت جاری ---------- */
  JM.update = function (dt) {
    if (!JM.inShift || !JM.task) return;
    const t = JM.task;
    const P = TC.Player;
    const pos = TC.ActiveVehicle ? TC.ActiveVehicle.pos : P.pos;
    if (t.check) {
      t.check(dt, pos);
    }
    if (t.marker) {
      const d = M.dist2(pos.x, pos.z, t.marker.x, t.marker.z);
      if (d < (t.marker.radius || 8)) {
        if (t.onArrive) {
          t.onArrive(pos);
        } else {
          JM.completeTask();
        }
      }
    }
  };

  /* ---------- ژنراتورهای مأموریت ---------- */
  function randomSidewalk(minR, maxR, from) {
    const p = from || TC.Player.pos;
    return TC.NAV.randomSidewalkPoint(p.x, p.z, minR, maxR);
  }

  function taskTaxiFare() {
    const isRide = JM.jobId === 'ride';
    const pickup = randomSidewalk(40, 160);
    const dest = randomSidewalk(120, 500, pickup);
    const fare = Math.round(180 + TC.NAV.pathLength([{ x: pickup.x, z: pickup.z }, { x: dest.x, z: dest.z }]) * 3.4 + M.rand(0, 120));
    const stage = { phase: 'pickup' };
    const needTaxi = !isRide;
    return {
      desc: 'مسافر را سوار کنید',
      marker: pickup,
      reward: fare,
      payLabel: isRide ? 'سفر اینترنتی' : 'کرایه تاکسی',
      doneText: 'مسافر به مقصد رساند شد',
      check(dt, pos) {
        if (stage.phase === 'drive') return;
      },
      onArrive(pos) {
        if (stage.phase === 'pickup') {
          const veh = TC.ActiveVehicle;
          if (needTaxi && (!veh || (!veh.def.taxi && !TC.Player.inVehicle))) {
            TC.ui && TC.ui.notify('برای این کار باید با تاکسی مسافر را سوار کنید', 'warn');
            return;
          }
          if (!TC.Player.inVehicle) {
            TC.ui && TC.ui.notify('مسافر باید با خودرو سوار شود — با خودرو نزدیک شوید', 'warn');
            return;
          }
          stage.phase = 'drive';
          JM.task.desc = 'مسافر را به مقصد برسانید';
          JM.task.marker = dest;
          JM.marker = { x: dest.x, z: dest.z, label: 'مقصد مسافر' };
          TC.ui && TC.ui.notify('مسافر سوار شد — به مقصد بروید', 'success');
          TC.Audio.play3d('voice', pos.x, pos.z, 0.7);
        } else {
          if (!TC.Player.inVehicle) return;
          JM.completeTask();
        }
      },
    };
  }

  function taskCourier() {
    const pickup = randomSidewalk(30, 140);
    const dest = randomSidewalk(80, 420, pickup);
    const reward = Math.round(120 + M.rand(60, 160) + (JM.jobId === 'carcourier' ? 120 : 0));
    const stage = { phase: 'pickup' };
    return {
      desc: 'بسته را از فرستنده بردارید',
      marker: pickup,
      reward,
      payLabel: 'پیک — تحویل بسته',
      doneText: 'بسته تحویل داده شد',
      onArrive(pos) {
        if (stage.phase === 'pickup') {
          stage.phase = 'deliver';
          JM.task.desc = 'بسته را به گیرنده برسانید';
          JM.task.marker = dest;
          JM.marker = { x: dest.x, z: dest.z, label: 'گیرنده بسته' };
          TC.ui && TC.ui.notify('📦 بسته برداشته شد — به گیرنده برسانید', 'success');
        } else {
          JM.completeTask();
        }
      },
    };
  }

  function taskPolice() {
    // چک‌پوینت‌های گشت + رسیدگی به گزارش
    if (JM.tasksDone % 2 === 0 || !JM._lastReport) {
      // گشت: ۳ نقطه
      const pts = [];
      for (let i = 0; i < 3; i++) pts.push(randomSidewalk(60, 200));
      const stage = { idx: 0 };
      return {
        desc: 'گشت‌زنی — نقطه ۱ از ۳',
        marker: pts[0],
        reward: 260,
        payLabel: 'گشت پلیسی',
        doneText: 'گشت منطقه انجام شد',
        onArrive() {
          stage.idx++;
          if (stage.idx >= 3) { JM.completeTask(); return; }
          JM.task.desc = 'گشت‌زنی — نقطه ' + TC.faNum(stage.idx + 1) + ' از ۳';
          JM.task.marker = pts[stage.idx];
          JM.marker = { x: pts[stage.idx].x, z: pts[stage.idx].z, label: 'نقطه گشت' };
        },
      };
    } else {
      // گزارش جرم: رسیدن به محل گزارش کافی است
      const rep = TC.Police.randomReport();
      JM._lastReport = false;
      return {
        desc: 'رسیدگی به گزارش: ' + rep.text,
        marker: { x: rep.x, z: rep.z },
        reward: 380,
        payLabel: 'رسیدگی به گزارش',
        doneText: 'گزارش رسیدگی شد',
        onArrive() {
          TC.ui && TC.ui.notify('موضوع بررسی شد — وضعیت کنترل شد', 'success');
          JM.completeTask();
        },
      };
    }
  }

  function taskBanker() {
    const bank = TC.World.bankRoom;
    const stage = { served: 0 };
    const need = 3;
    return {
      desc: 'به پشت میز بانک بروید و مشتری‌ها را پذیرش کنید (۰/۳)',
      marker: { x: bank.x, z: bank.z - 2, radius: 3.5 },
      reward: 300,
      payLabel: 'پذیرش مشتری بانک',
      doneText: 'شیفت بانک تمام شد',
      check(dt, pos) {
        const d = M.dist2(pos.x, pos.z, bank.x, bank.z - 2);
        if (d < 3.2 && TC.Virtual.interact) {
          TC.Virtual.interact = false;
          stage.served++;
          JM.task.desc = 'پذیرش مشتری‌ها (' + TC.faNum(stage.served) + '/' + TC.faNum(need) + ')';
          TC.Audio.play3d('voice', pos.x, pos.z, 0.5);
          if (stage.served >= need) JM.completeTask();
        }
      },
    };
  }

  function taskGuardPatrol() {
    const site = TC.Prison.site || { x: TC.World.prisonSite.x, z: TC.World.prisonSite.z };
    const pts = [
      { x: site.x - 7, z: site.z - 11 },
      { x: site.x + 6, z: site.z + 8 },
      { x: site.x, z: site.z - 2 },
    ];
    const stage = { idx: 0 };
    return {
      desc: 'گشت داخل زندان — نقطه ۱ از ۳',
      marker: pts[0],
      reward: 240,
      payLabel: 'گشت نگهبانی',
      doneText: 'گشت زندان انجام شد',
      onArrive() {
        stage.idx++;
        if (stage.idx >= 3) { JM.completeTask(); return; }
        JM.task.desc = 'گشت داخل زندان — نقطه ' + TC.faNum(stage.idx + 1) + ' از ۳';
        JM.task.marker = pts[stage.idx];
        JM.marker = { x: pts[stage.idx].x, z: pts[stage.idx].z, label: 'نقطه گشت زندان' };
      },
    };
  }

  function taskWaiter() {
    const shop = TC.World.shops.find(s => s.type === 'shop_rest');
    if (!shop) return null;
    const stage = { served: 0 };
    const need = 3;
    return {
      desc: 'میزهای رستوران را سرویس کنید (۰/۳) — داخل رستوران E بزنید',
      marker: { x: shop.x, z: shop.z, radius: 14 },
      reward: 200,
      payLabel: 'سرویس رستوران',
      doneText: 'سرویس‌دهی تمام شد',
      check(dt, pos) {
        const d = M.dist2(pos.x, pos.z, shop.x, shop.z);
        if (d < 8 && TC.Virtual.interact) {
          TC.Virtual.interact = false;
          stage.served++;
          JM.task.desc = 'سرویس میزها (' + TC.faNum(stage.served) + '/' + TC.faNum(need) + ')';
          TC.Audio.play3d('voice', pos.x, pos.z, 0.4);
          if (stage.served >= need) JM.completeTask();
        }
      },
    };
  }

  function taskTruck() {
    const depot = TC.World.jobOffices.find(o => o.type === 'truck');
    const dest = M.randInt(0, 1) ? { x: TC.World.harbor ? TC.World.harbor.x + 20 : 600, z: TC.World.harbor ? TC.World.harbor.z - 40 : 640 } : { x: TC.World.airport ? TC.World.airport.x + 20 : 800, z: TC.World.airport ? TC.World.airport.z - 50 : -70 };
    const stage = { phase: 'load' };
    return {
      desc: 'در باربری پارس بار را تحویل بگیرید (با کامیون)',
      marker: depot ? { x: depot.x, z: depot.z } : { x: 550, z: 260 },
      reward: 1500,
      payLabel: 'حمل بار سنگین',
      doneText: 'محموله تحویل داده شد',
      onArrive(pos) {
        const veh = TC.ActiveVehicle;
        if (stage.phase === 'load') {
          if (!veh || veh.def.id !== 'truck') {
            TC.ui && TC.ui.notify('برای بارگیری باید با کامیون پارس اینجا باشید', 'warn');
            return;
          }
          stage.phase = 'deliver';
          JM.task.desc = 'محموله را به مقصد برسانید';
          JM.task.marker = dest;
          JM.marker = { x: dest.x, z: dest.z, label: 'مقصد محموله' };
          TC.ui && TC.ui.notify('📦 بارگیری انجام شد — راهی شوید', 'success');
        } else {
          if (!veh) return;
          JM.completeTask();
        }
      },
    };
  }

  function taskFactory() {
    const office = TC.World.jobOffices.find(o => o.type === 'factory');
    const stage = { work: 0 };
    const need = 3;
    return {
      desc: 'پشت دستگاه کارخانه بایستید و E را نگه دارید (۰/۳)',
      marker: office ? { x: office.x, z: office.z - 4, radius: 5 } : { x: 550, z: 60 },
      reward: 180,
      payLabel: 'کار خط تولید',
      doneText: 'نوبت کاری تمام شد',
      check(dt, pos) {
        const m = JM.task.marker;
        const d = M.dist2(pos.x, pos.z, m.x, m.z);
        if (d < 4 && TC.Virtual.interact) {
          TC.Virtual.interact = false;
          stage.work++;
          JM.task.desc = 'کار روی دستگاه (' + TC.faNum(stage.work) + '/' + TC.faNum(need) + ')';
          if (stage.work >= need) JM.completeTask();
        }
      },
    };
  }

  function taskSecurity() {
    const office = TC.World.jobOffices.find(o => o.type === 'security');
    const pts = [
      { x: office.x + 30, z: office.z },
      { x: office.x - 30, z: office.z + 20 },
    ];
    const stage = { idx: 0 };
    return {
      desc: 'گشت امنیتی ویلای شاه‌نشین — نقطه ۱ از ۲',
      marker: pts[0],
      reward: 220,
      payLabel: 'گشت امنیتی',
      doneText: 'گشت امنیتی انجام شد',
      onArrive() {
        stage.idx++;
        if (stage.idx >= 2) { JM.completeTask(); return; }
        JM.task.desc = 'گشت امنیتی — نقطه ۲ از ۲';
        JM.task.marker = pts[1];
        JM.marker = { x: pts[1].x, z: pts[1].z, label: 'نقطه گشت امنیتی' };
      },
    };
  }

  function taskBus() {
    const stops = [];
    for (let i = 0; i < 4; i++) {
      const p = TC.NAV.randomRoadPoint(0, TC.Player.pos.x, TC.Player.pos.z);
      stops.push({ x: p.x, z: p.z });
    }
    const stage = { idx: 0 };
    return {
      desc: 'خط اتوبوس — ایستگاه ۱ از ۴ (با اتوبوس)',
      marker: stops[0],
      reward: 520,
      payLabel: 'خط اتوبوس شهری',
      doneText: 'خط اتوبوس پیموده شد',
      onArrive() {
        const veh = TC.ActiveVehicle;
        if (!veh || veh.def.id !== 'bus') {
          TC.ui && TC.ui.notify('برای خط باید با اتوبوس شهری اینجا باشید', 'warn');
          return;
        }
        stage.idx++;
        if (stage.idx >= 4) { JM.completeTask(); return; }
        JM.task.desc = 'خط اتوبوس — ایستگاه ' + TC.faNum(stage.idx + 1) + ' از ۴';
        JM.task.marker = stops[stage.idx];
        JM.marker = { x: stops[stage.idx].x, z: stops[stage.idx].z, label: 'ایستگاه بعدی' };
        TC.ui && TC.ui.notify('ایستگاه ' + TC.faNum(stage.idx) + ' — مسافرها سوار شدند', 'success');
      },
    };
  }

  JM.serialize = function () { return { inShift: JM.inShift, jobId: JM.jobId, tasksDone: JM.tasksDone }; };
  JM.deserialize = function (d) {
    if (d && d.inShift && d.jobId) {
      JM.inShift = true;
      JM.jobId = d.jobId;
      JM.tasksDone = d.tasksDone || 0;
      JM.tasksGoal = { taxi: 4, ride: 4, courier: 4, carcourier: 3, police: 3, banker: 4, guard: 3, waiter: 3, truck: 2, factory: 3, security: 3, bus: 2 }[d.jobId] || 3;
      JM.nextTask();
    }
  };

  TC.JobMissions = JM;
})();
