export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function readAttribute(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`));
  return match ? match[1] : null;
}

export function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

export function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function decodeCaptionText(value: string) {
  return normalizeWhitespace(decodeEntities(stripTags(value)));
}
