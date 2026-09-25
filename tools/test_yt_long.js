// v2.18 긴 영상 정리: 답이 최대 길이에서 잘리면 온전한 문장까지 살리고 마지막 문장 뒤부터 이어서 다시 요청 · 못 읽은 답·붐빔은 자동 재시도.
const { chromium } = require('playwright');
const path = require('path');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const S = (s, t, e) => ({ s, t, e, k: '해석 ' + e, x: [] });
const P1 = [S('00:01.0', '00:03.0', 'This is the first sentence here.'), S('00:04.0', '00:06.0', 'This is the second sentence here.'), S('00:07.0', '00:09.0', 'This is the third sentence here.')];
const P2 = [S('00:08.0', '00:09.0', 'This is the third sentence here.'), S('00:10.0', '00:12.0', 'This is the fourth sentence here.'), S('00:13.0', '00:15.0', 'This is the fifth sentence here.')];   // 첫 항목은 이미 받은 것(겹침)
const body = (txt, fin) => JSON.stringify({ candidates: [{ content: { parts: [{ text: txt }] }, finishReason: fin }] });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.addInitScript(() => {
    window.__calls = []; window.__seq = [];
    window.fetch = (url, opt) => {
      if (/oembed/.test(url)) return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ title: 'Long Talk' })) });
      window.__calls.push({ url, body: JSON.parse(opt.body) });
      const r = window.__seq.shift() || [200, JSON.stringify({ candidates: [{ content: { parts: [{ text: '[]' }] }, finishReason: 'STOP' }] })];
      return new Promise(ok => setTimeout(() => ok({ status: r[0], text: () => Promise.resolve(r[1]) }), window.__delay || 0));   // __delay: 실제처럼 답이 늦게 (그사이 플레이어가 영상 길이를 알려 준다)
    };
    window.YT = { Player: function (el, o) { setTimeout(() => o.events.onReady({}), 0); this.seekTo = () => {}; this.playVideo = () => {}; this.pauseVideo = () => {}; this.getCurrentTime = () => 0; this.getPlayerState = () => -1; this.getDuration = () => window.__dur || 0; this.destroy = () => {}; } };
  });
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); });
  await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => window.__vocab.ytRetry([30, 30]));
  const add = async vid => {
    await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(150);
    await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(300);
    await p.fill('#ytUrl', 'https://youtu.be/' + vid); await p.click('[data-action="yt-submit"]');
  };
  const rec = vid => p.evaluate(v => window.__vocab.state().yt.find(r => r.vid === v), vid);
  const userText = i => p.evaluate(i => window.__calls[i].body.contents[0].parts[1].text, i);

  // --- 1. 답이 잘림(MAX_TOKENS, JSON 중간에서 끊김) → 살린 3문장 + 9초 뒤부터 이어서 → 5문장 ---
  const cut = JSON.stringify(P1).slice(0, -1) + ',{"s":"00:10.0","t":"00:1';   // 4번째 항목 중간에서 잘림
  await p.evaluate(([a, c]) => { window.__seq = [[200, a], [200, c]]; }, [body(cut, 'MAX_TOKENS'), body(JSON.stringify(P2), 'STOP')]);
  await add('LONGVIDEO01'); await p.waitForTimeout(900);
  let r = await rec('LONGVIDEO01');
  eq('잘린 답을 살리고 이어 받아 5문장 (겹친 문장은 한 번)', JSON.stringify((r.sents || []).map(x => x.e)), JSON.stringify(['This is the first sentence here.', 'This is the second sentence here.', 'This is the third sentence here.', 'This is the fourth sentence here.', 'This is the fifth sentence here.']));
  eq('첫 요청은 그냥 · 둘째 요청은 "00:09.0 뒤부터 이어서"', (await userText(0)) + ' | ' + /Continue an earlier transcript.*up to 00:09\.0/.test(await userText(1)), 'Transcribe this video. | true');
  eq('요청 2번 · 둘 다 생각 low·1초 2장', await p.evaluate(() => window.__calls.length + ' ' + window.__calls.every(c => c.body.generationConfig.thinkingConfig.thinkingLevel === 'low' && c.body.contents[0].parts[0].videoMetadata.fps === 2)), '2 true');

  // --- 2. 완전한 JSON 이지만 finishReason MAX_TOKENS → 이어서 ---
  await p.evaluate(([a, c]) => { window.__calls = []; window.__seq = [[200, a], [200, c]]; }, [body(JSON.stringify(P1), 'MAX_TOKENS'), body(JSON.stringify(P2.slice(1)), 'STOP')]);
  await add('LONGVIDEO02'); await p.waitForTimeout(900);
  eq('MAX_TOKENS 면 완전한 JSON 이어도 이어 받음', (await rec('LONGVIDEO02')).sents.length + ' ' + await p.evaluate(() => window.__calls.length), '5 2');

  // --- 3. 못 읽은 답 → 자동으로 다시 → 성공 ---
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Sorry, I cannot help.' }] }, finishReason: 'STOP' }] })], [200, a]]; }, [body(JSON.stringify(P1), 'STOP')]);
  await add('LONGVIDEO03'); await p.waitForTimeout(900);
  eq('못 읽은 답은 자동으로 다시 → 3문장, 실패 안내 없음', (await rec('LONGVIDEO03')).sents.length + ' ' + await p.evaluate(() => window.__calls.length) + ' ' + await p.$$eval('#ytList .empty', x => x.length), '3 2 0');

  // --- 4. 붐빔(503) → 자동 재시도 → 성공 ---
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[503, '{"error":{"message":"overloaded"}}'], [503, '{"error":{"message":"overloaded"}}'], [200, a]]; }, [body(JSON.stringify(P1), 'STOP')]);
  await add('LONGVIDEO04'); await p.waitForTimeout(3000);
  eq('붐빔 두 번 뒤 성공 (aiGenerate 재시도 + 자동 재시도)', (await rec('LONGVIDEO04')).sents.length + ' ' + await p.evaluate(() => window.__calls.length), '3 3');

  // --- 5. 계속 못 읽으면 결국 안내 (무한 반복 없음) ---
  await p.evaluate(() => { window.__calls = []; const bad = [200, JSON.stringify({ candidates: [{ content: { parts: [{ text: 'nope' }] }, finishReason: 'STOP' }] })]; window.__seq = [bad, bad, bad, bad]; });
  await add('LONGVIDEO05'); await p.waitForTimeout(900);
  eq('세 번 다 못 읽으면 안내 + 다시 시도 버튼 (요청 3번)', (await p.textContent('#ytList .empty').catch(() => '')).includes('이해하지 못했어요') + ' ' + await p.evaluate(() => window.__calls.length), 'true 3');

  // --- 6. 이어 받다가 실패하면 받은 데까지는 살림 ---
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, a], [400, '{"error":{"message":"API key not valid"}}']]; }, [body(JSON.stringify(P1), 'MAX_TOKENS')]);
  await add('LONGVIDEO06'); await p.waitForTimeout(900);
  eq('이어 받기가 실패해도 받은 3문장은 남음 + 안내', (await rec('LONGVIDEO06')).sents.length + ' ' + /뒷부분 일부는 정리하지 못했어요/.test(await p.textContent('#toast')), '3 true');

  // --- v2.19 리뷰: 다시 정리가 일부만 받으면 완성본을 덮지 않음 ---
  await p.evaluate(() => { window.__vocab.go('ytv', { id: window.__vocab.state().yt.find(r => r.vid === 'LONGVIDEO01').id }); }); await p.waitForTimeout(300);
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, a], [400, '{"error":{"message":"API key not valid"}}']]; }, [body(JSON.stringify(P1), 'MAX_TOKENS')]);
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(900);
  eq('다시 정리가 일부만 → 있던 5문장 그대로 + 안내', (await rec('LONGVIDEO01')).sents.length + ' ' + /있던 문장을 그대로 뒀어요/.test(await p.textContent('#toast')), '5 true');
  // --- 앞으로 못 나가면 멈춤 (같은 곳 반복 요청 없음) · 이어 받기 요청에 마지막 문장 ---
  const stuck = body(JSON.stringify([S('00:07.0', '', 'This is the third sentence here.')]), 'MAX_TOKENS');
  await p.evaluate(([a, st]) => { window.__calls = []; window.__seq = [[200, a], [200, st], [200, st], [200, st], [200, st]]; }, [body(JSON.stringify(P1), 'MAX_TOKENS'), stuck]);
  await add('LONGVIDEO07'); await p.waitForTimeout(1200);
  eq('제자리면 멈춤: 요청 2번 · 같은 문장 안 겹침 · 일부만 안내', await p.evaluate(() => window.__calls.length) + ' ' + (await rec('LONGVIDEO07')).sents.length + ' ' + /뒷부분 일부는/.test(await p.textContent('#toast')), '2 3 true');
  eq('이어 받기 요청에 마지막 문장 인용', /last sentence is: "This is the third sentence here\."/.test(await userText(1)), true);
  // --- 경계: 다음 문장 시작이 앞 문장 끝보다 조금 앞이어도 안 빠짐 ---
  const P3 = [S('00:08.8', '00:12.0', 'This is the fourth sentence here.'), S('00:13.0', '00:15.0', 'This is the fifth sentence here.')];
  await p.evaluate(([a, c]) => { window.__calls = []; window.__seq = [[200, a], [200, c]]; }, [body(JSON.stringify(P1), 'MAX_TOKENS'), body(JSON.stringify(P3), 'STOP')]);
  await add('LONGVIDEO08'); await p.waitForTimeout(900);
  eq('경계 문장(8.8 < 앞 끝 9.0)도 들어감', (await rec('LONGVIDEO08')).sents.length, 5);
  // --- 100분 넘는 영상의 MMM:SS ---
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, a]]; }, [body(JSON.stringify([S('102:05.0', '102:08.0', 'This is a very late sentence.')]), 'STOP')]);
  await add('LONGVIDEO09'); await p.waitForTimeout(700);
  eq('102:05.0 = 6125초', (await rec('LONGVIDEO09')).sents[0].s, 6125);

  // --- v2.19: 안 잘렸어도(STOP) 영상 끝보다 1분 넘게 앞에서 멈추면 이어서 (1시간 영상이 40분에서 멈추던 것) ---
  await p.evaluate(() => { window.__dur = 300; window.__delay = 600; });   // 5분 영상인데 첫 답은 9초에서 끝
  const P4 = [S('00:10.0', '00:12.0', 'This is the fourth sentence here.'), S('04:50.0', '04:55.0', 'This is the very last sentence here.')];
  await p.evaluate(([a, c]) => { window.__calls = []; window.__seq = [[200, a], [200, c]]; }, [body(JSON.stringify(P1), 'STOP'), body(JSON.stringify(P4), 'STOP')]);
  await add('LONGVIDEO10'); await p.waitForTimeout(2500); await p.evaluate(() => { window.__delay = 0; });
  eq('영상 길이 기억 · 일찍 멈추면 이어서 받음 (요청 2번, 5문장)', (await rec('LONGVIDEO10')).dur + ' ' + await p.evaluate(() => window.__calls.length) + ' ' + (await rec('LONGVIDEO10')).sents.length, '300 2 5');
  // --- 예전에 일찍 멈춘 영상: "이어서 정리하기" → 뒷부분만 받아 붙임 ---
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, a]]; }, [body(JSON.stringify(P1), 'STOP')]);
  await p.evaluate(() => { window.__dur = 0; });
  await add('LONGVIDEO11'); await p.waitForTimeout(900);
  await p.evaluate(() => { const r = window.__vocab.state().yt.find(r => r.vid === 'LONGVIDEO11'); r.dur = 600; window.__vocab.save(); window.__vocab.go('ytv', { id: r.id }); }); await p.waitForTimeout(300);
  eq('"00:09.0까지만 정리됐어요 · 이어서 정리하기"', await p.textContent('.yt-old'), '⏱ 00:09.0까지만 정리됐어요 (영상 10:00) · 이어서 정리하기');
  const P5 = [S('00:08.0', '00:09.0', 'This is the third sentence here.'), S('00:20.0', '00:25.0', 'This is the late fourth sentence.'), S('09:50.0', '09:55.0', 'This is the late final sentence.')];
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, a]]; }, [body(JSON.stringify(P5), 'STOP')]);
  await p.click('[data-action="yt-more"]'); await p.waitForTimeout(900);
  eq('이어서 정리: 뒷부분만 1번 요청 · 겹친 문장 빼고 붙임(3 → 5) · 안내 사라짐', (await userText(0)).startsWith('Continue an earlier transcript') + ' ' + (await rec('LONGVIDEO11')).sents.length + ' ' + await p.$$eval('.yt-old', x => x.filter(e => /이어서/.test(e.textContent)).length), 'true 5 0');
  // --- v2.20: 화면을 연 뒤 길이를 알게 되면 안내가 바로 뜸 (나갔다 들어오지 않아도) · 맨 아래에도 늘 "이어서 정리하기" ---
  await p.evaluate(() => { window.__dur = 0; window.__delay = 0; });
  await p.evaluate(([a]) => { window.__calls = []; window.__seq = [[200, a]]; }, [body(JSON.stringify(P1), 'STOP')]);
  await add('LONGVIDEO12'); await p.waitForTimeout(900);
  eq('길이를 모를 땐 위 안내 없음 · 맨 아래엔 늘 있음', (await p.$$eval('.yt-old', x => x.filter(e => /이어서/.test(e.textContent)).length)) + ' ' + await p.$$eval('.yt-redo [data-action="yt-more"]', x => x.length), '0 1');
  await p.evaluate(() => { window.__dur = 900; }); await p.waitForTimeout(500);
  eq('길이를 알게 되면 바로 위에 안내', await p.$$eval('.yt-old', x => x.filter(e => /까지만 정리됐어요 \(영상 15:00\)/.test(e.textContent)).length), 1);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
