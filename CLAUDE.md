# 3단계 단어장 (vocab3) — Claude Code 작업 지침

박진영식 3단계 단어장(새 단어장 → 외운 단어장 → 완전 암기장 → 졸업) 영어 단어 학습 안드로이드 앱.
공개 저장소 github.com/Seobuk/vocab3 (MIT). 배포는 GitHub Releases의 APK (폰은 Obtainium으로 자동 업데이트).

## 구조 (Gradle/Android Studio 없음)
- `AndroidManifest.xml` — versionCode/versionName. 릴리스마다 versionCode +1, versionName = 앱 버전.
- `src/kr/hyunuk/vocab3/MainActivity.java` — WebView 래퍼 + JS 브릿지(TTS·저장·공유·파일·뒤로가기·시스템바·Gemini HTTP).
  **Java 1.8 문법만** (dx로 dex 변환하므로 람다·스트림 금지). 새 브릿지 메서드는 `@JavascriptInterface`.
- `src/kr/hyunuk/vocab3/ReviewService.java` — 듣기 복습 포그라운드 서비스.
- `assets/index.html · style.css · app.js` — 앱 UI/로직 전부 (순수 JS IIFE, 프레임워크 없음).
  `app.js`의 `APP_VERSION`을 versionName과 같게 맞출 것. 데이터는 SharedPreferences 키 `vocab3.state.v1`(JSON 한 덩어리).
  Gemini API 키는 별도 키 `vocab3.ai.v1`에만 저장(백업에 안 들어감) — **코드·저장소에 키를 절대 넣지 않는다.**
- `assets/words.js` — 기본 단어 200개 `[단어, 품사, 뜻, 예문, 해석, 테마]`.
- `tools/*.js` — Playwright UI 테스트 (`npm test`). 스크린샷은 `build/shots/`.
- `store/` — Play 등록 문구·개인정보처리방침(권한 변경 시 함께 갱신).

## 빌드 (리눅스 도구 필요 — 윈도우에서는 WSL Ubuntu)
```
sudo apt install aapt dalvik-exchange zipalign apksigner default-jdk-headless
./tools/setup-sdk.sh      # android-34/36.jar, bundletool → ./sdk
KS=keystore/vocab3.jks KS_PASS=$(cat keystore/PASSWORD.txt) ./build.sh   # → build/vocab3.apk (+ .aab)
```
- `keystore/vocab3.jks`는 git 제외. **업데이트는 반드시 이 키로 서명**해야 기존 설치 위에 덮어씌워진다(다른 키면 설치 실패).
- 보통은 Cowork(클라우드) 세션이 빌드·테스트·커밋까지 하고, 이 PC의 Claude Code는 push·릴리스만 맡는다.

## 릴리스 절차 — `/release vX.Y`
1. `release/Vocab3_vX.Y.apk` 와 `release/notes-vX.Y.md` 준비 (release/ 는 git 제외).
2. `/release vX.Y` → main push + `gh release create`(태그·노트·APK 첨부) + 확인.
3. 릴리스가 올라가면 폰 Obtainium이 새 버전을 알린다.

## 하지 말 것
- `.secrets/`, `keystore/`, `release/`, `*.apk`, `*.aab` 커밋 금지 (.gitignore에 있음).
- 작업은 main에 직접 커밋. worktree 브랜치를 만들었으면 끝나고 main에 합친 뒤 브랜치 삭제.
- 커밋 메시지는 한국어, 제목에 버전(`v1.16: …`).
