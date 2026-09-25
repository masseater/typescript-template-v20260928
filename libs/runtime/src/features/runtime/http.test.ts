import { httpStatus } from "@repo/config";
import { Telemetry } from "@repo/observability";
import { Effect, Layer, Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { AppOrigin, apiRoutes, createApi, elysiaServer, readJsonBody } from "./http.ts";
import { startRoute, workerRuntime } from "./worker.ts";

const EchoBody = Schema.Struct({
  name: Schema.Trim.check(Schema.isLengthBetween(1, 100)),
  profile: Schema.String.check(Schema.isMaxLength(2000)),
  socialLinks: Schema.Array(
    Schema.String.check(
      Schema.isMaxLength(2048),
      Schema.makeFilter(
        (link: string) => URL.parse(link)?.protocol === "https:" || "https URL required",
      ),
    ),
  ).check(Schema.isMaxLength(10)),
});

const origin = "http://localhost:3001";
const profileLink = "https://profile.example.test/member";
const oversizedBody = 16_385;
const repeatedPrivateText = 10;
const jsonHeaders = { "content-type": "application/json", origin };
const telemetry = Telemetry.layer({ release: "test", routes: {}, serviceName: "service-member" });
const appContext = Layer.succeed(AppOrigin, origin).pipe(Layer.provideMerge(telemetry));
const runtime = workerRuntime(() => appContext);
const api = apiRoutes(runtime, { service: "service-member" });
const rejections = [
  [
    "origin_denied",
    { ...jsonHeaders, origin: "https://other.example.test" },
    "{}",
    httpStatus.forbidden,
  ],
  [
    "json_required",
    { ...jsonHeaders, "content-type": "text/plain" },
    "{}",
    httpStatus.unsupportedMediaType,
  ],
  ["invalid_json", jsonHeaders, "{", httpStatus.badRequest],
  ["body_too_large", jsonHeaders, "x".repeat(oversizedBody), httpStatus.payloadTooLarge],
] as const;

describe("a bounded same-origin JSON mutation", () => {
  const it = test.extend("decodedMutation", () =>
    Effect.runPromise(
      Effect.gen(function* decodedMutationProgram() {
        const encoded = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
          name: " 利用者 ",
          profile: "自己紹介です。",
          socialLinks: [profileLink],
        });
        return yield* readJsonBody(
          EchoBody,
          new Request(`${origin}/api/profile`, {
            body: encoded,
            headers: jsonHeaders,
            method: "PATCH",
          }),
        );
      }).pipe(Effect.provide(appContext)),
    ));

  it("is read through the contract", ({ decodedMutation }) => {
    expect(decodedMutation).toStrictEqual({
      name: "利用者",
      profile: "自己紹介です。",
      socialLinks: [profileLink],
    });
  });
});

describe.for(rejections)(
  "a JSON mutation that fails %s",
  ([reason, mutationHeaders, encoded, rejectedStatus]) => {
    const it = test
      .extend("mutationRejection", () =>
        Effect.runPromise(
          readJsonBody(
            EchoBody,
            new Request(`${origin}/api/profile`, {
              body: encoded,
              headers: mutationHeaders,
              method: "PATCH",
            }),
          ).pipe(
            Effect.flip,
            Effect.map((rejection) => ({
              reason: "reason" in rejection ? rejection.reason : undefined,
              tag: rejection._tag,
            })),
            Effect.provide(appContext),
          ),
        ))
      .extend("rejectedAnswer", () =>
        Effect.runPromise(
          Effect.gen(function* rejectedAnswerProgram() {
            const echo = api.route(
              { body: EchoBody, failures: {}, response: EchoBody },
              (_asked, mutation) => Effect.succeed(mutation),
            );
            const {
              handlers: { ANY: answerAny },
            } = elysiaServer(createApi("").patch("/api/profile", ...echo));
            const answered = yield* startRoute({
              fetch: (rendered) => answerAny({ request: rendered }),
            })(
              new Request(`${origin}/api/profile`, {
                body: encoded,
                headers: mutationHeaders,
                method: "PATCH",
              }),
            );
            return answered.status;
          }),
        ),
      );

    it("is rejected for that reason", ({ mutationRejection }) => {
      expect(mutationRejection).toStrictEqual({ reason, tag: "RequestRejected" });
    });

    it("is still rejected behind a start server route that keeps the body readable", ({
      rejectedAnswer,
    }) => {
      expect(rejectedAnswer).toBe(rejectedStatus);
    });
  },
);

