export const TRANSCRIPT_REQUEST_HEADERS = {
  "accept-language": "en-US,en;q=0.9,ko;q=0.8",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
};

export async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: TRANSCRIPT_REQUEST_HEADERS,
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Request returned ${response.status}.`);
  }

  return response.text();
}
