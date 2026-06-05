import { YoutubeTranscript } from "youtube-transcript";
import type { TranscriptProvider, TranscriptSegment } from "../types";
import { normalizeWhitespace } from "../text";

export const youtubeTranscriptPackageProvider: TranscriptProvider = {
  source: "youtube-transcript-package",
  fetchTranscript: fetchFromYoutubeTranscriptPackage,
};

async function fetchFromYoutubeTranscriptPackage(videoId: string) {
  let englishError: unknown;

  try {
    return normalizePackageTranscript(await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }));
  } catch (error) {
    englishError = error;

    try {
      return normalizePackageTranscript(await YoutubeTranscript.fetchTranscript(videoId));
    } catch (fallbackError) {
      throw new Error(
        `youtube-transcript failed. english=${readErrorMessage(englishError)} fallback=${readErrorMessage(fallbackError)}`,
      );
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

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
