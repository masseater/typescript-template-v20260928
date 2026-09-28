// @effect-diagnostics-next-line nodeBuiltinImport:off
import { createPrivateKey } from "node:crypto";

import { Pkcs8PrivateKeyPem } from "@repo/config";
import { Effect, Redacted, Schema } from "effect";

import { GitHubAppFailure } from "./github-api.ts";

const holdsPkcs8Key = (privateKey: Redacted.Redacted): boolean =>
  Schema.is(Pkcs8PrivateKeyPem)(Redacted.value(privateKey));

const pkcs8PrivateKey = (
  privateKey: Redacted.Redacted,
): Effect.Effect<Redacted.Redacted, GitHubAppFailure> =>
  Effect.try({
    catch: (cause) => new GitHubAppFailure({ cause, code: "private_key_invalid", step: "key" }),
    try: () =>
      Redacted.make(
        createPrivateKey(Redacted.value(privateKey))
          .export({ format: "pem", type: "pkcs8" }),
      ),
  });

export { holdsPkcs8Key, pkcs8PrivateKey };
