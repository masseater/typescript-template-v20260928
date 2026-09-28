import { Effect, Redacted } from "effect";
import { TestClock } from "effect/testing";
import { jwtVerify } from "jose";
import { describe, expect, test } from "vite-plus/test";

import { gitHubAppKeyFixture } from "./github-app-key-test-fixture.ts";
import { signGitHubAppJwt } from "./index.ts";

const pemLabel = "PRIVATE KEY";
const signedAtMillis = 1_800_000_000_500;

describe("signGitHubAppJwt", () => {
  describe("a PKCS#8 key", () => {
    const it = test.extend("verifiedJwt", () =>
      Effect.gen(function* signAndVerify() {
        const appKey = yield* gitHubAppKeyFixture("pkcs8");
        yield* TestClock.setTime(signedAtMillis);
        const jwt = yield* signGitHubAppJwt({
          appId: "4242",
          privateKey: Redacted.make(appKey.privateKey),
        });
        const verified = yield* Effect.promise(() =>
          jwtVerify(Redacted.value(jwt), appKey.publicKey, {
            algorithms: ["RS256"],
            currentDate: new Date(signedAtMillis),
          }),
        );
        return { header: verified.protectedHeader, payload: verified.payload };
      }).pipe(Effect.provide(TestClock.layer()), Effect.runPromise));

    it("signs an RS256 token for the App that GitHub accepts for nine minutes from a minute ago", ({
      verifiedJwt,
    }) => {
      expect(verifiedJwt).toStrictEqual({
        header: { alg: "RS256" },
        payload: { exp: 1_800_000_540, iat: 1_799_999_940, iss: "4242" },
      });
    });
  });

  describe("a PKCS#1 key", () => {
    const it = test.extend("refusalTag", () =>
      Effect.runPromise(
        gitHubAppKeyFixture("pkcs1").pipe(
          Effect.flatMap((appKey) =>
            Effect.flip(
              signGitHubAppJwt({ appId: "4242", privateKey: Redacted.make(appKey.privateKey) }),
            ),
          ),
          Effect.map((refusal) => refusal._tag),
        ),
      ));

    it("is refused as an invalid key", ({ refusalTag }) => {
      expect(refusalTag).toBe("GitHubAppKeyInvalid");
    });
  });

  describe.for([
    ["a body that is not base64", "%%%"],
    ["base64 that is not a key", "AAAA"],
  ] as const)("a key with %s", ([, pemBody]) => {
    const it = test.extend("refusalTag", () =>
      Effect.runPromise(
        Effect.flip(
          signGitHubAppJwt({
            appId: "4242",
            privateKey: Redacted.make(
              `-----BEGIN ${pemLabel}-----\n${pemBody}\n-----END ${pemLabel}-----\n`,
            ),
          }),
        ).pipe(Effect.map((refusal) => refusal._tag)),
      ));

    it("is refused as an invalid key", ({ refusalTag }) => {
      expect(refusalTag).toBe("GitHubAppKeyInvalid");
    });
  });
});
