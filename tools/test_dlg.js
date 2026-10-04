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
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] })) });
      const sys = body && body.messages && body.messages[0].role === 'system' ? body.messages[0].content : '';
      if (/dialogues for a Korean adult learner/.test(sys)) {
        if (window.__fail) return Promise.resolve({ status: 500, text: () => Promise.resolve('{"error":{"message":"boom"}}') });
        const edited = /거절/.test(body.messages[body.messages.length - 1].content);   // 상황 수정 뒤에는 다른 대화(4줄)
        return new Promise(r => setTimeout(r, 300)).then(() => edited ? ok({ title: '투어 권하기 — 거절', b: '바쁜 연구원', lines: LINES.slice(0, 4) }) : ok({ title: '새 연구원에게 연구소 투어', b: '새로 온 연구원', lines: LINES }));
      }
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
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', gkey: 'TEST-KEY', or: 1 })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.tour = { home: 1, dlg: 1, dlgv: 1, talk: 1, chat: 1, settings: 1 }; window.__vocab.save(); }); await p.reload(); await p.waitForTimeout(400);

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
  const sys = await p.evaluate(() => window.__calls[window.__calls.length - 1].body.messages[0].content);
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

  // 상황 수정 (v2.36): 상황 칸 "수정" → 지금 상황·길이가 든 창 → 고치거나 말로 덧붙여 다시 만들기. 새 대화가 와야 기록이 바뀐다.
  const SIT = '새로 온 연구원에게 연구소 투어를 하겠냐고 물어보기', SIT2 = SIT + ' 상대가 바쁘다고 거절해요.';
  const rec = () => p.evaluate(() => { const r = window.__vocab.state().dlg[0]; return [r.sit, r.len, r.lines.length]; });
  const sheet = async () => [await p.textContent('#sheet .sh-word'), await p.inputValue('#dlgSit'), await p.getAttribute('#sheet [data-action="dlg-len"].on', 'data-value'), await p.textContent('#sheet [data-action="dlg-submit"]')];
  await p.click('.topbar [data-action="dlg-add"]'); await p.waitForTimeout(250);
  await p.fill('#dlgSit', '쓰던 글'); await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);   // 추가 창에 쓰다 만 글
  await p.click('#view-dlg .yt-open'); await p.waitForTimeout(250);
  const id0 = await p.evaluate(() => window.__vocab.state().dlg[0].id);
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('수정 창: 제목 · 지금 상황 · 길이 · 버튼', await sheet(), ['상황 수정', SIT, 'short', '다시 만들기']);
  await p.screenshot({ path: OUT + '/dlg-7-edit.png' });
  await p.fill('#dlgSit', '버릴 글'); await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  eq('취소: 그대로', await rec(), [SIT, 'short', 6]);
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('다시 열면 원래 상황', await p.inputValue('#dlgSit'), SIT);
  await p.click('[data-action="dlg-mic"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { window.onSttState('ready'); window.onStt('상대가 바쁘다고 거절해요.'); });
  eq('말로 덧붙임', await p.inputValue('#dlgSit'), SIT2);
  await p.click('#sheet [data-action="dlg-len"][data-value="normal"]');
  await p.evaluate(() => { window.__fail = 1; });
  await p.click('[data-action="dlg-submit"]'); await p.waitForTimeout(400);
  eq('실패: 기록·화면 그대로', [await rec(), await p.textContent('.dl-sit-t'), await p.$$eval('.dl-line', x => x.length)], [[SIT, 'short', 6], SIT, 6]);
  eq('실패 안내', await p.textContent('#toast'), '다시 만들기 실패 — OpenRouter 서버 오류 (500)');
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('실패한 수정: 적은 글·길이가 남음', await sheet(), ['상황 수정', SIT2, 'normal', '다시 만들기']);
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.click('[data-action="dlg-menu"]'); await p.waitForTimeout(250);
  await p.click('#sheet [data-action="dlg-again"]'); await p.waitForTimeout(250); await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(400);
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('"같은 상황으로 다시 만들기"가 실패해도 적은 글은 남음', [await rec(), await sheet()], [[SIT, 'short', 6], ['상황 수정', SIT2, 'normal', '다시 만들기']]);
  await p.evaluate(() => { window.__fail = 0; });
  await p.click('[data-action="dlg-submit"]'); await p.waitForTimeout(100);
  eq('만드는 중: 새 상황 · 수정 버튼 숨김', await p.evaluate(() => [document.querySelector('.dl-sit-t').textContent, !!document.querySelector('#dlgBody .typing'), !!document.querySelector('.dl-sit [data-action="dlg-edit"]')]), [SIT2, true, false]);
  await p.waitForTimeout(500);
  eq('요청: 새 상황 · 10줄', await p.evaluate(() => { const b = window.__calls[window.__calls.length - 1].body; return [b.messages[b.messages.length - 1].content, /exactly 10 lines/.test(b.messages[0].content)]; }), ['Situation: ' + SIT2, true]);
  eq('같은 기록이 새 상황·새 대화로', await p.evaluate(() => { const d = window.__vocab.state().dlg; return [d.length, d[0].id, d[0].sit, d[0].len, d[0].lines.length, d[0].title, d[0].plays]; }), [1, id0, SIT2, 'normal', 4, '투어 권하기 — 거절', 2]);
  eq('화면도 새 대화', [await p.textContent('#dlgT'), await p.textContent('.dl-sit-t'), await p.$$eval('.dl-line', x => x.length)], ['투어 권하기 — 거절', SIT2, 4]);
  await p.screenshot({ path: OUT + '/dlg-8-edited.png' });
  await p.click('[data-action="dlg-menu"]'); await p.waitForTimeout(250);
  await p.click('#sheet [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('메뉴 → 상황 수정', await sheet(), ['상황 수정', SIT2, 'normal', '다시 만들기']);
  await p.click('#sheet [data-action="dlg-profile"]'); await p.waitForTimeout(250);   // 내 정보에 다녀와도 수정 창 그대로
  await p.click('#sheet [data-action="dlg-add"]'); await p.waitForTimeout(250);
  eq('내 정보 → 취소: 수정 창으로', await sheet(), ['상황 수정', SIT2, 'normal', '다시 만들기']);
  const who = async g => { await p.click('#sheet [data-action="dlg-profile"]'); await p.waitForTimeout(250); await p.click('#sheet [data-action="dlg-pg"][data-value="' + g + '"]'); await p.click('[data-action="dlg-pf-save"]'); await p.waitForTimeout(250); return [(await sheet())[0], await p.textContent('.dl-who')]; };
  eq('내 정보에서 내 목소리를 바꾸면 뒤 화면의 남자/여자도', await who('f'), ['상황 수정', 'A나 · 여자B바쁜 연구원 · 남자']);
  eq('되돌림', await who('m'), ['상황 수정', 'A나 · 남자B바쁜 연구원 · 여자']);
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#view-dlg .dl-me'); await p.waitForTimeout(250); await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);   // 닫힌 창에 남은 글이 되살아나지 않는다
  await p.click('.topbar [data-action="dlg-add"]'); await p.waitForTimeout(250);
  eq('추가 창: 쓰던 글 그대로 (수정과 안 섞임)', await sheet(), ['새 다이얼로그', '쓰던 글', 'short', '만들기']);
  await p.fill('#dlgSit', ''); await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);

  // 회화 연습도 내 정보를 참고
  await p.evaluate(() => window.__vocab.go('talk')); await p.waitForTimeout(150);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(400);
  eq('회화 시스템 프롬프트에 내 정보', await p.evaluate(() => /About the learner.*한국기계연구원/.test(window.__calls[window.__calls.length - 1].body.messages[0].content)), true);
  await p.evaluate(() => window.__vocab.go('dlg')); await p.waitForTimeout(150);

  // 삭제 · 다시 켜도 남음
  await p.reload(); await p.waitForTimeout(400);
  eq('저장됨 (다시 켜도)', await p.evaluate(() => window.__vocab.state().dlg.map(r => [r.sit, r.lines.length])), [[SIT2, 4]]);

  // 상황 수정 — 키가 없을 때: 고쳐 적은 글이 남는다
  const open1 = async () => { await p.click('.quick [data-action="dlg"]'); await p.waitForTimeout(150); await p.click('#view-dlg .yt-open'); await p.waitForTimeout(400); };
  const KEY = await p.evaluate(() => { const k = localStorage.getItem('vocab3.ai.v1'); localStorage.removeItem('vocab3.ai.v1'); return k; });
  await p.reload(); await p.waitForTimeout(400); await open1();
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  await p.fill('#dlgSit', '키 없이 고친 글'); await p.click('[data-action="dlg-submit"]'); await p.waitForTimeout(250);
  eq('키 없음: 키를 넣으라는 창', /API 키가 아직 없어요/.test(await p.textContent('#modal')), true);
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(250);
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('키 없음: 적은 글이 남음 · 기록은 그대로', [await p.inputValue('#dlgSit'), await rec()], ['키 없이 고친 글', [SIT2, 'normal', 4]]);

  // 상황 수정 — 아직 대화가 없는 기록(첫 만들기 실패): 상황을 바로 바꾸고, 다시 만들면 그 상황으로
  await p.evaluate(k => { localStorage.setItem('vocab3.ai.v1', k); const s = window.__vocab.state(); s.dlg[0].lines = null; window.__vocab.save(); }, KEY);
  await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { window.__fail = 1; }); await open1();
  eq('대화 없는 기록: 실패 안내 · 수정 칩', await p.evaluate(() => [!!document.querySelector('#dlgBody [data-action="dlg-remake"]'), !!document.querySelector('.dl-sit [data-action="dlg-edit"]')]), [true, true]);
  await p.click('.dl-sit [data-action="dlg-edit"]'); await p.waitForTimeout(250);
  eq('대화 없는 기록: 바뀐다는 안내 없음', await p.$$eval('#sheet .small.muted', x => x.length), 0);
  await p.fill('#dlgSit', '투어를 권했는데 거절당하기'); await p.click('#sheet [data-action="dlg-len"][data-value="long"]');
  await p.click('[data-action="dlg-submit"]'); await p.waitForTimeout(400);
  eq('대화 없는 기록: 상황·길이 바로 바뀜', await p.evaluate(() => { const r = window.__vocab.state().dlg[0]; return [r.sit, r.len, r.lines]; }), ['투어를 권했는데 거절당하기', 'long', null]);
  await p.evaluate(() => { window.__fail = 0; });
  await p.click('#dlgBody [data-action="dlg-remake"]'); await p.waitForTimeout(700);
  eq('다시 만들기: 고친 상황 · 16줄로 요청', await p.evaluate(() => { const b = window.__calls[window.__calls.length - 1].body; return [b.messages[b.messages.length - 1].content, /exactly 16 lines/.test(b.messages[0].content), window.__vocab.state().dlg[0].lines.length]; }), ['Situation: 투어를 권했는데 거절당하기', true, 4]);
  await p.reload(); await p.waitForTimeout(400);
  await p.click('.quick [data-action="dlg"]'); await p.waitForTimeout(150);
  await p.click('#view-dlg .yi-del'); await p.waitForTimeout(150); await p.click('#modal .btn.danger'); await p.waitForTimeout(200);
  eq('삭제', await p.evaluate(() => window.__vocab.state().dlg.length), 0);

  eq('페이지 오류 없음', errs, []);
  await b.close();
  console.log(fail ? 'FAILED ' + fail : 'all ok');
  process.exit(fail ? 1 : 0);
})();
