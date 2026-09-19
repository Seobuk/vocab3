#!/usr/bin/env bash
# 빌드에 필요한 Android 플랫폼 jar와 bundletool을 ./sdk 에 내려받는다 (Android SDK 매니저 없이 빌드하기 위함).
set -euo pipefail
cd "$(dirname "$0")/.."
SDK_DIR="${SDK_DIR:-./sdk}"
mkdir -p "$SDK_DIR"
BT_VER="${BT_VER:-1.18.2}"

dl() { [ -f "$2" ] && { echo "exists: $2"; return; }; echo "downloading $1"; curl -sSL --fail -o "$2" "$1"; }
dl "https://raw.githubusercontent.com/Sable/android-platforms/master/android-34/android.jar" "$SDK_DIR/android-34.jar"
dl "https://raw.githubusercontent.com/Sable/android-platforms/master/android-36/android.jar" "$SDK_DIR/android-36.jar"
dl "https://github.com/google/bundletool/releases/download/$BT_VER/bundletool-all-$BT_VER.jar" "$SDK_DIR/bundletool.jar"
ls -la "$SDK_DIR"
echo "done. now: ./build.sh"
