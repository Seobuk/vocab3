// v2.28 Google 드라이브 연동: 사용자가 고른 드라이브 파일(SAF 문서) 하나에 학습 기록을 자동 저장 · 새 폰에서 불러오기.
// 가짜 안드로이드(토큰 'TKN'): syncLink/syncOpen 은 파일 고르기 대신 바로 onSync 로 답하고, syncWrite 는 쓴 내용을 적는다. 실제 SAF·드라이브 앱은 폰에서만.
const { chromium } = require('playwright');
const path = require('path');
const ASSETS = path.resolve(__dirname, '..', 'assets');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com|api\.github\.com/, r => r.abort());
  await p.route('https://kr.hyunuk.vocab3/**', route => { const u = new URL(route.request().url()); return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) }); });
  await p.addInitScript(() => {
    const LS = localStorage;
    window.__writes = []; window.__unlinks = 0; window.__drive = '';
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); }, remove: k => LS.removeItem('A:' + k),
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, share() { }, copy() { }, openUrl() { }, audioState: () => '{}', exitApp() { }, keepOn() { },
      mediaList: () => '{}', mediaEnv: () => '', appInfo: () => JSON.stringify({ installer: 'com.android.vending', vc: 52 }),   // Play 설치로 — 업데이트 확인은 끔
      aiCall(id) { setTimeout(() => window.onAiResult(id, 404, '{}'), 10); },
      syncInfo: () => LS.getItem('T:sync') || '{}',
      syncLink(name) { LS.setItem('T:sync', JSON.stringify({ uri: 'content://drive/1', name })); setTimeout(() => window.onSync('linked', name, ''), 10); },
      syncOpen() { LS.setItem('T:sync', JSON.stringify({ uri: 'content://drive/2', name: 'vocab3-sync.json' })); setTimeout(() => window.onSync('opened', window.__drive, 'vocab3-sync.json'), 10); },
      syncWrite(json) { window.__writes.push(json); setTimeout(() => window.onSync('written', String(json.length), ''), 10); },
      syncUnlink() { window.__unlinks++; LS.removeItem('T:sync'); }
    };
    window.__bt = 'TKN';
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => t === 'TKN' ? impl[k](...a) : undefined;
  });
  await p.goto('https://kr.hyunuk.vocab3/'); await p.waitForTimeout(200);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
  const settings = async () => { await p.evaluate(() => window.__vocab.go('settings')); await p.waitForTimeout(200); };
  const group = () => p.$eval('.sync-g', e => e.textContent);
  const writes = () => p.evaluate(() => window.__writes.length);

  // --- 1. 연동 전: 설정에 연동하기·불러오기 ---
  await settings();
  eq('연동 전 안내 · 버튼 두 개', /폰을 바꿔도 이어지게/.test(await group()) + ' ' + await p.$$eval('.sync-g [data-action="sync-new"], .sync-g [data-action="sync-open"]', x => x.length), 'true 2');
  // --- 2. 연동하기 → 바로 한 번 저장 · 연동됨 표시 ---
  await p.click('[data-action="sync-new"]'); await p.waitForTimeout(300);
  eq('연동하면 바로 저장 (학습 기록 JSON, Gemini 키 없음)', (await writes()) + ' ' + (await p.evaluate(() => { const j = JSON.parse(window.__writes[0]); return Array.isArray(j.words) && !/TEST-KEY|"key"/.test(window.__writes[0]); })), '1 true');
  eq('연동됨 · 파일 이름 · 마지막 저장 방금', /연동됨 · vocab3-sync\.json/.test(await group()) + ' ' + /마지막 저장 방금/.test(await group()), 'true true');
  // --- 3. 바뀐 게 있을 때만 앱을 내리면 저장 ---
  await p.evaluate(() => window.onAppPause()); await p.waitForTimeout(200);   // 첫 내림은 사용 시간이 쌓여 바뀔 수 있다
  const wp = await writes();
  await p.evaluate(() => window.onAppPause()); await p.waitForTimeout(200);
  eq('바뀐 게 없으면 내려도 안 씀', (await writes()) - wp, 0);
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.dailyGoal = 33; window.__vocab.save(); window.onAppPause(); }); await p.waitForTimeout(200);
  eq('바꾸고 내리면 씀 (바뀐 값 들어감)', ((await writes()) - wp) + ' ' + (await p.evaluate(() => JSON.parse(window.__writes[window.__writes.length - 1]).settings.dailyGoal)), '1 33');
  await p.evaluate(() => window.onAppResume()); await p.waitForTimeout(100);
  // --- 4. 쓰기 오류 → 설정에 ⚠ · 다음에 다시 씀 ---
  await p.evaluate(() => window.onSync('error', 'SecurityException: no permission', '')); await p.waitForTimeout(100);
  await settings();
  eq('오류 표시', /⚠ SecurityException/.test(await group()), true);
  const wn = await writes();
  await p.click('[data-action="sync-now"]'); await p.waitForTimeout(200);
  eq('지금 저장 → 다시 씀 · 오류 지워짐', ((await writes()) - wn) + ' ' + /⚠/.test(await group()), '1 false');
  // --- 5. 연동 끊기 ---
  await p.click('[data-action="sync-unlink"]'); await p.waitForTimeout(150); await p.click('#modal .btn.danger'); await p.waitForTimeout(200);
  eq('끊기 → 연동 전 화면', (await p.evaluate(() => window.__unlinks)) + ' ' + /폰을 바꿔도 이어지게/.test(await group()), '1 true');
  // --- 6. 새 폰: 드라이브에서 불러오기 → 덮어쓰기 → 그 파일에 이어서 저장 ---
  const drive = await p.evaluate(() => { const s = JSON.parse(JSON.stringify(window.__vocab.state())); s.words = s.words.slice(0, 7); s.words.forEach((w, i) => { if (i < 3) w.stage = 4; }); s.settings.dailyGoal = 44; return JSON.stringify(s); });
  await p.evaluate(d => { window.__drive = d; }, drive);
  const w0 = await writes();
  await p.click('[data-action="sync-open"]'); await p.waitForTimeout(300);
  eq('불러오기 확인 창 (단어 7개 · 졸업 3)', /드라이브의 기록으로 이 폰을 맞출까요/.test(await p.textContent('#modal')) + ' ' + /단어 7개 \(졸업 3\)/.test(await p.textContent('#modal')), 'true true');
  await p.click('#modal [data-value="replace"]'); await p.waitForTimeout(400);
  eq('덮어쓰기 → 이 폰 데이터가 드라이브 것 · 바로 이어서 저장', (await p.evaluate(() => window.__vocab.state().words.length + ' ' + window.__vocab.state().settings.dailyGoal)) + ' ' + ((await writes()) - w0), '7 44 1');
  // --- 7. 불러오기 취소 → 연동도 풀림 (빈 폰 기록이 드라이브를 덮지 않게) ---
  const u0 = await p.evaluate(() => window.__unlinks), w1 = await writes();
  await p.evaluate(() => window.Android.syncUnlink('TKN')); await settings();
  await p.click('[data-action="sync-open"]'); await p.waitForTimeout(300);
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(200);
  eq('취소 → 연동 해제 · 쓰기 없음', ((await p.evaluate(() => window.__unlinks)) - u0) + ' ' + ((await writes()) - w1) + ' ' + /폰을 바꿔도 이어지게/.test(await group()), '2 0 true');
  // --- 8. 백업 파일이 아니면 거절 ---
  await p.evaluate(() => { window.__drive = 'hello world'; }); await p.click('[data-action="sync-open"]'); await p.waitForTimeout(300);
  eq('백업 파일이 아니면 안내 · 연동 안 함', /백업 파일이 아니에요/.test(await p.textContent('#toast')) + ' ' + /폰을 바꿔도 이어지게/.test(await group()), 'true true');
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
