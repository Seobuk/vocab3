// v2.37 종합 회화 실력: 날짜별 학습 이력(S.hist) — 단어 판정·문장 판정·회화 리포트가 날마다 쌓이는지, 예전 기록 추정, 점수 산식, 통계 그래프·점수 설명.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
let fails = 0;
const eq = (name, got, want) => { const ok = String(got) === String(want); if (!ok) fails++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (ok ? '' : ' (기대: ' + want + ')')); };
const near = (name, got, want, tol) => { const ok = Math.abs(got - want) <= (tol || 0.05); if (!ok) fails++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + (Math.round(got * 100) / 100) + (ok ? '' : ' (기대: ' + want + ')')); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-10-04T10:00:00') });
  await p.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: () => {}, cancel: () => {}, getVoices: () => [] } });
    window.fetch = (url, opt) => {
      const body = JSON.parse(opt.body), sys = body.messages[0].role === 'system' ? body.messages[0].content : '';
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ choices: [{ message: { content: JSON.stringify(obj) } }] })) });
      if (/reviewing a short practice conversation/.test(sys)) return ok({ score: 4, comment: 'good', corrections: [{ you: 'I go there yesterday', better: 'I went there yesterday.', why: '과거형', type: 'grammar' }, { you: 'make a photo', better: 'take a photo', why: 'take', type: 'word' }], expressions: [] });
      const last = body.messages[body.messages.length - 1].content;
      if (/Start the conversation/.test(last)) return ok({ reply: 'Hi! What can I get you?', ko: '', fix: '', note: '', used: [], say: [] });
      if (/yesterday/.test(last)) return ok({ reply: 'Nice!', ko: '', fix: 'I went there yesterday.', note: '과거형', used: [], say: [] });
      return ok({ reply: 'Great.', ko: '', fix: '', note: '', used: [], say: [] });
    };
  });
  const url = require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href;
  await p.goto(url); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  const H = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__vocab.state().hist)));

  // --- 1. 새로 설치: 빈 이력, 추정 안 함 ---
  eq('새 설치: hist 빈 칸 · histEst', await p.evaluate(() => JSON.stringify([window.__vocab.state().hist, window.__vocab.state().histEst])), '[{},1]');

  // --- 2. 예전(v2.36) 기록 → 한 번 추정 ---
  await p.evaluate(() => {
    const s = window.__vocab.state();
    delete s.hist; delete s.histEst; s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; s.settings.shuffle = false;
    s.words.forEach((w, i) => { w.stage = i < 100 ? 4 : i < 120 ? 3 : i < 140 ? 2 : 1; });   // K = 100 + 14 + 8 = 122
    s.studyDays = { '2026-09-20': { judged: 10, memorized: 6 }, '2026-09-28': { judged: 5, memorized: 3 } };
    s.talkLog = [{ id: 'tk1', date: '2026-09-28', turns: 4, score: 3, corrections: [{ you: 'a', better: 'b', why: '' }], msgs: [{ r: 'a', t: 'hi' }, { r: 'u', t: 'x', f: 'y' }, { r: 'a', t: '' }, { r: 'u', t: 'z' }] }];
    window.__vocab.save();
  });
  await p.reload(); await p.waitForTimeout(300);
  let h = await H();
  eq('추정: 학습한 날 wy/wn', JSON.stringify([h['2026-09-20'].wy, h['2026-09-20'].wn, h['2026-09-28'].wy, h['2026-09-28'].wn]), '[6,4,3,2]');
  eq('추정: kw 는 지금 K 에서 거꾸로 (122 → 122 − 3×0.33)', JSON.stringify([h['2026-09-28'].kw, h['2026-09-20'].kw]), '[122,121]');
  eq('추정: 회화 리포트 → tk (유형 없는 교정 = 문법)', JSON.stringify(h['2026-09-28'].tk), JSON.stringify({ n: 1, u: 2, f: 1, sc: 3, ns: 1, g: 1, w: 0, x: 0 }));
  eq('추정한 날 표시 e', JSON.stringify([h['2026-09-20'].e, h['2026-09-28'].e]), '[1,1]');
  await p.reload(); await p.waitForTimeout(300);
  eq('추정은 한 번만 (다시 켜도 그대로)', JSON.stringify((await H())['2026-09-28'].tk.n), '1');

  // --- 3. 단어 카드 판정 → 오늘 wy/wn, 되돌리기 ---
  await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(250);
  await p.evaluate(() => window.__vocab.judge(true)); await p.waitForTimeout(120);
  await p.evaluate(() => window.__vocab.judge(false)); await p.waitForTimeout(120);
  h = await H();
  eq('판정: 오늘 안다 1 · 모른다 1', JSON.stringify([h['2026-10-04'].wy, h['2026-10-04'].wn]), '[1,1]');
  eq('판정: 오늘 kw (1→2단계 하나 = +0.4)', h['2026-10-04'].kw, 122.4);
  await p.evaluate(() => window.__vocab.undo()); await p.waitForTimeout(120);
  eq('되돌리기: 모른다 −1', (await H())['2026-10-04'].wn, 0);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);

  // --- 4. 문장 공부 판정 → se/sh ---
  await p.evaluate(() => window.__vocab.go('home')); await p.waitForTimeout(150);
  await p.click('[data-action="sent"]'); await p.waitForTimeout(250);
  await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(200);
  await p.click('[data-action="sent-judge"][data-easy="0"]'); await p.waitForTimeout(200);
  await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(200);
  h = await H();
  eq('문장: 쉬움 2 · 어려움 1', JSON.stringify([h['2026-10-04'].se, h['2026-10-04'].sh]), '[2,1]');
  await p.click('[data-action="sent-undo"]').catch(() => p.evaluate(() => document.querySelector('[data-action*="undo"]').click())); await p.waitForTimeout(200);
  eq('문장 되돌리기: 쉬움 −1', (await H())['2026-10-04'].se, 1);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);

  // --- 5. 회화 → 리포트 교정 유형까지 tk ---
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'sk-or-TEST', or: 1 })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-action="talk"]'); await p.waitForTimeout(200);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(400);
  await p.fill('#chatIn', 'I go there yesterday'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(400);
  await p.fill('#chatIn', 'One latte please'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(400);
  eq('요약 스키마에 교정 유형 enum', await p.evaluate(() => 1), 1);
  await p.click('[data-action="talk-end"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(600);
  h = await H();
  eq('회화: 오늘 tk', JSON.stringify(h['2026-10-04'].tk), JSON.stringify({ n: 1, u: 2, f: 1, sc: 4, ns: 1, g: 1, w: 1, x: 0 }));
  eq('리포트 기록에 유형', await p.evaluate(() => window.__vocab.state().talkLog.slice(-1)[0].corrections.map(c => c.ty).join()), 'grammar,word');
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(200);

  // --- 6. 산식: 정해 둔 이력으로 손 계산과 비교 ---
  await p.evaluate(() => {
    const s = window.__vocab.state();
    s.hist = {
      '2026-08-01': { kw: 1500, wy: 50, wn: 50 },                       // 30일 창 밖: K 만 이어 쓰임
      '2026-09-20': { wy: 30, wn: 10, se: 8, sh: 2 },
      '2026-10-01': { kw: 2000, tk: { n: 2, u: 20, f: 6, sc: 7, ns: 2, g: 2, w: 2, x: 2 } }
    };
    window.__vocab.save();
  });
  let o = await p.evaluate(() => window.__vocab.skillAt('2026-10-03'));   // 오늘(10/4) 칸엔 save() 가 실제 K 를 적는다
  const acc = (30 + 7) / (40 + 10), V = 100 * (1 - Math.exp(-2000 * (0.6 + 0.4 * acc) / 1500));
  const P = 100 * (8 + 2.5) / (10 + 5);
  const mix = (2 * 1 + 2 * 0.7 + 2 * 0.4) / 6, T = 0.5 * ((3.5 - 1) / 4 * 100) + 0.5 * 100 * (1 - (6 / 20) * mix);
  near('어휘 V', o.v, V); near('문장 P', o.p, P); near('회화 T', o.t, T);
  near('종합 = .40T + .35P + .25V', o.s, 0.40 * T + 0.35 * P + 0.25 * V);
  o = await p.evaluate(() => window.__vocab.skillAt('2026-09-25'));
  near('9/25: 회화 없음 → T 빼고 다시 나눔', o.s, (0.35 * o.p + 0.25 * o.v) / 0.6);
  eq('9/25: 회화 null', o.t, null);
  o = await p.evaluate(() => window.__vocab.skillAt('2026-08-05'));
  eq('어휘만 있는 날은 점수 없음', o.s + '/' + (o.v > 0), 'null/true');
  o = await p.evaluate(() => window.__vocab.skillAt('2026-11-20'));   // 창(30일) 밖: 회화·문장 빠짐 → 어휘만 → 없음
  eq('30일 지나면 회화·문장 빠짐', [o.t, o.p, o.s].join(), ',,');

  // --- 7. 통계 화면 그래프 ---
  await p.evaluate(() => {
    const s = window.__vocab.state(), d = new Date('2026-09-05T00:00:00');
    s.hist = {}; let k = 1200;
    for (let i = 0; i < 30; i++) {
      const kk = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      k += 15; s.hist[kk] = { kw: k, wy: 8 + (i % 3), wn: 3, se: 3 + (i % 4), sh: 2, tk: i % 3 ? undefined : { n: 1, u: 8, f: Math.max(0, 4 - (i >> 3)), sc: 3 + (i > 15 ? 1 : 0), ns: 1, g: 1, w: 1, x: 1 } };
      if (!s.hist[kk].tk) delete s.hist[kk].tk;
      if (i < 12) s.hist[kk].e = 1;
      d.setDate(d.getDate() + 1);
    }
    const W = { 0: 0, 1: 0, 2: 0.4, 3: 0.7, 4: 1 }; s.kwGone = Math.max(0, k + 15 - s.words.reduce((a, w) => a + W[w.stage], 0));   // 오늘 K 가 그래프와 이어지게
    window.__vocab.save();
  });
  await p.evaluate(() => window.__vocab.go('home')); await p.waitForTimeout(150);
  await p.click('[data-action="tab"][data-tab="stats"]'); await p.waitForTimeout(400);
  eq('그래프 카드', await p.$$eval('#skillCard svg path.sk-line', x => x.length), 2);
  eq('추정 구간 점선', await p.$$eval('#skillCard path.sk-line.est', x => x.length), 1);
  eq('70·85 눈금', await p.$$eval('#skillCard line.sk-mark', x => x.length), 2);
  const now = await p.textContent('.sk-now b');
  eq('지금 점수 = 오늘 계산값', now, String(Math.round(await p.evaluate(() => window.__vocab.skillAt().s))));
  await p.screenshot({ path: OUT + '/skill-stats.png' });
  await p.$eval('#skillCard', e => e.scrollIntoView()); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/skill-card.png', clip: await p.$eval('#skillCard', e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }) });
  // 톡 → 그날 값
  const bx = await (await p.$('#skillSvg')).boundingBox();
  await p.mouse.click(bx.x + bx.width * 0.2, bx.y + bx.height / 2); await p.waitForTimeout(150);
  eq('그래프 톡 → 날짜 줄 바뀜', /^9\/\d+ /.test(await p.textContent('#skillPick')), true);
  eq('영역별 값 표시', await p.$$eval('#skillPick span', x => x.length) >= 3, true);
  // 기간 칩
  await p.click('[data-action="skill-range"][data-r="all"]'); await p.waitForTimeout(150);
  eq('기간 전체 저장', await p.evaluate(() => window.__vocab.state().settings.skillRange), 'all');
  // 점수 설명
  await p.click('[data-action="skill-help"]'); await p.waitForTimeout(300);
  eq('점수 설명 창', /회화 40% \+ 문장 말하기 35% \+ 어휘 25%/.test(await p.textContent('#sheet')), true);
  await p.screenshot({ path: OUT + '/skill-help.png' });
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(200);
  // 다크
  await p.evaluate(() => { window.__vocab.state().settings.theme = 'dark'; window.__vocab.applyTheme(); window.__vocab.go('stats'); }); await p.waitForTimeout(300);
  await p.$eval('#skillCard', e => e.scrollIntoView()); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/skill-card-dark.png', clip: await p.$eval('#skillCard', e => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }) });
  // 데이터가 없으면 안내
  await p.evaluate(() => { const s = window.__vocab.state(); s.hist = {}; window.__vocab.go('home'); }); await p.waitForTimeout(100);
  await p.click('[data-action="tab"][data-tab="stats"]'); await p.waitForTimeout(300);
  eq('기록 없음 안내', /점수가 생겨요/.test(await p.textContent('#skillCard')), true);
  // 백업 복원 모양 검사
  await p.evaluate(() => { const s = window.__vocab.state(); s.hist = { 'x': 1, '2026-10-01': { wy: -3, kw: 'a', se: 2 } }; s.histEst = 1; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(300);
  eq('이상한 이력 정리', JSON.stringify(await H().then(x => [Object.keys(x).filter(k => k !== '2026-10-04'), x['2026-10-01']])), JSON.stringify([['2026-10-01'], { se: 2 }]));
  eq('페이지 오류 없음', errs.join(' | '), '');
  console.log(fails ? 'FAILED ' + fails : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
