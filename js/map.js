/* ============================================================
 * map.js — نقشه کوچک چرخشی و نقشه بزرگ با مقصد و مسیر GPS
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  const Map = {
    worldMin: -1250, worldMax: 1250,
    base: null,        // offscreen city texture
    bigView: { zoom: 0.75, panX: 0, panY: 0 },
  };

  Map.scale = function (size) { return size / (Map.worldMax - Map.worldMin); };
  Map.toCanvasX = (x, size) => (x - Map.worldMin) * Map.scale(size);
  Map.toCanvasY = (z, size) => (z - Map.worldMin) * Map.scale(size);

  /* ---------- رندر پایه شهر (یک‌بار) ---------- */
  Map.buildBase = function (size) {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    // زمین
    ctx.fillStyle = '#3f5a33';
    ctx.fillRect(0, 0, size, size);
    // دریا
    const sc = Map.scale(size);
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(0, Map.toCanvasY(-200, size), size, size);
    ctx.fillRect(0, 0, Map.toCanvasX(-560, size), size);
    ctx.fillStyle = '#dcc58a'; // ساحل
    ctx.fillRect(Map.toCanvasX(-712, size), 0, 130 * sc, size);
    ctx.fillRect(0, Map.toCanvasY(690, size), size, 130 * sc);
    // مناطق شهری رنگ ملایم
    const N = C.cityBlocks, half = (N * C.blockPitch) / 2;
    for (let bx = 0; bx < N; bx++) for (let bz = 0; bz < N; bz++) {
      const d = TC.districtAt(bx, bz);
      if (!d || d === 'park') continue;
      const c = TC.blockCenter(bx, bz);
      ctx.fillStyle = TC.DISTRICTS[d].color + '66';
      const bs = (C.blockPitch - 2 * C.roadHalf) * sc;
      ctx.fillRect(Map.toCanvasX(c.x, size) - bs / 2, Map.toCanvasY(c.z, size) - bs / 2, bs, bs);
    }
    // پارک
    ctx.fillStyle = '#69d86988';
    for (const pk of [TC.blockCenter(2, 1), TC.blockCenter(3, 2)]) {
      const bs = 48 * sc;
      ctx.fillRect(Map.toCanvasX(pk.x, size) - bs / 2, Map.toCanvasY(pk.z, size) - bs / 2, bs, bs);
    }
    // جاده‌ها
    ctx.strokeStyle = '#4a4e56';
    ctx.lineWidth = Math.max(2, 22 * sc);
    for (const ek in TC.NAV.edgeSet) {
      const [i, j] = ek.split('_').map(Number);
      const a = TC.NAV.nodes[i], b = TC.NAV.nodes[j];
      ctx.beginPath();
      ctx.moveTo(Map.toCanvasX(a.x, size), Map.toCanvasY(a.z, size));
      ctx.lineTo(Map.toCanvasX(b.x, size), Map.toCanvasY(b.z, size));
      ctx.stroke();
    }
    // بزرگراه حلقوی ضخیم‌تر
    ctx.strokeStyle = '#5a5e66';
    ctx.lineWidth = Math.max(3, 30 * sc);
    const rx = half + 46, rz = half + 46;
    ctx.strokeRect(Map.toCanvasX(-rx, size), Map.toCanvasY(-rz, size), rx * 2 * sc, rz * 2 * sc);
    // ساختمان‌ها
    ctx.fillStyle = 'rgba(230,230,235,0.35)';
    for (const b of TC.World.buildings) {
      ctx.fillRect(Map.toCanvasX(b.x - b.w / 2, size), Map.toCanvasY(b.z - b.d / 2, size), b.w * sc, b.d * sc);
    }
    // کوه‌ها
    ctx.fillStyle = '#8a7a6699';
    ctx.beginPath();
    ctx.arc(Map.toCanvasX(900, size), Map.toCanvasY(900, size), 160 * sc, 0, 7);
    ctx.fill();
    return cv;
  };

  Map.init = function () {
    Map.base = Map.buildBase(1200);
  };

  /* ---------- آیکون‌های POI ---------- */
  Map.drawPOI = function (ctx, size, poi, iconScale) {
    const x = Map.toCanvasX(poi.x, size), y = Map.toCanvasY(poi.z, size);
    ctx.font = (iconScale || 11) + 'px Tahoma';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(poi.icon, x, y);
  };

  /* ---------- نقشه کوچک ---------- */
  Map.drawMinimap = function (canvas) {
    if (!canvas || !Map.base) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const p = TC.Player.pos;
    const viewRange = 200; // متر
    const rot = -TC.Camera.yaw - Math.PI / 2 + Math.PI; // شمال بالا با چرخش بازیکن؟ نگه داشتن شمال ثابت ساده‌تر
    // پس‌زمینه
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.fillStyle = '#1a2438';
    ctx.fillRect(0, 0, w, h);
    // رندر ناحیه اطراف بازیکن از base
    const size = Map.base.width;
    const sc = Map.scale(size);
    const srcW = viewRange * 2 * sc;
    const sx = Map.toCanvasX(p.x, size) - srcW / 2;
    const sy = Map.toCanvasY(p.z, size) - srcW / 2;
    ctx.drawImage(Map.base, sx, sy, srcW, srcW, 0, 0, w, h);
    // مقصد و مسیر
    Map.drawRouteOn(ctx, w, h, p, viewRange);
    // POI های نزدیک
    for (const poi of TC.G.pois) {
      const d = M.dist2(p.x, p.z, poi.x, poi.z);
      if (d > viewRange) continue;
      const ix = w / 2 + (poi.x - p.x) / viewRange * (w / 2);
      const iy = h / 2 + (poi.z - p.z) / viewRange * (h / 2);
      ctx.font = '13px Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText(poi.icon, ix, iy);
      // مأموریت/شغل: حلقه
      if (TC.Missions.marker && poi === null) { /* noop */ }
    }
    // مارکر مأموریت
    const mk = TC.Missions.marker;
    if (mk) {
      const d = M.dist2(p.x, p.z, mk.x, mk.z);
      if (d < viewRange) {
        const ix = w / 2 + (mk.x - p.x) / viewRange * (w / 2);
        const iy = h / 2 + (mk.z - p.z) / viewRange * (h / 2);
        ctx.fillStyle = '#ffd04d';
        ctx.beginPath(); ctx.arc(ix, iy, 6, 0, 7); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.font = '10px Tahoma'; ctx.fillStyle = '#000'; ctx.textAlign = 'center';
      } else {
        // فلش لبه
        Map.edgeArrow(ctx, w, h, p, mk.x, mk.z, '#ffd04d', '⭐');
      }
    }
    // مارکر شیفت شغلی
    const jm = TC.JobMissions;
    if (jm.inShift && jm.marker) {
      const d = M.dist2(p.x, p.z, jm.marker.x, jm.marker.z);
      if (d < viewRange) {
        const ix = w / 2 + (jm.marker.x - p.x) / viewRange * (w / 2);
        const iy = h / 2 + (jm.marker.z - p.z) / viewRange * (h / 2);
        ctx.fillStyle = '#29c9e8';
        ctx.beginPath(); ctx.arc(ix, iy, 5, 0, 7); ctx.fill();
      } else {
        Map.edgeArrow(ctx, w, h, p, jm.marker.x, jm.marker.z, '#29c9e8', '🧰');
      }
    }
    // خودروهای شخصی (فعال نزدیک)
    for (const v of TC.Vehicles.all) {
      if (v.owner !== 'player' && v.garageIdx === undefined) continue;
      const d = M.dist2(p.x, p.z, v.pos.x, v.pos.z);
      if (d > viewRange) continue;
      const ix = w / 2 + (v.pos.x - p.x) / viewRange * (w / 2);
      const iy = h / 2 + (v.pos.z - p.z) / viewRange * (h / 2);
      ctx.font = '12px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('🚙', ix, iy);
    }
    // پخش جهت حرکت خودرو فعال
    if (TC.ActiveVehicle) {
      const v = TC.ActiveVehicle;
      const ax = w / 2 + Math.sin(v.yaw) * 22;
      const ay = h / 2 + Math.cos(v.yaw) * 22;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(ax, ay); ctx.stroke();
    }
    // بازیکن (فلش مرکز)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(TC.Player.yaw + Math.PI);
    ctx.fillStyle = '#f5b301';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    // قطب‌نما
    ctx.font = 'bold 12px Tahoma';
    ctx.fillStyle = '#f5b301';
    ctx.textAlign = 'left';
    ctx.fillText('شمال ↑', 6, 14);
    ctx.restore();
  };

  Map.edgeArrow = function (ctx, w, h, p, tx, tz, color, label) {
    const dx = tx - p.x, dz = tz - p.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = dx / len, nz = dz / len;
    const range = Math.max(Math.abs(nx), Math.abs(nz));
    const ax = w / 2 + (nx / range) * (w / 2 - 14);
    const ay = h / 2 + (nz / range) * (h / 2 - 14);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.arc(ax, ay, 11, 0, 7); ctx.fill();
    ctx.font = '13px Tahoma';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(label, ax, ay + 1);
  };

  Map.drawRouteOn = function (ctx, w, h, p, viewRange) {
    if (!TC.G.routePath || !TC.G.routeTarget) return;
    ctx.strokeStyle = '#29c9e8';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    let started = false;
    for (const pt of TC.G.routePath) {
      const d = M.dist2(p.x, p.z, pt.x, pt.z);
      if (d > viewRange) { started = false; continue; }
      const ix = w / 2 + (pt.x - p.x) / viewRange * (w / 2);
      const iy = h / 2 + (pt.z - p.z) / viewRange * (h / 2);
      if (!started) { ctx.moveTo(ix, iy); started = true; }
      else ctx.lineTo(ix, iy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };

  /* ---------- نقشه بزرگ ---------- */
  Map.openBig = function () {
    const el = document.getElementById('bigMap');
    el.style.display = 'flex';
    Map.renderBig();
    if (!Map._bigInit) {
      Map.initBigEvents();
      Map.buildLegend();
      Map._bigInit = true;
    }
  };
  Map.closeBig = function () {
    document.getElementById('bigMap').style.display = 'none';
  };

  Map.buildLegend = function () {
    const el = document.getElementById('bmLegend');
    const items = [
      ['⭐ مأموریت', '#ffd04d'], ['🧰 کار', '#29c9e8'], ['🏠 خانه', '#f5b301'],
      ['🚓 پلیس', '#4d8dff'], ['🏦 بانک', '#29c9e8'], ['🚗 نمایشگاه', '#e89ee8'],
      ['🏥 بیمارستان', '#ff6b81'], ['⛓️ زندان', '#8892a8'], ['🛒 فروشگاه', '#ffb84d'],
      ['💎 مخفی', '#8ff3ff'],
    ];
    el.innerHTML = items.map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join('');
  };

  Map.renderBig = function () {
    const canvas = document.getElementById('bigMapCanvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const v = Map.bigView;
    ctx.save();
    ctx.translate(v.panX, v.panY);
    ctx.scale(v.zoom, v.zoom);
    ctx.drawImage(Map.base, 0, 0);
    // POI ها
    for (const poi of TC.G.pois) {
      const x = Map.toCanvasX(poi.x, w), y = Map.toCanvasY(poi.z, h);
      ctx.font = '20px Tahoma';
      ctx.textAlign = 'center';
      ctx.fillText(poi.icon, x, y);
    }
    // مارکر مأموریت
    const mk = TC.Missions.marker;
    if (mk) {
      const x = Map.toCanvasX(mk.x, w), y = Map.toCanvasY(mk.z, h);
      ctx.fillStyle = '#ffd04d';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = '14px Tahoma'; ctx.fillStyle = '#000';
      ctx.fillText('⭐', x, y + 5);
    }
    // مسیر GPS
    if (TC.G.routePath) {
      ctx.strokeStyle = '#29c9e8';
      ctx.lineWidth = 5;
      ctx.setLineDash([14, 8]);
      ctx.beginPath();
      TC.G.routePath.forEach((pt, i) => {
        const x = Map.toCanvasX(pt.x, w), y = Map.toCanvasY(pt.z, h);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      const t = TC.G.routePath[TC.G.routePath.length - 1];
      ctx.fillStyle = '#29c9e8';
      ctx.beginPath(); ctx.arc(Map.toCanvasX(t.x, w), Map.toCanvasY(t.z, h), 10, 0, 7); ctx.fill();
    }
    // بازیکن
    const p = TC.Player.pos;
    const px = Map.toCanvasX(p.x, w), py = Map.toCanvasY(p.z, h);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(TC.Player.yaw + Math.PI);
    ctx.fillStyle = '#f5b301';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(9, 11); ctx.lineTo(0, 6); ctx.lineTo(-9, 11);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  };

  Map.initBigEvents = function () {
    const wrap = document.getElementById('bmMapWrap');
    const canvas = document.getElementById('bigMapCanvas');
    let dragging = false, lastX = 0, lastY = 0, moved = 0;
    wrap.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY; moved = 0;
      wrap.style.cursor = 'grabbing';
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX; lastY = e.clientY;
      Map.bigView.panX += dx;
      Map.bigView.panY += dy;
      Map.renderBig();
    });
    window.addEventListener('pointerup', (e) => {
      if (dragging && moved < 6) {
        // کلیک: تعیین مقصد
        const rect = canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left - Map.bigView.panX) / Map.bigView.zoom;
        const cy = (e.clientY - rect.top - Map.bigView.panY) / Map.bigView.zoom;
        Map.setDestinationFromCanvas(cx, cy, canvas.width);
      }
      dragging = false;
      wrap.style.cursor = 'grab';
    });
    wrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const v = Map.bigView;
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      v.zoom = M.clamp(v.zoom * factor, 0.2, 3);
      Map.renderBig();
    }, { passive: false });
    // پینچ زوم
    let pinchDist = 0;
    wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    });
    wrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist > 0) {
          Map.bigView.zoom = M.clamp(Map.bigView.zoom * (d / pinchDist), 0.2, 3);
          Map.renderBig();
        }
        pinchDist = d;
      }
    }, { passive: true });
    // دکمه بستن
    document.getElementById('bmClose').onclick = () => Map.closeBig();
  };

  Map.setDestinationFromCanvas = function (cx, cy, size) {
    const wx = cx / Map.scale(size) + Map.worldMin;
    const wz = cy / Map.scale(size) + Map.worldMin;
    // نزدیک‌ترین POI (در شعاع 25 پیکسلی)
    let best = null, bd = 40 * 40;
    for (const poi of TC.G.pois) {
      const d = M.dist2(wx, wz, poi.x, poi.z);
      if (d < bd) { bd = d; best = poi; }
    }
    const dest = best || { x: wx, z: wz, name: 'مقصد روی نقشه' };
    Map.setDestination(dest.x, dest.z, dest.name);
  };

  Map.setDestination = function (x, z, name) {
    const p = TC.Player.pos;
    TC.G.routeTarget = { x, z, name };
    TC.G.routePath = TC.NAV.route(p.x, p.z, x, z, 0);
    TC.ui && TC.ui.notify('🧭 مقصد: ' + name, 'info');
    Map.renderBig();
  };

  TC.Map = Map;
})();
