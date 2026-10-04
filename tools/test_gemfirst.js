// v2.38: AI 는 무료 Gemini 키 먼저 → 안 되면(한도·오류) OpenRouter. 키가 하나뿐이면 그쪽만. (설정의 "연결 테스트" = aiChat 한 번)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fails = 0;
  const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log((ok ? 'ok   ' : 'FAIL ') + name + ': ' + JSON.stringify(got) + (ok ? '' : '  (기대 ' + JSON.stringify(want) + ')')); };
  await p.addInitScript(() => {
    window.__calls = []; window.__gem = 200; window.__or = 200;
    const ans = JSON.stringify({ e: 'Let me figure out what went wrong.', k: '뭐가 잘못됐는지 알아볼게요.' });
    const res = (status, obj) => Promise.resolve({ status, text: () => Promise.resolve(JSON.stringify(obj)) });
    window.fetch = (url, opt) => {
      const gem = /generativelanguage\.googleapis\.com/.test(url);
      const body = opt.body ? JSON.parse(opt.body) : null, keychk = /\/api\/v1\/key$/.test(url);
      window.__calls.push({ gem, keychk, url, goog: opt.headers['x-goog-api-key'] || '', auth: opt.headers.Authorization || '', body });
      if (keychk) return res(window.__orKey || 200, window.__orKey ? { error: { message: 'bad key', code: 401 } } : { data: { label: 'k' } });
      const talk = /reply/.test(JSON.stringify(body.generationConfig || body.response_format || ''));   // 회화 스키마면 회화 답
      const out = talk ? JSON.stringify({ reply: 'Sure! Anything else?', ko: '네! 더 필요한 건요?', fix: '', note: '', used: [], say: [] }) : ans;
      if (gem) return window.__gem === 200 ? res(200, { candidates: [{ content: { parts: [{ text: out }] } }] }) : res(window.__gem, { error: { message: 'quota', status: 'RESOURCE_EXHAUSTED' } });
      return window.__or === 200 ? res(200, { choices: [{ message: { content: out } }] }) : res(window.__or, { error: { message: 'no credit', code: window.__or } });
    };
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear());
  // 키를 넣고 새로 열어 설정의 "연결 테스트"를 누른다 → [부른 곳들, 토스트]
  async function run(keys, gem, or) {
    await p.evaluate(k => localStorage.setItem('vocab3.ai.v1', JSON.stringify(Object.assign({ or: 1 }, k))), keys);
    await p.reload(); await p.waitForTimeout(300);
    await p.evaluate(([g, o]) => { window.__gem = g; window.__or = o; window.__calls = []; }, [gem, or]);
    await p.click('[data-action="tab"][data-tab="settings"]'); await p.waitForTimeout(250);
    await p.click('[data-action="ai-test"]'); await p.waitForTimeout(500);
    return { calls: await p.evaluate(() => window.__calls), toast: await p.textContent('#toast') };
  }
  const who = r => r.calls.map(c => c.gem ? 'gemini' : c.keychk ? 'openrouter키확인' : 'openrouter').join(' → ');

  let r = await run({ gkey: 'G-KEY' }, 200, 200);
  eq('Gemini 키만: Gemini 한 번', who(r), 'gemini');
  eq('  성공 토스트', /^연결 성공/.test(r.toast), true);
  const g = r.calls[0], gc = g.body.generationConfig;
  eq('  Gemini 주소·키 헤더 (Bearer 없음)', [/models\/gemini-flash-lite-latest:generateContent$/.test(g.url), g.goog, g.auth], [true, 'G-KEY', '']);
  eq('  스키마: 대문자 type · additionalProperties 없음 · 순서', [gc.responseMimeType, gc.responseSchema.type, gc.responseSchema.properties.e.type, 'additionalProperties' in gc.responseSchema, gc.responseSchema.propertyOrdering, gc.responseSchema.required], ['application/json', 'OBJECT', 'STRING', false, ['e', 'k'], ['e', 'k']]);
  eq('  생각 끔 · 온도 · 글', [gc.thinkingConfig.thinkingBudget, gc.temperature, /figure out/.test(g.body.contents[0].parts[0].text), g.body.contents[0].role], [0, 1, true, 'user']);

  r = await run({ gkey: 'G-KEY', key: 'sk-or-TEST' }, 200, 200);
  eq('키 둘 다 · Gemini 됨: OpenRouter 로는 글을 안 보냄 (연결 테스트만 무료 키 확인)', who(r), 'gemini → openrouter키확인');
  eq('  키 확인은 GET · 글 없음 · 토스트에 누가 답했는지', [r.calls[1].body, /\(Gemini\)/.test(r.toast), /OpenRouter 키 ✓/.test(r.toast)], [null, true, true]);
  await p.evaluate(() => { window.__orKey = 401; window.__calls = []; });
  await p.click('[data-action="ai-test"]'); await p.waitForTimeout(500);
  eq('  OpenRouter 키가 틀리면 연결 테스트가 알려 줌', /OpenRouter 키 ✗/.test(await p.textContent('#toast')), true);
  await p.evaluate(() => { window.__orKey = 0; });

  r = await run({ gkey: 'G-KEY', key: 'sk-or-TEST' }, 429, 200);
  eq('키 둘 다 · Gemini 한도(429): OpenRouter 로 넘어감', who(r), 'gemini → openrouter');
  eq('  OpenRouter 키는 Bearer 로 · Gemini 키는 안 감', [r.calls[1].auth, r.calls[1].goog, r.calls[1].body.model], ['Bearer sk-or-TEST', '', 'google/gemini-3.1-flash-lite']);
  eq('  성공 토스트에 넘어온 사정 (틀린 Gemini 키로 조용히 유료만 쓰지 않게)', [/^연결 성공 ✓ \(OpenRouter\)/.test(r.toast), /Gemini 실패\(.*한도.*\) → OpenRouter/.test(r.toast)], [true, true]);
  eq('  설정의 마지막 호출 줄에도', /OpenRouter 성공 ✓ · Gemini 실패/.test(await p.textContent('#ai-last')), true);

  r = await run({ gkey: 'G-KEY', key: 'sk-or-TEST' }, 0, 200);   // 0 = fetch 가 200 이 아닌 값 — 서버 오류로 침
  eq('키 둘 다 · Gemini 오류: OpenRouter 로', who(r).replace(/^(gemini → )+/, 'gemini → '), 'gemini → openrouter');

  r = await run({ gkey: 'G-KEY', key: 'sk-or-TEST' }, 429, 402);
  eq('둘 다 실패: OpenRouter 쪽 오류를 보여 줌', [who(r), /크레딧/.test(r.toast)], ['gemini → openrouter', true]);

  r = await run({ gkey: 'G-KEY' }, 429, 200);
  eq('Gemini 키만 · 한도: OpenRouter 안 부르고 길을 알려 줌', [who(r), /Gemini 무료 한도/.test(r.toast) && /OpenRouter/.test(r.toast)], ['gemini', true]);

  r = await run({ key: 'sk-or-TEST' }, 200, 200);
  eq('OpenRouter 키만: OpenRouter 한 번', who(r), 'openrouter');

  r = await run({}, 200, 200);
  eq('키 없음: 안 부르고 Gemini 키 칸으로', [r.calls.length, r.toast, await p.evaluate(() => document.activeElement && document.activeElement.id)], [0, 'API 키를 먼저 입력해 주세요', 'ai-gkey']);
  eq('설정: Gemini 키 칸이 OpenRouter 키 칸보다 위', await p.evaluate(() => !!(document.querySelector('#ai-gkey').compareDocumentPosition(document.querySelector('#ai-key')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  await p.evaluate(() => document.querySelector('#ai-settings').scrollIntoView());
  await p.screenshot({ path: path.resolve(__dirname, '..', 'build', 'shots', 'gemfirst-settings.png') });

  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ gkey: 'G-KEY', key: 'sk-or-TEST', or: 1 })); }); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__gem = 200; window.__or = 200; window.__calls = []; });
  await p.click('[data-action="talk"]'); await p.waitForTimeout(250);
  await p.click('.scen[data-id="cafe"]'); await p.waitForTimeout(150);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(500);
  await p.fill('#chatIn', 'I go there yesterday'); await p.press('#chatIn', 'Enter'); await p.waitForTimeout(500);
  let cs = await p.evaluate(() => window.__calls);
  eq('회화 2번(여는 말 · 내 말) 모두 Gemini 만', cs.map(c => c.gem ? 'gemini' : 'openrouter').join(' → '), 'gemini → gemini');
  const tb = cs[1].body, rs = tb.generationConfig.responseSchema;
  eq('  시스템 글 · 역할은 user/model 만 · 끝은 user', [/barista/.test(tb.systemInstruction.parts[0].text), tb.contents.every(c => c.role === 'user' || c.role === 'model'), tb.contents[tb.contents.length - 1].role, tb.contents.every(c => !!c.parts[0].text)], [true, true, 'user', true]);
  eq('  겹친 스키마: say = ARRAY of OBJECT(e,k) · additionalProperties 없음', [rs.properties.say.type, rs.properties.say.items.type, rs.properties.say.items.propertyOrdering, /additionalProperties/.test(JSON.stringify(rs))], ['ARRAY', 'OBJECT', ['e', 'k'], false]);
  eq('  답이 화면에', await p.$$eval('.msg.ai .bubble', x => x[x.length - 1].textContent), 'Sure! Anything else?');
  await p.evaluate(() => { window.__gem = 429; window.__calls = []; });
  await p.fill('#chatIn', 'A latte, please.'); await p.press('#chatIn', 'Enter'); await p.waitForTimeout(600);
  cs = await p.evaluate(() => window.__calls);
  eq('대화 중 Gemini 한도 → 같은 대화가 OpenRouter 로', cs.map(c => c.gem ? 'gemini' : 'openrouter').join(' → '), 'gemini → openrouter');
  const om = cs[1].body.messages;
  eq('  OpenRouter 에 시스템 글 + 앞 대화 + 이번 말', [om[0].role, om.length >= 4, om[om.length - 1].content.indexOf('A latte, please.') >= 0, cs[1].body.response_format.json_schema.schema.additionalProperties], ['system', true, true, false]);
  eq('  답이 화면에 (오류 없이)', await p.$$eval('.msg.ai .bubble', x => x.length), 3);

  eq('페이지 오류 없음', errs, []);
  console.log(fails ? 'FAILED ' + fails : 'ERRORS: none');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
