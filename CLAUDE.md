# 3단계 단어장 (vocab3) — Claude Code 작업 지침

박진영식 3단계 단어장(새 단어장 → 외운 단어장 → 완전 암기장 → 졸업) 영어 단어 학습 안드로이드 앱 + Gemini 회화 연습.
공개 저장소 github.com/Seobuk/vocab3 (소스 MIT · 배포 APK 는 NewPipeExtractor 때문에 GPL-3.0 — THIRD_PARTY_NOTICES.md).
상용 금지는 GPL 과 충돌해서 걸 수 없다 → README 에 "상업적 이용 자제" 부탁 문구만 (사용자 결정 2026-09-25, 법적 효력 없음). 배포는 GitHub Releases 의 APK — 폰(Galaxy Z Fold)은 Obtainium 으로 자동 업데이트.
**이 PC(윈도우)의 Claude Code 가 개발·빌드·테스트·릴리스를 전부 맡는다.** 현재 v2.23 (versionCode 47).

## 구조 (Gradle/Android Studio 없음 — 스크립트 빌드)
- `AndroidManifest.xml` — versionCode / versionName. 릴리스마다 versionCode +1, versionName = 앱 버전 (`/ship` 이 해 줌).
- `src/kr/hyunuk/vocab3/MainActivity.java` — WebView 래퍼 + JS 브릿지(`window.Android`): 저장(SharedPreferences)·TTS·공유·파일·뒤로가기·시스템바·
  Gemini HTTP(`aiCall` → `window.onAiResult`)·음성인식(`sttStart/sttStop/sttCancel` → `onStt/onSttPartial/onSttError/onSttState`).
  **Java 1.8 문법만** (람다·스트림·var 금지 — dx 호환 유지). 새 브릿지 메서드는 `@JavascriptInterface`, JS 로 돌려줄 땐 `runJs()` + `jsString()`.
  - 앱 화면은 `https://kr.hyunuk.vocab3/` 로 서빙된다 (`shouldInterceptRequest` → assets). file:// 은 Referer 가 없어 유튜브 임베드가 오류 153.
  - **브릿지 토큰**: 브릿지는 유튜브 iframe·광고 프레임에도 주입되므로 모든 `@JavascriptInterface` 메서드는 첫 인자 `String t` + `if (!ok(t)) return …;`.
    토큰은 Java 가 index.html 에만 심고(`window.__bt`), app.js 는 시작할 때 `BT`·`AND` 로 잡아 두고 `AND.x(BT, …)` 로만 부른다. 테스트 스텁도 같은 계약(`'TKN'`).
  - **저장 주인(v2.23)**: 설정 변경 재생성·"종료" 뒤 다시 열기 때 안 없어진 옛 WebView 가 useTick 1분 저장으로 옛 S 를 써서 손 수정·합치기가 사라졌다(사용자 보고).
    Java: onDestroy 에서 `web.destroy()`, 저장·삭제는 마지막으로 index.html 을 받아 간 페이지(`sLive`)만. JS: `vocab3.owner` 에 페이지 SID — 더 나중 페이지가 있으면
    `bridge.saveRaw` 가 거부(`stale()`), 다시 보이면 reload. **새 저장은 반드시 bridge.save/saveRaw 로만**(AND.save 직접 호출 금지). 켤 때 상태 한 벌 `vocab3.bak.start`
    (별도 prefs 파일 vocab3.bak, 설정 → 데이터 → "켤 때 상태로"). configChanges 는 density·fontScale 등까지 넓힘. 테스트 `tools/test_stale.js`.
