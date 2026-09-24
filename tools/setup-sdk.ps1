# 윈도우용 빌드 환경 준비 (관리자 권한 불필요). PowerShell 에서:  powershell -ExecutionPolicy Bypass -File tools/setup-sdk.ps1
#  1) JDK 17 (없으면 winget 으로 Microsoft OpenJDK 17 설치)
#  2) Android SDK cmdline-tools → sdkmanager 로 build-tools;35.0.0, platforms;android-36, platforms;android-34, platform-tools
#  3) bundletool.jar → ./sdk  (AAB 생성용, 없어도 APK 는 만들어짐)
#  4) ANDROID_HOME 사용자 환경변수 설정
# 그 다음 Git Bash(Claude Code Bash 도구)에서:  bash build.sh
$ErrorActionPreference = 'Stop'
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
Write-Host "JDK: $((& javac -version 2>&1) -join ' ')"

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
$yes = (1..20 | ForEach-Object { 'y' }) -join "`n"
$yes | & $sdkmanager --sdk_root="$Sdk" --licenses | Out-Null
& $sdkmanager --sdk_root="$Sdk" 'platform-tools' 'build-tools;35.0.0' 'platforms;android-36' 'platforms;android-34'
if ($LASTEXITCODE -ne 0) { throw "sdkmanager 실패 (exit $LASTEXITCODE)" }

# --- bundletool ---
New-Item -ItemType Directory -Force 'sdk' | Out-Null
if (-not (Test-Path 'sdk\bundletool.jar')) {
  Invoke-WebRequest 'https://github.com/google/bundletool/releases/download/1.18.2/bundletool-all-1.18.2.jar' -OutFile 'sdk\bundletool.jar'
}

# --- 환경변수 ---
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $Sdk, 'User')
$env:ANDROID_HOME = $Sdk
Write-Host ""
Write-Host "준비 끝. build-tools: $(Get-ChildItem (Join-Path $Sdk 'build-tools') | Select-Object -ExpandProperty Name)"
Write-Host "이제 Git Bash 에서:  bash build.sh   (keystore/vocab3.jks + keystore/PASSWORD.txt 가 있어야 배포용 서명)"
