/* 3단계 단어장 — app logic */
(function () {
  'use strict';

  var KEY = 'vocab3.state.v1';
  var APP_VERSION = '1.13';
  var STAGE_SHORT = { 0: '대기', 1: '1단계', 2: '2단계', 3: '3단계', 4: '졸업' };
  var STAGE_NAME = { 0: '대기 단어', 1: '새 단어장', 2: '외운 단어장', 3: '완전 암기장', 4: '졸업' };
  var STAGE_COLOR = { 0: 'var(--s0)', 1: 'var(--s1)', 2: 'var(--s2)', 3: 'var(--s3)', 4: 'var(--s4)' };
  var POS_LIST = ['', 'n.', 'v.', 'adj.', 'adv.', 'phr.', 'prep.', 'conj.', 'idiom'];
  var ICON_SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var ICON_BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var isAndroid = (typeof window.Android !== 'undefined') && window.Android !== null;
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
      try { return isAndroid ? window.Android.load(KEY) : localStorage.getItem(KEY); } catch (e) { return null; }
    },
    save: function (s) {
      try { if (isAndroid) window.Android.save(KEY, s); else localStorage.setItem(KEY, s); } catch (e) { }
    },
    speak: function (text, lang, rate, flush) {
      if (!text) return;
      try {
        if (isAndroid) { window.Android.speak(text, lang, rate, flush !== false); return; }
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
      try { if (isAndroid) window.Android.stopSpeak(); else if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { }
    },
    vibrate: function (ms) {
      try { if (isAndroid) window.Android.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { }
    },
    copy: function (text) {
      try {
        if (isAndroid) window.Android.copy(text);
        else if (navigator.clipboard) navigator.clipboard.writeText(text);
      } catch (e) { }
    },
    share: function (title, text) {
      try {
        if (isAndroid) window.Android.share(title, text);
        else if (navigator.share) navigator.share({ title: title, text: text });
        else { bridge.copy(text); toast('클립보드에 복사했어요'); }
      } catch (e) { }
    },
    saveFile: function (name, content) {
      try {
        if (isAndroid) { window.Android.saveFile(name, content); return; }
        var blob = new Blob([content], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        toast('백업 파일을 저장했어요');
      } catch (e) { }
    },
    openFile: function () {
      try { if (isAndroid) window.Android.openFile(); else $('#filePick').click(); } catch (e) { }
    },
    setBackHandled: function (b) { try { if (isAndroid) window.Android.setBackHandled(!!b); } catch (e) { } },
    setSystemBars: function (color, light) { try { if (isAndroid) window.Android.setSystemBars(color, !!light); } catch (e) { } },
    ttsReady: function () { try { return isAndroid ? window.Android.ttsReady() : TTS_OK; } catch (e) { return false; } },
    audioStart: function (playlistJson, loop) {
      try { if (isAndroid) window.Android.audioStart(playlistJson, !!loop); else jsAudio.start(JSON.parse(playlistJson), !!loop); } catch (e) { toast('재생을 시작하지 못했어요'); }
    },
    audioControl: function (cmd) {
      try { if (isAndroid) window.Android.audioControl(cmd); else jsAudio.control(cmd); } catch (e) { }
    },
    audioState: function () {
      try { return isAndroid ? window.Android.audioState() : jsAudio.stateJson(); } catch (e) { return null; }
    },
    exitApp: function () { try { if (isAndroid) window.Android.exitApp(); else window.close(); } catch (e) { } }
  };

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
    return { dailyGoal: 20, hideMeaning: true, hideExample: true, mode: 'en', autoSpeak: false, rate: 0.9, theme: 'light', tipDismissed: false, shuffle: true, swapJudge: false };
  }
  function defaultAudio() {
    return { wordRepeat: 1, pauseAfterWord: 2000, exampleRepeat: 2, exampleRate: 0.8, exampleGap: 1000, readMeaning: false, readExampleKo: true, pauseBetween: 1500, loop: false, set: 1, order: 'rand', orderV2: true, koV2: true };
  }
  function defaultState() {
    var st = defaultSettings(); st.audio = defaultAudio();
    return { v: 1, words: [], settings: st, lastDailyDate: null, studyDays: {}, createdAt: Date.now() };
  }
  function mkWord(o) {
    var now = Date.now();
    var w = { id: uid(), w: '', p: '', m: '', e: '', k: '', t: '', src: 'user', order: now, stage: 0, addedAt: now, stageAt: now, dailyDate: null, seen: 0, lastSeen: 0, right: 0, wrong: 0 };
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
    s.words.forEach(function (w) { if (typeof w.stage !== 'number') w.stage = 0; });
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
    var cur = current();
    if (cur && cur.view !== 'home') { goTab('home'); return; }
    confirm2(AUD.active ? '앱을 종료할까요?\n(듣기 복습은 알림에서 계속 재생돼요)' : '앱을 종료할까요?', '종료').then(function (ok) { if (ok) bridge.exitApp(); });
  }
  function updateBack() { bridge.setBackHandled(true); }
  function render() {
    var cur = current();
    $$('.view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + cur.view); });
    var showTab = ['home', 'list', 'edit', 'import', 'settings'].indexOf(cur.view) >= 0;
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
  function applyTheme() {
    var dark = S.settings.theme === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var color = dark ? '#0F1117' : '#F4F5FA';
    var meta = $('meta[name=theme-color]'); if (meta) meta.setAttribute('content', color);
    bridge.setSystemBars(color, !dark);
  }

  /* ---------------- speak ---------------- */
  function speak(text, lang, queue) { bridge.speak(text, lang || 'en', S.settings.rate, !queue); }

  /* ================= HOME ================= */
  RENDER.home = function () {
    ensureDaily();
    var c = counts(), goal = S.settings.dailyGoal, d = S.studyDays[localDate()] || { judged: 0, memorized: 0 };
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
      '<div class="streak">🔥 ' + streak + '일 연속</div></div>' +
      '<div class="today"><div class="t-eyebrow">TODAY</div><div class="t-title">오늘의 학습</div><div class="t-sub">' + sub + '</div>' +
      '<div class="t-bar"><div style="width:' + pct + '%"></div></div>' + cta + '</div>' +
      '<div class="stages">' +
      stageTile(1, c[1]) + stageTile(2, c[2]) + stageTile(3, c[3]) +
      '</div>' +
      '<button class="review-btn" style="--c:var(--s2)" data-action="start" data-stage="2"' + (c[2] ? '' : ' disabled') + '><span class="dot"></span><div><div class="rb-t">2단계 복습</div><div class="rb-s">주기적으로 복습 → 확실하면 3단계로</div></div><span class="rb-n">' + c[2] + '</span><span class="chev">›</span></button>' +
      '<button class="review-btn" style="--c:var(--s3)" data-action="start" data-stage="3"' + (c[3] ? '' : ' disabled') + '><span class="dot"></span><div><div class="rb-t">3단계 최종 점검</div><div class="rb-s">최종 확인 → 통과하면 졸업</div></div><span class="rb-n">' + c[3] + '</span><span class="chev">›</span></button>' +
      '<button class="review-btn" style="--c:var(--s4)" data-action="audio"><span class="dot"></span><div><div class="rb-t">🎧 듣기 복습</div><div class="rb-s">단어 → 예문 → 뜻을 읽어 줘요 · 운전 중 귀로 복습</div></div><span class="rb-n">' + (AUD.active ? (AUD.playing ? '재생 중' : '일시정지') : '') + '</span><span class="chev">›</span></button>' +
      '<div class="row"><button class="btn" data-action="list" data-stage="0">대기 ' + c[0] + '개</button><button class="btn" data-action="list" data-stage="4">졸업 ' + c[4] + '개</button></div>' +
      (S.settings.tipDismissed ? '' :
        '<div class="tip"><button class="close" data-action="tip-close">×</button><b>3단계 단어장 사용법</b><br>매일 새 단어 ' + goal + '개를 예문과 함께 익히고, 단어와 예문이 자연스럽게 나오면 오른쪽으로 스와이프하세요.' +
        '<div class="flow"><span>1단계 새 단어장</span><i>→</i><span>2단계 외운 단어장</span><i>→</i><span>3단계 완전 암기장</span><i>→</i><span>졸업</span></div></div>') +
      '</div>';
    $('#view-home').innerHTML = html;
  };
  function stageTile(st, n) {
    return '<button class="stage-tile" style="--c:' + STAGE_COLOR[st] + '" data-action="list" data-stage="' + st + '">' +
      '<div class="st-num">' + STAGE_SHORT[st] + '</div><div class="st-name">' + STAGE_NAME[st] + '</div>' +
      '<div class="st-count">' + n + '<small>개</small></div></button>';
  }

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
          '<div class="demote">▲ 위로: 외웠다 &nbsp;·&nbsp; ▼ 아래로: 아직 &nbsp;·&nbsp; ◀ ▶ 좌우: 이전/다음</div>') +
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
      '<span class="tag pos">' + (SES.i + 1) + ' / ' + SES.ids.length + '</span>' + badge + '</div>';
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

  // anim: 'none' | 'judge' (scale in) | 'next' (from right) | 'prev' (from left)
  function mountCard(anim) {
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
    if (S.settings.autoSpeak) setTimeout(function () {
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
  function bindDrag(card) {
    var drag = null;
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
    card.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: Date.now(), moved: false, axis: null, id: e.pointerId, target: e.target };
      try { card.setPointerCapture(e.pointerId); } catch (err) { }
      card.style.transition = 'none';
    });
    card.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
      if (!drag.axis && (Math.abs(drag.dx) > 8 || Math.abs(drag.dy) > 8)) { drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? 'x' : 'y'; drag.moved = true; }
      if (drag.axis === 'x') { card.style.transform = 'translate(' + drag.dx + 'px,0) rotate(' + (drag.dx / 30) + 'deg)'; stamps(0); }
      else if (drag.axis === 'y') { card.style.transform = 'translate(0,' + drag.dy + 'px)'; stamps(drag.dy); }
    });
    function up(e) {
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
    card.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) { drag = null; reset(); } });
    card.addEventListener('click', function (e) {
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

  /* ================= SUMMARY ================= */
  RENDER.summary = function () {
    if (!SES) { go('home', {}, true); return; }
    var st = SES.stage, n = SES.ids.length, moved = sesList('yes').length, kept = sesList('no').length, dem = sesList('demote').length;
    var next = st === 3 ? '졸업' : STAGE_SHORT[st + 1] + '로 이동';
    var allDone = kept === 0 && dem === 0;
    $('#view-summary').innerHTML =
      '<div class="summary"><div class="emoji">' + (allDone ? '🎉' : '👍') + '</div>' +
      '<h2>' + (st === 1 ? '오늘의 학습 완료!' : st === 2 ? '복습 완료!' : '최종 점검 완료!') + '</h2>' +
      '<p class="muted">' + STAGE_SHORT[st] + ' ' + n + '개를 확인했어요' + (allDone ? '. 전부 넘겼어요!' : '') + '</p>' +
      '<div class="sum-grid">' +
      '<div><b style="color:var(--ok)">' + moved + '</b><span>' + next + '</span></div>' +
      '<div><b style="color:var(--danger)">' + kept + '</b><span>' + STAGE_SHORT[st] + ' 유지</span></div>' +
      (dem ? '<div><b style="color:var(--s1)">' + dem + '</b><span>1단계로 되돌림</span></div>' : '') +
      '<div><b>' + calcStreak() + '</b><span>연속 학습일</span></div>' +
      '</div>' +
      '<div class="actions">' +
      (kept ? '<button class="btn primary big" data-action="retry">아직인 ' + kept + '개 바로 다시 보기</button>' : '') +
      '<button class="btn big" data-action="home">홈으로</button>' +
      '</div></div>';
  };

  /* ================= LIST ================= */
  var listState = { stage: 'all', q: '' };
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
      '<div class="search"><span class="muted">🔍</span><input id="q" placeholder="단어·뜻·예문 검색" value="' + esc(listState.q) + '"></div>' +
      '<div class="list" id="listBody"></div>' +
      '</div>';
    renderListBody();
    $('#q').addEventListener('input', function (e) { listState.q = e.target.value; renderListBody(); });
  };
  function listItems() {
    var st = listState.stage, q = listState.q.trim().toLowerCase();
    var arr = S.words.filter(function (w) { return st === 'all' || w.stage === Number(st); });
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
      body.innerHTML = '<div class="empty">' + (listState.q ? '검색 결과가 없어요' : (String(listState.stage) === '0' ? '대기 중인 단어가 없어요.<br>단어를 추가하거나 기본 세트를 불러오세요.' : '여기에는 아직 단어가 없어요')) + '</div>';
      return;
    }
    var show = arr.slice(0, 300);
    body.innerHTML = show.map(function (w) {
      return '<button class="item" style="--c:' + STAGE_COLOR[w.stage] + '" data-action="open" data-id="' + esc(w.id) + '">' +
        '<span class="dot"></span><div class="it-body"><div class="it-w">' + esc(w.w) + '</div><div class="it-m">' + esc(w.m) + '</div></div>' +
        '<span class="it-tag">' + STAGE_SHORT[w.stage] + '</span></button>';
    }).join('') + (arr.length > 300 ? '<div class="empty">외 ' + (arr.length - 300) + '개 — 검색으로 좁혀 보세요</div>' : '');
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
      '<div class="sh-actions"><button class="btn" data-action="edit" data-id="' + esc(w.id) + '">수정</button><button class="btn danger" data-action="delete" data-id="' + esc(w.id) + '">삭제</button></div>'
    );
  }

  /* ================= EDIT ================= */
  RENDER.edit = function (p) {
    var w = p && p.id ? byId(p.id) : null;
    var isNew = !w;
    var v = w || { w: '', p: '', m: '', e: '', k: '', t: '' };
    $('#view-edit').innerHTML =
      '<div class="topbar">' + (isNew ? '<span style="width:42px"></span>' : '<button class="icon-btn" data-action="back">' + ICON_BACK + '</button>') + '<span class="title">' + (isNew ? '단어 추가' : '단어 수정') + '</span><span style="width:42px"></span></div>' +
      '<div class="wrap">' +
      '<div class="field"><label>단어 / 표현 *</label><input id="f-w" value="' + esc(v.w) + '" placeholder="예: figure out" autocapitalize="off" autocomplete="off"></div>' +
      '<div class="row"><div class="field" style="flex:0 0 38%"><label>품사</label><select id="f-p">' + POS_LIST.map(function (x) { return '<option value="' + x + '"' + (x === v.p ? ' selected' : '') + '>' + (x || '(선택)') + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>테마 (선택)</label><input id="f-t" value="' + esc(v.t) + '" placeholder="예: 업무·회의"></div></div>' +
      '<div class="field"><label>뜻 *</label><input id="f-m" value="' + esc(v.m) + '" placeholder="예: 알아내다, 해결하다"></div>' +
      '<div class="field"><label>예문 (영어) — 실제로 말할 문장으로</label><textarea id="f-e" placeholder="I can\'t figure out how to set this up.">' + esc(v.e) + '</textarea></div>' +
      '<div class="field"><label>예문 해석</label><textarea id="f-k" placeholder="이걸 어떻게 설정하는지 도무지 모르겠어.">' + esc(v.k) + '</textarea></div>' +
      (isNew ? '<div class="switch-row"><div><div class="sw-t">오늘 학습(1단계)에 바로 추가</div><div class="sw-s">끄면 대기 목록에 들어가 순서대로 나와요</div></div><button class="toggle on" id="f-now" data-action="toggle-el"></button></div>' : '') +
      '<div class="row">' + (isNew ? '<button class="btn" data-action="save-word" data-more="1">저장하고 계속</button>' : '') + '<button class="btn primary" data-action="save-word">저장</button></div>' +
      (isNew ? '<button class="btn ghost block" data-action="go-import">여러 단어 한꺼번에 붙여넣기 →</button>' : '') +
      '</div>';
    $('#view-edit').setAttribute('data-id', w ? w.id : '');
  };
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
    if (more) { RENDER.edit({}); $('#f-w').focus(); }
    else go('list', { stage: now ? 1 : 0 }, true);
  }

  /* ================= IMPORT ================= */
  RENDER.import = function (p) {
    $('#view-import').innerHTML =
      '<div class="topbar"><button class="icon-btn" data-action="back">' + ICON_BACK + '</button><span class="title">여러 단어 가져오기</span><span style="width:42px"></span></div>' +
      '<div class="wrap">' +
      '<div class="tip">한 줄에 한 단어씩, <b>|</b> (세로줄) 또는 탭으로 구분해서 붙여넣으세요.<br><span class="small">단어 | 뜻 | 예문 | 예문 해석 | 품사(선택)</span></div>' +
      '<div class="field"><textarea id="imp" class="tall" placeholder="grab | (간단히) 사다·먹다 | Could you grab me a coffee? | 커피 하나 사다 줄 수 있어?\nrun late | 늦어지다 | Sorry, I\'m running late. | 미안, 좀 늦을 것 같아.">' + esc((p && p.text) || '') + '</textarea></div>' +
      '<div class="switch-row"><div><div class="sw-t">가져올 위치</div><div class="sw-s">1단계면 오늘 학습에 바로 포함돼요</div></div><div class="pick" id="imp-target"><button class="on" data-action="pick" data-group="imp-target" data-value="1">1단계</button><button data-action="pick" data-group="imp-target" data-value="0">대기</button></div></div>' +
      '<button class="btn primary big" data-action="do-import">가져오기</button>' +
      '</div>';
  };
  function parseLines(text) {
    var out = [];
    text.split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var parts = line.indexOf('\t') >= 0 ? line.split('\t') : line.split('|');
      parts = parts.map(function (x) { return x.trim(); });
      if (parts.length < 2 || !parts[0] || !parts[1]) return;
      out.push({ w: parts[0], m: parts[1], e: parts[2] || '', k: parts[3] || '', p: parts[4] || '' });
    });
    return out;
  }
  function doImport() {
    var rows = parseLines($('#imp').value);
    if (!rows.length) { toast('가져올 줄이 없어요. 형식을 확인해 주세요'); return; }
    var target = Number($('#imp-target .on').getAttribute('data-value'));
    var have = {}; S.words.forEach(function (w) { have[w.w.toLowerCase()] = true; });
    var added = 0, skipped = 0, today = localDate();
    rows.forEach(function (r) {
      if (have[r.w.toLowerCase()]) { skipped++; return; }
      have[r.w.toLowerCase()] = true;
      var nw = mkWord(r);
      if (target === 1) { nw.stage = 1; nw.dailyDate = today; }
      S.words.push(nw); added++;
    });
    save();
    toast(added + '개 추가' + (skipped ? ' · 중복 ' + skipped + '개 건너뜀' : ''));
    stack = [{ view: 'home', params: {} }];
    go('list', { stage: target });
  }

  /* ================= SETTINGS ================= */
  RENDER.settings = function (p) {
    var st = S.settings, c = counts(), au = st.audio;
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
      '<div class="section-title">화면</div><div class="settings-group">' +
      pick('theme', '테마', '', [['light', '라이트'], ['dark', '다크']], st.theme) +
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
    $('#rate').addEventListener('input', function (e) { S.settings.rate = Number(e.target.value); $('#rateVal').textContent = S.settings.rate.toFixed(1) + 'x'; save(); });
    if (p && p.scroll === 'audio') { var el = $('#audio-settings'); if (el) setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30); }
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
      if (v === 'replace') { S = migrate(data); }
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
      var n = pullNewWords(S.settings.dailyGoal);
      save(); toast(n ? '새 단어 ' + n + '개를 1단계로 가져왔어요' : '대기 중인 단어가 없어요'); render();
    },
    'list': function (el) { stack = [{ view: 'home', params: {} }]; go('list', { stage: el.getAttribute('data-stage') === 'all' ? 'all' : Number(el.getAttribute('data-stage')) }); },
    'list-tab': function (el) { var s = el.getAttribute('data-stage'); listState.stage = s === 'all' ? 'all' : Number(s); RENDER.list({}); },
    'tip-close': function () { S.settings.tipDismissed = true; save(); render(); },
    'open': function (el) { openWord(el.getAttribute('data-id')); },
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
    'go-import': function () { go('import', {}); },
    'do-import': function () { doImport(); },
    'setting-toggle': function (el) { var k = el.getAttribute('data-key'); S.settings[k] = !S.settings[k]; save(); el.classList.toggle('on', S.settings[k]); },
    'setting-pick': function (el) {
      var k = el.getAttribute('data-key'), v = el.getAttribute('data-value');
      S.settings[k] = (k === 'dailyGoal') ? Number(v) : v;
      save(); if (k === 'theme') applyTheme(); RENDER.settings();
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
        S = defaultState(); seedBuiltin(S); saveNow(); applyTheme(); goTab('home'); toast('초기화했어요');
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
  window.onAppResume = function () { if (current() && current().view === 'home') RENDER.home(); };
  window.onAppPause = function () { saveNow(); };
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveNow(); else window.onAppResume(); });
  window.addEventListener('pagehide', saveNow);

  // debugging / testing hooks
  window.__vocab = { state: function () { return S; }, save: saveNow, go: go, startSession: startSession, judge: judge, reload: function () { S = loadState(); goTab('home'); } };

  S = loadState();
  applyTheme();
  goTab('home');
  saveNow();
})();
