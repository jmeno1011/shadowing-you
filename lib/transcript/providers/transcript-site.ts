import { fetchText } from "../http";
import { parseTranscriptSiteHtml } from "../parsers/transcript-site";
import type { TranscriptProvider } from "../types";

export const transcriptSiteProvider: TranscriptProvider = {
  source: "youtubetranscript",
  fetchTranscript: fetchFromTranscriptSite,
};

async function fetchFromTranscriptSite(videoId: string) {
  return parseTranscriptSiteHtml(await fetchText(`https://youtubetranscript.com/?server_vid2=${videoId}`));
}
