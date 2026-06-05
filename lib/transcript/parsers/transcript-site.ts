import type { TranscriptSegment } from "../types";
import { decodeCaptionText } from "../text";

export function parseTranscriptSiteHtml(html: string) {
  const segments: TranscriptSegment[] = [];
  const itemPattern = /<[^>]+\bdata-start=["']([^"']+)["'][^>]*\bdata-dur=["']([^"']+)["'][^>]*>([\s\S]*?)<\/[^>]+>/g;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(html))) {
    const start = Number.parseFloat(match[1]);
    const dur = Number.parseFloat(match[2]);
    const text = decodeCaptionText(match[3]);
    if (text) segments.push({ start, dur, text });
  }

  return segments;
}
