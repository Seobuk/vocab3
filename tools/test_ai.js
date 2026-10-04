// AI 예문 (v1.15): long-press on the example block opens the editor sheet, Gemini call (stubbed) fills it, save updates the card.
// Also: quick tap still cycles the reveal, moving cancels the long-press, settings AI section, edit-screen AI button, key not in backup.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // Stub the OpenRouter endpoints before any script runs (v2.37 — Gemini 는 유튜브 정리만)
  await p.addInitScript(() => {
    window.__aiCalls = [];
    window.fetch = (url, opt) => {
      const auth = opt.headers.Authorization || '', key = auth.replace(/^Bearer /, '');
      window.__aiCalls.push({ url, method: opt.method, key, goog: opt.headers['x-goog-api-key'], body: opt.body ? JSON.parse(opt.body) : null });
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify(obj)) });
      if (/openrouter\.ai\/api\/v1\/models$/.test(url)) return ok({ data: [   // 모델 목록은 키 없이
        { id: 'openai/gpt-5-mini', architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] }, supported_parameters: ['response_format', 'structured_outputs'] },
        { id: 'google/gemini-3.1-flash-lite', architecture: { input_modalities: ['text', 'image', 'audio', 'video'], output_modalities: ['text'] }, supported_parameters: ['structured_outputs', 'reasoning'] },
        { id: 'google/gemini-3.8-flash-lite-tts', architecture: { input_modalities: ['text'], output_modalities: ['audio'] }, supported_parameters: [] },
        { id: 'google/gemini-3.1-flash-lite:batch', architecture: { input_modalities: ['text'], output_modalities: ['text'] }, supported_parameters: ['structured_outputs'] },
        { id: 'some/old-model', architecture: { input_modalities: ['text'], output_modalities: ['text'] }, supported_parameters: ['temperature'] },
        { id: 'deepseek/deepseek-v4-flash', architecture: { input_modalities: ['text'], output_modalities: ['text'] }, supported_parameters: ['structured_outputs'] }] });
      if (key !== 'sk-or-TEST') return Promise.resolve({ status: 401, text: () => Promise.resolve(JSON.stringify({ error: { message: 'No auth credentials found', code: 401 } })) });
      if (/openrouter\.ai\/api\/v1\/chat\/completions$/.test(url)) {
        const prompt = JSON.parse(opt.body).messages.slice(-1)[0].content;
        const word = (prompt.match(/Word\/expression: "([^"]+)"/) || [])[1] || '?';
        return ok({ choices: [{ message: { content: JSON.stringify({ e: `Let me ${word} what went wrong before the meeting.`, k: `회의 전에 뭐가 잘못됐는지 알아볼게요.` }) }, finish_reason: 'stop' }] });
      }
      return Promise.resolve({ status: 404, text: () => Promise.resolve(JSON.stringify({ error: { message: 'not found' } })) });
    };
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.shuffle = false; window.__vocab.save(); });
  await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(250);
  const word = await p.textContent('.card-word .w');
  const exampleBefore = await p.textContent('.reveal[data-reveal="e"] .en span');
  console.log('card:', word, '| example:', exampleBefore);

  const exBox = async () => (await p.$('.reveal[data-reveal="e"]')).boundingBox();
  const step = () => p.getAttribute('.reveal[data-reveal="e"]', 'data-step');
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
  // (4) enter key in settings; test connection; model list
  await p.fill('#ai-key', 'sk-or-TEST'); await p.waitForTimeout(100);
  console.log('key stored separately:', await p.evaluate(() => JSON.parse(localStorage.getItem('vocab3.ai.v1')).key), '| in state backup?', await p.evaluate(() => JSON.stringify(window.__vocab.state()).indexOf('sk-or-TEST') >= 0));
  await p.click('[data-action="ai-test"]'); await p.waitForTimeout(300);
  console.log('connection test toast:', (await p.textContent('#toast')).slice(0, 40));
  await p.click('[data-action="ai-models"]'); await p.waitForTimeout(300);
  const mlist = await p.$$eval('.model-list button', bs => bs.map(x => x.textContent));
  console.log('model list:', mlist);
  console.log(mlist.some(x => /:batch/.test(x)) ? 'FAIL :batch 모델이 목록에 보임' : 'ok   :batch(비동기 전용) 모델은 목록에서 뺌');
  await p.click('.model-list button[data-model="deepseek/deepseek-v4-flash"]'); await p.waitForTimeout(200);
  console.log('picked model:', await p.inputValue('#ai-model'), '| stored:', await p.evaluate(() => JSON.parse(localStorage.getItem('vocab3.ai.v1')).model));
  await p.evaluate(() => { document.querySelector('#ai-model').value = 'gemini-flash-lite-latest'; document.querySelector('#ai-model').dispatchEvent(new Event('change')); });
  console.log('Gemini-style id typed → default:', await p.evaluate(() => JSON.parse(localStorage.getItem('vocab3.ai.v1')).model));
  // v2.37: 예전 Gemini 키는 유튜브용 gkey 로 옮겨지고 OpenRouter 키는 비고, 모델은 OpenRouter 기본으로
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'AQ.oldgemini', model: 'gemini-2.5-flash', noThink: true })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(250);
  console.log('migrated Gemini key → gkey:', await p.inputValue('#ai-gkey'), '| OpenRouter key:', JSON.stringify(await p.inputValue('#ai-key')), '| model:', await p.inputValue('#ai-model'));
  await p.fill('#ai-key', 'sk-or-TEST'); await p.waitForTimeout(100);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('vocab3.ai.v1')), {}))); }); await p.reload(); await p.waitForTimeout(300);
  console.log('after reload kept:', await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('vocab3.ai.v1')); return a.key + ' / ' + a.gkey + ' / ' + a.model; }));
  await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(250);
  await p.evaluate(() => document.querySelector('#ai-settings').scrollIntoView());
  await p.screenshot({ path: OUT + '/71-settings-ai.png' });
  // (5) back to study (session persists) → long-press → AI → save → card updated
  await p.click('[data-action="tab"][data-tab="home"]'); await p.waitForTimeout(150);
  await p.click('[data-action="start"][data-stage="1"]'); await p.waitForTimeout(250);
  bx = await exBox(); await p.mouse.move(bx.x + 40, bx.y + 20); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(350);
  await p.fill('#ex-hint', '회의에서');
  await p.click('[data-action="ai-example"]'); await p.waitForTimeout(400);
  const call = await p.evaluate(() => window.__aiCalls[window.__aiCalls.length - 1]);
  console.log('AI call:', call.method, call.url, '| bearer:', call.key, '| goog header:', call.goog, '| schema:', JSON.stringify(call.body.response_format.json_schema.schema.required), call.body.response_format.json_schema.strict);
  console.log('default model:', call.body.model);
  console.log('prompt has hint:', /회의에서/.test(call.body.messages[0].content), '| has current example:', call.body.messages[0].content.indexOf(exampleBefore) >= 0);
  console.log('filled:', await p.inputValue('#ex-e'), '/', await p.inputValue('#ex-k'));
  await p.screenshot({ path: OUT + '/72-example-ai.png' });
  await p.click('[data-action="ex-save"]'); await p.waitForTimeout(400);
  console.log('after save → card example:', await p.textContent('.reveal[data-reveal="e"] .en span'), '| ko:', await p.textContent('.reveal[data-reveal="e"] .ko'), '| step:', await step());
  console.log('persisted:', await p.evaluate((w) => { const x = window.__vocab.state().words.find(q => q.w === w); return x.e + ' / ' + x.k; }, word));
  // (6) word sheet → 예문 수정·AI button; edit screen AI button fills fields
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(250);
  await p.click('[data-action="tab"][data-tab="list"]'); await p.waitForTimeout(200);
  {   // v2.36: 단어 줄은 한 번 톡 = 읽기 → 꾹 눌러(550ms) 창 열기
    const c = await p.$eval('#view-list [data-action="list-word"] .it-w', e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(300);
  }
  console.log('word sheet has ex-edit:', !!(await p.$('[data-action="ex-edit"]')));
  await p.click('[data-action="ex-edit"]'); await p.waitForTimeout(300);
  console.log('editor from list:', !!(await p.$('#ex-e')));
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(250);
  await p.click('#tabbar [data-tab="edit"]'); await p.waitForTimeout(200);
  await p.click('[data-action="add-mode"][data-mode="one"]'); await p.waitForTimeout(150);   // v2.0: 기본은 붙여넣기 탭
  await p.fill('#f-w', 'hectic'); await p.fill('#f-m', '정신없이 바쁜');
  await p.click('[data-action="ai-edit-example"]'); await p.waitForTimeout(400);
  console.log('edit screen AI:', await p.inputValue('#f-e'), '/', await p.inputValue('#f-k'));
  // (7) invalid key → readable error
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'sk-or-BAD', or: 1 })); }); await p.reload(); await p.waitForTimeout(300);
  await p.click('#tabbar [data-tab="edit"]'); await p.waitForTimeout(200);
  await p.click('[data-action="add-mode"][data-mode="one"]'); await p.waitForTimeout(150);   // v2.0: 기본은 붙여넣기 탭
  await p.fill('#f-w', 'hectic'); await p.fill('#f-m', '정신없이 바쁜');
  await p.click('[data-action="ai-edit-example"]'); await p.waitForTimeout(400);
  console.log('bad key toast:', await p.textContent('#toast'));
  console.log('errors:', errs);
  await b.close();
})();
