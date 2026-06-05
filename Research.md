# Shadowing You Research

## 목적

Shadowing You는 YouTube 일반 영상 또는 Shorts URL을 입력받아 공개 자막을 가져오고, 영어 쉐도잉 연습에 맞게 세그먼트 단위로 보여주는 Next.js 앱이다.

## 사용 기술

- Next.js App Router: 화면과 서버 API를 한 프로젝트에서 구성한다.
- React Client Component: 입력, 탭, 블러 모드, 큰 글씨 모드, 복사, 다운로드 같은 UI 상태를 관리한다.
- TypeScript: URL 파싱, 자막 세그먼트, API 응답 타입을 명시한다.
- `youtube-transcript`: 서버에서 YouTube InnerTube 기반 자막 추출을 먼저 시도한다.
- Next.js Route Handler: `/api/transcript`에서 브라우저 대신 서버가 외부 자막 요청을 처리한다.
- Transcript service/provider modules: 자막 소스별 구현을 분리하고 순차 fallback을 관리한다.
- Node test runner + `tsx`: YouTube URL 파서 테스트를 실행한다.
- Vercel: Next.js 앱 배포 대상으로 사용한다.

## 전체 작동 흐름

1. 사용자가 YouTube 일반 영상 URL 또는 Shorts URL을 입력한다.
2. 클라이언트의 `extractYouTubeVideoId()`가 URL에서 11자리 YouTube video id를 추출한다.
3. 클라이언트는 외부 사이트를 직접 호출하지 않고 `/api/transcript?videoId=...`만 호출한다.
4. Next.js 서버 API가 자막을 가져온다.
5. API는 자막을 `{ start, dur, text }` 배열로 정규화해 클라이언트에 반환한다.
6. 클라이언트는 세그먼트 목록, 전체 텍스트, 다운로드용 `.txt`/`.srt` 데이터를 렌더링한다.

## Shorts URL 처리 방식

Shorts는 일반 YouTube 영상과 같은 11자리 video id를 사용한다. 따라서 자막 추출 API 자체는 Shorts 여부를 따로 구분하지 않고 video id만 받는다.

지원하는 URL 예시는 다음과 같다.

```text
https://www.youtube.com/watch?v=arj7oStGLkU
https://youtu.be/arj7oStGLkU
https://www.youtube.com/embed/arj7oStGLkU
https://www.youtube.com/shorts/DfPWbttemYE
https://m.youtube.com/shorts/DfPWbttemYE
```

`lib/youtube-url.ts`의 `extractYouTubeVideoId()`는 다음 조건을 확인한다.

- `youtu.be/{id}` 단축 URL
- `youtube.com/watch?v={id}` 일반 URL
- `youtube.com/embed/{id}` embed URL
- `youtube.com/shorts/{id}` Shorts URL
- `m.youtube.com/shorts/{id}` 모바일 Shorts URL

추출된 값은 `/^[a-zA-Z0-9_-]{11}$/` 형식 검사를 통과해야 한다. YouTube가 아닌 도메인이나 길이가 맞지 않는 값은 `null`로 처리한다.

## 자막 추출 방식

서버 라우트는 `app/api/transcript/route.ts`에 있고, 실제 자막 획득 로직은 `lib/transcript/` 아래에 분리되어 있다.

구조:

- `app/api/transcript/route.ts`: video id 검증, `getTranscript()` 호출, HTTP 응답 상태 결정
- `lib/transcript/service.ts`: provider 순서 제어와 fallback 처리
- `lib/transcript/providers/`: `youtube-transcript`, YouTube caption metadata, `youtubetranscript.com` 소스별 호출
- `lib/transcript/parsers/`: caption track JSON, classic timedtext XML, `srv3` XML, fallback HTML 파싱

우선순위:

1. `youtube-transcript` 패키지로 영어 자막을 요청한다.
2. 영어 자막이 없으면 같은 패키지로 사용 가능한 첫 자막을 요청한다.
3. 실패하면 YouTube watch page에서 caption metadata를 직접 찾아 caption XML을 파싱한다.
4. 그래도 실패하면 `youtubetranscript.com` HTML 파싱을 서버에서 보조 경로로 시도한다.

반환 형식:

```ts
type Segment = {
  start: number;
  dur: number;
  text: string;
};
```

`youtube-transcript`는 `offset`과 `duration`을 millisecond 단위로 반환하므로, 서버에서 second 단위의 `start`와 `dur`로 변환한다.

## CORS 에러 해결 원리

이전 정적 HTML 버전은 브라우저에서 `corsproxy.io` 같은 공개 CORS 프록시를 직접 호출했다. 이 방식은 다음 문제가 있었다.

- `file://`로 실행하면 브라우저가 문서를 고유 보안 origin으로 취급한다.
- 브라우저에서 외부 transcript 사이트를 직접 호출하면 CORS 정책에 막힐 수 있다.
- `corsproxy.io` 무료 사용은 localhost와 개발 환경 중심으로 제한되어 403을 반환할 수 있다.

현재 구조에서는 클라이언트가 외부 transcript 사이트나 CORS 프록시를 직접 호출하지 않는다. 클라이언트는 같은 origin의 `/api/transcript`만 호출하고, 외부 요청은 Next.js 서버 라우트에서 처리한다. 서버 간 요청에는 브라우저 CORS 제한이 적용되지 않으므로 공개 CORS 프록시가 필요 없다.

## 한계

- 영상에 공개 자막이 없으면 자동 추출은 실패한다.
- YouTube가 특정 서버 요청을 제한하면 자동 추출이 실패할 수 있다.
- Shorts도 video id 기반으로 동일하게 처리되지만, Shorts 영상 자체에 자막이 없으면 가져올 수 없다.
- 안정적인 상용 운영에는 공식 YouTube Data API 또는 신뢰 가능한 유료 transcript API 검토가 필요하다.

## 검증 방법

URL 파서 테스트:

```bash
npm test
```

Next.js 빌드:

```bash
npm run build
```

서버 API 직접 확인:

```bash
curl "http://localhost:3000/api/transcript?videoId=arj7oStGLkU"
```

브라우저 확인:

1. `npm run dev` 실행
2. `http://localhost:3000` 접속
3. `https://www.youtube.com/shorts/arj7oStGLkU?si=test` 입력
4. `자막 추출` 클릭
5. `So in college,` 세그먼트가 표시되는지 확인

## 2026-06-04 Shorts 재검증 결과

확인한 Shorts 형식 URL:

```text
https://www.youtube.com/shorts/arj7oStGLkU?si=test
```

URL 파서 결과:

```text
arj7oStGLkU
```

API 확인 결과:

```json
{
  "source": "youtube-transcript-package",
  "count": 315,
  "first": "So in college,"
}
```

추가로 이전 에러 화면에 있던 video id도 확인했다.

```text
https://www.youtube.com/shorts/DfPWbttemYE
```

이 영상은 자막이 비활성화되어 있으며 API는 다음 응답을 반환한다.

```json
{
  "error": "No public transcript found."
}
```

따라서 Shorts URL 파싱과 자막 추출 경로는 작동한다. 단, 해당 Shorts 영상에 공개 자막이 없거나 자막이 비활성화되어 있으면 자동 추출할 수 없다.
