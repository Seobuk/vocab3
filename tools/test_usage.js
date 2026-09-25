// v2.13 사용 기록: 앱이 화면에 떠 있는 시간을 날짜·기능별로 쌓고(내려가면 멈춤) 통계에 보여 준다. 시계는 Playwright clock 으로 빨리 감는다.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-09-25T10:00:00') });
  await p.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { value: { speak: () => {}, cancel: () => {}, getVoices: () => [] } }); });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; s.usage = { 'bad-key': { t: 5 }, '2026-09-20': { t: '600000', f: { study: 600000 } } }; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  const U = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__vocab.state().usage)));
  const day = async () => (await U())['2026-09-25'] || { t: 0, f: {}, c: {} };
  eq('예전·이상한 기록 정리 (날짜 아닌 키 삭제, 숫자로)', JSON.stringify(await p.evaluate(() => { const u = window.__vocab.state().usage; return [Object.keys(u).filter(k => k !== '2026-09-25'), u['2026-09-20'].t, typeof u['2026-09-20'].c]; })), JSON.stringify([['2026-09-20'], 600000, 'object']));

  // 홈 1분 → 홈·기타
  await p.clock.runFor(60000);
  let d = await day();
  eq('홈 1분 = 홈·단어장·설정', Math.round((d.f.etc || 0) / 1000), 60);

  // 졸업 단어 만들고 문장 공부 2분 → 문장 공부, 문장 2개 판정
  await p.evaluate(() => { const s = window.__vocab.state(); s.words.slice(0, 6).forEach(w => { w.stage = 4; }); window.__vocab.save(); });
  await p.evaluate(() => window.__vocab.go('home')); await p.waitForTimeout(100);
  await p.click('.review-btn[data-action="sent"]');
  await p.clock.runFor(120000);
  await p.click('[data-action="sent-judge"][data-easy="1"]'); await p.clock.runFor(400);
  await p.click('[data-action="sent-judge"][data-easy="0"]'); await p.clock.runFor(400);
  await p.click('[data-action="sent-undo"]'); await p.clock.runFor(400);
  await p.click('[data-action="sent-judge"][data-easy="0"]'); await p.clock.runFor(400);
  d = await day();
  eq('문장 공부 약 2분 · 문장 2개 (되돌리기는 빼고)', Math.round((d.f.sent || 0) / 60000) + ' ' + d.c.sent, '2 2');

  // 앱이 내려가 있던 5분은 안 셈
  await p.evaluate(() => window.onAppPause());   // 내려가는 순간 그때까지 쓴 시간은 들어간다
  const before = (await day()).t;
  await p.clock.runFor(300000);
  eq('앱이 내려간 5분은 안 셈', Math.round(((await day()).t - before) / 1000), 0);
  await p.evaluate(() => window.onAppResume());
  await p.clock.runFor(30000);
  await p.evaluate(() => window.__appBack()); await p.clock.runFor(200);   // 화면이 바뀔 때 마지막 틱 뒤 시간까지 들어간다
  eq('돌아오면 다시 셈 (문장 공부 화면 30초)', Math.round(((await day()).t - before) / 1000), 30);

  // 통계 화면
  await p.click('#tabbar [data-tab="stats"]'); await p.clock.runFor(300);
  eq('타일: 오늘 사용 · 7일 평균', await p.$$eval('#view-stats .tile', t => t.slice(4).map(e => e.textContent).join(' / ')), '4분오늘 앱 사용 / 2분최근 7일 하루 평균');
  eq('최근 14일 막대 14개 · 오늘이 골라져 있음', await p.$$eval('#view-stats .bar-col[data-action="use-day"]', x => x.length + ' ' + x.filter(e => e.classList.contains('sel')).map(e => e.getAttribute('data-d')).join()), '14 2026-09-25');
  eq('오늘 기능별 (정해진 순서)', await p.$$eval('#useDay .srow .sl', x => x.map(e => e.textContent).join(',')), '문장 공부,홈·단어장·설정');
  eq('횟수 줄', await p.textContent('#useDay .use-c'), '문장 공부 2문장');
  await p.screenshot({ path: OUT + '/330-usage.png', fullPage: true });
  await p.click('#view-stats .bar-col[data-d="2026-09-20"]'); await p.clock.runFor(200);
  eq('다른 날 막대를 누르면 그날 기능별', await p.textContent('#useDay .cb-title') + ' | ' + await p.$$eval('#useDay .srow .sl', x => x.map(e => e.textContent).join(',')), '9월 20일 기능별 10분 | 단어 학습');
  await p.click('#view-stats .bar-col[data-d="2026-09-22"]'); await p.clock.runFor(200);
  eq('기록 없는 날을 누르면 그날 · 없다는 안내', await p.textContent('#useDay .cb-title') + ' | ' + await p.textContent('#useDay .empty'), '9월 22일 기능별 0분 | 이날은 기록이 없어요');
  eq('저장됨', await p.evaluate(() => { window.__vocab.save(); return JSON.parse(localStorage.getItem('vocab3.state.v1')).usage['2026-09-25'].c.sent; }), 2);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
