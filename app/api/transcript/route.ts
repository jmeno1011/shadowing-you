import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

type Segment = {
  start: number;
  dur: number;
  text: string;
};

type CaptionTrack = {
  baseUrl: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text: string }>;
  };
  languageCode?: string;
  kind?: string;
};

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get("videoId");

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid YouTube video id." }, { status: 400 });
  }

  try {
    const fromPackage = await fetchFromYoutubeTranscriptPackage(videoId);
    if (fromPackage.length > 0) {
      return NextResponse.json({ segments: fromPackage, source: "youtube-transcript-package" });
    }

    const fromYoutube = await fetchFromYoutubeCaptions(videoId);
    if (fromYoutube.length > 0) {
      return NextResponse.json({ segments: fromYoutube, source: "youtube-captions" });
    }

    const fromTranscriptSite = await fetchFromTranscriptSite(videoId);
    if (fromTranscriptSite.length > 0) {
      return NextResponse.json({ segments: fromTranscriptSite, source: "youtubetranscript" });
    }

    return NextResponse.json({ error: "No public transcript found." }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcript fetch failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function fetchFromYoutubeTranscriptPackage(videoId: string) {
  try {
    return normalizePackageTranscript(await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }));
  } catch {
    try {
      return normalizePackageTranscript(await YoutubeTranscript.fetchTranscript(videoId));
    } catch {
      return [];
    }
  }
}

function normalizePackageTranscript(
  items: Array<{ text: string; duration: number; offset: number }>,
): Segment[] {
  return items
    .map((item) => ({
      start: item.offset / 1000,
      dur: item.duration / 1000,
      text: item.text.replace(/\s+/g, " ").trim(),
    }))
    .filter((item) => item.text.length > 0);
}

async function fetchFromYoutubeCaptions(videoId: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(watchUrl, {
    headers: {
      "accept-language": "en-US,en;q=0.9,ko;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`YouTube watch page returned ${response.status}.`);
  }

  const html = await response.text();
  const tracks = extractCaptionTracks(html);
  const track = chooseCaptionTrack(tracks);

  if (!track) {
    return [];
  }

  const transcriptUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}&fmt=srv3`;
  const transcriptResponse = await fetch(transcriptUrl, {
    headers: {
      "accept-language": "en-US,en;q=0.9,ko;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    },
    next: { revalidate: 3600 },
  });

  if (!transcriptResponse.ok) {
    throw new Error(`YouTube transcript returned ${transcriptResponse.status}.`);
  }

  return parseCaptionXml(await transcriptResponse.text());
}

function extractCaptionTracks(html: string): CaptionTrack[] {
  const key = '"captionTracks":';
  const start = html.indexOf(key);
  if (start === -1) return [];

  const arrayStart = html.indexOf("[", start + key.length);
  if (arrayStart === -1) return [];

  const arrayText = readJsonArray(html, arrayStart);
  if (!arrayText) return [];

  try {
    const parsed = JSON.parse(arrayText) as unknown;
    return Array.isArray(parsed) ? (parsed as CaptionTrack[]) : [];
  } catch {
    return [];
  }
}

function readJsonArray(input: string, start: number) {
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

function chooseCaptionTrack(tracks: CaptionTrack[]) {
  return (
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en") && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0]
  );
}

function parseCaptionXml(xml: string): Segment[] {
  const segments: Segment[] = [];
  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml))) {
    const attrs = match[1];
    const start = Number.parseFloat(readAttribute(attrs, "start") || "0");
    const dur = Number.parseFloat(readAttribute(attrs, "dur") || "3");
    const text = decodeEntities(stripTags(match[2])).replace(/\s+/g, " ").trim();
    if (text) segments.push({ start, dur, text });
  }

  return segments;
}

async function fetchFromTranscriptSite(videoId: string) {
  const url = `https://youtubetranscript.com/?server_vid2=${videoId}`;
  const response = await fetch(url, {
    headers: {
      "accept-language": "en-US,en;q=0.9,ko;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const segments: Segment[] = [];
  const itemPattern = /<[^>]+\bdata-start=["']([^"']+)["'][^>]*\bdata-dur=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[^>]+>/g;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(html))) {
    const start = Number.parseFloat(match[1]);
    const dur = Number.parseFloat(match[2]);
    const text = decodeEntities(stripTags(match[3])).replace(/\s+/g, " ").trim();
    if (text) segments.push({ start, dur, text });
  }

  return segments;
}

function readAttribute(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`));
  return match ? match[1] : null;
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
