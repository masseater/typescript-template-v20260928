import { workerCompatibility } from "@repo/config/worker";
import { Effect, Exit, Fiber, Scope } from "effect";
import { describe, expect, test, vi } from "vite-plus/test";
import { unstable_dev } from "wrangler";

import {
  ARRIVALS_PATH,
  BUILD_AFTER_ARRIVALS,
  coldStartFixturePath,
} from "./cold-start-test-fixture.ts";

describe("a worker whose runtime is still building its layer", () => {
  const it = test.extend("concurrentAnswers", ({}, { onCleanup }) =>
    Effect.runPromise(
      Effect.gen(function* concurrentAnswersProgram() {
        const worker = yield* Effect.promise(() =>
          unstable_dev(coldStartFixturePath(), {
            compatibilityDate: workerCompatibility.date,
            compatibilityFlags: [...workerCompatibility.flags],
            experimental: { disableExperimentalWarning: true },
            logLevel: "none",
          }),
        );
        onCleanup(() => worker.stop());
        return yield* Effect.forEach(
          ["first", "second", "third", "fourth"],
          () =>
            Effect.gen(function* answerProgram() {
              const answered = yield* Effect.promise(() =>
                worker.fetch(undefined, { headers: { [BUILD_AFTER_ARRIVALS]: "4" } }),
              );
              return `${String(answered.status)} ${yield* Effect.promise(() => answered.text())}`;
            }),
          { concurrency: "unbounded" },
        );
      }),
    ));

  it("answers every request that arrives before the build finishes", ({ concurrentAnswers }) => {
    expect(concurrentAnswers).toStrictEqual(["200 built", "200 built", "200 built", "200 built"]);
  });
});

describe("a worker whose first request was cut off while its layer was building", () => {
  const it = test.extend("retriedAnswer", ({}, { onCleanup }) =>
    Effect.runPromise(
      Effect.gen(function* retriedAnswerProgram() {
        const worker = yield* Effect.promise(() =>
          unstable_dev(coldStartFixturePath(), {
            compatibilityDate: workerCompatibility.date,
            compatibilityFlags: [...workerCompatibility.flags],
            experimental: { disableExperimentalWarning: true },
            logLevel: "none",
          }),
        );
        onCleanup(() => worker.stop());
        const cutOff = yield* Scope.make();
        const signal = yield* Scope.provide(Effect.abortSignal, cutOff);
        const abandoned = yield* Effect.tryPromise(() =>
          worker.fetch(undefined, { headers: { [BUILD_AFTER_ARRIVALS]: "2" }, signal }),
        ).pipe(
          Effect.match({ onFailure: () => "rejected", onSuccess: () => "fulfilled" }),
          Effect.forkChild({ startImmediately: true }),
        );
        yield* Effect.promise(() =>
          vi.waitUntil(
            async () => (await (await worker.fetch(ARRIVALS_PATH)).text()) === "1",
            { interval: 20, timeout: 20_000 },
          ),
        );
        yield* Scope.close(cutOff, Exit.void);
        const abandonedSettlement = yield* Fiber.join(abandoned);
        const retried = yield* Effect.promise(() =>
          worker.fetch(undefined, { headers: { [BUILD_AFTER_ARRIVALS]: "2" } }),
        );
        return {
          abandoned: abandonedSettlement,
          retried: `${String(retried.status)} ${yield* Effect.promise(() => retried.text())}`,
        };
      }),
    ));

  it("answers the second request", ({ retriedAnswer }) => {
    expect(retriedAnswer).toStrictEqual({ abandoned: "rejected", retried: "200 built" });
  });
});
