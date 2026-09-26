// v2.34 목소리 고르기: 설정 → 음성 엔진(Google/폰 기본) · 영어 목소리(기기 안 목소리만, 누르면 바꾸고 들려줌 · 받기 필요면 받기 화면) · 폰 음성 설정 열기
// 가짜 안드로이드(토큰 'TKN'): ttsVoices 가 목소리 목록을 주고, ttsSetVoice/ttsSetEngine/ttsOpen/speak 는 부른 것만 적는다. 실제 목소리는 폰에서만.
const { chromium } = require('playwright');
const path = require('path');
const ASSETS = path.resolve(__dirname, '..', 'assets');
const eq = (name, got, want) => console.log((String(got) === String(want) ? 'ok  ' : 'FAIL') + ' ' + name + ': ' + got + (String(got) === String(want) ? '' : ' (기대: ' + want + ')'));
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/youtube\.com|ytimg\.com/, r => r.abort());
  await p.route('https://kr.hyunuk.vocab3/**', route => { const u = new URL(route.request().url()); return route.fulfill({ path: path.join(ASSETS, u.pathname === '/' ? 'index.html' : u.pathname.slice(1)) }); });
  await p.addInitScript(() => {
    const LS = localStorage;
    window.__calls = [];
    const V = { eng: 'google', cur: '', list: [
      { n: 'en-us-x-iol-local', l: 'US', inst: true }, { n: 'en-gb-x-rjs-local', l: 'GB', inst: false }, { n: 'en-us-x-tpf-local', l: 'US', inst: true }] };
    const impl = {
      load: k => LS.getItem('A:' + k), save: (k, v) => { LS.setItem('A:' + k, v); }, remove: k => LS.removeItem('A:' + k),
      setBackHandled() { }, setSystemBars() { }, setRotate() { }, ttsReady: () => true, stopSpeak() { }, vibrate() { }, share() { }, copy() { }, openUrl() { }, audioState: () => '{}', exitApp() { }, keepOn() { },
      mediaList: () => '{}', mediaEnv: () => '', appInfo: () => JSON.stringify({ installer: 'com.android.vending', vc: 50 }), aiCall(id) { setTimeout(() => window.onAiResult(id, 404, '{}'), 10); },
      speak(text, lang) { window.__calls.push('speak:' + lang + ':' + text); },
      ttsVoices: () => JSON.stringify(window.__notReady ? { eng: V.eng, cur: V.cur, list: [] } : V),
      ttsSetVoice(n) { V.cur = n; window.__calls.push('voice:' + n); },
      ttsSetEngine(pk) { V.eng = pk ? 'google' : 'sys'; window.__calls.push('engine:' + pk); setTimeout(() => window.onTtsReady(true), 20); },
      ttsOpen(install) { window.__calls.push('open:' + install); return true; }
    };
    window.__bt = 'TKN';
    window.Android = {}; for (const k in impl) window.Android[k] = (t, ...a) => t === 'TKN' ? impl[k](...a) : undefined;
  });
  await p.goto('https://kr.hyunuk.vocab3/'); await p.waitForTimeout(100);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
  const calls = () => p.evaluate(() => window.__calls.splice(0).join(' | '));
  await p.click('#tabbar [data-tab="settings"]'); await p.waitForTimeout(300);
  const rows = await p.$$eval('#view-settings .sw-t', x => x.map(e => e.textContent));
  eq('설정: 발음 속도 아래 음성 엔진 · 영어 목소리', rows.indexOf('음성 엔진') > 0 && rows.indexOf('영어 목소리') === rows.indexOf('음성 엔진') + 1, true);
  eq('엔진: Google 이 켜짐 · 목소리: 엔진 기본', (await p.textContent('[data-action="tts-engine"].on')) + ' | ' + /엔진 기본/.test(await p.textContent('#view-settings')), 'Google | true');

  await p.click('[data-action="tts-voices"]'); await p.waitForTimeout(350);
  const list = await p.$$eval('#sheet .voice-row', x => x.map(e => e.textContent));
  eq('목록: 엔진 기본 → 미국 → 영국(받기 필요)', list.join(' / '), '엔진 기본✓ / 미국 영어 · iol / 미국 영어 · tpf / 영국 영어 · rjs받기 필요');
  await p.click('#sheet .voice-row[data-n="en-us-x-tpf-local"]'); await p.waitForTimeout(350);
  eq('목소리 누름 → 바꾸고 들려줌', await calls(), "voice:en-us-x-tpf-local | speak:en:Let's catch up over lunch.");
  eq('창에 ✓ 가 옮겨감', await p.$eval('#sheet .voice-row.on', e => e.getAttribute('data-n')), 'en-us-x-tpf-local');
  await p.click('#sheet .voice-row[data-n="en-gb-x-rjs-local"]'); await p.waitForTimeout(300);
  eq('받기 필요 → 음성 데이터 받기 화면 · 안내 (목소리는 안 바뀜)', (await calls()) + ' | ' + /받은 뒤 다시 골라/.test(await p.textContent('#toast')), 'open:true | true');
  await p.click('#sheet [data-action="tts-open"]'); await p.waitForTimeout(200);
  eq('폰 음성 설정 열기', await calls(), 'open:false');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  eq('설정 줄에 고른 목소리', /미국 영어 · tpf/.test(await p.textContent('#view-settings')), true);

  const top = await p.evaluate(() => document.getElementById('view-settings').scrollTop = 300);
  await p.click('[data-action="tts-engine"][data-value=""]'); await p.waitForTimeout(400);
  eq('폰 기본 엔진 → Java 에 빈 이름 · 다시 준비되면 설정이 새로 (스크롤 그대로)', (await calls()) + ' | ' + (await p.textContent('[data-action="tts-engine"].on')) + ' | ' + (await p.evaluate(() => document.getElementById('view-settings').scrollTop)), 'engine: | 폰 기본 | ' + top);
  await p.click('[data-action="tts-test"]'); await p.waitForTimeout(100);
  eq('테스트 버튼은 그대로 읽기', await calls(), "speak:en:Let's catch up over lunch.");
  await p.screenshot({ path: path.resolve(__dirname, '..', 'build', 'shots', 'voice_settings.png') });
  await p.click('[data-action="tts-voices"]'); await p.waitForTimeout(350);
  await p.screenshot({ path: path.resolve(__dirname, '..', 'build', 'shots', 'voice_sheet.png') });
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  // 준비 전에 연 창은 준비되면 목록이 채워진다 · 다른 엔진이면 고른 목소리 대신 엔진 기본으로 보인다
  await p.evaluate(() => { window.__notReady = true; });
  await p.click('[data-action="tts-voices"]'); await p.waitForTimeout(350);
  eq('준비 전: 목록 없음 안내', /목소리가 없어요/.test(await p.textContent('#sheet')), true);
  await p.evaluate(() => { window.__notReady = false; window.onTtsReady(true); }); await p.waitForTimeout(300);
  eq('준비되면 창이 새로 채워짐', (await p.$$eval('#sheet .voice-row', x => x.length)) + ' ' + /목소리가 없어요/.test(await p.textContent('#sheet')), '4 false');
  await p.evaluate(() => window.__appBack()); await p.waitForTimeout(300);
  await p.evaluate(() => { window.__vVoiceOld = 1; });
  await p.evaluate(() => window.Android.ttsSetVoice('TKN', 'en-au-x-gone-local')); await p.evaluate(() => window.onTtsReady(true)); await p.waitForTimeout(300);
  eq('이 엔진에 없는 목소리 = 엔진 기본으로 표시', /엔진 기본/.test(await p.textContent('#view-settings')), true);
  eq('페이지 오류 없음', JSON.stringify(errs), '[]');
  await b.close();
})();
