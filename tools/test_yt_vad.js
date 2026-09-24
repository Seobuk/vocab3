// v2.8 유튜브: 소리로 문장 경계 맞추기(실험) + 짧은 문장 합치기.
// 안드로이드가 보내는 재생 소리 크기(window.ytVad(rms))와 상태(window.onVad)를 흉내 내서 흘려 넣는다. Gemini·oEmbed·YouTube IFrame API 는 stub.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const SENTS = [
  { s: '00:00.5', t: '00:02.4', e: 'Hi everyone, welcome back to the show.', k: '여러분 안녕하세요, 다시 오신 걸 환영해요.', x: [] },
  { s: '00:03.2', t: '00:06.9', e: "Today we'll dig into why agents really matter.", k: '오늘은 에이전트가 왜 중요한지 파고들어요.', x: [] },
  { s: '00:07.8', t: '00:09.9', e: "Let's figure out the rest together.", k: '나머지를 함께 알아봐요.', x: [] }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.addInitScript(sents => {
    window.__calls = [];
    const ok = obj => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })) });
    window.fetch = (url, opt) => {
      if (/oembed/.test(url)) return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ title: 'VAD Talk' })) });
      const body = JSON.parse(opt.body); window.__calls.push({ url, body });
      return ok(window.__gemOverride || sents);
    };
    window.__yt = []; window.__ytT = 0; window.__ytState = -1;
    window.YT = { Player: function (el, o) {
      window.__ytEvents = o.events; setTimeout(() => o.events.onReady({}), 0);
      this.seekTo = t => { window.__yt.push({ fn: 'seek', t }); window.__ytT = t; };
      this.playVideo = () => { window.__yt.push({ fn: 'play' }); window.__ytState = 1; };
      this.pauseVideo = () => { window.__yt.push({ fn: 'pause', at: window.__ytT }); window.__ytState = 2; };
      this.getCurrentTime = () => window.__ytT; this.getPlayerState = () => window.__ytState; this.destroy = () => {};
    } };
    // 안드로이드 쪽 흉내: 시간 t0~t1 동안 30ms 마다 소리 크기 rms 를 보낸다 (재생 중일 때만 의미 있음)
    window.__feed = (t0, t1, rms) => { for (let t = t0; t <= t1 + 1e-9 && window.__ytState === 1; t = Math.round((t + 0.03) * 1000) / 1000) { window.__ytT = t; window.ytVad(rms); } };
  }, SENTS);
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  const yt = fn => p.evaluate(f => window.__yt.filter(c => c.fn === f), fn);
  const sent = i => p.evaluate(i => window.__vocab.state().yt[0].sents[i], i);
  const line = () => p.textContent('#ytVadLine');

  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/VADVADVAD01'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);
  eq('처음엔 꺼짐 + 켜기 링크', await line(), '🎚 소리로 문장 끝 맞추기 (실험) · 켜기');

  // --- 켜기: 브라우저엔 측정기가 없다 → 안내. 안드로이드가 'on' 을 보내면 작동 ---
  await p.click('#ytVadLine [data-action="yt-vad"]'); await p.waitForTimeout(100);
  eq('브라우저에선 안드로이드 전용 안내', await line().then(t => /안드로이드 앱에서만/.test(t)), true);
  eq('설정 저장', await p.evaluate(() => window.__vocab.state().settings.ytVad), true);
  await p.evaluate(() => window.onVad('permission')); await p.waitForTimeout(50);
  eq('권한 거부 안내 + 다시 켜기 · 끄기', await line().then(t => /마이크 권한이 필요해요 \(녹음·저장 안 함\) · 다시 켜기 · 끄기$/.test(t)), true);
  await p.evaluate(() => window.onAppResume()); await p.waitForTimeout(50);
  eq('거부 뒤 화면 복귀로는 다시 안 물음 (요청 무한 반복 방지)', await line().then(t => /마이크 권한이 필요해요/.test(t)), true);
  await p.evaluate(() => window.onVad('fail', 'RuntimeException: Cannot initialize Visualizer engine')); await p.waitForTimeout(50);
  eq('안 되는 폰 안내', await line().then(t => /이 폰에선 재생 소리를 잴 수 없어요 \(RuntimeException/.test(t)), true);
  await p.evaluate(() => window.onVad('on')); await p.waitForTimeout(50);
  eq('작동 중 안내', await line().then(t => /소리로 맞추는 중/.test(t)), true);

  // --- 문장 1: 소리 기록이 쌓이며 실제 무음(2.31초)에서 멈춤 — AI 끝(2.4+0.1)보다 앞 ---
  await p.click('#ys0 .ys-t'); await p.waitForTimeout(100);
  await p.evaluate(() => { __feed(0.2, 0.45, 0); __feed(0.48, 2.28, 30); __feed(2.31, 3.3, 0); });
  eq('문장 1: 실제 무음(2.31) 뒤 0.28초 조용하면 멈춤 — AI 끝보다 앞', JSON.stringify((await yt('pause')).map(c => c.at)), '[2.61]');
  eq('실제 끝 저장', (await sent(0)).ae, 2.31);
  eq('안내에 앞당긴 시간', await line().then(t => /0\.2초 앞당겨 실제 무음에서 멈춤/.test(t)), true);

  // --- 문장 2: 시작 전 틈 → 말소리에서 실제 시작 배우기, 끝 0.47초 앞 무음에서 멈춤 ---
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(100);
  eq('AI 시작 −0.3초에서 재생', (await yt('seek')).slice(-1)[0].t, 2.9);
  await p.evaluate(() => { __feed(2.9, 3.2, 0); __feed(3.23, 6.5, 30); __feed(6.53, 7.8, 0); });
  eq('실제 시작 배움 (첫 말소리 3.23 − 0.15)', (await sent(1)).as, 3.08);
  eq('쉼표만큼 짧은 쉼은 무시하고 문장 끝 무음에서 멈춤', (await yt('pause')).slice(-1)[0].at, 6.83);
  eq('실제 끝 저장', (await sent(1)).ae, 6.53);

  // --- 한 번 더: 배운 시작·끝으로 정확히 ---
  await p.click('[data-action="yt-replay"]'); await p.waitForTimeout(100);
  eq('한 번 더 = 배운 실제 시작에서', (await yt('seek')).slice(-1)[0].t, 3.08);
  const pz = (await yt('pause')).length;
  await p.evaluate(() => { __feed(3.08, 3.12, 0); __feed(3.15, 3.6, 30); __feed(3.63, 3.78, 0); __feed(3.81, 6.4, 30); });   // 짧은 틈 → 단어 사이 틈
  eq('확정된 시작은 다시 들을 때 단어 사이 틈에 안 밀림', (await sent(1)).as, 3.08);
  await p.evaluate(() => { window.__ytT = 6.5; }); await p.waitForTimeout(260);
  await p.evaluate(() => { window.__ytT = 6.66; }); await p.waitForTimeout(80);
  eq('배운 실제 끝(6.53+0.12)에서 멈춤', (await yt('pause')).length - pz, 1);

  // --- 쉼표 쉼(0.2초)은 끝 전이면 무시 ---
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(100);
  const pz2 = (await yt('pause')).length;
  await p.evaluate(() => { __feed(7.5, 7.7, 0); __feed(7.73, 9.3, 30); __feed(9.33, 9.5, 0); __feed(9.53, 9.9, 30); __feed(9.93, 10.4, 0); });
  eq('끝 0.6초 안 짧은 쉼(0.2초)에선 안 멈추고 진짜 끝(9.93)에서', JSON.stringify((await yt('pause')).slice(pz2).map(c => c.at)), '[10.23]');
  await p.screenshot({ path: OUT + '/310-yt-vad.png' });
  // --- 무음을 못 찾으면 AI 끝 +0.5초(상한)에서 멈추고 안내 ---
  await p.evaluate(() => { delete window.__vocab.state().yt[0].sents[0].ae; });
  await p.click('#ys0 .ys-t'); await p.waitForTimeout(300);   // 0.2초 틱이 새 위치를 한 번 보고 멈춤 판정을 켠 뒤에
  await p.evaluate(() => { __feed(0, 3.1, 30); }); await p.waitForTimeout(350);
  eq('무음 못 찾음 → AI 끝 +0.5초 안에서 멈춤 + 실제 위치 안내', ((await yt('pause')).slice(-1)[0].at <= 3.1) + ' ' + await line().then(t => /무음을 못 찾아 AI 끝 \+0\.[0-9]초에서 멈춤/.test(t)), 'true true');

  // --- 배운 값은 저장돼 다시 열어도 유지 (ytClean 보존) ---
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  eq('다시 불러와도 배운 시작·끝 유지 (문장 1 은 처음부터 말소리 → 추정 시작 0)', JSON.stringify(await p.evaluate(() => window.__vocab.state().yt[0].sents.map(x => [x.as, x.ae]))), JSON.stringify([[0, null], [3.08, 6.53], [7.58, 9.93]]));

  // --- 끄기 ---
  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('[data-action="yt-open"]'); await p.waitForTimeout(300);
  await p.evaluate(() => window.onVad('on')); await p.waitForTimeout(50);
  await p.click('#ytVadLine [data-action="yt-vad"]'); await p.waitForTimeout(50);
  eq('끄면 다시 켜기 링크', await line(), '🎚 소리로 문장 끝 맞추기 (실험) · 켜기');
  eq('끔 설정 저장', await p.evaluate(() => window.__vocab.state().settings.ytVad), false);
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(100);
  eq('끄면 배운 시작 대신 AI 시작(−0.3)에서', (await yt('seek')).slice(-1)[0].t, 2.9);

  // --- 짧은 문장 합치기 (새로 정리할 때) ---
  await p.evaluate(() => { window.__gemOverride = [
    { s: '00:01.0', t: '00:01.4', e: 'Yes.', k: '네.', x: [] },
    { s: '00:01.6', t: '00:04.0', e: 'I think I am like an over-note person.', k: '저는 메모를 많이 하는 사람 같아요.', x: [] },
    { s: '00:05.0', t: '00:07.0', e: 'So I just write a lot of things down.', k: '그래서 많이 적어요.', x: [{ q: 'write down', w: 'write down', p: 'phr.', m: '적다' }] },
    { s: '00:07.3', t: '00:08.0', e: 'Right.', k: '맞아요.', x: [] },
    { s: '00:12.0', t: '00:12.6', e: 'Thank you.', k: '고마워요.', x: [] }
  ]; });
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/MERGEMERGE1'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);
  const merged = await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'MERGEMERGE1').sents.map(x => [x.s, x.t, x.e, x.k, x.x.length]));
  eq('짧은 문장은 가까운 쪽과 합침 (Yes.→뒤, Right.→앞, 4초 떨어진 Thank you.는 그대로)', JSON.stringify(merged), JSON.stringify([
    [1, 4, 'Yes. I think I am like an over-note person.', '네. 저는 메모를 많이 하는 사람 같아요.', 0],
    [5, 8, 'So I just write a lot of things down. Right.', '그래서 많이 적어요. 맞아요.', 1],
    [12, 12.6, 'Thank you.', '고마워요.', 0]]));
  eq('프롬프트에도 짧은 말은 옆 문장과', await p.evaluate(() => /Do not make very short interjections/.test(window.__calls.slice(-1)[0].body.systemInstruction.parts[0].text)), true);

  console.log('errors:', errs);
  await b.close();
})();
