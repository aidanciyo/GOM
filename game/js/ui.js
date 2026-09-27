/* Interfaz: botones, menus y escenas (titulo, partida, pausa, resultados, garaje, misiones, records, ajustes) */
'use strict';

G.UI = (() => {
  const F = () => G.Font;
  const INK = '#1a0f24';

  // ------------------------------------------------------------ botones
  class Menu {
    constructor(buttons) {
      this.buttons = buttons;
      this.focus = -1;
      this.pressT = 0;
      this.pressed = null;
    }
    update(dt) {
      const I = G.Input;
      this.pressT = Math.max(0, this.pressT - dt);
      const act = this.buttons.filter((b) => !b.hidden);
      // teclado
      if (I.hit('down') || I.hit('right') && this.horizontal) { this.move(1); }
      if (I.hit('up') || I.hit('left') && this.horizontal) { this.move(-1); }
      if ((I.hit('confirm') || I.hit('throw')) && this.focus >= 0) {
        const b = this.buttons[this.focus];
        if (b && !b.hidden) return this.fire(b);
      }
      // toques
      for (const t of I.taps) {
        for (const b of act) {
          if (t.x >= b.x && t.x <= b.x + b.w && t.y >= b.y && t.y <= b.y + b.h) return this.fire(b);
        }
      }
      return null;
    }
    move(d) {
      const n = this.buttons.length;
      let i = this.focus;
      for (let k = 0; k < n; k++) {
        i = (i + d + n) % n;
        if (!this.buttons[i].hidden && !this.buttons[i].noFocus) break;
      }
      this.focus = i;
      G.Audio.sfx('select');
    }
    fire(b) {
      if (b.disabled) { G.Audio.sfx('error'); return null; }
      this.pressed = b; this.pressT = 0.12;
      if (!b.silent) G.Audio.sfx(b.back ? 'back' : 'select');
      if (b.onClick) b.onClick(b);
      return b;
    }
    draw(ctx) {
      this.buttons.forEach((b, i) => { if (!b.hidden) drawButton(ctx, b, i === this.focus, this.pressed === b && this.pressT > 0); });
    }
  }

  function drawButton(ctx, b, focus, down) {
    const prim = b.style === 'primary';
    const dy = down ? 1 : 0;
    const x = Math.round(b.x), y = Math.round(b.y) + dy, w = b.w, h = b.h;
    ctx.globalAlpha = b.disabled ? 0.5 : 1;
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    if (!down) ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = prim ? (down ? '#d89a00' : '#f5b800') : b.style === 'danger' ? '#5a1420' : 'rgba(13,10,22,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = prim ? '#fff0a0' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = prim ? '#8a5a00' : focus ? '#ffffff' : '#f5b800';
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    if (prim) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 1, y + 1, w - 2, 1); }
    let tx = x + w / 2;
    if (b.icon) {
      const iw = G.A.w(b.icon), ih = G.A.h(b.icon);
      const s = ih > h - 4 ? (h - 4) / ih : 1;
      const lw = F().measure(b.label, b.scale || 1);
      const total = iw * s + 4 + lw;
      const ix = x + w / 2 - total / 2;
      ctx.drawImage(G.A.img[b.icon], 0, 0, iw, ih, Math.round(ix), Math.round(y + h / 2 - ih * s / 2), Math.round(iw * s), Math.round(ih * s));
      tx = ix + iw * s + 4 + lw / 2;
    }
    const sc = b.scale || 1;
    F().draw(ctx, b.label, tx, y + h / 2 - 3.5 * sc, { color: prim ? '#2a1400' : b.color || '#ffffff', align: 'center', scale: sc, outline: prim ? null : INK });
    if (focus) {
      const a = Math.floor(G.t * 4) % 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6 - a, y + h / 2 - 3, 2, 6);
      ctx.fillRect(x - 4 - a, y + h / 2 - 2, 1, 4);
    }
    ctx.globalAlpha = 1;
  }

  function panel(ctx, x, y, w, h, a) {
    ctx.globalAlpha = a === undefined ? 0.9 : a;
    ctx.fillStyle = '#0d0a16';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5b800';
    ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = 'rgba(245,184,0,0.35)';
    ctx.fillRect(x + 2, y + 2, w - 4, 1);
  }

  function coinsLabel(ctx, x, y, n, align) {
    const s = G.fmtInt(n);
    const w = F().measure(s) + 16;
    const X = align === 'right' ? x - w : x;
    G.A.drawAt(ctx, 'coin', 0, X, y - 2);
    F().draw(ctx, s, X + 15, y + 1, { color: '#ffe23f', outline: INK });
  }

  function dim(ctx, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = '#07050d';
    ctx.fillRect(0, 0, G.W, G.H);
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ fondo de demostracion compartido
  function demo() {
    if (!G.demoRun) G.demoRun = new G.Run({ demo: true });
    return G.demoRun;
  }
  function updateDemo(dt) {
    const r = demo();
    G.Audio.mute(true);
    r.update(dt);
    G.Audio.mute(false);
    if (r.player.dist > 60000) G.demoRun = null;
  }

  // ======================================================== escenas
  const Scenes = {};

  // ---------------- carga
  Scenes.Boot = class {
    constructor() { this.p = 0; }
    update() { this.p = G.A.progress; }
    draw(ctx) {
      ctx.fillStyle = '#0b0914';
      ctx.fillRect(0, 0, G.W, G.H);
      const w = 160, x = G.W / 2 - w / 2, y = G.H / 2;
      F().draw(ctx, 'CALENTANDO EL HORNO...', G.W / 2, y - 16, { color: '#f5b800', align: 'center' });
      ctx.fillStyle = '#2a2238'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = '#f5b800'; ctx.fillRect(x, y, Math.round(w * this.p), 6);
    }
  };

  // ---------------- titulo + menu principal
  Scenes.Title = class {
    constructor(skipPress) {
      this.t = 0;
      this.ready = !!skipPress;
      this.tip = G.Humor.pick(G.Humor.tips);
      G.Input.setMode('ui');
      G.Audio.music('title');
      G.Audio.setIntensity(1);
      this.build();
    }
    build() {
      const W = G.W, H = G.H;
      const bw = Math.min(130, Math.round(W * 0.26)), bx = Math.round(W * 0.73 - bw / 2);
      let y = Math.round(H * 0.26);
      const S = G.Save.data;
      const mk = (label, fn, o) => Object.assign({ x: bx, y, w: bw, h: 20, label, onClick: fn }, o || {});
      const btns = [];
      btns.push(mk('¡A REPARTIR!', () => G.go(new Scenes.Play()), { style: 'primary', h: 28, scale: 1 }));
      y += 36;
      btns.push(Object.assign(mk('GARAJE', () => G.go(new Scenes.Garage())), { y, icon: 'gom_front' })); y += 25;
      const claim = S.missions.list.some((m) => m.prog >= m.goal && !m.claimed);
      btns.push(Object.assign(mk(claim ? 'MISIONES (!)' : 'MISIONES', () => G.go(new Scenes.Missions())), { y, color: claim ? '#4ff3a0' : null })); y += 25;
      btns.push(Object.assign(mk('RÉCORDS', () => G.go(new Scenes.Records())), { y })); y += 25;
      btns.push(Object.assign(mk('AJUSTES', () => G.go(new Scenes.Settings())), { y }));
      this.menu = new Menu(btns);
      this.menu.focus = 0;
    }
    update(dt) {
      this.t += dt;
      updateDemo(dt);
      if (!this.ready) {
        if (G.Input.hit('anykey') || G.Input.taps.length) {
          this.ready = true;
          this.t = 0;
          G.Audio.unlock();
          G.Audio.music('title', true);
          G.Audio.sfx('go');
          G.Input.endStep();
        }
        return;
      }
      this.menu.update(dt);
    }
    draw(ctx) {
      demo().draw(ctx);
      const W = G.W, H = G.H;
      // velo degradado a la izquierda para el logo
      const gr = ctx.createLinearGradient(0, 0, W, 0);
      gr.addColorStop(0, 'rgba(8,5,16,0.55)');
      gr.addColorStop(0.55, 'rgba(8,5,16,0.1)');
      gr.addColorStop(1, 'rgba(8,5,16,0.45)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      // logo con rebote
      const logo = G.A.img.logo;
      const lx = this.ready ? W * 0.3 : W * 0.5;
      const bob = Math.sin(G.t * 2.2) * 3;
      const intro = Math.min(1, (this.ready ? 1 : G.t * 1.5));
      const s = G.ease.outBack(intro);
      const lw = logo.width * s, lh = logo.height * s;
      ctx.drawImage(logo, Math.round(lx - lw / 2), Math.round(H * 0.47 - lh / 2 + bob), Math.round(lw), Math.round(lh));
      G.Font.drawFancy(ctx, 'PIZZA DELIVERY', lx, H * 0.47 + 84 + bob, { scale: 2, top: '#fff6b0', bottom: '#ff9a1a' });
      if (!this.ready) {
        if (Math.floor(G.t * 2) % 2) F().draw(ctx, G.Input.touch ? 'TOCA PARA EMPEZAR' : 'PULSA UNA TECLA', W / 2, H - 34, { color: '#ffffff', outline: INK, align: 'center', scale: 1 });
        F().draw(ctx, 'V' + G.VERSION + ' · HECHO CON MOZZARELLA', W / 2, H - 12, { color: '#8a80a0', align: 'center' });
        return;
      }
      const S = G.Save.data;
      coinsLabel(ctx, W - 8, 8, S.coins, 'right');
      if (S.best.score > 0) F().draw(ctx, 'RÉCORD ' + G.fmtInt(S.best.score), this.menu.buttons[0].x + this.menu.buttons[0].w / 2, this.menu.buttons[0].y - 11, { color: '#ffe23f', outline: INK, align: 'center' });
      this.menu.draw(ctx);
      // consejo con humor
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#0d0a16';
      const tw = F().measure(this.tip) + 12;
      ctx.fillRect(Math.round(W / 2 - tw / 2), H - 16, tw, 12);
      ctx.globalAlpha = 1;
      F().draw(ctx, this.tip, W / 2, H - 13, { color: '#c8c0e0', align: 'center' });
    }
    back() { return false; }
  };

  // ---------------- partida
  Scenes.Play = class {
    constructor() {
      G.Input.setMode('game');
      G.FX.clear();
      this.run = new G.Run();
      this.run.onOver = (r) => { G.go(new Scenes.Results(r)); };
      this.pauseMenu = null;
      G.Audio.engineStart();
      G.Audio.setIntensity(1);
    }
    update(dt) {
      const I = G.Input;
      if (this.pauseMenu) {
        this.pauseMenu.update(dt);
        if (I.hit('pause') || I.hit('back')) this.resume();
        return;
      }
      if ((I.hit('pause') || I.hit('back')) && this.run.state !== 'dead') { this.pause(); return; }
      this.run.update(dt);
    }
    pause() {
      if (this.pauseMenu || this.run.state === 'dead') return;
      this.run.paused = true;
      G.Input.setMode('ui');
      G.Audio.engineSet(0, false);
      G.Audio.setIntensity(0);
      const W = G.W, bw = 130, x = Math.round(W / 2 - bw / 2);
      let y = Math.round(G.H * 0.36);
      this.tip = G.Humor.pick(G.Humor.tips);
      this.pauseMenu = new Menu([
        { x, y, w: bw, h: 22, label: 'CONTINUAR', style: 'primary', onClick: () => this.resume() },
        { x, y: y + 28, w: bw, h: 20, label: 'REINICIAR', onClick: () => G.go(new Scenes.Play()) },
        { x, y: y + 52, w: bw, h: 20, label: 'MENÚ', back: true, onClick: () => { G.Audio.engineStop(); G.go(new Scenes.Title(true)); } },
      ]);
      this.pauseMenu.focus = 0;
    }
    resume() {
      this.pauseMenu = null;
      this.run.paused = false;
      G.Input.setMode('game');
      G.Audio.setIntensity(this.run.fever > 0 ? 2 : 1);
    }
    draw(ctx) {
      this.run.draw(ctx);
      if (this.pauseMenu) {
        dim(ctx, 0.6);
        G.Font.drawFancy(ctx, 'PAUSA', G.W / 2, G.H * 0.22, { scale: 3 });
        this.pauseMenu.draw(ctx);
        F().draw(ctx, this.tip, G.W / 2, G.H - 20, { color: '#c8c0e0', align: 'center' });
      }
    }
    onBlur() { this.pause(); }
    back() { if (this.pauseMenu) this.resume(); else this.pause(); return true; }
  };

  // ---------------- resultados
  Scenes.Results = class {
    constructor(run) {
      this.run = run;
      G.Input.setMode('ui');
      const st = run.stats;
      st.score = run.score;
      st.coinsEarned = Math.floor(run.score / 40) + st.coins;
      this.coinsEarned = st.coinsEarned;
      this.res = G.Save.applyRun(st);
      this.t = 0;
      this.shown = 0;
      this.coinCount = 0;
      this.line = G.Humor.pick(run.deathCause === 'time' ? G.Humor.endTime : G.Humor.endCrash);
      this.tip = G.Humor.pick(G.Humor.tips);
      this.rows = [
        ['DISTANCIA', G.fmtInt(st.distance) + ' M'],
        ['RUTAS COMPLETADAS', String(st.routes)],
        ['PIZZAS ENTREGADAS', st.deliveries + ' (' + st.perfects + ' PERFECTAS)'],
        ['MEJOR COMBO', '×' + st.bestCombo],
        ['CASI-CHOQUES', String(st.nearMisses)],
        ['CLIENTES PERDIDOS', String(st.lost + st.stolen)],
        ['PUNTUACIÓN', G.fmtInt(run.score)],
      ];
      const W = G.W, H = G.H;
      const bw = 104, gap = 8, total = bw * 3 + gap * 2;
      const x0 = Math.round(W / 2 - total / 2), y = H - 30;
      this.menu = new Menu([
        { x: x0, y, w: bw, h: 22, label: 'OTRA VEZ', style: 'primary', onClick: () => G.go(new Scenes.Play()) },
        { x: x0 + bw + gap, y, w: bw, h: 22, label: 'GARAJE', onClick: () => G.go(new Scenes.Garage()) },
        { x: x0 + (bw + gap) * 2, y, w: bw, h: 22, label: 'MENÚ', back: true, onClick: () => G.go(new Scenes.Title(true)) },
      ]);
      this.menu.horizontal = true;
      this.menu.focus = 0;
      G.Audio.music('title');
      G.Audio.setIntensity(0);
    }
    update(dt) {
      this.t += dt;
      const want = Math.min(this.rows.length, Math.floor(this.t / 0.22));
      if (want > this.shown) { this.shown = want; G.Audio.sfx('select'); }
      if (this.shown >= this.rows.length && this.coinCount < this.coinsEarned) {
        const step = Math.max(1, Math.ceil(this.coinsEarned / 40));
        this.coinCount = Math.min(this.coinsEarned, this.coinCount + step);
        if (G.frame % 3 === 0) G.Audio.sfx('coin', this.coinCount);
        if (this.coinCount >= this.coinsEarned && this.res.newRecord) {
          G.Audio.sfx('record');
          G.FX.burst(G.W / 2, G.H * 0.3, 40, { colors: ['#ffe23f', '#ff5a7a', '#4ff3a0', '#7af0ff', '#ffffff'], speedMin: 60, speedMax: 180, g: 200, world: false, ui: true, size: 2, lifeMax: 1.4 });
        }
      }
      if (this.t > 0.6) this.menu.update(dt);
    }
    draw(ctx) {
      this.run.draw(ctx);
      dim(ctx, 0.72);
      const W = G.W, H = G.H;
      const cause = this.run.deathCause === 'time' ? '¡SE ENFRIÓ LA PIZZA!' : '¡ACCIDENTE!';
      G.Font.drawFancy(ctx, 'FIN DEL TURNO', W / 2, 18, { scale: 2 });
      F().draw(ctx, cause + '  ' + this.line, W / 2, 32, { color: '#ff9a9a', align: 'center', outline: INK });
      const pw = Math.min(320, W - 20), px = Math.round(W / 2 - pw / 2), py = 44;
      panel(ctx, px, py, pw, 118, 0.85);
      for (let i = 0; i < this.shown; i++) {
        const [k, v] = this.rows[i];
        const y = py + 7 + i * 13;
        const last = i === this.rows.length - 1;
        F().draw(ctx, k, px + 10, y, { color: last ? '#ffe23f' : '#c8c0e0' });
        F().draw(ctx, v, px + pw - 10, y, { color: last ? '#ffe23f' : '#ffffff', align: 'right', outline: INK });
      }
      if (this.shown >= this.rows.length) {
        const y = py + 7 + this.rows.length * 13 + 3;
        coinsLabel(ctx, px + 10, y, this.coinCount);
        F().draw(ctx, 'MONEDAS GANADAS', px + pw - 10, y + 1, { color: '#ffe23f', align: 'right' });
      }
      if (this.res.newRecord && this.coinCount >= this.coinsEarned) {
        const pop = 1 + 0.08 * Math.sin(G.t * 8);
        G.Font.drawFancy(ctx, '¡NUEVO RÉCORD!', W / 2 + pw / 2 - 30, py - 2, { scale: 1, top: '#ffffff', bottom: '#ff4fd8' }, pop);
      }
      let my = py + 124;
      if (this.res.completed.length && this.t > 1.8) {
        F().draw(ctx, '✓ MISIÓN: ' + this.res.completed[0], W / 2, my, { color: '#4ff3a0', align: 'center', outline: INK });
        my += 10;
      } else if (this.t > 1.8) {
        F().draw(ctx, this.tip, W / 2, my, { color: '#9a90b8', align: 'center' });
      }
      this.menu.draw(ctx);
      G.FX.drawParticles(ctx, 0, 'ui');
    }
    back() { G.go(new Scenes.Title(true)); return true; }
  };

  // ---------------- garaje
  Scenes.Garage = class {
    constructor() {
      G.Input.setMode('ui');
      this.tab = 'mejoras';
      this.msg = null;
      this.build();
    }
    build() {
      const W = G.W;
      const S = G.Save;
      const leftW = Math.round(Math.min(170, W * 0.32));
      const x = leftW + 10, w = W - x - 8;
      const btns = [];
      btns.push({ x: 6, y: 6, w: 60, h: 16, label: '< VOLVER', back: true, onClick: () => G.go(new Scenes.Title(true)) });
      btns.push({ x, y: 30, w: Math.floor(w / 2) - 2, h: 16, label: 'MEJORAS', style: this.tab === 'mejoras' ? 'primary' : null, onClick: () => { this.tab = 'mejoras'; this.build(); } });
      btns.push({ x: x + Math.floor(w / 2) + 2, y: 30, w: Math.floor(w / 2) - 2, h: 16, label: 'ESTELAS', style: this.tab === 'estelas' ? 'primary' : null, onClick: () => { this.tab = 'estelas'; this.build(); } });
      this.rows = [];
      const bw = 64;
      if (this.tab === 'mejoras') {
        S.UPGRADES.forEach((u, i) => {
          const y = 52 + i * 34;
          const lvl = S.level(u.id), cost = S.cost(u.id);
          this.rows.push({ u, y, lvl });
          btns.push({
            x: x + w - bw - 4, y: y + 8, w: bw, h: 18, icon: cost === null ? null : 'coin',
            label: cost === null ? 'MÁXIMO' : G.fmtInt(cost), disabled: cost === null || S.data.coins < cost,
            style: cost !== null && S.data.coins >= cost ? 'primary' : null, silent: true,
            onClick: () => {
              if (S.buyUpgrade(u.id)) { G.Audio.sfx('buy'); this.msg = { text: u.name + ' NIVEL ' + S.level(u.id) + '!', t: 0 }; this.build(); }
            },
          });
        });
      } else {
        S.TRAILS.forEach((tr, i) => {
          const y = 52 + i * 34;
          const own = S.data.trails.includes(tr.id), eq = S.data.trail === tr.id;
          this.rows.push({ tr, y, own, eq });
          btns.push({
            x: x + w - bw - 4, y: y + 8, w: bw, h: 18, icon: own ? null : 'coin',
            label: eq ? 'PUESTA' : own ? 'PONER' : G.fmtInt(tr.cost), disabled: eq || (!own && S.data.coins < tr.cost),
            style: !eq && (own || S.data.coins >= tr.cost) ? 'primary' : null, silent: true,
            onClick: () => {
              if (own) { S.equipTrail(tr.id); G.Audio.sfx('select'); }
              else if (S.buyTrail(tr.id)) { G.Audio.sfx('buy'); this.msg = { text: '¡ESTELA ' + tr.name + '!', t: 0 }; }
              this.build();
            },
          });
        });
      }
      this.x = x; this.w = w; this.leftW = leftW;
      const f = this.menu ? this.menu.focus : 1;
      this.menu = new Menu(btns);
      this.menu.focus = Math.min(f, btns.length - 1);
    }
    update(dt) {
      updateDemo(dt);
      this.menu.update(dt);
      if (G.Input.hit('back')) { G.go(new Scenes.Title(true)); }
      if (this.msg) { this.msg.t += dt; if (this.msg.t > 1.6) this.msg = null; }
      // estela de muestra
      const tr = G.Save.trail();
      if (G.rand.chance(dt * 30)) {
        G.FX.spawn({ x: this.leftW / 2 - 40, y: 150 + G.rand.range(-4, 4), vx: -G.rand.range(40, 90), vy: G.rand.range(-10, 10), life: 0.5, size: 3, size1: 1,
          color: G.rand.pick(tr.colors), world: false, ui: true, glow: tr.id !== 'humo', kind: tr.id === 'humo' ? 'circle' : 'rect' });
      }
    }
    draw(ctx) {
      demo().draw(ctx);
      dim(ctx, 0.75);
      const W = G.W, S = G.Save;
      G.Font.drawFancy(ctx, 'GARAJE', this.leftW / 2 + 6, 36, { scale: 2 });
      coinsLabel(ctx, W - 8, 10, S.data.coins, 'right');
      // moto en su pedestal con foco
      const cx = this.leftW / 2 + 4;
      const g = G.A.glow(60, '#ffd27a', 0.2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(g, cx - 60, 100);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      G.Biomes.ellipse(ctx, cx, 190, 56, 8, '#2a2238');
      G.Biomes.ellipse(ctx, cx, 189, 52, 6, '#3a3050');
      G.FX.drawParticles(ctx, 0, 'ui');
      const fr = Math.floor(G.t * 10) % 3;
      ctx.drawImage(G.A.img.gom_ride, fr * 63, 0, 63, 58, Math.round(cx - 63), 190 - 116 + 2, 126, 116);
      const U = S.data.upgrades;
      F().draw(ctx, 'VEL. PUNTA ' + Math.round(226 * (1 + 0.06 * U.motor) * 0.3) + ' KM/H · TURBO ' + Math.round(226 * (1 + 0.06 * U.motor) * 0.45), cx, 200, { color: '#c8c0e0', align: 'center' });
      F().draw(ctx, 'CORAZONES ' + (4 + (U.chasis >= 3 ? 1 : 0)) + ' · ESTELA ' + S.trail().name, cx, 211, { color: '#c8c0e0', align: 'center' });
      // filas
      for (const r of this.rows) {
        panel(ctx, this.x, r.y, this.w, 32, 0.8);
        if (r.u) {
          const u = r.u;
          G.A.drawAt(ctx, u.icon === 'gom_front' ? 'face_1' : u.icon, 0, this.x + 5, r.y + 5);
          F().draw(ctx, u.name, this.x + 30, r.y + 5, { color: '#ffffff', outline: INK });
          F().draw(ctx, u.desc, this.x + 30, r.y + 19, { color: '#9a90b8' });
          for (let i = 0; i < u.max; i++) {
            ctx.fillStyle = i < r.lvl ? '#f5b800' : '#3a3050';
            ctx.fillRect(this.x + 30 + F().measure(u.name) + 8 + i * 8, r.y + 6, 6, 5);
          }
        } else {
          const tr = r.tr;
          tr.colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(this.x + 6 + i * 4, r.y + 8, 4, 16); });
          F().draw(ctx, tr.name, this.x + 34, r.y + 7, { color: '#ffffff', outline: INK });
          F().draw(ctx, r.eq ? 'EQUIPADA' : r.own ? 'EN TU GARAJE' : 'COSMÉTICA · NO DA VENTAJA', this.x + 34, r.y + 19, { color: r.eq ? '#4ff3a0' : '#9a90b8' });
        }
      }
      this.menu.draw(ctx);
      if (this.msg) G.Font.drawFancy(ctx, this.msg.text, W / 2, G.H * 0.5, { scale: 2 }, 1 + Math.max(0, 0.3 - this.msg.t));
    }
    back() { G.go(new Scenes.Title(true)); return true; }
  };

  // ---------------- misiones
  Scenes.Missions = class {
    constructor() {
      G.Input.setMode('ui');
      G.Save.refreshMissions();
      this.build();
    }
    build() {
      const W = G.W, S = G.Save;
      const pw = Math.min(420, W - 24), px = Math.round(W / 2 - pw / 2);
      this.px = px; this.pw = pw;
      const btns = [{ x: 6, y: 6, w: 60, h: 16, label: '< VOLVER', back: true, onClick: () => G.go(new Scenes.Title(true)) }];
      S.data.missions.list.forEach((m, i) => {
        const y = 62 + i * 50;
        const done = m.prog >= m.goal;
        btns.push({
          x: px + pw - 84, y: y + 14, w: 76, h: 18, label: m.claimed ? 'COBRADA' : done ? 'COBRAR' : G.fmtInt(m.reward), icon: m.claimed ? null : 'coin',
          disabled: !done || m.claimed, style: done && !m.claimed ? 'primary' : null, silent: true,
          onClick: () => { const c = S.claimMission(i); if (c) { G.Audio.sfx('buy'); this.flash = { text: '+' + c, t: 0 }; this.build(); } },
        });
      });
      this.menu = new Menu(btns);
      this.menu.focus = 0;
    }
    update(dt) {
      updateDemo(dt);
      this.menu.update(dt);
      if (G.Input.hit('back')) G.go(new Scenes.Title(true));
      if (this.flash) { this.flash.t += dt; if (this.flash.t > 1.2) this.flash = null; }
    }
    draw(ctx) {
      demo().draw(ctx);
      dim(ctx, 0.75);
      const W = G.W, S = G.Save;
      G.Font.drawFancy(ctx, 'MISIONES DIARIAS', W / 2, 32, { scale: 2 });
      coinsLabel(ctx, W - 8, 10, S.data.coins, 'right');
      const now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
      const mins = Math.floor((end - now) / 60000);
      F().draw(ctx, 'NUEVAS MISIONES EN ' + Math.floor(mins / 60) + ' H ' + (mins % 60) + ' MIN', W / 2, 46, { color: '#9a90b8', align: 'center' });
      S.data.missions.list.forEach((m, i) => {
        const y = 62 + i * 50;
        panel(ctx, this.px, y, this.pw, 44, 0.85);
        F().draw(ctx, S.missionText(m), this.px + 10, y + 8, { color: m.claimed ? '#6a6080' : '#ffffff', outline: INK });
        const bw = this.pw - 110, k = G.clamp(m.prog / m.goal, 0, 1);
        ctx.fillStyle = '#2a2238'; ctx.fillRect(this.px + 10, y + 24, bw, 8);
        ctx.fillStyle = k >= 1 ? '#4ff3a0' : '#f5b800'; ctx.fillRect(this.px + 10, y + 24, Math.round(bw * k), 8);
        F().draw(ctx, G.fmtInt(m.prog) + ' / ' + G.fmtInt(m.goal), this.px + 10 + bw / 2, y + 25, { color: '#ffffff', align: 'center', outline: INK });
      });
      this.menu.draw(ctx);
      if (this.flash) G.Font.drawFancy(ctx, this.flash.text, W / 2, G.H * 0.5, { scale: 3 }, 1 + Math.max(0, 0.3 - this.flash.t));
      F().draw(ctx, 'LAS MISIONES CUENTAN TODAS TUS PARTIDAS DEL DÍA', W / 2, G.H - 14, { color: '#9a90b8', align: 'center' });
    }
    back() { G.go(new Scenes.Title(true)); return true; }
  };

  // ---------------- records
  Scenes.Records = class {
    constructor() {
      G.Input.setMode('ui');
      this.menu = new Menu([{ x: 6, y: 6, w: 60, h: 16, label: '< VOLVER', back: true, onClick: () => G.go(new Scenes.Title(true)) }]);
      this.menu.focus = 0;
    }
    update(dt) { updateDemo(dt); this.menu.update(dt); if (G.Input.hit('back')) G.go(new Scenes.Title(true)); }
    draw(ctx) {
      demo().draw(ctx);
      dim(ctx, 0.75);
      const W = G.W, S = G.Save.data;
      G.Font.drawFancy(ctx, 'RÉCORDS', W / 2, 30, { scale: 2 });
      const pw = Math.min(360, W - 20), px = Math.round(W / 2 - pw / 2);
      panel(ctx, px, 44, pw, 150, 0.85);
      F().draw(ctx, '#', px + 8, 50, { color: '#9a90b8' });
      F().draw(ctx, 'PUNTOS', px + 26, 50, { color: '#9a90b8' });
      F().draw(ctx, 'METROS', px + pw * 0.55, 50, { color: '#9a90b8', align: 'center' });
      F().draw(ctx, 'PIZZAS', px + pw - 10, 50, { color: '#9a90b8', align: 'right' });
      if (!S.records.length) F().draw(ctx, 'AÚN NO HAS REPARTIDO NADA. ¡AL LÍO!', W / 2, 110, { color: '#ffffff', align: 'center' });
      S.records.forEach((r, i) => {
        const y = 62 + i * 13;
        const col = i === 0 ? '#ffe23f' : '#ffffff';
        F().draw(ctx, String(i + 1), px + 8, y, { color: col });
        F().draw(ctx, G.fmtInt(r.score), px + 26, y, { color: col });
        F().draw(ctx, G.fmtInt(r.dist), px + pw * 0.55, y, { color: col, align: 'center' });
        F().draw(ctx, String(r.deliv), px + pw - 10, y, { color: col, align: 'right' });
      });
      const st = S.stats;
      F().draw(ctx, 'PARTIDAS ' + st.runs + ' · PIZZAS ' + G.fmtInt(st.deliveries) + ' · PERFECTAS ' + G.fmtInt(st.perfects) + ' · KM ' + (st.distance / 1000).toFixed(1).replace('.', ','),
        W / 2, 204, { color: '#c8c0e0', align: 'center' });
      F().draw(ctx, 'MEJOR COMBO ×' + S.best.combo + ' · MÁS LEJOS ' + G.fmtInt(S.best.dist) + ' M', W / 2, 216, { color: '#c8c0e0', align: 'center' });
      this.menu.draw(ctx);
    }
    back() { G.go(new Scenes.Title(true)); return true; }
  };

  // ---------------- ajustes
  Scenes.Settings = class {
    constructor() { G.Input.setMode('ui'); this.confirm = false; this.build(); }
    build() {
      const W = G.W, S = G.Save.data.settings;
      const pw = Math.min(300, W - 24), px = Math.round(W / 2 - pw / 2);
      this.px = px; this.pw = pw;
      const pct = (v) => Math.round(v * 100) + '%';
      const setVol = () => { G.Audio.setVolumes(S.music, S.sfx); G.Save.save(); this.build(); };
      const row = (i) => 56 + i * 26;
      const btns = [{ x: 6, y: 6, w: 60, h: 16, label: '< VOLVER', back: true, onClick: () => G.go(new Scenes.Title(true)) }];
      const bx = px + pw - 110;
      btns.push({ x: bx, y: row(0), w: 22, h: 18, label: '-', onClick: () => { S.music = Math.max(0, Math.round((S.music - 0.1) * 10) / 10); setVol(); } });
      btns.push({ x: bx + 26, y: row(0), w: 56, h: 18, label: pct(S.music), noFocus: true, silent: true });
      btns.push({ x: bx + 86, y: row(0), w: 22, h: 18, label: '+', onClick: () => { S.music = Math.min(1, Math.round((S.music + 0.1) * 10) / 10); setVol(); } });
      btns.push({ x: bx, y: row(1), w: 22, h: 18, label: '-', onClick: () => { S.sfx = Math.max(0, Math.round((S.sfx - 0.1) * 10) / 10); setVol(); G.Audio.sfx('coin'); } });
      btns.push({ x: bx + 26, y: row(1), w: 56, h: 18, label: pct(S.sfx), noFocus: true, silent: true });
      btns.push({ x: bx + 86, y: row(1), w: 22, h: 18, label: '+', onClick: () => { S.sfx = Math.min(1, Math.round((S.sfx + 0.1) * 10) / 10); setVol(); G.Audio.sfx('coin'); } });
      btns.push({ x: bx, y: row(2), w: 108, h: 18, label: S.vibration ? 'SÍ' : 'NO', onClick: () => { S.vibration = !S.vibration; G.Save.save(); G.vibrate(60); this.build(); } });
      btns.push({ x: bx, y: row(3), w: 108, h: 18, label: S.hints ? 'SÍ' : 'NO', onClick: () => { S.hints = !S.hints; if (S.hints) G.Save.data.tutorial = 0; G.Save.save(); this.build(); } });
      btns.push({ x: bx, y: row(4), w: 108, h: 18, label: S.quality === 'alta' ? 'SUAVE' : 'RETRO', onClick: () => { S.quality = S.quality === 'alta' ? 'baja' : 'alta'; G.Save.save(); G.resize(); this.build(); } });
      btns.push({ x: bx, y: row(5) + 6, w: 108, h: 18, label: this.confirm ? '¿SEGURO? SÍ' : 'BORRAR', style: 'danger',
        onClick: () => { if (this.confirm) { G.Save.reset(); this.confirm = false; G.Audio.sfx('error'); } else this.confirm = true; this.build(); } });
      const f = this.menu ? this.menu.focus : 0;
      this.menu = new Menu(btns);
      this.menu.focus = f;
    }
    update(dt) { updateDemo(dt); this.menu.update(dt); if (G.Input.hit('back')) G.go(new Scenes.Title(true)); }
    draw(ctx) {
      demo().draw(ctx);
      dim(ctx, 0.75);
      const W = G.W;
      G.Font.drawFancy(ctx, 'AJUSTES', W / 2, 30, { scale: 2 });
      panel(ctx, this.px, 48, this.pw, 176, 0.85);
      const labels = ['MÚSICA', 'EFECTOS', 'VIBRACIÓN', 'PISTAS DE TUTORIAL', 'IMAGEN', 'BORRAR PROGRESO'];
      labels.forEach((l, i) => F().draw(ctx, l, this.px + 10, 56 + i * 26 + 6 + (i === 5 ? 6 : 0), { color: '#ffffff', outline: INK }));
      F().draw(ctx, 'CONTROLES: ↑↓ CARRIL · →← VELOCIDAD · ESPACIO LANZAR · SHIFT TURBO · C SALTO · P PAUSA', W / 2, G.H - 26, { color: '#9a90b8', align: 'center' });
      F().draw(ctx, 'GOM PIZZA DELIVERY V' + G.VERSION + ' · PIXEL ART Y CHIPTUNE HECHOS A MANO', W / 2, G.H - 14, { color: '#6a6080', align: 'center' });
      this.menu.draw(ctx);
    }
    back() { G.go(new Scenes.Title(true)); return true; }
  };

  return { Menu, Scenes, panel, drawButton, coinsLabel, dim };
})();
