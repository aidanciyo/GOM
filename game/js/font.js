/* Fuente pixel propia 5x7 (con tildes, Ñ, ¡ y ¿) y rotulos grandes con degradado */
'use strict';

G.Font = (() => {
  // 7 filas = glifo normal; 9 filas = con acento (2 filas por encima)
  const RAW = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'I': ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    'J': ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'Q': ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    'W': ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    'X': ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    'Z': ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    '1': ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    ',': ['..', '..', '..', '..', '..', '.#', '#.'],
    ':': ['.', '.', '#', '.', '.', '#', '.'],
    ';': ['..', '..', '.#', '..', '..', '.#', '#.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '¡': ['#', '.', '#', '#', '#', '#', '#'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '¿': ['..#..', '.....', '..#..', '.#...', '#....', '#...#', '.###.'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '×': ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
    '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
    '·': ['.', '.', '.', '#', '.', '.', '.'],
    '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
    '=': ['....', '....', '####', '....', '####', '....', '....'],
    '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '.#.#.', '#####', '.#.#.'],
    '€': ['..###', '.#...', '####.', '.#...', '####.', '.#...', '..###'],
    '_': ['....', '....', '....', '....', '....', '....', '####'],
    '↑': ['..#..', '.###.', '#.#.#', '..#..', '..#..', '..#..', '..#..'],
    '↓': ['..#..', '..#..', '..#..', '..#..', '#.#.#', '.###.', '..#..'],
    '←': ['.......', '..#....', '.#.....', '#######', '.#.....', '..#....', '.......'],
    '→': ['.......', '....#..', '.....#.', '#######', '.....#.', '....#..', '.......'],
    '♥': ['.....', '.#.#.', '#####', '#####', '.###.', '..#..', '.....'],
    '★': ['..#..', '..#..', '#####', '.###.', '.###.', '##.##', '#...#'],
    '✓': ['.....', '....#', '...##', '#.##.', '###..', '.#...', '.....'],
    '&': ['.##..', '#..#.', '.##..', '.#...', '#.#.#', '#..#.', '.##.#'],
    'Á': ['...#.', '..#..', '.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'É': ['...#.', '..#..', '#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    'Í': ['..#', '.#.', '###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    'Ó': ['...#.', '..#..', '.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'Ú': ['...#.', '..#..', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'Ü': ['.....', '.#.#.', '#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'Ñ': ['.##.#', '#.##.', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  };
  const LOWER = { 'á': 'Á', 'é': 'É', 'í': 'Í', 'ó': 'Ó', 'ú': 'Ú', 'ü': 'Ü', 'ñ': 'Ñ' };
  const CELL_H = 9;     // 2 filas de acento + 7
  const glyphs = {};
  let atlas = null;
  const colored = new Map();
  const fancyCache = new Map();

  function build() {
    let x = 0;
    const list = Object.keys(RAW);
    list.forEach((ch) => {
      const rows = RAW[ch].length === 7 ? ['', ''].concat(RAW[ch]) : RAW[ch];
      const w = Math.max(...rows.map((r) => r.length));
      glyphs[ch] = { x, w, rows };
      x += w + 1;
    });
    atlas = G.makeCanvas(x, CELL_H);
    const c = atlas.ctx;
    c.fillStyle = '#fff';
    list.forEach((ch) => {
      const g = glyphs[ch];
      g.rows.forEach((row, y) => {
        for (let i = 0; i < row.length; i++) if (row[i] === '#') c.fillRect(g.x + i, y, 1, 1);
      });
    });
  }

  function colorAtlas(color) {
    if (colored.has(color)) return colored.get(color);
    const c = G.makeCanvas(atlas.width, atlas.height);
    c.ctx.drawImage(atlas, 0, 0);
    c.ctx.globalCompositeOperation = 'source-in';
    c.ctx.fillStyle = color;
    c.ctx.fillRect(0, 0, c.width, c.height);
    colored.set(color, c);
    return c;
  }

  function norm(text) {
    let s = String(text);
    let out = '';
    for (const ch of s) {
      if (LOWER[ch]) out += LOWER[ch];
      else out += ch.toUpperCase();
    }
    return out;
  }

  function measure(text, scale, spacing) {
    scale = scale || 1;
    spacing = spacing === undefined ? 1 : spacing;
    const s = norm(text);
    let w = 0;
    for (const ch of s) {
      if (ch === ' ') { w += 3 + spacing; continue; }
      const g = glyphs[ch] || glyphs['?'];
      w += g.w + spacing;
    }
    return Math.max(0, (w - spacing)) * scale;
  }

  function rawDraw(ctx, s, x, y, color, scale, spacing) {
    const src = colorAtlas(color);
    let cx = x;
    for (const ch of s) {
      if (ch === ' ') { cx += (3 + spacing) * scale; continue; }
      const g = glyphs[ch] || glyphs['?'];
      ctx.drawImage(src, g.x, 0, g.w, CELL_H, cx, y - 2 * scale, g.w * scale, CELL_H * scale);
      cx += (g.w + spacing) * scale;
    }
  }

  // y = parte superior de las mayusculas
  function draw(ctx, text, x, y, opts) {
    opts = opts || {};
    const scale = opts.scale || 1;
    const spacing = opts.spacing === undefined ? 1 : opts.spacing;
    const s = norm(text);
    const w = measure(s, scale, spacing);
    let sx = x;
    if (opts.align === 'center') sx = x - w / 2;
    else if (opts.align === 'right') sx = x - w;
    sx = Math.round(sx); y = Math.round(y);
    const pa = ctx.globalAlpha;
    if (opts.alpha !== undefined) ctx.globalAlpha = pa * opts.alpha;
    if (opts.shadow) rawDraw(ctx, s, sx + scale, y + scale, opts.shadow, scale, spacing);
    if (opts.outline) {
      const o = opts.outline, k = scale;
      rawDraw(ctx, s, sx - k, y, o, scale, spacing);
      rawDraw(ctx, s, sx + k, y, o, scale, spacing);
      rawDraw(ctx, s, sx, y - k, o, scale, spacing);
      rawDraw(ctx, s, sx, y + k, o, scale, spacing);
      if (opts.thick) {
        rawDraw(ctx, s, sx - k, y - k, o, scale, spacing);
        rawDraw(ctx, s, sx + k, y - k, o, scale, spacing);
        rawDraw(ctx, s, sx - k, y + k, o, scale, spacing);
        rawDraw(ctx, s, sx + k, y + k, o, scale, spacing);
        rawDraw(ctx, s, sx, y + 2 * k, o, scale, spacing);
      }
    }
    rawDraw(ctx, s, sx, y, opts.color || '#fff', scale, spacing);
    ctx.globalAlpha = pa;
    return w;
  }

  // Rotulo grande: degradado vertical + contorno grueso + sombra. Cacheado.
  function fancy(text, opts) {
    opts = opts || {};
    const scale = opts.scale || 3;
    const top = opts.top || '#fff6b0';
    const bottom = opts.bottom || '#f59a00';
    const outline = opts.outline || '#1a0f24';
    const shadow = opts.shadow === undefined ? '#1a0f24' : opts.shadow;
    const key = [text, scale, top, bottom, outline, shadow, opts.shine ? 1 : 0].join('|');
    if (fancyCache.has(key)) return fancyCache.get(key);
    const s = norm(text);
    const w = measure(s, scale, 1);
    const pad = scale * 3;
    const c = G.makeCanvas(w + pad * 2, CELL_H * scale + pad * 2);
    const x = c.ctx;
    const oy = pad + 2 * scale;
    // cuerpo con degradado
    const body = G.makeCanvas(c.width, c.height);
    rawDraw(body.ctx, s, pad, oy, '#fff', scale, 1);
    body.ctx.globalCompositeOperation = 'source-in';
    const gr = body.ctx.createLinearGradient(0, oy, 0, oy + 7 * scale);
    gr.addColorStop(0, top);
    gr.addColorStop(0.55, G.mixHex(top, bottom, 0.5));
    gr.addColorStop(1, bottom);
    body.ctx.fillStyle = gr;
    body.ctx.fillRect(0, 0, c.width, c.height);
    if (opts.shine) {
      body.ctx.globalCompositeOperation = 'source-atop';
      body.ctx.fillStyle = 'rgba(255,255,255,0.55)';
      body.ctx.fillRect(0, oy, c.width, scale);
    }
    // contorno y sombra
    const k = Math.max(1, Math.round(scale / 2));
    if (shadow) {
      for (let dx = -k; dx <= k; dx += k) for (let dy = -k; dy <= k; dy += k) rawDraw(x, s, pad + dx + k, oy + dy + k * 2, shadow, scale, 1);
    }
    for (let dx = -k; dx <= k; dx += k) for (let dy = -k; dy <= k; dy += k) rawDraw(x, s, pad + dx, oy + dy, outline, scale, 1);
    x.drawImage(body, 0, 0);
    c.padX = pad; c.padY = pad;
    if (fancyCache.size > 200) fancyCache.clear();
    fancyCache.set(key, c);
    return c;
  }

  // dibuja rotulo grande centrado en (cx, cy) con escala/rotacion extra opcional
  function drawFancy(ctx, text, cx, cy, opts, pop) {
    const c = fancy(text, opts);
    const s = pop || 1;
    const w = c.width * s, h = c.height * s;
    ctx.drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
    return c;
  }

  build();
  return { draw, measure, fancy, drawFancy, norm, CELL_H };
})();
