/* Carga de imagenes y utilidades de sprites (tiras de frames, volteo, siluetas, brillos) */
'use strict';

G.A = (() => {
  // nombre -> numero de frames (tira horizontal)
  const MANIFEST = {
    gom_ride: 3, gom_wheelie: 1, gom_nose: 1, gom_jump: 1, gom_walk: 1, gom_front: 1, bike_empty: 1,
    face_0: 1, face_1: 1, face_2: 1, face_3: 1, face_4: 1, face_5: 1,
    pizza_box: 1, pizza_box_big: 1, pizza_open: 1, slice: 1, pizza_whole: 1, box_logo: 1,
    coin: 1, heart: 1, stopwatch: 1, soda: 1, pin: 1, phone: 1, gps: 1, flag: 1, sign_pizza: 1,
    customer: 1, customer_1: 1, customer_2: 1, customer_3: 1, customer_4: 1, bubble: 1,
    cust_0: 5, cust_1: 5, cust_2: 5, cust_3: 5, cust_4: 5, cust_5: 5, cust_6: 5, cust_7: 5,
    ped_0: 12, ped_1: 12, ped_2: 12, ped_3: 12, ped_4: 12, ped_5: 12,
    van: 1, van_rival: 1, van_green: 1,
    car_red: 2, car_blue: 2, car_white: 2, car_green: 2, car_purple: 2, car_orange: 2,
    car_taxi: 2, car_police: 2, car_suv: 2, car_teal: 2,
    cone: 1, crate: 1, barrel: 1, ramp: 1, trash: 1, bench: 1, planter: 1, hydrant: 1, billboard: 1,
    barrier: 1, manhole: 1, manhole_open: 1, barrel_roll: 4, gull: 3,
    palm: 1, lamp: 1, house: 1, pizzeria: 1, pizzeria_b: 1, wall_pillar: 1, fence: 1,
    magnet: 1, helmet: 1, bolt: 1, star: 1,
    logo: 1,
  };

  const img = {};
  const info = {};
  const cache = new Map();
  let loaded = 0;
  const total = Object.keys(MANIFEST).length;

  function load(onProgress) {
    return new Promise((resolve) => {
      const names = Object.keys(MANIFEST);
      let done = 0;
      names.forEach((name) => {
        const im = new Image();
        im.onload = () => {
          img[name] = im;
          const n = MANIFEST[name];
          info[name] = { n, fw: Math.floor(im.width / n), fh: im.height };
          done++; loaded = done;
          if (onProgress) onProgress(done / total);
          if (done === names.length) resolve();
        };
        im.onerror = () => {
          console.warn('No se pudo cargar', name);
          const c = G.makeCanvas(8, 8);
          c.ctx.fillStyle = '#f0f';
          c.ctx.fillRect(0, 0, 8, 8);
          img[name] = c;
          info[name] = { n: 1, fw: 8, fh: 8 };
          done++;
          if (done === names.length) resolve();
        };
        im.src = 'assets/img/' + name + '.png';
      });
    });
  }

  // version volteada horizontalmente (cada frame por separado)
  function flipped(name) {
    const key = 'flip:' + name;
    if (cache.has(key)) return cache.get(key);
    const src = img[name], inf = info[name];
    const c = G.makeCanvas(src.width, src.height);
    for (let i = 0; i < inf.n; i++) {
      c.ctx.save();
      c.ctx.translate((i + 1) * inf.fw, 0);
      c.ctx.scale(-1, 1);
      c.ctx.drawImage(src, i * inf.fw, 0, inf.fw, inf.fh, 0, 0, inf.fw, inf.fh);
      c.ctx.restore();
    }
    cache.set(key, c);
    return c;
  }

  // silueta de un color (golpes, sombras proyectadas, brillos)
  function tinted(name, color, flip) {
    const key = 'tint:' + name + ':' + color + ':' + (flip ? 1 : 0);
    if (cache.has(key)) return cache.get(key);
    const src = flip ? flipped(name) : img[name];
    const c = G.makeCanvas(src.width, src.height);
    c.ctx.drawImage(src, 0, 0);
    c.ctx.globalCompositeOperation = 'source-in';
    c.ctx.fillStyle = color;
    c.ctx.fillRect(0, 0, c.width, c.height);
    cache.set(key, c);
    return c;
  }

  // brillo radial precalculado (para luces aditivas)
  function glow(r, color, falloff) {
    const key = 'glow:' + r + ':' + color + ':' + (falloff || 0);
    if (cache.has(key)) return cache.get(key);
    const size = Math.ceil(r * 2);
    const c = G.makeCanvas(size, size);
    const g = c.ctx.createRadialGradient(r, r, 0, r, r, r);
    const col = G.hex(color);
    g.addColorStop(0, G.rgbStr(col, 1));
    g.addColorStop(falloff || 0.25, G.rgbStr(col, 0.55));
    g.addColorStop(0.6, G.rgbStr(col, 0.18));
    g.addColorStop(1, G.rgbStr(col, 0));
    c.ctx.fillStyle = g;
    c.ctx.fillRect(0, 0, size, size);
    cache.set(key, c);
    return c;
  }

  // dibuja un frame con ancla abajo-centro (cx, by)
  function draw(ctx, name, frame, cx, by, flip, alpha) {
    const inf = info[name];
    if (!inf) return;
    const src = flip ? flipped(name) : img[name];
    const f = ((frame | 0) % inf.n + inf.n) % inf.n;
    const x = Math.round(cx - inf.fw / 2), y = Math.round(by - inf.fh);
    if (alpha !== undefined && alpha < 1) {
      const pa = ctx.globalAlpha;
      ctx.globalAlpha = pa * alpha;
      ctx.drawImage(src, f * inf.fw, 0, inf.fw, inf.fh, x, y, inf.fw, inf.fh);
      ctx.globalAlpha = pa;
    } else {
      ctx.drawImage(src, f * inf.fw, 0, inf.fw, inf.fh, x, y, inf.fw, inf.fh);
    }
  }

  // dibuja un frame con esquina superior izquierda (x, y) y escala opcional
  function drawAt(ctx, name, frame, x, y, scale, flip) {
    const inf = info[name];
    if (!inf) return;
    const src = flip ? flipped(name) : img[name];
    const f = ((frame | 0) % inf.n + inf.n) % inf.n;
    const s = scale || 1;
    ctx.drawImage(src, f * inf.fw, 0, inf.fw, inf.fh, Math.round(x), Math.round(y), inf.fw * s, inf.fh * s);
  }

  // silueta tintada con ancla abajo-centro
  function drawTint(ctx, name, frame, cx, by, flip, color, alpha) {
    const inf = info[name];
    if (!inf) return;
    const src = tinted(name, color, flip);
    const f = ((frame | 0) % inf.n + inf.n) % inf.n;
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * (alpha === undefined ? 1 : alpha);
    ctx.drawImage(src, f * inf.fw, 0, inf.fw, inf.fh, Math.round(cx - inf.fw / 2), Math.round(by - inf.fh), inf.fw, inf.fh);
    ctx.globalAlpha = pa;
  }

  return {
    img, info, load, flipped, tinted, glow, draw, drawAt, drawTint,
    get progress() { return loaded / total; },
    w: (n) => (info[n] ? info[n].fw : 0),
    h: (n) => (info[n] ? info[n].fh : 0),
  };
})();
