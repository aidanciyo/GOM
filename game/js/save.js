/* Guardado local, economia (mejoras y estelas) y misiones diarias */
'use strict';

G.Save = (() => {
  const KEY = 'gom_pizza_delivery_v1';

  const UPGRADES = [
    { id: 'motor', name: 'MOTOR', icon: 'bolt', max: 5, costs: [120, 250, 450, 700, 1000],
      desc: '+6% VELOCIDAD PUNTA · +0,3 S DE TURBO' },
    { id: 'manejo', name: 'MANEJO', icon: 'gom_front', max: 5, costs: [100, 220, 400, 650, 950],
      desc: '+12% GIRO LATERAL · MENOS DERRAPE' },
    { id: 'chasis', name: 'CHASIS', icon: 'heart', max: 3, costs: [150, 400, 900],
      desc: 'MENOS FRENAZO AL CHOCAR · NV3: CORAZÓN EXTRA' },
    { id: 'salto', name: 'SALTO', icon: 'ramp', max: 3, costs: [500, 800, 1200],
      desc: 'BOTÓN SALTO · MENOS ESPERA POR NIVEL' },
    { id: 'canon', name: 'CAÑÓN DE PIZZAS', icon: 'box_logo', max: 3, costs: [600, 1000, 1500],
      desc: '1 CARGA POR PARTIDA · ENTREGAS AUTOMÁTICAS' },
    { id: 'iman', name: 'IMÁN', icon: 'magnet', max: 3, costs: [200, 450, 800],
      desc: '+2 S DE IMÁN DE MONEDAS POR NIVEL' },
  ];

  const TRAILS = [
    { id: 'humo', name: 'HUMO', cost: 0, colors: ['#e8e0f0', '#b8aec8', '#8a8098'] },
    { id: 'queso', name: 'QUESO', cost: 300, colors: ['#fff3a0', '#ffd23f', '#f5a800'] },
    { id: 'fuego', name: 'FUEGO', cost: 600, colors: ['#fff09a', '#ff9a1f', '#e8361f'] },
    { id: 'neon', name: 'NEÓN', cost: 900, colors: ['#ff5ce1', '#9b5cff', '#4ff3ff'] },
    { id: 'arcoiris', name: 'ARCOÍRIS', cost: 1500, colors: ['#ff4a4a', '#ffb13b', '#ffe94a', '#4ade6a', '#4aa8ff', '#a45cff'] },
    { id: 'estrellas', name: 'ESTRELLAS', cost: 2000, colors: ['#ffffff', '#fff6b0', '#ffd21f'], star: true },
  ];

  const MISSIONS = [
    { id: 'deliver', text: 'ENTREGA {n} PIZZAS', stat: 'deliveries', n: [12, 25, 45], r: [80, 140, 220] },
    { id: 'perfect', text: 'HAZ {n} ENTREGAS PERFECTAS', stat: 'perfects', n: [5, 12, 22], r: [90, 150, 240] },
    { id: 'dist', text: 'RECORRE {n} M', stat: 'distance', n: [1500, 3500, 6000], r: [70, 130, 200] },
    { id: 'near', text: 'HAZ {n} CASI-CHOQUES', stat: 'nearMisses', n: [6, 14, 25], r: [80, 140, 210] },
    { id: 'combo', text: 'LOGRA UN COMBO ×{n}', stat: 'bestCombo', n: [6, 10, 16], r: [90, 160, 250], max: true },
    { id: 'coins', text: 'RECOGE {n} MONEDAS', stat: 'coins', n: [40, 90, 160], r: [70, 120, 190] },
    { id: 'air', text: 'HAZ {n} ENTREGAS AÉREAS', stat: 'airDeliveries', n: [1, 3, 6], r: [90, 150, 230] },
    { id: 'routes', text: 'COMPLETA {n} RUTAS', stat: 'routes', n: [2, 5, 9], r: [80, 150, 240] },
    { id: 'smash', text: 'ARROLLA {n} OBSTÁCULOS CON TURBO', stat: 'smashed', n: [4, 10, 18], r: [80, 140, 210] },
    { id: 'overtake', text: 'ADELANTA {n} FURGONETAS RIVALES', stat: 'overtakes', n: [1, 3, 6], r: [90, 150, 230] },
    { id: 'fever', text: 'ACTIVA LA PIZZA FEVER {n} VECES', stat: 'fevers', n: [1, 2, 4], r: [100, 170, 260] },
    { id: 'score', text: 'CONSIGUE {n} PUNTOS EN UNA PARTIDA', stat: 'score', n: [4000, 10000, 22000], r: [90, 160, 260], max: true },
  ];

  function defaults() {
    return {
      v: 1, coins: 0,
      upgrades: { motor: 0, manejo: 0, chasis: 0, salto: 0, canon: 0, iman: 0 },
      trails: ['humo'], trail: 'humo',
      best: { score: 0, dist: 0, deliveries: 0, combo: 0 },
      records: [],
      stats: { runs: 0, deliveries: 0, perfects: 0, distance: 0, coins: 0, routes: 0 },
      missions: { day: '', list: [] },
      settings: { music: 0.5, sfx: 0.9, vibration: true, quality: 'alta', hints: true },
      tutorial: 0,
    };
  }

  let data = defaults();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const def = defaults();
        data = Object.assign(def, d);
        data.upgrades = Object.assign(def.upgrades, d.upgrades || {});
        data.settings = Object.assign(def.settings, d.settings || {});
        data.stats = Object.assign(def.stats, d.stats || {});
        data.best = Object.assign(def.best, d.best || {});
      }
    } catch (e) { data = defaults(); }
    refreshMissions();
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* almacenamiento no disponible */ }
  }

  function reset() { data = defaults(); refreshMissions(); save(); }

  // ------------------------------------------------------------ mejoras
  const up = (id) => UPGRADES.find((u) => u.id === id);
  const level = (id) => data.upgrades[id] || 0;
  function cost(id) {
    const u = up(id), l = level(id);
    return l >= u.max ? null : u.costs[l];
  }
  function buyUpgrade(id) {
    const c = cost(id);
    if (c === null || data.coins < c) return false;
    data.coins -= c;
    data.upgrades[id] = level(id) + 1;
    save();
    return true;
  }
  function buyTrail(id) {
    const t = TRAILS.find((x) => x.id === id);
    if (!t || data.trails.includes(id) || data.coins < t.cost) return false;
    data.coins -= t.cost;
    data.trails.push(id);
    data.trail = id;
    save();
    return true;
  }
  function equipTrail(id) {
    if (!data.trails.includes(id)) return false;
    data.trail = id; save(); return true;
  }
  const trail = () => TRAILS.find((t) => t.id === data.trail) || TRAILS[0];

  // ------------------------------------------------------------ misiones
  function refreshMissions() {
    const day = G.todayKey();
    if (data.missions.day === day && data.missions.list.length) return;
    let h = 0;
    for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rng = new G.RNG(h ^ 0x9e3779b9);
    const pool = rng.shuffle(MISSIONS.slice());
    const tier = Math.min(2, Math.floor((data.stats.runs || 0) / 8));
    data.missions = {
      day,
      list: pool.slice(0, 3).map((m, i) => {
        const t = Math.min(2, tier + (i === 2 ? 1 : 0));
        return { id: m.id, tier: t, goal: m.n[t], reward: m.r[t], prog: 0, claimed: false };
      }),
    };
    save();
  }
  function missionText(m) {
    const def = MISSIONS.find((x) => x.id === m.id);
    return def.text.replace('{n}', G.fmtInt(m.goal));
  }
  function claimMission(i) {
    const m = data.missions.list[i];
    if (!m || m.claimed || m.prog < m.goal) return 0;
    m.claimed = true;
    data.coins += m.reward;
    save();
    return m.reward;
  }

  // aplica las estadisticas de una partida; devuelve novedades
  function applyRun(st) {
    refreshMissions();
    const res = { newRecord: false, completed: [] };
    data.stats.runs++;
    data.stats.deliveries += st.deliveries;
    data.stats.perfects += st.perfects;
    data.stats.distance += st.distance;
    data.stats.coins += st.coins;
    data.stats.routes += st.routes;
    data.tutorial++;
    if (st.score > data.best.score) { data.best.score = st.score; res.newRecord = true; }
    data.best.dist = Math.max(data.best.dist, Math.floor(st.distance));
    data.best.deliveries = Math.max(data.best.deliveries, st.deliveries);
    data.best.combo = Math.max(data.best.combo, st.bestCombo);
    data.records.push({ score: st.score, dist: Math.floor(st.distance), deliv: st.deliveries, date: G.todayKey() });
    data.records.sort((a, b) => b.score - a.score);
    data.records = data.records.slice(0, 10);
    data.missions.list.forEach((m) => {
      const def = MISSIONS.find((x) => x.id === m.id);
      if (!def || m.prog >= m.goal) return;
      const v = st[def.stat] || 0;
      m.prog = def.max ? Math.max(m.prog, v) : m.prog + v;
      if (m.prog >= m.goal) { m.prog = m.goal; res.completed.push(missionText(m)); }
    });
    data.coins += st.coinsEarned;
    save();
    return res;
  }

  return {
    load, save, reset, UPGRADES, TRAILS, MISSIONS,
    get data() { return data; },
    level, cost, buyUpgrade, buyTrail, equipTrail, trail,
    refreshMissions, missionText, claimMission, applyRun,
  };
})();
