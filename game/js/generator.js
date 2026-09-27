/* Generador procedural infinito: rutas, patrones de obstaculos, fachadas y atrezo */
'use strict';

// camion de obras que suelta barriles rodantes
G.E.Truck = class extends G.E.Vehicle {
  constructor(x, y, o) {
    super(x, y, Object.assign({ sprite: 'van_green', dir: 1, kind: 'truck' }, o));
    this.w = G.A.w('van_green') - 12; this.d = 8;
    this.drops = 0; this.dropT = 0.6;
  }
  update(dt, run) {
    const behind = this.x - run.player.x;
    if (behind > 40 && behind < 300 && this.drops < 4) {
      this.dropT -= dt;
      if (this.dropT <= 0) {
        this.dropT = 0.85;
        this.drops++;
        const b = new G.E.RollingBarrel(this.x - this.w / 2 - 6, this.y, -30, G.rand.sign() * G.rand.range(12, 30));
        run.add(b);
        G.Audio.sfx('land');
      }
    }
    super.update(dt, run);
  }
};

// calcomanias de suelo (paso de cebra)
G.E.Zebra = class extends G.E.Ent {
  constructor(x) { super(x, 44); this.ground = true; this.w = 26; }
  update(dt, run) { if (this.x < run.camX - 40) this.dead = true; }
  draw(ctx, sx) {
    const top = G.L.roadTop + 4, bot = G.L.roadBot - 4;
    ctx.fillStyle = 'rgba(240,236,228,0.85)';
    for (let y = top; y < bot; y += 6) ctx.fillRect(Math.round(sx - 12), y, 24, 3);
  }
};

