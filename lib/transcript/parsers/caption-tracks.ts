export type CaptionTrack = {
  baseUrl: string;
  name?: {
    simpleText?: string;
    runs?: Array<{ text: string }>;
  };
  languageCode?: string;
  kind?: string;
};

export function extractCaptionTracks(html: string): CaptionTrack[] {
  const key = '"captionTracks":';
  const start = html.indexOf(key);
  if (start === -1) return [];

  const arrayStart = html.indexOf("[", start + key.length);
  if (arrayStart === -1) return [];

  const arrayText = readJsonArray(html, arrayStart);
  if (!arrayText) return [];

  try {
    const parsed = JSON.parse(arrayText) as unknown;
    return Array.isArray(parsed) ? (parsed as CaptionTrack[]) : [];
  } catch {
    return [];
  }
}

export function chooseCaptionTrack(tracks: CaptionTrack[]) {
  return (
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en") && track.kind !== "asr") ||
    tracks.find((track) => track.languageCode?.toLowerCase().startsWith("en")) ||
    tracks.find((track) => track.kind !== "asr") ||
    tracks[0]
  );
}

function readJsonArray(input: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }
  }

  return null;
}
