# Shadowing You - YouTube 쉐도잉 도구

YouTube URL을 입력하면 공개 자막을 추출해 영어 쉐도잉 연습에 맞게 보여주는 Next.js 앱입니다.

## 현재 결론: 로컬 개인용 프로젝트

이 프로젝트는 배포형 서비스가 아니라 **개인 로컬 사용용**으로 마무리합니다.

이유:

- 로컬 실행 시 transcript 요청은 사용자의 개인/가정/일반 ISP IP에서 나가므로 YouTube caption metadata가 정상 반환될 가능성이 높습니다.
- Vercel, Render 같은 배포 서버는 데이터센터 IP를 사용합니다.
- YouTube 또는 보조 transcript 사이트는 데이터센터 IP의 scraping/automation성 요청을 제한할 수 있습니다.
- 그 결과 배포 환경에서는 실제 자막이 있는 영상도 `Transcript is disabled`, `No public transcript found`, `403`, `deployment_fetch_failed`처럼 실패할 수 있습니다.

따라서 안정적인 자동 자막 추출은 로컬에서 실행하는 방식이 가장 현실적입니다. 배포 환경에서 안정적으로 운영하려면 Supadata 같은 유료/외부 transcript API를 붙이는 방향이 필요합니다.

## 기능

- YouTube 일반 영상 URL과 Shorts URL에서 공개 자막 자동 추출
- 블러 모드: 텍스트를 숨기고 hover 시 보기
- 큰 글씨 모드
- 세그먼트 클릭 시 YouTube 해당 구간 열기
- 전체 텍스트 복사, `.txt`, `.srt` 다운로드
- 다크모드
- 자동 추출 실패 시 텍스트 직접 붙여넣기

## 실행

```bash
npm install
npm run dev
```

로컬 주소는 기본적으로 `http://localhost:3000`입니다.

## 데스크톱 앱 또는 크롬 익스텐션 가능성

### 데스크톱 앱

가능합니다.

Electron, Tauri 같은 데스크톱 앱으로 만들면 앱이 사용자의 컴퓨터에서 실행됩니다. transcript 요청도 로컬 머신의 네트워크를 통해 나가므로 현재 로컬 Next.js 실행과 비슷하게 개인/가정 IP를 사용합니다.

장점:

- 배포 서버 IP 차단 문제를 피할 수 있습니다.
- 사용자는 터미널에서 `npm run dev`를 실행하지 않아도 됩니다.
- 로컬 파일 저장, 설정 저장, 단축키 같은 기능을 붙이기 쉽습니다.

주의:

- 앱 내부에 Node 서버 또는 transcript 실행 로직을 포함해야 합니다.
- 배포 패키징, 자동 업데이트, macOS notarization 같은 데스크톱 배포 이슈가 생깁니다.
- 개인용이라면 Tauri/Electron 모두 가능하지만, 현재 Next.js 앱을 재사용하기에는 Electron이 더 단순합니다.

### 크롬 익스텐션

가능하지만 데스크톱 앱보다 제약이 큽니다.

크롬 익스텐션은 사용자의 브라우저 환경에서 실행되므로 네트워크 관점에서는 로컬/개인 IP 이점을 일부 가질 수 있습니다. 다만 YouTube 페이지나 외부 transcript 사이트를 직접 호출하면 CORS, host permission, Manifest V3 service worker 제약을 고려해야 합니다.

장점:

- 사용자가 YouTube 페이지에서 바로 스크립트를 열 수 있습니다.
- 현재 보고 있는 영상 URL을 쉽게 읽을 수 있습니다.
- 로컬 IP를 사용하므로 Vercel/Render 서버 IP 문제를 피할 가능성이 높습니다.

주의:

- `youtube.com`, transcript endpoint 등에 대한 host permissions가 필요합니다.
- Chrome Web Store 배포 심사와 개인정보 고지가 필요할 수 있습니다.
- YouTube DOM이나 내부 API 변화에 영향을 받기 쉽습니다.

현재 프로젝트를 이어간다면 우선순위는 다음과 같습니다.

1. 현재 Next.js 앱을 로컬 개인용으로 사용
2. 터미널 실행이 불편해지면 Electron 데스크톱 앱으로 래핑
3. YouTube 페이지 안에서 바로 쓰고 싶다면 크롬 익스텐션 검토

