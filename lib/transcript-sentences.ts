export type TranscriptSegment = {
  start: number;
  dur: number;
  text: string;
};

const SENTENCE_END_PATTERN = /(?:[.!?]|[.!?]["')\]])$/;
const STAGE_DIRECTION_PATTERN = /^\([^)]*\)$/;
const INLINE_STAGE_DIRECTION_PATTERN = /\s*\((?:laughter|laughs|laughing|applause|music|cheering|audience laughter|audience applauds|inaudible|silence)\)\s*/gi;
const INTERNAL_SENTENCE_PATTERN = /[^.!?]+(?:[.!?]+["')\]]*|$)/g;

export function groupSegmentsIntoSentences(segments: TranscriptSegment[]): TranscriptSegment[] {
  const grouped: TranscriptSegment[] = [];
  let current: TranscriptSegment | null = null;

  for (const segment of expandMultiSentenceSegments(segments)) {
    const text = normalizeSpokenText(segment.text);
    if (!text) continue;

    if (STAGE_DIRECTION_PATTERN.test(text)) {
      flushCurrent();
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

function expandMultiSentenceSegments(segments: TranscriptSegment[]) {
  const expanded: TranscriptSegment[] = [];

  for (const segment of segments) {
    const parts = splitIntoSentenceParts(segment.text);

    if (parts.length <= 1) {
      expanded.push(segment);
      continue;
    }

    const dur = segment.dur / parts.length;
    parts.forEach((text, index) => {
      expanded.push({
        start: segment.start + dur * index,
        dur,
        text,
      });
    });
  }

  return expanded;
}

function splitIntoSentenceParts(text: string) {
  const normalized = normalizeSpokenText(text);
  if (!normalized) return [];

  const parts = normalized.match(INTERNAL_SENTENCE_PATTERN)?.map((part) => part.trim()).filter(Boolean) || [];
  return parts.length > 0 ? parts : [normalized];
}

function normalizeSpokenText(text: string) {
  return text.replace(INLINE_STAGE_DIRECTION_PATTERN, " ").replace(/\s+/g, " ").trim();
}
