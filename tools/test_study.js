// Study navigation model: left/right = prev/next, up = 외웠다, down = 아직, re-judge, undo, finish
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.shuffle = false; window.__vocab.save(); });
  const cnt = () => p.evaluate(() => { const s = window.__vocab.state(); const c = {}; s.words.forEach(w => c[w.stage] = (c[w.stage] || 0) + 1); return JSON.stringify(c) + ' day=' + JSON.stringify(s.studyDays); });
  const word = () => p.textContent('.card-word .w');
  const pos = () => p.textContent('.tag.pos');
  const counter = () => p.textContent('#counter');
  await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(200);
  console.log('start:', await word(), await pos(), 'counter', await counter());
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(350);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(350);
  console.log('after 2x next:', await word(), await pos());
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(350);
  console.log('after prev:', await word(), await pos());
  // swipe left gesture = next
  let card = await p.$('#cardArea .card'); let box = await card.boundingBox(); let cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(cx - i * 14, cy + i); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(400);
  console.log('after swipe-left gesture (next):', await word(), await pos(), await cnt());
  // swipe down gesture = 아직
  card = await p.$('#cardArea .card'); box = await card.boundingBox(); cx = box.x + box.width / 2; cy = box.y + box.height / 2;
  await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(cx, cy + i * 12); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(400);
  console.log('after swipe-down (아직):', await word(), await pos(), 'counter', await counter(), await cnt());
  // ArrowUp = 외웠다
  await p.keyboard.press('ArrowUp'); await p.waitForTimeout(400);
  console.log('after ArrowUp (외웠다):', await word(), await pos(), 'counter', await counter(), await cnt());
  // go back to the card judged 외웠다 and re-judge as 아직 → stage restored, stats corrected
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(350);
  const badge = await p.evaluate(() => { const b = document.querySelector('.judged-badge'); return b ? b.textContent : null; });
  console.log('back to judged card:', await word(), 'badge:', badge);
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(400);
  console.log('re-judged as 아직:', await cnt());
  // undo → restores the 외웠다 state
  await p.click('#btnUndo'); await p.waitForTimeout(300);
  console.log('after undo:', await word(), 'badge:', await p.evaluate(() => { const b = document.querySelector('.judged-badge'); return b ? b.textContent : null; }), await cnt());
  await p.screenshot({ path: path.resolve(__dirname, '..', 'build', 'shots', '50-study-nav.png') });
  // finish: judge everything remaining
  for (let i = 0; i < 40; i++) {
    const inStudy = await p.evaluate(() => document.querySelector('#view-study').classList.contains('active'));
    if (!inStudy) break;
    await p.keyboard.press(i % 4 === 0 ? 'ArrowDown' : 'ArrowUp'); await p.waitForTimeout(320);
  }
  console.log('summary shown:', await p.evaluate(() => document.querySelector('#view-summary').classList.contains('active')), '|', (await p.textContent('.sum-grid')).replace(/\s+/g, ' '), await cnt());
  console.log('errors:', errs);
  await b.close();
})();
