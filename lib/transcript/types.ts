export type TranscriptSegment = {
  start: number;
  dur: number;
  text: string;
};

export type TranscriptSource =
  | "youtube-transcript-package"
  | "youtube-captions"
  | "youtubetranscript";

export type TranscriptResult = {
  segments: TranscriptSegment[];
  source: TranscriptSource;
};

export type TranscriptProvider = {
  source: TranscriptSource;
  fetchTranscript: (videoId: string) => Promise<TranscriptSegment[]>;
};
