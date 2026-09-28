import { signGitHubAppJwt } from "@repo/config";
import { gitHubAppKeyFixture } from "@repo/config/testing";
import { Effect, Redacted } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { holdsPkcs8Key, pkcs8PrivateKey } from "./app-private-key.ts";

const appId = "4242";

describe("pkcs8PrivateKey", () => {
  describe.for(["pkcs1", "pkcs8"] as const)("a %s key GitHub issued", (format) => {
    const it = test.extend("storedKey", () =>
      Effect.gen(function* storedKey() {
        const appKey = yield* gitHubAppKeyFixture(format);
        const privateKey = yield* pkcs8PrivateKey(Redacted.make(appKey.privateKey));
        const jwt = yield* signGitHubAppJwt({ appId, privateKey });
        return {
          pkcs8: holdsPkcs8Key(privateKey),
          signsForTheApp: yield* Effect.promise(() =>
            appKey.signedBy(`Bearer ${Redacted.value(jwt)}`, appId),
          ),
        };
      }).pipe(Effect.runPromise));

    it("is stored as the same key in PKCS#8", ({ storedKey }) => {
      expect(storedKey).toStrictEqual({ pkcs8: true, signsForTheApp: true });
    });
  });

  describe("text that is not a key", () => {
    const it = test.extend("refusal", () =>
      Effect.flip(pkcs8PrivateKey(Redacted.make("not a key"))).pipe(
        Effect.map((failure) => ({
          caused: failure.cause !== undefined,
          code: failure.code,
          step: failure.step,
        })),
        Effect.runPromise,
      ));

    it("is refused as an invalid private key", ({ refusal }) => {
      expect(refusal).toStrictEqual({ caused: true, code: "private_key_invalid", step: "key" });
    });
  });
});

describe("holdsPkcs8Key", () => {
  describe("a PKCS#1 key as GitHub hands it out", () => {
    const it = test.extend("pkcs8", () =>
      gitHubAppKeyFixture("pkcs1").pipe(
        Effect.map((appKey) => holdsPkcs8Key(Redacted.make(appKey.privateKey))),
        Effect.runPromise,
      ));

    it("is not taken for PKCS#8", ({ pkcs8 }) => {
      expect(pkcs8).toBe(false);
    });
  });
});
