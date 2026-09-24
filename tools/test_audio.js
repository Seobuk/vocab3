// Audio review tests: (1) fake Android bridge — verify playlist/steps payload + UI; (2) browser sequencer end-to-end
const { chromium } = require('playwright');
const path = require('path');
const URL = require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href;
const OUT = path.resolve(__dirname, '..', 'build', 'shots');

(async () => {
  const browser = await chromium.launch();
  // ---------- (1) fake Android ----------
  let ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  let page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.addInitScript(() => {
    const store = {}; window.__calls = [];
    const impl = {
      load: k => (k in store ? store[k] : null), save: (k, v) => { store[k] = v; }, remove: k => { delete store[k]; },
      speak: () => {}, stopSpeak: () => {}, vibrate: () => {}, toast: () => {}, copy: () => {}, share: () => {}, saveFile: () => {}, openFile: () => {},
      setBackHandled: () => {}, setSystemBars: () => {}, ttsReady: () => true, version: () => '1.4',
      audioStart: (pl, loop) => { window.__calls.push({ fn: 'audioStart', pl: JSON.parse(pl), loop }); },
      audioControl: (cmd) => { window.__calls.push({ fn: 'audioControl', cmd }); },
      audioState: () => JSON.stringify({ active: false, playing: false, finished: false, index: 0, total: 0 })
    };
    window.__bt = 'TKN';   // 실제 앱처럼: 브리지는 첫 인자로 토큰을 받고, 틀리면 무시 (v2.2)
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => { if (t !== 'TKN') { window.__badToken = (window.__badToken || 0) + 1; return undefined; } return impl[k](...a); };
  });
  await page.goto(URL); await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/30-home-audio-btn.png' });
  await page.click('[data-action="audio"]'); await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/31-audio-setup.png' });
  console.log('setup seg:', await page.$$eval('#view-audio .seg button', bs => bs.map(b => b.textContent.trim().replace(/\s+/g, ' '))));
  await page.click('[data-action="audio-start"]'); await page.waitForTimeout(200);
  const call = await page.evaluate(() => window.__calls[0]);
  console.log('audioStart: items', call.pl.length, 'loop', call.loop);
  console.log('first item steps:', JSON.stringify(call.pl[0].steps));
  console.log('first item:', call.pl[0].w, '|', call.pl[0].m);
  await page.screenshot({ path: OUT + '/32-audio-player.png' });
  // simulate service state updates
  await page.evaluate(() => window.onAudioState(JSON.stringify({ active: true, playing: true, finished: false, index: 3, total: 20, loop: false, koOk: true, w: 'figure out', m: '알아내다, 해결하다', e: "I can't figure out how to set this up.", k: '이걸 어떻게 설정하는지 도무지 모르겠어.' })));
  await page.waitForTimeout(150);
  console.log('player count text:', await page.textContent('.p-count'), '| word:', await page.textContent('.p-word'));
  await page.click('[data-action="audio-ctl"][data-cmd="toggle"]'); await page.waitForTimeout(100);
  await page.click('[data-action="audio-ctl"][data-cmd="next"]'); await page.waitForTimeout(100);
  console.log('controls sent:', await page.evaluate(() => window.__calls.slice(1).map(c => c.cmd)));
  await page.screenshot({ path: OUT + '/33-audio-paused.png' });
  // finished state → back to setup with completion tip
  await page.evaluate(() => window.onAudioState(JSON.stringify({ active: false, playing: false, finished: true, index: 19, total: 20, loop: false, koOk: true, w: '', m: '', e: '', k: '' })));
  await page.waitForTimeout(150);
  console.log('after finish, start button present:', !!(await page.$('[data-action="audio-start"]')));
  // settings: change exampleRepeat to 3, readExampleKo on, then check steps
  await page.click('[data-action="audio-settings"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/34-audio-settings.png' });
  await page.click('[data-action="audio-pick"][data-key="exampleRepeat"][data-value="3"]'); await page.waitForTimeout(100);
  await page.click('[data-action="audio-toggle"][data-key="readExampleKo"]'); await page.waitForTimeout(100);
  await page.click('[data-action="audio-pick"][data-key="pauseAfterWord"][data-value="5000"]'); await page.waitForTimeout(100);
  await page.evaluate(() => { window.__calls = []; });
  await page.evaluate(() => window.__appBack()); await page.waitForTimeout(150);
  console.log('back from settings → home:', await page.$eval('#view-home', v => v.classList.contains('active')));
  await page.click('[data-action="audio"]'); await page.waitForTimeout(200);
  await page.click('[data-action="audio-start"]'); await page.waitForTimeout(200);
  const call2 = await page.evaluate(() => window.__calls[0]);
  const st2 = call2.pl[0].steps;
  console.log('steps after settings change:', st2.map(s => s.t === 'say' ? `say:${s.lang}:${s.rate}` : `wait:${s.ms}`).join(' '));
  console.log('ERRORS(1):', errors.length ? errors : 'none');
  await ctx.close();

  // ---------- (2) browser sequencer end-to-end (simulated TTS timing) ----------
  ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  page = await ctx.newPage();
  const errs2 = []; page.on('pageerror', e => errs2.push(e.message));
  await page.addInitScript(() => { window.__simulateTts = true; });
  await page.goto(URL); await page.waitForTimeout(300);
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = window.__vocab.state(); s.settings.audio.pauseAfterWord = 1000; s.settings.audio.pauseBetween = 1000; s.settings.audio.exampleGap = 500; s.settings.audio.set = 1; window.__vocab.save(); });
  await page.click('[data-action="audio"]'); await page.waitForTimeout(200);
  await page.click('[data-action="audio-start"]');
  await page.waitForTimeout(6000);
  const s1 = await page.evaluate(() => document.querySelector('.p-count') && document.querySelector('.p-count').textContent);
  console.log('after 6s:', s1);
  await page.click('[data-action="audio-ctl"][data-cmd="toggle"]'); await page.waitForTimeout(2500);
  const s2 = await page.evaluate(() => document.querySelector('.p-count') && document.querySelector('.p-count').textContent);
  await page.click('[data-action="audio-ctl"][data-cmd="toggle"]'); await page.waitForTimeout(200);
  await page.click('[data-action="audio-ctl"][data-cmd="next"]'); await page.click('[data-action="audio-ctl"][data-cmd="next"]'); await page.waitForTimeout(200);
  const s3 = await page.evaluate(() => document.querySelector('.p-count') && document.querySelector('.p-count').textContent);
  console.log('paused hold:', s2, '| after 2x next:', s3);
  await page.click('[data-action="audio-ctl"][data-cmd="stop"]'); await page.waitForTimeout(200);
  console.log('stopped → setup visible:', !!(await page.$('[data-action="audio-start"]')));
  console.log('ERRORS(2):', errs2.length ? errs2 : 'none');
  await browser.close();
})();
