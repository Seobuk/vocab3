// 회화 연습 v1.21: 안드로이드 브리지(window.Android)를 흉내 내서 답이 안 올 때의 동작을 본다
//  - 기다리는 초 표시 → 12초 뒤 취소 → 첫 인사 실패 말풍선(이유) → 다시 시도 → 늦게 온 옛 답은 버림
//  - thinkingConfig 를 거부하는 모델(400) → 빼고 한 번 더
//  - SocketTimeout → "응답이 너무 늦어요" 문구, 설정의 마지막 호출 기록
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__calls = [];
    window.Android = {   // 저장은 localStorage 로 흉내 (새로고침해도 남게)
      load: k => localStorage.getItem('A:' + k), save: (k, v) => { localStorage.setItem('A:' + k, v); }, remove: k => { localStorage.removeItem('A:' + k); },
      setBackHandled() { }, setSystemBars() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, copy() { }, share() { },
      audioState: () => '{}', audioStart() { }, audioControl() { }, saveFile() { }, openFile() { }, openUrl() { }, exitApp() { },
      sttAvailable: () => false, sttStart() { }, sttStop() { }, sttCancel() { },
      // 답을 자동으로 주지 않는다 — 테스트가 window.__reply(id, status, text) 로 직접 준다
      aiCall(id, url, key, body) { window.__calls.push({ id, url, body: JSON.parse(body) }); }
    };
    window.__reply = (id, status, obj) => window.onAiResult(id, status, typeof obj === 'string' ? obj : JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }));
    // 시간을 빨리 돌리기: Date.now 를 밀어 두는 오프셋
    window.__skew = 0; const realNow = Date.now; Date.now = () => realNow() + window.__skew;
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  eq('안드로이드 브리지 모드', await p.evaluate(() => typeof window.Android.aiCall), 'function');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { window.Android.save('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('[data-action="talk"]'); await p.waitForTimeout(200);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(300);

  // --- 1. 답이 안 온다 ---
  eq('요청 1건 나감', await p.evaluate(() => window.__calls.length), 1);
  eq('flash 계열은 thinking 끔', await p.evaluate(() => JSON.stringify(window.__calls[0].body.generationConfig.thinkingConfig)), '{"thinkingBudget":0}');
  eq('타이핑 말풍선', await p.$$eval('.bubble.typing', x => x.length), 1);
  eq('4초 전엔 조용', await p.textContent('#waitInfo'), '');
  await p.evaluate(() => { window.__skew = 6000; }); await p.waitForTimeout(1200);
  eq('6초: 기다리는 중 표시', await p.textContent('#waitInfo').then(t => t.replace(/[67]초/, 'N초')), '답변 기다리는 중 · N초');
  eq('아직 취소 없음', await p.$$eval('[data-action="talk-cancel"]', x => x.length), 0);
  await p.evaluate(() => { window.__skew = 13000; }); await p.waitForTimeout(1200);
  eq('13초: 취소 버튼', await p.$$eval('[data-action="talk-cancel"]', x => x.length), 1);
  await p.screenshot({ path: OUT + '/106-talk-waiting.png' });
  await p.click('[data-action="talk-cancel"]'); await p.waitForTimeout(200);
  eq('취소 → 첫 인사 실패 말풍선', await p.$$eval('.bubble.errb', x => x.length), 1);
  eq('실패 이유', await p.textContent('.bubble.errb small'), '기다리다 취소했어요');
  eq('다시 시도·나가기', await p.$$eval('.fb.err b', x => x.map(b => b.textContent).join('/')), '다시 시도/나가기');
  eq('타이핑 사라짐', await p.$$eval('.bubble.typing', x => x.length), 0);
  await p.screenshot({ path: OUT + '/107-talk-opening-failed.png' });
  // 늦게 온 첫 요청의 답은 버려야 한다
  await p.evaluate(() => window.__reply('ai1', 200, { reply: 'LATE HELLO', fix: '', note: '', used: [], say: [] })); await p.waitForTimeout(200);
  eq('늦은 답은 무시', await p.$$eval('.msg.ai .bubble', x => x.map(b => b.textContent).join('|')).then(t => /LATE/.test(t)), false);
  // 다시 시도 → 새 요청 → 답
  await p.click('[data-action="talk-retry"]'); await p.waitForTimeout(200);
  eq('다시 시도로 요청 2건째', await p.evaluate(() => window.__calls.length), 2);
  const id2 = await p.evaluate(() => window.__calls[1].id);
  await p.evaluate(id => window.__reply(id, 200, { reply: 'Hi! What can I get you?', fix: '', note: '', used: [], say: [{ e: 'A latte, please.', k: '라떼 주세요.' }] }), id2); await p.waitForTimeout(200);
  eq('첫 인사 도착', await p.textContent('.msg.ai .bubble'), 'Hi! What can I get you?');
  eq('실패 말풍선 정리됨', await p.$$eval('.bubble.errb', x => x.length), 0);

  // --- 2. 내 말 → 소켓 타임아웃(status 0) → 인라인 이유 + 다시 보내기 ---
  await p.fill('#chatIn', 'One latte please'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(200);
  const id3 = await p.evaluate(() => window.__calls[2].id);
  eq('보낸 문장이 히스토리에 (실패한 건 제외)', await p.evaluate(() => window.__calls[2].body.contents.filter(c => c.role === 'user').length), 2);
  await p.evaluate(id => window.__reply(id, 0, 'SocketTimeoutException: timeout'), id3); await p.waitForTimeout(200);
  eq('전송 실패 표시', await p.$$eval('.fb.err', x => x.length), 1);
  eq('이유 문구', await p.textContent('.fb.err .fb-note'), '응답이 너무 늦어요. 서버가 붐비거나 모델이 느린 것 같아요 — 잠시 후 다시 시도해 주세요');
  eq('설정용 마지막 기록', await p.evaluate(() => { const a = JSON.parse(window.Android.load('vocab3.ai.v1')); return a.last.what + '/' + a.last.status + '/' + (a.last.err ? 'err' : ''); }), 'talk/0/err');
  eq('실패 뒤에도 아직 답할 말의 할 말 칩 (v2.1)', await p.$$eval('.say-bar:not([hidden]) .say', x => x.map(e => e.querySelector('.say-e').textContent).join()), 'A latte, please.');

  // --- 3. thinkingConfig 거부(400) → 빼고 재시도 ---
  await p.click('[data-action="talk-retry"]'); await p.waitForTimeout(200);
  const id4 = await p.evaluate(() => window.__calls[3].id);
  await p.evaluate(id => window.__reply(id, 400, JSON.stringify({ error: { code: 400, message: 'Thinking is not supported for this model.' } })), id4); await p.waitForTimeout(200);
  eq('400 뒤 자동 재요청', await p.evaluate(() => window.__calls.length), 5);
  eq('재요청엔 thinkingConfig 없음', await p.evaluate(() => 'thinkingConfig' in window.__calls[4].body.generationConfig), false);
  eq('noThink 기억', await p.evaluate(() => JSON.parse(window.Android.load('vocab3.ai.v1')).noThink), true);
  const id5 = await p.evaluate(() => window.__calls[4].id);
  await p.evaluate(id => window.__reply(id, 200, { reply: 'Sure, one latte.', fix: '', note: '좋아요', used: [], say: [] }), id5); await p.waitForTimeout(200);
  eq('대화 이어짐', await p.$$eval('.msg', x => x.length), 3);
  await p.click('[data-action="talk-send"]');   // 빈 입력은 무시
  await p.fill('#chatIn', 'Thanks'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(200);
  eq('noThink 뒤 요청은 처음부터 thinking 없이', await p.evaluate(() => 'thinkingConfig' in window.__calls[5].body.generationConfig), false);
  const id6 = await p.evaluate(() => window.__calls[5].id);
  await p.evaluate(id => window.__reply(id, 200, { reply: 'You are welcome!', fix: '', note: '', used: [], say: [] }), id6); await p.waitForTimeout(200);

  // --- 4. 설정 화면의 마지막 호출 줄 ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#modal .btn.primary'); await p.waitForTimeout(300);   // 끝내기 → 정리 요청(답 안 줌)
  eq('정리 중 표시', await p.evaluate(() => { window.__skew += 20000; return new Promise(r => setTimeout(() => r(document.querySelector('#waitInfo').textContent.replace(/2[01]초/, 'N초')), 1100)); }), '정리하는 중 · N초');
  eq('정리 중엔 취소 없음', await p.$$eval('[data-action="talk-cancel"]', x => x.length), 0);
  const id7 = await p.evaluate(() => window.__calls[window.__calls.length - 1].id);
  await p.evaluate(id => window.__reply(id, 200, { score: 4, comment: 'good', corrections: [], expressions: [] }), id7); await p.waitForTimeout(300);
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(200);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);   // talk → home (탭바는 홈에서만)
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(300);
  console.log('settings last line:', await p.textContent('#ai-last'));
  eq('마지막 호출 줄', await p.textContent('#ai-last').then(t => /회화 정리 · .*초 · 성공/.test(t)), true);
  console.log('errors:', errs);
  await b.close();
})();
