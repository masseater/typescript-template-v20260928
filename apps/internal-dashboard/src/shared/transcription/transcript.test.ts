import { Effect, Exit, Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { TranscriptionOutput, transcriptOf } from "./transcript.ts";

describe("transcriptOf", () => {
  describe("consecutive words of one speaker followed by another speaker", () => {
    const it = test.extend("theDialogue", () =>
      transcriptOf({
        results: {
          channels: [
            {
              alternatives: [
                {
                  words: [
                    { end: 0.4, punctuated_word: "今日は", speaker: 0, start: 0, word: "今日は" },
                    {
                      end: 0.9,
                      punctuated_word: "よろしく。",
                      speaker: 0,
                      start: 0.5,
                      word: "よろしく",
                    },
                    { end: 1.6, punctuated_word: "はい。", speaker: 1, start: 1.2, word: "はい" },
                  ],
                },
              ],
            },
          ],
        },
      }));

    it("joins each speaker's words into one segment", ({ theDialogue }) => {
      expect(theDialogue).toStrictEqual({
        durationMs: 1600,
        segments: [
          { endMs: 900, speakerLabel: 0, startMs: 0, text: "今日はよろしく。" },
          { endMs: 1600, speakerLabel: 1, startMs: 1200, text: "はい。" },
        ],
      });
    });
  });

  describe("a long pause by the same speaker", () => {
    const it = test.extend("thePausedMonologue", () =>
      transcriptOf({
        results: {
          channels: [
            {
              alternatives: [
                {
                  words: [
                    { end: 1, punctuated_word: "まず", speaker: 0, start: 0, word: "まず" },
                    { end: 4, punctuated_word: "次に", speaker: 0, start: 3.5, word: "次に" },
                  ],
                },
              ],
            },
          ],
        },
      }));

    it("starts a new segment", ({ thePausedMonologue }) => {
      expect(thePausedMonologue).toStrictEqual({
        durationMs: 4000,
        segments: [
          { endMs: 1000, speakerLabel: 0, startMs: 0, text: "まず" },
          { endMs: 4000, speakerLabel: 0, startMs: 3500, text: "次に" },
        ],
      });
    });
  });

  describe("latin words next to japanese words", () => {
    const it = test.extend("theMixedSentence", () =>
      transcriptOf({
        results: {
          channels: [
            {
              alternatives: [
                {
                  words: [
                    {
                      end: 0.3,
                      punctuated_word: "Cloudflare",
                      speaker: 0,
                      start: 0,
                      word: "Cloudflare",
                    },
                    {
                      end: 0.6,
                      punctuated_word: "Workers",
                      speaker: 0,
                      start: 0.3,
                      word: "Workers",
                    },
                    { end: 0.9, punctuated_word: "で", speaker: 0, start: 0.6, word: "で" },
                    { end: 1.2, punctuated_word: "動く", speaker: 0, start: 0.9, word: "動く" },
                  ],
                },
              ],
            },
          ],
        },
      }));

    it("keeps a space only between latin words", ({ theMixedSentence }) => {
      expect(theMixedSentence).toStrictEqual({
        durationMs: 1200,
        segments: [{ endMs: 1200, speakerLabel: 0, startMs: 0, text: "Cloudflare Workersで動く" }],
      });
    });
  });

  describe("an alternative without words", () => {
    const it = test.extend("theSilence", () =>
      transcriptOf({ results: { channels: [{ alternatives: [{ words: [] }] }] } }));

    it("is an empty transcript", ({ theSilence }) => {
      expect(theSilence).toStrictEqual({ durationMs: 0, segments: [] });
    });
  });
});

describe("TranscriptionOutput", () => {
  describe("an output without channels", () => {
    const it = test.extend("theChannellessOutput", () =>
      Effect.runSyncExit(
        Schema.decodeUnknownEffect(TranscriptionOutput)({ results: { channels: [] } }).pipe(
          Effect.mapError((failure) => failure._tag),
        ),
      ));

    it("does not decode", ({ theChannellessOutput }) => {
      expect(theChannellessOutput).toStrictEqual(Exit.fail("SchemaError"));
    });
  });

  describe("a channel without alternatives", () => {
    const it = test.extend("theAlternativelessOutput", () =>
      Effect.runSyncExit(
        Schema.decodeUnknownEffect(TranscriptionOutput)({
          results: { channels: [{ alternatives: [] }] },
        }).pipe(Effect.mapError((failure) => failure._tag)),
      ));

    it("does not decode", ({ theAlternativelessOutput }) => {
      expect(theAlternativelessOutput).toStrictEqual(Exit.fail("SchemaError"));
    });
  });
});
