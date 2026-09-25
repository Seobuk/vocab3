// v2.27 앱 자체 업데이트: 앱을 열면(30분에 한 번) GitHub 최신 릴리스 확인 → 더 새 버전이면 묻고 → Java(updateInstall)가 받아 설치.
// 가짜 안드로이드(토큰 'TKN'): appInfo 로 설치 출처, aiCall 로 GitHub API 답(localStorage 'T:rel'), updateInstall 은 주소만 적는다. 실제 받기·PackageInstaller 는 폰에서만.
const { chromium } = require('playwright');
const path = require('path');
const ASSETS = path.resolve(__dirname, '..', 'assets');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
const APK = 'https://github.com/Seobuk/vocab3/releases/download/v99.1/Vocab3_v99.1.apk';
const rel = (tag, url) => JSON.stringify({ tag_name: tag, body: '3단계 단어장 ' + tag + ' — 새 기능\n\n- 첫째 바뀐 점\n- 둘째 바뀐 점\n\n설치: Vocab3_' + tag + '.apk (덮어 설치, 데이터 유지)', assets: [{ name: 'Vocab3_' + tag + '.apk', size: 1600000, browser_download_url: url || APK }] });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.route('https://kr.hyunuk.vocab3/**', route => { const u = new URL(route.request().url()); return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) }); });
  await p.addInitScript(() => {
    const LS = localStorage;
    window.__api = 0; window.__upd = [];
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); }, remove: k => LS.removeItem('A:' + k),
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => false, speak() { }, stopSpeak() { }, vibrate() { }, share() { }, copy() { }, openUrl() { }, audioState: () => '{}', exitApp() { }, keepOn() { },
      mediaList: () => '{}', mediaEnv: () => '',
      appInfo: () => JSON.stringify({ installer: LS.getItem('T:inst') || 'dev.imranr.obtainium', vc: 50 }),
      aiCall(id, url) {
        if (/api\.github\.com\/repos\/Seobuk\/vocab3\/releases\/latest/.test(url)) { window.__api++; const r = LS.getItem('T:rel'), st = +(LS.getItem('T:st') || 0); setTimeout(() => window.onAiResult(id, st || (r ? 200 : 404), st ? '{}' : (r || '{}')), 10); return; }
        setTimeout(() => window.onAiResult(id, 404, '{}'), 10);
      },
      updateInstall(url) { window.__upd.push(url); }
    };
    window.__bt = 'TKN';
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => t === 'TKN' ? impl[k](...a) : undefined;
  });
  const boot = async (o) => {   // o: { rel, inst, keepState }
    await p.goto('https://kr.hyunuk.vocab3/'); await p.waitForTimeout(100);
    await p.evaluate(o => {
      if (!o.keepState) localStorage.clear();
      if (o.rel) localStorage.setItem('T:rel', o.rel); else localStorage.removeItem('T:rel');
      if (o.inst) localStorage.setItem('T:inst', o.inst); else localStorage.removeItem('T:inst');
      if (o.st) localStorage.setItem('T:st', o.st); else localStorage.removeItem('T:st');
    }, o);
    await p.reload(); await p.waitForTimeout(2200);
  };
  const modal = () => p.evaluate(() => { const m = document.getElementById('modal'); return m && m.classList.contains('show') ? m.textContent : ''; });
  const api = () => p.evaluate(() => window.__api);

  // --- 1. 새 버전 → 열자마자 묻기 · 업데이트 → 받기 시작 ---
  await boot({ rel: rel('v99.1') });
  const m1 = await modal();
  eq('열면 새 버전 창 (버전 · 지금 버전 · 바뀐 점, "설치:" 줄은 뺌)', /새 버전 v99\.1이 나왔어요 \(지금 v2\.\d+\)/.test(m1) + ' ' + /· 첫째 바뀐 점/.test(m1) + ' ' + /설치:/.test(m1), 'true true false');
  await p.click('#modal [data-value="ok"]'); await p.waitForTimeout(200);
  eq('업데이트 → Java 에 APK 주소 · 받는 중 안내', (await p.evaluate(() => window.__upd.join())) + ' ' + /새 버전 받는 중… \(1\.5MB\)/.test(await p.textContent('#toast')), APK + ' true');
  await p.evaluate(() => window.onUpdate('progress', '800000', 1600000)); await p.waitForTimeout(50);
  eq('진행 50%', /받는 중… 50%/.test(await p.textContent('#toast')), true);
  await p.evaluate(() => window.onUpdate('perm', '', 0)); await p.waitForTimeout(50);
  eq('설치 허용 안내', /이 출처 허용/.test(await p.textContent('#toast')), true);
  await p.evaluate(() => window.onUpdate('installing', '', 0)); await p.waitForTimeout(50);
  eq('설치 화면 안내', /"업데이트"를 눌러/.test(await p.textContent('#toast')), true);
  await p.evaluate(() => window.onUpdate('fail', 'cancel', 0)); await p.waitForTimeout(50);
  eq('취소 안내', /업데이트를 취소했어요/.test(await p.textContent('#toast')), true);

  // --- 2. "나중에" → 같은 버전은 하루 동안 자동으로 안 묻고, 설정의 "지금 확인"은 묻는다 ---
  await boot({ rel: rel('v99.1') });
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(100);
  eq('나중에 → 기록', await p.evaluate(() => window.__vocab.state().settings.updLater.tag), 'v99.1');
  await p.evaluate(() => { window.__vocab.state().settings.updAt = 0; window.__vocab.save(); });
  await boot({ rel: rel('v99.1'), keepState: true });
  eq('나중에 누른 버전: 다시 열어도 안 물음 (확인은 함)', (await api()) + ' ' + ((await modal()) === ''), '1 true');
  await p.evaluate(() => window.__vocab.go('settings')); await p.waitForTimeout(200);
  eq('설정에 앱 업데이트 묶음', await p.$$eval('[data-action="upd-check"]', x => x.length), 1);
  await p.click('[data-action="upd-check"]'); await p.waitForTimeout(300);
  eq('지금 확인 → 묻는다', /v99\.1/.test(await modal()), true);
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(100);

  // --- 3. 30분 안에 다시 열면 확인 안 함 ---
  await boot({ rel: rel('v99.1'), keepState: true });
  eq('30분 안: GitHub 안 부름', await api(), 0);

  // --- 4. 같은(또는 옛) 버전 → 안 물음 · 지금 확인은 "최신" ---
  const cur = await p.evaluate(() => document.querySelector('.ver') ? document.querySelector('.ver').textContent : '');
  await boot({ rel: rel(cur) });
  eq('같은 버전: 확인은 하지만 안 물음', (await api()) + ' ' + ((await modal()) === ''), '1 true');
  await p.evaluate(() => window.__vocab.go('settings')); await p.waitForTimeout(200);
  await p.click('[data-action="upd-check"]'); await p.waitForTimeout(300);
  eq('지금 확인 → 최신 버전 안내', /최신 버전이에요/.test(await p.textContent('#toast')), true);
  await boot({ rel: rel('v2.9') });
  eq('2.9 는 2.26 보다 옛 버전 (숫자로 비교)', (await modal()) === '', true);

  // --- 5. 다른 곳 주소의 APK 는 무시 ---
  await boot({ rel: rel('v99.2', 'https://evil.example.com/Vocab3.apk') });
  eq('이 저장소 릴리스 파일이 아니면 안 물음', (await modal()) === '', true);

  // --- 6. Play 에서 설치 → 확인 안 함 · 설정에도 없음 ---
  await boot({ rel: rel('v99.1'), inst: 'com.android.vending' });
  eq('Play 설치: GitHub 안 부름 · 안 물음', (await api()) + ' ' + ((await modal()) === ''), '0 true');
  await p.evaluate(() => window.__vocab.go('settings')); await p.waitForTimeout(200);
  eq('Play 설치: 설정에 앱 업데이트 없음', await p.$$eval('[data-action="upd-check"]', x => x.length), 0);

  // --- 7. 설정에서 끄면 자동 확인 안 함 ---
  await boot({ rel: rel('v99.1') });
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(100);
  await p.evaluate(() => { const s = window.__vocab.state().settings; s.autoUpdate = false; s.updAt = 0; s.updLater = null; window.__vocab.save(); });
  await boot({ rel: rel('v99.1'), keepState: true });
  eq('자동 확인 끔: GitHub 안 부름', await api(), 0);

  // --- 8. 다른 확인 창(종료 등)이 떠 있으면 덮지 않고, 다음에 돌아올 때 다시 묻는다 ---
  await boot({});
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(100);
  await p.evaluate(r => { localStorage.setItem('T:rel', r); window.__vocab.state().settings.updAt = 0; window.onAppResume(); }, rel('v99.1')); await p.waitForTimeout(300);
  eq('종료 확인 창 그대로 · 다음에 다시 확인', /앱을 종료할까요/.test(await modal()) + ' ' + (await p.evaluate(() => window.__vocab.state().settings.updAt)), 'true 0');
  await p.click('#modal [data-value=""]'); await p.waitForTimeout(100);

  // --- 9. GitHub 오류는 Gemini 문구(모델·API 키)가 아니라 GitHub 응답으로 ---
  await boot({ rel: rel('v99.1'), st: '403' });
  await p.evaluate(() => window.__vocab.go('settings')); await p.waitForTimeout(200);
  await p.click('[data-action="upd-check"]'); await p.waitForTimeout(300);
  const t9 = await p.textContent('#toast');
  eq('403 → GitHub 응답 403 (API 키 문구 아님)', /GitHub 응답 403/.test(t9) + ' ' + /API 키|모델/.test(t9), 'true false');

  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
