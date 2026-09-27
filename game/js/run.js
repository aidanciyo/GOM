/* Partida: bucle infinito, colisiones, entregas, puntuacion, rutas, iluminacion y dibujo */
'use strict';

G.Run = class {
  constructor(opts) {
    opts = opts || {};
    this.demo = !!opts.demo;
    this.seed = opts.seed || G.newSeed();
    this.ents = [];
    this.facades = [];
    this.customers = [];
    this.pizzeriaEnts = [];
    this.player = new G.Player();
    this.camX = this.player.x - G.L.playerX;
    this.gen = new G.Generator(this, this.seed);
    this.time = 45;
    this.score = 0;
    this.combo = 0;
    this.feverStreak = 0;
    this.fever = 0;
    this.pizzas = 0;
    this.route = 0;
    this.state = this.demo ? 'play' : 'intro';
    this.stateT = 0;
    this.t = 0;
    this.paused = false;
    this.over = false;
    this.banner = null;
    this.hint = null;
    this.hintsOn = !this.demo && G.Save.data.settings.hints && G.Save.data.tutorial < 3;
    this.hintStep = 0;
    this.stats = {
      deliveries: 0, perfects: 0, nearMisses: 0, coins: 0, airDeliveries: 0, routes: 0, smashed: 0,
      overtakes: 0, fevers: 0, lost: 0, turbos: 0, bestCombo: 0, score: 0, distance: 0, stolen: 0, misses: 0,
    };
    this.lastTick = 99;
    this.windAmt = 0;
    this.musicBiome = null;
    this.light = G.makeCanvas(G.W, G.H);
    this.beam = null;
    this.introSpeed = 0;
    this.deathCause = '';
    if (this.demo) {
      this.player.control = true;
      this.player.speed = this.player.cruise;
      this.autopilot = G.Bot.drive;
      this.pizzas = 99;
      this.player.inv = 1e9;
    }
    this.botPlay = !this.demo && G.params.get('bot') === '1';
    this.god = !this.demo && G.params.get('god') === '1';
    if (this.botPlay) this.autopilot = G.Bot.drive;
    this.gen.update();
    if (!this.demo) this.pizzas = 0;
    this.targetPizzas = this.gen.routes[0].n + 2;
  }

  add(e) { this.ents.push(e); return e; }

  get mult() {
    const c = this.combo;
    return c >= 15 ? 5 : c >= 10 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1;
  }
  get plan() { return this.gen.routes[Math.min(this.route, this.gen.routes.length - 1)]; }
  get meters() { return Math.floor(this.player.dist / 12); }

  // ------------------------------------------------------------ bucle
  update(dt) {
    if (this.paused) return;
    this.t += dt;
    this.stateT += dt;
    const p = this.player;
    const I = G.Input;

    if (this.state === 'intro') this.updateIntro(dt);

    if (this.state === 'play' && !this.demo) {
      // controles de accion
      if (I.hit('throw')) this.tryThrow();
      if (I.hit('turbo')) p.tryTurbo(this);
      if (I.hit('jump')) {
        if (!p.tryJump() && p.cannonCharges > 0 && p.jumpLevel <= 0) this.useCannon();
      }
      if (I.hit('cannon')) this.useCannon();
      this.time -= dt;
      if (this.time <= 10 && this.time > 0) {
        const s = Math.ceil(this.time);
        if (s !== this.lastTick) { this.lastTick = s; G.Audio.sfx('tick'); }
      }
      if (this.time <= 0) { this.time = 0; this.gameOver('time'); }
    }
    if ((this.demo || this.botPlay) && this.state === 'play') G.Bot.act(this);
    if (this.god) { p.inv = Math.max(p.inv, 0.1); this.time = Math.max(this.time, 20); }

    p.update(dt, this);
    if (this.state === 'dead') this.updateDeath(dt);

    // camara: adelanta el encuadre a mas velocidad
    const lead = G.clamp((p.speed - p.cruise) * 0.35, -10, 60);
    const target = p.x - G.L.playerX - lead;
    this.camX = this.stateT < 0.05 && this.t < 0.1 ? target : G.damp(this.camX, target, 6, dt);

    this.gen.update();
    for (const e of this.ents) e.update(dt, this);
    this.collide(dt);
    this.checkCustomers();
    this.checkCheckpoints();

    // limpieza
    this.ents = this.ents.filter((e) => !e.dead);
    this.customers = this.customers.filter((c) => !c.dead);
    this.facades = this.facades.filter((f) => f.x + f.w > this.camX - 20);
    this.pizzeriaEnts = this.pizzeriaEnts.filter((z) => !z.dead);

    // fever
    if (this.time > 99) this.time = 99;
    if (this.fever > 0) {
      this.fever -= dt;
      if (this.fever <= 0) { this.fever = 0; G.Audio.setIntensity(1); }
    }
    this.updateBiome(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
    if (this.hint) { this.hint.t += dt; if (this.hint.t > this.hint.life) this.hint = null; }
    this.updateHints();
    G.Audio.engineSet(p.speed01, this.state === 'play' || this.state === 'intro');
    if (!this.demo) G.Audio.setTension(this.state === 'play' && this.time < 10);
    this.stats.distance = this.meters;
  }

  updateIntro() {
    const p = this.player;
    const t = this.stateT;
    // carga de pizzas en la caja
    if (!this.introBanner) {
      this.introBanner = true;
      this.banner = { text: 'PIZZERÍA GOM', sub: 'CALIENTE O GRATIS* · CARGANDO ' + this.targetPizzas + ' PIZZAS', t: 0, life: 1.35, big: true };
    }
    const loadEvery = 0.14;
    const want = Math.min(this.targetPizzas, Math.floor((t - 0.1) / loadEvery));
    while (this.pizzas < want) {
      this.pizzas++;
      G.Audio.sfx('coin', this.pizzas);
      // la caja sale por la puerta de la pizzeria y cae en la caja termica de GOM
      const T = 0.32, gr = 700;
      const x0 = 8 + G.rand.range(-6, 6), y0 = G.L.facadeBase - 14;
      const x1 = p.x - 18, y1 = G.L.roadTop + p.y - 44;
      G.FX.spawn({ x: x0, y: y0, vx: (x1 - x0) / T, vy: (y1 - y0 - 0.5 * gr * T * T) / T, g: gr, life: T, kind: 'sprite', sprite: 'pizza_box' });
    }
    const marks = [1.4, 2.1, 2.8];
    marks.forEach((m, i) => {
      if (t >= m && !this['cd' + i]) {
        this['cd' + i] = true;
        G.Audio.sfx('beep');
        this.banner = { text: String(3 - i), t: 0, life: 0.6, big: true };
      }
    });
    if (t >= 3.5) {
      this.state = 'play';
      this.stateT = 0;
      p.control = true;
      p.speed = 60;
      this.banner = { text: '¡A REPARTIR!', t: 0, life: 1.0, big: true };
      G.Audio.sfx('go');
      G.Audio.setIntensity(1);
      if (this.hintsOn) this.showHint(G.Input.touch ? 'JOYSTICK IZQ.: ↑↓ CARRIL · →← VELOCIDAD' : '↑↓ CAMBIAR DE CARRIL · →← ACELERAR / FRENAR', 4);
    }
  }

  updateDeath(dt) {
    const p = this.player;
    if (this.deathCause === 'time') p.speed = G.approach(p.speed, 0, 160 * dt);
    else p.speed = G.approach(p.speed, 0, 120 * dt);
    if (this.stateT > 2.6 && !this.over) {
      this.over = true;
      G.Audio.engineStop();
      if (this.onOver) this.onOver(this);
    }
  }

  gameOver(cause) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.stateT = 0;
    this.deathCause = cause;
    this.player.control = false;
    this.player.turboT = 0;
    G.Audio.setTension(false);
    this.stats.score = this.score;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    G.Audio.setIntensity(0);
    G.Audio.sfx('gameover');
    if (cause === 'time') {
      this.banner = { text: '¡SE ENFRIÓ LA PIZZA!', t: 0, life: 3, big: true, top: '#bff4ff', bottom: '#4aa8ff' };
      this.player.setFace(3, 5);
    } else {
      this.banner = { text: '¡ACCIDENTE!', t: 0, life: 3, big: true, top: '#ffd0d0', bottom: '#ff4a4a' };
      this.player.setFace(5, 5);
      G.FX.slowmo(0.35, 0.9);
      G.FX.shake(1);
      for (let i = 0; i < Math.min(8, this.pizzas); i++) {
        G.FX.spawn({ x: this.player.x - 10, y: G.L.roadTop + this.player.y - 40, vx: G.rand.range(-60, 120), vy: -G.rand.range(80, 200),
          g: 400, life: 1.6, kind: 'sprite', sprite: 'pizza_box' });
      }
    }
  }

  // ------------------------------------------------------------ barrios, musica, clima
  updateBiome(dt) {
    const segs = this.gen.segments;
    const mid = this.camX + G.W * 0.5;
    let i = 0;
    for (let k = 0; k < segs.length; k++) if (segs[k].x0 <= mid + 160) i = k;
    const to = segs[i].biome;
    const from = i > 0 ? segs[i - 1].biome : to;
    const k = i > 0 ? G.smooth(G.clamp((mid - (segs[i].x0 - 160)) / 320, 0, 1)) : 1;
    this.bg = { from, to, k };
    const A = G.Biomes.DEF[from], B = G.Biomes.DEF[to];
    this.night = G.lerp(A.night, B.night, k);
    this.nightColor = k < 0.5 ? A.nightColor : B.nightColor;
    this.emissive = G.lerp(A.emissive, B.emissive, k);
    this.rainAmt = G.lerp(A.rain, B.rain, k);
    this.lightning = G.lerp(A.lightning ? 1 : 0, B.lightning ? 1 : 0, k);
    this.windAmt = G.lerp(A.wind ? 1 : 0, B.wind ? 1 : 0, k);
    this.wet = G.lerp(A.wet ? 1 : 0, B.wet ? 1 : 0, k);
    G.Biomes.updateWeather(dt, this.rainAmt, this.lightning, this.windAmt, this.demo);
    this.updateGusts(dt);
    // musica y cartel de barrio al cruzar la frontera
    const pb = this.gen.biomeAt(this.player.x);
    if (pb !== this.musicBiome) {
      const first = this.musicBiome === null;
      this.musicBiome = pb;
      if (!this.demo) G.Audio.music(G.Biomes.DEF[pb].music, first);
      if (!first && !this.demo) {
        this.banner = { text: G.Biomes.DEF[pb].name, t: 0, life: 2.8, sub: 'NUEVO BARRIO', biome: true, tag: G.Humor.biomeTag[pb] };
      }
    }
  }

  // rafagas de viento (Costa Tormenta): aviso 0,9 s y empuje lateral 1,2 s
  updateGusts(dt) {
    const p = this.player;
    if (this.windAmt < 0.6 || this.state !== 'play') { this.gust = null; return; }
    if (!this.gust) {
      this.gustT = (this.gustT === undefined ? 4 : this.gustT) - dt;
      if (this.gustT <= 0) {
        this.gust = { t: 0, dir: G.rand.sign(), warn: 0.9, dur: 1.2 };
        this.gustT = G.rand.range(5, 9);
      }
      return;
    }
    const g = this.gust;
    g.t += dt;
    if (g.t < g.warn) {
      if (G.rand.chance(dt * 60)) {
        G.FX.spawn({ x: G.W + 4, y: G.rand.range(G.L.roadTop - 20, G.L.roadBot), vx: -G.rand.range(260, 360), vy: g.dir * 40, life: 2.2, size: 2,
          color: G.rand.pick(['#8fce6a', '#d8c08c', '#e8f0f0']), world: false, front: true });
      }
    } else if (g.t < g.warn + g.dur) {
      if (!p.airborne) p.y = G.clamp(p.y + g.dir * 22 * dt, G.PLAYER_MIN_Y, G.PLAYER_MAX_Y);
    } else {
      this.gust = null;
    }
  }

  // ------------------------------------------------------------ pistas de tutorial
  showHint(text, life) { this.hint = { text, t: 0, life: life || 3.5 }; }
  updateHints() {
    if (!this.hintsOn || this.state !== 'play') return;
    const p = this.player;
    if (this.hintStep === 0 && this.stateT > 4.5) {
      const c = this.customers.find((cc) => cc.state === 'wait' && cc.x - p.x < 330 && cc.x > p.x);
      if (c) {
        this.hintStep = 1;
        this.showHint(c.side === 'top' ? 'CLIENTE ARRIBA: SUBE AL CARRIL DE LA ZONA VERDE' : 'CLIENTE ABAJO: BAJA AL CARRIL DE LA ZONA VERDE', 3);
      }
    } else if (this.hintStep === 1) {
      const c = this.customers.find((cc) => cc.state === 'wait' && Math.abs(cc.x - p.x) < cc.zone + 30);
      if (c) {
        this.hintStep = 2;
        this.showHint(G.Input.touch ? '¡TOCA LANZAR EN LA FRANJA DORADA!' : '¡PULSA ESPACIO EN LA FRANJA DORADA!', 2.5);
      }
    } else if (this.hintStep === 2 && this.stats.deliveries + this.stats.misses + this.stats.lost >= 2) {
      this.hintStep = 3;
      this.showHint('ROZA COCHES SIN CHOCAR PARA CARGAR EL TURBO', 3.5);
    } else if (this.hintStep === 3 && p.turbo >= 0.35 && this.stateT > 18) {
      this.hintStep = 4;
      this.showHint(G.Input.touch ? '¡TURBO LISTO! TOCA EL RAYO' : '¡TURBO LISTO! PULSA SHIFT', 3);
    }
  }

  // ------------------------------------------------------------ entregas
  tryThrow() {
    const p = this.player;
    if (this.state !== 'play') return;
    if (this.pizzas <= 0) {
      G.Audio.sfx('error');
      G.FX.text('¡SIN PIZZAS!', p.x, G.L.roadTop + p.y - 64, { color: '#ff8a8a' });
      return;
    }
    let best = null, bestD = 1e9;
    for (const c of this.customers) {
      if (c.state !== 'wait' || c.pending) continue;
      const d = Math.abs(p.x - c.x);
      if (d < bestD) { best = c; bestD = d; }
    }
    const fever = this.fever > 0;
    if (!best || bestD > best.zone * (fever ? 1.6 : 1) + 110) {
      G.FX.text('NINGÚN CLIENTE CERCA', p.x + 10, G.L.roadTop + p.y - 64, { color: '#c8c0e0', life: 0.6 });
      return;
    }
    this.pizzas--;
    p.throwT = 0.25;
    G.Audio.sfx('throw');
    const zone = best.zone * (fever ? 1.6 : 1), perf = best.perfect * (fever ? 1.6 : 1);
    const air = p.airborne;
    const inLane = air || best.laneOK(p.y);
    const d = Math.abs(p.x - best.x);
    const fromZ = p.z + 42;
    if (d <= zone && inLane) {
      const quality = fever || d <= perf ? 'perfect' : 'good';
      best.pending = true;
      const tgt = this.customerTarget(best);
      const gull = this.ents.find((e) => e instanceof G.E.Gull && e.cust === best && e.mode === 'circle');
      if (gull && quality !== 'perfect') {
        // la gaviota intercepta la pizza
        const mid = { x: (p.x + tgt.x) / 2 + 10, y: (p.y + tgt.y) / 2, z: tgt.z + 20 };
        gull.dive(mid.x, mid.y - mid.z * 0);
        this.add(new G.E.Thrown(p.x - 16, p.y, fromZ, mid, 0.22, (run) => {
          best.pending = false;
          run.onMiss('¡GAVIOTA!', mid.x, G.L.roadTop + mid.y - mid.z);
          gull.carry = true;
        }));
        return;
      }
      if (gull) G.FX.text('¡ESQUIVADA!', gull.x, G.L.roadTop + gull.y - 10, { color: '#8ff3ff' });
      this.add(new G.E.Thrown(p.x - 16, p.y, fromZ, tgt, quality === 'perfect' ? 0.2 : 0.3, (run) => {
        best.pending = false;
        run.deliver(best, quality, air);
      }));
    } else {
      // lanzamiento fallido: la pizza cae al suelo
      const tx = best.x + (p.x < best.x ? -30 : 30) * G.rand.range(0.6, 1.4);
      const ty = best.side === 'top' ? G.rand.range(-6, 6) : G.rand.range(82, 92);
      this.add(new G.E.Thrown(p.x - 16, p.y, fromZ, { x: tx, y: ty, z: 0 }, 0.34, (run) => {
        G.FX.burst(tx, G.L.roadTop + ty, 14, { colors: ['#ffcf4a', '#e0452a', '#fff0c0', '#8a5a2a'], speedMin: 30, speedMax: 90, g: 260, size: 2, lifeMax: 0.7 });
        G.Audio.sfx('splash');
      }));
      this.onMiss(!inLane ? '¡CARRIL EQUIVOCADO!' : p.x < best.x ? '¡DEMASIADO PRONTO!' : '¡DEMASIADO TARDE!', p.x + 20, G.L.roadTop + p.y - 70);
    }
  }

  customerTarget(c) {
    if (c.window) return { x: c.x, y: -26, z: 44 + c.winY };
    return { x: c.x, y: c.y, z: 20 };
  }

  deliver(c, quality, air, auto) {
    const p = this.player;
    c.state = 'served';
    c.stateT = 0;
    c.say(quality === 'perfect' ? G.Humor.perfect : c.vip ? G.Humor.vip : G.Humor.served);
    this.combo++;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    const perfect = quality === 'perfect';
    const fever = this.fever > 0;
    const D = this.gen.D();
    let pts = (perfect ? 250 : 120) * this.mult;
    if (air) pts *= 2;
    if (c.vip) pts *= 2;
    if (fever) pts *= 2;
    this.score += pts;
    let tg = perfect ? Math.max(2.4, 4.0 - D * 0.12) : Math.max(1.5, 2.6 - D * 0.08);
    if (fever) tg *= 2;
    if (c.vip) tg += 3;
    this.time += tg;
    p.turbo = Math.min(1, p.turbo + (perfect ? 0.22 : 0.1));
    this.stats.deliveries++;
    if (perfect) this.stats.perfects++;
    if (air) this.stats.airDeliveries++;
    const plan = this.gen.routes.find((r) => r.customers.some((pc) => pc.ent === c));
    if (plan) { plan.served++; if (perfect) plan.perfects++; }
    // texto y efectos
    const cy = c.window ? G.L.roadTop - 26 - 40 - c.winY : G.L.roadTop + c.y - 44;
    const label = air ? '¡AÉREA!' : perfect ? '¡PERFECTO!' : '¡BIEN!';
    G.FX.text(label, c.x, cy - 12, { fancy: true, scale: perfect || air ? 2 : 1, top: perfect ? '#fff6b0' : '#e0ffe8', bottom: perfect ? '#f59a00' : '#3ac870', life: 1 });
    G.FX.text('+' + G.fmtInt(pts), c.x, cy + 8, { color: '#ffe23f', life: 1, delay: 0.08 });
    G.FX.text('+' + tg.toFixed(1).replace('.', ',') + ' S', c.x + 30, cy + 18, { color: '#7af0ff', life: 1, delay: 0.15 });
    G.FX.burst(c.x, cy + 26, perfect ? 30 : 16, { colors: ['#ff5a7a', '#ffe23f', '#4ff3a0', '#7af0ff', '#ffffff', '#b06aff'], speedMin: 40, speedMax: 150,
      g: 220, size: 2, lifeMin: 0.5, lifeMax: 1.1, spread: 2.4, angle: -Math.PI / 2 });
    if (perfect) G.FX.burst(c.x, cy + 20, 10, { colors: ['#fff6b0'], glow: true, speedMin: 30, speedMax: 90, size: 3, lifeMax: 0.5 });
    G.Audio.sfx(perfect ? 'perfect' : 'good', Math.min(6, this.combo));
    if (perfect && !auto) G.FX.slowmo(0.25, 0.07);
    p.setFace(perfect ? 2 : 1, 1.1);
    if ([3, 6, 10, 15].includes(this.combo)) {
      G.FX.text('COMBO ×' + this.mult, p.x + 20, G.L.roadTop + p.y - 80, { fancy: true, scale: 2, top: '#ffe0ff', bottom: '#ff4fd8', life: 1.1 });
      G.Audio.sfx('powerup');
    }
    // pizza fever
    this.feverStreak++;
    if (this.feverStreak >= 5 && this.fever <= 0) {
      this.fever = 8;
      this.feverStreak = 0;
      this.stats.fevers++;
      this.banner = { text: '¡PIZZA FEVER!', t: 0, life: 1.8, big: true, top: '#fff6b0', bottom: '#ff7a1a', sub: 'ENTREGAS ×2 · ZONA GIGANTE' };
      G.Audio.sfx('fever');
      G.Audio.setIntensity(2);
      G.FX.flash('#ffd21f', 0.35);
    }
  }

  onMiss(text, x, y) {
    this.combo = 0;
    this.feverStreak = 0;
    this.stats.misses++;
    G.FX.text(text, x, y, { color: '#ff6a6a', scale: 1, life: 1, big: true });
    G.Audio.sfx('miss');
    this.player.setFace(3, 1);
  }

  checkCustomers() {
    const p = this.player;
    for (const c of this.customers) {
      if (c.state !== 'wait' || c.pending) continue;
      // cañon de pizzas: entrega automatica perfecta
      if (p.cannon > 0 && this.pizzas > 0 && Math.abs(p.x - c.x) < 14 && this.state === 'play') {
        this.pizzas--;
        c.pending = true;
        G.Audio.sfx('throw');
        this.add(new G.E.Thrown(p.x - 16, p.y, p.z + 42, this.customerTarget(c), 0.18, (run) => { c.pending = false; run.deliver(c, 'perfect', p.airborne, true); }));
        continue;
      }
      if (this.demo) continue;
      if (p.x > c.x + c.zone * (this.fever > 0 ? 1.6 : 1) + 6) {
        c.state = 'lost';
        c.stateT = 0;
        c.say(G.Humor.lost, '#c02a2a');
        this.combo = 0;
        this.feverStreak = 0;
        this.stats.lost++;
        const plan = this.gen.routes.find((r) => r.customers.some((pc) => pc.ent === c));
        if (plan) plan.lost++;
        G.FX.text(this.pizzas > 0 ? '¡CLIENTE PERDIDO!' : '¡SIN PIZZAS!', p.x + 30, G.L.roadTop + p.y - 72, { color: '#ff8a8a', life: 1.1 });
        G.Audio.sfx('lost');
      }
    }
    // furgonetas rivales que roban pedidos (acera sur)
    for (const e of this.ents) {
      if (!(e instanceof G.E.Rival) || e.stealCD > 0) continue;
      for (const c of this.customers) {
        if (c.state !== 'wait' || c.pending || c.side !== 'bottom') continue;
        if (e.x >= c.x - 6 && e.x < c.x + 30 && c.x > p.x) {
          c.state = 'stolen';
          c.stateT = 0;
          c.say(G.Humor.stolen, '#c02a2a');
          e.stealCD = 1;
          this.stats.stolen++;
          const plan = this.gen.routes.find((r) => r.customers.some((pc) => pc.ent === c));
          if (plan) plan.lost++;
          G.FX.text('¡ROBADO!', c.x, G.L.roadTop + c.y - 52, { color: '#ff5a5a', big: true });
          G.Audio.sfx('stolen');
          G.FX.burst(c.x, G.L.roadTop + c.y - 20, 10, { colors: ['#ff3a3a', '#ffffff'], speedMin: 30, speedMax: 80, size: 2 });
        }
      }
    }
  }

  useCannon() {
    const p = this.player;
    if (p.cannonCharges <= 0 || p.cannon > 0 || this.state !== 'play') return;
    p.cannonCharges--;
    p.cannon = 6;
    G.Audio.sfx('powerup');
    this.banner = { text: '¡CAÑÓN DE PIZZAS!', t: 0, life: 1.4, big: true, top: '#fff0c0', bottom: '#ff9a1a' };
  }

  // ------------------------------------------------------------ checkpoints
  checkCheckpoints() {
    const p = this.player;
    for (const pz of this.pizzeriaEnts) {
      if (pz.done || !pz.plan) continue;
      if (Math.abs(p.x - pz.x) < 50 && p.y <= G.LANES[0] + 12 && !pz.express) {
        pz.express = true;
      }
      if (p.x >= pz.x + 10) {
        pz.done = true;
        this.reachCheckpoint(pz);
      }
    }
  }

  reachCheckpoint(pz) {
    const plan = pz.plan;
    const p = this.player;
    const served = plan.served, n = plan.n;
    let bonus = Math.round(served * 1.5 + plan.perfects * 0.5) + (pz.express ? 3 : 0);
    bonus = Math.max(3, bonus);
    this.time += bonus;
    const perfectRoute = served === n;
    if (perfectRoute) this.score += 1000;
    this.stats.routes++;
    this.route = plan.index + 1;
    const next = this.gen.routes[plan.index + 1];
    const load = (next ? next.n : 6) + 2;
    const before = this.pizzas;
    this.pizzas = Math.max(this.pizzas, load);
    G.Audio.sfx('checkpoint');
    setTimeout(() => G.Audio.sfx('reload'), 380);
    this.banner = {
      text: perfectRoute ? '¡RUTA PERFECTA!' : 'RUTA ' + (plan.index + 1) + ' COMPLETADA',
      sub: 'ENTREGAS ' + served + '/' + n + '  ·  +' + bonus + ' S' + (perfectRoute ? '  ·  +1.000' : ''),
      t: 0, life: 2.6, big: true, top: perfectRoute ? '#fff6b0' : '#e8fff0', bottom: perfectRoute ? '#f59a00' : '#3ac870',
    };
    if (pz.express) G.FX.text('¡RECARGA EXPRESS! +3 S', p.x + 40, G.L.roadTop + p.y - 76, { color: '#ffd21f', life: 1.4 });
    for (let i = 0; i < Math.min(10, load - before + 2); i++) {
      G.FX.spawn({ x: pz.x + G.rand.range(-20, 20), y: G.L.facadeBase - 30, vx: (p.x - pz.x) * 1.6 + G.rand.range(60, 140), vy: G.rand.range(20, 90),
        g: 60, life: 0.45 + i * 0.04, kind: 'sprite', sprite: 'pizza_box' });
    }
    G.FX.burst(p.x, G.L.roadTop + p.y - 40, 20, { colors: ['#ffe23f', '#ffffff', '#4ff3a0'], speedMin: 40, speedMax: 120, size: 2, g: 100 });
    p.setFace(1, 1.5);
  }

  // ------------------------------------------------------------ colisiones
  collide() {
    const p = this.player;
    if (this.state === 'dead' || this.state === 'intro') return;
    const pl = p.x - 24, pr = p.x + 26;
    p.onSand = false;
    for (const e of this.ents) {
      if (e.dead) continue;
      const ox = pr > e.left && pl < e.right;
      const dy = Math.abs(e.y - p.y);
      if (e instanceof G.E.Coin) {
        if (Math.abs(e.x - p.x) < 20 && dy < 14 && Math.abs(e.z - (p.z + 10)) < 24) this.collectCoin(e);
        continue;
      }
      if (e instanceof G.E.PowerUp) {
        if (ox && dy < 14 && p.z < 30) this.collectPower(e);
        continue;
      }
      if (e instanceof G.E.Ramp) {
        if (!p.airborne && !e.used && Math.abs(e.x - p.x) < 16 && dy < e.d + 4) {
          e.used = true;
          p.launch(200 + p.speed * 0.12);
          this.score += 50;
          G.FX.text('¡VUELO DE JIRAFA!', p.x + 10, G.L.roadTop + p.y - 70, { color: '#ffe23f', life: 0.9 });
        }
        continue;
      }
      if (e instanceof G.E.Patch) {
        if (!p.airborne && ox && dy < e.d + 3) {
          if (e.kind === 'sand') p.onSand = true;
          else if (p.slide <= 0 && !e.used) {
            e.used = true;
            p.slide = 0.55;
            p.slideDir = G.rand.sign();
            G.Audio.sfx('slide');
            G.FX.burst(p.x, G.L.roadTop + p.y, 12, { colors: ['#9ab8ff', '#e0ecff'], speedMin: 30, speedMax: 90, angle: -Math.PI / 2, spread: 2, g: 200, size: 2 });
            G.FX.text('¡DERRAPE!', p.x, G.L.roadTop + p.y - 64, { color: '#9ab8ff', life: 0.8 });
          }
        }
        continue;
      }
      if (!e.solid) continue;
      const hitD = e.d + 5;
      const height = e instanceof G.E.Vehicle ? (e.kind === 'rival' || e.kind === 'truck' ? 40 : 30) :
        e instanceof G.E.Pedestrian ? 34 : e instanceof G.E.Geyser ? 34 : e instanceof G.E.Wave ? 14 :
          e.kind === 'manhole_open' ? 2 : e.kind === 'barrier' ? 20 : 16;
      if (ox && dy < hitD) {
        if (p.z > height * 0.75) {
          if (!e.jumped) {
            e.jumped = true;
            if (e instanceof G.E.Vehicle) { this.score += 150; G.FX.text('¡POR ENCIMA! +150', p.x, G.L.roadTop + p.y - 80, { color: '#7af0ff' }); }
          }
          continue;
        }
        if (p.inv > 0 && !p.turboOn) continue;
        if (p.turboOn) {
          if (e.smash) { this.smashObs(e); continue; }
          if (e instanceof G.E.Pedestrian) { e.dodge(); continue; }
          if (e instanceof G.E.Vehicle) {
            if (p.inv > 0) continue;
            p.turboT = 0;
            p.inv = 0.8;
            p.speed *= 0.6;
            G.Audio.sfx('crash');
            G.FX.shake(0.5);
            G.FX.text('¡REBOTE!', p.x, G.L.roadTop + p.y - 70, { color: '#ffb020' });
            continue;
          }
          continue;
        }
        if (p.inv > 0) continue;
        if (e instanceof G.E.Pedestrian) e.dodge();
        const crashed = p.crash(this, e);
        if (e instanceof G.E.Obstacle && e.kind !== 'manhole_open') e.knock(p.speed);
        if (e instanceof G.E.RollingBarrel) e.knock(p.speed);
        if (crashed && e.kind === 'manhole_open') G.FX.text('¡BACHE!', p.x, G.L.roadTop + p.y - 70, { color: '#ff8a8a' });
        continue;
      }
      // casi-choque: pasa muy cerca sin tocar
      if (!e.nearChecked && ox && dy < hitD + 11 && p.z < height) e.close = true;
      if (e.close && !e.nearChecked && !ox) {
        e.nearChecked = true;
        const passed = (e.x < p.x);
        if (passed && p.inv <= 0 && (e instanceof G.E.Vehicle || e instanceof G.E.Obstacle || e instanceof G.E.Pedestrian || e instanceof G.E.RollingBarrel)) {
          this.nearMiss(e);
        }
      }
    }
  }

  nearMiss(e) {
    const p = this.player;
    this.stats.nearMisses++;
    this.score += 50;
    p.turbo = Math.min(1, p.turbo + 0.12);
    G.Audio.sfx('nearmiss');
    G.FX.text('¡POR LOS PELOS! +50', p.x + 16, G.L.roadTop + p.y - 72, { color: '#8ff3ff', life: 0.8 });
    if (p.face === 0) p.setFace(3, 0.5);
    void e;
  }

  smashObs(e) {
    e.knock(this.player.speed);
    this.stats.smashed++;
    this.score += e.pts || 75;
    G.Audio.sfx('smash');
    G.FX.shake(0.2);
    G.FX.burst(e.x, G.L.roadTop + e.y - 10, 12, { colors: ['#ffb020', '#ffffff', '#ff5a3a', '#c8c0b0'], speedMin: 40, speedMax: 140, g: 260, size: 2 });
    G.FX.text('+' + (e.pts || 75), e.x, G.L.roadTop + e.y - 30, { color: '#ffe23f', life: 0.6 });
  }

  collectCoin(e) {
    e.dead = true;
    this.stats.coins++;
    this.score += 10;
    G.Audio.sfx('coin', this.stats.coins);
    G.FX.burst(e.x, G.L.roadTop + e.y - e.z - 10, 5, { colors: ['#fff6b0', '#ffd21f'], speedMin: 20, speedMax: 60, size: 1, lifeMax: 0.35 });
  }

  collectPower(e) {
    const p = this.player;
    e.dead = true;
    G.Audio.sfx('powerup');
    const k = e.kind;
    if (k === 'time') this.time += 8;
    if (k === 'heart') { p.hearts = Math.min(p.maxHearts, p.hearts + 1); G.Audio.sfx('heart'); }
    if (k === 'magnet') p.magnet = p.magnetDur;
    if (k === 'helmet') p.shield = 1;
    if (k === 'cannon') p.cannon = 6;
    if (k === 'turbo') p.turbo = 1;
    G.FX.text(G.E.PU[k].label, p.x + 10, G.L.roadTop + p.y - 72, { color: G.E.PU[k].color, big: true });
    G.FX.burst(e.x, G.L.roadTop + e.y - 18, 16, { colors: [G.E.PU[k].color, '#ffffff'], speedMin: 30, speedMax: 110, size: 2, glow: true, lifeMax: 0.5 });
  }

  onLand(p) {
    if (p.airTime > 0.3) this.score += 20;
  }

  onCrash(cause) {
    this.combo = 0;
    this.feverStreak = 0;
    if (this.player.hearts <= 0) this.gameOver('crash');
    void cause;
  }

  onOvertake(v) {
    if (this.state !== 'play' || this.demo) return;
    this.stats.overtakes++;
    this.score += 100;
    G.Audio.sfx('overtake');
    G.FX.text('¡ADELANTAMIENTO! +100', this.player.x + 20, G.L.roadTop + this.player.y - 76, { color: '#ffb0a0' });
    G.FX.text(G.Humor.pick(G.Humor.overtake), this.player.x + 20, G.L.roadTop + this.player.y - 88, { color: '#ffffff', delay: 0.25, life: 1.2 });
    void v;
  }

  // ------------------------------------------------------------ dibujo
  draw(ctx) {
    const L = G.L;
    const [ox, oy] = G.FX.offset();
    const camX = this.camX;
    const cx = Math.round(camX);
    const bg = this.bg || { from: 'sunset', to: 'sunset', k: 1 };
    ctx.save();
    ctx.translate(Math.round(ox), Math.round(oy));
    // fondo
    G.Biomes.drawBackground(ctx, bg.from, camX, this.t + 30, 1, { bolt: G.Biomes.bolt });
    if (bg.to !== bg.from && bg.k > 0.01) G.Biomes.drawBackground(ctx, bg.to, camX, this.t + 30, bg.k, { bolt: G.Biomes.bolt });
    // barandilla del paseo (tramos de costa)
    const segs = this.gen.segments;
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].biome !== 'storm') continue;
      const x0 = segs[i].x0 - camX, x1 = (i + 1 < segs.length ? segs[i + 1].x0 : 1e12) - camX;
      if (x1 < 0 || x0 > G.W) continue;
      G.World.drawRailing(ctx, camX, x0, x1);
    }
    // fachadas
    for (const f of this.facades) {
      const x = Math.round(f.x - cx);
      if (x > G.W || x + f.w < 0) continue;
      ctx.drawImage(f.base, x, L.facadeBase - f.h);
    }
    for (const pz of this.pizzeriaEnts) pz.drawFacade(ctx, pz.x - cx);
    // carretera
    let border = null, left = bg.from, right = bg.to;
    for (let i = 1; i < segs.length; i++) {
      const bx = segs[i].x0 - camX;
      if (bx > -64 && bx < G.W + 64) { border = segs[i].x0; left = segs[i - 1].biome; right = segs[i].biome; break; }
      if (bx <= -64) { left = segs[i].biome; right = segs[i].biome; }
    }
    if (border === null) { left = this.gen.biomeAt(camX + G.W / 2); right = left; }
    G.World.drawRoad(ctx, camX, left, right, border);
    // capa de suelo
    for (const e of this.ents) if (e.ground) e.draw(ctx, e.x - camX, this);
    for (const pz of this.pizzeriaEnts) if (!pz.done && pz.plan) pz.drawBay(ctx, pz.x - camX);
    for (const c of this.customers) c.drawZone(ctx, c.x - camX, this);
    // entidades ordenadas por profundidad
    const list = this.ents.filter((e) => !e.ground && !e.air && !(e instanceof G.E.Pizzeria));
    list.push(this.player);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      const sx = e.x - camX;
      if (sx < -140 || sx > G.W + 140) continue;
      e.draw(ctx, sx, this);
    }
    for (const e of this.ents) if (e.air) e.draw(ctx, e.x - camX, this);
    G.FX.drawParticles(ctx, camX, false);
    // iluminacion
    this.drawLighting(ctx);
    ctx.restore();
    // lluvia y relampago (sin sacudida)
    G.Biomes.drawRain(ctx, this.rainAmt);
    const fl = G.Biomes.flashAmount();
    if (fl > 0) { ctx.globalAlpha = fl * 0.55; ctx.fillStyle = '#e8f0ff'; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1; }
    // lineas de velocidad
    this.drawSpeedLines(ctx);
    ctx.save();
    ctx.translate(Math.round(ox), Math.round(oy));
    G.FX.drawParticles(ctx, camX, true);
    G.FX.drawTexts(ctx, camX);
    ctx.restore();
    if (!this.demo) G.HUD.draw(ctx, this);
  }

  gatherLights() {
    const out = [];
    const camX = this.camX;
    for (const e of this.ents) {
      const sx = e.x - camX;
      if (sx < -120 || sx > G.W + 120) continue;
      e.lights(this, out, sx);
    }
    this.player.lights(this, out, this.player.x - camX);
    for (const c of this.customers) {
      if (c.state !== 'wait') continue;
      const sx = c.x - camX;
      if (sx < -60 || sx > G.W + 60) continue;
      if (c.window) out.push({ x: sx, y: G.L.roadTop - 26 - 36 - c.winY, rx: 26, ry: 26, a: 1, kind: 'hole' });
      else out.push({ x: sx, y: G.L.roadTop + c.y - 20, rx: 24, ry: 34, a: 0.9, kind: 'hole' });
      out.push({ x: sx, y: G.L.roadTop + c.zoneY, rx: c.zone + 10, ry: 14, a: 0.7, kind: 'hole' });
    }
    return out;
  }

  drawLighting(ctx) {
    const night = this.night * (1 - G.Biomes.flashAmount());
    const L = G.L;
    const lights = this.gatherLights();
    if (night > 0.02) {
      const lc = this.light;
      if (lc.width !== G.W || lc.height !== G.H) { lc.width = G.W; lc.height = G.H; }
      const c = lc.ctx;
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.clearRect(0, 0, G.W, G.H);
      const col = G.hex(this.nightColor || '#05030f');
      const gr = c.createLinearGradient(0, 0, 0, L.walkTop0);
      gr.addColorStop(0, G.rgbStr(col, night * 0.2));
      gr.addColorStop(1, G.rgbStr(col, night));
      c.fillStyle = gr;
      c.fillRect(0, 0, G.W, L.walkTop0);
      c.fillStyle = G.rgbStr(col, night);
      c.fillRect(0, L.walkTop0, G.W, G.H - L.walkTop0);
      c.globalCompositeOperation = 'destination-out';
      const hole = G.A.glow(32, '#ffffff', 0.4);
      for (const l of lights) {
        if (l.kind === 'hole') {
          c.globalAlpha = l.a;
          c.drawImage(hole, l.x - l.rx, l.y - l.ry, l.rx * 2, l.ry * 2);
        } else if (l.kind === 'beam') {
          c.globalAlpha = 0.9;
          c.drawImage(this.beamSprite(), l.x, l.y - l.spread, l.len, l.spread * 2 + 20);
        }
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lc, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    // emisivos: ventanas, neones
    const em = this.emissive * Math.max(0.35, Math.min(1, night * 1.8 + 0.2));
    ctx.globalAlpha = em;
    for (const f of this.facades) {
      if (!f.hasEmis) continue;
      const x = Math.round(f.x - this.camX);
      if (x > G.W || x + f.w < 0) continue;
      const broken = f.flicker && (Math.sin(this.t * 13 + f.x) > 0.55 || Math.sin(this.t * 3.1 + f.x) > 0.8);
      ctx.drawImage(broken ? f.emisAlt : f.emis, x, L.facadeBase - f.h);
    }
    for (const l of lights) if (l.kind === 'emis') ctx.drawImage(l.img, l.x, l.y);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    const flick = 0.85 + 0.15 * Math.sin(this.t * 23) * Math.sin(this.t * 7);
    for (const f of this.facades) {
      const x = f.x - this.camX;
      if (x > G.W + 40 || x + f.w < -40) continue;
      for (const g of f.glows) {
        const a = (g.neon ? 0.55 * flick : 0.4) * em;
        const spr = G.A.glow(Math.round(g.r), g.color);
        ctx.globalAlpha = a;
        if (g.tall) ctx.drawImage(spr, x + g.dx - g.r * 0.6, L.facadeBase - f.h + g.dy - g.tall / 2 - 8, g.r * 1.2, g.tall + 16);
        else ctx.drawImage(spr, x + g.dx - g.r, L.facadeBase - f.h + g.dy - g.r);
        // reflejo en el asfalto mojado
        if (this.wet > 0.3 && g.neon) {
          ctx.globalAlpha = a * 0.35 * this.wet;
          ctx.drawImage(spr, x + g.dx - g.r * 0.5, L.roadTop + 4, g.r, 70);
        }
      }
    }
    for (const l of lights) {
      if (l.kind === 'glow') {
        const spr = G.A.glow(Math.max(2, Math.round(l.r)), l.color);
        ctx.globalAlpha = l.a * (0.35 + night * 0.9);
        ctx.drawImage(spr, l.x - l.r, l.y - l.r);
        if (this.wet > 0.3 && l.y < L.roadTop + 20) {
          ctx.globalAlpha = l.a * 0.25 * this.wet;
          ctx.drawImage(spr, l.x - l.r * 0.4, L.roadTop + 6, l.r * 0.8, 60);
        }
      } else if (l.kind === 'refl' && this.wet > 0.3) {
        const spr = G.A.glow(Math.round(l.r), l.color);
        ctx.globalAlpha = l.a * this.wet;
        ctx.drawImage(spr, l.x - l.r * 0.3, L.roadTop, l.r * 0.6, 80);
      } else if (l.kind === 'beam' && night > 0.15) {
        ctx.globalAlpha = l.a * night * 1.4;
        ctx.drawImage(this.beamSprite('#fff4c8'), l.x, l.y - l.spread, l.len, l.spread * 2 + 20);
      }
    }
    ctx.imageSmoothingEnabled = false;
    // zonas de entrega brillantes de noche
    if (night > 0.2) {
      ctx.globalAlpha = Math.min(0.6, night * 0.8);
      for (const c of this.customers) c.drawZone(ctx, c.x - this.camX, this);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  beamSprite(color) {
    const key = color || 'hole';
    this.beams = this.beams || {};
    if (this.beams[key]) return this.beams[key];
    const w = 128, h = 52;
    const c = G.makeCanvas(w, h);
    const x = c.ctx;
    const col = G.hex(color || '#ffffff');
    const gr = x.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, G.rgbStr(col, 0.9));
    gr.addColorStop(0.6, G.rgbStr(col, 0.35));
    gr.addColorStop(1, G.rgbStr(col, 0));
    x.fillStyle = gr;
    x.beginPath();
    x.moveTo(0, h * 0.3);
    x.lineTo(w, 0);
    x.lineTo(w, h);
    x.lineTo(0, h * 0.42);
    x.closePath();
    x.fill();
    this.beams[key] = c;
    return c;
  }

  drawSpeedLines(ctx) {
    const p = this.player;
    const k = p.turboOn ? 1 : G.clamp((p.speed - p.max * 0.85) / (p.max * 0.3), 0, 1);
    if (k <= 0) return;
    ctx.globalAlpha = 0.35 * k;
    ctx.fillStyle = p.turboOn ? p.trail.colors[0] : '#ffffff';
    const n = Math.floor(14 * k);
    for (let i = 0; i < n; i++) {
      const y = (i * 53 + Math.floor(this.t * 60) * 7) % G.H;
      const x = (G.W - ((this.t * 900 + i * 131) % (G.W + 80)));
      ctx.fillRect(Math.round(x), y, 30 + (i % 3) * 14, 1);
    }
    ctx.globalAlpha = 1;
  }
};

// ============================================================ piloto automatico (demo y pruebas)
G.Bot = {
  // prediccion simple: ¿ocupa algo el carril l en los proximos segundos?
  laneRisk(run, l) {
    const p = run.player;
    const ly = G.LANES[l];
    let risk = 0;
    for (const e of run.ents) {
      const solidish = e.solid || e instanceof G.E.Pedestrian || e instanceof G.E.Wave || e instanceof G.E.Geyser ||
        (e instanceof G.E.Patch && e.kind === 'puddle') || (e instanceof G.E.Vehicle && e.warn > 0);
      if (!solidish) continue;
      if (e.flying) continue;
      const w = (e.w || 10) / 2 + 30;
      const vx = e instanceof G.E.Vehicle ? (e.warn > 0 ? -e.speed : e.dir * e.speed * (e.brake > 0 ? 0.35 : 1)) : e instanceof G.E.RollingBarrel ? e.vx : 0;
      for (let t = 0; t <= 1.3; t += 0.1) {
        const px = p.x + p.speed * t;
        let ex = e.x + vx * t;
        if (e instanceof G.E.Vehicle && e.warn > 0) ex = run.camX + G.W + e.w / 2 + 8 - e.speed * Math.max(0, t - e.warn) + p.speed * Math.min(t, e.warn);
        let ey = e.y;
        if (e instanceof G.E.Pedestrian && e.started) ey = e.y + e.dirY * e.speed * (e.stopT > 0 ? Math.max(0, t - e.stopT) : t);
        if (e instanceof G.E.Pedestrian && !e.started) ey = e.dirY > 0 ? G.LANES[0] + e.dirY * e.speed * t : G.LANES[3] + e.dirY * e.speed * t;
        if (e instanceof G.E.Wave) ey = e.state === 'go' ? e.y + 62 * t : e.state === 'warn' ? -24 + 62 * Math.max(0, t - e.warn) : -30;
        if (e instanceof G.E.RollingBarrel) ey = e.y + e.vy * t;
        if (e instanceof G.E.Geyser) {
          const cyc = (e.t + t + e.phase) % 3.6;
          if (cyc < 1.7) continue;
        }
        if (Math.abs(px - ex) < w && Math.abs(ey - ly) < (e.d || 5) + 12) { risk += 1.4 - t; break; }
      }
    }
    return risk;
  },
  drive(p, run) {
    const risks = [0, 1, 2, 3].map((l) => G.Bot.laneRisk(run, l));
    let want = 1.5;
    const c = run.customers.find((cc) => cc.state === 'wait' && !cc.pending && cc.x > p.x - 10 && cc.x - p.x < 380);
    if (c) want = c.side === 'top' ? 0 : 3;
    // power-ups y rampas atraen un poco
    for (const e of run.ents) {
      if ((e instanceof G.E.PowerUp || e instanceof G.E.Ramp) && e.x > p.x && e.x - p.x < 200 && !c) want = G.LANES.indexOf(e.y) >= 0 ? G.LANES.indexOf(e.y) : want;
    }
    const cur = G.clamp(Math.round((p.y - 11) / 22), 0, 3);
    let best = cur, bestScore = 1e9;
    for (let l = 0; l < 4; l++) {
      // para llegar a l hay que cruzar los carriles intermedios
      let path = 0;
      const dir = Math.sign(l - cur);
      for (let k = cur; k !== l; k += dir) path += risks[k + dir] * 0.5;
      const s = risks[l] * 10 + path * 4 + Math.abs(l - want) * 0.25 + Math.abs(l - cur) * 0.05;
      if (s < bestScore) { bestScore = s; best = l; }
    }
    const ty = G.LANES[best];
    const dy = ty - p.y;
    const y = Math.abs(dy) < 1.5 ? 0 : G.clamp(dy / 8, -1, 1);
    let x = 0.35;
    if (risks[best] > 0.6) x = -1;
    else if (c && Math.abs(c.x - p.x) < 160) x = 0;
    if (run.time < 12) x = 1;
    return { x, y };
  },
  act(run) {
    const p = run.player;
    for (const c of run.customers) {
      if (c.state !== 'wait' || c.pending) continue;
      if (c.botOff === undefined) c.botOff = G.rand.chance(0.6) ? G.rand.range(-c.perfect + 2, c.perfect - 2) : G.rand.range(c.perfect + 2, c.zone - 4) * G.rand.sign();
      const d = p.x - c.x;
      if (d >= c.botOff - 3 && d <= c.botOff + 3 && (c.laneOK(p.y) || p.airborne)) {
        if (run.demo) {
          run.pizzas = 99;
          c.pending = true;
          run.add(new G.E.Thrown(p.x - 16, p.y, p.z + 42, run.customerTarget(c), 0.2, (r) => { c.pending = false; c.state = 'served'; c.stateT = 0;
            c.say(G.Humor.served);
            G.FX.burst(c.x, G.L.roadTop + c.y - 20, 14, { colors: ['#ff5a7a', '#ffe23f', '#4ff3a0', '#7af0ff'], speedMin: 40, speedMax: 120, g: 200, size: 2 }); void r; }));
        } else run.tryThrow();
      }
    }
    if (p.turbo >= 0.95 && !p.turboOn) {
      const soon = run.customers.some((c) => c.state === 'wait' && c.x > p.x && c.x - p.x < 350);
      if (!soon) p.tryTurbo(run);
    }
    if (p.jumpLevel > 0 && G.Bot.laneRisk(run, G.clamp(Math.round((p.y - 11) / 22), 0, 3)) > 1.0) p.tryJump();
  },
};
