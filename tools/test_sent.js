// v2.12 영어 문장 공부: 졸업한 단어의 예문 — 한글 먼저 → 탭하면 영어가 보이며 읽어 줌 → ▲ 쉬움 / ▼ 어려움 으로 가중치를 쌓아 계속 꺼낸다.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__spoken = [];
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__spoken.push(u.text), cancel: () => {}, getVoices: () => [] } });
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  const btn = () => p.$eval('.review-btn[data-action="sent"]', e => e.querySelector('.rb-n').textContent + ' ' + e.disabled);
  eq('졸업 단어가 없으면 버튼 꺼짐', await btn(), '0 true');

  // 기본 단어 6개를 졸업으로, 1개는 3단계(대상 아님), 1개는 졸업이지만 해석 없음(대상 아님)
  await p.evaluate(() => {
    const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky';
    s.words.slice(0, 6).forEach(w => { w.stage = 4; });
    s.words[6].stage = 3; s.words[6].sw = 20;
    s.words[7].stage = 4; s.words[7].k = '';
    window.__vocab.save();
  });
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  eq('홈: 졸업 + 예문·해석 있는 단어 수', await btn(), '6 false');
  const ids = await p.evaluate(() => window.__vocab.state().words.slice(0, 8).map(w => w.id));

  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  eq('문장 공부 화면', await p.evaluate(() => document.querySelector('.view.active').id), 'view-sent');
  const cur = () => p.evaluate(() => { const k = document.querySelector('#sentArea .ko-big').textContent; return window.__vocab.state().words.find(w => w.k === k); });
  let w = await cur();
  eq('한글 문장이 먼저 · 영어는 가려짐', (ids.slice(0, 6).includes(w.id)) + ' ' + await p.getAttribute('#sentArea .reveal', 'data-step') + ' ' + await p.$eval('#sentArea .reveal .content', e => getComputedStyle(e).filter), 'true 0 blur(7px)');
  await p.click('#sentArea .card .plain'); await p.waitForTimeout(150);
  eq('탭하면 영어가 보이면서 읽어 줌', await p.getAttribute('#sentArea .reveal', 'data-step') + ' ' + JSON.stringify(await p.evaluate(() => window.__spoken)), '1 ' + JSON.stringify([w.e]));
  await p.click('#sentArea .card .plain'); await p.waitForTimeout(100);
  eq('한 번 더 탭하면 다시 읽기', await p.evaluate(() => window.__spoken.length), 2);
  await p.screenshot({ path: OUT + '/320-sent.png' });

  // --- ▲ 쉬움 (버튼) → 가중치 3−1, 다음 문장 ---
  await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(400);
  let w1 = await p.evaluate(id => window.__vocab.state().words.find(x => x.id === id), w.id);
  const w2 = await cur();
  eq('쉬움: 가중치 2 · 쉬움 1회 · 다음은 다른 문장 · 새 카드는 다시 가려짐', w1.sw + ' ' + w1.se + ' ' + (w2.id !== w.id) + ' ' + await p.getAttribute('#sentArea .reveal', 'data-step'), '2 1 true 0');
  eq('센 문장 수', await p.textContent('#sentCount'), '1문장');

  // --- 아래로 밀기 = 어려움 → 가중치 3+2 ---
  const c = await p.$eval('#sentArea .card', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x, c.y + 60, { steps: 4 }); await p.mouse.move(c.x, c.y + 200, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
  let w2b = await p.evaluate(id => window.__vocab.state().words.find(x => x.id === id), w2.id);
  eq('아래로 밀면 어려움: 가중치 5 · 어려움 1회', w2b.sw + ' ' + w2b.sh, '5 1');
  // --- 되돌리기 ---
  await p.click('[data-action="sent-undo"]'); await p.waitForTimeout(400);
  w2b = await p.evaluate(id => window.__vocab.state().words.find(x => x.id === id), w2.id);
  eq('되돌리기 = 그 문장으로 · 가중치·횟수 원래대로', ((await cur()).id === w2.id) + ' ' + w2b.sw + ' ' + w2b.sh + ' ' + await p.textContent('#sentCount'), 'true undefined undefined 1문장');
  // --- 위로 밀기 = 쉬움 ---
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x, c.y - 60, { steps: 4 }); await p.mouse.move(c.x, c.y - 200, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
  w2b = await p.evaluate(id => window.__vocab.state().words.find(x => x.id === id), w2.id);
  eq('위로 밀면 쉬움: 가중치 2 · 쉬움 1회', w2b.sw + ' ' + w2b.se, '2 1');

  // --- 계속 꺼내기: 방금 본 3문장은 바로 다시 안 나옴, 대상 아닌 단어는 절대 안 나옴 ---
  const seq = [(await cur()).id];
  for (let i = 0; i < 12; i++) { await p.click('[data-action="sent-judge"][data-easy="' + (i % 2) + '"]'); await p.waitForTimeout(330); seq.push((await cur()).id); }
  const rep = seq.some((id, i) => seq.slice(Math.max(0, i - 3), i).includes(id));
  eq('13문장 연속 · 최근 3문장 안에서 반복 없음 · 대상만', seq.length + ' ' + !rep + ' ' + seq.every(id => ids.slice(0, 6).includes(id)), '13 true true');
  eq('가중치·횟수는 저장됨', await p.evaluate(id => { window.__vocab.save(); const x = JSON.parse(localStorage.getItem('vocab3.state.v1')).words.find(w => w.id === id); return typeof x.sw + ' ' + (x.se + (x.sh || 0) >= 1); }, w.id), 'number true');
  // --- 한계: 쉬움은 1 아래로, 어려움은 20 위로 안 감 ---
  await p.evaluate(() => { const k = document.querySelector('#sentArea .ko-big').textContent; window.__vocab.state().words.find(w => w.k === k).sw = 1; });
  const lo = await cur(); await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(350);
  await p.evaluate(() => { const k = document.querySelector('#sentArea .ko-big').textContent; window.__vocab.state().words.find(w => w.k === k).sw = 20; });
  const hi = await cur(); await p.click('[data-action="sent-judge"][data-easy="0"]'); await p.waitForTimeout(350);
  eq('가중치 한계: 쉬움은 1 아래로, 어려움은 20 위로 안 감', await p.evaluate(a => { const ws = window.__vocab.state().words; return [ws.find(w => w.id === a[0]).sw, ws.find(w => w.id === a[1]).sw].join(); }, [lo.id, hi.id]), '1,20');

  // --- 가중치 비례: 20 vs 1×5 → 약 80% ---
  const freq = await p.evaluate(ids => {
    const s = window.__vocab.state(); s.words.slice(0, 6).forEach((w, i) => { w.sw = i === 0 ? 20 : 1; w.sa = w.sa || 1; });   // 모두 한 번 본 것으로 — 새 문장 섞기(v2.30)는 아래에서 따로
    let n = 0; for (let i = 0; i < 4000; i++) if (window.__vocab.sentPick([]).id === ids[0]) n++;
    return n / 4000;
  }, ids);
  eq('어려운 문장(가중치 20)이 쉬운 것(1)보다 훨씬 자주 (기대 0.8)', freq > 0.75 && freq < 0.85, true);
  // --- 접근성 클릭(포인터 없이 click)으로도 영어 보기 ---
  await p.evaluate(() => document.querySelector('#sentArea .reveal').click()); await p.waitForTimeout(100);
  eq('포인터 없는 click(TalkBack 등)으로도 영어 공개', await p.getAttribute('#sentArea .reveal', 'data-step'), '1');

  // --- 문장이 적을 때(4개)도 가중치가 먹음: 어려운 1개(20) vs 쉬운 3개(1) ---
  await p.evaluate(ids => { const s = window.__vocab.state(); s.words.slice(0, 6).forEach((w, i) => { w.stage = i < 4 ? 4 : 3; w.sw = i === 0 ? 20 : 1; }); }, ids);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(250);
  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  const seq4 = [];
  for (let i = 0; i < 40; i++) { const id = (await cur()).id; seq4.push(id); await p.click('[data-action="sent-judge"][data-easy="' + (id === ids[0] ? 0 : 1) + '"]'); await p.waitForTimeout(260); }
  const share = seq4.filter(id => id === ids[0]).length / seq4.length, cyc = seq4.slice(8).every((id, i) => id === seq4[4 + i]);
  eq('4문장이어도 어려운 문장이 더 자주 (고정 순서 아님)', (share > 0.28) + ' ' + !cyc, 'true true');
  // --- 되돌리기 뒤 다시 판정하면 판정 안 한 카드가 나옴 (2문장) ---
  await p.evaluate(ids => { const s = window.__vocab.state(); s.words.slice(0, 6).forEach((w, i) => { w.stage = i < 2 ? 4 : 3; w.sw = 3; }); }, ids);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(250);
  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  const a0 = (await cur()).id;
  await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(350);
  await p.click('[data-action="sent-undo"]'); await p.waitForTimeout(350);
  await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(350);
  eq('되돌리기 → 다시 판정하면 다른 문장 (방금 문장 반복 안 함)', (await cur()).id !== a0, true);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  eq('닫으면 홈', await p.evaluate(() => document.querySelector('.view.active').id), 'view-home');
  // --- v2.30 새 문장 섞기: 세 장마다 한 번은 한 번도 안 본 문장 · 유튜브 문장 제안 → 판정하면 담김 · 되돌리면 빠짐 ---
  await p.evaluate(() => {
    const s = window.__vocab.state();
    s.words.slice(0, 6).forEach((w, i) => { w.stage = 4; w.sa = i < 3 ? 1 : undefined; if (w.sa === undefined) delete w.sa; });
    s.sentBox = [];
    s.yt = [{ id: 'y1', vid: 'SUGGEST0001', title: 'Coffee Chat', date: '2026-09-26', addedAt: 1, tv: 3, mb: 1, sents: [
      { s: 1, t: 4, e: 'I usually grab a coffee before work.', k: '저는 보통 출근 전에 커피를 사요.', x: [] },
      { s: 5, t: 8, e: 'Yes.', k: '네.', x: [] },
      { s: 9, t: 13, e: 'It helps me wake up and focus.', k: '잠을 깨고 집중하는 데 도움이 돼요.', x: [] }
    ] }];
    window.__vocab.save();
  });
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(200);
  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  const seen = [];
  for (let i = 0; i < 12; i++) {
    seen.push(await p.evaluate(() => { const t = document.querySelector('#sentArea .card-top').textContent; return /새 문장 제안/.test(t) ? 'sug' : /처음/.test(t) ? 'new' : 'old'; }));
    await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(250);
  }
  eq('새 문장이 남아 있는 동안 세 장마다 한 번은 새 문장(처음·제안) · 모두 합쳐 5장', [2, 5].every(i => seen[i] !== 'old') + ' ' + seen.filter(x => x !== 'old').length, 'true 5');
  eq('제안 문장은 판정하면 문장 공부에 담김 (짧은 "Yes."는 제안 안 함)', await p.evaluate(() => window.__vocab.state().sentBox.map(x => x.e).filter(e => e === 'Yes.').length + ' ' + (window.__vocab.state().sentBox.length > 0)), '0 true');
  // 제안 카드가 나올 때까지 넘겨서 → 판정 → 되돌리기 → 다시 빠짐
  await p.evaluate(() => { const s = window.__vocab.state(); s.sentBox = []; s.words.forEach(w => { if (w.stage === 4) w.sa = 1; }); window.__vocab.save(); });
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(250);
  await p.click('.review-btn[data-action="sent"]'); await p.waitForTimeout(300);
  let tries = 0;
  while (tries++ < 9 && !(await p.evaluate(() => /새 문장 제안/.test(document.querySelector('#sentArea .card-top').textContent)))) { await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.waitForTimeout(250); }
  eq('모두 본 뒤엔 유튜브 제안이 나옴 (카드에 영상 제목)', /Coffee Chat/.test(await p.textContent('#sentArea')), true);
  await p.click('[data-action="sent-judge"][data-easy="0"]'); await p.waitForTimeout(300);
  eq('제안 판정 → 담김 (어려움 1)', await p.evaluate(() => { const b = window.__vocab.state().sentBox; return b.length + ' ' + (b[0] && b[0].sh); }), '1 1');
  await p.click('[data-action="sent-undo"]'); await p.waitForTimeout(300);
  eq('되돌리기 → 담은 게 빠지고 제안 카드로 돌아옴', (await p.evaluate(() => window.__vocab.state().sentBox.length)) + ' ' + /새 문장 제안/.test(await p.textContent('#sentArea .card-top')), '0 true');
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
