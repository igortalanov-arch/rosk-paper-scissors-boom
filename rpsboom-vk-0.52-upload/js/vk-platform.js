/* ============================================================
 * vk-platform.js · v0.35.0 · Адаптер платформы VK Mini Apps
 * Вариант A: всё на VK Storage (custom + global), без бэкенда.
 * Вне VK (локальный файл/вкладка) — эмуляция на localStorage:
 *   custom-ключи приватны «на пользователя» (uid хранится в
 *   sessionStorage => две вкладки = два игрока для демо),
 *   global-ключи общие (видны обеим вкладкам).
 * Все вызовы хранилища сериализуются очередью (баг bridge #192).
 * ============================================================ */
(function () {
  'use strict';

  var bridge = window.vkBridge || window.vkConnect || null;

  /* ---------- очередь вызовов bridge (параллельные StorageSet ломают bridge) ---------- */
  var chain = Promise.resolve();
  function enq(fn) {
    chain = chain.then(fn).catch(function (e) { console.warn('[VKP]', e); return null; });
    return chain;
  }

  /* ---------- локальная эмуляция ---------- */
  var myUid = (function () {
    try {
      var u = sessionStorage.getItem('mp_uid');
      if (!u) { u = 'local' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('mp_uid', u); }
      return u;
    } catch (e) { return 'local' + Math.random().toString(36).slice(2, 9); }
  })();

  function lsGet(k) {
    try {
      var v = localStorage.getItem(k);
      return v === null ? '' : v;
    } catch (e) { return ''; }
  }
  function lsSet(k, v) {
    try {
      if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v);
      return true;
    } catch (e) { return false; }
  }

  /* ---------- VK Storage: custom (мост) ---------- */
  function vkCustomGet(keys) {
    return enq(function () {
      return bridge.send('VKWebAppStorageGet', { keys: keys }).then(function (d) {
        var out = {}; (d && d.keys || []).forEach(function (kv) { out[kv.key] = kv.value || ''; });
        return out;
      });
    }).then(function (r) { return r || {}; });
  }
  function vkCustomSet(key, value) {
    return enq(function () { return bridge.send('VKWebAppStorageSet', { key: key, value: value == null ? '' : String(value) }); }).then(function () { return true; });
  }
  function vkCustomKeys() {
    return enq(function () {
      return bridge.send('VKWebAppStorageGetKeys', { count: 1000, offset: 0 }).then(function (d) {
        return (d && d.keys || []).map(function (k) { return k.key; });
      });
    }).then(function (r) { return r || []; });
  }

  /* ---------- VK Storage: global (через VKWebAppCallAPIMethod) ---------- */
  var authToken = null;
  function getAuthToken() {
    if (authToken) return Promise.resolve(authToken);
    return enq(function () {
      return bridge.send('VKWebAppGetAuthToken', { scope: 'friends' }).then(function (d) {
        authToken = (d && d.access_token) || null;
        return authToken;
      });
    });
  }
  function vkApi(method, params) {
    return getAuthToken().then(function (tok) {
      if (!tok) throw new Error('no token');
      params = params || {}; params.access_token = tok; params.v = '5.131';
      return enq(function () {
        return bridge.send('VKWebAppCallAPIMethod', {
          method: method,
          request_id: 'r' + Math.random().toString(36).slice(2, 10),
          params: params
        }).then(function (d) { return d && d.response !== undefined ? d.response : d; });
      });
    });
  }
  function vkGlobalGet(keys) {
    return vkApi('storage.get', { keys: keys.join(','), global: 1 }).then(function (arr) {
      var out = {}; (arr || []).forEach(function (kv) { out[kv.key] = kv.value || ''; });
      return out;
    });
  }
  function vkGlobalSet(key, value) {
    return vkApi('storage.set', { key: key, value: value == null ? '' : String(value), global: 1 }).then(function () { return true; });
  }
  function vkGlobalKeys() {
    return vkApi('storage.getKeys', { count: 1000, offset: 0, global: 1 }).then(function (arr) {
      return (arr || []).map(function (k) { return (k && k.key) || k; }).filter(Boolean);
    });
  }

  /* ---------- публичный API ---------- */
  var VKP = {
    isVk: false,
    ready: null,
    user: { id: myUid, name: '', photo: '' },
    launch: {},

    /* custom — приватные переменные пользователя */
    get: function (keys) {
      if (VKP.isVk) return vkCustomGet(keys);
      var out = {}; keys.forEach(function (k) { out[k] = lsGet('vkC_' + myUid + '_' + k); });
      return Promise.resolve(out);
    },
    set: function (key, value) {
      if (VKP.isVk) return vkCustomSet(key, value);
      return Promise.resolve(lsSet('vkC_' + myUid + '_' + key, value));
    },
    getKeys: function () {
      if (VKP.isVk) return vkCustomKeys();
      var pre = 'vkC_' + myUid + '_', out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(pre) === 0) out.push(k.slice(pre.length));
        }
      } catch (e) {}
      return Promise.resolve(out);
    },

    /* global — общий канал приложения (лобби/партии) */
    gGet: function (keys) {
      if (VKP.isVk) {
        return vkGlobalGet(keys).catch(function () {
          /* если global через API недоступен — деградация на custom-префикс (только локально) */
          console.warn('[VKP] global get failed, fallback');
          return {};
        });
      }
      var out = {}; keys.forEach(function (k) { out[k] = lsGet('vkG_' + k); });
      return Promise.resolve(out);
    },
    gSet: function (key, value) {
      if (VKP.isVk) {
        return vkGlobalSet(key, value).catch(function (e) { console.warn('[VKP] global set failed', e); return false; });
      }
      return Promise.resolve(lsSet('vkG_' + key, value));
    },
    gGetKeys: function () {
      if (VKP.isVk) return vkGlobalKeys().catch(function () { return []; });
      var out = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('vkG_') === 0) out.push(k.slice(4));
        }
      } catch (e) {}
      return Promise.resolve(out);
    },

    /* друзья (для лобби) */
    friends: function () {
      if (!VKP.isVk || !bridge) return Promise.resolve([]);
      return getAuthToken().then(function () {
        return enq(function () {
          return bridge.send('VKWebAppGetFriends', { multi: false }).then(function (d) {
            return (d && d.users || []).map(function (u) {
              return { id: String(u.id), name: ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || ('id' + u.id), photo: u.photo_100 || '' };
            });
          });
        }).then(function (r) { return r || []; }).catch(function () { return []; });
      });
    },

    /* приглашение в игру (запрос другу); вне VK — no-op (приглашение видно в лобби) */
    invite: function (uid, message, requestKey) {
      if (!VKP.isVk || !bridge) return Promise.resolve(true);
      return enq(function () {
        return bridge.send('VKWebAppShowRequestBox', {
          uid: String(uid),
          message: String(message || 'Сыграем!'),
          request_key: String(requestKey || '')
        }).then(function () { return true; }).catch(function () { return true; });
      });
    },

    /* профиль ВК */
    userInfo: function () {
      if (!VKP.isVk || !bridge) return Promise.resolve(VKP.user);
      return enq(function () {
        return bridge.send('VKWebAppGetUserInfo', {}).then(function (d) {
          if (d && d.id) {
            VKP.user.id = String(d.id);
            VKP.user.name = ((d.first_name || '') + ' ' + (d.last_name || '')).trim();
            VKP.user.photo = d.photo_100 || '';
          }
          return VKP.user;
        });
      }).then(function () { return VKP.user; }).catch(function () { return VKP.user; });
    }
  };

  /* ---------- init ---------- */
  VKP.ready = (function () {
    /* параметры запуска */
    try {
      var q = new URLSearchParams(location.search);
      q.forEach(function (v, k) { VKP.launch[k] = v; });
      var hash = location.hash || '';
      if (hash.length > 1) {
        hash.replace(/^#/, '').split('&').forEach(function (pair) {
          var kv = pair.split('=');
          if (kv[0]) VKP.launch[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
        });
      }
    } catch (e) {}

    var inVk = !!(VKP.launch.vk_user_id || VKP.launch.sign || (bridge && (bridge.isWebView && bridge.isWebView())));
    if (!bridge || !inVk) {
      VKP.isVk = false;
      return Promise.resolve(VKP);
    }
    return enq(function () { return bridge.send('VKWebAppInit', {}); })
      .then(function () {
        VKP.isVk = true;
        if (VKP.launch.vk_user_id) VKP.user.id = String(VKP.launch.vk_user_id);
        return VKP.userInfo();
      })
      .catch(function (e) {
        console.warn('[VKP] init failed, local mode', e);
        VKP.isVk = false;
        return VKP;
      });
  })();

  window.VKP = VKP;
})();
