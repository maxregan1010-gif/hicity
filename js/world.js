/* ============================================================
 * world.js — ساخت جهان: تکسچرهای رویه‌ای، جاده‌ها، ساختمان‌ها،
 * مکان‌های مهم شهر (POI)، طبیعت، دریا، آسمان
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M, C = TC.CONFIG, B = () => BABYLON;

  const W = { mats: {}, nightMats: [], buildings: [], shopRooms: {}, doorAnims: [] };

  /* ================= تکسچرهای رویه‌ای ================= */
  function canvasTex(name, size, draw, opts) {
    const dt = new BABYLON.DynamicTexture(name, { width: size, height: size }, TC.G.scene, true);
    const ctx = dt.getContext();
    draw(ctx, size);
    dt.update(false);
    dt.wrapU = dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    dt.anisotropicFilteringLevel = 8;
    if (opts && opts.hasAlpha) dt.hasAlpha = true;
    return dt;
  }
  function noise(ctx, s, n, alpha, colFn) {
    for (let i = 0; i < n; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = Math.random() * 2.2 + 0.4;
      ctx.fillStyle = colFn(Math.random());
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  W.buildTextures = function () {
    const T = TC.Tex;
    // آسفالت
    T.asphalt = canvasTex('asphalt', 256, (ctx, s) => {
      ctx.fillStyle = '#2b2e33'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 900, 0.25, (r) => r < 0.5 ? '#3a3e45' : '#23262b');
      // ترک‌ها
      ctx.strokeStyle = 'rgba(15,16,18,0.55)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        let x = Math.random() * s, y = Math.random() * s;
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      // چاله
      for (let i = 0; i < 3; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 6 + Math.random() * 10;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, 'rgba(10,10,12,0.8)'); g.addColorStop(1, 'rgba(10,10,12,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
    });
    // پیاده‌رو
    T.sidewalk = canvasTex('sidewalk', 128, (ctx, s) => {
      ctx.fillStyle = '#8f9299'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 400, 0.2, (r) => r < 0.5 ? '#9da1a8' : '#7d8087');
      ctx.strokeStyle = 'rgba(60,62,68,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * s / 4, 0); ctx.lineTo(i * s / 4, s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * s / 4); ctx.lineTo(s, i * s / 4); ctx.stroke();
      }
    });
    // خط‌کشی جاده (با آلفا)
    T.laneDash = canvasTex('laneDash', 128, (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(240,225,120,0.92)';
      ctx.fillRect(s / 2 - 3, 10, 6, 44);
      ctx.fillRect(s / 2 - 3, 74, 6, 44);
    }, { hasAlpha: true });
    T.laneEdge = canvasTex('laneEdge', 32, (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(235,235,235,0.9)';
      ctx.fillRect(12, 0, 6, s);
    }, { hasAlpha: true });
    T.crosswalk = canvasTex('crosswalk', 128, (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(230,230,230,0.85)';
      for (let i = 0; i < 6; i++) ctx.fillRect(8 + i * 20, 8, 12, s - 16);
    }, { hasAlpha: true });
    // نمای ساختمان‌ها — ۸ واریانت (diffuse + emissive پنجره‌ها)
    const facadeStyles = [
      { base: '#5b6f8a', win: '#cfe8ff', floor: 4, cols: 5, name: 'glassBlue' },
      { base: '#42506b', win: '#bcdcff', floor: 6, cols: 6, name: 'towerDark' },
      { base: '#8a7a62', win: '#fff2cf', floor: 3, cols: 4, name: 'brickWarm' },
      { base: '#a89582', win: '#ffe9c4', floor: 3, cols: 4, name: 'sandstone' },
      { base: '#7d5f4e', win: '#ffd9a0', floor: 3, cols: 3, name: 'brickRed' },
      { base: '#c9c2b4', win: '#e8f4ff', floor: 3, cols: 4, name: 'whitePlaster' },
      { base: '#3d4654', win: '#9fd8ff', floor: 8, cols: 8, name: 'glassTower' },
      { base: '#6e5d50', win: '#ffe1b8', floor: 2, cols: 3, name: 'slumWall' },
    ];
    T.facades = [];
    T.facadesE = [];
    for (const st of facadeStyles) {
      T.facades.push(canvasTex('fac_' + st.name, 256, (ctx, s) => {
        ctx.fillStyle = st.base; ctx.fillRect(0, 0, s, s);
        noise(ctx, s, 300, 0.16, (r) => r < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)');
        const fw = s / st.cols, fh = s / st.floor;
        for (let f = 0; f < st.floor; f++) for (let c = 0; c < st.cols; c++) {
          const wx = c * fw + fw * 0.18, wy = f * fh + fh * 0.22, ww = fw * 0.64, wh = fh * 0.5;
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
          ctx.fillStyle = st.win;
          ctx.globalAlpha = 0.75 + Math.random() * 0.25;
          ctx.fillRect(wx, wy, ww, wh);
          ctx.globalAlpha = 1;
          // انعکاس آسمان در بالای پنجره
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(wx, wy, ww, wh * 0.25);
        }
        // خط طبقات
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let f = 1; f < st.floor; f++) ctx.fillRect(0, f * fh - 2, s, 3);
      }));
      T.facadesE.push(canvasTex('facE_' + st.name, 256, (ctx, s) => {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, s, s);
        const fw = s / st.cols, fh = s / st.floor;
        for (let f = 0; f < st.floor; f++) for (let c = 0; c < st.cols; c++) {
          if (M.srand() < 0.45) continue; // بعضی پنجره‌ها خاموش
          const wx = c * fw + fw * 0.18, wy = f * fh + fh * 0.22, ww = fw * 0.64, wh = fh * 0.5;
          const warm = M.srand() < 0.7;
          ctx.fillStyle = warm ? '#ffdf9e' : '#cfe4ff';
          ctx.globalAlpha = 0.5 + M.srand() * 0.5;
          ctx.fillRect(wx, wy, ww, wh);
          ctx.globalAlpha = 1;
        }
      }));
    }
    // پارچه‌های فروشگاهی (طبقه همکف تجاری)
    T.shopFronts = [];
    const shopColors = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad'];
    for (let i = 0; i < 6; i++) {
      T.shopFronts.push(canvasTex('shopF' + i, 128, (ctx, s) => {
        ctx.fillStyle = '#20242c'; ctx.fillRect(0, 0, s, s);
        ctx.fillStyle = shopColors[i];
        ctx.fillRect(0, 0, s, s * 0.22);
        ctx.fillStyle = 'rgba(255,235,180,0.85)';
        ctx.fillRect(s * 0.12, s * 0.3, s * 0.76, s * 0.55);
        ctx.strokeStyle = shopColors[i]; ctx.lineWidth = 5;
        ctx.strokeRect(s * 0.12, s * 0.3, s * 0.76, s * 0.55);
        noise(ctx, s, 60, 0.2, () => 'rgba(255,255,255,0.12)');
      }));
    }
    T.roof = canvasTex('roof', 128, (ctx, s) => {
      ctx.fillStyle = '#3d4148'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 700, 0.3, (r) => r < 0.5 ? '#4a4f57' : '#33373d');
    });
    T.grass = canvasTex('grass', 256, (ctx, s) => {
      ctx.fillStyle = '#4e7c3a'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 1400, 0.3, (r) => r < 0.5 ? '#5c8c44' : '#3f6a2f');
    });
    T.dirt = canvasTex('dirt', 256, (ctx, s) => {
      ctx.fillStyle = '#7a6a50'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 900, 0.3, (r) => r < 0.5 ? '#87765a' : '#665741');
    });
    T.sand = canvasTex('sand', 256, (ctx, s) => {
      ctx.fillStyle = '#dcc58a'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 1200, 0.25, (r) => r < 0.5 ? '#e6d09a' : '#c9b278');
    });
    T.water = canvasTex('water', 256, (ctx, s) => {
      ctx.fillStyle = '#1a5276'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = 'rgba(200,235,255,' + (0.08 + Math.random() * 0.12) + ')';
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const y = Math.random() * s;
        ctx.moveTo(0, y);
        for (let x = 0; x < s; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.08 + i) * 4);
        ctx.stroke();
      }
    });
    T.metal = canvasTex('metal', 128, (ctx, s) => {
      ctx.fillStyle = '#6b7078'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < s; i += 8) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, i, s, 2); }
      noise(ctx, s, 200, 0.2, () => 'rgba(0,0,0,0.25)');
    });
    T.concrete = canvasTex('concrete', 128, (ctx, s) => {
      ctx.fillStyle = '#9aa0a8'; ctx.fillRect(0, 0, s, s);
      noise(ctx, s, 500, 0.2, (r) => r < 0.5 ? '#a8aeb6' : '#8a9098');
    });
    T.wood = canvasTex('wood', 128, (ctx, s) => {
      ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = 'rgba(60,40,20,' + (0.15 + Math.random() * 0.2) + ')';
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.beginPath(); ctx.moveTo(0, i * s / 14 + Math.random() * 4);
        ctx.bezierCurveTo(s * 0.3, i * s / 14 + 6, s * 0.7, i * s / 14 - 6, s, i * s / 14);
        ctx.stroke();
      }
    });
    T.stone = canvasTex('stone', 128, (ctx, s) => {
      ctx.fillStyle = '#7d7f84'; ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * s, y = Math.random() * s, w = 12 + Math.random() * 20, h = 8 + Math.random() * 12;
        ctx.fillStyle = 'rgba(' + (90 + Math.random() * 50 | 0) + ',' + (90 + Math.random() * 50 | 0) + ',' + (95 + Math.random() * 50 | 0) + ',0.8)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(40,42,46,0.8)'; ctx.strokeRect(x, y, w, h);
      }
    });
    // تابلوی تبلیغاتی
    T.billboard = canvasTex('billboard', 256, (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s);
      g.addColorStop(0, '#2980b9'); g.addColorStop(1, '#8e44ad');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#ffe28a';
      ctx.font = 'bold 44px Tahoma'; ctx.textAlign = 'center';
      ctx.fillText('نوشابه طوفان!', s / 2, s / 2 - 10);
      ctx.font = '24px Tahoma';
      ctx.fillStyle = '#fff';
      ctx.fillText('خنک و انفجاری ⚡', s / 2, s / 2 + 36);
    });
  };

  /* ================= متریال‌ها ================= */
  W.buildMaterials = function () {
    const T = TC.Tex, mats = W.mats;
    const mk = (name, tex, opts) => {
      const m = new BABYLON.StandardMaterial(name, TC.G.scene);
      m.diffuseTexture = tex;
      m.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06);
      if (opts) opts(m);
      m.freeze();
      return m;
    };
    mats.asphalt = mk('mAsphalt', T.asphalt);
    mats.sidewalk = mk('mSidewalk', T.sidewalk);
    mats.grass = mk('mGrass', T.grass, (m) => { m.diffuseTexture.uScale = 90; m.diffuseTexture.vScale = 90; });
    mats.dirt = mk('mDirt', T.dirt, (m) => { m.diffuseTexture.uScale = 80; m.diffuseTexture.vScale = 80; });
    mats.sand = mk('mSand', T.sand, (m) => { m.diffuseTexture.uScale = 30; m.diffuseTexture.vScale = 30; });
    mats.roof = mk('mRoof', T.roof);
    mats.metal = mk('mMetal', T.metal, (m) => { m.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3); });
    mats.concrete = mk('mConcrete', T.concrete);
    mats.wood = mk('mWood', T.wood);
    mats.stone = mk('mStone', T.stone);
    mats.water = new BABYLON.StandardMaterial('mWater', TC.G.scene);
    mats.water.diffuseTexture = T.water;
    mats.water.diffuseTexture.uScale = 60; mats.water.diffuseTexture.vScale = 60;
    mats.water.specularColor = new BABYLON.Color3(0.9, 0.9, 0.95);
    mats.water.specularPower = 96;
    mats.water.alpha = 0.93;
    mats.water.bumpTexture = null;
    // نماها
    W.facadeMats = [];
    for (let i = 0; i < T.facades.length; i++) {
      const m = new BABYLON.StandardMaterial('mFac' + i, TC.G.scene);
      m.diffuseTexture = T.facades[i];
      m.emissiveTexture = T.facadesE[i];
      m.emissiveColor = new BABYLON.Color3(0, 0, 0);
      m.specularColor = new BABYLON.Color3(0.12, 0.12, 0.13);
      m.freeze();
      W.facadeMats.push(m);
      W.nightMats.push(m);
    }
    W.shopFrontMats = T.shopFronts.map((t, i) => {
      const m = new BABYLON.StandardMaterial('mShopF' + i, TC.G.scene);
      m.diffuseTexture = t;
      m.emissiveColor = new BABYLON.Color3(0, 0, 0);
      m.specularColor = new BABYLON.Color3(0.08, 0.08, 0.08);
      m.freeze();
      W.nightMats.push(m);
      return m;
    });
    // خطوط جاده
    mats.laneDash = new BABYLON.StandardMaterial('mLaneDash', TC.G.scene);
    mats.laneDash.diffuseTexture = T.laneDash;
    mats.laneDash.emissiveColor = new BABYLON.Color3(0.35, 0.33, 0.2);
    mats.laneDash.specularColor = BABYLON.Color3.Black();
    mats.laneDash.freeze();
    mats.laneEdge = new BABYLON.StandardMaterial('mLaneEdge', TC.G.scene);
    mats.laneEdge.diffuseTexture = T.laneEdge;
    mats.laneEdge.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);
    mats.laneEdge.specularColor = BABYLON.Color3.Black();
    mats.laneEdge.freeze();
    mats.crosswalk = new BABYLON.StandardMaterial('mCross', TC.G.scene);
    mats.crosswalk.diffuseTexture = T.crosswalk;
    mats.crosswalk.specularColor = BABYLON.Color3.Black();
    mats.crosswalk.freeze();
    // شیشه ویترین
    mats.glass = new BABYLON.StandardMaterial('mGlass', TC.G.scene);
    mats.glass.diffuseColor = new BABYLON.Color3(0.35, 0.55, 0.7);
    mats.glass.alpha = 0.42;
    mats.glass.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    mats.glass.specularPower = 128;
    mats.glass.emissiveColor = new BABYLON.Color3(0.05, 0.08, 0.1);
    W.nightMats.push(mats.glass);
    // آسمان
    mats.sky = new BABYLON.StandardMaterial('mSky', TC.G.scene);
    mats.sky.emissiveTexture = W.buildSkyTexture();
    mats.sky.disableLighting = true;
    mats.sky.backFaceCulling = false;
    mats.sky.infinityMode = false;
    // نور لامپ‌ها
    mats.lampGlow = new BABYLON.StandardMaterial('mLampGlow', TC.G.scene);
    mats.lampGlow.emissiveColor = new BABYLON.Color3(0, 0, 0);
    mats.lampGlow.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.8);
    mats.lampGlow.specularColor = BABYLON.Color3.Black();
    W.nightMats.push(mats.lampGlow);
  };

  W.buildSkyTexture = function () {
    const dt = new BABYLON.DynamicTexture('skyTex', { width: 128, height: 512 }, TC.G.scene, true);
    W.skyDT = dt;
    dt.anisotropicFilteringLevel = 1;
    dt.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    W.paintSky('#87b5e0', '#3a6ea8', '#0b1e3a');
    return dt;
  };
  W.paintSky = function (horizon, mid, top) {
    const ctx = W.skyDT.getContext();
    const H = W.skyDT.getSize().height;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, horizon);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W.skyDT.getSize().width, H);
    W.skyDT.update(false);
  };

  /* ================= ابزار ساخت ================= */
  // دیوار ساختمان با UV متناسب ابعاد — دورو و رو به بیرون
  function wallPlane(name, x, y, z, w, h, facing, variant) {
    const p = BABYLON.MeshBuilder.CreatePlane(name, { width: w, height: h, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, TC.G.scene);
    p.material = W.facadeMats[variant % W.facadeMats.length];
    p.position.set(x, y + h / 2, z);
    const uv = p.getVerticesData(BABYLON.VertexBuffer.UVKind);
    const floors = Math.max(1, Math.round(h / 3.2));
    const winCols = Math.max(1, Math.round(w / 3.4));
    for (let i = 0; i < uv.length; i += 2) { uv[i] *= winCols; uv[i + 1] *= floors; }
    p.setVerticesData(BABYLON.VertexBuffer.UVKind, uv);
    // نرمال پیش‌فرض پلاین به سمت -z است؛ چرخش تا رو به بیرون باشد
    if (facing === 'n') p.rotation.y = 0;                  // رو به شمال (-z)
    else if (facing === 's') p.rotation.y = Math.PI;       // رو به جنوب (+z)
    else if (facing === 'e') p.rotation.y = -Math.PI / 2;  // رو به شرق (+x)
    else if (facing === 'w') p.rotation.y = Math.PI / 2;   // رو به غرب (-x)
    p.freezeWorldMatrix();
    return p;
  }
  function flatPlane(name, x, y, z, w, d, mat, rotX) {
    const p = BABYLON.MeshBuilder.CreatePlane(name, { width: w, height: d }, TC.G.scene);
    p.material = mat;
    p.rotation.x = rotX === undefined ? Math.PI / 2 : rotX;
    p.position.set(x, y, z);
    p.freezeWorldMatrix();
    return p;
  }

  /* ساختمان با ۴ نمای پنجره‌دار + پشت‌بام + طبقه همکف تجاری اختیاری */
  W.makeBuilding = function (x, z, w, d, h, variant, opts) {
    opts = opts || {};
    const meshes = [];
    const shopFront = opts.shopFront !== undefined ? opts.shopFront : -1;
    // چهار دیوار
    const n = wallPlane('bld', x, 0, z - d / 2, w, h, 'n', variant);
    const s = wallPlane('bld', x, 0, z + d / 2, w, h, 's', variant);
    const e = wallPlane('bld', x + w / 2, 0, z, d, h, 'e', variant);
    const we = wallPlane('bld', x - w / 2, 0, z, d, h, 'w', variant);
    meshes.push(n, s, e, we);
    if (shopFront >= 0) {
      // طبقه همکف رنگی در سمت جلو (شمال: -z)
      const sf = wallPlane('shopf', x, 0, z - d / 2 - 0.06, w * 0.96, 3.4, 'n', variant);
      sf.material = W.shopFrontMats[shopFront % W.shopFrontMats.length];
      const uv = sf.getVerticesData(BABYLON.VertexBuffer.UVKind);
      for (let i = 0; i < uv.length; i += 2) { uv[i] *= Math.max(1, Math.round(w / 5)); uv[i + 1] = 1; }
      sf.setVerticesData(BABYLON.VertexBuffer.UVKind, uv);
      meshes.push(sf);
      // سایه‌بان
      const awn = flatPlane('awn', x, 3.6, z - d / 2 - 1.1, w * 0.9, 2.2, W.shopFrontMats[(shopFront + 2) % 6]);
      meshes.push(awn);
    }
    // پشت‌بام
    const roof = flatPlane('roof', x, h + 0.05, z, w, d, W.mats.roof, Math.PI / 2);
    meshes.push(roof);
    // پاراپت دور بام — حجم واقعی‌تر
    const ph = 0.6, pt = 0.3;
    const paraEdges = [
      [x, z - d / 2, w, pt], [x, z + d / 2, w, pt],
      [x - w / 2, z, pt, d], [x + w / 2, z, pt, d],
    ];
    for (const [px, pz, pw, pd] of paraEdges) {
      const par = BABYLON.MeshBuilder.CreateBox('parapet', { width: pw, height: ph, depth: pd }, TC.G.scene);
      par.material = W.mats.concrete;
      par.position.set(px, h + ph / 2, pz);
      par.freezeWorldMatrix();
      meshes.push(par);
    }
    // کولر پشت‌بام برای تنوع
    if (h > 12 && M.srand() < 0.7) {
      const ac = BABYLON.MeshBuilder.CreateBox('ac', { width: 2.4, height: 1.4, depth: 2.4 }, TC.G.scene);
      ac.material = W.mats.metal;
      ac.position.set(x + (M.srand() - 0.5) * w * 0.5, h + 0.7, z + (M.srand() - 0.5) * d * 0.5);
      ac.freezeWorldMatrix();
      meshes.push(ac);
    }
    // تانک آب روی بام
    if (h > 8 && h <= 30 && M.srand() < 0.45) {
      const tank = BABYLON.MeshBuilder.CreateCylinder('wtank', { diameter: 2.2, height: 2.6, tessellation: 10 }, TC.G.scene);
      tank.material = W.mats.metal;
      tank.position.set(x + (M.srand() - 0.5) * w * 0.4, h + 1.8, z + (M.srand() - 0.5) * d * 0.4);
      tank.freezeWorldMatrix();
      meshes.push(tank);
    }
    // کولرهای دیواری روی نماها
    const wallACs = M.srandInt(0, 3);
    for (let i = 0; i < wallACs; i++) {
      const side = M.srandInt(0, 3);
      const hy = 2.6 + M.srand() * Math.min(h - 3.4, 9);
      const off = 0.22;
      let acp;
      if (side === 0) acp = { x: x + (M.srand() - 0.5) * w * 0.7, z: z - d / 2 - off, ry: 0 };
      else if (side === 1) acp = { x: x + (M.srand() - 0.5) * w * 0.7, z: z + d / 2 + off, ry: Math.PI };
      else if (side === 2) acp = { x: x + w / 2 + off, z: z + (M.srand() - 0.5) * d * 0.7, ry: -Math.PI / 2 };
      else acp = { x: x - w / 2 - off, z: z + (M.srand() - 0.5) * d * 0.7, ry: Math.PI / 2 };
      const wac = BABYLON.MeshBuilder.CreateBox('wac', { width: 0.8, height: 0.55, depth: 0.4 }, TC.G.scene);
      wac.material = W.mats.concrete;
      wac.position.set(acp.x, hy, acp.z);
      wac.rotation.y = acp.ry;
      wac.freezeWorldMatrix();
      meshes.push(wac);
    }
    // تابلوی عمود مغازه (چسبیده به نمای شمالی، رو به خیابان)
    if (shopFront >= 0) {
      const hsign = BABYLON.MeshBuilder.CreateBox('hsign', { width: 0.14, height: 1.15, depth: 1.7 }, TC.G.scene);
      hsign.material = W.shopFrontMats[(shopFront + 1) % 6];
      hsign.position.set(x + w * 0.28, 3.1, z - d / 2 - 0.45);
      hsign.freezeWorldMatrix();
      meshes.push(hsign);
    }
    // برج اضافی روی ساختمان‌های بلند
    if (h > 50 && M.srand() < 0.6) {
      const w2 = w * 0.5, d2 = d * 0.5, h2 = h * 0.25;
      const t = W.makeBuilding(x, z, w2, d2, h2, variant, { noCollider: true, noRecord: true });
      if (t) {
        t.position.y += h; // برج دوم روی پشت‌بام
        meshes.push(t);
      }
    }
    if (!opts.noCollider) TC.Physics.addBox(x, z, w, d, h, 0, 'building');
    if (!opts.noRecord) W.buildings.push({ x, z, w, d, h, district: opts.district || '?' });
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (merged) { merged.freezeWorldMatrix(); merged.isPickable = false; }
    return merged;
  };

  /* اتاق با دیوار، در و سقف — برای مغازه‌ها/بانک/خانه */
  W.makeRoom = function (opts) {
    const { x, z, w, d, h, doorSide, doorOffset, name, wallMat, floorMat, flatRoof } = opts;
    const hM = h || 3.8;
    const wm = wallMat || W.mats.concrete;
    const fm = floorMat || W.mats.wood;
    const t = 0.4;
    const meshes = [];
    const doorW = 2.6;
    const segs = [];
    function wallSeg(cx, cz, ww, dd) {
      const b = BABYLON.MeshBuilder.CreateBox('wseg', { width: ww, height: hM, depth: dd }, TC.G.scene);
      b.material = wm;
      b.position.set(cx, hM / 2, cz);
      b.freezeWorldMatrix();
      meshes.push(b);
      TC.Physics.addBox(cx, cz, ww, dd, hM, 0, 'wall');
    }
    // هر ضلع: دو قطعه با فاصله در (فقط ضلع doorSide شکاف دارد)
    const sides = ['n', 's', 'e', 'w'];
    for (const side of sides) {
      const hasDoor = side === doorSide;
      const horiz = side === 'n' || side === 's';
      const len = horiz ? w : d;
      if (!hasDoor) {
        const cx = side === 'n' ? x : side === 's' ? x : (side === 'e' ? x + w / 2 - t / 2 : x - w / 2 + t / 2);
        const cz = side === 'n' ? z - d / 2 + t / 2 : side === 's' ? z + d / 2 - t / 2 : z;
        wallSeg(cx, cz, horiz ? w : t, horiz ? t : d);
      } else {
        const off = doorOffset || 0;
        const segLen = (len - doorW) / 2;
        const c = horiz ? x + off : z + off;
        // قطعه اول
        const c1 = horiz ? c - doorW / 2 - segLen / 2 : c;
        const c1z = horiz ? z : c1;
        const c1x = horiz ? c1 : z === undefined ? 0 : (side === 'e' ? x + w / 2 - t / 2 : x - w / 2 + t / 2);
        // ساده‌سازی: برای ضلع عمودی (شرق/غرب) در در محور z جابه‌جا می‌شود
        if (horiz) {
          wallSeg(c - doorW / 2 - segLen / 2, side === 'n' ? z - d / 2 + t / 2 : z + d / 2 - t / 2, segLen, t);
          wallSeg(c + doorW / 2 + segLen / 2, side === 'n' ? z - d / 2 + t / 2 : z + d / 2 - t / 2, segLen, t);
        } else {
          const wx = side === 'e' ? x + w / 2 - t / 2 : x - w / 2 + t / 2;
          wallSeg(wx, c - doorW / 2 - segLen / 2, t, segLen);
          wallSeg(wx, c + doorW / 2 + segLen / 2, t, segLen);
        }
      }
    }
    // کف
    const floor = flatPlane(name + '_floor', x, 0.06, z, w, d, fm, Math.PI / 2);
    const uv = floor.getVerticesData(BABYLON.VertexBuffer.UVKind);
    for (let i = 0; i < uv.length; i += 2) { uv[i] *= w / 3; uv[i + 1] *= d / 3; }
    floor.setVerticesData(BABYLON.VertexBuffer.UVKind, uv);
    meshes.push(floor);
    // سقف
    if (flatRoof !== false) {
      const ceil = flatPlane(name + '_ceil', x, hM + 0.05, z, w, d, W.mats.concrete, -Math.PI / 2);
      meshes.push(ceil);
    }
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (merged) { merged.freezeWorldMatrix(); merged.isPickable = false; }
    const doorPos = { x: 0, z: 0 };
    if (doorSide === 'n') doorPos.x = x + (doorOffset || 0), doorPos.z = z - d / 2;
    if (doorSide === 's') doorPos.x = x + (doorOffset || 0), doorPos.z = z + d / 2;
    if (doorSide === 'e') doorPos.x = x + w / 2, doorPos.z = z + (doorOffset || 0);
    if (doorSide === 'w') doorPos.x = x - w / 2, doorPos.z = z + (doorOffset || 0);
    return { meshes: merged, x, z, w, d, h: hM, doorPos, doorSide };
  };

  /* تابلوی POI بالای در */
  W.makeSign = function (x, y, z, rotY, icon, text, color) {
    const dt = new BABYLON.DynamicTexture('sign' + x + '_' + z, { width: 256, height: 96 }, TC.G.scene, true);
    const ctx = dt.getContext();
    ctx.fillStyle = '#101623'; ctx.fillRect(0, 0, 256, 96);
    ctx.strokeStyle = color || '#f5b301'; ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 250, 90);
    ctx.fillStyle = color || '#f5b301';
    ctx.font = 'bold 40px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText(icon + ' ' + text, 128, 62);
    dt.update(false);
    const m = new BABYLON.StandardMaterial('signM', TC.G.scene);
    m.diffuseTexture = dt;
    m.emissiveTexture = dt;
    m.emissiveColor = new BABYLON.Color3(0.55, 0.55, 0.55);
    m.backFaceCulling = false;
    m.freeze();
    const p = BABYLON.MeshBuilder.CreatePlane('signP', { width: 4.4, height: 1.65 }, TC.G.scene);
    p.material = m;
    p.position.set(x, y, z);
    p.rotation.y = rotY;
    p.freezeWorldMatrix();
    W.nightMats.push(m);
    return p;
  };

  /* مبلمان داخلی اتاق‌ها — kind: counter | tables | shelves | desks | benches */
  W.furnishRoom = function (room, kinds) {
    if (!room) return;
    const scene = TC.G.scene;
    const x = room.x, z = room.z, w = room.w, d = room.d;
    const meshes = [];
    function boxAt(bx, by, bz, bw, bh, bd, mat, ry) {
      const b = BABYLON.MeshBuilder.CreateBox('furn', { width: bw, height: bh, depth: bd }, scene);
      b.material = mat;
      b.position.set(bx, by, bz);
      if (ry) b.rotation.y = ry;
      b.freezeWorldMatrix();
      meshes.push(b);
      return b;
    }
    const wood = W.mats.wood, metal = W.mats.metal, conc = W.mats.concrete;
    kinds = Array.isArray(kinds) ? kinds : [kinds];
    for (const kind of kinds) {
      if (kind === 'counter') {
        // کانتر پشت دیوار شمال + قفسه پشتش
        boxAt(x, 0.5, z - d / 2 + 1.2, w * 0.55, 1, 0.75, wood);
        boxAt(x, 1.1, z - d / 2 + 0.45, w * 0.55, 1.4, 0.35, metal);
        TC.Physics.addBox(x, z - d / 2 + 1.2, w * 0.55, 0.9, 1.6, 0, 'counter');
      } else if (kind === 'tables') {
        // دو میز + چهار صندلی
        for (const [tx, tz] of [[x - w * 0.25, z], [x + w * 0.25, z + 1.5]]) {
          boxAt(tx, 0.75, tz, 1.3, 0.1, 1.3, wood);
          boxAt(tx, 0.4, tz, 0.16, 0.75, 0.16, metal);
          TC.Physics.addBox(tx, tz, 1.3, 1.3, 0.85, 0, 'table');
          for (const [sx, sz, rr] of [[-0.95, 0, 0], [0.95, 0, 0], [0, -0.95, Math.PI / 2], [0, 0.95, Math.PI / 2]]) {
            boxAt(tx + sx, 0.45, tz + sz, 0.42, 0.08, 0.42, wood, rr || 0);
            boxAt(tx + sx, 0.22, tz + sz, 0.1, 0.45, 0.1, metal);
          }
        }
      } else if (kind === 'shelves') {
        // دو قفسه دیواری
        boxAt(x - w / 2 + 0.35, 1, z, 0.5, 2, d * 0.5, metal);
        boxAt(x + w / 2 - 0.35, 1, z, 0.5, 2, d * 0.5, metal);
        TC.Physics.addBox(x - w / 2 + 0.35, z, 0.6, d * 0.5, 2, 0, 'shelf');
        TC.Physics.addBox(x + w / 2 - 0.35, z, 0.6, d * 0.5, 2, 0, 'shelf');
        // جعبه‌های قفسه
        for (let i = 0; i < 6; i++) {
          boxAt(x - w / 2 + 0.35, 0.5 + (i % 3) * 0.62, z - d * 0.18 + (i % 2) * d * 0.28, 0.4, 0.4, 0.4, wood);
        }
      } else if (kind === 'desks') {
        // دو میز اداری + صندلی
        for (const [dx2, dz2] of [[x - w * 0.22, z - d * 0.15], [x + w * 0.22, z + d * 0.15]]) {
          boxAt(dx2, 0.72, dz2, 1.6, 0.1, 0.8, wood);
          boxAt(dx2 - 0.7, 0.36, dz2, 0.12, 0.72, 0.7, metal);
          boxAt(dx2 + 0.7, 0.36, dz2, 0.12, 0.72, 0.7, metal);
          boxAt(dx2, 0.45, dz2 + 0.7, 0.5, 0.1, 0.5, wood);
          TC.Physics.addBox(dx2, dz2, 1.6, 0.9, 0.8, 0, 'desk');
        }
      } else if (kind === 'benches') {
        for (const [bx2, bz2] of [[x - w * 0.25, z + d * 0.3], [x + w * 0.25, z + d * 0.3]]) {
          boxAt(bx2, 0.45, bz2, 2, 0.1, 0.55, wood);
          boxAt(bx2, 0.25, bz2 - 0.2, 0.1, 0.4, 0.5, metal);
          boxAt(bx2, 0.25, bz2 + 0.2, 0.1, 0.4, 0.5, metal);
        }
      }
    }
    const merged = BABYLON.Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    if (merged) { merged.freezeWorldMatrix(); merged.isPickable = false; }
    return merged;
  };

  /* ================= جاده‌ها ================= */
  function scalePlaneUV(p, uRep, vRep) {
    const uv = p.getVerticesData(BABYLON.VertexBuffer.UVKind);
    for (let i = 0; i < uv.length; i += 2) { uv[i] *= uRep; uv[i + 1] *= vRep; }
    p.setVerticesData(BABYLON.VertexBuffer.UVKind, uv);
  }

  W.buildRoads = function () {
    const scene = TC.G.scene;
    const roadPieces = [], sidewalkPieces = [], dashPieces = [], edgePieces = [], crossPieces = [];
    const roadW = C.roadHalf * 2, swW = C.sidewalkW;
    // روی هر یال گراف جاده یک آسفالت
    for (const ek in TC.NAV.edgeSet) {
      const [i, j] = ek.split('_').map(Number);
      const a = TC.NAV.nodes[i], b = TC.NAV.nodes[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 1) continue;
      const ang = Math.atan2(dx, dz);
      const w = (a.x < -560 || a.x > 560 || a.z < -560 || a.z > 560 || b.x < -560 || b.x > 560 || b.z < -560 || b.z > 560) ? 17 : roadW;
      const p = BABYLON.MeshBuilder.CreatePlane('road', { width: w, height: len + w * 0.4 }, scene);
      scalePlaneUV(p, w / 10, (len + w * 0.4) / 10);
      p.rotation.x = Math.PI / 2;
      p.rotation.y = ang;
      p.position.set((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
      roadPieces.push(p);
      // خط‌ها فقط روی جاده‌های شهری
      if (w === roadW && len > 8) {
        const dash = BABYLON.MeshBuilder.CreatePlane('dash', { width: 0.35, height: len }, scene);
        scalePlaneUV(dash, 1, len / 12);
        dash.material = W.mats.laneDash;
        dash.rotation.x = Math.PI / 2; dash.rotation.y = ang;
        dash.position.set((a.x + b.x) / 2, 0.02, (a.z + b.z) / 2);
        dashPieces.push(dash);
        for (const s of [-1, 1]) {
          const ed = BABYLON.MeshBuilder.CreatePlane('edge', { width: 0.25, height: len }, scene);
          scalePlaneUV(ed, 1, len / 6);
          ed.material = W.mats.laneEdge;
          ed.rotation.x = Math.PI / 2; ed.rotation.y = ang;
          ed.position.set((a.x + b.x) / 2 + Math.cos(ang) * (roadW / 2 - 1.2) * s, 0.02, (a.z + b.z) / 2 - Math.sin(ang) * (roadW / 2 - 1.2) * s);
          edgePieces.push(ed);
        }
        // پیاده‌رو دو طرف
        for (const s of [-1, 1]) {
          const swp = BABYLON.MeshBuilder.CreatePlane('sw', { width: swW, height: len }, scene);
          scalePlaneUV(swp, 1.5, len / 4);
          swp.material = W.mats.sidewalk;
          swp.rotation.x = Math.PI / 2; swp.rotation.y = ang;
          swp.position.set((a.x + b.x) / 2 + Math.cos(ang) * (roadW / 2 + swW / 2) * s, 0.09, (a.z + b.z) / 2 - Math.sin(ang) * (roadW / 2 + swW / 2) * s);
          sidewalkPieces.push(swp);
          // جدول
          const curb = BABYLON.MeshBuilder.CreateBox('curb', { width: 0.35, height: 0.22, depth: len }, scene);
          curb.material = W.mats.concrete;
          curb.position.set((a.x + b.x) / 2 + Math.cos(ang) * (roadW / 2 + 0.15) * s, 0.12, (a.z + b.z) / 2 - Math.sin(ang) * (roadW / 2 + 0.15) * s);
          curb.freezeWorldMatrix();
          sidewalkPieces.push(curb);
        }
      }
    }
    // خط‌های عابر پیاده در تقاطع‌های شهری
    const N = C.cityBlocks;
    for (let i = 0; i <= N; i += 1) for (let j = 0; j <= N; j += 1) {
      if ((i + j) % 2 !== 0) continue;
      const x = TC.roadCoord(i), z = TC.roadCoord(j);
      for (const s of [-1, 1]) {
        const c1 = BABYLON.MeshBuilder.CreatePlane('cw', { width: 5, height: C.roadHalf * 2 - 3 }, scene);
        c1.material = W.mats.crosswalk;
        c1.rotation.x = Math.PI / 2;
        c1.position.set(x + (C.roadHalf + 2.6) * s, 0.03, z);
        crossPieces.push(c1);
        const c2 = BABYLON.MeshBuilder.CreatePlane('cw2', { width: C.roadHalf * 2 - 3, height: 5 }, scene);
        c2.material = W.mats.crosswalk;
        c2.rotation.x = Math.PI / 2;
        c2.position.set(x, 0.03, z + (C.roadHalf + 2.6) * s);
        crossPieces.push(c2);
      }
    }
    const mergeList = (arr, multi) => { const m = BABYLON.Mesh.MergeMeshes(arr, true, true, undefined, false, !!multi); if (m) { m.freezeWorldMatrix(); m.isPickable = false; } return m; };
    // آسفالت‌ها با متریال مشترک
    for (const p of roadPieces) p.material = W.mats.asphalt;
    mergeList(roadPieces);
    for (const p of sidewalkPieces) if (!p.material) p.material = W.mats.sidewalk;
    mergeList(sidewalkPieces, true);
    mergeList(dashPieces);
    mergeList(edgePieces);
    mergeList(crossPieces);
  };

  /* ================= بلوک‌های شهری ================= */
  W.buildBlocks = function () {
    const N = C.cityBlocks;
    M.resetSeed(1337);
    for (let bx = 0; bx < N; bx++) for (let bz = 0; bz < N; bz++) {
      const district = TC.districtAt(bx, bz);
      if (!district || district === 'park') continue;
      const c = TC.blockCenter(bx, bz);
      const inner = C.blockPitch - 2 * (C.roadHalf + C.sidewalkW); // 52
      W.blockContent(district, bx, bz, c.x, c.z, inner);
    }
  };

  W.blockContent = function (district, bx, bz, cx, cz, inner) {
    // رزرو لوت‌های نزدیک مکان‌های مهم — فقط ساختمانِ هم‌پوشان حذف می‌شود، نه کل بلوک
    const nearPOI = (x, z, r) => {
      for (const p of TC.G.pois) {
        if (p.type === 'race' || p.type === 'secret') continue;
        if (M.dist2(p.x, p.z, x, z) < r) return true;
      }
      return false;
    };
    switch (district) {
      case 'downtown': {
        for (const [ox, oz] of [[-13, -13], [13, 13], [13, -13], [-13, 13]]) {
          if (nearPOI(cx + ox, cz + oz, 20)) continue;
          const w = 18 + M.srand() * 6, d = 18 + M.srand() * 6;
          const h = 34 + M.srand() * 52;
          W.makeBuilding(cx + ox, cz + oz, w, d, h, M.srandInt(0, 1), { district });
        }
        break;
      }
      case 'commercial': {
        for (const [ox, oz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
          if (nearPOI(cx + ox, cz + oz, 20)) continue;
          const w = 17 + M.srand() * 5, d = 17 + M.srand() * 5;
          const h = 11 + M.srand() * 14;
          W.makeBuilding(cx + ox, cz + oz, w, d, h, M.srandInt(2, 5), { district, shopFront: M.srandInt(0, 5) });
        }
        break;
      }
      case 'residential': {
        for (const [ox, oz] of [[-13, -12], [13, 12], [0, 0]]) {
          if (nearPOI(cx + ox, cz + oz, 20)) continue;
          const w = 15 + M.srand() * 7, d = 14 + M.srand() * 7;
          const h = 8 + M.srand() * 8;
          W.makeBuilding(cx + ox, cz + oz, w, d, h, M.srandInt(2, 5), { district });
        }
        break;
      }
      case 'slums': {
        for (let i = 0; i < 5; i++) {
          const ox = (M.srand() - 0.5) * 36, oz = (M.srand() - 0.5) * 36;
          if (nearPOI(cx + ox, cz + oz, 15)) continue;
          const w = 8 + M.srand() * 7, d = 8 + M.srand() * 7;
          W.makeBuilding(cx + ox, cz + oz, w, d, 5.5 + M.srand() * 4, M.srandPick([4, 7, 5]), { district });
        }
        break;
      }
      case 'luxury': {
        // ویلای بزرگ با حصار و استخر — فقط اگر بلوک کاملاً آزاد باشد
        if (nearPOI(cx, cz, 34)) break;
        const villa = W.makeBuilding(cx, cz, 26, 22, 8.5, 3, { district });
        const wall = BABYLON.MeshBuilder.CreateBox('vwall', { width: inner, height: 1.6, depth: inner }, TC.G.scene);
        wall.material = W.mats.stone;
        wall.position.set(cx, 0.8, cz);
        wall.isPickable = false;
        wall.freezeWorldMatrix();
        // حصار توخالی: ۴ دیوار جدا
        wall.dispose();
        for (const [ww, dd, ox, oz] of [[inner, 0.4, 0, -inner / 2], [inner, 0.4, 0, inner / 2], [0.4, inner, -inner / 2, 0], [0.4, inner, inner / 2, 0]]) {
          const seg = BABYLON.MeshBuilder.CreateBox('vw', { width: ww, height: 1.7, depth: dd }, TC.G.scene);
          seg.material = W.mats.stone;
          seg.position.set(cx + ox, 0.85, cz + oz);
          seg.freezeWorldMatrix(); seg.isPickable = false;
          TC.Physics.addBox(cx + ox, cz + oz, ww, dd, 1.7, 0, 'wall');
        }
        // استخر
        const pool = BABYLON.MeshBuilder.CreateBox('pool', { width: 9, height: 0.3, depth: 6 }, TC.G.scene);
        pool.material = W.mats.water;
        pool.position.set(cx - 17, 0.2, cz);
        pool.freezeWorldMatrix(); pool.isPickable = false;
        break;
      }
      case 'industrial': {
        if (nearPOI(cx, cz, 40)) break;
        W.makeBuilding(cx, cz, 42, 34, 13, 0, { district });
        // مخزن و دودکش
        for (let i = 0; i < 2; i++) {
          const tank = BABYLON.MeshBuilder.CreateCylinder('tank', { diameter: 9, height: 10, tessellation: 12 }, TC.G.scene);
          tank.material = W.mats.metal;
          tank.position.set(cx + 28 + i * 12, 5, cz - 10);
          tank.freezeWorldMatrix(); tank.isPickable = false;
          TC.Physics.addBox(cx + 28 + i * 12, cz - 10, 9, 9, 10, 0, 'tank');
        }
        const chim = BABYLON.MeshBuilder.CreateCylinder('chim', { diameter: 2.4, height: 26, tessellation: 8 }, TC.G.scene);
        chim.material = W.mats.concrete;
        chim.position.set(cx - 26, 13, cz + 12);
        chim.freezeWorldMatrix(); chim.isPickable = false;
        TC.Physics.addBox(cx - 26, cz + 12, 2.4, 2.4, 26, 0, 'chimney');
        break;
      }
      case 'security': {
        if (nearPOI(cx, cz, 30)) break;
        W.makeBuilding(cx, cz, 24, 24, 26 + M.srand() * 20, 6, { district });
        break;
      }
    }
  };

  /* ================= مکان‌های مهم (POI) ================= */
  W.buildLandmarks = function () {
    const scene = TC.G.scene;
    const N = C.cityBlocks;
    const bc = TC.blockCenter;
    // --- خانه بازیکن (شهرک آفتاب) ---
    const home = bc(3, 10);
    const homeRoom = W.makeRoom({ x: home.x, z: home.z, w: 18, d: 14, h: 3.8, doorSide: 's', name: 'home', wallMat: W.mats.stone, flatRoof: false });
    TC.addPOI('home', home.x, home.z + 9, 'خانه آرش');
    W.makeSign(home.x, 4.4, home.z + 7.4, 0, '🏠', 'خانه آرش', '#f5b301');
    TC.World.playerHome = { x: home.x, z: home.z, room: homeRoom };
    // --- بانک مرکزی (مرکز شهر) ---
    const bank = bc(6, 6);
    const bankRoom = W.makeRoom({ x: bank.x, z: bank.z, w: 22, d: 16, h: 4.2, doorSide: 's', name: 'bank', wallMat: W.mats.concrete });
    TC.addPOI('bank', bank.x, bank.z + 10, 'بانک مرکزی طوفان');
    W.makeSign(bank.x, 4.8, bank.z + 8.4, 0, '🏦', 'بانک طوفان', '#29c9e8');
    TC.World.bankRoom = bankRoom;
    W.furnishRoom(bankRoom, ['counter', 'desks']);
    W.makeBuilding(bank.x, bank.z - 18, 22, 10, 22, 6, { noCollider: false, district: 'downtown' });
    // --- بیمارستان ---
    const hosp = bc(8, 7);
    const hospRoom = W.makeRoom({ x: hosp.x, z: hosp.z, w: 22, d: 16, h: 4.2, doorSide: 'n', name: 'hospital', wallMat: W.mats.concrete });
    TC.addPOI('hospital', hosp.x, hosp.z - 10, 'بیمارستان مهر');
    W.makeSign(hosp.x, 4.8, hosp.z - 8.4, Math.PI, '🏥', 'بیمارستان مهر', '#ff6b81');
    TC.World.hospitalRoom = hospRoom;
    W.furnishRoom(hospRoom, ['counter', 'benches']);
    // --- اداره پلیس (منطقه امنیتی شرق) ---
    const half = (N * C.blockPitch) / 2;
    const polX = half + 66, polZ = 30;
    const polRoom = W.makeRoom({ x: polX, z: polZ, w: 26, d: 18, h: 4.4, doorSide: 'w', name: 'police', wallMat: W.mats.stone });
    TC.addPOI('police', polX - 15, polZ, 'اداره پلیس مرکزی');
    W.makeSign(polX - 13.6, 4.8, polZ, -Math.PI / 2, '🚓', 'پلیس طوفان', '#4d8dff');
    TC.World.policeRoom = polRoom;
    W.furnishRoom(polRoom, ['desks', 'counter']);
    // --- زندان (کنار پلیس) ---
    const priX = half + 70, priZ = 150;
    TC.addPOI('prison', priX - 26, priZ, 'زندان مرکزی طوفان');
    TC.World.prisonSite = { x: priX, z: priZ };
    // --- نمایشگاه‌های خودرو (۶ عدد) ---
    const dealers = [
      { type: 'economy', bx: 5, bz: 6, name: 'نمایشگاه پرشین موتورز', rot: 0 },
      { type: 'sports', bx: 8, bz: 3, name: 'نمایشگاه سرعت طوفان', rot: 0 },
      { type: 'luxury', bx: 2, bz: 10, name: 'نمایشگاه رویال کار', rot: Math.PI },
      { type: 'suv', bx: 10, bz: 8, name: 'نمایشگاه آفرود پارس', rot: 0 },
      { type: 'moto', bx: 6, bz: 9, name: 'گالری موتورسیکلت', rot: 0 },
      { type: 'heavy', bx: 11, bz: 2, name: 'بازار خودروهای سنگین', rot: 0 },
    ];
    TC.World.dealers = [];
    for (const dl of dealers) {
      const c = bc(dl.bx, dl.bz);
      const room = W.makeRoom({ x: c.x, z: c.z, w: 24, d: 18, h: 5.2, doorSide: 's', name: 'dealer_' + dl.type, wallMat: W.mats.metal, flatRoof: false });
      TC.addPOI('dealership', c.x, c.z + 11, dl.name, { dealerType: dl.type });
      W.makeSign(c.x, 5.8, c.z + 9.4, 0, '🚗', 'نمایشگاه خودرو', '#e89ee8');
      TC.World.dealers.push({ type: dl.type, name: dl.name, x: c.x, z: c.z, room });
    }
    // --- فروشگاه‌ها ---
    const shops = [
      { type: 'shop_rest', bx: 8, bz: 6, name: 'رستوران بهار', icon: '🍽️' },
      { type: 'shop_food', bx: 5, bz: 3, name: 'فست‌فود برگر شاه', icon: '🍔' },
      { type: 'shop_cafe', bx: 6, bz: 8, name: 'کافی‌شاپ دونه', icon: '☕' },
      { type: 'shop_cloth', bx: 4, bz: 7, name: 'بوتیک ستاره', icon: '👕' },
      { type: 'shop_equip', bx: 12, bz: 12, name: 'فروشگاه تجهیزات کوی', icon: '🛒' },
      { type: 'shop_gun', bx: 11, bz: 4, name: 'اسلحه‌فروشی مرز', icon: '🔫' },
      { type: 'shop_market', bx: 4, bz: 9, name: 'سوپرمارکت آفتاب', icon: '🏪' },
      { type: 'hotel', bx: 7, bz: 4, name: 'هتل آسمان', icon: '🏨' },
      { type: 'estate', bx: 7, bz: 8, name: 'مشاور املاک پارس', icon: '🏘️' },
      { type: 'taxi', bx: 11, bz: 11, name: 'شرکت تاکسی‌رانی طوفان', icon: '🚕' },
    ];
    TC.World.shops = [];
    for (const sh of shops) {
      const c = bc(sh.bx, sh.bz);
      const room = W.makeRoom({ x: c.x, z: c.z, w: 16, d: 13, h: 3.8, doorSide: 's', name: 'shop_' + sh.type, wallMat: W.mats.concrete });
      TC.addPOI(sh.type, c.x, c.z + 8.5, sh.name);
      W.makeSign(c.x, 4.4, c.z + 6.9, 0, sh.icon, sh.name, '#ffb84d');
      TC.World.shops.push({ type: sh.type, name: sh.name, x: c.x, z: c.z, room });
    }
    // --- تعمیرگاه و پمپ بنزین ---
    const rep = bc(9, 6);
    W.makeRoom({ x: rep.x, z: rep.z, w: 18, d: 14, h: 4.6, doorSide: 's', name: 'repair', wallMat: W.mats.metal, flatRoof: false });
    TC.addPOI('repair', rep.x, rep.z + 9, 'تعمیرگاه مکانیک حسن');
    W.makeSign(rep.x, 5, rep.z + 7.4, 0, '🔧', 'تعمیرگاه', '#c8ccd8');
    const gas1 = TC.roadCoord(2), gas2 = TC.roadCoord(12), gas3 = 0, gas3z = -((N * C.blockPitch) / 2) - 60;
    W.buildGasStation(gas1 - 26, TC.roadCoord(6) + 4, 0);
    W.buildGasStation(gas2 + 26, TC.roadCoord(4) - 4, Math.PI);
    W.buildGasStation(gas3, gas3z, 0);
    // --- ایستگاه قطار ---
    const train = bc(4, 5);
    W.makeBuilding(train.x, train.z, 34, 14, 9, 2, { district: 'commercial' });
    TC.addPOI('train', train.x, train.z + 9, 'ایستگاه قطار طوفان');
    W.makeSign(train.x, 5, train.z + 7.4, 0, '🚆', 'ایستگاه قطار', '#a8a8b8');
    // --- پارکینگ عمومی ---
    const pk = bc(7, 7);
    TC.addPOI('parking', pk.x, pk.z, 'پارکینگ مرکزی');
    for (let i = 0; i < 5; i++) W.parkingLine(pk.x - 10 + i * 5, pk.z, 0);
    // --- دفاتر استخدام (job) ---
    const jobs = [
      { type: 'police', x: polX - 16, z: polZ + 14, name: 'استخدام پلیس', icon: '🚓' },
      { type: 'taxi', x: bc(11, 11).x - 9, z: bc(11, 11).z + 8, name: 'استخدام تاکسی', icon: '🚕' },
      { type: 'ride', x: bc(11, 11).x + 9, z: bc(11, 11).z + 8, name: 'استخدام تاکسی اینترنتی', icon: '📱' },
      { type: 'courier', x: bc(9, 5).x, z: bc(9, 5).z + 8, name: 'استخدام پیک موتوری', icon: '🏍️' },
      { type: 'carcourier', x: bc(9, 5).x + 14, z: bc(9, 5).z + 8, name: 'استخدام پیک خودرو', icon: '🚙' },
      { type: 'banker', x: bank.x - 14, z: bank.z + 10, name: 'استخدام کارمند بانک', icon: '🏦' },
      { type: 'guard', x: priX - 26, z: priZ - 26, name: 'استخدام نگهبان زندان', icon: '⛓️' },
      { type: 'waiter', x: bc(8, 6).x - 10, z: bc(8, 6).z + 8, name: 'استخدام رستوران', icon: '🍽️' },
      { type: 'truck', x: bc(12, 3).x, z: bc(12, 3).z + 9, name: 'استخدام راننده کامیون', icon: '🚛' },
      { type: 'factory', x: bc(12, 1).x, z: bc(12, 1).z + 9, name: 'استخدام کارگر کارخانه', icon: '🏭' },
      { type: 'security', x: bc(2, 11).x, z: bc(2, 11).z + 9, name: 'استخدام نگهبان ساختمان', icon: '🛡️' },
      { type: 'bus', x: bc(8, 9).x, z: bc(8, 9).z + 9, name: 'استخدام راننده اتوبوس', icon: '🚌' },
    ];
    TC.World.jobOffices = [];
    for (const j of jobs) {
      const room = W.makeRoom({ x: j.x, z: j.z - 9, w: 13, d: 10, h: 3.6, doorSide: 's', name: 'job_' + j.type, wallMat: W.mats.concrete });
      TC.addPOI('job', j.x, j.z + 1, j.name, { jobType: j.type });
      W.makeSign(j.x, 4.2, j.z - 3.4, 0, j.icon, 'استخدام', '#35d073');
      TC.World.jobOffices.push({ type: j.type, name: j.name, x: j.x, z: j.z, room });
    }
    // --- فرودگاه ---
    const airX = half + 46 + 210, airZ = -70;
    W.buildAirport(airX, airZ);
    // --- بندر ---
    W.buildHarbor(-half - 76, (N * C.blockPitch) / 2 + 90);
    // --- استادیوم کوچک؟ نه — کلوپ شبانه ---
    const club = bc(9, 3);
    W.makeBuilding(club.x, club.z, 20, 16, 10, 1, { district: 'commercial', shopFront: 5 });
    TC.addPOI('club', club.x, club.z + 10, 'کلوپ شبانه آتش');
    W.makeSign(club.x, 5, club.z + 8.4, 0, '🎯', 'کلوپ آتش', '#e84da8');
    // --- مسابقه (شروع در حاشیه پارک) ---
    const race = bc(2, 5);
    TC.addPOI('race', race.x, race.z, 'مسابقه خیابانی پارک', { raceStart: true });
    // --- مکان‌های مخفی ---
    W.secretSpots = [
      { x: -half - 90, z: -200, reward: 2500, name: 'صندوق ساحل غربی' },
      { x: half + 130, z: 320, reward: 3000, name: 'انبار متروکه شرقی' },
      { x: -340, z: -(half + 250), reward: 2800, name: 'کلبه جنگل' },
      { x: 640, z: 800, reward: 3500, name: 'غار کوهستان' },
      { x: 300, z: 900, reward: 2200, name: 'کشتی به‌گل‌نشسته' },
    ];
    for (const s of W.secretSpots) {
      TC.addPOI('secret', s.x, s.z, s.name, { reward: s.reward, found: false });
      const chest = BABYLON.MeshBuilder.CreateBox('chest', { width: 1.2, height: 0.9, depth: 0.8 }, scene);
      chest.material = W.mats.wood;
      chest.position.set(s.x, 0.45, s.z);
      chest.freezeWorldMatrix();
    }
  };

  W.buildGasStation = function (x, z, rot) {
    const scene = TC.G.scene;
    // کانوپی
    const canopy = BABYLON.MeshBuilder.CreateBox('gasCanopy', { width: 16, height: 0.5, depth: 10 }, scene);
    canopy.material = W.mats.metal;
    canopy.position.set(x, 4.6, z);
    canopy.freezeWorldMatrix();
    for (const [px, pz] of [[x - 6, z], [x + 6, z]]) {
      const col = BABYLON.MeshBuilder.CreateCylinder('gasCol', { diameter: 0.5, height: 4.6 }, scene);
      col.material = W.mats.metal;
      col.position.set(px, 2.3, pz);
      col.freezeWorldMatrix();
    }
    // پمپ‌ها
    for (const s of [-1, 1]) {
      const pump = BABYLON.MeshBuilder.CreateBox('pump', { width: 0.9, height: 1.6, depth: 0.6 }, scene);
      pump.material = W.mats.concrete;
      pump.position.set(x + s * 3, 0.8, z);
      pump.freezeWorldMatrix();
      TC.Physics.addBox(x + s * 3, z, 0.9, 0.6, 1.6, 0, 'pump');
    }
    TC.addPOI('gas', x, z + 8, 'پمپ بنزین طوفان');
    W.makeSign(x, 5.6, z + 6, rot === 0 ? 0 : Math.PI, '⛽', 'پمپ بنزین', '#4dc9ff');
    // فروشگاه کوچک
    W.makeRoom({ x: x + 14, z: z + 4, w: 10, d: 8, h: 3.4, doorSide: 'w', name: 'gasShop', wallMat: W.mats.concrete });
  };

  W.buildAirport = function (x, z) {
    const scene = TC.G.scene;
    // ترمینال
    const term = W.makeRoom({ x: x + 40, z: z, w: 44, d: 24, h: 6.5, doorSide: 'w', name: 'terminal', wallMat: W.mats.metal, flatRoof: false });
    TC.addPOI('airportPoi', x + 12, z, 'ترمینال فرودگاه آرش');
    W.makeSign(x + 14, 5.4, z - 4, -Math.PI / 2, '✈️', 'فرودگاه آرش', '#d8d8e8');
    // باند
    const runway = BABYLON.MeshBuilder.CreateGround('runway', { width: 60, height: 320 }, scene);
    scalePlaneUV(runway, 6, 32);
    runway.material = W.mats.asphalt;
    runway.position.set(x, 0.01, z + 30);
    runway.freezeWorldMatrix();
    // خط باند
    for (let i = 0; i < 14; i++) {
      const l = BABYLON.MeshBuilder.CreatePlane('rwl', { width: 2, height: 12 }, scene);
      l.material = W.mats.laneEdge;
      l.rotation.x = Math.PI / 2;
      l.position.set(x, 0.03, z - 100 + i * 22);
      l.freezeWorldMatrix();
    }
    // برج مراقبت
    const tower = BABYLON.MeshBuilder.CreateCylinder('tower', { diameterTop: 7, diameterBottom: 5, height: 24, tessellation: 10 }, scene);
    tower.material = W.mats.concrete;
    tower.position.set(x + 44, 12, z - 34);
    tower.freezeWorldMatrix();
    TC.Physics.addBox(x + 44, z - 34, 6, 6, 24, 0, 'tower');
    const top = BABYLON.MeshBuilder.CreateCylinder('towerTop', { diameter: 9, height: 4, tessellation: 10 }, scene);
    top.material = W.mats.glass;
    top.position.set(x + 44, 26, z - 34);
    top.freezeWorldMatrix();
    // آشیانه
    W.makeRoom({ x: x - 30, z: z - 60, w: 30, d: 22, h: 8, doorSide: 'e', name: 'hangar', wallMat: W.mats.metal, flatRoof: false });
    TC.World.airport = { x, z, runway: { x, z: z + 30, w: 60, d: 320 } };
  };

  W.buildHarbor = function (x, z) {
    const scene = TC.G.scene;
    // اسکله
    const dock = BABYLON.MeshBuilder.CreateBox('dock', { width: 60, height: 1.2, depth: 30 }, scene);
    dock.material = W.mats.wood;
    dock.position.set(x, 0.4, z + 10);
    dock.freezeWorldMatrix();
    // کانتینرها
    const contColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad'];
    let cm = [];
    for (let i = 0; i < 14; i++) {
      const c = BABYLON.MeshBuilder.CreateBox('cont', { width: 6, height: 2.6, depth: 2.6 }, scene);
      const mm = new BABYLON.StandardMaterial('contM' + i, scene);
      mm.diffuseColor = BABYLON.Color3.FromHexString(contColors[i % 5]);
      mm.specularColor = BABYLON.Color3.Black();
      mm.freeze();
      c.material = mm;
      c.position.set(x - 22 + (i % 5) * 10, 1.3 + Math.floor(i / 5) * 2.6, z - 8);
      c.freezeWorldMatrix();
      cm.push(c);
      if (Math.floor(i / 5) === 0) TC.Physics.addBox(c.position.x, c.position.z, 6, 2.6, 5.2, 0, 'container');
    }
    const mergedC = BABYLON.Mesh.MergeMeshes(cm, true, true, undefined, false, true);
    if (mergedC) mergedC.freezeWorldMatrix();
    // جرثقیل
    const crLeg1 = BABYLON.MeshBuilder.CreateBox('cr1', { width: 1.4, height: 18, depth: 1.4 }, scene);
    crLeg1.material = W.mats.metal; crLeg1.position.set(x + 16, 9, z - 2); crLeg1.freezeWorldMatrix();
    const crLeg2 = crLeg1.clone('cr2'); crLeg2.position.set(x + 24, 9, z - 2); crLeg2.freezeWorldMatrix();
    const crArm = BABYLON.MeshBuilder.CreateBox('crArm', { width: 2, height: 1.2, depth: 30 }, scene);
    crArm.material = W.mats.metal; crArm.position.set(x + 20, 19, z - 12); crArm.freezeWorldMatrix();
    TC.Physics.addBox(x + 16, z - 2, 1.4, 1.4, 18, 0, 'crane');
    TC.Physics.addBox(x + 24, z - 2, 1.4, 1.4, 18, 0, 'crane');
    // انبار
    W.makeRoom({ x: x - 40, z: z - 30, w: 26, d: 18, h: 7, doorSide: 'e', name: 'harborWarehouse', wallMat: W.mats.metal, flatRoof: false });
    TC.World.harbor = { x, z, dock: { x, z: z + 10, w: 60, d: 30 } };
    TC.addPOI('parking', x - 20, z + 30, 'اسکله قایق‌ها');
  };

  W.parkingLine = function (x, z, rot) {
    const scene = TC.G.scene;
    const line = BABYLON.MeshBuilder.CreatePlane('pLine', { width: 0.2, height: 5 }, scene);
    line.material = W.mats.laneEdge;
    line.rotation.x = Math.PI / 2;
    line.rotation.y = rot;
    line.position.set(x, 0.02, z);
    line.freezeWorldMatrix();
  };

  /* ================= طبیعت: زمین، دریا، ساحل، کوه، پارک ================= */
  W.buildNature = function () {
    const scene = TC.G.scene;
    const N = C.cityBlocks, half = (N * C.blockPitch) / 2;
    // زمین پایه
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 5200, height: 5200 }, scene);
    ground.material = W.mats.grass;
    ground.position.y = -0.06;
    ground.receiveShadows = true;
    ground.freezeWorldMatrix();
    W.ground = ground;
    // خاک اطراف شهر
    const apron = BABYLON.MeshBuilder.CreateGround('apron', { width: 1500, height: 1500 }, scene);
    apron.material = W.mats.dirt;
    apron.position.set(half + 800, -0.04, 0); // فقط شرق شهر — زیر شهر نیاید
    apron.freezeWorldMatrix();
    // ساحل غرب و جنوب
    const beachW = BABYLON.MeshBuilder.CreateGround('beachW', { width: 130, height: half * 2 + 400 }, scene);
    beachW.material = W.mats.sand;
    beachW.position.set(-half - 100, 0.02, 100);
    beachW.freezeWorldMatrix();
    const beachS = BABYLON.MeshBuilder.CreateGround('beachS', { width: half * 2 + 500, height: 120 }, scene);
    beachS.material = W.mats.sand;
    beachS.position.set(0, 0.02, half + 110);
    beachS.freezeWorldMatrix();
    // دریا
    const seaW = BABYLON.MeshBuilder.CreateGround('seaW', { width: 2400, height: 3000 }, scene);
    seaW.material = W.mats.water;
    seaW.position.set(-half - 900, C.waterLevel, 200);
    seaW.freezeWorldMatrix();
    const seaS = BABYLON.MeshBuilder.CreateGround('seaS', { width: 3000, height: 2400 }, scene);
    seaS.material = W.mats.water;
    seaS.position.set(-200, C.waterLevel, half + 1000);
    seaS.freezeWorldMatrix();
    W.seaMeshes = [seaW, seaS];
    // کوه‌های جنوب شرقی
    const mts = [];
    for (let i = 0; i < 14; i++) {
      const mx = half + 150 + M.srand() * 700;
      const mz = half + 180 + M.srand() * 700;
      const h = 60 + M.srand() * 140;
      const r = 60 + M.srand() * 90;
      const cone = BABYLON.MeshBuilder.CreateCylinder('mt', { diameterTop: 0.5, diameterBottom: r * 2, height: h, tessellation: 9 }, scene);
      const mm = new BABYLON.StandardMaterial('mtM' + i, scene);
      mm.diffuseColor = BABYLON.Color3.FromHexString(M.srand() < 0.5 ? '#8a7a66' : '#7a6a58');
      mm.specularColor = BABYLON.Color3.Black();
      mm.freeze();
      cone.material = mm;
      cone.position.set(mx, h / 2, mz);
      cone.freezeWorldMatrix();
      mts.push(cone);
      // برف قله
      if (h > 120) {
        const snow = BABYLON.MeshBuilder.CreateCylinder('snow', { diameterTop: 0.5, diameterBottom: r * 0.55, height: h * 0.25, tessellation: 9 }, scene);
        const sm = new BABYLON.StandardMaterial('snowM', scene);
        sm.diffuseColor = new BABYLON.Color3(0.95, 0.97, 1);
        sm.specularColor = BABYLON.Color3.Black();
        sm.freeze();
        snow.material = sm;
        snow.position.set(mx, h * 0.875, mz);
        snow.freezeWorldMatrix();
        mts.push(snow);
      }
      TC.Physics.addBox(mx, mz, r * 1.3, r * 1.3, h, 0, 'mountain');
    }
    const mtMerged = BABYLON.Mesh.MergeMeshes(mts, true, true, undefined, false, true);
    if (mtMerged) mtMerged.freezeWorldMatrix();
    // برکه پارک
    const parkC = TC.blockCenter(2, 1);
    const pond = BABYLON.MeshBuilder.CreateGround('pond', { width: 22, height: 16 }, scene);
    pond.material = W.mats.water;
    pond.position.set(parkC.x, 0.03, parkC.z);
    pond.freezeWorldMatrix();
    // آسمان
    const sky = BABYLON.MeshBuilder.CreateSphere('skyDome', { diameter: 2400, segments: 24 }, scene);
    sky.material = W.mats.sky;
    sky.isPickable = false;
    sky.applyFog = false;
    sky.freezeWorldMatrix();
    W.skyDome = sky;
    // خورشید و ماه
    W.sunDisc = BABYLON.MeshBuilder.CreateSphere('sunDisc', { diameter: 60, segments: 8 }, scene);
    const sunM = new BABYLON.StandardMaterial('sunM', scene);
    sunM.emissiveColor = new BABYLON.Color3(1, 0.92, 0.6);
    sunM.disableLighting = true;
    sunM.freeze();
    W.sunDisc.material = sunM;
    W.sunDisc.applyFog = false;
    W.moonDisc = BABYLON.MeshBuilder.CreateSphere('moonDisc', { diameter: 34, segments: 8 }, scene);
    const moonM = new BABYLON.StandardMaterial('moonM', scene);
    moonM.emissiveColor = new BABYLON.Color3(0.85, 0.88, 1);
    moonM.disableLighting = true;
    moonM.freeze();
    W.moonDisc.material = moonM;
    W.moonDisc.applyFog = false;
    // بویه دریا برای قایق‌ها
    TC.World.boatSpots = [
      { x: -half - 200, z: 0 }, { x: -half - 240, z: 320 }, { x: -300, z: half + 240 },
    ];
  };

  /* ================= اجرای ساخت ================= */
  W.build = function () {
    W.buildTextures();
    W.buildMaterials();
    TC.NAV.build();
    W.buildNature();
    W.buildRoads();
    W.buildLandmarks(); // اول POIها ثبت می‌شوند تا بلوک‌های اطرافشان رزرو شود
    W.buildBlocks();
    if (TC.Props) TC.Props.build();
    console.log('[Toofan] جهان ساخته شد — ساختمان‌ها:', W.buildings.length, 'POI:', TC.G.pois.length);
  };

  /* ================= ذخیره/بازیابی وضعیت جهان ================= */
  W.serialize = function () {
    return { secrets: TC.poiByType('secret').map(p => ({ id: p.id, found: !!p.found })) };
  };
  W.deserialize = function (data) {
    if (!data || !data.secrets) return;
    for (const s of data.secrets) {
      const poi = TC.G.pois.find(p => p.id === s.id);
      if (poi) poi.found = s.found;
    }
  };

  TC.World = W;
})();
