---
description: 코드 변경 뒤 버전 올리기 → 테스트 → 빌드 → 릴리스 노트 → 커밋 → GitHub 릴리스까지 한 번에. 사용법 — /ship v2.1 "한 줄 요약"
allowed-tools: Bash(*), Read, Edit, Write
---
인자 `$ARGUMENTS`: 첫 토큰 = 태그(vX.Y), 나머지 = 릴리스 요약(없으면 이번 변경 내용에서 한 줄로 만든다).

순서대로 하고, 어느 단계든 실패하면 멈추고 이유를 보고한다. APK·노트·키스토어는 절대 `git add` 하지 않는다 (.gitignore 에 있음).

1. **버전** — `AndroidManifest.xml` 의 versionCode 를 +1, versionName 을 X.Y 로; `assets/app.js` 의 `APP_VERSION` 을 'X.Y' 로. (이미 그 값이면 건너뜀)
2. **테스트** — `npm test` (Playwright). 처음이면 `npm install && npx playwright install chromium` 먼저. 실패한 항목(FAIL/ERRORS)이 있으면 멈춘다.
3. **빌드** — `bash build.sh` → `build/vocab3.apk`. 출력의 `versionName` 이 X.Y 인지, `apksigner verify` 가 통과했는지 확인.
   keystore/vocab3.jks 가 없어서 디버그 키가 생성됐다는 메시지가 보이면 **멈춘다** (그 APK 는 기존 설치 위에 안 올라감).
4. **릴리스 파일** — `cp build/vocab3.apk release/Vocab3_vX.Y.apk`, `release/notes-vX.Y.md` 작성:
   첫 줄 `3단계 단어장 vX.Y — 요약`, 빈 줄, 변경점 불릿(사용자 관점, 한국어), 마지막 줄 `설치: Vocab3_vX.Y.apk (덮어 설치, 데이터 유지)`.
5. **문서** — 권한·데이터 전송이 바뀌었으면 `store/privacy_policy.html`, 기능이 늘었으면 `README.md` 기능 목록도 갱신.
6. **커밋** — `git add -A` 후 `git status` 로 release/·keystore/·build/ 가 안 잡혔는지 확인, 커밋 메시지 `vX.Y: 요약` (본문에 변경점).
7. **릴리스** — `git push origin main`; `gh release view vX.Y` 로 없으면 `gh release create vX.Y release/Vocab3_vX.Y.apk -t vX.Y -F release/notes-vX.Y.md`, 있으면 `gh release upload vX.Y release/Vocab3_vX.Y.apk --clobber`. `gh release view vX.Y` 로 APK 가 붙었는지 확인하고 릴리스 URL 한 줄만 보고.
