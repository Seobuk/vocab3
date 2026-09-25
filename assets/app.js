/* 3단계 단어장 — app logic */
(function () {
  'use strict';

  var KEY = 'vocab3.state.v1';
  var APP_VERSION = '2.13';
  var STAGE_SHORT = { 0: '대기', 1: '1단계', 2: '2단계', 3: '3단계', 4: '졸업' };
  var STAGE_NAME = { 0: '대기 단어', 1: '새 단어장', 2: '외운 단어장', 3: '완전 암기장', 4: '졸업' };
  var STAGE_COLOR = { 0: 'var(--s0)', 1: 'var(--s1)', 2: 'var(--s2)', 3: 'var(--s3)', 4: 'var(--s4)' };
  // 색 테마 10종 — 라이트/다크 각각 검증된 팔레트 (본문 대비 ≥14:1, 버튼 글자 ≥4.5:1)
  var THEMES = [
    { id: 'indigo', name: '인디고',
      l: { bg: '#F4F5FA', surface: '#FFFFFF', surface2: '#EEF0F7', line: '#E4E6EF', text: '#151827', muted: '#6C7280', primary: '#4F46E5', soft: '#EEF0FF', on: '#FFFFFF' },
      d: { bg: '#0F1117', surface: '#181B25', surface2: '#222634', line: '#2A2F3D', text: '#ECEFF4', muted: '#9AA3B2', primary: '#8F8AFA', soft: '#262A48', on: '#14123A' } },
    { id: 'coral', name: '코랄 선셋',
      l: { bg: '#FFF5F1', surface: '#FFFFFF', surface2: '#FBE9E2', line: '#F1D9CF', text: '#2A1712', muted: '#8A665C', primary: '#C9412A', soft: '#FFE5DC', on: '#FFFFFF' },
      d: { bg: '#171110', surface: '#221917', surface2: '#2E221F', line: '#3B2D29', text: '#F6ECE8', muted: '#B39C94', primary: '#FF8266', soft: '#3A241F', on: '#1A0D09' } },
    { id: 'teal', name: '딥 틸',
      l: { bg: '#EEF8F6', surface: '#FFFFFF', surface2: '#E0F0ED', line: '#CFE3DF', text: '#0F2320', muted: '#587570', primary: '#0B7F73', soft: '#DDF3EF', on: '#FFFFFF' },
      d: { bg: '#0D1614', surface: '#152120', surface2: '#1E2C2A', line: '#283835', text: '#E8F3F1', muted: '#93ABA6', primary: '#2DD4BF', soft: '#143732', on: '#062421' } },
    { id: 'lavender', name: '라벤더',
      l: { bg: '#F6F3FE', surface: '#FFFFFF', surface2: '#ECE7FB', line: '#DED6F3', text: '#1B1530', muted: '#6C6588', primary: '#7C3AED', soft: '#EEE6FF', on: '#FFFFFF' },
      d: { bg: '#12101A', surface: '#1A1726', surface2: '#241F33', line: '#2F2942', text: '#EFEBFA', muted: '#A49CBE', primary: '#B197FC', soft: '#2A2347', on: '#160F2E' } },
    { id: 'rose', name: '로즈',
      l: { bg: '#FFF1F5', surface: '#FFFFFF', surface2: '#FBE5EC', line: '#F2D3DD', text: '#2A1420', muted: '#8A6273', primary: '#D42670', soft: '#FFE1EA', on: '#FFFFFF' },
      d: { bg: '#1A1015', surface: '#241820', surface2: '#30212B', line: '#3D2C37', text: '#F7EAF0', muted: '#B497A4', primary: '#F472B6', soft: '#3E1F30', on: '#2A0B1C' } },
    { id: 'forest', name: '포레스트',
      l: { bg: '#F0F7F1', surface: '#FFFFFF', surface2: '#E3EFE5', line: '#D1E2D5', text: '#122016', muted: '#5C7562', primary: '#2B7A4B', soft: '#DFF2E4', on: '#FFFFFF' },
      d: { bg: '#0F1511', surface: '#162019', surface2: '#1E2B22', line: '#29382E', text: '#E9F2EB', muted: '#93A898', primary: '#4ADE80', soft: '#1C3A27', on: '#062812' } },
    { id: 'sky', name: '오션 블루',
      l: { bg: '#EEF5FB', surface: '#FFFFFF', surface2: '#E1EDF7', line: '#CFE0EE', text: '#0F1F2B', muted: '#5B7184', primary: '#0A6BA8', soft: '#DDEEFA', on: '#FFFFFF' },
      d: { bg: '#0D1419', surface: '#152029', surface2: '#1D2B36', line: '#283846', text: '#E8F0F6', muted: '#93A6B5', primary: '#38BDF8', soft: '#17364A', on: '#062033' } },
    { id: 'amber', name: '앰버 허니',
      l: { bg: '#FFF7EA', surface: '#FFFFFF', surface2: '#FBEBD1', line: '#F0DDBD', text: '#2A1E0A', muted: '#85683E', primary: '#B45309', soft: '#FDEBCF', on: '#FFFFFF' },
      d: { bg: '#171309', surface: '#221C10', surface2: '#2E2616', line: '#3B3220', text: '#F6EEDD', muted: '#B5A585', primary: '#FBBF24', soft: '#3D2F10', on: '#2A1D02' } },
    { id: 'sand', name: '웜 샌드',
      l: { bg: '#F8F3EC', surface: '#FFFDFA', surface2: '#EFE6DA', line: '#E2D6C6', text: '#2A2118', muted: '#7A6957', primary: '#8B5E34', soft: '#F1E4D3', on: '#FFFFFF' },
      d: { bg: '#171310', surface: '#211C17', surface2: '#2C251F', line: '#39312A', text: '#F3ECE3', muted: '#ADA090', primary: '#D9A87A', soft: '#3A2D22', on: '#211508' } },
    { id: 'graphite', name: '그래파이트',
      l: { bg: '#F4F4F5', surface: '#FFFFFF', surface2: '#E9E9EC', line: '#DBDBE0', text: '#18181B', muted: '#6B6B75', primary: '#1F2937', soft: '#E6E8EC', on: '#FFFFFF' },
      d: { bg: '#101012', surface: '#18181B', surface2: '#222226', line: '#2C2C31', text: '#ECECEE', muted: '#A1A1AA', primary: '#C3C6CF', soft: '#2E2E33', on: '#111114' } }
  ];
  var POS_LIST = ['', 'n.', 'v.', 'adj.', 'adv.', 'phr.', 'prep.', 'conj.', 'idiom'];
  var ICON_SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var isAndroid = (typeof window.Android !== 'undefined') && window.Android !== null;
  // 브리지 토큰 — 안드로이드가 우리 index.html 에만 심는다. 브리지(window.Android)는 유튜브 iframe·광고 프레임에도 주입되므로
  // 토큰 없는 호출은 무시된다. 토큰과 브리지는 클로저에 잡아 두고 전역에선 지운다 (유튜브 iframe_api 는 영상 화면에서 나중에 불러온다)
  var BT = window.__bt || '', AND = window.Android; try { delete window.__bt; } catch (e) { window.__bt = ''; }
  var TTS_OK = isAndroid ? false : !!window.speechSynthesis;

  /* ---------------- utils ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function localDate() { return dateKey(new Date()); }
  function fmtToday() {
    var d = new Date();
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + days[d.getDay()] + ')';
  }
  function uid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  /* ---------------- bridge ---------------- */
  var bridge = {
    load: function () {
      try { return isAndroid ? AND.load(BT, KEY) : localStorage.getItem(KEY); } catch (e) { return null; }
    },
    save: function (s) {
      try { if (isAndroid) AND.save(BT, KEY, s); else localStorage.setItem(KEY, s); } catch (e) { }
    },
    speak: function (text, lang, rate, flush) {
      if (!text) return;
      try {
        if (isAndroid) { AND.speak(BT, text, lang, rate, flush !== false); return; }
        if (window.speechSynthesis) {
          var u = new SpeechSynthesisUtterance(text);
          u.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
          u.rate = rate;
          if (flush !== false) speechSynthesis.cancel();
          speechSynthesis.speak(u);
        }
      } catch (e) { }
    },
    stop: function () {
      try { if (isAndroid) AND.stopSpeak(BT); else if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
    },
    vibrate: function (ms) {
      try { if (isAndroid) AND.vibrate(BT, ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { }
    },
    copy: function (text) {
      try {
        if (isAndroid) AND.copy(BT, text);
        else if (navigator.clipboard) navigator.clipboard.writeText(text);
      } catch (e) { }
    },
    share: function (title, text) {
      try {
        if (isAndroid) AND.share(BT, title, text);
        else if (navigator.share) navigator.share({ title: title, text: text });
        else { bridge.copy(text); toast('클립보드에 복사했어요'); }
      } catch (e) { }
    },
    saveFile: function (name, content) {
      try {
        if (isAndroid) { AND.saveFile(BT, name, content); return; }
        var blob = new Blob([content], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        toast('백업 파일을 저장했어요');
      } catch (e) { }
    },
    openFile: function () {
      try { if (isAndroid) AND.openFile(BT); else $('#filePick').click(); } catch (e) { }
    },
    setBackHandled: function (b) { try { if (isAndroid) AND.setBackHandled(BT, !!b); } catch (e) { } },
    setRotate: function (b) { try { if (isAndroid && AND.setRotate) AND.setRotate(BT, !!b); } catch (e) { } },
    setSystemBars: function (color, light) { try { if (isAndroid) AND.setSystemBars(BT, color, !!light); } catch (e) { } },
    ttsReady: function () { try { return isAndroid ? AND.ttsReady(BT) : TTS_OK; } catch (e) { return false; } },
    audioStart: function (playlistJson, loop) {
      try { if (isAndroid) AND.audioStart(BT, playlistJson, !!loop); else jsAudio.start(JSON.parse(playlistJson), !!loop); } catch (e) { toast('재생을 시작하지 못했어요'); }
    },
    audioControl: function (cmd) {
      try { if (isAndroid) AND.audioControl(BT, cmd); else jsAudio.control(cmd); } catch (e) { }
    },
    audioState: function () {
      try { return isAndroid ? AND.audioState(BT) : jsAudio.stateJson(); } catch (e) { return null; }
    },
    exitApp: function () { try { if (isAndroid) AND.exitApp(BT); else window.close(); } catch (e) { } },
    loadRaw: function (key) { try { return isAndroid ? AND.load(BT, key) : localStorage.getItem(key); } catch (e) { return null; } },
    saveRaw: function (key, val) { try { if (isAndroid) AND.save(BT, key, val); else localStorage.setItem(key, val); } catch (e) { } },
    openUrl: function (url) { try { if (isAndroid) AND.openUrl(BT, url); else window.open(url, '_blank'); } catch (e) { } },
    // 유튜브 영상 받기 (v2.14, 안드로이드 13+) — 결과는 window.onYtDl(vid, st, a, b) · 파형은 window.onMediaEnv(vid). 브라우저엔 없음
    ytDownload: function (vid, title) { try { if (isAndroid) { AND.ytDownload(BT, vid, title || ''); return true; } } catch (e) { } return false; },
    ytDownloadCancel: function (vid) { try { if (isAndroid) AND.ytDownloadCancel(BT, vid); } catch (e) { } },
    mediaList: function () { try { if (isAndroid) { var o = JSON.parse(AND.mediaList(BT) || 'null'); if (o && typeof o === 'object') return o; } } catch (e) { } return null; },   // null = 모름 (브라우저·오류) → 기록을 건드리지 않는다
    mediaDelete: function (vid) { try { if (isAndroid) AND.mediaDelete(BT, vid); } catch (e) { } },
    mediaEnv: function (vid) { try { return isAndroid ? String(AND.mediaEnv(BT, vid) || '') : ''; } catch (e) { return ''; } },
    // 음성 인식: Android SpeechRecognizer / 브라우저 Web Speech API. 결과는 window.onStt / onSttPartial / onSttError / onSttState 로.
    sttAvailable: function () {
      try { if (isAndroid) return !!AND.sttAvailable(BT); return !!(window.SpeechRecognition || window.webkitSpeechRecognition); } catch (e) { return false; }
    },
    sttStart: function (lang) {
      try {
        if (isAndroid) { AND.sttStart(BT, lang || 'en-US'); return; }
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { window.onSttError && window.onSttError('unavailable'); return; }
        // 안드로이드와 똑같이: 멈추라고 할 때까지 듣고, 끊긴 구간을 이어 붙여 마지막에 한 번만 넘긴다
        var r = webStt = new SR(); r.lang = lang || 'en-US'; r.interimResults = true; r.maxAlternatives = 1; r.continuous = true;
        var acc = '';
        var join = function (a, b) { return a && b ? a + ' ' + b : (a || b); };
        r.onresult = function (ev) {
          var fin = '', part = '';
          for (var i = ev.resultIndex; i < ev.results.length; i++) { if (ev.results[i].isFinal) fin += ev.results[i][0].transcript; else part += ev.results[i][0].transcript; }
          if (fin) acc = join(acc, fin.trim());
          window.onSttPartial && window.onSttPartial(join(acc, part.trim()));
        };
        r.onerror = function (ev) {
          if (ev.error === 'no-speech' || ev.error === 'aborted') return;   // 잠깐 쉰 것뿐 — onend 에서 정리한다
          webStt = null; window.onSttError && window.onSttError(ev.error === 'not-allowed' ? 'permission' : ev.error);
        };
        r.onend = function () { if (webStt !== r) return; webStt = null; window.onSttState && window.onSttState('end'); window.onStt && window.onStt(acc); };
        r.start();
      } catch (e) { window.onSttError && window.onSttError('exception'); }
    },
    sttStop: function () { try { if (isAndroid) AND.sttStop(BT); else if (webStt) webStt.stop(); } catch (e) { } },
    sttCancel: function () { try { if (isAndroid) AND.sttCancel(BT); else if (webStt) { var w = webStt; webStt = null; w.abort(); } } catch (e) { } },
    // HTTPS JSON request → Promise<{status, text}> (status 0 = network error). Android does it natively (no CORS), browser uses fetch.
    aiCall: function (url, key, body, timeoutMs) {
      return new Promise(function (resolve) {
        if (isAndroid) {
          var id = 'ai' + (++aiSeq);
          aiPending[id] = resolve;
          setTimeout(function () { if (aiPending[id]) { delete aiPending[id]; resolve({ status: 0, text: 'timeout' }); } }, timeoutMs || 45000);
          try { AND.aiCall(BT, id, url, key || '', body || ''); } catch (e) { delete aiPending[id]; resolve({ status: 0, text: String(e) }); }
          return;
        }
        var opt = { method: body ? 'POST' : 'GET', headers: key ? { 'x-goog-api-key': key } : {} };
        if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = body; }
        fetch(url, opt).then(function (r) { return r.text().then(function (t) { resolve({ status: r.status, text: t }); }); })
          .catch(function (e) { resolve({ status: 0, text: String(e) }); });
      });
    }
  };
  var aiSeq = 0, aiPending = {}, webStt = null;
  window.onAiResult = function (id, status, text) {
    var r = aiPending[id]; if (!r) return;
    delete aiPending[id]; r({ status: Number(status) || 0, text: text || '' });
  };

  /* ---------------- AI (Gemini) example generation ---------------- */
  // The API key lives under its own prefs key (not inside the state JSON), so backups/exports never contain it.
  // Default is an alias (always the current Flash-Lite), so it never retires; fixed ids like gemini-2.5-flash got 404 for new accounts.
  var AI_KEY = 'vocab3.ai.v1', AI_DEFAULT_MODEL = 'gemini-flash-lite-latest', AI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  var AI = (function () {
    var o = null;
    try { o = JSON.parse(bridge.loadRaw(AI_KEY) || 'null'); } catch (e) { o = null; }
    o = o || {};
    if (typeof o.key !== 'string') o.key = '';
    if (!o.model || typeof o.model !== 'string') o.model = AI_DEFAULT_MODEL;
    if (o.model === 'gemini-2.5-flash') o.model = AI_DEFAULT_MODEL; // v1.15 default, saved with the key; Google rejects it for accounts made after 2026-09
    return o;
  })();
  function saveAi() { bridge.saveRaw(AI_KEY, JSON.stringify(AI)); }
  function aiErrorMessage(res) {
    var msg = '';
    try { var j = JSON.parse(res.text); msg = (j.error && j.error.message) || ''; } catch (e) { }
    if (res.status === 0) {
      var t = String(res.text || '');
      if (t === 'timeout' || /SocketTimeout|timed? ?out/i.test(t)) return '응답이 너무 늦어요. 서버가 붐비거나 모델이 느린 것 같아요 — 잠시 후 다시 시도해 주세요';
      if (/UnknownHost|ConnectException|unreachable|Failed to fetch|NetworkError|SSL|Handshake/i.test(t)) return '인터넷 연결을 확인하세요' + (/SSL|Handshake/i.test(t) ? ' (보안 연결 실패)' : '');
      return '연결 실패' + (t ? ': ' + t.slice(0, 80) : '');
    }
    if (res.status === 400 && /api key/i.test(msg)) return 'API 키가 올바르지 않아요';
    if (res.status === 401 || res.status === 403) return 'API 키가 거부됐어요 (' + res.status + ')';
    var m = res.model || AI.model, mine = m === AI.model;   // 유튜브는 설정과 상관없이 Flash-Lite — 그땐 "설정에서 고르라"고 하지 않는다
    if (res.status === 404) return '모델 "' + m + '"을(를) 찾을 수 없어요' + (mine ? '. 설정 → 모델 목록에서 골라 주세요' : '');
    if (res.status === 429) return '요청 한도를 넘었어요. 잠시 후 다시 시도하세요';
    if (res.status === 503) return '"' + m + '" 모델이 지금 붐벼요. 잠시 후 다시 ' + (mine ? '하거나 설정에서 다른 모델을 골라 주세요' : '시도해 주세요');
    if (res.status >= 500) return 'Gemini 서버 오류 (' + res.status + ')';
    return '오류 ' + res.status + (msg ? ': ' + msg.slice(0, 90) : '');
  }
  // Gemini generateContent with the app's standard resilience: one retry on 503, flash-family models get
  // thinking turned off (fast replies; a model that rejects thinkingConfig gets one retry without it), and the
  // last call is recorded (AI.last) so 설정 → AI 예문 shows what happened when something goes wrong on the phone.
  function aiGenerate(bodyObj, what, timeoutMs, model) {   // model: 기능별로 고정할 때 (없으면 설정의 모델)
    model = model || AI.model;
    var url = AI_BASE + '/models/' + encodeURIComponent(model) + ':generateContent';
    var own = !!(bodyObj.generationConfig && bodyObj.generationConfig.thinkingConfig);   // 부르는 쪽이 생각 설정을 정했다 (유튜브: 생각 켜기, v2.9)
    var noThink = !own && !AI.noThink && /flash/i.test(model);
    if (noThink) { bodyObj.generationConfig = bodyObj.generationConfig || {}; bodyObj.generationConfig.thinkingConfig = { thinkingBudget: 0 }; }
    var t0 = Date.now();
    function call() { return bridge.aiCall(url, AI.key, JSON.stringify(bodyObj), timeoutMs); }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    return call().then(function (res) {
      if (res.status === 503) return wait(1500).then(call);
      return res;
    }).then(function (res) {
      if (res.status === 400 && noThink) {
        // this model doesn't take thinkingConfig → drop it (remember it for this model) and go again
        delete bodyObj.generationConfig.thinkingConfig; noThink = false;
        if (/think/i.test(res.text)) { AI.noThink = true; saveAi(); }
        return call();
      }
      if (res.status === 400 && own && /think/i.test(res.text)) { delete bodyObj.generationConfig.thinkingConfig; own = false; return call(); }   // 생각 설정을 안 받는 모델 → 빼고 한 번 더
      return res;
    }).then(function (res) {
      res.model = model;
      AI.last = { at: Date.now(), ms: Date.now() - t0, status: res.status, what: what || '', err: res.status === 200 ? '' : aiErrorMessage(res) };
      saveAi();
      return res;
    });
  }
  function aiLastLine() {
    var l = AI.last; if (!l || !l.at) return '';
    var d = new Date(l.at), hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var what = { example: '예문', talk: '회화', summary: '회화 정리', test: '연결 테스트', models: '모델 목록', youtube: '유튜브 정리', word: '단어 뜻' }[l.what] || l.what;
    return '마지막 호출 ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hh + ' · ' + what + ' · ' + (l.ms / 1000).toFixed(1) + '초 · ' + (l.status === 200 ? '성공 ✓' : '실패 — ' + esc(l.err || ('HTTP ' + l.status)));
  }
  function aiPrompt(w, hint) {
    return [
      'You write example sentences for a Korean learner of English (CEFR B1, natural everyday spoken English).',
      'Word/expression: "' + w.w + '"' + (w.p ? ' (' + w.p + ')' : ''),
      'Korean meaning: "' + w.m + '"',
      w.e ? 'Current example (write a clearly DIFFERENT one): "' + w.e + '"' : '',
      hint ? 'Learner\'s request: ' + hint : '',
      'Write ONE sentence (8-16 words) that a person would actually say in daily life, using the word in exactly this meaning.',
      'Then give a natural, colloquial Korean translation of that sentence.',
      'Return JSON only: {"e": "<English sentence>", "k": "<Korean translation>"}'
    ].filter(Boolean).join('\n');
  }
  // → Promise<{e, k}>; rejects with {nokey:true} or {msg}
  function aiGenerateExample(w, hint, what) {
    if (!AI.key) return Promise.reject({ nokey: true });
    var body = {
      contents: [{ role: 'user', parts: [{ text: aiPrompt(w, hint) }] }],
      generationConfig: {
        temperature: 1.0,
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { e: { type: 'STRING' }, k: { type: 'STRING' } }, required: ['e', 'k'] }
      }
    };
    return aiGenerate(body, what || 'example', 45000).then(function (res) {
      if (res.status !== 200) throw { msg: aiErrorMessage(res) };
      var out = null;
      try {
        var j = JSON.parse(res.text), parts = j.candidates[0].content.parts, txt = '';
        for (var i = 0; i < parts.length; i++) if (parts[i].text) txt += parts[i].text;
        txt = txt.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
        out = JSON.parse(txt);
      } catch (e) { out = null; }
      if (!out || !out.e) throw { msg: '응답을 이해하지 못했어요. 다시 시도해 보세요' };
      return { e: String(out.e).replace(/\s+/g, ' ').trim(), k: String(out.k || '').replace(/\s+/g, ' ').trim() };
    });
  }
  // → Promise<string[]> of model ids usable with generateContent (text models only)
  function aiListModels() {
    if (!AI.key) return Promise.reject({ nokey: true });
    return bridge.aiCall(AI_BASE + '/models?pageSize=200', AI.key, '').then(function (res) {
      if (res.status !== 200) throw { msg: aiErrorMessage(res) };
      var j = JSON.parse(res.text), out = [];
      (j.models || []).forEach(function (m) {
        var id = String(m.name || '').replace(/^models\//, '');
        var ok = (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0;
        if (!ok || /embedding|image|tts|audio|live|vision|aqa|veo|imagen/i.test(id)) return;
        out.push(id);
      });
      out.sort(function (a, b) { var fa = /flash/i.test(a) ? 0 : 1, fb = /flash/i.test(b) ? 0 : 1; return fa - fb || b.localeCompare(a); });
      return out;
    });
  }
  // Shared runner for the sheet / edit-screen buttons: fills the example & translation fields.
  function runAiExample(w, hint, selE, selK, btn) {
    if (!AI.key) {
      confirm2('Gemini API 키가 아직 없어요.\n설정에서 키를 입력할까요?', '설정으로').then(function (ok) {
        if (ok) { if (sheetOpen) closeSheet(); go('settings', { scroll: 'ai' }); }
      });
      return;
    }
    var orig = btn.textContent;
    btn.disabled = true; btn.textContent = '생성 중…'; btn.classList.add('busy');
    aiGenerateExample(w, hint).then(function (r) {
      var te = $(selE), tk = $(selK);
      if (te) te.value = r.e;
      if (tk) tk.value = r.k;
      var note = $('#ai-note'); if (note) note.textContent = 'AI 제안이에요 · 마음에 안 들면 다시 누르고, 저장 전에 직접 고쳐도 돼요';
      bridge.vibrate(8);
    }, function (err) {
      toast(err && err.msg ? err.msg : 'AI 예문 생성에 실패했어요');
    }).then(function () {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = orig; btn.classList.remove('busy'); }
    });
  }

  /* Browser fallback sequencer (same step protocol as the Android ReviewService) — used for web testing only */
  var jsAudio = {
    pl: [], i: 0, si: 0, playing: false, active: false, finished: false, loop: false, timer: null, utt: null,
    start: function (pl, loop) {
      this.stop(true); this.pl = pl; this.loop = loop; this.i = 0; this.si = 0; this.part = ''; this.active = pl.length > 0; this.finished = false; this.playing = this.active;
      this.push(); this.run();
    },
    control: function (cmd) {
      if (!this.active) return;
      if (cmd === 'pause') { this.playing = false; this.cancel(); this.push(); }
      else if (cmd === 'resume') { if (!this.playing) { this.playing = true; this.push(); this.run(); } }
      else if (cmd === 'toggle') { this.control(this.playing ? 'pause' : 'resume'); }
      else if (cmd === 'next') { if (this.i + 1 < this.pl.length) this.i++; else if (this.loop) this.i = 0; else { this.finish(); return; } this.restart(); }
      else if (cmd === 'prev') { if (this.i > 0) this.i--; this.restart(); }
      else if (cmd === 'stop') { this.stop(false); }
    },
    restart: function () { this.cancel(); this.si = 0; this.part = ''; this.playing = true; this.push(); this.run(); },
    cancel: function () {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (this.utt) { this.utt = null; try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } }
    },
    run: function () {
      var self = this;
      if (!self.playing) return;
      var steps = (self.pl[self.i] && self.pl[self.i].steps) || [];
      if (self.si >= steps.length) { self.advance(); return; }
      var st = steps[self.si];
      if (st.t === 'say' && st.p && st.p !== self.part) { self.part = st.p; self.push(); }
      if (st.t === 'say') {
        if (window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined' && !window.__simulateTts) {
          var u = new SpeechSynthesisUtterance(st.text); u.lang = st.lang === 'ko' ? 'ko-KR' : 'en-US'; u.rate = st.rate || 1;
          self.utt = u;
          u.onend = u.onerror = function () { if (self.utt === u) { self.utt = null; self.si++; self.run(); } };
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        } else {
          self.timer = setTimeout(function () { self.timer = null; self.si++; self.run(); }, Math.min(1500, 40 * st.text.length / (st.rate || 1)));
        }
      } else {
        self.timer = setTimeout(function () { self.timer = null; self.si++; self.run(); }, st.ms || 0);
      }
    },
    advance: function () {
      if (this.i + 1 < this.pl.length) this.i++; else if (this.loop) this.i = 0; else { this.finish(); return; }
      this.si = 0; this.part = ''; this.push(); this.run();
    },
    finish: function () { this.cancel(); this.playing = false; this.active = false; this.finished = true; this.push(); },
    stop: function (silent) { this.cancel(); this.playing = false; this.active = false; this.finished = true; if (!silent) this.push(); },
    stateJson: function () {
      var it = this.pl[this.i] || {};
      return JSON.stringify({ active: this.active, playing: this.playing, finished: this.finished, index: this.i, total: this.pl.length, loop: this.loop, koOk: true, part: this.part || '', w: it.w || '', m: it.m || '', e: it.e || '', k: it.k || '' });
    },
    push: function () { if (window.onAudioState) window.onAudioState(this.stateJson()); }
  };

  /* ---------------- state ---------------- */
  var S = null;

  function defaultSettings() {
    return { dailyGoal: 20, hideMeaning: true, hideExample: true, mode: 'en', autoSpeak: false, rate: 0.9, theme: 'light', colorTheme: 'indigo', themeRandom: true, tipDismissed: false, shuffle: true, swapJudge: false, listExample: true, sfx: true, addMode: 'bulk', ytPause: true };
  }
  function defaultAudio() {
    return { wordRepeat: 1, pauseAfterWord: 2000, exampleRepeat: 2, exampleRate: 0.8, exampleGap: 1000, readMeaning: false, readExampleKo: true, pauseBetween: 1500, loop: false, set: 1, order: 'rand', orderV2: true, koV2: true };
  }
  function defaultState() {
    var st = defaultSettings(); st.audio = defaultAudio(); st.talk = defaultTalk();
    return { v: 1, words: [], settings: st, lastDailyDate: null, studyDays: {}, createdAt: Date.now(), yt: [], usage: {} };
  }
  function mkWord(o) {
    var now = Date.now();
    var w = { id: uid(), w: '', p: '', m: '', e: '', k: '', t: '', src: 'user', order: now, stage: 0, addedAt: now, stageAt: now, dailyDate: null, seen: 0, lastSeen: 0, right: 0, wrong: 0, star: false };
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) w[k] = o[k];
    return w;
  }
  function seedBuiltin(s) {
    var have = {};
    s.words.forEach(function (w) { if (w.src === 'builtin') have[w.id] = true; });
    var added = 0;
    (window.BUILTIN_WORDS || []).forEach(function (r, i) {
      var id = 'b' + (i + 1);
      if (have[id]) return;
      s.words.push(mkWord({ id: id, w: r[0], p: r[1], m: r[2], e: r[3], k: r[4], t: r[5], src: 'builtin', order: i }));
      added++;
    });
    return added;
  }
  function migrate(s) {
    var d = defaultSettings();
    s.settings = s.settings || {};
    for (var k in d) if (!(k in s.settings)) s.settings[k] = d[k];
    delete s.settings.ytVad;   // v2.9: v2.8 '소리로 문장 끝 맞추기' 실험을 뺐다 (문장의 as/asg/ae 는 아래 ytClean 이 버린다)
    var dt = defaultTalk(), tk = s.settings.talk || {};
    for (var tkk in dt) if (!(tkk in tk)) tk[tkk] = dt[tkk];
    if (!tk.autoSendV2) { tk.autoSend = false; tk.autoSendV2 = true; }   // v1.19: ■ 뒤에 확인하고 보내는 게 기본
    s.settings.talk = tk;
    if (!Array.isArray(s.talkLog)) s.talkLog = [];
    // v2.2 유튜브 쉐도잉 — 백업 파일에서 들어올 수 있으니 모양을 검사해 정리한다
    s.yt = (Array.isArray(s.yt) ? s.yt : []).filter(function (r) { return r && typeof r.id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(r.vid); });
    var ml = bridge.mediaList();   // v2.14 받은 영상 — 실제 파일과 맞춘다 (복원한 백업의 off 도 이 폰 파일 기준)
    s.yt.forEach(function (r) {
      r.title = String(r.title || ''); r.date = String(r.date || ''); r.addedAt = Number(r.addedAt) || 0; r.sents = Array.isArray(r.sents) ? ytClean(r.sents) : null; if (r.tv !== 2 && r.tv !== 3) delete r.tv;
      var o = ml ? ml[r.vid] : r.off; delete r.off;
      if (o && (o.kind === 'mp4' || o.kind === 'm4a')) r.off = { kind: o.kind, size: Number(o.size) || 0 };
      if (r.snap !== 1 || !r.off) delete r.snap;   // 파형으로 맞춘 경계 (vs/ve 는 파일을 지워도 유튜브 재생에 그대로 쓴다)
    });
    // v1.20: 예전 기록에도 id를 붙여 리포트 삭제가 되게
    s.talkLog.forEach(function (r, i) { if (r && !r.id) r.id = 'tk0' + i + '-' + String(r.date || '').replace(/-/g, ''); });
    var da = defaultAudio(), hadAudio = !!s.settings.audio, a = s.settings.audio || {};
    if (hadAudio) {
      // one-time migrations for settings saved by older versions (must run BEFORE defaults are merged in)
      if (!a.orderV2) { a.order = 'rand'; a.orderV2 = true; }
      if (!a.koV2) { a.readMeaning = false; a.readExampleKo = true; a.koV2 = true; }
    }
    for (var ak in da) if (!(ak in a)) a[ak] = da[ak];
    s.settings.audio = a;
    s.words = Array.isArray(s.words) ? s.words : [];
    s.studyDays = s.studyDays || {};
    if (!s.usage || typeof s.usage !== 'object' || Array.isArray(s.usage)) s.usage = {};   // v2.13 사용 기록 (백업에서 올 수 있어 모양 검사)
    for (var uk in s.usage) { var ue = s.usage[uk]; if (!ue || typeof ue !== 'object' || !/^\d{4}-\d\d-\d\d$/.test(uk)) { delete s.usage[uk]; continue; } ue.t = Number(ue.t) || 0; if (!ue.f || typeof ue.f !== 'object') ue.f = {}; if (!ue.c || typeof ue.c !== 'object') ue.c = {}; }
    s.words.forEach(function (w) { if (typeof w.stage !== 'number') w.stage = 0; if (typeof w.star !== 'boolean') w.star = false; });
    // v2.0: 연속 학습일 신기록 연출 — 기존 사용자는 지금까지의 최고 기록을 기준선으로
    if (typeof s.streakRecord !== 'number') s.streakRecord = bestStreakOf(s.studyDays);
    return s;
  }
  function loadState() {
    var raw = bridge.load();
    if (raw) {
      try { return migrate(JSON.parse(raw)); } catch (e) { }
    }
    var s = defaultState();
    seedBuiltin(s);
    return s;
  }
  var saveTimer = null;
  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; bridge.save(JSON.stringify(S)); }, 60);
  }
  function saveNow() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; } bridge.save(JSON.stringify(S)); }

  function byId(id) { for (var i = 0; i < S.words.length; i++) if (S.words[i].id === id) return S.words[i]; return null; }
  function counts() {
    var c = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    S.words.forEach(function (w) { c[w.stage] = (c[w.stage] || 0) + 1; });
    return c;
  }
  function starCount() { var n = 0; S.words.forEach(function (w) { if (w.star) n++; }); return n; }
  function dayStat() {
    var k = localDate();
    if (!S.studyDays[k]) S.studyDays[k] = { judged: 0, memorized: 0 };
    return S.studyDays[k];
  }
  function calcStreak() {
    var d = new Date();
    var t = S.studyDays[localDate()];
    if (!t || !t.judged) d.setDate(d.getDate() - 1);
    var n = 0;
    for (var i = 0; i < 3650; i++) {
      var st = S.studyDays[dateKey(d)];
      if (st && st.judged > 0) { n++; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }

  /* ---------------- daily set ---------------- */
  function pullNewWords(n) {
    if (n <= 0) return 0;
    var pool = S.words.filter(function (w) { return w.stage === 0; }).sort(function (a, b) { return a.order - b.order; });
    var take = pool.slice(0, n), today = localDate(), now = Date.now();
    take.forEach(function (w) { w.stage = 1; w.stageAt = now; w.dailyDate = today; });
    return take.length;
  }
  function ensureDaily() {
    var today = localDate();
    if (S.lastDailyDate === today) return 0;
    var n = pullNewWords(S.settings.dailyGoal - counts()[1]);
    S.lastDailyDate = today;
    if (S.settings.themeRandom) {
      var t = pickRandomTheme();
      setTimeout(function () { toast('오늘의 테마 · ' + t.name + (n ? ' · 새 단어 ' + n + '개' : '')); }, 500);
    }
    save();
    return n;
  }

  /* ---------------- navigation ---------------- */
  var stack = [];
  var sheetOpen = false, modalOpen = false;
  var RENDER = {};

  function current() { return stack[stack.length - 1]; }
  function go(view, params, replace) {
    if (replace && stack.length) stack.pop();
    stack.push({ view: view, params: params || {} });
    render();
  }
  function goTab(tab) {
    stack = [{ view: 'home', params: {} }];
    if (tab !== 'home') stack.push({ view: tab, params: {} });
    render();
  }
  function back() {
    if (modalOpen) { closeModal(null); return; }
    if (sheetOpen) { closeSheet(); return; }
    var cur = current(), prev = stack[stack.length - 2];
    if (cur && cur.view === 'chat') { talkBack(); return; }
    if (cur && cur.view === 'ytv') { if (prev && prev.view === 'yt') { stack.pop(); render(); } else go('yt', {}, true); return; }
    if (prev && prev.view === 'study') { stack.pop(); render(); return; } // detour from the card (e.g. settings for the AI key) → back to the card, not home
    if (cur && cur.view !== 'home') { goTab('home'); return; }
    confirm2(AUD.active ? '앱을 종료할까요?\n(듣기 복습은 알림에서 계속 재생돼요)' : '앱을 종료할까요?', '종료').then(function (ok) { if (ok) bridge.exitApp(); });
  }
  function updateBack() { bridge.setBackHandled(true); }
  function render() {
    useTick();   // 앞 화면까지의 사용 시간을 넣고 새 화면으로 다시 잰다
    var cur = current();
    if (cur.view !== 'ytv') ytStopPlayer();   // 영상 화면을 떠나면 멈춘다 (유튜브 정책: 안 보이는 곳에서 재생 금지)
    bridge.setRotate(cur.view === 'ytv');   // 가로 회전은 영상 화면에서만 (왼쪽 영상 · 오른쪽 스크립트)
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + cur.view); });
    var showTab = ['home', 'list', 'edit', 'import', 'settings', 'stats'].indexOf(cur.view) >= 0;
    $('#tabbar').classList.toggle('show', showTab);
    $$('#tabbar button').forEach(function (b) {
      var t = b.getAttribute('data-tab');
      b.classList.toggle('on', t === cur.view || (t === 'edit' && cur.view === 'import'));
    });
    RENDER[cur.view](cur.params);
    var el = $('#view-' + cur.view);
    if (el) el.scrollTop = 0;
    updateBack();
  }
  window.__appBack = back;

  /* ---------------- toast / modal / sheet ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  var modalResolve = null;
  function ask(msg, buttons) {
    return new Promise(function (resolve) {
      modalResolve = resolve;
      var m = $('#modal');
      m.innerHTML = '<p>' + esc(msg) + '</p><div class="m-actions">' + buttons.map(function (b) {
        return '<button class="btn ' + (b.cls || '') + '" data-action="modal-pick" data-value="' + esc(b.value) + '">' + esc(b.label) + '</button>';
      }).join('') + '</div>';
      m.classList.add('show'); $('#overlay').classList.add('show');
      modalOpen = true; updateBack();
    });
  }
  function confirm2(msg, okLabel, danger) {
    return ask(msg, [{ label: '취소', value: '' }, { label: okLabel || '확인', value: 'ok', cls: danger ? 'danger' : 'primary' }]).then(function (v) { return v === 'ok'; });
  }
  function closeModal(value) {
    $('#modal').classList.remove('show');
    if (!sheetOpen) $('#overlay').classList.remove('show');
    modalOpen = false; updateBack();
    var r = modalResolve; modalResolve = null;
    if (r) r(value);
  }
  function openSheet(html) {
    var s = $('#sheet');
    s.innerHTML = '<div class="grip"></div>' + html;
    $('#overlay').classList.add('show');
    requestAnimationFrame(function () { s.classList.add('show'); });
    sheetOpen = true; updateBack();
  }
  function closeSheet() {
    $('#sheet').classList.remove('show');
    if (!modalOpen) $('#overlay').classList.remove('show');
    sheetOpen = false; updateBack();
  }

  /* ---------------- theme ---------------- */
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  // 그라데이션 끝 색: 색상(hue)을 살짝 돌리고 밝기를 올린 변형
  function shiftHue(hex, dh, dl) {
    var c = hexRgb(hex).map(function (v) { return v / 255; }), r = c[0], g = c[1], b = c[2];
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6; else if (max === g) h = ((b - r) / d + 2) / 6; else h = ((r - g) / d + 4) / 6;
    }
    if (h * 360 > 35 && h * 360 < 100) dh = -dh; // 노랑~연두 계열은 초록 쪽이 아니라 주황 쪽으로
    h = (h + dh / 360 + 1) % 1; l = Math.min(0.92, Math.max(0.08, l + dl / 100));
    function f(t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return q0 + (q1 - q0) * 6 * t; if (t < 1 / 2) return q1; if (t < 2 / 3) return q0 + (q1 - q0) * (2 / 3 - t) * 6; return q0; }
    var q1 = l < 0.5 ? l * (1 + s) : l + s - l * s, q0 = 2 * l - q1;
    var out = s ? [f(h + 1 / 3), f(h), f(h - 1 / 3)] : [l, l, l];
    return '#' + out.map(function (v) { v = Math.round(v * 255); return (v < 16 ? '0' : '') + v.toString(16); }).join('').toUpperCase();
  }
  function themeById(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return THEMES[0]; }
  function applyTheme() {
    var dark = S.settings.theme === 'dark';
    var t = themeById(S.settings.colorTheme), p = dark ? t.d : t.l, root = document.documentElement;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-color', t.id);
    var map = { '--bg': p.bg, '--surface': p.surface, '--surface2': p.surface2, '--line': p.line, '--text': p.text, '--muted': p.muted, '--primary': p.primary, '--primary-soft': p.soft, '--on-primary': p.on,
      '--primary-2': shiftHue(p.primary, 18, dark ? 4 : 6), '--primary-rgb': hexRgb(p.primary).join(', '), '--primary-deep': t.l.primary };
    for (var k in map) root.style.setProperty(k, map[k]);
    var meta = $('meta[name=theme-color]'); if (meta) meta.setAttribute('content', p.bg);
    bridge.setSystemBars(p.bg, !dark);
  }
  // 새 단어를 받을 때마다 다른 테마로 — 직전 테마는 제외
  function pickRandomTheme() {
    // 최근 5개는 제외해서 일주일 안에 같은 테마가 다시 나오지 않게
    var hist = Array.isArray(S.settings.themeHist) ? S.settings.themeHist : [];
    var cur = S.settings.colorTheme;
    var pool = THEMES.filter(function (t) { return t.id !== cur && hist.indexOf(t.id) < 0; });
    if (!pool.length) pool = THEMES.filter(function (t) { return t.id !== cur; });
    var t = pool[Math.floor(Math.random() * pool.length)];
    hist.push(cur); while (hist.length > 5) hist.shift();
    S.settings.themeHist = hist;
    S.settings.colorTheme = t.id;
    applyTheme();
    return t;
  }

  /* ---------------- speak ---------------- */
  function speak(text, lang, queue) { bridge.speak(text, lang || 'en', S.settings.rate, !queue); }

  /* ================= HOME ================= */
  RENDER.home = function () {
    ensureDaily();
    var c = counts(), goal = S.settings.dailyGoal, d = S.studyDays[localDate()] || { judged: 0, memorized: 0 }, sn = sentPool().length;
    var streak = calcStreak();
    var pct = clamp(Math.round(d.judged / Math.max(1, goal) * 100), 0, 100);
    var cta, sub;
    if (c[1] > 0) {
      cta = '<button class="btn big" data-action="start" data-stage="1">학습 시작 · ' + c[1] + '개</button>';
      sub = d.judged ? '오늘 ' + d.judged + '개 학습 · ' + d.memorized + '개 외움' : '오늘의 새 단어 ' + c[1] + '개가 준비됐어요';
      if (c[0] > 0) cta += '<button class="btn big secondary" data-action="pull">새 단어 ' + goal + '개 더 가져오기</button>';
    } else if (c[0] > 0) {
      cta = '<button class="btn big" data-action="pull">새 단어 ' + goal + '개 가져오기</button>';
      sub = '1단계를 모두 넘겼어요 🎉 오늘 ' + d.judged + '개 학습 · ' + d.memorized + '개 외움';
    } else {
      cta = '<button class="btn big" data-action="tab" data-tab="edit">단어 추가하기</button>';
      sub = '대기 중인 단어가 없어요. 새 단어를 추가해 주세요';
    }
    var html =
      '<div class="wrap">' +
      '<div class="home-head"><div><div class="eyebrow">' + fmtToday() + '</div><h1>3단계 단어장</h1></div>' +
      '<div class="hh-r"><div class="eyebrow ver">v' + APP_VERSION + '</div><div class="streak">🔥 ' + streak + '일 연속</div></div></div>' +
      '<div class="today"><div class="t-eyebrow">TODAY</div><div class="t-title">오늘의 학습</div><div class="t-sub">' + sub + '</div>' +
      '<div class="t-bar"><div style="width:' + pct + '%"></div></div>' + cta + '</div>' +
      // 자주 쓰는 세 가지는 한 번에: 회화 · 유튜브 · 듣기 (단어 추가는 아래 탭바에)
      '<div class="quick">' +
      '<button class="q" data-action="talk"><span class="q-ic">🗣</span><span class="q-t">회화 연습</span><span class="q-s">AI와 영어로</span></button>' +
      '<button class="q" data-action="yt"><span class="q-ic">📺</span><span class="q-t">유튜브</span><span class="q-s">쉐도잉 · 표현</span></button>' +
      '<button class="q" data-action="audio"><span class="q-ic">🎧</span><span class="q-t">듣기 복습</span><span class="q-s">' + (AUD.active ? (AUD.playing ? '재생 중' : '일시정지') : '운전 중에') + '</span></button>' +
      '</div>' +
      '<button class="review-btn" style="--c:var(--s2)" data-action="start" data-stage="2"' + (c[2] ? '' : ' disabled') + '><span class="dot"></span><div><div class="rb-t">2단계 복습</div><div class="rb-s">주기적으로 복습 → 확실하면 3단계로</div></div><span class="rb-n">' + c[2] + '</span><span class="chev">›</span></button>' +
      '<button class="review-btn" style="--c:var(--s3)" data-action="start" data-stage="3"' + (c[3] ? '' : ' disabled') + '><span class="dot"></span><div><div class="rb-t">3단계 최종 점검</div><div class="rb-s">최종 확인 → 통과하면 졸업</div></div><span class="rb-n">' + c[3] + '</span><span class="chev">›</span></button>' +
      '<button class="review-btn" style="--c:var(--s4)" data-action="sent"' + (sn ? '' : ' disabled') + '><span class="dot"></span><div><div class="rb-t">영어 문장 공부</div><div class="rb-s">졸업한 단어 예문 · 한글 보고 영어로</div></div><span class="rb-n">' + sn + '</span><span class="chev">›</span></button>' +
      '<div class="row"><button class="btn" data-action="list" data-stage="0">대기 ' + c[0] + '개</button><button class="btn" data-action="list-starred">★ 중요 ' + starCount() + '개</button><button class="btn" data-action="list" data-stage="4">졸업 ' + c[4] + '개</button></div>' +
      (S.settings.tipDismissed ? '' :
        '<div class="tip"><button class="close" data-action="tip-close">×</button><b>3단계 단어장 사용법</b><br>매일 새 단어 ' + goal + '개를 예문과 함께 익히고, 단어와 예문이 자연스럽게 나오면 오른쪽으로 스와이프하세요.' +
        '<div class="flow"><span>1단계 새 단어장</span><i>→</i><span>2단계 외운 단어장</span><i>→</i><span>3단계 완전 암기장</span><i>→</i><span>졸업</span></div></div>') +
      '</div>';
    $('#view-home').innerHTML = html;
  };

  /* ================= STUDY ================= */
  var SES = null;

  function snap(w) { return { stage: w.stage, stageAt: w.stageAt, seen: w.seen, lastSeen: w.lastSeen, right: w.right, wrong: w.wrong, dailyDate: w.dailyDate }; }
  function startSession(stage, ids) {
    var list;
    if (ids) list = ids.map(byId).filter(function (w) { return w && w.stage === stage; });
    else {
      list = S.words.filter(function (w) { return w.stage === stage; });
      if (stage === 1) list.sort(function (a, b) { return (a.dailyDate || '').localeCompare(b.dailyDate || '') || a.order - b.order; });
      else list.sort(function (a, b) { return a.lastSeen - b.lastSeen || a.stageAt - b.stageAt; });
    }
    if (!list.length) { toast('학습할 단어가 없어요'); return; }
    if (S.settings.shuffle) shuffle(list);
    var orig = {};
    list.forEach(function (w) { orig[w.id] = snap(w); });
    SES = { stage: stage, ids: list.map(function (w) { return w.id; }), i: 0, orig: orig, done: {}, undo: [], token: Date.now() };
    go('study');
  }
  function currentWord() {
    if (!SES || !SES.ids.length) return null;
    return byId(SES.ids[SES.i]);
  }
  function judgedCount() { var n = 0; for (var k in SES.done) if (SES.done[k]) n++; return n; }
  function sesList(kind) { return SES.ids.filter(function (id) { return SES.done[id] === kind; }); }
  function sessionTitle(stage) { return stage === 1 ? '오늘의 학습' : stage === 2 ? '복습' : '최종 점검'; }

  RENDER.study = function () {
    if (!SES) { go('home', {}, true); return; }
    var v = $('#view-study');
    if (v.getAttribute('data-token') !== String(SES.token)) {
      v.setAttribute('data-token', String(SES.token));
      var st = SES.stage;
      v.innerHTML =
        '<div class="study" style="--c:' + STAGE_COLOR[st] + '">' +
        '<div class="study-top"><button class="icon-btn" data-action="back" aria-label="닫기">' + ICON_X + '</button>' +
        '<span class="stage-pill">' + STAGE_SHORT[st] + '</span><span class="st-title">' + sessionTitle(st) + '</span>' +
        '<span class="counter" id="counter"></span></div>' +
        '<div class="pbar"><div id="pfill"></div></div>' +
        '<div class="study-tools">' +
        '<button class="chip" id="chipMode" data-action="toggle-mode"></button>' +
        '<button class="chip" id="chipAuto" data-action="toggle-auto"></button>' +
        '<button class="chip" data-action="toggle-swap" aria-label="버튼 위치 바꾸기">⇄ 버튼</button>' +
        '<button class="chip" data-action="reveal-all">모두 보기</button>' +
        '</div>' +
        '<div class="card-area" id="cardArea"><div class="card-ghost" id="ghost"></div></div>' +
        '<div class="study-actions">' +
        '<div class="judge' + (S.settings.swapJudge ? ' swapped' : '') + '">' +
        '<button class="btn no" data-action="judge" data-yes="0"><span>▼ 아직</span><small>' + STAGE_SHORT[st] + ' 유지</small></button>' +
        '<button class="btn yes" data-action="judge" data-yes="1"><span>▲ ' + (st === 1 ? '외웠다' : st === 2 ? '확실히 외웠다' : '완전 암기') + '</span><small>' + (st === 3 ? '졸업' : STAGE_SHORT[st + 1] + '로 이동') + '</small></button>' +
        '</div>' +
        '<div class="navrow"><button class="btn undo" data-action="undo" id="btnUndo">↶ 되돌리기</button></div>' +
        (st > 1 ? '<button class="demote" data-action="demote">잘 기억 안 나면 <u>1단계로 되돌리기</u></button>' :
          '<div class="demote">▲ 외웠다 &nbsp;·&nbsp; ▼ 아직 &nbsp;·&nbsp; ◀ ▶ 이전/다음 &nbsp;·&nbsp; 예문 길게: 수정·AI</div>') +
        '</div></div>';
    }
    mountCard('none');
  };

  function cardHTML(w) {
    var st = S.settings;
    function spk(what, sm) {
      return '<button class="spk' + (sm ? ' sm' : '') + '" data-action="speak" data-what="' + what + '" aria-label="발음 듣기">' + ICON_SPK + '</button>';
    }
    var kind = SES.done[w.id];
    var badge = kind === 'yes' ? '<span class="judged-badge yes">✓ ' + (SES.stage === 3 ? '졸업' : '외웠다') + '</span>' :
      kind === 'no' ? '<span class="judged-badge no">아직</span>' : kind === 'demote' ? '<span class="judged-badge no">1단계로</span>' : '';
    var top = '<div class="card-top">' + (w.p ? '<span class="tag">' + esc(w.p) + '</span>' : '') + (w.t ? '<span class="tag theme">' + esc(w.t) + '</span>' : '') +
      '<span class="tag pos">' + (SES.i + 1) + ' / ' + SES.ids.length + '</span>' + badge +
      '<button class="star' + (w.star ? ' on' : '') + '" data-action="star" data-id="' + esc(w.id) + '" aria-label="중요 단어 표시">★</button></div>';
    var stamps = '<div class="stamp yes pos-t">' + (SES.stage === 3 ? '졸업' : '외웠다') + '</div><div class="stamp no pos-b">아직</div>';
    if (st.mode === 'en') {
      return top +
        '<div class="card-word"><div class="w">' + esc(w.w) + '</div>' + spk('w') + '</div>' +
        '<div class="reveal" data-reveal="m" data-max="1" data-step="' + (st.hideMeaning ? 0 : 1) + '"><div class="label">뜻</div><div class="content"><div class="m">' + esc(w.m) + '</div></div><div class="cover">뜻 보기</div></div>' +
        '<div class="reveal" data-reveal="e" data-max="' + (w.k ? 2 : 1) + '" data-step="' + (st.hideExample ? 0 : (w.k ? 2 : 1)) + '"><div class="label">예문</div><div class="content"><div class="en"><span>' + esc(w.e || '—') + '</span>' + spk('e', true) + '</div>' +
        (w.k ? '<div class="ko">' + esc(w.k) + '</div>' : '') +
        '</div><div class="cover">예문을 먼저 떠올린 뒤 탭</div></div>' +
        stamps;
    }
    return top +
      '<div class="card-word"><div class="w ko">' + esc(w.m) + '</div></div>' +
      '<div class="reveal" data-reveal="w" data-max="1" data-step="' + (st.hideMeaning ? 0 : 1) + '"><div class="label">영어 단어</div><div class="content"><div class="en"><span>' + esc(w.w) + '</span>' + spk('w', true) + '</div></div><div class="cover">영어로 말해 본 뒤 탭</div></div>' +
      '<div class="plain"><div class="label">예문 (우리말)</div><div class="ko-big">' + esc(w.k || '(해석 없음)') + '</div></div>' +
      '<div class="reveal" data-reveal="e" data-max="1" data-step="' + (st.hideExample ? 0 : 1) + '"><div class="label">영어 예문</div><div class="content"><div class="en"><span>' + esc(w.e || '—') + '</span>' + spk('e', true) + '</div></div><div class="cover">영어 예문을 말해 본 뒤 탭</div></div>' +
      stamps;
  }

  // anim: 'none' | 'judge' (scale in) | 'next' (from right) | 'prev' (from left); silent: skip auto-speak
  function mountCard(anim, silent) {
    var w = currentWord();
    if (!w) { finishSession(); return; }
    var area = $('#cardArea');
    var old = $('.card', area); if (old) old.remove();
    var card = document.createElement('div');
    card.className = 'card' + (anim === 'judge' ? ' enter' : anim === 'next' ? ' enter-next' : anim === 'prev' ? ' enter-prev' : '');
    card.innerHTML = cardHTML(w);
    area.appendChild(card);
    bindDrag(card);
    var n = SES.ids.length, done = judgedCount();
    $('#counter').innerHTML = done + '<small>/' + n + '</small>';
    $('#pfill').style.width = Math.round(done / n * 100) + '%';
    $('#ghost').style.display = (n > 1) ? '' : 'none';
    $('#btnUndo').disabled = SES.undo.length === 0;
    $('#chipMode').textContent = S.settings.mode === 'en' ? '영→한' : '한→영 (출력)';
    $('#chipMode').classList.toggle('on', S.settings.mode === 'ko');
    $('#chipAuto').textContent = '자동 발음';
    $('#chipAuto').classList.toggle('on', !!S.settings.autoSpeak);
    if (S.settings.autoSpeak && !silent) setTimeout(function () {
      if (!card.isConnected || currentWord() !== w) return;
      var spoke = false;
      if (S.settings.mode === 'en') { speak(w.w); spoke = true; }
      $$('.reveal', card).forEach(function (r) {
        if (Number(r.getAttribute('data-step') || 0) < 1) return;
        var kind = r.getAttribute('data-reveal');
        var t = kind === 'e' ? w.e : (kind === 'w' ? w.w : null);
        if (t) { speak(t, 'en', spoke); spoke = true; }
      });
    }, anim !== 'none' ? 250 : 400);
  }

  // 가리기 → 영어 → (해석) → 가리기 순환. 영어가 새로 보일 때 자동 발음.
  function cycleReveal(r, forceOpen, queue) {
    var step = Number(r.getAttribute('data-step') || 0), max = Number(r.getAttribute('data-max') || 1);
    var next = forceOpen ? max : (step >= max ? 0 : step + 1);
    if (next === step) return false;
    r.setAttribute('data-step', String(next));
    bridge.vibrate(6);
    if (step === 0 && next >= 1 && S.settings.autoSpeak) {
      var w = currentWord(), kind = r.getAttribute('data-reveal');
      var t = w ? (kind === 'e' ? w.e : (kind === 'w' ? w.w : null)) : null;
      if (t) { speak(t, 'en', queue); return true; }
    }
    return false;
  }

  var suppressClick = false;
  var LONG_PRESS_MS = 480;
  function bindDrag(card) {
    var drag = null, lpTimer = null, lpFired = false;
    var yes = $('.stamp.yes', card), no = $('.stamp.no', card);
    function stamps(dy) {
      yes.style.opacity = clamp(-dy / 70, 0, 1);
      no.style.opacity = clamp(dy / 70, 0, 1);
    }
    function reset() {
      card.style.transition = 'transform .25s ease-out';
      card.style.transform = '';
      stamps(0);
    }
    function clearLp() { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }
    card.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      lpFired = false; clearLp();
      drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: Date.now(), moved: false, axis: null, id: e.pointerId, target: e.target };
      try { card.setPointerCapture(e.pointerId); } catch (err) { }
      card.style.transition = 'none';
      // long-press on the example block → edit / AI sheet (pointer capture stays on the card so the
      // release that follows lands here, not on the sheet that opened underneath the finger)
      if (e.target.closest('.reveal[data-reveal="e"], .plain')) {
        lpTimer = setTimeout(function () {
          lpTimer = null;
          if (!drag || drag.moved) return;
          drag = null; reset();
          lpFired = true;
          var w = currentWord(); if (!w) return;
          bridge.vibrate(18);
          openExampleEditor(w.id);
        }, LONG_PRESS_MS);
      }
    });
    card.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
      if (!drag.axis && (Math.abs(drag.dx) > 8 || Math.abs(drag.dy) > 8)) { drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'x' : 'y'; drag.moved = true; clearLp(); }
      if (drag.axis === 'x') { card.style.transform = 'translate(' + drag.dx + 'px,0) rotate(' + (drag.dx / 30) + 'deg)'; stamps(0); }
      else if (drag.axis === 'y') { card.style.transform = 'translate(0,' + drag.dy + 'px)'; stamps(drag.dy); }
    });
    card.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    function up(e) {
      clearLp();
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      var dt = Math.max(1, Date.now() - d.t);
      if (d.moved) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 60); }
      if (d.axis === 'x') {
        var thx = Math.min(120, card.offsetWidth * 0.3), vx = d.dx / dt;
        if (Math.abs(d.dx) > thx || (Math.abs(vx) > 0.6 && Math.abs(d.dx) > 30)) {
          var step = d.dx < 0 ? 1 : -1;
          if (canNavigate(step)) { flyOut(card, d.dx < 0 ? 'left' : 'right', function () { navigate(step); }); return; }
          toast(step > 0 ? '마지막 카드예요' : '첫 카드예요');
        }
        reset(); return;
      }
      if (d.axis === 'y') {
        var thy = Math.min(110, card.offsetHeight * 0.25), vy = d.dy / dt;
        if (Math.abs(d.dy) > thy || (Math.abs(vy) > 0.6 && Math.abs(d.dy) > 30)) { var yesv = d.dy < 0; flyOut(card, yesv ? 'up' : 'down', function () { judge(yesv); }); return; }
        reset(); return;
      }
      reset();
      if (!d.moved && d.target && d.target.closest) {
        var r = d.target.closest('.reveal');
        if (r) { cycleReveal(r); suppressClick = true; setTimeout(function () { suppressClick = false; }, 60); }
      }
    }
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', function (e) { clearLp(); if (drag && e.pointerId === drag.id) { drag = null; reset(); } });
    card.addEventListener('click', function (e) {
      if (lpFired) { lpFired = false; e.stopPropagation(); return; }
      if (suppressClick) { e.stopPropagation(); return; }
      if (e.target.closest('button')) return;
      var r = e.target.closest('.reveal');
      if (r) cycleReveal(r);
    });
  }
  var flying = false;
  // dir: 'up' | 'down' | 'left' | 'right'
  function flyOut(card, dir, done) {
    if (flying) return; flying = true;
    var W = window.innerWidth + 200, H = window.innerHeight + 200, tf;
    card.style.transition = 'transform .26s ease-in, opacity .26s ease-in';
    if (dir === 'up') { tf = 'translate(0,-' + H + 'px) rotate(-4deg)'; $('.stamp.yes', card).style.opacity = 1; }
    else if (dir === 'down') { tf = 'translate(0,' + H + 'px) rotate(4deg)'; $('.stamp.no', card).style.opacity = 1; }
    else if (dir === 'left') tf = 'translate(-' + W + 'px,0) rotate(-14deg)';
    else tf = 'translate(' + W + 'px,0) rotate(14deg)';
    card.style.transform = tf;
    card.style.opacity = '0';
    bridge.vibrate(12);
    setTimeout(function () { flying = false; done(); }, 200);
  }
  function canNavigate(step) { var ni = SES.i + step; return ni >= 0 && ni < SES.ids.length; }
  function navigate(step) {
    if (!SES || !canNavigate(step)) return;
    SES.i += step;
    mountCard(step > 0 ? 'next' : 'prev');
  }
  function judge(yes, demote) {
    var w = currentWord(); if (!w) return;
    var id = w.id, prevKind = SES.done[id] || null, o = SES.orig[id], now = Date.now();
    SES.undo.push({ id: id, i: SES.i, prevKind: prevKind, before: snap(w) });
    var d = dayStat();
    if (prevKind) { d.judged = Math.max(0, d.judged - 1); if (prevKind === 'yes') d.memorized = Math.max(0, d.memorized - 1); }
    // re-apply from the original snapshot so a re-judged card never double-counts
    for (var k in o) w[k] = o[k];
    w.seen = o.seen + 1; w.lastSeen = now;
    if (demote) { w.stage = 1; w.stageAt = now; w.dailyDate = localDate(); w.wrong = o.wrong + 1; SES.done[id] = 'demote'; }
    else if (yes) { w.right = o.right + 1; w.stage = Math.min(4, o.stage + 1); w.stageAt = now; SES.done[id] = 'yes'; }
    else { w.wrong = o.wrong + 1; SES.done[id] = 'no'; }
    d.judged++; if (yes && !demote) d.memorized++;
    save();
    var n = SES.ids.length;
    if (judgedCount() >= n) { finishSession(); return; }
    for (var s = 1; s <= n; s++) { var c = (SES.i + s) % n; if (!SES.done[SES.ids[c]]) { SES.i = c; break; } }
    mountCard('judge');
  }
  function undo() {
    if (!SES || !SES.undo.length) return;
    var u = SES.undo.pop();
    var w = byId(u.id);
    if (w) for (var k in u.before) w[k] = u.before[k];
    var cur = SES.done[u.id], d = dayStat();
    if (cur) { d.judged = Math.max(0, d.judged - 1); if (cur === 'yes') d.memorized = Math.max(0, d.memorized - 1); }
    if (u.prevKind) { SES.done[u.id] = u.prevKind; d.judged++; if (u.prevKind === 'yes') d.memorized++; } else delete SES.done[u.id];
    SES.i = Math.min(u.i, SES.ids.length - 1);
    save();
    mountCard('prev');
  }
  function finishSession() {
    saveNow();
    go('summary', {}, true);
  }

  /* ================= 영어 문장 공부 (v2.12) =================
     졸업한 단어의 예문: 한글 → (탭) 가려 둔 영어가 보이며 읽어 줌 → ▲ 쉬움 / ▼ 어려움. 끝없이 계속 꺼낸다.
     가중치 sw(1~20, 처음 3): 어려움 +2 · 쉬움 −1 — 클수록 자주 나온다. se/sh = 쉬움·어려움 누적 횟수, sa = 마지막으로 본 때 */
  var SENT = null;   // { id: 지금 문장(단어 id), n, recent: [최근 id], undo: [], token }
  function sentPool() { return S.words.filter(function (w) { return w.stage === 4 && w.e && w.k; }); }
  function sentW(w) { return typeof w.sw === 'number' ? w.sw : 3; }
  function sentPick(skip) {   // 가중치 비례 무작위 · skip(방금 본 것)은 빼고
    var pool = sentPool(), c = pool.filter(function (w) { return skip.indexOf(w.id) < 0; });
    if (!c.length) c = pool;
    var tot = 0; c.forEach(function (w) { tot += sentW(w); });
    var r = Math.random() * tot;
    for (var i = 0; i < c.length; i++) { r -= sentW(c[i]); if (r < 0) return c[i]; }
    return c[c.length - 1] || null;
  }
  function sentNext() {
    var k = Math.min(3, Math.floor(sentPool().length / 2)), w = sentPick(k > 0 ? SENT.recent.slice(-k) : []);   // 방금 본 3문장은 바로 다시 안 나오게 — 후보는 늘 2개 이상 남겨 가중치가 먹게 (문장이 적을 때 같은 순서로만 돌던 것)
    SENT.id = w ? w.id : null;
    if (w) { SENT.recent.push(w.id); if (SENT.recent.length > 20) SENT.recent.shift(); }
  }
  function sentStart() {
    if (!sentPool().length) { toast('졸업한 단어 중 예문·해석이 있는 단어가 아직 없어요'); return; }
    SENT = { id: null, n: 0, recent: [], undo: [], token: Date.now() };
    sentNext(); go('sent');
  }
  RENDER.sent = function () {
    if (!SENT) { go('home', {}, true); return; }
    var v = $('#view-sent');
    if (v.getAttribute('data-token') !== String(SENT.token)) {
      v.setAttribute('data-token', String(SENT.token));
      v.innerHTML = '<div class="study" style="--c:var(--s4)">' +
        '<div class="study-top"><button class="icon-btn" data-action="back" aria-label="닫기">' + ICON_X + '</button>' +
        '<span class="stage-pill">졸업</span><span class="st-title">영어 문장 공부</span><span class="counter" id="sentCount"></span></div>' +
        '<div class="card-area" id="sentArea"></div>' +
        '<div class="study-actions"><div class="judge' + (S.settings.swapJudge ? ' swapped' : '') + '">' +
        '<button class="btn no" data-action="sent-judge" data-easy="0"><span>▼ 어려움</span><small>더 자주 나와요</small></button>' +
        '<button class="btn yes" data-action="sent-judge" data-easy="1"><span>▲ 쉬움</span><small>가끔 나와요</small></button></div>' +
        '<div class="navrow"><button class="btn undo" data-action="sent-undo" id="sentUndo">↶ 되돌리기</button></div>' +
        '<div class="demote">탭: 영어 보기·듣기 &nbsp;·&nbsp; ▲ 쉬움 &nbsp;·&nbsp; ▼ 어려움</div></div></div>';
    }
    sentMount('none');
  };
  function sentMount(anim) {
    var area = $('#sentArea'), w = byId(SENT.id); if (!area) return;
    area.innerHTML = '';
    $('#sentCount').innerHTML = SENT.n + '<small>문장</small>';
    $('#sentUndo').disabled = !SENT.undo.length;
    if (!w) { area.innerHTML = '<div class="empty">졸업한 단어 중 예문·해석이 있는 단어가 아직 없어요</div>'; return; }
    var card = document.createElement('div');
    card.className = 'card sent-card' + (anim === 'judge' ? ' enter' : anim === 'prev' ? ' enter-prev' : '');
    card.innerHTML = '<div class="card-top">' + (w.t ? '<span class="tag theme">' + esc(w.t) + '</span>' : '') +
      '<span class="tag pos">어려움 ' + (w.sh || 0) + ' · 쉬움 ' + (w.se || 0) + '</span></div>' +
      '<div class="plain"><div class="label">우리말</div><div class="ko-big">' + esc(w.k) + '</div></div>' +
      '<div class="reveal" data-reveal="e" data-max="1" data-step="0"><div class="label">영어</div><div class="content">' +
      '<div class="en"><span>' + esc(w.e) + '</span><button class="spk sm" data-action="sent-speak" aria-label="다시 듣기">' + ICON_SPK + '</button></div>' +
      '<div class="sent-w">' + esc(w.w) + ' · ' + esc(w.m) + '</div></div><div class="cover">영어로 말해 본 뒤 탭</div></div>' +
      '<div class="stamp yes pos-t">쉬움</div><div class="stamp no pos-b">어려움</div>';
    area.appendChild(card);
    sentBind(card);
  }
  function sentTap() {   // 처음 탭 = 영어 보이기 + 읽기, 그다음 탭 = 다시 읽기
    var w = byId(SENT.id), r = $('#sentArea .reveal'); if (!w || !r) return;
    if (r.getAttribute('data-step') === '0') { r.setAttribute('data-step', '1'); bridge.vibrate(6); }
    speak(w.e, 'en');
  }
  function sentBind(card) {   // 위·아래로만 민다 (학습 카드 bindDrag 의 세로 부분)
    var d = null, sup = false, yes = $('.stamp.yes', card), no = $('.stamp.no', card);
    function stamps(dy) { yes.style.opacity = clamp(-dy / 70, 0, 1); no.style.opacity = clamp(dy / 70, 0, 1); }
    function reset() { card.style.transition = 'transform .25s ease-out'; card.style.transform = ''; stamps(0); }
    card.addEventListener('pointerdown', function (e) {
      if (flying || e.target.closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;   // 날아가는 카드는 다시 못 잡게
      d = { x: e.clientX, y: e.clientY, dy: 0, t: Date.now(), moved: false, id: e.pointerId };
      try { card.setPointerCapture(e.pointerId); } catch (err) { }
      card.style.transition = 'none';
    });
    card.addEventListener('pointermove', function (e) {
      if (!d || e.pointerId !== d.id) return;
      d.dy = e.clientY - d.y;
      if (!d.moved && (Math.abs(d.dy) > 8 || Math.abs(e.clientX - d.x) > 8)) d.moved = true;
      if (d.moved) { card.style.transform = 'translate(0,' + d.dy + 'px)'; stamps(d.dy); }
    });
    card.addEventListener('pointerup', function (e) {
      if (!d || e.pointerId !== d.id) return;
      var q = d; d = null;
      if (!q.moved) { reset(); return; }   // 탭은 click 에서 (TalkBack·키보드 클릭도 되게)
      sup = true; setTimeout(function () { sup = false; }, 60);   // 민 뒤에 오는 click 은 탭 아님
      var th = Math.min(110, card.offsetHeight * 0.25), v = q.dy / Math.max(1, Date.now() - q.t);
      if (Math.abs(q.dy) > th || (Math.abs(v) > 0.6 && Math.abs(q.dy) > 30)) { var easy = q.dy < 0; flyOut(card, easy ? 'up' : 'down', function () { sentJudge(easy); }); return; }
      reset();
    });
    card.addEventListener('pointercancel', function (e) { if (d && e.pointerId === d.id) { d = null; reset(); } });
    card.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    card.addEventListener('click', function (e) { if (sup || flying || e.target.closest('button')) return; sentTap(); });
  }
  function sentJudge(easy) {
    var w = byId(SENT.id); if (!w) return;
    SENT.undo.push({ id: w.id, sw: w.sw, se: w.se, sh: w.sh, sa: w.sa });
    if (easy) { w.sw = Math.max(1, sentW(w) - 1); w.se = (w.se || 0) + 1; }
    else { w.sw = Math.min(20, sentW(w) + 2); w.sh = (w.sh || 0) + 1; }
    w.sa = Date.now(); SENT.n++; useCount('sent');
    save(); bridge.stop();
    sentNext(); sentMount('judge');
  }
  function sentUndo() {
    var u = SENT && SENT.undo.pop(), w = u && byId(u.id); if (!w) return;
    ['sw', 'se', 'sh', 'sa'].forEach(function (k) { if (u[k] === undefined) delete w[k]; else w[k] = u[k]; });
    var j = SENT.recent.lastIndexOf(u.id); if (j >= 0) SENT.recent.length = j + 1;   // 되돌린 뒤 보던 (판정 안 한) 카드는 최근 목록에서 뺀다
    SENT.n = Math.max(0, SENT.n - 1); SENT.id = u.id; useCount('sent', -1);
    save(); bridge.stop(); sentMount('prev');
  }

  /* ================= SUMMARY ================= */
  RENDER.summary = function () {
    if (!SES) { go('home', {}, true); return; }
    var st = SES.stage, n = SES.ids.length, moved = sesList('yes').length, kept = sesList('no').length, dem = sesList('demote').length;
    var next = st === 3 ? '졸업' : STAGE_SHORT[st + 1] + '로 이동';
    var allDone = kept === 0 && dem === 0;
    // 연속 학습일 신기록 — 오늘 처음 넘어서는 순간에만 크게 축하 (같은 날 두 번째 세션부터는 보통)
    var streak = calcStreak(), record = false;
    if (streak >= 2 && streak > (S.streakRecord || 0)) { record = true; S.streakRecord = streak; save(); }
    $('#view-summary').innerHTML =
      '<div class="summary' + (record ? ' big' : '') + '"><canvas class="confetti" id="confetti"></canvas>' +
      '<div class="emoji pop">' + (record ? '🏆' : allDone ? '🎉' : '👍') + '</div>' +
      '<h2>' + (st === 1 ? '오늘의 학습 완료!' : st === 2 ? '복습 완료!' : '최종 점검 완료!') + '</h2>' +
      (record ? '<div class="record">🔥 연속 ' + streak + '일 — 신기록!</div>' : '') +
      '<p class="muted">' + STAGE_SHORT[st] + ' ' + n + '개를 확인했어요' + (allDone ? '. 전부 넘겼어요!' : '') + '</p>' +
      '<div class="sum-grid">' +
      '<div><b style="color:var(--ok)" data-count="' + moved + '">0</b><span>' + next + '</span></div>' +
      '<div><b style="color:var(--danger)" data-count="' + kept + '">0</b><span>' + STAGE_SHORT[st] + ' 유지</span></div>' +
      (dem ? '<div><b style="color:var(--s1)" data-count="' + dem + '">0</b><span>1단계로 되돌림</span></div>' : '') +
      '<div><b data-count="' + streak + '">0</b><span>연속 학습일</span></div>' +
      '</div>' +
      '<div class="actions">' +
      (kept ? '<button class="btn primary big" data-action="retry">아직인 ' + kept + '개 바로 다시 보기</button>' : '') +
      '<button class="btn big" data-action="home">홈으로</button>' +
      '</div></div>';
    celebrate(record);
  };

  /* --- 축하 연출: 컨페티 + 숫자 카운트업 + 효과음 (신기록이면 더 길고 크게) --- */
  var audioCtx = null;
  function playChime(big) {
    if (!S.settings.sfx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var t0 = audioCtx.currentTime + 0.03;
      function tone(freq, at, vol, dur, type) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type || 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(vol, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); g.connect(audioCtx.destination); o.start(at); o.stop(at + dur + 0.05);
      }
      // 밝은 아르페지오 C–E–G–C, 신기록이면 한 옥타브 더 + 팡파르 꼬리
      var notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach(function (f, i) { tone(f, t0 + i * 0.1, 0.22, i === notes.length - 1 ? 0.55 : 0.28); tone(f * 2, t0 + i * 0.1, 0.05, 0.25, 'sine'); });
      if (big) {
        [1318.5, 1567.98].forEach(function (f, i) { tone(f, t0 + 0.4 + i * 0.1, 0.22, 0.5); });
        [783.99, 1046.5, 1318.5].forEach(function (f, i) { tone(f, t0 + 0.95 + i * 0.16, 0.2, i === 2 ? 0.9 : 0.35); tone(f / 2, t0 + 0.95 + i * 0.16, 0.12, i === 2 ? 0.9 : 0.35, 'sine'); });
      }
    } catch (e) { }
  }
  function countUp(el, target, ms) {
    var t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e);
      if (p < 1 && el.isConnected) requestAnimationFrame(frame); else el.textContent = target;
    }
    requestAnimationFrame(frame);
  }
  var confettiRun = 0;
  function confetti(canvas, big) {
    var run = ++confettiRun, ctx = canvas.getContext('2d'); if (!ctx) return;
    var W = canvas.clientWidth || 360, H = canvas.clientHeight || 640, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.scale(dpr, dpr);
    var cs = getComputedStyle(document.documentElement);
    var colors = ['--primary', '--primary-2', '--s1', '--s2', '--s3', '--s4', '--ok'].map(function (v) { return cs.getPropertyValue(v).trim() || '#4F46E5'; });
    var parts = [], t0 = performance.now(), life = big ? 4600 : 2600;
    function burst(n, y0, spread) {
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (Math.random() - 0.5) * spread, sp = 4 + Math.random() * (big ? 9 : 7);
        parts.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length], born: performance.now(), circle: Math.random() < 0.3 });
      }
    }
    burst(big ? 160 : 110, H * 0.55, 1.6);
    if (big) { setTimeout(function () { if (run === confettiRun) burst(120, H * 0.45, 2.2); }, 700); setTimeout(function () { if (run === confettiRun) burst(90, H * 0.6, 1.4); }, 1500); }
    function frame(now) {
      if (run !== confettiRun || !canvas.isConnected) return;
      var el = now - t0; ctx.clearRect(0, 0, W, H);
      var alive = 0;
      parts.forEach(function (p) {
        p.vy += 0.16; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        var age = now - p.born, fade = Math.max(0, 1 - age / (life * 0.75));
        if (p.y > H + 20 || fade <= 0) return; alive++;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.4, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (el < life && alive) requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }
  function celebrate(big) {
    var c = $('#confetti'); if (c) confetti(c, big);
    $$('#view-summary [data-count]').forEach(function (el) { countUp(el, Number(el.getAttribute('data-count')) || 0, big ? 1100 : 800); });
    playChime(big);
    bridge.vibrate(big ? 40 : 15);
  }

  /* ================= STATS (통계) ================= */
  function bestStreak() { return bestStreakOf(S.studyDays); }
  function bestStreakOf(studyDays) {
    studyDays = studyDays || {};
    var days = Object.keys(studyDays).filter(function (k) { return studyDays[k] && studyDays[k].judged > 0; }).sort();
    var best = 0, run = 0, prev = null;
    days.forEach(function (k) {
      var d = new Date(k + 'T00:00:00');
      if (prev && (d - prev) === 86400000) run++; else run = 1;
      if (run > best) best = run;
      prev = d;
    });
    return best;
  }
  /* ================= 사용 기록 (v2.13) =================
     앱이 화면에 떠 있는 시간을 날짜·기능별로 쌓는다 (화면이 꺼지거나 앱이 내려가면 멈춤 — 백그라운드 듣기 복습은 안 셈).
     S.usage['YYYY-MM-DD'] = { t: 총 ms, f: { 기능: ms }, c: { sent·yt·talk: 횟수 } } — 판정한 카드 수는 studyDays */
  var USE_FEAT = { study: 'study', summary: 'study', sent: 'sent', talk: 'talk', chat: 'talk', yt: 'yt', ytv: 'yt', audio: 'audio' };   // 나머지(홈·단어장·추가·설정·통계) = etc
  var USE_ORDER = [['study', '단어 학습'], ['sent', '문장 공부'], ['talk', '회화 연습'], ['yt', '유튜브'], ['audio', '듣기 복습'], ['etc', '홈·단어장·설정']];
  var USE = { f: null, at: 0, paused: false, saved: 0 }, useSel = null;   // useSel: 통계에서 고른 날
  function useDay() { var d = localDate(); return S.usage[d] || (S.usage[d] = { t: 0, f: {}, c: {} }); }
  function useTick() {   // 지금까지 잰 시간을 넣고, 지금 화면의 기능으로 다시 잰다
    if (!S) return;
    var now = Date.now();
    if (USE.f && USE.at) {
      var ms = Math.min(now - USE.at, 60000);   // ponytail: 틱(15초)이 밀려도 한 번에 최대 1분 — 멈춘 틈이 통째로 들어가지 않게
      if (ms > 0) { var u = useDay(); u.t += ms; u.f[USE.f] = (u.f[USE.f] || 0) + ms; }
    }
    var c = current();
    USE.f = USE.paused || document.hidden || !c ? null : (USE_FEAT[c.view] || 'etc');
    USE.at = now;
    if (now - USE.saved > 60000) { USE.saved = now; save(); }
  }
  function useCount(k, n) { var u = useDay(); u.c[k] = Math.max(0, (u.c[k] || 0) + (n || 1)); }
  setInterval(useTick, 15000);
  function fmtMin(ms, html) {   // 32분 · 1시간 5분
    var m = Math.round(ms / 60000), u = function (x) { return html ? '<small>' + x + '</small>' : x; };
    return m < 60 ? m + u('분') : Math.floor(m / 60) + u('시간') + (m % 60 ? ' ' + (m % 60) + u('분') : '');
  }
  function useHTML(today) {   // 통계: 앱 사용 — 오늘·7일 평균 타일, 최근 14일(날짜를 누르면 그날), 기능별 시간·횟수
    var U = S.usage, all = 0, w7 = 0, max = 1, bars = [];
    for (var k in U) all += U[k].t || 0;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(today); d.setDate(today.getDate() - i);
      var key = dateKey(d), v = (U[key] || {}).t || 0;
      bars.push({ d: d, k: key, v: v }); if (v > max) max = v; if (i < 7) w7 += v;
    }
    var sel = useSel || dateKey(today);   // 기록 없는 날도 고를 수 있게 ("이날은 기록이 없어요")
    if (!bars.some(function (b) { return b.k === sel; })) sel = dateKey(today);
    var maxIdx = 0; bars.forEach(function (b, i) { if (b.v > bars[maxIdx].v) maxIdx = i; });
    var barsHtml = bars.map(function (b, i) {
      var on = b.k === sel, lab = b.v > 0 && (on || i === maxIdx) ? '<span class="bv">' + Math.round(b.v / 60000) + '</span>' : '';
      return '<div class="bar-col' + (on ? ' sel' : '') + '" role="button" data-action="use-day" data-d="' + b.k + '" aria-label="' + (b.d.getMonth() + 1) + '월 ' + b.d.getDate() + '일 ' + fmtMin(b.v) + '">' +
        '<div class="bar-stack">' + lab + '<div class="bar u" style="height:' + Math.round(b.v / max * 100) + '%"></div></div>' +
        '<div class="bar-x' + (b.d.getDay() === 0 ? ' sun' : '') + '">' + (i % 2 === 1 || on ? b.d.getDate() : '') + '</div></div>';
    }).join('');
    var e = U[sel] || { t: 0, f: {}, c: {} }, sd = new Date(sel + 'T00:00:00'), isToday = sel === dateKey(today);
    var rows = USE_ORDER.filter(function (o) { return e.f[o[0]] > 0; }).map(function (o) {
      var ms = e.f[o[0]], pct = e.t ? Math.max(2, Math.round(ms / e.t * 100)) : 0;
      return '<div class="srow"><div class="sl">' + o[1] + '</div><div class="sbar"><div style="width:' + pct + '%;background:var(--primary)"></div></div><div class="sn">' + Math.round(ms / 60000) + '<small>분</small></div></div>';
    }).join('');
    var cards = (S.studyDays[sel] || {}).judged || 0, cc = e.c || {};
    var cnt = [cards ? '카드 ' + cards + '개' : '', cc.sent ? '문장 공부 ' + cc.sent + '문장' : '', cc.yt ? '유튜브 ' + cc.yt + '문장 재생' : '', cc.talk ? '회화 ' + cc.talk + '번 말하기' : ''].filter(Boolean).join(' · ');
    return '<div class="tiles">' +
      '<div class="tile"><b>' + fmtMin((U[dateKey(today)] || {}).t || 0, true) + '</b><span>오늘 앱 사용</span></div>' +
      '<div class="tile"><b>' + fmtMin(w7 / 7, true) + '</b><span>최근 7일 하루 평균</span></div>' +
      '</div>' +
      '<div class="card-box"><div class="cb-title">앱 사용 시간 <span class="muted small">누적 ' + fmtMin(all) + '</span></div>' +
      '<div class="bars">' + barsHtml + '</div><div class="legend"><span>하루 사용 시간(분) · 막대를 누르면 그날 기능별</span></div></div>' +
      '<div class="card-box" id="useDay"><div class="cb-title">' + (isToday ? '오늘' : (sd.getMonth() + 1) + '월 ' + sd.getDate() + '일') + ' 기능별 <span class="muted small">' + fmtMin(e.t) + '</span></div>' +
      (rows || '<div class="empty">' + (isToday ? '오늘은 아직 기록이 없어요' : '이날은 기록이 없어요') + '</div>') +
      (cnt ? '<div class="use-c">' + cnt + '</div>' : '') + '</div>';
  }

  RENDER.stats = function () {
    var c = counts(), total = S.words.length, days = S.studyDays;
    var totJ = 0, totM = 0, dayCount = 0;
    for (var k in days) { totJ += days[k].judged || 0; totM += days[k].memorized || 0; if (days[k].judged > 0) dayCount++; }
    var rate = totJ ? Math.round(totM / totJ * 100) : 0;
    var today = new Date(); today.setHours(0, 0, 0, 0);

    // 최근 14일
    var bars = [], maxJ = 1;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(today); d.setDate(today.getDate() - i);
      var st = days[dateKey(d)] || { judged: 0, memorized: 0 };
      bars.push({ d: d, j: st.judged || 0, m: st.memorized || 0 });
      if (st.judged > maxJ) maxJ = st.judged;
    }
    var maxIdx = 0; bars.forEach(function (b, i) { if (b.j > bars[maxIdx].j) maxIdx = i; });
    var barsHtml = bars.map(function (b, i) {
      var hj = Math.round(b.j / maxJ * 100), hm = Math.round(b.m / maxJ * 100);
      var label = (b.j > 0 && (i === maxIdx || i === 13)) ? '<span class="bv">' + b.j + '</span>' : '';
      var dow = b.d.getDay();
      return '<div class="bar-col"><div class="bar-stack">' + label + '<div class="bar j" style="height:' + hj + '%"></div><div class="bar m" style="height:' + hm + '%"></div></div>' +
        '<div class="bar-x' + (dow === 0 ? ' sun' : '') + '">' + (i % 2 === 1 ? b.d.getDate() : '') + '</div></div>';
    }).join('');

    // 12주 히트맵 (월요일 시작)
    var dow0 = (today.getDay() + 6) % 7; // Mon=0
    var start = new Date(today); start.setDate(today.getDate() - dow0 - 7 * 11);
    var cells = '';
    for (var w = 0; w < 12; w++) {
      cells += '<div class="hm-col">';
      for (var r = 0; r < 7; r++) {
        var cd = new Date(start); cd.setDate(start.getDate() + w * 7 + r);
        var key = dateKey(cd), v = days[key] ? (days[key].judged || 0) : 0;
        var lvl = cd > today ? 'future' : v === 0 ? 'l0' : v < 10 ? 'l1' : v < 20 ? 'l2' : v < 40 ? 'l3' : 'l4';
        cells += '<div class="hm-cell ' + lvl + '" title="' + key + ' · ' + v + '"></div>';
      }
      cells += '</div>';
    }

    // 단계별 분포
    var stageRows = [0, 1, 2, 3, 4].map(function (st) {
      var n = c[st] || 0, pct = total ? Math.round(n / total * 100) : 0;
      var label = (st === 1 || st === 2 || st === 3) ? STAGE_SHORT[st] + ' ' + STAGE_NAME[st] : STAGE_NAME[st];
      return '<div class="srow"><div class="sl"><span class="dot" style="background:' + STAGE_COLOR[st] + '"></span>' + label + '</div>' +
        '<div class="sbar"><div style="width:' + pct + '%;background:' + STAGE_COLOR[st] + '"></div></div><div class="sn">' + n + '<small>개</small></div></div>';
    }).join('');

    // 자주 틀린 단어
    var hard = S.words.filter(function (w) { return w.wrong > 0; }).sort(function (a, b) { return b.wrong - a.wrong || a.right - b.right; }).slice(0, 5);
    var hardHtml = hard.length ? hard.map(function (w) {
      return '<button class="item" style="--c:' + STAGE_COLOR[w.stage] + '" data-action="open" data-id="' + esc(w.id) + '"><span class="dot"></span><div class="it-body"><div class="it-w">' + esc(w.w) + '</div><div class="it-m">' + esc(w.m) + '</div></div>' +
        '<span class="it-tag">아직 ' + w.wrong + '회 · 외움 ' + w.right + '회</span></button>';
    }).join('') : '<div class="empty">아직 "아직"으로 표시한 단어가 없어요</div>';

    // 이번 주
    var wk = 0, wkDays = 0;
    for (var q = 0; q <= dow0; q++) { var wd = new Date(today); wd.setDate(today.getDate() - q); var ws = days[dateKey(wd)]; if (ws && ws.judged > 0) { wkDays++; wk += ws.judged; } }

    $('#view-stats').innerHTML =
      '<div class="wrap">' +
      '<div class="home-head"><h1>통계</h1><span class="muted small">' + fmtToday() + '</span></div>' +
      '<div class="tiles">' +
      '<div class="tile"><b>' + calcStreak() + '<small>일</small></b><span>연속 학습</span></div>' +
      '<div class="tile"><b>' + bestStreak() + '<small>일</small></b><span>최장 연속</span></div>' +
      '<div class="tile"><b>' + dayCount + '<small>일</small></b><span>총 학습일</span></div>' +
      '<div class="tile"><b>' + rate + '<small>%</small></b><span>외움률 (' + totM + '/' + totJ + ')</span></div>' +
      '</div>' + useHTML(today) +
      '<div class="card-box"><div class="cb-title">최근 14일 <span class="muted small">이번 주 ' + wkDays + '일 · ' + wk + '개</span></div>' +
      '<div class="bars">' + barsHtml + '</div>' +
      '<div class="legend"><span><i class="sw m"></i>외웠다</span><span><i class="sw j"></i>아직</span></div></div>' +
      '<div class="card-box"><div class="cb-title">12주 학습 활동</div><div class="hm">' + cells + '</div>' +
      '<div class="legend hm-legend"><span>적음</span><i class="hm-cell l0"></i><i class="hm-cell l1"></i><i class="hm-cell l2"></i><i class="hm-cell l3"></i><i class="hm-cell l4"></i><span>많음</span></div></div>' +
      '<div class="card-box"><div class="cb-title">단어 분포 <span class="muted small">총 ' + total + '개</span></div>' + stageRows + '</div>' +
      '<div class="card-box"><div class="cb-title">자주 틀린 단어</div><div class="list">' + hardHtml + '</div></div>' +
      '</div>';
  };

  /* ================= LIST ================= */
  var listState = { stage: 'all', q: '', star: false };
  /* ================= 회화 연습 (TALK) ================= */
  // 말하기(기기 음성인식) → Gemini(대화 + 한 줄 교정) → 듣기(기기 TTS). 미션 단어는 1단계 단어에서 뽑는다.
  var SCENARIOS = [
    { id: 'cafe', name: '카페·식당', icon: '☕', role: 'a barista or a server', desc: 'Ordering drinks or food, asking about the menu, small talk with staff' },
    { id: 'work', name: '회의·업무', icon: '💼', role: 'a colleague in a project meeting', desc: 'Discussing a schedule, asking for updates, giving and asking opinions' },
    { id: 'travel', name: '여행·공항', icon: '✈️', role: 'airport or hotel staff, or a fellow traveler', desc: 'Check-in, directions, hotel requests, sightseeing tips' },
    { id: 'daily', name: '일상 잡담', icon: '🌤', role: 'a friendly neighbor', desc: 'Weekend plans, weather, hobbies, family, food' },
    { id: 'free', name: '자유 주제', icon: '💬', role: 'a friendly conversation partner', desc: 'Whatever the learner wants to talk about' }
  ];
  var LEVELS = { easy: 'CEFR A2 — short simple sentences, very common words', normal: 'CEFR B1 — natural everyday spoken English', hard: 'CEFR B2 — richer vocabulary, idioms, longer turns' };
  function defaultTalk() { return { level: 'normal', feedbackLang: 'ko', speak: true, autoSend: false, missionN: 5, scenario: 'cafe', guide: true, missionSrc: 'star', showKo: true }; }
  function scenarioById(id) { for (var i = 0; i < SCENARIOS.length; i++) if (SCENARIOS[i].id === id) return SCENARIOS[i]; return SCENARIOS[0]; }
  var TALK = null;          // 진행 중인 대화 { scenario, custom, level, words:[{id,w,m,used}], msgs:[{role,text,fix,note,hidden}], busy, ended, startedAt }
  var talkSetup = null;     // 설정 화면 상태 { custom, words }
  var STT = { on: false, partial: '', wait: false, timer: 0 };   // wait: 멈춘 뒤 결과를 기다리는 중

  // 미션 단어 뽑기 — 'star': ★ 단어 먼저(모자라면 아래 순서로 채움), 'auto': 1단계 → 2단계 → 나머지
  function pickMissionWords(n) {
    if (!n) return [];
    function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    var out = [], have = {};
    function take(list) { shuf(list).forEach(function (w) { if (out.length < n && !have[w.id]) { have[w.id] = true; out.push(w); } }); }
    if (S.settings.talk.missionSrc === 'star') take(S.words.filter(function (w) { return w.star; }));
    if (out.length < n) take(S.words.filter(function (w) { return w.stage === 1; }));
    if (out.length < n) take(S.words.filter(function (w) { return w.stage === 2; }));
    if (out.length < n) take(S.words.filter(function (w) { return w.stage === 3 || w.stage === 0; }));
    return out.map(function (w) { return { id: w.id, w: w.w, m: w.m, star: !!w.star, used: false }; });
  }

  RENDER.talk = function (p) {
    var t = S.settings.talk;
    if (!talkSetup || (p && p.reset)) talkSetup = { custom: '', words: pickMissionWords(t.missionN), more: false };
    var log = (S.talkLog || []).slice(-10).reverse(), stars = starCount();
    $('#view-talk').innerHTML =
      '<div class="topbar"><button class="icon-btn" data-action="back">' + ICON_BACK + '</button><span class="title">회화 연습</span><span style="width:42px"></span></div>' +
      '<div class="wrap">' +
      '<div class="section-title">상황</div>' +
      '<div class="scen-grid">' + SCENARIOS.map(function (s) {
        return '<button class="scen' + (s.id === t.scenario ? ' on' : '') + '" data-action="talk-scenario" data-id="' + s.id + '"><span class="ic">' + s.icon + '</span><span>' + s.name + '</span></button>';
      }).join('') + '</div>' +
      (t.scenario === 'free' ? '<div class="field" style="margin-top:8px"><input id="talk-custom" placeholder="원하는 상황 (예: 학회에서 발표 후 질문 받기)" value="' + esc(talkSetup.custom) + '"></div>' : '') +
      '<div class="section-title">미션 단어 <span class="muted">— 대화 중에 써 보세요</span></div>' +
      '<div class="card-box mission-box">' +
      (talkSetup.words.length ? '<div class="mission">' + talkSetup.words.map(function (w) { return '<button class="mchip' + (w.star ? ' starred' : '') + '" data-action="mission-word" data-id="' + esc(w.id) + '">' + (w.star ? '★ ' : '') + esc(w.w) + '</button>'; }).join('') + '</div>' : '<div class="muted small">미션 단어 없이 자유롭게 대화해요</div>') +
      '<div class="row" style="margin-top:10px"><div class="pick" style="flex:1">' + [0, 3, 5, 8].map(function (n) { return '<button class="' + (n === t.missionN ? 'on' : '') + '" data-action="talk-mission-n" data-n="' + n + '">' + (n ? n + '개' : '없음') + '</button>'; }).join('') + '</div><button class="btn" data-action="talk-reroll" style="flex:none">🎲 다시 뽑기</button></div>' +
      '<div class="row" style="margin-top:8px;align-items:center"><span class="small muted" style="flex:none">뽑는 순서</span><div class="pick" style="flex:1">' + [['star', '★ 단어 먼저' + (stars ? ' (' + stars + ')' : '')], ['auto', '오늘 학습 단어']].map(function (o) { return '<button class="' + (o[0] === (t.missionSrc || 'star') ? 'on' : '') + '" data-action="talk-src" data-value="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      (stars || t.missionSrc !== 'star' ? '' : '<div class="small muted" style="margin-top:6px">학습 카드에서 ★을 누른 단어가 여기 먼저 나와요. 아직 없어서 오늘 학습 단어로 채웠어요.</div>') +
      '</div>' +
      '<div class="settings-group">' +
      '<div class="switch-row"><div><div class="sw-t">난이도</div></div><div class="pick">' + [['easy', '쉽게'], ['normal', '보통'], ['hard', '어렵게']].map(function (o) { return '<button class="' + (o[0] === t.level ? 'on' : '') + '" data-action="talk-set" data-key="level" data-value="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<button class="switch-row more-row" data-action="talk-more"><div><div class="sw-t">세부 설정</div><div class="sw-s">' + esc([t.feedbackLang === 'en' ? '교정 영어' : '교정 한국어', t.speak ? '읽어 주기' : '', t.autoSend ? '바로 보내기' : '', t.showKo ? '한글 번역' : ''].filter(Boolean).join(' · ')) + '</div></div><span class="chev">' + (talkSetup.more ? '▴' : '▾') + '</span></button>' +
      (talkSetup.more ?
        '<div class="switch-row"><div><div class="sw-t">교정 설명</div></div><div class="pick">' + [['ko', '한국어'], ['en', '영어']].map(function (o) { return '<button class="' + (o[0] === t.feedbackLang ? 'on' : '') + '" data-action="talk-set" data-key="feedbackLang" data-value="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="switch-row"><div><div class="sw-t">AI 답변 읽어 주기</div><div class="sw-s">답변이 오면 바로 음성으로 재생</div></div><button class="toggle' + (t.speak ? ' on' : '') + '" data-action="talk-toggle" data-key="speak"></button></div>' +
        '<div class="switch-row"><div><div class="sw-t">AI 답변 한글 번역</div><div class="sw-s">말풍선 아래 흐리게 보여 주고, 누르면 선명해져요</div></div><button class="toggle' + (t.showKo ? ' on' : '') + '" data-action="talk-toggle" data-key="showKo"></button></div>' +
        '<div class="switch-row"><div><div class="sw-t">말하면 바로 보내기</div><div class="sw-s">끄면 인식된 문장을 고친 뒤 보낼 수 있어요</div></div><button class="toggle' + (t.autoSend ? ' on' : '') + '" data-action="talk-toggle" data-key="autoSend"></button></div>'
        : '') +
      '</div>' +
      '<button class="btn primary big" data-action="talk-start">🗣 대화 시작</button>' +
      (AI.key ? '' : '<div class="tip">Gemini API 키가 필요해요. <b data-action="go-settings-ai" style="text-decoration:underline">설정에서 입력</b>하면 무료로 쓸 수 있어요.</div>') +
      (log.length ? '<div class="section-title">최근 연습 <span class="muted">— 누르면 리포트 다시 보기</span></div><div class="settings-group">' + log.map(function (l, i) {
        return '<button class="switch-row logrow" data-action="talk-log" data-i="' + ((S.talkLog.length - 1) - i) + '"><div><div class="sw-t">' + esc(scenarioById(l.scenario).icon + ' ' + (l.custom || scenarioById(l.scenario).name)) + '</div><div class="sw-s">' + esc(l.date + (l.time ? ' ' + l.time : '')) + ' · ' + l.turns + '턴 · 미션 ' + l.used + '/' + l.total + (l.score ? ' · ★' + l.score : '') + '</div></div><span class="chev">›</span></button>';
      }).join('') + '</div>' : '') +
      '</div>';
    var ci = $('#talk-custom'); if (ci) ci.addEventListener('input', function (e) { talkSetup.custom = e.target.value; });
  };

  function talkStart() {
    if (!AI.key) {
      confirm2('Gemini API 키가 아직 없어요.\n설정에서 키를 입력할까요?', '설정으로').then(function (ok) { if (ok) go('settings', { scroll: 'ai' }); });
      return;
    }
    var t = S.settings.talk;
    TALK = { scenario: t.scenario, custom: (talkSetup && talkSetup.custom || '').trim(), level: t.level, words: (talkSetup ? talkSetup.words : []).map(function (w) { return { id: w.id, w: w.w, m: w.m, star: !!w.star, used: false }; }), msgs: [], busy: false, ended: false, startedAt: Date.now(), turns: 0, req: 0, reqAt: 0 };
    sttReset(); KO = { src: '', busy: false };
    go('chat');
    talkTurn(null);
  }

  function talkSystem() {
    var sc = scenarioById(TALK.scenario), words = TALK.words.map(function (x) { return x.w; });
    var fb = S.settings.talk.feedbackLang === 'en' ? 'English' : 'Korean';
    return [
      'You are a friendly English conversation partner for a Korean adult learner. Level: ' + (LEVELS[TALK.level] || LEVELS.normal) + '.',
      'Scenario: ' + (TALK.scenario === 'free' && TALK.custom ? TALK.custom : sc.desc) + '. You play ' + sc.role + '; the learner plays themselves. Stay in the scene, be natural and warm, never lecture.',
      'Each "reply": 1-3 short spoken sentences, English only, and end with a question or prompt so the learner keeps talking.',
      words.length ? 'Target words the learner is practicing: ' + words.join(', ') + '. Steer the conversation so they get natural chances to use them; you may use them too.' : '',
      'Feedback on the learner\'s LAST message only: if it has a grammar, word-choice or naturalness problem, put the corrected full sentence in "fix" and a one-line explanation in "note" written in ' + fb + '. If it is fine, set "fix" to "" and "note" to a very short praise in ' + fb + '. For the opening turn (no learner message yet) both are "".',
      'When the learner\'s last message had a mistake, open your "reply" by naturally echoing the corrected wording inside the conversation (a recast — learner: "I go there yesterday" → reply begins "Oh, you went there yesterday? Nice!"), then carry on. Never explain grammar inside "reply".',
      '"ko": a natural, casual Korean translation of your "reply" (same meaning, spoken style).',
      '"used": the target words the learner actually used in their last message (allow inflections), else [].',
      // 할 말 알려주기는 대화 중에 켜고 끄므로 "say" 는 항상 받아 두고 표시만 토글한다
      '"say": 2 different things the learner could say back to your "reply" right now — one short and very easy, one a little fuller. Each is one natural spoken sentence the learner can read aloud as-is (first person, fits the scene, ' + (words.length ? 'prefer the target words when they fit naturally, ' : '') + 'no placeholders like [name]), with "e" = the English sentence and "k" = its Korean translation.',
      'Return JSON only: {"reply": "...", "ko": "...", "fix": "...", "note": "...", "used": [], "say": [{"e": "...", "k": "..."}]}'
    ].filter(Boolean).join('\n');
  }

  // userText null → 첫 인사(오프닝) 요청
  function talkTurn(userText) {
    if (!TALK || TALK.busy) return;
    if (userText !== null) TALK.msgs.push({ role: 'user', text: userText });
    else TALK.msgs.push({ role: 'user', text: 'Start the conversation with a natural opening line for the scenario. No feedback yet.', hidden: true });
    var myTalk = TALK, myReq = ++TALK.req;
    KO = { src: '', busy: false };
    TALK.busy = true; TALK.reqAt = Date.now(); renderChat();   // TALK.say 는 남겨 둔다 — 실패·취소 뒤에도 아직 답할 AI 말에 대한 할 말 (busy 동안엔 안 보임)
    talkWaitTick();
    var body;
    try {
      var hist = TALK.msgs.filter(function (m) { return !m.failed; }).slice(-24).map(function (m) { return { role: m.role, parts: [{ text: m.text }] }; });
      body = {
        systemInstruction: { parts: [{ text: talkSystem() }] },
        contents: hist,
        generationConfig: {
          temperature: 0.9,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { reply: { type: 'STRING' }, ko: { type: 'STRING' }, fix: { type: 'STRING' }, note: { type: 'STRING' }, used: { type: 'ARRAY', items: { type: 'STRING' } }, say: { type: 'ARRAY', items: { type: 'OBJECT', properties: { e: { type: 'STRING' }, k: { type: 'STRING' } }, required: ['e', 'k'] } } }, required: ['reply', 'ko', 'fix', 'note', 'used', 'say'] }
        }
      };
    } catch (e) { talkFail(myTalk, myReq, '요청을 만들지 못했어요: ' + String(e && e.message || e).slice(0, 60)); return; }
    aiGenerate(body, 'talk', 80000).then(function (res) {
      if (TALK !== myTalk || TALK.req !== myReq) return;
      if (res.status !== 200) throw { msg: aiErrorMessage(res) };
      var out = parseAiJson(res.text);
      if (!out || !out.reply) throw { msg: '응답을 이해하지 못했어요. 다시 보내 보세요' };
      var last = TALK.msgs[TALK.msgs.length - 1];
      if (last && last.role === 'user' && !last.hidden) {
        last.fix = String(out.fix || '').trim(); last.note = String(out.note || '').trim();
        if (last.fix && last.fix.toLowerCase() === last.text.trim().toLowerCase()) last.fix = '';
        TALK.turns++; useCount('talk');   // 답을 받았을 때만 센다 (다시 보내기로 두 번 세지 않게)
        markUsed(last.text, Array.isArray(out.used) ? out.used : []);
      }
      TALK.say = Array.isArray(out.say) ? out.say.filter(function (s) { return s && s.e; }).slice(0, 2) : [];
      TALK.msgs.push({ role: 'model', text: String(out.reply).trim(), ko: String(out.ko || '').trim() });
      TALK.busy = false; renderChat(true);
      if (S.settings.talk.speak) speak(String(out.reply).trim(), 'en');
    }).catch(function (err) {
      talkFail(myTalk, myReq, err && err.msg ? err.msg : '연결에 실패했어요');
    });
  }
  // 답변을 못 받은 턴 정리 — 내 말은 "다시 보내기", 첫 인사는 말풍선 안 "다시 시도"로 이어 갈 수 있게 남겨 둔다
  function talkFail(myTalk, myReq, msg) {
    if (TALK !== myTalk || TALK.req !== myReq) return;
    TALK.busy = false;
    var last = TALK.msgs[TALK.msgs.length - 1];
    if (last && last.role === 'user') { last.failed = true; last.err = msg; }
    renderChat();
    if (!(last && last.hidden)) toast(msg);
  }
  // 기다리는 동안 몇 초째인지 보여 주고, 오래 걸리면 취소할 수 있게
  var waitTimer = 0;
  function talkWaitTick() {
    clearTimeout(waitTimer);
    if (!TALK || !TALK.busy) return;
    var el = $('#waitInfo');
    if (el) {
      var sec = Math.round((Date.now() - TALK.reqAt) / 1000);
      el.innerHTML = sec >= 4 ? (TALK.ended ? '정리하는 중' : '답변 기다리는 중') + ' · ' + sec + '초' + (sec >= 12 && !TALK.ended ? ' <b data-action="talk-cancel">취소</b>' : '') : '';
    }
    waitTimer = setTimeout(talkWaitTick, 1000);
  }
  function talkCancel() {
    if (!TALK || !TALK.busy) return;
    var t = TALK, r = TALK.req;
    TALK.req++;   // 늦게 도착하는 답은 버린다
    talkFail(t, TALK.req, '기다리다 취소했어요');
  }
  function parseAiJson(text) {
    try {
      var j = JSON.parse(text), parts = j.candidates[0].content.parts, txt = '';
      for (var i = 0; i < parts.length; i++) if (parts[i].text) txt += parts[i].text;
      txt = txt.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(txt);
    } catch (e) { return null; }
  }
  function markUsed(userText, aiUsed) {
    var txt = ' ' + userText.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    TALK.words.forEach(function (w) {
      if (w.used) return;
      var base = w.w.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (base && txt.indexOf(' ' + base + ' ') >= 0) { w.used = true; return; }
      if (aiUsed.some(function (u) { return String(u).toLowerCase().trim() === base; })) w.used = true;
    });
  }
  function talkRetry() {
    if (!TALK || TALK.busy) return;
    var last = TALK.msgs[TALK.msgs.length - 1];
    if (last && last.role === 'user' && last.failed) { TALK.msgs.pop(); talkTurn(last.hidden ? null : last.text); }
  }

  RENDER.chat = function () { renderChat(true); };
  function renderChat(scroll) {
    if (!TALK) { go('talk', {}, true); return; }
    var v = $('#view-chat'), sc = scenarioById(TALK.scenario), t = S.settings.talk;
    var usedN = TALK.words.filter(function (w) { return w.used; }).length;
    var koOn = STT.on && STT.lang === 'ko', enOn = STT.on && STT.lang !== 'ko';
    var html =
      '<div class="topbar"><button class="icon-btn" data-action="back" aria-label="닫기">' + ICON_X + '</button><span class="title">' + esc(sc.icon + ' ' + (TALK.custom || sc.name)) + '</span><button class="btn" data-action="talk-end" style="flex:none;padding:8px 12px">끝내기</button></div>' +
      (TALK.words.length ? '<div class="mission-bar"><span class="mb-n">' + usedN + '/' + TALK.words.length + '</span>' + TALK.words.map(function (w) { return '<button class="mchip' + (w.used ? ' done' : '') + '" data-action="mission-word" data-id="' + esc(w.id || '') + '" data-w="' + esc(w.w) + '">' + (w.used ? '✓ ' : w.star ? '★ ' : '') + esc(w.w) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="chat-log" id="chatLog">' +
      TALK.msgs.map(function (m, i) {
        if (m.hidden && !m.failed) return '';
        if (m.hidden) return '<div class="msg ai"><div class="bubble errb">첫 인사를 못 받았어요<small>' + esc(m.err || '') + '</small></div><div class="fb err"><b data-action="talk-retry">다시 시도</b> · <b data-action="talk-end">나가기</b></div></div>';
        if (m.role === 'model') return '<div class="msg ai"><div class="bubble">' + esc(m.text) + '<button class="spk sm" data-action="speak-text" data-text="' + esc(m.text) + '" aria-label="다시 듣기">' + ICON_SPK + '</button></div>' +
          (t.showKo && m.ko ? '<button class="ko-line' + (m.koOpen ? '' : ' blur') + '" data-action="ko-reveal" data-i="' + i + '">' + esc(m.ko) + '</button>' : '') + '</div>';
        var fb = '';
        if (m.failed) fb = '<div class="fb err">전송 실패 · <b data-action="talk-retry">다시 보내기</b>' + (m.err ? '<div class="fb-note">' + esc(m.err) + '</div>' : '') + '</div>';
        else if (m.fix) fb = '<div class="fb fix"><div class="fb-fix">✏️ ' + esc(m.fix) + '</div>' + (m.note ? '<div class="fb-note">' + esc(m.note) + '</div>' : '') + '</div>';
        else if (m.note) fb = '<div class="fb ok">👍 ' + esc(m.note) + '</div>';
        return '<div class="msg me"><div class="bubble">' + esc(m.text) + '</div>' + fb + '</div>';
      }).join('') +
      (TALK.busy ? '<div class="msg ai"><div class="bubble typing"><i></i><i></i><i></i></div><div class="wait-info" id="waitInfo"></div></div>' : '') +
      '</div>' +
      // 가이드 모드: 지금 할 만한 말을 그대로 읽으면 되게 보여 준다 (누르면 입력창에 들어감). 💡 로 대화 중에 켜고 끔
      (!TALK.busy && TALK.say && TALK.say.length
        ? '<div class="say-bar"' + (t.guide ? '' : ' hidden') + '>' + TALK.say.map(function (s, i) {
          return '<button class="say" data-action="talk-say" data-i="' + i + '"><span class="say-e">' + esc(s.e) + '</span>' + (s.k ? '<span class="say-k">' + esc(s.k) + '</span>' : '') + '</button>';
        }).join('') + '</div>' : '') +
      // 한국어로 말하기 — 알약 버튼: 한국어 인식 → 영어 번역 → 입력창(또는 바로 전송)
      '<div class="ko-row">' +
      '<button class="ko-pill' + (koOn ? ' on' : KO.busy ? ' busy' : '') + '" id="koBtn" data-action="talk-ko"' + (TALK.busy || KO.busy || enOn || STT.wait ? ' disabled' : '') + '>' + (koOn ? '■ 다 말했어요' : KO.busy ? '번역 중…' : '🇰🇷 한국어로 말하기') + '</button>' +
      (KO.src && !koOn && !KO.busy ? '<span class="ko-src">“' + esc(KO.src) + '”</span>' : '') +
      '<button class="guide-pill' + (t.guide ? ' on' : '') + '" data-action="talk-guide" aria-label="할 말 알려주기" aria-pressed="' + !!t.guide + '">💡 할 말</button>' +
      '</div>' +
      '<div class="chat-bar">' +
      '<button class="mic' + (enOn ? ' on' : STT.wait ? ' thinking' : '') + '" id="micBtn" data-action="talk-mic" aria-label="말하기"' + (TALK.busy || STT.wait || koOn || KO.busy ? ' disabled' : '') + '>' + (enOn ? '■' : STT.wait ? '…' : '🎤') + '</button>' +
      '<input id="chatIn" placeholder="' + (enOn ? '듣는 중 · 다 말하면 ■ 누르기' : koOn ? '한국어로 말하는 중 · 다 말하면 ■' : STT.wait ? '받아 적는 중…' : KO.busy ? '영어로 옮기는 중…' : '영어로 말하거나 입력') + '" autocomplete="off" autocapitalize="sentences" value="' + esc(STT.partial || '') + '">' +
      '<button class="send" data-action="talk-send" aria-label="보내기"' + (TALK.busy ? ' disabled' : '') + '>➤</button>' +
      '</div>';
    v.innerHTML = html;
    var inp = $('#chatIn');
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); talkSendFromInput(); } });
    if (scroll !== false) { var log = $('#chatLog'); log.scrollTop = log.scrollHeight; }
  }
  function talkSendFromInput() {
    var inp = $('#chatIn'); if (!inp) return;
    var text = inp.value.replace(/\s+/g, ' ').trim();
    if (!text || !TALK || TALK.busy) return;
    if (STT.on || STT.wait) { bridge.sttCancel(); sttReset(); }   // 취소 — 안 그러면 뒤늦은 결과가 한 번 더 보내진다
    talkTurn(text);
  }

  /* --- 음성 인식: 🎤 를 눌러 시작하고, 다 말한 뒤 ■ 를 눌러 끝낸다 (중간에 쉬어도 안 끊김) --- */
  var KO = { src: '', busy: false };   // 한국어로 말하기: 마지막 원문 · 번역 중
  function sttReset() { clearTimeout(STT.timer); STT = { on: false, partial: '', wait: false, timer: 0, lang: 'en' }; }
  function sttStart(lang) {
    if (!TALK || TALK.busy || STT.wait || KO.busy) return;
    if (!bridge.sttAvailable()) { toast('이 기기에서 음성 인식을 쓸 수 없어요. 입력창에 적어 주세요'); return; }
    bridge.stop();
    sttReset(); STT.on = true; STT.lang = lang === 'ko' ? 'ko' : 'en';
    KO.src = '';
    renderChat(false);
    bridge.sttStart(STT.lang === 'ko' ? 'ko-KR' : 'en-US');
  }
  // 한국어 원문 → 지금 대화에 맞는 자연스러운 영어 한 문장
  function koTranslate(src) {
    if (!TALK) return;
    var lastAi = ''; for (var i = TALK.msgs.length - 1; i >= 0; i--) if (TALK.msgs[i].role === 'model') { lastAi = TALK.msgs[i].text; break; }
    KO = { src: src, busy: true }; renderChat(false);
    var myTalk = TALK, myKo = KO;
    var body = {
      systemInstruction: { parts: [{ text: 'A Korean learner is practicing English conversation. Translate what they want to say (given in Korean) into natural spoken English they would say to their partner — first person, same intent and tone, ' + (LEVELS[TALK.level] || LEVELS.normal) + '. One or two short sentences. No explanations.' }] },
      contents: [{ role: 'user', parts: [{ text: (lastAi ? 'Partner just said: "' + lastAi + '"\n' : '') + 'Learner wants to say (Korean): "' + src + '"' }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { en: { type: 'STRING' } }, required: ['en'] } }
    };
    aiGenerate(body, 'translate', 30000).then(function (res) {
      if (TALK !== myTalk || KO !== myKo) return;
      var out = res.status === 200 ? parseAiJson(res.text) : null;
      var en = out && out.en ? String(out.en).replace(/\s+/g, ' ').trim() : '';
      if (!en) { KO = { src: '', busy: false }; renderChat(false); toast(res.status === 200 ? '번역을 이해하지 못했어요. 다시 말해 주세요' : aiErrorMessage(res)); return; }
      KO = { src: src, busy: false };
      if (S.settings.talk.autoSend) { talkTurn(en); return; }
      renderChat(false);
      var inp = $('#chatIn'); if (inp) { inp.value = en; inp.placeholder = '확인하고 ➤ 누르기'; inp.focus(); try { inp.setSelectionRange(en.length, en.length); } catch (e) { } }
      var sb = $('.chat-bar .send'); if (sb) sb.classList.add('ready');
      speak(en, 'en');   // 한 번 들려줘서 따라 말할 수 있게
    }).catch(function () { if (TALK === myTalk && KO === myKo) { KO = { src: '', busy: false }; renderChat(false); toast('번역에 실패했어요'); } });
  }
  function sttStop() {
    if (!STT.on) return;
    STT.on = false; STT.wait = true;
    renderChat(false);
    bridge.sttStop();   // 브라우저 fallback 은 여기서 동기적으로 결과를 줄 수도 있다 → 그 뒤에 다시 그리지 않는다
    // 인식기가 끝내 답이 없으면 화면에 보이던 문장으로 마무리한다
    if (STT.wait) STT.timer = setTimeout(function () { if (STT.wait) window.onStt(STT.partial); }, 6000);
  }
  window.onSttPartial = function (text) { if (!STT.on) return; STT.partial = text; var i = $('#chatIn'); if (i) i.value = text; };
  window.onSttState = function (st) {
    if (st === 'cancel') { sttReset(); if (TALK) renderChat(false); return; }   // 앱이 백그라운드로 가서 마이크를 놓음
    if (st === 'end') { var m = $('#micBtn'); if (m) m.classList.add('thinking'); }
  };
  window.onStt = function (text) {
    if (!STT.on && !STT.wait) return;   // 이미 처리했거나 취소된 결과
    var lang = STT.lang || 'en';
    sttReset();
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (!TALK) return;
    if (!text) { renderChat(false); toast('잘 못 들었어요. 다시 말해 주세요'); return; }
    if (lang === 'ko') { koTranslate(text); return; }
    if (S.settings.talk.autoSend) { talkTurn(text); return; }
    // 기본: 입력창에 넣어 주고, 확인·수정한 뒤 ➤ 로 보낸다
    renderChat(false);
    var i = $('#chatIn'); if (i) { i.value = text; i.placeholder = '확인하고 ➤ 누르기'; i.focus(); try { i.setSelectionRange(text.length, text.length); } catch (e) { } }
    var sb = $('.chat-bar .send'); if (sb) sb.classList.add('ready');
  };
  window.onSttError = function (code) {
    sttReset(); if (TALK) renderChat(false);
    var msg = { permission: '마이크 권한이 필요해요. 설정에서 허용해 주세요', unavailable: '이 기기에는 음성 인식 서비스가 없어요', nomatch: '잘 못 들었어요. 다시 말해 주세요', network: '음성 인식에 인터넷이 필요해요', busy: '음성 인식이 아직 바빠요. 잠시 후 다시' }[code];
    toast(msg || ('음성 인식 오류 (' + code + ')'));
  };

  /* --- 종료 요약 --- */
  function talkEnd() {
    if (!TALK) return;
    var visible = TALK.msgs.filter(function (m) { return !m.hidden && !m.failed; });
    if (TALK.turns === 0) { TALK = null; go('talk', {}, true); return; }
    if (TALK.busy) { toast('답변을 기다리는 중이에요'); return; }
    TALK.busy = true; TALK.ended = true; TALK.reqAt = Date.now(); renderChat(); talkWaitTick();
    var transcript = visible.map(function (m) { return (m.role === 'user' ? 'Learner: ' : 'Partner: ') + m.text; }).join('\n');
    var fb = S.settings.talk.feedbackLang === 'en' ? 'English' : 'Korean';
    var body = ({
      systemInstruction: { parts: [{ text: 'You are an English tutor reviewing a short practice conversation of a Korean adult learner. Be encouraging and specific. Write "comment" and each "why" in ' + fb + '. "expressions": 2-4 useful natural phrases FROM THE PARTNER\'S LINES worth memorizing, each with a short Korean meaning (m), the sentence it appeared in (e) and its Korean translation (k). "corrections": the learner\'s sentences that had problems, with the corrected version and a one-line reason (at most 5). "score": 1-5 overall.' }] },
      contents: [{ role: 'user', parts: [{ text: 'Transcript:\n' + transcript } ] }],
      generationConfig: {
        temperature: 0.4, responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { score: { type: 'INTEGER' }, comment: { type: 'STRING' }, corrections: { type: 'ARRAY', items: { type: 'OBJECT', properties: { you: { type: 'STRING' }, better: { type: 'STRING' }, why: { type: 'STRING' } }, required: ['you', 'better', 'why'] } }, expressions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, m: { type: 'STRING' }, e: { type: 'STRING' }, k: { type: 'STRING' } }, required: ['w', 'm', 'e', 'k'] } } }, required: ['score', 'comment', 'corrections', 'expressions'] }
      }
    });
    var myTalk = TALK;
    aiGenerate(body, 'summary', 80000).then(function (res) {
      if (TALK !== myTalk) return;
      var out = res.status === 200 ? parseAiJson(res.text) : null;
      finishTalk(out || { score: 0, comment: '', corrections: [], expressions: [] }, out ? '' : aiErrorMessage(res));
    }).catch(function () { if (TALK === myTalk) finishTalk({ score: 0, comment: '', corrections: [], expressions: [] }, '요약을 가져오지 못했어요'); });
  }
  function finishTalk(sum, err) {
    var t = TALK; TALK = null;
    var used = t.words.filter(function (w) { return w.used; }).length;
    var rec = {
      id: 'tk' + Date.now().toString(36), date: localDate(), time: new Date().toTimeString().slice(0, 5),
      scenario: t.scenario, custom: t.custom, level: t.level, turns: t.turns, used: used, total: t.words.length,
      words: t.words.map(function (w) { return { w: w.w, used: !!w.used }; }),
      score: Number(sum.score) || 0, comment: String(sum.comment || ''), err: err || '',
      corrections: (sum.corrections || []).filter(function (c) { return c && c.better; }).slice(0, 5).map(function (c) { return { you: String(c.you || ''), better: String(c.better || ''), why: String(c.why || '') }; }),
      expressions: (sum.expressions || []).filter(function (x) { return x && x.w; }).slice(0, 4).map(function (x) { return { w: String(x.w), m: String(x.m || ''), e: String(x.e || ''), k: String(x.k || '') }; }),
      // 대화 전문 — 리포트를 나중에 다시 볼 때 같이 보여 준다
      msgs: t.msgs.filter(function (m) { return !m.hidden && !m.failed; }).map(function (m) { var o = { r: m.role === 'user' ? 'u' : 'a', t: m.text }; if (m.fix) o.f = m.fix; if (m.note) o.n = m.note; if (m.ko) o.k = m.ko; return o; })
    };
    S.talkLog = (S.talkLog || []).concat([rec]).slice(-30);
    var d = dayStat(); d.talk = (d.talk || 0) + 1;
    save();
    go('talk', { reset: true }, true);
    openTalkReport(rec, true);
  }
  // 리포트 시트 — 방금 끝난 연습(fresh)과 최근 연습 목록에서 다시 열 때 공용
  function openTalkReport(rec, fresh) {
    var sc = scenarioById(rec.scenario), ex = rec.expressions || [], corr = rec.corrections || [], msgs = rec.msgs || [];
    lastSummaryExpr = ex;
    var have = {}; S.words.forEach(function (w) { have[w.w.toLowerCase()] = true; });
    var newEx = ex.filter(function (x) { return !have[String(x.w).toLowerCase()]; });
    openSheet(
      '<div class="sh-word"><span>' + (fresh ? '연습 끝!' : '연습 리포트') + '</span><span class="tag" style="flex:none">' + esc(sc.icon + ' ' + (rec.custom || sc.name)) + '</span></div>' +
      '<div class="small muted">' + esc(rec.date + (rec.time ? ' ' + rec.time : '')) + (rec.level ? ' · ' + ({ easy: '쉽게', normal: '보통', hard: '어렵게' }[rec.level] || rec.level) : '') + '</div>' +
      '<div class="sum-row"><div class="sum-tile"><b>' + rec.turns + '</b><span>내 발화</span></div><div class="sum-tile"><b>' + rec.used + '<small>/' + rec.total + '</small></b><span>미션 단어</span></div><div class="sum-tile"><b>' + (rec.score ? '★' + rec.score : '–') + '</b><span>평가</span></div></div>' +
      ((rec.words || []).length ? '<div class="mission" style="margin-top:10px">' + rec.words.map(function (w) { return '<span class="mchip' + (w.used ? ' done' : '') + '">' + (w.used ? '✓ ' : '') + esc(w.w) + '</span>'; }).join('') + '</div>' : '') +
      (rec.comment ? '<div class="tip" style="margin-top:10px">' + esc(rec.comment) + '</div>' : (rec.err ? '<div class="small muted" style="margin-top:8px">' + esc(rec.err) + '</div>' : '')) +
      (!msgs.length && !fresh ? '<div class="small muted" style="margin-top:8px">이 연습은 대화 전문이 저장되기 전 버전(1.19 이하)에서 한 거라 요약만 남아 있어요.</div>' : '') +
      (corr.length ? '<div class="section-title" style="margin-top:14px">교정</div>' + corr.map(function (c) {
        return '<div class="corr"><div class="c-you">' + esc(c.you) + '</div><div class="c-better">→ ' + esc(c.better) + '</div><div class="c-why">' + esc(c.why) + '</div></div>';
      }).join('') : '') +
      (ex.length ? '<div class="section-title" style="margin-top:14px">기억할 표현</div>' + ex.map(function (x) {
        return '<div class="corr"><div class="c-better"><b>' + esc(x.w) + '</b> <span class="muted">' + esc(x.m) + '</span>' + (have[String(x.w).toLowerCase()] ? ' <span class="tag" style="flex:none">단어장에 있음</span>' : '') + '</div><div class="c-why">' + esc(x.e) + '</div></div>';
      }).join('') + (newEx.length ? '<button class="btn block" data-action="talk-add-expr" style="margin-top:8px">＋ 표현 ' + newEx.length + '개를 대기 단어장에 추가</button>' : '') : '') +
      (msgs.length ? '<div class="section-title" style="margin-top:14px">대화 다시 보기</div><div class="transcript">' + msgs.map(function (m) {
        return '<div class="tr ' + (m.r === 'u' ? 'me' : 'ai') + '"><span class="who">' + (m.r === 'u' ? '나' : 'AI') + '</span><div><div>' + esc(m.t) + '</div>' + (m.f ? '<div class="tr-fix">✏️ ' + esc(m.f) + '</div>' : '') + (m.k ? '<div class="tr-fix">' + esc(m.k) + '</div>' : '') + '</div></div>';
      }).join('') + '</div>' : '') +
      '<div class="sh-actions">' + (fresh ? '' : '<button class="btn danger" data-action="talk-log-del" data-id="' + esc(rec.id || '') + '">삭제</button>') + '<button class="btn primary" data-action="close-sheet">닫기</button></div>'
    );
  }
  var lastSummaryExpr = [];
  // 미션 단어 칩 → 단어장 데이터 그대로 (뜻·예문·해석·★)
  function openMissionWord(id, wtext) {
    var w = id ? byId(id) : null;
    if (!w) { if (wtext) speak(wtext, 'en'); return; }
    openSheet(
      '<div class="sh-word"><span>' + esc(w.w) + '</span><button class="spk" data-action="speak-id" data-id="' + esc(w.id) + '" data-what="w">' + ICON_SPK + '</button></div>' +
      ((w.p || w.t) ? '<div class="row" style="gap:6px;margin-top:6px">' + (w.p ? '<span class="tag" style="flex:none">' + esc(w.p) + '</span>' : '') + (w.t ? '<span class="tag theme" style="flex:none">' + esc(w.t) + '</span>' : '') + '<span class="tag" style="flex:none">' + STAGE_SHORT[w.stage] + '</span></div>' : '') +
      '<div class="sh-m">' + esc(w.m) + '</div>' +
      '<div class="sh-e"><div class="en"><span>' + esc(w.e || '—') + '</span><button class="spk sm" data-action="speak-id" data-id="' + esc(w.id) + '" data-what="e">' + ICON_SPK + '</button></div>' + (w.k ? '<div class="ko">' + esc(w.k) + '</div>' : '') + '</div>' +
      '<div class="sh-actions"><button class="btn' + (w.star ? ' star-on' : '') + '" data-action="star" data-id="' + esc(w.id) + '">' + (w.star ? '★ 표시됨' : '☆ 중요') + '</button><button class="btn primary" data-action="close-sheet">닫기</button></div>'
    );
  }
  function talkAddExpressions() {
    var have = {}; S.words.forEach(function (w) { have[w.w.toLowerCase()] = true; });
    var n = 0;
    lastSummaryExpr.forEach(function (x) {
      if (have[String(x.w).toLowerCase()]) return;
      var nw = mkWord({ w: x.w, m: x.m, e: x.e, k: x.k, p: 'phr.', t: '회화 연습' }); S.words.push(nw); have[x.w.toLowerCase()] = true; n++;
    });
    save(); toast(n ? '표현 ' + n + '개를 대기 단어장에 추가했어요' : '이미 있는 표현이에요');
    var b = $('[data-action="talk-add-expr"]'); if (b) { b.disabled = true; b.textContent = '추가됨'; }
  }
  function talkBack() {
    if (!TALK) { go('talk', {}, true); return; }
    if (TALK.turns === 0 && !TALK.busy) { TALK = null; bridge.sttCancel(); sttReset(); go('talk', {}, true); return; }
    confirm2('대화를 끝내고 정리할까요?', '끝내기').then(function (ok) { if (ok) { bridge.sttCancel(); sttReset(); talkEnd(); } });
  }

  /* ================= YOUTUBE 쉐도잉 ================= */
  // 링크 → Gemini 가 영상을 듣고 문장별 [시작 초 · 영어 · 한글 · 익힐 표현] 으로 정리 → 문장을 누르면 앱 안 플레이어가 그 시점부터.
  // ponytail: 영상 통째로 한 번에 보낸다 — 구간 자르기(videoMetadata start/endOffset)는 유튜브 링크에서 음성이 안 잘리는 회귀가 보고됨(2026-08). 긴 영상은 오래 걸리고 무료 한도를 많이 씀
  // 유튜브 플레이어: 위를 덮지 않는다(단어 뜻은 문장 아래 카드로), 화면을 떠나거나 앱이 내려가면 멈춘다
  // v2.14: 링크를 넣으면 폰에 영상도 받는다(앱 전용 저장소, 사용자 결정) → 받은 영상은 유튜브 iframe 대신 앱 <video> 로 재생 + 파형으로 문장 경계 맞춤
  var YTJOB = {};            // 정리 중·실패 { id: { busy, err } } — 저장 안 함 (앱이 꺼지면 "정리하기"로 다시)
  var YTV = null;            // 보고 있는 영상 { id, act: 재생한 문장, cur: 지금 나오는 문장, stopAt, card, ko: {열어 본 한글}, ready, pending, perr }
  var YTP = null, YTAPI = { state: 0, cbs: [] }, ytTimer = 0;

  function ytId(text) {
    var m = String(text || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#\s]*&)?v=|shorts\/|live\/|embed\/|v\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function ytRec(id) { for (var i = 0; i < S.yt.length; i++) if (S.yt[i].id === id) return S.yt[i]; return null; }
  function ytHave(w) { var l = String(w).toLowerCase(); for (var i = 0; i < S.words.length; i++) if (S.words[i].w.toLowerCase() === l) return S.words[i]; return null; }
  function fmtSec(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60); }
  function fmtSecD(s) { var d = Math.max(0, Math.round((s || 0) * 10)); return fmtSec(Math.floor(d / 10)) + '.' + (d % 10); }   // 0:03.2 (시간 수정 화면)
  function ytTokens(e) { return String(e).split(/([A-Za-z0-9\u00C0-\u024F](?:[A-Za-z0-9\u00C0-\u024F'’\-]*[A-Za-z0-9\u00C0-\u024F])?)/); }   // 홀수 칸이 단어 (café·let's 는 한 단어, 끝 따옴표는 뺌)
  function ytNorm(t) { return t.toLowerCase().replace(/’/g, "'"); }
  // 익힐 표현(q)이 덮는 단어 칸 → 표현 번호. 문장에서 못 찾으면 밑줄만 안 긋는다
  function ytGlossMap(x, toks) {
    var map = {}, low = toks.map(ytNorm);
    (x.x || []).forEach(function (g, gi) {
      var qt = ytTokens(g.q).filter(function (t, k) { return k % 2 === 1; }).map(ytNorm);
      if (!qt.length) return;
      for (var a = 1; a < low.length; a += 2) {
        var k = 0, b = a;
        while (k < qt.length && b < low.length && low[b] === qt[k]) { k++; b += 2; }
        if (k === qt.length) { for (var c = a; c < b; c += 2) if (!(c in map)) map[c] = gi; return; }
      }
    });
    return map;
  }

  RENDER.yt = function () {
    var list = S.yt.slice().sort(function (a, b) { return b.addedAt - a.addedAt; });
    $('#view-yt').innerHTML =
      '<div class="topbar"><button class="icon-btn" data-action="back">' + ICON_BACK + '</button><span class="title">유튜브 쉐도잉</span><button class="btn" data-action="yt-add" style="flex:none;padding:8px 12px">+ 추가</button></div>' +
      '<div class="wrap">' +
      (list.length ? list.map(function (r) {
        var j = YTJOB[r.id] || {};
        var sub = j.busy ? '정리 중…' : j.err ? '정리 실패 — 눌러서 다시' : r.sents ? r.sents.length + '문장' : '정리 전';
        return '<div class="yt-item"><button class="yt-open" data-action="yt-open" data-id="' + esc(r.id) + '"><img src="https://i.ytimg.com/vi/' + esc(r.vid) + '/mqdefault.jpg" alt="" loading="lazy">' +
          '<div class="yi-b"><div class="yi-t">' + esc(r.title || 'YouTube ' + r.vid) + '</div><div class="yi-s">' + esc(sub + ' · ' + r.date) + '<span id="yd-' + esc(r.vid) + '">' + esc(ytDlShort(r)) + '</span></div></div></button>' +
          '<button class="yi-del" data-action="yt-del" data-id="' + esc(r.id) + '" aria-label="삭제">' + ICON_X + '</button></div>';
      }).join('') :
        '<div class="empty">유튜브 영상 링크를 넣으면 영어 문장을 정리해 드려요.<br>문장을 누르면 그 부분이 재생돼<br>따라 말하기(쉐도잉) 연습을 할 수 있어요.</div><button class="btn primary big" data-action="yt-add">+ 영상 추가</button>') +
      (AI.key ? '' : '<div class="tip">Gemini API 키가 필요해요. <b data-action="go-settings-ai" style="text-decoration:underline">설정에서 입력</b>하면 무료로 쓸 수 있어요.</div>') +
      // YouTube API 서비스 이용 조건: 약관·개인정보처리방침 안내
      '<div class="small muted yt-legal">영상 재생은 YouTube API 서비스를 쓰며 <b data-action="open-url" data-url="https://www.youtube.com/t/terms">YouTube 서비스 약관</b>과 <b data-action="open-url" data-url="https://policies.google.com/privacy">Google 개인정보처리방침</b>이 적용돼요. 문장 정리는 영상 링크를 내 Gemini 키로 Google에 보내서 해요.' + (isAndroid ? ' 받은 영상은 이 폰의 앱 안에만 저장돼요.' : '') + '</div>' +
      '</div>';
  };
  function ytAddSheet() {
    openSheet('<div class="sh-word"><span>유튜브 영상 추가</span></div>' +
      '<div class="field" style="margin-top:10px"><input id="ytUrl" type="url" inputmode="url" placeholder="https://youtu.be/…" autocapitalize="off" autocomplete="off" spellcheck="false"></div>' +
      '<div class="small muted" style="margin-top:8px">공개 영상만 돼요 · 20분 이하를 추천해요 (길수록 오래 걸리고 무료 한도를 많이 써요)</div>' +
      '<div class="sh-actions"><button class="btn" data-action="close-sheet">취소</button><button class="btn primary" data-action="yt-submit">정리하기</button></div>');
    var i = $('#ytUrl'); if (i) { i.focus(); i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ytSubmit(); } }); }
  }
  function ytSubmit() {
    var inp = $('#ytUrl'), vid = ytId(inp && inp.value);
    if (!vid) { toast('유튜브 링크를 확인해 주세요'); return; }
    inp.blur();   // 시트가 닫혀도 입력칸 포커스가 남아 키보드가 영상 화면을 가리던 것
    closeSheet();
    if (!AI.key) { confirm2('Gemini API 키가 아직 없어요.\n설정에서 키를 입력할까요?', '설정으로').then(function (ok) { if (ok) go('settings', { scroll: 'ai' }); }); return; }
    for (var i = 0; i < S.yt.length; i++) if (S.yt[i].vid === vid) { toast('이미 있는 영상이에요'); go('ytv', { id: S.yt[i].id }); return; }
    var r = { id: uid(), vid: vid, title: '', date: localDate(), addedAt: Date.now(), sents: null };
    S.yt.push(r); save();
    go('ytv', { id: r.id });
    ytProcess(r);
    ytDlStart(r);   // 문장 정리와 동시에 영상도 받는다 (v2.14)
  }
  function ytRefresh(id) {
    var cur = current();
    if (cur && cur.view === 'yt') RENDER.yt();
    else if (cur && cur.view === 'ytv' && YTV && YTV.id === id) ytRenderBody();
  }
  function ytProcess(r) {
    if (YTJOB[r.id] && YTJOB[r.id].busy) return;
    YTJOB[r.id] = { busy: true, err: '' }; ytRefresh(r.id);
    var watch = 'https://www.youtube.com/watch?v=' + r.vid;
    // 제목은 oEmbed 로 (키 없이). 404 = 비공개·삭제 → Gemini 도 못 본다
    bridge.aiCall('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(watch), '', '', 15000).then(function (res) {
      if (res.status === 404 || res.status === 400) throw { msg: '영상을 찾을 수 없어요 — 비공개·삭제됐거나 링크가 잘못됐어요' };
      try { var o = JSON.parse(res.text); if (o && o.title) { r.title = String(o.title); save(); ytRefresh(r.id); } } catch (e) { }
      // 유튜브 받아쓰기는 설정과 상관없이 Flash-Lite — 3 Flash·Pro 는 시간이 수십 초~수 분씩 밀린다는 보고 (v2.7)
      // v2.9: 생각(low) + 1초에 2장으로 시간 정밀도를 올린다. 1초 2장은 입력 토큰이 약 1.7배 → 긴 영상이 한도(429)·크기(400)에 걸리면 1초 1장으로 한 번 더
      return aiGenerate(ytBody(watch, 2), 'youtube', YT_AI_MS, AI_DEFAULT_MODEL).then(function (res) {
        if (res.status === 429 || (res.status === 400 && !/api key/i.test(res.text))) return aiGenerate(ytBody(watch, 0), 'youtube', YT_AI_MS, AI_DEFAULT_MODEL);   // 400 은 이유를 가리기 어려워 키 오류만 빼고 한 번 더
        return res;
      });
    }).then(function (res) {
      if (res.status !== 200) throw { msg: aiErrorMessage(res) };
      var out = parseAiJson(res.text);
      out = Array.isArray(out) ? out : out && Array.isArray(out.sents) ? out.sents : null;
      if (!out) throw { msg: '정리 결과를 이해하지 못했어요. 다시 시도해 주세요' };
      var ns = ytMergeShort(ytClean(out));
      if (!ns.length && r.sents && r.sents.length) throw { msg: '영어 문장을 찾지 못했어요' };   // 다시 정리가 빈손이면 있던 문장·단어 뜻 캐시를 지우지 않는다
      r.sents = ns; r.tv = 3; delete r.snap; save();   // tv 2: 시간을 MM:SS 로 받아 앱이 환산 (v2.5) · tv 3: v2.9 정리 (생각 low · 1초 2장, 거절되면 1장)
      ytSnap(r);   // 받은 영상이 있으면 새 문장 경계도 파형으로 (파일은 그대로)
      YTJOB[r.id] = { busy: false, err: r.sents.length ? '' : '영어 음성을 찾지 못했어요' };
      if (YTV && YTV.id === r.id) { YTV.act = -1; YTV.cur = -1; YTV.card = null; YTV.ko = {}; YTV.stopAt = null; }   // 문장 번호가 바뀌었다
    }).catch(function (e) {
      var msg = e && e.msg ? e.msg : '정리하지 못했어요';
      if (r.sents && r.sents.length) { YTJOB[r.id] = { busy: false, err: '' }; toast('다시 정리 실패 — ' + msg); }   // 다시 정리가 실패하면 있던 문장을 그대로 둔다
      else YTJOB[r.id] = { busy: false, err: msg };
    }).then(function () { ytRefresh(r.id); });
  }
  var YT_AI_MS = 600000;   // 생각을 켜면 몇십 초 더 걸린다 — 긴 영상도 끊기지 않게 10분 (Java 읽기 제한도 같이)
  function ytBody(watch, fps) {
    var vid = { fileData: { fileUri: watch } };
    if (fps) vid.videoMetadata = { fps: fps };   // 1초에 2장 → 모델이 보는 시간 표시가 0.5초 간격
    return {
      systemInstruction: { parts: [{ text: [
        'You transcribe YouTube videos for a Korean adult who studies English by shadowing (repeating each sentence right after hearing it).',
        'Transcribe ALL English speech in the video, in order, exactly as spoken (leave out filler sounds like "um"; do not correct grammar).',
        'One item = one COMPLETE sentence, from its first word to its final punctuation (. ? !). Never split a sentence into two or more items, even if it is long or the speaker pauses in the middle of it.',
        'Ignore on-screen subtitles and caption line breaks: captions often cut one sentence across two lines, so always merge the pieces back into the full spoken sentence. Follow the speech, not the captions.',
        'For each item, in this order: "s" = the moment the first word of the sentence begins, "e" = the English sentence, "t" = the moment its last word ends, "k" = a natural Korean translation. "s" and "t" are timestamps on the video timeline in MM:SS.d format — minutes:seconds with one decimal, e.g. "01:15.4" and "01:19.8" (use H:MM:SS.d past one hour). Read them straight off the MM:SS timestamps you see for the video; do NOT convert them to total seconds. "t" must not include any of the next sentence or the pause after it. Times increase from item to item.',
        '"x" = 0 to 3 words or expressions from that sentence worth learning for an intermediate (B1-B2) learner: idioms, phrasal verbs, collocations, less common words; never basic words. Each: "q" = the exact text as it appears in "e", "w" = its dictionary form, "p" = one of n., v., adj., adv., phr., idiom, "m" = a short Korean meaning in this context.',
        'Do not make very short interjections (1-3 words such as "Yes.", "Right.", "Okay.", "Thank you.") separate items: join them to the neighbouring sentence of the same speaker.',
        'Skip parts that are not English speech (music, Korean narration). If there is no English speech at all, return [].'
      ].join('\n') }] },
      contents: [{ role: 'user', parts: [vid, { text: 'Transcribe this video.' }] }],   // 문서 권장: 영상 먼저, 지시는 뒤
      generationConfig: {
        thinkingConfig: { thinkingLevel: 'low' },   // 생각을 조금 켜면 시간 오차가 줄었다는 벤치마크 (3.1 Flash-Lite 평균 2.09 → 1.25초). 안 받는 모델이면 aiGenerate 가 빼고 다시
        mediaResolution: 'MEDIA_RESOLUTION_LOW',   // 받아쓰기엔 화면이 거의 필요 없다 (2.5 계열에선 토큰 1/4)
        responseMimeType: 'application/json',
        responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
          s: { type: 'STRING' }, t: { type: 'STRING' }, e: { type: 'STRING' }, k: { type: 'STRING' },
          x: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, w: { type: 'STRING' }, p: { type: 'STRING' }, m: { type: 'STRING' } }, required: ['q', 'w', 'p', 'm'] } }
        }, required: ['s', 't', 'e', 'k', 'x'], propertyOrdering: ['s', 'e', 't', 'k', 'x'] } }
      }
    };
  }
  // "01:15.4" · "1:02:03" · 75.4 → 초. 예전 데이터(숫자)도 그대로 받는다
  function ytSec(v) {
    if (typeof v === 'number') return v;
    var m = String(v == null ? '' : v).trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (m) return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]);
    var n = parseFloat(v); return isNaN(n) ? NaN : n;
  }
  function ytClean(arr) {
    var prev = 0;
    return arr.filter(function (x) { return x && x.e && String(x.e).trim(); }).map(function (x) {
      var s = Math.max(prev, ytSec(x.s) || 0); prev = s;   // 시간이 거꾸로 가면 앞 문장에 맞춘다 (유튜브 링크의 타임스탬프는 조금씩 어긋난다)
      var o = {
        s: Math.round(s * 10) / 10, e: String(x.e).trim(), k: String(x.k || '').trim(),
        x: (Array.isArray(x.x) ? x.x : []).filter(function (g) { return g && g.q && g.w; }).slice(0, 3).map(function (g) { return { q: String(g.q), w: String(g.w), p: String(g.p || ''), m: String(g.m || '') }; })
      };
      var t = ytSec(x.t); if (t > o.s) o.t = Math.round(t * 10) / 10;   // 문장 끝 (v2.3 — 예전 데이터엔 없음)
      if (x.ms) o.ms = 1;   // 시작을 손으로 고침 (v2.11 — 앞 여유 없이 그 자리부터)
      if (x.me && o.t != null) o.me = 1;   // 끝을 손으로 고침 (그 자리에서 멈춤, 다음 문장 시작에 안 잘림)
      if (typeof x.vs === 'number' && isFinite(x.vs)) o.vs = x.vs;   // 파형으로 맞춘 시작·끝 (v2.14 — ytSnapCalc)
      if (typeof x.ve === 'number' && isFinite(x.ve)) o.ve = x.ve;
      if (x.lk && typeof x.lk === 'object') {   // 눌러 본 단어 뜻 캐시 (복원 데이터면 모양 검사)
        o.lk = {};
        for (var key in x.lk) if (Object.prototype.hasOwnProperty.call(x.lk, key) && x.lk[key] && x.lk[key].w) o.lk[key] = { w: String(x.lk[key].w), p: String(x.lk[key].p || ''), m: String(x.lk[key].m || '') };
      }
      return o;
    });
  }

  RENDER.ytv = function (p) {
    var r = ytRec(p.id); if (!r) { go('yt', {}, true); return; }
    ytStopPlayer();
    if (!YTV || YTV.id !== r.id) YTV = { id: r.id, act: -1, cur: -1, stopAt: null, card: null, ko: {} };
    YTV.ready = false; YTV.perr = null; YTV.pending = null;
    $('#view-ytv').innerHTML =
      '<div class="topbar"><button class="icon-btn" data-action="back">' + ICON_BACK + '</button><span class="title" id="ytTitle"></span><span style="width:42px"></span></div>' +
      // v2.4: 영상은 맨 위 제자리에 고정(sticky)되고, 목록을 올리면 문장 영역이 그 위를 덮어 화면을 넓게 쓴다 (사용자 요청).
      // 따라다니는 작은 창은 없음. ※ 덮인 채로 문장을 누르면 가려진 플레이어로 재생된다 — 유튜브 정책(보이지 않는 플레이어 재생 금지)과 어긋남을 알고 고른 방식
      '<div class="yt-list" id="ytList"><div class="yt-player" id="ytBox"><div id="ytPlayer"></div></div><div class="yt-body" id="ytBody"></div></div>' +
      '<div class="yt-fab" id="ytFab"></div><div class="yt-side" id="ytSide"></div>';   // yt-side: 가로 화면에서 영상 아래 왼쪽 (시간 수정, v2.11)
    if (r.off && !r.snap) ytSnap(r);   // 파형이 앱이 꺼져 있던 사이에 나왔으면 지금 맞춘다
    ytRenderBody();
    ytMakePlayer(r);
  };
  function ytRenderBody() {
    var r = YTV && ytRec(YTV.id), body = $('#ytBody'), fab = $('#ytFab'); if (!r || !body || !fab) return;
    var j = YTJOB[r.id] || {}, has = r.sents && r.sents.length;
    $('#ytTitle').textContent = r.title || '유튜브';
    // 오른쪽 아래: "한 번 더"는 오른손 엄지로 계속 누르게 된다 — 크게
    $('#view-ytv').classList.toggle('yt-editing', !!(YTV.edit && has && !j.busy));   // 폰 가로에선 수정 중에 영상을 조금 줄여 아래 패널 자리를 만든다 (CSS)
    fab.innerHTML = has ? '<button class="guide-pill yt-pm' + (S.settings.ytPause ? ' on' : '') + '" data-action="yt-pause-mode" aria-pressed="' + !!S.settings.ytPause + '" aria-label="문장마다 멈춤">⏸ 문장마다</button>' +
      '<button class="yt-again" data-action="yt-replay" aria-label="한 번 더"' + (YTV.act < 0 ? ' disabled' : '') + '><span>↻</span><small>한 번 더</small></button>' : '';
    body.innerHTML = ytDlHTML(r) + (YTV.perr ? '<div class="yt-err">앱 안에서 재생할 수 없는 영상이에요' + (YTV.perr === 101 || YTV.perr === 150 ? ' (올린 사람이 퍼가기를 막음)' : '') + ' — 문장을 누르면 유튜브 앱에서 그 시점으로 열려요' + (YTV.noLocal ? ' · 받은 파일도 재생되지 않아요 — 위의 “지우기”로 지우고 다시 받아 주세요' : '') + '</div>' : '') + (j.busy ? '<div class="empty">⏳ 영상을 듣고 문장을 정리하는 중…<br><span class="small">영상 길이에 따라 1~5분 걸려요. 그동안 위에서 영상을 먼저 봐도 돼요.</span></div>'
      : j.err ? '<div class="empty">' + esc(j.err) + '<br><button class="btn primary" data-action="yt-retry" style="margin-top:12px">다시 시도</button></div>'
      : !has ? '<div class="empty">아직 정리 전이에요<br><button class="btn primary" data-action="yt-retry" style="margin-top:12px">문장 정리하기</button></div>'
      : (r.tv === 3 ? '' : '<div class="yt-old">문장 시간을 더 정확하게 맞추도록 바꿨어요 · <b data-action="yt-redo">다시 정리하기</b>를 누르면 새로 맞춰요</div>') +
        '<div class="yt-hint small muted">' + esc(r.sents.length) + '문장 · 문장을 누르면 그 부분부터 재생 · 재생한 문장의 단어를 누르면 뜻 · 한글은 눌러서 보기 · 꾹 누르면 복사</div>' + r.sents.map(function (x, i) { return ytRowHTML(r, i); }).join('') +
        '<div class="yt-redo small muted">문장이 이상하게 나뉘었거나 끊기는 곳이 어긋나면 <b data-action="yt-redo">다시 정리하기</b></div>');
    ytSideRender();
  }
  function ytRowHTML(r, i) {
    var x = r.sents[i], toks = ytTokens(x.e), gm = ytGlossMap(x, toks), c = YTV.card && YTV.card.i === i ? YTV.card : null;
    var e = toks.map(function (t, k) {
      if (k % 2 === 0) return esc(t);
      return '<span class="yw' + (k in gm ? ' gx' : '') + (c && (c.t === k || (c.g != null && gm[k] === c.g)) ? ' sel' : '') + '" data-action="yt-word" data-i="' + i + '" data-t="' + k + '">' + esc(t) + '</span>';
    }).join('');
    return '<div class="ys' + (YTV.act === i ? ' act' : '') + (YTV.cur === i ? ' cur' : '') + '" id="ys' + i + '" data-action="yt-sent" data-i="' + i + '">' +
      '<span class="ys-t">' + (YTV.edit ? fmtSecD(ytStart(x)) : fmtSec(ytStart(x))) + (x.ms || x.me ? '<i class="ys-m" title="손으로 고친 시간">✎</i>' : '') + '</span><div class="ys-b"><div class="ys-e">' + e + '</div>' +
      (x.k ? '<button class="ko-line' + (YTV.ko[i] ? '' : ' blur') + '" data-action="yt-ko" data-i="' + i + '">' + esc(x.k) + '</button>' : '') +
      (c ? ytCardHTML(c) : '') + '</div></div>';
  }
  // --- 시간 수정 (v2.11, 가로 화면): 누른 문장의 시작·끝을 ±0.1·0.5초 또는 "지금"(영상 위치)으로 ---
  function ytSideRender() {
    var el = $('#ytSide'), r = YTV && ytRec(YTV.id); if (!el) return;
    if (!r || !r.sents || !r.sents.length || YTJOB[r.id] && YTJOB[r.id].busy) { el.innerHTML = ''; return; }
    if (!YTV.edit) { el.innerHTML = '<button class="yed-b yed-open" data-action="yt-edit">✎ 문장 시간 수정</button>'; return; }
    el.innerHTML = r.sents[YTV.act] ? ytEditHTML(r, YTV.act)
      : '<div class="small muted yed-h">고칠 문장을 오른쪽에서 누르세요</div><div class="yed-c"><button class="yed-b" data-action="yt-edit">✓ 수정 끝</button></div>';
  }
  function ytEditHTML(r, i) {   // 시작 | −0.5 −0.1 +0.1 +0.5 지금 / 끝 | … / 문장 듣기 · 재생멈춤 · 2초 · 수정 끝
    var x = r.sents[i];
    var b = function (k, d, label, aria) { return '<button class="yed-b" data-action="yt-adj" data-k="' + k + '" data-d="' + d + '" aria-label="' + aria + '">' + label + '</button>'; };
    var row = function (k, name, v) {
      return '<div class="yed-r"><span class="yed-l">' + name + '<b>' + fmtSecD(v) + '</b></span>' + b(k, -0.5, '−0.5', name + ' 0.5초 앞으로') + b(k, -0.1, '−0.1', name + ' 0.1초 앞으로') +
        b(k, 0.1, '+0.1', name + ' 0.1초 뒤로') + b(k, 0.5, '+0.5', name + ' 0.5초 뒤로') + b(k, 'now', '지금', name + '을 지금 영상 위치로') + '</div>';
    };
    return '<div class="yed">' + row('s', '시작', ytStart(x)) + row('t', '끝', ytRange(r, i).end) +
      '<div class="yed-c"><button class="yed-b" data-action="yt-edit-play">▶ 문장</button><button class="yed-b" data-action="yt-playpause" aria-label="재생·멈춤">⏯</button>' +
      '<button class="yed-b" data-action="yt-back2" aria-label="2초 뒤로 가서 재생">⟲ 2초</button><button class="yed-b" data-action="yt-edit">✓ 끝</button></div></div>';
  }
  function ytAdj(k, d) {
    var r = YTV && ytRec(YTV.id), i = YTV ? YTV.act : -1, x = r && r.sents && r.sents[i]; if (!x) return;
    var prev = r.sents[i - 1], next = r.sents[i + 1], now = d === 'now', v, want;
    if (now) { if (!YTP || !YTV.ready) return; try { v = YTP.getCurrentTime(); } catch (e) { return; } }
    else v = (k === 's' ? ytStart(x) : ytRange(r, i).end) + d;
    want = v = Math.round(v * 10) / 10;
    if (k === 's') {   // 순서가 안 바뀌게: 앞 문장 시작 ~ 다음 문장 시작(같은 시간은 허용 — ytClean 규칙) · 끝 0.5초 전까지. 지금 값은 늘 범위 안
      var lo = Math.min(prev ? prev.s : 0, x.s), hi = Math.max(Math.min(next ? next.s : Infinity, ytRange(r, i).end - 0.5), x.s);
      v = Math.round(Math.max(lo, Math.min(v, hi)) * 10) / 10;
      if (v !== x.s || v !== ytStart(x)) { x.s = v; x.ms = 1; }   // 보이는 시작(파형 vs)에서 옮긴 값이 AI 시작 s 와 같아도 손 수정으로
    } else {
      var dur = 0; try { dur = YTP && YTP.getDuration ? YTP.getDuration() : 0; } catch (e) { }
      v = Math.round(Math.max(ytStart(x) + 0.5, dur > 0 ? Math.min(v, dur) : v) * 10) / 10;
      if (v !== x.t || !x.me) { x.t = v; x.me = 1; }
    }
    if (Math.abs(v - want) > 0.05) toast(k === 's' ? '시작은 앞 문장 시작과 이 문장 끝 사이에서만 옮길 수 있어요' : '끝은 시작보다 0.5초 이상 뒤여야 해요');
    save(); ytRow(i); ytSideRender();
    if (now || !YTP || !YTV.ready || YTV.perr) return;   // "지금"은 들으면서 누르는 거라 재생을 끊지 않는다
    var g = ytRange(r, i);   // 바뀐 곳을 1.5초 들려준다 (시작이면 앞부분, 끝이면 끝부분)
    if (k === 's') ytPlayRange(g.from, Math.min(g.from + 1.5, g.end), true); else ytPlayRange(Math.max(g.from, g.end - 1.5), g.end, true);
  }
  function ytRow(i) { var r = YTV && ytRec(YTV.id), el = $('#ys' + i); if (r && el && r.sents[i]) el.outerHTML = ytRowHTML(r, i); }
  function ytCardHTML(c) {
    var have = c.w && !c.added ? ytHave(c.w) : null;
    return '<div class="ycard" data-action="yt-card">' +
      (c.loading ? '<div class="small muted">뜻 찾는 중…</div>' : c.err ? '<div class="small muted">' + esc(c.err) + '</div>' :
        '<div class="yc-h"><b>' + esc(c.w) + '</b>' + (c.p ? '<span class="tag">' + esc(c.p) + '</span>' : '') + '<button class="spk" data-action="speak-text" data-text="' + esc(c.w) + '" aria-label="발음 듣기">' + ICON_SPK + '</button></div>' +
        '<div class="yc-m">' + esc(c.m) + '</div>' +
        (c.added ? '<div class="small yc-ok">✓ ' + esc(c.added) + '에 추가했어요</div>'
          : have ? '<div class="small muted">이미 단어장에 있어요 · ' + STAGE_SHORT[have.stage] + '</div>'
          : '<div class="yc-a"><button class="btn primary" data-action="yt-add-word" data-stage="1">1단계에 추가</button><button class="btn" data-action="yt-add-word" data-stage="0">대기에 추가</button></div>')) +
      '<button class="yc-x" data-action="yt-card-close" aria-label="닫기">' + ICON_X + '</button></div>';
  }

  // --- 플레이어 (YouTube IFrame API — 영상 화면에 들어올 때만 불러온다) ---
  function ytApi(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    YTAPI.cbs.push(cb);
    if (YTAPI.state) return;
    YTAPI.state = 1;
    var tm;
    window.onYouTubeIframeAPIReady = function () { clearTimeout(tm); YTAPI.state = 2; var c = YTAPI.cbs; YTAPI.cbs = []; c.forEach(function (f) { f(); }); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api';
    var fail = function () { clearTimeout(tm); if (YTAPI.state === 2) return; YTAPI.state = 0; YTAPI.cbs = []; s.remove(); try { delete window.YT; } catch (e) { window.YT = undefined; } ytPlayerError('load'); };   // 타이머를 지워 두 번 안 돈다 (onerror 뒤 20초 타이머가 새로 불러오는 중인 걸 끊던 것)
    s.onerror = fail;
    tm = setTimeout(fail, 20000);   // 로더는 받았는데 위젯 스크립트가 안 오는 경우 — 영원히 기다리지 않고 "유튜브 앱에서 열기"로
    document.head.appendChild(s);
  }
  function ytMakePlayer(r) {
    var myV = YTV, vid = r.vid, box = $('#ytBox'); if (!box) return;
    var local = !!(r.off && !YTV.noLocal);
    box.classList.toggle('local', local);   // 받은 영상엔 v2.11 잘라내기(--ytcut) 안 씀 — 칸에 딱 맞게
    box.innerHTML = local ? '<video id="ytPlayer" playsinline preload="auto"></video>' + (r.off.kind === 'm4a' ? '<div class="yt-acard"><b>🎧</b><span>' + esc(r.title || '소리만 받은 영상') + '</span></div>' : '') : '<div id="ytPlayer"></div>';
    if (local) { ytMakeLocal(r, box.querySelector('video')); return; }
    ytApi(function () {
      if (YTV !== myV || YTP || !$('#ytPlayer') || current().view !== 'ytv') return;
      // controls 0: 문장을 누를 때마다 뜨던 조작 버튼·진행바·"동영상 더보기"를 숨긴다 (문서화된 파라미터라 정책상 허용, v2.7)
      var pv = { playsinline: 1, rel: 0, fs: 0, controls: 0, iv_load_policy: 3, disablekb: 1 };
      if (location.protocol === 'https:') pv.origin = location.origin;   // 앱: https://kr.hyunuk.vocab3
      YTP = new YT.Player('ytPlayer', {
        videoId: vid, width: '100%', height: '100%', playerVars: pv,
        events: {
          onReady: function () {
            if (YTV !== myV) return; YTV.ready = true; clearTimeout(YTV.readyTimer);
            var p = YTV.pending; YTV.pending = null;
            if (p != null && !document.hidden) ytPlaySent(p);   // 앱이 내려간 사이 준비됐으면 재생하지 않는다 (백그라운드 재생 금지)
          },
          onError: function (e) { if (YTV === myV) ytPlayerError(e && e.data); },
          onAutoplayBlocked: function () { toast('재생이 막혔어요 — 영상의 ▶를 한 번 눌러 주세요'); }
        }
      });
      ytTimer = setInterval(ytTick, 200);
      clearTimeout(myV.readyTimer); myV.readyTimer = setTimeout(function () { if (YTV === myV && !myV.ready && !myV.perr) ytPlayerError('load'); }, 20000);
    });
  }
  var YT_LEAD = 0;   // ponytail: 폰 소리 출력 지연 보정(초) — 끝이 늦게 끊기면 실기기에서 0.03~0.08 로 올려 본다
  // 끝나기 직전엔 화면 갱신마다 확인해 정확히 멈춘다 (0.2초 틱만 쓰면 0~0.26초 들쑥날쑥 늦게 멈췄다)
  function ytFinish() {
    YTV.raf = 0; if (!YTP || YTV.stopAt == null || YTP.getPlayerState() !== 1) return;   // 버퍼링 등이면 다음 틱이 다시 건다
    var c = YTP.getCurrentTime();
    if (c >= YTV.stopAt - YT_LEAD) { if (c - YTV.stopAt < 1.5) YTP.pauseVideo(); YTV.stopAt = null; }
    else YTV.raf = requestAnimationFrame(ytFinish);
  }
  function ytStopPlayer() {
    clearInterval(ytTimer); ytTimer = 0;
    if (YTV && YTV.raf) { cancelAnimationFrame(YTV.raf); YTV.raf = 0; }
    if (YTP) { try { YTP.destroy(); } catch (e) { } YTP = null; }
    if (YTV) { YTV.ready = false; YTV.stopAt = null; YTV.pending = null; }   // 다시 들어왔을 때 옛 멈춤 지점이 남지 않게
  }
  function ytPlayerError(code) { if (!YTV || (YTP && YTP.local)) return; YTV.perr = code || 'load'; YTV.pending = null; ytRenderBody(); }   // 받은 영상 <video> 는 유튜브 오류와 무관 (지난 영상의 iframe_api 실패가 늦게 와도)
  // 받은 영상(v2.14): 앱 <video> 를 YT 플레이어와 같은 모양으로 감싸 YTP 자리에 — 멈춤·한 번 더·시간 수정·괄호 로직이 그대로 돈다
  var YT_MEDIA = 'https://kr.hyunuk.vocab3/media/';   // Java shouldInterceptRequest 가 videos/<vid>.mp4|m4a 를 Range 로 준다
  function ytMakeLocal(r, v) {
    var myV = YTV, P;
    var fail = function () {   // 파일이 깨졌거나 못 읽음 → 이번엔 유튜브로 (파일은 그대로 — "지우기"로 지우고 다시 받을 수 있다)
      if (YTV !== myV || YTP !== P) return;
      myV.noLocal = true; toast('받은 영상을 재생하지 못해 유튜브로 재생해요'); ytSwapPlayer(r);
    };
    v.addEventListener('loadedmetadata', function () {
      if (YTV !== myV || YTP !== P) return; myV.ready = true; clearTimeout(myV.readyTimer);
      var p = myV.pending; myV.pending = null;
      if (p != null && !document.hidden) ytPlaySent(p);
    });
    v.addEventListener('error', fail);
    YTP = P = {
      local: true,
      seekTo: function (t) { try { v.currentTime = t; } catch (e) { } },
      playVideo: function () { var q = v.play(); if (q && q.catch) q.catch(function (e) { if (e && e.name === 'NotAllowedError') toast('재생이 막혔어요 — 문장을 한 번 더 눌러 주세요'); }); },
      pauseVideo: function () { v.pause(); },
      getCurrentTime: function () { return v.currentTime; },
      getPlayerState: function () { return v.ended ? 0 : v.readyState < 1 ? -1 : v.paused ? 2 : 1; },   // YT: 끝 0 · 재생 1 · 멈춤 2 · 준비 전 -1
      getDuration: function () { return v.duration || 0; },
      getPlaybackRate: function () { return v.playbackRate || 1; },
      destroy: function () { v.pause(); v.removeAttribute('src'); try { v.load(); } catch (e) { } v.remove(); }   // src 를 비우고 load = 파일 연결을 바로 놓는다
    };
    v.src = YT_MEDIA + r.vid;
    ytTimer = setInterval(ytTick, 200);
    clearTimeout(myV.readyTimer); myV.readyTimer = setTimeout(function () { if (!myV.ready) fail(); }, 20000);
  }
  function ytSwapPlayer(r) { ytStopPlayer(); YTV.perr = null; ytMakePlayer(r); ytRenderBody(); }

  // --- 영상 받기 (v2.14): 360p 한 파일(없으면 소리만)을 폰에 — 한 번에 하나, 나머지는 줄. Java 가 window.onYtDl(vid, st, a, b) 로 알려 준다 ---
  var YTDL = { q: [], cur: null, got: 0, total: 0, err: {}, nosdk: false, stopping: null };   // 저장 안 함 — 앱이 꺼지면 영상 화면의 "오프라인 저장"으로 다시
  var YT_DL_ERR = { sdk: '안드로이드 13 이상에서만 영상을 받을 수 있어요', network: '인터넷이 끊겨 영상을 다 받지 못했어요', extract: '이 영상은 받을 수 없어요 — 유튜브가 막았거나 방식이 바뀌었어요 (앱 업데이트로 고쳐져요)', space: '저장 공간이 부족해요', big: '영상이 너무 길어 받을 수 없어요 (2GB 넘음)', io: '영상 파일을 저장하지 못했어요' };
  function ytPruneMedia() { var ml = bridge.mediaList(); if (ml) for (var v in ml) if (!ytRecVid(v)) bridge.mediaDelete(v); }   // 덮어쓰기·초기화로 목록에서 빠진 영상 파일 (목록이 없으면 지울 방법이 없다)
  function ytRecVid(vid) { for (var i = 0; i < S.yt.length; i++) if (S.yt[i].vid === vid) return S.yt[i]; return null; }
  function ytDlStart(r) {
    if (!isAndroid || r.off || YTDL.nosdk || YTDL.cur === r.vid || YTDL.q.indexOf(r.vid) >= 0) return;
    delete YTDL.err[r.vid]; YTDL.q.push(r.vid); ytDlShow(r.vid); ytDlNext();
  }
  function ytDlNext() {
    if (YTDL.cur || !YTDL.q.length) return;
    var vid = YTDL.cur = YTDL.q.shift(), r = ytRecVid(vid); YTDL.got = YTDL.total = 0;
    if (!r) { YTDL.cur = null; ytDlNext(); return; }
    ytDlShow(vid);
    bridge.ytDownload(vid, r.title);
  }
  function ytDlDrop(vid) { YTDL.q = YTDL.q.filter(function (v) { return v !== vid; }); }
  window.onYtDl = function (vid, st, a, b) {
    var r = ytRecVid(vid), mine = YTDL.cur === vid;
    if (st === 'info' || st === 'progress') {
      if (!mine) { if (YTDL.cur) YTDL.q.unshift(YTDL.cur); ytDlDrop(vid); YTDL.cur = vid; }   // JS 가 모르는 받기(화면이 다시 떴을 때 등) — Java 가 기준
      if (st === 'info') { YTDL.got = 0; YTDL.total = +b || 0; } else { YTDL.got = +a || 0; YTDL.total = +b || YTDL.total; }
      ytDlShow(vid); return;
    }
    if (mine) YTDL.cur = null;
    if (YTDL.stopping === vid) YTDL.stopping = null;
    if (st === 'done') {
      delete YTDL.err[vid];
      if (!r) bridge.mediaDelete(vid);   // 받는 사이 목록에서 지운 영상
      else { r.off = { kind: a === 'm4a' ? 'm4a' : 'mp4', size: +b || 0 }; delete r.snap; save(); ytDlDone(r); }   // 파형은 Java 가 이어서 뽑고 onMediaEnv 로
    } else if (st === 'fail') {
      if (a === 'busy') { if (mine) { YTDL.q.unshift(vid); ytDlShow(vid); setTimeout(ytDlNext, 5000); } return; }   // Java 가 JS 가 모르는 걸 받는 중 — 조금 뒤 다시
      if (a === 'cancel') delete YTDL.err[vid];
      else { YTDL.err[vid] = { a: String(a || ''), b: String(b || '') }; if (a === 'sdk') YTDL.nosdk = true; }
    }
    ytDlShow(vid);
    if (mine) ytDlNext();
  };
  function ytDlDone(r) {   // 보고 있던 영상이면 앱 플레이어로 바꾼다 — 재생 중이면 끊지 않고 다음에 열 때부터
    if (!YTV || YTV.id !== r.id || current().view !== 'ytv') return;
    var playing = false; try { playing = !!YTP && YTP.getPlayerState() === 1; } catch (e) { }
    YTV.noLocal = false;
    if (playing) toast('영상을 받았어요 — 다음에 열 때부터 인터넷 없이 재생돼요'); else ytSwapPlayer(r);
  }
  function ytMB(n) { var m = (Number(n) || 0) / 1048576; return (m < 10 ? m.toFixed(1) : Math.round(m)) + 'MB'; }
  function ytDlPct() { return YTDL.total ? Math.min(99, Math.floor(YTDL.got * 100 / YTDL.total)) + '%' : '…'; }
  function ytDlShort(r) {   // 목록 항목 한 줄
    var v = r.vid, s = r.off ? '📁 ' + ytMB(r.off.size) : YTDL.cur === v ? '⬇ ' + ytDlPct() : YTDL.q.indexOf(v) >= 0 ? '⬇ 대기' : YTDL.err[v] ? '⬇ 받기 실패' : '';
    return s ? ' · ' + s : '';
  }
  function ytDlHTML(r) {   // 영상 화면 맨 위 한 줄 (세로·가로 모두)
    var v = r.vid, e = YTDL.err[v], h = '';
    if (!isAndroid) h = '';
    else if (r.off) h = '<span>📁 저장됨' + (r.off.kind === 'm4a' ? '(소리만)' : '') + ' · ' + ytMB(r.off.size) + '</span><button class="yd-b" data-action="yt-dl-del">지우기</button>';
    else if (YTDL.cur === v) h = YTDL.stopping === v ? '<span>⬇ 취소하는 중…</span>' : '<span>⬇ 영상 받는 중 ' + ytDlPct() + '</span><button class="yd-b" data-action="yt-dl-cancel">취소</button>';   // 영상 정보를 찾는 중(몇 초)엔 Java 가 바로 못 멈춘다
    else if (YTDL.q.indexOf(v) >= 0) h = '<span>⬇ 받기 대기 중</span><button class="yd-b" data-action="yt-dl-cancel">취소</button>';
    else if (YTDL.nosdk) h = '<span class="yd-err">' + YT_DL_ERR.sdk + '</span>';
    else if (e) h = '<span class="yd-err">' + esc(YT_DL_ERR[e.a] || '영상을 받지 못했어요') + (e.b && e.a !== 'space' ? ' <small>(' + esc(e.b.slice(0, 60)) + ')</small>' : '') + '</span><button class="yd-b" data-action="yt-dl">다시 받기</button>';
    else h = '<button class="yd-b" data-action="yt-dl">⬇ 오프라인 저장</button><span>인터넷 없이 보고, 문장 경계를 소리로 맞춰요</span>';
    return '<div class="yt-dl" id="ytDl">' + h + '</div>';
  }
  function ytDlShow(vid) {
    var r = ytRecVid(vid); if (!r) return;
    var el = YTV && YTV.id === r.id && $('#ytDl'); if (el) el.outerHTML = ytDlHTML(r);
    var li = document.getElementById('yd-' + vid); if (li) li.textContent = ytDlShort(r);
  }
  window.onMediaEnv = function (vid) {
    var r = ytRecVid(vid); if (!r || !ytSnap(r)) return;
    if (YTV && YTV.id === r.id && current().view === 'ytv') ytRenderBody();   // 줄 시간·수정 패널 값도 새 경계로
  };

  // --- 파형으로 문장 경계 맞추기 (v2.14): 받은 파일의 소리 크기(20ms 마다 dBFS+100 → 0~100 한 바이트)에서 실제 조용한 곳을 찾아 vs/ve ---
  // ytRange 가 쓴다 (손으로 고친 ms/me 가 늘 우선). 파일을 지워도 vs/ve 는 남긴다 — 같은 영상이라 유튜브 재생에도 맞는다
  var YT_VS_LEAD = 0.08, YT_VE_TAIL = 0.12;   // ponytail: 말 시작 앞 여유 · 끝 뒤 여유(초) — 실기기에서 첫소리가 잘리거나 끝이 먹히면 여기서 조정
  function ytStart(x) { return x.ms || x.vs == null ? x.s : x.vs; }   // 화면에 보이는 문장 시작 (시간 수정의 기준도 이것)
  function ytSnap(r) {
    var b = r.off && r.sents && r.sents.length ? bridge.mediaEnv(r.vid) : '', e;
    if (!b) return false;
    try { var bin = atob(b); e = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) e[i] = bin.charCodeAt(i); } catch (x) { return false; }
    ytSnapCalc(r.sents, e); r.snap = 1; save();
    return true;
  }
  function ytSnapCalc(ss, e) {
    var F = 0.02, n = e.length, runs = [], a = -1, k, i, v;
    ss.forEach(function (x) { delete x.vs; delete x.ve; });
    if (n < 10 || !ss.length) return false;
    var srt = Array.prototype.slice.call(e).sort(function (p, q) { return p - q; });
    var lo = srt[Math.floor(n * 0.1)], hi = srt[Math.floor(n * 0.9)];
    if (hi - lo < 10) return false;   // 음악처럼 계속 시끄러우면 조용한 곳을 가릴 수 없다 — AI 시간 그대로
    var thr = lo + 0.3 * (hi - lo);
    for (k = 0; k <= n; k++) {   // 무음 = 문턱 아래가 60ms(3프레임) 이상
      var q = k < n && e[k] < thr;
      if (q && a < 0) a = k;
      else if (!q && a >= 0) { if (k - a >= 3) runs.push([a * F, k * F]); a = -1; }
    }
    var r2 = function (t) { return Math.round(t * 100) / 100; };
    var near = function (list, c) { var best = null; list.forEach(function (t) { if (best == null || Math.abs(t - c) < Math.abs(best - c)) best = t; }); return best; };
    var startAt = function (s) { return near(runs.map(function (u) { return u[1]; }).filter(function (t) { return t < n * F && t >= s - 0.8 && t <= s + 0.6; }), s); };   // 무음 → 소리
    var endAt = function (t0) { return near(runs.map(function (u) { return u[0]; }).filter(function (t) { return t > 0 && t >= t0 - 0.6 && t <= t0 + 0.8; }), t0); };   // 소리 → 무음
    v = startAt(ss[0].s); if (v != null) ss[0].vs = r2(v);
    for (i = 0; i < ss.length; i++) {
      var x = ss[i], nx = ss[i + 1], T = x.t != null ? x.t : nx ? nx.s : null;
      if (T == null) continue;   // 마지막 문장인데 끝 시간을 모름 (예전 데이터)
      if (nx && nx.s - T <= 1.5) {   // 붙은 경계: AI 경계 가운데에 가장 가까운 무음 → 앞 끝 = 무음 시작, 뒤 시작 = 무음 끝
        var w0 = Math.min(T, nx.s) - 0.6, w1 = Math.max(T, nx.s) + 0.6, m = (T + nx.s) / 2, best = null, bd = Infinity;
        runs.forEach(function (u) {
          var c0 = Math.max(u[0], w0), c1 = Math.min(u[1], w1); if (c1 <= c0) return;
          var d = m < c0 ? c0 - m : m > c1 ? m - c1 : 0; if (d < bd) { bd = d; best = u; }   // 고르기는 창 안에서, 값은 무음 구간 그대로 (창 끝에서 자르면 말 앞에 긴 무음이 남는다)
        });
        if (!best) {   // 무음이 없으면 창 안 가장 조용한 프레임에서 둘 다 자른다
          var kb = -1, dk = function (j) { return Math.abs((j + 0.5) * F - m); };
          for (k = Math.max(0, Math.ceil(w0 / F)); k < Math.min(n, Math.floor(w1 / F)); k++) if (kb < 0 || e[k] < e[kb] || (e[k] === e[kb] && dk(k) < dk(kb))) kb = k;
          if (kb >= 0) best = [(kb + 0.5) * F, (kb + 0.5) * F];
        }
        if (best) { x.ve = r2(best[0]); nx.vs = r2(best[1]); }
      } else {   // 떨어진 끝·시작 (마지막 문장, 1.5초 넘는 틈)
        v = endAt(T); if (v != null) x.ve = r2(v);
        if (nx) { v = startAt(nx.s); if (v != null) nx.vs = r2(v); }
      }
    }
    ss.forEach(function (x, i) {   // 짧은 문장은 한 무음이 시작·끝을 다 가져가 뒤집힐 수 있다 → 말이 안 되면 버리고 AI 시간으로
      var nx = ss[i + 1];
      if ((x.vs != null && x.ve != null && x.ve - x.vs < 0.3) || (x.vs != null && nx && nx.vs != null && nx.vs <= x.vs)) { delete x.vs; delete x.ve; }
    });
    return true;
  }
  // 새로 정리한 문장 중 너무 짧은 것(3단어 이하: "Yes." "Right.")은 시간 간격이 더 가까운 앞이나 뒤 문장과 합친다
  function ytWords(e) { return ytTokens(e).filter(function (t, k) { return k % 2 === 1; }).length; }
  function ytMergeShort(a) {
    a = a.slice();
    var endOf = function (x) { return x.t != null ? x.t : x.s; };
    for (var i = 0; i < a.length && a.length > 1;) {
      var x = a[i], p = a[i - 1], n = a[i + 1];
      var gp = p ? x.s - endOf(p) : Infinity, gn = n ? n.s - endOf(x) : Infinity;
      if (ytWords(x.e) > 3 || Math.min(gp, gn) > 2) { i++; continue; }   // 2초 넘게 떨어진 짧은 말은 그대로 (합치면 긴 공백까지 한 문장)
      var at = gp <= gn ? i - 1 : i, a1 = a[at], a2 = a[at + 1];
      var m = { s: a1.s, e: a1.e + ' ' + a2.e, k: (a1.k + ' ' + a2.k).replace(/^\s+|\s+$/g, ''), x: a1.x.concat(a2.x).slice(0, 3) };
      if (a2.t != null) m.t = a2.t;   // 뒤 끝을 모르면 비워 둔다 (앞 끝을 쓰면 뒤 말이 잘린다)
      a.splice(at, 2, m); i = at;   // 합친 것도 다시 본다
    }
    return a;
  }
  function ytPlaySent(i) {
    var r = YTV && ytRec(YTV.id), x = r && r.sents && r.sents[i]; if (!x) return;
    var prev = YTV.act; YTV.act = i;
    if (YTV.card && YTV.card.i !== i) { var ci = YTV.card.i; YTV.card = null; ytRow(ci); }
    if (prev >= 0 && prev !== i) ytRow(prev);
    ytRow(i);
    if (YTV.edit) ytSideRender();   // 왼쪽 아래 수정 패널이 이 문장으로
    var rb = $('[data-action="yt-replay"]'); if (rb) rb.disabled = false;
    if (YTV.perr) { bridge.openUrl('https://youtu.be/' + r.vid + '?t=' + Math.floor(x.s)); return; }
    if (!YTP || !YTV.ready) { YTV.pending = i; return; }
    var g = ytRange(r, i); useCount('yt');
    ytPlayRange(g.from, g.end, S.settings.ytPause);
  }
  function ytRange(r, i) {   // 문장 i 를 재생할 구간 { from, end }
    var x = r.sents[i], next = r.sents[i + 1], end;
    var from = x.ms ? x.s : x.vs != null ? Math.max(0, Math.round((x.vs - YT_VS_LEAD) * 100) / 100)   // 파형으로 맞춘 말 시작 바로 앞 (v2.14)
      : Math.max(0, Math.round((x.s - 0.3) * 10) / 10);   // 타임스탬프가 조금 늦게 찍히곤 해서 살짝 앞에서 (손으로 고친 시작은 그 자리)
    if (x.me && x.t != null) end = x.t;   // 손으로 고친 끝은 그 자리 (다음 문장 시작에 안 잘림)
    else if (x.ve != null) {   // 파형으로 맞춘 말 끝 + 여유 — 다음 문장 말소리가 시작되는 곳(vs)은 넘지 않는다
      end = Math.round((x.ve + YT_VE_TAIL) * 100) / 100;
      if (next && (next.ms || next.vs != null)) end = Math.min(end, next.ms ? next.s : Math.max(x.ve, next.vs));   // 손으로 고친 다음 시작은 늘 넘지 않는다
    } else {
      // 다음 문장 시작 시간은 늦게 찍히곤 해서 거기까지 가면 다음 문장 앞부분까지 읽는다 → 문장 끝(t) 바로 뒤에서 멈춘다
      end = x.t != null ? x.t + 0.1 : next ? next.s - 0.15 : x.s + 12;   // 멈춤이 정확해져서 끝 여유 0.15 → 0.1
      if (next && end > next.s) end = next.s;
    }
    return { from: from, end: Math.max(ytStart(x) + 0.5, end) };
  }
  function ytPlayRange(from, end, stop) {   // from 부터 재생, stop 이면 end 에서 멈춤
    bridge.stop();
    if (YTV.raf) { cancelAnimationFrame(YTV.raf); YTV.raf = 0; }
    YTV.from = Math.max(0, from); YTV.end = end;
    YTV.stopAt = stop ? end : null; YTV.armed = false;
    YTP.seekTo(YTV.from, true);
    YTP.playVideo();
  }
  function ytTick() {
    if (!YTP || !YTV || !YTV.ready) return;
    var r = ytRec(YTV.id), t; if (!r || !r.sents) return;
    try { t = YTP.getCurrentTime(); } catch (e) { return; }
    // 멈춤: seekTo 직후 getCurrentTime 은 옛 위치를 돌려주므로(iframe API 캐시) 새 위치가 보인 뒤에야 판정을 켠다.
    // 끝 지점을 자연스럽게 지날 때만 멈추고, 스크러빙으로 훌쩍 넘어가면 그냥 푼다
    if (YTV.stopAt != null && !YTV.raf) {
      if (!YTV.armed) { if (t >= YTV.from - 0.5 && t < YTV.stopAt) YTV.armed = true; }
      else if (t >= YTV.stopAt) { if (t - YTV.stopAt < 1.5) YTP.pauseVideo(); YTV.stopAt = null; }
      else if ((YTV.stopAt - t) / ((YTP.getPlaybackRate && YTP.getPlaybackRate()) || 1) < 0.45) ytFinish();
    }
    var cur = -1; for (var i = 0; i < r.sents.length && ytStart(r.sents[i]) <= t + 0.3; i++) cur = i;   // 재생 시작(ytRange)과 같은 기준 — 아니면 act 와 cur 가 어긋난다
    // 문장마다 멈춤: 누른 문장 구간(시작 조금 앞 ~ 끝 +0.3초)에선 괄호도 그 문장 — 끝이 다음 문장 시작과 붙어 있으면 멈춘 자리에서 괄호만 다음 문장으로 넘어가 강조와 어긋났다
    if (S.settings.ytPause && YTV.act >= 0 && YTV.end != null && t >= YTV.from - 0.5 && t < YTV.end + 0.3) cur = YTV.act;
    if (cur === YTV.cur) return;
    var old = $('#ys' + YTV.cur); if (old) old.classList.remove('cur');
    YTV.cur = cur;
    var el = $('#ys' + cur); if (el) el.classList.add('cur');
    if (el && !S.settings.ytPause && YTP.getPlayerState() === 1) el.scrollIntoView({ block: 'nearest' });   // 이어 듣기 중엔 따라 내려간다
  }

  // --- 단어 뜻: 익힐 표현이면 바로, 아니면 그 문장 맥락으로 Gemini 에 묻고 문장에 저장 ---
  function ytWord(i, k) {
    var r = ytRec(YTV.id), x = r && r.sents[i], toks = x ? ytTokens(x.e) : [], tok = toks[k]; if (!tok) return;
    var key = ytNorm(tok), gm = ytGlossMap(x, toks), prevI = YTV.card ? YTV.card.i : -1, lk = x.lk && Object.prototype.hasOwnProperty.call(x.lk, key) ? x.lk[key] : null;
    if (k in gm) { var g = x.x[gm[k]]; YTV.card = { i: i, t: k, g: gm[k], w: g.w, p: g.p, m: g.m }; }   // g: 표현 전체를 칠한다
    else if (lk) YTV.card = { i: i, t: k, w: lk.w, p: lk.p, m: lk.m };
    else if (!AI.key) YTV.card = { i: i, t: k, err: '뜻을 찾으려면 Gemini API 키가 필요해요 (설정)' };
    else { YTV.card = { i: i, t: k, loading: true }; ytLookup(x, i, k, tok); }
    if (prevI >= 0 && prevI !== i) ytRow(prevI);
    ytRow(i); ytShowCard(i);
  }
  function ytShowCard(i) { var cd = $('#ys' + i + ' .ycard'); if (cd && cd.scrollIntoView) cd.scrollIntoView({ block: 'nearest' }); }
  function ytLookup(x, i, k, tok) {
    var myCard = YTV.card;
    aiGenerate({
      systemInstruction: { parts: [{ text: 'A Korean learner tapped a word in an English sentence from a video. Give what they should learn: if the word is part of a phrasal verb, idiom or fixed expression in this sentence, give that whole expression in dictionary form; otherwise the word\'s dictionary form. "p" = one of n., v., adj., adv., phr., idiom, prep., conj. "m" = a short natural Korean meaning in this context (under 20 characters).' }] },
      contents: [{ role: 'user', parts: [{ text: 'Sentence: "' + x.e + '"\nTapped word: "' + tok + '"' }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { w: { type: 'STRING' }, p: { type: 'STRING' }, m: { type: 'STRING' } }, required: ['w', 'p', 'm'] } }
    }, 'word', 30000).then(function (res) {
      var o = res.status === 200 ? parseAiJson(res.text) : null;
      if (!o || !o.w) throw { msg: res.status === 200 ? '뜻을 찾지 못했어요' : aiErrorMessage(res) };
      var v = { w: String(o.w), p: String(o.p || ''), m: String(o.m || '') };
      x.lk = x.lk || {}; x.lk[ytNorm(tok)] = v; save();
      if (YTV && YTV.card === myCard) { YTV.card = { i: i, t: k, w: v.w, p: v.p, m: v.m }; ytRow(i); ytShowCard(i); }
    }).catch(function (e) {
      if (YTV && YTV.card === myCard) { YTV.card = { i: i, t: k, err: (e && e.msg) || '뜻을 찾지 못했어요' }; ytRow(i); ytShowCard(i); }
    });
  }
  function ytAddWord(stage) {
    var c = YTV && YTV.card, r = YTV && ytRec(YTV.id); if (!c || !c.w || !r || ytHave(c.w)) return;
    var x = r.sents[c.i], nw = mkWord({ w: c.w, p: POS_LIST.indexOf(c.p) > 0 ? c.p : '', m: c.m || '', e: x.e, k: x.k, t: '유튜브' });   // 품사는 편집 화면 목록에 있는 것만
    if (stage === 1) { nw.stage = 1; nw.dailyDate = localDate(); }   // 추가 탭의 "지금 1단계로"와 같게
    S.words.push(nw); save();
    c.added = stage === 1 ? '1단계' : '대기 단어장'; ytRow(c.i);
  }

  RENDER.list = function (p) {
    if (p && p.stage !== undefined) listState.stage = p.stage;
    var c = counts(), total = S.words.length;
    var tabs = [['all', '전체', total], [0, '대기', c[0]], [1, '1단계', c[1]], [2, '2단계', c[2]], [3, '3단계', c[3]], [4, '졸업', c[4]]];
    $('#view-list').innerHTML =
      '<div class="wrap">' +
      '<div class="home-head"><h1>단어장</h1><button class="btn ghost" data-action="tab" data-tab="edit">+ 추가</button></div>' +
      '<div class="seg">' + tabs.map(function (t) {
        return '<button class="' + (String(t[0]) === String(listState.stage) ? 'on' : '') + '" data-action="list-tab" data-stage="' + t[0] + '">' + t[1] + '<small>' + t[2] + '</small></button>';
      }).join('') + '</div>' +
      '<div class="search"><span class="muted">🔍</span><input id="q" placeholder="단어·뜻·예문 검색" value="' + esc(listState.q) + '"><button class="chip' + (listState.star ? ' on' : '') + '" data-action="list-star" title="★ 단어만">★' + (starCount() ? ' ' + starCount() : '') + '</button><button class="chip' + (S.settings.listExample ? ' on' : '') + '" data-action="list-example" title="예문 표시">예문</button></div>' +
      '<div class="list' + (S.settings.listExample ? ' with-ex' : '') + '" id="listBody"></div>' +
      '</div>';
    renderListBody();
    $('#q').addEventListener('input', function (e) { listState.q = e.target.value; renderListBody(); });
  };
  function listItems() {
    var st = listState.stage, q = listState.q.trim().toLowerCase();
    var arr = S.words.filter(function (w) { return (st === 'all' || w.stage === Number(st)) && (!listState.star || w.star); });
    if (q) arr = arr.filter(function (w) { return (w.w + ' ' + w.m + ' ' + w.e + ' ' + w.k + ' ' + w.t).toLowerCase().indexOf(q) >= 0; });
    var rank = { 1: 0, 2: 1, 3: 2, 0: 3, 4: 4 };
    if (st === 'all') arr.sort(function (a, b) { return rank[a.stage] - rank[b.stage] || a.order - b.order; });
    else if (Number(st) === 0) arr.sort(function (a, b) { return a.order - b.order; });
    else arr.sort(function (a, b) { return b.stageAt - a.stageAt; });
    return arr;
  }
  function renderListBody() {
    var arr = listItems();
    var body = $('#listBody');
    if (!arr.length) {
      body.innerHTML = '<div class="empty">' + (listState.q ? '검색 결과가 없어요' : listState.star ? '★ 표시한 단어가 없어요.<br>학습 카드 오른쪽 위 ★을 눌러 표시해요.' : (String(listState.stage) === '0' ? '대기 중인 단어가 없어요.<br>단어를 추가하거나 기본 세트를 불러오세요.' : '여기에는 아직 단어가 없어요')) + '</div>';
      return;
    }
    var show = arr.slice(0, 300);
    var ex = !!S.settings.listExample;
    body.innerHTML = show.map(function (w) {
      // 한 줄: 단어 + 뜻 / 아래: 영어 예문 / 그 아래: 우리말 해석 (설정으로 접을 수 있음)
      return '<button class="item" style="--c:' + STAGE_COLOR[w.stage] + '" data-action="open" data-id="' + esc(w.id) + '">' +
        '<span class="dot"></span><div class="it-body"><div class="it-head"><span class="it-w">' + (w.star ? '<i class="star-i">★</i>' : '') + esc(w.w) + '</span><span class="it-m">' + esc(w.m) + '</span></div>' +
        (ex && w.e ? '<div class="it-e">' + esc(w.e) + '</div>' + (w.k ? '<div class="it-k">' + esc(w.k) + '</div>' : '') : '') +
        '</div><span class="it-tag">' + STAGE_SHORT[w.stage] + '</span></button>';
    }).join('') + (arr.length > 300 ? '<div class="empty">외 ' + (arr.length - 300) + '개 — 검색으로 좁혀 보세요</div>' : '');
  }

  // 예문 수정 시트 — 학습 카드의 예문을 길게 누르면 열림. AI(Gemini)로 새 예문을 받아 고친 뒤 저장.
  function openExampleEditor(id) {
    var w = byId(id); if (!w) return;
    openSheet(
      '<div class="sh-word"><span>' + esc(w.w) + '</span><span class="tag" style="flex:none">예문 수정</span></div>' +
      '<div class="sh-m">' + esc(w.m) + '</div>' +
      '<div class="field" style="margin-top:10px"><label>예문 (영어)</label><textarea id="ex-e" autocapitalize="sentences">' + esc(w.e) + '</textarea></div>' +
      '<div class="field"><label>예문 해석</label><textarea id="ex-k">' + esc(w.k) + '</textarea></div>' +
      '<div class="ai-row"><input id="ex-hint" placeholder="AI에게 상황 요청 (선택) 예: 회의에서, 더 짧게" autocomplete="off"><button class="btn ai" data-action="ai-example" data-id="' + esc(w.id) + '">✨ AI 새 예문</button></div>' +
      '<div class="small muted" id="ai-note">AI가 쓴 예문은 저장 전에 직접 고칠 수 있어요</div>' +
      '<div class="sh-actions"><button class="btn" data-action="close-sheet">취소</button><button class="btn primary" data-action="ex-save" data-id="' + esc(w.id) + '">저장</button></div>'
    );
  }
  function saveExampleFromSheet(id) {
    var w = byId(id); if (!w) return;
    var e = $('#ex-e').value.replace(/\s+/g, ' ').trim(), k = $('#ex-k').value.replace(/\s+/g, ' ').trim();
    if (!e) { toast('예문을 입력해 주세요'); return; }
    var changed = (e !== w.e || k !== w.k);
    w.e = e; w.k = k; save();
    closeSheet();
    toast(changed ? '예문을 저장했어요' : '변경된 내용이 없어요');
    var cur = current();
    if (cur && cur.view === 'study' && SES && currentWord() && currentWord().id === w.id) {
      mountCard('none', true);
      var r = $('#cardArea .reveal[data-reveal="e"]');
      if (r) r.setAttribute('data-step', r.getAttribute('data-max'));
    } else if (cur && RENDER[cur.view] && cur.view !== 'study') RENDER[cur.view](cur.params);
  }

  function openWord(id) {
    var w = byId(id); if (!w) return;
    openSheet(
      '<div class="sh-word"><span>' + esc(w.w) + '</span><button class="spk" data-action="speak-id" data-id="' + esc(w.id) + '" data-what="w">' + ICON_SPK + '</button></div>' +
      '<div class="row" style="gap:6px;margin-top:6px">' + (w.p ? '<span class="tag" style="flex:none">' + esc(w.p) + '</span>' : '') + (w.t ? '<span class="tag theme" style="flex:none">' + esc(w.t) + '</span>' : '') + '<span class="tag" style="flex:none">학습 ' + w.seen + '회 · 외움 ' + w.right + '</span></div>' +
      '<div class="sh-m">' + esc(w.m) + '</div>' +
      '<div class="sh-e"><div class="en"><span>' + esc(w.e || '—') + '</span><button class="spk sm" data-action="speak-id" data-id="' + esc(w.id) + '" data-what="e">' + ICON_SPK + '</button></div>' + (w.k ? '<div class="ko">' + esc(w.k) + '</div>' : '') + '</div>' +
      '<div class="small muted" style="margin-top:14px;font-weight:700">단계 이동</div>' +
      '<div class="stage-select">' + [0, 1, 2, 3, 4].map(function (s) {
        return '<button style="--c:' + STAGE_COLOR[s] + '" class="' + (w.stage === s ? 'on' : '') + '" data-action="set-stage" data-id="' + esc(w.id) + '" data-stage="' + s + '">' + STAGE_SHORT[s] + '</button>';
      }).join('') + '</div>' +
      '<div class="sh-actions"><button class="btn' + (w.star ? ' star-on' : '') + '" data-action="star" data-id="' + esc(w.id) + '">' + (w.star ? '★ 표시됨' : '☆ 중요') + '</button><button class="btn ai" data-action="ex-edit" data-id="' + esc(w.id) + '">✨ 예문·AI</button><button class="btn" data-action="edit" data-id="' + esc(w.id) + '">수정</button><button class="btn danger" data-action="delete" data-id="' + esc(w.id) + '">삭제</button></div>'
    );
  }

  /* ================= ADD / EDIT ================= */
  // v2.0: "추가" 탭은 여러 단어 붙여넣기가 기본 — 단어만 적어도 AI(Gemini)가 뜻·예문·해석을 채운다. 한 단어 폼은 보조 탭.
  var addState = { text: '', target: 1, ai: true, busy: false };
  function singleFormHTML(v, isNew) {
    return '<div class="field"><label>단어 / 표현 *</label><input id="f-w" value="' + esc(v.w) + '" placeholder="예: figure out" autocapitalize="off" autocomplete="off"></div>' +
      '<div class="row"><div class="field" style="flex:0 0 38%"><label>품사</label><select id="f-p">' + POS_LIST.map(function (x) { return '<option value="' + x + '"' + (x === v.p ? ' selected' : '') + '>' + (x || '(선택)') + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>테마 (선택)</label><input id="f-t" value="' + esc(v.t) + '" placeholder="예: 업무·회의"></div></div>' +
      '<div class="field"><label>뜻 *</label><input id="f-m" value="' + esc(v.m) + '" placeholder="예: 알아내다, 해결하다"></div>' +
      '<div class="field"><label>예문 (영어) — 실제로 말할 문장으로</label><textarea id="f-e" placeholder="I can\'t figure out how to set this up.">' + esc(v.e) + '</textarea></div>' +
      '<div class="field"><label>예문 해석</label><textarea id="f-k" placeholder="이걸 어떻게 설정하는지 도무지 모르겠어.">' + esc(v.k) + '</textarea></div>' +
      '<div class="ai-row"><input id="f-hint" placeholder="AI에게 상황 요청 (선택) 예: 여행 중" autocomplete="off"><button class="btn ai" data-action="ai-edit-example">✨ AI 예문 생성</button></div>' +
      (isNew ? '<div class="switch-row"><div><div class="sw-t">오늘 학습(1단계)에 바로 추가</div><div class="sw-s">끄면 대기 목록에 들어가 순서대로 나와요</div></div><button class="toggle on" id="f-now" data-action="toggle-el"></button></div>' : '') +
      '<div class="row">' + (isNew ? '<button class="btn" data-action="save-word" data-more="1">저장하고 계속</button>' : '') + '<button class="btn primary" data-action="save-word">저장</button></div>';
  }
  RENDER.edit = function (p) {
    var w = p && p.id ? byId(p.id) : null;
    var v = $('#view-edit');
    if (w) {
      v.innerHTML = '<div class="topbar"><button class="icon-btn" data-action="back">' + ICON_BACK + '</button><span class="title">단어 수정</span><span style="width:42px"></span></div><div class="wrap">' + singleFormHTML(w, false) + '</div>';
      v.setAttribute('data-id', w.id);
      return;
    }
    var mode = (p && p.mode) || S.settings.addMode || 'bulk';
    v.setAttribute('data-id', '');
    v.innerHTML =
      '<div class="wrap">' +
      '<div class="home-head"><h1>단어 추가</h1></div>' +
      '<div class="seg add-seg"><button class="' + (mode === 'bulk' ? 'on' : '') + '" data-action="add-mode" data-mode="bulk">📋 여러 단어 붙여넣기</button><button class="' + (mode === 'one' ? 'on' : '') + '" data-action="add-mode" data-mode="one">✏️ 한 단어씩</button></div>' +
      (mode === 'one' ? singleFormHTML({ w: '', p: '', m: '', e: '', k: '', t: '' }, true) : bulkFormHTML()) +
      '</div>';
    if (mode === 'bulk') {
      var ta = $('#imp');
      ta.addEventListener('input', function (e) { addState.text = e.target.value; updateImportPreview(); });
      updateImportPreview();
    }
  };
  function bulkFormHTML() {
    return '<div class="tip"><b>한 줄에 한 단어</b>만 적어도 돼요 — 뜻·예문·해석은 AI가 채워요.<br><span class="small">직접 넣으려면 <b>|</b> 로 구분: 단어 | 뜻 | 예문 | 해석 | 품사</span></div>' +
      '<div class="field"><textarea id="imp" class="tall" placeholder="hectic\nrun late | 늦어지다\nfigure out | 알아내다 | I can\'t figure it out. | 도무지 모르겠어.\n\n(메모·사전·기사에서 복사한 목록을 그대로 붙여넣어도 돼요)">' + esc(addState.text) + '</textarea></div>' +
      '<div class="imp-prev" id="impPrev"></div>' +
      '<div class="settings-group">' +
      '<div class="switch-row"><div><div class="sw-t">가져올 위치</div><div class="sw-s">1단계면 오늘 학습에 바로 포함돼요</div></div><div class="pick" id="imp-target"><button class="' + (addState.target === 1 ? 'on' : '') + '" data-action="imp-target" data-value="1">1단계</button><button class="' + (addState.target === 0 ? 'on' : '') + '" data-action="imp-target" data-value="0">대기</button></div></div>' +
      '<div class="switch-row"><div><div class="sw-t">AI로 뜻·예문 자동 채우기</div><div class="sw-s">' + (AI.key ? '비어 있는 뜻·예문·해석·품사를 Gemini가 채워요' : 'Gemini API 키가 필요해요 — <b data-action="go-settings-ai" style="text-decoration:underline">설정에서 입력</b>') + '</div></div><button class="toggle' + (addState.ai && AI.key ? ' on' : '') + '" data-action="imp-ai"' + (AI.key ? '' : ' disabled') + '></button></div>' +
      '</div>' +
      '<button class="btn primary big" id="impGo" data-action="do-import">추가하기</button>';
  }
  function updateImportPreview() {
    var el = $('#impPrev'); if (!el) return;
    var rows = parseLines(addState.text), noM = 0, noE = 0;
    rows.forEach(function (r) { if (!r.m) noM++; if (!r.e) noE++; });
    if (!rows.length) { el.innerHTML = ''; return; }
    var useAi = addState.ai && !!AI.key;
    el.innerHTML = '<b>' + rows.length + '개</b> 인식' + (noM ? ' · 뜻 없음 ' + noM + '개' : '') + (noE ? ' · 예문 없음 ' + noE + '개' : '') +
      ((noM || noE) ? (useAi ? ' → <span class="ai-mark">✨ AI가 채워요</span>' : (noM ? ' → 뜻 없는 단어는 <b>건너뛰어요</b> (AI 채우기를 켜 보세요)' : '')) : '');
    var go = $('#impGo'); if (go && !addState.busy) go.textContent = '추가하기 (' + rows.length + '개)';
  }
  function saveWord(more) {
    var id = $('#view-edit').getAttribute('data-id');
    var w = id ? byId(id) : null;
    var f = { w: $('#f-w').value.trim(), p: $('#f-p').value, m: $('#f-m').value.trim(), e: $('#f-e').value.trim(), k: $('#f-k').value.trim(), t: $('#f-t').value.trim() };
    if (!f.w || !f.m) { toast('단어와 뜻은 꼭 입력해 주세요'); return; }
    if (w) {
      for (var k in f) w[k] = f[k];
      save(); toast('수정했어요'); back();
      return;
    }
    var dup = S.words.some(function (x) { return x.w.toLowerCase() === f.w.toLowerCase(); });
    var now = $('#f-now').classList.contains('on');
    var nw = mkWord(f);
    if (now) { nw.stage = 1; nw.dailyDate = localDate(); }
    S.words.push(nw); save();
    toast(dup ? '저장했어요 (같은 단어가 이미 있어요)' : '저장했어요' + (now ? ' · 1단계' : ' · 대기'));
    if (more) { RENDER.edit({ mode: 'one' }); $('#f-w').focus(); }
    else go('list', { stage: now ? 1 : 0 }, true);
  }

  /* ================= IMPORT (여러 단어) ================= */
  RENDER.import = function (p) { if (p && p.text) addState.text = p.text; S.settings.addMode = 'bulk'; go('edit', { mode: 'bulk' }, true); };   // 예전 진입점 → 추가 탭(붙여넣기)
  // 한 줄 = 한 단어. 구분자: | · 탭 · " - " · " – " · " — " · " : ". 단어만 있어도 OK (뜻·예문은 AI가 채움)
  function parseLines(text) {
    var out = [], seen = {};
    String(text || '').split(/\r?\n/).forEach(function (line) {
      line = line.replace(/^\s*(?:[-*•·▪]|\d+[.)])\s+/, '').trim(); if (!line) return;
      var parts;
      if (line.indexOf('|') >= 0) parts = line.split('|');
      else if (line.indexOf('\t') >= 0) parts = line.split('\t');
      else if (/\s[-–—:]\s/.test(line)) parts = line.split(/\s[-–—:]\s/);
      else parts = [line];
      parts = parts.map(function (x) { return x.trim(); });
      var w = parts[0]; if (!w || w.length > 60) return;
      var key = w.toLowerCase(); if (seen[key]) return; seen[key] = true;
      out.push({ w: w, m: parts[1] || '', e: parts[2] || '', k: parts[3] || '', p: parts[4] || '' });
    });
    return out;
  }
  // 비어 있는 뜻·예문·해석·품사를 Gemini가 채운다 (8개씩 묶어서). onProgress(done, total)
  function aiFillWords(rows, onProgress) {
    var batches = [], i;
    for (i = 0; i < rows.length; i += 8) batches.push(rows.slice(i, i + 8));
    var done = 0;
    function one(batch) {
      var body = {
        systemInstruction: { parts: [{ text: 'You complete vocabulary entries for a Korean adult learner of everyday spoken English. For each item return: "w" exactly as given; "p" part of speech — one of n., v., adj., adv., phr., idiom, prep., conj., interj.; "m" a concise Korean meaning like a dictionary entry (main senses separated by commas, under 30 characters); "e" ONE natural sentence a person would actually say (8-16 words) using the word in that meaning; "k" a colloquial Korean translation of "e". If an item already provides a field, copy it unchanged. Return a JSON array in the same order.' }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(batch.map(function (r) { return { w: r.w, p: r.p, m: r.m, e: r.e, k: r.k }; })) }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json', responseSchema: { type: 'ARRAY', items: { type: 'OBJECT', properties: { w: { type: 'STRING' }, p: { type: 'STRING' }, m: { type: 'STRING' }, e: { type: 'STRING' }, k: { type: 'STRING' } }, required: ['w', 'p', 'm', 'e', 'k'] } } }
      };
      return aiGenerate(body, 'fill', 60000).then(function (res) {
        if (res.status !== 200) throw { msg: aiErrorMessage(res) };
        var arr = parseAiJson(res.text);
        if (!Array.isArray(arr)) throw { msg: '응답을 이해하지 못했어요' };
        var byW = {}; arr.forEach(function (x) { if (x && x.w) byW[String(x.w).toLowerCase()] = x; });
        batch.forEach(function (r, idx) {
          var x = byW[r.w.toLowerCase()] || arr[idx] || {};
          if (!r.m && x.m) r.m = String(x.m).replace(/\s+/g, ' ').trim();
          if (!r.e && x.e) r.e = String(x.e).replace(/\s+/g, ' ').trim();
          if (!r.k && x.k) r.k = String(x.k).replace(/\s+/g, ' ').trim();
          if (!r.p && x.p && POS_LIST.indexOf(String(x.p)) >= 0) r.p = String(x.p);
          r.ai = true;
        });
        done += batch.length; if (onProgress) onProgress(done, rows.length);
      });
    }
    return batches.reduce(function (pr, b) { return pr.then(function () { return one(b); }); }, Promise.resolve());
  }
  function doImport() {
    if (addState.busy) return;
    var rows = parseLines(addState.text);
    if (!rows.length) { toast('추가할 줄이 없어요. 한 줄에 한 단어씩 적어 주세요'); return; }
    var target = addState.target, useAi = addState.ai && !!AI.key;
    var need = rows.filter(function (r) { return !r.m || !r.e; });
    function finish() {
      var have = {}; S.words.forEach(function (w) { have[w.w.toLowerCase()] = true; });
      var added = 0, skipped = 0, noMeaning = 0, today = localDate();
      rows.forEach(function (r) {
        if (have[r.w.toLowerCase()]) { skipped++; return; }
        if (!r.m) { noMeaning++; return; }
        have[r.w.toLowerCase()] = true;
        var nw = mkWord({ w: r.w, m: r.m, e: r.e, k: r.k, p: r.p, t: r.ai ? 'AI 채움' : '' });
        if (target === 1) { nw.stage = 1; nw.dailyDate = today; }
        S.words.push(nw); added++;
      });
      save();
      addState.text = ''; addState.busy = false;
      toast(added + '개 추가' + (skipped ? ' · 중복 ' + skipped : '') + (noMeaning ? ' · 뜻 없음 ' + noMeaning + '개 건너뜀' : ''));
      stack = [{ view: 'home', params: {} }];
      go('list', { stage: target });
    }
    if (!need.length || !useAi) { finish(); return; }
    addState.busy = true;
    var btn = $('#impGo'); if (btn) { btn.disabled = true; btn.textContent = '✨ AI가 채우는 중… 0/' + need.length; }
    var ta = $('#imp'); if (ta) ta.disabled = true;
    aiFillWords(need, function (d, tot) { var b = $('#impGo'); if (b) b.textContent = '✨ AI가 채우는 중… ' + d + '/' + tot; }).then(finish, function (err) {
      addState.busy = false;
      var b = $('#impGo'); if (b) { b.disabled = false; } var t2 = $('#imp'); if (t2) t2.disabled = false;
      updateImportPreview();
      confirm2('AI 채우기에 실패했어요: ' + (err && err.msg ? err.msg : '오류') + '\n뜻이 있는 단어만 먼저 추가할까요?', '추가').then(function (ok) { if (ok) finish(); });
    });
  }

  /* ================= SETTINGS ================= */
  RENDER.settings = function (p) {
    var st = S.settings, c = counts(), au = st.audio;
    var keepScroll = (p && p.scroll === 'keep') ? $('#view-settings').scrollTop : null;
    function apick(key, title, sub, opts, val) {
      return '<div class="switch-row"><div><div class="sw-t">' + title + '</div>' + (sub ? '<div class="sw-s">' + sub + '</div>' : '') + '</div><div class="pick">' + opts.map(function (o) {
        return '<button class="' + (Number(o[0]) === Number(val) ? 'on' : '') + '" data-action="audio-pick" data-key="' + key + '" data-value="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div></div>';
    }
    function asw(key, title, sub, on) {
      return '<div class="switch-row"><div><div class="sw-t">' + title + '</div>' + (sub ? '<div class="sw-s">' + sub + '</div>' : '') + '</div><button class="toggle' + (on ? ' on' : '') + '" data-action="audio-toggle" data-key="' + key + '"></button></div>';
    }
    var builtinCount = S.words.filter(function (w) { return w.src === 'builtin'; }).length;
    function sw(id, title, sub, on) {
      return '<div class="switch-row"><div><div class="sw-t">' + title + '</div>' + (sub ? '<div class="sw-s">' + sub + '</div>' : '') + '</div><button class="toggle' + (on ? ' on' : '') + '" data-action="setting-toggle" data-key="' + id + '"></button></div>';
    }
    function pick(key, title, sub, opts, val) {
      return '<div class="switch-row"><div><div class="sw-t">' + title + '</div>' + (sub ? '<div class="sw-s">' + sub + '</div>' : '') + '</div><div class="pick">' + opts.map(function (o) {
        return '<button class="' + (String(o[0]) === String(val) ? 'on' : '') + '" data-action="setting-pick" data-key="' + key + '" data-value="' + o[0] + '">' + o[1] + '</button>';
      }).join('') + '</div></div>';
    }
    $('#view-settings').innerHTML =
      '<div class="wrap">' +
      '<div class="home-head"><h1>설정</h1></div>' +
      '<div class="section-title">학습</div><div class="settings-group">' +
      pick('dailyGoal', '하루 목표 단어 수', '매일 대기 목록에서 이만큼 1단계로 가져와요', [[10, '10'], [20, '20'], [30, '30'], [50, '50']], st.dailyGoal) +
      pick('mode', '카드 기본 모드', '한→영은 우리말을 보고 영어 단어·예문을 말하는 출력 훈련', [['en', '영→한'], ['ko', '한→영']], st.mode) +
      sw('shuffle', '학습 순서 랜덤', '학습을 시작할 때마다 카드 순서를 섞어요', st.shuffle) +
      sw('hideMeaning', '뜻 가리기', '카드에서 뜻을 탭해야 보여요', st.hideMeaning) +
      sw('hideExample', '예문 가리기', '예문을 먼저 떠올린 뒤 탭해서 확인', st.hideExample) +
      sw('autoSpeak', '자동 발음', '카드가 나오면 단어를, 영어 예문이 보이는 순간 예문을 자동 재생', st.autoSpeak) +
      sw('sfx', '학습 완료 효과음', '완료 화면의 축하 소리 (컨페티는 항상)', st.sfx) +
      '<div class="switch-row"><div style="flex:1"><div class="sw-t">발음 속도 <span class="muted" id="rateVal">' + st.rate.toFixed(1) + 'x</span></div><input type="range" id="rate" min="0.5" max="1.3" step="0.1" value="' + st.rate + '"></div><button class="btn" data-action="tts-test">테스트</button></div>' +
      '</div>' +
      '<div class="section-title" id="audio-settings">듣기 복습 (읽어 주기)</div><div class="settings-group">' +
      apick('wordRepeat', '단어 읽기 횟수', '', [[1, '1회'], [2, '2회']], au.wordRepeat) +
      apick('pauseAfterWord', '단어 뒤 대기', '뜻·예문을 떠올릴 시간', [[1000, '1초'], [2000, '2초'], [3000, '3초'], [5000, '5초']], au.pauseAfterWord) +
      apick('exampleRepeat', '영어 예문 읽기 횟수', '', [[1, '1회'], [2, '2회'], [3, '3회']], au.exampleRepeat) +
      apick('exampleRate', '예문 속도', '천천히 ← → 보통', [[0.6, '0.6'], [0.7, '0.7'], [0.8, '0.8'], [0.9, '0.9'], [1.0, '1.0']], au.exampleRate) +
      apick('exampleGap', '예문 사이 간격', '', [[500, '0.5초'], [1000, '1초'], [2000, '2초']], au.exampleGap) +
      asw('readExampleKo', '예문 해석 읽기 (한국어)', '영어 예문 뒤에 우리말 해석을 한 번 읽어 줘요. 해석이 없는 단어는 뜻을 읽어요', au.readExampleKo) +
      asw('readMeaning', '단어 뜻도 읽기', '', au.readMeaning) +
      apick('pauseBetween', '다음 단어까지 대기', '', [[1000, '1초'], [1500, '1.5초'], [2000, '2초'], [3000, '3초']], au.pauseBetween) +
      asw('loop', '끝나면 처음부터 반복', '', au.loop) +
      '</div>' +
      '<div class="section-title" id="ai-settings">AI 예문 (Gemini)</div><div class="settings-group">' +
      '<div class="field" style="padding-top:12px"><label>Gemini API 키</label><div class="row"><input id="ai-key" type="password" value="' + esc(AI.key) + '" placeholder="AQ.…" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="btn" data-action="ai-key-eye" style="flex:none">보기</button></div></div>' +
      '<div class="field"><label>모델</label><div class="row"><input id="ai-model" value="' + esc(AI.model) + '" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="btn" data-action="ai-models" style="flex:none">목록</button></div></div>' +
      '<div class="btn-row" style="border-bottom:0"><button class="btn" data-action="ai-test">연결 테스트</button><button class="btn" data-action="open-url" data-url="https://aistudio.google.com/apikey">키 발급 페이지 (무료)</button></div>' +
      '<div class="small muted" style="padding:0 0 12px;line-height:1.5">학습 카드의 <b>예문을 길게 누르면</b> 수정·AI 생성 창이 열려요. 키는 이 기기에만 저장되고 백업 파일에는 들어가지 않아요. AI 버튼을 누를 때만 단어·뜻·예문이 Google Gemini로 전송돼요.</div>' +
      '<div class="small muted ai-last" id="ai-last">' + aiLastLine() + '</div>' +
      '</div>' +
      '<div class="section-title">회화 연습</div><div class="settings-group">' +
      '<div class="switch-row"><div><div class="sw-t">교정 설명 언어</div></div><div class="pick">' + [['ko', '한국어'], ['en', '영어']].map(function (o) { return '<button class="' + (o[0] === st.talk.feedbackLang ? 'on' : '') + '" data-action="talk-set-s" data-key="feedbackLang" data-value="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="switch-row"><div><div class="sw-t">AI 답변 읽어 주기</div></div><button class="toggle' + (st.talk.speak ? ' on' : '') + '" data-action="talk-toggle" data-key="speak"></button></div>' +
      '<div class="switch-row"><div><div class="sw-t">말하면 바로 보내기</div><div class="sw-s">끄면 인식된 문장을 고친 뒤 보낼 수 있어요</div></div><button class="toggle' + (st.talk.autoSend ? ' on' : '') + '" data-action="talk-toggle" data-key="autoSend"></button></div>' +
      '<div class="small muted" style="padding:6px 0 12px;line-height:1.5">말하기는 기기의 음성 인식 서비스(마이크 권한)를 쓰고, 인식된 문장과 대화 내용만 Google Gemini로 전송돼요. 오디오는 저장하지 않아요.</div>' +
      '</div>' +
      '<div class="section-title">화면</div><div class="settings-group">' +
      pick('theme', '밝기', '', [['light', '라이트'], ['dark', '다크']], st.theme) +
      '<div class="switch-row" style="flex-direction:column;align-items:stretch;gap:10px"><div><div class="sw-t">색 테마 <span class="muted" id="themeName">' + esc(themeById(st.colorTheme).name) + '</span></div><div class="sw-s">탭해서 고르거나, 아래 스위치를 켜면 새 단어를 받을 때마다 랜덤으로 바뀌어요</div></div>' +
      '<div class="swatches">' + THEMES.map(function (t) {
        var p = st.theme === 'dark' ? t.d : t.l;
        return '<button class="sw' + (t.id === st.colorTheme ? ' on' : '') + '" data-action="color-theme" data-id="' + t.id + '" aria-label="' + esc(t.name) + '" style="--sw-bg:' + p.bg + ';--sw-p:' + p.primary + ';--sw-s:' + p.surface2 + '"><span class="sw-chip"><i></i></span><small>' + esc(t.name) + '</small></button>';
      }).join('') + '</div></div>' +
      sw('themeRandom', '매일 테마 자동 변경', '새 단어가 1단계에 채워질 때마다 색 테마가 랜덤으로 바뀌어요', st.themeRandom) +
      '<div class="btn-row" style="border-bottom:0"><button class="btn" data-action="theme-shuffle">🎲 지금 다른 테마로</button></div>' +
      '</div>' +
      '<div class="section-title">데이터</div><div class="settings-group">' +
      '<div class="btn-row"><button class="btn" data-action="backup-file">백업 파일 저장</button><button class="btn" data-action="restore-file">백업 파일 불러오기</button></div>' +
      '<div class="btn-row"><button class="btn" data-action="backup-share">텍스트로 공유</button><button class="btn" data-action="backup-copy">클립보드 복사</button><button class="btn" data-action="restore-paste">붙여넣기 복원</button></div>' +
      '<div class="btn-row"><button class="btn" data-action="reseed">기본 단어 세트 불러오기 (' + builtinCount + '/' + (window.BUILTIN_WORDS || []).length + ')</button></div>' +
      '<div class="btn-row"><button class="btn danger" data-action="purge-grad">졸업 단어 삭제 (' + c[4] + ')</button><button class="btn danger" data-action="reset-all">전체 초기화</button></div>' +
      '</div>' +
      '<div class="section-title">사용법</div><div class="card-box howto">' +
      '<b>1단계 새 단어장</b> — 매일 새 단어 ' + st.dailyGoal + '개와 예문을 익혀요. 단어와 예문이 자연스럽게 나오면 오른쪽으로 넘겨 2단계로.<br>' +
      '<b>2단계 외운 단어장</b> — 외운 단어를 주기적으로 복습해요. 확실하면 3단계로, 흔들리면 1단계로 되돌려요.<br>' +
      '<b>3단계 완전 암기장</b> — 최종 점검을 통과한 단어는 졸업(보관)하고, 언제든 삭제할 수 있어요.<br>' +
      '<span class="muted small">팁: 예문 칸은 탭할 때마다 영어 → 해석 → 가림 순서로 바뀌어요. 뜻만 외우지 말고 예문을 소리 내어 말해 보세요. 한→영 모드가 출력 훈련에 좋아요.</span>' +
      '</div>' +
      '<div class="center muted small">3단계 단어장 v' + APP_VERSION + ' · 단어 ' + S.words.length + '개 · TTS ' + (bridge.ttsReady() ? '사용 가능' : '준비 중/사용 불가') + '</div>' +
      '</div>';
    if (keepScroll != null) $('#view-settings').scrollTop = keepScroll;
    $('#rate').addEventListener('input', function (e) { S.settings.rate = Number(e.target.value); $('#rateVal').textContent = S.settings.rate.toFixed(1) + 'x'; save(); });
    $('#ai-key').addEventListener('input', function (e) { AI.key = e.target.value.trim(); saveAi(); });
    $('#ai-model').addEventListener('change', function (e) { AI.model = e.target.value.trim().replace(/^models\//, '') || AI_DEFAULT_MODEL; e.target.value = AI.model; AI.noThink = false; saveAi(); });
    if (p && (p.scroll === 'audio' || p.scroll === 'ai')) { var el = $('#' + p.scroll + '-settings'); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30); }
    if (p && p.scroll === 'ai' && !AI.key) setTimeout(function () { var k = $('#ai-key'); if (k) k.focus(); }, 350);
  };

  function backupJSON() { return JSON.stringify(S); }
  function backupName() { var d = new Date(); return 'vocab3-backup-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json'; }
  function restoreFromText(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { data = null; }
    if (!data || !Array.isArray(data.words)) {
      var rows = parseLines(text || '');
      if (rows.length) { go('import', { text: text }); return; }
      toast('백업 형식이 아니에요'); return;
    }
    ask('백업을 어떻게 적용할까요?\n병합: 없는 단어만 추가 (기존 유지)\n덮어쓰기: 현재 데이터를 백업으로 교체', [
      { label: '취소', value: '' }, { label: '병합', value: 'merge' }, { label: '덮어쓰기', value: 'replace', cls: 'primary' }
    ]).then(function (v) {
      if (!v) return;
      if (v === 'replace') { S = migrate(data); ytPruneMedia(); }
      else {
        var have = {}; S.words.forEach(function (w) { have[w.id] = true; have['w:' + w.w.toLowerCase()] = true; });
        var n = 0;
        data.words.forEach(function (w) { if (have[w.id] || have['w:' + String(w.w).toLowerCase()]) return; S.words.push(mkWord(w)); n++; });
        toast(n + '개 단어를 병합했어요');
      }
      saveNow(); applyTheme(); goTab('home');
    });
  }
  window.onFileOpened = function (content) { if (content == null) { toast('파일을 열지 못했어요'); return; } restoreFromText(content); };
  window.onFileSaved = function (ok) { toast(ok ? '백업 파일을 저장했어요' : '저장을 취소했어요'); };
  $('#filePick').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { restoreFromText(String(r.result)); }; r.readAsText(f);
    e.target.value = '';
  });

  /* ================= AUDIO REVIEW (듣기 복습) ================= */
  var AUD = { active: false, playing: false, finished: false, index: 0, total: 0 };
  var AUDIO_SETS = [[1, '1단계'], [2, '2단계'], [3, '3단계'], ['all', '1~3단계'], [4, '졸업']];

  function cleanKo(t) {
    return String(t || '').replace(/[·/]/g, ', ').replace(/[()]/g, ' ').replace(/~/g, '무엇').replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
  }
  function audioWords(set, order) {
    var arr = S.words.filter(function (w) { return set === 'all' ? (w.stage >= 1 && w.stage <= 3) : w.stage === Number(set); });
    if (order === 'rand') shuffle(arr); else arr.sort(function (a, b) { return a.stage - b.stage || a.order - b.order; });
    return arr;
  }
  function buildSteps(w) {
    var a = S.settings.audio, st = [], i;
    for (i = 0; i < a.wordRepeat; i++) {
      st.push({ t: 'say', text: w.w, lang: 'en', rate: S.settings.rate, p: 'w' });
      if (i < a.wordRepeat - 1) st.push({ t: 'wait', ms: 700 });
    }
    st.push({ t: 'wait', ms: a.pauseAfterWord });
    if (w.e) {
      for (i = 0; i < a.exampleRepeat; i++) {
        st.push({ t: 'say', text: w.e, lang: 'en', rate: a.exampleRate, p: 'e' });
        if (i < a.exampleRepeat - 1) st.push({ t: 'wait', ms: a.exampleGap });
      }
    }
    if (a.readExampleKo && w.k) { st.push({ t: 'wait', ms: 500 }); st.push({ t: 'say', text: cleanKo(w.k), lang: 'ko', rate: 1.0, p: 'k' }); }
    if ((a.readMeaning || (a.readExampleKo && !w.k)) && w.m) { st.push({ t: 'wait', ms: 400 }); st.push({ t: 'say', text: cleanKo(w.m), lang: 'ko', rate: 1.0, p: 'm' }); }
    st.push({ t: 'wait', ms: a.pauseBetween });
    return st;
  }
  function audioSummary() {
    var a = S.settings.audio;
    return '단어 ' + a.wordRepeat + '회 → ' + (a.pauseAfterWord / 1000) + '초 대기 → 예문 ' + a.exampleRepeat + '회 (' + a.exampleRate.toFixed(1) + 'x)' +
      (a.readExampleKo ? ' → 예문 해석 읽기' : '') + (a.readMeaning ? ' → 뜻 읽기' : '') + ' → ' + (a.pauseBetween / 1000) + '초 후 다음 단어' + (a.loop ? ' · 반복' : '');
  }
  function startAudio() {
    var a = S.settings.audio;
    var arr = audioWords(a.set, a.order);
    if (!arr.length) { toast('재생할 단어가 없어요'); return; }
    var pl = arr.map(function (w) { return { id: w.id, w: w.w, m: w.m, e: w.e || '', k: w.k || '', steps: buildSteps(w) }; });
    AUD = { active: true, playing: true, finished: false, index: 0, total: pl.length, loop: a.loop, w: pl[0].w, m: pl[0].m, e: pl[0].e, k: pl[0].k };
    bridge.audioStart(JSON.stringify(pl), a.loop);
    renderAudio();
  }
  RENDER.audio = function () { renderAudio(); startAudioPoll(); };
  var audioPoll = null;
  function startAudioPoll() {
    if (audioPoll) return;
    audioPoll = setInterval(function () {
      var cur = current();
      if (!cur || cur.view !== 'audio') { clearInterval(audioPoll); audioPoll = null; return; }
      if (!AUD.active) return;
      var raw = bridge.audioState(); if (!raw) return;
      var st; try { st = JSON.parse(raw); } catch (e) { return; }
      if (st.index !== AUD.index || st.playing !== AUD.playing || st.active !== AUD.active || st.part !== AUD.part || st.w !== AUD.w) window.onAudioState(st);
    }, 1000);
  }
  function renderAudio() {
    var a = S.settings.audio, v = $('#view-audio');
    var html = '<div class="topbar"><button class="icon-btn" data-action="back">' + ICON_BACK + '</button><span class="title">듣기 복습</span><button class="icon-btn" data-action="audio-settings" aria-label="설정">' + ICON_GEAR + '</button></div><div class="wrap">';
    if (AUD.active) {
      var pct = AUD.total ? Math.round((AUD.index + (AUD.playing ? 0.5 : 0)) / AUD.total * 100) : 0;
      html +=
        '<div class="player">' +
        '<div class="p-top"><span class="tag theme">' + (AUD.playing ? '재생 중' : '일시정지') + '</span><span class="p-count">' + (AUD.index + 1) + ' / ' + AUD.total + '</span></div>' +
        '<div class="pbar" style="--c:var(--primary);margin:10px 0 18px"><div style="width:' + pct + '%"></div></div>' +
        '<div class="p-word' + (AUD.part === 'w' ? ' now' : '') + '">' + esc(AUD.w) + '</div>' +
        '<div class="p-m' + (AUD.part === 'm' ? ' now' : '') + '">' + esc(AUD.m) + '</div>' +
        (AUD.e ? '<div class="p-e"><div class="en' + (AUD.part === 'e' ? ' now' : '') + '">' + esc(AUD.e) + '</div>' + (AUD.k ? '<div class="ko' + (AUD.part === 'k' ? ' now' : '') + '">' + esc(AUD.k) + '</div>' : '') + '</div>' : '') +
        '<div class="ctls">' +
        '<button class="ctl" data-action="audio-ctl" data-cmd="prev" aria-label="이전">' + ICON_PREV + '</button>' +
        '<button class="ctl big" data-action="audio-ctl" data-cmd="toggle" aria-label="재생/일시정지">' + (AUD.playing ? ICON_PAUSE : ICON_PLAY) + '</button>' +
        '<button class="ctl" data-action="audio-ctl" data-cmd="next" aria-label="다음">' + ICON_NEXT + '</button>' +
        '</div>' +
        '<button class="btn danger block" data-action="audio-ctl" data-cmd="stop">정지</button>' +
        (AUD.koOk === false ? '<div class="small muted center" style="margin-top:8px">기기에 한국어 음성이 없어 뜻은 건너뛰어요</div>' : '') +
        '</div>' +
        '<div class="tip small">화면을 꺼도, 다른 앱(내비게이션)을 켜도 계속 재생돼요. 알림에서 이전·일시정지·다음·정지를 누를 수 있어요.<br><b>운전 중에는 화면을 보지 말고 소리로만 복습하세요.</b></div>';
    } else {
      var counts = {};
      AUDIO_SETS.forEach(function (t) { counts[t[0]] = audioWords(t[0], 'seq').length; });
      html +=
        (AUD.finished && AUD.total ? '<div class="tip">듣기 복습을 마쳤어요 🎧 ' + AUD.total + '개</div>' : '') +
        '<div class="card-box">' +
        '<div class="section-title" style="margin:0 0 8px">재생할 단어장</div>' +
        '<div class="seg">' + AUDIO_SETS.map(function (t) {
          return '<button class="' + (String(a.set) === String(t[0]) ? 'on' : '') + '" data-action="audio-set" data-set="' + t[0] + '">' + t[1] + '<small>' + counts[t[0]] + '</small></button>';
        }).join('') + '</div>' +
        '<div class="switch-row"><div><div class="sw-t">순서</div></div><div class="pick"><button class="' + (a.order === 'seq' ? 'on' : '') + '" data-action="audio-order" data-order="seq">순서대로</button><button class="' + (a.order === 'rand' ? 'on' : '') + '" data-action="audio-order" data-order="rand">랜덤</button></div></div>' +
        '<div class="switch-row"><div><div class="sw-t">읽는 방식</div><div class="sw-s">' + audioSummary() + '</div></div><button class="btn" data-action="audio-settings">변경</button></div>' +
        '</div>' +
        '<button class="btn primary big" data-action="audio-start"' + (counts[a.set] ? '' : ' disabled') + '>▶ 재생 시작 · ' + counts[a.set] + '개</button>' +
        '<div class="tip small">단어를 읽어 주고 잠깐 기다린 뒤, 영어 예문을 천천히 몇 번 읽고 우리말 해석을 한 번 읽어 줘요. 화면을 꺼도 계속 재생되고, 알림에서 조작할 수 있어요.</div>';
    }
    html += '</div>';
    v.innerHTML = html;
  }
  var ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>';
  var ICON_PREV = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>';
  var ICON_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

  window.onAudioState = function (json) {
    var st; try { st = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return; }
    if (!st) return;
    var wasActive = AUD.active;
    AUD = st;
    if (wasActive && st.finished && !st.active && st.total) toast('듣기 복습 완료 · ' + st.total + '개');
    var cur = current();
    if (!cur) return;
    if (cur.view === 'audio') renderAudio();
    else if (cur.view === 'home' && wasActive !== st.active) RENDER.home();
  };
  window.onAudioError = function (msg) { AUD = { active: false, playing: false, finished: true, index: 0, total: 0 }; toast('재생 오류: ' + msg); if (current() && current().view === 'audio') renderAudio(); };

  /* ================= actions ================= */
  var ACTIONS = {
    'back': function () { back(); },
    'home': function () { goTab('home'); },
    'tab': function (el) { goTab(el.getAttribute('data-tab')); },
    'start': function (el) { startSession(Number(el.getAttribute('data-stage'))); },
    'pull': function () {
      var n = pullNewWords(S.settings.dailyGoal), t = null;
      if (n && S.settings.themeRandom) t = pickRandomTheme();
      save(); toast(n ? '새 단어 ' + n + '개를 1단계로 가져왔어요' + (t ? ' · 테마: ' + t.name : '') : '대기 중인 단어가 없어요'); render();
    },
    'list': function (el) { stack = [{ view: 'home', params: {} }]; listState.star = false; go('list', { stage: el.getAttribute('data-stage') === 'all' ? 'all' : Number(el.getAttribute('data-stage')) }); },
    'list-example': function () { S.settings.listExample = !S.settings.listExample; save(); RENDER.list({}); },
    'list-tab': function (el) { var s = el.getAttribute('data-stage'); listState.stage = s === 'all' ? 'all' : Number(s); RENDER.list({}); },
    'tip-close': function () { S.settings.tipDismissed = true; save(); render(); },
    'open': function (el) { openWord(el.getAttribute('data-id')); },
    'star': function (el) {
      var w = byId(el.getAttribute('data-id')); if (!w) return;
      w.star = !w.star; save(); bridge.vibrate(8);
      $$('[data-action="star"][data-id="' + w.id + '"]').forEach(function (b) {
        if (b.classList.contains('star')) b.classList.toggle('on', w.star);
        else { b.classList.toggle('star-on', w.star); b.textContent = w.star ? '★ 표시됨' : '☆ 중요'; }
      });
      toast(w.star ? '★ 중요 단어로 표시 — 회화 미션에 우선 나와요' : '★ 표시를 해제했어요');
      if (current().view === 'list') renderListBody();
    },
    'list-star': function () { listState.star = !listState.star; RENDER.list({}); },
    'list-starred': function () { stack = [{ view: 'home', params: {} }]; listState.star = true; go('list', { stage: 'all' }); },
    'speak': function (el) {
      var w = currentWord(); if (!w) return;
      var what = el.getAttribute('data-what');
      speak(what === 'e' ? w.e : w.w, 'en');
    },
    'speak-id': function (el) { var w = byId(el.getAttribute('data-id')); if (w) speak(el.getAttribute('data-what') === 'e' ? w.e : w.w, 'en'); },
    'judge': function (el) {
      var card = $('#cardArea .card'); if (!card || flying) return;
      var yesv = el.getAttribute('data-yes') === '1';
      flyOut(card, yesv ? 'up' : 'down', function () { judge(yesv); });
    },
    'nav': function (el) {
      var card = $('#cardArea .card'); if (!card || flying) return;
      var step = Number(el.getAttribute('data-dir'));
      if (!canNavigate(step)) { toast(step > 0 ? '마지막 카드예요' : '첫 카드예요'); return; }
      flyOut(card, step > 0 ? 'left' : 'right', function () { navigate(step); });
    },
    'demote': function () {
      var card = $('#cardArea .card'); if (!card || flying) return;
      flyOut(card, 'down', function () { judge(false, true); });
    },
    'undo': function () { undo(); },
    'sent': function () { sentStart(); },
    'use-day': function (el) { useSel = el.getAttribute('data-d'); var y = $('#view-stats').scrollTop; RENDER.stats(); $('#view-stats').scrollTop = y; },
    'sent-judge': function (el) {
      var card = $('#sentArea .card'); if (!card || flying) return;
      var easy = el.getAttribute('data-easy') === '1';
      flyOut(card, easy ? 'up' : 'down', function () { sentJudge(easy); });
    },
    'sent-undo': function () { if (!flying) sentUndo(); },
    'sent-speak': function () { var w = SENT && byId(SENT.id); if (w) speak(w.e, 'en'); },
    'reveal-all': function () { var spoke = false; $$('#cardArea .reveal').forEach(function (r) { if (cycleReveal(r, true, spoke)) spoke = true; }); },
    'toggle-mode': function () { S.settings.mode = S.settings.mode === 'en' ? 'ko' : 'en'; save(); mountCard('none'); },
    'toggle-swap': function () {
      S.settings.swapJudge = !S.settings.swapJudge; save();
      var v = $('#view-study'); v.setAttribute('data-token', ''); RENDER.study();
      toast(S.settings.swapJudge ? '버튼: 왼쪽 외웠다 · 오른쪽 아직' : '버튼: 왼쪽 아직 · 오른쪽 외웠다');
    },
    'toggle-auto': function () { S.settings.autoSpeak = !S.settings.autoSpeak; save(); mountCard('none'); toast(S.settings.autoSpeak ? '자동 발음 켬' : '자동 발음 끔'); },
    'retry': function () { if (SES) startSession(SES.stage, sesList('no')); },
    'set-stage': function (el) {
      var w = byId(el.getAttribute('data-id')); if (!w) return;
      var s = Number(el.getAttribute('data-stage'));
      w.stage = s; w.stageAt = Date.now(); if (s === 1) w.dailyDate = localDate();
      save(); closeSheet(); toast(STAGE_SHORT[s] + '(으)로 이동했어요');
      if (current().view === 'list') RENDER.list({}); else if (current().view === 'home') RENDER.home();
    },
    'edit': function (el) { var id = el.getAttribute('data-id'); closeSheet(); go('edit', { id: id }); },
    'delete': function (el) {
      var w = byId(el.getAttribute('data-id')); if (!w) return;
      confirm2('"' + w.w + '" 단어를 삭제할까요?', '삭제', true).then(function (ok) {
        if (!ok) return;
        S.words = S.words.filter(function (x) { return x.id !== w.id; });
        save(); closeSheet(); toast('삭제했어요');
        if (current().view === 'list') RENDER.list({}); else render();
      });
    },
    'toggle-el': function (el) { el.classList.toggle('on'); },
    'pick': function (el) { $$('[data-group="' + el.getAttribute('data-group') + '"]').forEach(function (b) { b.classList.toggle('on', b === el); }); },
    'save-word': function (el) { saveWord(el.getAttribute('data-more') === '1'); },
    'go-import': function () { S.settings.addMode = 'bulk'; save(); RENDER.edit({ mode: 'bulk' }); },
    'add-mode': function (el) { S.settings.addMode = el.getAttribute('data-mode'); save(); RENDER.edit({ mode: S.settings.addMode }); if (S.settings.addMode === 'one') { var f = $('#f-w'); if (f) f.focus(); } },
    'imp-target': function (el) { addState.target = Number(el.getAttribute('data-value')); $$('#imp-target button').forEach(function (b) { b.classList.toggle('on', b === el); }); },
    'imp-ai': function (el) { addState.ai = !addState.ai; el.classList.toggle('on', addState.ai); updateImportPreview(); },
    'do-import': function () { doImport(); },
    'setting-toggle': function (el) { var k = el.getAttribute('data-key'); S.settings[k] = !S.settings[k]; save(); el.classList.toggle('on', S.settings[k]); },
    'setting-pick': function (el) {
      var k = el.getAttribute('data-key'), v = el.getAttribute('data-value');
      S.settings[k] = (k === 'dailyGoal') ? Number(v) : v;
      save(); if (k === 'theme') applyTheme(); RENDER.settings({ scroll: 'keep' });
    },
    'tts-test': function () { speak('Let\'s catch up over lunch.', 'en'); if (!bridge.ttsReady()) toast('TTS가 아직 준비되지 않았어요'); },
    'backup-file': function () { saveNow(); bridge.saveFile(backupName(), backupJSON()); },
    'restore-file': function () { bridge.openFile(); },
    'backup-share': function () { saveNow(); bridge.share('3단계 단어장 백업', backupJSON()); },
    'backup-copy': function () { saveNow(); bridge.copy(backupJSON()); toast('백업 데이터를 클립보드에 복사했어요'); },
    'restore-paste': function () {
      openSheet('<div class="sh-word"><span>붙여넣기 복원</span></div><div class="field" style="margin-top:10px"><textarea id="pasteBox" class="tall" placeholder="백업 JSON 또는 단어 목록(단어 | 뜻 | 예문 | 해석)을 붙여넣으세요"></textarea></div><div class="sh-actions"><button class="btn" data-action="close-sheet">취소</button><button class="btn primary" data-action="restore-paste-go">복원</button></div>');
    },
    'restore-paste-go': function () { var t = $('#pasteBox').value; closeSheet(); restoreFromText(t); },
    'close-sheet': function () { closeSheet(); },
    /* --- AI 예문 --- */
    'ex-edit': function (el) { var id = el.getAttribute('data-id'); closeSheet(); setTimeout(function () { openExampleEditor(id); }, 30); },
    'ex-save': function (el) { saveExampleFromSheet(el.getAttribute('data-id')); },
    'ai-example': function (el) {
      var w = byId(el.getAttribute('data-id')); if (!w) return;
      var cur = { w: w.w, p: w.p, m: w.m, e: $('#ex-e') ? $('#ex-e').value.trim() : w.e };
      runAiExample(cur, $('#ex-hint') ? $('#ex-hint').value.trim() : '', '#ex-e', '#ex-k', el);
    },
    'ai-edit-example': function (el) {
      var f = { w: $('#f-w').value.trim(), p: $('#f-p').value, m: $('#f-m').value.trim(), e: $('#f-e').value.trim() };
      if (!f.w || !f.m) { toast('단어와 뜻을 먼저 입력해 주세요'); return; }
      runAiExample(f, $('#f-hint').value.trim(), '#f-e', '#f-k', el);
    },
    'ai-key-eye': function (el) { var i = $('#ai-key'); var show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.textContent = show ? '숨김' : '보기'; },
    'ai-test': function (el) {
      if (!AI.key) { toast('API 키를 먼저 입력해 주세요'); $('#ai-key').focus(); return; }
      var orig = el.textContent; el.disabled = true; el.textContent = '확인 중…';
      aiGenerateExample({ w: 'figure out', p: 'phr.', m: '알아내다, 해결하다', e: '' }, '', 'test').then(function (r) {
        toast('연결 성공 ✓  ' + r.e);
      }, function (err) { toast(err && err.msg ? err.msg : '연결 실패'); }).then(function () { if (el.isConnected) { el.disabled = false; el.textContent = orig; } var n = $('#ai-last'); if (n) n.innerHTML = aiLastLine(); });
    },
    'ai-models': function (el) {
      if (!AI.key) { toast('API 키를 먼저 입력해 주세요'); $('#ai-key').focus(); return; }
      var orig = el.textContent; el.disabled = true; el.textContent = '불러오는 중…';
      aiListModels().then(function (list) {
        if (!list.length) { toast('사용 가능한 모델을 찾지 못했어요'); return; }
        openSheet('<div class="sh-word"><span>모델 선택</span></div><div class="small muted" style="margin-top:4px">무료 사용량은 Flash 계열이 넉넉해요. 현재: <b>' + esc(AI.model) + '</b></div><div class="model-list">' +
          list.map(function (m) { return '<button class="' + (m === AI.model ? 'on' : '') + '" data-action="ai-pick-model" data-model="' + esc(m) + '">' + esc(m) + '</button>'; }).join('') +
          '</div><div class="sh-actions"><button class="btn" data-action="close-sheet">닫기</button></div>');
      }, function (err) { toast(err && err.msg ? err.msg : '모델 목록을 가져오지 못했어요'); }).then(function () { if (el.isConnected) { el.disabled = false; el.textContent = orig; } });
    },
    'ai-pick-model': function (el) { AI.model = el.getAttribute('data-model'); AI.noThink = false; saveAi(); closeSheet(); RENDER.settings({ scroll: 'ai' }); toast('모델: ' + AI.model); },
    'open-url': function (el) { bridge.openUrl(el.getAttribute('data-url')); },
    /* --- 회화 연습 --- */
    'talk': function () { go('talk'); },
    'yt': function () { go('yt'); },
    'yt-add': function () { ytAddSheet(); },
    'yt-submit': function () { ytSubmit(); },
    'yt-open': function (el) { var r = ytRec(el.getAttribute('data-id')); if (r) go('ytv', { id: r.id }); },
    'yt-del': function (el) {
      var id = el.getAttribute('data-id');
      confirm2('이 영상을 목록에서 지울까요?\n(단어장에 추가한 단어는 그대로 있어요)', '삭제', true).then(function (ok) {
        if (!ok) return;
        var d = ytRec(id); if (d) { bridge.mediaDelete(d.vid); ytDlDrop(d.vid); delete YTDL.err[d.vid]; }   // 받은 파일도 — 받는 중이면 Java 가 멈추고 fail('cancel') 로 알려 줄 때 다음 것으로 (여기서 넘기면 busy 만 받는다)
        S.yt = S.yt.filter(function (r) { return r.id !== id; }); delete YTJOB[id]; if (YTV && YTV.id === id) YTV = null; save(); RENDER.yt();
      });
    },
    'yt-dl': function () { var r = YTV && ytRec(YTV.id); if (r) ytDlStart(r); },
    'yt-dl-cancel': function () {
      var r = YTV && ytRec(YTV.id); if (!r) return;
      if (YTDL.cur === r.vid) { YTDL.stopping = r.vid; bridge.ytDownloadCancel(r.vid); }   // Java 가 .part 를 지우고 fail('cancel') 로 알려 준다
      else ytDlDrop(r.vid);
      ytDlShow(r.vid);
    },
    'yt-dl-del': function () {
      var r = YTV && ytRec(YTV.id); if (!r || !r.off) return;
      if (YTP) { try { YTP.pauseVideo(); } catch (e) { } }
      confirm2('받은 영상 파일을 지울까요?\n(문장은 그대로 있고, 유튜브로 재생돼요)', '지우기', true).then(function (ok) {
        if (!ok || !r.off) return;
        bridge.mediaDelete(r.vid); delete r.off; delete r.snap; save();
        if (YTV && YTV.id === r.id && current().view === 'ytv') ytSwapPlayer(r);
      });
    },
    'yt-retry': function () { var r = YTV && ytRec(YTV.id); if (r) ytProcess(r); },
    'yt-redo': function () {
      var r = YTV && ytRec(YTV.id); if (!r) return;
      if (YTP) { try { YTP.pauseVideo(); } catch (e) { } }   // 확인 창(어두운 막) 뒤에서 재생되지 않게
      var hand = (r.sents || []).some(function (x) { return x.ms || x.me; });
      confirm2('문장을 처음부터 다시 정리할까요?\n(단어장에 추가한 단어는 그대로 있어요)' + (hand ? '\n손으로 고친 시간도 새로 정리돼요' : ''), '다시 정리').then(function (ok) { if (ok) ytProcess(r); });
    },
    'yt-sent': function (el) { ytPlaySent(+el.getAttribute('data-i')); },
    'yt-word': function (el) { var i = +el.getAttribute('data-i'); if (YTV.act !== i) ytPlaySent(i); else ytWord(i, +el.getAttribute('data-t')); },   // 처음 누르면 재생, 재생한 문장에서 누르면 뜻
    'yt-ko': function (el) { var i = +el.getAttribute('data-i'); YTV.ko[i] = !YTV.ko[i]; el.classList.toggle('blur', !YTV.ko[i]); },
    'yt-card': function () { },
    'yt-edit': function () {
      YTV.edit = !YTV.edit; ytRenderBody();
      if (YTV.edit) toast('±를 누르면 바뀐 곳을 들려줘요 · 멈춘 곳에서 "지금"');
    },
    'yt-edit-play': function () {   // 고친 구간 그대로 한 문장 듣기 (문장마다 설정과 상관없이 끝에서 멈춤)
      var r = YTV && ytRec(YTV.id); if (!r || !r.sents[YTV.act] || !YTP || !YTV.ready) return;
      var g = ytRange(r, YTV.act); ytPlayRange(g.from, g.end, true);
    },
    'yt-adj': function (el) { var d = el.getAttribute('data-d'); ytAdj(el.getAttribute('data-k'), d === 'now' ? d : +d); },
    'yt-playpause': function () {   // 자유 재생·멈춤 (문장 끝에서 안 멈춤) — 경계를 찾아 "지금"을 누르게
      if (!YTP || !YTV.ready) return;
      var st; try { st = YTP.getPlayerState(); } catch (e) { return; }
      if (YTV.raf) { cancelAnimationFrame(YTV.raf); YTV.raf = 0; }
      YTV.stopAt = null;
      if (st === 1) YTP.pauseVideo(); else { bridge.stop(); YTP.playVideo(); }
    },
    'yt-back2': function () {
      if (!YTP || !YTV.ready) return;
      var c; try { c = YTP.getCurrentTime(); } catch (e) { return; }
      if (YTV.raf) { cancelAnimationFrame(YTV.raf); YTV.raf = 0; }
      YTV.stopAt = null; bridge.stop(); YTP.seekTo(Math.max(0, c - 2), true); YTP.playVideo();
    },   // 카드 빈 곳을 눌러도 문장이 다시 재생되지 않게
    'yt-card-close': function () { var i = YTV.card ? YTV.card.i : -1; YTV.card = null; if (i >= 0) ytRow(i); },
    'yt-add-word': function (el) { ytAddWord(+el.getAttribute('data-stage')); },
    'yt-pause-mode': function (el) { var on = S.settings.ytPause = !S.settings.ytPause; save(); el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on)); if (!on && YTV) YTV.stopAt = null; },
    'yt-replay': function () { if (YTV && YTV.act >= 0) ytPlaySent(YTV.act); },
    'go-settings-ai': function () { go('settings', { scroll: 'ai' }); },
    'talk-scenario': function (el) { S.settings.talk.scenario = el.getAttribute('data-id'); save(); RENDER.talk(); },
    'talk-mission-n': function (el) { S.settings.talk.missionN = Number(el.getAttribute('data-n')); talkSetup.words = pickMissionWords(S.settings.talk.missionN); save(); RENDER.talk(); },
    'talk-reroll': function () { talkSetup.words = pickMissionWords(S.settings.talk.missionN); RENDER.talk(); },
    'talk-src': function (el) { S.settings.talk.missionSrc = el.getAttribute('data-value'); talkSetup.words = pickMissionWords(S.settings.talk.missionN); save(); RENDER.talk(); },
    'talk-more': function () { talkSetup.more = !talkSetup.more; RENDER.talk(); },
    // 미션 단어 칩 → 단어장에 있는 뜻·예문 그대로 팝업
    'mission-word': function (el) { openMissionWord(el.getAttribute('data-id'), el.getAttribute('data-w')); },
    'talk-set': function (el) { S.settings.talk[el.getAttribute('data-key')] = el.getAttribute('data-value'); save(); RENDER.talk(); },
    'talk-set-s': function (el) { S.settings.talk[el.getAttribute('data-key')] = el.getAttribute('data-value'); save(); RENDER.settings({ scroll: 'keep' }); },
    'talk-toggle': function (el) { var k = el.getAttribute('data-key'); S.settings.talk[k] = !S.settings.talk[k]; save(); el.classList.toggle('on', S.settings.talk[k]); },
    'talk-start': function () { talkStart(); },
    'talk-send': function () { talkSendFromInput(); },
    'talk-mic': function () { if (STT.on) sttStop(); else sttStart('en'); },
    'talk-ko': function () { if (STT.on && STT.lang === 'ko') sttStop(); else if (!STT.on) sttStart('ko'); },
    'ko-reveal': function (el) { var m = TALK && TALK.msgs[Number(el.getAttribute('data-i'))]; if (!m) return; m.koOpen = !m.koOpen; el.classList.toggle('blur', !m.koOpen); },
    'talk-guide': function (el) {   // 입력창을 지우지 않게 다시 그리지 않고 칩 줄만 보이고 숨긴다
      var on = S.settings.talk.guide = !S.settings.talk.guide; save();
      el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on));
      var bar = $('.say-bar'), log = $('#chatLog');
      if (bar) bar.hidden = !on; else if (on && TALK && !TALK.busy) toast('다음 답변부터 할 말을 알려 드릴게요');
      if (log) log.scrollTop = log.scrollHeight;
    },
    'talk-say': function (el) {
      var s = (TALK && TALK.say || [])[+el.getAttribute('data-i')]; if (!s) return;
      if (STT.on || STT.wait) { bridge.sttCancel(); sttReset(); renderChat(false); }
      var i = $('#chatIn'); if (i) { i.value = s.e; i.focus(); }
      speak(s.e, 'en');   // 따라 말할 수 있게 한 번 들려준다
    },
    'talk-retry': function () { talkRetry(); },
    'talk-cancel': function () { talkCancel(); },
    'talk-end': function () { talkBack(); },
    'talk-add-expr': function () { talkAddExpressions(); },
    'talk-log': function (el) { var rec = (S.talkLog || [])[Number(el.getAttribute('data-i'))]; if (rec) openTalkReport(rec, false); },
    'talk-log-del': function (el) {
      var id = el.getAttribute('data-id');
      confirm2('이 연습 리포트를 지울까요?', '삭제', true).then(function (ok) {
        if (!ok) return;
        S.talkLog = (S.talkLog || []).filter(function (r) { return r.id !== id; }); save(); closeSheet(); RENDER.talk();
      });
    },
    'speak-text': function (el) { speak(el.getAttribute('data-text'), 'en'); },
    'color-theme': function (el) { S.settings.colorTheme = el.getAttribute('data-id'); save(); applyTheme(); RENDER.settings({ scroll: 'keep' }); },
    'theme-shuffle': function () { var t = pickRandomTheme(); save(); RENDER.settings({ scroll: 'keep' }); toast('테마: ' + t.name); },
    'reseed': function () {
      var n = seedBuiltin(S); save();
      toast(n ? '기본 단어 ' + n + '개를 대기 목록에 추가했어요' : '기본 단어가 이미 모두 있어요');
      RENDER.settings();
    },
    'audio': function () { var st = bridge.audioState(); if (st) { try { AUD = JSON.parse(st); } catch (e) { } } go('audio', {}); },
    'audio-start': function () { startAudio(); },
    'audio-ctl': function (el) {
      var cmd = el.getAttribute('data-cmd');
      if (cmd === 'toggle') AUD.playing = !AUD.playing; else if (cmd === 'stop') { AUD.active = false; AUD.finished = true; }
      bridge.audioControl(cmd); renderAudio();
    },
    'audio-set': function (el) { var v = el.getAttribute('data-set'); S.settings.audio.set = v === 'all' ? 'all' : Number(v); save(); renderAudio(); },
    'audio-order': function (el) { S.settings.audio.order = el.getAttribute('data-order'); save(); renderAudio(); },
    'audio-settings': function () { go('settings', { scroll: 'audio' }); },
    'audio-pick': function (el) { var k = el.getAttribute('data-key'); S.settings.audio[k] = Number(el.getAttribute('data-value')); save(); RENDER.settings({ scroll: 'audio' }); },
    'audio-toggle': function (el) { var k = el.getAttribute('data-key'); S.settings.audio[k] = !S.settings.audio[k]; save(); el.classList.toggle('on', S.settings.audio[k]); },
    'purge-grad': function () {
      var n = counts()[4]; if (!n) { toast('졸업 단어가 없어요'); return; }
      confirm2('졸업한 단어 ' + n + '개를 완전히 삭제할까요?', '삭제', true).then(function (ok) {
        if (!ok) return;
        S.words = S.words.filter(function (w) { return w.stage !== 4; }); save(); toast('삭제했어요'); RENDER.settings();
      });
    },
    'reset-all': function () {
      confirm2('모든 단어와 학습 기록을 삭제하고 처음 상태로 되돌릴까요?\n(기본 단어 세트는 다시 채워져요)', '초기화', true).then(function (ok) {
        if (!ok) return;
        S = defaultState(); seedBuiltin(S); ytPruneMedia(); saveNow(); applyTheme(); goTab('home'); toast('초기화했어요');
      });
    },
    'modal-pick': function (el) { closeModal(el.getAttribute('data-value')); }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.disabled) return;
    var a = el.getAttribute('data-action');
    if (ACTIONS[a]) { e.preventDefault(); ACTIONS[a](el, e); }
  });
  $('#overlay').addEventListener('click', function () { if (modalOpen) closeModal(null); else if (sheetOpen) closeSheet(); });
  // 유튜브 문장 꾹 누르기 = 영어 문장 복사 (v2.11). 떼면서 생기는 click 은 버린다 (문장 재생 안 함)
  (function () {
    var lp = null, fired = false;
    function cancel() { if (lp) { clearTimeout(lp.t); lp = null; } }
    document.addEventListener('pointerdown', function (e) {
      cancel(); fired = false;
      var row = e.target.closest && e.target.closest('#ytList .ys'); if (!row || e.target.closest('.ycard')) return;
      lp = { x: e.clientX, y: e.clientY, t: setTimeout(function () { lp = null; copyRow(row); }, 550) };
    });
    function copyRow(row) {
      var r = YTV && ytRec(YTV.id), x = r && r.sents && r.sents[+row.getAttribute('data-i')]; if (!x) return;
      fired = true; bridge.copy(x.e); bridge.vibrate(20); toast('문장을 복사했어요');
    }
    document.addEventListener('pointermove', function (e) { if (lp && (Math.abs(e.clientX - lp.x) > 10 || Math.abs(e.clientY - lp.y) > 10)) cancel(); });
    document.addEventListener('pointerup', cancel);
    document.addEventListener('pointercancel', cancel);   // 스크롤이 시작되면 pointercancel
    document.addEventListener('click', function (e) { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener('contextmenu', function (e) {   // 안드로이드는 시스템 길게 누르기 시간(≈400ms)에 보낸다 — 메뉴 대신 바로 복사
      var row = e.target.closest && e.target.closest('#ytList .ys'); if (!row) return;
      e.preventDefault();
      if (lp && !fired) { cancel(); copyRow(row); }
    });
  })();

  document.addEventListener('keydown', function (e) {
    if (!current() || current().view !== 'study') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    var card = $('#cardArea .card'); if (!card) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); flyOut(card, 'up', function () { judge(true); }); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); flyOut(card, 'down', function () { judge(false); }); }
    else if (e.key === 'ArrowRight') { if (canNavigate(1)) flyOut(card, 'left', function () { navigate(1); }); }
    else if (e.key === 'ArrowLeft') { if (canNavigate(-1)) flyOut(card, 'right', function () { navigate(-1); }); }
    else if (e.key === ' ') { e.preventDefault(); ACTIONS['reveal-all'](); }
    else if (e.key === 'u' || e.key === 'Backspace') undo();
  });

  /* ---------------- lifecycle ---------------- */
  window.onTtsReady = function (ok) { TTS_OK = !!ok; if (!ok) toast('영어 TTS 음성을 찾지 못했어요. 기기 TTS 설정을 확인해 주세요'); };
  window.onAppResume = function () { USE.paused = false; useTick(); if (current() && current().view === 'home') RENDER.home(); };
  window.onAppPause = function () { useTick(); USE.paused = true; USE.f = null; saveNow(); if (YTV) YTV.pending = null; if (YTP) { try { YTP.pauseVideo(); } catch (e) { } } };
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(); else window.onAppResume(); });
  window.addEventListener('pagehide', saveNow);

  // debugging / testing hooks
  window.__vocab = { state: function () { return S; }, save: saveNow, go: go, startSession: startSession, judge: judge, applyTheme: applyTheme, themes: function () { return THEMES.map(function (t) { return t.id; }); }, reload: function () { S = loadState(); goTab('home'); }, sentPick: sentPick, ytSnapCalc: ytSnapCalc, ytRange: ytRange };

  S = loadState();
  applyTheme();
  goTab('home');
  saveNow();
})();
