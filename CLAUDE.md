# 3단계 단어장 (vocab3) — Claude Code 작업 지침

박진영식 3단계 단어장(새 단어장 → 외운 단어장 → 완전 암기장 → 졸업) 영어 단어 학습 안드로이드 앱 + Gemini 회화 연습.
공개 저장소 github.com/Seobuk/vocab3 (MIT). 배포는 GitHub Releases 의 APK — 폰(Galaxy Z Fold)은 Obtainium 으로 자동 업데이트.
**이 PC(윈도우)의 Claude Code 가 개발·빌드·테스트·릴리스를 전부 맡는다.** 현재 v2.9 (versionCode 33).

## 구조 (Gradle/Android Studio 없음 — 스크립트 빌드)
- `AndroidManifest.xml` — versionCode / versionName. 릴리스마다 versionCode +1, versionName = 앱 버전 (`/ship` 이 해 줌).
- `src/kr/hyunuk/vocab3/MainActivity.java` — WebView 래퍼 + JS 브릿지(`window.Android`): 저장(SharedPreferences)·TTS·공유·파일·뒤로가기·시스템바·
  Gemini HTTP(`aiCall` → `window.onAiResult`)·음성인식(`sttStart/sttStop/sttCancel` → `onStt/onSttPartial/onSttError/onSttState`).
  **Java 1.8 문법만** (람다·스트림·var 금지 — dx 호환 유지). 새 브릿지 메서드는 `@JavascriptInterface`, JS 로 돌려줄 땐 `runJs()` + `jsString()`.
  - 앱 화면은 `https://kr.hyunuk.vocab3/` 로 서빙된다 (`shouldInterceptRequest` → assets). file:// 은 Referer 가 없어 유튜브 임베드가 오류 153.
  - **브릿지 토큰**: 브릿지는 유튜브 iframe·광고 프레임에도 주입되므로 모든 `@JavascriptInterface` 메서드는 첫 인자 `String t` + `if (!ok(t)) return …;`.
    토큰은 Java 가 index.html 에만 심고(`window.__bt`), app.js 는 시작할 때 `BT`·`AND` 로 잡아 두고 `AND.x(BT, …)` 로만 부른다. 테스트 스텁도 같은 계약(`'TKN'`).
