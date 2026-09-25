// v2.25 단어장: 정렬(기본 · 많이 틀린 순 · 적게 틀린 순 · 랜덤) · 졸업 탭에 담은 유튜브 문장 · 오른쪽 정보(틀림/맞음 · 문장 공부 · 마지막) · 예문 한 번 톡 = 읽기, 두 번 톡 = 한글 보이기/가리기
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.addInitScript(() => {
    window.__spoken = [];
    Object.defineProperty(window, 'speechSynthesis', { value: { speak: u => window.__spoken.push(u.text), cancel: () => {}, getVoices: () => [] } });
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  // 졸업 단어 5개(틀림·맞음 다르게) + 담은 문장 2개
  await p.evaluate(() => {
    const s = window.__vocab.state(), now = Date.now(); s.settings.themeRandom = false; s.settings.colorTheme = 'forest';
    const wr = [3, 0, 7, 1, 3], ri = [5, 2, 1, 9, 1];
    s.words.slice(0, 5).forEach((w, i) => { w.stage = 4; w.stageAt = now - i * 1000; w.wrong = wr[i]; w.right = ri[i]; w.seen = wr[i] + ri[i]; w.lastSeen = now - i * 3 * 86400000; });
    s.words[0].sh = 2; s.words[0].se = 4;
    s.sentBox = [
      { id: 'sb1', e: 'Let me walk you through the plan.', k: '계획을 차근차근 설명해 줄게요.', vid: 'NOVIDEO0001', title: 'Box Talk', s: 12, at: now - 500, sh: 9, se: 0 },
      { id: 'sb2', e: 'That sounds like a great idea.', k: '좋은 생각 같아요.', vid: 'NOVIDEO0001', title: 'Box Talk', s: 30, at: now - 99999 }
    ];
    window.__vocab.save();
  });
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(200);
  await p.evaluate(() => window.__vocab.go('list', { stage: 4 })); await p.waitForTimeout(300);
  const words = () => p.$$eval('#listBody .item', x => x.map(e => (e.querySelector('.it-w') || e.querySelector('.it-e')).textContent.trim()));
  const W = await p.evaluate(() => window.__vocab.state().words.slice(0, 5).map(w => w.w));

  eq('졸업 탭 수에 담은 문장 +2', await p.$eval('.seg button.on small', e => e.textContent), '5+2');
  eq('졸업 탭: 단어 5 + 담은 문장 2', (await p.$$eval('#listBody .item', x => x.length)) + ' ' + await p.$$eval('#listBody .it-tag', x => x.filter(e => e.textContent === '담은 문장').length), '7 2');
  eq('기본 정렬: 최근 순 — 단어(방금 졸업) · 담은 문장(0.5초 전) 섞여서', (await words()).slice(0, 2).join(' | '), W[0] + ' | Let me walk you through the plan.');
  // 오른쪽 정보
  const side0 = await p.$eval('#listBody .item[data-id="' + (await p.evaluate(() => window.__vocab.state().words[0].id)) + '"] .it-side', e => e.textContent);
  eq('오른쪽: 졸업 · ✗3 ✓5 · 문장 ▼2 ▲4 · 방금', side0, '졸업✗3 ✓5▼2 ▲4방금');
  eq('담은 문장 오른쪽: 담은 문장 · ▼9 ▲0', await p.$eval('#listBody .item[data-id="sb1"] .it-side', e => e.textContent), '담은 문장▼9 ▲0');
  await p.screenshot({ path: OUT + '/370-list-grad.png' });
  // 정렬
  await p.click('[data-action="list-sort"][data-v="wrong"]'); await p.waitForTimeout(150);
  eq('많이 틀린 순: 문장 ▼9 → 단어 ✗7 → ✗3(맞음 1) → ✗3(맞음 5)', (await words()).slice(0, 4).join(' | '), ['Let me walk you through the plan.', W[2], W[4], W[0]].join(' | '));
  await p.click('[data-action="list-sort"][data-v="wrongAsc"]'); await p.waitForTimeout(150);
  eq('적게 틀린 순: ✗0(담은 문장 sb2 맞음 0 · 단어 맞음 2 중 맞음 많은 쪽 먼저)', (await words()).slice(0, 2).join(' | '), [W[1], 'That sounds like a great idea.'].join(' | '));
  eq('정렬은 설정에 남음', await p.evaluate(() => window.__vocab.state().settings.listSort), 'wrongAsc');
  // 랜덤: 전체 탭(단어 많음) — 누를 때마다 새로, 검색 글자 칠 땐 그대로
  await p.click('.seg button[data-stage="all"]'); await p.waitForTimeout(150);
  await p.click('[data-action="list-sort"][data-v="rand"]'); await p.waitForTimeout(150);
  const r1 = (await words()).join('|');
  await p.fill('#q', 'a'); await p.waitForTimeout(100); await p.fill('#q', ''); await p.waitForTimeout(150);
  eq('랜덤: 검색을 쳤다 지워도 순서 그대로', (await words()).join('|') === r1, true);
  await p.click('[data-action="list-sort"][data-v="rand"]'); await p.waitForTimeout(150);
  eq('랜덤 ↻ 다시 누르면 새로 섞임', (await words()).join('|') !== r1, true);
  eq('랜덤 버튼에 ↻ 표시', await p.textContent('[data-action="list-sort"][data-v="rand"]'), '랜덤 ↻');
  await p.click('[data-action="list-sort"][data-v="base"]'); await p.waitForTimeout(100);
  // 예문: 한 번 톡 = 읽기(시트 안 열림) · 두 번 톡 = 한글 보이기 · 다시 두 번 = 가리기
  await p.click('.seg button[data-stage="4"]'); await p.waitForTimeout(150);
  const wid = await p.evaluate(() => window.__vocab.state().words[0].id), we = await p.evaluate(() => window.__vocab.state().words[0].e);
  const kHid = () => p.$eval('#listBody .item[data-id="' + wid + '"] .it-k', e => e.classList.contains('hid'));
  eq('한글 해석은 처음엔 가려짐', await kHid(), true);
  await p.click('#listBody .item[data-id="' + wid + '"] .it-e'); await p.waitForTimeout(500);
  eq('한 번 톡 = 예문 읽기 · 단어 시트 안 열림', (await p.evaluate(() => window.__spoken.slice(-1)[0])) === we && !(await p.evaluate(() => document.querySelector('#sheet') && document.querySelector('#sheet').classList.contains('show'))), true);
  await p.dblclick('#listBody .item[data-id="' + wid + '"] .it-e'); await p.waitForTimeout(150);
  eq('두 번 톡 = 한글 보임', await kHid(), false);
  await p.waitForTimeout(500); await p.dblclick('#listBody .item[data-id="' + wid + '"] .it-k'); await p.waitForTimeout(150);
  eq('다시 두 번 톡 = 가림', await kHid(), true);
  await p.screenshot({ path: OUT + '/371-list-ex.png' });
  // 단어 줄(예문 밖)을 누르면 예전처럼 단어 시트
  await p.click('#listBody .item[data-id="' + wid + '"] .it-w'); await p.waitForTimeout(300);
  eq('단어를 누르면 단어 시트', await p.$$eval('#sheet [data-action="stage-set"], #sheet .sh-word', x => x.length > 0), true);
  await p.evaluate(() => { const o = document.getElementById('overlay'); if (o) o.click(); }); await p.waitForTimeout(300);
  // 담은 문장 시트 → 빼기
  await p.click('#listBody .item[data-id="sb2"] .it-src'); await p.waitForTimeout(300);
  eq('담은 문장 시트: 출처·담은 날·문장 공부 기록', /Box Talk · 0:30/.test(await p.textContent('#sheet')) + ' ' + /어려움 0 · 쉬움 0/.test(await p.textContent('#sheet')), 'true true');
  await p.click('#sheet [data-action="list-sent-drop"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(300);
  eq('빼면 목록·저장에서 사라짐 (+1)', (await p.evaluate(() => window.__vocab.state().sentBox.map(x => x.id).join())) + ' ' + await p.$eval('.seg button.on small', e => e.textContent), 'sb1 5+1');
  eq('★ 필터 켜면 담은 문장은 안 나옴', await p.evaluate(() => { const s = window.__vocab.state(); s.words[0].star = true; return true; }) && (await p.click('[data-action="list-star"]'), await p.waitForTimeout(150), await p.$$eval('#listBody .item[data-id="sb1"]', x => x.length)), 0);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
