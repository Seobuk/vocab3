// 회화 연습 v1.18: 🎤 로 시작 → 말하다 쉬어도 안 끊김 → ■ 로 끝낼 때 한 번만 전송 + 할 말 가이드 칩. Gemini·음성인식 stub.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.fetch = (url, opt) => {
      const body = JSON.parse(opt.body);
      (window.__bodies = window.__bodies || []).push(body);
      const last = body.contents[body.contents.length - 1].parts[0].text;
      const out = {
        reply: /Start the conversation/.test(last) ? 'Hi there! What can I get for you?' : 'Sure, one latte coming up. Anything else?',
        fix: window.__fix || '', note: '', used: [],
        say: [{ e: 'Can I get a latte, please?', k: '라떼 한 잔 주시겠어요?' }, { e: "I'd like a latte with oat milk, please.", k: '오트 밀크 넣은 라떼로 주세요.' }]
      };
      return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] })) });
    };
    // 가짜 음성인식: 테스트가 window.__say(텍스트, 확정여부) 로 구간을 흘려 넣는다
    function FakeSR() { this.continuous = false; this.interimResults = false; this._res = []; }
    FakeSR.prototype.start = function () { window.__sr = this; if (!window.__lateStart) this.onstart && this.onstart(); };
    FakeSR.prototype.stop = function () { this.onend && this.onend(); };
    FakeSR.prototype.abort = function () { this.aborted = true; };
    window.SpeechRecognition = FakeSR; delete window.webkitSpeechRecognition;
    window.__say = function (t, fin) {
      const r = window.__sr; if (!r || !r.onresult) return;
      const item = [{ transcript: t }]; item.isFinal = !!fin;
      const idx = r._res.length; r._res.push(item);
      r.onresult({ resultIndex: idx, results: r._res });
    };
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('[data-action="talk"]'); await p.waitForTimeout(200);
  eq('가이드 토글 기본 켜짐', await p.evaluate(() => window.__vocab.state().settings.talk.guide), 'true');
  eq('자동 보내기 기본 꺼짐 (v1.19)', await p.evaluate(() => window.__vocab.state().settings.talk.autoSend), 'false');
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(500);

  // --- 할 말 가이드 ---
  eq('가이드 칩 2개', await p.$$eval('.say-bar .say', x => x.length), 2);
  eq('칩 한국어 해석', await p.textContent('.say-bar .say .say-k'), '라떼 한 잔 주시겠어요?');
  await p.screenshot({ path: OUT + '/103-talk-guide.png' });

  // --- 🎤 → 말하다 쉬기 → ■ ---
  const msgs = () => p.$$eval('.msg', x => x.length);
  const before = await msgs();
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(150);
  eq('듣는 중 버튼', await p.textContent('#micBtn'), '■');
  eq('듣는 중 안내', await p.getAttribute('#chatIn', 'placeholder'), '듣는 중 · 다 말하면 ■ 누르기');
  await p.evaluate(() => window.__say('Can I get', false)); await p.waitForTimeout(100);
  eq('말하는 대로 입력창에', await p.inputValue('#chatIn'), 'Can I get');
  // 여기서 인식기가 구간을 확정해도(=예전엔 바로 전송되던 지점) 아직 보내면 안 된다
  await p.evaluate(() => window.__say('Can I get a latte', true)); await p.waitForTimeout(300);
  eq('구간 확정돼도 전송 안 함', await msgs(), before);
  await p.evaluate(() => window.__say('with oat milk please', true)); await p.waitForTimeout(200);
  eq('쉬었다 이어 말한 것도 합쳐짐', await p.inputValue('#chatIn'), 'Can I get a latte with oat milk please');
  await p.screenshot({ path: OUT + '/104-talk-listening.png' });
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(600);
  eq('■ 누르면 바로 전송하지 않음 (v1.19 기본)', await msgs(), before);
  eq('입력창에 전체 문장', await p.inputValue('#chatIn'), 'Can I get a latte with oat milk please');
  eq('확인 안내', await p.getAttribute('#chatIn', 'placeholder'), '확인하고 ➤ 누르기');
  eq('마이크 원상복구', await p.textContent('#micBtn'), '🎤');
  await p.click('[data-action="talk-send"]'); await p.waitForTimeout(600);
  eq('➤ 누르면 한 번만 전송', await msgs(), before + 2);   // 내 말 + AI 답
  eq('전송된 문장', await p.$$eval('.msg.me .bubble', x => x[x.length - 1].textContent), 'Can I get a latte with oat milk please');
  // 자동 보내기 켜면 ■ 에서 바로 전송
  await p.evaluate(() => { window.__vocab.state().settings.talk.autoSend = true; window.__vocab.save(); });
  const b2 = await msgs();
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(150);
  await p.evaluate(() => window.__say('Thanks a lot', true)); await p.waitForTimeout(100);
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(600);
  eq('자동 보내기 ON → ■ 에서 전송', await msgs(), b2 + 2);
  await p.evaluate(() => { window.__vocab.state().settings.talk.autoSend = false; window.__vocab.save(); });

  // --- 칩을 누르면 그 문장이 입력창에 ---
  await p.click('.say-bar .say'); await p.waitForTimeout(150);
  eq('칩 → 입력창', await p.inputValue('#chatIn'), 'Can I get a latte, please?');

  // --- v2.1: 💡 로 대화 중에 할 말 알려주기 끄고 켜기 ---
  const chips = () => p.$$eval('.say-bar:not([hidden]) .say', x => x.length);
  await p.fill('#chatIn', 'I was typing');
  await p.click('[data-action="talk-guide"]'); await p.waitForTimeout(150);
  eq('💡 끄면 칩 숨김', await chips(), 0);
  eq('💡 꺼짐 표시', await p.getAttribute('[data-action="talk-guide"]', 'aria-pressed'), 'false');
  eq('입력 중인 글은 그대로', await p.inputValue('#chatIn'), 'I was typing');
  eq('설정에 저장', await p.evaluate(() => window.__vocab.state().settings.talk.guide), 'false');
  await p.fill('#chatIn', 'Thanks'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(600);
  eq('꺼져 있어도 다음 할 말은 받아 둠', await p.$$eval('.say-bar[hidden] .say', x => x.length), 2);
  await p.click('[data-action="talk-guide"]'); await p.waitForTimeout(150);
  eq('💡 켜면 지금 답에 대한 칩이 바로', await chips(), 2);
  await p.screenshot({ path: OUT + '/105-talk-guide-toggle.png' });
  await p.click('[data-action="talk-guide"]'); await p.waitForTimeout(150);

  // --- 끈 채로 새 대화: 처음부터 칩 없이 시작 ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#modal .btn.primary'); await p.waitForTimeout(600);
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(300);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(500);
  eq('가이드 끄면 칩 없음', await chips(), 0);
  eq('그래도 대화는 시작됨', await p.$$eval('.msg.ai', x => x.length), 1);

  // --- v2.34 인식률: 준비 신호 · 오류 나도 들은 데까지 · Gemini 에 [spoken] 알림 · 마침표만 다른 교정 숨김 ---
  await p.evaluate(() => { window.__bodies = []; window.__lateStart = true; });
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(150);
  eq('인식기 준비 전: 준비 중 안내', await p.getAttribute('#chatIn', 'placeholder'), '준비 중… 진동이 오면 말하세요');
  await p.evaluate(() => window.__sr.onstart()); await p.waitForTimeout(100);
  eq('준비되면 듣는 중 안내', await p.getAttribute('#chatIn', 'placeholder'), '듣는 중 · 다 말하면 ■ 누르기');
  await p.evaluate(() => window.__say('I want to order', false)); await p.waitForTimeout(100);
  const n0 = await msgs();
  await p.evaluate(() => window.__sr.onerror({ error: 'network' })); await p.waitForTimeout(250);
  eq('인식 오류 → 들은 데까지 입력창에 · 안 보냄 · 안내', (await p.inputValue('#chatIn')) + ' | ' + ((await msgs()) === n0) + ' | ' + /들은 데까지/.test(await p.textContent('#toast')), 'I want to order | true | true');
  await p.evaluate(() => { window.__fix = 'I want to order.'; });
  await p.click('[data-action="talk-send"]'); await p.waitForTimeout(700);
  const lb = () => p.evaluate(() => { const b = window.__bodies[window.__bodies.length - 1]; return b.contents[b.contents.length - 1].parts[0].text + ' | ' + /speech recognition/.test(b.systemInstruction.parts[0].text); });
  eq('인식한 문장은 [spoken] 으로 · 시스템에 인식 오류 안내', await lb(), '[spoken] I want to order | true');
  eq('마침표만 다른 교정은 안 보임', await p.$$eval('.msg.me .fb.fix', x => x.length), 0);
  await p.evaluate(() => { window.__fix = ''; });
  await p.fill('#chatIn', 'Just typing here'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(700);
  eq('직접 입력한 문장엔 태그 없음', await lb(), 'Just typing here | true');
  await p.click('[data-action="talk-guide"]'); await p.waitForTimeout(150);   // 위에서 꺼 둔 할 말 칩을 켠다
  await p.click('[data-action="talk-say"][data-i="0"]'); await p.waitForTimeout(100); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(700);
  eq('추천 문장도 태그 없음', /^\[spoken\]/.test(await lb()), false);
  // 듣는 중에 ➤ 도 인식 문장 · 인식 문장을 다 지우고 적으면 입력 문장 · 한국어도 준비 중 안내
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(150);
  await p.evaluate(() => window.__sr.onstart()); await p.evaluate(() => window.__say('Could I pay by card', false)); await p.waitForTimeout(100);
  await p.click('[data-action="talk-send"]'); await p.waitForTimeout(700);
  eq('듣는 중에 ➤ → [spoken]', (await lb()).split(' | ')[0], '[spoken] Could I pay by card');
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(150);
  await p.evaluate(() => window.__sr.onstart()); await p.evaluate(() => window.__say('One more thing', true)); await p.waitForTimeout(100);
  await p.click('[data-action="talk-mic"]'); await p.waitForTimeout(400);
  await p.fill('#chatIn', ''); await p.type('#chatIn', 'Typed instead'); await p.click('[data-action="talk-send"]'); await p.waitForTimeout(700);
  eq('인식 문장을 지우고 새로 적으면 태그 없음', (await lb()).split(' | ')[0], 'Typed instead');
  await p.click('[data-action="talk-ko"]'); await p.waitForTimeout(150);
  eq('한국어도 준비 전엔 준비 중 안내', await p.getAttribute('#chatIn', 'placeholder'), '준비 중… 진동이 오면 말하세요');
  await p.evaluate(() => window.__sr.onstart()); await p.waitForTimeout(100);
  eq('준비되면 한국어 안내', await p.getAttribute('#chatIn', 'placeholder'), '한국어로 말하는 중 · 다 말하면 ■');
  await p.evaluate(() => { window.__sr.abort(); }); await p.evaluate(() => window.onSttState('cancel')); await p.waitForTimeout(100);
  await p.evaluate(() => { window.__lateStart = false; });
  console.log('errors:', errs);
  await b.close();
})();
