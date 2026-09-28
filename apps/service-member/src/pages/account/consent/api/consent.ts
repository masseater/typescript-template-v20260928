import { submitConsent } from "@repo/auth-ui";
import { lookupConsentClient, type ConsentClient } from "@repo/auth-ui/consent";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

const loadConsentClient = createIsomorphicFn()
  .server((clientId: string): Promise<ConsentClient> =>
    import("@tanstack/react-start/server").then(({ getRequest }) => {
      const request = getRequest();
      return Effect.runPromise(
        lookupConsentClient(fetch, {
          clientId,
          init: { headers: { cookie: request.headers.get("cookie") ?? "" } },
          origin: new URL(request.url).origin,
        }),
      );
    }),
  )
  .client(
    (clientId: string): Promise<ConsentClient> =>
      Effect.runPromise(
        lookupConsentClient(fetch, {
          clientId,
          init: { cache: "no-store", credentials: "same-origin" },
          origin: globalThis.location.origin,
        }),
      ),
  );

function submitDecision(accept: boolean, scopes: readonly string[]): Promise<void> {
  return submitConsent(accept ? { accept, scope: scopes.join(" ") } : { accept });
}

export { loadConsentClient, submitDecision };
