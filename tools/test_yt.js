// v2.2 유튜브 쉐도잉: 링크 → Gemini 문장 정리(요청 모양) → 문장 누르면 그 시점 재생 · 문장마다 멈춤 → 한글 가림/보기
//       → 재생한 문장의 단어 = 뜻 카드(익힐 표현은 바로, 나머지는 Gemini) → 1단계/대기에 추가 → 목록·삭제. Gemini·oEmbed·YouTube IFrame API 는 stub.
const { chromium } = require('playwright');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'build', 'shots');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const SENTS = [
  { s: '00:00.5', t: '00:02.4', e: 'Hi everyone, welcome back.', k: '안녕하세요 여러분, 다시 오신 걸 환영해요.', x: [] },
  { s: '00:03.2', t: '00:06.9', e: "Today we'll dig into why agents really matter.", k: '오늘은 에이전트가 왜 정말 중요한지 파고들어 볼게요.', x: [{ q: 'dig into', w: 'dig into', p: 'phr.', m: '파고들다' }] },
  { s: '00:07.8', t: '00:09.9', e: "Let's figure out the rest.", k: '나머지를 알아내 봅시다.', x: [{ q: 'figure out', w: 'figure out', p: 'phr.', m: '알아내다' }] }
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());   // 진짜 네트워크로 나가지 않게 (썸네일 등)
  await p.addInitScript(sents => {
    window.__calls = []; window.__opened = []; window.__oembed = 200;
    window.open = u => { window.__opened.push(u); };
    const ok = obj => Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] })) });
    window.fetch = (url, opt) => {
      if (/oembed/.test(url)) { window.__calls.push({ url }); return Promise.resolve({ status: window.__oembed, text: () => Promise.resolve(window.__oembed === 200 ? JSON.stringify({ title: 'Test Talk', author_name: 'Tech' }) : 'Not Found') }); }
      const body = JSON.parse(opt.body); window.__calls.push({ url, body, headers: opt.headers });
      const sys = body.systemInstruction.parts[0].text;
      if (/tapped a word/.test(sys)) return ok({ w: 'really', p: 'adv.', m: '정말로' });
      if (window.__gemEmpty) return ok([]);
      if (window.__gemFail && window.__gemFail.length) { const f = window.__gemFail.shift(); return Promise.resolve({ status: f[0], text: () => Promise.resolve(JSON.stringify({ error: { message: f[1] } })) }); }
      return ok(sents);
    };
    // YouTube IFrame API 흉내: 호출만 기록하고, 시간은 테스트가 window.__ytT 로 정한다
    window.__yt = []; window.__ytT = 0; window.__ytState = -1;
    window.YT = {
      Player: function (el, o) {
        window.__yt.push({ fn: 'new', videoId: o.videoId, vars: o.playerVars }); window.__ytEvents = o.events;
        setTimeout(() => o.events.onReady({}), 0);
        // 진짜 API 처럼 seekTo 는 조금 늦게 반영된다 (그 사이 getCurrentTime 은 옛 위치)
        this.seekTo = t => { window.__yt.push({ fn: 'seek', t }); setTimeout(() => { window.__ytT = t; }, window.__seekDelay || 100); };
        this.playVideo = () => { window.__yt.push({ fn: 'play' }); window.__ytState = 1; };
        this.pauseVideo = () => { window.__yt.push({ fn: 'pause' }); window.__ytState = 2; };
        this.getCurrentTime = () => window.__ytT;
        this.getPlayerState = () => window.__ytState;
        this.destroy = () => { window.__yt.push({ fn: 'destroy' }); };
      }
    };
  }, SENTS);
  await p.goto(require('url').pathToFileURL(path.resolve(__dirname, '..', 'assets', 'index.html')).href); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { localStorage.setItem('vocab3.ai.v1', JSON.stringify({ key: 'TEST-KEY', model: 'gemini-3.8-flash' })); const s = window.__vocab.state(); s.settings.themeRandom = false; s.settings.colorTheme = 'sky'; window.__vocab.save(); });
  await p.reload(); await p.waitForTimeout(400);
  const yt = fn => p.evaluate(f => window.__yt.filter(c => c.fn === f), fn);
  const view = () => p.evaluate(() => document.querySelector('.view.active').id);

  // --- 홈 → 유튜브 목록 (빈 상태 · 약관 안내) ---
  eq('홈 가운데 타일 = 유튜브', await p.$$eval('.quick .q .q-t', x => x.map(e => e.textContent).join('/')), '회화 연습/유튜브/듣기 복습');
  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  eq('유튜브 목록 화면', await view(), 'view-yt');
  eq('빈 목록 안내', await p.$$eval('#view-yt .empty', x => x.length), 1);
  eq('YouTube 약관·Google 개인정보 링크', await p.$$eval('#view-yt .yt-legal [data-action="open-url"]', x => x.map(e => e.getAttribute('data-url')).join(' ')), 'https://www.youtube.com/t/terms https://policies.google.com/privacy');
  await p.screenshot({ path: OUT + '/300-yt-empty.png' });

  // --- 잘못된 링크 ---
  await p.click('#view-yt .topbar [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://example.com/watch?v=nope'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(200);
  eq('유튜브 링크 아니면 그대로', await view(), 'view-yt');
  eq('요청 안 나감', await p.evaluate(() => window.__calls.length), 0);

  // --- 추가 → 정리 ---
  await p.fill('#ytUrl', 'https://youtu.be/H5h_GUaR-bU?si=h9uf-rbSKjIVKX41'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(500);
  eq('영상 화면으로', await view(), 'view-ytv');
  const gem = await p.evaluate(() => window.__calls.find(c => c.body));
  eq('oEmbed 로 제목 (키 헤더 없이)', await p.evaluate(() => /oembed\?format=json&url=https%3A%2F%2Fwww\.youtube\.com%2Fwatch%3Fv%3DH5h_GUaR-bU/.test(window.__calls[0].url)), true);
  eq('Gemini 에 유튜브 링크 (영상 먼저, 지시는 뒤)', gem.body.contents[0].parts[0].fileData.fileUri + ' | ' + ('text' in gem.body.contents[0].parts[1]), 'https://www.youtube.com/watch?v=H5h_GUaR-bU | true');
  eq('1초에 2장 · 구간 자르기는 안 함 (v2.9)', JSON.stringify(gem.body.contents[0].parts[0].videoMetadata), '{"fps":2}');
  eq('생각 켜기 low — 끄기(thinkingBudget 0)로 덮어쓰지 않음 (v2.9)', JSON.stringify(gem.body.generationConfig.thinkingConfig), '{"thinkingLevel":"low"}');
  eq('스키마: 문장 배열 s/t/e/k/x (끝 시간 t, v2.3)', gem.body.generationConfig.responseSchema.type + ' ' + gem.body.generationConfig.responseSchema.items.required.join(','), 'ARRAY s,t,e,k,x');
  const sysT = gem.body.systemInstruction.parts[0].text;
  eq('시간은 영상 표기 MM:SS.d 로 받고 초 환산은 앱이 (v2.5)', /MM:SS\.d/.test(sysT) && /do NOT convert them to total seconds/.test(sysT) && gem.body.generationConfig.responseSchema.items.properties.s.type, 'STRING');
  eq('프롬프트: 문장을 쪼개지 말 것 · 화면 자막 줄바꿈 무시 (v2.3)', /Never split a sentence/.test(sysT) && /Ignore on-screen subtitles/.test(sysT) && !/at most about 20 words/.test(sysT), true);
  eq('저해상도 (받아쓰기)', gem.body.generationConfig.mediaResolution, 'MEDIA_RESOLUTION_LOW');
  eq('Gemini 키는 헤더로', gem.headers['x-goog-api-key'], 'TEST-KEY');
  eq('유튜브 정리는 설정 모델(3.8 Flash)과 상관없이 Flash-Lite (v2.7)', /models\/gemini-flash-lite-latest:generateContent/.test(gem.url), true);
  eq('답 순서 s→e→t→k→x (v2.7)', gem.body.generationConfig.responseSchema.items.propertyOrdering.join(','), 's,e,t,k,x');
  eq('제목', await p.textContent('#ytTitle'), 'Test Talk');
  eq('문장 3개', await p.$$eval('#ytList .ys', x => x.length), 3);
  eq('시간 표시', await p.$$eval('#ytList .ys-t', x => x.map(e => e.textContent).join(' ')), '0:00 0:03 0:07');
  eq('한글은 가려짐', await p.$$eval('#ytList .ko-line.blur', x => x.length), 3);
  eq('익힐 표현 밑줄', await p.$$eval('#ys1 .yw.gx', x => x.map(e => e.textContent).join(' ')), 'dig into');
  eq('플레이어 = 그 영상', await p.evaluate(() => window.__yt[0].videoId), 'H5h_GUaR-bU');
  eq('조작 버튼 숨김 controls 0 (v2.7)', await p.evaluate(() => window.__yt[0].vars.controls + '/' + window.__yt[0].vars.iv_load_policy), '0/3');
  eq('저장됨', await p.evaluate(() => window.__vocab.state().yt.length + '/' + window.__vocab.state().yt[0].sents.length), '1/3');
  eq('"한 번 더"는 오른쪽 아래(오른손 엄지), "문장마다"는 그 위 (v2.3)', await p.evaluate(() => { const rp = document.querySelector('[data-action="yt-replay"]').getBoundingClientRect(), pm = document.querySelector('[data-action="yt-pause-mode"]').getBoundingClientRect(); return innerWidth - rp.right < 24 && innerHeight - rp.bottom < 30 && rp.width >= 60 && pm.bottom <= rp.top; }), true);
  eq('영상은 맨 위 제자리 고정(sticky), 처음엔 다 보임 (v2.4)', await p.evaluate(() => { const b = document.querySelector('#ytBox'), r = b.getBoundingClientRect(); return getComputedStyle(b).position + ' ' + b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }), 'sticky true');
  await p.screenshot({ path: OUT + '/301-yt-video.png' });

  // --- v2.6 가로 화면: 왼쪽 영상 · 오른쪽 스크립트 ---
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(250);
  const land = () => p.evaluate(() => { const v = document.querySelector('#ytBox').getBoundingClientRect(), l = document.querySelector('#ytList').getBoundingClientRect(), f = document.querySelector('[data-action="yt-replay"]').getBoundingClientRect(); return { vl: Math.round(v.left), vr: Math.round(v.right), vt: Math.round(v.top), vh: Math.round(v.height), vb: Math.round(v.bottom), ll: Math.round(l.left), fl: Math.round(f.left), fr: Math.round(f.right), iw: innerWidth, ih: innerHeight }; });
  const L0 = await land();
  eq('가로: 영상 왼쪽 · 스크립트 오른쪽 · 안 겹침 · 영상 200px 이상', L0.vl === 0 && L0.vr <= L0.ll && L0.vh >= 200 && L0.vb <= L0.ih && L0.fl >= L0.ll && L0.fr <= L0.iw, true);
  await p.evaluate(() => document.getElementById('toast').classList.remove('show')); await p.waitForTimeout(300);   // 앞에서 띄운 "링크를 확인해 주세요" 안내가 README 사진에 안 찍히게
  await p.screenshot({ path: OUT + '/305-yt-landscape.png' });
  await p.evaluate(() => { document.querySelector('#ytList').scrollTop = 200; }); await p.waitForTimeout(150);
  eq('가로: 스크립트를 스크롤해도 영상은 제자리·안 가려짐', await p.evaluate(t => { const b = document.querySelector('#ytBox'), r = b.getBoundingClientRect(); return Math.round(r.top) === t && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }, L0.vt), true);
  await p.evaluate(() => { document.querySelector('#ytList').scrollTop = 0; }); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(250);
  eq('세로로 돌아오면 다시 위·아래 배치', await p.evaluate(() => getComputedStyle(document.querySelector('#ytBox')).position), 'sticky');

  // --- 문장 누르면 그 시점 재생, 다음 문장 시작에서 멈춤 ---
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(150);
  eq('살짝 앞에서 재생', JSON.stringify((await yt('seek')).slice(-1)[0]), JSON.stringify({ fn: 'seek', t: 2.9 }));
  eq('재생', (await yt('play')).length, 1);
  eq('재생한 문장 표시', await p.$$eval('#ytList .ys.act', x => x.map(e => e.id).join()), 'ys1');
  await p.evaluate(() => { window.__ytT = 5; }); await p.waitForTimeout(300);
  eq('아직 안 멈춤', (await yt('pause')).length, 0);
  eq('지금 나오는 문장 하이라이트', await p.$$eval('#ytList .ys.cur', x => x.map(e => e.id).join()), 'ys1');
  await p.evaluate(() => { window.__ytT = 6.7; }); await p.waitForTimeout(260);   // 끝 0.45초 안 → 화면 갱신마다 확인 시작
  await p.evaluate(() => { window.__ytT = 7.0; }); await p.waitForTimeout(60);
  eq('문장 끝(t 6.9 + 0.1)에서 바로 멈춤 — 0.2초 틱을 기다리지 않음 (v2.7)', (await yt('pause')).length, 1);
  await p.evaluate(() => { window.__ytT = 7.1; }); await p.waitForTimeout(300);
  eq('다음 문장(7.8)까지 안 읽음 · 한 번만 멈춤', (await yt('pause')).length, 1);
  await p.evaluate(() => { window.__seekDelay = 700; });
  await p.click('[data-action="yt-replay"]'); await p.waitForTimeout(500);
  eq('↻ 한 번 더 = 같은 문장', (await yt('seek')).slice(-1)[0].t, 2.9);
  eq('seek 직후 옛 시간(7.7)이어도 바로 안 멈춤', (await yt('pause')).length, 1);
  await p.waitForTimeout(500); await p.evaluate(() => { window.__seekDelay = 100; window.__ytT = 7.7; }); await p.waitForTimeout(300);
  eq('다시 끝에 오면 멈춤', (await yt('pause')).length, 2);
  // --- 문장 끝이 다음 문장 시작과 붙어 있어도 멈춘 자리의 괄호(cur)는 누른 문장(act)에 (v2.10) ---
  await p.evaluate(() => { window.__vocab.state().yt[0].sents[2].s = 7.1; });
  await p.click('[data-action="yt-replay"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__ytT = 6.8; }); await p.waitForTimeout(260);
  await p.evaluate(() => { window.__ytT = 7.0; }); await p.waitForTimeout(300);
  eq('멈춘 자리(7.0)에서 강조·괄호 같은 문장 — 다음 문장(7.1)으로 안 넘어감', (await yt('pause')).length + ' ' + await p.$$eval('#ytList .ys.act', x => x.map(e => e.id).join()) + ' ' + await p.$$eval('#ytList .ys.cur', x => x.map(e => e.id).join()), '3 ys1 ys1');
  await p.evaluate(() => { window.__ytT = 7.6; }); await p.waitForTimeout(300);
  eq('영상을 눌러 이어 보면 괄호는 시간 따라 다음 문장으로', await p.$$eval('#ytList .ys.cur', x => x.map(e => e.id).join()), 'ys2');
  await p.evaluate(() => { window.__vocab.state().yt[0].sents[2].s = 7.8; });

  // --- 한글 가림 → 누르면 보임 ---
  await p.click('#ys1 .ko-line'); await p.waitForTimeout(100);
  eq('누른 문장만 한글 보임', await p.$$eval('#ytList .ko-line.blur', x => x.length), 2);
  eq('한글 눌러도 재생 안 함', (await yt('seek')).length, 3);

  // --- 재생한 문장의 단어: 익힐 표현은 바로 뜻 ---
  await p.dblclick('#ys1 .yw[data-t="5"]'); await p.waitForTimeout(150);   // v2.18: 두 번 톡 = 뜻
  eq('표현 카드', await p.textContent('#ys1 .ycard .yc-h b') + ' = ' + await p.textContent('#ys1 .ycard .yc-m'), 'dig into = 파고들다');
  eq('표현은 Gemini 안 부름', await p.evaluate(() => window.__calls.filter(c => c.body && /tapped a word/.test(c.body.systemInstruction.parts[0].text)).length), 0);
  eq('두 번 톡: 첫 톡이 문장을 한 번 다시 재생, 둘째 톡은 뜻만', (await yt('seek')).length, 4);
  await p.screenshot({ path: OUT + '/302-yt-word.png' });
  await p.click('#ys1 [data-action="yt-add-word"][data-stage="1"]'); await p.waitForTimeout(150);
  const added = await p.evaluate(() => { const w = window.__vocab.state().words.find(w => w.w === 'dig into'); return w && [w.stage, w.m, w.e, w.k, w.t, w.dailyDate ? 'd' : ''].join('|'); });
  eq('1단계에 추가 (예문 = 영상 문장)', added, "1|파고들다|Today we'll dig into why agents really matter.|오늘은 에이전트가 왜 정말 중요한지 파고들어 볼게요.|유튜브|d");
  eq('추가됨 표시', await p.textContent('#ys1 .yc-ok'), '✓ 1단계에 추가했어요');

  // --- 표현이 아닌 단어: Gemini 로 뜻 → 대기에 추가 · 다시 누르면 저장된 뜻 ---
  await p.dblclick('#ys1 .yw[data-t="13"]'); await p.waitForTimeout(300);
  const look = await p.evaluate(() => window.__calls.filter(c => c.body && /tapped a word/.test(c.body.systemInstruction.parts[0].text)));
  eq('뜻 요청에 문장·단어', look.length + ' ' + /Tapped word: "really"/.test(look[0].body.contents[0].parts[0].text), '1 true');
  eq('단어 뜻은 설정 모델(3.8 Flash) 그대로', /models\/gemini-3\.8-flash:generateContent/.test(look[0].url), true);
  eq('뜻 카드', await p.textContent('#ys1 .ycard .yc-m'), '정말로');
  await p.click('#ys1 [data-action="yt-add-word"][data-stage="0"]'); await p.waitForTimeout(150);
  eq('대기에 추가', await p.evaluate(() => { const w = window.__vocab.state().words.find(w => w.w === 'really'); return w && w.stage; }), 0);
  await p.click('#ys1 [data-action="yt-card-close"]'); await p.waitForTimeout(100);
  eq('카드 닫힘', await p.$$eval('.ycard', x => x.length), 0);
  await p.dblclick('#ys1 .yw[data-t="13"]'); await p.waitForTimeout(150);
  eq('다시 누르면 저장된 뜻 (요청 없음)', await p.evaluate(() => window.__calls.filter(c => c.body && /tapped a word/.test(c.body.systemInstruction.parts[0].text)).length), 1);
  eq('이미 있는 단어 표시', await p.textContent('#ys1 .ycard .small'), '이미 단어장에 있어요 · 대기');

  // --- 기본 단어장에 이미 있는 표현 ---
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(100); await p.dblclick('#ys2 .yw[data-t="3"]'); await p.waitForTimeout(150);
  eq('기본 단어에 있는 표현은 추가 버튼 대신 안내', await p.textContent('#ys2 .ycard .small') + ' / 버튼 ' + await p.$$eval('#ys2 [data-action="yt-add-word"]', x => x.length), '이미 단어장에 있어요 · ' + await p.evaluate(() => ({ 0: '대기', 1: '1단계', 2: '2단계', 3: '3단계', 4: '졸업' })[window.__vocab.state().words.find(w => w.w === 'figure out').stage]) + ' / 버튼 0');
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(100);
  // --- v2.18: 재생한 문장의 단어를 한 번 톡 = 그 문장 다시 재생 (뜻 안 열림) ---
  await p.click('#ys1 [data-action="yt-card-close"]').catch(() => {}); await p.waitForTimeout(100);
  const sk1 = (await yt('seek')).length;
  await p.click('#ys1 .yw[data-t="13"]'); await p.waitForTimeout(700);
  eq('한 번 톡 = 다시 재생 · 뜻 카드 안 열림', ((await yt('seek')).length - sk1) + ' ' + await p.$$eval('.ycard', x => x.length), '1 0');
  // --- 재생 안 한 문장의 단어는 먼저 재생 ---
  await p.click('#ys2 .yw[data-t="3"]'); await p.waitForTimeout(150);
  eq('다른 문장 단어 → 그 문장 재생', (await yt('seek')).slice(-1)[0].t, 7.5);
  eq('카드는 안 열림', await p.$$eval('.ycard', x => x.length), 0);

  // --- 문장마다 멈춤 끄기 → 이어 듣기 ---
  await p.click('[data-action="yt-pause-mode"]'); await p.waitForTimeout(100);
  eq('멈춤 꺼짐 저장', await p.evaluate(() => window.__vocab.state().settings.ytPause), false);
  const pauses = (await yt('pause')).length;
  await p.click('#ys0 .ys-t'); await p.evaluate(() => { window.__ytT = 3.5; }); await p.waitForTimeout(300);
  eq('끄면 문장 끝에서 안 멈춤', (await yt('pause')).length, pauses);

  // --- 앱이 내려가면 멈춤 ---
  await p.evaluate(() => window.onAppPause()); await p.waitForTimeout(50);
  eq('앱 내려가면 일시정지', (await yt('pause')).length, pauses + 1);

  // --- v2.4: 목록을 올리면 문장이 영상 위를 덮는다 (영상은 제자리, 따라다니는 작은 창 없음) ---
  await p.setViewportSize({ width: 390, height: 420 }); await p.waitForTimeout(200);
  const top0 = await p.evaluate(() => Math.round(document.querySelector('#ytBox').getBoundingClientRect().top));
  await p.evaluate(() => { const l = document.querySelector('#ytList'); l.scrollTop = l.scrollHeight; }); await p.waitForTimeout(300);
  eq('스크롤하면 영상은 제자리, 문장 영역이 그 위를 덮음', await p.evaluate(t => { const b = document.querySelector('#ytBox'), r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Math.round(r.top) === t && document.querySelector('#ytBody').contains(hit) && document.querySelector('#ytList').scrollTop > 0; }, top0), true);
  const plays = (await yt('play')).length;
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(300);
  eq('덮인 채로 문장을 눌러도 재생 (작은 창 없음)', ((await yt('play')).length - plays) + ' ' + await p.evaluate(() => document.querySelectorAll('.pip, .yt-pip-x').length), '1 0');
  await p.dblclick('#ys2 .yw[data-t="9"]'); await p.waitForTimeout(400);
  eq('단어 카드는 오른쪽 아래 버튼에 안 가림 (scroll-padding)', await p.evaluate(() => { const c = document.querySelector('.ycard'), r = c.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return c.contains(hit); }), true);
  await p.screenshot({ path: OUT + '/304-yt-pinned.png' });
  await p.click('.ycard [data-action="yt-card-close"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { document.querySelector('#ytList').scrollTop = 0; }); await p.waitForTimeout(200);
  eq('맨 위로 내리면 영상이 다시 드러남', await p.evaluate(() => { const b = document.querySelector('#ytBox'), r = b.getBoundingClientRect(); return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }), true);
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);

  // --- 멈춤 켜고 재생 중에 나갔다 오면 옛 멈춤 지점이 남지 않는다 ---
  await p.click('[data-action="yt-pause-mode"]'); await p.waitForTimeout(100);
  await p.click('#ys1 .ys-t'); await p.waitForTimeout(400);
  // --- 뒤로 → 목록 (플레이어 정리) ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  eq('뒤로 = 유튜브 목록', await view(), 'view-yt');
  eq('떠나면 플레이어 정리', (await yt('destroy')).length >= 1, true);
  eq('목록 항목', await p.$$eval('#view-yt .yi-t', x => x.map(e => e.textContent).join()) + ' · ' + await p.textContent('#view-yt .yi-s').then(t => t.split(' · ')[0]), 'Test Talk · 3문장');
  await p.screenshot({ path: OUT + '/303-yt-list.png' });

  // --- 같은 영상 다시 → 새로 정리하지 않고 연다 ---
  const n = await p.evaluate(() => window.__calls.length);
  await p.click('#view-yt .topbar [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://www.youtube.com/watch?v=H5h_GUaR-bU&t=30'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(300);
  eq('같은 영상은 요청 없이 열기', (await p.evaluate(() => window.__calls.length)) === n && (await view()) === 'view-ytv', true);
  const pz = (await yt('pause')).length;
  await p.evaluate(() => { window.__ytT = 7.7; }); await p.waitForTimeout(400);
  eq('다시 들어와 영상 ▶로 보면 옛 지점에서 안 멈춤', (await yt('pause')).length, pz);
  // --- 다시 정리하기 (v2.3): 확인 → 새로 요청 → 문장 교체 ---
  const g0 = await p.evaluate(() => window.__calls.filter(c => c.body && c.body.contents[0].parts[0].fileData).length);
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200);
  eq('확인 창이 뜨면 오른쪽 아래 버튼은 어두운 막 아래 (못 누름)', await p.evaluate(() => { const r = document.querySelector('[data-action="yt-replay"]').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2).id; }), 'overlay');
  await p.click('#modal .btn.primary'); await p.waitForTimeout(500);
  eq('다시 정리 = Gemini 한 번 더', await p.evaluate(() => window.__calls.filter(c => c.body && c.body.contents[0].parts[0].fileData).length) - g0, 1);
  eq('문장 다시 표시', await p.$$eval('#ytList .ys', x => x.length), 3);
  eq('새로 정리한 영상엔 다시 정리 안내 없음 (tv 3)', await p.$$eval('.yt-old', x => x.length) + ' ' + await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'H5h_GUaR-bU').tv), '0 3');
  // --- 거절되면 한 번 더 (v2.9): 생각 설정 거부(400) → 생각 빼고, 한도(429) → 1초 1장으로 ---
  const c0 = await p.evaluate(() => window.__calls.length);
  await p.evaluate(() => { window.__gemFail = [[400, 'Thinking level is not supported for this model.'], [429, 'Resource has been exhausted (e.g. check quota).']]; });
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(600);
  eq('거절 두 번 뒤 세 번째에 성공: [생각·2장] → [생각 빼고·2장] → [생각·1장]', JSON.stringify(await p.evaluate(c0 => window.__calls.slice(c0).filter(c => c.body).map(c => [!!c.body.generationConfig.thinkingConfig, c.body.contents[0].parts[0].videoMetadata ? c.body.contents[0].parts[0].videoMetadata.fps : 1]), c0)), '[[true,2],[false,2],[true,1]]');
  eq('성공하면 문장 그대로 · 실패 안내 없음', await p.$$eval('#ytList .ys', x => x.length) + ' ' + await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'H5h_GUaR-bU').tv), '3 3');
  const c1 = await p.evaluate(() => window.__calls.length);
  await p.evaluate(() => { window.__gemFail = [[400, 'API key not valid. Please pass a valid API key.']]; });
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(500);
  eq('키 오류(400)는 다시 안 보내고 안내', (await p.evaluate(c1 => window.__calls.slice(c1).filter(c => c.body).length, c1)) + ' ' + await p.textContent('#toast').then(t => /API 키가 올바르지 않아요/.test(t)), '1 true');
  await p.evaluate(() => { window.__vocab.ytRetry([50, 50]); window.__gemFail = [0, 1, 2, 3, 4, 5].map(() => [503, 'The model is overloaded.']); });   // v2.18: 붐빔은 자동으로 두 번 더 (aiGenerate 도 한 번씩) → 6번 다 붐비면 안내
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(6000);
  eq('붐빔(503) 안내는 실제로 부른 Flash-Lite 이름 · 설정 바꾸라는 말 없음', await p.textContent('#toast'), '다시 정리 실패 — "gemini-flash-lite-latest" 모델이 지금 붐벼요. 잠시 후 다시 시도해 주세요');
  await p.evaluate(() => { window.__gemEmpty = true; });
  await p.click('[data-action="yt-redo"]'); await p.waitForTimeout(200); await p.click('#modal .btn.primary'); await p.waitForTimeout(500);
  eq('다시 정리가 빈 결과면 있던 문장 유지 + 안내', await p.$$eval('#ytList .ys', x => x.length) + ' ' + await p.evaluate(() => window.__vocab.state().yt.find(r => r.vid === 'H5h_GUaR-bU').sents.length) + ' ' + await p.textContent('#toast').then(t => /다시 정리 실패/.test(t)), '3 3 true');
  await p.evaluate(() => { window.__gemEmpty = false; });

  // --- 앱 안 재생이 막힌 영상(150) → 유튜브 앱에서 그 시점 ---
  await p.evaluate(() => window.__ytEvents.onError({ data: 150 })); await p.waitForTimeout(100);
  eq('막힘 안내', await p.textContent('.yt-err').then(t => /퍼가기를 막음/.test(t)), true);
  await p.click('#ys2 .ys-t'); await p.waitForTimeout(100);
  eq('유튜브에서 그 시점 열기', await p.evaluate(() => window.__opened.slice(-1)[0]), 'https://youtu.be/H5h_GUaR-bU?t=7');

  // --- 비공개·없는 영상 → 이유 + 다시 시도 ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.evaluate(() => { window.__oembed = 404; });
  await p.click('#view-yt .topbar [data-action="yt-add"]'); await p.waitForTimeout(300);
  await p.fill('#ytUrl', 'https://www.youtube.com/shorts/AAAAAAAAAAA'); await p.click('[data-action="yt-submit"]'); await p.waitForTimeout(300);
  eq('shorts 링크도 인식 · 없는 영상 안내', await p.textContent('#ytList .empty').then(t => /찾을 수 없어요/.test(t)), true);
  eq('다시 시도 버튼', await p.$$eval('#ytList [data-action="yt-retry"]', x => x.length), 1);

  // --- 목록에서 삭제 ---
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('#view-yt .yt-item:first-child [data-action="yt-del"]'); await p.waitForTimeout(200);
  await p.click('#modal .btn.danger'); await p.waitForTimeout(200);
  eq('삭제 후 1개', await p.evaluate(() => window.__vocab.state().yt.length), 1);
  eq('추가한 단어는 그대로', await p.evaluate(() => window.__vocab.state().words.filter(w => w.t === '유튜브').length), 2);

  // --- 백업 복원 등 바깥 데이터: 모양 검사 · 이스케이프 · 단어 분리(악센트·따옴표) · 캐시 키 ---
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('vocab3.state.v1'));
    const evil = '<img src=x onerror="window.__pwned=1">';
    s.yt.push({ id: 'bad1', vid: 'BBBBBBBBBBB', title: evil, date: evil, addedAt: 5, sents: { length: evil } });
    s.yt.push({ id: 'bad2', vid: 'nope' });
    s.yt.push({ id: 'uni', vid: 'CCCCCCCCCCC', title: 'Unicode', date: '2026-09-24', addedAt: 9, sents: [{ s: '1:15.4', t: '1:18', e: "The constructor said let’s go to the café.", k: '건설업자가 카페에 가자고 했어요.', x: [{ q: "let's go", w: "let's go", p: 'phrasal verb', m: '가자' }], lk: { said: { w: 'say', p: 'v.', m: '말하다' } } }] });
    localStorage.setItem('vocab3.state.v1', JSON.stringify(s)); window.__vocab.reload();
  }); await p.waitForTimeout(300);
  eq('vid 가 이상한 항목은 버림', await p.evaluate(() => window.__vocab.state().yt.map(r => r.id).join()), 'H5hItem,bad1,uni'.replace('H5hItem', await p.evaluate(() => window.__vocab.state().yt[0].id)));
  eq('예전 방식으로 정리된 영상엔 다시 정리 안내 (v2.5)', await p.evaluate(() => { const r = window.__vocab.state().yt.find(r => r.id === 'uni'); return r.tv === undefined; }), true);
  eq('MM:SS.d → 초 (1분 넘는 시간: 1:15.4 → 75.4, 1:18 → 78)', await p.evaluate(() => { const x = window.__vocab.state().yt.find(r => r.id === 'uni').sents[0]; return x.s + ',' + x.t; }), '75.4,78');
  eq('sents 가 배열이 아니면 정리 전으로', await p.evaluate(() => window.__vocab.state().yt.find(r => r.id === 'bad1').sents), null);
  await p.click('.quick [data-action="yt"]'); await p.waitForTimeout(200);
  await p.click('[data-action="yt-open"][data-id="bad1"]'); await p.waitForTimeout(300);
  eq('제목·날짜 HTML 은 글자로 (스크립트 실행 안 됨)', await p.evaluate(() => !window.__pwned && document.querySelector('#ytTitle').textContent.startsWith('<img')), true);
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(200);
  await p.click('[data-action="yt-open"][data-id="uni"]'); await p.waitForTimeout(300);
  eq('예전 방식 영상을 열면 맨 위에 다시 정리 안내', await p.$$eval('.yt-old [data-action="yt-redo"]', x => x.length), 1);
  eq('악센트 단어는 한 단어, 끝 따옴표 없음', await p.$$eval('#ys0 .yw', x => x.map(e => e.textContent).join('|')), 'The|constructor|said|let’s|go|to|the|café');
  eq('곧은·굽은 따옴표를 같게 보고 표현 밑줄', await p.$$eval('#ys0 .yw.gx', x => x.map(e => e.textContent).join(' ')), 'let’s go');
  await p.click('#ys0 .ys-t'); await p.waitForTimeout(150);
  await p.dblclick('#ys0 .yw[data-t="5"]'); await p.waitForTimeout(150);
  eq('저장된 뜻 캐시(said)', await p.textContent('#ys0 .ycard .yc-m'), '말하다');
  const before = await p.evaluate(() => window.__calls.filter(c => c.body && /tapped a word/.test(c.body.systemInstruction.parts[0].text)).length);
  await p.dblclick('#ys0 .yw[data-t="3"]'); await p.waitForTimeout(300);
  eq('constructor 는 캐시(프로토타입)로 착각하지 않고 뜻을 물음', await p.evaluate(() => window.__calls.filter(c => c.body && /tapped a word/.test(c.body.systemInstruction.parts[0].text)).length) - before, 1);
  await p.dblclick('#ys0 .yw[data-t="9"]'); await p.waitForTimeout(150);
  await p.click('#ys0 [data-action="yt-add-word"][data-stage="0"]'); await p.waitForTimeout(150);
  eq('목록에 없는 품사(phrasal verb)는 비워서 저장', await p.evaluate(() => JSON.stringify(window.__vocab.state().words.find(w => w.w === "let's go").p)), '""');

  console.log('errors:', errs);
  await b.close();
})();
