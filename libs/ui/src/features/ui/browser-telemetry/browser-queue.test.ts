import { Array as Arr, Duration, Effect, Ref } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, test } from "vite-plus/test";

import { makeEventQueue } from "./browser-queue.ts";

import type { BrowserEvent } from "@repo/observability";

const retryBackoff = Duration.seconds(1);
const secondBackoff = Duration.seconds(2);

const vitalEvent = {
  duration: 0,
  kind: "vital",
  method: "GET",
  name: "INP",
  requestId: "11111111-1111-4111-8111-111111111111",
  route: "home",
  spanId: "bbbbbbbbbbbbbbbb",
  start: 1_800_000_000_000,
  status: 0,
  traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  value: 1,
} as const;

describe("a batch whose delivery is refused", () => {
  const it = test.extend("deliveredBatches", () =>
    Effect.runPromise(
      Effect.gen(function* refusedTwice() {
        const deliveredBatches = yield* Ref.make<readonly (readonly BrowserEvent[])[]>([]);
        const recordWithin = Effect.runSyncWith(yield* Effect.context());
        const queue = makeEventQueue((batch) => {
          recordWithin(Ref.update(deliveredBatches, Arr.append(batch)));
          return Promise.reject(new Error("delivery refused"));
        });
        const flush = Effect.ignore(queue.drain);
        queue.enqueue(vitalEvent);
        yield* flush;
        yield* flush;
        return yield* Ref.get(deliveredBatches);
      }).pipe(Effect.provide(TestClock.layer())),
    ));

  it("is not resent within the backoff", ({ deliveredBatches }) => {
    expect(deliveredBatches).toStrictEqual([[vitalEvent]]);
  });
});

describe("a batch flushed again once the backoff has passed", () => {
  const it = test.extend("deliveredBatches", () =>
    Effect.runPromise(
      Effect.gen(function* retriedAfterBackoff() {
        const deliveredBatches = yield* Ref.make<readonly (readonly BrowserEvent[])[]>([]);
        const recordWithin = Effect.runSyncWith(yield* Effect.context());
        const queue = makeEventQueue((batch) => {
          recordWithin(Ref.update(deliveredBatches, Arr.append(batch)));
          return Promise.reject(new Error("delivery refused"));
        });
        const flush = Effect.ignore(queue.drain);
        queue.enqueue(vitalEvent);
        yield* flush;
        yield* flush;
        yield* TestClock.adjust(retryBackoff);
        yield* flush;
        return yield* Ref.get(deliveredBatches);
      }).pipe(Effect.provide(TestClock.layer())),
    ));

  it("is sent once more", ({ deliveredBatches }) => {
    expect(deliveredBatches).toStrictEqual([[vitalEvent], [vitalEvent]]);
  });
});

describe("a batch refused as many times as the queue allows", () => {
  const it = test.extend("deliveredBatches", () =>
    Effect.runPromise(
      Effect.gen(function* refusedUntilDropped() {
        const deliveredBatches = yield* Ref.make<readonly (readonly BrowserEvent[])[]>([]);
        const recordWithin = Effect.runSyncWith(yield* Effect.context());
        const queue = makeEventQueue((batch) => {
          recordWithin(Ref.update(deliveredBatches, Arr.append(batch)));
          return Promise.reject(new Error("delivery refused"));
        });
        const flush = Effect.ignore(queue.drain);
        queue.enqueue(vitalEvent);
        yield* flush;
        yield* TestClock.adjust(retryBackoff);
        yield* flush;
        yield* TestClock.adjust(secondBackoff);
        yield* flush;
        queue.flushBeforeUnload();
        return yield* Ref.get(deliveredBatches);
      }).pipe(Effect.provide(TestClock.layer())),
    ));

  it("stops at the limit", ({ deliveredBatches }) => {
    expect(deliveredBatches).toStrictEqual([[vitalEvent], [vitalEvent], [vitalEvent]]);
  });
});
