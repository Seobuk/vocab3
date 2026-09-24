// v2.0: ★ 중요 단어 → 회화 미션 우선, 미션 칩 팝업, AI 답변 한글 번역(흐림→탭), 자연 교정 프롬프트, 한국어로 말하기(번역),
//       학습 완료 축하(컨페티·카운트업·효과음·신기록), 단어 추가 붙여넣기 기본 + AI 채우기, 홈 빠른 실행, 회화 설정 접기. Gemini·음성인식 stub.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__calls = []; window.__chimes = 0;
    // 효과음: AudioContext 를 흉내 내서 호출 횟수만 센다
    function FakeGain() { this.gain = { setValueAtTime() { }, exponentialRampToValueAtTime() { } }; } FakeGain.prototype.connect = function () { };
    function FakeOsc() { this.frequency = { value: 0 }; } FakeOsc.prototype.connect = function () { }; FakeOsc.prototype.start = function () { window.__chimes++; }; FakeOsc.prototype.stop = function () { };
    window.AudioContext = function () { this.currentTime = 0; this.state = 'running'; this.destination = {}; };
    window.AudioContext.prototype.createOscillator = () => new FakeOsc(); window.AudioContext.prototype.createGain = () => new FakeGain(); window.AudioContext.prototype.resume = () => { };
    window.fetch = (url, opt) => {
      const body = JSON.parse(opt.body); window.__calls.push({ url, body });
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })) });
      const sys = body.systemInstruction ? body.systemInstruction.parts[0].text : '';
      if (/reviewing a short practice conversation/.test(sys)) return ok({ score: 5, comment: '좋아요', corrections: [], expressions: [] });
      if (/Translate what they want to say/.test(sys)) return ok({ en: "Could I get a latte with oat milk, please?" });
      if (/complete vocabulary entries/.test(sys)) {
        const items = JSON.parse(body.contents[0].parts[0].text);
        return ok(items.map(it => ({ w: it.w, p: it.p || 'v.', m: it.m || ('뜻:' + it.w), e: it.e || ('I use ' + it.w + ' every day.'), k: it.k || ('나는 매일 ' + it.w + '를 써요.') })));
      }
      const last = body.contents[body.contents.length - 1].parts[0].text;
      if (/Start the conversation/.test(last)) return ok({ reply: 'Hi there! What can I get for you today?', ko: '안녕하세요! 오늘 뭐 드릴까요?', fix: '', note: '', used: [], say: [] });
      return ok({ reply: 'Oh, you went there yesterday? Nice! Same order?', ko: '오, 어제 거기 갔었군요? 좋네요! 같은 걸로요?', fix: 'I went there yesterday.', note: '과거형 went', used: [], say: [] });
    };
    function FakeSR() { this._res = []; }
    FakeSR.prototype.start = function () { window.__sr = this; };
    FakeSR.prototype.stop = function () { this.onend && this.onend(); };
    FakeSR.prototype.abort = function () { };
    window.SpeechRecognition = FakeSR; delete window.webkitSpeechRecognition;
    window.__say = function (t, fin) { const r = window.__sr; const item = [{ transcript: t }]; item.isFinal = !!fin; const idx = r._res.length; r._res.push(item); r.onresult({ resultIndex: idx, results: r._res }); };
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; s.settings.dailyGoal = 10; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);

  // --- 홈: 빠른 실행 3개 ---
  eq('홈 빠른 실행 타일', await p.$$eval('.quick .q .q-t', x => x.map(e => e.textContent).join('/')), '회화 연습/단어 추가/듣기 복습');
  await p.screenshot({ path: OUT + '/200-home.png' });

  // --- 학습 카드 ★ ---
  await p.click('.today [data-action="start"]'); await p.waitForTimeout(300);
  const firstId = await p.evaluate(() => document.querySelector('#cardArea .star').getAttribute('data-id'));
  await p.click('#cardArea .star'); await p.waitForTimeout(150);
  eq('★ 토글 → 저장', await p.evaluate(id => window.__vocab.state().words.find(w => w.id === id).star, firstId), true);
  eq('★ 버튼 켜짐', await p.$$eval('#cardArea .star.on', x => x.length), 1);
  await p.screenshot({ path: OUT + '/201-card-star.png' });
  // 세션 끝까지 판정 → 완료 화면 (연속 1일이라 신기록 아님)
  const n = await p.evaluate(() => document.querySelectorAll('#cardArea .card').length ? window.__vocab.state().words.filter(w => w.stage === 1).length : 0);
  for (let i = 0; i < n; i++) { await p.evaluate(() => window.__vocab.judge(true)); }
  await p.waitForTimeout(1300);
  eq('완료 화면', await p.evaluate(() => document.querySelector('.view.active').id), 'view-summary');
  eq('컨페티 캔버스', await p.$$eval('#view-summary canvas.confetti', x => x.length), 1);
  eq('카운트업 끝값', await p.$$eval('#view-summary [data-count]', x => x.map(e => e.textContent + '=' + e.getAttribute('data-count')).every(s => s.split('=')[0] === s.split('=')[1])), true);
  eq('효과음 재생됨', await p.evaluate(() => window.__chimes > 0), true);
  eq('첫날은 신기록 아님', await p.$$eval('#view-summary .record', x => x.length), 0);
  await p.screenshot({ path: OUT + '/202-summary.png' });
  // 신기록: 어제 학습 기록을 넣어 연속 2일로 만들면 큰 연출
  await p.evaluate(() => { const s = window.__vocab.state(); const d = new Date(); d.setDate(d.getDate() - 1); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); s.studyDays[k] = { judged: 5, memorized: 3 }; s.streakRecord = 1; window.__vocab.save(); });
  await p.evaluate(() => { window.__chimes = 0; window.__vocab.go('summary', {}, true); }); await p.waitForTimeout(1500);
  eq('신기록 배너', await p.textContent('#view-summary .record'), '🔥 연속 2일 — 신기록!');
  eq('큰 연출 클래스', await p.$$eval('#view-summary .summary.big', x => x.length), 1);
  eq('신기록은 소리 더 많이', await p.evaluate(() => window.__chimes > 8), true);
  await p.screenshot({ path: OUT + '/203-summary-record.png' });
  await p.evaluate(() => { window.__vocab.go('summary', {}, true); }); await p.waitForTimeout(300);
  eq('같은 날 두 번째는 보통 연출', await p.$$eval('#view-summary .record', x => x.length), 0);

  // --- 단어장 ★ 필터 ---
  await p.click('[data-action="home"]'); await p.waitForTimeout(300);
  await p.click('[data-action="list-starred"]'); await p.waitForTimeout(300);
  eq('★ 필터 목록 1개', await p.$$eval('#listBody .item', x => x.length), 1);
  eq('목록에 ★ 표시', await p.$$eval('#listBody .star-i', x => x.length), 1);

  // --- 회화 설정: ★ 먼저 뽑기, 세부 설정 접힘, 미션 칩 팝업 ---
  await p.click('#tabbar [data-tab="home"]'); await p.waitForTimeout(200);
  await p.click('.quick [data-action="talk"]'); await p.waitForTimeout(300);
  eq('미션 첫 단어가 ★', await p.$$eval('.mission .mchip', x => x[0].classList.contains('starred') && x[0].textContent.startsWith('★ ')), true);
  eq('세부 설정 접힘', await p.$$eval('[data-action="talk-toggle"][data-key="guide"]', x => x.length), 0);
  await p.click('[data-action="talk-more"]'); await p.waitForTimeout(150);
  eq('세부 설정 펼침', await p.$$eval('[data-action="talk-toggle"][data-key="guide"]', x => x.length), 1);
  await p.click('[data-action="talk-more"]'); await p.waitForTimeout(150);
  await p.click('.mission .mchip'); await p.waitForTimeout(300);
  eq('미션 칩 팝업 = 단어장 데이터', await p.evaluate(() => { const s = window.__vocab.state(); const w = s.words.find(w => w.star); return document.querySelector('#sheet .sh-word span').textContent === w.w && document.querySelector('#sheet .sh-m').textContent === w.m; }), true);
  await p.screenshot({ path: OUT + '/204-mission-popup.png' });
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.screenshot({ path: OUT + '/205-talk-setup.png' });

  // --- 회화: 한글 번역(흐림→탭), 자연 교정 프롬프트, 미션 칩 팝업 in chat ---
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(500);
  eq('프롬프트에 자연 교정(recast)', await p.evaluate(() => /recast/.test(window.__calls[0].body.systemInstruction.parts[0].text)), true);
  eq('스키마에 ko', await p.evaluate(() => 'ko' in window.__calls[0].body.generationConfig.responseSchema.properties), true);
  eq('AI 말풍선 아래 한글 번역 (흐림)', await p.$$eval('.ko-line.blur', x => x.map(e => e.textContent).join()), '안녕하세요! 오늘 뭐 드릴까요?');
  await p.click('.ko-line'); await p.waitForTimeout(100);
  eq('탭하면 선명', await p.$$eval('.ko-line.blur', x => x.length), 0);
  await p.click('.mission-bar .mchip'); await p.waitForTimeout(300);
  eq('채팅 미션 칩 팝업', await p.$$eval('#sheet.show .sh-e', x => x.length), 1);
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.fill('#chatIn', 'I go there yesterday'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(500);
  eq('교정 박스도 같이', await p.textContent('.fb.fix .fb-fix'), '✏️ I went there yesterday.');
  eq('답변은 자연 교정으로 시작', await p.$$eval('.msg.ai .bubble', x => x[x.length - 1].textContent.startsWith('Oh, you went there yesterday?')), true);
  await p.screenshot({ path: OUT + '/206-chat-ko.png' });

  // --- 한국어로 말하기 → 번역 → 입력창 ---
  eq('한국어 알약 버튼', await p.textContent('#koBtn'), '🇰🇷 한국어로 말하기');
  await p.click('#koBtn'); await p.waitForTimeout(150);
  eq('한국어 인식 시작', await p.evaluate(() => window.__sr.lang), 'ko-KR');
  eq('알약 = 듣는 중', await p.textContent('#koBtn'), '■ 다 말했어요');
  eq('영어 마이크는 잠금', await p.evaluate(() => document.querySelector('#micBtn').disabled), true);
  await p.evaluate(() => window.__say('오트 밀크 넣은 라떼 한 잔 주세요', true)); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/207-ko-listening.png' });
  await p.click('#koBtn'); await p.waitForTimeout(500);
  eq('번역 요청 나감', await p.evaluate(() => window.__calls.some(c => /Translate what they want to say/.test(c.body.systemInstruction.parts[0].text) && /오트 밀크/.test(c.body.contents[0].parts[0].text))), true);
  eq('영어가 입력창에', await p.inputValue('#chatIn'), 'Could I get a latte with oat milk, please?');
  eq('원문 표시', await p.textContent('.ko-src'), '“오트 밀크 넣은 라떼 한 잔 주세요”');
  const before = await p.$$eval('.msg', x => x.length);
  eq('바로 보내지 않음 (확인 후)', before, 3);
  await p.screenshot({ path: OUT + '/208-ko-translated.png' });
  // autoSend 켜면 번역 후 바로 전송
  await p.evaluate(() => { window.__vocab.state().settings.talk.autoSend = true; window.__vocab.save(); });
  await p.click('#koBtn'); await p.waitForTimeout(100);
  await p.evaluate(() => window.__say('감사합니다', true)); await p.click('#koBtn'); await p.waitForTimeout(700);
  eq('autoSend → 번역 후 바로 전송', await p.$$eval('.msg', x => x.length), before + 2);
  // 리포트 전문에 한글 번역
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#modal .btn.primary'); await p.waitForTimeout(600);
  eq('리포트 전문에 AI 한글', await p.evaluate(() => { const s = window.__vocab.state(); const r = s.talkLog[s.talkLog.length - 1]; return r.msgs.filter(m => m.r === 'a').every(m => !!m.k); }), true);
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(200);

  // --- 단어 추가: 붙여넣기 기본 + AI 채우기 ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#tabbar [data-tab="edit"]'); await p.waitForTimeout(300);
  eq('기본 탭 = 붙여넣기', await p.$$eval('#imp', x => x.length), 1);
  await p.fill('#imp', 'mulligan\ntinker with | 만지작거리다\n- ballpark figure | 대략적인 수치 | Can you give me a ballpark figure? | 대략 얼마쯤이야?\nmulligan'); await p.waitForTimeout(100);
  eq('미리보기', await p.textContent('#impPrev'), '3개 인식 · 뜻 없음 1개 · 예문 없음 2개 → ✨ AI가 채워요');
  await p.screenshot({ path: OUT + '/209-add-bulk.png' });
  const wordsBefore = await p.evaluate(() => window.__vocab.state().words.length);
  await p.click('#impGo'); await p.waitForTimeout(600);
  eq('3개 추가됨', await p.evaluate(() => window.__vocab.state().words.length) - wordsBefore, 3);
  eq('AI가 뜻·예문 채움', await p.evaluate(() => { const w = window.__vocab.state().words.find(w => w.w === 'mulligan'); return w.m + ' | ' + w.e + ' | ' + w.p + ' | ' + w.stage; }), '뜻:mulligan | I use mulligan every day. | v. | 1');
  eq('있던 값은 유지', await p.evaluate(() => { const w = window.__vocab.state().words.find(w => w.w === 'tinker with'); return w.m + ' | ' + w.e; }), '만지작거리다 | I use tinker with every day.');
  eq('AI 요청은 비어 있는 것만', await p.evaluate(() => { const c = window.__calls.filter(c => /complete vocabulary entries/.test(c.body.systemInstruction.parts[0].text)); return c.length + ':' + JSON.parse(c[0].body.contents[0].parts[0].text).map(x => x.w).join(','); }), '1:mulligan,tinker with');
  eq('추가 후 목록으로', await p.evaluate(() => document.querySelector('.view.active').id), 'view-list');
  await p.click('#tabbar [data-tab="edit"]'); await p.waitForTimeout(200);
  await p.click('[data-action="add-mode"][data-mode="one"]'); await p.waitForTimeout(150);
  eq('한 단어 탭', await p.$$eval('#f-w', x => x.length), 1);
  console.log('errors:', errs);
  await b.close();
})();