## 배포 관련 기록

Vercel 배포 자체는 가능하지만, YouTube transcript 자동 추출은 배포 서버 IP 제한 때문에 안정적이지 않습니다.

```bash
npm run build
vercel --prod
```

GitHub 저장소와 Vercel을 연결하는 경우 별도 빌드 설정 없이 Next.js로 자동 인식됩니다. 다만 이 프로젝트는 최종적으로 로컬 개인용으로 사용합니다.

### Vercel transcript fallback

Vercel 서버리스 환경에서 YouTube transcript 요청이 계속 실패하면 별도 Node 서버나 유료 transcript API를 연결할 수 있습니다.

이 저장소에는 Render용 wrapper API가 포함되어 있습니다.

```text
services/transcript-api
```

Render 설정:

```text
Runtime=Node
Root Directory=services/transcript-api
Build Command=npm install
Start Command=npm start
TRANSCRIPT_API_KEY=your-secret-token
```

Vercel 환경 변수:

```text
TRANSCRIPT_API_URL=https://your-render-service.onrender.com/transcript
TRANSCRIPT_API_KEY=your-secret-token
```

Render 무료 web service는 비활성 상태 이후 cold start가 발생할 수 있어 첫 요청이 느릴 수 있습니다.

외부 API는 다음 요청을 받습니다.

```text
GET /transcript?videoId=_5siHrpPnmw
```

응답은 아래 둘 중 하나면 됩니다.

```json
{
  "segments": [
    { "start": 0, "dur": 3.2, "text": "Hello." }
  ]
}
```

```json
[
  { "start": 0, "dur": 3.2, "text": "Hello." }
]
```

## CORS 프록시 403 에러 기록

기존 정적 HTML 버전은 브라우저에서 다음과 같은 외부 프록시를 직접 호출했습니다.

```text
https://corsproxy.io/?https%3A%2F%2Fyoutubetranscript.com%2F%3Fserver_vid2%3D...
```

발생한 에러:

```text
Free usage is limited to localhost and development environments.
Get an API key at https://corsproxy.io/pricing/
```

원인:

- `index.html`을 `file://`로 직접 열면 브라우저가 해당 문서를 고유 보안 origin으로 취급합니다.
- 브라우저에서 `youtubetranscript.com`을 직접 가져오면 CORS 정책 때문에 차단될 수 있습니다.
- 이를 우회하려고 사용한 `corsproxy.io` 무료 엔드포인트는 localhost와 개발 환경 중심으로 제한되어 배포 환경이나 `file://` 사용에서 403을 반환합니다.

적용한 해결:

- 앱을 Next.js로 마이그레이션했습니다.
- 클라이언트는 외부 CORS 프록시 대신 같은 출처의 `/api/transcript?videoId=...`만 호출합니다.
- `/api/transcript` 서버 라우트가 `youtube-transcript` 패키지로 서버 측 InnerTube 기반 자막 추출을 먼저 시도합니다.
- 보조 경로로 YouTube caption metadata 직접 파싱과 `youtubetranscript.com` HTML 파싱을 서버에서 시도합니다.

운영 대안:

- YouTube가 특정 서버 요청을 제한하거나 영상에 공개 자막이 없으면 자동 추출은 실패할 수 있습니다.
- 안정적인 상용 운영이 필요하면 공식 YouTube Data API 또는 신뢰 가능한 유료 transcript API를 검토해야 합니다.
- 현재 앱은 자동 추출 실패 시 붙여넣기 탭으로 수동 로딩할 수 있습니다.

## 지원 URL 형식

```text
https://www.youtube.com/watch?v=arj7oStGLkU
https://youtu.be/arj7oStGLkU
https://www.youtube.com/embed/arj7oStGLkU
https://www.youtube.com/shorts/DfPWbttemYE
https://m.youtube.com/shorts/DfPWbttemYE
```

## 파일 구조

```text
shadowing/
├── app/
│   ├── api/transcript/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/transcript/
├── next.config.ts
├── package-lock.json
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

실제 앱은 Next.js `app/` 디렉터리에서 실행됩니다.
