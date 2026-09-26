// Reveal-cycle + auto-speak test using a fake Android bridge (exercises the isAndroid code path)
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href;
const OUT = path.resolve(__dirname, '..', 'build', 'shots');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    const store = {};
    window.__spoken = [];
    const impl = {
      load: k => (k in store ? store[k] : null), save: (k, v) => { store[k] = v; }, remove: k => { delete store[k]; },
      speak: (t, l, r, f) => window.__spoken.push({ t, l, r, f }), stopSpeak: () => {}, vibrate: () => {}, toast: () => {},
      copy: () => {}, share: () => {}, saveFile: () => {}, openFile: () => {}, setBackHandled: () => {}, setSystemBars: () => {},
      ttsReady: () => true, version: () => '1.1'
    };
    window.__bt = 'TKN';   // 실제 앱처럼: 브리지는 첫 인자로 토큰을 받고, 틀리면 무시 (v2.2)
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => { if (t !== 'TKN') { window.__badToken = (window.__badToken || 0) + 1; return undefined; } return impl[k](...a); };
  });
  await page.goto(URL);
  await page.waitForTimeout(300);
  const step = (k) => page.getAttribute(`.reveal[data-reveal="${k}"]`, 'data-step');
  const koVisible = () => page.evaluate(() => { const el = document.querySelector('.reveal[data-reveal="e"] .ko'); return el ? getComputedStyle(el).display !== 'none' : null; });
  const spoken = () => page.evaluate(() => window.__spoken.map(s => s.t + '|' + (s.f ? 'flush' : 'add')));
  const tapExample = async () => { await page.click('.reveal[data-reveal="e"]'); await page.waitForTimeout(120); };

  // enable auto speak via chip after starting session
  await page.click('[data-action="start"][data-stage="1"]');
  await page.waitForTimeout(500);
  console.log('initial steps m/e:', await step('m'), await step('e'), 'ko visible:', await koVisible(), 'spoken:', await spoken());

  await page.click('[data-action="toggle-auto"]'); // autoSpeak on → remounts card, speaks word
  await page.waitForTimeout(600);
  console.log('after auto on → spoken:', await spoken());

  await tapExample();
  console.log('tap1 e-step:', await step('e'), 'ko visible:', await koVisible(), 'spoken:', await spoken());
  await page.screenshot({ path: OUT + '/20-example-en-only.png' });
  await tapExample();
  console.log('tap2 e-step:', await step('e'), 'ko visible:', await koVisible(), 'spoken:', await spoken());
  await page.screenshot({ path: OUT + '/21-example-en-ko.png' });
  await tapExample();
  console.log('tap3 e-step:', await step('e'), 'ko visible:', await koVisible(), 'spoken:', await spoken());
  await tapExample();
  console.log('tap4 e-step:', await step('e'), 'spoken:', await spoken());

  // meaning toggles open/close
  await page.dblclick('.reveal[data-reveal="m"]'); await page.waitForTimeout(100);
  const m1 = await step('m');
  await page.dblclick('.reveal[data-reveal="m"]'); await page.waitForTimeout(100);
  console.log('meaning toggle:', m1, '->', await step('m'));

  // reveal-all speaks example once (word already spoken at mount)
  await page.evaluate(() => { window.__spoken = []; });
  await page.click('[data-action="reveal-all"]'); await page.waitForTimeout(100);
  console.log('reveal-all steps m/e:', await step('m'), await step('e'), 'spoken:', await spoken());

  // next card: swipe right → new card auto speaks word only (example hidden)
  await page.evaluate(() => { window.__spoken = []; });
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800);
  console.log('next card spoken:', await spoken(), 'e-step:', await step('e'));

  // ko mode: word reveal speaks word; example reveal speaks example
  await page.evaluate(() => { window.__spoken = []; });
  await page.click('[data-action="toggle-mode"]'); await page.waitForTimeout(600);
  console.log('ko mode mount spoken:', await spoken());
  await page.click('.reveal[data-reveal="w"]'); await page.waitForTimeout(100);
  await tapExample();
  console.log('ko mode after reveals:', await spoken(), 'steps w/e:', await step('w'), await step('e'));
  await tapExample();
  console.log('ko mode tap again e-step:', await step('e'));
  await page.screenshot({ path: OUT + '/22-ko-mode-revealed.png' });

  // hideExample=false → card mounts with example fully visible and queues example after word
  await page.click('[data-action="toggle-mode"]'); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = window.__vocab.state(); s.settings.hideExample = false; window.__vocab.save(); window.__spoken = []; });
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800);
  console.log('hideExample=false mount: e-step:', await step('e'), 'spoken:', await spoken());

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
})();
