/* Entrada: teclado + tactil (joystick flotante y botones) + toques de interfaz */
'use strict';

G.Input = (() => {
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'throw', KeyJ: 'throw', KeyZ: 'throw',
    ShiftLeft: 'turbo', ShiftRight: 'turbo', KeyK: 'turbo', KeyX: 'turbo',
    KeyL: 'jump', KeyC: 'jump', KeyV: 'cannon',
    KeyP: 'pause', Escape: 'pause',
    Enter: 'confirm', NumpadEnter: 'confirm',
    Backspace: 'back',
    KeyM: 'mute', F3: 'debug',
  };
  const held = {};      // accion -> contador de fuentes pulsando
  const edge = {};      // accion -> pulsada desde el ultimo paso
  const keyDown = {};
  const taps = [];      // toques de interfaz {x, y}
  const pointers = new Map();
  let buttons = [];     // botones tactiles de juego [{id, x, y, r}]
  let canvas = null;
  let mode = 'ui';
  let touchMode = false;
  try {
    touchMode = (navigator.maxTouchPoints || 0) > 0 && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  } catch (e) { touchMode = false; }
  if (touchMode) document.body.classList.add('touch');
  let lastPointer = { x: -100, y: -100, t: 0 };
  const stick = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, ax: 0, ay: 0 };
  const STICK_R = 26;

  function press(a) { held[a] = (held[a] || 0) + 1; edge[a] = true; }
  function release(a) { held[a] = Math.max(0, (held[a] || 0) - 1); }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * G.W, y: (e.clientY - r.top) / r.height * G.H };
  }

  function onKeyDown(e) {
    const a = KEYMAP[e.code];
    if (G.Audio) G.Audio.unlock();
    if (!a) return;
    if (['up', 'down', 'left', 'right', 'throw'].includes(a) || e.code === 'Space') e.preventDefault();
    if (keyDown[e.code]) return;
    keyDown[e.code] = true;
    press(a);
    if (a === 'throw' || a === 'confirm') edge.anykey = true;
    edge.anykey = true;
  }
  function onKeyUp(e) {
    const a = KEYMAP[e.code];
    if (!a || !keyDown[e.code]) return;
    keyDown[e.code] = false;
    release(a);
  }

  function hitButton(p) {
    for (const b of buttons) {
      const dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy <= (b.r + 6) * (b.r + 6)) return b;
    }
    return null;
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (G.Audio) G.Audio.unlock();
    if (e.pointerType === 'touch') { touchMode = true; document.body.classList.add('touch'); }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    const p = toLogical(e);
    lastPointer = { x: p.x, y: p.y, t: G.t };
    const info = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, role: 'tap', action: null };
    if (mode === 'game') {
      const b = hitButton(p);
      if (b) {
        info.role = 'btn'; info.action = b.id;
        press(b.id);
      } else if (p.x < G.W * 0.46 && !stick.active) {
        info.role = 'stick';
        stick.active = true; stick.id = e.pointerId;
        stick.ox = p.x; stick.oy = p.y; stick.x = p.x; stick.y = p.y;
        stick.ax = 0; stick.ay = 0;
      } else if (p.x >= G.W * 0.46) {
        info.role = 'btn'; info.action = 'throw';
        press('throw');
      }
    }
    pointers.set(e.pointerId, info);
    taps.push({ x: p.x, y: p.y });
    edge.anykey = true;
  }

  function onPointerMove(e) {
    const info = pointers.get(e.pointerId);
    const p = toLogical(e);
    lastPointer.x = p.x; lastPointer.y = p.y;
    if (!info) return;
    info.x = p.x; info.y = p.y;
    if (info.role === 'stick' && stick.id === e.pointerId) {
      let dx = p.x - stick.ox, dy = p.y - stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > STICK_R) {
        // el origen sigue al dedo para no quedarse "atascado"
        const k = (d - STICK_R) / d;
        stick.ox += dx * k; stick.oy += dy * k;
        dx = p.x - stick.ox; dy = p.y - stick.oy;
      }
      stick.x = p.x; stick.y = p.y;
      stick.ax = dx / STICK_R; stick.ay = dy / STICK_R;
    }
  }

  function onPointerUp(e) {
    const info = pointers.get(e.pointerId);
    if (!info) return;
    if (info.role === 'btn' && info.action) release(info.action);
    if (info.role === 'stick' && stick.id === e.pointerId) {
      stick.active = false; stick.id = -1; stick.ax = 0; stick.ay = 0;
    }
    pointers.delete(e.pointerId);
  }

  function releaseAll() {
    for (const k of Object.keys(held)) held[k] = 0;
    for (const k of Object.keys(keyDown)) keyDown[k] = false;
    pointers.clear();
    stick.active = false; stick.id = -1; stick.ax = 0; stick.ay = 0;
  }

  // respaldo para WebViews antiguos sin Pointer Events
  function touchAdapter(fn) {
    return (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        fn({ pointerId: t.identifier + 1000, clientX: t.clientX, clientY: t.clientY, pointerType: 'touch', preventDefault() {} });
      }
    };
  }

  function attach(c) {
    canvas = c;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    if (window.PointerEvent) {
      c.addEventListener('pointerdown', onPointerDown);
      c.addEventListener('pointermove', onPointerMove);
      c.addEventListener('pointerup', onPointerUp);
      c.addEventListener('pointercancel', onPointerUp);
    } else {
      c.addEventListener('touchstart', touchAdapter(onPointerDown), { passive: false });
      c.addEventListener('touchmove', touchAdapter(onPointerMove), { passive: false });
      c.addEventListener('touchend', touchAdapter(onPointerUp), { passive: false });
      c.addEventListener('touchcancel', touchAdapter(onPointerUp), { passive: false });
      c.addEventListener('mousedown', (e) => onPointerDown({ pointerId: 1, clientX: e.clientX, clientY: e.clientY, pointerType: 'mouse', preventDefault() {} }));
      window.addEventListener('mouseup', (e) => onPointerUp({ pointerId: 1, clientX: e.clientX, clientY: e.clientY }));
    }
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', releaseAll);
  }

  function dz(v, d) { return Math.abs(v) < d ? 0 : G.clamp((v - Math.sign(v) * d) / (1 - d), -1, 1); }

  return {
    attach, releaseAll,
    down: (a) => (held[a] || 0) > 0,
    hit: (a) => !!edge[a],
    eat: (a) => { edge[a] = false; },
    axisY() {
      let v = 0;
      if ((held.up || 0) > 0) v -= 1;
      if ((held.down || 0) > 0) v += 1;
      if (stick.active) v += dz(stick.ay, 0.22);
      return G.clamp(v, -1, 1);
    },
    axisX() {
      let v = 0;
      if ((held.left || 0) > 0) v -= 1;
      if ((held.right || 0) > 0) v += 1;
      if (stick.active) v += dz(stick.ax, 0.3);
      return G.clamp(v, -1, 1);
    },
    get taps() { return taps; },
    popTap() { return taps.shift(); },
    endStep() {
      for (const k of Object.keys(edge)) edge[k] = false;
      taps.length = 0;
    },
    setButtons(b) { buttons = b; },
    get buttons() { return buttons; },
    setMode(m) {
      if (m !== mode) { releaseAll(); }
      mode = m;
    },
    get mode() { return mode; },
    get stick() { return stick; },
    get touch() { return touchMode; },
    get pointer() { return lastPointer; },
    isPressed(id) {
      for (const p of pointers.values()) if (p.role === 'btn' && p.action === id) return true;
      return false;
    },
    press, release,
  };
})();
