/* GOM: control de la moto, fisica, estados y dibujo */
'use strict';

G.Player = class {
  constructor() {
    const U = G.Save.data.upgrades;
    this.x = 0; this.y = G.LANES[1] + 4; this.z = 0; this.vz = 0;
    this.speed = 0; this.vy = 0;
    this.cruise = 150;
    this.max = 226 * (1 + 0.06 * U.motor);
    this.min = 92;
    this.lat = 96 * (1 + 0.12 * U.manejo);
    this.grip = 1 + 0.2 * U.manejo;
    this.maxHearts = 4 + (U.chasis >= 3 ? 1 : 0);
    this.hearts = this.maxHearts;
    this.crashKeep = 0.34 + 0.1 * U.chasis;
    this.inv = 0; this.stun = 0; this.hit = 0;
    this.turbo = 0.3; this.turboT = 0; this.turboDur = 2.3 + 0.3 * U.motor;
    this.shield = 0; this.magnet = 0; this.cannon = 0;
    this.magnetDur = 8 + 2 * U.iman;
    this.cannonCharges = U.canon;
    this.jumpLevel = U.salto; this.jumpCD = 0;
    this.jumpCDMax = [0, 3.4, 2.7, 2.0][U.salto] || 3.4;
    this.slide = 0; this.slideDir = 0; this.onSand = false;
    this.control = false;
    this.dist = 0;
    this.face = 0; this.faceT = 0;
    this.ghosts = [];
    this.airTime = 0;
    this.throwT = 0;
    this.trail = G.Save.trail();
  }

  get airborne() { return this.z > 0.5 || this.vz > 0; }
  get turboOn() { return this.turboT > 0; }
  get speed01() { return G.clamp((this.speed - this.min) / (this.max * 1.5 - this.min), 0, 1); }

  setFace(f, t) { this.face = f; this.faceT = t || 1.2; }

  launch(vz) {
    this.vz = vz;
    this.z = Math.max(this.z, 0.6);
    this.airTime = 0;
    G.Audio.sfx('jump');
  }

  tryJump() {
    if (this.jumpLevel <= 0 || this.jumpCD > 0 || this.airborne || this.stun > 0) return false;
    this.launch(175);
    this.jumpCD = this.jumpCDMax;
    return true;
  }

  tryTurbo(run) {
    if (this.turboOn || this.turbo < 0.35 || this.stun > 0) return false;
    this.turboT = this.turboDur * Math.max(0.55, this.turbo);
    this.turbo = 0;
    G.Audio.sfx('turbo');
    G.FX.shake(0.25);
    this.setFace(4, this.turboT);
    run.stats.turbos++;
    G.FX.text(G.Humor.pick(G.Humor.gomTurbo), this.x + 10, G.L.roadTop + this.y - 78, { color: '#fff06a', life: 1 });
    return true;
  }

  update(dt, run) {
    const I = G.Input;
    this.faceT -= dt;
    if (this.faceT <= 0) this.face = run.fever > 0 ? 1 : 0;
    this.inv = Math.max(0, this.inv - dt);
    this.hit = Math.max(0, this.hit - dt);
    this.jumpCD = Math.max(0, this.jumpCD - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.cannon = Math.max(0, this.cannon - dt);
    this.throwT = Math.max(0, this.throwT - dt);
    if (this.turboT > 0) {
      this.turboT -= dt;
      if (this.turboT <= 0) this.turboT = 0;
    }

    // ---------------- velocidad
    let ax = 0, ay = 0;
    if (this.control && this.stun <= 0) { ax = I.axisX(); ay = I.axisY(); }
    if (run.autopilot) { const a = run.autopilot(this, run); ax = a.x; ay = a.y; }
    let target;
    if (!this.control && !run.autopilot) target = run.introSpeed || 0;
    else if (this.turboOn) target = this.max * 1.5;
    else if (ax >= 0) target = G.lerp(this.cruise, this.max, ax);
    else target = G.lerp(this.cruise, this.min, -ax);
    if (this.onSand && !this.turboOn) target *= 0.86;
    if (this.stun > 0) { this.stun -= dt; target = this.min * 0.6; }
    const acc = target > this.speed ? (this.turboOn ? 420 : 150) : 240;
    this.speed = G.approach(this.speed, target, acc * dt);

    // ---------------- profundidad (carriles)
    if (this.slide > 0) {
      this.slide -= dt;
      this.vy = G.approach(this.vy, this.slideDir * this.lat * 0.7, 300 * dt);
    } else {
      const tv = ay * this.lat * (this.airborne ? 0.75 : 1);
      const rate = (this.onSand ? 3.2 : 11) * this.grip * this.lat;
      this.vy = G.approach(this.vy, tv, rate * dt);
    }
    this.y += this.vy * dt;
    if (this.y < G.PLAYER_MIN_Y) { this.y = G.PLAYER_MIN_Y; this.vy = 0; }
    if (this.y > G.PLAYER_MAX_Y) { this.y = G.PLAYER_MAX_Y; this.vy = 0; }

    // ---------------- aire
    if (this.airborne) {
      this.airTime += dt;
      this.vz -= 560 * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0;
        G.Audio.sfx('land');
        G.FX.shake(0.12);
        G.FX.burst(this.x - 20, G.L.roadTop + this.y + 2, 8, { speedMin: 20, speedMax: 60, angle: -Math.PI / 2, spread: 2.4,
          colors: ['#d8d0c8', '#b8b0a8'], size: 2, lifeMin: 0.2, lifeMax: 0.45, g: 120 });
        run.onLand(this);
      }
    }

    const dx = this.speed * dt;
    this.x += dx;
    this.dist += dx;

    // ---------------- particulas: polvo / estela / llama
    const gy = G.L.roadTop + this.y;
    const tr = this.trail;
    if (!this.airborne && this.speed > 40 && G.rand.chance(dt * (8 + this.speed01 * 30))) {
      G.FX.spawn({ x: this.x - 30, y: gy - 1 + G.rand.range(-1, 1), vx: -G.rand.range(10, 40), vy: -G.rand.range(4, 16),
        drag: 2, life: G.rand.range(0.3, 0.6), size: 2, size1: tr.id === 'humo' ? 5 : 3,
        color: G.rand.pick(tr.colors), kind: tr.id === 'humo' ? 'circle' : 'rect' });
    }
    if (this.turboOn) {
      for (let i = 0; i < 3; i++) {
        G.FX.spawn({ x: this.x - 28 + G.rand.range(-2, 2), y: gy - 14 - this.z + G.rand.range(-2, 2), vx: -G.rand.range(60, 160), vy: G.rand.range(-12, 12),
          life: G.rand.range(0.15, 0.35), size: 3, size1: 1, color: G.rand.pick(tr.colors), glow: tr.id !== 'humo' });
      }
      if (tr.star && G.rand.chance(dt * 20)) G.FX.spawn({ x: this.x - 30, y: gy - 20, vx: -80, vy: G.rand.range(-20, 20), life: 0.6, kind: 'sprite', sprite: 'star' });
      if (G.frame % 3 === 0) {
        this.ghosts.push({ x: this.x, y: this.y, z: this.z, t: 0, spr: this.spriteName() });
      }
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].t += dt;
      if (this.ghosts[i].t > 0.22) this.ghosts.splice(i, 1);
    }
  }

  crash(run, cause) {
    if (this.inv > 0) return false;
    if (this.shield > 0) {
      this.shield--;
      this.inv = 1.0;
      G.Audio.sfx('smash');
      G.FX.text('¡CASCO!', this.x, G.L.roadTop + this.y - 60, { color: '#ffd21f', scale: 1 });
      G.FX.burst(this.x, G.L.roadTop + this.y - 20, 18, { colors: ['#ffd21f', '#fff6b0'], speedMin: 40, speedMax: 120, size: 2 });
      return false;
    }
    this.hearts--;
    this.inv = 1.5;
    this.stun = 0.4;
    this.hit = 0.12;
    this.speed *= this.crashKeep;
    this.vy *= -0.4;
    this.turboT = 0;
    this.setFace(5, 1.6);
    G.Audio.sfx('crash');
    G.FX.shake(0.7);
    G.FX.flash('#ff3030', 0.25);
    G.vibrate(90);
    const gy = G.L.roadTop + this.y;
    G.FX.burst(this.x + 20, gy - 16 - this.z, 16, { colors: ['#ffe06a', '#ffffff', '#ff9a3a'], speedMin: 50, speedMax: 150, size: 2, g: 200, lifeMax: 0.6 });
    G.FX.burst(this.x - 10, gy - 36, 6, { kind: 'sprite', sprite: 'star', speedMin: 20, speedMax: 50, g: -20, lifeMin: 0.6, lifeMax: 1 });
    if (this.hearts > 0) G.FX.text(G.Humor.pick(G.Humor.gomCrash), this.x + 10, gy - 78, { color: '#ffffff', life: 1.1, delay: 0.1 });
    run.onCrash(cause);
    return true;
  }

  spriteName() {
    if (this.airborne) return this.vz > 60 ? 'gom_jump' : this.vz < -60 ? 'gom_nose' : 'gom_wheelie';
    if (this.turboOn) return 'gom_wheelie';
    return 'gom_ride';
  }

  drawSprite(ctx, name, sx, gy, z, alphaTint) {
    const rot = name !== 'gom_ride';
    const x = Math.round(sx - 31 - (rot ? 10 : 0));
    const y = Math.round(gy - 57 - (rot ? 10 : 0) - z);
    const frame = name === 'gom_ride' ? Math.floor(this.dist / 7) % 3 : 0;
    if (alphaTint) {
      const src = G.A.tinted(name, alphaTint.color);
      const inf = G.A.info[name];
      ctx.globalAlpha = alphaTint.a;
      ctx.drawImage(src, frame * inf.fw, 0, inf.fw, inf.fh, x, y, inf.fw, inf.fh);
      ctx.globalAlpha = 1;
    } else {
      G.A.drawAt(ctx, name, frame, x, y);
    }
  }

  draw(ctx, sx, run) {
    const gy = G.L.roadTop + this.y + 3;
    // sombra (se encoge al saltar)
    const sw = Math.max(20, 54 - this.z * 0.7);
    G.E.shadow(ctx, sx + 2, this.y + 1, sw, 0.38 - Math.min(0.2, this.z * 0.005));
    // estela fantasma en turbo
    for (const g of this.ghosts) {
      const gx = g.x - run.camX;
      this.drawSprite(ctx, g.spr, gx, G.L.roadTop + g.y + 3, g.z, { color: this.trail.colors[0], a: 0.35 * (1 - g.t / 0.22) });
    }
    if (this.inv > 0 && this.stun <= 0 && Math.floor(this.inv * 14) % 2 === 0) return;
    const name = this.spriteName();
    const bob = !this.airborne && this.speed > 60 && Math.floor(G.t * 16) % 2 ? 1 : 0;
    this.drawSprite(ctx, name, sx, gy - bob, this.z);
    if (this.hit > 0) this.drawSprite(ctx, name, sx, gy - bob, this.z, { color: '#ffffff', a: 0.85 });
    // escudo
    if (this.shield > 0) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.t * 8);
      ctx.strokeStyle = '#ffd21f';
      ctx.beginPath();
      ctx.ellipse(Math.round(sx), Math.round(gy - 28 - this.z), 36, 32, 0, 0, G.TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // aturdido: estrellitas
    if (this.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = G.t * 8 + i * 2.1;
        G.A.draw(ctx, 'star', 0, sx + 14 + Math.cos(a) * 9, gy - 60 - this.z + Math.sin(a) * 3);
      }
    }
    // indicador de cañon activo
    if (this.cannon > 0) {
      G.Font.draw(ctx, 'CAÑÓN', sx - 18, gy - 66 - this.z, { color: '#ffb020', outline: '#1a0f24', align: 'center' });
    }
  }

  lights(run, out, sx) {
    const gy = G.L.roadTop + this.y;
    // faro delantero: cono en la calzada
    const hx = sx + 30, hy = gy - 26 - this.z;
    out.push({ x: hx, y: hy, r: 9, color: '#fff6d0', a: 0.9, kind: 'glow' });
    out.push({ x: sx + 88, y: gy - 2, rx: 70, ry: 16, a: 1, kind: 'hole' });
    out.push({ x: sx, y: gy - 24, rx: 40, ry: 34, a: 0.55, kind: 'hole' });
    out.push({ kind: 'beam', x: hx, y: hy, len: 130, spread: 16, a: 0.16 });
    out.push({ x: sx - 30, y: gy - 20 - this.z, r: 4, color: '#ff4040', a: 0.9, kind: 'glow' });
  }
};
