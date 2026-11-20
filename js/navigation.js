/* ============================================================
 * navigation.js — گراف جاده‌ها، مسیریابی A*، مسیر رانندگی و پیاده
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG;

  const NAV = {
    nodes: [],       // {id, x, z, adj: [ids]}
    nodeIndex: {},   // key "x|z" -> id
    edgeSet: {},
  };

  function addNode(x, z) {
    const key = Math.round(x * 10) + '|' + Math.round(z * 10);
    if (NAV.nodeIndex[key] !== undefined) return NAV.nodeIndex[key];
    const id = NAV.nodes.length;
    NAV.nodes.push({ id, x, z, adj: [] });
    NAV.nodeIndex[key] = id;
    return id;
  }
  function link(a, b) {
    if (a === b) return;
    const na = NAV.nodes[a], nb = NAV.nodes[b];
    if (na.adj.indexOf(b) < 0) na.adj.push(b);
    if (nb.adj.indexOf(a) < 0) nb.adj.push(a);
    const ek = Math.min(a, b) + '_' + Math.max(a, b);
    NAV.edgeSet[ek] = true;
  }

  /* ساخت گراف جاده شهر */
  NAV.build = function () {
    NAV.nodes = []; NAV.nodeIndex = {}; NAV.edgeSet = {};
    const N = C.cityBlocks;
    // ۱) گرید خیابان‌های شهری — تقاطع‌ها
    const grid = [];
    for (let i = 0; i <= N; i++) {
      grid[i] = [];
      for (let j = 0; j <= N; j++) {
        grid[i][j] = addNode(TC.roadCoord(i), TC.roadCoord(j));
      }
    }
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        if (i < N) link(grid[i][j], grid[i + 1][j]);
        if (j < N) link(grid[i][j], grid[i][j + 1]);
      }
    }
    // حذف خیابان‌های داخل پارک بزرگ (بلوک‌های پارک بدون جاده میانی) — پارک در گوشه NW بین خیابان‌ها می‌ماند
    // ۲) بزرگراه حلقوی دور شهر
    const half = (N * C.blockPitch) / 2, off = 46;
    const rx = half + off, rz = half + off;
    const rTL = addNode(-rx, -rz), rTR = addNode(rx, -rz), rBR = addNode(rx, rz), rBL = addNode(-rx, rz);
    const rT = addNode(0, -rz), rB = addNode(0, rz), rL = addNode(-rx, 0), rR = addNode(rx, 0);
    link(rTL, rT); link(rT, rTR); link(rTR, rR); link(rR, rBR);
    link(rBR, rB); link(rB, rBL); link(rBL, rL); link(rL, rTL);
    // اتصال حلقوی به گرید از میانه هر ضلع + چهار گوشه
    const c0 = Math.floor(N / 2), c1 = Math.floor(N / 2) + 1;
    link(grid[0][c0], rL); link(grid[N][c0], rR);
    link(grid[c0][0], rT); link(grid[c0][N], rB);
    link(grid[c1][0], rT); link(grid[c1][N], rB);
    link(grid[0][c1], rL); link(grid[N][c1], rR);
    link(grid[0][0], rTL); link(grid[N][0], rTR);
    link(grid[N][N], rBR); link(grid[0][N], rBL);
    // ۳) جاده فرودگاه (شرق) — از rR به سمت شرق
    const airX = rx + 210;
    const a1 = addNode(rx + 60, 0), a2 = addNode(airX, 0), a3 = addNode(airX, -70), a4 = addNode(airX + 40, -70);
    link(rR, a1); link(a1, a2); link(a2, a3); link(a3, a4);
    NAV.airportNode = a4;
    // ۴) جاده بندر (جنوب غربی)
    const h1 = addNode(-rx - 30, rz + 40), h2 = addNode(-rx - 30, rz + 90);
    link(rBL, h1); link(h1, h2);
    NAV.harborNode = h2;
    // ۵) جاده روستایی/جنگل (شمال)
    const n1 = addNode(0, -rz - 60), n2 = addNode(0, -rz - 140), n3 = addNode(-80, -rz - 200);
    link(rT, n1); link(n1, n2); link(n2, n3);
    NAV.forestNode = n3;
    const n4 = addNode(90, -rz - 190), n5 = addNode(180, -rz - 160);
    link(n2, n4); link(n4, n5); NAV.countrysideNode = n5;
    // ۶) جاده کوهستان (جنوب شرقی)
    const m1 = addNode(rx + 40, rz + 50), m2 = addNode(rx + 90, rz + 120);
    link(rBR, m1); link(m1, m2);
    NAV.mountainNode = m2;
    NAV.ready = true;
  };

  /* نزدیک‌ترین گره */
  NAV.nearest = function (x, z) {
    let best = 0, bd = Infinity;
    for (const n of NAV.nodes) {
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < bd) { bd = d; best = n.id; }
    }
    return best;
  };
  NAV.nearestOnRoad = function (x, z, maxDist) {
    // نزدیک‌ترین نقطه روی یال‌ها
    let best = null, bd = maxDist !== undefined ? maxDist * maxDist : Infinity;
    for (const ek in NAV.edgeSet) {
      const [i, j] = ek.split('_').map(Number);
      const a = NAV.nodes[i], b = NAV.nodes[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len2 = dx * dx + dz * dz;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / len2;
      t = M.clamp(t, 0, 1);
      const px = a.x + dx * t, pz = a.z + dz * t;
      const d = (px - x) * (px - x) + (pz - z) * (pz - z);
      if (d < bd) { bd = d; best = { x: px, z: pz, nodeA: i, nodeB: j, t, dx: dx / Math.sqrt(len2), dz: dz / Math.sqrt(len2) }; }
    }
    return best;
  };

  /* A* روی گراف */
  NAV.path = function (fromId, toId) {
    if (fromId === toId) return [NAV.nodes[toId]];
    const open = [fromId];
    const gScore = {}, fScore = {}, came = {}, closed = {};
    const goal = NAV.nodes[toId];
    gScore[fromId] = 0;
    fScore[fromId] = M.dist2(NAV.nodes[fromId].x, NAV.nodes[fromId].z, goal.x, goal.z);
    while (open.length) {
      // گره با کمترین f
      let bi = 0;
      for (let i = 1; i < open.length; i++) if ((fScore[open[i]] || Infinity) < (fScore[open[bi]] || Infinity)) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === toId) {
        // بازسازی مسیر
        const out = [NAV.nodes[toId]];
        let c = toId;
        while (came[c] !== undefined) { c = came[c]; out.unshift(NAV.nodes[c]); }
        return out;
      }
      closed[cur] = true;
      for (const nb of NAV.nodes[cur].adj) {
        if (closed[nb]) continue;
        const n = NAV.nodes[nb];
        const tg = gScore[cur] + M.dist2(NAV.nodes[cur].x, NAV.nodes[cur].z, n.x, n.z);
        if (gScore[nb] === undefined || tg < gScore[nb]) {
          came[nb] = cur;
          gScore[nb] = tg;
          fScore[nb] = tg + M.dist2(n.x, n.z, goal.x, goal.z);
          if (open.indexOf(nb) < 0) open.push(nb);
        }
      }
    }
    return [NAV.nodes[fromId]];
  };

  /* مسیر دنیای واقعی از مختصات مبدا به مقصد با آفست لِین */
  NAV.route = function (x0, z0, x1, z1, laneOffset, opts) {
    const a = NAV.nearest(x0, z0), b = NAV.nearest(x1, z1);
    const nodes = NAV.path(a, b);
    const pts = [{ x: x0, z: z0 }];
    for (const n of nodes) pts.push({ x: n.x, z: n.z });
    pts.push({ x: x1, z: z1 });
    if (opts && opts.laneOffset !== undefined) laneOffset = opts.laneOffset;
    if (laneOffset && laneOffset !== 0) return NAV.applyLane(pts, laneOffset);
    return pts;
  };

  /* اعمال آفست سمت راست جاده (رانندگی دست‌راست) */
  NAV.applyLane = function (pts, off) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next.x - prev.x, dz = next.z - prev.z;
      const l = Math.hypot(dx, dz) || 1;
      dx /= l; dz /= l;
      // عمود سمت راست مسیر
      out.push({ x: p.x - dz * off, z: p.z + dx * off });
    }
    return out;
  };

  /* نقطه تصادفی روی جاده‌ها برای اسپاون ترافیک */
  NAV.randomRoadPoint = function (minDistFrom, px, pz) {
    for (let k = 0; k < 40; k++) {
      const ekArr = Object.keys(NAV.edgeSet);
      const ek = ekArr[Math.floor(Math.random() * ekArr.length)];
      const [i, j] = ek.split('_').map(Number);
      const a = NAV.nodes[i], b = NAV.nodes[j];
      const t = Math.random();
      const x = M.lerp(a.x, b.x, t), z = M.lerp(a.z, b.z, t);
      if (minDistFrom && M.dist2(x, z, px, pz) < minDistFrom) continue;
      if (M.dist2(x, z, px || 0, pz || 0) > 900) continue;
      return { x, z };
    }
    const n = M.pick(NAV.nodes);
    return { x: n.x, z: n.z };
  };

  /* نقطه تصادفی پیاده‌رو برای عابرها */
  NAV.randomSidewalkPoint = function (nearX, nearZ, minR, maxR) {
    for (let k = 0; k < 30; k++) {
      const p = NAV.randomRoadPoint(0, nearX, nearZ);
      if (M.dist2(p.x, p.z, nearX, nearZ) < minR) continue;
      if (M.dist2(p.x, p.z, nearX, nearZ) > maxR) continue;
      const s = C.roadHalf + 2.6;
      const ang = Math.random() * Math.PI * 2;
      const cand = { x: p.x + Math.cos(ang) * s, z: p.z + Math.sin(ang) * s };
      // فقط نقطه‌های نزدیک به یک خیابان (روی پیاده‌رو) معتبرند
      if (NAV.distToRoad(cand.x, cand.z) < 6.5) return cand;
    }
    const p2 = NAV.randomRoadPoint(0, nearX, nearZ);
    return { x: p2.x + C.roadHalf + 2.6, z: p2.z };
  };

  NAV.distToRoad = function (x, z) {
    const N = C.cityBlocks, half = (N * C.blockPitch) / 2;
    let best = Infinity;
    for (let i = 0; i <= N; i++) {
      best = Math.min(best, Math.abs(x - TC.roadCoord(i)), Math.abs(z - TC.roadCoord(i)));
    }
    // حلقوی
    const rx = half + 46, rz = half + 46;
    if (Math.abs(x) <= rx + 3) best = Math.min(best, Math.abs(Math.abs(z) - rz));
    if (Math.abs(z) <= rz + 3) best = Math.min(best, Math.abs(Math.abs(x) - rx));
    return best;
  };

  /* طول کل مسیر */
  NAV.pathLength = function (pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += M.dist2(pts[i - 1].x, pts[i - 1].z, pts[i].x, pts[i].z);
    return l;
  };
  /* ساده‌سازی: حذف نقاط خیلی نزدیک */
  NAV.simplify = function (pts, minSeg) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (M.dist2(out[out.length - 1].x, out[out.length - 1].z, pts[i].x, pts[i].z) >= minSeg) out.push(pts[i]);
    }
    return out;
  };
  // بهبود: روی تابع route ساده‌سازی هم اعمال شود
  const _route = NAV.route;
  NAV.route = function (x0, z0, x1, z1, laneOffset, opts) {
    return NAV.simplify(_route(x0, z0, x1, z1, laneOffset, opts), 4);
  };

  TC.NAV = NAV;
})();
