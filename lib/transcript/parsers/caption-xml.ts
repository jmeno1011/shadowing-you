import type { TranscriptSegment } from "../types";
import { decodeCaptionText, readAttribute } from "../text";

export function parseCaptionXml(xml: string): TranscriptSegment[] {
  const timedText = parseTimedTextXml(xml);
  if (timedText.length > 0) {
    return timedText;
  }

  return parseSrv3Xml(xml);
}

function parseTimedTextXml(xml: string) {
  const segments: TranscriptSegment[] = [];
  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = textPattern.exec(xml))) {
    const attrs = match[1];
    const start = Number.parseFloat(readAttribute(attrs, "start") || "0");
    const dur = Number.parseFloat(readAttribute(attrs, "dur") || "3");
    const text = decodeCaptionText(match[2]);
    if (text) segments.push({ start, dur, text });
  }

  return segments;
}

function parseSrv3Xml(xml: string) {
  const segments: TranscriptSegment[] = [];
  const paragraphPattern = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;

  while ((match = paragraphPattern.exec(xml))) {
    const attrs = match[1];
    const startMs = Number.parseFloat(readAttribute(attrs, "t") || "0");
    const durationMs = Number.parseFloat(readAttribute(attrs, "d") || "3000");
    const text = decodeCaptionText(match[2]);

    if (text) {
      segments.push({
        start: startMs / 1000,
        dur: durationMs / 1000,
        text,
      });
    }
  }

  return segments;
}