- `src/kr/hyunuk/vocab3/ReviewService.java` — 듣기 복습 포그라운드 서비스(알림 제어).
- `src/kr/hyunuk/vocab3/Offline.java` (v2.14) — 유튜브 영상 받기(NewPipeExtractor, 360p 합쳐진 MP4 → 없으면 M4A, 10MB Range 청크),
  `getNoBackupFilesDir()/videos/<vid>.mp4|m4a|env`(자동 백업 25MB 한도에 안 걸리게), `/media/<vid>` Range 서빙(WebView 가 Range 를 한 번 더 적용하는 걸 보정),
  파형 추출(MediaExtractor+MediaCodec → 20ms 마다 dBFS+100 한 바이트). 브릿지 ytDownload/ytDownloadCancel/mediaList/mediaDelete/mediaEnv,
  JS 콜백 onYtDl(vid, st, a, b)·onMediaEnv(vid). 안드로이드 13(API 33) 이상에서만(추출기가 API 33 메서드를 씀, desugaring 안 함).
  **유튜브가 바뀌어 추출이 깨지면** `tools/setup-sdk.ps1`·`.sh` 의 NewPipeExtractor 버전·URL·SHA-256 을 둘 다 올리고 `/ship` (2~4개월마다 깨지는 편, 360p 는 장애 때도 대개 됨).
