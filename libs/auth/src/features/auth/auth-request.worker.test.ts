import { APPLICATION } from "@repo/config";
import { runStatement } from "@repo/db/testing";
import { Effect } from "effect";
import { describe, expect } from "vite-plus/test";

import { verifyEmailToken } from "./auth-request.ts";
import { AuthApps, authTest, register, runWith } from "./auth-test-fixture.ts";
import { Auth } from "./auth.ts";
import { mailSubjects } from "./email.ts";
import { receivedLink } from "./mail-test-fixture.ts";

const email = "verify@example.com";

const verificationFailure = Effect.fn("verificationFailure")(function* verificationFailure(
  token: string,
) {
  const member = (yield* AuthApps)[APPLICATION.user];
  const failure = yield* verifyEmailToken(token, new Headers()).pipe(
    Effect.provideService(Auth, member),
    Effect.flip,
  );
  return failure._tag;
});

describe("verifying an email token", () => {
  const it = authTest
    .extend("brokenStore", ({ auth }) =>
      runWith(auth, () =>
        Effect.gen(function* verifyAgainstBrokenStore() {
          yield* register(email);
          const link = yield* receivedLink(email, mailSubjects.verification);
          const token = new URLSearchParams(link.hash.slice(1)).get("token") ?? "";
          yield* Effect.orDie(runStatement("alter table `user` rename to `user_gone`"));
          return yield* verificationFailure(token);
        }),
      ),
    )
    .extend("forgedToken", ({ auth }) => runWith(auth, () => verificationFailure("forged-token")));

  it("reports an auth failure, not an invalid link, when better-auth cannot answer", ({
    brokenStore,
  }) => {
    expect(brokenStore).toBe("AuthFailure");
  });

  it("reports an invalid link when better-auth refuses the token", ({ forgedToken }) => {
    expect(forgedToken).toBe("EmailVerificationFailed");
  });
});
