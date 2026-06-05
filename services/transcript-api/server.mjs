import { createServer } from "node:http";
import { YoutubeTranscript } from "youtube-transcript";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const PORT = Number(process.env.PORT || 4100);
const API_KEY = process.env.TRANSCRIPT_API_KEY || "";

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");

    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    if (url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (url.pathname !== "/transcript") {
      sendJson(response, 404, { error: "Not found." });
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    if (API_KEY && request.headers.authorization !== `Bearer ${API_KEY}`) {
      sendJson(response, 401, { error: "Unauthorized." });
      return;
    }

    const videoId = url.searchParams.get("videoId");
    if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
      sendJson(response, 400, { error: "Invalid YouTube video id." });
      return;
    }

    const segments = await fetchTranscript(videoId);
    if (segments.length === 0) {
      sendJson(response, 404, { error: "No public transcript found." });
      return;
    }

    sendJson(response, 200, {
      segments,
      source: "render-transcript-api",
    });
  } catch (error) {
    sendJson(response, 502, {
      error: error instanceof Error ? error.message : "Transcript fetch failed.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Transcript API listening on port ${PORT}`);
});

async function fetchTranscript(videoId) {
  let englishError;

  try {
    return normalizeTranscript(await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }));
  } catch (error) {
    englishError = error;
  }

  try {
    return normalizeTranscript(await YoutubeTranscript.fetchTranscript(videoId));
  } catch (fallbackError) {
    throw new Error(
      `Transcript fetch failed. english=${readErrorMessage(englishError)} fallback=${readErrorMessage(fallbackError)}`,
    );
  }
}

function normalizeTranscript(items) {
  return items
    .map((item) => ({
      start: Number(item.offset) / 1000,
      dur: Number(item.duration) / 1000,
      text: normalizeWhitespace(item.text || ""),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.start) &&
        Number.isFinite(item.dur) &&
        item.text.length > 0,
    );
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });

  if (statusCode === 204) {
    response.end();
    return;
  }

  response.end(JSON.stringify(payload));
}
