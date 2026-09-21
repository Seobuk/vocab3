#!/usr/bin/env bash
# tools/release.sh — main을 push하고 GitHub 릴리스(태그 + APK 자산)를 만든다.
# 사용: tools/release.sh <tag> <apk> <notes.md>      (저장소 루트에서)
# 토큰: 환경변수 GITHUB_TOKEN, 없으면 .secrets/github-token.txt (git 제외됨).
#       fine-grained PAT, 이 저장소만, 권한 Contents: Read and write.
set -euo pipefail
cd "$(dirname "$0")/.."
TAG="${1:?tag (예: v1.16)}"; APK="${2:?apk 경로}"; NOTES="${3:?릴리스 노트 파일}"
REPO="${REPO:-Seobuk/vocab3}"
TOKEN="${GITHUB_TOKEN:-}"
[ -z "$TOKEN" ] && [ -f .secrets/github-token.txt ] && TOKEN="$(tr -d '[:space:]' < .secrets/github-token.txt)"
[ -n "$TOKEN" ] || { echo "토큰이 없어요: GITHUB_TOKEN 또는 .secrets/github-token.txt"; exit 1; }
[ -f "$APK" ] || { echo "APK 없음: $APK"; exit 1; }
[ -f "$NOTES" ] || { echo "노트 없음: $NOTES"; exit 1; }
api() { curl -sS --fail-with-body -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "$@"; }

# 1) push (토큰은 일회성 credential helper로만 전달 — .git/config에 저장되지 않음)
git -c credential.helper= -c "credential.helper=!f(){ echo username=x-access-token; echo password=$TOKEN; }; f" push origin main
SHA=$(git rev-parse HEAD)
echo "pushed main @ ${SHA:0:7}"

# 2) 릴리스 생성 (태그는 main 최신 커밋에) — 이미 있으면 재사용
REL=$(api "https://api.github.com/repos/$REPO/releases/tags/$TAG" 2>/dev/null || true)
if ! echo "$REL" | jq -e '.id' >/dev/null 2>&1; then
  BODY=$(jq -n --arg t "$TAG" --arg b "$(cat "$NOTES")" --arg c "$SHA" '{tag_name:$t, name:$t, body:$b, target_commitish:$c, draft:false, prerelease:false}')
  REL=$(api -X POST "https://api.github.com/repos/$REPO/releases" -d "$BODY")
fi
ID=$(echo "$REL" | jq -r '.id'); URL=$(echo "$REL" | jq -r '.html_url')
echo "release: $URL"

# 3) APK 자산 업로드 (이미 붙어 있으면 건너뜀)
NAME=$(basename "$APK")
if echo "$REL" | jq -e --arg n "$NAME" '.assets[]? | select(.name==$n)' >/dev/null; then echo "asset already attached: $NAME"; exit 0; fi
if api -X POST -H "Content-Type: application/vnd.android.package-archive" --data-binary @"$APK" \
     "https://uploads.github.com/repos/$REPO/releases/$ID/assets?name=$NAME" >/dev/null; then
  echo "asset uploaded: $NAME"
else
  echo "ASSET UPLOAD FAILED (uploads.github.com 차단?) — $URL 에서 $APK 를 직접 첨부"; exit 2
fi
