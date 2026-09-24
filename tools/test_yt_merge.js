// v2.8 유튜브: 새로 정리할 때 아주 짧은 문장(3단어 이하)을 가까운 앞뒤 문장에 합치기. Gemini·oEmbed·YouTube IFrame API 는 stub.
const { chromium } = require('playwright');
const path = require('path');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const SENTS = [
  { s: '00:01.0', t: '00:01.4', e: 'Yes.', k: '네.', x: [] },
  { s: '00:01.6', t: '00:04.0', e: 'I think I am like an over-note person.', k: '저는 메모를 많이 하는 사람 같아요.', x: [] },
  { s: '00:05.0', t: '00:07.0', e: 'So I just write a lot of things down.', k: '그래서 많이 적어요.', x: [{ q: 'write down', w: 'write down', p: 'phr.', m: '적다' }] },
  { s: '00:07.3', t: '00:08.0', e: 'Right.', k: '맞아요.', x: [] },
  { s: '00:12.0', t: '00:12.6', e: 'Thank you.', k: '고마워요.', x: [] }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.addInitScript(sents => {
    window.__calls = [];
    window.fetch = (url, opt) => {
      if (/oembed/.test(url)) return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ title: 'Merge Talk' })) });
      window.__calls.push({ url, body: JSON.parse(opt.body) });
      return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(sents) }] } }] })) });
    };
    window.YT = { Player: function (el, o) {
      setTimeout(() => o.events.onReady({}), 0);
      this.seekTo = () => {}; this.playVideo = () => {}; this.pauseVideo = () => {};
      this.getCurrentTime = () => 0; this.getPlayerState = () => -1; this.destroy = () => {};
    } };
  }, SENTS);
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); });
  await p.reload(); await p.waitForTimeout(400);

  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/MERGEMERGE1'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);
  const merged = await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'MERGEMERGE1').sents.map(x => [x.s, x.t, x.e, x.k, x.x.length]));
  eq('짧은 문장은 가까운 쪽과 합침 (Yes.→뒤, Right.→앞, 4초 떨어진 Thank you.는 그대로)', JSON.stringify(merged), JSON.stringify([
    [1, 4, 'Yes. I think I am like an over-note person.', '네. 저는 메모를 많이 하는 사람 같아요.', 0],
    [5, 8, 'So I just write a lot of things down. Right.', '그래서 많이 적어요. 맞아요.', 1],
    [12, 12.6, 'Thank you.', '고마워요.', 0]]));
  eq('프롬프트에도 짧은 말은 옆 문장과', await p.evaluate(() => /Do not make very short interjections/.test(window.__calls.slice(-1)[0].body.systemInstruction.parts[0].text)), true);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
