import type { TranscriptProvider, TranscriptSegment } from "../types";
import { normalizeWhitespace } from "../text";

type ExternalTranscriptResponse =
  | TranscriptSegment[]
  | {
      segments?: TranscriptSegment[];
      error?: string;
    };

export const externalTranscriptApiProvider: TranscriptProvider = {
  source: "external-transcript-api",
  fetchTranscript: fetchFromExternalTranscriptApi,
};

export function hasExternalTranscriptApi() {
  return Boolean(process.env.TRANSCRIPT_API_URL);
}

async function fetchFromExternalTranscriptApi(videoId: string) {
  const endpoint = process.env.TRANSCRIPT_API_URL;
  if (!endpoint) return [];

  const url = new URL(endpoint);
  url.searchParams.set("videoId", videoId);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(process.env.TRANSCRIPT_API_KEY
        ? { Authorization: `Bearer ${process.env.TRANSCRIPT_API_KEY}` }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`External transcript API returned ${response.status}.`);
  }

  const data = (await response.json()) as ExternalTranscriptResponse;
  if (!Array.isArray(data) && data.error) {
    throw new Error(`External transcript API error: ${data.error}`);
  }

  const segments = Array.isArray(data) ? data : data.segments || [];
  return normalizeSegments(segments);
}

function normalizeSegments(segments: TranscriptSegment[]) {
  return segments
    .map((segment) => ({
      start: Number(segment.start),
      dur: Number(segment.dur),
      text: normalizeWhitespace(segment.text || ""),
    }))
    .filter(
      (segment) =>
        Number.isFinite(segment.start) &&
        Number.isFinite(segment.dur) &&
        segment.text.length > 0,
    );
}
