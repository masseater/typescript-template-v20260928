import { httpStatus } from "@repo/config";
import { Effect } from "effect";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { describe, expect, test } from "vite-plus/test";

import { CONSENT_CLIENT, lookupConsentClient } from "./oauth-consent.ts";

const origin = "https://consent.example.test";
const publicClient = `${origin}/api/auth/oauth2/public-client`;

const lookedUp = (clientId: string) =>
  Effect.runPromise(
    lookupConsentClient(fetch, { clientId, init: {}, origin }).pipe(
      Effect.catchTag("ConsentClientUnavailable", (unavailable) =>
        Effect.succeed({ failure: unavailable._tag }),
      ),
    ),
  );

describe("looking up the client that asks for consent", () => {
  const it = test.extend("lookups", ({}, { onCleanup }) => {
    const server = setupServer(
      http.get(publicClient, ({ request }) => {
        const clientId = new URL(request.url).searchParams.get("client_id");
        if (clientId === "named") {
          return HttpResponse.json({ client_name: "Claude" });
        }
        if (clientId === "unnamed") {
          return HttpResponse.json({});
        }
        if (clientId === "signed-out") {
          return HttpResponse.json({}, { status: httpStatus.unauthorized });
        }
        if (clientId === "missing") {
          return HttpResponse.json({}, { status: httpStatus.notFound });
        }
        if (clientId === "malformed") {
          return HttpResponse.json({ client_name: 1 });
        }
        if (clientId === "offline") {
          return HttpResponse.error();
        }
        return HttpResponse.json({}, { status: httpStatus.serviceUnavailable });
      }),
    );
    server.listen({ onUnhandledRequest: "error" });
    onCleanup(() => {
      server.close();
    });
    return Promise.all(
      ["named", "unnamed", "signed-out", "missing", "down", "offline", "malformed"].map(
        (clientId) => lookedUp(clientId),
      ),
    );
  });

  it("tells a found client, a missing one and a sign-in apart, and fails on anything else", ({
    lookups,
  }) => {
    expect(lookups).toStrictEqual([
      { kind: CONSENT_CLIENT.found, name: "Claude" },
      { kind: CONSENT_CLIENT.found, name: "unnamed" },
      { kind: CONSENT_CLIENT.signInRequired },
      { kind: CONSENT_CLIENT.unknown },
      { failure: "ConsentClientUnavailable" },
      { failure: "ConsentClientUnavailable" },
      { failure: "ConsentClientUnavailable" },
    ]);
  });
});
