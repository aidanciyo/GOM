/* Efectos: particulas, textos flotantes, sacudidas, destellos y camara lenta */
'use strict';

G.FX = (() => {
  const parts = [];
  const texts = [];
  let shake = 0;
  let flashA = 0, flashColor = '#fff';
  let slowT = 0, slowScale = 1;
  const MAX = 700;

  // p: {x, y, vx, vy, g, drag, life, size, size1, color, colors, kind, world, glow, rot, vr, sprite}
  function spawn(p) {
    if (parts.length >= MAX) parts.shift();
    p.t = 0;
    p.life = p.life || 0.6;
    p.vx = p.vx || 0; p.vy = p.vy || 0;
    p.g = p.g || 0; p.drag = p.drag === undefined ? 0 : p.drag;
    p.size = p.size === undefined ? 2 : p.size;
    p.kind = p.kind || 'rect';
    p.rot = p.rot || 0; p.vr = p.vr || 0;
    parts.push(p);
    return p;
  }

  function burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.angle !== undefined ? o.angle : 0) + (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : G.TAU);
      const sp = G.lerp(o.speedMin || 20, o.speedMax || 80, Math.random());
      spawn({
        x: x + (Math.random() - 0.5) * (o.jitter || 0), y: y + (Math.random() - 0.5) * (o.jitterY || o.jitter || 0),
        vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        g: o.g || 0, drag: o.drag || 0, life: G.lerp(o.lifeMin || 0.3, o.lifeMax || 0.7, Math.random()),
        size: o.size || 2, size1: o.size1, kind: o.kind || 'rect', world: o.world !== false,
        color: o.colors ? o.colors[Math.floor(Math.random() * o.colors.length)] : o.color || '#fff',
        glow: o.glow, rot: Math.random() * G.TAU, vr: (Math.random() - 0.5) * (o.vr || 0), sprite: o.sprite,
        front: o.front, ui: o.ui,
      });
    }
  }

  function text(str, x, y, o) {
    o = o || {};
    texts.push({
      str, x, y, vy: o.vy === undefined ? -28 : o.vy, t: 0, life: o.life || 0.9,
      color: o.color || '#fff', outline: o.outline || '#1a0f24', scale: o.scale || 1,
      world: o.world !== false, fancy: o.fancy, top: o.top, bottom: o.bottom, big: o.big,
      delay: o.delay || 0,
    });
  }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      if (t.delay > 0) { t.delay -= dt; continue; }
      t.t += dt;
      if (t.t >= t.life) { texts.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.exp(-3 * dt);
    }
    shake = Math.max(0, shake - dt * 1.8);
    flashA = Math.max(0, flashA - dt * 3.5);
    if (slowT > 0) { slowT -= dt; if (slowT <= 0) slowScale = 1; }
  }

  // capa: false/undefined = mundo, true = delante, 'ui' = interfaz
  function drawParticles(ctx, camX, front) {
    for (const p of parts) {
      const layer = p.ui ? 'ui' : p.front ? true : false;
      if (layer !== (front || false)) continue;
      const k = p.t / p.life;
      const x = p.world ? p.x - camX : p.x;
      const y = p.y;
      const s = p.size1 !== undefined ? G.lerp(p.size, p.size1, k) : p.size;
      const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.globalAlpha = a;
      if (p.glow) {
        const g = G.A.glow(Math.max(2, s * 2), p.color);
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(g, x - s * 2, y - s * 2, s * 4, s * 4);
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.kind === 'sprite') {
        G.A.draw(ctx, p.sprite, 0, x, y + G.A.h(p.sprite) / 2);
      } else if (p.kind === 'circle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, s), 0, G.TAU);
        ctx.fill();
      } else if (p.kind === 'line') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(s)), 1);
      } else if (p.kind === 'rain') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - p.vx * 0.03, y - p.vy * 0.03);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        const r = Math.max(1, Math.round(s));
        ctx.fillRect(Math.round(x - r / 2), Math.round(y - r / 2), r, r);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTexts(ctx, camX) {
    for (const t of texts) {
      if (t.delay > 0) continue;
      const k = t.t / t.life;
      const x = t.world ? t.x - camX : t.x;
      const pop = t.t < 0.12 ? G.ease.outBack(t.t / 0.12) : 1;
      const a = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      ctx.globalAlpha = a;
      if (t.fancy) {
        G.Font.drawFancy(ctx, t.str, x, t.y, { scale: t.scale, top: t.top, bottom: t.bottom }, Math.max(0.2, pop));
      } else {
        const sc = t.scale;
        G.Font.draw(ctx, t.str, x, t.y - 3 * sc, { color: t.color, outline: t.outline, scale: sc, align: 'center', thick: t.big });
      }
    }
    ctx.globalAlpha = 1;
  }

  function offset() {
    if (shake <= 0) return [0, 0];
    const s = shake * shake * 7;
    return [(Math.random() * 2 - 1) * s, (Math.random() * 2 - 1) * s];
  }

  return {
    spawn, burst, text, update, drawParticles, drawTexts, offset,
    shake(v) { shake = Math.min(1, shake + v); },
    flash(color, a) { flashColor = color; flashA = Math.max(flashA, a); },
    drawFlash(ctx) {
      if (flashA <= 0) return;
      ctx.globalAlpha = Math.min(1, flashA);
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalAlpha = 1;
    },
    slowmo(scale, dur) { slowScale = scale; slowT = dur; },
    get timeScale() { return slowScale; },
    clear() { parts.length = 0; texts.length = 0; shake = 0; flashA = 0; slowT = 0; slowScale = 1; },
    get count() { return parts.length; },
  };
})();
