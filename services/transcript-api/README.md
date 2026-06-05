# Shadowing You Transcript API

Small Node service for Render. It extracts YouTube transcripts outside Vercel and returns the response shape expected by the main app.

## Endpoints

```text
GET /health
GET /transcript?videoId=_5siHrpPnmw
```

Response:

```json
{
  "segments": [
    { "start": 0, "dur": 3.2, "text": "Hello." }
  ],
  "source": "render-transcript-api"
}
```

## Optional Auth

Set `TRANSCRIPT_API_KEY` in Render. If this variable exists, requests must include:

```text
Authorization: Bearer YOUR_SECRET
```

## Local Run

```bash
cd services/transcript-api
npm install
TRANSCRIPT_API_KEY=local-secret npm start
```

Test:

```bash
curl "http://localhost:4100/health"
curl "http://localhost:4100/transcript?videoId=_5siHrpPnmw" \
  -H "Authorization: Bearer local-secret"
```

## Render Setup

1. Create a Render account: https://render.com
2. Create `New` -> `Web Service`.
3. Connect this GitHub repository.
4. Configure the service:

```text
Name=shadowing-transcript-api
Runtime=Node
Root Directory=services/transcript-api
Build Command=npm install
Start Command=npm start
Instance Type=Free
```

5. Add Render environment variable:

```text
TRANSCRIPT_API_KEY=your-secret-token
```

6. Deploy the service.

7. Render gives a public URL such as:

```text
https://shadowing-transcript-api.onrender.com
```

8. Configure Vercel environment variables in the main app:

```text
TRANSCRIPT_API_URL=https://shadowing-transcript-api.onrender.com/transcript
TRANSCRIPT_API_KEY=your-secret-token
```

9. Redeploy the Vercel app.

10. Verify:

```bash
curl "https://YOUR_VERCEL_DOMAIN/api/transcript?videoId=_5siHrpPnmw&debug=1"
```

The first attempt should be:

```json
{
  "source": "external-transcript-api",
  "status": "success"
}
```

## Render Free Tier Note

Render free web services can spin down after inactivity. The first request after a cold start may be slow. Transcript requests after the service wakes up should be faster.
