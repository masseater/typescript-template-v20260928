import { Effect, Encoding } from "effect";
import { jwtVerify } from "jose";

type GitHubAppKeyFixture = Readonly<{
  privateKey: string;
  publicKey: CryptoKey;
  signedBy: (authorization: string | null, appId: string) => Promise<boolean>;
}>;

const rsaModulusLength = 2048;
const pkcs1Offset = 26;

const pemLineLength = 64;

const pem = (pemLabel: string, der: ArrayBuffer): string =>
  `-----BEGIN ${pemLabel}-----\n${(Encoding.encodeBase64(new Uint8Array(der)).match(new RegExp(`.{1,${String(pemLineLength)}}`, "gu")) ?? []).join("\n")}\n-----END ${pemLabel}-----\n`;

const gitHubAppKeyFixture = Effect.fn("gitHubAppKeyFixture")(function* gitHubAppKeyFixture(
  format: "pkcs1" | "pkcs8",
) {
  const keyPair = yield* Effect.promise(() =>
    crypto.subtle.generateKey(
      {
        hash: "SHA-256",
        modulusLength: rsaModulusLength,
        name: "RSASSA-PKCS1-v1_5",
        publicExponent: Uint8Array.of(1, 0, 1),
      },
      true,
      ["sign", "verify"],
    ),
  ).pipe(
    Effect.filterOrFail(
      (generated): generated is { privateKey: CryptoKey; publicKey: CryptoKey } =>
        "privateKey" in generated,
    ),
  );
  const pkcs8 = yield* Effect.promise(() =>
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
  ).pipe(
    Effect.filterOrFail((exported): exported is ArrayBuffer => exported instanceof ArrayBuffer),
  );
  const services = yield* Effect.context();
  const signedBy = (authorization: string | null, appId: string): Promise<boolean> =>
    Effect.runPromiseWith(services)(
      Effect.tryPromise(() =>
        jwtVerify((authorization ?? "").replace(/^Bearer /u, ""), keyPair.publicKey, {
          algorithms: ["RS256"],
          issuer: appId,
        }),
      ).pipe(
        Effect.as(true),
        Effect.orElseSucceed(() => false),
      ),
    );
  return {
    privateKey:
      format === "pkcs8"
        ? pem("PRIVATE KEY", pkcs8)
        : pem("RSA PRIVATE KEY", pkcs8.slice(pkcs1Offset)),
    publicKey: keyPair.publicKey,
    signedBy,
  } satisfies GitHubAppKeyFixture;
}, Effect.orDie);

export { gitHubAppKeyFixture };
export type { GitHubAppKeyFixture };
