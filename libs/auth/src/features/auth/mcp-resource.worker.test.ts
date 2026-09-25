import { APPLICATION, httpStatus } from "@repo/config";
import { Effect, Encoding, Option } from "effect";
import { describe, expect } from "vite-plus/test";

import { Auth } from "./auth.ts";
import { AuthApps, authTest, origins, runWith } from "./index-test-fixture.ts";
import { mcpAuthorizer } from "./mcp-resource.ts";

const unverifiableToken = `${Encoding.encodeBase64Url(JSON.stringify({ alg: "EdDSA", kid: "unknown" }))}.e30.c2ln`;

const authorizeWiki = mcpAuthorizer({
  actorOf: (subject) => Effect.succeed({ userId: subject.sub }),
  challengeScopes: [],
  scopeError: () => Option.none(),
});

const wikiRequest = new Request(`${origins[APPLICATION.dashboard]}/mcp`, {
  headers: { authorization: `Bearer ${unverifiableToken}` },
  method: "POST",
});

describe("an MCP request whose token the published keys do not verify", () => {
  const it = authTest.extend("theRejectedStatus", ({ auth }) =>
    runWith(auth, () =>
      Effect.gen(function* authorizeUnverifiable() {
        const wiki = (yield* AuthApps)[APPLICATION.dashboard];
        const authorized = yield* authorizeWiki(wikiRequest, origins[APPLICATION.dashboard]).pipe(
          Effect.provideService(Auth, wiki),
        );
        return authorized instanceof Response ? authorized.status : undefined;
      }),
    ),
  );

  it("is answered as unauthorized", ({ theRejectedStatus }) => {
    expect(theRejectedStatus).toBe(httpStatus.unauthorized);
  });
});

describe("an MCP request while the published keys cannot be read", () => {
  const it = authTest.extend("theKeyFailure", ({ auth }) =>
    runWith(auth, () =>
      Effect.gen(function* authorizeWithoutKeys() {
        const wiki = (yield* AuthApps)[APPLICATION.dashboard];
        const keylessWiki = {
          ...wiki,
          instance: {
            ...wiki.instance,
            handler: (): Promise<Response> =>
              Promise.resolve(new Response(null, { status: httpStatus.serviceUnavailable })),
          },
        };
        return yield* authorizeWiki(wikiRequest, origins[APPLICATION.dashboard]).pipe(
          Effect.provideService(Auth, keylessWiki),
          Effect.as("authorized"),
          Effect.catchTag("JwksUnavailable", (unavailable) => Effect.succeed(unavailable._tag)),
        );
      }),
    ),
  );

  it("fails as an unavailable key set instead of an invalid token", ({ theKeyFailure }) => {
    expect(theKeyFailure).toBe("JwksUnavailable");
  });
});
