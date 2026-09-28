import { Effect, Layer, Option, Schema, Tracer } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, test } from "vite-plus/test";

import { recordingSink } from "./recording-sink-test-fixture.ts";
import { RequestEntropy } from "./request-span.ts";
import { Telemetry, ingestBrowser } from "./server.ts";

class FixedSpan extends Tracer.NativeSpan {
  public override get spanId(): string {
    return "c".repeat(16);
  }

  public override get traceId(): string {
    return Option.getOrUndefined(this.parent)?.traceId ?? "c".repeat(32);
  }
}

const fixedSpans = Tracer.make({ span: (spanOptions) => new FixedSpan(spanOptions) });
const fixedEntropy = Layer.merge(
  Layer.succeed(RequestEntropy, {
    ...RequestEntropy.defaultValue(),
    requestId: () => "22222222-2222-4222-8222-222222222222",
  }),
  Layer.effectDiscard(TestClock.setTime(1_800_000_000_000)).pipe(
    Layer.provideMerge(TestClock.layer()),
  ),
);

const requestEvent = {
  duration: 25,
  kind: "http",
  method: "POST",
  name: "http.client.request",
  requestId: "11111111-1111-4111-8111-111111111111",
  route: "home",
  spanId: "bbbbbbbbbbbbbbbb",
  start: 1_800_000_000_000,
  status: 201,
  traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  value: 0,
};

describe("1,200 events posted within one window of a service, then one more", () => {
  const it = test.extend("windowAnswers", () =>
    Effect.runPromise(
      Effect.gen(function* fillTheWindow() {
        const logs = recordingSink();
        const batches = [
          ...Array.from({ length: 37 }, (_unused, batchIndex) =>
            Array.from({ length: 32 }, (_ignored, offset) => batchIndex * 32 + offset + 1),
          ),
          Array.from({ length: 16 }, (_ignored, offset) => 37 * 32 + offset + 1),
          [2000],
        ];
        const answers = yield* Effect.forEach(batches, (positions) =>
          Effect.gen(function* postBatch() {
            const answered = yield* ingestBrowser(
              new Request(new URL("/api/telemetry", "http://localhost"), {
                body: yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(
                  positions.map((position) => ({
                    ...requestEvent,
                    spanId: position.toString(16).padStart(16, "0"),
                  })),
                ),
                headers: { "content-type": "application/json", origin: "http://localhost" },
                method: "POST",
              }),
            ).pipe(
              Effect.provide(
                Layer.merge(
                  Telemetry.layer({
                    log: logs.sink,
                    release: "test",
                    routes: { "/": "home", "/api/telemetry": "telemetry" },
                    serviceName: "ingress-window-limit",
                  }),
                  fixedEntropy,
                ),
              ),
              Effect.withTracer(fixedSpans),
            );
            return {
              cacheControl: answered.headers.get("cache-control"),
              recorded: logs.stdout.length,
              retryAfter: answered.headers.get("retry-after"),
              status: answered.status,
            };
          }),
        );
        return { overflow: answers.at(-1), withinLimit: answers.slice(0, -1).at(-1) };
      }),
    ),
  );

  it("records all 1,200 and refuses the next with 429 without recording it", ({
    windowAnswers,
  }) => {
    expect(windowAnswers).toStrictEqual({
      overflow: { cacheControl: "no-store", recorded: 1200, retryAfter: "60", status: 429 },
      withinLimit: { cacheControl: "no-store", recorded: 1200, retryAfter: null, status: 202 },
    });
  });
});

describe("one batch that carries the same span twice", () => {
  const it = test.extend("recordedSpans", () =>
    Effect.runPromise(
      Effect.gen(function* recordLogs() {
        const logs = recordingSink();
        yield* ingestBrowser(
          new Request(new URL("/api/telemetry", "http://localhost"), {
            body: yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))([
              { ...requestEvent, spanId: "dddddddddddddddd", status: 201 },
              { ...requestEvent, spanId: "dddddddddddddddd", status: 202 },
            ]),
            headers: { "content-type": "application/json", origin: "http://localhost" },
            method: "POST",
          }),
        ).pipe(
          Effect.provide(
            Layer.merge(
              Telemetry.layer({
                log: logs.sink,
                release: "test",
                routes: { "/": "home", "/api/telemetry": "telemetry" },
                serviceName: "ingress-duplicate-in-batch",
              }),
              fixedEntropy,
            ),
          ),
          Effect.withTracer(fixedSpans),
        );
        return logs.stdout.map((line) => [line["span_id"], line["http.response.status_code"]]);
      }),
    ),
  );

  it("records only the first of them", ({ recordedSpans }) => {
    expect(recordedSpans).toStrictEqual([["dddddddddddddddd", 201]]);
  });
});