- `assets/index.html · style.css · app.js` — UI/로직 전부. `app.js` 는 **ES5 IIFE** (프레임워크 없음, 화살표함수·let/const·템플릿문자열 안 씀).
  - 화면: `RENDER.<view>` 함수 + `go(view, params)` / `goTab()` / `back()` 스택. 클릭은 `data-action="…"` → `ACTIONS` 맵 하나로 처리.
  - 상태 `S` = SharedPreferences 키 `vocab3.state.v1` 의 JSON 한 덩어리. 새 필드는 `defaultSettings()/defaultTalk()/mkWord()` 에 기본값 + `migrate()` 에 옛 데이터 보정.
  - 단어: `{id,w,p,m,e,k,t,stage(0대기·1·2·3·4졸업),star,…}`. `esc()` 로 HTML 이스케이프 필수.
  - AI: `aiGenerate(bodyObj, what, timeoutMs)` 공용 헬퍼(503 재시도, flash 계열 thinking 끔, `AI.last` 기록). 키·모델은 별도 키 `vocab3.ai.v1` — **코드·저장소·백업에 절대 안 들어감.**
  - 회화: `TALK`(진행 중 대화), `talkTurn()`(JSON 스키마 reply/ko/fix/note/used/say), `renderChat()`, STT(`sttStart('en'|'ko')`, 한국어는 `koTranslate()` 로 번역), 리포트 `S.talkLog`.
  - 학습 완료 연출 `celebrate()`(컨페티 canvas·카운트업·WebAudio 효과음), 단어 추가 `aiFillWords()`(8개 배치).
  - 영어 문장 공부(v2.12) `SENT` · 화면 `sent`: 졸업(stage 4) + 예문 e + 해석 k 가 있는 단어만. 한글 → 탭하면 영어 공개·읽기 → ▲ 쉬움 / ▼ 어려움.
    가중치 `w.sw`(1~20, 없으면 3; 어려움 +2 · 쉬움 −1), 누적 `se`/`sh`, 마지막 `sa`. `sentPick` 은 가중치 비례 무작위 + 최근 3문장 제외. 테스트 `tools/test_sent.js`.
    v2.17: 유튜브 문장을 꾹 눌러 담은 `S.sentBox`({id,e,k,vid,title,s,at}+가중치)도 풀에 들어간다 — `sentItem(id)` 로 단어/담은 문장을 찾는다, 카드에 📺 출처·빼기.
  - 사용 기록(v2.13) `S.usage['YYYY-MM-DD'] = {t, f:{study,sent,talk,yt,audio,etc: ms}, c:{sent,yt,talk}}`: `useTick()` 이 render()·onAppPause/Resume·15초 틱마다
    지금 화면의 기능으로 시간을 쌓는다(한 번에 최대 1분, 앱이 내려가면 안 셈, 백그라운드 듣기 복습 제외). `useCount()` 로 횟수. 통계 `useHTML()`. 테스트 `tools/test_usage.js`(Playwright clock).
  - 유튜브 쉐도잉 `S.yt`(v2.2~): 링크 → oEmbed(제목) + Gemini `fileData.fileUri`(첫 요청은 영상 통째, 이어 받기는 v2.21 부터 `videoMetadata.startOffset` 으로 뒷부분만 — 구간 기준 시간이 오면 앱이 더함, 400 이면 통째로) → 문장 `{s,t(끝),e,k,x:[익힐 표현]}` — 시간은 Gemini 에게 영상 표기 MM:SS.d 로 받아 `ytSec()` 로 초 환산(초로 달라고 하면 1분 넘어서 틀림, v2.5; `r.tv=2`)
    (한 문장은 끝까지 한 항목, 화면 자막 줄바꿈 무시). `yt` 목록 · `ytv` 영상 화면(YouTube IFrame API 는 이 화면에서만 로드).
    플레이어(#ytBox)는 목록(#ytList) 맨 위에 sticky 로 제자리, 목록을 올리면 불투명한 #ytBody 가 그 위를 덮는다 (v2.4, 사용자 요청 —
    v2.3 의 따라다니는 작은 창은 거슬린다고 뺐다). 버튼은 오른쪽 아래 #ytFab (z-index 19, 어두운 막 20 아래).
    유튜브 정책과의 관계: 덮인 채 문장을 누르면 가려진 플레이어로 재생된다(정책상 금지 항목) — 사용자가 알고 고른 방식. 떠나거나 앱이 내려가면 멈춤·다운로드 금지는 지킨다.
    v2.11: 플레이어(iframe)를 칸보다 위아래 `--ytcut`(64px)씩 크게 두고 칸(.yt-player, overflow hidden)이 잘라 멈출 때 뜨는 제목줄·공유·"동영상 더보기"(+로고)를 숨긴다 —
    16:9 영상은 칸에 딱 맞게 다 보임. 이것도 정책 위반(플레이어 일부 가림)을 사용자가 알고 고른 것 — 스토어에 올릴 땐 `--ytcut: 0`.
  - 재생 정밀도(v2.7): 끝나기 0.45초 전부터 requestAnimationFrame 로 확인해 멈춤(실측 오차 13~24ms, `YT_LEAD` 보정 손잡이), 끝 여유 +0.1초.
    유튜브 받아쓰기는 항상 `AI_DEFAULT_MODEL`(Flash-Lite — 다른 모델은 시간이 크게 밀림), 스키마 propertyOrdering s,e,t,k,x. 플레이어 controls 0.
    v2.9 정밀도: `thinkingConfig {thinkingLevel:'low'}`(aiGenerate 는 부르는 쪽 생각 설정을 thinkingBudget 0 으로 덮지 않고, 400+think 면 빼고 한 번 더)
    + `videoMetadata {fps:2}`(입력 토큰 약 1.7배 → 429·400 이면 fps 없이 한 번 더). 제한 시간 600초(JS `YT_AI_MS`·Java setReadTimeout). 새 정리는 `r.tv=3`, 그 전 영상엔 "다시 정리하기" 안내.
    새 결과는 `ytMergeBroken`(v2.16: . ? ! 로 안 끝나면 다음 것과, 20초·50단어 한도 — 화면에 박힌 자막 줄 단위로 쪼갠 결과를 되붙임, 예전 정리는 migrate 에서 `r.mb` 로 한 번) →
    `ytMergeShort` 로 3단어 이하 문장을 시간 간격이 짧은 이웃에 합친다. 테스트 `tools/test_yt_merge.js`.
    v2.8 의 "소리로 문장 끝 맞추기"(Visualizer 음량 VAD) 실험은 v2.9 에서 뺐다 — 사용자 결정, 다시 넣지 말 것.
    남은 오차는 Gemini 시간 자체(fps 2 = 0.5초 간격, fps 없이 다시 보낸 영상은 1초 간격; 1초 간격일 때 평균 1~2초 틀렸음).
  - 손 보정(v2.11, 사용자 요청 — 가로 화면만): v2.22 부터 위 막대 시계 버튼(`.yt-edb`, 수정 중 "완료") → 화면 아래 도크 `#ytSide`(가로만, 102px, `ytSideRender`/`ytEditHTML`/`ytAdj`):
    띠 canvas `#ytWave`(받은 영상 파형 `YT_ENV` · [ ] 손잡이 끌기 = `ytAdj(k,'at',v)` · 빈 곳 톡 = 거기서 재생, `ytWaveDraw`/`ytWaveBind`/`ytWin`) + [시작|끝] `YTV.ek` + ± 한 벌 + 지금 + 문장 듣기.
    누른 문장(`YTV.act`, 안 골랐으면 켤 때 지금 문장)의 시작·끝을 ±0.1·0.5초·"지금"(영상 위치)·끌기로.
    고친 문장은 `ms`/`me` 표시(ytClean 이 보존) → `ytRange()` 가 앞 여유(−0.3)·끝 여유(+0.1)·다음 문장 시작에서 자르기를 빼고 그 자리 그대로. 폰 가로에선 수정 중 `--ytw` 를 줄여 패널 자리(160px).
    "다시 정리하기"는 고친 시간도 덮어쓴다(확인 창에 안내). 문장 꾹 누르기(550ms) = 영어 문장 복사(`bridge.copy`), 떼며 생기는 click 은 버림. 테스트 `tools/test_yt_edit.js`.
  - 가로 화면(v2.6): 영상 화면에서만 회전 허용(`bridge.setRotate` → `setRequestedOrientation(USER|PORTRAIT)`, render() 에서 전환), 가로면 CSS 로 왼쪽 영상·오른쪽 스크립트.
  - `#app`·`#view-ytv` 는 `overflow: clip` — hidden 이면 scrollIntoView 가 틀을 밀어 숨긴 시트가 올라온다.
  - 오프라인(v2.14, 사용자 요청): 링크 추가 때 자동으로 받고(한 번에 하나, `YTDL` 줄), 다 받으면 `r.off={kind,size}` → 영상 화면은 유튜브 iframe 대신
    앱 `<video>`(YT 플레이어와 같은 인터페이스의 어댑터, `local: true`)로 재생 — 유튜브 화면 요소 없음·오프라인. 시작 때 mediaList 로 기록과 실제 파일을 맞춘다.
    파형으로 경계 맞춤 `ytSnapCalc` → 문장 `vs`/`ve`(ytClean 보존), ytRange 는 ms/me(손 수정) > vs/ve > AI 시간 순. 테스트 `tools/test_offline.js`(가짜 Android + WAV).
  - v2.19: 영상 길이 `r.dur`(ytTick 이 플레이어에서) — 안 잘렸어도(STOP) 마지막 문장이 영상 끝보다 1분 넘게 앞이면 이어 받기, 예전 기록은
    "이어서 정리하기"(`ytContinue`, 뒷부분만 붙임, `YTJOB.more`). 다시 정리가 일부만 받으면 완성본 유지. 이어 받기 겹침은 앞 문장 시작·같은 문장으로 거름,
    앞으로 못 나가면 멈춤, 요청에 마지막 문장 인용. 선택창 "📖 단어 뜻 보기"(`YTV.wpick`, 한 번 톡 — TalkBack).
  - v2.23 긴 영상: 유튜브 링크의 startOffset 은 서버가 소리를 안 잘라(2026-08~, 포럼 보고) 뺐다 — 받은 영상(r.off, 안드로이드)은 소리를 10분 창으로 보낸다:
    Java `Offline.adts(path,a,b)`(AAC 샘플에 ADTS 머리, 다시 인코딩 없음) + 브릿지 `aiClip`(body 의 "@CLIP@" 자리에 base64 를 흘려 씀, -416 파일 끝 · -1 못 읽음 → 링크로).
    `ytBody(q)` 창이면 inlineData audio/aac + 창 기준 시간 부탁 → 앱이 +a (창이 10분 안쪽이면 부탁대로 봄). 이어 받기·20분 넘는 받은 영상 정리는 창으로, 창마다 `cont.onPart` 로 붙이고 저장.
    `ytAsk(r,job,q,n)`: 빨리 실패한 5xx·연결 끊김만 5·15초 뒤 다시(`YT_QUICK`), 429 는 retryDelay(없으면 30초) 한 번 기다림, 15분 무진전 마감(`job.dl`), 취소 `yt-stop`(YTJOB 교체 → 늦은 답 버림).
    진행 `#ytJobT`(0초부터 m:ss + 지금 하는 일, 1초 틱), `j.moreErr` ⚠ 배너 + 다시 이어서. 정리 중엔 `bridge.keepOn` 으로 화면 켜 둠(꺼지면 요청이 끊겼다). 테스트 `tools/test_yt_win.js`.
    디자인: 사용자 "너무 네모네" → 버튼 알약·카드 22px·아이콘 연한 원 안 굵은 선(style.css 끝 v2.23 블록).
  - v2.21: 끝에 영어 말이 없다고 확인되면 `r.tail`(=그때 마지막 끝) → `ytTailDone` 이면 "이어서 정리하기" 안내·링크 숨김. 일찍 멈춤 이어 받기는 3번까지.
    다시 정리는 새 결과가 있던 것보다 덜 갔을 때만 버림. status 0 재시도는 걸린 시간으로(10분 초과만 뺌). 진행 표시 `#ytJobT`("N분째", ytTick 이 갱신).
    받은 영상 좌우 1/3 두 번 톡(400ms, `YTV.vtap`) = 앞·뒤 문장. 회색 ▶ 는 `WebChromeClient.getDefaultVideoPoster()` 투명 1x1.
  - v2.18: 단어 한 번 톡 = 문장 다시 재생, 두 번 톡(400ms, `YTV.tap`) = 뜻. 정리 `ytTranscribe`: 답이 잘리면(MAX_TOKENS·못 읽는 JSON → `ytSalvage`)
    마지막 문장 끝부터 "Continue … after MM:SS.d" 로 이어 받기(최대 20번), 0·5xx 는 `YT_RETRY` 간격으로 두 번 더, 못 읽은 답도 두 번 더. 테스트 `tools/test_yt_long.js`.
  - v2.17: 문장 꾹 누르기 = 선택창 `ytRowMenu`(문장 공부에 넣기·복사·앞/뒤와 합치기 `ytMergeAt`→`ytJoin`·쪼개기 `YTV.split`→단어 누름 `ytSplitAt`),
    합치기·쪼개기 뒤 `ytEdited()` 가 번호 바뀐 상태(act/cur/card/ko/split/stopAt)를 정리하고 한 번 되돌리기(`YTV.undo`). 테스트 `tools/test_yt_menu.js`.
  - v2.15: 받은 영상은 #ytBox 탭(`yt-tap`) = 멈춤/이어 재생(stopAt 유지). 📌 `S.settings.ytPin` → `#view-ytv.yt-pinned`: 플레이어를 목록 위(z-index 2) +
    고정 중(세로)엔 영상을 화면 폭 16:9(max-height 해제 — 45vh 가 폭을 줄이면 옆 틈으로 가린 문장이 눌렸다) + `.yt-list` scroll-padding-top 56.25vw — v2.4 의 "목록이 영상을 덮는" 동작을 끌 수 있게(사용자 요청, 기본 꺼짐). 가로에선 버튼 숨김.
