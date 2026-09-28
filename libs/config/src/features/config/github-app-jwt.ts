import { Clock, Duration, Effect, Redacted, Schema } from "effect";
import { SignJWT, importPKCS8 } from "jose";

import { GitHubAppKeyInvalid } from "./github-app-key-invalid.ts";

type GitHubAppKey = Readonly<{ appId: string; privateKey: Redacted.Redacted }>;

const jwtAlgorithm = "RS256";
const jwtClockSkewSeconds = 60;
const jwtLifetimeSeconds = 540;

const Pkcs8PrivateKeyPem = Schema.String.check(
  Schema.isPattern(/^-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----\s*$/u),
);

const signGitHubAppJwt = Effect.fn("signGitHubAppJwt")(function* signGitHubAppJwt(
  appKey: GitHubAppKey,
) {
  const signingKey = yield* Effect.tryPromise({
    catch: (cause) => new GitHubAppKeyInvalid({ cause }),
    try: () => importPKCS8(Redacted.value(appKey.privateKey), jwtAlgorithm),
  });
  const issuedAtSeconds = Math.floor(
    Duration.toSeconds(Duration.millis(yield* Clock.currentTimeMillis)),
  );
  const jwt = yield* Effect.promise(() =>
    new SignJWT()
      .setProtectedHeader({ alg: jwtAlgorithm })
      .setIssuer(appKey.appId)
      .setIssuedAt(issuedAtSeconds - jwtClockSkewSeconds)
      .setExpirationTime(issuedAtSeconds + jwtLifetimeSeconds)
      .sign(signingKey),
  );
  return Redacted.make(jwt);
});

export { Pkcs8PrivateKeyPem, signGitHubAppJwt };
export type { GitHubAppKey };
