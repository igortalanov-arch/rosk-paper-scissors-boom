/* ============================================================
 * ads.js · v0.45 · Реклама VK Mini Apps (rewarded)
 * Тот же подход, что в «Факт-бум 1.47»:
 *   VKWebAppShowNativeAds { ad_format: 'reward' } c таймаутом 90 с;
 *   награда — только при полном просмотре (result === true);
 *   звук игры на время ролика глушится;
 *   вне ВК (локальный файл, обычная вкладка) — гость: рекламы нет,
 *   награда не выдаётся, игра продолжается без падений.
 * ============================================================ */
(function () {
  'use strict';

  var AD_TIMEOUT = 90000;
  var busy = false, adRunning = false, musicWasOn = false;

  function bridge() {
    try { return window.vkBridge || window.vkConnect || null; } catch (e) { return null; }
  }
  function send(method, params) {
    var b = bridge();
    if (!b) return Promise.reject(new Error('vk bridge unavailable'));
    try {
      if (typeof b.sendPromise === 'function') return b.sendPromise(method, params);
      if (typeof b.send === 'function') return b.send(method, params);
    } catch (e) { return Promise.reject(e); }
    return Promise.reject(new Error('vk bridge send unavailable'));
  }
  function deadline(promise, ms) {
    var t;
    return Promise.race([
      promise,
      new Promise(function (_, rej) {
        t = setTimeout(function () { rej(new Error('ad timeout')); }, ms);
      })
    ]).then(function (v) { clearTimeout(t); return v; }, function (e) { clearTimeout(t); throw e; });
  }

  /* внутри ВК? (file:// — всегда гость) */
  function inVk() {
    try {
      if (typeof location !== 'undefined' && location.protocol === 'file:') return false;
      if (window.VKP && window.VKP.isVk) return true;
      var b = bridge();
      if (!b) return false;
      return !!((b.isWebView && b.isWebView()) || (b.isIframe && b.isIframe()));
    } catch (e) { return false; }
  }

  function pauseSound() {
    try {
      if (typeof Music !== 'undefined' && Music && Music.timer) { musicWasOn = true; Music.stop(); }
    } catch (e) {}
    try {
      if (typeof Snd !== 'undefined' && Snd && Snd.ctx && Snd.ctx.state === 'running') Snd.ctx.suspend();
    } catch (e) {}
  }
  function resumeSound() {
    try {
      if (typeof Snd !== 'undefined' && Snd && Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
    } catch (e) {}
    try {
      if (musicWasOn && typeof Music !== 'undefined' && Music && Music.start) Music.start();
    } catch (e) {}
    musicWasOn = false;
  }

  /* true — ролик досмотрен до конца, можно выдавать награду */
  function showRewarded() {
    if (busy) return Promise.resolve(false);
    if (!inVk()) return Promise.resolve(false);
    busy = true; adRunning = true;
    pauseSound();
    return deadline(send('VKWebAppShowNativeAds', { ad_format: 'reward' }), AD_TIMEOUT)
      .then(function (r) { return !!(r && r.result); })
      .catch(function () { return false; })
      .then(function (ok) { busy = false; adRunning = false; resumeSound(); return ok; });
  }

  function showInterstitial() {
    if (!inVk()) return Promise.resolve(false);
    pauseSound();
    return deadline(send('VKWebAppShowNativeAds', { ad_format: 'interstitial' }), AD_TIMEOUT)
      .then(function (r) { return !!(r && r.result); })
      .catch(function () { return false; })
      .then(function (ok) { resumeSound(); return ok; });
  }

  window.RPS_ADS = {
    available: inVk,
    rewarded: showRewarded,
    interstitial: showInterstitial,
    get busy() { return busy; },
    get showing() { return adRunning; }
  };
})();
