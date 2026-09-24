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
      const last = body.contents[body.contents.length - 1].parts[0].text;
      const out = {
        reply: /Start the conversation/.test(last) ? 'Hi there! What can I get for you?' : 'Sure, one latte coming up. Anything else?',
        fix: '', note: '', used: [],
        say: [{ e: 'Can I get a latte, please?', k: '라떼 한 잔 주시겠어요?' }, { e: "I'd like a latte with oat milk, please.", k: '오트 밀크 넣은 라떼로 주세요.' }]
      };
      return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] })) });
    };
    // 가짜 음성인식: 테스트가 window.__say(텍스트, 확정여부) 로 구간을 흘려 넣는다
    function FakeSR() { this.continuous = false; this.interimResults = false; this._res = []; }
    FakeSR.prototype.start = function () { window.__sr = this; };
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

  // --- 가이드 끄면 칩이 안 뜬다 ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#modal .btn.primary'); await p.waitForTimeout(600);
  await p.click('[data-action="close-sheet"]'); await p.waitForTimeout(300);
  await p.click('[data-action="talk-more"]'); await p.waitForTimeout(150);   // v2.0: 세부 설정은 접혀 있다
  await p.click('[data-action="talk-toggle"][data-key="guide"]'); await p.waitForTimeout(150);
  await p.click('[data-action="talk-start"]'); await p.waitForTimeout(500);
  eq('가이드 끄면 칩 없음', await p.$$eval('.say-bar .say', x => x.length), 0);
  eq('그래도 대화는 시작됨', await p.$$eval('.msg.ai', x => x.length), 1);

  console.log('errors:', errs);
  await b.close();
})();