- `assets/words.js` — 기본 단어 200개 `[단어, 품사, 뜻, 예문, 해석, 테마]`.
- `tools/test_*.js`, `tools/shots.js` — Playwright UI 테스트 (Gemini·음성인식은 stub). 스크린샷 `build/shots/`.
- `store/` — Play 등록 문구·개인정보처리방침(권한·외부 전송이 바뀌면 같이 갱신). `docs/screenshots/` README 용.

## 디자인 (v2.22 — Taste Skill · Anthropic frontend-design · UI/UX Pro Max · Vercel Web Interface Guidelines 리뷰)
- 강조색은 테마 `--primary` 하나: 그라데이션·색 번짐 그림자·Tailwind 고정색(파랑·초록·빨강) 쓰지 않는다. 연한 판(`--primary-soft`) 위 글자는 `--primary-ink`(테마 `ink`, 대비 4.5:1+).
- 그림자: `--shadow` = 1px 선, 떠 있는 것(학습 카드·단어 카드·FAB)만 `--shadow-float`. 아이콘은 이모지 대신 선 SVG(stroke 2, `SVG_O`). 굵기 700 까지(800 은 드물게).
- 한국어 `word-break: keep-all` (body). 토스트는 줄바꿈 허용·테마 색·`aria-live`, 길이에 따라 1.5~5초. `prefers-reduced-motion` 이면 움직임·컨페티 끔.
- 다음 후보(사용자 확인 필요): 세로 화면 시간 수정, 영어 세리프 글꼴, 남은 이모지 SVG 화, 홈 목록 재구성, `--muted` 대비, 글자 크기·반경 토큰 정리.

