import { assert, it } from "@effect/vitest";
import { APPLICATION, PHOTO_PURGE, httpStatus } from "@repo/config";
import { TestDatabase, runStatement } from "@repo/db/testing";
import { recordingSink } from "@repo/observability/testing";
import { FileStore } from "@repo/runtime";
import { accountApi } from "@repo/runtime/account";
import { appLayer } from "@repo/runtime/bindings";
import { apiRoot, apiRoutes, createApi } from "@repo/runtime/http";
import { appEnvironment, fixtureOrigin, testFileStore } from "@repo/runtime/testing";
import { workerRuntime } from "@repo/runtime/worker";
import { Effect, Layer, Schema } from "effect";

import { LeaveAccepted } from "#shared/contracts/index.ts";
import { leaveApi } from "./leave-api.ts";
import { memberRequirementLayer } from "./member-requirement-layer.ts";

const routes = {
  "/api/leave": "leave-api",
  "/api/recovery/accept": "recovery-accept-api",
  "/api/recovery/decline": "recovery-decline-api",
  "/api/recovery-offer": "recovery-offer-api",
};
const reporting = { log: recordingSink().sink, service: APPLICATION.user } as const;
const migrated = Effect.orDie(Effect.provide(runStatement("select 1"), TestDatabase));

const password = "leave-api-password-123";
const JsonUnknown = Schema.fromJsonString(Schema.Unknown);

function leaveApp(photoFiles: Layer.Layer<FileStore> = testFileStore) {
  const environment = appEnvironment({});
  const runtime = workerRuntime(() => {
    const base = Layer.orDie(appLayer({ audience: APPLICATION.user, env: environment, routes }));
    return Layer.merge(
      base,
      Layer.orDie(memberRequirementLayer(environment)).pipe(
        Layer.provide(photoFiles),
        Layer.provide(base),
      ),
    );
  });
  const api = apiRoutes(runtime, reporting);
  return createApi(apiRoot).use(accountApi(api)).use(leaveApi(api));
}

type LeaveApp = ReturnType<typeof leaveApp>;

function post(
  app: LeaveApp,
  path: string,
  sent: Readonly<{ body: unknown; cookie?: string }>,
): Effect.Effect<Response> {
  return Effect.gen(function* postLeaveRequest() {
    const body = yield* Schema.encodeEffect(JsonUnknown)(sent.body);
    return yield* Effect.promise(() =>
      Promise.resolve(
        app.fetch(
          new Request(`${fixtureOrigin}${apiRoot}${path}`, {
            body,
            headers: {
              "content-type": "application/json",
              cookie: sent.cookie ?? "",
              origin: fixtureOrigin,
            },
            method: "POST",
          }),
        ),
      ),
    );
  }).pipe(Effect.orDie);
}

const signedInMember = Effect.fn("signedInMember")(function* signedInMember(
  app: LeaveApp,
  email: string,
) {
  const signedUp = yield* post(app, "/auth/sign-up/email", {
    body: { email, name: "leaver", password },
  });
  assert.strictEqual(signedUp.status, httpStatus.ok);
  yield* runStatement("UPDATE user SET email_verified = 1 WHERE email = ?", email);
  const signedIn = yield* post(app, "/auth/sign-in/email", { body: { email, password } });
  assert.strictEqual(signedIn.status, httpStatus.ok);
  return signedIn.headers
    .getSetCookie()
    .map((header) => header.split(";")[0] ?? "")
    .join("; ");
});

const leaveWithRetention = Effect.fn("leaveWithRetention")(function* leaveWithRetention(
  app: LeaveApp,
  email: string,
) {
  const cookie = yield* signedInMember(app, email);
  const response = yield* post(app, "/leave", { body: { immediate: false }, cookie });
  const body = yield* Effect.promise(() => response.json() as Promise<unknown>);
  return { body: yield* Schema.decodeUnknownEffect(LeaveAccepted)(body), status: response.status };
});

it.effect("tells the member that the photos were purged on a leave with retention", () =>
  Effect.gen(function* program() {
    yield* migrated;
    const left = yield* leaveWithRetention(leaveApp(), "purged@example.test");
    assert.deepStrictEqual(left, {
      body: { ok: true, photos: PHOTO_PURGE.purged },
      status: httpStatus.ok,
    });
  }),
);

it.effect(
  "tells the member that the photos were left to the scheduled purge when storage fails",
  () =>
    Effect.gen(function* program() {
      yield* migrated;
      const left = yield* leaveWithRetention(
        leaveApp(FileStore.layer(undefined)),
        "deferred@example.test",
      );
      assert.deepStrictEqual(left, {
        body: { ok: true, photos: PHOTO_PURGE.deferred },
        status: httpStatus.ok,
      });
    }),
);

function postRecoveryAccept(app: ReturnType<typeof leaveApp>): Effect.Effect<Response> {
  return Effect.promise(() =>
    Promise.resolve(
      app.fetch(
        new Request(`${fixtureOrigin}${apiRoot}/recovery/accept`, {
          body: "{}",
          headers: { "content-type": "application/json", origin: fixtureOrigin },
          method: "POST",
        }),
      ),
    ),
  );
}

it.effect("rejects unauthenticated recovery acceptance", () =>
  Effect.gen(function* program() {
    yield* migrated;
    const app = leaveApp();
    const response = yield* postRecoveryAccept(app);
    assert.strictEqual(response.status, httpStatus.unauthorized);
  }),
);
