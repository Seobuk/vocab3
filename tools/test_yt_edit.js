// v2.11 유튜브: 가로 화면에서 문장 시작·끝 시간을 손으로 고치기 — 영상 아래 왼쪽 패널 (±0.1·0.5초, "지금" = 영상 위치). Gemini·oEmbed·YouTube IFrame API 는 stub.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const SENTS = [
  { s: '00:00.5', t: '00:02.4', e: 'Hi everyone, welcome back.', k: '안녕하세요 여러분.', x: [] },
  { s: '00:03.2', t: '00:06.9', e: "Today we'll dig into why agents really matter.", k: '오늘은 에이전트가 왜 중요한지 파고들어요.', x: [] },
  { s: '00:07.8', t: '00:09.9', e: "Let's figure out the rest.", k: '나머지를 알아봐요.', x: [] }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.addInitScript(sents => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } });
    window.fetch = (url, opt) => {
      if (/oembed/.test(url)) return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ title: 'Edit Talk' })) });
      return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(sents) }] } }] })) });
    };
    window.__yt = []; window.__ytT = 0; window.__ytState = -1;
    window.YT = { Player: function (el, o) {
      setTimeout(() => o.events.onReady({}), 0);
      this.seekTo = t => { window.__yt.push({ fn: 'seek', t }); window.__ytT = t; };
      this.playVideo = () => { window.__yt.push({ fn: 'play' }); window.__ytState = 1; };
      this.pauseVideo = () => { window.__yt.push({ fn: 'pause', at: window.__ytT }); window.__ytState = 2; };
      this.getCurrentTime = () => window.__ytT; this.getPlayerState = () => window.__ytState; this.getDuration = () => 60; this.destroy = () => {};
    } };
  }, SENTS);
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  const yt = fn => p.evaluate(f => window.__yt.filter(c => c.fn === f), fn);
  const lastSeek = async () => (await yt('seek')).slice(-1)[0].t;
  const sent = i => p.evaluate(i => window.__vocab.state().yt[0].sents[i], i);
  const shown = sel => p.$$eval(sel, x => x.map(e => getComputedStyle(e).display !== 'none').join());
  const adj = (k, d) => p.click('#ytSide [data-action="yt-adj"][data-k="' + k + '"][data-d="' + d + '"]');
  const toast = () => p.textContent('#toast');
  const rect = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height) }; });

  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/EDITEDIT001'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);

  // --- 가로: 영상 아래 왼쪽 빈 곳에 "✎ 문장 시간 수정" ---
  const v0 = await rect('#ytBox'), s0 = await rect('#ytSide');
  eq('가로: 수정 버튼은 영상 바로 아래 왼쪽 칸', (s0.t >= v0.b - 1) + ' ' + (s0.l === v0.l && s0.r === v0.r) + ' ' + await p.textContent('#ytSide'), 'true true ✎ 문장 시간 수정');
  await p.click('#ytSide [data-action="yt-edit"]'); await p.waitForTimeout(200);
  eq('켜면 사용법 안내', await toast(), '±를 누르면 바뀐 곳을 들려줘요 · 멈춘 곳에서 "지금"');
  eq('문장을 안 눌렀으면 패널에 안내', await p.textContent('#ytSide .yed-h'), '고칠 문장을 오른쪽에서 누르세요');
  eq('수정 중엔 시간이 소수 한 자리', await p.$$eval('#ytList .ys-t', x => x.map(e => e.textContent).join(' ')), '0:00.5 0:03.2 0:07.8');
  const v1 = await rect('#ytBox'), s1 = await rect('#ytSide');
  eq('폰 가로: 수정 중엔 영상을 줄여 아래 패널 자리 (≥150px)', (v1.h < v0.h) + ' ' + (s1.h >= 150) + ' ' + (s1.t >= v1.b - 1), 'true true true');
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(150);
  eq('처음엔 AI 시간: 시작 −0.3초 앞에서 재생', await lastSeek(), 2.9);
  eq('패널 값 = 누른 문장의 실제 재생 구간 (끝 = t 6.9 + 0.1)', await p.$$eval('#ytSide .yed-l b', x => x.map(e => e.textContent).join(' ')), '0:03.2 0:07.0');
  eq('버튼 줄마다 한 줄 · 패널 안에 다 들어감 (스크롤 없음)', await p.$eval('#ytSide', s => [...s.querySelectorAll('.yed-r, .yed-c')].map(r => new Set([...r.querySelectorAll('.yed-b')].map(b => Math.round(b.getBoundingClientRect().top))).size).join() + ' ' + (s.scrollHeight <= s.clientHeight + 1)), '1,1,1 true');
  eq('오른쪽 문장 목록엔 수정 칸 없음 (가리지 않음)', await p.$$eval('#ytList .yed', x => x.length), 0);

  // --- 시작 ±: 저장 + 바뀐 앞부분 1.5초 들려주기 ---
  const pz0 = (await yt('pause')).length;
  await adj('s', '0.1'); await p.waitForTimeout(150);
  eq('시작 +0.1 → 3.3 · 손으로 고침 표시', (await sent(1)).s + ' ' + (await sent(1)).ms, '3.3 1');
  eq('바뀐 시작부터 들려줌 (앞 여유 없이 그 자리)', await lastSeek(), 3.3);
  await p.evaluate(() => { window.__ytT = 4.6; }); await p.waitForTimeout(260);
  await p.evaluate(() => { window.__ytT = 4.85; }); await p.waitForTimeout(120);
  eq('시작 미리듣기는 1.5초 뒤(4.8) 멈춤', (await yt('pause')).length - pz0, 1);
  eq('줄 시간에 ✎ · 패널 값도 갱신', await p.textContent('#ys1 .ys-t') + ' ' + await p.textContent('#ytSide .yed-l b'), '0:03.3✎ 0:03.3');
  await adj('s', '-0.5'); await p.waitForTimeout(100);
  eq('시작 −0.5 → 2.8', (await sent(1)).s, 2.8);
  await p.evaluate(() => { window.__ytT = 0.2; }); await adj('s', 'now'); await p.waitForTimeout(100);
  eq('"지금"이 앞 문장 시작보다 앞이면 막고 안내 (앞 문장 시작 0.5 까지 — 같은 시간은 허용)', (await sent(1)).s + ' ' + /앞 문장 시작과 이 문장 끝 사이/.test(await toast()), '0.5 true');
  const sk = (await yt('seek')).length;
  await p.evaluate(() => { window.__ytT = 3.04; }); await adj('s', 'now'); await p.waitForTimeout(100);
  eq('"지금" = 영상 위치(3.04 → 3.0) · 들으면서 누르는 거라 재생 안 끊음', (await sent(1)).s + ' ' + ((await yt('seek')).length - sk), '3 0');

  // --- 끝: "지금" · ± (다음 문장 시작보다 늦어도 됨) ---
  await p.evaluate(() => { window.__ytT = 8.04; }); await adj('t', 'now'); await p.waitForTimeout(100);
  eq('끝 "지금" → 8.0 (다음 문장 시작 7.8 보다 늦어도 그대로)', (await sent(1)).t + ' ' + (await sent(1)).me, '8 1');
  await adj('t', '-0.1'); await p.waitForTimeout(150);
  eq('끝 −0.1 → 7.9 · 끝부분 1.5초 들려줌 (6.4부터)', (await sent(1)).t + ' ' + await lastSeek(), '7.9 6.4');
  for (let k = 0; k < 10; k++) await adj('t', '-0.5');
  await p.waitForTimeout(100);
  eq('끝은 시작 +0.5초 아래로 못 감 + 안내', (await sent(1)).t + ' ' + /시작보다 0\.5초 이상 뒤/.test(await toast()), '3.5 true');
  await p.evaluate(() => { window.__ytT = 7.94; }); await adj('t', 'now'); await p.waitForTimeout(100);
  await p.evaluate(() => document.getElementById('toast').classList.remove('show')); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/306-yt-edit.png' });

  // --- 문장 듣기 = 고친 시작 그대로, 고친 끝에서 멈춤 (다음 문장 시작 7.8 에 안 잘림) ---
  await p.click('#ytSide [data-action="yt-edit-play"]'); await p.waitForTimeout(150);
  eq('▶ 문장 = 고친 시작(3.0)에서 여유 없이', await lastSeek(), 3);
  const pz = (await yt('pause')).length;
  await p.evaluate(() => { window.__ytT = 7.6; }); await p.waitForTimeout(260);
  await p.evaluate(() => { window.__ytT = 7.85; }); await p.waitForTimeout(150);
  eq('다음 문장 시작(7.8)을 지나도 안 멈춤', (await yt('pause')).length - pz, 0);
  await p.evaluate(() => { window.__ytT = 7.95; }); await p.waitForTimeout(150);
  eq('고친 끝(7.9)에서 멈춤', (await yt('pause')).length - pz, 1);

  // --- ⏯ 자유 재생·멈춤, ⟲ 2초 ---
  await p.click('#ytSide [data-action="yt-playpause"]'); await p.waitForTimeout(100);
  const pz2 = (await yt('pause')).length;
  await p.evaluate(() => { window.__ytT = 9.5; }); await p.waitForTimeout(300);
  eq('⏯ 재생은 문장 끝에서 안 멈춤', (await p.evaluate(() => window.__ytState)) + ' ' + ((await yt('pause')).length - pz2), '1 0');
  await p.click('#ytSide [data-action="yt-back2"]'); await p.waitForTimeout(100);
  eq('⟲ 2초 = 지금(9.5) − 2초부터', await lastSeek(), 7.5);
  await p.click('#ytSide [data-action="yt-playpause"]'); await p.waitForTimeout(100);
  eq('⏯ 한 번 더 누르면 멈춤', await p.evaluate(() => window.__ytState), 2);

  // --- 다른 문장을 누르면 패널이 그 문장으로 ---
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(150);
  eq('다른 문장 누르면 패널도 그 문장', await p.$$eval('#ytSide .yed-l b', x => x.map(e => e.textContent).join(' ')), '0:07.8 0:10.0');
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(150);

  // --- 저장 · 다시 불러와도 유지 ---
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  eq('다시 불러와도 고친 시간·표시 유지', JSON.stringify(await p.evaluate(() => window.__vocab.state().yt[0].sents.map(x => [x.s, x.t, x.ms || 0, x.me || 0]))), JSON.stringify([[0.5, 2.4, 0, 0], [3, 7.9, 1, 1], [7.8, 9.9, 0, 0]]));
  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('[data-action="yt-open"]'); await p.waitForTimeout(300);
  eq('같은 영상을 다시 열면 보던 상태(누른 문장·수정 모드) 그대로 · ✎ 표시', (await p.$$eval('#ytSide .yed-l b', x => x.map(e => e.textContent).join(' '))) + ' ' + await p.textContent('#ys1 .ys-t'), '0:03.0 0:07.9 0:03.0✎');
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200);
  eq('다시 정리 확인 창: 손으로 고친 시간도 바뀐다고 알림', await p.textContent('#modal').then(t => /손으로 고친 시간도 새로 정리돼요/.test(t)), true);
  await p.click('#modal .btn:not(.primary)'); await p.waitForTimeout(200);

  // --- 수정 끝 → 영상 원래 크기 ---
  await p.click('#ytSide [data-action="yt-edit"]:not(.yed-open)'); await p.waitForTimeout(200);
  eq('✓ 끝 → 수정 버튼만 · 영상 원래 크기', await p.textContent('#ytSide') + ' ' + ((await rect('#ytBox')).h === v0.h), '✎ 문장 시간 수정 true');

  // --- 세로 화면에선 없음 ---
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(250);
  eq('세로: 수정 패널 없음 · 한 번 더는 보임', await shown('#ytSide') + ' ' + await shown('.yt-again'), 'false true');
  await p.click('[data-action="yt-replay"]'); await p.waitForTimeout(150);
  eq('한 번 더도 고친 시작(3.0)에서', await lastSeek(), 3);

  // --- 문장 꾹 누르기 = 복사 (재생은 안 함) · 짧게 누르면 그대로 재생 ---
  const sk2 = (await yt('seek')).length;
  const e2 = await p.$eval('#ys2 .ys-e', e => { const r = e.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  await p.mouse.move(e2.x, e2.y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(150);
  eq('꾹 누르면 선택창(문장 공부·복사·합치기·쪼개기) · 떼도 재생 안 함', (await p.$$eval('#sheet.show .yt-menu .btn', x => x.map(e => e.getAttribute('data-action')).join())) + ' | ' + ((await yt('seek')).length - sk2), 'yt-m-study,yt-m-copy,yt-m-word,yt-m-merge,yt-m-merge,yt-m-split | 0');
  await p.click('#sheet [data-action="yt-m-copy"]'); await p.waitForTimeout(250);
  eq('"복사" = 영어 문장 복사 + 안내', (await p.evaluate(() => window.__copied)) + ' | ' + await toast(), "Let's figure out the rest. | 문장을 복사했어요");
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(150);
  eq('그다음 짧게 누르면 재생', (await yt('seek')).length - sk2, 1);
  await p.mouse.move(e2.x, e2.y); await p.mouse.down(); await p.mouse.move(e2.x, e2.y + 30); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(100);
  eq('누른 채 움직이면(스크롤) 선택창 안 뜸', await p.$$eval('#sheet.show', x => x.length), 0);

  // --- 영상 위아래 64px 는 칸 밖 (멈출 때 뜨는 제목줄·더보기 가리기) ---
  const box = await rect('#ytBox'), pl = await rect('#ytPlayer');
  eq('플레이어는 칸보다 위아래 64px 크고 칸이 잘라냄', (pl.t - box.t) + ' ' + (pl.h - box.h) + ' ' + await p.$eval('#ytBox', e => getComputedStyle(e).overflow), '-64 128 hidden');

  // --- 앞뒤 문장과 시작이 같을 때: ± 가 반대로 움직이거나 순서가 뒤집히지 않음 (리뷰) ---
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(250);
  await p.evaluate(() => { const ss = window.__vocab.state().yt[0].sents; ss[0].s = 5; ss[0].t = 7; ss[1].s = 5; delete ss[1].ms; ss[1].t = 7.9; ss[2].s = 5; ss[2].t = 9.9; });
  await p.click('#ytSide [data-action="yt-edit"]'); await p.click('#ys1 .ys-t'); await p.waitForTimeout(150);
  await adj('s', '-0.1'); await p.waitForTimeout(100);
  await adj('s', '0.1'); await p.waitForTimeout(100);
  eq('같은 시작(5, 5, 5)에서 −0.1·+0.1 → 안 움직임 · ✎ 안 붙음 · 순서 유지', JSON.stringify(await p.evaluate(() => window.__vocab.state().yt[0].sents.map(x => [x.s, x.ms || 0]))), '[[5,0],[5,0],[5,0]]');
  await p.click('#ytSide [data-action="yt-edit"]:not(.yed-open)'); await p.waitForTimeout(150);

  // --- 낮은 가로 화면(Fold 바깥 화면 882×320)에서도 "✎ 문장 시간 수정"을 누를 수 있음 (리뷰) ---
  await p.setViewportSize({ width: 882, height: 320 }); await p.waitForTimeout(250);
  eq('낮은 가로 화면: 수정 버튼이 화면 안 · 누를 수 있음', await p.$eval('#ytSide .yed-open', b => { const r = b.getBoundingClientRect(); return r.bottom <= innerHeight && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; }), true);
  // --- 좁은 세로 화면(344px)에서 목록이 옆으로 안 밀림 ---
  await p.setViewportSize({ width: 344, height: 882 }); await p.waitForTimeout(250);
  eq('좁은 세로 화면: 옆으로 안 밀림 · 플레이어 폭 = 화면', await p.$eval('#ytList', l => (l.scrollWidth <= l.clientWidth) + ' ' + Math.round(document.querySelector('#ytBox').getBoundingClientRect().width)), 'true 344');
  // --- 안드로이드 길게 누르기(contextmenu)로도 바로 복사 ---
  await p.evaluate(() => { window.__copied = ''; });
  const e3 = await p.$eval('#ys0 .ys-e', e => { const r = e.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  await p.mouse.move(e3.x, e3.y); await p.mouse.down(); await p.waitForTimeout(150);
  await p.dispatchEvent('#ys0 .ys-e', 'contextmenu'); await p.waitForTimeout(50);
  const early = await p.$$eval('#sheet.show .ym-e', x => x.map(e => e.textContent).join()); await p.mouse.up(); await p.waitForTimeout(100);
  eq('길게 누르기 신호(contextmenu)가 오면 550ms 전이라도 선택창', early, 'Hi everyone, welcome back.');
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
