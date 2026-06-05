import { YoutubeTranscript } from "youtube-transcript";
import type { TranscriptProvider, TranscriptSegment } from "../types";
import { normalizeWhitespace } from "../text";

export const youtubeTranscriptPackageProvider: TranscriptProvider = {
  source: "youtube-transcript-package",
  fetchTranscript: fetchFromYoutubeTranscriptPackage,
};

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
): TranscriptSegment[] {
  return items
    .map((item) => ({
      start: item.offset / 1000,
      dur: item.duration / 1000,
      text: normalizeWhitespace(item.text),
    }))
    .filter((item) => item.text.length > 0);
}
