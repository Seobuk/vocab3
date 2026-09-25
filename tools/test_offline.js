// v2.14 유튜브 영상 받기(오프라인) + 앱 <video> 플레이어 + 파형으로 문장 경계 맞춤.
// 안드로이드 브리지(window.Android, 토큰 'TKN')를 흉내 내고, 받은 영상은 page.route 로 WAV(사인파 + 알려진 무음 구간)를 준다
// (Playwright Chromium 엔 H.264/AAC 가 없다). 파형(envelope)도 같은 WAV 에서 Java 와 같은 규칙(20ms RMS → dBFS+100, 0~100)으로 만든다.
const { chromium } = require('playwright');
const path = require('path');
const ASSETS = path.resolve(__dirname, '..', 'assets'), OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const near = (name, got, lo, hi) => console.log((got >= lo && got <= hi ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + (+got).toFixed(3) + (got >= lo && got <= hi ? '' : ' (기대: ' + lo + '~' + hi + ')'));

// --- 테스트 소리: 16kHz 모노 16bit, 12초. 말(440Hz) 구간과 무음(아주 작은 잡음) ---
const SR = 16000, DUR = 12, SPEECH = [[0.5, 2.3], [2.7, 5.0], [5.2, 7.0], [9.5, 11.0]], DIP = [6.0, 6.04];   // DIP: 문장 안 40ms 끊김 (60ms 안 되니 무음 아님)
const pcm = new Int16Array(SR * DUR); let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const inSeg = (i, [a, b]) => i >= Math.round(a * SR) && i < Math.round(b * SR);
for (let i = 0; i < pcm.length; i++) {
  const loud = SPEECH.some(s => inSeg(i, s)) && !inSeg(i, DIP);
  pcm[i] = Math.round(((loud ? 0.5 * Math.sin(2 * Math.PI * 440 * i / SR) : 0) + (rnd() * 2 - 1) * 0.001) * 32767);
}
const wav = Buffer.alloc(44 + pcm.length * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(pcm.length * 2, 40); Buffer.from(pcm.buffer).copy(wav, 44);
const FR = SR / 50, env = Buffer.alloc(Math.floor(pcm.length / FR));
for (let f = 0; f < env.length; f++) {
  let sum = 0; for (let i = f * FR; i < (f + 1) * FR; i++) sum += (pcm[i] / 32768) ** 2;
  const db = 20 * Math.log10(Math.sqrt(sum / FR));
  env[f] = Math.max(0, Math.min(100, Math.round(db + 100))) || 0;
}
const ENV = env.toString('base64');
// AI 가 준 시간 (일부러 어긋나게) — 실제 말: 0.5~2.3 · 2.7~5.0 · 5.2~7.0 · 9.5~11.0
const SENTS = [
  { s: '00:00.8', t: '00:02.0', e: 'Good morning and welcome to the show.', k: '좋은 아침이에요.', x: [] },
  { s: '00:02.9', t: '00:04.7', e: 'Today we talk about learning languages.', k: '오늘은 언어 공부 얘기를 해요.', x: [] },
  { s: '00:05.4', t: '00:06.6', e: 'It takes a lot of practice every day.', k: '매일 연습이 많이 필요해요.', x: [] },
  { s: '00:09.9', t: '00:10.8', e: 'See you all next time, bye now.', k: '다음에 봐요.', x: [] }
];
const SERVE = new Set(['OFFLINE0001', 'QUEUEVID002']);   // BROKENVID03 은 404 (깨진 파일)

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.route('https://kr.hyunuk.vocab3/**', route => {   // 앱처럼 https://kr.hyunuk.vocab3/ 에서 서빙 + /media/<vid> 는 Range 지원 (Java 와 같은 계약)
    const u = new URL(route.request().url()), m = u.pathname.match(/^\/media\/([A-Za-z0-9_-]{11})$/);
    if (!m) return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) });
    if (!SERVE.has(m[1])) return route.fulfill({ status: 404, body: '' });
    const rg = /bytes=(\d+)-(\d*)/.exec(route.request().headers()['range'] || '');
    if (!rg) return route.fulfill({ status: 200, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Length': String(wav.length) }, body: wav });
    const s = +rg[1], e = Math.min(rg[2] ? +rg[2] : wav.length - 1, wav.length - 1);
    return route.fulfill({ status: 206, headers: { 'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + s + '-' + e + '/' + wav.length, 'Content-Length': String(e - s + 1) }, body: wav.subarray(s, e + 1) });
  });
  await p.addInitScript(({ ENV, SENTS }) => {
    const LS = localStorage, media = () => JSON.parse(LS.getItem('M:media') || '{}');
    window.__media = (vid, o) => { const m = media(); if (o) m[vid] = o; else delete m[vid]; LS.setItem('M:media', JSON.stringify(m)); };
    window.__dl = []; window.__sents = SENTS; window.__copied = '';
    const TITLES = { OFFLINE0001: 'Offline Talk', QUEUEVID002: 'Queue Talk', BROKENVID03: 'Broken Talk' };
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); },
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, share() { },
      copy: t => { window.__copied = t; }, openUrl: u => { window.__opened = u; }, audioState: () => '{}', exitApp() { },
      aiCall(id, url) {
        setTimeout(() => {
          const v = (decodeURIComponent(url).match(/v=([A-Za-z0-9_-]{11})/) || [])[1];
          window.onAiResult(id, 200, /oembed/.test(url) ? JSON.stringify({ title: TITLES[v] || 'Video' }) : JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(window.__sents) }] } }] }));
        }, 30);
      },
      // v2.14 브리지 — 받기 결과는 테스트가 window.onYtDl(...) 로 직접 준다 (모드 sdk 면 가짜 Java 가 바로 거절)
      ytDownload(vid, title) { window.__dl.push({ fn: 'dl', vid, title }); if (LS.getItem('M:mode') === 'sdk') setTimeout(() => window.onYtDl(vid, 'fail', 'sdk', 'API 30'), 10); },
      ytDownloadCancel(vid) { window.__dl.push({ fn: 'cancel', vid }); setTimeout(() => window.onYtDl(vid, 'fail', 'cancel', ''), 10); },
      mediaList: () => LS.getItem('M:media') || '{}',
      mediaDelete(vid) { window.__dl.push({ fn: 'del', vid }); window.__media(vid, null); },
      mediaEnv: vid => (media()[vid] || {}).env ? ENV : ''
    };
    window.__bt = 'TKN';   // 실제 앱처럼: 브리지는 첫 인자로 토큰을 받고, 틀리면 무시
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => { if (t !== 'TKN') { window.__badToken = (window.__badToken || 0) + 1; return undefined; } return impl[k](...a); };
    window.__ytNew = 0;   // 유튜브 IFrame 플레이어 stub — 만든 횟수만 센다
    window.YT = { Player: function (el, o) {
      window.__ytNew++; let st = -1; setTimeout(() => o.events.onReady({}), 0);
      this.seekTo = () => { }; this.playVideo = () => { st = 1; }; this.pauseVideo = () => { st = 2; }; this.getCurrentTime = () => 0; this.getPlayerState = () => st; this.getDuration = () => 60; this.destroy = () => { };
    } };
  }, { ENV, SENTS });
  await p.goto('https://kr.hyunuk.vocab3/'); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => { window.Android.save('TKN', 'vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-flash-lite-latest' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);

  const dl = fn => p.evaluate(f => window.__dl.filter(c => c.fn === f).map(c => c.vid).join(), fn);
  const rec = vid => p.evaluate(v => window.__vocab.state().yt.find(r => r.vid === v), vid);
  const open = vid => p.evaluate(v => { window.__vocab.go('ytv', { id: window.__vocab.state().yt.find(r => r.vid === v).id }); }, vid);
  const dlText = () => p.textContent('#ytDl');
  const ytdl = (vid, st, a, b) => p.evaluate(x => window.onYtDl(x[0], x[1], x[2], x[3]), [vid, st, a, b]);
  const tag = () => p.$eval('#ytPlayer', e => e.tagName);
  const vt = () => p.$eval('#ytPlayer', v => v.currentTime);
  const paused = () => p.waitForFunction(() => document.querySelector('#ytPlayer').paused, null, { timeout: 8000 });
  const ready = () => p.waitForFunction(() => { const v = document.querySelector('video#ytPlayer'); return v && v.readyState >= 1; }, null, { timeout: 8000 });
  const add = async url => {
    await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(100);
    await p.click('#view-yt [data-action="yt-add"]'); await p.waitForTimeout(200);
    await p.fill('#ytUrl', url); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(300);
  };

  // --- 1. 링크 추가 → 문장 정리와 동시에 자동으로 받기 · 받는 동안은 유튜브 플레이어 ---
  await add('https://youtu.be/OFFLINE0001');
  eq('링크 추가 = 자동 받기 호출 (vid)', await dl('dl'), 'OFFLINE0001');
  eq('받는 중 표시 + 취소', (await dlText()) + ' | ' + await p.$$eval('#ytDl [data-action="yt-dl-cancel"]', x => x.length), '⬇ 영상 받는 중 …취소 | 1');
  eq('받기 전엔 유튜브 플레이어', (await tag()) + ' ' + await p.evaluate(() => window.__ytNew), 'DIV 1');
  eq('문장도 정리됨', await p.$$eval('#ytList .ys', x => x.length), 4);

  // --- 2. 두 번째 영상은 줄 서기 (한 번에 하나) ---
  await add('https://youtu.be/QUEUEVID002');
  eq('받는 중이면 다음 영상은 호출 안 하고 대기', (await dl('dl')) + ' | ' + await dlText(), 'OFFLINE0001 | ⬇ 받기 대기 중취소');
  await ytdl('OFFLINE0001', 'info', 'mp4', 36700160);
  await ytdl('OFFLINE0001', 'progress', 12500000, 36700160);
  await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(150);
  eq('목록 항목에 진행률 · 대기', await p.$$eval('#view-yt .yi-s', x => x.map(e => e.textContent.split(' · ').slice(0, 1).concat(e.textContent.split(' · ').slice(2)).join(' · ')).join(' / ')), '4문장 · ⬇ 대기 / 4문장 · ⬇ 34%');
  await ytdl('OFFLINE0001', 'progress', 13212058, 36700160);
  eq('진행률은 그 자리만 갱신', await p.textContent('#yd-OFFLINE0001'), ' · ⬇ 36%');
  await open('OFFLINE0001'); await p.waitForTimeout(200);
  eq('영상 화면 진행률', await dlText(), '⬇ 영상 받는 중 36%취소');
  await p.screenshot({ path: OUT + '/310-offline-downloading.png' });

  // --- 3. 다 받음 → r.off 저장 · 보던 화면은 앱 플레이어로 · 다음 영상 받기 시작 ---
  await p.evaluate(() => window.__media('OFFLINE0001', { kind: 'mp4', size: 36700160, env: false }));
  const yn = await p.evaluate(() => window.__ytNew);
  await ytdl('OFFLINE0001', 'done', 'mp4', 36700160); await p.waitForTimeout(150);
  eq('done → r.off 저장', JSON.stringify((await rec('OFFLINE0001')).off), '{"kind":"mp4","size":36700160}');
  eq('저장됨 · 크기 · 지우기', await dlText(), '📁 저장됨 · 35MB지우기');
  eq('앱 <video> 로 바뀜 (유튜브 플레이어 새로 안 만듦)', (await tag()) + ' ' + ((await p.evaluate(() => window.__ytNew)) - yn) + ' ' + await p.$eval('#ytPlayer', v => v.src), 'VIDEO 0 https://kr.hyunuk.vocab3/media/OFFLINE0001');
  eq('컨트롤 없음 · playsinline', await p.$eval('#ytPlayer', v => v.controls + ' ' + v.hasAttribute('playsinline')), 'false true');
  eq('잘라내기(--ytcut) 없이 칸에 딱 맞게', await p.evaluate(() => { const a = document.querySelector('#ytBox').getBoundingClientRect(), v = document.querySelector('#ytPlayer').getBoundingClientRect(); return Math.round(v.top - a.top) + ' ' + Math.round(v.height - a.height) + ' ' + getComputedStyle(document.querySelector('#ytPlayer')).objectFit; }), '0 0 contain');
  eq('다음 영상 받기 시작', await dl('dl'), 'OFFLINE0001,QUEUEVID002');
  await ready();

  // --- 4. 파형 → 경계 맞춤 (실제 무음 경계와 같은지) ---
  await p.evaluate(() => window.__media('OFFLINE0001', { kind: 'mp4', size: 36700160, env: true }));
  await p.evaluate(() => window.onMediaEnv('OFFLINE0001')); await p.waitForTimeout(100);
  const r1 = await rec('OFFLINE0001');
  eq('파형으로 맞춘 [vs, ve] = 실제 말 구간 (0.5~2.3 · 2.7~5.0 · 5.2~7.0 · 9.5~11.0)', JSON.stringify(r1.sents.map(x => [x.vs, x.ve])), '[[0.5,2.3],[2.7,5],[5.2,7],[9.5,11]]');
  eq('저장 표시 snap · AI 시간(s/t)은 그대로', r1.snap + ' ' + r1.sents.map(x => x.s + '-' + x.t).join(' '), '1 0.8-2 2.9-4.7 5.4-6.6 9.9-10.8');
  eq('문장 40ms 끊김(60ms 미만)은 경계로 안 봄', r1.sents[2].vs + '~' + r1.sents[2].ve, '5.2~7');

  // --- 5. 문장 누르면 그 구간 재생 · 끝에서 멈춤 (vs−0.08 ~ min(ve+0.12, 다음 vs)) ---
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(60);
  near('재생 시작 = vs 2.7 − 0.08', await vt(), 2.6, 2.75);
  await paused();
  near('끝 = ve 5.0 + 0.12 (다음 말 5.2 전)에서 멈춤', await vt(), 5.07, 5.3);
  eq('강조(act)·괄호(cur) 같은 문장', await p.$$eval('#ytList .ys.act', x => x.map(e => e.id).join()) + ' ' + await p.$$eval('#ytList .ys.cur', x => x.map(e => e.id).join()), 'ys1 ys1');
  await p.click('[data-action="yt-replay"]'); await p.waitForTimeout(60);
  near('한 번 더 = 같은 구간', await vt(), 2.6, 2.75);
  await paused();
  await p.click('#ys3 .ys-t'); await p.waitForTimeout(60);
  near('떨어진 문장 시작 (9.5 − 0.08)', await vt(), 9.4, 9.55);
  await paused();
  near('떨어진 문장 끝 (11.0 + 0.12)', await vt(), 11.07, 11.3);
  await p.screenshot({ path: OUT + '/311-offline-local.png' });

  // --- 6. 다시 정리 → 파일은 그대로, 경계만 다시 ---
  await p.evaluate(() => { window.__sents = window.__sents.map((x, i) => i === 1 ? Object.assign({}, x, { s: '00:03.1' }) : x); });
  await p.click('.yt-redo [data-action="yt-redo"]'); await p.waitForTimeout(150);
  await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(400);
  const r2 = await rec('OFFLINE0001');
  eq('다시 정리해도 파일 그대로 · 경계 다시 맞춤', JSON.stringify(r2.off) + ' ' + r2.sents[1].s + ' ' + JSON.stringify(r2.sents.map(x => [x.vs, x.ve])) + ' ' + r2.snap + ' ' + await dl('del'), '{"kind":"mp4","size":36700160} 3.1 [[0.5,2.3],[2.7,5],[5.2,7],[9.5,11]] 1 ');

  // --- 7. 가로: 저장 줄 · 시간 수정(손 수정이 늘 우선) · 꾹 눌러 복사 ---
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(250);
  eq('가로에서도 저장 줄 보임 (스크립트 맨 위)', await p.evaluate(() => { const r = document.querySelector('#ytDl').getBoundingClientRect(); return r.height > 0 && r.top < innerHeight && r.left >= document.querySelector('#ytBox').getBoundingClientRect().right - 1; }), true);
  await p.click('#ytSide [data-action="yt-edit"]'); await p.waitForTimeout(100);
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(100);
  eq('수정 패널 값 = 파형 경계 기준 (시작 vs 2.7 · 끝 5.0+0.12)', await p.$$eval('#ytSide .yed-l b', x => x.map(e => e.textContent).join(' ')), '0:02.7 0:05.1');
  await paused();
  await p.click('#ytSide [data-action="yt-adj"][data-k="s"][data-d="0.1"]'); await p.waitForTimeout(60);
  eq('시작 +0.1 = 보이는 시작(2.7)+0.1 → ms', JSON.stringify(await p.evaluate(() => { const x = window.__vocab.state().yt.find(r => r.vid === 'OFFLINE0001').sents[1]; return [x.s, x.ms]; })), '[2.8,1]');
  near('손으로 고친 시작 그대로 (vs 무시)', await vt(), 2.78, 2.95);
  await paused();
  near('미리듣기 1.5초 뒤 멈춤', await vt(), 4.25, 4.5);
  await p.click('#ytSide [data-action="yt-adj"][data-k="t"][data-d="-0.1"]'); await p.waitForTimeout(60);
  await paused();
  near('끝 −0.1 → 5.0 (me) 에서 멈춤 — ve+0.12 무시', await vt(), 4.95, 5.2);
  eq('패널 값', await p.$$eval('#ytSide .yed-l b', x => x.map(e => e.textContent).join(' ')), '0:02.8 0:05.0');
  await p.screenshot({ path: OUT + '/312-offline-edit.png' });
  const e2 = await p.$eval('#ys2 .ys-e', e => { const r = e.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2 }; });
  const t0 = await vt();
  await p.mouse.move(e2.x, e2.y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(150);
  eq('꾹 누르면 복사 · 재생 안 함', (await p.evaluate(() => window.__copied)) + ' | ' + ((await vt()) === t0), 'It takes a lot of practice every day. | true');
  await p.click('#ytSide [data-action="yt-edit"]:not(.yed-open)'); await p.waitForTimeout(100);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);

  // --- 8. 소리만 받은 영상(m4a) = 같은 <video> + 제목 카드 ---
  await p.evaluate(() => window.__media('QUEUEVID002', { kind: 'm4a', size: 5000000, env: false }));
  await ytdl('QUEUEVID002', 'done', 'm4a', 5000000);
  await open('QUEUEVID002'); await p.waitForTimeout(200);
  eq('m4a: 앱 플레이어 + 제목 카드 · 저장 줄', (await tag()) + ' ' + await p.textContent('.yt-acard') + ' | ' + await dlText(), 'VIDEO 🎧Queue Talk | 📁 저장됨(소리만) · 4.8MB지우기');
  await p.screenshot({ path: OUT + '/313-offline-audio.png' });

  // --- 9. 취소 · 예전 영상 "오프라인 저장" · 실패 이유 · 다시 받기 · 깨진 파일은 유튜브로 ---
  await add('https://youtu.be/BROKENVID03');
  eq('줄이 비었으니 바로 받기', (await dl('dl')).split(',').pop(), 'BROKENVID03');
  eq('취소 누르면 Java 가 멈출 때까지 "취소하는 중" (버튼 없음)', await p.evaluate(() => { document.querySelector('#ytDl [data-action="yt-dl-cancel"]').click(); return document.querySelector('#ytDl').textContent + ' ' + document.querySelectorAll('#ytDl button').length; }), '⬇ 취소하는 중… 0');
  await p.waitForTimeout(100);
  eq('취소 → Java 취소 호출 → "오프라인 저장" 버튼으로', (await dl('cancel')) + ' | ' + await dlText(), 'BROKENVID03 | ⬇ 오프라인 저장인터넷 없이 보고, 문장 경계를 소리로 맞춰요');
  await p.click('#ytDl [data-action="yt-dl"]'); await p.waitForTimeout(60);
  eq('오프라인 저장 → 다시 받기 호출', (await dl('dl')).split(',').length, 4);
  await ytdl('BROKENVID03', 'fail', 'network', 'SocketTimeoutException');
  eq('실패 이유 안내 + 다시 받기', (await dlText()) + ' | ' + await p.$$eval('#ytDl [data-action="yt-dl"]', x => x.map(e => e.textContent).join()), '인터넷이 끊겨 영상을 다 받지 못했어요 (SocketTimeoutException)다시 받기 | 다시 받기');
  await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(100);
  eq('목록에도 실패 표시', await p.textContent('#yd-BROKENVID03'), ' · ⬇ 받기 실패');
  await open('BROKENVID03'); await p.waitForTimeout(150);
  await p.click('#ytDl [data-action="yt-dl"]'); await p.waitForTimeout(60);
  eq('다시 받기 → 호출', (await dl('dl')).split(',').length, 5);
  const yn2 = await p.evaluate(() => window.__ytNew);
  await ytdl('BROKENVID03', 'done', 'mp4', 20000000);
  await p.waitForFunction(() => document.querySelector('#ytPlayer').tagName !== 'VIDEO' && /유튜브로 재생/.test(document.querySelector('#toast').textContent), null, { timeout: 5000 });
  eq('재생 오류 → 유튜브 플레이어로 되돌아감 + 안내', ((await p.evaluate(() => window.__ytNew)) - yn2) + ' ' + await p.textContent('#toast'), '1 받은 영상을 재생하지 못해 유튜브로 재생해요');

  // --- 10. 지우기 → 파일 삭제 호출 + r.off 삭제 → 다시 유튜브 플레이어 (경계 vs/ve 는 남김) ---
  await open('OFFLINE0001'); await p.waitForTimeout(200);
  eq('받은 영상은 다시 열어도 앱 플레이어', await tag(), 'VIDEO');
  const yn3 = await p.evaluate(() => window.__ytNew);
  await p.click('#ytDl [data-action="yt-dl-del"]'); await p.waitForTimeout(150);
  await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(200);
  const r3 = await rec('OFFLINE0001');
  eq('지우기 → mediaDelete · off 없음 · 유튜브 플레이어 · vs 남김', (await dl('del')) + ' ' + (r3.off === undefined) + ' ' + (await tag()) + ' ' + ((await p.evaluate(() => window.__ytNew)) - yn3) + ' ' + r3.sents[0].vs, 'OFFLINE0001 true DIV 1 0.5');
  eq('지운 뒤엔 "오프라인 저장" 버튼', await p.$$eval('#ytDl [data-action="yt-dl"]', x => x.length), 1);

  // --- 11. 앱 시작 때 mediaList 로 맞추기: 없는 파일의 off 삭제 · 있는 파일은 off 채움 · iframe API 안 부름 ---
  await p.evaluate(() => window.__media('OFFLINE0001', { kind: 'mp4', size: 36700160, env: true }));   // 파일은 있는데 기록 없음 (BROKENVID03 은 기록만 있고 파일 없음)
  eq('맞추기 전: BROKENVID03 off 있음', !!(await rec('BROKENVID03')).off, true);
  await p.reload(); await p.waitForTimeout(400);
  eq('없는 파일 정리 · 있는 파일 채움', JSON.stringify(await p.evaluate(() => window.__vocab.state().yt.map(r => r.vid + ':' + (r.off ? r.off.kind : '-')).sort())), '["BROKENVID03:-","OFFLINE0001:mp4","QUEUEVID002:m4a"]');
  await open('OFFLINE0001'); await p.waitForTimeout(200);
  eq('받은 영상 열기 = 앱 플레이어 · 유튜브 IFrame 플레이어 안 만듦', (await tag()) + ' ' + await p.evaluate(() => window.__ytNew), 'VIDEO 0');
  eq('열 때 파형이 있으면 경계 맞춤 (snap)', (await rec('OFFLINE0001')).snap, 1);
  await ready();
  await p.click('#ys0 .ys-t'); await p.waitForTimeout(60);
  near('앱을 다시 켜도 그 구간 재생 (0.5 − 0.08)', await vt(), 0.4, 0.55);
  await paused();
  near('끝 = min(2.3+0.12, 다음 vs 2.7)', await vt(), 2.37, 2.6);
  await p.click('[data-action="back"]'); await p.waitForTimeout(150);
  eq('떠나면 멈춤·정리', await p.$$eval('video', x => x.length), 0);

  // --- 12. 목록에서 영상 삭제(yt-del) = 받은 파일도 삭제 ---
  const qid = (await rec('QUEUEVID002')).id;
  await p.click('.yi-del[data-id="' + qid + '"]'); await p.waitForTimeout(150);
  await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(150);
  eq('yt-del → mediaDelete(QUEUEVID002)', await dl('del'), 'QUEUEVID002');

  // --- 13. 안드로이드 13 미만: 안내만 (버튼 없음) · 새 링크도 받기 안 부름 ---
  await p.evaluate(() => localStorage.setItem('M:mode', 'sdk'));
  await open('BROKENVID03'); await p.waitForTimeout(150);
  eq('예전 영상엔 "오프라인 저장" 버튼', await p.$$eval('#ytDl [data-action="yt-dl"]', x => x.map(e => e.textContent).join()), '⬇ 오프라인 저장');
  await p.click('#ytDl [data-action="yt-dl"]'); await p.waitForTimeout(100);
  eq('SDK 부족 안내 · 버튼 없음', (await dlText()) + ' | ' + await p.$$eval('#ytDl button', x => x.length), '안드로이드 13 이상에서만 영상을 받을 수 있어요 | 0');
  const n0 = (await dl('dl')).split(',').length;
  await add('https://youtu.be/NEWVIDEO004');
  eq('그 뒤 새 링크는 받기 안 부르고 안내', ((await dl('dl')).split(',').length - n0) + ' | ' + await dlText(), '0 | 안드로이드 13 이상에서만 영상을 받을 수 있어요');

  // --- 14. 경계 계산 규칙 (함수 직접) ---
  eq('계속 시끄러운 소리(음악 등)는 안 맞춤', await p.evaluate(() => { const e = new Uint8Array(500); for (let i = 0; i < 500; i++) e[i] = 85 + i % 5; const ss = [{ s: 1, t: 3 }, { s: 3.2, t: 6 }]; return window.__vocab.ytSnapCalc(ss, e) + ' ' + JSON.stringify(ss); }), 'false [{"s":1,"t":3},{"s":3.2,"t":6}]');
  eq('붙은 경계에 무음이 없으면 창 안 가장 조용한 프레임에서 둘 다', await p.evaluate(() => {
    const e = new Uint8Array(500); for (let i = 0; i < 500; i++) e[i] = i < 60 ? 30 : 90; e[150] = 60; e[190] = 40;   // 190(3.81초)은 창 [2.3, 3.7] 밖
    const ss = [{ s: 1.3, t: 2.9 }, { s: 3.1, t: 9 }]; window.__vocab.ytSnapCalc(ss, e); return JSON.stringify(ss.map(x => [x.vs, x.ve]));
  }), '[[1.2,3.01],[3.01,null]]');

  const snap = (n, speech, ss) => p.evaluate(([n, speech, ss]) => {   // 20ms 프레임: 말 80 · 무음 20
    const e = new Uint8Array(n); for (let k = 0; k < n; k++) { const t = (k + 0.5) * 0.02; e[k] = speech.some(([a, b]) => t >= a && t < b) ? 80 : 20; }
    window.__vocab.ytSnapCalc(ss, e); return JSON.stringify(ss.map(x => [x.vs, x.ve]));
  }, [n, speech, ss]);
  eq('짧은 문장이 한 무음에 시작·끝을 다 뺏겨 뒤집히면(vs 5.5 > ve 5.3) 버리고 AI 시간', await snap(600, [[2, 5.3], [5.5, 10]], [{ s: 2, t: 5 }, { s: 5, t: 5.8 }, { s: 5.8, t: 9.5 }]), '[[2,5.3],[null,null],[5.5,10]]');
  eq('한 문장 안 쉼이 시작·끝 둘 다로 잡혀 뒤집히면 버림', await snap(600, [[9.4, 10.1], [10.3, 11]], [{ s: 10, t: 10.5 }]), '[[null,null]]');
  eq('붙은 경계 = 무음 구간의 실제 시작·끝 (창 끝에서 자르지 않음 — 말 앞 긴 무음 없게)', await snap(700, [[1, 4.2], [7.5, 12]], [{ s: 1, t: 5 }, { s: 5.4, t: 12 }]), '[[1,4.2],[7.5,12]]');
  eq('다음 문장 시작을 손으로 고쳤으면(ms) 파형 끝(ve)보다 그게 우선', await p.evaluate(() => JSON.stringify(window.__vocab.ytRange({ sents: [{ s: 1, t: 3, vs: 1, ve: 3.6 }, { s: 3.2, t: 5, ms: 1 }] }, 0))), '{"from":0.92,"end":3.2}');

  // --- 15. 지난 영상의 유튜브 스크립트 실패가 늦게 와도 받은 영상(<video>)은 그대로 ---
  await p.evaluate(() => { delete window.YT; const st = window.setTimeout; window.__t20 = []; window.setTimeout = function (f, ms) { if (ms === 20000) window.__t20.push(f); return st.apply(window, arguments); }; });
  await open('NEWVIDEO004'); await p.waitForTimeout(300);
  eq('받지 않은 영상 + 유튜브 스크립트 못 받음 → 안내', await p.$$eval('#ytBody .yt-err', x => x.length), 1);
  await open('OFFLINE0001'); await ready();
  await p.evaluate(() => window.__t20.forEach(f => f())); await p.waitForTimeout(100);   // 20초 타이머들이 이제 돈 셈 (ytApi 것은 이미 꺼졌지만 직접 불러도 무해해야)
  eq('받은 영상엔 유튜브 오류 안내 없음', (await tag()) + ' ' + await p.$$eval('#ytBody .yt-err', x => x.length), 'VIDEO 0');
  await p.evaluate(() => { window.__opened = ''; }); await p.click('#ys0 .ys-t'); await p.waitForTimeout(100);
  eq('문장 누르면 받은 영상 재생 (유튜브 앱 안 엶)', (await p.evaluate(() => window.__opened || '-')) + ' ' + ((await vt()) > 0.3), '- true');
  await paused();

  // --- 16. 받는 중인 영상을 목록에서 삭제 → Java 의 cancel 을 기다렸다 다음 것 · 끼어든 progress 가 줄을 잃게 하지 않음 ---
  await p.evaluate(() => localStorage.removeItem('M:mode')); await p.reload(); await p.waitForTimeout(400);
  await add('https://youtu.be/DELVIDEO005'); await add('https://youtu.be/NEXTVIDE006');
  eq('DELVIDEO005 받는 중 · NEXTVIDE006 대기', (await dl('dl')).split(',').pop(), 'DELVIDEO005');
  await p.evaluate(() => window.__vocab.go('yt')); await p.waitForTimeout(100);
  await p.click('.yi-del[data-id="' + (await rec('DELVIDEO005')).id + '"]'); await p.waitForTimeout(150);
  await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(150);
  eq('삭제 → mediaDelete · 다음 것은 Java 가 멈췄다고 할 때까지 안 부름 (busy 5초 헛걸음 없게)', (await dl('del')).split(',').pop() + ' ' + (await dl('dl')).split(',').filter(v => v === 'NEXTVIDE006').length, 'DELVIDEO005 0');
  await ytdl('DELVIDEO005', 'progress', 5000000, 20000000);   // 멈추기 전에 보낸 진행률이 늦게 옴
  await ytdl('DELVIDEO005', 'fail', 'cancel', '');
  eq('cancel 뒤 다음 영상 받기', (await dl('dl')).split(',').pop(), 'NEXTVIDE006');
  await ytdl('OTHERVID007', 'progress', 1, 10);   // JS 가 모르는 받기(화면이 다시 떴을 때 등)가 끼어듦
  await ytdl('OTHERVID007', 'fail', 'cancel', '');
  eq('끼어든 받기가 끝나면 받던 영상을 다시 부름 (잃지 않음)', (await dl('dl')).split(',').filter(v => v === 'NEXTVIDE006').length, 2);

  eq('토큰 없는 호출 없음', await p.evaluate(() => window.__badToken || 0), 0);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
