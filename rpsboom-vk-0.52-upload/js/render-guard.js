/* ============================================================
 * render-guard.js · v0.45 · Загружается ПОСЛЕ game.js
 * Страховка рендера: если WebGL не рисует (нет контекста, потеря
 * контекста, «мёртвый» белый буфер на мобильных GPU, падение
 * RAF-цикла) — рисуем доску и фишки в 2D-подложке поверх канваса.
 * Игра при этом полностью играбельна: тапы считает та же математика.
 *
 * v0.45: главное исправление «пикселей и эмодзи» после перезагрузки.
 *  - Подложка больше не рисует эмодзи: она рисует ТОТ ЖЕ арт (перчатки
 *    и башни из атласа), поэтому режим совместимости выглядит как игра.
 *  - Детектор «пустого канваса» срабатывает только по-настоящему: буфер
 *    читается ВНУТРИ кадра, сразу после render() (без preserveDrawingBuffer
 *    вне кадра он всегда пустой — отсюда были ложные срабатывания).
 *  - Нужны 4 подряд пустых замера, вкладка должна быть видимой, а как
 *    только канвас снова ожил — подложка немедленно гаснет.
 * ============================================================ */
(function () {
  'use strict';
  var cv = document.getElementById('gl');
  if (!cv) return;

  var overlay = null, octx = null, overlayOn = false;
  var lastRenderAt = 0, blankStreak = 0, stalledStreak = 0, gameWasActive = false;
  var probeWanted = false, probeVal = -1, probeTmp = null, probeCtx = null;
  var art = { hand: null, alch: null, gen: null, tower: { alch: {}, gen: {} } };

  function glFailShown() {
    var g = document.getElementById('glfail');
    return !!(g && g.style.display && g.style.display !== 'none');
  }
  function gameActive() {
    try {
      return typeof game !== 'undefined' && game && game.tiles && game.tiles.length > 0 &&
        game.phase !== 'menu' && game.phase !== 'start';
    } catch (e) { return false; }
  }

  /* ---------- арт (тот же, что в игре) ---------- */
  function loadArt() {
    try {
      var A = window.RPS_ART;
      if (!A) return;
      var put = function (uri, key) {
        if (!uri || art[key]) return;
        var im = new Image();
        im.onload = function () { art[key] = im; };
        im.src = uri;
      };
      put(A.hand, 'hand'); put(A.alch, 'alch'); put(A.gen, 'gen');
      if (A.tower) {
        ['alch', 'gen'].forEach(function (team) {
          for (var k = 1; k <= 3; k++) {
            var u = (A.tower[team] || {})[k];
            if (u && !art.tower[team][k]) {
              (function (team, k, u) {
                var im = new Image();
                im.onload = function () { art.tower[team][k] = im; };
                im.src = u;
              })(team, k, u);
            }
          }
        });
      }
    } catch (e) {}
  }
  loadArt();
  setTimeout(loadArt, 800);
  setTimeout(loadArt, 3000);

  /* ---------- 2D-подложка ---------- */
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('canvas');
    overlay.id = 'gl2d';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText = 'position:fixed;display:block;pointer-events:none;z-index:3;';
    document.body.appendChild(overlay);
    octx = overlay.getContext('2d');
    return overlay;
  }
  function syncOverlayRect() {
    var r = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
    overlay.style.left = r.left + 'px'; overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px'; overlay.style.height = r.height + 'px';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* фишка: сначала настоящий арт, эмодзи — только аварийный вариант */
  function drawPiece(ctx, t, x, y, rad) {
    var mine = t.team === 'player';
    var ty = t.type;
    var img = null;
    if (ty === TOWER) {
      var team = mine ? 'alch' : 'gen';
      img = art.tower[team][t.tk] || art[team];
    }
    if (ty !== TOWER && art.hand) {
      try {
        var cw = art.hand.naturalWidth / 3, ch = art.hand.naturalHeight / 2;
        var col = ty === ROCK ? 0 : (ty === SCISSORS ? 2 : 1);
        var row = mine ? 0 : 1;
        ctx.drawImage(art.hand, col * cw, row * ch, cw, ch, x - rad, y - rad, rad * 2, rad * 2);
        return;
      } catch (e) { /* ниже — фолбэк */ }
    }
    if (img) {
      try { ctx.drawImage(img, x - rad, y - rad, rad * 2, rad * 2); return; } catch (e) {}
    }
    var g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.4, rad * 0.15, x, y, rad);
    g.addColorStop(0, mine ? '#8ff3bf' : '#ffe9a8');
    g.addColorStop(1, mine ? '#1e6b44' : '#8a6a24');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
    ctx.lineWidth = Math.max(2, rad * 0.16);
    ctx.strokeStyle = mine ? '#3ddc84' : '#e8c56a';
    ctx.stroke();
  }

  function draw2D() {
    ensureOverlay(); syncOverlayRect();
    var ctx = octx, W = overlay.width, H = overlay.height;
    ctx.clearRect(0, 0, W, H);
    try {
      var r = cv.getBoundingClientRect();
      var dpr = W / (r.width || 1);
      var faces = {}, items = [];
      game.tiles.forEach(function (t) {
        if (!t || t.gone) return;
        faces[t.face] = true;
        var p = project(tilePos(t)), d = 0;
        if (!p) return;
        try { d = tP(mvp(), t.targetPos || tilePos(t))[2]; } catch (e) {}
        items.push({ t: t, x: (p[0] - r.left) * dpr, y: (p[1] - r.top) * dpr, d: d });
      });
      var R = Math.max(14, Math.min(W, H) * 0.045);
      Object.keys(faces).forEach(function (f) {
        f = Number(f);
        for (var row = 0; row < 6; row++) for (var col = 0; col < 6; col++) {
          var p = project(slotGeom1(L1, f, row, col));
          if (!p) continue;
          var x = (p[0] - r.left) * dpr, y = (p[1] - r.top) * dpr;
          ctx.fillStyle = 'rgba(232,197,106,.10)';
          ctx.strokeStyle = 'rgba(232,197,106,.22)';
          ctx.lineWidth = Math.max(1, dpr);
          roundRect(ctx, x - R * 0.92, y - R * 0.92, R * 1.84, R * 1.84, R * 0.28);
          ctx.fill(); ctx.stroke();
        }
      });
      items.sort(function (a, b) { return a.d - b.d; });
      items.forEach(function (it) {
        drawPiece(ctx, it.t, it.x, it.y, it.t.type === TOWER ? R * 1.02 : R * 0.88);
      });
      if (overlayOn) {
        ctx.font = (11 * dpr) + 'px system-ui,sans-serif';
        ctx.fillStyle = 'rgba(232,197,106,.75)';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText((typeof LANG !== 'undefined' && LANG === 'en') ? '2D compatibility mode' : 'режим совместимости 2D', 8 * dpr, 8 * dpr);
      }
    } catch (e) { console.warn('[GL2D]', e); }
  }

  function showOverlay() { if (!overlayOn) { ensureOverlay(); overlayOn = true; } draw2D(); }
  function hideOverlay() {
    overlayOn = false; blankStreak = 0;
    if (overlay && octx) { octx.clearRect(0, 0, overlay.width, overlay.height); overlay.style.display = 'none'; }
  }
  function showOnScreen() { if (overlay) overlay.style.display = 'block'; }

  (function loop2d() {
    if (overlayOn && gameActive()) { showOnScreen(); draw2D(); }
    requestAnimationFrame(loop2d);
  })();

  /* ---------- замер буфера: только внутри кадра ---------- */
  function sampleNow() {
    try {
      var r = cv.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return -1;
      if (!probeTmp) {
        probeTmp = document.createElement('canvas');
        probeTmp.width = 32; probeTmp.height = 32;
        probeCtx = probeTmp.getContext('2d', { willReadFrequently: true });
      }
      probeCtx.clearRect(0, 0, 32, 32);
      probeCtx.drawImage(cv, 0, 0, 32, 32);
      var d = probeCtx.getImageData(0, 0, 32, 32).data, vis = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 16) continue;
        if (d[i] > 246 && d[i + 1] > 246 && d[i + 2] > 246) continue;
        vis++;
      }
      return vis;
    } catch (e) { return -1; }
  }

  /* перехват render(): живость цикла + замер сразу после отрисовки */
  var origRender = window.render;
  if (origRender) {
    window.render = function () {
      var ok = true, out;
      try { out = origRender.apply(this, arguments); }
      catch (e) { ok = false; console.warn('[GL] render error', e); }
      if (ok) lastRenderAt = performance.now();
      if (probeWanted) { probeWanted = false; probeVal = ok ? sampleNow() : 0; }
      return out;
    };
  }

  cv.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    lastRenderAt = 0;
    try { showOverlay(); showOnScreen(); } catch (er) {}
  }, false);
  cv.addEventListener('webglcontextrestored', function () {
    lastRenderAt = performance.now();
    blankStreak = 0; stalledStreak = 0;
    try { if (window.buildGlyphAtlas) window.buildGlyphAtlas(); } catch (e) {}
    try { window.render(); } catch (e) {}
  }, false);

  /* ---------- watchdog ---------- */
  setInterval(function () {
    var active = gameActive();
    if (active !== gameWasActive) {
      gameWasActive = active;
      if (!active) { hideOverlay(); stalledStreak = 0; }
    }
    if (!active) return;
    if (document.hidden) return;
    if (glFailShown()) { showOverlay(); return; }
    loadArt();

    var stalled = performance.now() - lastRenderAt > 2500;
    if (stalled) {
      stalledStreak++;
      if (stalledStreak >= 2) showOverlay();
      return;
    }
    stalledStreak = 0;

    probeWanted = true;
    setTimeout(function () {
      var v = probeVal;
      if (v < 0) return;                 /* замер невозможен — не трогаем */
      if (v < 6) blankStreak++; else blankStreak = 0;
      if (blankStreak >= 4) { showOverlay(); blankStreak = 0; }
      else if (blankStreak === 0 && overlayOn && performance.now() - lastRenderAt < 600) hideOverlay();
    }, 80);
  }, 1500);

  window.GL_GUARD = { force2d: function () { showOverlay(); showOnScreen(); }, hide: hideOverlay };
})();
