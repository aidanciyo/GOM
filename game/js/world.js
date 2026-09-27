/* Mundo: fachadas procedurales por barrio, carretera por tiles y calcomanias */
'use strict';

G.World = (() => {
  const { fill, circle, ellipse } = G.Biomes;
  const sh = G.shadeHex;

  // ------------------------------------------------------------ utilidades
  function outlineRect(c, x, y, w, h, col) {
    fill(c, x, y, w, 1, col); fill(c, x, y + h - 1, w, 1, col);
    fill(c, x, y, 1, h, col); fill(c, x + w - 1, y, 1, h, col);
  }
  function mk(w, h) {
    const base = G.makeCanvas(w, h), emis = G.makeCanvas(w, h);
    return { w, h, base, emis, b: base.ctx, e: emis.ctx, glows: [], hasEmis: false };
  }
  function glass(c, x, y, w, h, rng, dark, light) {
    fill(c, x, y, w, h, dark || '#2f4a70');
    const l = light || '#8ec0ea';
    // reflejo diagonal
    for (let i = 0; i < Math.min(w, h); i++) {
      if (i + 1 < w && (i + 2) < h) fill(c, x + i + 1, y + h - i - 2, 1, 1, l);
    }
    fill(c, x + 1, y + 1, 1, 1, l);
    void rng;
  }
  function window1(o, x, y, w, h, rng, opt) {
    const c = o.b;
    const trim = opt.trim || '#f4efe4';
    fill(c, x - 1, y - 1, w + 2, h + 2, trim);
    glass(c, x, y, w, h, rng, opt.glass, opt.glassL);
    fill(c, x, y + Math.floor(h / 2), w, 1, trim);
    if (opt.cross) fill(c, x + Math.floor(w / 2), y, 1, h, trim);
    // alfeizar
    fill(c, x - 2, y + h + 1, w + 4, 1, sh(trim, 0.8));
    if (opt.shutters) {
      const sc = opt.shutters;
      fill(c, x - 5, y - 1, 3, h + 2, sc);
      fill(c, x + w + 2, y - 1, 3, h + 2, sc);
      for (let k = 0; k < h + 2; k += 2) {
        fill(c, x - 5, y - 1 + k, 3, 1, sh(sc, 0.75));
        fill(c, x + w + 2, y - 1 + k, 3, 1, sh(sc, 0.75));
      }
    }
    if (opt.flowers) {
      fill(c, x - 1, y + h + 2, w + 2, 2, '#7a4a2e');
      for (let k = 0; k < w + 2; k += 2) {
        fill(c, x - 1 + k, y + h, 1, 2, '#3f8f4a');
        fill(c, x - 1 + k, y + h - 1 + (k % 4 ? 1 : 0), 1, 1, rng.pick(['#ff5a7a', '#ffd04a', '#ff8ad8', '#ffffff']));
      }
    }
    if (opt.lit) {
      fill(o.e, x, y, w, h, opt.litColor || '#ffcf70');
      fill(o.e, x, y + Math.floor(h / 2), w, 1, sh(opt.litColor || '#ffcf70', 0.8));
      if (opt.cross) fill(o.e, x + Math.floor(w / 2), y, 1, h, sh(opt.litColor || '#ffcf70', 0.8));
      o.hasEmis = true;
    }
  }
  function awning(c, x, y, w, h, c1, c2) {
    for (let i = 0; i < w; i++) fill(c, x + i, y, 1, h, Math.floor(i / 4) % 2 ? c2 : c1);
    fill(c, x, y, w, 1, sh(c1, 1.15));
    // borde festoneado
    for (let i = 0; i < w; i += 4) fill(c, x + i, y + h, 3, 1, Math.floor(i / 4) % 2 ? c2 : c1);
    fill(c, x, y + h + 1, w, 1, 'rgba(20,10,30,0.25)');
  }
  function textOn(c, text, cx, y, color, outline) {
    G.Font.draw(c, text, cx, y, { color, align: 'center', outline });
  }

  const PASTEL = ['#f3c8a0', '#f1e0b6', '#eab2a0', '#bcd6e2', '#c6e2b6', '#f4c6d0', '#e9d2a8', '#d8c8ec'];
  const SHUTTER = ['#3d8a5a', '#3a6ab0', '#8a5a3a', '#c0503a', '#2f7f8f'];
  const AWN = [['#e0453a', '#f4f0e6'], ['#2f9e5a', '#f4f0e6'], ['#2f6fd0', '#f4f0e6'], ['#f5b800', '#f4f0e6'], ['#d8508a', '#f4f0e6']];

  // ------------------------------------------------------------ Avenida Atardecer
  function house(rng) {
    const w = rng.int(66, 100), wallH = rng.int(40, 54), roofH = rng.int(11, 17), ov = 3;
    const W = w + ov * 2, H = wallH + roofH;
    const o = mk(W, H);
    const c = o.b;
    const wall = rng.pick(PASTEL), trim = '#f6f1e6';
    fill(c, ov, roofH, w, wallH, wall);
    fill(c, ov, roofH, 1, wallH, sh(wall, 1.06));
    fill(c, ov + w - 2, roofH, 2, wallH, sh(wall, 0.84));
    fill(c, ov, H - 5, w, 5, sh(wall, 0.72));
    fill(c, ov, H - 5, w, 1, sh(wall, 0.6));
    // tejado de tejas
    const tile = rng.pick(['#c65a3c', '#b8503a', '#d06a44']);
    const gable = rng.chance(0.55);
    for (let r = 0; r < roofH; r++) {
      const t = r / (roofH - 1);
      const rw = Math.round(gable ? G.lerp(10, W, t) : G.lerp(W * 0.55, W, t));
      const x0 = Math.round((W - rw) / 2);
      const col = r % 3 === 2 ? sh(tile, 0.72) : r === 0 ? sh(tile, 1.2) : tile;
      fill(c, x0, r, rw, 1, col);
      if (r % 3 !== 2) for (let k = x0 + ((Math.floor(r / 3) % 2) * 2); k < x0 + rw; k += 4) fill(c, k, r, 1, 1, sh(tile, 0.85));
    }
    fill(c, 0, roofH - 1, W, 1, sh(tile, 0.55));
    fill(c, ov, roofH, w, 1, 'rgba(40,10,20,0.35)');
    if (rng.chance(0.5)) { // chimenea
      const cx = Math.round(W * rng.range(0.6, 0.78));
      fill(c, cx, 1, 5, roofH - 5, sh(wall, 0.9));
      fill(c, cx - 1, 0, 7, 2, sh(wall, 0.7));
    }
    const shut = rng.chance(0.7) ? rng.pick(SHUTTER) : null;
    const twoFloors = wallH >= 46;
    const nWin = w > 84 ? 3 : 2;
    const doorX = ov + (rng.chance(0.5) ? Math.round(w * 0.18) : Math.round(w * 0.7));
    // ventanas superiores
    if (twoFloors) {
      const y = roofH + 6;
      const balcony = rng.chance(0.4);
      for (let i = 0; i < nWin; i++) {
        const x = ov + Math.round((w / nWin) * (i + 0.5)) - 4;
        window1(o, x, y, 8, 10, rng, { trim, shutters: shut, flowers: !balcony && rng.chance(0.5), cross: true, lit: rng.chance(0.3) });
      }
      if (balcony) {
        const by = y + 11;
        fill(c, ov + 6, by, w - 12, 1, '#2a2430');
        fill(c, ov + 6, by + 5, w - 12, 1, '#2a2430');
        for (let k = ov + 6; k < ov + w - 6; k += 2) fill(c, k, by, 1, 6, '#2a2430');
        for (let k = ov + 7; k < ov + w - 7; k += 3) fill(c, k, by - 1, 2, 1, rng.pick(['#ff5a7a', '#ffd04a', '#58c060']));
      }
    }
    // planta baja: ventanas + puerta
    const gy = H - 5 - 18;
    for (let i = 0; i < nWin; i++) {
      const x = ov + Math.round((w / nWin) * (i + 0.5)) - 4;
      if (Math.abs(x + 4 - (doorX + 5)) < 12) continue;
      window1(o, x, gy + 2, 8, 10, rng, { trim, shutters: shut, flowers: rng.chance(0.4), cross: true, lit: rng.chance(0.45) });
    }
    const door = rng.pick(['#8a5230', '#6a3f2a', '#3f6a8a', '#8a3a3a']);
    fill(c, doorX - 1, gy - 1, 12, 18, trim);
    fill(c, doorX, gy, 10, 17, door);
    fill(c, doorX + 1, gy + 1, 3, 7, sh(door, 1.2));
    fill(c, doorX + 6, gy + 1, 3, 7, sh(door, 1.2));
    fill(c, doorX + 1, gy + 9, 3, 6, sh(door, 0.8));
    fill(c, doorX + 6, gy + 9, 3, 6, sh(door, 0.8));
    fill(c, doorX + 8, gy + 8, 1, 1, '#ffd04a');
    // farolillo de la puerta
    fill(c, doorX + 12, gy + 1, 2, 3, '#2a2430');
    fill(o.e, doorX + 12, gy + 2, 2, 2, '#ffe9a0');
    o.glows.push({ dx: doorX + 13, dy: gy + 3, r: 8, color: '#ffc864' });
    o.hasEmis = true;
    return o;
  }

  function shop(rng) {
    const w = rng.int(72, 104), h = rng.int(46, 58);
    const o = mk(w, h);
    const c = o.b;
    const wall = rng.pick(['#e9d8b8', '#d8e4e8', '#f0d0c0', '#e0d0e8', '#f2e2c4']);
    fill(c, 0, 4, w, h - 4, wall);
    fill(c, 0, 0, w, 5, sh(wall, 0.8));
    fill(c, 0, 0, w, 1, sh(wall, 1.1));
    fill(c, w - 2, 4, 2, h - 4, sh(wall, 0.84));
    // letrero
    const name = G.Humor.fit(G.Humor.shops, w - 8, rng);
    const boardCol = rng.pick(['#3a2a3a', '#2a3a4a', '#6a2a2a', '#2a4a3a']);
    fill(c, 2, 7, w - 4, 11, boardCol);
    outlineRect(c, 2, 7, w - 4, 11, sh(boardCol, 1.5));
    const signCol = rng.pick(['#ffe07a', '#ffffff', '#ffd0a0']);
    textOn(c, name, Math.round(w / 2), 9, signCol);
    G.Font.draw(o.e, name, Math.round(w / 2), 9, { color: signCol, align: 'center' });
    o.glows.push({ dx: w / 2, dy: 12, r: 18, color: '#ffc870' });
    // toldo
    const [a1, a2] = rng.pick(AWN);
    awning(c, 3, 20, w - 6, 6, a1, a2);
    // escaparate + puerta
    const gx = 5, gy = 29, gw = w - 24, gh = h - gy - 5;
    fill(c, gx - 1, gy - 1, gw + 2, gh + 2, '#4a3a3a');
    fill(c, gx, gy, gw, gh, '#3c5a7a');
    fill(o.e, gx, gy, gw, gh, '#ffd88a');
    for (let k = 0; k < gw; k += 3) {
      const it = rng.pick(['#ff7a5a', '#7ad05a', '#ffd04a', '#c07af0', '#f0f0f0']);
      fill(c, gx + k, gy + gh - 4, 2, 3, it);
      fill(o.e, gx + k, gy + gh - 4, 2, 3, it);
      if (rng.chance(0.5)) { fill(c, gx + k, gy + 4, 2, 2, it); fill(o.e, gx + k, gy + 4, 2, 2, it); }
    }
    fill(o.e, gx, gy + gh - 6, gw, 1, '#c89a5a');
    fill(c, gx + 1, gy + 1, 1, gh - 2, '#9ac8f0');
    const dx = w - 16;
    fill(c, dx - 1, gy - 1, 12, h - gy - 4, '#4a3a3a');
    fill(c, dx, gy, 10, h - gy - 5, '#5a8ab0');
    fill(o.e, dx + 1, gy + 1, 8, 8, '#ffe0a0');
    fill(c, dx + 7, gy + 10, 1, 2, '#ffd04a');
    fill(c, 0, h - 4, w, 4, sh(wall, 0.7));
    o.hasEmis = true;
    return o;
  }

  function apartment(rng) {
    const w = rng.int(72, 100), floors = rng.int(3, 4), fh = 15;
    const h = floors * fh + 22;
    const o = mk(w, h);
    const c = o.b;
    const brick = rng.chance(0.6);
    const wall = brick ? rng.pick(['#b0583e', '#a64e3a', '#b86a48']) : rng.pick(['#9aa4b8', '#b8a898', '#c8b8a0']);
    fill(c, 0, 3, w, h - 3, wall);
    if (brick) {
      const m = sh(wall, 0.78);
      for (let y = 5; y < h; y += 3) {
        fill(c, 0, y, w, 1, m);
        for (let x = (Math.floor(y / 3) % 2) * 3; x < w; x += 6) fill(c, x, y - 2, 1, 2, m);
      }
    } else {
      for (let y = 3 + fh; y < h - 20; y += fh) fill(c, 0, y, w, 1, sh(wall, 0.85));
    }
    fill(c, 0, 0, w, 4, sh(wall, 0.65));
    fill(c, 0, 0, w, 1, sh(wall, 1.15));
    fill(c, w - 2, 3, 2, h - 3, sh(wall, 0.8));
    const nWin = Math.max(2, Math.floor((w - 8) / 16));
    for (let f = 0; f < floors; f++) {
      const y = 7 + f * fh;
      for (let i = 0; i < nWin; i++) {
        const x = Math.round(6 + (i + 0.5) * ((w - 12) / nWin)) - 4;
        window1(o, x, y, 8, 9, rng, { trim: '#ece6da', cross: true, lit: rng.chance(0.35), flowers: rng.chance(0.15), litColor: rng.pick(['#ffcf70', '#ffe39a', '#ffb870']) });
      }
    }
    // planta baja con toldo
    const gy = h - 20;
    const [a1, a2] = rng.pick(AWN);
    fill(c, 0, gy - 1, w, 20, sh(wall, 0.9));
    awning(c, 2, gy, w - 4, 5, a1, a2);
    fill(c, 5, gy + 8, w - 26, 9, '#3c5a7a');
    fill(o.e, 5, gy + 8, w - 26, 9, '#ffd88a');
    fill(c, 6, gy + 9, 1, 7, '#9ac8f0');
    fill(c, w - 17, gy + 7, 10, 12, '#5a3a2a');
    fill(c, w - 16, gy + 8, 8, 10, '#7a4a30');
    o.hasEmis = true;
    return o;
  }

  function garden(rng) {
    const w = rng.int(26, 44), h = 30;
    const o = mk(w, h);
    const c = o.b;
    const stone = rng.pick(['#e8dcc4', '#d8c4a4', '#f0e6d2']);
    fill(c, 0, h - 11, w, 11, stone);
    fill(c, 0, h - 11, w, 2, sh(stone, 1.08));
    for (let x = 2; x < w; x += 6) fill(c, x, h - 8, 1, 7, sh(stone, 0.85));
    fill(c, 0, h - 5, w, 1, sh(stone, 0.85));
    for (let x = 3; x < w - 2; x += rng.int(6, 9)) {
      const r = rng.int(4, 7);
      circle(c, x, h - 11 - r + 3, r, '#3f8a44');
      circle(c, x - 1, h - 11 - r + 2, Math.max(1, r - 2), '#5aae52');
      if (rng.chance(0.6)) fill(c, x + 1, h - 11 - r, 1, 1, rng.pick(['#ff6a8a', '#ffe06a', '#ffffff']));
    }
    return o;
  }

  // ------------------------------------------------------------ Distrito Neon
  const NEON = ['#ff3fd0', '#3ff0ff', '#ffe23f', '#7cff5a', '#ff5a5a', '#b06aff'];

  function neonText(o, text, cx, y, col) {
    // tubo de neon: contorno oscuro en base, color puro en emisivo
    G.Font.draw(o.b, text, cx, y, { color: sh(col, 0.55), align: 'center', outline: '#0a0814' });
    G.Font.draw(o.e, text, cx, y, { color: col, align: 'center' });
    o.glows.push({ dx: cx, dy: y + 3, r: Math.max(14, G.Font.measure(text) * 0.7), color: col, neon: true });
    o.hasEmis = true;
  }

  function tower(rng) {
    const w = rng.int(68, 118), h = rng.int(150, 210);
    const o = mk(w, h);
    const c = o.b;
    const body = rng.pick(['#23284a', '#2a2046', '#1f2f40', '#302a52', '#1d2238', '#2a2438']);
    fill(c, 0, 0, w, h, body);
    fill(c, 0, 0, 1, h, sh(body, 1.35));
    fill(c, w - 3, 0, 3, h, sh(body, 0.7));
    // rejilla de ventanas
    const cw = rng.pick([5, 6]), chh = rng.pick([6, 7]);
    const litP = rng.range(0.22, 0.45);
    const litCol = rng.pick(['#ffd66b', '#ffe9a8', '#7af0ff', '#ff9ad8', '#ffd66b']);
    const top = h - 32;
    for (let y = 4; y < top; y += chh) {
      // plantas enteras apagadas/encendidas para que parezca real
      const rowLit = rng.chance(0.85) ? litP : litP * 0.2;
      for (let x = 4; x < w - 6; x += cw) {
        const lit = rng.chance(rowLit);
        fill(c, x, y, cw - 2, chh - 3, lit ? sh(litCol, 0.6) : '#141228');
        if (!lit) fill(c, x, y, 1, 1, sh(body, 1.6));
        if (lit) { fill(o.e, x, y, cw - 2, chh - 3, litCol); o.hasEmis = true; }
      }
    }
    // cartel vertical
    if (rng.chance(0.55)) {
      const word = rng.pick(G.Humor.vertical);
      const col = rng.pick(NEON);
      const sx = rng.chance(0.5) ? 2 : w - 13;
      const sy = top - word.length * 9 - 12;
      fill(c, sx, sy, 11, word.length * 9 + 4, '#0e0c1c');
      outlineRect(c, sx, sy, 11, word.length * 9 + 4, sh(col, 0.5));
      for (let i = 0; i < word.length; i++) {
        G.Font.draw(c, word[i], sx + 6, sy + 3 + i * 9, { color: sh(col, 0.5), align: 'center' });
        G.Font.draw(o.e, word[i], sx + 6, sy + 3 + i * 9, { color: col, align: 'center' });
      }
      o.glows.push({ dx: sx + 5, dy: sy + word.length * 4.5, r: 22, color: col, neon: true, tall: word.length * 9 });
      o.hasEmis = true;
    }
    // escalera de incendios
    if (rng.chance(0.3)) {
      const ex = Math.round(w * rng.range(0.25, 0.5));
      for (let y = 10; y < top - 4; y += 16) {
        fill(c, ex, y, 22, 1, '#0a0a14');
        for (let k = 0; k < 22; k += 3) fill(c, ex + k, y - 3, 1, 3, '#0a0a14');
        for (let k = 0; k < 14; k++) fill(c, ex + 4 + k, y + 1 + k, 2, 1, '#0a0a14');
      }
    }
    // planta baja con escaparate y neon
    const gy = top;
    fill(c, 0, gy, w, h - gy, sh(body, 0.8));
    fill(c, 0, gy, w, 2, sh(body, 1.3));
    const sign = G.Humor.fit(G.Humor.neon, w - 6, rng);
    const scol = rng.pick(NEON);
    if (G.Font.measure(sign) <= w - 4) neonText(o, sign, Math.round(w / 2), gy + 4, scol);
    const shopCol = rng.pick(['#ff7ad8', '#7af0ff', '#ffd66b', '#9aff7a']);
    fill(c, 4, gy + 14, w - 22, h - gy - 17, sh(shopCol, 0.35));
    fill(o.e, 4, gy + 14, w - 22, h - gy - 17, sh(shopCol, 0.75));
    for (let k = 6; k < w - 20; k += 5) fill(o.e, k, h - 6, 3, 3, sh(shopCol, 1.1));
    fill(c, w - 15, gy + 13, 10, h - gy - 14, '#0c0a18');
    fill(o.e, w - 14, gy + 14, 8, 3, sh(shopCol, 0.9));
    o.glows.push({ dx: (w - 18) / 2, dy: h - 8, r: 20, color: shopCol });
    o.hasEmis = true;
    return o;
  }

  function neonShop(rng) {
    const w = rng.int(64, 92), h = rng.int(70, 96);
    const o = mk(w, h);
    const c = o.b;
    const body = rng.pick(['#3a2440', '#24304a', '#402a2a', '#2a3a3a']);
    fill(c, 0, 18, w, h - 18, body);
    fill(c, 0, 18, w, 2, sh(body, 1.4));
    // gran letrero de azotea
    const sign = G.Humor.fit(G.Humor.rooftop, w - 10, rng);
    const col = rng.pick(NEON);
    const tw = Math.min(w - 2, G.Font.measure(sign) + 8);
    const bx = Math.round((w - tw) / 2);
    fill(c, bx + 3, 12, 2, 7, '#0a0814');
    fill(c, bx + tw - 5, 12, 2, 7, '#0a0814');
    fill(c, bx, 0, tw, 13, '#0e0c1c');
    outlineRect(c, bx, 0, tw, 13, sh(col, 0.5));
    outlineRect(o.e, bx, 0, tw, 13, sh(col, 0.8));
    neonText(o, sign, Math.round(w / 2), 3, col);
    // ventanas
    for (let y = 24; y < h - 26; y += 12) {
      for (let x = 5; x < w - 10; x += 12) {
        const lit = rng.chance(0.5);
        const lc = rng.pick(['#ffd66b', '#ff9ad8', '#7af0ff']);
        fill(c, x, y, 8, 7, lit ? sh(lc, 0.5) : '#141228');
        if (lit) fill(o.e, x, y, 8, 7, lc);
        fill(c, x, y + 7, 8, 1, sh(body, 1.3));
      }
    }
    // escaparate
    const shopCol = rng.pick(['#ff7ad8', '#7af0ff', '#ffd66b']);
    fill(c, 3, h - 22, w - 6, 18, sh(shopCol, 0.35));
    fill(o.e, 3, h - 22, w - 6, 18, sh(shopCol, 0.7));
    // farolillos
    for (let x = 6; x < w - 4; x += 9) {
      fill(c, x, h - 26, 4, 5, '#c02a2a');
      fill(o.e, x, h - 26, 4, 5, '#ff5a3a');
      o.glows.push({ dx: x + 2, dy: h - 24, r: 6, color: '#ff6a3a' });
    }
    awning(c, 0, h - 30, w, 3, '#1a1a2a', sh(col, 0.4));
    o.hasEmis = true;
    return o;
  }

  function alley(rng) {
    const w = rng.int(18, 28), h = 60;
    const o = mk(w, h);
    const c = o.b;
    for (let y = 0; y < h; y++) fill(c, 0, y, w, 1, G.mixHex('#07060e', '#161426', y / h));
    // contenedor
    fill(c, 2, h - 12, w - 4, 11, '#2a5a3a');
    fill(c, 2, h - 12, w - 4, 2, '#3a7a4a');
    fill(c, 3, h - 2, 2, 2, '#111');
    fill(c, w - 5, h - 2, 2, 2, '#111');
    // bombilla colgante
    fill(c, Math.round(w / 2), 0, 1, 18, '#0a0a12');
    fill(c, Math.round(w / 2) - 1, 18, 3, 2, '#2a2a3a');
    fill(o.e, Math.round(w / 2) - 1, 19, 3, 2, '#ffe9a0');
    o.glows.push({ dx: w / 2, dy: 20, r: 14, color: '#ffd080' });
    o.hasEmis = true;
    void rng;
    return o;
  }

  // ------------------------------------------------------------ Costa Tormenta
  function beachHut(rng) {
    const w = rng.int(34, 44), h = rng.int(34, 40);
    const o = mk(w + 4, h);
    const c = o.b;
    const [s1, s2] = rng.pick([['#e0453a', '#f4f0e6'], ['#2f6fd0', '#f4f0e6'], ['#f5b800', '#f4f0e6'], ['#2f9e5a', '#f4f0e6'], ['#d8508a', '#f4f0e6']]);
    const roofH = 10;
    for (let x = 0; x < w; x++) fill(c, 2 + x, roofH, 1, h - roofH - 3, Math.floor(x / 4) % 2 ? s2 : s1);
    for (let r = 0; r < roofH; r++) {
      const rw = Math.round(G.lerp(6, w + 4, r / (roofH - 1)));
      fill(c, Math.round((w + 4 - rw) / 2), r, rw, 1, r % 3 === 2 ? '#5a3a2a' : '#7a4e34');
    }
    fill(c, 2, roofH, w, 1, 'rgba(0,0,0,0.3)');
    const dx = Math.round(w / 2) - 4;
    fill(c, dx, h - 18, 10, 15, '#6a4028');
    fill(c, dx + 1, h - 17, 8, 13, '#8a5634');
    fill(c, dx + 7, h - 11, 1, 2, '#ffd04a');
    fill(c, 2, h - 3, w, 3, '#8a6a48');
    if (rng.chance(0.6)) { // tabla de surf
      const sc = rng.pick(['#4ad0e0', '#ff7a4a', '#f4f0e6', '#ffd04a']);
      ellipse(c, w - 2, h - 14, 3, 11, sc);
      fill(c, w - 2, h - 24, 1, 20, sh(sc, 0.7));
    }
    // luz del porche
    fill(c, dx - 4, h - 20, 2, 2, '#2a2a2a');
    fill(o.e, dx - 4, h - 20, 2, 2, '#ffe9a0');
    o.glows.push({ dx: dx - 3, dy: h - 19, r: 10, color: '#ffd080' });
    o.hasEmis = true;
    return o;
  }

  function kiosk(rng) {
    const w = rng.int(46, 58), h = 44;
    const o = mk(w, h);
    const c = o.b;
    fill(c, 3, 20, w - 6, h - 20, '#f4f0e6');
    fill(c, 3, 20, w - 6, 1, '#ffffff');
    fill(c, w - 5, 20, 2, h - 20, '#c8c0b0');
    awning(c, 0, 13, w, 5, '#4ab0e0', '#f4f0e6');
    fill(c, 4, 1, w - 8, 11, '#e04a8a');
    outlineRect(c, 4, 1, w - 8, 11, '#ffffff');
    const kn = G.Humor.fit(G.Humor.coast, w - 10, rng);
    G.Font.draw(c, kn, Math.round(w / 2), 3, { color: '#ffffff', align: 'center' });
    G.Font.draw(o.e, kn, Math.round(w / 2), 3, { color: '#fff0fa', align: 'center' });
    o.glows.push({ dx: w / 2, dy: 6, r: 18, color: '#ff8ad8', neon: true });
    fill(c, 7, 24, w - 14, 10, '#3c5a7a');
    fill(o.e, 7, 24, w - 14, 10, '#ffe0b0');
    for (let k = 9; k < w - 9; k += 5) {
      fill(o.e, k, 30, 3, 3, rng.pick(['#ff9ad8', '#ffe06a', '#9af0ff', '#9aff9a']));
    }
    // cucurucho gigante
    fill(c, w - 12, 22, 5, 2, '#ff9ad8');
    fill(c, w - 11, 24, 3, 5, '#d8a060');
    fill(c, 3, h - 4, w - 6, 4, '#8a8478');
    o.hasEmis = true;
    return o;
  }

  function lifeguard(rng) {
    const w = 34, h = 58;
    const o = mk(w, h);
    const c = o.b;
    fill(c, 7, 24, 2, h - 24, '#7a5234');
    fill(c, w - 9, 24, 2, h - 24, '#7a5234');
    for (let y = 30; y < h; y += 8) fill(c, 7, y, w - 14, 1, '#6a4428');
    fill(c, 3, 12, w - 6, 13, '#f4f0e6');
    fill(c, 3, 12, w - 6, 2, '#e0453a');
    fill(c, 8, 16, w - 16, 6, '#3c5a7a');
    fill(c, 1, 8, w - 2, 4, '#e0453a');
    fill(c, 1, 8, w - 2, 1, '#ff7a6a');
    fill(c, w - 6, 0, 1, 9, '#3a3a3a');
    fill(c, w - 5, 0, 6, 4, '#e0453a');
    fill(c, w - 4, 1, 3, 1, '#ffffff');
    fill(o.e, 8, 16, w - 16, 6, '#ffe0a0');
    o.hasEmis = true;
    void rng;
    return o;
  }

  function sandGap(rng) {
    const w = rng.int(30, 60), h = 12;
    const o = mk(w, h);
    void rng;
    return o;
  }

  // ------------------------------------------------------------ pizzerias de la competencia (parodias)
  function pizzaBrand(rng, night) {
    const brands = G.Humor.brands;
    const b = night && rng.chance(0.45) ? brands[0] : rng.pick(brands);
    const w = Math.max(84, G.Font.measure(b.name) + 16, G.Font.measure(b.tag) + 32), h = night ? 78 : 62;
    const o = mk(w, h);
    const c = o.b;
    const wall = night ? sh(b.col, 0.45) : sh(b.col, 1.0);
    fill(c, 0, 14, w, h - 14, night ? '#1e1a2e' : '#efe6d6');
    fill(c, 0, 14, w, 2, sh(wall, 1.2));
    fill(c, w - 2, 14, 2, h - 14, 'rgba(0,0,0,0.25)');
    // cartel principal
    fill(c, 2, 0, w - 4, 15, b.col);
    outlineRect(c, 2, 0, w - 4, 15, sh(b.col, 0.6));
    if (night) {
      G.Font.draw(c, b.name, Math.round(w / 2), 4, { color: sh(b.col2, 0.6), align: 'center', outline: '#0a0814' });
      G.Font.draw(o.e, b.name, Math.round(w / 2), 4, { color: b.col2, align: 'center' });
      fill(o.e, 2, 0, w - 4, 1, sh(b.col, 1.4)); fill(o.e, 2, 14, w - 4, 1, sh(b.col, 1.4));
      o.glows.push({ dx: w / 2, dy: 7, r: Math.max(20, w * 0.55), color: b.col, neon: true });
      if (b.rival) {
        // neon roto: una letra parpadea
        o.emisAlt = G.makeCanvas(w, h);
        o.emisAlt.ctx.drawImage(o.emis, 0, 0);
        const txt = G.Font.norm(b.name);
        const idx = 7;
        const x0 = Math.round(w / 2 - G.Font.measure(txt) / 2) + G.Font.measure(txt.slice(0, idx)) + (idx ? 1 : 0);
        o.emisAlt.ctx.clearRect(x0, 3, G.Font.measure(txt[idx]) + 1, 9);
        o.flicker = true;
      }
    } else {
      G.Font.draw(c, b.name, Math.round(w / 2), 4, { color: b.col2, align: 'center', outline: sh(b.col, 0.5) });
    }
    // logo de pizza
    const logo = G.A.img.pizza_whole;
    if (logo) c.drawImage(logo, 4, 18);
    // lema
    const tagW = G.Font.measure(b.tag);
    const tagOk = tagW <= w - 26;
    fill(c, 22, 18, w - 26, 11, night ? '#0e0c1c' : '#ffffff');
    outlineRect(c, 22, 18, w - 26, 11, sh(b.col, 0.8));
    G.Font.draw(c, tagOk ? b.tag : b.tag.split(' ')[0], Math.round(22 + (w - 26) / 2), 20, { color: night ? b.col2 : sh(b.col, 0.7), align: 'center' });
    if (night) { G.Font.draw(o.e, tagOk ? b.tag : b.tag.split(' ')[0], Math.round(22 + (w - 26) / 2), 20, { color: b.col2, align: 'center' }); }
    awning(c, 1, 32, w - 2, 5, b.col, b.col2 === '#2a2a2a' ? '#f4f0e6' : b.col2);
    // escaparate con pizzas y puerta
    const gy = 40;
    fill(c, 5, gy, w - 24, h - gy - 5, '#3c5a7a');
    fill(o.e, 5, gy, w - 24, h - gy - 5, night ? '#ffb070' : '#ffd88a');
    for (let k = 7; k < w - 22; k += 12) {
      if (G.A.img.slice) { c.drawImage(G.A.img.slice, k, h - 22); o.e.drawImage(G.A.img.slice, k, h - 22); }
    }
    fill(c, w - 16, gy, 11, h - gy - 4, '#4a3020');
    fill(c, w - 15, gy + 1, 9, h - gy - 6, '#6a4a30');
    fill(c, 0, h - 4, w, 4, night ? '#141020' : '#b8a898');
    o.hasEmis = true;
    o.brand = b;
    return o;
  }

  // valla publicitaria con chiste (prop de acera)
  function billboard(rng) {
    const lines = G.Humor.pick(G.Humor.billboards, rng);
    const tw = Math.max(G.Font.measure(lines[0]), G.Font.measure(lines[1]));
    const w = tw + 12, bh = 24, h = bh + 22;
    const o = mk(w, h);
    const c = o.b;
    const bg = rng.pick(['#2a4a8a', '#8a2a4a', '#2a6a4a', '#5a2a7a', '#e0a020', '#1f5f7f']);
    fill(c, 6, bh, 2, h - bh, '#4a4452');
    fill(c, w - 8, bh, 2, h - bh, '#4a4452');
    fill(c, 4, bh + 6, w - 8, 2, '#3a3442');
    fill(c, 0, 0, w, bh, '#1a1424');
    fill(c, 1, 1, w - 2, bh - 2, bg);
    fill(c, 1, 1, w - 2, 2, sh(bg, 1.25));
    const dark = bg === '#e0a020';
    G.Font.draw(c, lines[0], Math.round(w / 2), 4, { color: dark ? '#2a1a10' : '#ffe23f', align: 'center', outline: dark ? null : '#140c1c' });
    G.Font.draw(c, lines[1], Math.round(w / 2), 14, { color: dark ? '#4a2a10' : '#ffffff', align: 'center' });
    // focos
    for (const fx of [6, w - 10]) {
      fill(c, fx, -0, 4, 2, '#2a2a34');
      fill(o.e, fx, 0, 4, 2, '#fff6c8');
    }
    fill(o.e, 1, 1, w - 2, bh - 2, sh(bg, 0.55));
    G.Font.draw(o.e, lines[0], Math.round(w / 2), 4, { color: dark ? '#2a1a10' : '#ffe23f', align: 'center' });
    G.Font.draw(o.e, lines[1], Math.round(w / 2), 14, { color: dark ? '#4a2a10' : '#ffffff', align: 'center' });
    o.glows.push({ dx: w / 2, dy: bh / 2, r: Math.max(18, w * 0.5), color: '#fff0c0' });
    o.hasEmis = true;
    return o;
  }

  // senal de trafico absurda (prop de acera)
  function roadSign(type) {
    const lines = G.Humor.signs[type] || ['?', '?'];
    const pw = Math.max(G.Font.measure(lines[0]), G.Font.measure(lines[1])) + 6;
    const w = Math.max(pw, 19), sgn = 17, ph = 19;
    const h = sgn + ph + 16;
    const o = mk(w, h);
    const c = o.b;
    const cx = Math.floor(w / 2);
    fill(c, cx - 1, sgn, 2, h - sgn, '#8a8a96');
    fill(c, cx, sgn, 1, h - sgn, '#c8c8d0');
    // placa con el texto
    const py = sgn + 2;
    fill(c, cx - Math.floor(pw / 2), py, pw, ph, '#1a1424');
    fill(c, cx - Math.floor(pw / 2) + 1, py + 1, pw - 2, ph - 2, '#f4f0e6');
    G.Font.draw(c, lines[0], cx, py + 2, { color: '#1a1424', align: 'center' });
    G.Font.draw(c, lines[1], cx, py + 10, { color: type === 'pizza' ? '#c02a2a' : '#1a1424', align: 'center' });
    // senal (triangulo, circulo o cuadrado)
    const round = type === 'speed' || type === 'noparking';
    const square = type === 'pizza';
    if (square) {
      fill(c, cx - 8, 0, 17, 17, '#1a1424');
      fill(c, cx - 7, 1, 15, 15, '#2f6fd0');
      if (G.A.img.slice) c.drawImage(G.A.img.slice, cx - 7, 1);
    } else if (round) {
      circle(c, cx, 8, 8, '#1a1424');
      circle(c, cx, 8, 7, type === 'noparking' ? '#2f6fd0' : '#e0302a');
      circle(c, cx, 8, 5, type === 'noparking' ? '#2f6fd0' : '#ffffff');
      if (type === 'speed') {
        if (G.A.img.slice) c.drawImage(G.A.img.slice, cx - 7, 1, 13, 13);
      } else {
        for (let i = -5; i <= 5; i++) fill(c, cx + i, 8 - i, 2, 1, '#e0302a');
        giraffe(c, cx - 3, 4, '#ffd21f');
      }
    } else {
      const row = (r, inset, col) => {
        const hw = Math.round(r * 0.55) - inset;
        if (hw >= 0) fill(c, cx - hw, r, hw * 2 + 1, 1, col);
      };
      for (let r = 0; r < 17; r++) row(r, -1, '#1a1424');
      for (let r = 1; r < 16; r++) row(r, 0, '#e0302a');
      for (let r = 5; r < 14; r++) row(r, 2, '#ffffff');
      icon(c, type, cx, 8);
    }
    return o;
  }
  function giraffe(c, x, y, col) {
    fill(c, x + 3, y, 2, 1, col); fill(c, x + 2, y + 1, 4, 2, col); fill(c, x + 2, y + 3, 2, 4, col);
    fill(c, x + 3, y - 1, 1, 1, '#1a1424'); fill(c, x + 5, y + 1, 1, 1, '#1a1424');
  }
  function icon(c, type, cx, cy) {
    const k = '#1a1424';
    if (type === 'giraffe') { giraffe(c, cx - 3, cy - 3, k); fill(c, cx - 3, cy + 3, 5, 2, k); }
    else if (type === 'gull') { fill(c, cx - 4, cy, 3, 1, k); fill(c, cx - 1, cy + 1, 3, 1, k); fill(c, cx + 2, cy, 3, 1, k); fill(c, cx - 5, cy - 1, 1, 1, k); fill(c, cx + 5, cy - 1, 1, 1, k); }
    else if (type === 'phone') { fill(c, cx - 2, cy - 3, 5, 7, k); fill(c, cx - 1, cy - 2, 3, 4, '#8ff3ff'); }
    else if (type === 'wave') { for (let i = -4; i <= 4; i++) fill(c, cx + i, cy + Math.round(Math.sin(i) * 1.5), 1, 2, '#2f6fd0'); }
    else { fill(c, cx, cy - 3, 1, 5, k); fill(c, cx, cy + 3, 1, 1, k); }
  }

  // ------------------------------------------------------------ fabrica
  function makeFacade(biome, rng) {
    let o;
    const r = rng.next();
    if (biome !== 'storm' && rng.chance(biome === 'neon' ? 0.1 : 0.07)) {
      o = pizzaBrand(rng, biome === 'neon');
    } else if (biome === 'sunset') {
      if (r < 0.42) o = house(rng);
      else if (r < 0.66) o = shop(rng);
      else if (r < 0.86) o = apartment(rng);
      else if (r < 0.93 && G.A.img.house) o = sprite('house');
      else o = garden(rng);
    } else if (biome === 'neon') {
      if (r < 0.58) o = tower(rng);
      else if (r < 0.86) o = neonShop(rng);
      else o = alley(rng);
    } else {
      if (r < 0.06) o = pizzaBrand(rng, true);
      else if (r < 0.34) o = beachHut(rng);
      else if (r < 0.52) o = kiosk(rng);
      else if (r < 0.62) o = lifeguard(rng);
      else o = sandGap(rng);
    }
    o.biome = biome;
    return o;
  }

  function sprite(name) {
    const im = G.A.img[name];
    const o = mk(im.width, im.height);
    o.b.drawImage(im, 0, 0);
    if (name === 'house') {
      // ventanas del sprite iluminadas al atardecer
      o.glows.push({ dx: im.width * 0.3, dy: im.height * 0.55, r: 16, color: '#ffc870' });
    }
    return o;
  }

  // ------------------------------------------------------------ carretera
  const roads = {};
  const TILE = 64;
  function roadTile(id) {
    if (roads[id] && roads[id].H === G.H) return roads[id];
    const b = G.Biomes.DEF[id], r = b.road, L = G.L;
    const h = G.H - L.walkTop0;
    const cnv = G.makeCanvas(TILE, h);
    const c = cnv.ctx;
    const rng = new G.RNG(99 + id.length);
    const top = 0, curb = L.curbTop - L.walkTop0, road = L.roadTop - L.walkTop0, rb = L.roadBot - L.walkTop0;
    // acera norte
    if (b.facade === 'coast') {
      // paseo de tablones de madera
      for (let x = 0; x < TILE; x++) fill(c, x, top, 1, curb, Math.floor(x / 4) % 2 ? r.walk : r.walk2);
      for (let x = 0; x < TILE; x += 4) fill(c, x, top, 1, curb, r.joint);
      for (let y = 5; y < curb; y += 8) for (let x = (y % 16 ? 2 : 0); x < TILE; x += 16) fill(c, x, y, 1, 1, sh(r.joint, 0.8));
    } else {
      fill(c, 0, top, TILE, curb, r.walk);
      for (let y = top; y < curb; y += 11) {
        for (let x = (Math.floor(y / 11) % 2) * 8; x < TILE; x += 16) fill(c, x, y + 1, 8, 10, r.walk2);
        fill(c, 0, y, TILE, 1, r.joint);
      }
      for (let x = 0; x < TILE; x += 8) fill(c, x, top, 1, curb, r.joint);
    }
    fill(c, 0, top, TILE, 2, 'rgba(10,5,20,0.28)');
    // bordillo norte (cara superior + frontal)
    fill(c, 0, curb, TILE, 2, r.curbTop);
    fill(c, 0, curb + 2, TILE, 2, r.curbFace);
    for (let x = 0; x < TILE; x += 16) fill(c, x, curb, 1, 4, sh(r.curbFace, 0.8));
    // asfalto
    fill(c, 0, road, TILE, rb - road, r.asphalt);
    for (let i = 0; i < 160; i++) fill(c, rng.int(0, TILE - 1), rng.int(road, rb - 1), 1, 1, rng.chance(0.5) ? r.speck : r.asphalt2);
    for (let i = 0; i < 6; i++) fill(c, rng.int(0, TILE - 4), rng.int(road + 2, rb - 3), rng.int(2, 5), 1, r.asphalt2);
    fill(c, 0, road, TILE, 2, sh(r.asphalt, 0.75));
    // marcas viales
    fill(c, 0, road + 3, TILE, 1, r.line);
    fill(c, 0, rb - 3, TILE, 1, r.line);
    for (let x = 0; x < TILE; x += 32) {
      fill(c, x, road + G.LANE_H, 18, 1, r.line);
      fill(c, x, road + G.LANE_H * 3, 18, 1, r.line);
    }
    fill(c, 0, road + G.LANE_H * 2 - 2, TILE, 1, r.center);
    fill(c, 0, road + G.LANE_H * 2, TILE, 1, r.center);
    // bordillo sur
    fill(c, 0, rb, TILE, 3, r.curbTop);
    fill(c, 0, rb + 3, TILE, 1, sh(r.curbTop, 0.7));
    // acera sur
    const wb = rb + 4;
    fill(c, 0, wb, TILE, h - wb, r.walkBot);
    for (let y = wb; y < h; y += 12) {
      for (let x = (Math.floor((y - wb) / 12) % 2) * 8; x < TILE; x += 16) fill(c, x, y + 1, 8, 11, sh(r.walkBot, 0.93));
      fill(c, 0, y, TILE, 1, sh(r.walkBot, 0.8));
    }
    for (let x = 0; x < TILE; x += 8) fill(c, x, wb, 1, h - wb, sh(r.walkBot, 0.85));
    if (b.facade === 'coast' && r.sand) {
      // arena arrastrada por el viento sobre el asfalto
      for (let i = 0; i < 40; i++) {
        const x = rng.int(0, TILE - 1), y = road + rng.int(0, 5);
        fill(c, x, y, rng.int(1, 4), 1, r.sand);
      }
      for (let i = 0; i < 30; i++) fill(c, rng.int(0, TILE - 1), rb - rng.int(1, 6), rng.int(1, 4), 1, r.sand);
    }
    roads[id] = { c: cnv, H: G.H };
    return roads[id];
  }

  // dibuja la carretera; cambia de barrio en borderX (mundo)
  function drawRoad(ctx, camX, idA, idB, borderX) {
    const L = G.L;
    const tA = roadTile(idA).c;
    const bx = borderX === null || borderX === undefined ? Infinity : Math.round(borderX - camX);
    const startX = -(((Math.floor(camX) % TILE) + TILE) % TILE);
    for (let x = startX; x < G.W; x += TILE) {
      if (x >= bx) break;
      const w = Math.min(TILE, bx - x);
      ctx.drawImage(tA, 0, 0, w, tA.height, x, L.walkTop0, w, tA.height);
    }
    if (bx < G.W && idB) {
      const tB = roadTile(idB).c;
      for (let x = startX; x < G.W; x += TILE) {
        if (x + TILE <= bx) continue;
        const sx = Math.max(0, bx - x);
        ctx.drawImage(tB, sx, 0, TILE - sx, tB.height, x + sx, L.walkTop0, TILE - sx, tB.height);
      }
    }
  }

  // barandilla del paseo maritimo (Costa): tramo entre x0 y x1 de pantalla
  function drawRailing(ctx, camX, x0, x1) {
    const L = G.L;
    const y = L.walkTop0 - 8;
    x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(G.W, Math.ceil(x1));
    if (x1 <= x0) return;
    fill(ctx, x0, y, x1 - x0, 1, '#e8eef0');
    fill(ctx, x0, y + 1, x1 - x0, 1, '#9ab0b8');
    fill(ctx, x0, y + 5, x1 - x0, 1, '#c8d4d8');
    const off = ((Math.floor(camX) % 6) + 6) % 6;
    for (let x = x0 - off; x < x1; x += 6) if (x >= x0) fill(ctx, x, y + 1, 1, 8, '#d0dadd');
    const off2 = ((Math.floor(camX) % 48) + 48) % 48;
    for (let x = x0 - off2; x < x1; x += 48) if (x >= x0) { fill(ctx, x, y - 2, 2, 11, '#f4f8fa'); fill(ctx, x + 2, y - 1, 1, 10, '#8aa0a8'); }
    fill(ctx, x0, L.walkTop0, x1 - x0, 1, 'rgba(0,0,0,0.25)');
  }

  return { makeFacade, drawRoad, drawRailing, roadTile, billboard, roadSign, clear() { for (const k of Object.keys(roads)) delete roads[k]; } };
})();
