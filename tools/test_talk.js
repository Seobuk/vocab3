// 회화 연습 (v1.17): setup → opening line → user turns with correction → mission words → end summary → add expressions. Gemini stubbed.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__calls = [];
    window.fetch = (url, opt) => {
      const body = opt.body ? JSON.parse(opt.body) : null; window.__calls.push({ url, body });
      const ok = (obj) => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })) });
      const sys = body && body.systemInstruction ? body.systemInstruction.parts[0].text : '';
      if (/reviewing a short practice conversation/.test(sys)) {
        return ok({ score: 4, comment: '자연스럽게 잘 이어갔어요. 과거형만 조금 더 신경 쓰면 좋아요.', corrections: [{ you: 'I go there yesterday', better: 'I went there yesterday.', why: '어제 일이니 과거형 went' }], expressions: [{ w: 'for here or to go', m: '매장에서 드시나요, 포장인가요', e: 'For here or to go?', k: '드시고 가세요, 포장이세요?' }, { w: 'grab', m: '(간단히) 사다', e: 'Let me grab that for you.', k: '제가 가져다 드릴게요.' }] });
      }
      const last = body.contents[body.contents.length - 1].parts[0].text;
      if (/Start the conversation/.test(last)) return ok({ reply: "Hi there! Welcome in. What can I get started for you today?", fix: '', note: '', used: [] });
      if (/yesterday/.test(last)) return ok({ reply: "Oh nice, glad you came back! Same order as yesterday?", fix: 'I went there yesterday.', note: '어제 일이니까 과거형 went를 써요.', used: [] });
      return ok({ reply: "Great choice. Anything else, maybe a pastry to grab with it?", fix: '', note: '자연스러워요!', used: ['grab'] });
    };
    // no real speech in headless — pretend unavailable so the mic path shows the toast
    delete window.webkitSpeechRecognition; delete window.SpeechRecognition;
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'assets', 'index.html')); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); }); await p.reload(); await p.waitForTimeout(400);
  await p.click('[data-action="talk"]'); await p.waitForTimeout(250);
  console.log('setup: scenarios', await p.$$eval('.scen', x => x.length), '| mission words', await p.$$eval('.mission .mchip', x => x.map(c => c.textContent)));
  await p.click('.scen[data-id="cafe"]'); await p.waitForTimeout(150);
  // force a known mission word for the test
  await p.evaluate(() => { window.__vocab.state(); });
  await p.screenshot({ path: OUT + '/100-talk-setup.png' });
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(500);
  console.log('chat view:', await p.evaluate(() => document.querySelector('.view.active').id), '| opening:', await p.textContent('.msg.ai .bubble'));
  const sys = await p.evaluate(() => window.__calls[0].body.systemInstruction.parts[0].text);
  console.log('system prompt has scenario+targets:', /barista/.test(sys), /Target words/.test(sys), '| schema keys:', await p.evaluate(() => Object.keys(window.__calls[0].body.generationConfig.responseSchema.properties).join(',')));
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(200);
  console.log('mic unavailable toast:', await p.textContent('#toast'));
  await p.fill('#chatIn', 'I go there yesterday'); await p.press('#chatIn', 'Enter'); await p.waitForTimeout(500);
  console.log('after turn 1: msgs', await p.$$eval('.msg', x => x.length), '| fix shown:', await p.textContent('.fb.fix .fb-fix'), '| note:', await p.textContent('.fb.fix .fb-note'));
  const hist = await p.evaluate(() => window.__calls[1].body.contents.map(c => c.role).join(','));
  console.log('history roles sent:', hist);
  const mw = (await p.$$eval('.mission-bar .mchip', x => x.map(c => c.textContent)))[0];
  await p.fill('#chatIn', "Can I " + mw + " a latte, please?"); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(500);
  const missionTxt = await p.$$eval('.mission-bar .mchip', x => x.map(c => c.textContent));
  console.log('mission bar:', missionTxt, '| counter:', await p.textContent('.mission-bar .mb-n'));
  console.log('ok note:', await p.textContent('.fb.ok'));
  await p.screenshot({ path: OUT + '/101-talk-chat.png' });
  // back → confirm end → summary sheet
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  console.log('confirm shown:', await p.evaluate(() => document.querySelector('#modal').classList.contains('show')));
  await p.click('#modal .btn.primary'); await p.waitForTimeout(600);
  console.log('summary sheet:', await p.evaluate(() => document.querySelector('#sheet').classList.contains('show')), '| tiles:', await p.$$eval('.sum-tile', x => x.map(t => t.textContent.replace(/\s+/g, ' '))));
  console.log('corrections:', await p.$$eval('.corr .c-better', x => x.map(c => c.textContent)).then(a => a.length), '| add-expr button:', !!(await p.$('[data-action="talk-add-expr"]')));
  await p.screenshot({ path: OUT + '/102-talk-summary.png' });
  const before = await p.evaluate(() => window.__vocab.state().words.length);
  await p.click('[data-action="talk-add-expr"]'); await p.waitForTimeout(200);
  const after = await p.evaluate(() => window.__vocab.state().words.length);
  console.log('expressions added:', after - before, '| new word:', await p.evaluate(() => { const w = window.__vocab.state().words; return w[w.length - 1].w + ' / ' + w[w.length - 1].t + ' / stage ' + w[w.length - 1].stage; }));
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(250);
  console.log('back on setup with log:', await p.evaluate(() => document.querySelector('.view.active').id), await p.evaluate(() => JSON.stringify(window.__vocab.state().talkLog.map(r => ({ id: !!r.id, turns: r.turns, score: r.score, msgs: r.msgs.length, corr: r.corrections.length, ex: r.expressions.length })))));
  // --- v1.20: 최근 연습 목록에서 리포트 다시 열기 (전문 포함) → 삭제 ---
  // 예전 버전 기록(id·msgs 없음)도 섞어 넣어 호환을 본다
  await p.evaluate(() => { const s = window.__vocab.state(); s.talkLog.unshift({ date: '2026-09-01', scenario: 'work', turns: 3, used: 1, total: 3, score: 3, comment: '예전 기록' }); window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400); await p.click('[data-action="talk"]'); await p.waitForTimeout(250);
  console.log('log rows:', await p.$$eval('.logrow', x => x.map(r => r.textContent.replace(/\s+/g, ' ').trim())), '| legacy got id:', await p.evaluate(() => window.__vocab.state().talkLog.every(r => !!r.id)));
  await p.click('.logrow'); await p.waitForTimeout(250);   // 맨 위 = 가장 최근(방금 한 연습)
  console.log('reopened title:', await p.textContent('#sheet .sh-word span'), '| tiles:', await p.$$eval('.sum-tile', x => x.map(t => t.textContent.replace(/\s+/g, ' '))));
  console.log('transcript lines:', await p.$$eval('.transcript .tr', x => x.map(t => t.className.replace('tr ', '') + ':' + t.querySelector('div > div > div').textContent.slice(0, 22))), '| fix shown in transcript:', await p.$$eval('.tr-fix', x => x.map(t => t.textContent)));
  console.log('expr already in list tagged:', await p.$$eval('#sheet .tag', x => x.map(t => t.textContent)).then(a => a.filter(t => t === '단어장에 있음').length), '| add button hidden when nothing new:', !(await p.$('[data-action="talk-add-expr"]')), '| delete button:', !!(await p.$('[data-action="talk-log-del"]')));
  await p.screenshot({ path: OUT + '/105-talk-report-reopen.png' });
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(200);
  await p.click('.logrow:nth-child(2)'); await p.waitForTimeout(250);   // 예전 기록
  console.log('legacy report note:', await p.evaluate(() => /대화 전문이 저장되기 전/.test(document.querySelector('#sheet').textContent)), '| no transcript:', !(await p.$('.transcript')));
  await p.click('[data-action="talk-log-del"]'); await p.waitForTimeout(200);
  console.log('delete confirm:', await p.evaluate(() => document.querySelector('#modal').classList.contains('show')));
  await p.click('#modal .btn.danger'); await p.waitForTimeout(300);
  console.log('after delete: rows', await p.$$eval('.logrow', x => x.length), '| sheet closed:', await p.evaluate(() => !document.querySelector('#sheet').classList.contains('show')), '| remaining:', await p.evaluate(() => window.__vocab.state().talkLog.map(r => r.date).join(',')));
  // free scenario custom text reaches the system prompt
  await p.click('.scen[data-id="free"]'); await p.waitForTimeout(150);
  await p.fill('#talk-custom', '학회에서 발표 후 질문 받기');
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(400);
  console.log('custom scenario in prompt:', await p.evaluate(() => /학회에서 발표 후/.test(window.__calls[window.__calls.length - 1].body.systemInstruction.parts[0].text)));
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  console.log('0-turn back goes straight to setup (no confirm):', await p.evaluate(() => document.querySelector('.view.active').id), await p.evaluate(() => !document.querySelector('#modal').classList.contains('show')));
  console.log('errors:', errs);
  await b.close();
})();
