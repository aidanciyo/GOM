/* GOM Pizza Delivery - nucleo: espacio de nombres, utilidades, RNG y disposicion */
'use strict';

const G = window.G = {
  VERSION: '1.0.0',
  W: 540, H: 270,          // resolucion logica (se recalcula al redimensionar)
  K: 4,                    // pixeles fisicos por pixel logico
  RS: 4,                   // escala de render del canvas (K = alta calidad, 1 = baja)
  t: 0,                    // tiempo global (s)
  frame: 0,
  debug: false,
};

// ---------------------------------------------------------------- matematicas
G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.invLerp = (a, b, v) => (v - a) / (b - a);
G.smooth = (t) => t * t * (3 - 2 * t);
G.approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
G.damp = (v, target, rate, dt) => G.lerp(v, target, 1 - Math.exp(-rate * dt));
G.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
G.TAU = Math.PI * 2;

G.ease = {
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ---------------------------------------------------------------- aleatorio
// mulberry32: rapido y con semilla (cada partida usa una semilla nueva)
G.RNG = class {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  weighted(items) { // [{w, ...}] -> item
    let total = 0;
    for (const it of items) total += it.w;
    let r = this.next() * total;
    for (const it of items) { if ((r -= it.w) <= 0) return it; }
    return items[items.length - 1];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};
G.rand = new G.RNG((Date.now() ^ (Math.random() * 1e9)) >>> 0);
// parametros de depuracion: ?bot=1&biome=neon&seed=123&god=1
G.params = (() => { try { return new URLSearchParams(window.location.search); } catch (e) { return new Map(); } })();
G.newSeed = () => ((Date.now() * 1664525 + Math.floor(Math.random() * 4294967296)) >>> 0) || 7;

// ---------------------------------------------------------------- colores
G.hex = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
G.rgbStr = (c, a) => (a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
G.mix = (c1, c2, t) => [G.lerp(c1[0], c2[0], t), G.lerp(c1[1], c2[1], t), G.lerp(c1[2], c2[2], t)];
G.mixHex = (h1, h2, t) => G.rgbStr(G.mix(G.hex(h1), G.hex(h2), t));
G.shadeHex = (h, k) => { const c = G.hex(h); return G.rgbStr([c[0] * k, c[1] * k, c[2] * k].map((v) => G.clamp(v, 0, 255))); };

// ---------------------------------------------------------------- lienzos
G.makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  c.ctx = x;
  return c;
};

// ---------------------------------------------------------------- disposicion
// Todas las Y del mundo son relativas a la parte superior de la calzada (ry).
// Calzada: 4 carriles de 22 px (0..88). Acera norte: -26..-4. Acera sur: 92..114.
G.ROAD_H = 88;
G.LANE_H = 22;
G.LANES = [11, 33, 55, 77];
G.PLAYER_MIN_Y = 5;
G.PLAYER_MAX_Y = 83;
G.SIDEWALK_TOP_Y = -10;   // pies de los clientes de la acera norte
G.SIDEWALK_BOT_Y = 107;   // pies de los clientes de la acera sur
G.L = {};
G.layout = () => {
  const L = G.L;
  L.roadBot = G.H - 26;
  L.roadTop = L.roadBot - G.ROAD_H;
  L.walkTop0 = L.roadTop - 26;       // fondo de la acera norte (base de las fachadas)
  L.curbTop = L.roadTop - 4;
  L.walkBot0 = L.roadBot + 4;
  L.facadeBase = L.walkTop0 + 1;
  L.horizon = L.walkTop0 - 6;
  L.playerX = Math.round(G.W * 0.27);
};
G.layout();

// ---------------------------------------------------------------- utilidades varias
G.fmtInt = (n) => {
  n = Math.floor(n);
  const s = String(Math.abs(n));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i && (s.length - i) % 3 === 0) out += '.';
    out += s[i];
  }
  return (n < 0 ? '-' : '') + out;
};
G.fmtTime = (t) => {
  t = Math.max(0, t);
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
};
G.todayKey = () => {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
};
G.vibrate = (ms) => {
  try {
    if (G.Save && G.Save.data && !G.Save.data.settings.vibration) return;
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* sin vibracion */ }
};
