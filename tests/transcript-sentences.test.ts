import assert from "node:assert/strict";
import test from "node:test";
import { groupSegmentsIntoSentences } from "../lib/transcript-sentences";

test("groups caption fragments into complete sentences", () => {
  const result = groupSegmentsIntoSentences([
    { start: 0, dur: 1, text: "So in college," },
    { start: 1, dur: 1.5, text: "I was a government major," },
    { start: 2.5, dur: 2, text: "which means I had to write a lot of papers." },
    { start: 5, dur: 1, text: "Now, when a normal student writes a paper," },
    { start: 6, dur: 2, text: "they might spread the work out." },
  ]);

  assert.deepEqual(result, [
    {
      start: 0,
      dur: 4.5,
      text: "So in college, I was a government major, which means I had to write a lot of papers.",
    },
    {
      start: 5,
      dur: 3,
      text: "Now, when a normal student writes a paper, they might spread the work out.",
    },
  ]);
});

test("keeps trailing text as a final sentence when punctuation is missing", () => {
  const result = groupSegmentsIntoSentences([
    { start: 10, dur: 1, text: "This is unfinished" },
    { start: 11, dur: 1, text: "but still useful" },
  ]);

  assert.deepEqual(result, [
    {
      start: 10,
      dur: 2,
      text: "This is unfinished but still useful",
    },
  ]);
});

test("does not merge standalone stage directions with spoken sentences", () => {
  const result = groupSegmentsIntoSentences([
    { start: 20, dur: 1, text: "(Laughter)" },
    { start: 21, dur: 1, text: "Let me explain why." },
  ]);

  assert.deepEqual(result, [
    { start: 20, dur: 1, text: "(Laughter)" },
    { start: 21, dur: 1, text: "Let me explain why." },
  ]);
});
