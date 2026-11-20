/* ============================================================
 * missions.js — داستان اصلی «طوفان می‌آید»، کات‌سین‌های سینمایی،
 * مأموریت‌های جانبی، مسابقه و مکان‌های مخفی
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  /* ---------- شخصیت‌ها ---------- */
  const CHARS = {
    arash: { name: 'آرش راد' },
    ramin: { name: 'رامین کاویانی', color: '#e8a04d' },
    sahar: { name: 'سحر مهرزاد', color: '#e84da8' },
    samadi: { name: 'آقای صمدی', color: '#35d073' },
    bahrami: { name: 'سرهنگ بهرامی', color: '#4d8dff' },
    nader: { name: 'نادر تیرانداز', color: '#e8433c' },
  };

  /* ---------- داستان: ۸ فصل ---------- */
  const STORY = [
    {
      id: 'ch1', title: 'خوش آمدی به شهر طوفان', reward: 500, giver: 'auto',
      intro: [
        { cam: [[4, 8, -620], [0, 2, -610]], dur: 4.5, speaker: null, text: 'قطار شبانه از کرمان به شهر طوفان رسید. آرش راد، ۲۶ ساله، با یک چمدان و یک رویا پیاده شد…' },
        { cam: [[-4, 3, -605], [10, 2, -600]], dur: 4, speaker: 'arash', text: '«شهر طوفان… یا من تو را می‌سازم، یا تو مرا می‌بلعی.»' },
        { cam: [[8, 6, -590], [-10, 2, -595]], dur: 3.5, speaker: null, text: 'رامین کاویانی، دوست قدیمی پدرش، منتظر اوست — در تعمیرگاه مکانیک حسن.' },
      ],
      steps: [
        { type: 'goto', text: 'به خانه جدیدت در شهرک آفتاب برو', pos: 'home', radius: 12 },
        { type: 'talk', text: 'با رامین در تعمیرگاه صحبت کن', npc: 'ramin',
          dialogue: ['آرش! پسر عموی کوچک بالاخره رسید! این شهر بی‌رحمه، ولی با من می‌تونی زنده بمونی.',
            'اول یه سر به خونه جدیدت بزن، بعد بیا یه شغل پیدا کن. کار تمیز یا کثیف… تصمیم با خودته.'] },
      ],
      outro: [{ cam: null, dur: 3, speaker: 'ramin', text: '«از این به بعد، هرچی بشه، با همشه.»' }],
    },
    {
      id: 'ch2', title: 'پای در راه', reward: 800, giver: 'ramin',
      giverPos: 'repair',
      steps: [
        { type: 'job', text: 'در یکی از دفاتر استخدام شهر کار پیدا کن' },
        { type: 'shift', text: 'یک شیفت کاری را شروع کن و حداقل یک مأموریت انجام بده' },
        { type: 'talk', text: 'نتیجه را به رامین گزارش بده', npc: 'ramin',
          dialogue: ['خودشه! اولین قراردادت رو بستی. تو این شهر کسی که کار کنه، پیاده نمی‌مونه.'] },
      ],
      outro: [{ cam: null, dur: 3, speaker: 'arash', text: '«دنیا با کار سخت ساخته میشه… با کامیون‌ها و آژیرها.»' }],
    },
    {
      id: 'ch3', title: 'چرخ‌های تازه', reward: 1000, giver: 'samadi',
      giverPos: 'dealer_economy',
      steps: [
        { type: 'talk', text: 'با آقای صمدی در نمایشگاه پرشین موتورز صحبت کن', npc: 'samadi',
          dialogue: ['جوانمرد! می‌خوای تو این شهر جا باز کنی، باید چهار چرخ داشته باشی.',
            'نمایشگاه‌های من یا هر نمایشگاه دیگه‌ای که دوست داری… یه خودرو بخر، حتی ارزونش!'] },
        { type: 'buycar', text: 'یک خودرو از هر نمایشگاهی بخر' },
        { type: 'talk', text: 'خبر خواستن خودرو را به رامین بده', npc: 'ramin',
          dialogue: ['عالی شد! حالا یه راننده واقعی شدی. یادت باشه: پلیس اینجا شوخی نداره.'] },
      ],
    },
    {
      id: 'ch4', title: 'دست‌نوشته سحر', reward: 2500, giver: 'sahar',
      giverPos: 'cafe',
      steps: [
        { type: 'talk', text: 'با سحر مهرزاد در کافی‌شاپ دونه صحبت کن', npc: 'sahar',
          dialogue: ['آرش؟ رامین تو رو معرفی کرده. من خبرنگارم و دارم درباره شبکه قاچاق «نادر تیرانداز» تحقیق می‌کنم.',
            'یه بسته مدارک تو انبار بندر شرقی جا گذاشتم. بیاورش، من هم اسم تو را به همه خوبی‌های این شهر می‌دهم.'] },
        { type: 'goto', text: 'به انبار بندر شرقی برو', pos: 'harborWarehouse', radius: 14 },
        { type: 'goto', text: 'مدارک را به سحر برگردان', pos: 'cafe', radius: 10 },
      ],
      outro: [{ cam: null, dur: 3.5, speaker: 'sahar', text: '«این مدارک فقط نوک کوه یخه… خیلی مواظب خودت باش.»' }],
    },
    {
      id: 'ch5', title: 'تعقیب در بزرگراه', reward: 4000, giver: 'ramin',
      giverPos: 'repair',
      steps: [
        { type: 'talk', text: 'رامین خبر فوری دارد — به تعمیرگاه برو', npc: 'ramin',
          dialogue: ['آرش، این لیستی که سحر داغ کرد آبروی نادر رو برد! مرداش دنبالتن. فرار کن!',
            'با ماشینت برو پشت اداره پلیس مرکزی — اونجا امنه. سریع باش!'] },
        { type: 'escape', text: 'با خودرو به اداره پلیس فرار کن (از مأموران نادر در امان باش)', pos: 'police', radius: 16 },
        { type: 'talk', text: 'جریان را به سحر بگو', npc: 'sahar', giverPos2: 'cafe',
          dialogue: ['به منم رسیدن؟ این نشون می‌ده لیست مهمه. یه بار دیگه به سراغ رامین نر… الان می‌دونن اونجا پیدات می‌کنن.'] },
      ],
    },
    {
      id: 'ch6', title: 'شواهد برای سرهنگ', reward: 3000, giver: 'bahrami',
      giverPos: 'police',
      steps: [
        { type: 'talk', text: 'با سرهنگ بهرامی در اداره پلیس صحبت کن', npc: 'bahrami',
          dialogue: ['پس تو همون آرشی هستی که لیست نادر رو به خبرنگار داد؟ اسمت تو پرونده ما بود… ولی به نفع شهر کار کردی.',
            'مدارک سحر رو رسمی کن. برو کافی‌شاپ، مدارک رو بگیر و بیار اینجا.'] },
        { type: 'goto', text: 'مدارک را از سحر در کافی‌شاپ بگیر', pos: 'cafe', radius: 10 },
        { type: 'goto', text: 'مدارک را به اداره پلیس برسان', pos: 'police', radius: 16 },
      ],
      outro: [{ cam: null, dur: 3, speaker: 'bahrami', text: '«شهر طوفان مدیون توئه، پسر. امیدوارم این مسیر رو ادامه بدی.»' }],
    },
    {
      id: 'ch7', title: 'انبار شرقی: شمارش معکوس', reward: 6000, giver: 'sahar',
      giverPos: 'cafe',
      steps: [
        { type: 'talk', text: 'سحر قرار نهایی را می‌گذارد', npc: 'sahar',
          dialogue: ['نادر امشب تو انبار متروکه شرقی محموله بزرگش رو جابه‌جا می‌کنه. آخرین فرصته.',
            'دوتا راه داری: سرهنگ رو خبر کن که با پشتیبانی پلیس بگیری… یا خودت برو، مستقیم و بدون واسطه.'] },
        { type: 'choice', text: 'انتخاب کنید', options: [
          { key: 'police', label: '🚓 خبر دادن به پلیس (راه امن)' },
          { key: 'solo', label: '🔥 رفتن به انبار، تنها (راه پرخطر)' },
        ] },
        { type: 'goto', text: 'به انبار متروکه شرقی برو', pos: 'warehouseE', radius: 16 },
        { type: 'talk', text: 'رو در رویی با نادر تیرانداز', npc: 'nader',
          dialogue: ['پس تو همون آشغالی هستی که همه‌چیزمو به هم ریختی؟',
            'مگه می‌تونی از دست من فرار کنی؟ این انبار قبر توئه!'] },
        { type: 'final', text: 'نادر را پایانی بده (با انتخاب شما پایان داستان مشخص می‌شود)' },
      ],
    },
    {
      id: 'ch8', title: 'پایان‌بندی', reward: 10000, giver: 'auto',
      steps: [
        { type: 'ending', text: 'سرنوشت نادر رقم خورد…' },
      ],
    },
  ];

  /* POS references resolve به مختصات واقعی شهر */
  function resolvePos(key) {
    switch (key) {
      case 'home': return TC.World.playerHome;
      case 'repair': { const p = TC.poiByType('repair')[0]; return p ? { x: p.x, z: p.z } : null; }
      case 'cafe': { const p = TC.poiByType('shop_cafe')[0]; return p ? { x: p.x, z: p.z + 2 } : null; }
      case 'police': { const p = TC.poiByType('police')[0]; return p ? { x: p.x, z: p.z + 4 } : null; }
      case 'harborWarehouse': return TC.World.harbor ? { x: TC.World.harbor.x - 40, z: TC.World.harbor.z - 30 } : null;
      case 'warehouseE': return { x: 770, z: 320 };
      case 'dealer_economy': { const p = TC.poiByType('dealership').find(d => d.dealerType === 'economy'); return p ? { x: p.x, z: p.z } : null; }
      default: return null;
    }
  }

  const Missions = {
    storyIndex: -1,        // -1 = شروع نشده
    stepIndex: 0,
    active: false,
    marker: null,
    talkedNpcs: {},
    choice: null,
    cinemaActive: false,
    cinemaShots: null, cinemaIdx: 0, cinemaT: 0,
    race: null,
    stats: { missionsDone: 0, racesWon: 0, secretsFound: 0, helpedCitizens: 0 },
  };

  /* ---------- شروع بازی: مأموریت اول ---------- */
  Missions.startStory = function () {
    if (Missions.storyIndex >= 0) return;
    Missions.storyIndex = 0;
    Missions.beginCurrent();
  };

  Missions.currentChapter = () => STORY[Missions.storyIndex] || null;

  Missions.beginCurrent = function () {
    const ch = Missions.currentChapter();
    if (!ch) return;
    Missions.active = true;
    Missions.stepIndex = 0;
    TC.ui && TC.ui.notify('📖 فصل جدید: «' + ch.title + '»', 'success');
    if (ch.intro) Missions.playCinema(ch.intro, () => Missions.setupStep());
    else Missions.setupStep();
    TC.bus.emit('story:chapter', ch.id);
  };

  /* ---------- تنظیم مرحله جاری ---------- */
  Missions.setupStep = function () {
    const ch = Missions.currentChapter();
    if (!ch) return;
    const step = ch.steps[Missions.stepIndex];
    if (!step) { Missions.completeChapter(); return; }
    Missions.marker = null;
    Missions._stepInteract = null;
    if (step.pos) {
      const p = resolvePos(step.pos);
      if (p) Missions.marker = { x: p.x, z: p.z, label: step.text, radius: step.radius || 10 };
    } else if (step.type === 'talk') {
      // giver POS از giverPos یا giverPos2
      const key = step.giverPos2 || (Missions.stepIndex === 0 ? ch.giverPos : null) || 'repair';
      const p = resolvePos(key);
      if (p) Missions.marker = { x: p.x, z: p.z, label: step.text, radius: step.radius || 6 };
    } else if (step.type === 'job') {
      Missions.marker = null; // هر دفتر استخدام
    } else if (step.type === 'choice') {
      TC.ui && TC.ui.choice('«انبار شرقی» — انتخاب آرش', step.options.map(o => ({
        label: o.label,
        value: o.key,
      })), (v) => { Missions.choice = v; TC.ui.notify('انتخاب شما ثبت شد — سرنوشت تغییر می‌کند', 'warn'); Missions.advanceStep(); });
      return;
    }
    TC.bus.emit('story:step', { chapter: ch.id, step: Missions.stepIndex });
  };

  Missions.advanceStep = function () {
    const ch = Missions.currentChapter();
    Missions.stepIndex++;
    if (Missions.stepIndex >= ch.steps.length) {
      Missions.completeChapter();
    } else {
      Missions.setupStep();
    }
  };

  Missions.completeChapter = function () {
    const ch = Missions.currentChapter();
    Missions.active = false;
    Missions.marker = null;
    TC.Economy && TC.Economy.earn(ch.reward, 'پاداش فصل «' + ch.title + '»');
    Missions.stats.missionsDone++;
    const finish = () => {
      if (Missions.storyIndex >= STORY.length - 1) {
        // پایان داستان
        const ending = Missions.choice === 'solo'
          ? 'پایان «اسطوره خیابان‌ها»: نادر با دست‌های خالی شکست خورد و شهر طوفان، آرش را پادشاه غیررسمی خیابان‌ها دانست.'
          : 'پایان «قهرمان شهر»: نادر با پشتیبانی پلیس دستگیر شد و آرش راد به قهرمان مدال‌آور شهر تبدیل شد.';
        TC.ui && TC.ui.bigMessage('🎬 ' + ending, 'پایان داستان اصلی — مأموریت‌های آزاد و فعالیت‌های شهر ادامه دارند!');
      } else {
        TC.ui && TC.ui.notify('✅ فصل کامل شد — فصل بعدی به‌زودی در نقشه مشخص می‌شود', 'success');
      }
      Missions.storyIndex++;
      TC.bus.emit('story:progress', Missions.storyIndex);
      if (Missions.currentChapter() && Missions.currentChapter().giver !== 'auto') {
        setTimeout(() => { TC.ui && TC.ui.notify('📖 مأموریت جدید فعال شد: «' + Missions.currentChapter().title + '»', 'info'); Missions.beginCurrent(); }, 5000);
      } else if (Missions.currentChapter()) {
        Missions.beginCurrent();
      }
    };
    if (ch.outro) Missions.playCinema(ch.outro, finish);
    else finish();
  };

  /* ---------- به‌روزرسانی مرحله ---------- */
  Missions.update = function (dt) {
    if (!Missions.active) {
      Missions.updateRace(dt);
      return;
    }
    const ch = Missions.currentChapter();
    const step = ch.steps[Missions.stepIndex];
    const pos = TC.ActiveVehicle ? TC.ActiveVehicle.pos : TC.Player.pos;
    switch (step.type) {
      case 'goto': {
        const p = resolvePos(step.pos);
        if (p && M.dist2(pos.x, pos.z, p.x, p.z) < (step.radius || 10)) {
          if (step.type === 'goto' && step.text.includes('برگردان') || step.text.includes('برگردان')) { /* nothing */ }
          Missions.advanceStep();
        }
        break;
      }
      case 'talk': {
        // با تعامل نزدیک giver
        const key = step.giverPos2 || (Missions.stepIndex === 0 ? ch.giverPos : null) || 'repair';
        const p = resolvePos(key);
        if (p) {
          Missions.marker = Missions.marker || { x: p.x, z: p.z, label: step.text, radius: 6 };
          if (!Missions._stepInteract) {
            Missions._stepInteract = TC.addInteract({
              x: p.x, z: p.z, radius: 6,
              text: 'صحبت با ' + CHARS[step.npc].name,
              enabled: () => Missions.active && ch.steps[Missions.stepIndex] === step,
              action: () => {
                Missions.talkedNpcs[step.npc] = true;
                TC.ui.dialogue(CHARS[step.npc].name, step.dialogue.join('\n'), [
                  { label: 'درک کردم', action: () => Missions.advanceStep() },
                ]);
              },
            });
          }
        }
        break;
      }
      case 'job': {
        if (TC.Jobs.active) Missions.advanceStep();
        break;
      }
      case 'shift': {
        if (TC.JobMissions.tasksDone > 0) Missions.advanceStep();
        break;
      }
      case 'buycar': {
        if (TC.Vehicles.playerGarage.length > 0) Missions.advanceStep();
        break;
      }
      case 'escape': {
        const p = resolvePos(step.pos);
        if (p && M.dist2(pos.x, pos.z, p.x, p.z) < step.radius) {
          Missions.advanceStep();
        } else if (Math.random() < 0.008 && !Missions._naderSpawned) {
          // مأموران نادر: خودروی سیاه تعقیب می‌کند
          Missions._naderSpawned = true;
          const sp = TC.NAV.randomRoadPoint(30, pos.x, pos.z);
          const v = TC.Vehicles.spawn('sport1', sp.x, sp.z, { color: '#15161a', ai: { kind: 'nader', lane: 4.2 } });
          v.ai.update = (vv, d2) => {
            const t = pos;
            const diff = M.angleDiff(vv.yaw, Math.atan2(t.x - vv.pos.x, t.z - vv.pos.z));
            return { throttle: 1, steer: M.clamp(diff * 2, -1, 1), brake: false };
          };
          TC.ui && TC.ui.notify('🚗 مأموران نادر به سمت شما می‌آیند — فرار کن!', 'error');
          setTimeout(() => { TC.Vehicles.remove(v); Missions._naderSpawned = false; }, 30000);
        }
        break;
      }
      case 'final': {
        // پایان بر اساس انتخاب
        if (Missions.choice === 'police') {
          TC.Police && TC.Police.reportCrime('robbery', pos.x, pos.z, -1); // -1: فقط گزارش محیطی
          TC.ui && TC.ui.bigMessage('🚓 با پشتیبانی پلیس، انبار محاصره شد و نادر تسلیم شد.', 'عملیات موفق');
        } else {
          TC.ui && TC.ui.bigMessage('🔥 پس از درگیری سخت در انبار، نادر تیرانداز شکست خورد و فرار کرد.', 'پیروزی شخصی');
        }
        Missions.advanceStep();
        break;
      }
      case 'ending': {
        Missions.advanceStep();
        break;
      }
    }
    Missions.updateRace(dt);
  };

  /* ---------- کات‌سین ---------- */
  Missions.playCinema = function (shots, onDone) {
    Missions.cinemaActive = true;
    Missions.cinemaShots = shots;
    Missions.cinemaIdx = 0;
    Missions.cinemaT = 0;
    Missions.cinemaDone = onDone;
    Missions.cinemaStartCam = null;
    TC.G.state = 'cutscene';
    const el = document.getElementById('cutsceneUI');
    if (el) el.style.display = 'block';
    document.getElementById('hud').classList.add('cinema');
  };

  Missions.updateCinema = function (dt) {
    if (!Missions.cinemaActive) return;
    const shot = Missions.cinemaShots[Missions.cinemaIdx];
    if (!shot) return Missions.endCinema();
    Missions.cinemaT += dt;
    const cam = TC.Engine.camera;
    const t = M.clamp(Missions.cinemaT / shot.dur, 0, 1);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOut
    if (shot.cam) {
      const from = new BABYLON.Vector3(shot.cam[0][0], shot.cam[0][1], shot.cam[0][2]);
      const to = new BABYLON.Vector3(shot.cam[1][0], shot.cam[1][1], shot.cam[1][2]);
      // حول بازیکن مرکز شود
      const base = TC.Player ? TC.Player.pos : new BABYLON.Vector3(0, 0, -600);
      const p1 = from.add(base), p2 = to.add(base);
      const cur = BABYLON.Vector3.Lerp(p1, p2, e);
      if (!Missions.cinemaStartCam) cam.position.copyFrom(cur);
      else cam.position = BABYLON.Vector3.Lerp(cam.position, cur, 1 - Math.exp(-4 * dt));
      Missions.cinemaStartCam = true;
      const target = new BABYLON.Vector3(shot.cam[1][0] + base.x, shot.cam[1][1] + base.y - 1.5, shot.cam[1][2] + base.z);
      cam.setTarget(target);
    } else {
      // نمای سوم‌شخص آرام حول بازیکن
      const ang = Missions.cinemaT * 0.5;
      const r = 5;
      const base = TC.Player ? TC.Player.pos : new BABYLON.Vector3(0, 0, 0);
      cam.position = BABYLON.Vector3.Lerp(cam.position, new BABYLON.Vector3(base.x + Math.sin(ang) * r, base.y + 2.2, base.z + Math.cos(ang) * r), 1 - Math.exp(-3 * dt));
      cam.setTarget(new BABYLON.Vector3(base.x, base.y + 1.4, base.z));
    }
    // زیرنویس
    const sub = document.getElementById('csSubtitle');
    if (sub) {
      const speaker = shot.speaker ? CHARS[shot.speaker].name + ': ' : '';
      sub.textContent = speaker + (shot.text || '');
    }
    if (Missions.cinemaT >= shot.dur) {
      Missions.cinemaIdx++;
      Missions.cinemaT = 0;
      Missions.cinemaStartCam = null;
      if (Missions.cinemaIdx >= Missions.cinemaShots.length) Missions.endCinema();
    }
  };

  Missions.endCinema = function () {
    Missions.cinemaActive = false;
    TC.G.state = 'playing';
    const el = document.getElementById('cutsceneUI');
    if (el) el.style.display = 'none';
    document.getElementById('hud').classList.remove('cinema');
    const sub = document.getElementById('csSubtitle');
    if (sub) sub.textContent = '';
    const done = Missions.cinemaDone;
    Missions.cinemaDone = null;
    if (done) done();
  };
  Missions.skipCinema = function () {
    if (Missions.cinemaActive) Missions.endCinema();
  };

  /* ---------- مأموریت‌های آزاد: مسابقه ---------- */
  Missions.initSide = function () {
    // مسابقه خیابانی
    const race = TC.poiByType('race')[0];
    if (race) {
      TC.addInteract({
        x: race.x, z: race.z, radius: 8,
        text: 'شروع مسابقه خیابانی (۵ ایستگاه)',
        action: () => Missions.startRace(),
      });
    }
    // صندوق‌های مخفی
    for (const poi of TC.poiByType('secret')) {
      TC.addInteract({
        x: poi.x, z: poi.z, radius: 4,
        text: 'جست‌وجوی مکان مخفی',
        enabled: () => !poi.found,
        action: () => {
          poi.found = true;
          TC.Economy.earn(poi.reward || 2000, 'کشف مکان مخفی — ' + poi.name);
          Missions.stats.secretsFound++;
          TC.ui && TC.ui.bigMessage('💎 ' + poi.name + ' کشف شد!', '+' + TC.moneyFmt(poi.reward || 2000) + ' تومان جایزه');
        },
      });
    }
  };

  Missions.startRace = function () {
    if (Missions.race) { TC.ui.notify('مسابقه فعال است!', 'warn'); return; }
    const cp = [];
    for (let i = 0; i < 5; i++) {
      const p = TC.NAV.randomRoadPoint(0, TC.Player.pos.x, TC.Player.pos.z);
      cp.push({ x: p.x, z: p.z });
    }
    Missions.race = { cp, idx: 0, time: 0, target: 90 };
    TC.ui && TC.ui.notify('🏁 مسابقه شروع شد! ۵ ایستگاه در ' + TC.faNum(Missions.race.target) + ' ثانیه', 'info');
  };

  Missions.updateRace = function (dt) {
    const r = Missions.race;
    if (!r) return;
    r.time += dt;
    const pos = TC.ActiveVehicle ? TC.ActiveVehicle.pos : TC.Player.pos;
    Missions.marker = { x: r.cp[r.idx].x, z: r.cp[r.idx].z, label: 'ایستگاه ' + TC.faNum(r.idx + 1) + '/۵ — ' + Math.round(r.time) + 's', radius: 10 };
    if (M.dist2(pos.x, pos.z, r.cp[r.idx].x, r.cp[r.idx].z) < 10) {
      r.idx++;
      TC.Audio.jingle('click');
      if (r.idx >= r.cp.length) {
        const won = r.time <= r.target;
        const reward = won ? 1200 : 400;
        TC.Economy.earn(reward, won ? 'برد مسابقه خیابانی' : 'پایان مسابقه');
        if (won) Missions.stats.racesWon++;
        TC.ui && TC.ui.bigMessage(won ? '🏆 برنده شدید!' : '🏁 مسابقه تمام شد', 'زمان: ' + Math.round(r.time) + ' ثانیه — +' + TC.moneyFmt(reward) + ' تومان');
        Missions.race = null;
        Missions.marker = null;
      } else {
        TC.ui && TC.ui.notify('ایستگاه ' + TC.faNum(r.idx) + '/۵ پیموده شد', 'success');
      }
    }
  };

  Missions.onNpcDeath = function () {
    // رویداد برای داستان در آینده
  };

  /* ---------- ذخیره ---------- */
  Missions.serialize = function () {
    return {
      storyIndex: Missions.storyIndex, stepIndex: Missions.stepIndex,
      choice: Missions.choice, stats: Missions.stats,
      secrets: TC.poiByType('secret').map(p => p.found),
    };
  };
  Missions.deserialize = function (d) {
    if (!d) return;
    Missions.storyIndex = d.storyIndex !== undefined ? d.storyIndex : -1;
    Missions.stepIndex = d.stepIndex || 0;
    Missions.choice = d.choice || null;
    Missions.stats = Object.assign(Missions.stats, d.stats || {});
    if (d.secrets) {
      const secrets = TC.poiByType('secret');
      d.secrets.forEach((f, i) => { if (secrets[i]) secrets[i].found = f; });
    }
    if (Missions.storyIndex >= 0 && Missions.storyIndex < STORY.length) {
      Missions.active = true;
      Missions.setupStep();
    }
  };

  TC.Missions = Missions;
  TC.STORY_CHARS = CHARS;
})();
