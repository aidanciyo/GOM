/* Audio: efectos sintetizados + secuenciador chiptune (WebAudio, sin ficheros) */
'use strict';

G.Audio = (() => {
  let ac = null, master = null, musicBus = null, sfxBus = null, comp = null;
  let noiseBuf = null, pulse25 = null, pulse12 = null;
  let musicVol = 0.6, sfxVol = 0.8;
  let enabled = true;

  function init() {
    if (ac) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { enabled = false; return false; }
      ac = new AC();
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4;
      comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ac.createGain(); master.gain.value = 0.9;
      musicBus = ac.createGain(); musicBus.gain.value = musicVol;
      sfxBus = ac.createGain(); sfxBus.gain.value = sfxVol;
      musicBus.connect(comp); sfxBus.connect(comp); comp.connect(master); master.connect(ac.destination);
      // ruido blanco reutilizable
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      pulse25 = makePulse(0.25);
      pulse12 = makePulse(0.125);
      return true;
    } catch (e) {
      enabled = false;
      return false;
    }
  }

  function makePulse(duty) {
    const n = 48;
    const re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
    return ac.createPeriodicWave(re, im);
  }

  function unlock() {
    if (!enabled) return;
    if (!ac) init();
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  function setVolumes(m, s) {
    musicVol = m; sfxVol = s;
    if (musicBus) musicBus.gain.setTargetAtTime(m, ac.currentTime, 0.05);
    if (sfxBus) sfxBus.gain.setTargetAtTime(s, ac.currentTime, 0.05);
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ------------------------------------------------------------ voces basicas
  function osc(o) {
    if (!ac) return;
    const t = o.when || ac.currentTime;
    const n = ac.createOscillator();
    if (o.type === 'p25') n.setPeriodicWave(pulse25);
    else if (o.type === 'p12') n.setPeriodicWave(pulse12);
    else n.type = o.type || 'square';
    n.frequency.setValueAtTime(o.f0, t);
    if (o.f1) {
      if (o.exp === false) n.frequency.linearRampToValueAtTime(o.f1, t + o.dur);
      else n.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    }
    if (o.vib) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = o.vib; lg.gain.value = o.vibDepth || 6;
      l.connect(lg); lg.connect(n.frequency); l.start(t); l.stop(t + o.dur + 0.05);
    }
    const g = ac.createGain();
    const a = o.attack || 0.004, v = o.vol || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    if (o.sustain) {
      g.gain.setValueAtTime(v, t + o.dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + o.dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    }
    let last = g;
    if (o.lp) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp;
      g.connect(f); last = f;
    }
    n.connect(g);
    last.connect(o.bus || sfxBus);
    n.start(t); n.stop(t + o.dur + 0.02);
  }

  function noise(o) {
    if (!ac) return;
    const t = o.when || ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.f0 || 1000, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ac.createGain();
    const v = o.vol || 0.2, a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
  }

  // ------------------------------------------------------------ efectos
  const last = {};
  let muted = false;
  function sfx(name, p) {
    if (!ac || !enabled || muted || ac.state !== 'running') return;
    const now = ac.currentTime;
    // evita saturar con el mismo efecto
    if (last[name] && now - last[name] < 0.03) return;
    last[name] = now;
    p = p || 0;
    switch (name) {
      case 'throw':
        noise({ f0: 700, f1: 3200, dur: 0.18, vol: 0.34, q: 1.4 });
        osc({ type: 'p25', f0: 380, f1: 760, dur: 0.1, vol: 0.09 });
        break;
      case 'perfect': {
        const base = 72 + Math.min(p, 6);
        [0, 4, 7, 12, 16].forEach((st, i) => osc({ type: 'p25', f0: mtof(base + st), dur: 0.12, vol: 0.15, when: now + i * 0.045 }));
        osc({ type: 'triangle', f0: mtof(base + 24), dur: 0.35, vol: 0.12, when: now + 0.22 });
        break;
      }
      case 'good':
        osc({ type: 'p25', f0: mtof(79), dur: 0.08, vol: 0.13 });
        osc({ type: 'p25', f0: mtof(84), dur: 0.14, vol: 0.13, when: now + 0.07 });
        break;
      case 'miss':
        osc({ type: 'square', f0: 330, f1: 160, dur: 0.18, vol: 0.08 });
        osc({ type: 'square', f0: 250, f1: 110, dur: 0.24, vol: 0.07, when: now + 0.14 });
        break;
      case 'lost':
        osc({ type: 'triangle', f0: 420, f1: 180, dur: 0.35, vol: 0.12 });
        break;
      case 'crash':
        noise({ filter: 'lowpass', f0: 2200, f1: 180, dur: 0.45, vol: 0.5, q: 0.7 });
        osc({ type: 'sine', f0: 140, f1: 38, dur: 0.35, vol: 0.5 });
        osc({ type: 'square', f0: 90, f1: 50, dur: 0.2, vol: 0.12 });
        break;
      case 'smash':
        noise({ filter: 'bandpass', f0: 1800, f1: 400, dur: 0.2, vol: 0.3, q: 0.8 });
        osc({ type: 'square', f0: 220, f1: 90, dur: 0.12, vol: 0.08 });
        break;
      case 'coin':
        osc({ type: 'p25', f0: mtof(83 + (p % 3)), dur: 0.06, vol: 0.1 });
        osc({ type: 'p25', f0: mtof(88 + (p % 3)), dur: 0.16, vol: 0.1, when: now + 0.055 });
        break;
      case 'nearmiss':
        noise({ filter: 'highpass', f0: 1500, f1: 5000, dur: 0.16, vol: 0.14 });
        osc({ type: 'p12', f0: mtof(86), f1: mtof(93), dur: 0.1, vol: 0.05, exp: false });
        break;
      case 'turbo':
        osc({ type: 'sawtooth', f0: 160, f1: 900, dur: 0.55, vol: 0.12, lp: 2400 });
        noise({ filter: 'bandpass', f0: 500, f1: 4000, dur: 0.6, vol: 0.18, q: 0.6 });
        break;
      case 'jump':
        osc({ type: 'p25', f0: 260, f1: 820, dur: 0.16, vol: 0.09 });
        break;
      case 'land':
        noise({ filter: 'lowpass', f0: 600, f1: 120, dur: 0.14, vol: 0.3 });
        break;
      case 'powerup':
        [0, 4, 7, 11, 14, 19].forEach((st, i) => osc({ type: 'p12', f0: mtof(72 + st), dur: 0.07, vol: 0.07, when: now + i * 0.035 }));
        break;
      case 'heart':
        osc({ type: 'triangle', f0: mtof(76), dur: 0.12, vol: 0.14 });
        osc({ type: 'triangle', f0: mtof(83), dur: 0.25, vol: 0.14, when: now + 0.1 });
        break;
      case 'fever':
        [0, 4, 7, 12, 7, 12, 16, 19].forEach((st, i) => osc({ type: 'p25', f0: mtof(67 + st), dur: 0.09, vol: 0.08, when: now + i * 0.06 }));
        break;
      case 'tick':
        osc({ type: 'square', f0: 1760, dur: 0.025, vol: 0.05 });
        break;
      case 'beep':
        osc({ type: 'p25', f0: 660, dur: 0.14, vol: 0.1 });
        break;
      case 'go':
        osc({ type: 'p25', f0: 990, dur: 0.35, vol: 0.12, sustain: true });
        osc({ type: 'p25', f0: 1320, dur: 0.35, vol: 0.06, sustain: true });
        break;
      case 'select':
        osc({ type: 'p25', f0: mtof(79), dur: 0.05, vol: 0.07 });
        osc({ type: 'p25', f0: mtof(86), dur: 0.07, vol: 0.07, when: now + 0.04 });
        break;
      case 'back':
        osc({ type: 'p25', f0: mtof(74), dur: 0.05, vol: 0.06 });
        osc({ type: 'p25', f0: mtof(67), dur: 0.08, vol: 0.06, when: now + 0.04 });
        break;
      case 'buy':
        [0, 7, 12, 16, 19, 24].forEach((st, i) => osc({ type: 'p25', f0: mtof(76 + st), dur: 0.06, vol: 0.07, when: now + i * 0.04 }));
        break;
      case 'error':
        osc({ type: 'square', f0: 140, dur: 0.12, vol: 0.08 });
        osc({ type: 'square', f0: 120, dur: 0.16, vol: 0.08, when: now + 0.1 });
        break;
      case 'horn':
        osc({ type: 'square', f0: 392, dur: 0.16, vol: 0.06, lp: 1600 });
        osc({ type: 'square', f0: 330, dur: 0.22, vol: 0.06, lp: 1600, when: now + 0.18 });
        break;
      case 'honk':
        osc({ type: 'sawtooth', f0: 310, dur: 0.28, vol: 0.06, lp: 1400, sustain: true });
        osc({ type: 'sawtooth', f0: 370, dur: 0.28, vol: 0.05, lp: 1400, sustain: true });
        break;
      case 'gull':
        osc({ type: 'p25', f0: 1500, f1: 900, dur: 0.12, vol: 0.05 });
        osc({ type: 'p25', f0: 1700, f1: 1000, dur: 0.14, vol: 0.05, when: now + 0.14 });
        break;
      case 'thunder':
        noise({ filter: 'lowpass', f0: 900, f1: 60, dur: 2.2, vol: 0.45, attack: 0.02 });
        osc({ type: 'sine', f0: 60, f1: 30, dur: 1.2, vol: 0.25 });
        break;
      case 'wave':
        noise({ filter: 'lowpass', f0: 300, f1: 1800, dur: 1.1, vol: 0.2, attack: 0.5 });
        break;
      case 'steam':
        noise({ filter: 'highpass', f0: 2500, f1: 1200, dur: 0.7, vol: 0.12, attack: 0.05 });
        break;
      case 'splash':
        noise({ filter: 'bandpass', f0: 1200, f1: 500, dur: 0.3, vol: 0.2, q: 0.8 });
        break;
      case 'stolen':
        osc({ type: 'sawtooth', f0: 300, f1: 140, dur: 0.3, vol: 0.08, lp: 1200 });
        noise({ f0: 900, f1: 300, dur: 0.25, vol: 0.12 });
        break;
      case 'checkpoint':
        [0, 4, 7, 12].forEach((st, i) => osc({ type: 'p25', f0: mtof(72 + st), dur: 0.12, vol: 0.08, when: now + i * 0.09 }));
        osc({ type: 'triangle', f0: mtof(84), dur: 0.5, vol: 0.1, when: now + 0.36, sustain: true });
        break;
      case 'reload':
        for (let i = 0; i < 5; i++) osc({ type: 'p12', f0: mtof(76 + i * 2), dur: 0.05, vol: 0.05, when: now + i * 0.06 });
        break;
      case 'overtake':
        osc({ type: 'p25', f0: mtof(81), f1: mtof(88), dur: 0.12, vol: 0.06, exp: false });
        break;
      case 'gameover':
        [67, 64, 60, 55].forEach((m, i) => osc({ type: 'p25', f0: mtof(m), dur: 0.26, vol: 0.09, when: now + i * 0.22 }));
        osc({ type: 'triangle', f0: mtof(43), dur: 0.9, vol: 0.14, when: now + 0.88 });
        break;
      case 'record':
        [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => osc({ type: 'p25', f0: mtof(m), dur: 0.12, vol: 0.08, when: now + i * 0.07 }));
        osc({ type: 'p25', f0: mtof(84), dur: 0.7, vol: 0.08, when: now + 0.5, sustain: true, vib: 6 });
        break;
      case 'slide':
        noise({ filter: 'bandpass', f0: 2600, f1: 1500, dur: 0.35, vol: 0.12, q: 2 });
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------ motor de la moto
  let engine = null;
  function engineStart() {
    if (!ac || engine) return;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2;
    const g = ac.createGain(); g.gain.value = 0.0001;
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 22; lg.gain.value = 5;
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
    o1.start(); o2.start(); lfo.start();
    engine = { o1, o2, f, g, lfo };
  }
  function engineSet(speed01, on) {
    if (!engine) return;
    const t = ac.currentTime;
    const f = 48 + speed01 * 70;
    engine.o1.frequency.setTargetAtTime(f, t, 0.08);
    engine.o2.frequency.setTargetAtTime(f * 2.01, t, 0.08);
    engine.f.frequency.setTargetAtTime(380 + speed01 * 900, t, 0.1);
    engine.lfo.frequency.setTargetAtTime(16 + speed01 * 22, t, 0.1);
    engine.g.gain.setTargetAtTime(on ? 0.028 + speed01 * 0.022 : 0.0001, t, 0.08);
  }
  function engineStop() {
    if (!engine) return;
    const e = engine; engine = null;
    const t = ac.currentTime;
    e.g.gain.setTargetAtTime(0.0001, t, 0.05);
    setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.lfo.stop(); } catch (err) { /* ya parado */ } }, 300);
  }

  // ------------------------------------------------------------ musica
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  function parseMel(str) {
    // "E5:2 G5:2 r:4 ..." -> array de 16 pasos por compas: {m, len} o null
    const steps = [];
    str.trim().split(/\s+/).forEach((tok) => {
      if (tok === '|') return;
      const [n, l] = tok.split(':');
      const len = parseInt(l || '1', 10);
      if (n === 'r') { for (let i = 0; i < len; i++) steps.push(null); return; }
      const mm = n.match(/^([A-G][#b]?)(\d)$/);
      const midi = 12 * (parseInt(mm[2], 10) + 1) + NOTE[mm[1]];
      steps.push({ m: midi, len });
      for (let i = 1; i < len; i++) steps.push(undefined); // continuacion
    });
    return steps;
  }

  const SONGS = {
    title: {
      bpm: 112, swing: 0,
      chords: [[53, 'M'], [55, 'M'], [52, 'm'], [57, 'm'], [53, 'M'], [55, 'M'], [48, 'M'], [48, 'M']],
      lead: 'A5:4 C6:4 F6:4 E6:2 C6:2 D6:4 B5:4 G5:6 A5:2 B5:4 G5:2 E5:2 G5:4 B5:4 C6:6 B5:2 A5:8 ' +
            'A5:2 C6:2 F6:4 G6:2 F6:2 E6:4 D6:2 E6:2 D6:2 B5:2 G5:8 E6:4 G6:4 C7:4 B6:2 G6:2 C7:8 r:8',
      bass: [0, null, null, null, 7, null, null, null, 12, null, null, null, 7, null, null, null],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      leadType: 'p25', leadVol: 0.05, arpVol: 0.018, bassVol: 0.08,
    },
    sunset: {
      bpm: 126,
      chords: [[48, 'M'], [55, 'M'], [57, 'm'], [53, 'M'], [48, 'M'], [55, 'M'], [53, 'M'], [55, 'M']],
      lead: 'E5:2 G5:2 C6:3 B5:1 A5:2 G5:2 E5:4 D5:2 G5:2 B5:3 A5:1 G5:2 D5:2 B4:4 ' +
            'C5:2 E5:2 A5:3 G5:1 E5:2 C5:2 A4:2 B4:2 C5:2 F5:2 A5:4 G5:2 F5:2 E5:2 D5:2 ' +
            'E5:2 G5:2 C6:3 D6:1 E6:2 D6:2 C6:4 B5:2 A5:2 G5:3 A5:1 B5:2 D6:2 G5:4 ' +
            'A5:2 C6:2 F6:3 E6:1 D6:2 C6:2 A5:4 G5:2 A5:1 B5:1 C6:4 r:2 G5:2 C6:4',
      bass: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, null, 7, null],
      arp: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 1],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      leadType: 'p25', leadVol: 0.055, arpVol: 0.02, bassVol: 0.09,
    },
    neon: {
      bpm: 138,
      chords: [[45, 'm'], [53, 'M'], [48, 'M'], [55, 'M'], [45, 'm'], [53, 'M'], [55, 'M'], [52, 'M']],
      lead: 'A5:4 C6:2 E6:4 D6:2 C6:2 B5:2 A5:6 G5:2 F5:4 E5:4 G5:4 C6:2 E6:4 G6:2 E6:2 C6:2 D6:6 B5:2 G5:8 ' +
            'A5:2 A5:2 C6:2 E6:2 A6:4 G6:2 E6:2 F6:4 E6:2 C6:2 A5:4 C6:4 D6:4 B5:2 G5:2 D6:2 E6:2 D6:4 B5:4 G#5:4 E5:4 B4:4',
      bass: [0, null, 0, null, 0, null, 0, 12, 0, null, 0, null, 0, null, 12, 0],
      arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 3, 1],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      leadType: 'p12', leadVol: 0.05, arpVol: 0.022, bassVol: 0.1, leadVib: 5,
    },
    storm: {
      bpm: 150,
      chords: [[50, 'm'], [46, 'M'], [48, 'M'], [45, 'M'], [50, 'm'], [46, 'M'], [43, 'm'], [45, 'M']],
      lead: 'D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 A5:2 A#5:4 A5:2 G5:2 F5:4 D5:4 E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 G5:2 E5:2 C#6:4 E6:4 A5:8 ' +
            'D6:2 D6:1 D6:1 F6:2 E6:2 D6:2 C6:2 A5:4 D6:2 F6:2 A#6:4 A6:2 F6:2 D6:4 G5:2 A#5:2 D6:2 G6:2 F6:2 D6:2 A#5:4 A5:2 C#6:2 E6:2 A6:6 r:4',
      bass: [0, null, 0, 0, 0, null, 0, 0, 0, null, 0, 0, 7, null, 7, 12],
      arp: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 3, 2, 1, 0],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      leadType: 'square', leadVol: 0.04, arpVol: 0.02, bassVol: 0.1,
    },
  };
  Object.values(SONGS).forEach((s) => { s.mel = parseMel(s.lead); });

  const seq = { song: null, name: null, step: 0, next: 0, timer: null, intensity: 1, pending: null, fade: 1 };

  function chordTones(root, q) {
    const third = q === 'm' ? 3 : 4;
    return [root, root + third, root + 7, root + 12, root + 12 + third];
  }

  function scheduleStep(song, step, t) {
    const bar = Math.floor(step / 16) % song.chords.length;
    const s = step % 16;
    const [root, q] = song.chords[bar];
    const spb = 60 / song.bpm / 4;
    const I = seq.intensity;
    // bajo
    const b = song.bass[s];
    if (b !== null && b !== undefined) {
      osc({ type: 'triangle', f0: mtof(root - 12 + b), dur: spb * 1.8, vol: song.bassVol, when: t, bus: musicBus, sustain: true });
    }
    // arpegio
    if (I >= 1 || s % 2 === 0) {
      const tones = chordTones(root + 24, q);
      const note = tones[song.arp[s] % tones.length];
      osc({ type: 'p12', f0: mtof(note + (I >= 2 ? 12 : 0)), dur: spb * 0.9, vol: song.arpVol * (I >= 1 ? 1 : 0.7), when: t, bus: musicBus });
    }
    // melodia
    if (I >= 1) {
      const idx = step % song.mel.length;
      const n = song.mel[idx];
      if (n) {
        osc({ type: song.leadType, f0: mtof(n.m), dur: spb * n.len * 0.95, vol: song.leadVol, when: t, bus: musicBus,
          sustain: true, vib: n.len >= 4 ? (song.leadVib || 5.5) : 0, vibDepth: 4, attack: 0.01 });
        if (I >= 2) osc({ type: 'p12', f0: mtof(n.m + 12), dur: spb * n.len * 0.8, vol: song.leadVol * 0.35, when: t + 0.01, bus: musicBus, sustain: true });
      }
    }
    // bateria
    if (I >= 1) {
      if (song.kick[s]) {
        osc({ type: 'sine', f0: 150, f1: 42, dur: 0.14, vol: 0.28, when: t, bus: musicBus });
      }
      if (song.snare[s]) {
        noise({ filter: 'bandpass', f0: 1900, dur: 0.13, vol: 0.16, q: 0.7, when: t, bus: musicBus });
        osc({ type: 'triangle', f0: 190, f1: 120, dur: 0.08, vol: 0.08, when: t, bus: musicBus });
      }
      if (song.hat[s] || (I >= 2 && s % 2 === 1)) {
        noise({ filter: 'highpass', f0: 7500, dur: s === 14 && song.hat[15] ? 0.09 : 0.035, vol: 0.05, when: t, bus: musicBus });
      }
    } else if (song.kick[s] && s === 0) {
      osc({ type: 'sine', f0: 110, f1: 40, dur: 0.12, vol: 0.15, when: t, bus: musicBus });
    }
  }

  function tick() {
    if (!ac || !seq.song) return;
    const spb = 60 / seq.song.bpm / 4;
    while (seq.next < ac.currentTime + 0.14) {
      // cambio de tema al empezar compas
      if (seq.pending && seq.step % 16 === 0) {
        seq.song = SONGS[seq.pending];
        seq.name = seq.pending;
        seq.pending = null;
        seq.step = 0;
      }
      scheduleStep(seq.song, seq.step, seq.next);
      seq.next += 60 / seq.song.bpm / 4;
      seq.step++;
    }
    void spb;
  }

  function music(name, immediate) {
    if (!ac) return;
    if (!name) { stopMusic(); return; }
    if (seq.name === name && seq.timer) return;
    if (!seq.timer || immediate) {
      seq.song = SONGS[name]; seq.name = name; seq.step = 0; seq.pending = null;
      seq.next = ac.currentTime + 0.06;
      if (!seq.timer) seq.timer = setInterval(tick, 25);
    } else {
      seq.pending = name;
    }
  }
  function stopMusic() {
    if (seq.timer) clearInterval(seq.timer);
    seq.timer = null; seq.song = null; seq.name = null;
  }
  function setIntensity(i) { seq.intensity = i; }

  return {
    init, unlock, suspend, resume, sfx, music, stopMusic, setIntensity, setVolumes,
    mute(v) { muted = v; },
    engineStart, engineSet, engineStop,
    get ready() { return !!ac && ac.state === 'running'; },
    get ctx() { return ac; },
    get out() { return master; },
    get current() { return seq.name; },
  };
})();