- `src/kr/hyunuk/vocab3/ReviewService.java` — 듣기 복습 포그라운드 서비스(알림 제어).
- `assets/index.html · style.css · app.js` — UI/로직 전부. `app.js` 는 **ES5 IIFE** (프레임워크 없음, 화살표함수·let/const·템플릿문자열 안 씀).
  - 화면: `RENDER.<view>` 함수 + `go(view, params)` / `goTab()` / `back()` 스택. 클릭은 `data-action="…"` → `ACTIONS` 맵 하나로 처리.
  - 상태 `S` = SharedPreferences 키 `vocab3.state.v1` 의 JSON 한 덩어리. 새 필드는 `defaultSettings()/defaultTalk()/mkWord()` 에 기본값 + `migrate()` 에 옛 데이터 보정.
  - 단어: `{id,w,p,m,e,k,t,stage(0대기·1·2·3·4졸업),star,…}`. `esc()` 로 HTML 이스케이프 필수.
  - AI: `aiGenerate(bodyObj, what, timeoutMs)` 공용 헬퍼(503 재시도, flash 계열 thinking 끔, `AI.last` 기록). 키·모델은 별도 키 `vocab3.ai.v1` — **코드·저장소·백업에 절대 안 들어감.**
  - 회화: `TALK`(진행 중 대화), `talkTurn()`(JSON 스키마 reply/ko/fix/note/used/say), `renderChat()`, STT(`sttStart('en'|'ko')`, 한국어는 `koTranslate()` 로 번역), 리포트 `S.talkLog`.
  - 학습 완료 연출 `celebrate()`(컨페티 canvas·카운트업·WebAudio 효과음), 단어 추가 `aiFillWords()`(8개 배치).
  - 유튜브 쉐도잉 `S.yt`(v2.2~): 링크 → oEmbed(제목) + Gemini `fileData.fileUri`(영상 통째, 구간 자르기 안 씀) → 문장 `{s,t(끝),e,k,x:[익힐 표현]}` — 시간은 Gemini 에게 영상 표기 MM:SS.d 로 받아 `ytSec()` 로 초 환산(초로 달라고 하면 1분 넘어서 틀림, v2.5; `r.tv=2`)
    (한 문장은 끝까지 한 항목, 화면 자막 줄바꿈 무시). `yt` 목록 · `ytv` 영상 화면(YouTube IFrame API 는 이 화면에서만 로드).
    플레이어(#ytBox)는 목록(#ytList) 맨 위에 sticky 로 제자리, 목록을 올리면 불투명한 #ytBody 가 그 위를 덮는다 (v2.4, 사용자 요청 —
    v2.3 의 따라다니는 작은 창은 거슬린다고 뺐다). 버튼은 오른쪽 아래 #ytFab (z-index 19, 어두운 막 20 아래).
    유튜브 정책과의 관계: 덮인 채 문장을 누르면 가려진 플레이어로 재생된다(정책상 금지 항목) — 사용자가 알고 고른 방식. 떠나거나 앱이 내려가면 멈춤·다운로드 금지는 지킨다.
  - 재생 정밀도(v2.7): 끝나기 0.45초 전부터 requestAnimationFrame 로 확인해 멈춤(실측 오차 13~24ms, `YT_LEAD` 보정 손잡이), 끝 여유 +0.1초.
    유튜브 받아쓰기는 항상 `AI_DEFAULT_MODEL`(Flash-Lite — 다른 모델은 시간이 크게 밀림), 스키마 propertyOrdering s,e,t,k,x. 플레이어 controls 0.
    v2.9 정밀도: `thinkingConfig {thinkingLevel:'low'}`(aiGenerate 는 부르는 쪽 생각 설정을 thinkingBudget 0 으로 덮지 않고, 400+think 면 빼고 한 번 더)
    + `videoMetadata {fps:2}`(입력 토큰 약 1.7배 → 429·400 이면 fps 없이 한 번 더). 제한 시간 600초(JS `YT_AI_MS`·Java setReadTimeout). 새 정리는 `r.tv=3`, 그 전 영상엔 "다시 정리하기" 안내.
    새 결과는 `ytMergeShort` 로 3단어 이하 문장을 시간 간격이 짧은 이웃에 합친다. 테스트 `tools/test_yt_merge.js`.
    v2.8 의 "소리로 문장 끝 맞추기"(Visualizer 음량 VAD) 실험은 v2.9 에서 뺐다 — 사용자 결정, 다시 넣지 말 것.
    남은 오차는 Gemini 시간 자체(fps 2 = 0.5초 간격, fps 없이 다시 보낸 영상은 1초 간격; 1초 간격일 때 평균 1~2초 틀렸음) — 확실히 잡으려면 문장별 손 보정이 필요(미구현).
  - 가로 화면(v2.6): 영상 화면에서만 회전 허용(`bridge.setRotate` → `setRequestedOrientation(USER|PORTRAIT)`, render() 에서 전환), 가로면 CSS 로 왼쪽 영상·오른쪽 스크립트.
  - `#app`·`#view-ytv` 는 `overflow: clip` — hidden 이면 scrollIntoView 가 틀을 밀어 숨긴 시트가 올라온다.
- `assets/words.js` — 기본 단어 200개 `[단어, 품사, 뜻, 예문, 해석, 테마]`.
- `tools/test_*.js`, `tools/shots.js` — Playwright UI 테스트 (Gemini·음성인식은 stub). 스크린샷 `build/shots/`.
- `store/` — Play 등록 문구·개인정보처리방침(권한·외부 전송이 바뀌면 같이 갱신). `docs/screenshots/` README 용.

## 준비 (처음 한 번)
```
powershell -ExecutionPolicy Bypass -File tools/setup-sdk.ps1   # JDK 17 · Android SDK(build-tools 35, platforms 34/36) · bundletool
npm install && npx playwright install chromium                 # 테스트
```
- `keystore/vocab3.jks` (릴리스 서명 키, alias `vocab3`) 와 `keystore/PASSWORD.txt` (비밀번호 한 줄) 를 넣어 둘 것 — 둘 다 git 제외.
  **업데이트는 반드시 이 키로 서명**해야 기존 설치 위에 올라간다. 키가 없으면 build.sh 가 `build/debug.jks` 디버그 키로 서명하고 `⚠⚠ DEBUG 키` 경고를 찍는다 — 그 APK 는 배포 금지.
- `gh auth status` 로 GitHub CLI 로그인 확인 (릴리스에 사용).
- 빌드가 윈도우 네이티브로 안 되면 WSL Ubuntu 에서 같은 `build.sh` 가 돈다: `sudo apt install aapt dalvik-exchange zipalign apksigner default-jdk-headless && ./tools/setup-sdk.sh`.

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
