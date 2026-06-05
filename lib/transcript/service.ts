import { transcriptSiteProvider } from "./providers/transcript-site";
import { youtubeCaptionsProvider } from "./providers/youtube-captions";
import { youtubeTranscriptPackageProvider } from "./providers/youtube-transcript-package";
import type { TranscriptProvider, TranscriptResult } from "./types";

const providers: TranscriptProvider[] = [
  youtubeTranscriptPackageProvider,
  youtubeCaptionsProvider,
  transcriptSiteProvider,
];

export async function getTranscript(videoId: string): Promise<TranscriptResult | null> {
  for (const provider of providers) {
    try {
      const segments = await provider.fetchTranscript(videoId);
      if (segments.length > 0) {
        return {
          segments,
          source: provider.source,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}
