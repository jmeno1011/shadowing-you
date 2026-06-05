import { fetchText } from "../http";
import { chooseCaptionTrack, extractCaptionTracks } from "../parsers/caption-tracks";
import { parseCaptionXml } from "../parsers/caption-xml";
import type { TranscriptProvider } from "../types";

export const youtubeCaptionsProvider: TranscriptProvider = {
  source: "youtube-captions",
  fetchTranscript: fetchFromYoutubeCaptions,
};

async function fetchFromYoutubeCaptions(videoId: string) {
  const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`);
  const track = chooseCaptionTrack(extractCaptionTracks(html));

  if (!track) {
    return [];
  }

  const transcriptUrl = track.baseUrl.includes("fmt=") ? track.baseUrl : `${track.baseUrl}&fmt=srv3`;
  return parseCaptionXml(await fetchText(transcriptUrl));
}
