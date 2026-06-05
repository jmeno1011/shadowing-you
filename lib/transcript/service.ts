import { transcriptSiteProvider } from "./providers/transcript-site";
import { youtubeCaptionsProvider } from "./providers/youtube-captions";
import { youtubeTranscriptPackageProvider } from "./providers/youtube-transcript-package";
import type { TranscriptAttempt, TranscriptProvider, TranscriptReport, TranscriptResult } from "./types";

const providers: TranscriptProvider[] = [
  youtubeTranscriptPackageProvider,
  youtubeCaptionsProvider,
  transcriptSiteProvider,
];

export async function getTranscript(videoId: string): Promise<TranscriptResult | null> {
  return (await getTranscriptReport(videoId)).result;
}

export async function getTranscriptReport(videoId: string): Promise<TranscriptReport> {
  const attempts: TranscriptAttempt[] = [];

  for (const provider of providers) {
    try {
      const segments = await provider.fetchTranscript(videoId);
      if (segments.length > 0) {
        const result = {
          segments,
          source: provider.source,
        };

        attempts.push({
          source: provider.source,
          status: "success",
          count: segments.length,
        });

        return { result, attempts };
      }

      attempts.push({
        source: provider.source,
        status: "empty",
        message: "Provider returned no transcript segments.",
      });
    } catch (error) {
      attempts.push({
        source: provider.source,
        status: "error",
        message: readErrorMessage(error),
      });
    }
  }

  return { result: null, attempts };
}

export function hasDeploymentFetchFailure(attempts: TranscriptAttempt[]) {
  return attempts.some(
    (attempt) =>
      attempt.status === "error" &&
      !/disabled|no transcripts|no transcript|private|no longer available/i.test(attempt.message || ""),
  );
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