G.Generator = class {
  constructor(run, seed) {
    this.run = run;
    this.rng = new G.RNG(seed);
    this.genX = 0;
    this.facadeX = -G.W;
    this.propX = -G.W;
    this.propBotX = -G.W;
    const b0 = G.params.get('biome');
    this.segments = [{ x0: -1e12, biome: G.Biomes.DEF[b0] && !run.demo ? b0 : 'sunset' }];
    this.routes = [];
    this.routeIdx = 0;
    this.spawners = [];
    this.reserved = [];      // zonas de acera ocupadas (clientes, pizzerias)
    this.pizzerias = [];
    this.nextPower = 900;
    this.rivalCooldownX = 0;
    this.nextBoard = 300;
    this.nextSign = 700;
    this.pendingSign = null;
    this.lastLampTop = -999; this.lastLampBot = -999;
  }

  biomeAt(x) {
    let b = this.segments[0].biome;
    for (const s of this.segments) if (s.x0 <= x) b = s.biome;
    return b;
  }
  D() { return Math.min(10, this.routeIdx * 0.9 + (this.run.player ? this.run.player.dist / 9000 : 0)); }

  // ------------------------------------------------------------ planificacion de rutas
  planRoute(startX) {
    const r = this.routes.length;
    const rng = this.rng;
    const COUNTS = [4, 5, 5, 6, 6, 7, 7, 8];
    const n = COUNTS[Math.min(r, COUNTS.length - 1)];
    const biome = this.biomeAt(startX + 1);
    const plan = { index: r, startX, n, customers: [], biome, served: 0, lost: 0, perfects: 0, done: false };
    let cur = startX + (r === 0 ? 520 : 360);
    const D = r * 0.9;
    for (let i = 0; i < n; i++) {
      let side = rng.chance(0.5) ? 'top' : 'bottom';
      if (i === 0 && r === 0) side = 'bottom';
      if (i === 1 && r === 0) side = 'top';
      let window = false;
      if (biome === 'neon' && side === 'top' && rng.chance(0.4)) window = true;
      const vip = r > 0 && rng.chance(0.12);
      const gull = biome === 'storm' && !window && rng.chance(0.4);
      plan.customers.push({ x: cur + 100, side, window, vip, gull, ent: null, index: i });
      const gap = Math.round(rng.range(470, 700) - Math.min(120, D * 14));
      cur += 200 + gap;
    }
    plan.cpX = cur + 160;
    plan.endX = plan.cpX + 170;
    plan.nextBiome = G.Biomes.next(biome, rng);
    this.routes.push(plan);
    this.segments.push({ x0: plan.cpX + 58, biome: plan.nextBiome });
    this.reserved.push([plan.cpX - 70, plan.cpX + 70]);
    this.pizzerias.push({ x0: plan.cpX - 58, x1: plan.cpX + 58 });
    plan.customers.forEach((c) => this.reserved.push([c.x - 16, c.x + 16]));
    return plan;
  }

  get plan() { return this.routes[this.routes.length - 1]; }

  // ------------------------------------------------------------ bucle de generacion
  update() {
    const run = this.run;
    if (!this.routes.length) {
      // pizzeria base al principio
      this.pizzerias.push({ x0: -58, x1: 58 });
      this.reserved.push([-70, 70]);
      const base = new G.E.Pizzeria(0, true);
      base.done = true;
      run.add(base);
      run.pizzeriaEnts.push(base);
      this.planRoute(60);
      // salida tranquila: solo monedas los primeros metros
      this.coins(260, G.LANES[1], 6, 20);
      this.genX = 480;
    }
    const ahead = run.camX + G.W + 280;
    let guard = 0;
    while (this.genX < ahead && guard++ < 50) this.nextChunk();
    guard = 0;
    while (this.facadeX < run.camX + G.W + 80 && guard++ < 40) this.nextFacade();
    guard = 0;
    while (this.propX < run.camX + G.W + 80 && guard++ < 40) this.nextPropTop();
    guard = 0;
    while (this.propBotX < run.camX + G.W + 80 && guard++ < 40) this.nextPropBot();
    for (let i = this.spawners.length - 1; i >= 0; i--) {
      const s = this.spawners[i];
      if (run.camX + G.W + 10 >= s.x) { this.spawners.splice(i, 1); s.fn(); }
    }
    // limpieza de reservas antiguas
    if (this.reserved.length > 60) this.reserved = this.reserved.filter((r) => r[1] > run.camX - 200);
  }

  isReserved(x0, x1) {
    for (const r of this.reserved) if (x1 > r[0] && x0 < r[1]) return true;
    return false;
  }

  nextChunk() {
    const plan = this.plan;
    // siguiente elemento planificado
    let next = null;
    for (const c of plan.customers) {
      if (!c.ent && c.x - 100 >= this.genX - 1) { next = { type: 'cust', x0: c.x - 100, c }; break; }
    }
    if (!next && !plan.cpDone) next = { type: 'cp', x0: plan.cpX - 230 };
    if (!next) {
      // ruta terminada: planificar la siguiente
      this.routeIdx++;
      this.planRoute(plan.endX);
      this.genX = Math.max(this.genX, plan.endX);
      return;
    }
    const room = next.x0 - this.genX;
    if (room > 90) {
      this.fillPattern(this.genX, room);
      return;
    }
    if (next.type === 'cust') {
      this.makeCustomer(next.c);
      this.genX = next.c.x + 100;
    } else {
      this.makeCheckpoint(plan);
      plan.cpDone = true;
      this.genX = plan.endX;
    }
  }

  // ------------------------------------------------------------ patrones
  fillPattern(x0, room) {
    const rng = this.rng;
    const biome = this.biomeAt(x0 + 20);
    const D = this.D();
    const spacing = Math.max(26, 70 - D * 5);
    if (room < 170) {
      this.patBreather(x0, room);
      this.genX = x0 + room;
      return;
    }
    const opts = PATTERNS.filter((p) => D >= p.minD && (!p.biomes || p.biomes.includes(biome)) && p.len <= room - spacing);
    if (!opts.length) {
      this.patBreather(x0, room);
      this.genX = x0 + room;
      return;
    }
    const items = opts.map((p) => ({ p, w: typeof p.w === 'function' ? p.w(D, biome) : p.w }));
    const pick = rng.weighted(items).p;
    const used = pick.fn.call(this, x0, D, biome, rng) || pick.len;
    const signFor = { peds: 'phone', roadworks: 'works', wave: 'wave', rival: 'rival' }[pick.name];
    if (signFor && rng.chance(0.6)) { this.pendingSign = signFor; this.nextSign = Math.min(this.nextSign, x0 - 140); }
    // power-up de vez en cuando
    if (x0 > this.nextPower) {
      this.nextPower = x0 + rng.range(1300, 2100);
      this.placePowerUp(x0 + Math.min(used, 120) * 0.5 + 20);
    }
    this.genX = x0 + used + spacing;
  }

  placePowerUp(x) {
    const run = this.run, rng = this.rng;
    const p = run.player;
    const items = [
      { k: 'time', w: 30 }, { k: 'magnet', w: 16 }, { k: 'helmet', w: 14 }, { k: 'turbo', w: 16 },
      { k: 'heart', w: p && p.hearts < p.maxHearts ? 16 : 0 }, { k: 'cannon', w: 8 },
    ];
    const kind = rng.weighted(items).k;
    run.add(new G.E.PowerUp(x, G.LANES[rng.int(0, 3)], kind));
  }

  lane(i) { return G.LANES[i]; }
  obs(kind, x, lane) { this.run.add(new G.E.Obstacle(x, typeof lane === 'number' && lane < 4 ? G.LANES[lane] : lane, kind)); }
  coins(x, y, n, dx, fz) {
    for (let i = 0; i < n; i++) this.run.add(new G.E.Coin(x + i * (dx || 18), typeof y === 'function' ? y(i) : y, fz ? fz(i) : 0));
  }
  spawn(x, fn) { this.spawners.push({ x, fn }); }
  oncoming(x, laneIdx, speed, o) {
    const run = this.run;
    this.spawn(x, () => {
      const v = new G.E.Vehicle(run.camX + G.W + 50, G.LANES[laneIdx], Object.assign({ dir: -1, speed }, o || {}));
      v.x = run.camX + G.W + v.w / 2 + 8;
      run.add(v);
    });
  }
  sameDir(x, laneIdx, speed, cls, o) {
    const run = this.run;
    this.spawn(x, () => {
      const C = cls || G.E.Vehicle;
      const v = new C(run.camX + G.W + 60, G.LANES[laneIdx], Object.assign({ dir: 1, speed }, o || {}));
      v.x = run.camX + G.W + v.w / 2 + 8;
      run.add(v);
    });
  }
  carSpeed(D) { return Math.min(175, 78 + D * 9 + this.rng.range(0, 40)); }

  patBreather(x0, len) {
    const rng = this.rng;
    if (len > 80 && rng.chance(0.7)) {
      const n = Math.min(8, Math.floor((len - 20) / 18));
      const l = rng.int(0, 3);
      if (rng.chance(0.5)) this.coins(x0 + 10, G.LANES[l], n, 18);
      else {
        const base = G.LANES[l];
        this.coins(x0 + 10, (i) => G.clamp(base + Math.sin(i * 0.7) * 16, 6, 82), n, 18);
      }
    }
  }
};

