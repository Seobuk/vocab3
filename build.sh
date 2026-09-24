#!/usr/bin/env bash
# Gradle 없이 빌드:  aapt2 -> javac -> d8/dx -> zipalign -> apksigner  (APK)
#                  aapt2 --proto-format -> bundletool -> jarsigner     (AAB, bundletool.jar 이 있을 때만)
#
# 어디서든 같은 스크립트:
#   · 윈도우 (Git Bash — Claude Code의 Bash 도구):  Android SDK build-tools + JDK 17.  준비는  powershell -File tools/setup-sdk.ps1
#   · 리눅스/WSL:  sudo apt install aapt dalvik-exchange zipalign apksigner default-jdk-headless  +  ./tools/setup-sdk.sh
#   Android SDK(ANDROID_HOME · %LOCALAPPDATA%\Android\Sdk · ~/Android/Sdk)가 보이면 그 build-tools 를 쓰고, 없으면 apt 도구를 쓴다.
#
# 환경변수:  KS        keystore 경로 (기본 keystore/vocab3.jks — 없으면 build/debug.jks 디버그 키로 서명 + 매번 경고: 배포 금지)
#           KS_ALIAS  키 별칭 (기본 vocab3)
#           KS_PASS   비밀번호 (기본: keystore/PASSWORD.txt 내용 — 키는 있는데 이 파일이 없으면 멈춤)
#           SDK_JAR / RES_JAR   javac용 / aapt2 링크용 android.jar 를 직접 지정하고 싶을 때
set -euo pipefail
cd "$(dirname "$0")"

# ---------- 도구 찾기 ----------
EXE=""; WIN=0
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) EXE=".exe"; WIN=1;; esac
topath() { if [ "$WIN" = 1 ] && command -v cygpath >/dev/null 2>&1; then cygpath -u "$1"; else echo "$1"; fi; }
find_sdk() {
  local d
  for d in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "${LOCALAPPDATA:-}/Android/Sdk" "$HOME/Android/Sdk" "$HOME/Library/Android/sdk"; do
    [ -n "$d" ] || continue; d="$(topath "$d")"
    [ -d "$d/build-tools" ] && { echo "$d"; return 0; }
  done
  return 1
}
pyrun() {   # python 스크립트를 stdin 으로 실행 (zip 조작용 — 윈도우 Git Bash 에는 zip/unzip 이 없다)
  if [ "$WIN" = 1 ] && command -v py >/dev/null 2>&1; then py -3 - "$@"
  elif command -v python3 >/dev/null 2>&1; then python3 - "$@"
  else python - "$@"; fi
}

SDK_DIR="${SDK_DIR:-./sdk}"
BUNDLETOOL="${BUNDLETOOL:-$SDK_DIR/bundletool.jar}"
COMPILE_SDK_FLAGS="--compile-sdk-version-code 36 --compile-sdk-version-name 16"
KS="${KS:-keystore/vocab3.jks}"
KS_ALIAS="${KS_ALIAS:-vocab3}"
DEBUG_KEY=0
if [ ! -f "$KS" ]; then   # 릴리스 키가 없으면 build/debug.jks 로 — keystore/ 에는 절대 만들지 않는다 (진짜 키로 착각하게 됨)
  [ "$KS" = keystore/vocab3.jks ] || { echo "keystore not found: $KS"; exit 1; }
  DEBUG_KEY=1; KS=build/debug.jks; KS_ALIAS=vocab3; KS_PASS=android
elif [ -z "${KS_PASS:-}" ]; then
  [ -f keystore/PASSWORD.txt ] || { echo "keystore/PASSWORD.txt 가 없어요 (비밀번호 한 줄, 또는 KS_PASS 환경변수)"; exit 1; }
  KS_PASS="$(tr -d '\r\n' < keystore/PASSWORD.txt)"
fi
debug_warn() { [ "$DEBUG_KEY" = 1 ] && echo "⚠⚠ DEBUG 키(build/debug.jks)로 서명 — keystore/vocab3.jks 가 없음. 이 APK/AAB 는 배포 금지 (기존 설치 위에 안 올라감) ⚠⚠" || true; }
OUT="build/vocab3.apk"
AAB="build/vocab3.aab"

if SDK="$(find_sdk)"; then
  BT="$(ls -d "$SDK"/build-tools/*/ 2>/dev/null | sort -V | tail -1)"; BT="${BT%/}"
  [ -n "$BT" ] || { echo "build-tools 가 없어요: $SDK/build-tools — tools/setup-sdk.ps1 을 실행하세요"; exit 1; }
  AAPT2="$BT/aapt2$EXE"; ZIPALIGN="$BT/zipalign$EXE"
  APKSIGNER=(java -jar "$BT/lib/apksigner.jar")
  DEXER=d8; D8=(java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8)
  P36="$SDK/platforms/android-36/android.jar"; P34="$SDK/platforms/android-34/android.jar"
  SDK_JAR="${SDK_JAR:-$([ -f "$P36" ] && echo "$P36" || echo "$P34")}"
  RES_JAR="${RES_JAR:-$([ -f "$P36" ] && echo "$P36" || echo "$P34")}"   # 공식 aapt2 는 API 36 jar 로 링크해도 된다
  echo "SDK: $SDK  (build-tools $(basename "$BT"))"
