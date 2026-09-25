import { makeSignature } from "better-auth/crypto";
import { Effect, Exit } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { sessionTokenFrom } from "./session-token.ts";

describe("sessionTokenFrom", () => {
  describe("a cookie signed with the secret", () => {
    const it = test.extend("theSignedToken", () =>
      Effect.runPromiseExit(
        Effect.gen(function* readSignedCookie() {
          const signature = yield* Effect.promise(() => makeSignature("token-1", "secret-1"));
          return yield* sessionTokenFrom({
            cookiePrefix: "template-user",
            headers: new Headers({ cookie: `template-user.session_token=token-1.${signature}` }),
            secret: "secret-1",
          });
        }),
      ));

    it("returns the token", ({ theSignedToken }) => {
      expect(theSignedToken).toStrictEqual(Exit.succeed("token-1"));
    });
  });

  describe("a cookie signed with another secret", () => {
    const it = test.extend("theForeignToken", () =>
      Effect.runPromiseExit(
        Effect.gen(function* readForeignCookie() {
          const signature = yield* Effect.promise(() => makeSignature("token-1", "secret-2"));
          return yield* sessionTokenFrom({
            cookiePrefix: "template-user",
            headers: new Headers({ cookie: `template-user.session_token=token-1.${signature}` }),
            secret: "secret-1",
          });
        }),
      ));

    it("returns no token", ({ theForeignToken }) => {
      expect(theForeignToken).toStrictEqual(Exit.succeed(undefined));
    });
  });

  describe("a cookie whose signature is not base64", () => {
    const it = test.extend("theMalformedToken", () =>
      Effect.runPromiseExit(
        sessionTokenFrom({
          cookiePrefix: "template-user",
          headers: new Headers({
            cookie: `template-user.session_token=token-1.${"*".repeat(43)}=`,
          }),
          secret: "secret-1",
        }),
      ));

    it("returns no token", ({ theMalformedToken }) => {
      expect(theMalformedToken).toStrictEqual(Exit.succeed(undefined));
    });
  });

  describe("a secret that cannot become an HMAC key", () => {
    const it = test.extend("theKeyFailure", () =>
      Effect.runPromiseExit(
        Effect.gen(function* readWithEmptySecret() {
          const signature = yield* Effect.promise(() => makeSignature("token-1", "secret-1"));
          return yield* sessionTokenFrom({
            cookiePrefix: "template-user",
            headers: new Headers({ cookie: `template-user.session_token=token-1.${signature}` }),
            secret: "",
          });
        }).pipe(
          Effect.catchTag("ConfigurationInvalid", (invalid) =>
            Effect.succeed(`ConfigurationInvalid: ${invalid.reason}`),
          ),
        ),
      ));

    it("fails as an invalid configuration", ({ theKeyFailure }) => {
      expect(theKeyFailure).toStrictEqual(Exit.succeed("ConfigurationInvalid: AUTH_SECRET"));
    });
  });
});
