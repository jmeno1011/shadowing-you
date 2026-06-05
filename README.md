# ShadowScript - YouTube 쉐도잉 도구

YouTube URL을 입력하면 공개 자막을 추출해 영어 쉐도잉 연습에 맞게 보여주는 Next.js 앱입니다.

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

## 배포

Vercel에서 Next.js 프로젝트로 배포합니다.

```bash
npm run build
vercel --prod
```

GitHub 저장소와 Vercel을 연결하는 경우 별도 빌드 설정 없이 Next.js로 자동 인식됩니다.

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
├── next.config.ts
├── package-lock.json
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

실제 앱은 Next.js `app/` 디렉터리에서 실행됩니다.
