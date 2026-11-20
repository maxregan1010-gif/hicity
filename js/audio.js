/* ============================================================
 * audio.js — سیستم صدای سه‌بعدی رویه‌ای با WebAudio (بدون فایل خارجی)
 * صداهای موتور، ترمز، بوق، آژیر، باران، محیط، پرنده، موسیقی و…
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Audio2 = {
    ctx: null, ready: false,
    master: null, sfx: null, amb: null, music: null,
    noiseBuf: null,
    engineNodes: null, skidNode: null, sirenNodes: null, rainNodes: null, ambNodes: null,
    musicNodes: null, musicTimer: null,
    hornNodes: null,
  };

  /* ---------- راه‌اندازی (نیازمند تعامل کاربر) ---------- */
  Audio2.init = function () {
    if (Audio2.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('WebAudio پشتیبانی نمی‌شود'); return; }
    const ctx = new AC();
    Audio2.ctx = ctx;
    Audio2.master = ctx.createGain();
    Audio2.master.connect(ctx.destination);
    Audio2.sfx = ctx.createGain();
    Audio2.amb = ctx.createGain();
    Audio2.music = ctx.createGain();
    Audio2.sfx.connect(Audio2.master);
    Audio2.amb.connect(Audio2.master);
    Audio2.music.connect(Audio2.master);
    // بافر نویز سفید ۲ ثانیه‌ای
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    Audio2.noiseBuf = buf;
    Audio2.ready = true;
    Audio2.applyVolumes();
    Audio2.startAmbience();
    if (ctx.state === 'suspended') ctx.resume();
  };

  Audio2.applyVolumes = function () {
    if (!Audio2.ready) return;
    const s = TC.Settings.data;
    Audio2.master.gain.value = s.masterVol;
    Audio2.sfx.gain.value = s.sfxVol;
    Audio2.amb.gain.value = s.ambientVol;
    Audio2.music.gain.value = s.musicVol * 0.6;
  };
  TC.bus.on('settings:audio', () => Audio2.applyVolumes());

  /* ---------- ابزارهای پایه ---------- */
  function noiseSource(loop) {
    const ctx = Audio2.ctx;
    const src = ctx.createBufferSource();
    src.buffer = Audio2.noiseBuf;
    src.loop = !!loop;
    return src;
  }
  // پن و گین سه‌بعدی نسبت به دوربین
  Audio2.panFor = function (x, z, maxDist) {
    maxDist = maxDist || 90;
    if (!TC.G.started || !TC.Engine.camera) return { pan: 0, gain: 1 };
    const cam = TC.Engine.camera.position;
    const d = M.dist2(cam.x, cam.z, x, z);
    if (d > maxDist) return null;
    // زاویه نسبی
    const fw = TC.Engine.camera.getDirection(BABYLON.Axis.Z);
    const rt = TC.Engine.camera.getDirection(BABYLON.Axis.X);
    let dx = x - cam.x, dz = z - cam.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const pan = M.clamp(dx * rt.x + dz * rt.z, -1, 1);
    const gain = Math.max(0, 1 - d / maxDist) ** 1.6;
    return { pan, gain };
  };

  /* پخش یک‌باره موقعیتی */
  Audio2.play3d = function (kind, x, z, vol) {
    if (!Audio2.ready) return;
    const p = Audio2.panFor(x, z);
    if (!p) return;
    const g = (vol || 1) * p.gain;
    if (g < 0.02) return;
    switch (kind) {
      case 'crash': Audio2._crashOneShot(g, p.pan); break;
      case 'footstep': Audio2._footOneShot(g, p.pan); break;
      case 'honk': Audio2._honkOneShot(g, p.pan); break;
      case 'voice': Audio2._voiceOneShot(g, p.pan); break;
      case 'shoot': Audio2._shootOneShot(g * 1.2, p.pan); break;
      case 'door': Audio2._doorOneShot(g, p.pan); break;
    }
  };

  Audio2._crashOneShot = function (g, pan) {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const src = noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(400 + g * 900, t);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(Math.min(1, g) * 0.9, t);
    gn.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    src.connect(f); f.connect(gn); gn.connect(panner); panner.connect(Audio2.sfx);
    src.start(t); src.stop(t + 0.45);
    // تامپ بم
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(g * 0.7, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g2); g2.connect(panner); o.start(t); o.stop(t + 0.32);
  };
  Audio2._footOneShot = function (g, pan) {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const src = noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300 + Math.random() * 250; f.Q.value = 1.2;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(g * 0.16, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    src.connect(f); f.connect(gn); gn.connect(panner); panner.connect(Audio2.sfx);
    src.start(t); src.stop(t + 0.1);
  };
  Audio2._honkOneShot = function (g, pan, dur) {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const d = dur || 0.35;
    const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 392;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 494;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(g * 0.12, t); gn.gain.setValueAtTime(g * 0.12, t + d - 0.05); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    o1.connect(f); o2.connect(f); f.connect(gn); gn.connect(panner); panner.connect(Audio2.sfx);
    o1.start(t); o2.start(t); o1.stop(t + d); o2.stop(t + d);
  };
  Audio2._voiceOneShot = function (g, pan) {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const base = 140 + Math.random() * 120;
    o.frequency.setValueAtTime(base, t);
    for (let i = 0; i < 3; i++) {
      o.frequency.linearRampToValueAtTime(base * (0.8 + Math.random() * 0.5), t + 0.06 * (i + 1));
    }
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 2;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(g * 0.05, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    o.connect(f); f.connect(gn); gn.connect(panner); panner.connect(Audio2.sfx);
    o.start(t); o.stop(t + 0.26);
  };
  Audio2._shootOneShot = function (g, pan) {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const src = noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(Math.min(1, g), t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    src.connect(f); f.connect(gn); gn.connect(panner); panner.connect(Audio2.sfx);
    src.start(t); src.stop(t + 0.18);
    const o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(g * 0.4, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g2); g2.connect(panner); o.start(t); o.stop(t + 0.13);
  };
  Audio2._doorOneShot = function (g, pan) {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const src = noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 3;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(g * 0.3, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    const panner = ctx.createStereoPanner(); panner.pan.value = pan;
    src.connect(f); f.connect(gn); gn.connect(panner); panner.connect(Audio2.sfx);
    src.start(t); src.stop(t + 0.16);
  };

  /* ---------- قدم بازیکن ---------- */
  Audio2.footstep = function (running) {
    Audio2._footOneShot(running ? 1.4 : 0.9, 0);
  };

  /* ---------- موتور خودرو ---------- */
  Audio2.engineStart = function (kind) {
    if (!Audio2.ready) return;
    Audio2.engineStop();
    const ctx = Audio2.ctx;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square';
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 1;
    const g = ctx.createGain(); g.gain.value = 0.0;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o1.frequency.value = 55; o2.frequency.value = 111;
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(Audio2.sfx);
    o1.start(); o2.start();
    Audio2.engineNodes = { o1, o2, f, g, g2, kind: kind || 'car' };
    // استارت‌آپ
    g.gain.setTargetAtTime(0.12, ctx.currentTime, 0.2);
  };
  Audio2.engineUpdate = function (rpm01, load) {
    const n = Audio2.engineNodes;
    if (!n || !Audio2.ready) return;
    const t = Audio2.ctx.currentTime;
    const kind = n.kind;
    const base = kind === 'motorcycle' ? 70 : kind === 'truck' ? 40 : kind === 'boat' ? 45 : 50;
    const f0 = base + rpm01 * (kind === 'motorcycle' ? 340 : kind === 'truck' ? 130 : 210);
    n.o1.frequency.setTargetAtTime(f0, t, 0.06);
    n.o2.frequency.setTargetAtTime(f0 * 2.02, t, 0.06);
    n.f.frequency.setTargetAtTime(400 + rpm01 * 2200, t, 0.08);
    n.g.gain.setTargetAtTime(0.05 + rpm01 * 0.11 + load * 0.05, t, 0.1);
    // لرزش
    n.o1.detune.setTargetAtTime(Math.sin(t * 35) * (8 + rpm01 * 14), t, 0.05);
  };
  Audio2.engineStop = function () {
    const n = Audio2.engineNodes;
    if (!n) return;
    try { n.o1.stop(); n.o2.stop(); } catch (e) { /* ignore */ }
    Audio2.engineNodes = null;
  };

  /* ---------- ترمز/سوختن لاستیک ---------- */
  Audio2.skid = function (on, intensity) {
    if (!Audio2.ready) return;
    if (on && !Audio2.skidNode) {
      const ctx = Audio2.ctx;
      const src = noiseSource(true);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(Audio2.sfx);
      src.start();
      Audio2.skidNode = { src, f, g };
    }
    if (Audio2.skidNode) {
      const t = Audio2.ctx.currentTime;
      if (on) {
        Audio2.skidNode.g.gain.setTargetAtTime(0.05 + 0.1 * (intensity || 1), t, 0.05);
        Audio2.skidNode.f.frequency.setTargetAtTime(900 + (intensity || 1) * 500, t, 0.1);
      } else {
        Audio2.skidNode.g.gain.setTargetAtTime(0, t, 0.08);
        const n = Audio2.skidNode;
        setTimeout(() => { try { n.src.stop(); } catch (e) { } Audio2.skidNode = null; }, 350);
      }
    }
  };

  /* ---------- بوق بازیکن ---------- */
  Audio2.horn = function (on) {
    if (!Audio2.ready) return;
    if (on && !Audio2.hornNodes) {
      const ctx = Audio2.ctx, t = ctx.currentTime;
      const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 392;
      const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 494;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const g = ctx.createGain(); g.gain.value = 0.1;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(Audio2.sfx);
      o1.start(); o2.start();
      Audio2.hornNodes = { o1, o2, g };
    } else if (!on && Audio2.hornNodes) {
      const n = Audio2.hornNodes;
      try { n.o1.stop(); n.o2.stop(); } catch (e) { }
      Audio2.hornNodes = null;
    }
  };
  Audio2._honkOneShot = Audio2._honkOneShot; // بالا تعریف شد

  /* ---------- آژیر پلیس ---------- */
  Audio2.siren = function (on, intensity) {
    if (!Audio2.ready) return;
    if (on && !Audio2.sirenNodes) {
      const ctx = Audio2.ctx, t = ctx.currentTime;
      const o = ctx.createOscillator(); o.type = 'triangle';
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.55;
      const lfoG = ctx.createGain(); lfoG.gain.value = 210;
      o.frequency.value = 720;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1;
      o.connect(f); f.connect(g); g.connect(Audio2.sfx);
      o.start(); lfo.start();
      Audio2.sirenNodes = { o, g, lfo };
    }
    if (Audio2.sirenNodes) {
      const t = Audio2.ctx.currentTime;
      if (on) Audio2.sirenNodes.g.gain.setTargetAtTime(0.035 + 0.04 * (intensity || 1), t, 0.3);
      else {
        const n = Audio2.sirenNodes;
        n.g.gain.setTargetAtTime(0, t, 0.4);
        setTimeout(() => { try { n.o.stop(); n.lfo.stop(); } catch (e) { } Audio2.sirenNodes = null; }, 1200);
      }
    }
  };

  /* ---------- باران ---------- */
  Audio2.rain = function (intensity) {
    if (!Audio2.ready) return;
    if (intensity > 0 && !Audio2.rainNodes) {
      const ctx = Audio2.ctx;
      const src = noiseSource(true);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(Audio2.amb);
      src.start();
      Audio2.rainNodes = { src, g };
    }
    if (Audio2.rainNodes) {
      const t = Audio2.ctx.currentTime;
      if (intensity > 0) Audio2.rainNodes.g.gain.setTargetAtTime(0.06 * intensity, t, 0.8);
      else {
        const n = Audio2.rainNodes;
        n.g.gain.setTargetAtTime(0, t, 1.2);
        setTimeout(() => { try { n.src.stop(); } catch (e) { } Audio2.rainNodes = null; }, 3000);
      }
    }
  };

  /* ---------- رعد و برق ---------- */
  Audio2.thunder = function () {
    if (!Audio2.ready) return;
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const src = noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(70, t + 2.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    src.connect(f); f.connect(g); g.connect(Audio2.amb);
    src.start(t); src.stop(t + 2.6);
  };

  /* ---------- محیط شهر و پرنده‌ها ---------- */
  Audio2.startAmbience = function () {
    const ctx = Audio2.ctx;
    const src = noiseSource(true);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 0.03;
    src.connect(f); f.connect(g); g.connect(Audio2.amb);
    src.start();
    Audio2.ambNodes = { src, g };
    // پرنده‌ها در روز
    Audio2._birdTimer = setInterval(() => {
      if (!TC.G.started || TC.G.paused) return;
      const h = TC.G.time / 3600;
      const isDay = h > 5.5 && h < 19.5;
      const w = TC.Weather ? TC.Weather.state : 'sunny';
      if (isDay && (w === 'sunny' || w === 'cloudy') && Math.random() < 0.5) Audio2.birdChirp();
    }, 4000);
    // ماشین‌های دور/صدای شهر
    Audio2._cityTimer = setInterval(() => {
      if (!TC.G.started || TC.G.paused || !TC.Player) return;
      if (Math.random() < 0.3) {
        const ang = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 60;
        Audio2._honkOneShot(0.3 + Math.random() * 0.3, Math.sin(ang), 0.2 + Math.random() * 0.3);
      }
    }, 7000);
  };
  Audio2.birdChirp = function () {
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8;
    const n = 3 + Math.floor(Math.random() * 3);
    let tt = t;
    for (let i = 0; i < n; i++) {
      const f = 2200 + Math.random() * 1800;
      o.frequency.setValueAtTime(f, tt);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, tt + 0.06);
      tt += 0.09;
    }
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.03);
    g.gain.setValueAtTime(0.03, tt - 0.06);
    g.gain.linearRampToValueAtTime(0.0, tt);
    o.connect(g); g.connect(pan); pan.connect(Audio2.amb);
    o.start(t); o.stop(tt + 0.05);
  };

  /* ---------- موسیقی مولد ---------- */
  const CHORDS_DAY = [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 311]];
  const CHORDS_NIGHT = [[165, 196, 247], [147, 175, 220], [131, 165, 196], [155, 196, 233]];
  Audio2.updateMusic = function () {
    if (!Audio2.ready || Audio2.musicNodes) return;
    const ctx = Audio2.ctx;
    const nodes = { osc: [] };
    Audio2.musicNodes = nodes;
    let chordIdx = 0;
    function playChord() {
      if (!Audio2.musicNodes) return;
      const night = (TC.G.time / 3600) < 6 || (TC.G.time / 3600) > 19.5;
      const chase = TC.Police && TC.Police.wanted > 0;
      const chords = chase ? [[110, 131, 165], [104, 123, 156]] : (night ? CHORDS_NIGHT : CHORDS_DAY);
      const chord = chords[chordIdx % chords.length];
      chordIdx++;
      const t = ctx.currentTime;
      chord.forEach((fr, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr / 2;
        const g = ctx.createGain();
        const dur = chase ? 1.6 : 5.5;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(chase ? 0.06 : 0.045, t + 1.2);
        g.gain.linearRampToValueAtTime(0.0, t + dur);
        o.connect(g); g.connect(Audio2.music);
        o.start(t); o.stop(t + dur + 0.1);
        nodes.osc.push(o);
      });
      // ضرب در حالت تعقیب
      if (chase) {
        for (let b = 0; b < 4; b++) {
          const o2 = ctx.createOscillator(); o2.type = 'sine';
          o2.frequency.setValueAtTime(110, t + b * 0.4);
          o2.frequency.exponentialRampToValueAtTime(55, t + b * 0.4 + 0.18);
          const g2 = ctx.createGain();
          g2.gain.setValueAtTime(0.12, t + b * 0.4);
          g2.gain.exponentialRampToValueAtTime(0.001, t + b * 0.4 + 0.2);
          o2.connect(g2); g2.connect(Audio2.music);
          o2.start(t + b * 0.4); o2.stop(t + b * 0.4 + 0.22);
        }
      }
    }
    playChord();
    Audio2.musicTimer = setInterval(playChord, 5500);
  };
  Audio2.stopMusic = function () {
    if (Audio2.musicTimer) { clearInterval(Audio2.musicTimer); Audio2.musicTimer = null; }
    if (Audio2.musicNodes) { Audio2.musicNodes.osc.forEach(o => { try { o.stop(); } catch (e) { } }); Audio2.musicNodes = null; }
  };
  Audio2.refreshMusic = function () {
    // اگر وضعیت (شب/تعقیب) عوض شد موسیقی نو شود
    const key = (TC.Police ? TC.Police.wanted : 0) > 0 ? 'chase' : ((TC.G.time / 3600) < 6 || (TC.G.time / 3600) > 19.5) ? 'night' : 'day';
    if (Audio2._musicKey !== key) {
      Audio2._musicKey = key;
      Audio2.stopMusic();
      Audio2.updateMusic();
    }
  };

  /* ---------- جینگل و رابط ---------- */
  Audio2.jingle = function (type) {
    if (!Audio2.ready) return;
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const seqs = {
      complete: [523, 659, 784, 1046],
      money: [784, 988],
      wanted: [440, 415, 392],
      fail: [392, 330, 262],
      click: null,
    };
    if (type === 'click') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1200;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(g); g.connect(Audio2.sfx); o.start(t); o.stop(t + 0.06);
      return;
    }
    const seq = seqs[type] || seqs.money;
    seq.forEach((fr, i) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
      const g = ctx.createGain();
      const tt = t + i * 0.12;
      g.gain.setValueAtTime(0.001, tt);
      g.gain.exponentialRampToValueAtTime(0.09, tt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.3);
      o.connect(g); g.connect(Audio2.sfx);
      o.start(tt); o.stop(tt + 0.32);
    });
  };
  Audio2.deny = function () {
    if (!Audio2.ready) return;
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 180;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(Audio2.sfx); o.start(t); o.stop(t + 0.23);
  };
  Audio2.radio = function () {
    if (!Audio2.ready) return;
    const ctx = Audio2.ctx, t = ctx.currentTime;
    const src = noiseSource(false);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(f); f.connect(g); g.connect(Audio2.sfx); src.start(t); src.stop(t + 0.22);
    Audio2._voiceOneShot(0.8, Math.random() * 0.6 - 0.3);
  };
  Audio2.phoneRing = function () {
    if (!Audio2.ready) return;
    const ctx = Audio2.ctx, t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
      const g = ctx.createGain();
      const tt = t + i * 0.4;
      g.gain.setValueAtTime(0.001, tt);
      g.gain.linearRampToValueAtTime(0.05, tt + 0.03);
      g.gain.setValueAtTime(0.05, tt + 0.25);
      g.gain.linearRampToValueAtTime(0.001, tt + 0.3);
      o.connect(g); g.connect(Audio2.sfx);
      o.start(tt); o.stop(tt + 0.32);
    }
  };

  /* ---------- به‌روزرسانی وضعیت کلی ---------- */
  Audio2.update = function (dt) {
    if (!Audio2.ready || !TC.G.started) return;
    const w = TC.Weather;
    // باران
    const rainI = w && (w.state === 'rain' ? 0.8 : w.state === 'storm' ? 1 : 0);
    Audio2.rain(rainI);
    Audio2.refreshMusic();
  };

  TC.Audio = Audio2;
})();
