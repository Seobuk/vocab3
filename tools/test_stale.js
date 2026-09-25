// v2.23 저장 주인: 먼저 뜬 페이지(= 안드로이드의 옛 좀비 WebView)는 나중에 뜬 페이지의 손 수정·합치기를 옛 S 로 덮지 못한다
const { chromium } = require('playwright');
const path = require('path'), url = require('url');
(async () => {
  const IDX = url.pathToFileURL(path.resolve(process.env.ASSETS || path.join(__dirname, '..', 'assets'), 'index.html')).href;
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 844 } });   // 한 컨텍스트 = localStorage 하나 (= 앱의 SharedPreferences 하나)
  let fails = 0; const errs = [];
  const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + (ok ? '' : ' — got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want))); };
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(IDX); await p.waitForTimeout(300); return p; };
  const SENTS = [{ s: 1, t: 3, e: 'First one.', k: '하나', x: [] }, { s: 3.2, t: 5, e: 'Second part', k: '둘', x: [] }, { s: 5.1, t: 7, e: 'continues here.', k: '셋', x: [] }];
  const stored = p => p.evaluate(() => { const r = JSON.parse(localStorage.getItem('vocab3.state.v1')).yt.find(r => r.vid === 'STALESTALE1'); return r.sents.length + '|' + r.sents[0].s + (r.sents[0].ms ? '*' : ''); });
  const mem = p => p.evaluate(() => { const r = window.__vocab.state().yt.find(r => r.vid === 'STALESTALE1'); return r.sents.length + '|' + r.sents[0].s + (r.sents[0].ms ? '*' : ''); });

  const A = await open();
  await A.evaluate(() => localStorage.clear()); await A.reload(); await A.waitForTimeout(300);
  await A.evaluate(S => { window.__vocab.state().yt.push({ id: 'st1', vid: 'STALESTALE1', title: 'Stale', date: '', addedAt: 1, sents: S, tv: 3, mb: 1 }); window.__vocab.save(); }, SENTS);
  const B = await open();   // 옛 액티비티(A)가 안 없어진 채 새 액티비티(B)가 뜬 상태
  await B.evaluate(() => { const ss = window.__vocab.state().yt.find(r => r.vid === 'STALESTALE1').sents; ss[0].s = 1.5; ss[0].ms = 1; ss[1].e += ' ' + ss[2].e; ss[1].t = ss[2].t; ss.splice(2, 1); window.__vocab.save(); });
  eq('B 수정 저장', await stored(B), '2|1.5*');
  await A.evaluate(() => window.__vocab.save());                       // 좀비의 useTick·정리 완료 저장
  await A.evaluate(() => { window.onAppPause(); window.dispatchEvent(new Event('pagehide')); });
  eq('A(먼저 뜬 페이지)는 덮지 못함', await stored(B), '2|1.5*');
  eq('A 메모리는 옛 것 그대로', await mem(A), '3|1');
  await B.evaluate(() => window.__vocab.reload()); await B.evaluate(() => window.__vocab.save());
  eq('B 는 reload() 뒤에도 저장 주인', await stored(B), '2|1.5*');

  await A.close();                                                     // pagehide → saveNow (거부돼야)
  const C = await open();                                              // 업데이트 뒤 콜드 스타트
  eq('다시 켜도 손 수정·합치기 남음', await mem(C), '2|1.5*');
  eq('켤 때 상태 한 벌', await C.evaluate(() => JSON.parse(localStorage.getItem('vocab3.bak.start')).yt.find(r => r.vid === 'STALESTALE1').sents.length), 2);

  // 밀려난 B 가 다시 보이면(onAppResume) 새로 떠서 C 의 상태를 읽고, 이번엔 C 가 밀려난다
  await C.evaluate(() => { window.__vocab.state().settings.dailyGoal = 33; window.__vocab.save(); });
  await Promise.all([B.waitForNavigation(), B.evaluate(() => window.onAppResume())]); await B.waitForTimeout(300);
  eq('다시 뜬 B 가 C 의 수정을 읽음', await B.evaluate(() => window.__vocab.state().settings.dailyGoal), 33);
  await C.evaluate(() => { window.__vocab.state().settings.dailyGoal = 5; window.__vocab.save(); });
  eq('이제 C 저장은 거부', await B.evaluate(() => JSON.parse(localStorage.getItem('vocab3.state.v1')).settings.dailyGoal), 33);
  await C.evaluate(() => window.__vocab.go('settings')); await C.waitForTimeout(200); await C.fill('#ai-key', 'ZOMBIEKEY');   // saveAi()
  eq('AI 설정도 밀려난 페이지가 못 덮음', await B.evaluate(() => (localStorage.getItem('vocab3.ai.v1') || '').indexOf('ZOMBIEKEY') < 0), true);

  // 되돌리기 한 벌: 주인 페이지(B)에서 "켤 때 상태로" → 덮어쓰기 = B 가 다시 떴을 때 읽은 상태(dailyGoal 33)
  await B.evaluate(() => { window.__vocab.state().settings.dailyGoal = 44; window.__vocab.save(); window.__vocab.go('settings'); }); await B.waitForTimeout(200);
  await B.click('[data-action="restore-start"]'); await B.click('[data-action="modal-pick"][data-value="replace"]'); await B.waitForTimeout(200);
  eq('켤 때 상태로 덮어쓰기', await B.evaluate(() => [window.__vocab.state().settings.dailyGoal, JSON.parse(localStorage.getItem('vocab3.state.v1')).settings.dailyGoal]), [33, 33]);

  eq('페이지 오류 없음', errs, []);
  await b.close();
  console.log(fails ? fails + ' FAIL' : 'all ok');
  process.exit(fails ? 1 : 0);
})();
