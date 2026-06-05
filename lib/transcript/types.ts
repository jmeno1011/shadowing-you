export type TranscriptSegment = {
  start: number;
  dur: number;
  text: string;
};

export type TranscriptSource =
  | "external-transcript-api"
  | "youtube-transcript-package"
  | "youtube-captions"
  | "youtubetranscript";

export type TranscriptResult = {
  segments: TranscriptSegment[];
  source: TranscriptSource;
};

export type TranscriptAttempt = {
  source: TranscriptSource;
  status: "success" | "empty" | "error";
  message?: string;
  count?: number;
};

export type TranscriptReport = {
  result: TranscriptResult | null;
  attempts: TranscriptAttempt[];
};

export type TranscriptProvider = {
  source: TranscriptSource;
  fetchTranscript: (videoId: string) => Promise<TranscriptSegment[]>;
};
