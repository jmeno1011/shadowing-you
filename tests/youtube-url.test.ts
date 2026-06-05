import assert from "node:assert/strict";
import test from "node:test";
import { extractYouTubeVideoId } from "../lib/youtube-url";

test("extracts video id from YouTube Shorts URLs", () => {
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/shorts/DfPWbttemYE"), "DfPWbttemYE");
  assert.equal(extractYouTubeVideoId("https://youtube.com/shorts/DfPWbttemYE?si=abc123"), "DfPWbttemYE");
  assert.equal(extractYouTubeVideoId("https://m.youtube.com/shorts/DfPWbttemYE"), "DfPWbttemYE");
});

test("extracts video id from regular YouTube URL formats", () => {
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/watch?v=arj7oStGLkU"), "arj7oStGLkU");
  assert.equal(extractYouTubeVideoId("https://youtu.be/arj7oStGLkU?feature=shared"), "arj7oStGLkU");
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/embed/arj7oStGLkU"), "arj7oStGLkU");
});

test("rejects non-YouTube or malformed URLs", () => {
  assert.equal(extractYouTubeVideoId("https://example.com/shorts/DfPWbttemYE"), null);
  assert.equal(extractYouTubeVideoId("https://www.youtube.com/shorts/not-enough"), null);
  assert.equal(extractYouTubeVideoId("not a url"), null);
});
