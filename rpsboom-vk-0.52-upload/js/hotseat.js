/* ============================================================
 * hotseat.js · v0.36.1 · Режим «Вдвоём за одним компьютером»
 * БЕЗ ИИ: два живых игрока сами двигают фишки по очереди.
 * - Игрок 1 = Алхимик (низ, player), Игрок 2 = Джинн (верх, ai);
 * - только плоская доска 6×6, игра сразу, без лобби и ожидания;
 * - рейтинг и счёт НЕ ведутся (прогресс кампании не трогаем).
 *
 * Блокировка ИИ — ДВА рубежа:
 *   1) window.runGenieTurn — внешний (все таймеры/вызовы);
 *   2) window.doAITurn   — ВНУТРЕННИЙ: тело ИИ не выполнится, даже если
 *      какой-то код вызовет сохранённую ссылку на оригинальный runGenieTurn.
 * Признак активности — game.__hs (живёт в состоянии игры) + HS.on.
 * Гасится ТОЛЬКО явным выходом в главное меню.
 * ============================================================ */
(function () {
  'use strict';
  var HS = window.HS = { on: false, n1: 'Игрок 1', n2: 'Игрок 2' };

  function hsActive() {
    try {
      return !!(HS.on || (typeof game !== 'undefined' && game && game.__hs));
    } catch (e) { return !!HS.on; }
  }

  /* ---- 1. чья сейчас очередь — та команда и «своя» ---- */
  var origMyTeam = window.myTeam;
  window.myTeam = function () {
    try {
      if (hsActive() && typeof game !== 'undefined' && game) return game.turn === 'ai' ? 'ai' : 'player';
    } catch (e) {}
    return origMyTeam ? origMyTeam() : 'player';
  };

  /* ---- 2а. внешний рубеж: runGenieTurn ---- */
  var origGenie = window.runGenieTurn;
  window.runGenieTurn = function () {
    if (hsActive()) return Promise.resolve(); /* хот-сит: джинном играет живой человек */
    return origGenie ? origGenie.apply(this, arguments) : undefined;
  };

  /* ---- 2б. ВНУТРЕННИЙ рубеж: тело ИИ doAITurn ---- */
  var origDoAI = window.doAITurn;
  window.doAITurn = function () {
    if (hsActive()) return Promise.resolve();
    return origDoAI ? origDoAI.apply(this, arguments) : undefined;
  };

  function names() {
    HS.n1 = LANG === 'ru' ? 'Игрок 1' : 'Player 1';
    HS.n2 = LANG === 'ru' ? 'Игрок 2' : 'Player 2';
  }
  function turnText() {
    return (LANG === 'ru' ? 'Ход: ' : 'To move: ') + (game.turn === 'ai' ? HS.n2 : HS.n1) +
      ' · ' + (game.turn === 'ai' ? (LANG === 'ru' ? 'Джинн' : 'Genie') : (LANG === 'ru' ? 'Алхимик' : 'Alchemist'));
  }

  HS.start = function () {
    names();
    try { closeOv && closeOv(); } catch (e) {}
    try { show('scr-start', false); show('scr-mode', false); } catch (e) {}
    try { chooseMode('flat'); } catch (e) {}
    try { loadLayer(1); } catch (e) {}
    game.aiLevel = 1;
    game.turn = 'player';
    game.score = 0;
    game.tutorial = false;
    HS.on = true;
    game.__hs = true; /* второй флаг — переживает любые переключения экранов */
    hintS(function () {
      return LANG === 'ru'
        ? 'ХОТ-СИТ · ИИ ВЫКЛЮЧЕН: ' + HS.n1 + ' (Алхимик) ходит первым, ' + HS.n2 + ' (Джинн) играет руками. Передавайте устройство по очереди.'
        : 'HOT SEAT · AI OFF: ' + HS.n1 + ' (Alchemist) first, ' + HS.n2 + ' (Genie) plays by hand. Pass the device each turn.';
    });
    renderHUD();
  };

  /* v0.47: выход из хот-сита убирает ВСЁ, что режим показал на экране:
     плашку «ХОТ-СИТ · ИИ ВЫКЛЮЧЕН», подписи игроков и строку-подсказку. */
  HS.stop = function () {
    HS.on = false;
    try { if (game) game.__hs = false; } catch (e) {}
    try { hideBanner(); } catch (e) {}
    try {
      var b = document.getElementById('hs-banner');
      if (b && b.parentNode) b.parentNode.removeChild(b);
    } catch (e) {}
    try {
      /* сбрасываем подпись хода и имена игроков на местах */
      var pbs = document.querySelectorAll('.pbadge');
      if (pbs.length >= 2) {
        pbs[0].textContent = LANG === 'ru' ? 'Алхимик' : 'Alchemist';
        pbs[1].textContent = LANG === 'ru' ? 'Джинн' : 'Genie';
      }
      var tb = document.getElementById('turnbadge');
      if (tb) tb.style.color = '';
    } catch (e) {}
    try {
      /* подсказка режима не должна «висеть» после выхода */
      if (window.updateGoalHint) window.updateGoalHint(true);
    } catch (e) {}
    try { renderHUD(); } catch (e) {}
    try {
      /* старый текст режима не должен оставаться в строке-подсказке */
      var hEl2 = document.getElementById('hint');
      if (hEl2) { hEl2.textContent = ''; if (window.updateGoalHint) window.updateGoalHint(true); }
    } catch (e) {}
  };

  /* ---- 3. подписи хода + плашка «ИИ ВЫКЛЮЧЕН» ---- */
  var origHud = window.renderHUD;
  window.renderHUD = function () {
    origHud.apply(this, arguments);
    /* v0.47: игра ушла в меню — режим хот-сит закончился, плашка и подсказка снимаются */
    try { if (hsActive() && game && game.phase === 'menu') { HS.stop(); return; } } catch (e) {}
    if (!hsActive()) { try { hideBanner(); } catch (e) {} return; }
    try {
      var tb = document.getElementById('turnbadge');
      if (tb) { tb.textContent = turnText(); tb.style.color = game.turn === 'ai' ? '#e8c56a' : '#3ddc84'; }
      var pbs = document.querySelectorAll('.pbadge');
      if (pbs.length >= 2) { pbs[0].textContent = HS.n1; pbs[1].textContent = HS.n2; }
      showBanner();
    } catch (e) {}
  };

  function showBanner() {
    var b = document.getElementById('hs-banner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'hs-banner';
      b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:calc(var(--hint-top,120px) + 46px);' +
        'z-index:40;background:rgba(20,40,26,.92);border:1px solid #3ddc84;color:#c9f5d8;' +
        'padding:6px 14px;border-radius:999px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;' +
        'letter-spacing:.02em;text-align:center';
      document.body.appendChild(b);
    }
    b.textContent = (LANG === 'ru' ? '👥 ХОТ-СИТ · ИИ ВЫКЛЮЧЕН · ' : '👥 HOT SEAT · AI OFF · ') + turnText();
    b.style.display = '';
    /* v0.43: баннер уходит под верхнюю панель и не закрывает доску */
    try { if (window.layoutTopHints) window.layoutTopHints(); } catch (e) {}
    try {
      /* v0.44: баннер встаёт под HUD и под строку-цель, чтобы ничего не перекрывать */
      var top = 120;
      try {
        var hEl = document.getElementById('hud');
        var hb = hEl && hEl.getBoundingClientRect();
        if (hb && hb.height) top = hb.bottom + 6;
        var hintEl = document.getElementById('hint');
        if (hintEl && getComputedStyle(hintEl).display !== 'none') {
          var hr = hintEl.getBoundingClientRect();
          if (hr.height > 0) top = Math.max(top, hr.bottom + 6);
        }
      } catch (e) {}
      b.style.top = top + 'px';
    } catch (e) {}
  }
  function hideBanner() {
    var b = document.getElementById('hs-banner');
    if (b) b.style.display = 'none';
  }

  /* ---- 4. финал: без наград кампании и счёта; «Ещё раз» остаётся в хот-сите ---- */
  var origEnd = window.endLayer;
  window.endLayer = function (result, reason) {
    if (!hsActive()) return origEnd.apply(this, arguments);
    var tut = game.tutorial;
    game.tutorial = true; /* внутри endLayer это отключает запись прогресса/счёта кампании */
    try { origEnd.apply(this, arguments); } finally { game.tutorial = tut; game.__hs = true; }
    try {
      var tt = document.getElementById('end-title');
      if (tt) {
        tt.textContent = result === 'draw'
          ? (LANG === 'ru' ? 'НИЧЬЯ' : 'DRAW')
          : result === 'win'
            ? (LANG === 'ru' ? 'ПОБЕДИЛ ' + HS.n1 : HS.n1 + ' WINS')
            : (LANG === 'ru' ? 'ПОБЕДИЛ ' + HS.n2 : HS.n2 + ' WINS');
      }
      var tx = document.getElementById('end-text');
      if (tx) tx.textContent = (LANG === 'ru' ? 'Хот-сит · доска 6×6 · без ИИ' : 'Hot seat · board 6×6 · no AI');
      var sc = document.getElementById('end-score');
      if (sc) sc.textContent = (LANG === 'ru' ? 'Рейтинг и счёт не ведутся' : 'No rating or score is kept');
      var nx = document.getElementById('end-next');
      if (nx) nx.style.display = 'none';
      var rt = document.getElementById('end-retry');
      if (rt) rt.textContent = (LANG === 'ru' ? 'Ещё раз' : 'Again');
    } catch (e) {}
  };

  /* «Ещё раз»: loadLayer(game.layer) при game.turn==='ai' планирует ИИ-таймер —
     сбрасываем очередь на игрока 1 (таймер всё равно обезврежен рубежами). */
  try {
    var rtBtn = document.getElementById('end-retry');
    if (rtBtn) {
      rtBtn.addEventListener('click', function () {
        if (!hsActive()) return;
        setTimeout(function () {
          try {
            game.turn = 'player'; game.score = 0; game.__hs = true; HS.on = true;
            renderHUD();
          } catch (e) {}
        }, 0);
      }, true);
    }
  } catch (e) {}

  /* ---- 5. выход в ГЛАВНОЕ МЕНЮ завершает хот-сит ---- */
  var origShow = window.show;
  if (origShow) {
    window.show = function (id, on) {
      var r = origShow.apply(this, arguments);
      try {
        /* v0.47: любая смена экрана/режима завершает хот-сит и снимает плашку */
        var leaving = (on !== false) && ['scr-start', 'scr-mode', 'scr-help', 'scr-tsu', 'scr-rps-round'].indexOf(id) >= 0;
        if (leaving && hsActive()) HS.stop();
        if (leaving) { try { hideBanner(); } catch (e) {} }
      } catch (e) {}
      return r;
    };
  }

  /* ---- 6. кнопка в главном меню ----
     v0.46: кнопка «Играть вдвоём» стоит в разметке меню (index.html) вместе с
     остальными — все кнопки видны сразу, без рывка при загрузке. Здесь только
     вешаем обработчик, ничего не пере-вставляем и не пере-вёрстываем. */
  function wireButton() {
    var btn = document.getElementById('b-hs');
    if (!btn) return false;
    btn.onclick = function () {
      try { Snd.init && Snd.init(); } catch (e) {}
      try { Snd.click && Snd.click(); } catch (e) {}
      HS.start();
    };
    return true;
  }
  HS.installButton = function () {
    if (wireButton()) return;
    var n = 0;
    var iv = setInterval(function () {
      n++;
      if (wireButton() || n > 40) clearInterval(iv);
    }, 250);
  };
})();
