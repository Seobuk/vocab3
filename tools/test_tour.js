// v2.32 기능 안내(화면마다 처음 한 번): 새로 설치 → 저절로 · 다음/건너뛰기/뒤로 · 기존 사용자 안 띄움 · webdriver 면 안 띄움 · 다시 보기 ·
// 확인 창이 뜨면 숨었다가 닫히면 다시 · 가린 화면은 못 누름 · 모든 화면 안내를 끝까지 걸어 보며 요소·구멍·말풍선 확인 + 스크린샷 (build/shots/tour/).
// 안내 목록(TOURS)은 app.js 소스에서 읽는다 — 앱에 테스트용으로 새로 연 것은 없다. Gemini(fetch · 가짜 Android aiCall)·유튜브 플레이어는 stub.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), url = require('url');
const ASSETS = path.resolve(__dirname, '..', 'assets'), SHOTS = path.resolve(__dirname, '..', 'build', 'shots', 'tour');
fs.mkdirSync(SHOTS, { recursive: true });
const FILE = url.pathToFileURL(path.join(ASSETS, 'index.html')).href;
// ponytail: TOURS 는 문자열·숫자만 든 객체 리터럴 — 이 저장소의 app.js 를 그대로 평가 (외부 입력 아님)
const TOURS = new Function('return ' + fs.readFileSync(path.join(ASSETS, 'app.js'), 'utf8').match(/var TOURS = (\{[\s\S]*?\n  \});/)[1])();
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const CHAT = { reply: 'Hi there! What can I get for you?', ko: '안녕하세요! 뭐 드릴까요?', fix: '', note: '', used: [], say: [{ e: 'Can I get a latte, please?', k: '라떼 한 잔 주시겠어요?' }, { e: 'I would like a latte with oat milk.', k: '오트 밀크 라떼 주세요.' }] };
const SENTS = [
  { s: '00:00.8', t: '00:02.0', e: 'Good morning and welcome to the show.', k: '좋은 아침이에요.', x: [] },
  { s: '00:02.9', t: '00:04.7', e: 'Today we talk about learning languages.', k: '오늘은 언어 공부 얘기를 해요.', x: [] },
  { s: '00:05.4', t: '00:06.6', e: 'It takes a lot of practice every day.', k: '매일 연습이 많이 필요해요.', x: [] },
  { s: '00:09.9', t: '00:10.8', e: 'See you all next time, bye now.', k: '다음에 봐요.', x: [] }
];
const REL = JSON.stringify({ tag_name: 'v99.1', body: '새 기능', assets: [{ name: 'Vocab3_v99.1.apk', size: 1600000, browser_download_url: 'https://github.com/Seobuk/vocab3/releases/download/v99.1/Vocab3_v99.1.apk' }] });
// 받은 영상 자리: 12초 무음 WAV (Chromium 엔 H.264 가 없다)
const wav = Buffer.alloc(44 + 16000 * 12 * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);

