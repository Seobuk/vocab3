// v2.17 유튜브 문장 꾹 누르기 = 선택창: 문장 공부에 넣기 · 복사 · 앞/뒤와 합치기 · 쪼개기 · 되돌리기. 담은 문장은 영어 문장 공부에 섞여 나온다.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const SENTS = [
  { s: '00:00.5', t: '00:02.4', e: 'Hi everyone, welcome back.', k: '안녕하세요 여러분.', x: [] },
  { s: '00:03.0', t: '00:07.0', e: 'Today we will dig into why agents really matter.', k: '오늘은 에이전트가 왜 중요한지 파고들어요.', x: [{ q: 'dig into', w: 'dig into', p: 'phr.', m: '파고들다' }, { q: 'really matter', w: 'matter', p: 'v.', m: '중요하다' }] },
  { s: '00:07.8', t: '00:09.9', e: "Let's figure out the rest.", k: '나머지를 알아봐요.', x: [] }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.addInitScript(sents => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } });
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: () => {}, cancel: () => {}, getVoices: () => [] } });
    window.fetch = (url) => {
      if (/oembed/.test(url)) return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ title: 'Menu Talk' })) });
      return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(sents) }] } }] })) });
    };
    window.__yt = []; window.__ytT = 0; window.__ytState = -1;
    window.YT = { Player: function (el, o) {
      setTimeout(() => o.events.onReady({}), 0);
      this.seekTo = t => { window.__yt.push({ fn: 'seek', t }); window.__ytT = t; };
      this.playVideo = () => { window.__ytState = 1; }; this.pauseVideo = () => { window.__ytState = 2; };
      this.getCurrentTime = () => window.__ytT; this.getPlayerState = () => window.__ytState; this.getDuration = () => 60; this.destroy = () => {};
    } };
  }, SENTS);
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  const es = () => p.evaluate(() => window.__vocab.state().yt[0].sents.map(x => x.e));
  const toast = () => p.textContent('#toast');
  const hold = async sel => {
    const c = await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + 12, y: r.top + r.height / 2 }; });
    await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(250);
  };
  const menu = async i => { await hold('#ys' + i + ' .ys-e'); };

  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/MENUMENU001'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);

  // --- 선택창 ---
  await menu(0);
  eq('꾹 누르면 선택창: 문장·한글 + 5가지 · 첫 문장은 "앞과 합치기" 꺼짐', await p.textContent('#sheet .ym-e') + ' | ' + await p.$$eval('#sheet .yt-menu .btn', x => x.map(e => (e.disabled ? '-' : '+') + e.getAttribute('data-action')).join()), 'Hi everyone, welcome back. | +yt-m-study,+yt-m-copy,+yt-m-word,-yt-m-merge,+yt-m-merge,+yt-m-split');
  await p.screenshot({ path: OUT + '/350-yt-menu.png' });

  // --- 문장 공부에 넣기 ---
  await p.click('#sheet [data-action="yt-m-study"]'); await p.waitForTimeout(250);
  eq('문장 공부에 넣기 → 담김(영어·한글·영상·제목)', JSON.stringify(await p.evaluate(() => window.__vocab.state().sentBox.map(x => [x.e, x.k, x.vid, x.title]))), JSON.stringify([['Hi everyone, welcome back.', '안녕하세요 여러분.', 'MENUMENU001', 'Menu Talk']]));
  await menu(0);
  eq('두 번째엔 "담겨 있어요" (꺼짐)', await p.$eval('#sheet [data-action="yt-m-study"]', e => e.disabled + ' ' + e.textContent), 'true 문장 공부에 담겨 있어요');
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);

  // --- 뒤와 합치기 → 되돌리기 ---
  await menu(0); await p.click('#sheet [data-action="yt-m-merge"][data-d="1"]'); await p.waitForTimeout(250);
  eq('뒤와 합치기: 3 → 2문장', JSON.stringify(await es()), JSON.stringify(['Hi everyone, welcome back. Today we will dig into why agents really matter.', "Let's figure out the rest."]));
  eq('합친 문장 시간·한글 · 되돌리기 줄', JSON.stringify(await p.evaluate(() => { const x = window.__vocab.state().yt[0].sents[0]; return [x.s, x.t, x.k]; })) + ' | ' + await p.textContent('.yt-undo'), JSON.stringify([0.5, 7, '안녕하세요 여러분. 오늘은 에이전트가 왜 중요한지 파고들어요.']) + ' | ⤓ 문장을 합쳤어요 · 되돌리기');
  await p.click('.yt-undo [data-action="yt-undo"]'); await p.waitForTimeout(200);
  eq('되돌리기 → 원래 3문장 · 되돌리기 줄 사라짐', (await es()).length + ' ' + await p.$$eval('.yt-undo', x => x.length), '3 0');
  // --- 앞과 합치기 ---
  await menu(2); await p.click('#sheet [data-action="yt-m-merge"][data-d="-1"]'); await p.waitForTimeout(250);
  eq('앞과 합치기(3번째 → 2번째)', JSON.stringify((await es()).slice(1)), JSON.stringify(["Today we will dig into why agents really matter. Let's figure out the rest."]));
  await p.click('.yt-undo [data-action="yt-undo"]'); await p.waitForTimeout(200);

  // --- 쪼개기: ✂ → 단어 누르기 ---
  await menu(1); await p.click('#sheet [data-action="yt-m-split"]'); await p.waitForTimeout(250);
  eq('쪼개기 모드: 안내 줄', await p.textContent('#ys1 .yt-split-h'), '✂ 두 번째 문장이 시작될 단어를 누르세요 · 취소');
  await p.click('#ys1 .yw[data-t="1"]'); await p.waitForTimeout(200);   // 첫 단어 = 나눌 수 없음
  eq('첫 단어에선 안 나뉨 + 안내', (await es()).length + ' ' + /첫 단어 앞에서는/.test(await toast()), '3 true');
  const kWhy = await p.$eval('#ys1', row => { const w = [...row.querySelectorAll('.yw')].find(e => e.textContent === 'why'); return w.getAttribute('data-t'); });
  await p.click('#ys1 .yw[data-t="' + kWhy + '"]'); await p.waitForTimeout(250);
  const sp = await p.evaluate(() => window.__vocab.state().yt[0].sents.slice(1, 3).map(x => ({ s: x.s, t: x.t, e: x.e, k: x.k, x: x.x.map(g => g.q) })));
  eq('"why" 앞에서 나뉨: 영어 · 익힐 표현은 들어 있는 쪽으로 · 한글은 앞에', JSON.stringify(sp.map(x => [x.e, x.x.join(), x.k])), JSON.stringify([['Today we will dig into', 'dig into', '오늘은 에이전트가 왜 중요한지 파고들어요.'], ['why agents really matter.', 'really matter', '']]));
  eq('나누는 시간 = 글자 비율 어림 (3.0~7.0 사이) · 이어짐', sp[0].t > 3.2 && sp[0].t < 6.8 && sp[1].s === sp[0].t && sp[1].t === 7, true);
  eq('쪼갠 뒤 되돌리기 줄', await p.textContent('.yt-undo'), '✂ 문장을 쪼갰어요 · 되돌리기');
  await menu(1);
  eq('쪼갠 조각은 한글이 안 맞아 문장 공부에 못 담음', await p.$eval('#sheet [data-action="yt-m-study"]', e => e.disabled + ' ' + e.textContent), 'true 쪼갠 문장은 한글이 안 맞아 담을 수 없어요');
  await p.click('#sheet [data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.click('.yt-undo [data-action="yt-undo"]'); await p.waitForTimeout(200);
  eq('되돌리기 → 원래 문장 · 한글 표시 없음', (await es())[1] + ' ' + (await p.evaluate(() => !!window.__vocab.state().yt[0].sents[1].kp)), 'Today we will dig into why agents really matter. false');
  // 쪼갠 두 조각을 다시 합치면 한글 표시 풀림
  await menu(1); await p.click('#sheet [data-action="yt-m-split"]'); await p.waitForTimeout(250);
  await p.click('#ys1 .yw[data-t="' + kWhy + '"]'); await p.waitForTimeout(250);
  await menu(1); await p.click('#sheet [data-action="yt-m-merge"][data-d="1"]'); await p.waitForTimeout(250);
  eq('두 조각을 다시 합치면 한글 표시 풀림', JSON.stringify(await p.evaluate(() => { const x = window.__vocab.state().yt[0].sents[1]; return [x.e, !!x.kp, window.__vocab.state().yt[0].sents.length]; })), JSON.stringify(['Today we will dig into why agents really matter.', false, 3]));
  // 끝을 다음 문장 시작 뒤로 늘린 문장을 쪼개도 다음 문장 시작을 넘지 않음 (다시 열 때 다음 문장 앞이 잘리지 않게)
  await p.evaluate(() => { const x = window.__vocab.state().yt[0].sents[1]; x.t = 9.5; x.me = 1; });
  await menu(1); await p.click('#sheet [data-action="yt-m-split"]'); await p.waitForTimeout(250);
  const kMat = await p.$eval('#ys1', row => [...row.querySelectorAll('.yw')].find(e => e.textContent === 'matter').getAttribute('data-t'));
  await p.click('#ys1 .yw[data-t="' + kMat + '"]'); await p.waitForTimeout(250);
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  eq('다음 문장 시작 그대로(7.8) · 쪼갠 시간이 그 앞', await p.evaluate(() => { const ss = window.__vocab.state().yt[0].sents; return ss[3].s === 7.8 && ss[2].s <= 7.8 && ss[2].t === 9.5; }), true);
  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('[data-action="yt-open"]'); await p.waitForTimeout(300);
  eq('영상을 다시 열면 되돌리기 없음', await p.$$eval('.yt-undo', x => x.length), 0);
  await p.evaluate(() => { const ss = window.__vocab.state().yt[0].sents; ss.splice(1, 3, { s: 3, t: 7, e: 'Today we will dig into why agents really matter.', k: '오늘은 에이전트가 왜 중요한지 파고들어요.', x: [] }, { s: 7.8, t: 9.9, e: "Let's figure out the rest.", k: '나머지를 알아봐요.', x: [] }); window.__vocab.save(); });
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('[data-action="yt-open"]'); await p.waitForTimeout(300);
  // 쪼개기 취소 · 다른 문장을 누르면 취소
  await menu(1); await p.click('#sheet [data-action="yt-m-split"]'); await p.waitForTimeout(250);
  await p.click('#ys1 .yt-split-h [data-action="yt-split-cancel"]'); await p.waitForTimeout(150);
  eq('취소 → 쪼개기 모드 끝', await p.$$eval('#ys1.splitting', x => x.length), 0);
  await menu(1); await p.click('#sheet [data-action="yt-m-split"]'); await p.waitForTimeout(250);
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(150);
  eq('다른 문장을 누르면 쪼개기 취소 · 그 문장 재생', (await p.$$eval('.ys.splitting', x => x.length)) + ' ' + (await es()).length, '0 3');

  // --- v2.19 "📖 단어 뜻 보기" → 한 번 톡으로 뜻 (TalkBack 등) ---
  await menu(2); await p.click('#sheet [data-action="yt-m-word"]'); await p.waitForTimeout(250);
  eq('단어 고르기 안내', await p.textContent('#ys2 .yt-split-h'), '📖 뜻을 볼 단어를 누르세요 · 취소');
  await p.click('#ys2 .yw[data-t="3"]'); await p.waitForTimeout(250);
  eq('한 번 톡 = 그 단어 뜻 카드 · 모드 끝', (await p.$$eval('#ys2 .ycard', x => x.length)) + ' ' + (await p.$$eval('.ys.splitting', x => x.length)), '1 0');
  await p.click('#ys2 [data-action="yt-card-close"]'); await p.waitForTimeout(150);

  // --- 담은 문장이 영어 문장 공부에 나옴 (졸업 단어 없어도) · 빼기 ---
  await p.evaluate(() => window.__vocab.go('home')); await p.waitForTimeout(200);
  eq('홈: 문장 공부 = 담은 문장 1', await p.$eval('.review-btn[data-action="sent"]', e => e.querySelector('.rb-n').textContent + ' ' + e.disabled), '1 false');
  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  eq('카드: 한글 먼저 · 📺 유튜브 · 영상 제목 · 빼기', await p.textContent('#sentArea .ko-big') + ' | ' + await p.textContent('#sentArea .card-top') + ' | ' + await p.textContent('#sentArea .sent-w'), '안녕하세요 여러분. | 📺 유튜브처음 | 📺 Menu Talk 빼기');
  await p.click('[data-action="sent-judge"][data-easy="0"]'); await p.waitForTimeout(400);
  eq('어려움 → 담은 문장에 가중치', JSON.stringify(await p.evaluate(() => [window.__vocab.state().sentBox[0].sw, window.__vocab.state().sentBox[0].sh])), '[5,1]');
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  eq('다시 불러와도 담은 문장·가중치 유지', JSON.stringify(await p.evaluate(() => window.__vocab.state().sentBox.map(x => [x.e, x.sw]))), JSON.stringify([['Hi everyone, welcome back.', 5]]));
  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  await p.click('#sentArea .card .plain'); await p.waitForTimeout(150);   // 영어를 열어야 출처·빼기가 보인다
  await p.click('#sentArea [data-action="sent-drop"]'); await p.waitForTimeout(200);
  await p.click('#modal .btn.primary'); await p.waitForTimeout(300);
  eq('빼기 → 담은 문장 없음 · 문장이 없으니 홈으로', (await p.evaluate(() => window.__vocab.state().sentBox.length)) + ' ' + await p.evaluate(() => document.querySelector('.view.active').id), '0 view-home');
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