else
  AAPT2=aapt2; ZIPALIGN=zipalign; APKSIGNER=(apksigner); DEXER=dx
  SDK_JAR="${SDK_JAR:-$SDK_DIR/android-36.jar}"
  RES_JAR="${RES_JAR:-$SDK_DIR/android-34.jar}"        # Debian aapt2 는 API 35+ resources.arsc 를 못 읽는다
  for t in aapt2 dalvik-exchange zipalign apksigner; do
    command -v "$t" >/dev/null || { echo "missing tool: $t  (apt install aapt dalvik-exchange zipalign apksigner)  — 또는 Android SDK 를 설치하면 자동으로 그쪽을 씁니다"; exit 1; }
  done
fi
for f in "$SDK_JAR" "$RES_JAR"; do [ -f "$f" ] || { echo "missing $f — tools/setup-sdk.ps1 (윈도우) 또는 ./tools/setup-sdk.sh (리눅스) 를 먼저 실행하세요"; exit 1; }; done
for t in javac keytool jarsigner; do command -v "$t" >/dev/null || { echo "missing tool: $t (JDK 17 필요)"; exit 1; }; done

rm -rf "$OUT" "$AAB" build/gen build/classes build/dex build/aab build/res.zip build/base.apk build/base_proto.apk build/unaligned.apk build/aligned.apk
mkdir -p build/gen build/classes build/dex

debug_warn
if [ "$DEBUG_KEY" = 1 ] && [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Vocab3 Debug, O=Vocab3, C=KR" 2>/dev/null
fi

echo "[1/8] aapt2 compile"
"$AAPT2" compile --dir res -o build/res.zip

echo "[2/8] aapt2 link"
"$AAPT2" link -o build/base.apk -I "$RES_JAR" $COMPILE_SDK_FLAGS --manifest AndroidManifest.xml -A assets \
  --java build/gen --auto-add-overlay build/res.zip

echo "[3/8] javac"
find src build/gen -name "*.java" > build/sources.txt
javac -source 1.8 -target 1.8 -bootclasspath "$SDK_JAR" -encoding UTF-8 -nowarn -d build/classes @build/sources.txt 2>&1 | grep -v "^warning: \[options\]" || true
test -f build/classes/kr/hyunuk/vocab3/MainActivity.class

if [ "$DEXER" = d8 ]; then
  echo "[4/8] d8"
  find build/classes -name "*.class" > build/classes.txt
  "${D8[@]}" --release --min-api 24 --output build/dex $(cat build/classes.txt) 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
else
  echo "[4/8] dx"
  dalvik-exchange --dex --min-sdk-version=24 --output=build/dex/classes.dex build/classes 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
fi
test -f build/dex/classes.dex

echo "[5/8] package + zipalign"
pyrun <<'EOF'
import shutil, zipfile
shutil.copy('build/base.apk', 'build/unaligned.apk')
with zipfile.ZipFile('build/unaligned.apk', 'a', zipfile.ZIP_DEFLATED) as z:
    z.write('build/dex/classes.dex', 'classes.dex')
EOF
"$ZIPALIGN" -f 4 build/unaligned.apk build/aligned.apk

echo "[6/8] apksigner"
"${APKSIGNER[@]}" sign --ks "$KS" --ks-key-alias "$KS_ALIAS" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" build/aligned.apk 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
"${APKSIGNER[@]}" verify "$OUT" 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
"$AAPT2" dump badging "$OUT" 2>/dev/null | head -1 || true
ls -la "$OUT"

if [ -f "$BUNDLETOOL" ]; then
  echo "[7/8] aapt2 link (proto) + bundletool build-bundle"
  "$AAPT2" link --proto-format -o build/base_proto.apk -I "$RES_JAR" $COMPILE_SDK_FLAGS --manifest AndroidManifest.xml -A assets \
    --auto-add-overlay build/res.zip
  mkdir -p build/aab
  pyrun <<'EOF'
import zipfile
src = zipfile.ZipFile('build/base_proto.apk')
with zipfile.ZipFile('build/aab/base.zip', 'w', zipfile.ZIP_DEFLATED) as out:
    for n in src.namelist():
        if n == 'AndroidManifest.xml': out.writestr('manifest/AndroidManifest.xml', src.read(n))
        elif n == 'resources.pb' or n.startswith('res/') or n.startswith('assets/'): out.writestr(n, src.read(n))
    out.write('build/dex/classes.dex', 'dex/classes.dex')
EOF
  java -jar "$BUNDLETOOL" build-bundle --modules=build/aab/base.zip --output="$AAB" --overwrite 2>&1 | grep -v JAVA_TOOL_OPTIONS || true

  echo "[8/8] jarsigner (upload key) + validate"
  jarsigner -keystore "$KS" -storepass "$KS_PASS" -keypass "$KS_PASS" -sigalg SHA256withRSA -digestalg SHA-256 \
    "$AAB" "$KS_ALIAS" 2>&1 | grep -v JAVA_TOOL_OPTIONS | tail -1
  java -jar "$BUNDLETOOL" validate --bundle="$AAB" 2>&1 | grep -v JAVA_TOOL_OPTIONS | head -3
  ls -la "$AAB"
else
  echo "(bundletool.jar not found — AAB skipped; tools/setup-sdk.ps1 또는 setup-sdk.sh 가 받아 줍니다)"
fi
debug_warn
