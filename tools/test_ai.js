// AI 예문 (v1.15): long-press on the example block opens the editor sheet, Gemini call (stubbed) fills it, save updates the card.
// Also: quick tap still cycles the reveal, moving cancels the long-press, settings AI section, edit-screen AI button, key not in backup.
// v1.16: default model is the flash-lite alias, a stored "gemini-2.5-flash" (retired for new accounts) migrates, one retry on 503.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const fails = [];
const must = (cond, what) => { if (!cond) fails.push(what); console.log((cond ? 'ok   ' : 'FAIL ') + what); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // Stub the Gemini endpoints before any script runs
  await p.addInitScript(() => {
    window.__aiCalls = [];
    window.__ai503 = 0; // how many upcoming generateContent calls answer 503 (Google's "high demand")
    window.fetch = (url, opt) => {
      window.__aiCalls.push({ url, method: opt.method, key: opt.headers['x-goog-api-key'], body: opt.body ? JSON.parse(opt.body) : null });
      const key = opt.headers['x-goog-api-key'];
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify(obj)) });
      const err = (status, message) => Promise.resolve({ status, text: () => Promise.resolve(JSON.stringify({ error: { message } })) });
      if (key !== 'TEST-KEY') return err(400, 'API key not valid. Please pass a valid API key.');
      if (/\/models\?/.test(url)) return ok({ models: [
        { name: 'models/gemini-flash-lite-latest', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }, // still listed, but generateContent 404s for new accounts
        { name: 'models/gemini-embedding-001', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-2.5-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.5-pro', supportedGenerationMethods: ['generateContent'] }] });
      if (/:generateContent$/.test(url)) {
        if (window.__ai503 > 0) { window.__ai503--; return err(503, 'This model is currently experiencing high demand. Spikes in demand are usually temporary.'); }
        if (/gemini-2\.5-flash:generateContent/.test(url)) return err(404, 'This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash');
        if (/(gemini-flash-lite-latest|gemini-3\.5-flash):generateContent/.test(url)) {
          const prompt = opt.body ? JSON.parse(opt.body).contents[0].parts[0].text : '';
          const word = (prompt.match(/Word\/expression: "([^"]+)"/) || [])[1] || '?';
          return ok({ candidates: [{ content: { parts: [{ text: JSON.stringify({ e: `Let me ${word} what went wrong before the meeting.`, k: `회의 전에 뭐가 잘못됐는지 알아볼게요.` }) }] } }] });
        }
      }
      return err(404, 'model not found');
    };
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'assets', 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.shuffle = false; window.__vocab.save(); });
  await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(250);
  const word = await p.textContent('.card-word .w');
  const exampleBefore = await p.textContent('.reveal[data-reveal="e"] .en span');
  console.log('card:', word, '| example:', exampleBefore);

  const exBox = async () => (await p.$('.reveal[data-reveal="e"]')).boundingBox();
  const step = () => p.getAttribute('.reveal[data-reveal="e"]', 'data-step');
  const stored = () => p.evaluate(() => JSON.parse(localStorage.getItem('vocab3.ai.v1')));
  const calls = () => p.evaluate(() => window.__aiCalls.length);
  // (1) quick tap still cycles the reveal
  let bx = await exBox(); await p.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(120);
  console.log('quick tap → reveal step:', await step(), '| sheet open:', await p.evaluate(() => document.querySelector('#sheet').classList.contains('show')));
  // (2) press + move cancels the long-press (drag instead)
  bx = await exBox(); await p.mouse.move(bx.x + 40, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(200);
  for (let i = 1; i <= 5; i++) { await p.mouse.move(bx.x + 40 + i * 6, bx.y + 20); await p.waitForTimeout(20); }
  await p.waitForTimeout(500); await p.mouse.up(); await p.waitForTimeout(300);
  console.log('press+move → sheet open:', await p.evaluate(() => document.querySelector('#sheet').classList.contains('show')));
  // (3) long-press without moving → editor sheet (no key yet → AI asks to go to settings)
  bx = await exBox(); await p.mouse.move(bx.x + 40, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(350);
  console.log('long-press → sheet open:', await p.evaluate(() => document.querySelector('#sheet').classList.contains('show')), '| reveal step unchanged:', await step());
  console.log('sheet fields:', await p.inputValue('#ex-e'), '/', (await p.inputValue('#ex-k')).slice(0, 20));
  await p.screenshot({ path: OUT + '/70-example-editor.png' });
  await p.click('[data-action="ai-example"]'); await p.waitForTimeout(250);
  const modalText = await p.evaluate(() => { const m = document.querySelector('#modal'); return m && m.classList.contains('show') ? m.textContent.replace(/\s+/g, ' ').trim() : null; });
  console.log('AI without key → modal:', modalText && modalText.slice(0, 40));
  await p.click('#modal .btn.primary'); await p.waitForTimeout(400);
  console.log('→ settings view:', await p.evaluate(() => document.querySelector('#view-settings').classList.contains('active')), '| key field focused:', await p.evaluate(() => document.activeElement && document.activeElement.id));
  // (4) fresh install: default model + key placeholder; enter key; test connection; model list
  must((await p.inputValue('#ai-model')) === 'gemini-flash-lite-latest', 'fresh install defaults to gemini-flash-lite-latest');
  must((await p.getAttribute('#ai-key', 'placeholder')) === 'AQ.…', 'key placeholder shows the AQ. prefix Google issues now');
  await p.fill('#ai-key', 'TEST-KEY'); await p.waitForTimeout(100);
  console.log('key stored separately:', (await stored()).key, '| in state backup?', await p.evaluate(() => JSON.stringify(window.__vocab.state()).indexOf('TEST-KEY') >= 0));
  await p.click('[data-action="ai-test"]'); await p.waitForTimeout(300);
  const testToast = await p.textContent('#toast');
  must(/^연결 성공/.test(testToast), 'connection test succeeds with the default model: ' + testToast.slice(0, 40));
  await p.click('[data-action="ai-models"]'); await p.waitForTimeout(300);
  console.log('model list:', await p.$$eval('.model-list button', bs => bs.map(x => x.textContent)));
  await p.click('.model-list button[data-model="gemini-3.5-flash"]'); await p.waitForTimeout(200);
  console.log('picked model:', await p.inputValue('#ai-model'), '| stored:', (await stored()).model);
  await p.evaluate(() => { document.querySelector('#ai-model').value = 'models/gemini-flash-lite-latest'; document.querySelector('#ai-model').dispatchEvent(new Event('change')); });
  console.log('model typed with prefix → stored:', (await stored()).model);
  await p.screenshot({ path: OUT + '/71-settings-ai.png' });
  // (5) back to study (session persists) → long-press → AI → save → card updated
  await p.click('[data-action="tab"][data-tab="home"]'); await p.waitForTimeout(150);
  await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(250);
  bx = await exBox(); await p.mouse.move(bx.x + 40, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(350);
  await p.fill('#ex-hint', '회의에서');
  await p.click('[data-action="ai-example"]'); await p.waitForTimeout(400);
  const call = await p.evaluate(() => window.__aiCalls[window.__aiCalls.length - 1]);
  console.log('AI call:', call.method, call.url.replace(/^https:\/\/generativelanguage.googleapis.com/, ''), '| key header:', call.key, '| schema:', JSON.stringify(call.body.generationConfig.responseSchema.required));
  console.log('prompt has hint:', /회의에서/.test(call.body.contents[0].parts[0].text), '| has current example:', call.body.contents[0].parts[0].text.indexOf(exampleBefore) >= 0);
  console.log('filled:', await p.inputValue('#ex-e'), '/', await p.inputValue('#ex-k'));
  await p.screenshot({ path: OUT + '/72-example-ai.png' });
  await p.click('[data-action="ex-save"]'); await p.waitForTimeout(400);
  console.log('after save → card example:', await p.textContent('.reveal[data-reveal="e"] .en span'), '| ko:', await p.textContent('.reveal[data-reveal="e"] .ko'), '| step:', await step());
  console.log('persisted:', await p.evaluate((w) => { const x = window.__vocab.state().words.find(q => q.w === w); return x.e + ' / ' + x.k; }, word));
  // (6) word sheet → 예문 수정·AI button; edit screen AI button fills fields
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(250);
  await p.click('[data-action="tab"][data-tab="list"]'); await p.waitForTimeout(200);
  await p.click('#view-list [data-action="open"]'); await p.waitForTimeout(250);
  console.log('word sheet has ex-edit:', !!(await p.$('[data-action="ex-edit"]')));
  await p.click('[data-action="ex-edit"]'); await p.waitForTimeout(300);
  console.log('editor from list:', !!(await p.$('#ex-e')));
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.click('[data-action="tab"][data-tab="edit"]'); await p.waitForTimeout(200);
  await p.fill('#f-w', 'hectic'); await p.fill('#f-m', '정신없이 바쁜');
  await p.click('[data-action="ai-edit-example"]'); await p.waitForTimeout(400);
  console.log('edit screen AI:', await p.inputValue('#f-e'), '/', await p.inputValue('#f-k'));
  // (7) invalid key → readable error
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'BAD', model: 'gemini-flash-lite-latest' })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-action="tab"][data-tab="edit"]'); await p.waitForTimeout(200);
  await p.fill('#f-w', 'hectic'); await p.fill('#f-m', '정신없이 바쁜');
  await p.click('[data-action="ai-edit-example"]'); await p.waitForTimeout(400);
  console.log('bad key toast:', await p.textContent('#toast'));
  // (8) v1.15 installs saved the old default "gemini-2.5-flash" (Google 404s it for new accounts) → replaced on load; a deliberate choice is kept
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-2.5-flash' })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(200);
  must((await p.inputValue('#ai-model')) === 'gemini-flash-lite-latest', 'stored gemini-2.5-flash migrates to the new default');
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-3.5-flash' })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(200);
  must((await p.inputValue('#ai-model')) === 'gemini-3.5-flash', 'a deliberately chosen model is left alone');
  // (9) 503 "high demand" → one automatic retry; still 503 → toast suggests another model
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-action="tab"][data-tab="edit"]'); await p.waitForTimeout(200);
  await p.fill('#f-w', 'hectic'); await p.fill('#f-m', '정신없이 바쁜');
  let n0 = await calls(); await p.evaluate(() => { window.__ai503 = 1; });
  await p.click('[data-action="ai-edit-example"]'); await p.waitForTimeout(2600);
  must((await p.inputValue('#f-e')).length > 0, 'one 503 then 200 → example filled after automatic retry');
  must((await calls()) - n0 === 2, 'exactly one retry (2 calls)');
  n0 = await calls(); await p.evaluate(() => { window.__ai503 = 9; document.querySelector('#f-e').value = ''; });
  await p.click('[data-action="ai-edit-example"]'); await p.waitForTimeout(3200);
  const busyToast = await p.textContent('#toast');
  must(/붐벼요/.test(busyToast) && /다른 모델/.test(busyToast), 'persistent 503 → busy toast suggests another model: ' + busyToast);
  must((await calls()) - n0 === 2, 'no retry storm (still 2 calls)');
  console.log('errors:', errs);
  must(errs.length === 0, 'no page errors');
  await b.close();
  if (fails.length) { console.error('\nFAILED:\n - ' + fails.join('\n - ')); process.exit(1); }
})();
