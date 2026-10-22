/* ============================================================
 * multiplayer.js · v0.35.0 · Мультиплеер «Вариант A»
 * Всё на VK Storage (custom + global), без бэкенда.
 * Режимы: плоская 6×6 (с башней / без башни), 3D-сэндвич
 * (с башней / без башни), Цу-е-фа (commit-reveal).
 * Рейтинг: старт 0, победа +10, поражение −7, ничья 0, пол 0.
 * Античит (лёгкий): двойное подтверждение результата, капы.
 * ============================================================ */
(function () {
  'use strict';

  var APP_VERSION = window.APP_VERSION || '0.35.0';

  /* ================= локализация MP ================= */
  var MPT = {
    ru: {
      title: 'МУЛЬТИПЛЕЕР', profile: 'Профиль игрока', nick: 'Ник для мультиплеера',
      nick_ph: '2–16 символов', save: 'Сохранить', nick_bad: 'Недопустимый ник',
      rating: 'Рейтинг', wins: 'Победы', losses: 'Поражения', draws: 'Ничьи',
      find: 'Найти соперника', history: 'История партий', back: 'Назад',
      lobby: 'Лобби', waiting_players: 'Игроки в лобби', refresh: 'Обновить',
      invite: 'Пригласить', invited: 'Приглашение отправлено', accept: 'Принять',
      decline: 'Отклонить', waiting: 'Ждём соперника…', cancel: 'Отмена',
      your_turn: 'ТВОЙ ХОД', opp_turn: 'ХОД СОПЕРНИКА', vs: 'против',
      mode: 'Режим', flat: 'Плоская 6×6', d3: 'Сэндвич 3D', cuefa: 'Цу-е-фа',
      tower: 'с башней', plain: 'без башни', tempo: 'Темп',
      win: 'ПОБЕДА', lose: 'ПОРАЖЕНИЕ', draw: 'НИЧЬЯ', revanche: 'Реванш',
      to_menu: 'В меню', hist_empty: 'Партий пока нет', hist_op: 'Соперник',
      hist_date: 'Дата', hist_res: 'Итог', hist_moves: 'Ходов', hist_mode: 'Режим',
      opp_moved: 'Соперник сходил', net_wait: 'Ждём ход соперника…',
      disconnected: 'Связь потеряна — партия сохранена, вернитесь позже',
      forfeit: 'Соперник не ходит — засчитать победу?', claim_win: 'Засчитать победу',
      disputed: 'Спорная партия — рейтинг не изменён', rated_note: 'Рейтинговая партия',
      invite_in: 'Вас зовут на партию!', quick: 'Быстрая партия', open: 'Открытая касса',
      first: 'Первым ходит', you: 'Вы', opp: 'Соперник', choose_hand: 'Выбери символ',
      waiting_choice: 'Ждём выбор соперника…', reveal: 'Раскрываем…', round: 'Раунд',
      cuefa_to: 'До 5 побед', commit_bad: 'Соперник изменил выбор — раунд ему',
      no_show: 'Соперник не явился — раунд вам', you_won_round: 'Раунд за вами!',
      you_lost_round: 'Раунд проигран', draw_round: 'Одинаково', rematch_q: 'Сыграть ещё?',
      stats: 'Статистика', players: 'Игроков', matches: 'Партей', caps: 'Лимит: 3 рейтинговые партии в день с одним соперником',
      rank0: 'Новичок', rank1: 'Ученик', rank2: 'Мастер', rank3: 'Гроссмейстер', rank4: 'Легенда'
    },
    en: {
      title: 'MULTIPLAYER', profile: 'Player profile', nick: 'Multiplayer nickname',
      nick_ph: '2–16 characters', save: 'Save', nick_bad: 'Invalid nickname',
      rating: 'Rating', wins: 'Wins', losses: 'Losses', draws: 'Draws',
      find: 'Find opponent', history: 'Match history', back: 'Back',
      lobby: 'Lobby', waiting_players: 'Players in lobby', refresh: 'Refresh',
      invite: 'Invite', invited: 'Invitation sent', accept: 'Accept',
      decline: 'Decline', waiting: 'Waiting for opponent…', cancel: 'Cancel',
      your_turn: 'YOUR TURN', opp_turn: "OPPONENT'S TURN", vs: 'vs',
      mode: 'Mode', flat: 'Flat 6×6', d3: 'Sandwich 3D', cuefa: 'Ro-sham-bo',
      tower: 'with tower', plain: 'no tower', tempo: 'Tempo',
      win: 'VICTORY', lose: 'DEFEAT', draw: 'DRAW', revanche: 'Rematch',
      to_menu: 'Menu', hist_empty: 'No matches yet', hist_op: 'Opponent',
      hist_date: 'Date', hist_res: 'Result', hist_moves: 'Moves', hist_mode: 'Mode',
      opp_moved: 'Opponent moved', net_wait: "Waiting for opponent's move…",
      disconnected: 'Connection lost — match saved, return later',
      forfeit: 'Opponent is idle — claim victory?', claim_win: 'Claim victory',
      disputed: 'Disputed match — rating unchanged', rated_note: 'Rated match',
      invite_in: 'You are invited to a match!', quick: 'Quick match', open: 'Open lobby',
      first: 'First move', you: 'You', opp: 'Opponent', choose_hand: 'Choose your sign',
      waiting_choice: "Waiting for opponent's choice…", reveal: 'Revealing…', round: 'Round',
      cuefa_to: 'First to 5', commit_bad: 'Opponent changed their sign — round to them',
      no_show: 'Opponent missed the round — yours', you_won_round: 'Round won!',
      you_lost_round: 'Round lost', draw_round: 'Tie', rematch_q: 'Play again?',
      stats: 'Statistics', players: 'Players', matches: 'Matches', caps: 'Limit: 3 rated matches per day vs one opponent',
      rank0: 'Novice', rank1: 'Apprentice', rank2: 'Master', rank3: 'Grandmaster', rank4: 'Legend'
    }
  };
  function t(k) { return (MPT[LANG] && MPT[LANG][k]) || MPT.ru[k] || k; }
  function rankOf(r) {
    if (r >= 2000) return t('rank4');
    if (r >= 1500) return t('rank3');
    if (r >= 800) return t('rank2');
    if (r >= 300) return t('rank1');
    return t('rank0');
  }

  /* ================= состояние ================= */
  var Mp = {
    _active: false,           // идёт сетевая партия доски
    _cuefa: false,            // идёт сетевая Цу-е-фа
    match: null,              // {id, mode:'flat'|'3d'|'cuefa', tower, seed, myTeam, first, oppUid, oppNick, seq, deadline}
    my: null,                 // профиль {nick,rating,w,l,d,day:{date,delta},dayOpp:{}}
    waiting: false,           // ждём ход соперника
    pollTimer: null,
    hbTimer: null,
    ended: false,
    lastResult: null
  };
  window.Mp = Mp;

  /* myTeam() — используют патчи игрового ядра */
  function myTeam() {
    try { return (window.Mp && Mp.active()) ? Mp.match.myTeam : 'player'; } catch (e) { return 'player'; }
  }
  window.myTeam = myTeam;

  Mp.active = function () { return Mp._active && !!Mp.match && !Mp.ended; };
  Mp.myTeam = function () { return Mp.match ? Mp.match.myTeam : 'player'; };
  Mp.mode = function () { return Mp.match ? Mp.match.mode : 'flat'; };
  Mp.rules = function () {
    if (!Mp.match) return 'tower';
    if (Mp.match.mode === 'cuefa') return 'cuefa';
    return Mp.match.tower ? 'tower' : 'plain';
  };
  Mp.opponentNick = function () { return Mp.match ? Mp.match.oppNick : (LANG === 'ru' ? 'Соперник' : 'Opponent'); };
  Mp.myNick = function () { return Mp.my ? Mp.my.nick : 'Игрок'; };

  /* ================= профиль / рейтинг / история ================= */
  function loadProfile(cb) {
    VKP.get(['mp_me', 'mp_hist', 'mp_set']).then(function (d) {
      try { Mp.my = JSON.parse(d.mp_me || 'null'); } catch (e) { Mp.my = null; }
      if (!Mp.my || typeof Mp.my !== 'object') Mp.my = null;
      try { Mp.hist = JSON.parse(d.mp_hist || '[]'); } catch (e) { Mp.hist = []; }
      try { Mp.set = JSON.parse(d.mp_set || '{}'); } catch (e) { Mp.set = {}; }
      if (!Mp.set || typeof Mp.set !== 'object') Mp.set = { mode: 'flat', tower: true };
      if (cb) cb();
    });
  }
  function saveProfile() {
    if (Mp.my) VKP.set('mp_me', JSON.stringify(Mp.my));
    VKP.set('mp_hist', JSON.stringify((Mp.hist || []).slice(0, 50)));
    VKP.set('mp_set', JSON.stringify(Mp.set || {}));
  }
  function pushHistory(rec) {
    Mp.hist = Mp.hist || [];
    Mp.hist.unshift(rec);
    Mp.hist = Mp.hist.slice(0, 50);
    saveProfile();
  }
  function dayStamp() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function ratedAllowed(oppUid) {
    Mp.my.day = Mp.my.day || {}; Mp.my.dayOpp = Mp.my.dayOpp || {};
    var ds = dayStamp();
    if (Mp.my.day.date !== ds) { Mp.my.day = { date: ds, delta: 0 }; Mp.my.dayOpp = {}; }
    return (Mp.my.dayOpp[oppUid] || 0) < 3;
  }
  function applyRating(myResult, oppUid) {
    /* myResult: 'W' | 'L' | 'D' */
    var before = Mp.my.rating | 0, delta = 0;
    if (myResult === 'W') delta = 10; else if (myResult === 'L') delta = -7;
    if (delta !== 0 && !ratedAllowed(oppUid)) delta = 0;
    var ds = dayStamp();
    if (!Mp.my.day || Mp.my.day.date !== ds) Mp.my.day = { date: ds, delta: 0 };
    /* кап суточного изменения рейтинга: ±30 */
    var d0 = Mp.my.day.delta | 0;
    if (delta > 0) delta = Math.min(delta, Math.max(0, 30 - d0));
    else if (delta < 0) delta = Math.max(delta, Math.min(0, -30 - d0));
    Mp.my.rating = Math.max(0, before + delta);
    Mp.my.day.delta = d0 + delta;
    Mp.my.dayOpp = Mp.my.dayOpp || {};
    Mp.my.dayOpp[oppUid] = (Mp.my.dayOpp[oppUid] || 0) + 1;
    if (myResult === 'W') Mp.my.w = (Mp.my.w | 0) + 1;
    else if (myResult === 'L') Mp.my.l = (Mp.my.l | 0) + 1;
    else Mp.my.d = (Mp.my.d | 0) + 1;
    saveProfile();
    try { VKP.gSet('rt_' + VKP.user.id, JSON.stringify({ n: Mp.my.nick, r: Mp.my.rating, w: Mp.my.w | 0, l: Mp.my.l | 0 })); } catch (e) {}
    return delta;
  }
  function revertRating(myResult, oppUid) {
    /* коррекция при спорной партии */
    var delta = 0;
    if (myResult === 'W') { delta = -10; Mp.my.w = Math.max(0, (Mp.my.w | 0) - 1); }
    else if (myResult === 'L') { delta = 7; Mp.my.l = Math.max(0, (Mp.my.l | 0) - 1); }
    else { Mp.my.d = Math.max(0, (Mp.my.d | 0) - 1); }
    Mp.my.rating = Math.max(0, (Mp.my.rating | 0) + delta);
    Mp.my.day = Mp.my.day || { date: dayStamp(), delta: 0 };
    Mp.my.day.delta = (Mp.my.day.delta | 0) + delta;
    Mp.my.dayOpp = Mp.my.dayOpp || {};
    Mp.my.dayOpp[oppUid] = Math.max(0, (Mp.my.dayOpp[oppUid] || 1) - 1);
    saveProfile();
    try { VKP.gSet('rt_' + VKP.user.id, JSON.stringify({ n: Mp.my.nick, r: Mp.my.rating, w: Mp.my.w | 0, l: Mp.my.l | 0 })); } catch (e) {}
  }

  /* ================= UI: каркас ================= */
  var STYLE = '<style>' +
    '#mp-root .screen{z-index:60}' +
    '#mp-root .mp-card{max-width:520px;width:100%;margin:auto}' +
    '#mp-root .mp-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '#mp-root .mp-row>*{flex:1 1 auto}' +
    '#mp-root .mp-lbl{font-size:12px;opacity:.75;letter-spacing:.04em;text-transform:uppercase}' +
    '#mp-root .mp-stat{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin:10px 0}' +
    '#mp-root .mp-stat>div{flex:1 1 90px;background:rgba(255,255,255,.06);border:1px solid rgba(232,197,106,.2);border-radius:12px;padding:8px 10px;text-align:center}' +
    '#mp-root .mp-stat b{display:block;font-size:20px}' +
    '#mp-root .mp-list{max-height:46vh;overflow:auto;display:flex;flex-direction:column;gap:8px;margin:10px 0}' +
    '#mp-root .mp-item{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(232,197,106,.18);border-radius:12px;padding:8px 10px}' +
    '#mp-root .mp-item .nm{flex:1;font-weight:600}' +
    '#mp-root .mp-item button{flex:0 0 auto;width:auto;padding:8px 14px}' +
    '#mp-root .mp-pill{font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(232,197,106,.15);border:1px solid rgba(232,197,106,.3);white-space:nowrap}' +
    '#mp-root input.mp-in{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(232,197,106,.35);background:rgba(0,0,0,.25);color:inherit;font-size:16px}' +
    /* v0.52: выбор режима — чекбоксами, шрифт как в настройках */
    '#mp-root .mp-mode-box{display:flex;flex-direction:column;gap:8px;margin:6px 0 0}' +
    '#mp-root .mp-mode-opt{display:flex;align-items:center;gap:12px;min-height:48px;padding:9px 13px;border-radius:12px;text-align:left;' +
      'background:rgba(255,255,255,.05);border:1.5px solid rgba(232,197,106,.22);font-size:17px;font-weight:700;cursor:pointer;' +
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;transition:.15s}' +
    '#mp-root .mp-mode-opt.on{background:rgba(61,220,132,.16);border-color:rgba(61,220,132,.6);box-shadow:0 4px 14px rgba(0,0,0,.25)}' +
    '#mp-root .mp-mode-opt input{width:24px;height:24px;flex:0 0 auto;margin:0;accent-color:#3ddc84;cursor:pointer;border-radius:6px}' +
    '#mp-root .mp-mode-opt span{flex:1;line-height:1.2}' +
    '#mp-root .mp-mode-hidden{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}' +
    '#mp-root table.mp-tbl{width:100%;border-collapse:collapse;font-size:13px}' +
    '#mp-root table.mp-tbl td,#mp-root table.mp-tbl th{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}' +
    '#mp-cuefa-screen{position:fixed;inset:0;z-index:70;background:radial-gradient(1200px 700px at 50% 20%,#0b1020,#05070f);display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#e9e4d6}' +
    '#mp-cuefa-screen.on{display:flex}' +
    '#mp-cuefa-screen .hands{display:flex;gap:18px;align-items:center;font-size:64px;min-height:90px}' +
    '#mp-cuefa-screen .chips{display:flex;gap:10px}' +
    '#mp-cuefa-screen .chip{width:64px;height:64px;border-radius:18px;border:2px solid rgba(232,197,106,.4);background:rgba(22,30,56,.85);font-size:32px;cursor:pointer}' +
    '#mp-cuefa-screen .chip:active{transform:scale(.94)}' +
    '#mp-cuefa-screen .score{font-size:22px;letter-spacing:.06em}' +
    'body.mp-on #boom-tip-text,body.mp-on .boom-btn{display:none!important}' +
    '</style>';

  function el(id) { return document.getElementById(id); }
  function ensureRoot() {
    if (el('mp-root')) return;
    var d = document.createElement('div');
    d.id = 'mp-root';
    d.innerHTML = STYLE + buildScreens();
    document.body.appendChild(d);
    wireScreens();
  }
  function buildScreens() {
    return '' +
      /* профиль */
      '<div class="screen" id="mp-scr-profile"><div class="card mp-card">' +
      '<h2 data-mp="title">' + t('title') + '</h2>' +
      '<p class="narr">' + t('profile') + '</p>' +
      '<div class="mp-lbl">' + t('nick') + '</div>' +
      '<input class="mp-in" id="mp-nick" maxlength="16" placeholder="' + t('nick_ph') + '">' +
      '<div class="mp-row" style="margin-top:12px"><button class="primary" id="mp-nick-save">' + t('save') + '</button>' +
      '<button id="mp-nick-back">' + t('back') + '</button></div>' +
      '</div></div>' +
      /* меню MP */
      '<div class="screen" id="mp-scr-menu"><div class="card mp-card">' +
      '<h2 data-mp="title">' + t('title') + '</h2>' +
      '<div class="mp-stat">' +
      '<div><span class="mp-lbl">' + t('rating') + '</span><b id="mp-v-rating">0</b><span class="mp-pill" id="mp-v-rank">—</span></div>' +
      '<div><span class="mp-lbl">' + t('wins') + '</span><b id="mp-v-w">0</b></div>' +
      '<div><span class="mp-lbl">' + t('losses') + '</span><b id="mp-v-l">0</b></div>' +
      '<div><span class="mp-lbl">' + t('draws') + '</span><b id="mp-v-d">0</b></div>' +
      '</div>' +
      '<div class="mp-lbl">' + t('mode') + '</div>' +
      '<div class="mp-mode-box" id="mp-mode-box" role="radiogroup" aria-label="' + t('mode') + '">' +
      modeOpt('flat|1', t('flat') + ' · ' + t('tower'), true) +
      modeOpt('flat|0', t('flat') + ' · ' + t('plain'), false) +
      modeOpt('3d|1', t('d3') + ' · ' + t('tower'), false) +
      modeOpt('3d|0', t('d3') + ' · ' + t('plain'), false) +
      modeOpt('cuefa|1', t('cuefa') + ' · ' + t('cuefa_to'), false) +
      '</div>' +
      /* значение режима читается из скрытого select — остальная логика не меняется */
      '<select id="mp-mode" class="mp-mode-hidden" tabindex="-1" aria-hidden="true">' +
      '<option value="flat|1">' + t('flat') + ' · ' + t('tower') + '</option>' +
      '<option value="flat|0">' + t('flat') + ' · ' + t('plain') + '</option>' +
      '<option value="3d|1">' + t('d3') + ' · ' + t('tower') + '</option>' +
      '<option value="3d|0">' + t('d3') + ' · ' + t('plain') + '</option>' +
      '<option value="cuefa|1">' + t('cuefa') + ' · ' + t('cuefa_to') + '</option>' +
      '</select>' +
      '<div class="mp-row" style="margin-top:12px">' +
      '<button class="primary" id="mp-find">' + t('find') + '</button>' +
      '<button id="mp-hist">' + t('history') + '</button>' +
      '<button id="mp-menu-back">' + t('back') + '</button></div>' +
      '<p class="small" style="margin-top:10px;opacity:.7">' + t('caps') + '</p>' +
      '</div></div>' +
      /* лобби */
      '<div class="screen" id="mp-scr-lobby"><div class="card mp-card">' +
      '<h2>' + t('lobby') + '</h2>' +
      '<div class="mp-row"><button class="primary" id="mp-quick">' + t('quick') + '</button>' +
      '<button id="mp-lobby-refresh">' + t('refresh') + '</button>' +
      '<button id="mp-lobby-back">' + t('back') + '</button></div>' +
      '<div class="mp-lbl" style="margin-top:10px">' + t('waiting_players') + '</div>' +
      '<div class="mp-list" id="mp-lobby-list"></div>' +
      '</div></div>' +
      /* ожидание */
      '<div class="screen" id="mp-scr-wait"><div class="card mp-card" style="text-align:center">' +
      '<h2 id="mp-wait-txt">' + t('waiting') + '</h2>' +
      '<div class="mp-row"><button id="mp-wait-cancel">' + t('cancel') + '</button></div>' +
      '</div></div>' +
      /* история */
      '<div class="screen" id="mp-scr-hist"><div class="card mp-card">' +
      '<h2>' + t('history') + '</h2>' +
      '<div id="mp-hist-body"></div>' +
      '<div class="mp-row"><button id="mp-hist-back">' + t('back') + '</button></div>' +
      '</div></div>' +
      /* приглашение (оверлей) */
      '<div class="screen" id="mp-scr-inv"><div class="card mp-card" style="text-align:center">' +
      '<h2>' + t('invite_in') + '</h2>' +
      '<p class="narr" id="mp-inv-txt"></p>' +
      '<div class="mp-row"><button class="primary" id="mp-inv-yes">' + t('accept') + '</button>' +
      '<button id="mp-inv-no">' + t('decline') + '</button></div>' +
      '</div></div>' +
      /* цу-е-фа */
      '<div id="mp-cuefa-screen">' +
      '<h2 id="mp-cf-title">' + t('cuefa') + '</h2>' +
      '<div class="score" id="mp-cf-score">0 : 0</div>' +
      '<div class="hands"><span id="mp-cf-my">❔</span><span style="opacity:.5">—</span><span id="mp-cf-opp">❔</span></div>' +
      '<div id="mp-cf-msg" class="narr">' + t('choose_hand') + '</div>' +
      '<div class="chips" id="mp-cf-chips">' +
      '<button class="chip" data-h="1">✊</button><button class="chip" data-h="2">✌️</button><button class="chip" data-h="3">✋</button>' +
      '</div>' +
      '<div class="mp-row" style="width:min(92vw,420px)"><button id="mp-cf-exit">' + t('cancel') + '</button></div>' +
      '</div>';
  }

  function modeOpt(value, label, checked) {
    return '<label class="mp-mode-opt">' +
      '<input type="checkbox" data-mp-mode="' + value + '"' + (checked ? ' checked' : '') + '>' +
      '<span>' + label + '</span></label>';
  }
  /* один выбранный режим: чекбоксы работают как радиокнопки */
  function syncModeBoxes(value) {
    var sel = el('mp-mode');
    if (sel && value) sel.value = value;
    var cur = sel ? sel.value : 'flat|1';
    [].slice.call(document.querySelectorAll('[data-mp-mode]')).forEach(function (cb) {
      var on = (cb.getAttribute('data-mp-mode') === cur);
      cb.checked = on;
      if (cb.parentNode) cb.parentNode.classList.toggle('on', on);
    });
  }
  window.mpSyncModeBoxes = syncModeBoxes;

  function showMp(id, on) {
    ensureRoot();
    var e = el(id);
    if (e) e.classList.toggle('on', !!on);
  }
  function closeMpScreens() {
    ['mp-scr-profile', 'mp-scr-menu', 'mp-scr-lobby', 'mp-scr-wait', 'mp-scr-hist', 'mp-scr-inv'].forEach(function (id) { showMp(id, false); });
  }
  function wireScreens() {
    el('mp-nick-save').onclick = function () {
      Snd.click && Snd.click();
      var v = (el('mp-nick').value || '').trim();
      if (!/^[\wА-Яа-яЁё \-]{2,16}$/.test(v)) { alert(t('nick_bad')); return; }
      Mp.my = Mp.my || { rating: 0, w: 0, l: 0, d: 0 };
      Mp.my.nick = v;
      saveProfile();
      try { VKP.gSet('rt_' + VKP.user.id, JSON.stringify({ n: v, r: Mp.my.rating | 0, w: Mp.my.w | 0, l: Mp.my.l | 0 })); } catch (e) {}
      showMp('mp-scr-profile', false);
      openMpMenu();
    };
    el('mp-nick-back').onclick = function () { showMp('mp-scr-profile', false); showMp('mp-scr-menu', true); };
    [].slice.call(document.querySelectorAll('[data-mp-mode]')).forEach(function (cb) {
      cb.onchange = function () {
        if (cb.checked) {
          Snd.click && Snd.click();
          syncModeBoxes(cb.getAttribute('data-mp-mode'));
          try { Mp.set = Mp.set || {}; var pv = (cb.getAttribute('data-mp-mode') || 'flat|1').split('|');
                Mp.set.mode = pv[0]; Mp.set.tower = pv[1] !== '0'; saveProfile(); } catch (e) {}
        } else {
          /* снять последний выбранный нельзя — режим всегда один */
          cb.checked = true;
        }
      };
    });
    el('mp-find').onclick = function () { Snd.click && Snd.click(); openLobby(); };
    el('mp-hist').onclick = function () { Snd.click && Snd.click(); openHistory(); };
    el('mp-menu-back').onclick = function () { Snd.click && Snd.click(); closeMpScreens(); };
    el('mp-lobby-back').onclick = function () { stopLobbyTimers(); showMp('mp-scr-lobby', false); openMpMenu(); };
    el('mp-lobby-refresh').onclick = function () { Snd.click && Snd.click(); refreshLobby(); };
    el('mp-quick').onclick = function () { Snd.click && Snd.click(); quickMatch(); };
    el('mp-wait-cancel').onclick = function () { Snd.click && Snd.click(); cancelWaiting(); };
    el('mp-hist-back').onclick = function () { showMp('mp-scr-hist', false); openMpMenu(); };
    el('mp-inv-yes').onclick = function () { Snd.click && Snd.click(); acceptInvite(); };
    el('mp-inv-no').onclick = function () { Snd.click && Snd.click(); declineInvite(); };
    el('mp-cf-exit').onclick = function () { Snd.click && Snd.click(); leaveCuefa(); };
    Array.prototype.forEach.call(document.querySelectorAll('#mp-cf-chips .chip'), function (b) {
      b.onclick = function () { Snd.click && Snd.click(); cuefaPick(Number(b.dataset.h)); };
    });
  }

  /* ================= кнопка в главном меню ================= */
  function installMenuButton() {
    /* v0.46: кнопка «МУЛЬТИПЛЕЕР» стоит в разметке меню вместе с остальными
       (все появляются одновременно). Тут только обработчик и подпись. */
    var b = el('b-mp');
    if (!b) return;
    b.onclick = function () {
      Snd.init && Snd.init(); Snd.click && Snd.click();
      ensureRoot();
      loadProfile(function () {
        if (!Mp.my || !Mp.my.nick) {
          el('mp-nick').value = Mp.my && Mp.my.nick ? Mp.my.nick : (VKP.user.name ? VKP.user.name.split(' ')[0] : '');
          showMp('mp-scr-profile', true);
        } else openMpMenu();
      });
    };
  }

  function openMpMenu() {
    closeMpScreens();
    ensureRoot();
    if (!Mp.my || !Mp.my.nick) { showMp('mp-scr-profile', true); return; }
    el('mp-v-rating').textContent = Mp.my.rating | 0;
    el('mp-v-rank').textContent = rankOf(Mp.my.rating | 0);
    el('mp-v-w').textContent = Mp.my.w | 0;
    el('mp-v-l').textContent = Mp.my.l | 0;
    el('mp-v-d').textContent = Mp.my.d | 0;
    try {
      var st = Mp.set || {};
      var v = (st.mode === 'cuefa' ? 'cuefa|1'
        : (st.mode === '3d' ? '3d' : 'flat') + '|' + (st.tower === false ? '0' : '1'));
      syncModeBoxes(v);
    } catch (e) {}
    showMp('mp-scr-menu', true);
    /* heartbeat */
    heartbeat();
    clearInterval(Mp.hbTimer);
    Mp.hbTimer = setInterval(heartbeat, 45000);
  }
  function heartbeat() {
    if (!Mp.my || !Mp.my.nick) return;
    var set = Mp.set || {};
    VKP.gSet('hb_' + VKP.user.id, JSON.stringify({
      n: Mp.my.nick, r: Mp.my.rating | 0,
      m: (set.mode === '3d' ? '3d' : set.mode === 'cuefa' ? 'cf' : 'fl'),
      tw: set.tower === false ? 0 : 1,
      s: Mp._active || Mp._cuefa ? 'game' : 'lobby',
      t: Date.now()
    }));
    try { VKP.gSet('rt_' + VKP.user.id, JSON.stringify({ n: Mp.my.nick, r: Mp.my.rating | 0, w: Mp.my.w | 0, l: Mp.my.l | 0 })); } catch (e) {}
  }

  function openHistory() {
    closeMpScreens();
    ensureRoot();
    var rows = (Mp.hist || []).map(function (h) {
      var res = h.r === 'W' ? t('win') : h.r === 'L' ? t('lose') : t('draw');
      return '<tr><td>' + esc(h.n || '?') + '</td><td>' + esc(h.dt || '') + '</td><td>' + res + '</td><td>' + (h.m | 0) + '</td><td>' + esc(h.md || '') + '</td></tr>';
    }).join('');
    el('mp-hist-body').innerHTML = rows ?
      '<table class="mp-tbl"><tr><th>' + t('hist_op') + '</th><th>' + t('hist_date') + '</th><th>' + t('hist_res') + '</th><th>' + t('hist_moves') + '</th><th>' + t('hist_mode') + '</th></tr>' + rows + '</table>'
      : '<p class="narr">' + t('hist_empty') + '</p>';
    showMp('mp-scr-hist', true);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }

  /* ================= лобби ================= */
  var lobbyTimer = null;
  function stopLobbyTimers() { clearInterval(lobbyTimer); lobbyTimer = null; }
  function openLobby() {
    closeMpScreens();
    showMp('mp-scr-lobby', true);
    heartbeat();
    refreshLobby();
    clearInterval(lobbyTimer);
    lobbyTimer = setInterval(refreshLobby, 5000);
  }
  function refreshLobby() {
    var now = Date.now();
    var friendIds = {};
    VKP.friends().then(function (fr) {
      fr.forEach(function (f) { friendIds[String(f.id)] = f; });
      return VKP.gGetKeys();
    }).then(function (keys) {
      keys = (keys || []).filter(function (k) { return k.indexOf('hb_') === 0 && k !== 'hb_' + VKP.user.id; });
      if (!keys.length) { renderLobbyItems([], {}); return Promise.resolve(); }
      return VKP.gGet(keys.slice(0, 60)).then(function (vals) {
        var items = [];
        keys.forEach(function (k) {
          var raw = vals[k];
          if (!raw) return;
          try {
            var o = JSON.parse(raw);
            if (!o.t || now - o.t > 5 * 60 * 1000) return;      /* TTL 5 мин */
            if (o.s === 'game') return;                           /* занят */
            var uid = k.slice(3);
            items.push({ uid: uid, nick: o.n || uid, rating: o.r | 0, mode: o.m, tw: o.tw, friend: !!friendIds[uid] });
          } catch (e) {}
        });
        items.sort(function (a, b) { return (b.friend ? 1 : 0) - (a.friend ? 1 : 0); });
        renderLobbyItems(items, friendIds);
      });
    }).catch(function () {});
  }
  function renderLobbyItems(items, friends) {
    var host = el('mp-lobby-list');
    if (!host) return;
    if (!items.length) {
      host.innerHTML = '<p class="narr" style="opacity:.7">' + (LANG === 'ru' ? 'Никого нет. Откройте игру во второй вкладке/у друга и обновите.' : 'Nobody here. Open the game in another tab / ask a friend and refresh.') + '</p>';
      return;
    }
    host.innerHTML = items.map(function (it) {
      var modeLbl = it.mode === '3d' ? t('d3') : it.mode === 'cf' ? t('cuefa') : t('flat');
      if (it.mode !== 'cf') modeLbl += ' · ' + (it.tw ? t('tower') : t('plain'));
      return '<div class="mp-item"><span class="nm">' + esc(it.nick) + '</span>' +
        '<span class="mp-pill">' + (it.rating | 0) + '</span>' +
        '<span class="mp-pill">' + modeLbl + '</span>' +
        (it.friend ? '<span class="mp-pill">VK</span>' : '') +
        '<button data-inv="' + esc(it.uid) + '">' + t('invite') + '</button></div>';
    }).join('');
    Array.prototype.forEach.call(host.querySelectorAll('[data-inv]'), function (b) {
      b.onclick = function () {
        Snd.click && Snd.click();
        var uid = b.dataset.inv;
        var it = items.filter(function (x) { return x.uid === uid; })[0] || { nick: uid };
        createMatch(uid, it.nick);
      };
    });
  }
  function quickMatch() {
    /* касса: первый подходящий открытый челлендж, иначе создаём свой */
    VKP.gGetKeys().then(function (keys) {
      keys = (keys || []).filter(function (k) { return k.indexOf('m_') === 0; });
      if (!keys.length) { createMatch(null, null); return; }
      return VKP.gGet(keys.slice(0, 40)).then(function (vals) {
        var now = Date.now();
        for (var i = 0; i < keys.length; i++) {
          var raw = vals[keys[i]];
          if (!raw) continue;
          try {
            var m = JSON.parse(raw);
            if (m.state === 'invite' && !m.b && m.a !== VKP.user.id && now - (m.ts || 0) < 24 * 3600 * 1000 && matchModeOk(m)) {
              joinMatch(m); return;
            }
          } catch (e) {}
        }
        createMatch(null, null);
      });
    }).catch(function () { createMatch(null, null); });
  }
  function matchModeOk(m) {
    var sel = (el('mp-mode') && el('mp-mode').value || 'flat|1').split('|');
    return m.mode === sel[0] && (m.mode === 'cuefa' || ((m.tower ? 1 : 0) === Number(sel[1])));
  }

  /* ================= матч: создание / вступление ================= */
  function currentModeSel() {
    var sel = (el('mp-mode') && el('mp-mode').value || 'flat|1').split('|');
    return { mode: sel[0], tower: sel[1] !== '0' };
  }
  function createMatch(oppUid, oppNick) {
    var md = currentModeSel();
    var id = VKP.user.id + '_' + Date.now().toString(36);
    var m = {
      id: id, a: String(VKP.user.id), b: oppUid ? String(oppUid) : null,
      aNick: Mp.my.nick, bNick: oppNick || null,
      mode: md.mode, tower: !!md.tower,
      seed: Math.floor(Math.random() * 1e9),
      first: Math.random() < 0.5 ? 'a' : 'b',
      state: 'invite', seq: 0, ts: Date.now(), deadline: Date.now() + 48 * 3600 * 1000, ver: APP_VERSION
    };
    Mp.pendingMatch = m;
    VKP.gSet('m_' + id, JSON.stringify(m)).then(function () {
      if (oppUid) {
        VKP.invite(oppUid, t('title') + ' · ' + (md.mode === 'cuefa' ? t('cuefa') : (md.mode === '3d' ? t('d3') : t('flat'))), 'rpsb_' + id);
        showMp('mp-scr-lobby', false);
        el('mp-wait-txt').textContent = t('invited') + ' — ' + t('waiting');
        showMp('mp-scr-wait', true);
        startWaitPoll();
      } else {
        /* открытая касса — ждём любого */
        showMp('mp-scr-lobby', false);
        el('mp-wait-txt').textContent = t('waiting');
        showMp('mp-scr-wait', true);
        startWaitPoll();
      }
    });
  }
  function joinMatch(m) {
    m.b = String(VKP.user.id);
    m.bNick = Mp.my.nick;
    m.state = 'ready';
    m.joinedAt = Date.now();
    VKP.gSet('m_' + m.id, JSON.stringify(m)).then(function () {
      startMatch(m);
    });
  }
  function acceptInvite() {
    var m = Mp.incoming;
    showMp('mp-scr-inv', false);
    if (!m) return;
    if (!m.b) joinMatch(m);
    else { m.state = 'ready'; VKP.gSet('m_' + m.id, JSON.stringify(m)); startMatch(m); }
    Mp.incoming = null;
  }
  function declineInvite() {
    showMp('mp-scr-inv', false);
    var m = Mp.incoming;
    if (m) {
      m.state = 'declined';
      VKP.gSet('m_' + m.id, JSON.stringify(m)).then(function () {
        VKP.gSet('m_' + m.id, '');
      });
    }
    Mp.incoming = null;
    openLobby();
  }

  var waitPoll = null;
  function startWaitPoll() {
    clearInterval(waitPoll);
    waitPoll = setInterval(function () {
      var m = Mp.pendingMatch;
      if (!m) { clearInterval(waitPoll); return; }
      VKP.gGet(['m_' + m.id]).then(function (d) {
        var raw = d['m_' + m.id];
        if (!raw) return;
        try {
          var cur = JSON.parse(raw);
          if (cur.state === 'ready' && (cur.b || cur.joinedAt)) {
            clearInterval(waitPoll);
            startMatch(cur);
          } else if (cur.state === 'declined') {
            clearInterval(waitPoll);
            showMp('mp-scr-wait', false);
            openLobby();
          }
        } catch (e) {}
      });
    }, 2000);
  }
  function cancelWaiting() {
    clearInterval(waitPoll);
    var m = Mp.pendingMatch;
    if (m) { m.state = 'cancelled'; VKP.gSet('m_' + m.id, '').then(function () { VKP.gSet('m_' + m.id, ''); }); }
    Mp.pendingMatch = null;
    showMp('mp-scr-wait', false);
    openLobby();
  }

  /* ================= старт сетевой партии (доска) ================= */
  function startMatch(m) {
    stopLobbyTimers(); clearInterval(waitPoll);
    Mp.pendingMatch = null;
    Mp.match = {
      id: m.id,
      mode: m.mode === '3d' ? '3d' : m.mode === 'cuefa' ? 'cuefa' : 'flat',
      tower: !!m.tower,
      seed: m.seed | 0,
      myTeam: String(m.a) === String(VKP.user.id) ? 'player' : 'ai',
      first: m.first === 'b' ? 'ai' : 'player',
      oppUid: String(m.a) === String(VKP.user.id) ? String(m.b || '') : String(m.a),
      oppNick: (String(m.a) === String(VKP.user.id) ? m.bNick : m.aNick) || (LANG === 'ru' ? 'Соперник' : 'Opponent'),
      /* seq=-1: первый writeSnapshot даст снимок №0 (его грузит гость) */
      seq: -1
    };
    Mp.ended = false;
    Mp._active = true;
    document.body.classList.add('mp-on');
    closeMpScreens();

    if (Mp.match.mode === 'cuefa') { startCuefa(m); return; }

    /* доска: flat или 3d */
    try { chooseMode(Mp.match.mode === '3d' ? 'sandwich' : 'flat'); } catch (e) {}
    try { loadLayer(1); } catch (e) {}
    game.aiLevel = 1;
    game.turn = Mp.match.first;
    game.boomCharges = 0; game.aiBoomCharges = 0; game.boomStreak = 0; game.aiBoomStreak = 0; game.boomMeter = 0;

    if (Mp.match.myTeam === 'ai') {
      /* гость видит свою армию снизу: разворачиваем камеру */
      game.angle = (game.angle || 0) + Math.PI;
    }

    if (Mp.match.myTeam === 'player') {
      /* host: пишем начальный снимок (истина раскладки) */
      writeSnapshot().then(function () {
        if (game.turn !== Mp.match.myTeam) onOpponentTurn();
        else hintS(function () { return (LANG === 'ru' ? 'Мультиплеер: твой ход. Соперник: ' : 'Multiplayer: your turn. Opponent: ') + Mp.match.oppNick; });
      });
    } else {
      /* гость: подтягиваем снимок №0 от host */
      hintS(function () { return LANG === 'ru' ? 'Загружаем позицию…' : 'Loading position…'; });
      loadSnapshot(0).then(function (ok) {
        if (!ok) {
          /* host мог ещё не записать снимок — опрос (next=seq+1=0) подхватит его */
          hintS(function () { return t('net_wait'); });
          onOpponentTurn();
          return;
        }
        if (checkEnd()) return;
        if (game.turn !== Mp.match.myTeam) onOpponentTurn();
        else hintS(function () { return (LANG === 'ru' ? 'Мультиплеер: твой ход. Соперник: ' : 'Multiplayer: your turn. Opponent: ') + Mp.match.oppNick; });
      });
    }
    renderHUD();
  }

  /* ================= снимки состояния ================= */
  function snapEncode() {
    var tiles = game.tiles.filter(function (x) { return x && !x.gone; }).map(function (x) {
      return [x.face, x.row, x.col, x.type, x.team === 'ai' ? 1 : 0, x.color | 0, x.hero ? 1 : 0, x.tk | 0, x.cd | 0];
    });
    return {
      s: Mp.match.seq, t: game.turn, n: game.turnNumber | 0,
      tiles: tiles,
      cap: { p: (game.captured && game.captured.player || []).slice(), a: (game.captured && game.captured.ai || []).slice() },
      np: game.noProgress | 0, ms: game.movesSinceCapture | 0,
      ph: game.posHashes || {}
    };
  }
  function writeSnapshot() {
    if (!Mp.match || Mp.match.mode === 'cuefa') return Promise.resolve();
    Mp.match.seq = (Mp.match.seq | 0) + 1;
    var payload = snapEncode();
    payload.s = Mp.match.seq;
    return VKP.gSet('mv_' + Mp.match.id + '_' + Mp.match.seq, JSON.stringify(payload)).then(function () {
      /* обновляем только seq/deadline в заголовке */
      return VKP.gGet(['m_' + Mp.match.id]).then(function (d) {
        try {
          var m = JSON.parse(d['m_' + Mp.match.id] || '{}');
          if (m && m.id) {
            m.seq = Mp.match.seq;
            m.deadline = Date.now() + 24 * 3600 * 1000;
            return VKP.gSet('m_' + Mp.match.id, JSON.stringify(m));
          }
        } catch (e) {}
      });
    });
  }
  function loadSnapshot(seq) {
    return VKP.gGet(['mv_' + Mp.match.id + '_' + seq]).then(function (d) {
      var raw = d['mv_' + Mp.match.id + '_' + seq];
      if (!raw) return false;
      try {
        applySnap(JSON.parse(raw));
        Mp.match.seq = seq;
        return true;
      } catch (e) { console.warn('snap apply', e); return false; }
    });
  }
  function applySnap(s) {
    clearField();
    game.tiles = [];
    (s.tiles || []).forEach(function (r) {
      var tk = mkTile(r[0], r[1], r[2], r[3], r[4] ? 'ai' : 'player');
      tk.color = r[5] | 0; tk.hero = !!r[6]; tk.tk = r[7] | 0; tk.cd = r[8] | 0;
    });
    game.captured = { player: (s.cap && s.cap.p || []).slice(), ai: (s.cap && s.cap.a || []).slice() };
    game.turn = s.t === 'ai' ? 'ai' : 'player';
    game.turnNumber = s.n | 0;
    game.noProgress = s.np | 0;
    game.movesSinceCapture = s.ms | 0;
    game.posHashes = s.ph || {};
    game.selected = null;
    game.phase = 'play';
    game.locked = false;
    game.aiThinking = false;
    rebuildGrid(); recountPieces();
    try { renderCaptured(); } catch (e) {}
    try { updateTowerThreat(); } catch (e) {}
    try { renderHUD(); drawMinimap(); } catch (e) {}
    saveGame && saveGame();
  }

  /* ================= ход соперника / мой ход ================= */
  function onOpponentTurn() {
    if (!Mp.active() || Mp.match.mode === 'cuefa') return;
    Mp.waiting = true;
    game.aiThinking = false;
    game.phase = 'play';
    hintS(function () { return t('net_wait'); });
    renderHUD();
    startMatchPoll();
  }
  Mp.onOpponentTurn = onOpponentTurn;

  var matchPoll = null;
  function startMatchPoll() {
    clearInterval(matchPoll);
    matchPoll = setInterval(pollOnce, 2500);
    pollOnce();
  }
  function stopMatchPoll() { clearInterval(matchPoll); matchPoll = null; }
  function pollOnce() {
    if (!Mp.active() || Mp.ended) { stopMatchPoll(); return; }
    var next = (Mp.match.seq | 0) + 1;
    VKP.gGet(['mv_' + Mp.match.id + '_' + next, 'res_' + Mp.match.id + '_' + Mp.match.oppUid, 'm_' + Mp.match.id]).then(function (d) {
      if (!Mp.active() || Mp.ended) return;
      var raw = d['mv_' + Mp.match.id + '_' + next];
      if (raw) {
        try {
          var s = JSON.parse(raw);
          applySnap(s);
          Mp.match.seq = next;
          Mp.waiting = false;
          stopMatchPoll();
          Snd.turnSwitch && Snd.turnSwitch();
          hintS(function () { return t('opp_moved') + ' — ' + t('your_turn'); });
          if (checkEnd()) return;
          if (game.turn !== Mp.match.myTeam) { onOpponentTurn(); return; }
          renderHUD();
        } catch (e) { console.warn(e); }
        return;
      }
      /* соперник заявил результат (например, увидел конец раньше нас) */
      var res = d['res_' + Mp.match.id + '_' + Mp.match.oppUid];
      if (res && !Mp.lastResult) {
        var mine = res === 'W' ? 'L' : res === 'L' ? 'W' : 'D';
        finishMatch(mine, 'remote', true);
        return;
      }
      /* таймаут хода */
      try {
        var hdr = JSON.parse(d['m_' + Mp.match.id] || 'null');
        if (hdr && hdr.deadline && Date.now() > hdr.deadline) {
          var b = el('mp-forfeit-btn');
          if (!b) {
            b = document.createElement('button');
            b.id = 'mp-forfeit-btn';
            b.textContent = t('claim_win');
            b.style.cssText = 'position:fixed;right:12px;bottom:88px;z-index:65';
            b.onclick = function () { finishMatch('W', 'timeout'); };
            document.body.appendChild(b);
          }
        }
      } catch (e) {}
    });
  }

  function onMyMoveDone() {
    if (!Mp.active() || Mp.match.mode === 'cuefa') return;
    var fb = el('mp-forfeit-btn');
    if (fb) fb.remove();
    if (Mp.ended) {
      /* финальная позиция всё равно нужна сопернику */
      writeSnapshot();
      return;
    }
    writeSnapshot().then(function () {
      if (game.turn !== Mp.match.myTeam && game.phase !== 'end') onOpponentTurn();
    });
  }
  Mp.onMyMoveDone = onMyMoveDone;

  /* ================= конец партии ================= */
  Mp.checkEndOverride = function (orig) {
    if (!Mp.active() || Mp.match.mode === 'cuefa' || Mp.match.tower) return orig();
    /* режим «без башни»: победа = все фишки соперника съедены / нет ходов */
    if (game.training) return false;
    recountPieces();
    var oppAlive = game.tiles.some(function (t2) { return !t2.gone && t2.team !== Mp.match.myTeam && t2.type !== TOWER; });
    var myAlive = game.tiles.some(function (t2) { return !t2.gone && t2.team === Mp.match.myTeam && t2.type !== TOWER; });
    if (!oppAlive) { endLayer('win', 'clear'); return true; }
    if (!myAlive) { endLayer('lose', 'clear'); return true; }
    var h = posHash();
    game.posHashes[h] = (game.posHashes[h] || 0) + 1;
    if (game.posHashes[h] >= 3) { endLayer('draw'); return true; }
    if (!hasAnyMoveTeam('player') && !hasAnyMoveTeam('ai')) { endLayer('draw'); return true; }
    return false;
  };

  function onGameEnd(result, reason) {
    if (!Mp.active() || Mp._cuefa) return;
    var myRes = result === 'draw' ? 'D' : ((result === 'win') === (Mp.match.myTeam === 'player')) ? 'W' : 'L';
    finishMatch(myRes, reason || 'board');
  }
  Mp.onGameEnd = onGameEnd;

  function finishMatch(myRes, reason, fromRemote) {
    if (!Mp.match || Mp.ended) return;
    Mp.ended = true;
    Mp.waiting = false;
    stopMatchPoll();
    var oppUid = Mp.match.oppUid || 'x';
    var delta = applyRating(myRes, oppUid);
    var moves = game.turnNumber | 0;
    pushHistory({
      n: Mp.match.oppNick, dt: new Date().toISOString().slice(0, 10),
      r: myRes, m: moves, md: (Mp.match.mode === '3d' ? t('d3') : Mp.match.mode === 'cuefa' ? t('cuefa') : t('flat')) + (Mp.match.mode === 'cuefa' ? '' : ' · ' + (Mp.match.tower ? t('tower') : t('plain'))),
      dr: delta
    });
    /* заявление результата (двойное подтверждение) */
    try { VKP.gSet('res_' + Mp.match.id + '_' + VKP.user.id, myRes); } catch (e) {}

    /* UI */
    var fb = el('mp-forfeit-btn');
    if (fb) fb.remove();
    if (Mp._cuefa) { cuefaShowFinal(myRes, delta); return; }
    var title = el('end-title');
    if (title) {
      title.textContent = myRes === 'W' ? t('win') : myRes === 'L' ? t('lose') : t('draw');
      var txt = el('end-text');
      if (txt) txt.textContent = Mp.myNick() + ' ' + (Mp.my.rating | 0) + (delta ? ' (' + (delta > 0 ? '+' : '') + delta + ')' : '') + ' · ' + t('vs') + ' ' + Mp.match.oppNick;
      var sc = el('end-score');
      if (sc) sc.textContent = t('rated_note') + ' · ' + t('moves') + ': ' + moves;
      var nx = el('end-next');
      if (nx) nx.style.display = 'none';
      var retry = el('end-retry');
      if (retry) { retry.textContent = t('revanche'); retry.onclick = function () { closeOv && closeOv(); revanche(); }; }
      var menu = el('end-menu');
      if (menu) menu.onclick = function () {
        closeOv && closeOv();
        leaveToMenu();
      };
      var ov = el('ov-end');
      if (ov) {
        ov.classList.toggle('lose', myRes === 'L');
        ov.classList.toggle('draw', myRes === 'D');
        ov.classList.add('on');
      }
    }
    /* лёгкая сверка с заявлением соперника (2 мин) */
    var t0 = Date.now();
    var chk = setInterval(function () {
      if (Date.now() - t0 > 120000) { clearInterval(chk); return; }
      VKP.gGet(['res_' + Mp.match.id + '_' + Mp.match.oppUid]).then(function (d) {
        var theirs = d['res_' + Mp.match.id + '_' + Mp.match.oppUid];
        if (!theirs) return;
        clearInterval(chk);
        var expect = myRes === 'W' ? 'L' : myRes === 'L' ? 'W' : 'D';
        if (theirs !== expect) {
          revertRating(myRes, oppUid);
          var txt = el('end-text');
          if (txt) txt.textContent = t('disputed');
          pushHistory({ n: Mp.match.oppNick, dt: new Date().toISOString().slice(0, 10), r: myRes, m: moves, md: t('disputed'), dr: 0 });
        }
        /* GC ключей партии */
        gcMatch(Mp.match.id, Mp.match.seq | 0);
      });
    }, 8000);
  }

  function gcMatch(id, seq) {
    for (var i = 0; i <= seq + 2; i++) {
      (function (k) { setTimeout(function () { VKP.gSet('mv_' + id + '_' + k, ''); }, k * 220); })(i);
    }
    setTimeout(function () { VKP.gSet('m_' + id, ''); }, (seq + 3) * 220);
    setTimeout(function () { VKP.gSet('res_' + id + '_' + VKP.user.id, ''); }, (seq + 4) * 220);
  }

  function revanche() {
    if (!Mp.match) return;
    var prev = Mp.match;
    Mp.match = null; Mp.ended = false; Mp._active = false;
    document.body.classList.remove('mp-on');
    createMatch(prev.oppUid, prev.oppNick);
  }
  function leaveToMenu() {
    stopMatchPoll();
    if (Mp.match && !Mp.ended) {
      /* досрочный выход = поражение */
      finishMatch('L', 'leave');
    }
    Mp.match = null; Mp.ended = false; Mp._active = false; Mp._cuefa = false;
    document.body.classList.remove('mp-on');
    var cf = el('mp-cuefa-screen');
    if (cf) cf.classList.remove('on');
    try { restoreEndButtons(); } catch (e) {}
    try { show('scr-start', true); } catch (e) {}
    openMpMenu();
  }

  /* ================= Цу-е-фа: commit-reveal ================= */
  var CF = { round: 1, myScore: 0, oppScore: 0, salt: null, move: 0, phase: 'idle', timer: null, phaseT0: 0 };
  var CF_WIN = 5;

  function startCuefa(m) {
    Mp._cuefa = true;
    Mp._active = true;
    CF.round = 1; CF.myScore = 0; CF.oppScore = 0; CF.phase = 'idle'; CF.move = 0;
    el('mp-cuefa-screen').classList.add('on');
    el('mp-cf-title').textContent = t('cuefa') + ' · ' + t('cuefa_to') + ' · ' + t('vs') + ' ' + Mp.match.oppNick;
    el('mp-cf-score').textContent = '0 : 0';
    el('mp-cf-my').textContent = '❔';
    el('mp-cf-opp').textContent = '❔';
    el('mp-cf-msg').textContent = t('choose_hand');
    cuefaRound();
  }
  function cuefaHash(move, salt, uid) {
    /* uid — автор коммита (для верификации чужого хэша передаём uid соперника) */
    var s = move + '|' + salt + '|' + Mp.match.id + '|' + CF.round + '|' + (uid || VKP.user.id);
    /* SHA-256 через WebCrypto; фолбэк — простой хэш */
    try {
      if (window.crypto && crypto.subtle && crypto.subtle.digest) {
        var enc = new TextEncoder().encode(s);
        return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        });
      }
    } catch (e) {}
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return Promise.resolve('f' + h.toString(16));
  }
  function cuefaRound() {
    CF.phase = 'commit';
    CF.done = false;
    CF.move = 0;
    CF.salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    el('mp-cf-my').textContent = '❔';
    el('mp-cf-opp').textContent = '❔';
    el('mp-cf-msg').textContent = t('choose_hand');
    cuefaSetChips(true);
    clearInterval(CF.timer);
    CF.phaseT0 = Date.now();
    CF.timer = setInterval(cuefaPoll, 1500);
  }
  function cuefaSetChips(on) {
    Array.prototype.forEach.call(document.querySelectorAll('#mp-cf-chips .chip'), function (b) {
      b.disabled = !on;
      b.style.opacity = on ? '1' : '.45';
    });
  }
  function cuefaPick(h) {
    if (CF.phase !== 'commit' || CF.move) return;
    CF.move = h;
    cuefaSetChips(false);
    el('mp-cf-my').textContent = ['❔', '✊', '✌️', '✋'][h];
    el('mp-cf-msg').textContent = t('waiting_choice');
    cuefaHash(h, CF.salt).then(function (hash) {
      return VKP.gSet('cf_' + Mp.match.id + '_' + CF.round + '_' + VKP.user.id + '_c', hash);
    }).then(function () {
      CF.phase = 'commit_sent';
    });
  }
  function cuefaPoll() {
    if (!Mp._cuefa || Mp.ended) { clearInterval(CF.timer); return; }
    var r = CF.round;
    var keys = [
      'cf_' + Mp.match.id + '_' + r + '_' + Mp.match.oppUid + '_c',
      'cf_' + Mp.match.id + '_' + r + '_' + Mp.match.oppUid + '_v',
      'cf_' + Mp.match.id + '_' + r + '_' + VKP.user.id + '_v'
    ];
    VKP.gGet(keys).then(function (d) {
      if (!Mp._cuefa || Mp.ended) return;
      var oppC = d[keys[0]], oppV = d[keys[1]], myV = d[keys[2]];
      if (CF.phase === 'commit' || CF.phase === 'commit_sent') {
        /* таймаут commit — 30 с: я не выбрал — раунд проигран (если соперник выбрал) */
        if (!CF.move && Date.now() - CF.phaseT0 > 30000) {
          cuefaFinishRound(0, oppC ? 1 : 0, 'no_show');
          return;
        }
        if (oppC && CF.move && CF.phase === 'commit_sent') {
          /* оба закоммичены — раскрываем */
          CF.phase = 'reveal';
          el('mp-cf-msg').textContent = t('reveal');
          VKP.gSet('cf_' + Mp.match.id + '_' + r + '_' + VKP.user.id + '_v', CF.move + '|' + CF.salt);
        }
        return;
      }
      if (CF.phase === 'reveal') {
        if (oppV) {
          var parts = String(oppV).split('|');
          var oppMove = Number(parts[0]) | 0, oppSalt = parts[1] || '';
          cuefaHash(oppMove, oppSalt, Mp.match.oppUid).then(function (h) {
            if (h !== oppC) { cuefaFinishRound(1, 0, 'commit_bad'); return; }
            el('mp-cf-opp').textContent = ['❔', '✊', '✌️', '✋'][oppMove] || '❔';
            var mine = CF.move, theirs = oppMove;
            /* res: 1 — я выиграл раунд; 1=✊,2=✌️,3=✋ */
            var res = mine === theirs ? 0 : ((mine === 1 && theirs === 3) || (mine === 2 && theirs === 1) || (mine === 3 && theirs === 2)) ? -1 : 1;
            if (res > 0) cuefaFinishRound(1, 0, 'ok');
            else if (res < 0) cuefaFinishRound(0, 1, 'ok');
            else cuefaFinishRound(0, 0, 'ok');
          });
          CF.phase = 'verify';
        } else if (Date.now() - CF.phaseT0 > 60000) {
          /* соперник не раскрыл */
          cuefaFinishRound(1, 0, 'no_show');
        }
        return;
      }
    });
  }
  function cuefaFinishRound(myAdd, oppAdd, reason) {
    if (CF.done) return;          /* защита от двойного зачёта (гонка опросов) */
    CF.done = true;
    clearInterval(CF.timer);
    CF.myScore += myAdd;
    CF.oppScore += oppAdd;
    el('mp-cf-score').textContent = CF.myScore + ' : ' + CF.oppScore;
    if (reason === 'commit_bad') el('mp-cf-msg').textContent = t('commit_bad');
    else if (reason === 'no_show') el('mp-cf-msg').textContent = myAdd ? t('no_show') : t('you_lost_round');
    else el('mp-cf-msg').textContent = myAdd ? t('you_won_round') : oppAdd ? t('you_lost_round') : t('draw_round');

    if (CF.myScore >= CF_WIN || CF.oppScore >= CF_WIN) {
      setTimeout(function () {
        var myRes = CF.myScore > CF.oppScore ? 'W' : CF.myScore < CF.oppScore ? 'L' : 'D';
        finishMatch(myRes, 'cuefa');
      }, 900);
      return;
    }
    CF.round++;
    setTimeout(function () {
      if (Mp._cuefa && !Mp.ended) { CF.phaseT0 = Date.now(); cuefaRound(); }
    }, 1200);
  }
  function cuefaShowFinal(myRes, delta) {
    el('mp-cf-msg').textContent = (myRes === 'W' ? t('win') : myRes === 'L' ? t('lose') : t('draw')) +
      ' · ' + Mp.myNick() + ' ' + (Mp.my.rating | 0) + (delta ? ' (' + (delta > 0 ? '+' : '') + delta + ')' : '') + ' · ' + t('vs') + ' ' + Mp.match.oppNick;
    cuefaSetChips(false);
    el('mp-cf-exit').textContent = t('to_menu');
  }
  function leaveCuefa() {
    clearInterval(CF.timer);
    var cf = el('mp-cuefa-screen');
    if (cf) cf.classList.remove('on');
    if (Mp._cuefa && !Mp.ended && Mp.match) {
      /* не доиграли — поражение */
      Mp._cuefa = false;
      finishMatch('L', 'leave');
    }
    Mp._cuefa = false;
    Mp.match = null;
    Mp._active = false;
    Mp.ended = false;
    document.body.classList.remove('mp-on');
    openMpMenu();
  }

  /* ================= обёртки игрового ядра ================= */
  function installWrappers() {
    /* runGenieTurn: в MP — ожидание хода соперника вместо ИИ */
    var origGenie = window.runGenieTurn;
    window.runGenieTurn = function () {
      if (Mp.active() && Mp.match.mode !== 'cuefa') {
        if (game.turn !== Mp.match.myTeam) return onOpponentTurn();
        return Promise.resolve();
      }
      return origGenie.apply(this, arguments);
    };

    /* afterAction: после своего хода публикуем снимок */
    var origAfter = window.afterAction;
    window.afterAction = function () {
      var self = this, args = arguments;
      return origAfter.apply(self, args).then(function () {
        try { if (Mp.active() && Mp.match.mode !== 'cuefa') onMyMoveDone(); } catch (e) { console.warn(e); }
      });
    };

    /* endLayer: сетевой итог */
    var origEnd = window.endLayer;
    window.endLayer = function (result, reason) {
      origEnd.apply(this, arguments);
      try { onGameEnd(result, reason); } catch (e) { console.warn(e); }
    };

    /* checkEnd: режим «без башни» */
    var origCheck = window.checkEnd;
    window.checkEnd = function () {
      try { return Mp.checkEndOverride(origCheck); } catch (e) { return origCheck(); }
    };

    /* renderHUD: имена игроков */
    var origHud = window.renderHUD;
    window.renderHUD = function () {
      origHud.apply(this, arguments);
      try { Mp.hudLabels(); } catch (e) {}
    };

    /* executeBoom: в MP выключен */
    if (window.executeBoom) {
      var origBoom = window.executeBoom;
      window.executeBoom = function () {
        if (Mp.active()) { Snd.nope && Snd.nope(); return; }
        return origBoom.apply(this, arguments);
      };
    }

    /* сохраняем оригинальные обработчики финального экрана (для restore после MP) */
    Mp._origEndBtns = {
      retry: el('end-retry') ? el('end-retry').onclick : null,
      menu: el('end-menu') ? el('end-menu').onclick : null,
      next: el('end-next') ? el('end-next').onclick : null
    };
  }

  function restoreEndButtons() {
    if (!Mp._origEndBtns) return;
    var r = el('end-retry'), m = el('end-menu'), n = el('end-next');
    if (r) { r.onclick = Mp._origEndBtns.retry; r.textContent = (LANG === 'ru' ? 'Ещё раз' : 'Again'); }
    if (m) m.onclick = Mp._origEndBtns.menu;
    if (n) n.onclick = Mp._origEndBtns.next;
  }

  Mp.hudLabels = function () {
    if (!Mp.active() || !Mp.match || Mp.match.mode === 'cuefa') return;
    var tb = el('turnbadge');
    if (tb) {
      var mine = game.turn === Mp.match.myTeam;
      tb.textContent = mine ? t('your_turn') : (t('opp_turn') + ' · ' + Mp.match.oppNick);
      tb.style.color = mine ? '#3ddc84' : '#e8c56a';
    }
    var pbs = document.querySelectorAll('.pbadge');
    if (pbs.length >= 2) {
      pbs[0].textContent = Mp.myNick();
      pbs[1].textContent = Mp.match.oppNick;
    }
    /* подписи очков */
    var labels = document.querySelectorAll('#hud [data-i="genie"],#hud [data-i="alchemist"]');
    Array.prototype.forEach.call(labels, function (e2) {
      if (e2.dataset.i === 'genie') e2.textContent = Mp.match.oppNick;
      else e2.textContent = Mp.myNick();
    });
  };

  /* ================= приглашение по ссылке ВК ================= */
  function checkLaunchInvite() {
    var rk = VKP.launch.request_key || VKP.launch.vk_request_key || '';
    if (!rk || rk.indexOf('rpsb_') !== 0) return;
    var id = rk.slice(5);
    VKP.gGet(['m_' + id]).then(function (d) {
      var raw = d['m_' + id];
      if (!raw) return;
      try {
        var m = JSON.parse(raw);
        if (m.state === 'invite') {
          Mp.incoming = m;
          ensureRoot();
          el('mp-inv-txt').textContent = (m.aNick || '?') + ' · ' + (m.mode === 'cuefa' ? t('cuefa') : m.mode === '3d' ? t('d3') : t('flat')) + (m.mode !== 'cuefa' ? ' · ' + (m.tower ? t('tower') : t('plain')) : '');
          showMp('mp-scr-inv', true);
        }
      } catch (e) {}
    });
  }
  /* опрос входящих приглашений в лобби */
  var invScan = null;
  function scanInvites() {
    if (Mp.active() || Mp._cuefa) return;
    VKP.gGetKeys().then(function (keys) {
      keys = (keys || []).filter(function (k) { return k.indexOf('m_') === 0; });
      if (!keys.length) return;
      return VKP.gGet(keys.slice(0, 30)).then(function (vals) {
        for (var i = 0; i < keys.length; i++) {
          try {
            var m = JSON.parse(vals[keys[i]] || 'null');
            if (m && m.state === 'invite' && String(m.a) !== String(VKP.user.id) && (!m.b || String(m.b) === String(VKP.user.id)) && Date.now() - (m.ts || 0) < 24 * 3600 * 1000) {
              if (Mp.incoming && Mp.incoming.id === m.id) return;
              Mp.incoming = m;
              ensureRoot();
              el('mp-inv-txt').textContent = (m.aNick || '?') + ' · ' + (m.mode === 'cuefa' ? t('cuefa') : m.mode === '3d' ? t('d3') : t('flat')) + (m.mode !== 'cuefa' ? ' · ' + (m.tower ? t('tower') : t('plain')) : '');
              showMp('mp-scr-inv', true);
              return;
            }
          } catch (e) {}
        }
      });
    }).catch(function () {});
  }
  Mp.scanInvites = scanInvites;

  /* ================= boot ================= */
  Mp.boot = function () {
    VKP.ready.then(function () {
      installMenuButton();
      installWrappers();
      loadProfile(function () {
        checkLaunchInvite();
      });
      /* периодический опрос приглашений, пока игрок в меню MP */
      clearInterval(invScan);
      invScan = setInterval(function () {
        var inMp = el('mp-scr-menu') && el('mp-scr-menu').classList.contains('on') ||
          el('mp-scr-lobby') && el('mp-scr-lobby').classList.contains('on') ||
          el('mp-scr-wait') && el('mp-scr-wait').classList.contains('on');
        if (inMp) scanInvites();
      }, 6000);
    });
  };

  /* смена языка — обновляем надписи MP */
  var origApplyLang = window.applyLang;
  if (origApplyLang) {
    window.applyLang = function () {
      origApplyLang.apply(this, arguments);
      try {
        if (el('mp-root')) {
          /* проще пересоздать: данные введённые не теряем (ник в профиле) */
          var prof = el('mp-scr-profile'), menu = el('mp-scr-menu');
          var profOn = prof && prof.classList.contains('on'), menuOn = menu && menu.classList.contains('on');
          var root = el('mp-root');
          root.remove();
          ensureRoot();
          if (profOn) showMp('mp-scr-profile', true);
          if (menuOn) openMpMenu();
        }
        installMenuButton();
      } catch (e) {}
    };
  }

  /* ================= тестовые хуки (автотесты; в игре не используются) ================= */
  Mp._dbg = {
    openLobby: openLobby,
    refreshLobby: refreshLobby,
    createMatch: createMatch,
    joinMatch: joinMatch,
    quickMatch: quickMatch,
    startMatch: startMatch,
    writeSnapshot: writeSnapshot,
    loadSnapshot: loadSnapshot,
    pollOnce: pollOnce,
    finishMatch: finishMatch,
    cuefaRound: cuefaRound,
    setNick: function (n) { Mp.my = Mp.my || { rating: 0, w: 0, l: 0, d: 0 }; Mp.my.nick = n; saveProfile(); }
  };
})();
