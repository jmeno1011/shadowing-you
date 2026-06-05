const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeVideoId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("youtube.com/") || trimmed.startsWith("www.youtube.com/")
    ? `https://${trimmed}`
    : trimmed;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return readVideoId(url.pathname.slice(1).split("/")[0]);
  }

  if (host !== "youtube.com" && host !== "m.youtube.com") {
    return null;
  }

  if (url.pathname === "/watch") {
    return readVideoId(url.searchParams.get("v"));
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
    return readVideoId(pathParts[1]);
  }

  return null;
}

function readVideoId(value: string | null | undefined) {
  return value && VIDEO_ID_PATTERN.test(value) ? value : null;
}
