// v2.35 다이얼로그: 홈 버튼 → 내 정보 → 상황(글·음성) → Gemini 대화 생성(stub) → 남녀 번갈아 재생 · 줄 톡 · 내 대사 가리기 · 삭제.
// speechSynthesis 는 가짜(끝나면 onend) — 음높이로 남(0.78)·여(1.12)를 확인한다 (브라우저엔 목소리 목록이 없어 음높이 대체).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
fs.mkdirSync(OUT, { recursive: true });
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' — got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want))); };
const LINES = [
  { s: 'A', e: 'Hi, you must be the new researcher.', k: '안녕하세요, 새로 오신 연구원이시죠?' },
  { s: 'B', e: 'Yes, I just started this week.', k: '네, 이번 주에 시작했어요.' },
  { s: 'A', e: 'Would you like a quick lab tour?', k: '연구실 한 바퀴 둘러보실래요?' },
  { s: 'B', e: 'That would be great, thanks!', k: '그러면 좋죠, 고마워요!' },
  { s: 'A', e: 'Great, let me show you the robot lab first.', k: '좋아요, 로봇 실험실부터 보여 드릴게요.' },
  { s: 'B', e: 'Sounds good. Lead the way.', k: '좋아요. 앞장서 주세요.' }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript((LINES) => {
    window.__calls = []; window.__said = [];
    window.fetch = (url, opt) => {
      const body = opt && opt.body ? JSON.parse(opt.body) : null; window.__calls.push({ url, body });
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })) });
      const sys = body && body.systemInstruction ? body.systemInstruction.parts[0].text : '';
      if (/dialogues for a Korean adult learner/.test(sys)) return new Promise(r => setTimeout(r, 300)).then(() => ok({ title: '새 연구원에게 연구소 투어', b: '새로 온 연구원', lines: LINES }));
      return ok({ reply: 'Hi!', ko: '안녕', fix: '', note: '', used: [], say: [] });
    };
    // 가짜 TTS: 읽은 문장·음높이를 적고 60ms 뒤 끝
    const fakeSS = { cancel() { this._c = (this._c || 0) + 1; }, speak(u) { const c = this._c; window.__said.push({ t: u.text, p: u.pitch }); setTimeout(() => { if (this._c === c && u.onend) u.onend(); }, 60); }, getVoices() { return []; } };
    Object.defineProperty(window, 'speechSynthesis', { value: fakeSS, configurable: true });
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    window.SpeechRecognition = window.webkitSpeechRecognition = function () { this.start = () => { window.__srStarted = this.lang; }; this.stop = () => { }; this.abort = () => { }; };
  }, LINES);
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.tour = { home: 1, dlg: 1, dlgv: 1, talk: 1, chat: 1, settings: 1 }; window.__vocab.save(); }); await p.reload(); await p.waitForTimeout(400);

  eq('홈 빠른 버튼 4개 (다이얼로그 포함)', await p.$$eval('.quick .q .q-t', x => x.map(e => e.textContent)), ['회화 연습', '다이얼로그', '유튜브', '듣기 복습']);
  eq('빠른 버튼 크기 같음', await p.$$eval('.quick .q', x => new Set(x.map(e => Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))).size), 1);
  eq('글자 안 넘침', await p.$$eval('.quick .q-t', x => x.every(e => e.scrollWidth <= e.parentElement.clientWidth)), true);
  await p.screenshot({ path: OUT + '/dlg-0-home.png' });
  await p.click('.quick [data-action="dlg"]'); await p.waitForTimeout(200);
  eq('빈 목록', await p.textContent('#view-dlg .empty'), '아직 만든 다이얼로그가 없어요');

  // 내 정보 (음성 입력 → 창에)
  await p.click('#view-dlg .dl-me'); await p.waitForTimeout(250);
  await p.fill('#dlgPf', '한국기계연구원 연구원이에요.');
  await p.click('[data-action="dlg-mic"]'); await p.waitForTimeout(100);
  eq('마이크: 한국어로 듣기', await p.evaluate(() => window.__srStarted), 'ko-KR');
  await p.evaluate(() => { window.onSttState('ready'); window.onSttPartial('일곱 살 딸이'); });
  eq('부분 결과가 칸에 이어 붙음', await p.inputValue('#dlgPf'), '한국기계연구원 연구원이에요. 일곱 살 딸이');
  await p.evaluate(() => window.onStt('일곱 살 딸이 하나 있어요.'));
  eq('최종 결과', await p.inputValue('#dlgPf'), '한국기계연구원 연구원이에요. 일곱 살 딸이 하나 있어요.');
  eq('마이크 버튼 원래대로', await p.textContent('.dl-mic'), '🎤 말로 입력');
  await p.click('[data-action="dlg-pf-save"]'); await p.waitForTimeout(300);
  eq('내 정보 저장', await p.evaluate(() => window.__vocab.state().settings.profile), '한국기계연구원 연구원이에요. 일곱 살 딸이 하나 있어요.');
  eq('목록 카드에 내 정보', await p.textContent('#view-dlg .dl-me-s'), '한국기계연구원 연구원이에요. 일곱 살 딸이 하나 있어요.');

  // 추가
  await p.click('.topbar [data-action="dlg-add"]'); await p.waitForTimeout(250);
  await p.click('[data-action="dlg-submit"]'); await p.waitForTimeout(150);
  eq('빈 상황은 안내', await p.textContent('#toast'), '어떤 상황인지 적거나 말해 주세요');
  await p.fill('#dlgSit', '새로 온 연구원에게 연구소 투어를 하겠냐고 물어보기');
  await p.click('[data-action="dlg-len"][data-value="short"]');
  await p.screenshot({ path: OUT + '/dlg-1-add.png' });
  await p.click('[data-action="dlg-submit"]'); await p.waitForTimeout(100);
  eq('만드는 중 화면', await p.evaluate(() => !!document.querySelector('#dlgBody .dl-busy .typing')), true);
  await p.waitForTimeout(500);
  const sys = await p.evaluate(() => window.__calls[window.__calls.length - 1].body.systemInstruction.parts[0].text);
  eq('프롬프트: 내 정보 · 6줄 · 번갈아', [/한국기계연구원/.test(sys), /exactly 6 lines/.test(sys), /alternate A, B/.test(sys), /learner \(a man\)/.test(sys)], [true, true, true, true]);
  eq('대화 6줄', await p.$$eval('.dl-line', x => x.length), 6);
  eq('제목', await p.textContent('#dlgT'), '새 연구원에게 연구소 투어');
  eq('A 왼쪽 · B 오른쪽', await p.$$eval('.dl-line', x => x.map(e => e.classList.contains('a') ? 'A' : 'B').join('')), 'ABABAB');
  await p.screenshot({ path: OUT + '/dlg-2-view.png' });

  // 재생: 남 → 여 번갈아, 끝까지
  await p.evaluate(() => { window.__said = []; });
  await p.click('.dl-play'); await p.waitForTimeout(150);
  eq('재생 중 표시', await p.evaluate(() => document.querySelector('.dl-play').classList.contains('on')), true);
  await p.screenshot({ path: OUT + '/dlg-3-playing.png' });
  await p.waitForTimeout(6 * 560 + 400);
  const said = await p.evaluate(() => window.__said);
  eq('6줄 차례대로', said.map(x => x.t), LINES.map(x => x.e));
  eq('A 남자(0.78) · B 여자(1.12) 번갈아', said.map(x => x.p), [0.78, 1.12, 0.78, 1.12, 0.78, 1.12]);
  eq('끝나면 멈춤 · 재생 1번', [await p.evaluate(() => document.querySelector('.dl-play').classList.contains('on')), await p.evaluate(() => window.__vocab.state().dlg[0].plays)], [false, 1]);

  // 줄 한 번 톡 = 그 줄만 · 두 번 톡 = 한글 가리기
  await p.evaluate(() => { window.__said = []; });
  await p.click('#dl-3'); await p.waitForTimeout(700);
  eq('한 번 톡 = 그 줄만 (여자)', await p.evaluate(() => window.__said), [{ t: LINES[3].e, p: 1.12 }]);
  await p.click('#dl-2'); await p.waitForTimeout(80); await p.click('#dl-2'); await p.waitForTimeout(100);
  eq('두 번 톡 = 한글 가림', await p.evaluate(() => document.querySelector('#dl-2 .dl-k').classList.contains('hid')), true);

  // 내 대사 가리기
  await p.click('[data-key="dlgHide"]'); await p.waitForTimeout(100);
  eq('A 줄 영어 가림', await p.$$eval('.dl-line', x => x.map(e => e.querySelector('.dl-e').classList.contains('hid') ? 1 : 0).join('')), '101010');
  await p.screenshot({ path: OUT + '/dlg-4-hide.png' });
  await p.click('#dl-0'); await p.waitForTimeout(100);
  eq('가린 줄 톡 = 보이기', await p.evaluate(() => document.querySelector('#dl-0 .dl-e').classList.contains('hid')), false);
  await p.click('[data-key="dlgHide"]'); await p.waitForTimeout(100);

  // 다크 모드 한 장
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.theme = 'dark'; window.__vocab.applyTheme(); });
  await p.screenshot({ path: OUT + '/dlg-5-dark.png' });
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.theme = 'light'; window.__vocab.applyTheme(); });

  // 떠나면 재생 멈춤
  await p.click('.dl-play'); await p.waitForTimeout(100);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  const n0 = await p.evaluate(() => window.__said.length); await p.waitForTimeout(800);
  eq('목록으로 돌아가면 멈춤', await p.evaluate(() => window.__said.length), n0);
  eq('목록 항목', await p.textContent('#view-dlg .yi-s'), '6줄 · 새로 온 연구원 · ' + await p.evaluate(() => window.__vocab.state().dlg[0].date) + ' · ▶ 2번');
  await p.screenshot({ path: OUT + '/dlg-6-list.png' });

  // 회화 연습도 내 정보를 참고
  await p.evaluate(() => window.__vocab.go('talk')); await p.waitForTimeout(150);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(400);
  eq('회화 시스템 프롬프트에 내 정보', await p.evaluate(() => /About the learner.*한국기계연구원/.test(window.__calls[window.__calls.length - 1].body.systemInstruction.parts[0].text)), true);
  await p.evaluate(() => window.__vocab.go('dlg')); await p.waitForTimeout(150);

  // 삭제 · 다시 켜도 남음
  await p.reload(); await p.waitForTimeout(400);
  eq('저장됨 (다시 켜도)', await p.evaluate(() => window.__vocab.state().dlg.map(r => r.lines.length)), [6]);
  await p.click('.quick [data-action="dlg"]'); await p.waitForTimeout(150);
  await p.click('#view-dlg .yi-del'); await p.waitForTimeout(150); await p.click('#modal .btn.danger'); await p.waitForTimeout(200);
  eq('삭제', await p.evaluate(() => window.__vocab.state().dlg.length), 0);

  eq('페이지 오류 없음', errs, []);
  await b.close();
  console.log(fail ? 'FAILED ' + fail : 'all ok');
  process.exit(fail ? 1 : 0);
})();