describe("a JSON mutation carrying a self-assigned role", () => {
  const it = test.extend("mutationRejection", () =>
    Effect.runPromise(
      Effect.gen(function* mutationRejectionProgram() {
        const encoded = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
          name: "reader",
          profile: "",
          role: "admin",
          socialLinks: [],
        });
        const rejection = yield* readJsonBody(
          EchoBody,
          new Request(`${origin}/api/profile`, {
            body: encoded,
            headers: jsonHeaders,
            method: "PATCH",
          }),
        ).pipe(Effect.flip);
        return rejection._tag;
      }).pipe(Effect.provide(appContext)),
    ));

  it("is rejected as invalid input", ({ mutationRejection }) => {
    expect(mutationRejection).toBe("InputInvalid");
  });
});

describe("an api route behind a start server route given invalid input", () => {
  const it = test.extend("invalidAnswer", () =>
    Effect.runPromise(
      Effect.gen(function* invalidAnswerProgram() {
        const echo = api.route(
          { body: EchoBody, failures: {}, response: EchoBody },
          (_asked, mutation) => Effect.succeed(mutation),
        );
        const {
          handlers: { ANY: answerAny },
        } = elysiaServer(createApi("").patch("/api/profile", ...echo));
        const encoded = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
          name: "private-profile-text".repeat(repeatedPrivateText),
          profile: 1,
        });
        const answered = yield* startRoute({
          fetch: (rendered) => answerAny({ request: rendered }),
        })(
          new Request(`${origin}/api/profile`, {
            body: encoded,
            headers: jsonHeaders,
            method: "PATCH",
          }),
        );
        const answerText = yield* Effect.promise(() => answered.text());
        return {
          echoesSubmitted: answerText.includes("private-profile-text"),
          error: yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown))(answerText),
          status: answered.status,
        };
      }),
    ));

  it("returns the validation error without echoing submitted values", ({ invalidAnswer }) => {
    expect(invalidAnswer).toStrictEqual({
      echoesSubmitted: false,
      error: { error: "入力内容を確認してください。" },
      status: httpStatus.badRequest,
    });
  });
});

describe("a HEAD request to an event stream route", () => {
  const it = test.extend("headAnswer", () =>
    Effect.runPromise(
      Effect.gen(function* headAnswerProgram() {
        const silentAfterFirst = new ReadableStream<Uint8Array>({
          start: (frames): void => {
            frames.enqueue(new TextEncoder().encode("event: tick\ndata: 1\n\n"));
          },
        });
        const ticks = api.raw(
          () =>
            Effect.succeed(
              new Response(silentAfterFirst, { headers: { "content-type": "text/event-stream" } }),
            ),
          {},
        );
        const {
          handlers: { HEAD: answerHead },
        } = elysiaServer(createApi("/api").get("/events", ...ticks));
        const answered = yield* Effect.promise(() =>
          answerHead({ request: new Request(`${origin}/api/events`, { method: "HEAD" }) }),
        );
        const answerText = yield* Effect.promise(() => answered.text());
        return [answered.status, answered.headers.get("content-type"), answerText];
      }),
    ));

  it("is answered with the stream's headers without waiting for the stream to end", ({
    headAnswer,
  }) => {
    expect(headAnswer).toStrictEqual([httpStatus.ok, "text/event-stream", ""]);
  });
});
