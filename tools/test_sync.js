// v2.28~v2.29 Google 드라이브 연동: 연동·자동 저장·새 폰 불러오기 + v2.28 리뷰 결함(확인 창 동안 덮어쓰기 등) 회귀 검사.
// 가짜 Android 는 패치한 Java 처럼: syncOpen → T:pend(연동 아님) · syncCommit → T:sync · syncUnlink → 둘 다 지움.
const { chromium } = require('playwright');
const path = require('path');
const ASSETS = process.env.ASSETS || path.resolve(__dirname, '..', 'assets');
let fails = 0;
const eq = (name, got, want) => { const ok = String(got) === String(want); if (!ok) fails++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (ok ? '' : ' (기대: ' + want + ')')); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-09-26T10:00:00') });
  await p.route(/youtube\.com|ytimg\.com|api\.github\.com/, r => r.abort());
  await p.route('https://kr.hyunuk.vocab3/**', route => { const u = new URL(route.request().url()); return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) }); });
  await p.addInitScript(() => {
    const LS = localStorage;
    window.__writes = []; window.__unlinks = 0; window.__drive = ''; window.__fail = false; window.__hold = null;
    const done = json => window.__fail ? window.onSync('error', 'FileNotFoundException: gone', '') : window.onSync('written', String(json.length), '');
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); }, remove: k => LS.removeItem('A:' + k),
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, share() { }, copy() { }, openUrl() { }, audioState: () => '{}', exitApp() { }, keepOn() { },
      mediaList: () => '{}', mediaEnv: () => '', appInfo: () => JSON.stringify({ installer: 'com.android.vending', vc: 53 }),
      aiCall(id) { setTimeout(() => window.onAiResult(id, 404, '{}'), 10); },
      syncInfo: () => LS.getItem('T:sync') || '{}',
      syncLink(name) { LS.setItem('T:sync', JSON.stringify({ uri: 'content://drive/1', name })); setTimeout(() => window.onSync('linked', name, ''), 10); },
      syncOpen() { LS.setItem('T:pend', 'content://drive/2'); setTimeout(() => window.onSync('opened', window.__drive, 'vocab3-sync.json'), 10); },
      syncCommit() { if (LS.getItem('T:pend')) { LS.setItem('T:sync', JSON.stringify({ uri: LS.getItem('T:pend'), name: 'vocab3-sync.json' })); LS.removeItem('T:pend'); } },
      syncWrite(json) { window.__writes.push(json); if (window.__hold === true) { window.__hold = () => done(json); return; } setTimeout(() => done(json), 10); },
      syncUnlink() { window.__unlinks++; LS.removeItem('T:sync'); LS.removeItem('T:pend'); }
    };
    window.__bt = 'TKN';
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => t === 'TKN' ? impl[k](...a) : undefined;
  });
  const run = ms => p.clock.runFor(ms);
  await p.goto('https://kr.hyunuk.vocab3/'); await run(300);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await run(600);
  const settings = async () => { await p.evaluate(() => window.__vocab.go('settings')); await run(200); };
  const group = () => p.$eval('.sync-g', e => e.textContent);
  const writes = () => p.evaluate(() => window.__writes.length);
  const modal = () => p.evaluate(() => document.querySelector('#modal.show') ? document.querySelector('#modal').textContent : '');

  // --- 기존 흐름: 연동하기 → 저장 · 오류 표시 · 끊기 ---
  await settings();
  await p.click('[data-action="sync-new"]'); await run(300);
  eq('연동하기 → 바로 1번 저장', await writes(), 1);
  await p.evaluate(() => window.onAppPause()); await run(200);
  const wp = await writes();
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.dailyGoal = 33; window.__vocab.save(); window.onAppPause(); }); await run(200);
  eq('바꾸고 내리면 씀', ((await writes()) - wp) + ' ' + (await p.evaluate(() => JSON.parse(window.__writes[window.__writes.length - 1]).settings.dailyGoal)), '1 33');
  eq('올린 JSON 에 사용 기록도 실림', await p.evaluate(() => Object.keys(JSON.parse(window.__writes[window.__writes.length - 1]).usage).length > 0), true);

  // --- C: 편집 없이 앱을 5번 오가면 0번 (전: 5번) ---
  const wc = await writes();
  for (let i = 0; i < 5; i++) { await p.evaluate(() => window.onAppResume()); await run(3000); await p.evaluate(() => window.onAppPause()); await run(200); }
  eq('C 편집 없이 resume→pause ×5 → 쓰기 0', (await writes()) - wc, 0);
  await p.evaluate(() => window.onAppResume()); await run(100);

  // --- E: 쓰는 중(busy)에 편집하고 내리면, 끝난 뒤 바로 이어 씀 ---
  await p.evaluate(() => { window.__hold = true; }); await p.click('[data-action="sync-now"]'); await run(50);
  const we = await writes();
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.dailyGoal = 37; window.__vocab.save(); window.onAppPause(); }); await run(100);
  eq('E busy 중 pause 는 건너뜀', (await writes()) - we, 0);
  await p.evaluate(() => { const f = window.__hold; window.__hold = null; f(); }); await run(100);
  eq('E written 뒤 이어 씀 (goal 37)', ((await writes()) - we) + ' ' + (await p.evaluate(() => JSON.parse(window.__writes[window.__writes.length - 1]).settings.dailyGoal)), '1 37');
  await p.evaluate(() => window.onAppResume()); await run(100);

  // --- D: 쓰기가 계속 실패 → 10분 동안 재시도는 5분 간격 (전: 매분 10번) ---
  await p.evaluate(() => { window.__fail = true; }); await settings(); await p.click('[data-action="sync-now"]'); await run(200);
  eq('D 오류 표시', /⚠ FileNotFoundException/.test(await group()), true);
  const wd = await writes();
  await p.evaluate(() => { const s = window.__vocab.state(); s.settings.dailyGoal = 38; window.__vocab.save(); }); await run(10 * 60000);
  eq('D 10분 동안 자동 재시도 ≤ 2', (await writes()) - wd <= 2, true);
  await p.evaluate(() => { window.__fail = false; }); await p.click('[data-action="sync-now"]'); await run(200);
  eq('D 지금 저장 → 오류 지워짐', /⚠/.test(await group()), false);

  await p.click('[data-action="sync-unlink"]'); await run(150); await p.click('#modal .btn.danger'); await run(200);
  eq('끊기 → 연동 전 화면', /폰을 바꿔도 이어지게/.test(await group()), true);

  // --- 새 폰: 드라이브 파일 (진도·유튜브·담은 문장 있음) ---
  const drive = await p.evaluate(() => { const s = JSON.parse(JSON.stringify(window.__vocab.state())); s.words.forEach((w, i) => { if (i < 120) w.stage = 4; }); s.settings.dailyGoal = 44; s.yt = [{ id: 'y1', vid: 'dQw4w9WgXcQ', title: 't', rows: [] }]; s.sentBox = [{ id: 's1', e: 'Hi.', k: '안녕' }]; s.usage = { '2026-09-20': { t: 1, f: {}, c: {} } }; return JSON.stringify(s); });
  await p.evaluate(d => { window.__drive = d; }, drive);

  // --- A: 확인 창이 떠 있는 동안 pause · 10분 인터벌 → 드라이브에 안 씀, 취소해도 안 씀 ---
  const w0 = await writes();
  await p.click('[data-action="sync-open"]'); await run(200);
  eq('A 확인 창 (날짜 표시 · 병합 버튼 없음)', /단어 200개 \(졸업 120\)/.test(await modal()) + ' ' + /마지막 사용 2026-09-20/.test(await modal()) + ' ' + (await p.$$eval('#modal [data-value="merge"]', x => x.length)), 'true true 0');
  await p.evaluate(() => { window.__vocab.save(); window.onAppPause(); }); await run(200);
  await p.evaluate(() => window.onAppResume()); await run(10 * 60000);
  eq('A 확인 창 동안 pause·10분 → 쓰기 0 · 연동 아님', ((await writes()) - w0) + ' ' + (await p.evaluate(() => localStorage.getItem('T:sync'))), '0 null');
  await p.click('#modal [data-value=""]'); await run(200);
  eq('A 취소 → 쓰기 0 · pending 풀림', ((await writes()) - w0) + ' ' + (await p.evaluate(() => localStorage.getItem('T:pend'))), '0 null');

  // --- 덮어쓰기 → syncCommit → 그 파일에 저장 ---
  await settings(); await p.click('[data-action="sync-open"]'); await run(200);
  await p.click('#modal [data-value="replace"]'); await run(400);
  eq('덮어쓰기 → 드라이브 것 · 연동됨 · 바로 1번 씀', (await p.evaluate(() => window.__vocab.state().settings.dailyGoal + ' ' + !!localStorage.getItem('T:sync'))) + ' ' + ((await writes()) - w0), '44 true 1');
  eq('덮어쓴 뒤 올린 파일에 진도·유튜브 그대로', await p.evaluate(() => { const j = JSON.parse(window.__writes[window.__writes.length - 1]); return j.words.filter(w => w.stage === 4).length + ' ' + j.yt.length + ' ' + j.sentBox.length; }), '120 1 1');

  // --- 백업 파일이 아니면 거절 ---
  await p.evaluate(() => window.Android.syncUnlink('TKN')); await settings();
  await p.evaluate(() => { window.__drive = 'hello world'; }); await p.click('[data-action="sync-open"]'); await run(300);
  eq('백업 파일이 아니면 안내 · 연동·pending 없음', /백업 파일이 아니에요/.test(await p.textContent('#toast')) + ' ' + (await p.evaluate(() => localStorage.getItem('T:sync') + ' ' + localStorage.getItem('T:pend'))), 'true null null');
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
  console.log(fails ? fails + ' FAIL' : 'ALL OK');
  process.exit(fails ? 1 : 0);
})();
