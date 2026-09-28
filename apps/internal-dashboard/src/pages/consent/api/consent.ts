import { browserHttp } from "@repo/auth-ui";
import { decodeJson } from "@repo/runtime/client";
import { Redirect } from "@repo/runtime/contracts";
import { Effect } from "effect";
import { HttpBody, HttpClient } from "effect/unstable/http";

function submitDecision(accept: boolean): Effect.Effect<void> {
  return Effect.gen(function* sendDecision() {
    const requestBody = yield* HttpBody.json({
      accept,
      oauth_query: globalThis.location.search.slice(1),
    });
    const response = yield* HttpClient.post("/api/auth/oauth2/consent", {
      body: requestBody,
    }).pipe(Effect.provide(browserHttp));
    if (response.status < 200 || response.status >= 300) {
      return yield* Effect.die("連携の許可を処理できませんでした。");
    }
    globalThis.location.assign(decodeJson(Redirect, yield* response.json).url);
  }).pipe(Effect.orDie);
}

export { submitDecision };