// ------------------------------------------------------------ biblioteca de patrones
// cada patron: {name, len, minD, w, biomes, fn(x0, D, biome, rng) -> longitud usada}
const PATTERNS = [
  { name: 'coins', len: 170, minD: 0, w: 0.8, fn(x0, D, b, rng) { this.patBreather(x0, 170); void D; void b; void rng; return 170; } },
  { name: 'cones_line', len: 220, minD: 0, w: 1.1, fn(x0, D, b, rng) {
    const l = rng.int(0, 3);
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) this.obs('cone', x0 + 20 + i * 44, l);
    const cl = l < 2 ? l + 1 : l - 1;
    this.coins(x0 + 30, G.LANES[cl], 6, 26);
    return 40 + n * 44;
  } },
  { name: 'slalom', len: 330, minD: 0.4, w: 1.0, fn(x0, D, b, rng) {
    const a = rng.int(0, 2);
    for (let i = 0; i < 5; i++) this.obs('cone', x0 + 20 + i * 70, a + (i % 2));
    this.coins(x0 + 55, (i) => G.LANES[a + ((i + 1) % 2)], 4, 70);
    return 330;
  } },
  { name: 'roadworks', len: 240, minD: 0.8, w: 1.0, biomes: ['sunset', 'neon'], fn(x0, D, b, rng) {
    const pair = rng.int(0, 2);
    this.obs('barrier', x0 + 90, pair);
    this.obs('barrier', x0 + 90, pair + 1);
    for (let i = 0; i < 3; i++) {
      this.obs('cone', x0 + 20 + i * 22, pair);
      this.obs('cone', x0 + 20 + i * 22, pair + 1);
    }
    this.obs('cone', x0 + 150, pair); this.obs('cone', x0 + 150, pair + 1);
    this.obs('crate', x0 + 200, pair + (rng.chance(0.5) ? 0 : 1));
    return 240;
  } },
  { name: 'oncoming', len: 200, minD: 0, w: 1.6, fn(x0, D, b, rng) {
    const n = D > 2 && rng.chance(0.5) ? 2 : 1;
    const first = rng.int(0, 1);
    this.oncoming(x0, first, this.carSpeed(D));
    if (n > 1) this.oncoming(x0 + rng.int(110, 170), 1 - first, this.carSpeed(D));
    if (rng.chance(0.5)) this.coins(x0 + 20, G.LANES[rng.int(2, 3)], 6, 20);
    return 200;
  } },
  { name: 'slowcar', len: 220, minD: 0, w: 1.2, fn(x0, D, b, rng) {
    const l = rng.int(2, 3);
    this.sameDir(x0, l, rng.range(55, 85) + D * 3);
    if (D > 1.5 && rng.chance(0.5)) this.sameDir(x0 + rng.int(140, 200), 5 - l, rng.range(60, 90));
    return 220;
  } },
  { name: 'traffic', len: 300, minD: 1, w: 1.3, fn(x0, D, b, rng) {
    this.oncoming(x0, 0, this.carSpeed(D));
    this.sameDir(x0 + 60, 3, rng.range(60, 85));
    this.oncoming(x0 + rng.int(150, 230), 1, this.carSpeed(D));
    this.coins(x0 + 40, G.LANES[2], 7, 22);
    return 300;
  } },
  { name: 'taxi', len: 230, minD: 1, w: 1.0, fn(x0, D, b, rng) {
    const l = rng.int(0, 1);
    this.oncoming(x0, l, Math.min(330, 240 + D * 10), { sprite: 'car_taxi', warn: 0.85, zigzag: D >= 2.5 && rng.chance(0.6), kind: 'taxi' });
    this.coins(x0 + 30, G.LANES[l], 5, 20);
    return 230;
  } },
  { name: 'peds', len: 240, minD: 0, w: 0.9, biomes: ['sunset', 'neon'], fn(x0, D, b, rng) {
    const zx = x0 + 110;
    this.run.add(new G.E.Zebra(zx));
    const n = D > 1.5 ? rng.int(1, 2) : 1;
    for (let i = 0; i < n; i++) {
      this.run.add(new G.E.Pedestrian(zx + (i ? rng.range(-6, 6) : 0), rng.chance(0.5), { trigger: rng.range(250, 330) + i * 50, phone: rng.chance(0.75) }));
    }
    return 240;
  } },
  { name: 'manholes', len: 230, minD: 0, w: 0.9, biomes: ['sunset', 'neon'], fn(x0, D, b, rng) {
    const lanes = rng.shuffle([0, 1, 2, 3]);
    const n = D > 2 ? 3 : 2;
    for (let i = 0; i < n; i++) this.obs('manhole_open', x0 + 30 + i * 70, lanes[i]);
    if (rng.chance(0.5)) this.run.add(new G.E.Ramp(x0 - 10, G.LANES[lanes[0]]));
    return 30 + n * 70;
  } },
  { name: 'ramp', len: 260, minD: 0, w: 1.0, fn(x0, D, b, rng) {
    const l = rng.int(0, 3);
    this.run.add(new G.E.Ramp(x0 + 20, G.LANES[l]));
    // monedas en el aire siguiendo la parabola del salto
    this.coins(x0 + 44, G.LANES[l], 6, 22, (i) => {
      const t = (24 + i * 22) / 185;
      return Math.max(6, 200 * t - 280 * t * t);
    });
    // obstaculos para saltar por encima
    const kinds = b === 'storm' ? ['crate', 'barrel'] : ['cone', 'manhole_open', 'crate'];
    for (let i = 0; i < 3; i++) {
      const lane = (l + i) % 4;
      if (lane === l || rng.chance(0.5)) this.obs(rng.pick(kinds), x0 + 110 + rng.int(-6, 16), lane);
    }
    return 260;
  } },
  { name: 'crates', len: 200, minD: 0.3, w: 0.8, biomes: ['sunset', 'storm'], fn(x0, D, b, rng) {
    const l = rng.int(0, 2);
    this.obs('crate', x0 + 30, l); this.obs('crate', x0 + 48, l); this.obs('barrel', x0 + 40, l + 1);
    this.obs('crate', x0 + 140, rng.int(0, 3));
    return 200;
  } },
  { name: 'rival', len: 280, minD: 1, w: (D, b) => (b === 'neon' ? 1.1 : 0.6), fn(x0, D, b, rng) {
    // solo una furgoneta rival a la vez
    if (this.run.ents.some((e) => e instanceof G.E.Rival && !e.dead) || x0 < this.rivalCooldownX) { this.patBreather(x0, 200); return 200; }
    this.rivalCooldownX = x0 + 1600;
    this.sameDir(x0, rng.int(2, 3), 95, G.E.Rival);
    return 280;
  } },
  { name: 'truck', len: 320, minD: 2, w: 0.7, fn(x0, D, b, rng) {
    if (this.run.ents.some((e) => e instanceof G.E.Truck && !e.dead)) { this.patBreather(x0, 200); return 200; }
    this.sameDir(x0, rng.int(2, 3), 88, G.E.Truck);
    return 320;
  } },
  { name: 'geysers', len: 240, minD: 0.5, w: 1.0, biomes: ['neon', 'storm'], fn(x0, D, b, rng) {
    const lanes = rng.shuffle([0, 1, 2, 3]).slice(0, D > 2 ? 3 : 2);
    lanes.forEach((l, i) => this.run.add(new G.E.Geyser(x0 + 30 + i * 80, G.LANES[l], rng.range(0, 3.6))));
    return 50 + lanes.length * 80;
  } },
  { name: 'puddles', len: 220, minD: 0, w: 0.9, biomes: ['neon'], fn(x0, D, b, rng) {
    const n = rng.int(2, 3);
    for (let i = 0; i < n; i++) this.run.add(new G.E.Patch(x0 + 30 + i * 70, G.LANES[rng.int(0, 3)], 'puddle', rng.int(34, 52)));
    return 50 + n * 70;
  } },
  { name: 'wave', len: 260, minD: 0, w: 1.2, biomes: ['storm'], fn(x0, D, b, rng) {
    this.run.add(new G.E.Wave(x0 + 130, rng.int(100, 140)));
    this.coins(x0 + 60, G.LANES[rng.int(0, 3)], 5, 30);
    return 260;
  } },
  { name: 'sand', len: 240, minD: 0, w: 0.9, biomes: ['storm'], fn(x0, D, b, rng) {
    const l = rng.int(0, 3);
    this.run.add(new G.E.Patch(x0 + 70, G.LANES[l], 'sand', rng.int(90, 140)));
    if (rng.chance(0.6)) this.run.add(new G.E.Patch(x0 + 170, G.LANES[(l + 2) % 4], 'sand', rng.int(60, 100)));
    return 240;
  } },
];
G.PATTERNS = PATTERNS;

