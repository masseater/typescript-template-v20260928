import { assert, it } from "@effect/vitest";
import { Deferred, Duration, Effect, Fiber, Schema } from "effect";
import { TestClock } from "effect/testing";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

import { endpoint, readList } from "./account-read.ts";

import type { Scope } from "effect";
import type { SetupServer } from "msw/node";

const HEX_ID_LENGTH = 32;
const PAGE_SIZE = 20;
const REQUEST_DEADLINE_SECONDS = 30;

const access = {
  accountId: "c".repeat(HEX_ID_LENGTH),
  apiToken: "account-read-test-not-a-real-token",
};
const url = `https://api.cloudflare.com/client/v4/zones/${access.accountId}/dns_records`;
const Rows = Schema.Struct({ result: Schema.Array(Schema.Struct({ name: Schema.String })) });

function mockServer(
  ...handlers: Parameters<typeof setupServer>
): Effect.Effect<SetupServer, never, Scope.Scope> {
  return Effect.acquireRelease(
    Effect.sync(() => {
      const server = setupServer(...handlers);
      server.listen({ onUnhandledRequest: "error" });
      return server;
    }),
    (server) =>
      Effect.sync(() => {
        server.close();
      }),
  );
}

it.effect("accepts a filtered page that Cloudflare counted against the whole collection", () =>
  Effect.gen(function* program() {
    yield* mockServer(
      http.get(url, () =>
        HttpResponse.json({
          result: [{ name: "user.example.com" }],
          result_info: { count: 1, page: 1, per_page: 100, total_count: 37, total_pages: 1 },
        }),
      ),
    );
    const listed = yield* readList(
      access,
      {
        filter: { "name.exact": "user.example.com" },
        source: endpoint`zones/${access.accountId}/dns_records`,
      },
      Rows,
    );
    assert.deepStrictEqual(listed.result, [{ name: "user.example.com" }]);
  }).pipe(Effect.scoped),
);

it.effect("accepts an empty collection that reports a page size of zero", () =>
  Effect.gen(function* program() {
    yield* mockServer(
      http.get(url, () =>
        HttpResponse.json({
          result: [],
          result_info: { count: 0, page: 1, per_page: 0, total_count: 0 },
        }),
      ),
    );
    const listed = yield* readList(
      access,
      {
        filter: { "name.exact": "user.example.com" },
        source: endpoint`zones/${access.accountId}/dns_records`,
      },
      Rows,
    );
    assert.deepStrictEqual(listed.result, []);
  }).pipe(Effect.scoped),
);

it.effect("accepts a collection that reports the rows it returned as the page size", () =>
  Effect.gen(function* program() {
    yield* mockServer(
      http.get(url, () =>
        HttpResponse.json({
          result: [{ name: "user.example.com" }, { name: "admin.example.com" }],
          result_info: { count: 2, page: 1, per_page: 2, total_count: 2, total_pages: 1 },
        }),
      ),
    );
    const listed = yield* readList(
      access,
      { source: endpoint`zones/${access.accountId}/dns_records` },
      Rows,
    );
    assert.deepStrictEqual(listed.result, [
      { name: "user.example.com" },
      { name: "admin.example.com" },
    ]);
  }).pipe(Effect.scoped),
);

it.effect("refuses a page that came back as full as the page size", () =>
  Effect.gen(function* program() {
    yield* mockServer(
      http.get(url, () =>
        HttpResponse.json({
          result: Array.from({ length: PAGE_SIZE }, (_value, index) => ({
            name: `record-${index}.example.com`,
          })),
          result_info: { count: 20, page: 1, per_page: 20, total_count: 41, total_pages: 3 },
        }),
      ),
    );
    const failure = yield* readList(
      access,
      {
        filter: { "name.exact": "user.example.com" },
        source: endpoint`zones/${access.accountId}/dns_records`,
      },
      Rows,
    ).pipe(Effect.flip);
    assert.deepStrictEqual(failure.keys, ["zones/{}/dns_records", "truncated"]);
  }).pipe(Effect.scoped),
);

it.effect("refuses an unfiltered page missing rows the collection counted", () =>
  Effect.gen(function* program() {
    yield* mockServer(
      http.get(url, () =>
        HttpResponse.json({
          result: [{ name: "user.example.com" }],
          result_info: { count: 1, page: 1, per_page: 100, total_count: 2, total_pages: 1 },
        }),
      ),
    );
    const failure = yield* readList(
      access,
      { source: endpoint`zones/${access.accountId}/dns_records` },
      Rows,
    ).pipe(Effect.flip);
    assert.deepStrictEqual(failure.keys, ["zones/{}/dns_records", "truncated"]);
  }).pipe(Effect.scoped),
);

it.effect("reports a read the network never completed", () =>
  Effect.gen(function* program() {
    yield* mockServer(http.get(url, () => HttpResponse.error()));
    const failure = yield* readList(
      access,
      { source: endpoint`zones/${access.accountId}/dns_records` },
      Rows,
    ).pipe(Effect.flip);
    assert.deepStrictEqual(failure.keys, ["zones/{}/dns_records", "request_failed"]);
  }).pipe(Effect.scoped),
);

it.effect("reports a read Cloudflare never answered within the request deadline", () =>
  Effect.gen(function* program() {
    const requested = yield* Deferred.make<boolean>();
    const services = yield* Effect.context();
    yield* mockServer(
      http.get(url, () => {
        Effect.runSyncWith(services)(Deferred.succeed(requested, true));
        return new Promise<never>(() => undefined);
      }),
    );
    const reading = yield* Effect.forkChild(
      readList(access, { source: endpoint`zones/${access.accountId}/dns_records` }, Rows).pipe(
        Effect.flip,
      ),
    );
    yield* Deferred.await(requested);
    yield* TestClock.adjust(Duration.seconds(REQUEST_DEADLINE_SECONDS));
    const failure = yield* Fiber.join(reading);
    assert.deepStrictEqual(failure.keys, ["zones/{}/dns_records", "timeout"]);
  }).pipe(Effect.scoped),
);
