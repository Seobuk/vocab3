# 제3자 라이브러리와 배포 라이선스

이 저장소의 소스 코드는 [MIT](LICENSE)입니다.

v2.14부터 GitHub Releases로 배포하는 APK에는 유튜브 영상을 받는 기능(오프라인 쉐도잉)을 위해 아래 라이브러리가 함께 들어갑니다.
NewPipeExtractor가 GPL-3.0-or-later이므로 **배포 APK 전체는 GPL-3.0-or-later 조건으로 배포합니다** (전문: [COPYING.GPL-3.0.txt](COPYING.GPL-3.0.txt)).
대응하는 소스는 이 공개 저장소의 해당 릴리스 태그와, `tools/setup-sdk.sh`·`tools/setup-sdk.ps1`이 고정 주소 + SHA-256 검증으로 받는 아래 버전입니다.

| 라이브러리 | 버전 | 라이선스 | 출처 |
|---|---|---|---|
| NewPipeExtractor | v0.26.5 | GPL-3.0-or-later | https://github.com/TeamNewPipe/NewPipeExtractor |
| nanojson (TeamNewPipe 포크) | e9d656d | MIT 또는 Apache-2.0 | https://github.com/TeamNewPipe/nanojson |
| jsoup | 1.22.2 | MIT | https://jsoup.org |
| protobuf-javalite | 4.35.1 | BSD-3-Clause | https://github.com/protocolbuffers/protobuf |
| Mozilla Rhino | 1.8.1 | MPL-2.0 | https://github.com/mozilla/rhino |

유튜브 영상을 받는 것은 YouTube 서비스 약관에 어긋날 수 있습니다. 이 기능은 개인 학습용이며, Google Play 등록용 빌드에는 넣지 않습니다.
