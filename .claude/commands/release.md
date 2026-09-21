---
description: main push + GitHub 릴리스(태그·노트·APK 첨부). 사용법 — /release v1.16
allowed-tools: Bash(git *), Bash(gh *), Bash(ls *), Bash(cat *)
---
릴리스 태그: $ARGUMENTS  (형식 vX.Y — 비어 있으면 AndroidManifest.xml의 versionName 앞에 v를 붙여 쓴다)

순서대로 실행하고, 각 단계가 실패하면 멈추고 이유를 보고한다. APK·노트는 절대 `git add` 하지 않는다.

1. `git status --porcelain` — 커밋되지 않은 변경(추적 파일)이 있으면 멈추고 목록을 보여준다. (`?? .claude/` 같은 untracked는 무시)
2. `release/Vocab3_$ARGUMENTS.apk` 와 `release/notes-$ARGUMENTS.md` 가 있는지 확인. 없으면 멈춤.
3. `git push origin main`
4. 릴리스가 이미 있는지 `gh release view $ARGUMENTS` 로 확인.
   - 없으면: `gh release create $ARGUMENTS release/Vocab3_$ARGUMENTS.apk -t $ARGUMENTS -F release/notes-$ARGUMENTS.md`
   - 있으면: `gh release upload $ARGUMENTS release/Vocab3_$ARGUMENTS.apk --clobber`
5. `gh release view $ARGUMENTS` 로 APK 자산이 붙었는지 확인하고, 릴리스 URL 한 줄만 보고한다.
