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
      return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(window.__gemOverride || sents) }] } }] })) });
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

  // --- v2.16: 화면 자막 줄 단위로 쪼개진 문장 → . ? ! 로 끝날 때까지 되붙임 (스크린샷의 실제 예) ---
  await p.evaluate(() => { window.__gemOverride = [
    { s: '02:30.0', t: '02:31.8', e: 'So I heard you trained for six', k: '6년 동안', x: [] },
    { s: '02:32.0', t: '02:33.0', e: 'years to be a part of the group?', k: '그룹에 합류하기 위해서요?', x: [] },
    { s: '02:33.4', t: '02:36.0', e: 'Six years. What was that experience like?', k: '6년이요. 어땠나요?', x: [] },
    { s: '02:41.0', t: '02:42.8', e: 'I I don\'t even know where to begin,', k: '어디서부터 시작해야 할지도,', x: [] },
    { s: '02:43.0', t: '02:47.6', e: 'but it was you know, I at that time it felt like', k: '그때는', x: [{ q: 'felt like', w: 'feel like', p: 'phr.', m: '~같이 느끼다' }] },
    { s: '02:48.0', t: '02:48.9', e: 'such a long time.', k: '정말 긴 시간 같았어요.', x: [] },
    { s: '02:49.2', t: '02:50.4', e: 'I was like, when? When is', k: '언제? 언제', x: [] },
    { s: '02:50.6', t: '02:52.0', e: 'it going to be my turn?', k: '내 차례가 올까?', x: [] }
  ]; });
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://youtu.be/CAPTIONCUT1'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);
  const cut = await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'CAPTIONCUT1'));
  eq('쪼개진 문장 되붙임 (8조각 → 4문장)', JSON.stringify(cut.sents.map(x => [x.s, x.t, x.e])), JSON.stringify([
    [150, 153, 'So I heard you trained for six years to be a part of the group?'],
    [153.4, 156, 'Six years. What was that experience like?'],
    [161, 168.9, "I I don't even know where to begin, but it was you know, I at that time it felt like such a long time."],
    [169.2, 172, 'I was like, when? When is it going to be my turn?']]));
  eq('한글·익힐 표현도 합침 · 새 정리엔 합침 표시', cut.sents[2].k + ' | ' + cut.sents[2].x.map(g => g.q).join() + ' | ' + cut.mb, '어디서부터 시작해야 할지도, 그때는 정말 긴 시간 같았어요. | felt like | 1');
  eq('프롬프트: 화면에 박힌 자막 줄바꿈 따라가지 말 것', await p.evaluate(() => /burned-in captions/.test(window.__calls.slice(-1)[0].body.systemInstruction.parts[0].text)), true);

  // --- 예전에 정리한 영상도 앱을 열 때 한 번 되붙임 (Gemini 안 부름) · 손 수정·파형 경계·단어 뜻 캐시 보존 · 20초 한도 ---
  const nCalls = await p.evaluate(() => window.__calls.length);
  await p.evaluate(() => {
    const s = window.__vocab.state();
    const frag = [
      { s: 10, t: 11.5, e: 'I heard you', k: '들었어요', x: [], ms: 1, vs: 9.9, lk: { heard: { w: 'hear', p: 'v.', m: '듣다' } } },
      { s: 11.6, t: 13, e: 'trained for years.', k: '연습했다고요.', x: [], me: 1, ve: 13.1, lk: { trained: { w: 'train', p: 'v.', m: '연습하다' } } },
      { s: 13.2, t: 14, e: 'Okay.', k: '좋아요.', x: [] }
    ];
    for (let i = 0; i < 12; i++) frag.push({ s: 20 + i * 2, t: 21.5 + i * 2, e: 'words without end ' + i, k: '', x: [] });   // 문장부호 없는 24초 → 20초 한도에서 끊김
    s.yt.push({ id: 'oldrec1', vid: 'OLDCAPTION1', title: 'Old', date: '', addedAt: 1, sents: frag, tv: 3, snap: 1, off: { kind: 'mp4', size: 1 } });   // off 가 있어야 합친 뒤 파형 다시 맞추기(snap 삭제)를 제대로 검사
    window.__vocab.save();
  });
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  const old = await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'OLDCAPTION1'));
  eq('예전 정리 되붙임: 첫 문장 · 손 수정(시작=앞, 끝=뒤)·파형 경계·단어 뜻 보존', JSON.stringify([old.sents[0].e, old.sents[0].s, old.sents[0].t, old.sents[0].ms, old.sents[0].me, old.sents[0].vs, old.sents[0].ve, Object.keys(old.sents[0].lk).join()]), JSON.stringify(['I heard you trained for years.', 10, 13, 1, 1, 9.9, 13.1, 'heard,trained']));
  eq('끝난 문장("Okay.")은 그대로 · 문장부호 없는 긴 조각은 20초 한도로 나뉨 · 합침 표시 · 파형 다시 맞추기', old.sents[1].e + ' | ' + old.sents.slice(2).map(x => Math.round((x.t - x.s) * 10) / 10).join() + ' | ' + old.mb + ' ' + (old.snap === undefined), 'Okay. | 19.5,3.5 | 1 true');
  eq('Gemini 는 안 부름', await p.evaluate(() => window.__calls.length) - nCalls, 0);
  await p.evaluate(() => window.__vocab.reload()); await p.waitForTimeout(300);
  eq('한 번만 (다시 불러와도 그대로)', await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'OLDCAPTION1').sents.length), 4);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
