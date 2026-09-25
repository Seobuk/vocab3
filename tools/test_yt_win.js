// v2.23 받은 영상의 소리를 10분 창으로 잘라 보내는 이어 받기 (aiClip) — 가짜 안드로이드(토큰 'TKN')로 창 순서·시간 환산·창마다 붙이기·취소·폴백을 본다.
// 실제 소리 자르기(Java Offline.adts)와 Gemini 는 여기서 못 돌린다 — aiClip 은 요청(vid·a·b·본문)만 적고 __cseq 의 답을 돌려준다.
const { chromium } = require('playwright');
const path = require('path');
const ASSETS = path.resolve(__dirname, '..', 'assets'), OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const S = (s, t, e) => ({ s, t, e, k: '해석 ' + e, x: [] });
const body = (items, fin) => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(items) }] }, finishReason: fin || 'STOP' }] });
// 40문장, 마지막 끝 41:05 (2465초) — 사용자의 1시간 영상처럼
const OLD = []; for (let i = 0; i < 39; i++) OLD.push({ s: 10 + i * 60, t: 14 + i * 60, e: 'Sentence number ' + (i + 1) + ' is right here.', k: '문장 ' + (i + 1), x: [] });
OLD.push({ s: 2460, t: 2465, e: 'This is the old last sentence.', k: '옛 마지막', x: [] });
const wav = (() => { const n = 8000, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; })();

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.route('https://kr.hyunuk.vocab3/**', route => {
    const u = new URL(route.request().url());
    if (/^\/media\//.test(u.pathname)) return route.fulfill({ status: 200, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': String(wav.length) }, body: wav });
    return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) });
  });
  await p.addInitScript(() => {
    const LS = localStorage;
    window.__clips = []; window.__cseq = []; window.__calls = []; window.__aseq = []; window.__keep = [];
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); },
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, share() { }, copy() { }, openUrl() { }, audioState: () => '{}', exitApp() { },
      aiCall(id, url, key, bd) {   // 유튜브 링크 경로 (oEmbed 포함)
        if (/oembed/.test(url)) { setTimeout(() => window.onAiResult(id, 200, JSON.stringify({ title: 'Win Talk' })), window.__odelay || 10); return; }
        window.__calls.push({ body: JSON.parse(bd) });
        const r = window.__aseq.shift() || [200, JSON.stringify({ candidates: [{ content: { parts: [{ text: '[]' }] }, finishReason: 'STOP' }] })];
        setTimeout(() => window.onAiResult(id, r[0], r[1]), r[2] || 10);
      },
      aiClip(id, url, key, bd, vid, a, bb) {
        window.__clips.push({ vid, a, b: bb, body: JSON.parse(bd) });
        const r = window.__cseq.shift() || [-416, 'end'];
        setTimeout(() => window.onAiResult(id, r[0], r[1]), r[2] || 10);
      },
      keepOn(on) { window.__keep.push(!!on); },
      ytDownload() { }, ytDownloadCancel() { },
      mediaList: () => JSON.stringify({ WINVIDEO001: { kind: 'mp4', size: 208000000 } }),
      mediaDelete() { }, mediaEnv: () => ''
    };
    window.__bt = 'TKN';
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => t === 'TKN' ? impl[k](...a) : undefined;
  });
  await p.goto('https://kr.hyunuk.vocab3/'); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { window.Android.save('TKN', 'vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); });
  await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => window.__vocab.ytRetry([30, 30], null, 0));
  const reset = () => p.evaluate(OLD => {   // 사용자의 영상과 같은 기록으로 되돌리고 영상 화면을 연다
    const s = window.__vocab.state();
    s.yt = [{ id: 'w1', vid: 'WINVIDEO001', title: 'Win Talk', date: '2026-09-25', addedAt: 1, sents: JSON.parse(JSON.stringify(OLD)), tv: 3, mb: 1, dur: 3600, off: { kind: 'mp4', size: 208000000 } }];
    window.__vocab.save(); window.__vocab.go('ytv', { id: 'w1' });
    window.__clips = []; window.__cseq = []; window.__calls = []; window.__aseq = []; window.__keep = [];
  }, OLD).then(() => p.waitForTimeout(300));
  const rec = () => p.evaluate(() => window.__vocab.state().yt.find(r => r.id === 'w1'));
  const more = () => p.click('.yt-old [data-action="yt-more"]');

  // --- W1: 창 두 개 — 창 기준 시간을 영상 기준으로, 창마다 붙음, 끝까지 들으면 tail ---
  await reset();
  eq('41:05 까지만 정리됐다는 안내', await p.$$eval('.yt-old', x => x.filter(e => /41:05\.0까지만/.test(e.textContent)).length), 1);
  await p.evaluate(([w1, w2]) => { window.__cseq = [[200, w1, 400], [200, w2, 1500]]; }, [body([S('00:03.0', '00:06.0', 'Window one first new sentence here.'), S('09:40.0', '09:50.0', 'Window one last new sentence here.')]), body([S('00:10.0', '00:14.0', 'Window two only sentence right here.')])]);
  await more(); await p.waitForTimeout(200);
  eq('창 1: 41:04.0 → 51:04.0 (1/2) · 화면 켜 둠 · 안내', (await p.textContent('.yt-old')).includes('41:04.0 → 51:04.0 이어서 정리하는 중 (1/2)') + ' ' + await p.evaluate(() => window.__keep.join()) + ' ' + /화면을 켜 둔 채/.test(await p.textContent('.yt-old')), 'true true true');
  await p.screenshot({ path: OUT + '/360-yt-win.png' });
  await p.waitForTimeout(600);
  const c0 = await p.evaluate(() => window.__clips[0]);
  eq('창 1 요청: 소리 2464~3064초 · inlineData @CLIP@ · 유튜브 링크 없음 · 창 기준 시간 부탁', [c0.vid, c0.a, c0.b, c0.body.contents[0].parts[0].inlineData.data, c0.body.contents[0].parts[0].inlineData.mimeType, !!c0.body.contents[0].parts[0].fileData, /This audio is 41:04\.0 to 51:04\.0/.test(c0.body.contents[0].parts[1].text), !c0.body.generationConfig.mediaResolution].join(), 'WINVIDEO001,2464,3064,@CLIP@,audio/aac,false,true,true');
  eq('창 1 답이 오면 바로 붙음 (창 2 기다리는 중) · 시간은 영상 기준', (await rec()).sents.length + ' ' + (await rec()).sents.slice(40).map(x => x.s).join(), '42 2467,3044');
  eq('창 2 요청: 앞 창 마지막 문장 끝(3054) 1초 앞부터 · (2/2)', (await p.evaluate(() => window.__clips[1].a)) + ' ' + /\(2\/2\)/.test(await p.textContent('.yt-old')), '3053 true');
  await p.waitForTimeout(1500);
  const r1 = await rec();
  eq('끝: 43문장 · 마지막 3063 · 영상 끝까지 들음 = tail · 토스트 · 화면 켜 두기 끔', r1.sents.length + ' ' + r1.sents[42].s + ' ' + (r1.tail === r1.sents[42].t) + ' ' + /문장 3개를 이어 붙였어요/.test(await p.textContent('#toast')) + ' ' + await p.evaluate(() => window.__keep.slice(-1)[0]), '43 3063 true true false');
  eq('끝난 뒤 안내·아래 링크 없음', await p.$$eval('[data-action="yt-more"]', x => x.length), 0);
  eq('마지막 창이 영상 끝보다 1분 넘게 앞에서 멈춤 → 한 창 더 → 파일 끝(-416)', await p.evaluate(() => window.__clips.length), 3);

  // --- W2: 영상 기준 시간으로 답해도 두 번 더하지 않음 ---
  await reset();
  await p.evaluate(w => { window.__cseq = [[200, w]]; }, body([S('41:10.0', '41:14.0', 'An absolute time sentence right here.')]));
  await more(); await p.waitForTimeout(700);
  eq('영상 기준(41:10) 답 → 2470 그대로', (await rec()).sents[40].s, 2470);

  // --- W3: 말이 없는 창(음악) → 다음 창으로 넘어감 ---
  await reset();
  await p.evaluate(w => { window.__cseq = [[200, body0()], [200, w]]; function body0() { return JSON.stringify({ candidates: [{ content: { parts: [{ text: '[]' }] }, finishReason: 'STOP' }] }); } }, body([S('00:02.0', '00:05.0', 'After the music this sentence comes.')]));
  await more(); await p.waitForTimeout(700);
  eq('빈 창 → 다음 창은 3058 부터(창 끝 5초 앞의 1초 앞) · 문장 붙음', (await p.evaluate(() => window.__clips.map(c => c.a).slice(0, 2).join())) + ' ' + (await rec()).sents[40].s, '2464,3058 3060');

  // --- W4: 받은 파일을 못 읽으면(-1) 이번엔 유튜브 링크로 (자르지 않음) ---
  await reset();
  await p.evaluate(a => { window.__cseq = [[-1, 'FileNotFoundException: WINVIDEO001']]; window.__aseq = [[200, a]]; }, body([S('41:20.0', '41:24.0', 'A sentence from the link path here.')]));
  await more(); await p.waitForTimeout(700);
  const k0 = await p.evaluate(() => window.__calls[0] && window.__calls[0].body.contents[0].parts[0]);
  eq('-1 → 유튜브 링크 요청 (fps 2, 자르지 않음) · 붙음', (k0 && k0.fileData && /WINVIDEO001/.test(k0.fileData.fileUri)) + ' ' + JSON.stringify(k0 && k0.videoMetadata) + ' ' + (await rec()).sents[40].s, 'true {"fps":2} 2480');

  // --- W5: 취소 — 늦게 온 답은 버리고 화면 켜 두기 끔 ---
  await reset();
  await p.evaluate(w => { window.__cseq = [[200, w, 1200]]; }, body([S('00:03.0', '00:06.0', 'This late answer must be dropped.')]));
  await more(); await p.waitForTimeout(200);
  await p.click('.yt-old [data-action="yt-stop"]'); await p.waitForTimeout(1500);
  eq('취소: 문장 그대로 · 화면 켜 두기 끔 · 토스트', (await rec()).sents.length + ' ' + await p.evaluate(() => window.__keep.slice(-1)[0]) + ' ' + /멈췄어요/.test(await p.textContent('#toast')), '40 false true');

  // --- W6: 20분 넘는 받은 영상의 "다시 정리하기"도 창으로 · 뒤 창이 계속 실패하면 옛 문장 지킴 ---
  await reset();
  await p.evaluate(w => { const f = [500, '{}']; window.__cseq = [[200, w], f, f, f, f]; }, body([S('00:05.0', '00:09.0', 'Redo window one sentence here.'), S('09:00.0', '09:05.0', 'Redo window one last sentence.')]));
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(1200);
  eq('다시 정리: 첫 창 0~600 · 둘째 창 실패(500 ×3) → 옛 40문장 그대로 + 안내', (await p.evaluate(() => window.__clips.map(c => c.a + '-' + c.b).slice(0, 2).join())) + ' ' + (await rec()).sents.length + ' ' + /다시 정리 실패 — 뒷부분을/.test(await p.textContent('#toast')), '0-600,544-1144 40 true');

  // --- W7: 첫 창부터 파일 끝(-416) → 뒤엔 없음 ---
  await reset();
  await p.evaluate(() => { window.__cseq = [[-416, 'end']]; });
  await more(); await p.waitForTimeout(500);
  eq('바로 파일 끝 → tail · "더 정리할 영어 말이 없대요" · 링크 없음', ((await rec()).tail === 2465) + ' ' + /더 정리할 영어 말이 없대요/.test(await p.textContent('#toast')) + ' ' + await p.$$eval('[data-action="yt-more"]', x => x.length), 'true true 0');

  // --- W8: 창 안 오류(빠른 500 ×3) → 받은 만큼 남기고 ⚠ 배너 + 다시 이어서 ---
  await reset();
  await p.evaluate(w => { const f = [500, '{}']; window.__cseq = [[200, w], f, f, f]; }, body([S('00:03.0', '00:06.0', 'Kept before the failure sentence.')]));
  await more(); await p.waitForTimeout(900);
  eq('창 2 실패 → 1문장은 남음 · ⚠ "문장 1개는 붙였어요" · 다시 이어서', (await rec()).sents.length + ' ' + await p.$$eval('.yt-old', x => x.filter(e => /⚠ 문장 1개는 붙였어요/.test(e.textContent) && e.querySelector('[data-action="yt-more"]')).length), '41 1');
  // --- v2.24 V1: 앞쪽 창(a ≤ 605)인데 영상 기준으로 답해도 두 번 더하지 않음 (다시 정리 둘째 창) ---
  await reset();
  await p.evaluate(([w1, w2]) => { window.__cseq = [[200, w1], [200, w2]]; }, [body([S('00:05.0', '00:09.0', 'Redo first window opening sentence.'), S('09:00.0', '09:05.0', 'Redo first window closing sentence.')]), body([S('09:10.0', '09:14.0', 'Second window absolute time sentence.'), S('18:00.0', '18:04.0', 'Second window later absolute sentence.')])]);
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(900);
  eq('둘째 창(a=544) 영상 기준 답 550·1080 그대로', (await rec()).sents.map(x => x.s).join(), '5,540,550,1080');
  // --- v2.24 V2: 창 기준 답에 창 길이를 조금 넘는 값(606) 하나 → 창 전체를 영상 기준으로 잘못 보지 않음 ---
  await reset();
  await p.evaluate(w => { window.__cseq = [[200, w]]; }, body([S('00:03.0', '00:06.0', 'Relative window first sentence here.'), S('05:00.0', '05:04.0', 'Relative window middle sentence here.'), S('10:06.0', '10:08.0', 'Relative window slightly late sentence.')]));
  await more(); await p.waitForTimeout(700);
  eq('튀는 값 하나 있어도 +a (2467·2764·3070)', (await rec()).sents.slice(40).map(x => x.s).join(), '2467,2764,3070');
  // --- v2.24 V4: 제목(oEmbed)을 기다리는 사이 취소 → 정리 시작 안 함 ---
  await reset();
  await p.evaluate(() => { window.__odelay = 800; });
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(150);
  await p.click('[data-action="yt-stop"]'); await p.waitForTimeout(1200);
  eq('취소 뒤 소리 요청 0번 · 옛 40문장 그대로 · 화면 켜 두기 끔', (await p.evaluate(() => window.__clips.length)) + ' ' + (await rec()).sents.length + ' ' + await p.evaluate(() => window.__keep.slice(-1)[0]), '0 40 false');
  await p.evaluate(() => { window.__odelay = 0; });
  // --- v2.24 V5: 429 기다리는 중 취소 → 기다린 뒤 다시 보내지 않음 ---
  await reset();
  await p.evaluate(() => { window.__cseq = [[429, '{"error":{"details":[{"retryDelay":"1s"}]}}']]; });
  await more(); await p.waitForTimeout(300);
  await p.click('.yt-old [data-action="yt-stop"]'); await p.waitForTimeout(1500);
  eq('429 대기 중 취소 → 요청 1번뿐', await p.evaluate(() => window.__clips.length), 1);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
