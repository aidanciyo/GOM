/* HUD: vida, retrato, tiempo, puntos, combo, pizzas, GPS, avisos y controles tactiles */
'use strict';

G.HUD = (() => {
  const F = () => G.Font;
  const INK = '#1a0f24';

  function panel(ctx, x, y, w, h, fillA) {
    ctx.globalAlpha = fillA === undefined ? 0.72 : fillA;
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5b800';
    ctx.fillRect(x + 1, y, w - 2, 1);
    ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
    ctx.fillRect(x, y + 1, 1, h - 2);
    ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
  }

  function heartIcon(ctx, x, y, full, pulse) {
    if (full) {
      const s = pulse ? 1 : 0;
      G.A.drawAt(ctx, 'heart', 0, x - s, y - s);
    } else {
      const src = G.A.tinted('heart', '#3a2a44');
      ctx.drawImage(src, Math.round(x), Math.round(y));
    }
  }

  function drawTop(ctx, run) {
    const p = run.player;
    const W = G.W;
    // --- retrato + corazones + turbo
    panel(ctx, 3, 3, 26, 30);
    const face = 'face_' + p.face;
    const shakeF = p.face === 5 && p.faceT > 0 ? Math.round(Math.sin(G.t * 50)) : 0;
    G.A.drawAt(ctx, face, 0, 6 + shakeF, 5);
    for (let i = 0; i < p.maxHearts; i++) {
      const pulse = i === p.hearts - 1 && p.hearts <= 1 && Math.floor(G.t * 4) % 2 === 0;
      heartIcon(ctx, 32 + i * 14, 4, i < p.hearts, pulse);
    }
    if (p.shield > 0) G.A.drawAt(ctx, 'helmet', 0, 32 + p.maxHearts * 14, 3);
    // barra de turbo
    const bx = 33, by = 20, bw = 56;
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = '#2a2238';
    ctx.fillRect(bx, by, bw, 5);
    const val = p.turboOn ? p.turboT / p.turboDur : p.turbo;
    const ready = p.turbo >= 0.35 && !p.turboOn;
    ctx.fillStyle = p.turboOn ? p.trail.colors[1] || '#ffd21f' : ready && Math.floor(G.t * 6) % 2 ? '#fff6b0' : '#f5b800';
    ctx.fillRect(bx, by, Math.round(bw * G.clamp(val, 0, 1)), 5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx, by, Math.round(bw * G.clamp(val, 0, 1)), 1);
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(bx + Math.round(bw * 0.35), by, 1, 5);
    G.A.drawAt(ctx, 'bolt', 0, bx + bw + 2, by - 5);
    // pizzas y ruta
    G.A.drawAt(ctx, 'pizza_box', 0, 32, 28);
    const low = run.pizzas <= 1;
    F().draw(ctx, '×' + run.pizzas, 56, 31, { color: low && Math.floor(G.t * 4) % 2 ? '#ff6a6a' : '#ffffff', outline: INK });
    const plan = run.plan;
    if (plan) {
      const done = plan.served + plan.lost;
      F().draw(ctx, 'RUTA ' + (plan.index + 1) + ' · ' + Math.min(done, plan.n) + '/' + plan.n, 74, 31, { color: '#f5b800', outline: INK });
    }

    // --- cronometro
    const t = run.time;
    const low2 = t < 10 && run.state === 'play';
    const tw = 70, tx = Math.round(W / 2 - tw / 2);
    const jitter = low2 ? Math.round(Math.sin(G.t * 40) * (t < 5 ? 1 : 0.6)) : 0;
    panel(ctx, tx + jitter, 3, tw, 20);
    G.A.drawAt(ctx, 'stopwatch', 0, tx + 3 + jitter, 5);
    const ts = G.fmtTime(Math.ceil(t));
    const col = low2 ? (Math.floor(G.t * 4) % 2 ? '#ff4a4a' : '#ffb0b0') : '#ffe23f';
    F().draw(ctx, ts, tx + 46 + jitter, 7, { color: col, outline: INK, scale: 2, align: 'center' });
    // puntuacion y multiplicador
    F().draw(ctx, G.fmtInt(run.score), W / 2, 26, { color: '#ffffff', outline: INK, align: 'center' });
    if (run.mult > 1) {
      const mx = W / 2 + F().measure(G.fmtInt(run.score)) / 2 + 6;
      const pop = 1 + Math.max(0, 0.3 - (G.t % 0.6)) * 0;
      ctx.fillStyle = '#ff4fd8';
      ctx.fillRect(Math.round(mx - 1), 24, 18 * pop, 11);
      F().draw(ctx, '×' + run.mult, mx + 8, 26, { color: '#ffffff', outline: '#5a0a4a', align: 'center' });
    }
    if (run.fever > 0) {
      const fw = 70;
      ctx.fillStyle = '#0d0a16';
      ctx.fillRect(W / 2 - fw / 2 - 1, 37, fw + 2, 5);
      ctx.fillStyle = Math.floor(G.t * 10) % 2 ? '#ffd21f' : '#ff7a1a';
      ctx.fillRect(W / 2 - fw / 2, 38, Math.round(fw * run.fever / 8), 3);
      F().draw(ctx, 'PIZZA FEVER', W / 2, 44, { color: '#ffd21f', outline: INK, align: 'center' });
    } else if (run.combo >= 2) {
      F().draw(ctx, 'COMBO ' + run.combo, W / 2, 38, { color: '#ffb0f0', outline: INK, align: 'center' });
    }

    // --- GPS
    drawGPS(ctx, run);
  }

  function drawGPS(ctx, run) {
    const p = run.player;
    const w = 104, h = 40, x = G.W - w - 4, y = 3;
    // marco del dispositivo
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#3a3448';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = '#12301e';
    ctx.fillRect(x + 3, y + 3, w - 6, h - 12);
    // cuadricula
    ctx.fillStyle = '#1c4a2e';
    for (let gx = x + 3 + ((-Math.floor(p.x / 6)) % 10 + 10) % 10; gx < x + w - 3; gx += 10) ctx.fillRect(gx, y + 3, 1, h - 12);
    const range = 1500;
    const x0 = x + 12, x1 = x + w - 8;
    const cy = y + 3 + (h - 12) / 2;
    const toX = (wx) => x0 + ((wx - p.x) / range) * (x1 - x0);
    // carretera
    ctx.fillStyle = '#e8c85a';
    ctx.fillRect(x + 3, Math.round(cy), w - 6, 1);
    // pizzeria siguiente
    const plan = run.plan;
    let cpText = '';
    for (const r of run.gen.routes) {
      const dx = r.cpX - p.x;
      if (dx < -20) continue;
      if (dx <= range) {
        const px = toX(r.cpX);
        G.A.drawAt(ctx, 'slice', 0, Math.round(px - 6), Math.round(cy - 7));
      }
      if (!cpText) cpText = 'PIZZERÍA ' + G.fmtInt(Math.max(0, dx / 12)) + ' M';
      break;
    }
    // clientes planificados
    for (const r of run.gen.routes) {
      for (const c of r.customers) {
        const dx = c.x - p.x;
        if (dx < -30 || dx > range) continue;
        const st = c.ent ? c.ent.state : 'wait';
        const px = Math.round(toX(c.x));
        const py = Math.round(c.side === 'top' ? cy - 6 : cy + 3);
        const col = st === 'served' ? '#4ff3a0' : st === 'wait' ? (c.vip ? '#ffd21f' : '#ff4a5a') : '#5a5a6a';
        ctx.fillStyle = col;
        ctx.fillRect(px - 1, py, 3, 3);
        ctx.fillRect(px, c.side === 'top' ? py + 3 : py - 1, 1, 1);
      }
    }
    // rivales
    for (const e of run.ents) {
      if (!(e instanceof G.E.Rival)) continue;
      const dx = e.x - p.x;
      if (dx < -30 || dx > range) continue;
      ctx.fillStyle = Math.floor(G.t * 6) % 2 ? '#ff2a2a' : '#ff9a9a';
      ctx.fillRect(Math.round(toX(e.x)) - 1, Math.round(cy + 5), 3, 2);
    }
    // GOM
    ctx.fillStyle = '#ffd21f';
    const gx = Math.round(toX(p.x)), gy = Math.round(cy - 2 + (p.y - 44) / 30);
    ctx.fillRect(gx - 2, gy, 2, 5);
    ctx.fillRect(gx, gy + 1, 2, 3);
    ctx.fillRect(gx + 2, gy + 2, 1, 1);
    F().draw(ctx, cpText, x + w / 2, y + h - 8, { color: '#9affc0', align: 'center' });
    void plan;
  }

  function drawIndicators(ctx, run) {
    const p = run.player;
    // aviso de rafaga de viento
    if (run.gust) {
      const g = run.gust;
      const a = g.t < g.warn ? (Math.floor(G.t * 10) % 2 ? 1 : 0.4) : 0.7;
      ctx.globalAlpha = a;
      const y = g.dir > 0 ? G.L.roadBot - 6 : G.L.roadTop + 6;
      F().draw(ctx, '¡VIENTO! ' + (g.dir > 0 ? '↓' : '↑'), G.W / 2, g.dir > 0 ? G.L.roadTop + 20 : G.L.roadTop + 60, { color: '#e8f8ff', outline: INK, align: 'center' });
      ctx.globalAlpha = 1;
      void y;
    }
    // clientes a punto de entrar por la derecha
    for (const c of run.customers) {
      if (c.state !== 'wait') continue;
      const sx = c.x - run.camX;
      if (sx > G.W - 4 && sx < G.W + 260) {
        const y = G.L.roadTop + c.zoneY;
        const a = 0.6 + 0.4 * Math.sin(G.t * 10);
        ctx.globalAlpha = a;
        ctx.fillStyle = c.vip ? '#ffd21f' : '#4ff3a0';
        for (let i = 0; i < 5; i++) ctx.fillRect(G.W - 8 + i, y - 4 + i, 1, 9 - i * 2);
        ctx.globalAlpha = 1;
        G.A.drawAt(ctx, 'slice', 0, G.W - 24, y - 7);
      }
    }
    // avisos de taxi kamikaze
    for (const e of run.ents) {
      if (e instanceof G.E.Vehicle && e.warn > 0) {
        const y = G.L.roadTop + e.y - 14;
        if (Math.floor(G.t * 12) % 2) {
          ctx.fillStyle = '#ff3a2a';
          ctx.fillRect(G.W - 16, y - 2, 12, 16);
          F().draw(ctx, '!', G.W - 10, y + 2, { color: '#ffffff', align: 'center', scale: 1 });
        }
      }
    }
    void p;
  }

  function drawBanner(ctx, run) {
    const b = run.banner;
    if (!b) return;
    const k = b.t / b.life;
    const pop = b.t < 0.18 ? G.ease.outBack(b.t / 0.18) : 1;
    const a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    ctx.globalAlpha = a;
    const cy = G.H * 0.36;
    if (b.biome) {
      // cartel de barrio: franja cinematografica
      const h = 34;
      ctx.fillStyle = 'rgba(10,6,20,0.7)';
      ctx.fillRect(0, cy - h / 2, G.W, h);
      ctx.fillStyle = '#f5b800';
      ctx.fillRect(0, cy - h / 2, G.W, 1);
      ctx.fillRect(0, cy + h / 2 - 1, G.W, 1);
      F().draw(ctx, b.sub || '', G.W / 2, cy - 12, { color: '#f5b800', align: 'center' });
      G.Font.drawFancy(ctx, b.text, G.W / 2, cy + 4, { scale: 2 }, pop);
      if (b.tag) F().draw(ctx, b.tag, G.W / 2, cy + 20, { color: '#c8c0e0', align: 'center' });
    } else {
      const sc = b.text.length <= 2 ? 6 : b.text.length > 12 ? 2 : 3;
      G.Font.drawFancy(ctx, b.text, G.W / 2, cy, { scale: sc, top: b.top, bottom: b.bottom }, pop);
      if (b.sub) F().draw(ctx, b.sub, G.W / 2, cy + 18, { color: '#ffffff', outline: INK, align: 'center' });
    }
    ctx.globalAlpha = 1;
  }

  function drawHint(ctx, run) {
    const h = run.hint;
    if (!h || run.paused) return;
    const a = h.t < 0.2 ? h.t / 0.2 : h.t > h.life - 0.3 ? (h.life - h.t) / 0.3 : 1;
    const w = F().measure(h.text) + 16;
    const x = Math.round(G.W / 2 - w / 2), y = 48;
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(x, y, w, 15);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#4ff3a0';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + 14, w, 1);
    F().draw(ctx, h.text, G.W / 2, y + 4, { color: '#ffffff', align: 'center' });
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ controles tactiles
  function layoutButtons(run) {
    const W = G.W, H = G.H;
    const p = run.player;
    const b = [
      { id: 'throw', x: W - 40, y: H - 42, r: 27 },
      { id: 'turbo', x: W - 96, y: H - 30, r: 17 },
      { id: 'pause', x: W - 124, y: 14, r: 9 },
    ];
    if (p.jumpLevel > 0) b.push({ id: 'jump', x: W - 36, y: H - 104, r: 16 });
    if (p.cannonCharges > 0 || p.cannon > 0) b.push({ id: 'cannon', x: W - 92, y: H - 76, r: 14 });
    return b;
  }

  function circleBtn(ctx, x, y, r, pressed, col, fillA) {
    ctx.globalAlpha = fillA;
    ctx.fillStyle = pressed ? col : '#0d0a16';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, G.TAU);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, fillA + 0.35);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 0.5, y + 0.5, r, 0, G.TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawTouch(ctx, run) {
    const btns = layoutButtons(run);
    G.Input.setButtons(btns);
    if (!G.Input.touch) {
      // solo el boton de pausa (raton)
      return;
    }
    const p = run.player;
    for (const b of btns) {
      const pressed = G.Input.isPressed(b.id);
      if (b.id === 'throw') {
        circleBtn(ctx, b.x, b.y, b.r, pressed, '#ffd21f', 0.35);
        ctx.globalAlpha = 0.85;
        G.A.drawAt(ctx, 'pizza_box_big', 0, b.x - 22, b.y - 18, 1);
        ctx.globalAlpha = 1;
        F().draw(ctx, 'LANZAR', b.x, b.y + 12, { color: '#ffffff', outline: INK, align: 'center' });
      } else if (b.id === 'turbo') {
        const ready = p.turbo >= 0.35 && !p.turboOn;
        circleBtn(ctx, b.x, b.y, b.r, pressed || p.turboOn, ready ? '#fff06a' : '#6a6080', ready ? 0.45 : 0.25);
        // anillo de carga
        ctx.strokeStyle = ready ? '#ffd21f' : '#8a8098';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 3, -Math.PI / 2, -Math.PI / 2 + G.TAU * G.clamp(p.turbo, 0, 1));
        ctx.stroke();
        ctx.lineWidth = 1;
        G.A.drawAt(ctx, 'bolt', 0, b.x - 7, b.y - 9);
      } else if (b.id === 'jump') {
        const ok = p.jumpCD <= 0;
        circleBtn(ctx, b.x, b.y, b.r, pressed, ok ? '#7af0ff' : '#5a5a6a', 0.3);
        G.A.drawAt(ctx, 'ramp', 0, b.x - 12, b.y - 14);
        if (!ok) F().draw(ctx, p.jumpCD.toFixed(1), b.x, b.y + 12, { color: '#ffffff', outline: INK, align: 'center' });
      } else if (b.id === 'cannon') {
        circleBtn(ctx, b.x, b.y, b.r, pressed || p.cannon > 0, '#ffb020', 0.3);
        G.A.drawAt(ctx, 'box_logo', 0, b.x - 9, b.y - 9);
        F().draw(ctx, '×' + p.cannonCharges, b.x + 10, b.y + 8, { color: '#ffffff', outline: INK });
      }
    }
    // joystick
    const s = G.Input.stick;
    if (s.active) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s.ox, s.oy, 26, 0, G.TAU); ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#f5b800';
      ctx.beginPath(); ctx.arc(s.ox + G.clamp(s.x - s.ox, -26, 26), s.oy + G.clamp(s.y - s.oy, -26, 26), 11, 0, G.TAU); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (run.t < 12) {
      ctx.globalAlpha = 0.18 + 0.1 * Math.sin(G.t * 4);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(60, G.H - 50, 26, 0, G.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(60, G.H - 50, 10, 0, G.TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawPause(ctx) {
    const b = G.Input.buttons.find((x) => x.id === 'pause');
    if (!b) return;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(b.x - 8, b.y - 8, 16, 16);
    ctx.fillStyle = '#f5b800';
    ctx.fillRect(b.x - 4, b.y - 4, 3, 9);
    ctx.fillRect(b.x + 1, b.y - 4, 3, 9);
    ctx.globalAlpha = 1;
  }

  function drawEffects(ctx, run) {
    // fever: borde dorado
    if (run.fever > 0) {
      const a = 0.45 + 0.25 * Math.sin(G.t * 10);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd21f';
      ctx.fillRect(0, 0, G.W, 2); ctx.fillRect(0, G.H - 2, G.W, 2);
      ctx.fillRect(0, 0, 2, G.H); ctx.fillRect(G.W - 2, 0, 2, G.H);
      ctx.globalAlpha = 1;
    }
    // poco tiempo: vineta roja
    if (run.time < 10 && run.state === 'play') {
      const a = (0.25 + 0.2 * Math.sin(G.t * 8)) * (1 - run.time / 10);
      const v = G.A.glow(64, '#ff0000', 0.1);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ff2020';
      ctx.fillRect(0, 0, G.W, 3); ctx.fillRect(0, G.H - 3, G.W, 3);
      ctx.fillRect(0, 0, 3, G.H); ctx.fillRect(G.W - 3, 0, 3, G.H);
      ctx.globalAlpha = 1;
      void v;
    }
  }

  function draw(ctx, run) {
    drawEffects(ctx, run);
    drawIndicators(ctx, run);
    drawTop(ctx, run);
    drawBanner(ctx, run);
    drawHint(ctx, run);
    drawTouch(ctx, run);
    drawPause(ctx);
  }

  return { draw, panel, layoutButtons };
})();
