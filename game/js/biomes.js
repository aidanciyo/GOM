/* Barrios: definicion, cielos, parallax, clima e iluminacion */
'use strict';

G.Biomes = (() => {
  const DEF = {
    sunset: {
      id: 'sunset', name: 'AVENIDA ATARDECER', music: 'sunset',
      sky: ['#ff6f3c', '#ff8c45', '#ffae5c', '#ffd27a', '#ffe7a3'],
      sun: { x: 0.56, dy: -58, r: 27, color: '#fff4c2', rim: '#ffd36b', glow: '#ffb347' },
      rays: { color: '#ffe6a8', alpha: 0.22 },
      clouds: { n: 5, light: '#ffe8c0', mid: '#ffc78f', dark: '#f4a07a', y0: 20, y1: 76, streaks: 5,
        streakCol: { light: '#ffd9b0', mid: '#ff9f86' } },
      far: { color: '#c77a86', top: '#d68e8e', win: '#ffe0a0', p: 0.06, hmin: 36, hmax: 84, style: 'city' },
      mid: { color: '#9a4f6e', top: '#b0617c', win: '#ffd38a', p: 0.09, hmin: 22, hmax: 62, style: 'mixed' },
      haze: '#ffcf8a',
      night: 0.1, nightColor: '#2a0c2a', emissive: 0.45,
      road: { asphalt: '#4d4655', asphalt2: '#453e4d', speck: '#5a5262', line: '#f4efe4', center: '#f5c542',
        curbTop: '#d9d0d6', curbFace: '#9d93a3', walk: '#c7b3a3', walk2: '#b8a494', joint: '#a08e80', walkBot: '#bda998' },
      facade: 'suburb', rain: 0, lightning: false, stars: 0,
    },
    neon: {
      id: 'neon', name: 'DISTRITO NEÓN', music: 'neon',
      sky: ['#05040f', '#0c0a24', '#1a1040', '#35145a', '#5a1e6a'],
      moon: { x: 0.78, y: 34, r: 11 },
      clouds: { n: 5, light: '#3a2a66', mid: '#2a1f52', dark: '#1d163c', y0: 20, y1: 70 },
      far: { color: '#1c1a3e', top: '#262452', win: '#8a7cff', p: 0.22, hmin: 60, hmax: 130, style: 'tower' },
      mid: { color: '#141230', top: '#1e1b44', win: '#ffd66b', p: 0.3, hmin: 40, hmax: 105, style: 'tower' },
      haze: '#7a2a8a',
      night: 0.5, nightColor: '#05030f', emissive: 1,
      road: { asphalt: '#2c2a3a', asphalt2: '#272535', speck: '#34324a', line: '#cfcde0', center: '#d9ad38',
        curbTop: '#5a5672', curbFace: '#3a364e', walk: '#3d3952', walk2: '#36324a', joint: '#2c2940', walkBot: '#3a364f' },
      facade: 'downtown', rain: 1, lightning: false, stars: 90, wet: true,
    },
    storm: {
      id: 'storm', name: 'COSTA TORMENTA', music: 'storm',
      sky: ['#101c28', '#1a2c3c', '#27404f', '#395563', '#5a7682'],
      clouds: { n: 11, light: '#55707f', mid: '#3a5061', dark: '#26374a', y0: -6, y1: 56, storm: true },
      far: { color: '#2b3f4c', top: '#35505e', win: '#ffd98a', p: 0.03, hmin: 16, hmax: 40, style: 'cliff' },
      mid: null,
      sea: { deep: '#123846', mid: '#1d5364', light: '#3f8494', foam: '#cfeef2' },
      haze: '#6f8a96',
      night: 0.4, nightColor: '#06121a', emissive: 0.85,
      road: { asphalt: '#3b4148', asphalt2: '#353b42', speck: '#474d55', line: '#e2e6e8', center: '#e6c255',
        curbTop: '#b8b0a0', curbFace: '#827a6c', walk: '#a57c55', walk2: '#936c48', joint: '#6e5036', walkBot: '#b39a78', sand: '#d8c08c' },
      facade: 'coast', rain: 0.75, lightning: true, stars: 0, wet: true, wind: true,
    },
  };
  const ORDER = ['sunset', 'neon', 'storm'];

  // ------------------------------------------------------------ primitivas pixel
  function fill(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function circle(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const hw = Math.floor(Math.sqrt(r * r - y * y) + 0.35);
      c.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }
  function ellipse(c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) + 0.3);
      c.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
    }
  }

  // degradado en bandas con tramado 2x2 (look 16 bits)
  function bandedGradient(c, x0, y0, w, h, colors, bands) {
    const cols = colors.map(G.hex);
    const n = bands || 14;
    const colorAt = (t) => {
      const f = t * (cols.length - 1);
      const i = Math.min(cols.length - 2, Math.floor(f));
      return G.mix(cols[i], cols[i + 1], f - i);
    };
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1);
      const band = t * n;
      const bi = Math.floor(band);
      const frac = band - bi;
      const cA = G.rgbStr(colorAt(Math.min(1, bi / n)));
      const cB = G.rgbStr(colorAt(Math.min(1, (bi + 1) / n)));
      if (frac > 0.72) {
        // fila de tramado: alterna pixeles A/B
        c.fillStyle = cA; c.fillRect(x0, y0 + y, w, 1);
        c.fillStyle = cB;
        for (let x = (y & 1); x < w; x += 2) c.fillRect(x0 + x, y0 + y, 1, 1);
      } else {
        c.fillStyle = cA; c.fillRect(x0, y0 + y, w, 1);
      }
    }
  }

  // ------------------------------------------------------------ capas por barrio
  const layers = {};   // id -> {sky, far, mid, clouds:[...], stars:[...]}

  function makeCloud(rng, w, h, cl, streak) {
    const c = G.makeCanvas(w + 6, h + 6);
    const x = c.ctx;
    if (streak) {
      // nube alargada iluminada por el sol (cirros de atardecer)
      ellipse(x, (w + 6) / 2, h / 2 + 3, w / 2, Math.max(1, h / 2), cl.mid);
      ellipse(x, (w + 6) / 2 - 3, h / 2 + 2, w / 2 - 6, Math.max(1, h / 2 - 1), cl.light);
      return c;
    }
    const base = Math.round(h * 0.82);
    const blobs = [];
    const n = Math.max(3, Math.floor(w / 10));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bx = 5 + (w - 6) * t;
      const r = Math.max(3, Math.round(h * (0.28 + 0.42 * Math.sin(t * Math.PI)) + rng.range(-2, 2)));
      blobs.push([bx, base - r * 0.55, r]);
    }
    const layer = (dx, dy, shrink, col) => {
      blobs.forEach(([bx, by, r]) => circle(x, bx + dx, by + dy, Math.max(1, r - shrink), col));
      ellipse(x, (w + 6) / 2 + dx, base - 2 + dy, w / 2 - shrink, Math.max(2, Math.round(h * 0.18)), col);
    };
    layer(0, 2, 0, cl.dark);
    layer(0, 0, 1, cl.mid);
    layer(-2, -2, 4, cl.light);
    // base plana
    x.clearRect(0, base + 3, w + 6, h);
    return c;
  }

  function skyline(rng, tileW, H, spec, far) {
    const c = G.makeCanvas(tileW, H);
    const x = c.ctx;
    const put = (bx, bw, bh) => {
      for (const off of [0, -tileW, tileW]) {
        const X = bx + off;
        if (X > tileW || X + bw < 0) continue;
        const top = H - bh;
        if (spec.style === 'cliff') continue;
        fill(x, X, top, bw, bh, spec.color);
        fill(x, X, top, bw, 1, spec.top);
        fill(x, X, top, 1, bh, spec.top);
        // tejados y antenas
        if (bw > 10 && rng.chance(0.35)) {
          const aw = Math.max(2, Math.floor(bw * 0.3));
          fill(x, X + Math.floor((bw - aw) / 2), top - 3, aw, 3, spec.color);
        }
        if (rng.chance(far ? 0.25 : 0.3)) {
          const ax = X + rng.int(2, Math.max(3, bw - 3));
          fill(x, ax, top - rng.int(4, 10), 1, 10, spec.color);
        }
        // ventanas
        for (let wy = top + 3; wy < H - 2; wy += far ? 4 : 5) {
          for (let wx = X + 2; wx < X + bw - 2; wx += far ? 3 : 4) {
            if (rng.chance(spec.p)) fill(x, wx, wy, far ? 1 : 2, far ? 1 : 2, spec.win);
          }
        }
      }
    };
    let bx = 0;
    while (bx < tileW) {
      const bw = rng.int(far ? 10 : 14, far ? 26 : 36);
      const bh = rng.int(spec.hmin, spec.hmax);
      put(bx, bw, bh);
      bx += bw + rng.int(-3, 2);
    }
    if (spec.style === 'cliff') {
      // acantilados y faro (Costa Tormenta)
      let y = H - 18;
      for (let px = 0; px < tileW; px++) {
        y += rng.range(-0.8, 0.8);
        y = G.clamp(y, H - 28, H - 8);
        fill(x, px, Math.round(y), 1, H - Math.round(y), spec.color);
        fill(x, px, Math.round(y), 1, 1, spec.top);
      }
    }
    return c;
  }

  function build(id) {
    const b = DEF[id];
    const rng = new G.RNG(id.length * 7919 + 17);
    const L = G.L;
    const skyH = L.walkTop0 + 2;
    const sky = G.makeCanvas(G.W, skyH);
    bandedGradient(sky.ctx, 0, 0, G.W, skyH, b.sky, 16);
    const out = { sky, skyH, clouds: [], stars: [], birds: [] };
    // estrellas
    for (let i = 0; i < (b.stars || 0); i++) {
      const sx = rng.int(0, G.W - 1), sy = rng.int(2, Math.floor(skyH * 0.7));
      const bright = rng.chance(0.2);
      out.stars.push({ x: sx, y: sy, b: bright, ph: rng.range(0, G.TAU) });
      sky.ctx.fillStyle = bright ? '#ffffff' : '#9a8cc8';
      sky.ctx.fillRect(sx, sy, 1, 1);
    }
    // nubes
    for (let i = 0; i < b.clouds.n; i++) {
      const storm = b.clouds.storm;
      const w = rng.int(storm ? 70 : 30, storm ? 150 : 70);
      const h = Math.floor(w * rng.range(0.2, 0.3));
      out.clouds.push({
        c: makeCloud(rng, w, h, b.clouds), x: rng.range(0, G.W + 200),
        y: rng.int(b.clouds.y0, b.clouds.y1), p: rng.range(0.03, 0.09), drift: rng.range(2, 6) * (storm ? 3 : 1),
      });
    }
    for (let i = 0; i < (b.clouds.streaks || 0); i++) {
      const w = rng.int(60, 150);
      out.clouds.push({
        c: makeCloud(rng, w, rng.int(3, 5), b.clouds.streakCol || b.clouds, true), x: rng.range(0, G.W + 200),
        y: rng.int(12, 70), p: rng.range(0.01, 0.03), drift: rng.range(1, 3),
      });
    }
    out.clouds.sort((a, c) => a.p - c.p);
    out.far = b.far ? skyline(rng, 480, 150, b.far, true) : null;
    out.mid = b.mid ? skyline(rng, 480, 130, b.mid, false) : null;
    layers[id] = out;
    return out;
  }

  function get(id) { return layers[id] || build(id); }
  function rebuildAll() { for (const k of Object.keys(layers)) delete layers[k]; }

  // ------------------------------------------------------------ dibujo del cielo
  function drawSun(ctx, b, t, L) {
    const s = b.sun;
    const cx = Math.round(G.W * s.x), cy = Math.round(L.horizon + s.dy);
    // rayos giratorios
    if (b.rays) {
      ctx.save();
      ctx.globalAlpha = b.rays.alpha;
      ctx.fillStyle = b.rays.color;
      const n = 14, R = G.W * 1.2;
      const a0 = t * 0.045;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * G.TAU;
        const da = (G.TAU / n) * 0.42;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a - da) * R, cy + Math.sin(a - da) * R);
        ctx.lineTo(cx + Math.cos(a + da) * R, cy + Math.sin(a + da) * R);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
    }
    const g = G.A.glow(70, s.glow, 0.2);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(g, cx - 70, cy - 70);
    ctx.globalAlpha = 1;
    circle(ctx, cx, cy, s.r + 2, s.rim);
    circle(ctx, cx, cy, s.r, s.color);
    // franjas retro del sol
    ctx.fillStyle = s.rim;
    for (let k = 0; k < 4; k++) ctx.fillRect(cx - s.r, cy + 6 + k * 5, s.r * 2 + 1, 1 + (k > 1 ? 1 : 0));
  }

  function drawMoon(ctx, b, t) {
    const m = b.moon;
    const cx = Math.round(G.W * m.x), cy = m.y;
    const g = G.A.glow(40, '#8a7cff', 0.15);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(g, cx - 40, cy - 40);
    ctx.globalAlpha = 1;
    circle(ctx, cx, cy, m.r, '#f2eefc');
    circle(ctx, cx + 4, cy - 2, m.r - 2, '#d8d0ee');
    circle(ctx, cx + 5, cy - 3, m.r - 3, '#f2eefc');
    fill(ctx, cx - 4, cy + 2, 2, 2, '#c8c0e0');
    fill(ctx, cx - 1, cy - 5, 2, 1, '#c8c0e0');
    fill(ctx, cx + 2, cy + 5, 3, 2, '#d0c8e6');
    void t;
  }

  function drawSea(ctx, b, camX, t, L) {
    const s = b.sea;
    const top = L.horizon - 34, bot = L.walkTop0 + 2;
    const h = bot - top;
    bandedGradient(ctx, 0, top, G.W, h, [s.mid, s.deep, s.deep], 6);
    ctx.fillStyle = s.light;
    ctx.fillRect(0, top, G.W, 1);
    // oleaje: lineas que se desplazan con parallax segun profundidad
    for (let row = 0; row < 9; row++) {
      const y = top + 3 + Math.floor(row * row * 0.55 + row * 2);
      if (y >= bot - 2) break;
      const p = 0.08 + row * 0.05;
      const len = 3 + row, gap = 18 + row * 5;
      const off = Math.floor(camX * p + t * (6 + row) + row * 37) % gap;
      ctx.fillStyle = row > 5 ? s.foam : s.light;
      for (let x = -off; x < G.W; x += gap) {
        const wob = Math.round(Math.sin(t * 2 + x * 0.05 + row) * 1);
        ctx.fillRect(x, y + wob, len, 1);
      }
    }
    // espuma rompiendo contra el muro del paseo
    ctx.fillStyle = s.foam;
    for (let x = 0; x < G.W; x += 2) {
      const yy = bot - 3 + Math.round(Math.sin((x + camX * 1.0) * 0.12 + t * 3) * 1.5);
      ctx.fillRect(x, yy, 2, 1);
    }
  }

  function drawLighthouse(ctx, camX, t, L) {
    const x = Math.round(G.W * 0.82 - ((camX * 0.03) % (G.W + 160))) ;
    const X = x < -60 ? x + G.W + 160 : x;
    const base = L.horizon - 30;
    fill(ctx, X - 4, base - 30, 8, 30, '#d8d4cc');
    fill(ctx, X - 4, base - 22, 8, 4, '#c8453a');
    fill(ctx, X - 4, base - 10, 8, 4, '#c8453a');
    fill(ctx, X - 5, base - 34, 10, 4, '#2a3440');
    fill(ctx, X - 3, base - 38, 6, 4, '#ffe9a0');
    // haz giratorio
    const a = Math.sin(t * 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath();
    ctx.moveTo(X, base - 36);
    const R = 260;
    ctx.lineTo(X + Math.cos(Math.PI + a * 1.2 - 0.08) * R, base - 36 + Math.sin(Math.PI + a * 1.2 - 0.08) * R * 0.25);
    ctx.lineTo(X + Math.cos(Math.PI + a * 1.2 + 0.08) * R, base - 36 + Math.sin(Math.PI + a * 1.2 + 0.08) * R * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const g = G.A.glow(16, '#fff2b0', 0.3);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(g, X - 16, base - 52);
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawTile(ctx, img, px, y, alpha) {
    if (!img) return;
    const w = img.width;
    let x = -(((px % w) + w) % w);
    ctx.globalAlpha = alpha;
    for (; x < G.W; x += w) ctx.drawImage(img, Math.round(x), y);
    ctx.globalAlpha = 1;
  }

  // dibuja el fondo completo (cielo + parallax) de un barrio
  function drawBackground(ctx, id, camX, t, alpha, extra) {
    const b = DEF[id], ly = get(id), L = G.L;
    ctx.globalAlpha = alpha;
    ctx.drawImage(ly.sky, 0, 0);
    ctx.globalAlpha = 1;
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    // estrellas que titilan
    for (const s of ly.stars) {
      if (!s.b) continue;
      const k = 0.5 + 0.5 * Math.sin(t * 3 + s.ph);
      ctx.globalAlpha = alpha * k;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x - 1, s.y, 3, 1);
      ctx.fillRect(s.x, s.y - 1, 1, 3);
    }
    ctx.globalAlpha = alpha;
    if (b.sun) drawSun(ctx, b, t, L);
    if (b.moon) drawMoon(ctx, b, t);
    // nubes
    for (const c of ly.clouds) {
      const span = G.W + c.c.width + 40;
      let x = c.x - camX * c.p - t * c.drift;
      x = ((x % span) + span) % span - c.c.width - 20;
      ctx.drawImage(c.c, Math.round(x), c.y);
    }
    // relampago (lo pinta el clima encima)
    if (extra && extra.bolt && b.lightning) drawBolt(ctx, extra.bolt);
    if (b.sea) {
      if (b.far) drawTile(ctx, ly.far, camX * 0.03, L.horizon - 34 - 150 + 4, alpha);
      drawLighthouse(ctx, camX, t, L);
      drawSea(ctx, b, camX, t, L);
    } else {
      // bruma baja del horizonte
      if (ly.far) drawTile(ctx, ly.far, camX * 0.1, L.walkTop0 - 150 + 6, alpha);
      const hz = G.hex(b.haze);
      const gr = ctx.createLinearGradient(0, L.walkTop0 - 60, 0, L.walkTop0);
      gr.addColorStop(0, G.rgbStr(hz, 0));
      gr.addColorStop(1, G.rgbStr(hz, 0.35));
      ctx.fillStyle = gr;
      ctx.fillRect(0, L.walkTop0 - 60, G.W, 62);
      if (ly.mid) drawTile(ctx, ly.mid, camX * 0.25, L.walkTop0 - 130 + 6, alpha);
    }
    ctx.restore();
  }

  function drawBolt(ctx, bolt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#e8f4ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    bolt.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#9ac8ff';
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------ clima
  const weather = { drops: [], bolt: null, boltT: 0, nextBolt: 4, flash: 0, leaves: [] };
  function makeBolt() {
    const pts = [];
    let x = G.rand.range(G.W * 0.15, G.W * 0.9), y = 0;
    const end = G.L.horizon - 30;
    pts.push([x, y]);
    while (y < end) {
      y += G.rand.range(6, 14);
      x += G.rand.range(-10, 10);
      pts.push([Math.round(x), Math.round(Math.min(y, end))]);
    }
    return { pts };
  }
  function updateWeather(dt, rainAmt, lightning, windAmt, silent) {
    // lluvia
    const target = Math.floor(150 * rainAmt);
    while (weather.drops.length < target) {
      weather.drops.push({ x: G.rand.range(0, G.W + 60), y: G.rand.range(-G.H, 0), v: G.rand.range(300, 420), l: G.rand.int(4, 8) });
    }
    if (weather.drops.length > target) weather.drops.length = target;
    for (const d of weather.drops) {
      d.y += d.v * dt;
      d.x -= d.v * 0.22 * dt + windAmt * 60 * dt;
      if (d.y > G.H) {
        if (G.rand.chance(0.35)) {
          G.FX.spawn({ x: d.x, y: G.rand.range(G.L.roadTop, G.H), vx: G.rand.range(-12, 12), vy: -G.rand.range(10, 26), g: 140,
            life: 0.18, size: 1, color: 'rgba(200,220,255,0.7)', world: false });
        }
        d.y = G.rand.range(-40, 0); d.x = G.rand.range(0, G.W + 60);
      }
      if (d.x < -10) d.x += G.W + 60;
    }
    // relampagos
    if (lightning > 0.5) {
      weather.nextBolt -= dt;
      if (weather.nextBolt <= 0) {
        weather.nextBolt = G.rand.range(3.5, 8);
        weather.bolt = makeBolt();
        weather.boltT = 0.22;
        weather.flash = 1;
        const delay = G.rand.range(250, 900);
        if (!silent) setTimeout(() => G.Audio.sfx('thunder'), delay);
      }
    }
    if (weather.boltT > 0) { weather.boltT -= dt; if (weather.boltT <= 0) weather.bolt = null; }
    weather.flash = Math.max(0, weather.flash - dt * 2.6);
    // hojas / arena con viento
    if (windAmt > 0.2 && G.rand.chance(windAmt * dt * 14)) {
      G.FX.spawn({ x: G.W + 5, y: G.rand.range(G.L.walkTop0 - 60, G.H), vx: -G.rand.range(160, 260), vy: G.rand.range(-10, 20),
        life: 3, size: 2, color: G.rand.pick(['#6fae5a', '#d8c08c', '#8fce6a']), world: false, vr: 8 });
    }
  }
  function drawRain(ctx, amt) {
    if (amt <= 0.01 || !weather.drops.length) return;
    ctx.globalAlpha = 0.45 * Math.min(1, amt + 0.2);
    ctx.fillStyle = '#b8c8e8';
    for (const d of weather.drops) {
      // gota diagonal pixelada
      const x = Math.round(d.x), y = Math.round(d.y);
      for (let i = 0; i < d.l; i += 2) ctx.fillRect(x + Math.floor(i * 0.25), y - i, 1, 2);
    }
    ctx.globalAlpha = 1;
  }
  function flashAmount() {
    if (weather.flash <= 0) return 0;
    // doble parpadeo
    const f = weather.flash;
    return f > 0.75 ? 1 : f > 0.55 ? 0.25 : f > 0.4 ? 0.8 : f * 0.9;
  }

  return {
    DEF, ORDER, get, build, rebuildAll, drawBackground, updateWeather, drawRain, flashAmount,
    get bolt() { return weather.bolt; },
    fill, circle, ellipse, bandedGradient,
    next(cur, rng) {
      const opts = ORDER.filter((o) => o !== cur);
      return rng.pick(opts);
    },
  };
})();
