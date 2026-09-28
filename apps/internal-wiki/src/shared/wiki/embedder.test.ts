import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { embedWith } from "./embedder.ts";

import type { WorkerModel } from "./embedder.ts";

const textCount = 33;

function laterBatchFailingFirst(): WorkerModel {
  const laterBatch = Promise.withResolvers<undefined>();
  return {
    run: async (_model, input) => {
      if (input.text[0] !== "0") {
        laterBatch.resolve(undefined);
        throw new Error("later batch unavailable");
      }
      await laterBatch.promise;
      return { data: [] };
    },
  };
}

describe("embedWith", () => {
  it("reports the first batch's failure even when a later batch fails sooner", async () => {
    expect.hasAssertions();
    const texts = Array.from({ length: textCount }, (_unused, index) => String(index));
    const failure = await Effect.runPromise(
      Effect.flip(embedWith(laterBatchFailingFirst())(texts)),
    );
    expect(failure.reason).toBe("count_mismatch");
  });
});
