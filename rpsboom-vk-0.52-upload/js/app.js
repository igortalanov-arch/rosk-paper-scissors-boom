/* ============================================================
 * app.js · v0.42 · Обвязка запуска
 * - версия приложения (в заголовке и window.APP_VERSION)
 * - старт VK-платформы, мультиплеера и кнопки хот-сита
 * ============================================================ */
(function () {
  'use strict';
  window.APP_VERSION = window.APP_VERSION || '0.52';

  function setVersion() {
    try {
      var suffix = ' · v' + window.APP_VERSION;
      document.title = (LANG === 'ru'
        ? 'Камень-Ножницы-Бум! Алхимик против Джина'
        : 'Rock-Paper-Boom! Alchemist vs Genie') + suffix;
    } catch (e) {}
    /* v0.42: плашка «vX · VK Mini Apps · MP · HS» внизу меню убрана */
  }

  function bootApp() {
    try { setVersion(); } catch (e) {}
    try { if (window.Mp && Mp.boot) Mp.boot(); } catch (e) { console.warn('[boot] Mp', e); }
    try { if (window.HS && HS.installButton) HS.installButton(); } catch (e) { console.warn('[boot] HS', e); }
    /* кнопка хот-сита может пережить пересборку меню — подстраховываемся */
    try {
      if (window.HS && HS.installButton) {
        var re = function () { try { HS.installButton(); } catch (e) {} };
        setTimeout(re, 700); setTimeout(re, 2500);
        window.addEventListener('load', re);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(bootApp, 0); });
  } else {
    setTimeout(bootApp, 0);
  }
})();