async function newPage(b, o) {   // o: { android, tourTest(기본 켬) }
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com|api\.github\.com/, r => r.abort());
  if (o.android) await p.route('https://kr.hyunuk.vocab3/**', route => {
    const u = new URL(route.request().url()), m = u.pathname.match(/^\/media\/([A-Za-z0-9_-]{11})$/);
    if (!m) return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) });
    const rg = /bytes=(\d+)-(\d*)/.exec(route.request().headers()['range'] || '');
    if (!rg) return route.fulfill({ status: 200, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': String(wav.length) }, body: wav });
    const s = +rg[1], e = Math.min(rg[2] ? +rg[2] : wav.length - 1, wav.length - 1);
    return route.fulfill({ status: 206, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + s + '-' + e + '/' + wav.length, 'Content-Length': String(e - s + 1) }, body: wav.subarray(s, e + 1) });
  });
  await p.addInitScript(o => {
    const LS = localStorage;
    if (o.tourTest !== false && LS.getItem('T:tour') !== 'off') window.__tourTest = true;
    const inj = LS.getItem('T:inject'); if (inj) { LS.setItem('vocab3.state.v1', inj); LS.removeItem('T:inject'); }   // 기존 사용자 상태를 앱보다 먼저 넣는다
    window.__tel = (v, sel) => {   // 앱의 tourEl 과 같은 규칙: 그 화면 안(#tabbar·#ytFab 은 밖) · 크기 있음 · 안 숨김
      if (!sel) return null;
      const root = document.getElementById('view-' + v); let el = null;
      try { el = (root && root.querySelector(sel)) || (/^#(tabbar|ytFab)/.test(sel) ? document.querySelector(sel) : null); } catch (e) { }
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' ? el : null;
    };
    window.__spoken = [];
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__spoken.push(u.text), cancel: () => { }, getVoices: () => [] } });
    delete window.webkitSpeechRecognition; delete window.SpeechRecognition;
    if (!o.android) {   // 브라우저: Gemini 는 fetch — 회화 첫 답은 1.5초 뒤 (실제처럼 안내 타이머 450ms 보다 늦게)
      window.fetch = () => new Promise(res => setTimeout(() => res({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(o.CHAT) }] } }] })) }), 1500));
      return;
    }
    window.__aiQ = []; window.__holdAi = false; window.__dl = [];
    window.__media = (vid, m) => { const x = JSON.parse(LS.getItem('M:media') || '{}'); if (m) x[vid] = m; else delete x[vid]; LS.setItem('M:media', JSON.stringify(x)); };
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); }, remove: k => LS.removeItem('A:' + k),
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, share() { }, copy() { }, openUrl() { },
      audioState: () => '{}', exitApp() { }, keepOn() { }, sttAvailable: () => false,
      appInfo: () => JSON.stringify({ installer: 'dev.imranr.obtainium', vc: 55 }),
      syncInfo: () => '{}', syncLink() { }, syncOpen() { }, syncWrite() { }, syncUnlink() { }, syncCommit() { },
      ytDownload(vid) { window.__dl.push(vid); }, ytDownloadCancel() { },
      mediaList: () => LS.getItem('M:media') || '{}', mediaDelete(vid) { window.__media(vid, null); }, mediaEnv: () => '',
      aiCall(id, u) {
        if (/api\.github\.com/.test(u)) { const r = LS.getItem('T:rel'); setTimeout(() => window.onAiResult(id, r ? 200 : 404, r || '{}'), 10); return; }
        if (/oembed/.test(decodeURIComponent(u))) { setTimeout(() => window.onAiResult(id, 200, JSON.stringify({ title: 'Tour Talk' })), 10); return; }
        const send = () => window.onAiResult(id, 200, JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(o.SENTS) }] } }] }));
        if (window.__holdAi) window.__aiQ.push(send); else setTimeout(send, 30);
      }
    };
    window.__bt = 'TKN';
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => t === 'TKN' ? impl[k](...a) : undefined;
    window.YT = { Player: function (el, op) {
      let st = -1; setTimeout(() => op.events.onReady({}), 0);
      this.seekTo = () => { }; this.playVideo = () => { st = 1; }; this.pauseVideo = () => { st = 2; }; this.getCurrentTime = () => 0; this.getPlayerState = () => st; this.getDuration = () => 60; this.destroy = () => { };
    } };
  }, Object.assign({ CHAT, SENTS }, o));
  return p;
}

const tourN = p => p.$$eval('#tourTip', x => x.length);   // 닫힌 뒤 0.4초 남는 빈 막(#tour)은 안 셈
const tourOf = (p, v) => p.evaluate(v => (window.__vocab.state().settings.tour || {})[v], v);
const view = p => p.evaluate(() => (document.querySelector('.view.active') || {}).id);
const fresh = async (p, on) => {   // 새로 설치 (on=false 면 준비하는 동안 안내 끔 → tourOn 으로 켬)
  await p.evaluate(on => { localStorage.clear(); if (!on) localStorage.setItem('T:tour', 'off'); }, on);
  await p.reload(); await p.waitForTimeout(on ? 1200 : 500);
};
const tourOn = p => p.evaluate(() => { localStorage.removeItem('T:tour'); window.__tourTest = true; });
const setSeen = (p, views) => p.evaluate(vs => { const s = window.__vocab.state(); s.settings.tour = {}; vs.forEach(v => { s.settings.tour[v] = 1; }); window.__vocab.save(); }, views);
const unsee = (p, v) => p.evaluate(v => { delete window.__vocab.state().settings.tour[v]; window.__vocab.save(); }, v);

