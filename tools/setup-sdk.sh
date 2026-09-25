#!/usr/bin/env bash
# 빌드에 필요한 Android 플랫폼 jar와 bundletool을 ./sdk 에 내려받는다 (Android SDK 매니저 없이 빌드하기 위함).
# + sdk/libs: NewPipeExtractor 와 의존성 jar (SHA-256 검증). 이 jar 들은 d8 이 있어야 해서 빌드엔 Android SDK build-tools 도 필요하다.
set -euo pipefail
cd "$(dirname "$0")/.."
SDK_DIR="${SDK_DIR:-./sdk}"
mkdir -p "$SDK_DIR"
BT_VER="${BT_VER:-1.18.2}"

dl() { [ -f "$2" ] && { echo "exists: $2"; return; }; echo "downloading $1"; curl -sSL --fail -o "$2" "$1"; }
dl "https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar" "$SDK_DIR/android-34.jar"
dl "https://raw.githubusercontent.com/Sable/android-platforms/master/android-36/android.jar" "$SDK_DIR/android-36.jar"
dl "https://github.com/google/bundletool/releases/download/$BT_VER/bundletool-all-$BT_VER.jar" "$SDK_DIR/bundletool.jar"

# v2.14 오프라인 영상: NewPipeExtractor(GPL-3.0) + 의존성 → sdk/libs. 버전 고정 + SHA-256 검증 (tools/setup-sdk.ps1 과 같은 목록 — 올릴 땐 둘 다)
# 이름이 고정이라 버전을 올리면 해시가 달라져 새로 받는다
mkdir -p "$SDK_DIR/libs"
lib() {
  local f="$SDK_DIR/libs/$1.jar"
  if [ -f "$f" ] && echo "$3  $f" | sha256sum -c --status; then echo "ok: $f"; return; fi
  echo "downloading $2"; curl -sSL --fail -o "$f.tmp" "$2"
  echo "$3  $f.tmp" | sha256sum -c --status || { rm -f "$f.tmp"; echo "SHA-256 불일치: $2"; exit 1; }
  mv -f "$f.tmp" "$f"
}
lib extractor         https://jitpack.io/com/github/TeamNewPipe/NewPipeExtractor/v0.26.5/NewPipeExtractor-v0.26.5.jar 923bf0a60938d570ad176ed7b08fa9fec7d0772d7a386ca89a2dd3b9212979c7
lib nanojson          https://jitpack.io/com/github/TeamNewPipe/nanojson/e9d656ddb49a412a5a0a5d5ef20ca7ef09549996/nanojson-e9d656ddb49a412a5a0a5d5ef20ca7ef09549996.jar d495881a322b3c72e5d43284afd7d7021520028ca8b7c6ba861e3fd8d90614d5
lib jsoup             https://repo1.maven.org/maven2/org/jsoup/jsoup/1.22.2/jsoup-1.22.2.jar 596785996d3c6df16f544c232d10a9a1d88783b2a4740cf5251cb616f2be704d
lib protobuf-javalite https://repo1.maven.org/maven2/com/google/protobuf/protobuf-javalite/4.35.1/protobuf-javalite-4.35.1.jar 45d3769189888e491ab7d58125f2014c2a86fb8104c7aa3878c723943fce7a14
lib rhino             https://repo1.maven.org/maven2/org/mozilla/rhino/1.8.1/rhino-1.8.1.jar 98a06d42bdd69da15bf9c2a7812b4cfe648ca9e64fe8baaeb502a32b0ed2c8ac
ls -la "$SDK_DIR"
echo "done. now: ./build.sh"
