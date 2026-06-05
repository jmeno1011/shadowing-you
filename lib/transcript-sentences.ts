export type TranscriptSegment = {
  start: number;
  dur: number;
  text: string;
};

const SENTENCE_END_PATTERN = /(?:[.!?]|[.!?]["')\]])$/;
const STAGE_DIRECTION_PATTERN = /^\([^)]*\)$/;

export function groupSegmentsIntoSentences(segments: TranscriptSegment[]): TranscriptSegment[] {
  const grouped: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;

  for (const segment of segments) {
    const text = segment.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    if (STAGE_DIRECTION_PATTERN.test(text)) {
      flushCurrent();
      grouped.push({ ...segment, text });
      continue;
    }

    if (!current) {
      current = { ...segment, text };
    } else {
      const end = Math.max(current.start + current.dur, segment.start + segment.dur);
      current = {
        start: current.start,
        dur: end - current.start,
        text: `${current.text} ${text}`,
      };
    }

    if (isSentenceEnd(text)) {
      flushCurrent();
    }
  }

  flushCurrent();
  return grouped;

  function flushCurrent() {
    if (!current) return;
    grouped.push({
      start: current.start,
      dur: current.dur,
      text: current.text.trim(),
    });
    current = null;
  }
}

function isSentenceEnd(text: string) {
  return SENTENCE_END_PATTERN.test(text.trim());
}
