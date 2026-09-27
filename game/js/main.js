/* Arranque, escalado pixel-perfect, bucle principal y escenas */
'use strict';

(() => {
  const canvas = document.getElementById('game');
  let ctx = canvas.getContext('2d', { alpha: false });
  G.canvas = canvas;
  G.scene = null;
  let nextScene = null;

  G.go = (s) => { nextScene = s; };

  // ------------------------------------------------------------ escalado
  G.resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth, vh = window.innerHeight;
    const sw = Math.round(vw * dpr), sh = Math.round(vh * dpr);
    let K = Math.max(1, Math.round(sh / 270));
    let H = Math.floor(sh / K), W = Math.floor(sw / K);
    if (W < 420) {
      K = Math.max(1, Math.floor(sw / 420));
      W = Math.floor(sw / K);
      H = Math.floor(sh / K);
    }
    H = G.clamp(H, 230, 300);
    W = G.clamp(W, 400, 720);
    G.K = K; G.W = W; G.H = H;
    const quality = G.Save && G.Save.data ? G.Save.data.settings.quality : 'alta';
    G.RS = quality === 'alta' ? Math.min(K, 4) : 1;
    canvas.width = W * G.RS;
    canvas.height = H * G.RS;
    const cssW = (W * K) / dpr, cssH = (H * K) / dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.style.left = Math.round((vw - cssW) / 2) + 'px';
    canvas.style.top = Math.round((vh - cssH) / 2) + 'px';
    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;
    G.layout();
    if (G.Biomes) G.Biomes.rebuildAll();
    if (G.World) G.World.clear();
    if (G.scene && G.scene.build) G.scene.build();
  };

  // ------------------------------------------------------------ bucle
  const STEP = 1 / 60;
  let last = 0, acc = 0;
  let slowFrames = 0, frames = 0, perfT = 0, autoDowngraded = false;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    // control de rendimiento: si va lento, pasa a modo retro (1 px logico = 1 px de lienzo)
    if (G.scene instanceof G.UI.Scenes.Play) {
      frames++; perfT += dt;
      if (dt > 0.028) slowFrames++;
      if (perfT > 4) {
        if (!autoDowngraded && G.RS > 1 && slowFrames / frames > 0.35) {
          autoDowngraded = true;
          G.Save.data.settings.quality = 'baja';
          G.Save.save();
          G.resize();
        }
        perfT = 0; frames = 0; slowFrames = 0;
      }
    }
    if (nextScene) {
      G.scene = nextScene;
      nextScene = null;
      G.Input.endStep();
    }
    acc += dt * G.FX.timeScale;
    let steps = 0;
    while (acc >= STEP && steps < 6) {
      G.t += STEP;
      if (G.scene) G.scene.update(STEP);
      G.FX.update(STEP);
      G.Input.endStep();
      acc -= STEP;
      steps++;
      if (nextScene) break;
    }
    if (steps >= 6) acc = 0;
    G.Audio.update(dt);
    G.frame++;
    ctx.setTransform(G.RS, 0, 0, G.RS, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (G.scene) G.scene.draw(ctx);
    G.FX.drawFlash(ctx);
    if (G.debug) {
      G.Font.draw(ctx, 'FPS ' + Math.round(1 / Math.max(dt, 0.001)) + ' ENT ' + (G.scene && G.scene.run ? G.scene.run.ents.length : 0) + ' FX ' + G.FX.count + ' RS ' + G.RS,
        4, G.H - 10, { color: '#0f0', outline: '#000' });
    }
    if (G.Input.hit && G.Input.hit('debug')) G.debug = !G.debug;
  }

  // ------------------------------------------------------------ ciclo de vida
  function pauseAll() {
    if (G.scene && G.scene.onBlur) G.scene.onBlur();
    G.Audio.suspend();
    G.Input.releaseAll();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAll();
    else G.Audio.resume();
  });
  // ganchos para el envoltorio Android
  window.GOM_back = () => {
    if (G.scene && G.scene.back) return !!G.scene.back();
    return false;
  };
  window.GOM_pause = pauseAll;
  window.GOM_resume = () => G.Audio.resume();
  window.addEventListener('resize', () => G.resize());
  window.addEventListener('orientationchange', () => setTimeout(G.resize, 200));

  // ------------------------------------------------------------ arranque
  G.Save.load();
  G.resize();
  G.Input.attach(canvas);
  G.Audio.init();
  G.Audio.setVolumes(G.Save.data.settings.music, G.Save.data.settings.sfx);
  G.scene = new G.UI.Scenes.Boot();
  requestAnimationFrame(frame);
  G.A.load().then(() => {
    // pre-calienta las capas de los barrios
    G.Biomes.ORDER.forEach((id) => { G.Biomes.get(id); G.World.roadTile(id); });
    G.go(new G.UI.Scenes.Title(false));
    document.title = 'GOM Pizza Delivery';
    window.GOM_READY = true;
  });
})();