// 안내 하나를 끝까지: 단계마다 제목·번호·버튼 · 요소 찾음 · 구멍이 요소 위 · 말풍선이 화면 안이고 구멍을 안 가림 · 스크린샷
async function walk(p, v, sfx) {
  sfx = sfx || '';
  const name = v + (sfx ? ' (' + sfx.slice(1) + ')' : '');
  const up = await p.waitForSelector('#tour', { timeout: 4000 }).then(() => true, () => false);
  eq(name + ': 안내가 저절로 뜸', up, true);
  if (!up) return;
  await p.waitForTimeout(450);   // 구멍·말풍선이 .22초 움직인다
  const steps = TOURS[v].steps;
  const want = await p.evaluate(([v, steps]) => steps.filter(s => !s.opt || window.__tel(v, s.sel)).map(s => s.t), [v, steps]);
  const got = [];
  for (let k = 0; k < 10; k++) {
    got.push(await p.evaluate(([v, steps]) => {
      const q = s => document.querySelector(s), t = q('#tourT').textContent, s = steps.find(x => x.t === t) || {};
      const el = s.sel ? window.__tel(v, s.sel) : null, h = q('#tourHole').getBoundingClientRect(), tp = q('#tourTip').getBoundingClientRect();
      let inHole = null;
      if (el) { const r = el.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2; inHole = cx >= h.left && cx <= h.right && cy >= h.top && cy <= h.bottom; }
      const ov = Math.max(0, Math.min(h.right, tp.right) - Math.max(h.left, tp.left)) * Math.max(0, Math.min(h.bottom, tp.bottom) - Math.max(h.top, tp.top));
      return { t, n: q('#tourN').textContent, go: q('#tourGo').textContent, sel: s.sel || null, found: !!el, hw: Math.round(h.width), hh: Math.round(h.height), inHole,
        tipIn: tp.left >= 0 && tp.top >= 0 && tp.right <= innerWidth + 0.5 && tp.bottom <= innerHeight + 0.5, ov: Math.round(ov) };
    }, [v, steps]));
    await p.screenshot({ path: path.join(SHOTS, v + '_' + (k + 1) + sfx + '.png') });
    await p.click('#tourGo'); await p.waitForTimeout(450);
    if (!(await tourN(p))) break;
  }
  const N = got.length;
  eq(name + ': 단계 ' + want.length + '개 (없는 옵션 단계는 뺌)', got.map(s => s.t).join(' | '), want.join(' | '));
  eq(name + ': 번호 · 버튼', got.map(s => s.n + '·' + s.go).join('  '), got.map((s, i) => (N > 1 ? (i + 1) + ' / ' + N : '') + '·' + (i < N - 1 ? '다음' : '확인')).join('  '));
  const miss = steps.filter(s => !s.opt && s.sel && !got.some(g => g.t === s.t)).map(s => s.t + ' 안 나옴')
    .concat(got.filter(s => s.sel ? !s.found || !s.hw || !s.hh || !s.inHole : s.hw || s.hh).map(s => s.t + (!s.sel ? ' 가운데인데 구멍 있음' : !s.found ? ' 요소 못 찾음' : !s.hw || !s.hh ? ' 구멍 0' : ' 구멍이 요소 밖')));
  eq(name + ': 필수 단계 요소를 찾고 구멍이 그 위 (가운데 말풍선은 구멍 0)', miss.join(', ') || '없음', '없음');
  eq(name + ': 말풍선이 화면 안 · 구멍을 안 가림', got.filter(s => !s.tipIn || (s.sel && s.ov > 0)).map(s => s.t + (s.tipIn ? ' 겹침 ' + s.ov + 'px²' : ' 화면 밖')).join(', ') || '없음', '없음');
  eq(name + ': 끝 → 닫힘 · 본 것으로 저장', (await tourN(p)) + ' ' + (await tourOf(p, v)), '0 1');
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

  // ===== A. 브라우저(file://) — 새로 설치 · 화면 안내 걷기 · 건너뛰기/뒤로 · 기존 사용자 · 다시 보기 · 가림 =====
  let p = await newPage(b, {});
  await p.goto(FILE); await p.waitForTimeout(200);
  await fresh(p, true);

  // --- 1. 새로 설치: 홈 안내가 저절로 · 다음으로 끝까지 · 저장 · 다시 열면 안 뜸 ---
  eq('새로 설치: 기록은 빈 {} 로 시작', await p.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('vocab3.state.v1')).settings.tour)), '{}');
  eq('첫 말풍선: 1 / 5 · 오늘의 학습 · 초점은 말풍선', await p.evaluate(() => document.querySelector('#tourN').textContent + ' · ' + document.querySelector('#tourT').textContent + ' · ' + document.activeElement.id), '1 / 5 · 오늘의 학습 · tourTip');
  await walk(p, 'home');
  await p.waitForTimeout(200);
  eq('홈 본 것 저장됨 (저장소)', await p.evaluate(() => JSON.parse(localStorage.getItem('vocab3.state.v1')).settings.tour.home), 1);
  await p.reload(); await p.waitForTimeout(1200);
  eq('다시 열면 홈 안내 안 뜸', (await tourN(p)) + ' ' + (await view(p)), '0 view-home');

  // --- 8·9. 모든 화면 안내 걷기 (390x844) ---
  await p.click('.today [data-action="start"]');
  await walk(p, 'study');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  await p.click('#tabbar [data-tab="list"]');
  await walk(p, 'list');
  await p.click('#tabbar [data-tab="edit"]');
  await walk(p, 'edit');
  await p.click('#tabbar [data-tab="stats"]');
  await walk(p, 'stats');
  await p.evaluate(() => window.__vocab.go('settings', { scroll: 'ai' })); await p.waitForTimeout(1000);
  eq('설정: 키 넣으러 온 길(scroll: ai)엔 안 뜸', (await tourN(p)) + ' ' + (await tourOf(p, 'settings')), '0 undefined');
  await p.click('#tabbar [data-tab="settings"]');
  await walk(p, 'settings');
  await p.click('#tabbar [data-tab="home"]'); await p.waitForTimeout(300);
  await p.click('#view-home [data-action="audio"]');
  await walk(p, 'audio');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  await p.click('#view-home [data-action="talk"]');
  await walk(p, 'talk');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  await p.click('#view-home [data-action="yt"]');
  await walk(p, 'yt');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = window.__vocab.state(); s.words.slice(0, 6).forEach(w => { w.stage = 4; }); window.__vocab.save(); window.__vocab.reload(); }); await p.waitForTimeout(900);
  eq('홈으로 돌아와도 본 안내는 안 뜸', await tourN(p), 0);
  await p.click('.review-btn[data-action="sent"]');
  await walk(p, 'sent');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  // 회화: 키를 넣고 → 대화 시작 → 첫 답 전엔 안내 없음 · 답이 오면 시작 (9)
  await p.evaluate(() => localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })));
  await p.reload(); await p.waitForTimeout(900);
  await p.click('#view-home [data-action="talk"]'); await p.waitForTimeout(700);
  eq('회화 설정 화면: 본 안내라 안 뜸', await tourN(p), 0);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(1000);
  eq('회화: 첫 답 오기 전(1초)엔 안내 없음', (await tourN(p)) + ' ' + (await p.$$eval('#view-chat .msg.ai .spk', x => x.length)) + ' ' + (await view(p)), '0 0 view-chat');
  await p.waitForSelector('#view-chat .msg.ai .spk', { timeout: 4000 });
  await walk(p, 'chat');
  eq('회화 안내 뒤 두 번째 renderChat 에도 다시 안 뜸', await p.evaluate(() => new Promise(r => { document.querySelector('[data-action="ko-reveal"]').click(); setTimeout(() => r(document.querySelectorAll('#tour').length), 800); })), 0);

  // 홈: 어두운 테마 · 넓은 화면(폴드 안쪽 884x1104)
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.theme = 'dark'; s.settings.themeRandom = false; delete s.settings.tour.home; window.__vocab.save(); window.__vocab.applyTheme(); window.__vocab.reload(); });
  await walk(p, 'home', '_dark');
  await p.setViewportSize({ width: 884, height: 1104 });
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.theme = 'light'; delete s.settings.tour.home; window.__vocab.save(); window.__vocab.applyTheme(); window.__vocab.reload(); });
  await walk(p, 'home', '_wide');
  await p.setViewportSize({ width: 390, height: 844 });

  // --- 2. 건너뛰기 = 본 것 · 뒤로(하드웨어) = 닫고 본 것 · 화면은 그대로 ---
  await fresh(p, true);
  eq('새로 설치 → 홈 안내', await tourN(p), 1);
  await p.click('[data-action="tour-skip"]'); await p.waitForTimeout(300);
  eq('건너뛰기 → 닫힘 · home=1', (await tourN(p)) + ' ' + (await tourOf(p, 'home')), '0 1');
  await p.click('#tabbar [data-tab="stats"]'); await p.waitForTimeout(1000);
  eq('통계 안내 뜸', (await tourN(p)) + ' ' + (await p.textContent('#tourN')), '1 1 / 3');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  eq('뒤로 → 안내만 닫고 통계 화면 그대로 · stats=1', (await tourN(p)) + ' ' + (await view(p)) + ' ' + (await tourOf(p, 'stats')), '0 view-stats 1');
  await p.waitForTimeout(700);
  eq('뒤로 뒤에 다시 안 뜸', await tourN(p), 0);

  // --- 7. 가림: 어두운 막 너머 버튼은 안 눌림 · 안내도 안 넘어감 · Tab 은 말풍선 안 · 학습 화살표 키 무시 ---
  await fresh(p, true);
  const sb = await p.$eval('.today [data-action="start"]', e => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, !!e.closest('[inert]')]; });
  eq('시작 버튼 자리는 막(.tour-back)이 받음 · 버튼은 inert', await p.evaluate(([x, y]) => document.elementFromPoint(x, y).className, sb) + ' ' + sb[2], 'tour-back true');
  await p.mouse.click(sb[0], sb[1]); await p.waitForTimeout(600);
  eq('막을 눌러도: 학습 안 열림 · 안내 그대로 1 / 5', (await view(p)) + ' ' + (await tourN(p)) + ' ' + (await p.textContent('#tourN')), 'view-home 1 1 / 5');
  await p.keyboard.press('Tab'); const f1 = await p.evaluate(() => document.activeElement.getAttribute('data-action'));
  await p.keyboard.press('Tab'); const f2 = await p.evaluate(() => document.activeElement.getAttribute('data-action'));
  eq('Tab 은 말풍선 버튼만 (건너뛰기 → 다음)', f1 + ' ' + f2, 'tour-skip tour-next');
  await p.click('[data-action="tour-skip"]'); await p.waitForTimeout(300);
  await p.click('.today [data-action="start"]'); await p.waitForTimeout(1000);
  eq('학습 안내 뜸', (await tourN(p)) + ' ' + (await view(p)), '1 view-study');
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(700);
  eq('안내 중 ↑ 키: 외웠다 안 됨 (2단계 0 · 판정 0) · 안내 1 / 5 그대로', await p.evaluate(() => { const s = window.__vocab.state(), d = Object.values(s.studyDays)[0]; return s.words.filter(w => w.stage === 2).length + ' ' + ((d && d.judged) || 0); }) + ' ' + (await p.textContent('#tourN')), '0 0 1 / 5');
  await p.click('[data-action="tour-skip"]'); await p.waitForTimeout(300);
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(700);
  eq('안내를 닫으면 ↑ 키로 외웠다 (2단계 1)', await p.evaluate(() => window.__vocab.state().words.filter(w => w.stage === 2).length), 1);

  // --- 5. 설정 → 전체 초기화는 안내 기록 유지 · "기능 안내 다시 보기" → 홈으로 · 홈 안내가 다시 ---
  await fresh(p, false);
  await setSeen(p, Object.keys(TOURS)); await tourOn(p);
  await p.click('#tabbar [data-tab="settings"]'); await p.waitForTimeout(900);
  eq('설정: 본 안내라 안 뜸', await tourN(p), 0);
  await p.click('[data-action="reset-all"]'); await p.waitForTimeout(300); await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(1200);
  eq('전체 초기화: 안내 기록 그대로 · 홈 안내 안 뜸', (await p.evaluate(() => Object.keys(window.__vocab.state().settings.tour).length)) + ' ' + (await view(p)) + ' ' + (await tourN(p)), Object.keys(TOURS).length + ' view-home 0');
  await p.click('#tabbar [data-tab="settings"]'); await p.waitForTimeout(600);
  await p.click('[data-action="tour-reset"]'); await p.waitForTimeout(1000);
  eq('다시 보기 → 홈 · 기록 비움 · 홈 안내 1 / 5', (await view(p)) + ' ' + (await p.evaluate(() => JSON.stringify(window.__vocab.state().settings.tour))) + ' ' + (await tourN(p)) + ' ' + (await p.textContent('#tourN')), 'view-home {} 1 1 / 5');
  await p.click('[data-action="tour-skip"]'); await p.waitForTimeout(300);
  await p.click('#tabbar [data-tab="list"]'); await p.waitForTimeout(1000);
  eq('다시 보기 뒤 다른 화면도 다시 뜸 (단어장)', await tourN(p), 1);

  // --- 3. 기존 사용자(안내 기록 없는 저장) → 어디서도 안 뜸 · 모든 화면 본 것으로 ---
  await fresh(p, false);
  const old = await p.evaluate(() => { const s = JSON.parse(JSON.stringify(window.__vocab.state())); delete s.settings.tour; s.words.slice(0, 6).forEach(w => { w.stage = 4; }); return JSON.stringify(s); });
  await p.evaluate(j => { localStorage.setItem('T:inject', j); localStorage.removeItem('T:tour'); }, old);
  await p.reload(); await p.waitForTimeout(1200);
  eq('기존 사용자: 홈 안내 안 뜸', (await tourN(p)) + ' ' + (await p.evaluate(() => window.__tourTest)), '0 true');
  eq('기존 사용자: TOURS 모든 화면 = 1 (저장소도)', await p.evaluate(keys => { const a = window.__vocab.state().settings.tour, b = JSON.parse(localStorage.getItem('vocab3.state.v1')).settings.tour; return keys.filter(k => a[k] !== 1 || b[k] !== 1).join(',') || 'all ' + keys.length; }, Object.keys(TOURS)), 'all ' + Object.keys(TOURS).length);
  const shownOld = [];
  for (const [v, sel] of [['list', '#tabbar [data-tab="list"]'], ['edit', '#tabbar [data-tab="edit"]'], ['stats', '#tabbar [data-tab="stats"]'], ['settings', '#tabbar [data-tab="settings"]'], ['home', '#tabbar [data-tab="home"]'],
    ['audio', '#view-home [data-action="audio"]'], ['talk', '#view-home [data-action="talk"]'], ['yt', '#view-home [data-action="yt"]'], ['sent', '.review-btn[data-action="sent"]'], ['study', '.today [data-action="start"]']]) {
    if (!/tabbar/.test(sel) && (await view(p)) !== 'view-home') { await p.evaluate(() => window.__appBack()); await p.waitForTimeout(250); }
    await p.click(sel); await p.waitForTimeout(900);
    if (await tourN(p)) { shownOld.push(v); await p.evaluate(() => window.__appBack()); }
  }
  eq('기존 사용자: 10개 화면 어디서도 안 뜸', shownOld.join(',') || '없음', '없음');
  eq('A 페이지 오류 없음', JSON.stringify(p.errs), '[]');
  await p.close();

  // ===== 4. navigator.webdriver 인데 __tourTest 없음 → 안내 전혀 없음 =====
  p = await newPage(b, { tourTest: false });
  await p.goto(FILE); await p.waitForTimeout(200);
  await fresh(p, true);
  const noT = [await tourN(p)];
  await p.click('#tabbar [data-tab="stats"]'); await p.waitForTimeout(900); noT.push(await tourN(p));
  await p.click('#tabbar [data-tab="home"]'); await p.waitForTimeout(300); await p.click('.today [data-action="start"]'); await p.waitForTimeout(900); noT.push(await tourN(p));
  eq('webdriver(__tourTest 없음): 홈·통계·학습 안내 0 · 기록은 빈 채', noT.join(' ') + ' ' + (await p.evaluate(() => JSON.stringify(window.__vocab.state().settings.tour))), '0 0 0 {}');
  eq('webdriver 페이지 오류 없음', JSON.stringify(p.errs), '[]');
  await p.close();

  // ===== B. 가짜 Android (https://kr.hyunuk.vocab3/) — 확인 창 · 드라이브 묶음 있는 설정 · 유튜브 영상 화면 =====
  p = await newPage(b, { android: true });
  await p.goto('https://kr.hyunuk.vocab3/'); await p.waitForTimeout(200);
  // --- 6. 안내 중 확인 창(업데이트 묻기, 1.5초 뒤) → 안내 숨음(본 것 아님) → 창 닫으면 처음부터 다시 ---
  await p.evaluate(r => { localStorage.clear(); localStorage.setItem('T:rel', r); }, REL);
  await p.reload(); await p.waitForTimeout(1000);
  eq('GitHub 설치 새로 설치: 홈 안내 먼저', (await tourN(p)) + ' ' + (await p.textContent('#tourN')), '1 1 / 5');
  await p.click('#tourGo'); await p.waitForTimeout(1500);
  eq('업데이트 창 뜨면 안내 닫힘 · 본 것 아님 · 가림 풀림', (await tourN(p)) + ' ' + (await p.evaluate(() => document.querySelector('#modal').classList.contains('show'))) + ' ' + (await tourOf(p, 'home')) + ' ' + (await p.$$eval('#app [inert]', x => x.length)), '0 true undefined 0');
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(1000);
  eq('창 닫으면 홈 안내 다시 (처음부터 1 / 5)', (await tourN(p)) + ' ' + (await p.textContent('#tourN')) + ' ' + (await p.textContent('#tourT')), '1 1 / 5 오늘의 학습');
  await p.click('[data-action="tour-skip"]'); await p.waitForTimeout(300);
  // 설정: 안드로이드면 드라이브 묶음(opt)이 들어가 4단계
  await p.click('#tabbar [data-tab="settings"]');
  await walk(p, 'settings', '_android');
  // --- 8·9. 유튜브: 키 있음(키 안내 빠짐) → 링크 추가 → 정리 중 첫 방문은 안내 없음 → 문장이 오면 시작 ---
  await p.evaluate(() => { localStorage.removeItem('T:rel'); window.Android.save('TKN', 'vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); });
  await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(() => window.__vocab.go('yt'));
  await walk(p, 'yt', '_key');
  await p.click('#view-yt .topbar [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/OFFLINE0001');
  await p.evaluate(() => { window.__holdAi = true; });
  await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(1500);
  eq('영상 화면 첫 방문 · 정리 중: 문장 0 · 안내 없음', (await view(p)) + ' ' + (await p.$$eval('#ytList .ys', x => x.length)) + ' ' + (await tourN(p)), 'view-ytv 0 0');
  await p.evaluate(() => { window.__holdAi = false; window.__aiQ.splice(0).forEach(f => f()); });
  await p.waitForSelector('#ytList .ys', { timeout: 4000 }).catch(() => { });
  eq('정리가 끝나 문장이 생김', await p.$$eval('#ytList .ys', x => x.length), 4);
  await walk(p, 'ytv');
  // 회전: 세로 전용 단계(영상 고정, 가로에선 display:none)에서 가로로 돌리면 — 가리킬 것 없는 가운데 말풍선이 남으면 안 됨
  await unsee(p, 'ytv');
  await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(600);
  await p.click('#view-yt .yt-open');
  await p.waitForSelector('#tour', { timeout: 4000 }); await p.waitForTimeout(450);
  for (let k = 0; k < 6 && (await p.textContent('#tourT')) !== '영상 고정'; k++) { await p.click('#tourGo'); await p.waitForTimeout(450); }
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(SHOTS, 'ytv_rotate.png') });
  eq('회전: 세로 전용 "영상 고정" 단계에서 가로로 돌리면 그 단계는 건너뜀 (구멍 없는 말풍선 안 남음)', await p.evaluate(() => { if (!document.querySelector('#tour')) return 'ok'; const h = document.querySelector('#tourHole').getBoundingClientRect(); return h.width > 0 ? 'ok' : document.querySelector('#tourT').textContent + ' · 구멍 0'; }), 'ok');
  if (await tourN(p)) await p.click('[data-action="tour-skip"]');
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  // 가로(844x390) + 받은 영상: 영상 톡 · 시간 고치기 단계가 들어가고 고정 단계는 빠짐
  await p.evaluate(() => { window.__media('OFFLINE0001', { kind: 'mp4', size: 1000000 }); window.onYtDl('OFFLINE0001', 'done', 'mp4', 1000000); }); await p.waitForTimeout(300);
  eq('받은 영상 → 앱 <video> · #ytBox 톡', await p.evaluate(() => document.querySelector('#ytPlayer').tagName + ' ' + document.querySelector('#ytBox').getAttribute('data-action')), 'VIDEO yt-tap');
  await unsee(p, 'ytv');
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(600);
  await p.click('#view-yt .yt-open');
  await walk(p, 'ytv', '_land');
  await p.setViewportSize({ width: 390, height: 844 });
  eq('B 페이지 오류 없음', JSON.stringify(p.errs), '[]');
  await b.close();
})();