## 준비 (처음 한 번)
```
powershell -ExecutionPolicy Bypass -File tools/setup-sdk.ps1   # JDK 17 · Android SDK(build-tools 35, platforms 34/36) · bundletool
npm install && npx playwright install chromium                 # 테스트
```
- `keystore/vocab3.jks` (릴리스 서명 키, alias `vocab3`) 와 `keystore/PASSWORD.txt` (비밀번호 한 줄) 를 넣어 둘 것 — 둘 다 git 제외.
  **업데이트는 반드시 이 키로 서명**해야 기존 설치 위에 올라간다. 키가 없으면 build.sh 가 `build/debug.jks` 디버그 키로 서명하고 `⚠⚠ DEBUG 키` 경고를 찍는다 — 그 APK 는 배포 금지.
- `gh auth status` 로 GitHub CLI 로그인 확인 (릴리스에 사용).
- v2.14 부터 `sdk/libs/*.jar`(setup 스크립트가 SHA-256 검증으로 받음)와 Android SDK build-tools 의 **d8** 이 필요하다 — WSL 의 apt(dx) 경로로는 빌드 안 됨.

## 일상 작업
```
bash build.sh        # → build/vocab3.apk (+ build/vocab3.aab)   ※ Claude Code 의 Bash 도구(Git Bash)에서
npm test             # 전체 UI 테스트. 개별: node tools/test_v2.js
/ship vX.Y "요약"    # 버전 올림 → 테스트 → 빌드 → release/ 파일·노트 → 커밋 → push + GitHub 릴리스 (APK 첨부)
/release vX.Y        # 이미 release/ 에 APK·노트가 있을 때 push + 릴리스만
```
- 기능을 바꾸면 관련 `tools/test_*.js` 를 고치거나 새 테스트를 추가하고, 스크린샷을 찍어 눈으로 확인한다.
- Gemini 프롬프트/스키마를 바꾸면 stub 응답도 맞춰 준다. 실제 API 는 사용자의 무료 키로만 호출된다.
- 버전 표기는 세 곳이 항상 같아야 한다: manifest versionName · `APP_VERSION` · 릴리스 태그.

## 하지 말 것
- `.secrets/`, `keystore/`, `release/`, `build/`, `sdk/`, `*.apk`, `*.aab` 커밋 금지 (.gitignore).
- API 키·비밀번호를 코드·문서·커밋 메시지에 적지 않는다.
- 작업은 main 에 직접 커밋. worktree 브랜치를 만들었으면 끝나고 main 에 합친 뒤 브랜치 삭제.
- 커밋 메시지는 한국어, 제목에 버전(`v2.1: …`).
