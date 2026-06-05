import assert from "node:assert/strict";
import test from "node:test";
import { extractCaptionTracks, chooseCaptionTrack } from "../lib/transcript/parsers/caption-tracks";
import { parseCaptionXml } from "../lib/transcript/parsers/caption-xml";
import { parseTranscriptSiteHtml } from "../lib/transcript/parsers/transcript-site";

test("parses classic YouTube timedtext XML captions", () => {
  const result = parseCaptionXml(`
    <transcript>
      <text start="1.2" dur="2.5">Hello &amp; welcome</text>
      <text start="3.7" dur="1">to shadowing.</text>
    </transcript>
  `);

  assert.deepEqual(result, [
    { start: 1.2, dur: 2.5, text: "Hello & welcome" },
    { start: 3.7, dur: 1, text: "to shadowing." },
  ]);
});

test("parses YouTube srv3 XML captions", () => {
  const result = parseCaptionXml(`
    <timedtext>
      <body>
        <p t="1200" d="2500"><s>Hello </s><s>from Shorts.</s></p>
        <p t="3700" d="1000">Practice &amp; repeat.</p>
      </body>
    </timedtext>
  `);

  assert.deepEqual(result, [
    { start: 1.2, dur: 2.5, text: "Hello from Shorts." },
    { start: 3.7, dur: 1, text: "Practice & repeat." },
  ]);
});

test("extracts and chooses preferred caption tracks from a watch page", () => {
  const html = `ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":[
    {"baseUrl":"https://example.com/ko","languageCode":"ko","kind":"asr"},
    {"baseUrl":"https://example.com/en-manual","languageCode":"en"},
    {"baseUrl":"https://example.com/en-auto","languageCode":"en","kind":"asr"}
  ]}}}};`;

  const tracks = extractCaptionTracks(html);
  assert.equal(tracks.length, 3);
  assert.equal(chooseCaptionTrack(tracks)?.baseUrl, "https://example.com/en-manual");
});

test("parses youtubetranscript.com fallback markup", () => {
  const result = parseTranscriptSiteHtml(`
    <span data-start="4.5" data-dur="1.5">First line</span>
    <span data-start="6" data-dur="2">Second &amp; line</span>
  `);

  assert.deepEqual(result, [
    { start: 4.5, dur: 1.5, text: "First line" },
    { start: 6, dur: 2, text: "Second & line" },
  ]);
});
