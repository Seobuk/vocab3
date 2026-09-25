// UI screenshots + functional checks with Playwright (mobile viewport)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href;
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR',
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(300);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(300);

  const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
  const st = async () => page.evaluate(() => { const s = window.__vocab.state(); const c = {}; s.words.forEach(w => c[w.stage] = (c[w.stage] || 0) + 1); return { counts: c, last: s.lastDailyDate, days: s.studyDays }; });

  console.log('initial', JSON.stringify(await st()));
  await shot('01-home');

  // start stage-1 session
  await page.click('[data-action="start"][data-stage="1"]');
  await shot('02-card-front');
  await page.click('.reveal[data-reveal="m"]');
  await page.click('.reveal[data-reveal="e"]');
  await shot('03-card-revealed');

  // swipe up via touch = 외웠다
  const card = await page.$('#cardArea .card');
  const box = await card.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(cx + i, cy - i * 12); await page.waitForTimeout(16); }
  await shot('04-card-dragging');
  for (let i = 7; i <= 14; i++) { await page.mouse.move(cx, cy - i * 12); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(400);
  console.log('after swipe up', JSON.stringify(await st()));
  console.log('counter', await page.textContent('#counter'));

  // swipe left via button
  await page.click('[data-action="judge"][data-yes="0"]');
  await page.waitForTimeout(400);
  console.log('after no', JSON.stringify(await st()));
  // undo
  await page.click('#btnUndo');
  await page.waitForTimeout(200);
  console.log('after undo', JSON.stringify(await st()), 'counter', await page.textContent('#counter'));

  // toggle ko mode
  await page.click('[data-action="toggle-mode"]');
  await shot('05-card-ko-mode');
  await page.click('[data-action="toggle-mode"]');

  // finish session with keyboard: right x10, left x rest
  for (let i = 0; i < 30; i++) {
    const c = await page.$('#cardArea .card'); if (!c) break;
    const inStudy = await page.evaluate(() => document.querySelector('#view-study').classList.contains('active'));
    if (!inStudy) break;
    await page.keyboard.press(i % 3 === 0 ? 'ArrowDown' : 'ArrowUp');
    await page.waitForTimeout(330);
  }
  await shot('06-summary');
  console.log('after session', JSON.stringify(await st()));

  await page.click('[data-action="home"]');
  await shot('07-home-after');

  // stage 2 review
  await page.click('[data-action="start"][data-stage="2"]');
  await shot('08-stage2-card');
  await page.click('[data-action="demote"]');
  await page.waitForTimeout(400);
  console.log('after demote', JSON.stringify(await st()));
  await page.click('[data-action="back"]');

  // list
  await page.click('#tabbar [data-tab="list"]');
  await shot('09-list');
  await page.click('.item .it-w');   // v2.25: 예문 자리는 읽기
  await shot('10-sheet');
  await page.mouse.click(195, 60); await page.waitForTimeout(300);

  // edit
  await page.click('#tabbar [data-tab="edit"]');
  await shot('11-add-bulk');
  await page.click('[data-action="add-mode"][data-mode="one"]');
  await shot('11-edit');
  await page.fill('#f-w', 'ballpark figure');
  await page.fill('#f-m', '대략적인 수치');
  await page.fill('#f-e', 'Can you give me a ballpark figure?');
  await page.fill('#f-k', '대략적인 수치라도 알려 줄 수 있어?');
  await page.click('[data-action="save-word"]:not([data-more])');
  await page.waitForTimeout(300);
  console.log('after add', JSON.stringify(await st()));
  await shot('12-list-after-add');

  // import
  await page.click('#tabbar [data-tab="edit"]');
  await page.click('[data-action="add-mode"][data-mode="bulk"]');   // v2.0: 붙여넣기 탭
  await page.fill('#imp', 'touch base | 연락하다 | Let me touch base with you next week. | 다음 주에 연락할게.\nballpark figure | dup | x | y\nbad line');
  await shot('13-import');
  await page.click('[data-action="do-import"]');
  await page.waitForTimeout(300);
  console.log('after import', JSON.stringify(await st()));

  // settings + dark
  await page.click('#tabbar [data-tab="settings"]');
  await shot('14-settings');
  await page.click('[data-action="setting-pick"][data-key="theme"][data-value="dark"]');
  await shot('15-settings-dark');
  await page.click('#tabbar [data-tab="home"]');
  await shot('16-home-dark');
  await page.click('[data-action="start"][data-stage="1"]');
  await page.click('[data-action="reveal-all"]');
  await shot('17-card-dark');

  // persistence check
  await page.reload(); await page.waitForTimeout(300);
  console.log('after reload', JSON.stringify(await st()));
  console.log('theme after reload', await page.evaluate(() => document.documentElement.getAttribute('data-theme')));

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
