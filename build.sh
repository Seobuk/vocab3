#!/usr/bin/env bash
# Gradle 없이 빌드: aapt2 -> javac -> dx -> zipalign -> apksigner (APK)
#                 aapt2 --proto-format -> bundletool -> jarsigner   (AAB, bundletool.jar 이 있을 때만)
#
# 준비물 (Ubuntu/Debian):  sudo apt install aapt dalvik-exchange zipalign apksigner default-jdk-headless
#                          ./tools/setup-sdk.sh   (android-34.jar, android-36.jar, bundletool.jar 다운로드)
# 환경변수:  SDK_DIR   플랫폼 jar 폴더 (기본 ./sdk)
#           KS        keystore 경로 (기본 keystore/release.jks, 없으면 디버그용 키를 자동 생성)
#           KS_ALIAS  키 별칭 (기본 vocab3)
#           KS_PASS   keystore/키 비밀번호 (기본 android — 자동 생성 디버그 키용)
set -euo pipefail
cd "$(dirname "$0")"

SDK_DIR="${SDK_DIR:-./sdk}"
SDK_JAR="${SDK_JAR:-$SDK_DIR/android-36.jar}"        # javac 컴파일용 (API 36)
RES_JAR="${RES_JAR:-$SDK_DIR/android-34.jar}"        # aapt2 링크용 (Debian aapt2는 API 35+ resources.arsc를 못 읽음)
BUNDLETOOL="${BUNDLETOOL:-$SDK_DIR/bundletool.jar}"
COMPILE_SDK_FLAGS="--compile-sdk-version-code 36 --compile-sdk-version-name 16"
KS="${KS:-keystore/release.jks}"
KS_ALIAS="${KS_ALIAS:-vocab3}"
KS_PASS="${KS_PASS:-android}"
OUT="build/vocab3.apk"
AAB="build/vocab3.aab"

for f in "$SDK_JAR" "$RES_JAR"; do
  [ -f "$f" ] || { echo "missing $f — run ./tools/setup-sdk.sh first"; exit 1; }
done
for t in aapt2 dalvik-exchange zipalign apksigner javac keytool; do
  command -v "$t" >/dev/null || { echo "missing tool: $t"; exit 1; }
done

rm -rf build/gen build/classes build/dex build/aab build/res.zip build/base.apk build/base_proto.apk build/unaligned.apk build/aligned.apk
mkdir -p build/gen build/classes build/dex

if [ ! -f "$KS" ]; then
  echo "keystore not found → generating a debug keystore at $KS (do NOT publish apps signed with it)"
  mkdir -p "$(dirname "$KS")"
  keytool -genkeypair -keystore "$KS" -alias "$KS_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -dname "CN=Vocab3 Debug, O=Vocab3, C=KR" 2>/dev/null
fi

echo "[1/8] aapt2 compile"
aapt2 compile --dir res -o build/res.zip

echo "[2/8] aapt2 link"
aapt2 link -o build/base.apk -I "$RES_JAR" $COMPILE_SDK_FLAGS --manifest AndroidManifest.xml -A assets \
  --java build/gen --auto-add-overlay build/res.zip

echo "[3/8] javac"
javac -source 1.8 -target 1.8 -bootclasspath "$SDK_JAR" -encoding UTF-8 -nowarn \
  -d build/classes $(find src build/gen -name "*.java") 2>&1 | grep -v "^warning: \[options\]" || true
test -f build/classes/kr/hyunuk/vocab3/MainActivity.class

echo "[4/8] dx"
dalvik-exchange --dex --min-sdk-version=24 --output=build/dex/classes.dex build/classes 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
test -f build/dex/classes.dex

echo "[5/8] package + zipalign"
cp build/base.apk build/unaligned.apk
(cd build/dex && zip -q -X ../unaligned.apk classes.dex)
zipalign -f 4 build/unaligned.apk build/aligned.apk

echo "[6/8] apksigner"
apksigner sign --ks "$KS" --ks-key-alias "$KS_ALIAS" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" build/aligned.apk 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
apksigner verify "$OUT" 2>&1 | grep -v JAVA_TOOL_OPTIONS || true
ls -la "$OUT"

if [ -f "$BUNDLETOOL" ]; then
  echo "[7/8] aapt2 link (proto) + bundletool build-bundle"
  aapt2 link --proto-format -o build/base_proto.apk -I "$RES_JAR" $COMPILE_SDK_FLAGS --manifest AndroidManifest.xml -A assets \
    --auto-add-overlay build/res.zip
  mkdir -p build/aab/base/manifest build/aab/base/dex
  (cd build/aab/base && unzip -q -o ../../base_proto.apk && mv AndroidManifest.xml manifest/ && cp ../../dex/classes.dex dex/ \
    && zip -q -r ../base.zip manifest dex res resources.pb assets)
  java -jar "$BUNDLETOOL" build-bundle --modules=build/aab/base.zip --output="$AAB" --overwrite 2>&1 | grep -v JAVA_TOOL_OPTIONS || true

  echo "[8/8] jarsigner (upload key) + validate"
  jarsigner -keystore "$KS" -storepass "$KS_PASS" -keypass "$KS_PASS" -sigalg SHA256withRSA -digestalg SHA-256 \
    "$AAB" "$KS_ALIAS" 2>&1 | grep -v JAVA_TOOL_OPTIONS | tail -1
  java -jar "$BUNDLETOOL" validate --bundle="$AAB" 2>&1 | grep -v JAVA_TOOL_OPTIONS | head -3
  ls -la "$AAB"
else
  echo "(bundletool.jar not found — AAB skipped)"
fi
