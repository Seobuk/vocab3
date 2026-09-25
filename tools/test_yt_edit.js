// v2.22 문장 시간 수정 도크 (가로): 위 막대 시계 → 아래 도크(띠·[ ] 손잡이·시작|끝·±·지금·문장 듣기). 세로는 편집기 없음.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
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
    window.fetch = (url) => {
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
  const adj = async (k, d) => { await p.click('#ytSide [data-action="yt-ek"][data-k="' + k + '"]'); await p.click('#ytSide [data-action="yt-adj"][data-d="' + d + '"]'); };
  const vals = () => p.$$eval('#ytSide .yed-k b', x => x.map(e => e.textContent).join(' '));
  const toast = () => p.textContent('#toast');
  const rect = sel => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }; });
  const fits = () => p.$eval('#ytSide', s => (s.scrollHeight <= s.clientHeight + 1) + ' ' + [...s.querySelectorAll('button')].every(bt => { const r = bt.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).closest('button') === bt; }));

  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/EDITEDIT001'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);

  const v0 = await rect('#ytBox');
  eq('가로: 수정 안 할 땐 도크 없음 · 영상 = 높이 가득 (390-58=332 → 472x266)', (await p.$eval('#ytSide', e => getComputedStyle(e).display)) + ' ' + v0.w + 'x' + v0.h, 'none 473x266');
  eq('위 막대 시계 버튼 · 가로에선 📌 없음', (await p.getAttribute('.yt-edb', 'aria-label')) + ' ' + (await p.$eval('.yt-pinb', e => getComputedStyle(e).display)), '문장 시간 수정 none');
  await p.click('.yt-edb'); await p.waitForTimeout(200);
  eq('켜면 안내 · 첫 문장이 골라짐 · 위 막대 "완료"', (await toast()) + ' | ' + (await p.$$eval('#ytList .ys.act', x => x.map(e => e.id).join())) + ' | ' + (await p.textContent('.yt-edb')) + ' ' + (await p.getAttribute('.yt-edb', 'aria-pressed')), '[ ]를 끌거나 ±로 · 멈춘 곳에서 "지금" | ys0 | 완료 true');
  const v1 = await rect('#ytBox'), s1 = await rect('#ytSide');
  eq('도크: 화면 폭 · 102px · 영상은 도크 위', s1.w + ' ' + s1.h + ' ' + (v1.b <= s1.t), '844 102 true');
  eq('도크 안에 다 들어감 · 버튼 다 누를 수 있음', await fits(), 'true true');
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(150);
  eq('다른 문장 누르면 도크도 그 문장 (시작 3.2 · 끝 6.9+0.1)', await vals(), '0:03.2 0:07.0');
  eq('띠: 유튜브(파형 없음) · 창 = 앞뒤 1.5초', await p.$eval('#ytWave', c => [c.dataset.env, c.dataset.a, c.dataset.b].join()), '0,1.7,8.5');

  await adj('s', '0.1'); await p.waitForTimeout(150);
  eq('시작 +0.1 → 3.3 · ms · 바뀐 시작부터 들려줌', (await sent(1)).s + ' ' + (await sent(1)).ms + ' ' + await lastSeek(), '3.3 1 3.3');
  eq('시작 고른 채 → ± 버튼이 시작용', await p.$$eval('#ytSide [data-action="yt-adj"]', x => [...new Set(x.map(e => e.dataset.k))].join()), 's');
  await p.evaluate(() => { window.__ytT = 8.04; }); await adj('t', 'now'); await p.waitForTimeout(100);
  eq('끝 고르고 "지금" → 8.0 me · 재생 안 끊음', (await sent(1)).t + ' ' + (await sent(1)).me + ' ' + await p.$$eval('#ytSide [data-action="yt-adj"]', x => [...new Set(x.map(e => e.dataset.k))].join()), '8 1 t');

  // --- 띠 끌기: 시작 손잡이를 +0.5초 ---
  const wv = await rect('#ytWave'), win = await p.$eval('#ytWave', c => [+c.dataset.a, +c.dataset.b]);
  const X = v => wv.l + (v - win[0]) / (win[1] - win[0]) * wv.w, cy = wv.t + wv.h / 2;
  await p.mouse.move(X(3.3), cy); await p.mouse.down(); await p.mouse.move(X(3.5), cy, { steps: 4 }); await p.mouse.move(X(3.8), cy, { steps: 4 });
  eq('끄는 중: 시작이 골라지고 값이 따라감 · 저장은 아직', (await p.$eval('#ytSide .yed-k.on', e => e.dataset.k + ' ' + e.querySelector('b').textContent)) + ' ' + (await sent(1)).s, 's 0:03.8 3.3');
  await p.mouse.up(); await p.waitForTimeout(150);
  eq('놓으면 저장 3.8 · 바뀐 시작부터 들려줌', (await sent(1)).s + ' ' + await lastSeek(), '3.8 3.8');
  // --- 손잡이 톡(안 끌기) = 그 경계 고르기 ---
  const win2 = await p.$eval('#ytWave', c => [+c.dataset.a, +c.dataset.b]), X2 = v => wv.l + (v - win2[0]) / (win2[1] - win2[0]) * wv.w;
  await p.mouse.click(X2(8.0), cy); await p.waitForTimeout(100);
  eq('끝 손잡이 톡 = 끝 고르기 (값 그대로)', (await p.$eval('#ytSide .yed-k.on', e => e.dataset.k)) + ' ' + (await sent(1)).t, 't 8');
  // --- 빈 곳 톡 = 거기서부터 재생 ---
  const sk = (await yt('seek')).length;
  await p.mouse.click(X2(5.5), cy); await p.waitForTimeout(100);
  eq('빈 곳 톡 = 그 시각부터 재생 (멈춤 없음)', (((await yt('seek')).length - sk) + ' ' + (await lastSeek())) + ' ' + await p.evaluate(() => window.__ytState), '1 5.5 1');
  await p.waitForTimeout(300);
  eq('재생 중이면 ⏯ = 멈춤 모양', await p.getAttribute('#ytSide .yed-pp', 'data-on'), 'true');
  await p.click('#ytSide [data-action="yt-playpause"]'); await p.waitForTimeout(300);
  eq('⏯ 멈춤 → 재생 모양', await p.getAttribute('#ytSide .yed-pp', 'data-on'), 'false');
  await p.click('#ytSide [data-action="yt-back2"]'); await p.waitForTimeout(100);
  eq('⟲ 2초', Math.round(await lastSeek() * 10) / 10, 3.5);
  await p.click('#ytSide [data-action="yt-edit-play"]'); await p.waitForTimeout(100);
  eq('▶ 문장 = 고친 시작 3.8 그대로', await lastSeek(), 3.8);
  await p.evaluate(() => document.getElementById('toast').classList.remove('show')); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, '306-yt-edit.png') });

  // --- Fold 바깥 가로 882x320: 도크가 다 들어감 ---
  await p.setViewportSize({ width: 882, height: 320 }); await p.waitForTimeout(400);
  const v3 = await rect('#ytBox'), s3 = await rect('#ytSide');
  eq('882x320: 영상 ' + v3.w + 'x' + v3.h + ' · 도크 102 · 안 겹침 · 스크롤 없음', (v3.b <= s3.t) + ' ' + s3.h + ' ' + await fits(), 'true 102 true true');
  await p.screenshot({ path: path.join(OUT, '307-yt-edit-cover.png') });
  // --- 세로: 시간 수정 없음 (v2.11 사용자 요청 — 가로만) ---
  for (const [w, h] of [[390, 844], [344, 882]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
    eq(w + 'x' + h + ' 세로: 시계 버튼·도크 없음 · 한 번 더 보임', (await p.$eval('.yt-edb', e => getComputedStyle(e).display)) + ' ' + (await p.$eval('#ytSide', e => getComputedStyle(e).display)) + ' ' + await p.$eval('.yt-fab', e => getComputedStyle(e).display), 'none none flex');
  }
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(400);
  await p.click('.yt-edb'); await p.waitForTimeout(200);
  eq('완료 → 도크 없음 · 시계 버튼 · 한 번 더 다시', (await p.$eval('#ytSide', e => getComputedStyle(e).display)) + ' ' + (await p.getAttribute('.yt-edb', 'aria-pressed')) + ' ' + await p.$eval('.yt-fab', e => getComputedStyle(e).display), 'none false flex');
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.theme = 'dark'; window.__vocab.applyTheme(); });
  await p.click('.yt-edb'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('toast').classList.remove('show')); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, '308-yt-edit-dark.png') });
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
