import { ConfigurationInvalid } from "@repo/config";
import { getSessionCookie } from "better-auth/cookies";
import { getCryptoKey } from "better-auth/crypto";
import { Effect, Encoding, Result } from "effect";

import { AuthFailure } from "./auth-failure.ts";

const signatureLength = 44;

const verifySignedToken = Effect.fn("verifySignedToken")(function* verifySignedToken({
  secret,
  signature,
  tokenValue,
}: {
  readonly secret: string;
  readonly signature: string;
  readonly tokenValue: string;
}) {
  const signatureBytes = Encoding.decodeBase64(signature);
  if (Result.isFailure(signatureBytes)) {
    return false;
  }
  const cryptoKey = yield* Effect.tryPromise({
    try: () => getCryptoKey(secret),
    catch: (cause) => new ConfigurationInvalid({ cause, reason: "AUTH_SECRET" }),
  });
  return yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.verify(
        "HMAC",
        cryptoKey,
        Uint8Array.from(signatureBytes.success),
        new TextEncoder().encode(tokenValue),
      ),
    catch: (cause) => new AuthFailure({ cause }),
  });
});

const sessionTokenFrom = Effect.fn("sessionTokenFrom")(function* sessionTokenFrom({
  cookiePrefix,
  headers,
  secret,
}: {
  readonly cookiePrefix: string;
  readonly headers: Headers;
  readonly secret: string;
}) {
  const raw = getSessionCookie(headers, { cookiePrefix });
  if (raw === null) {
    return undefined;
  }
  const signatureStart = raw.lastIndexOf(".");
  if (signatureStart < 1) {
    return undefined;
  }
  const tokenValue = raw.slice(0, signatureStart);
  const signature = raw.slice(signatureStart + 1);
  if (signature.length !== signatureLength || !signature.endsWith("=")) {
    return undefined;
  }
  const valid = yield* verifySignedToken({ secret, signature, tokenValue });
  return valid ? tokenValue : undefined;
});

export { sessionTokenFrom };
