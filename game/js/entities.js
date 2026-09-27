/* Entidades del mundo: vehiculos, obstaculos, peatones, clientes, recogibles, efectos */
'use strict';

G.E = (() => {
  const L = () => G.L;
  const sy = (y) => G.L.roadTop + y;

  function shadow(ctx, sx, y, w, a) {
    ctx.globalAlpha = a || 0.32;
    ctx.fillStyle = '#12081c';
    const h = Math.max(2, Math.round(w * 0.12));
    const Y = Math.round(sy(y));
    for (let i = -h; i <= h; i++) {
      const hw = Math.round((w / 2) * Math.sqrt(1 - (i * i) / (h * h + 0.01)));
      ctx.fillRect(Math.round(sx - hw), Y + i, hw * 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  // ======================================================== base
  class Ent {
    constructor(x, y) {
      this.x = x; this.y = y; this.z = 0;
      this.dead = false; this.t = 0;
      this.w = 10; this.d = 4;          // huella en el suelo (ancho, media profundidad)
      this.solid = false;               // choca con el jugador
      this.smash = false;               // se puede arrollar con turbo
      this.ground = false;              // se pinta en la capa de suelo
      this.air = false;                 // se pinta encima de todo (en el aire)
      this.nearChecked = false;
    }
    update(dt, run) { this.t += dt; void run; }
    draw() {}
    lights() {}
    get left() { return this.x - this.w / 2; }
    get right() { return this.x + this.w / 2; }
  }

  // ======================================================== vehiculos
  const CARS = ['car_red', 'car_blue', 'car_white', 'car_green', 'car_purple', 'car_orange', 'car_suv', 'car_teal', 'car_police'];
  class Vehicle extends Ent {
    constructor(x, y, o) {
      super(x, y);
      this.sprite = o.sprite || G.rand.pick(CARS);
      this.dir = o.dir;                   // +1 derecha, -1 izquierda
      this.speed = o.speed;
      this.kind = o.kind || 'car';
      this.solid = true;
      this.w = G.A.w(this.sprite) - 8;
      this.d = 7;
      this.targetY = y;
      this.blink = 0;                     // intermitente (s)
      this.brake = 0;
      this.honked = false;
      this.warn = o.warn || 0;            // aviso antes de entrar (taxi)
      this.zigzag = o.zigzag || false;
      this.zigDone = false;
    }
    update(dt, run) {
      super.update(dt, run);
      if (this.warn > 0) {
        this.warn -= dt;
        // espera fuera de pantalla con los faros destellando
        this.x = run.camX + G.W + this.w / 2 + 6;
        if (this.warn <= 0) G.Audio.sfx('honk');
        return;
      }
      let sp = this.speed * (this.brake > 0 ? 0.35 : 1);
      this.brake = Math.max(0, this.brake - dt);
      // no atravesar al vehiculo de delante en el mismo carril
      for (const o of run.ents) {
        if (o === this || !(o instanceof Vehicle) || o.dir !== this.dir || o.warn > 0) continue;
        if (Math.abs(o.y - this.y) > 12) continue;
        const gap = (o.x - this.x) * this.dir - (o.w + this.w) / 2;
        if (gap > -10 && gap < 26) { sp = Math.min(sp, o.speed * 0.95); if (gap < 4) sp = Math.min(sp, o.speed * 0.6); }
      }
      this.x += this.dir * sp * dt;
      // zigzag del taxi kamikaze
      if (this.zigzag && !this.zigDone) {
        const sx = this.x - run.camX;
        if (sx < G.W * 0.72 && this.blink <= 0) {
          this.blink = 0.45;
          this.targetY = this.y < 22 ? G.LANES[1] : G.LANES[0];
          this.zigDone = true;
        }
      }
      if (this.blink > 0) {
        this.blink -= dt;
      } else if (Math.abs(this.targetY - this.y) > 0.5) {
        this.y = G.approach(this.y, this.targetY, 42 * dt);
      }
      // fuera de pantalla -> eliminar
      if (this.dir < 0 && this.x < run.camX - 120) this.dead = true;
      if (this.dir > 0 && this.x < run.camX - 160) this.dead = true;
      if (this.dir > 0 && this.x > run.camX + G.W + 900) this.dead = true;
    }
    draw(ctx, sx) {
      const flip = this.dir < 0;
      shadow(ctx, sx, this.y + 1, this.w + 4, 0.35);
      const fr = Math.floor(this.t * (this.speed / 18)) % 2;
      const bob = Math.floor(this.t * 9) % 2;
      G.A.draw(ctx, this.sprite, fr, sx, sy(this.y) + 5 - bob * 0);
      // intermitentes
      const h = G.A.h(this.sprite);
      if (this.blink > 0 && Math.floor(this.blink * 10) % 2 === 0) {
        const side = this.targetY < this.y ? -1 : 1;
        const bx = flip ? sx - this.w / 2 - 3 : sx + this.w / 2 + 1;
        const by = sy(this.y) + 5 - h * 0.45 + (side > 0 ? 2 : -1);
        ctx.fillStyle = '#ffb020';
        ctx.fillRect(Math.round(bx), Math.round(by), 3, 2);
        const rx = flip ? sx + this.w / 2 : sx - this.w / 2 - 2;
        ctx.fillRect(Math.round(rx), Math.round(by), 3, 2);
      }
      if (this.brake > 0) {
        ctx.fillStyle = '#ff2a2a';
        const rx = flip ? sx + this.w / 2 + 1 : sx - this.w / 2 - 3;
        ctx.fillRect(Math.round(rx), Math.round(sy(this.y) + 5 - h * 0.45), 3, 3);
      }
      if (this.kind === 'truck') {
        // rotativo naranja
        const on = Math.floor(this.t * 6) % 2;
        ctx.fillStyle = on ? '#ffb020' : '#8a5a10';
        ctx.fillRect(Math.round(sx - 4), Math.round(sy(this.y) + 5 - h - 3), 5, 3);
      }
      if (this.kind === 'police' || this.sprite === 'car_police') {
        const on = Math.floor(this.t * 8) % 2;
        this.siren = on;
      }
    }
    lights(run, out, sx) {
      const flip = this.dir < 0;
      const hx = flip ? sx - this.w / 2 - 2 : sx + this.w / 2 + 2;
      const y = sy(this.y) - 6;
      out.push({ x: hx + (flip ? -40 : 40), y: y + 6, rx: 46, ry: 12, a: 0.9, kind: 'hole' });
      out.push({ x: hx, y, r: 7, color: '#fff2c0', a: 0.8, kind: 'glow' });
      const tx = flip ? sx + this.w / 2 + 1 : sx - this.w / 2 - 1;
      out.push({ x: tx, y: y + 1, r: this.brake > 0 ? 8 : 5, color: '#ff3030', a: 0.8, kind: 'glow' });
      if (this.warn > 0) out.push({ x: G.W - 4, y, r: 20, color: '#fff6c8', a: 0.6 + 0.4 * Math.sin(this.t * 30), kind: 'glow', screen: true });
    }
  }

  // ---------------- furgoneta rival "Pizza Rapida"
  class Rival extends Vehicle {
    constructor(x, y, o) {
      super(x, y, Object.assign({ sprite: 'van_rival', dir: 1, kind: 'rival' }, o));
      this.w = G.A.w('van_rival') - 12;
      this.d = 8;
      this.think = 1.0;
      this.passed = false;
      this.stealCD = 0;
    }
    update(dt, run) {
      const p = run.player;
      const behind = this.x - p.x;     // >0: la furgoneta va delante
      if (behind > 0 && behind < 240 && !run.over) {
        // se pone a la velocidad del jugador para estorbar
        this.speed = G.approach(this.speed, Math.min(p.speed * 0.82, 165), 90 * dt);
        this.think -= dt;
        if (this.think <= 0 && this.blink <= 0) {
          this.think = G.rand.range(0.9, 1.6);
          const pl = p.y > 44 ? (p.y > 66 ? 3 : 2) : -1;
          const my = this.targetY > 66 ? 3 : 2;
          const free = !run.ents.some((o) => o !== this && o instanceof G.E.Vehicle && Math.abs(o.y - G.LANES[pl]) < 12 && Math.abs(o.x - this.x) < (o.w + this.w) / 2 + 16);
          if (pl >= 2 && pl !== my && free) {
            this.blink = 0.55;
            this.targetY = G.LANES[pl];
          } else if (pl === my && behind < 110 && G.rand.chance(0.45)) {
            this.brake = 0.5;          // frenazo de "prueba"
            G.Audio.sfx('horn');
          }
        }
      }
      if (!this.passed && behind < -this.w / 2 - 20) {
        this.passed = true;
        run.onOvertake(this);
      }
      super.update(dt, run);
      this.stealCD = Math.max(0, this.stealCD - dt);
    }
    draw(ctx, sx) {
      super.draw(ctx, sx);
      // logo de la competencia flotando
      if (!this.passed) {
        const line = G.Humor.rival[Math.floor(this.t / 1.6) % G.Humor.rival.length];
        G.Font.draw(ctx, line, sx, sy(this.y) - G.A.h('van_rival') - 6, { color: '#ff6a5a', outline: '#1a0f24', align: 'center' });
      }
    }
  }

  // ======================================================== obstaculos estaticos
  const OBS = {
    cone: { w: 10, d: 4, smash: true, pts: 75 },
    crate: { w: 16, d: 5, smash: true, pts: 75 },
    barrel: { w: 12, d: 5, smash: true, pts: 75 },
    barrier: { w: 28, d: 5, smash: true, pts: 100 },
    manhole_open: { w: 22, d: 4, smash: false, groundHole: true },
  };
  class Obstacle extends Ent {
    constructor(x, y, kind) {
      super(x, y);
      this.kind = kind;
      const o = OBS[kind];
      this.w = o.w; this.d = o.d; this.smash = o.smash; this.pts = o.pts || 0;
      this.solid = true;
      this.ground = !!o.groundHole;
      this.flying = null;
    }
    update(dt, run) {
      super.update(dt, run);
      if (this.flying) {
        const f = this.flying;
        f.t += dt;
        f.vz -= 520 * dt;
        this.z += f.vz * dt;
        this.x += f.vx * dt;
        this.y += f.vy * dt;
        f.rot += f.vr * dt;
        if (f.t > 1.4) this.dead = true;
      }
      if (this.x < run.camX - 80) this.dead = true;
    }
    knock(vx) {
      this.solid = false;
      this.flying = { t: 0, vz: G.rand.range(150, 220), vx: vx + G.rand.range(40, 120), vy: G.rand.range(-30, 30), rot: 0, vr: G.rand.range(-14, 14) };
    }
    draw(ctx, sx) {
      if (this.kind === 'manhole_open') {
        G.A.draw(ctx, 'manhole_open', 0, sx + 3, sy(this.y) + 6);
        return;
      }
      if (!this.flying) shadow(ctx, sx, this.y + 1, this.w + 4, 0.3);
      if (this.flying) {
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy(this.y) - this.z - G.A.h(this.kind) / 2));
        ctx.rotate(this.flying.rot);
        G.A.draw(ctx, this.kind, 0, 0, G.A.h(this.kind) / 2);
        ctx.restore();
      } else {
        G.A.draw(ctx, this.kind, 0, sx, sy(this.y) + 2);
      }
      if (this.kind === 'barrier') {
        const on = Math.floor(this.t * 3 + this.x) % 2;
        this.lampOn = on;
      }
    }
    lights(run, out, sx) {
      if (this.flying) return;
      // reflectantes: los obstaculos siempre se leen de noche
      out.push({ x: sx, y: sy(this.y) - 6, rx: this.w / 2 + 10, ry: 12, a: 0.75, kind: 'hole' });
      if (this.kind === 'barrier') out.push({ x: sx, y: sy(this.y) - 19, r: this.lampOn ? 10 : 5, color: '#ffb020', a: 0.9, kind: 'glow' });
      if (this.kind === 'cone') out.push({ x: sx, y: sy(this.y) - 8, r: 6, color: '#ff8a2a', a: 0.5, kind: 'glow' });
      if (this.kind === 'manhole_open') out.push({ x: sx, y: sy(this.y), r: 12, color: '#ff5a3a', a: 0.25, kind: 'glow' });
    }
  }

  // ---------------- alcantarilla geiser
  class Geyser extends Ent {
    constructor(x, y, phase) {
      super(x, y);
      this.w = 20; this.d = 5;
      this.ground = true;
      this.phase = phase || 0;
      this.state = 'closed';
      this.solid = false;
      this.lastState = '';
    }
    update(dt, run) {
      super.update(dt, run);
      const cyc = (this.t + this.phase) % 3.6;
      this.state = cyc < 1.8 ? 'closed' : cyc < 2.6 ? 'bubble' : 'blow';
      this.solid = this.state === 'blow';
      const sx = this.x - run.camX;
      if (this.state !== this.lastState) {
        if (this.state === 'blow' && sx > -20 && sx < G.W + 20) G.Audio.sfx('steam');
        this.lastState = this.state;
      }
      if (this.state === 'bubble' && G.rand.chance(dt * 20)) {
        G.FX.spawn({ x: this.x + G.rand.range(-8, 8), y: sy(this.y) - 2, vy: -G.rand.range(10, 25), life: 0.5, size: 2, size1: 3,
          color: 'rgba(230,236,245,0.6)', kind: 'circle' });
      }
      if (this.state === 'blow') {
        for (let i = 0; i < 3; i++) {
          G.FX.spawn({ x: this.x + G.rand.range(-5, 5), y: sy(this.y) - 2, vx: G.rand.range(-12, 12), vy: -G.rand.range(90, 150),
            drag: 1.5, life: 0.7, size: 3, size1: 9, color: 'rgba(235,240,248,0.55)', kind: 'circle' });
        }
      }
      if (this.x < run.camX - 80) this.dead = true;
    }
    lights(run, out, sx) {
      out.push({ x: sx, y: sy(this.y) - 4, rx: 22, ry: 12, a: 0.7, kind: 'hole' });
      if (this.state !== 'closed') out.push({ x: sx, y: sy(this.y) - 10, r: 14, color: '#c8e0ff', a: 0.35, kind: 'glow' });
    }
    draw(ctx, sx) {
      const shake = this.state === 'bubble' ? (Math.floor(this.t * 30) % 2) : 0;
      G.A.draw(ctx, this.state === 'blow' ? 'manhole_open' : 'manhole', 0, sx + shake, sy(this.y) + 5 - (this.state === 'blow' ? 1 : 0));
      if (this.state === 'bubble') {
        G.Font.draw(ctx, '!', sx, sy(this.y) - 22 - Math.abs(Math.sin(this.t * 10)) * 3, { color: '#ffb020', outline: '#1a0f24', align: 'center' });
      }
    }
  }

  // ---------------- charco (Neon) y arena (Costa)
  class Patch extends Ent {
    constructor(x, y, kind, len) {
      super(x, y);
      this.kind = kind;
      this.w = len || 40; this.d = kind === 'sand' ? 9 : 6;
      this.ground = true;
      this.effect = kind;
      this.seed = G.rand.int(0, 999);
    }
    update(dt, run) { super.update(dt, run); if (this.right < run.camX - 40) this.dead = true; }
    draw(ctx, sx) {
      const Y = Math.round(sy(this.y));
      const rx = this.w / 2, ry = this.d;
      if (this.kind === 'puddle') {
        G.Biomes.ellipse(ctx, sx, Y, rx, ry, '#1a1830');
        G.Biomes.ellipse(ctx, sx - 2, Y - 1, rx - 4, Math.max(1, ry - 2), '#24304e');
        ctx.fillStyle = '#6a8ac8';
        const off = Math.floor(this.t * 8) % 6;
        for (let i = -rx + 6; i < rx - 6; i += 6) ctx.fillRect(Math.round(sx + i + off * 0.5), Y - 1, 3, 1);
      } else {
        G.Biomes.ellipse(ctx, sx, Y, rx, ry, '#c8ae78');
        G.Biomes.ellipse(ctx, sx - 3, Y - 1, rx - 6, Math.max(1, ry - 3), '#dcc48e');
        ctx.fillStyle = '#b8995e';
        for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(sx - rx + 6 + ((i * 37 + this.seed) % (this.w - 10))), Y - ry + 2 + ((i * 13) % (ry * 2 - 3)), 2, 1);
      }
    }
    lights(run, out, sx) {
      if (this.kind === 'puddle') out.push({ x: sx, y: sy(this.y), r: this.w * 0.45, color: '#5a70c8', a: 0.25, kind: 'glow' });
    }
  }

  // ======================================================== peaton "zombi del movil"
  class Pedestrian extends Ent {
    constructor(x, fromTop, o) {
      super(x, fromTop ? -12 : 100);
      this.dirY = fromTop ? 1 : -1;
      this.sprite = 'ped_' + G.rand.int(0, 5);
      this.speed = o.speed || G.rand.range(24, 34);
      this.phone = o.phone !== false;
      this.stopAt = this.phone ? G.rand.pick([G.LANES[1], G.LANES[2], G.LANES[0], G.LANES[3]]) : -999;
      this.stopT = 0;
      this.stopped = false;
      this.warnT = 0;
      this.w = 8; this.d = 4;
      this.solid = true;
      this.started = false;
      this.trigger = o.trigger || 260;
      this.scared = 0;
      this.turned = false;
      this.line = G.Humor.pick(G.Humor.phone);
      this.scaredLine = G.Humor.pick(G.Humor.scared);
    }
    update(dt, run) {
      super.update(dt, run);
      const dist = this.x - run.player.x;
      if (!this.started) {
        if (dist < this.trigger) this.started = true;
        else return;
      }
      if (this.scared > 0) { this.scared -= dt; }
      if (this.stopT > 0) {
        this.stopT -= dt;
        if (this.stopT <= 0 && !this.turned && G.rand.chance(0.25)) { this.dirY *= -1; this.turned = true; }
      } else {
        const ny = this.y + this.dirY * this.speed * dt * (this.scared > 0 ? 2.2 : 1);
        if (!this.stopped && ((this.dirY > 0 && this.y < this.stopAt && ny >= this.stopAt - 10) || (this.dirY < 0 && this.y > this.stopAt && ny <= this.stopAt + 10))) {
          this.warnT = 0.45;
        }
        if (!this.stopped && ((this.dirY > 0 && ny >= this.stopAt) || (this.dirY < 0 && ny <= this.stopAt))) {
          this.stopped = true;
          this.stopT = G.rand.range(0.6, 1.0);
        }
        this.y = ny;
      }
      this.warnT = Math.max(0, this.warnT - dt);
      if (this.y < -16 || this.y > 104) {
        this.solid = false;
        if (this.x < run.camX - 40 || this.y < -30 || this.y > 118) this.dead = true;
      } else this.solid = true;
      if (this.x < run.camX - 40) this.dead = true;
    }
    dodge() { this.scared = 0.8; this.stopT = 0; this.solid = false; }
    draw(ctx, sx) {
      shadow(ctx, sx, this.y + 1, 12, 0.3);
      const walking = this.started && this.stopT <= 0;
      let f = walking ? Math.floor(this.t * 8) % 4 : 0;
      if (this.dirY < 0) f += 8;
      else if (this.phone) f += 4;
      const hop = this.scared > 0 ? Math.abs(Math.sin(this.scared * 12)) * 5 : 0;
      G.A.draw(ctx, this.sprite, f, sx, sy(this.y) + 1 - hop);
      if (this.stopT > 0 && this.phone || this.warnT > 0) {
        const bx = Math.round(sx), by = Math.round(sy(this.y) - 46);
        G.Font.draw(ctx, this.phone ? this.line : '...', bx, by, { color: '#ffffff', outline: '#1a0f24', align: 'center' });
      }
      if (this.scared > 0) G.Font.draw(ctx, this.scaredLine, sx, sy(this.y) - 50, { color: '#ffe23f', outline: '#1a0f24', align: 'center' });
    }
    lights(run, out, sx) {
      if (this.started) out.push({ x: sx, y: sy(this.y) - 18, rx: 14, ry: 24, a: 0.8, kind: 'hole' });
      if (this.phone && this.dirY > 0) out.push({ x: sx, y: sy(this.y) - 22, r: 6, color: '#8ff3ff', a: 0.7, kind: 'glow' });
    }
  }

  // ======================================================== barril rodante
  class RollingBarrel extends Ent {
    constructor(x, y, vx, vy) {
      super(x, y);
      this.vx = vx; this.vy = vy;
      this.w = 14; this.d = 5;
      this.solid = true; this.smash = true; this.pts = 75;
      this.kind = 'barrel_roll';
      this.flying = null;
    }
    update(dt, run) {
      super.update(dt, run);
      if (this.flying) {
        const f = this.flying;
        f.t += dt; f.vz -= 520 * dt;
        this.z += f.vz * dt; this.x += f.vx * dt;
        if (f.t > 1.3) this.dead = true;
        return;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y < 4 || this.y > 84) { this.vy *= -1; this.y = G.clamp(this.y, 4, 84); }
      if (this.x < run.camX - 60) this.dead = true;
    }
    knock(vx) {
      this.solid = false;
      this.flying = { t: 0, vz: 200, vx: vx + 80 };
    }
    lights(run, out, sx) { if (!this.flying) out.push({ x: sx, y: sy(this.y) - 8, rx: 16, ry: 12, a: 0.75, kind: 'hole' }); }
    draw(ctx, sx) {
      if (!this.flying) shadow(ctx, sx, this.y + 1, 16, 0.3);
      const f = Math.floor(this.t * 12) % 4;
      G.A.draw(ctx, 'barrel_roll', 3 - f, sx, sy(this.y) + 3 - this.z);
    }
  }

  // ======================================================== ola (Costa)
  class Wave extends Ent {
    constructor(x, len) {
      super(x, -24);
      this.w = len || 110; this.d = 5;
      this.state = 'wait';
      this.warn = 1.2;
      this.air = false;
      this.solid = false;
      this.band = 7;
    }
    update(dt, run) {
      super.update(dt, run);
      const dist = this.x - run.player.x;
      if (this.state === 'wait' && dist < 330) { this.state = 'warn'; G.Audio.sfx('wave'); }
      if (this.state === 'warn') {
        this.warn -= dt;
        if (this.warn <= 0) this.state = 'go';
      }
      if (this.state === 'go') {
        this.y += 62 * dt;
        this.solid = this.y > -2 && this.y < 90;
        if (G.rand.chance(dt * 40)) {
          G.FX.spawn({ x: this.x + G.rand.range(-this.w / 2, this.w / 2), y: sy(this.y) - 2, vx: G.rand.range(-10, 10), vy: -G.rand.range(20, 40),
            g: 120, life: 0.5, size: 2, color: '#e8f8ff' });
        }
        if (this.y > 118) this.dead = true;
      }
      if (this.x < run.camX - 150) this.dead = true;
    }
    draw(ctx, sx) {
      const x0 = Math.round(sx - this.w / 2);
      if (this.state === 'warn' || this.state === 'wait') {
        if (this.state === 'warn') {
          const a = 0.5 + 0.5 * Math.sin(this.t * 20);
          ctx.globalAlpha = a;
          ctx.fillStyle = '#e8f8ff';
          for (let i = 0; i < this.w; i += 5) ctx.fillRect(x0 + i, Math.round(sy(-24) + Math.sin(i + this.t * 8) * 1), 3, 2);
          ctx.globalAlpha = 1;
          G.Font.draw(ctx, '¡OLA!', sx, sy(-44), { color: '#8ff3ff', outline: '#0a1a24', align: 'center' });
        }
        return;
      }
      const Y = Math.round(sy(this.y));
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#3fa0c0';
      ctx.fillRect(x0, Y - 16, this.w, 16);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#7fd0e8';
      ctx.fillRect(x0, Y - 6, this.w, 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f0fcff';
      for (let i = 0; i < this.w; i += 2) {
        const h = 2 + Math.round((Math.sin(i * 0.4 + this.t * 10) + 1) * 1.5);
        ctx.fillRect(x0 + i, Y - h, 2, h);
      }
    }
  }

  // ======================================================== gaviota
  class Gull extends Ent {
    constructor(x, customer) {
      super(x, -60);
      this.cust = customer;
      this.air = true;
      this.mode = 'circle';
      this.ang = G.rand.range(0, G.TAU);
      this.hx = x; this.hy = -58;
      this.carry = false;
      this.vx = 0; this.vy = 0;
    }
    update(dt, run) {
      super.update(dt, run);
      if (this.mode === 'circle') {
        this.ang += dt * 2.6;
        const c = this.cust;
        this.x = c.x + Math.cos(this.ang) * 16;
        this.y = (c.side === 'bottom' ? 60 : -58) + Math.sin(this.ang) * 5;
        if (c.state !== 'wait') { this.mode = 'leave'; this.vx = 90; this.vy = -60; }
      } else if (this.mode === 'dive') {
        this.x = G.lerp(this.x, this.tx, 1 - Math.exp(-14 * dt));
        this.y = G.lerp(this.y, this.ty, 1 - Math.exp(-14 * dt));
        this.dt2 = (this.dt2 || 0) + dt;
        if (this.dt2 > 0.22) { this.mode = 'leave'; this.carry = true; this.vx = 110; this.vy = -80; G.Audio.sfx('gull'); }
      } else {
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.y < -200) this.dead = true;
      }
      if (this.x < run.camX - 60) this.dead = true;
    }
    dive(tx, ty) { this.mode = 'dive'; this.tx = tx; this.ty = ty; }
    draw(ctx, sx) {
      const f = Math.floor(this.t * 10) % 3;
      const flip = this.mode === 'circle' ? Math.sin(this.ang) < 0 : this.vx < 0;
      G.A.draw(ctx, 'gull', f, sx, sy(this.y) + 6, flip);
      if (this.carry) G.A.draw(ctx, 'pizza_box', 0, sx + 1, sy(this.y) + 14);
    }
  }

  // ======================================================== clientes
  class Customer extends Ent {
    say(list, col) { this.quote = G.Humor.pick(list); this.quoteCol = col || '#ffffff'; this.quoteT = 0; }
    constructor(x, side, o) {
      super(x, side === 'bottom' ? G.SIDEWALK_BOT_Y : G.SIDEWALK_TOP_Y);
      this.side = side;                     // 'top' | 'bottom' | 'window'
      this.window = side === 'window';
      if (this.window) { this.side = 'top'; this.y = -26; }
      this.vip = !!o.vip;
      this.sprite = this.window ? G.rand.pick(['customer', 'customer_1', 'customer_2', 'customer_3', 'customer_4']) : 'cust_' + G.rand.int(0, 7);
      this.state = 'wait';                  // wait | served | lost | stolen
      this.stateT = 0;
      // la ventana se estrecha con la dificultad
      const D = o.D || 0;
      this.zone = (this.window ? 26 : this.vip ? 28 : 38) - Math.min(8, Math.floor(D));
      this.perfect = Math.max(5, (this.window ? 7 : this.vip ? 7 : 9) - Math.floor(D * 0.4));
      this.order = G.rand.pick(['pizza_whole', 'slice', 'pizza_whole', 'soda']);
      this.gull = null;
      this.index = o.index || 0;
      this.winY = o.winY || 0;
    }
    get laneOK() { return this.side === 'top' ? (y) => y <= G.LANES[0] + 11 : (y) => y >= G.LANES[3] - 11; }
    get zoneY() { return this.side === 'top' ? G.LANES[0] : G.LANES[3]; }
    update(dt, run) {
      super.update(dt, run);
      if (this.state !== 'wait') this.stateT += dt;
      if (this.quote) { this.quoteT += dt; if (this.quoteT > 1.6) this.quote = null; }
      if (this.x < run.camX - 80) this.dead = true;
    }
    drawZone(ctx, sx, run) {
      if (this.state !== 'wait') return;
      const p = run.player;
      const zy = Math.round(sy(this.zoneY));
      const near = Math.abs(p.x - this.x) < this.zone + 140;
      const inLane = this.laneOK(p.y) || p.z > 4;
      const fever = run.fever > 0;
      const zw = Math.round(this.zone * (fever ? 1.6 : 1));
      const pulse = 0.55 + 0.45 * Math.sin(G.t * 8);
      // franja de la zona de entrega
      const col = this.vip ? '#ffd21f' : fever ? '#ff9ad8' : '#4ff3a0';
      ctx.globalAlpha = (near ? 0.34 : 0.16) + (inLane && near ? 0.12 * pulse : 0);
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(sx - zw), zy - 9, zw * 2, 18);
      ctx.globalAlpha = near ? 0.9 : 0.5;
      // flechas/chevrones que se desplazan
      const off = Math.floor(G.t * 30) % 8;
      for (let x = -zw + off; x < zw - 3; x += 8) {
        ctx.fillRect(Math.round(sx + x), zy - 1, 3, 1);
        ctx.fillRect(Math.round(sx + x + 1), zy, 3, 1);
        ctx.fillRect(Math.round(sx + x), zy + 1, 3, 1);
      }
      // bordes y franja perfecta
      ctx.fillRect(Math.round(sx - zw), zy - 9, 1, 18);
      ctx.fillRect(Math.round(sx + zw - 1), zy - 9, 1, 18);
      ctx.globalAlpha = near ? 0.85 : 0.4;
      ctx.fillStyle = '#fff6b0';
      const pw = this.perfect * (fever ? 1.6 : 1);
      ctx.fillRect(Math.round(sx - pw), zy - 9, Math.round(pw * 2), 2);
      ctx.fillRect(Math.round(sx - pw), zy + 7, Math.round(pw * 2), 2);
      ctx.fillRect(Math.round(sx - 1), zy - 9, 2, 18);
      ctx.globalAlpha = 1;
    }
    draw(ctx, sx, run) {
      const Y = sy(this.y);
      if (this.window) {
        // cliente asomado a una ventana (busto)
        const wy = Math.round(sy(-26) - 22 - this.winY);
        ctx.fillStyle = '#1a1428';
        ctx.fillRect(Math.round(sx - 16), wy - 26, 32, 34);
        ctx.fillStyle = this.state === 'served' ? '#ffe9a0' : '#ffcf70';
        ctx.fillRect(Math.round(sx - 14), wy - 24, 28, 30);
        const bob = this.state === 'served' ? -Math.abs(Math.sin(this.stateT * 12)) * 3 : Math.sin(this.t * 3) * 1;
        G.A.draw(ctx, this.sprite, 0, sx, wy + 6 + bob);
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(Math.round(sx - 17), wy + 6, 34, 3);
        ctx.fillStyle = '#6a5a4a';
        ctx.fillRect(Math.round(sx - 17), wy + 9, 34, 1);
      } else {
        shadow(ctx, sx, this.y + 1, 14, 0.3);
        let f = 0;
        const d = this.x - run.player.x;
        if (this.state === 'served') f = 4;
        else if (this.state === 'wait' && d < 260 && d > -40) f = 2 + (Math.floor(this.t * 6) % 2);
        else f = Math.floor(this.t * 2) % 2;
        const hop = this.state === 'served' ? Math.abs(Math.sin(this.stateT * 10)) * 6 * Math.max(0, 1 - this.stateT / 1.2) : 0;
        if (this.state === 'lost' || this.state === 'stolen') {
          G.A.drawTint(ctx, this.sprite, 0, sx, Y + 1, false, this.state === 'stolen' ? '#c83a3a' : '#5a5a7a', 0.35);
        }
        G.A.draw(ctx, this.sprite, f, sx, Y + 1 - hop, false, this.state === 'lost' ? 0.6 : 1);
      }
      // burbuja del pedido
      if (this.state === 'wait') {
        const by = this.window ? sy(-26) - 58 - this.winY : Y - 52;
        const bounce = Math.round(Math.sin(this.t * 5) * 1.5);
        if (this.vip) {
          const g = G.A.glow(16, '#ffd21f');
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.6;
          ctx.drawImage(g, Math.round(sx - 16), Math.round(by - 6 + bounce));
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        }
        G.A.draw(ctx, 'bubble', 0, sx + 4, by + 18 + bounce);
        if (this.order !== 'slice') {
          ctx.fillStyle = this.vip ? '#ffe46a' : '#ffffff';
          ctx.fillRect(Math.round(sx - 2), Math.round(by + 2 + bounce), 13, 11);
          G.A.draw(ctx, this.order, 0, sx + 4, by + 13 + bounce);
        }
        if (this.vip) G.Font.draw(ctx, 'VIP', sx + 4, by - 8 + bounce, { color: '#ffd21f', outline: '#1a0f24', align: 'center' });
      } else if (this.state === 'served' && this.stateT < 1.4) {
        G.Font.draw(ctx, '♥', sx + Math.sin(this.stateT * 6) * 4, Y - 48 - this.stateT * 18, { color: '#ff5a7a', outline: '#1a0f24', align: 'center', alpha: 1 - this.stateT / 1.4 });
      }
      if (this.quote) {
        const qy = (this.window ? sy(-26) - 74 - this.winY : Y - 78) - Math.min(6, this.quoteT * 20);
        const a = this.quoteT > 1.3 ? (1.6 - this.quoteT) / 0.3 : 1;
        const qw = G.Font.measure(this.quote) + 6;
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(sx - qw / 2), Math.round(qy - 2), qw, 11);
        ctx.fillRect(Math.round(sx - 1), Math.round(qy + 9), 3, 2);
        ctx.globalAlpha = a;
        G.Font.draw(ctx, this.quote, sx, qy, { color: this.quoteCol === '#ffffff' ? '#1a0f24' : this.quoteCol, align: 'center' });
        ctx.globalAlpha = 1;
      }
    }
  }

  // ======================================================== recogibles
  class Coin extends Ent {
    constructor(x, y, z) {
      super(x, y);
      this.z = z || 0;
      this.w = 10; this.d = 7;
      this.ph = G.rand.range(0, G.TAU);
      this.pull = false;
    }
    update(dt, run) {
      super.update(dt, run);
      const p = run.player;
      if (p.magnet > 0 && Math.abs(this.x - p.x) < 110 && Math.abs(this.y - p.y) < 70) this.pull = true;
      if (this.pull) {
        this.x = G.lerp(this.x, p.x + 4, 1 - Math.exp(-10 * dt));
        this.y = G.lerp(this.y, p.y, 1 - Math.exp(-10 * dt));
        this.z = G.lerp(this.z, p.z + 14, 1 - Math.exp(-10 * dt));
      }
      if (this.x < run.camX - 30) this.dead = true;
    }
    draw(ctx, sx) {
      const k = Math.abs(Math.cos(G.t * 5 + this.ph));
      const w = Math.max(2, Math.round(G.A.w('coin') * k));
      const h = G.A.h('coin');
      const Y = Math.round(sy(this.y) - this.z - 6 - Math.sin(G.t * 4 + this.ph) * 1.5);
      if (this.z > 4) shadow(ctx, sx, this.y + 1, 8, 0.18);
      else shadow(ctx, sx, this.y + 1, 8, 0.25);
      ctx.drawImage(G.A.img.coin, 0, 0, G.A.w('coin'), h, Math.round(sx - w / 2), Y - h, w, h);
      if (k > 0.9) { ctx.fillStyle = '#fffbe0'; ctx.fillRect(Math.round(sx - 1), Y - h + 3, 1, 3); }
    }
  }

  const PU = {
    time: { sprite: 'stopwatch', color: '#7af0ff', label: '+8 S' },
    heart: { sprite: 'heart', color: '#ff6a8a', label: '+1 ♥' },
    magnet: { sprite: 'magnet', color: '#ff5a5a', label: 'IMÁN' },
    helmet: { sprite: 'helmet', color: '#ffd21f', label: 'CASCO' },
    cannon: { sprite: 'box_logo', color: '#ffb020', label: 'CAÑÓN' },
    turbo: { sprite: 'bolt', color: '#fff06a', label: 'TURBO' },
  };
  class PowerUp extends Ent {
    constructor(x, y, kind) {
      super(x, y);
      this.kind = kind;
      this.w = 14; this.d = 8;
      this.z = 8;
    }
    update(dt, run) { super.update(dt, run); if (this.x < run.camX - 30) this.dead = true; }
    draw(ctx, sx) {
      const p = PU[this.kind];
      const Y = Math.round(sy(this.y) - this.z - Math.sin(this.t * 4) * 2);
      shadow(ctx, sx, this.y + 1, 12, 0.3);
      const g = G.A.glow(14, p.color);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(this.t * 6);
      ctx.drawImage(g, Math.round(sx - 14), Y - 24);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      // burbuja
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(Math.round(sx) + 0.5, Y - 10 + 0.5, 10, 0, G.TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(sx - 6), Y - 17, 2, 2);
      G.A.draw(ctx, p.sprite, 0, sx, Y - 10 + G.A.h(p.sprite) / 2);
    }
    lights(run, out, sx) { out.push({ x: sx, y: sy(this.y) - this.z - 10, r: 16, color: PU[this.kind].color, a: 0.5, kind: 'glow' }); }
  }

  // ======================================================== rampa
  class Ramp extends Ent {
    constructor(x, y) {
      super(x, y);
      this.w = 22; this.d = 8;
      this.used = false;
    }
    update(dt, run) { super.update(dt, run); if (this.x < run.camX - 40) this.dead = true; }
    draw(ctx, sx) {
      shadow(ctx, sx, this.y + 1, 24, 0.3);
      G.A.draw(ctx, 'ramp', 0, sx, sy(this.y) + 5);
    }
  }

  // ======================================================== pizza lanzada
  class Thrown extends Ent {
    constructor(x0, y0, z0, target, dur, onHit) {
      super(x0, y0);
      this.x0 = x0; this.y0 = y0; this.z0 = z0;
      this.target = target;           // {x, y, z} en mundo (y relativa a carretera)
      this.dur = dur;
      this.onHit = onHit;
      this.air = true;
      this.spin = 0;
    }
    update(dt, run) {
      this.t += dt;
      const k = Math.min(1, this.t / this.dur);
      const tg = this.target;
      this.x = G.lerp(this.x0, tg.x, k);
      this.y = G.lerp(this.y0, tg.y, k);
      this.z = G.lerp(this.z0, tg.z, k) + Math.sin(k * Math.PI) * (18 + Math.abs(tg.y - this.y0) * 0.35);
      if (G.rand.chance(dt * 40)) {
        G.FX.spawn({ x: this.x, y: sy(this.y) - this.z, vx: G.rand.range(-15, 15), vy: G.rand.range(-15, 15), life: 0.35, size: 2,
          color: G.rand.pick(['#ffe06a', '#ffffff', '#ffb020']), glow: false });
      }
      if (k >= 1) {
        this.dead = true;
        if (this.onHit) this.onHit(run, this);
      }
    }
    draw(ctx, sx) {
      const flip = Math.floor(this.t * 20) % 2 === 0;
      const Y = sy(this.y) - this.z;
      G.A.draw(ctx, 'pizza_box', 0, sx, Y + 7, flip);
    }
  }

  // ======================================================== atrezo de acera
  const PROPS = {
    lamp: { light: true }, palm: {}, bench: {}, trash: {}, planter: {}, hydrant: {}, billboard: {},
    sign_pizza: {}, fence: {}, wall_pillar: {}, flag: {}, cone: {},
  };
  class Prop extends Ent {
    constructor(x, y, kind, o) {
      super(x, y);
      this.kind = kind;
      this.flip = !!(o && o.flip);
      this.sway = kind === 'palm' ? G.rand.range(0, G.TAU) : 0;
      this.w = G.A.w(kind);
    }
    update(dt, run) { super.update(dt, run); if (this.x < run.camX - 120) this.dead = true; }
    draw(ctx, sx, run) {
      const Y = sy(this.y);
      if (this.kind === 'palm') {
        // palmera meciendose: la copa se desplaza 1-2 px
        const img = G.A.img.palm, w = img.width, h = img.height;
        const wind = run && run.windAmt ? run.windAmt : 0;
        const s = Math.sin(this.t * (1.6 + wind * 2) + this.sway) * (1 + wind * 2) - wind * 2;
        const x0 = Math.round(sx - w / 2), y0 = Math.round(Y - h);
        const cut = Math.round(h * 0.45);
        ctx.drawImage(img, 0, cut, w, h - cut, x0, y0 + cut, w, h - cut);
        ctx.drawImage(img, 0, 0, w, cut, x0 + Math.round(s), y0, w, cut);
        return;
      }
      G.A.draw(ctx, this.kind, 0, sx, Y + 1, this.flip);
    }
    lights(run, out, sx) {
      if (this.kind === 'lamp') {
        const top = sy(this.y) - G.A.h('lamp') + 5;
        out.push({ x: sx, y: top + 4, r: 12, color: '#ffe6a0', a: 1, kind: 'glow' });
        out.push({ x: sx, y: sy(this.y) + 10, rx: 44, ry: 18, a: 1, kind: 'hole' });
        out.push({ x: sx, y: top + 8, rx: 22, ry: 40, a: 0.6, kind: 'hole' });
        out.push({ x: sx, y: sy(this.y) + 30, r: 26, color: '#ffe0a0', a: 0.18, kind: 'refl' });
      }
    }
  }

  // ======================================================== valla / senal (lienzo precalculado)
  class CanvasProp extends Ent {
    constructor(x, y, o) {
      super(x, y);
      this.o = o;
      this.w = o.w;
    }
    update(dt, run) { super.update(dt, run); if (this.x < run.camX - this.o.w - 40) this.dead = true; }
    draw(ctx, sx) {
      ctx.drawImage(this.o.base, Math.round(sx - this.o.w / 2), Math.round(sy(this.y) - this.o.h + 1));
    }
    lights(run, out, sx) {
      if (!this.o.hasEmis) return;
      out.push({ kind: 'emis', img: this.o.emis, x: Math.round(sx - this.o.w / 2), y: Math.round(sy(this.y) - this.o.h + 1) });
      for (const g of this.o.glows) out.push({ x: sx - this.o.w / 2 + g.dx, y: sy(this.y) - this.o.h + g.dy, r: g.r, color: g.color, a: 0.5, kind: 'glow' });
      out.push({ x: sx, y: sy(this.y) - this.o.h + 10, rx: this.o.w * 0.7, ry: 18, a: 0.8, kind: 'hole' });
    }
  }

  // ======================================================== pizzeria de recarga
  class Pizzeria extends Ent {
    constructor(x, first) {
      super(x, -30);
      this.first = first;
      this.done = false;
      this.express = false;
      this.w = G.A.w('pizzeria');
      this.facade = true;
    }
    update(dt, run) { super.update(dt, run); if (this.x < run.camX - 200) this.dead = true; }
    drawFacade(ctx, sx) {
      const img = G.A.img.pizzeria;
      ctx.drawImage(img, Math.round(sx - img.width / 2), Math.round(G.L.facadeBase - img.height + 4));
    }
    drawBay(ctx, sx) {
      // bahia de carga en el carril superior
      const y = Math.round(sy(G.LANES[0]));
      const x0 = Math.round(sx - 50);
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(G.t * 6);
      ctx.fillStyle = '#ffd21f';
      ctx.fillRect(x0, y - 10, 100, 20);
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 100; i += 8) {
        ctx.fillRect(x0 + i, y - 10, 4, 2);
        ctx.fillRect(x0 + i + 4, y + 8, 4, 2);
      }
      ctx.globalAlpha = 1;
      G.Font.draw(ctx, 'CARGA', sx, y - 3, { color: '#ffd21f', outline: '#1a0f24', align: 'center' });
    }
    lights(run, out, sx) {
      out.push({ x: sx, y: G.L.facadeBase - 40, r: 50, color: '#ffb060', a: 0.5, kind: 'glow' });
      out.push({ x: sx, y: G.L.facadeBase + 20, rx: 90, ry: 30, a: 1, kind: 'hole' });
    }
  }

  return { Ent, CanvasProp, Vehicle, Rival, Obstacle, Geyser, Patch, Pedestrian, RollingBarrel, Wave, Gull, Customer, Coin, PowerUp, PU, Ramp, Thrown, Prop, Pizzeria, shadow, CARS };
})();
