import { createServer } from "node:http";
import { YoutubeTranscript } from "youtube-transcript";

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;
const PORT = Number(process.env.PORT || 4100);
const API_KEY = process.env.TRANSCRIPT_API_KEY || "";
const REQUEST_HEADERS = {
  "accept-language": "en-US,en;q=0.9,ko;q=0.8",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
};

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

    const report = await fetchTranscriptReport(videoId);
    if (!report.result) {
      sendJson(response, 502, {
        error: "Transcript fetch failed from this server environment.",
        attempts: report.attempts,
      });
      return;
    }

    sendJson(response, 200, {
      ...report.result,
      ...(url.searchParams.get("debug") === "1" ? { attempts: report.attempts } : {}),
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

async function fetchTranscriptReport(videoId) {
  const attempts = [];
  const providers = [
    ["youtube-transcript-package", fetchFromYoutubeTranscriptPackage],
    ["youtube-captions", fetchFromYoutubeCaptions],
    ["youtubetranscript", fetchFromTranscriptSite],
  ];

  for (const [source, fetcher] of providers) {
    try {
      const segments = await fetcher(videoId);
      if (segments.length > 0) {
        attempts.push({ source, status: "success", count: segments.length });
        return {
          result: {
            segments,
            source: "render-transcript-api",
          },
          attempts,
        };
      }

      attempts.push({
        source,
        status: "empty",
        message: "Provider returned no transcript segments.",
      });
    } catch (error) {
      attempts.push({
        source,
        status: "error",
        message: readErrorMessage(error),
      });
    }
  }

  return { result: null, attempts };
}

async function fetchFromYoutubeTranscriptPackage(videoId) {
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

async function fetchFromYoutubeCaptions(videoId) {
  const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
  const track = chooseCaptionTrack(extractCaptionTracks(html));

  if (!track) {
    return [];
  }

  const transcriptUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}&fmt=srv3`;
  return parseCaptionXml(await fetchText(transcriptUrl));
}

async function fetchFromTranscriptSite(videoId) {
  return parseTranscriptSiteHtml(await fetchText(`https://youtubetranscript.com/?server_vid2=${videoId}`));
}

async function fetchText(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: REQUEST_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`${new URL(url).hostname} returned ${response.status}.`);
  }

  return response.text();
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

function extractCaptionTracks(html) {
  const key = '"captionTracks":';
  const start = html.indexOf(key);
  if (start === -1) return [];

  const arrayStart = html.indexOf("[", start + key.length);
  if (arrayStart === -1) return [];

  const arrayText = readJsonArray(html, arrayStart);
  if (!arrayText) return [];

  try {
    const parsed = JSON.parse(arrayText);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function chooseCaptionTrack(tracks) {
  return (
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en") && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0]
  );
}

function readJsonArray(input, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }
  }

  return null;
}

function parseCaptionXml(xml) {
  const timedText = parseTimedTextXml(xml);
  return timedText.length > 0 ? timedText : parseSrv3Xml(xml);
}

function parseTimedTextXml(xml) {
  const segments = [];
  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match;

  while ((match = textPattern.exec(xml))) {
    const attrs = match[1];
    const start = Number.parseFloat(readAttribute(attrs, "start") || "0");
    const dur = Number.parseFloat(readAttribute(attrs, "dur") || "3");
    const text = decodeCaptionText(match[2]);
    if (text) segments.push({ start, dur, text });
  }

  return segments;
}

function parseSrv3Xml(xml) {
  const segments = [];
  const paragraphPattern = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let match;

  while ((match = paragraphPattern.exec(xml))) {
    const attrs = match[1];
    const startMs = Number.parseFloat(readAttribute(attrs, "t") || "0");
    const durationMs = Number.parseFloat(readAttribute(attrs, "d") || "3000");
    const text = decodeCaptionText(match[2]);

    if (text) {
      segments.push({
        start: startMs / 1000,
        dur: durationMs / 1000,
        text,
      });
    }
  }

  return segments;
}

function parseTranscriptSiteHtml(html) {
  const segments = [];
  const itemPattern = /<[^>]+\bdata-start=["']([^"']+)["'][^>]*\bdata-dur=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[^>]+>/g;
  let match;

  while ((match = itemPattern.exec(html))) {
    const start = Number.parseFloat(match[1]);
    const dur = Number.parseFloat(match[2]);
    const text = decodeCaptionText(match[3]);
    if (text) segments.push({ start, dur, text });
  }

  return segments;
}

function readAttribute(attrs, name) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`));
  return match ? match[1] : null;
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

function decodeCaptionText(value) {
  return normalizeWhitespace(decodeEntities(stripTags(value)));
}

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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
