import { Effect, Option, Ref } from "effect";
import { HttpBody, HttpClient } from "effect/unstable/http";

import { browserHttp } from "./browser-http.ts";
import {
  VERIFICATION_VERDICT,
  isSettledVerdict,
  verificationVerdictOf,
  type VerificationVerdict,
} from "./verification-verdict.ts";

const verificationEndpoint = "/api/verify-email";

const pendingVerification = Ref.makeUnsafe<
  { readonly result: Promise<VerificationVerdict>; readonly token: string } | undefined
>(undefined);

const postVerification = (token: string): Effect.Effect<VerificationVerdict> =>
  Effect.gen(function* postVerificationToken() {
    const requestPayload = yield* HttpBody.json({ token }).pipe(Effect.orDie);
    const served = yield* HttpClient.post(verificationEndpoint, { body: requestPayload }).pipe(
      Effect.provide(browserHttp),
      Effect.option,
    );
    const verdict = verificationVerdictOf(
      Option.getOrUndefined(Option.map(served, (response) => response.status)),
    );
    if (!isSettledVerdict(verdict)) {
      yield* Ref.set(pendingVerification, undefined);
    }
    return verdict;
  });

const verifyEmailToken = (): Promise<VerificationVerdict> => {
  const token = new URLSearchParams(globalThis.location.hash.slice(1)).get("token");
  if (token === null || token === "") {
    Effect.runSync(Ref.set(pendingVerification, undefined));
    return Promise.resolve(VERIFICATION_VERDICT.invalid);
  }
  const cached = Effect.runSync(Ref.get(pendingVerification));
  if (cached?.token === token) {
    return cached.result;
  }
  const verdict = Effect.runPromise(postVerification(token));
  Effect.runSync(Ref.set(pendingVerification, { result: verdict, token }));
  return verdict;
};

const forgetSettledToken = (verdict: VerificationVerdict): void => {
  if (isSettledVerdict(verdict)) {
    globalThis.history.replaceState(undefined, "", globalThis.location.pathname);
  }
};

export { forgetSettledToken, verifyEmailToken };
