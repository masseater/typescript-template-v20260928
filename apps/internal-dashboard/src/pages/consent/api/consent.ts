import { browserHttp } from "@repo/auth-ui";
import {
  CONSENT_CLIENT,
  lookupConsentClient,
  type ConsentClient,
  type ConsentClientUnavailable,
} from "@repo/auth-ui/consent";
import { decodeJson } from "@repo/runtime/client";
import { Redirect } from "@repo/runtime/contracts";
import { queryOptions } from "@tanstack/react-query";
import { Effect } from "effect";
import { HttpBody, HttpClient } from "effect/unstable/http";

function lookupClient(clientId: string): Effect.Effect<ConsentClient, ConsentClientUnavailable> {
  return lookupConsentClient(fetch, {
    clientId,
    init: { cache: "no-store", credentials: "same-origin" },
    origin: globalThis.location.origin,
  }).pipe(
    Effect.tap((client) =>
      client.kind === CONSENT_CLIENT.signInRequired
        ? Effect.sync(() => {
            globalThis.location.assign(`/login${globalThis.location.search}`);
          })
        : Effect.void,
    ),
  );
}

function consentClientOptions(clientId: string) {
  return queryOptions({
    queryFn: () => Effect.runPromise(lookupClient(clientId)),
    queryKey: ["oauth-client", clientId] as const,
    retry: false,
  });
}

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

export { consentClientOptions, submitDecision };
