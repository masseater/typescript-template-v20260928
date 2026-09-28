import { httpStatus } from "@repo/config";
import { Effect } from "effect";

import { AuthFailure } from "./auth-failure.ts";
import { Auth } from "./auth.ts";
import { EmailVerificationFailed } from "./email-verification-failed.ts";

import type { BetterAuthInstance } from "./create-auth.ts";

const authPromise = <Value>(
  run: (authInstance: BetterAuthInstance) => Promise<Value>,
): Effect.Effect<Value, AuthFailure, Auth> =>
  Effect.gen(function* authPromiseProgram() {
    const { instance: authInstance } = yield* Auth;
    return yield* Effect.tryPromise({
      catch: (cause) => new AuthFailure({ cause }),
      try: () => run(authInstance),
    });
  });

const handleAuthRequest = (authRequest: Request): Effect.Effect<Response, AuthFailure, Auth> =>
  authPromise((authInstance) => authInstance.handler(authRequest));

const verifyEmailToken = Effect.fn("verifyEmailToken")(function* verifyEmailToken(
  token: string,
  headers: Headers,
) {
  const { instance: authInstance } = yield* Auth;
  const baseURL = authInstance.options.baseURL;
  if (typeof baseURL !== "string") {
    return yield* new AuthFailure({ cause: new TypeError("auth baseURL is not a string") });
  }
  const verification = new URL("/api/auth/verify-email", baseURL);
  verification.searchParams.set("token", token);
  const authResponse = yield* handleAuthRequest(
    new Request(verification, { headers, method: "GET" }),
  );
  const responseBody = authResponse.body;
  if (responseBody !== null) {
    yield* Effect.promise(() => responseBody.cancel());
  }
  if (authResponse.ok) {
    return { verified: true } as const;
  }
  if (
    authResponse.status >= httpStatus.badRequest &&
    authResponse.status < httpStatus.internalServerError
  ) {
    return yield* new EmailVerificationFailed({
      rateLimited: authResponse.status === httpStatus.tooManyRequests,
    });
  }
  return yield* new AuthFailure({
    cause: new Error(`auth verify-email answered ${authResponse.status}`),
  });
});

export { handleAuthRequest, verifyEmailToken };
