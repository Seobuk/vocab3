// 색 테마 (v1.16): 10 palettes, random switch on each new daily refill (and manual pull), manual pick in settings, dark variants.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
  const cur = () => p.evaluate(() => ({ id: window.__vocab.state().settings.colorTheme, rand: window.__vocab.state().settings.themeRandom, primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), attr: document.documentElement.getAttribute('data-color') }));
  console.log('first launch:', JSON.stringify(await cur()), '| toast:', await p.textContent('#toast'));
  // new day → different theme
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const before = (await cur()).id;
    await p.evaluate(() => { const s = window.__vocab.state(); s.lastDailyDate = '2000-01-01'; window.__vocab.save(); window.__vocab.go('home', {}, true); });
    await p.waitForTimeout(600);
    const after = await cur(); seen.add(after.id);
    console.log(`new day #${i + 1}: ${before} → ${after.id} (differs: ${before !== after.id}) primary=${after.primary}`);
  }
  console.log('distinct themes seen in 6 days:', seen.size);
  // settings: swatches, pick, scroll kept, dark variant
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(200);
  console.log('swatches:', await p.$$eval('.swatches .sw', bs => bs.length), '| on:', await p.$eval('.swatches .sw.on', b => b.getAttribute('data-id')));
  await p.evaluate(() => { document.querySelector('#view-settings').scrollTop = 900; });
  await p.click('.swatches .sw[data-id="coral"]'); await p.waitForTimeout(150);
  const c = await cur();
  console.log('picked coral:', c.id, c.primary, c.bg, '| scrollTop kept:', await p.evaluate(() => document.querySelector('#view-settings').scrollTop), '| name label:', await p.textContent('#themeName'));
  await p.click('[data-action="setting-pick"][data-key="theme"][data-value="dark"]'); await p.waitForTimeout(150);
  const d = await cur();
  console.log('dark coral:', d.primary, d.bg, '| theme-color meta:', await p.getAttribute('meta[name=theme-color]', 'content'));
  await p.click('[data-action="setting-pick"][data-key="theme"][data-value="light"]'); await p.waitForTimeout(150);
  // random off → new day keeps theme
  await p.click('[data-action="setting-toggle"][data-key="themeRandom"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { const s = window.__vocab.state(); s.lastDailyDate = '2000-01-01'; window.__vocab.save(); window.__vocab.go('home', {}, true); });
  await p.waitForTimeout(600);
  console.log('random off → new day theme:', (await cur()).id, '(expected coral)');
  // shuffle button
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(200);
  await p.click('[data-action="theme-shuffle"]'); await p.waitForTimeout(150);
  console.log('shuffle →', (await cur()).id, '| toast:', await p.textContent('#toast'));
  // persistence across reload
  const beforeReload = (await cur()).id;
  await p.reload(); await p.waitForTimeout(500);
  console.log('after reload:', (await cur()).id, '(expected ' + beforeReload + ')');
  // gallery: home + study card for every theme (light and dark)
  const ids = await p.evaluate(() => window.__vocab.themes());
  for (const mode of ['light', 'dark']) {
    for (const id of ids) {
      await p.evaluate(({ id, mode }) => { const s = window.__vocab.state(); s.settings.colorTheme = id; s.settings.theme = mode; window.__vocab.save(); window.__vocab.applyTheme(); window.__vocab.go('home', {}, true); }, { id, mode });
      await p.waitForTimeout(120);
      await p.screenshot({ path: `${OUT}/theme-${mode}-${id}-home.png` });
      await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(250);
      await p.click('[data-action="reveal-all"]'); await p.waitForTimeout(120);
      await p.screenshot({ path: `${OUT}/theme-${mode}-${id}-card.png` });
      await p.evaluate(() => window.__appBack()); await p.waitForTimeout(150);
    }
  }
  console.log('errors:', errs);
  await b.close();
})();
