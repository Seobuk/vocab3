# 윈도우용 빌드 환경 준비 (관리자 권한 불필요). PowerShell 에서:  powershell -ExecutionPolicy Bypass -File tools/setup-sdk.ps1
#  1) JDK 17 (없으면 winget 으로 Microsoft OpenJDK 17 설치)
#  2) Android SDK cmdline-tools → sdkmanager 로 build-tools;35.0.0, platforms;android-36, platforms;android-34, platform-tools
#  3) bundletool.jar → ./sdk  (AAB 생성용, 없어도 APK 는 만들어짐)
#     + NewPipeExtractor 와 의존성 jar → ./sdk/libs  (오프라인 영상 받기, 버전 고정 + SHA-256 검증 — 없으면 빌드가 멈춤)
#  4) ANDROID_HOME 사용자 환경변수 설정
# 그 다음 Git Bash(Claude Code Bash 도구)에서:  bash build.sh
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # PowerShell 5.1 의 Invoke-WebRequest 는 진행 표시 때문에 수십 배 느려진다
Set-Location (Join-Path $PSScriptRoot '..')

$Sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
Write-Host "Android SDK 위치: $Sdk"

# --- JDK 17 ---
$javac = Get-Command javac -ErrorAction SilentlyContinue
if (-not $javac) {
  Write-Host "javac 가 없어요 → Microsoft OpenJDK 17 설치 (winget)"
  winget install --id Microsoft.OpenJDK.17 -e --accept-source-agreements --accept-package-agreements
  Write-Host "JDK 설치됨. 새 터미널을 열고 이 스크립트를 다시 실행하세요 (PATH 갱신)."
  exit 1
}
Write-Host "JDK: $(& javac -version)"   # 2>&1 금지 — 5.1 에선 stderr 한 줄(JAVA_TOOL_OPTIONS 등)이 Stop 으로 스크립트를 끊는다

# --- cmdline-tools (sdkmanager) ---
$sdkmanager = Join-Path $Sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkmanager)) {
  # 최신 빌드 번호는 https://developer.android.com/studio#command-line-tools-only 에서 확인 (404 나면 그 페이지의 윈도우 zip 링크로 바꿀 것)
  $url = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
  $zip = Join-Path $env:TEMP 'cmdline-tools.zip'
  Write-Host "cmdline-tools 다운로드: $url"
  Invoke-WebRequest $url -OutFile $zip
  $tmp = Join-Path $env:TEMP 'cmdline-tools-x'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip -DestinationPath $tmp
  New-Item -ItemType Directory -Force (Join-Path $Sdk 'cmdline-tools') | Out-Null
  Move-Item (Join-Path $tmp 'cmdline-tools') (Join-Path $Sdk 'cmdline-tools\latest')
}

# --- 라이선스 동의 + 패키지 설치 ---
Write-Host "SDK 라이선스 동의 + 패키지 설치 (몇 분 걸려요)"
# PowerShell 5.1 에서 .bat 로 파이프한 입력은 sdkmanager 에 안 닿는다 → cmd 파일 리다이렉트로
$yes = Join-Path $env:TEMP 'sdk-yes.txt'
Set-Content $yes ((1..20 | ForEach-Object { 'y' }) -join "`r`n") -Encoding ASCII
cmd /c "`"$sdkmanager`" --sdk_root=`"$Sdk`" --licenses < `"$yes`"" | Out-Null
& $sdkmanager --sdk_root="$Sdk" 'platform-tools' 'build-tools;35.0.0' 'platforms;android-36' 'platforms;android-34'
if ($LASTEXITCODE -ne 0) { throw "sdkmanager 실패 (exit $LASTEXITCODE)" }

# --- bundletool ---
New-Item -ItemType Directory -Force 'sdk' | Out-Null
if (-not (Test-Path 'sdk\bundletool.jar')) {
  Invoke-WebRequest 'https://github.com/google/bundletool/releases/download/1.18.2/bundletool-all-1.18.2.jar' -OutFile 'sdk\bundletool.jar'
}

# --- v2.14 오프라인 영상: NewPipeExtractor(GPL-3.0) + 의존성 → sdk\libs (버전 고정 + SHA-256 검증, tools/setup-sdk.sh 와 같은 목록 — 올릴 땐 둘 다) ---
New-Item -ItemType Directory -Force 'sdk\libs' | Out-Null
$libs = @(
  @('extractor',         'https://jitpack.io/com/github/TeamNewPipe/NewPipeExtractor/v0.26.5/NewPipeExtractor-v0.26.5.jar', '923bf0a60938d570ad176ed7b08fa9fec7d0772d7a386ca89a2dd3b9212979c7'),
  @('nanojson',          'https://jitpack.io/com/github/TeamNewPipe/nanojson/e9d656ddb49a412a5a0a5d5ef20ca7ef09549996/nanojson-e9d656ddb49a412a5a0a5d5ef20ca7ef09549996.jar', 'd495881a322b3c72e5d43284afd7d7021520028ca8b7c6ba861e3fd8d90614d5'),
  @('jsoup',             'https://repo1.maven.org/maven2/org/jsoup/jsoup/1.22.2/jsoup-1.22.2.jar', '596785996d3c6df16f544c232d10a9a1d88783b2a4740cf5251cb616f2be704d'),
  @('protobuf-javalite', 'https://repo1.maven.org/maven2/com/google/protobuf/protobuf-javalite/4.35.1/protobuf-javalite-4.35.1.jar', '45d3769189888e491ab7d58125f2014c2a86fb8104c7aa3878c723943fce7a14'),
  @('rhino',             'https://repo1.maven.org/maven2/org/mozilla/rhino/1.8.1/rhino-1.8.1.jar', '98a06d42bdd69da15bf9c2a7812b4cfe648ca9e64fe8baaeb502a32b0ed2c8ac')
)
foreach ($l in $libs) {
  $f = "sdk\libs\$($l[0]).jar"
  if ((Test-Path $f) -and ((Get-FileHash $f -Algorithm SHA256).Hash -eq $l[2])) { Write-Host "ok: $f"; continue }
  Write-Host "다운로드: $($l[1])"
  Invoke-WebRequest $l[1] -OutFile "$f.tmp"
  if ((Get-FileHash "$f.tmp" -Algorithm SHA256).Hash -ne $l[2]) { Remove-Item "$f.tmp"; throw "SHA-256 불일치: $($l[1])" }
  Move-Item -Force "$f.tmp" $f
}

# --- 환경변수 ---
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $Sdk, 'User')
$env:ANDROID_HOME = $Sdk
Write-Host ""
Write-Host "준비 끝. build-tools: $(Get-ChildItem (Join-Path $Sdk 'build-tools') | Select-Object -ExpandProperty Name)"
Write-Host "이제 Git Bash 에서:  bash build.sh   (keystore/vocab3.jks + keystore/PASSWORD.txt 가 있어야 배포용 서명)"
