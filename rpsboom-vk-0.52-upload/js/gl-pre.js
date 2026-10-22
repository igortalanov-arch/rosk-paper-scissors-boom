/* ============================================================
 * gl-pre.js · v0.36.0 · Загружается ДО game.js
 * Отказоустойчивое создание WebGL-контекста: на многих
 * мобильных GPU запрос {alpha:true,antialias:true} проваливается
 * или даёт «мёртвый» белый буфер. Пробуем резервные комбинации.
 * ============================================================ */
(function () {
  'use strict';
  var orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var t = String(type || '');
    if (t !== 'webgl' && t !== 'webgl2' && t !== 'experimental-webgl') {
      return orig.apply(this, arguments);
    }
    var r = orig.apply(this, arguments);
    if (r) return r;
    var variants = [
      { alpha: false, antialias: false, depth: true, stencil: false },
      { alpha: true, antialias: false, depth: true, stencil: false },
      { alpha: false, antialias: true, depth: true },
      {}
    ];
    for (var i = 0; i < variants.length; i++) {
      try {
        r = orig.call(this, t, variants[i]);
        if (r) { console.warn('[GL] контекст создан с резервными параметрами', JSON.stringify(variants[i])); return r; }
      } catch (e) {}
    }
    return null;
  };
})();
