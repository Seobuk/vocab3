// Phone screenshots for Google Play (1080x1920, 9:16) — no alpha PNG
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href;
const OUT = path.resolve(__dirname, '..', 'build', 'store', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  await page.goto(URL); await page.waitForTimeout(300);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  // deterministic order for screenshots
  await page.evaluate(() => { const s = window.__vocab.state(); s.settings.shuffle = false; window.__vocab.save(); });
  const shot = async (n, name) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${n}_${name}.png`, omitBackground: false }); console.log('shot', n, name); };

  await shot('01', 'home');
  await page.click('[data-action="start"][data-stage="1"]'); await shot('02', 'card_front');
  await page.click('.reveal[data-reveal="m"]'); await page.click('.reveal[data-reveal="e"]'); await page.click('.reveal[data-reveal="e"]');
  await shot('03', 'card_revealed');
  // drag a bit to show the stamp
  const card = await page.$('#cardArea .card'); const box = await card.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 7; i++) { await page.mouse.move(cx + i * 12, cy + i * 1.5); await page.waitForTimeout(16); }
  await shot('04', 'card_swipe');
  await page.mouse.move(cx, cy); await page.mouse.up(); await page.waitForTimeout(300);
  await page.click('[data-action="toggle-mode"]'); await page.waitForTimeout(200);
  await page.click('.reveal[data-reveal="w"]'); await shot('05', 'ko_mode');
  await page.click('[data-action="toggle-mode"]');
  // judge a few to make a summary
  for (let i = 0; i < 20; i++) { const c = await page.$('#cardArea .card'); if (!c) break; await page.keyboard.press(i % 4 === 0 ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(320); }
  await shot('06', 'summary');
  await page.click('[data-action="home"]'); await page.waitForTimeout(200);
  await shot('07', 'home_progress');
  await page.click('#tabbar [data-tab="list"]'); await shot('08', 'list');
  await page.click('#tabbar [data-tab="settings"]');
  await page.click('[data-action="setting-pick"][data-key="theme"][data-value="dark"]');
  await page.click('#tabbar [data-tab="home"]'); await page.click('[data-action="start"][data-stage="1"]');
  await page.click('[data-action="reveal-all"]'); await shot('09', 'dark_card');
  await browser.close();
})();