// ------------------------------------------------------------ clientes, pizzerias, fachadas y atrezo
Object.assign(G.Generator.prototype, {
  makeCustomer(c) {
    const run = this.run, rng = this.rng;
    const side = c.window ? 'window' : c.side;
    const cust = new G.E.Customer(c.x, side, { vip: c.vip, index: c.index, winY: c.window ? rng.int(0, 16) : 0, D: this.D() });
    c.ent = cust;
    run.add(cust);
    run.customers.push(cust);
    // monedas guia hacia la zona
    const zy = c.side === 'top' ? G.LANES[0] : G.LANES[3];
    this.coins(c.x - 92, zy, 3, 16);
    if (c.gull) run.add(new G.E.Gull(c.x, cust));
    // algo de trafico alrededor segun dificultad
    const D = this.D();
    if (D >= 1.2 && rng.chance(Math.min(0.6, 0.2 + D * 0.06))) {
      if (c.side === 'top') this.oncoming(c.x - 80, 1, this.carSpeed(D));
      else this.sameDir(c.x - 120, 2, rng.range(60, 80));
    }
    if (c.window) {
      // cartel del edificio con ventana (se pinta en el cliente)
    }
  },

  makeCheckpoint(plan) {
    const run = this.run;
    const pz = new G.E.Pizzeria(plan.cpX, false);
    pz.plan = plan;
    run.add(pz);
    run.pizzeriaEnts.push(pz);
    run.add(new G.E.Prop(plan.cpX - 150, -8, 'sign_pizza'));
    run.add(new G.E.Prop(plan.cpX + 80, -18, 'flag'));
    this.coins(plan.cpX - 180, G.LANES[0], 8, 18);
  },

  nextFacade() {
    const rng = this.rng;
    const x = this.facadeX;
    for (const p of this.pizzerias) {
      if (x + 30 > p.x0 && x < p.x1) { this.facadeX = p.x1 + 4; return; }
    }
    const biome = this.biomeAt(x + 30);
    const f = G.World.makeFacade(biome, rng);
    // no invadir la pizzeria siguiente
    for (const p of this.pizzerias) {
      if (x < p.x0 && x + f.w > p.x0) {
        const gap = p.x0 - x;
        if (gap < 24) { this.facadeX = p.x1 + 4; return; }
        const g2 = G.World.makeFacade(biome === 'neon' ? 'neon' : biome, rng);
        if (g2.w <= gap) { g2.x = x; this.run.facades.push(g2); }
        this.facadeX = p.x1 + 4;
        return;
      }
    }
    f.x = x;
    this.run.facades.push(f);
    const gap = biome === 'storm' ? rng.int(10, 60) : biome === 'neon' ? rng.int(0, 3) : rng.int(0, 8);
    this.facadeX = x + f.w + gap;
  },

  nextPropTop() {
    const rng = this.rng, run = this.run;
    const x = this.propX;
    const biome = this.biomeAt(x);
    const lampEvery = biome === 'neon' ? 120 : biome === 'storm' ? 150 : 140;
    let step = rng.int(40, 70);
    if (!this.isReserved(x - 10, x + 10)) {
      if (x - this.lastLampTop >= lampEvery) {
        run.add(new G.E.Prop(x, -5, 'lamp'));
        this.lastLampTop = x;
      } else if (x > this.nextBoard && !this.isReserved(x - 50, x + 50)) {
        // valla publicitaria con chiste
        const o = G.World.billboard(rng);
        run.add(new G.E.CanvasProp(x + o.w / 2, -21, o));
        this.nextBoard = x + rng.range(700, 1300);
        step = o.w + 10;
      } else if (x > this.nextSign && !this.isReserved(x - 30, x + 30)) {
        const t = this.pendingSign || rng.pick(biome === 'storm' ? ['gull', 'wave', 'giraffe', 'speed'] : ['giraffe', 'speed', 'noparking', 'phone']);
        this.pendingSign = null;
        run.add(new G.E.CanvasProp(x, -3, G.World.roadSign(t)));
        this.nextSign = x + rng.range(500, 1100);
      } else {
        const opts = {
          sunset: [['palm', 1.3, -20], ['bench', 0.6, -19], ['trash', 0.6, -8], ['planter', 0.7, -18], ['hydrant', 0.4, -6], ['billboard', 0.2, -20], [null, 1.2]],
          neon: [['trash', 0.9, -8], ['hydrant', 0.6, -6], ['bench', 0.3, -19], ['billboard', 0.5, -20], ['planter', 0.2, -18], [null, 1.4]],
          storm: [['palm', 1.6, -20], ['bench', 0.8, -19], ['trash', 0.4, -8], [null, 1.0]],
        }[biome];
        const it = rng.weighted(opts.map((o) => ({ w: o[1], o })));
        const [kind, , y] = it.o;
        if (kind) {
          const w = G.A.w(kind);
          if (!this.isReserved(x - w / 2, x + w / 2)) run.add(new G.E.Prop(x, y + rng.int(-2, 2), kind, { flip: rng.chance(0.5) }));
        }
      }
    } else step = 24;
    this.propX = x + step;
  },

  nextPropBot() {
    const rng = this.rng, run = this.run;
    const x = this.propBotX;
    const biome = this.biomeAt(x);
    let step = rng.int(70, 140);
    if (!this.isReserved(x - 12, x + 12)) {
      const opts = {
        sunset: [['hydrant', 0.7, 98], ['trash', 0.6, 100], ['planter', 0.6, 104], ['bench', 0.3, 108], [null, 1.3]],
        neon: [['hydrant', 0.8, 98], ['trash', 0.8, 100], [null, 1.2]],
        storm: [['bench', 0.5, 108], ['trash', 0.4, 100], [null, 1.5]],
      }[biome];
      const it = rng.weighted(opts.map((o) => ({ w: o[1], o })));
      const [kind, , y] = it.o;
      if (kind) run.add(new G.E.Prop(x, y, kind, { flip: rng.chance(0.5) }));
    } else step = 30;
    this.propBotX = x + step;
  },
});
